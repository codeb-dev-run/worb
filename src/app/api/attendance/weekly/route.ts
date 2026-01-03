// =============================================================================
// Weekly Work Summary API - 주간 근무시간 조회
// GET: 현재 주 및 이전 주 근무시간 요약
// =============================================================================

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { authenticateRequest, secureLogger, createErrorResponse } from '@/lib/security'

export async function GET(request: NextRequest) {
  try {
    const user = await authenticateRequest()
    if (!user) {
      return createErrorResponse('Unauthorized', 401, 'AUTH_REQUIRED')
    }

    const { searchParams } = new URL(request.url)
    const workspaceId = searchParams.get('workspaceId')
    const weeksBack = parseInt(searchParams.get('weeks') || '4')

    // 현재 주 시작일 계산 (월요일 기준)
    const now = new Date()
    const dayOfWeek = now.getDay()
    const diff = dayOfWeek === 0 ? 6 : dayOfWeek - 1

    const currentWeekStart = new Date(now)
    currentWeekStart.setDate(now.getDate() - diff)
    currentWeekStart.setHours(0, 0, 0, 0)

    // 조회 시작 날짜 (weeksBack 주 전)
    const startDate = new Date(currentWeekStart)
    startDate.setDate(startDate.getDate() - (weeksBack - 1) * 7)

    // 주간 요약 조회
    const summaries = await prisma.weeklyWorkSummary.findMany({
      where: {
        userId: user.id,
        workspaceId: workspaceId || undefined,
        weekStart: { gte: startDate },
      },
      orderBy: { weekStart: 'desc' },
    })

    // 현재 주의 실시간 데이터 계산
    const currentWeekEnd = new Date(currentWeekStart)
    currentWeekEnd.setDate(currentWeekStart.getDate() + 6)
    currentWeekEnd.setHours(23, 59, 59, 999)

    // 현재 주 출근 기록 조회
    const currentWeekAttendances = await prisma.attendance.findMany({
      where: {
        userId: user.id,
        workspaceId: workspaceId || undefined,
        date: {
          gte: currentWeekStart,
          lte: currentWeekEnd,
        },
      },
      include: {
        workSessions: true,
      },
    })

    // 현재 주 실시간 통계 계산
    let currentWeekTotal = 0
    let currentWeekOffice = 0
    let currentWeekRemote = 0

    for (const attendance of currentWeekAttendances) {
      for (const session of attendance.workSessions) {
        let duration = session.durationMinutes || 0

        // 활성 세션인 경우 현재까지 시간 추가
        if (!session.endTime) {
          duration = Math.floor((now.getTime() - session.startTime.getTime()) / 60000)
        }

        currentWeekTotal += duration
        if (session.sessionType === 'OFFICE_WORK') {
          currentWeekOffice += duration
        } else {
          currentWeekRemote += duration
        }
      }
    }

    // 워크스페이스 정책 조회 (주간 목표 시간)
    const policy = await prisma.workPolicy.findFirst({
      where: { workspaceId: workspaceId || undefined },
    })

    const targetMinutes = policy?.weeklyRequiredMinutes || 2400 // 기본 40시간

    const currentWeekSummary = {
      weekStart: currentWeekStart,
      weekEnd: currentWeekEnd,
      targetMinutes,
      totalWorkedMinutes: currentWeekTotal,
      officeMinutes: currentWeekOffice,
      remoteMinutes: currentWeekRemote,
      remainingMinutes: Math.max(0, targetMinutes - currentWeekTotal),
      isCompleted: currentWeekTotal >= targetMinutes,
      progressPercent: Math.min(100, Math.round((currentWeekTotal / targetMinutes) * 100)),
      dailyBreakdown: currentWeekAttendances.map(a => ({
        date: a.date,
        totalMinutes: a.totalWorkedMinutes,
        officeMinutes: a.officeWorkedMinutes,
        remoteMinutes: a.remoteWorkedMinutes,
        status: a.status,
      })),
    }

    // 이전 주 요약 데이터
    const previousWeeks = summaries
      .filter(s => s.weekStart.getTime() !== currentWeekStart.getTime())
      .map(s => ({
        weekStart: s.weekStart,
        weekEnd: s.weekEnd,
        targetMinutes: s.targetMinutes,
        totalWorkedMinutes: s.totalWorkedMinutes,
        officeMinutes: s.officeMinutes,
        remoteMinutes: s.remoteMinutes,
        remainingMinutes: s.remainingMinutes,
        isCompleted: s.isCompleted,
        progressPercent: Math.min(100, Math.round((s.totalWorkedMinutes / s.targetMinutes) * 100)),
      }))

    // 유연근무 설정 정보
    const flexibleWorkSettings = {
      enabled: policy?.allowFlexibleWork ?? true,
      wifiVerificationEnabled: policy?.wifiVerificationEnabled ?? false,
      wifiVerificationRequired: policy?.wifiVerificationRequired ?? false,
      allowRemoteCheckIn: policy?.allowRemoteCheckIn ?? true,
      weeklyTargetMinutes: targetMinutes,
      dailyTargetMinutes: policy?.dailyRequiredMinutes || 480,
    }

    return NextResponse.json({
      currentWeek: currentWeekSummary,
      previousWeeks,
      settings: flexibleWorkSettings,
      message: currentWeekSummary.isCompleted
        ? '이번 주 근무시간을 모두 채웠습니다!'
        : `이번 주 ${Math.floor(currentWeekSummary.remainingMinutes / 60)}시간 ${currentWeekSummary.remainingMinutes % 60}분 남았습니다.`,
    })
  } catch (error) {
    secureLogger.error('Failed to fetch weekly summary', error as Error, {
      operation: 'weekly.summary',
    })
    return createErrorResponse('Failed to fetch weekly summary', 500, 'FETCH_FAILED')
  }
}
