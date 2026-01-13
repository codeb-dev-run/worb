// =============================================================================
// Dashboard Attendance List API - 대시보드용 오늘의 출근 현황
// Redis 캐싱 적용: TTL 1분 (실시간성 보장)
// =============================================================================

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { authenticateRequest, secureLogger, createErrorResponse } from '@/lib/security'
import { cachedApiResponse, CacheTTL } from '@/lib/redis'
import { startOfDay, endOfDay, format } from 'date-fns'

export async function GET(request: NextRequest) {
  try {
    const user = await authenticateRequest()
    if (!user) {
      return createErrorResponse('Unauthorized', 401, 'AUTH_REQUIRED')
    }

    const { searchParams } = new URL(request.url)
    const workspaceId = searchParams.get('workspaceId')
    const limit = Math.min(parseInt(searchParams.get('limit') || '4'), 10)
    const forceRefresh = searchParams.get('refresh') === 'true'

    if (!workspaceId) {
      return createErrorResponse('Workspace ID required', 400, 'MISSING_WORKSPACE_ID')
    }

    // 워크스페이스 멤버십 확인
    const membership = await prisma.workspaceMember.findUnique({
      where: {
        workspaceId_userId: {
          workspaceId,
          userId: user.id,
        },
      },
    })

    if (!membership) {
      return createErrorResponse('Forbidden', 403, 'NOT_A_MEMBER')
    }

    // 캐싱된 응답 반환 (TTL: 1분, 실시간성 보장)
    const attendanceList = await cachedApiResponse(
      `attendance:${workspaceId}:list:${limit}`,
      async () => {
        const today = new Date()
        const todayStart = startOfDay(today)
        const todayEnd = endOfDay(today)

        // 오늘 출근 기록 조회 (select로 필요 필드만)
        const todayAttendance = await prisma.attendance.findMany({
          where: {
            workspaceId,
            date: {
              gte: todayStart,
              lte: todayEnd,
            },
          },
          select: {
            id: true,
            userId: true,
            checkIn: true,
            status: true,
            user: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
          orderBy: {
            checkIn: 'desc',
          },
          take: limit,
        })

        // 사용자의 부서 정보 조회
        const userIds = todayAttendance.map((a) => a.userId)
        const employees = userIds.length > 0
          ? await prisma.employee.findMany({
              where: {
                workspaceId,
                userId: { in: userIds },
              },
              select: {
                userId: true,
                department: true,
                nameKor: true,
              },
            })
          : []

        const employeeMap = new Map(employees.map((e) => [e.userId, e]))

        // 응답 데이터 변환
        return todayAttendance.map((a) => {
          const employee = employeeMap.get(a.userId)
          return {
            id: a.id,
            name: employee?.nameKor || a.user.name || a.user.email?.split('@')[0] || '알 수 없음',
            team: employee?.department || '미지정',
            checkIn: a.checkIn ? format(new Date(a.checkIn), 'HH:mm') : '--:--',
            status: a.status?.toLowerCase() || 'absent',
          }
        })
      },
      {
        ttl: CacheTTL.SHORT, // 1분 (실시간성 보장)
        tags: [`workspace:${workspaceId}`, 'attendance'],
        forceRefresh,
      }
    )

    return NextResponse.json(attendanceList)
  } catch (error) {
    secureLogger.error('Failed to fetch attendance list', error as Error, { operation: 'dashboard.attendance-list.get' })
    return createErrorResponse('Failed to fetch attendance list', 500, 'FETCH_FAILED')
  }
}
