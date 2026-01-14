// =============================================================================
// Leave API - 휴가 신청 관리
// =============================================================================

import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { secureLogger, createErrorResponse } from '@/lib/security'
import { LeaveStatus, LeaveType } from '@prisma/client'
import { notifyLeaveRequest } from '@/lib/centrifugo-client'

// 휴가 유형 매핑 (프론트엔드 값 -> Prisma enum)
const leaveTypeMap: Record<string, LeaveType> = {
    annual: 'ANNUAL',
    sick: 'SICK',
    half_am: 'HALF_AM',
    half_pm: 'HALF_PM',
    special: 'SPECIAL',
    maternity: 'MATERNITY',
    childcare: 'CHILDCARE',
    official: 'OFFICIAL',
}

// Prisma enum -> 프론트엔드 값
const leaveTypeReverseMap: Record<LeaveType, string> = {
    ANNUAL: 'annual',
    SICK: 'sick',
    HALF_AM: 'half_am',
    HALF_PM: 'half_pm',
    SPECIAL: 'special',
    MATERNITY: 'maternity',
    CHILDCARE: 'childcare',
    OFFICIAL: 'official',
}

// 상태 매핑
const statusReverseMap: Record<LeaveStatus, string> = {
    PENDING: 'pending',
    APPROVED: 'approved',
    REJECTED: 'rejected',
    CANCELLED: 'cancelled',
}

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url)
        const userId = request.headers.get('x-user-id')
        const workspaceId = request.headers.get('x-workspace-id')
        const isAdmin = request.headers.get('x-is-admin') === 'true'
        const statusFilter = searchParams.get('status')
        const employeeIdParam = searchParams.get('employeeId') // 특정 직원 조회용

        if (!workspaceId) {
            return createErrorResponse('Workspace ID is required', 400, 'MISSING_WORKSPACE')
        }

        // 현재 유저의 Employee 정보 조회
        let currentEmployee = null

        // employeeId 파라미터가 있으면 해당 직원 조회 (관리자용)
        if (employeeIdParam && isAdmin) {
            currentEmployee = await prisma.employee.findFirst({
                where: {
                    workspaceId,
                    id: employeeIdParam,
                },
            })
        } else if (userId) {
            currentEmployee = await prisma.employee.findFirst({
                where: {
                    workspaceId,
                    userId,
                },
            })
        }

        // 현재 연도
        const currentYear = new Date().getFullYear()

        // 휴가 잔여 현황 조회 (본인)
        let balance = {
            annualTotal: 15,
            annualUsed: 0,
            annualRemaining: 15,
            sickTotal: 3,
            sickUsed: 0,
            sickRemaining: 3,
        }

        if (currentEmployee) {
            const leaveBalance = await prisma.leaveBalance.findUnique({
                where: {
                    workspaceId_employeeId_year: {
                        workspaceId,
                        employeeId: currentEmployee.id,
                        year: currentYear,
                    },
                },
            })

            if (leaveBalance) {
                balance = {
                    annualTotal: leaveBalance.annualTotal,
                    annualUsed: leaveBalance.annualUsed,
                    annualRemaining: leaveBalance.annualTotal - leaveBalance.annualUsed + leaveBalance.annualCarryOver,
                    sickTotal: leaveBalance.sickTotal,
                    sickUsed: leaveBalance.sickUsed,
                    sickRemaining: leaveBalance.sickTotal - leaveBalance.sickUsed,
                }
            }
        }

        // 본인 휴가 신청 내역 조회
        const myRequests = currentEmployee
            ? await prisma.leaveRequest.findMany({
                  where: {
                      workspaceId,
                      employeeId: currentEmployee.id,
                  },
                  orderBy: { createdAt: 'desc' },
                  take: 20,
              })
            : []

        // 프론트엔드 형식으로 변환
        const formattedMyRequests = myRequests.map((r) => ({
            id: r.id,
            type: leaveTypeReverseMap[r.type],
            startDate: r.startDate.toISOString().split('T')[0],
            endDate: r.endDate.toISOString().split('T')[0],
            days: r.days,
            reason: r.reason,
            status: statusReverseMap[r.status],
            approvedBy: r.approvedBy,
            approvedAt: r.approvedAt?.toISOString(),
            createdAt: r.createdAt.toISOString().split('T')[0],
        }))

        // 기본 응답
        const response: {
            requests: typeof formattedMyRequests
            balance: typeof balance
            allRequests?: unknown[]
            pendingCount?: number
            stats?: {
                total: number
                pending: number
                approved: number
                rejected: number
            }
        } = {
            requests: formattedMyRequests,
            balance,
        }

        // 관리자용 전체 데이터
        if (isAdmin) {
            // 상태 필터 조건
            const statusCondition: { status?: LeaveStatus } = {}
            if (statusFilter && statusFilter !== 'all') {
                statusCondition.status = statusFilter.toUpperCase() as LeaveStatus
            }

            // 전체 휴가 신청 조회 (직원 정보 포함)
            const allRequests = await prisma.leaveRequest.findMany({
                where: {
                    workspaceId,
                    ...statusCondition,
                },
                include: {
                    employee: {
                        select: {
                            id: true,
                            nameKor: true,
                            department: true,
                            position: true,
                            profileImage: true,
                        },
                    },
                },
                orderBy: { createdAt: 'desc' },
            })

            // 통계 조회
            const stats = await prisma.leaveRequest.groupBy({
                by: ['status'],
                where: { workspaceId },
                _count: true,
            })

            const statsMap = stats.reduce(
                (acc, s) => {
                    acc[statusReverseMap[s.status]] = s._count
                    return acc
                },
                { pending: 0, approved: 0, rejected: 0, cancelled: 0 } as Record<string, number>
            )

            // 프론트엔드 형식으로 변환
            response.allRequests = allRequests.map((r) => ({
                id: r.id,
                type: leaveTypeReverseMap[r.type],
                startDate: r.startDate.toISOString().split('T')[0],
                endDate: r.endDate.toISOString().split('T')[0],
                days: r.days,
                reason: r.reason,
                status: statusReverseMap[r.status],
                approvedBy: r.approvedBy,
                approvedAt: r.approvedAt?.toISOString().split('T')[0],
                createdAt: r.createdAt.toISOString().split('T')[0],
                employee: {
                    id: r.employee.id,
                    name: r.employee.nameKor,
                    department: r.employee.department,
                    position: r.employee.position,
                    profileImage: r.employee.profileImage,
                },
            }))

            response.pendingCount = statsMap.pending
            response.stats = {
                total: allRequests.length,
                pending: statsMap.pending,
                approved: statsMap.approved,
                rejected: statsMap.rejected,
            }
        }

        return NextResponse.json(response)
    } catch (error) {
        secureLogger.error('Failed to fetch leave data', error as Error, { operation: 'leave.list' })
        return createErrorResponse('Failed to fetch leave data', 500, 'FETCH_FAILED')
    }
}

