// =============================================================================
// Dashboard HR Stats API - 대시보드용 간소화된 HR 통계
// =============================================================================

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { authenticateRequest, secureLogger, createErrorResponse } from '@/lib/security'
import { startOfDay, endOfDay } from 'date-fns'

export async function GET(request: NextRequest) {
  try {
    const user = await authenticateRequest()
    if (!user) {
      return createErrorResponse('Unauthorized', 401, 'AUTH_REQUIRED')
    }

    const { searchParams } = new URL(request.url)
    const workspaceId = searchParams.get('workspaceId')

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

    const today = new Date()
    const todayStart = startOfDay(today)
    const todayEnd = endOfDay(today)

    // 병렬로 통계 조회
    const [
      totalMembers,
      todayAttendance,
    ] = await Promise.all([
      // 전체 멤버 수
      prisma.workspaceMember.count({
        where: { workspaceId },
      }),
      // 오늘 출근 기록
      prisma.attendance.findMany({
        where: {
          workspaceId,
          date: {
            gte: todayStart,
            lte: todayEnd,
          },
        },
      }),
    ])

    // 오늘 출근한 인원 계산
    const presentToday = todayAttendance.filter(
      (a) => a.checkIn && (a.status === 'PRESENT' || a.status === 'LATE' || a.status === 'REMOTE')
    ).length

    // 지각자 수
    const lateArrivals = todayAttendance.filter((a) => a.status === 'LATE').length

    // 휴가 중인 인원 (현재 AttendanceStatus에 LEAVE가 없어 0으로 설정)
    // 추후 휴가 기능 구현 시 업데이트 필요
    const onLeave = 0

    // 결근자 = 전체 - 출근자 - 휴가자 (대략적 계산)
    const absentToday = Math.max(0, totalMembers - presentToday - onLeave)

    const stats = {
      totalEmployees: totalMembers,
      presentToday,
      absentToday,
      onLeave,
      lateArrivals,
      pendingApprovals: 0, // 휴가 요청 기능이 구현되면 추가
    }

    return NextResponse.json(stats)
  } catch (error) {
    secureLogger.error('Failed to fetch dashboard HR stats', error as Error, { operation: 'dashboard.hr-stats.get' })
    return createErrorResponse('Failed to fetch HR stats', 500, 'FETCH_FAILED')
  }
}
