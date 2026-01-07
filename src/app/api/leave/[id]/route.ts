// =============================================================================
// Leave Request Detail API - 휴가 신청 승인/반려 처리
// =============================================================================

import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { secureLogger, createErrorResponse } from '@/lib/security'
import { LeaveType, LeaveStatus } from '@prisma/client'

interface RouteParams {
    params: Promise<{ id: string }>
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

const statusReverseMap: Record<LeaveStatus, string> = {
    PENDING: 'pending',
    APPROVED: 'approved',
    REJECTED: 'rejected',
    CANCELLED: 'cancelled',
}

// GET - 특정 휴가 신청 상세 조회
export async function GET(request: Request, { params }: RouteParams) {
    try {
        const { id } = await params

        const leaveRequest = await prisma.leaveRequest.findUnique({
            where: { id },
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
        })

        if (!leaveRequest) {
            return createErrorResponse('Leave request not found', 404, 'NOT_FOUND')
        }

        return NextResponse.json({
            id: leaveRequest.id,
            type: leaveTypeReverseMap[leaveRequest.type],
            startDate: leaveRequest.startDate.toISOString().split('T')[0],
            endDate: leaveRequest.endDate.toISOString().split('T')[0],
            days: leaveRequest.days,
            reason: leaveRequest.reason,
            status: statusReverseMap[leaveRequest.status],
            approvedBy: leaveRequest.approvedBy,
            approvedAt: leaveRequest.approvedAt?.toISOString(),
            rejectReason: leaveRequest.rejectReason,
            createdAt: leaveRequest.createdAt.toISOString(),
            employee: {
                id: leaveRequest.employee.id,
                name: leaveRequest.employee.nameKor,
                department: leaveRequest.employee.department,
                position: leaveRequest.employee.position,
                profileImage: leaveRequest.employee.profileImage,
            },
        })
    } catch (error) {
        secureLogger.error('Failed to fetch leave request', error as Error, { operation: 'leave.get' })
        return createErrorResponse('Failed to fetch leave request', 500, 'FETCH_FAILED')
    }
}

// PATCH - 휴가 신청 승인/반려 처리
export async function PATCH(request: Request, { params }: RouteParams) {
    try {
        const { id } = await params
        const body = await request.json()
        const userId = request.headers.get('x-user-id')
        const workspaceId = request.headers.get('x-workspace-id')
        const { status, rejectReason } = body

        // 유효성 검사
        if (!status || !['approved', 'rejected'].includes(status)) {
            return createErrorResponse(
                'Invalid status. Must be "approved" or "rejected"',
                400,
                'INVALID_STATUS'
            )
        }

        // 휴가 신청 조회
        const leaveRequest = await prisma.leaveRequest.findUnique({
            where: { id },
            include: {
                employee: true,
            },
        })

        if (!leaveRequest) {
            return createErrorResponse('Leave request not found', 404, 'NOT_FOUND')
        }

        if (leaveRequest.status !== 'PENDING') {
            return createErrorResponse('Can only process pending requests', 400, 'ALREADY_PROCESSED')
        }

        const newStatus: LeaveStatus = status === 'approved' ? 'APPROVED' : 'REJECTED'

        // 휴가 신청 업데이트
        const updatedRequest = await prisma.leaveRequest.update({
            where: { id },
            data: {
                status: newStatus,
                approvedBy: userId,
                approvedAt: new Date(),
                rejectReason: status === 'rejected' ? rejectReason : null,
            },
        })

        // 승인된 경우, LeaveBalance 업데이트
        if (status === 'approved' && workspaceId) {
            const currentYear = new Date().getFullYear()

            // LeaveBalance 조회 또는 생성
            const existingBalance = await prisma.leaveBalance.findUnique({
                where: {
                    workspaceId_employeeId_year: {
                        workspaceId,
                        employeeId: leaveRequest.employeeId,
                        year: currentYear,
                    },
                },
            })

            if (existingBalance) {
                // 휴가 유형에 따라 사용량 업데이트
                const updateData: { annualUsed?: number; sickUsed?: number; specialUsed?: number } = {}

                if (['ANNUAL', 'HALF_AM', 'HALF_PM'].includes(leaveRequest.type)) {
                    updateData.annualUsed = existingBalance.annualUsed + leaveRequest.days
                } else if (leaveRequest.type === 'SICK') {
                    updateData.sickUsed = existingBalance.sickUsed + leaveRequest.days
                } else if (['SPECIAL', 'MATERNITY', 'CHILDCARE', 'OFFICIAL'].includes(leaveRequest.type)) {
                    updateData.specialUsed = existingBalance.specialUsed + leaveRequest.days
                }

                await prisma.leaveBalance.update({
                    where: { id: existingBalance.id },
                    data: updateData,
                })
            } else {
                // 새로 생성
                const createData: {
                    workspaceId: string
                    employeeId: string
                    year: number
                    annualUsed?: number
                    sickUsed?: number
                    specialUsed?: number
                } = {
                    workspaceId,
                    employeeId: leaveRequest.employeeId,
                    year: currentYear,
                }

                if (['ANNUAL', 'HALF_AM', 'HALF_PM'].includes(leaveRequest.type)) {
                    createData.annualUsed = leaveRequest.days
                } else if (leaveRequest.type === 'SICK') {
                    createData.sickUsed = leaveRequest.days
                } else if (['SPECIAL', 'MATERNITY', 'CHILDCARE', 'OFFICIAL'].includes(leaveRequest.type)) {
                    createData.specialUsed = leaveRequest.days
                }

                await prisma.leaveBalance.create({ data: createData })
            }
        }

        return NextResponse.json({
            success: true,
            message: status === 'approved'
                ? '휴가 신청이 승인되었습니다.'
                : '휴가 신청이 반려되었습니다.',
            data: {
                id: updatedRequest.id,
                status: statusReverseMap[updatedRequest.status],
                approvedBy: updatedRequest.approvedBy,
                approvedAt: updatedRequest.approvedAt?.toISOString(),
                rejectReason: updatedRequest.rejectReason,
            },
        })
    } catch (error) {
        secureLogger.error('Failed to update leave request', error as Error, { operation: 'leave.update' })
        return createErrorResponse('Failed to update leave request', 500, 'UPDATE_FAILED')
    }
}

// DELETE - 휴가 신청 취소 (본인만 가능, pending 또는 approved 상태일 때)
// 승인된 휴가 취소 시 휴가일이 시작되기 전이어야 함
export async function DELETE(request: Request, { params }: RouteParams) {
    try {
        const { id } = await params
        const userId = request.headers.get('x-user-id')
        const workspaceId = request.headers.get('x-workspace-id')

        if (!userId || !workspaceId) {
            return createErrorResponse('Authentication required', 401, 'UNAUTHORIZED')
        }

        // 현재 유저의 Employee 조회
        const currentEmployee = await prisma.employee.findFirst({
            where: {
                workspaceId,
                userId,
            },
        })

        // 휴가 신청 조회
        const leaveRequest = await prisma.leaveRequest.findUnique({
            where: { id },
        })

        if (!leaveRequest) {
            return createErrorResponse('Leave request not found', 404, 'NOT_FOUND')
        }

        // 본인 신청인지 확인
        if (!currentEmployee || leaveRequest.employeeId !== currentEmployee.id) {
            return createErrorResponse('You can only cancel your own request', 403, 'FORBIDDEN')
        }

        // 대기 또는 승인 상태인지 확인
        if (!['PENDING', 'APPROVED'].includes(leaveRequest.status)) {
            return createErrorResponse('Can only cancel pending or approved requests', 400, 'INVALID_STATUS')
        }

        // 승인된 휴가의 경우, 휴가 시작일 전에만 취소 가능
        const today = new Date()
        today.setHours(0, 0, 0, 0)
        const startDate = new Date(leaveRequest.startDate)
        startDate.setHours(0, 0, 0, 0)

        if (leaveRequest.status === 'APPROVED' && startDate <= today) {
            return createErrorResponse(
                '휴가 시작일 이후에는 취소할 수 없습니다. 관리자에게 문의하세요.',
                400,
                'LEAVE_ALREADY_STARTED'
            )
        }

        // 승인된 휴가 취소 시 LeaveBalance 복원
        if (leaveRequest.status === 'APPROVED') {
            const currentYear = new Date().getFullYear()

            const existingBalance = await prisma.leaveBalance.findUnique({
                where: {
                    workspaceId_employeeId_year: {
                        workspaceId,
                        employeeId: leaveRequest.employeeId,
                        year: currentYear,
                    },
                },
            })

            if (existingBalance) {
                const updateData: { annualUsed?: number; sickUsed?: number; specialUsed?: number } = {}

                // 사용한 휴가일수 복원 (음수가 되지 않도록 보정)
                if (['ANNUAL', 'HALF_AM', 'HALF_PM'].includes(leaveRequest.type)) {
                    updateData.annualUsed = Math.max(0, existingBalance.annualUsed - leaveRequest.days)
                } else if (leaveRequest.type === 'SICK') {
                    updateData.sickUsed = Math.max(0, existingBalance.sickUsed - leaveRequest.days)
                } else if (['SPECIAL', 'MATERNITY', 'CHILDCARE', 'OFFICIAL'].includes(leaveRequest.type)) {
                    updateData.specialUsed = Math.max(0, existingBalance.specialUsed - leaveRequest.days)
                }

                await prisma.leaveBalance.update({
                    where: { id: existingBalance.id },
                    data: updateData,
                })
            }
        }

        // 삭제 대신 CANCELLED 상태로 변경
        await prisma.leaveRequest.update({
            where: { id },
            data: {
                status: 'CANCELLED',
                // 취소 사유 기록 (참고용)
                rejectReason: leaveRequest.status === 'APPROVED'
                    ? `본인 취소 (승인된 휴가, ${new Date().toLocaleDateString('ko-KR')})`
                    : null,
            },
        })

        secureLogger.info('Leave request cancelled', {
            operation: 'leave.cancel',
            leaveId: id,
            userId,
            previousStatus: leaveRequest.status,
        })

        return NextResponse.json({
            success: true,
            message: leaveRequest.status === 'APPROVED'
                ? '승인된 휴가가 취소되었습니다. 휴가일수가 복원되었습니다.'
                : '휴가 신청이 취소되었습니다.',
        })
    } catch (error) {
        secureLogger.error('Failed to delete leave request', error as Error, { operation: 'leave.delete' })
        return createErrorResponse('Failed to delete leave request', 500, 'DELETE_FAILED')
    }
}