export async function POST(request: Request) {
    try {
        const body = await request.json()
        const userId = request.headers.get('x-user-id')
        const workspaceId = request.headers.get('x-workspace-id')

        if (!workspaceId) {
            return createErrorResponse('Workspace ID is required', 400, 'MISSING_WORKSPACE')
        }

        if (!userId) {
            return createErrorResponse('User ID is required', 400, 'MISSING_USER')
        }

        // 현재 유저의 Employee 조회
        const employee = await prisma.employee.findFirst({
            where: {
                workspaceId,
                userId,
            },
        })

        if (!employee) {
            return createErrorResponse('Employee not found', 404, 'EMPLOYEE_NOT_FOUND')
        }

        // 휴가 유형 변환
        const leaveType = leaveTypeMap[body.type] || 'ANNUAL'

        // 날짜 계산
        const startDate = new Date(body.startDate)
        const endDate = new Date(body.endDate || body.startDate)

        // 일수 계산 (반차는 0.5일)
        let days = 1
        if (leaveType === 'HALF_AM' || leaveType === 'HALF_PM') {
            days = 0.5
        } else {
            const diffTime = Math.abs(endDate.getTime() - startDate.getTime())
            days = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1
        }

        // 휴가 신청 생성
        const newRequest = await prisma.leaveRequest.create({
            data: {
                workspaceId,
                employeeId: employee.id,
                type: leaveType,
                startDate,
                endDate,
                days,
                reason: body.reason || null,
                status: 'PENDING',
            },
        })

        // 관리자들에게 알림 발송
        try {
            const admins = await prisma.workspaceMember.findMany({
                where: { workspaceId, role: 'admin' },
                select: { userId: true }
            })
            const adminUserIds = admins.map(a => a.userId)
            if (adminUserIds.length > 0) {
                await notifyLeaveRequest(
                    adminUserIds,
                    newRequest.id,
                    employee.nameKor || employee.nameEng || '직원',
                    leaveType,
                    startDate.toISOString().split('T')[0],
                    endDate.toISOString().split('T')[0],
                    workspaceId
                )
            }
        } catch (notifyError) {
            // 알림 실패는 무시 (주요 기능에 영향 없음)
            secureLogger.warn('Failed to send leave request notification', { error: notifyError })
        }

        return NextResponse.json({
            success: true,
            message: '휴가 신청이 완료되었습니다.',
            request: {
                id: newRequest.id,
                type: leaveTypeReverseMap[newRequest.type],
                startDate: newRequest.startDate.toISOString().split('T')[0],
                endDate: newRequest.endDate.toISOString().split('T')[0],
                days: newRequest.days,
                status: 'pending',
            },
        })
    } catch (error) {
        secureLogger.error('Failed to create leave request', error as Error, { operation: 'leave.create' })
        return createErrorResponse('Failed to create leave request', 500, 'CREATE_FAILED')
    }
}
