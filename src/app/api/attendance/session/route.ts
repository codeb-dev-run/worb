// =============================================================================
// Work Session API - 유연근무 시간 추적
// GET: 현재 활성 세션 및 오늘의 세션 목록 조회
// POST: 새 근무 세션 시작 (사무실/재택 전환)
// =============================================================================

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { redis } from '@/lib/redis'
import { authenticateRequest, secureLogger, createErrorResponse } from '@/lib/security'
import { validateBody, workSessionStartSchema, validationErrorResponse } from '@/lib/validation'

// GET: 오늘의 근무 세션 조회
export async function GET(request: NextRequest) {
  try {
    const user = await authenticateRequest()
    if (!user) {
      return createErrorResponse('Unauthorized', 401, 'AUTH_REQUIRED')
    }

    const { searchParams } = new URL(request.url)
    const workspaceId = searchParams.get('workspaceId')

    const today = new Date()
    today.setHours(0, 0, 0, 0)

    // 오늘의 출근 기록 조회
    const attendance = await prisma.attendance.findFirst({
      where: {
        userId: user.id,
        workspaceId: workspaceId || undefined,
        date: { gte: today },
      },
      include: {
        workSessions: {
          orderBy: { startTime: 'asc' },
        },
      },
    })

    if (!attendance) {
      return NextResponse.json({
        attendance: null,
        sessions: [],
        activeSession: null,
        todaySummary: {
          totalMinutes: 0,
          officeMinutes: 0,
          remoteMinutes: 0,
        },
      })
    }

    // 활성 세션 (endTime이 null인 세션)
    const activeSession = attendance.workSessions.find(s => !s.endTime)

    // 오늘 총 근무시간 계산
    let totalMinutes = 0
    let officeMinutes = 0
    let remoteMinutes = 0

    for (const session of attendance.workSessions) {
      const duration = session.durationMinutes || 0
      totalMinutes += duration
      if (session.sessionType === 'OFFICE_WORK') {
        officeMinutes += duration
      } else {
        remoteMinutes += duration
      }
    }

    // 활성 세션의 현재 진행 시간 추가
    if (activeSession) {
      const now = new Date()
      const activeMinutes = Math.floor((now.getTime() - activeSession.startTime.getTime()) / 60000)
      totalMinutes += activeMinutes
      if (activeSession.sessionType === 'OFFICE_WORK') {
        officeMinutes += activeMinutes
      } else {
        remoteMinutes += activeMinutes
      }
    }

    return NextResponse.json({
      attendance: {
        id: attendance.id,
        date: attendance.date,
        checkIn: attendance.checkIn,
        checkOut: attendance.checkOut,
        status: attendance.status,
        isFlexibleDay: attendance.isFlexibleDay,
      },
      sessions: attendance.workSessions,
      activeSession,
      todaySummary: {
        totalMinutes,
        officeMinutes,
        remoteMinutes,
      },
    })
  } catch (error) {
    secureLogger.error('Failed to fetch work sessions', error as Error, {
      operation: 'session.list',
    })
    return createErrorResponse('Failed to fetch sessions', 500, 'FETCH_FAILED')
  }
}

// POST: 새 근무 세션 시작
export async function POST(request: NextRequest) {
  try {
    const user = await authenticateRequest()
    if (!user) {
      return createErrorResponse('Unauthorized', 401, 'AUTH_REQUIRED')
    }

    const validation = await validateBody(request, workSessionStartSchema)
    if (!validation.success) {
      return validationErrorResponse(validation.errors!)
    }

    const { workspaceId, sessionType, wifiSSID, wifiBSSID, note } = validation.data!

    // 워크스페이스 멤버 확인
    const membership = await prisma.workspaceMember.findUnique({
      where: {
        workspaceId_userId: {
          workspaceId,
          userId: user.id,
        },
      },
    })

    if (!membership) {
      return createErrorResponse('Not a member of this workspace', 403, 'NOT_MEMBER')
    }

    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const now = new Date()

    // 오늘의 출근 기록 확인 또는 생성
    let attendance = await prisma.attendance.findFirst({
      where: {
        userId: user.id,
        workspaceId,
        date: { gte: today },
      },
      include: {
        workSessions: true,
      },
    })

    if (!attendance) {
      // 출근 기록 생성
      attendance = await prisma.attendance.create({
        data: {
          userId: user.id,
          workspaceId,
          date: today,
          checkIn: now,
          status: sessionType === 'REMOTE_WORK' ? 'REMOTE' : 'PRESENT',
          isFlexibleDay: true,
        },
        include: {
          workSessions: true,
        },
      })
    }

    // 기존 활성 세션 종료
    const activeSession = attendance.workSessions.find(s => !s.endTime)
    if (activeSession) {
      const duration = Math.floor((now.getTime() - activeSession.startTime.getTime()) / 60000)
      await prisma.workSession.update({
        where: { id: activeSession.id },
        data: {
          endTime: now,
          durationMinutes: duration,
        },
      })

      // Attendance 업데이트
      if (activeSession.sessionType === 'OFFICE_WORK') {
        await prisma.attendance.update({
          where: { id: attendance.id },
          data: {
            totalWorkedMinutes: { increment: duration },
            officeWorkedMinutes: { increment: duration },
          },
        })
      } else {
        await prisma.attendance.update({
          where: { id: attendance.id },
          data: {
            totalWorkedMinutes: { increment: duration },
            remoteWorkedMinutes: { increment: duration },
          },
        })
      }
    }

    // WiFi 검증 (사무실 근무인 경우)
    let isVerified = false
    if (sessionType === 'OFFICE_WORK' && wifiSSID) {
      const policy = await prisma.workPolicy.findFirst({
        where: { workspaceId },
      })

      if (policy?.wifiVerificationEnabled) {
        const matchedNetwork = await prisma.officeWifiNetwork.findFirst({
          where: {
            workspaceId,
            ssid: wifiSSID,
            isActive: true,
          },
        })

        isVerified = !!matchedNetwork

        // WiFi 검증 필수인데 실패한 경우
        if (policy.wifiVerificationRequired && !isVerified) {
          return createErrorResponse(
            'Office check-in requires verified WiFi connection',
            400,
            'WIFI_VERIFICATION_REQUIRED'
          )
        }
      } else {
        isVerified = true // 검증 비활성화시 기본 통과
      }
    } else if (sessionType === 'REMOTE_WORK') {
      isVerified = true // 재택 근무는 WiFi 검증 불필요
    }

    // 새 세션 생성
    const session = await prisma.workSession.create({
      data: {
        attendanceId: attendance.id,
        userId: user.id,
        workspaceId,
        sessionType: sessionType as any,
        startTime: now,
        wifiSSID,
        wifiBSSID,
        ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip'),
        isVerified,
        note,
      },
    })

    // 캐시 무효화
    await redis.del(`attendance:api:${user.id}`)
    await redis.del(`attendance:mobile:${user.id}`)

    secureLogger.info('Work session started', {
      operation: 'session.start',
      userId: user.id,
      workspaceId,
      sessionType,
      isVerified,
    })

    return NextResponse.json({
      session,
      message: `${sessionType === 'OFFICE_WORK' ? 'Office' : 'Remote'} work session started`,
      previousSessionEnded: !!activeSession,
    }, { status: 201 })
  } catch (error) {
    secureLogger.error('Failed to start work session', error as Error, {
      operation: 'session.start',
    })
    return createErrorResponse('Failed to start session', 500, 'START_FAILED')
  }
}
