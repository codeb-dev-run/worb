// =============================================================================
// Work Session End API - 근무 세션 종료
// POST: 현재 활성 세션 종료 (퇴근 또는 세션 전환)
// =============================================================================

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { redis } from '@/lib/redis'
import { authenticateRequest, secureLogger, createErrorResponse } from '@/lib/security'

export async function POST(request: NextRequest) {
  try {
    const user = await authenticateRequest()
    if (!user) {
      return createErrorResponse('Unauthorized', 401, 'AUTH_REQUIRED')
    }

    const body = await request.json().catch(() => ({}))
    const { workspaceId, note, isCheckout } = body

    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const now = new Date()

    // 오늘의 출근 기록 조회
    const attendance = await prisma.attendance.findFirst({
      where: {
        userId: user.id,
        workspaceId: workspaceId || undefined,
        date: { gte: today },
      },
      include: {
        workSessions: {
          where: { endTime: null },
        },
      },
    })

    if (!attendance) {
      return createErrorResponse('No attendance record found for today', 404, 'NO_ATTENDANCE')
    }

    const activeSession = attendance.workSessions[0]
    if (!activeSession) {
      return createErrorResponse('No active session to end', 400, 'NO_ACTIVE_SESSION')
    }

    // 세션 종료
    const duration = Math.floor((now.getTime() - activeSession.startTime.getTime()) / 60000)

    const updatedSession = await prisma.workSession.update({
      where: { id: activeSession.id },
      data: {
        endTime: now,
        durationMinutes: duration,
        note: note || activeSession.note,
      },
    })

    // Attendance 시간 업데이트
    const updateData: Record<string, any> = {
      totalWorkedMinutes: { increment: duration },
    }

    if (activeSession.sessionType === 'OFFICE_WORK') {
      updateData.officeWorkedMinutes = { increment: duration }
    } else {
      updateData.remoteWorkedMinutes = { increment: duration }
    }

    // 퇴근인 경우 checkOut 시간 설정
    if (isCheckout) {
      updateData.checkOut = now
    }

    await prisma.attendance.update({
      where: { id: attendance.id },
      data: updateData,
    })

    // 주간 요약 업데이트
    await updateWeeklySummary(user.id, workspaceId, duration, activeSession.sessionType)

    // 캐시 무효화
    await redis.del(`attendance:api:${user.id}`)
    await redis.del(`attendance:mobile:${user.id}`)

    secureLogger.info('Work session ended', {
      operation: 'session.end',
      userId: user.id,
      sessionId: activeSession.id,
      duration,
      isCheckout,
    })

    return NextResponse.json({
      session: updatedSession,
      duration,
      message: isCheckout ? 'Checked out successfully' : 'Session ended',
    })
  } catch (error) {
    secureLogger.error('Failed to end work session', error as Error, {
      operation: 'session.end',
    })
    return createErrorResponse('Failed to end session', 500, 'END_FAILED')
  }
}

// 주간 근무시간 요약 업데이트
async function updateWeeklySummary(
  userId: string,
  workspaceId: string | null,
  minutes: number,
  sessionType: string
) {
  const now = new Date()
  const dayOfWeek = now.getDay()
  const diff = dayOfWeek === 0 ? 6 : dayOfWeek - 1 // 월요일 기준

  const weekStart = new Date(now)
  weekStart.setDate(now.getDate() - diff)
  weekStart.setHours(0, 0, 0, 0)

  const weekEnd = new Date(weekStart)
  weekEnd.setDate(weekStart.getDate() + 6)
  weekEnd.setHours(23, 59, 59, 999)

  try {
    // 기존 주간 요약 조회 또는 생성
    const existing = await prisma.weeklyWorkSummary.findFirst({
      where: {
        userId,
        workspaceId: workspaceId || undefined,
        weekStart,
      },
    })

    if (existing) {
      const newTotal = existing.totalWorkedMinutes + minutes
      const isOffice = sessionType === 'OFFICE_WORK'

      await prisma.weeklyWorkSummary.update({
        where: { id: existing.id },
        data: {
          totalWorkedMinutes: newTotal,
          officeMinutes: isOffice ? existing.officeMinutes + minutes : existing.officeMinutes,
          remoteMinutes: !isOffice ? existing.remoteMinutes + minutes : existing.remoteMinutes,
          remainingMinutes: Math.max(0, existing.targetMinutes - newTotal),
          isCompleted: newTotal >= existing.targetMinutes,
        },
      })
    } else {
      const isOffice = sessionType === 'OFFICE_WORK'
      const targetMinutes = 2400 // 주 40시간

      await prisma.weeklyWorkSummary.create({
        data: {
          userId,
          workspaceId,
          weekStart,
          weekEnd,
          targetMinutes,
          totalWorkedMinutes: minutes,
          officeMinutes: isOffice ? minutes : 0,
          remoteMinutes: !isOffice ? minutes : 0,
          remainingMinutes: targetMinutes - minutes,
          isCompleted: minutes >= targetMinutes,
        },
      })
    }
  } catch (error) {
    // 주간 요약 업데이트 실패해도 세션 종료는 성공으로 처리
    secureLogger.error('Failed to update weekly summary', error as Error, {
      operation: 'session.weekly_summary',
    })
  }
}
