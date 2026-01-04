// =============================================================================
// Attendance Check-in API - CVE-CB-003 Fixed: Session-based Authentication
// 지원 기능: 출근, 퇴근 후 이어서 근무 (isResume)
// =============================================================================

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { redis } from '@/lib/redis'
import { authenticateRequest, secureLogger, createErrorResponse } from '@/lib/security'
import { validateBody, attendanceCheckInSchema, validationErrorResponse } from '@/lib/validation'

export async function POST(request: NextRequest) {
  try {
    // CVE-CB-003 Fix: Use session-based authentication instead of x-user-id header
    const user = await authenticateRequest()
    if (!user) {
      return createErrorResponse('Unauthorized', 401, 'AUTH_REQUIRED')
    }

    // CVE-CB-007 Fix: Validate request body
    const validation = await validateBody(request, attendanceCheckInSchema)
    if (!validation.success) {
      return validationErrorResponse(validation.errors!)
    }

    const { workLocation, note, isResume, ipAddress } = validation.data!

    const now = new Date()
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    // Check if already checked in today
    const existing = await prisma.attendance.findFirst({
      where: {
        userId: user.id,
        date: {
          gte: today,
        },
      },
    })

    // 이미 출근한 경우
    if (existing) {
      // isResume 플래그: 퇴근 후 이어서 근무하기
      if (isResume && existing.checkOut) {
        // 퇴근 기록 삭제하고 다시 근무 시작 (checkOut을 null로)
        const attendance = await prisma.attendance.update({
          where: { id: existing.id },
          data: {
            checkOut: null,
            note: `${existing.note || ''} | ${workLocation === 'REMOTE' ? '재택' : '사무실'}에서 근무 재개 (${now.toLocaleTimeString('ko-KR')})`,
          },
        })

        // Invalidate attendance cache
        await redis.del(`attendance:api:${user.id}`)
        await redis.del(`attendance:mobile:${user.id}`)

        secureLogger.info('Attendance resumed', {
          operation: 'attendance.resume',
          userId: user.id,
          workLocation,
          ipAddress,
        })

        return NextResponse.json({
          ...attendance,
          resumed: true,
          message: '근무를 재개했습니다',
        })
      }

      // 일반 출근 시도 - 이미 출근함
      return createErrorResponse('Already checked in today', 400, 'ALREADY_CHECKED_IN')
    }

    // Fetch Work Policy
    const workspaceId = null

    const policy = await prisma.workPolicy.findFirst({
      where: { workspaceId }
    })

    // Determine status based on policy
    let status = 'PRESENT'
    const hour = now.getHours()
    const minute = now.getMinutes()
    const currentTime = hour * 60 + minute

    if (policy) {
      if (policy.type === 'FIXED') {
        const [startHour, startMinute] = (policy.workStartTime || "09:00").split(':').map(Number)
        const startTime = startHour * 60 + startMinute

        if (currentTime > startTime) {
          status = 'LATE'
        }
      } else if (policy.type === 'CORE_TIME') {
        const [coreStartHour, coreStartMinute] = (policy.coreTimeStart || "11:00").split(':').map(Number)
        const coreStartTime = coreStartHour * 60 + coreStartMinute

        if (currentTime > coreStartTime) {
          status = 'LATE'
        }
      }
    } else {
      // Default 9 AM
      if (hour >= 9 && minute > 0) {
        status = 'LATE'
      } else if (hour > 9) {
        status = 'LATE'
      }
    }

    if (workLocation === 'REMOTE') {
      status = 'REMOTE'
    }

    const attendance = await prisma.attendance.create({
      data: {
        userId: user.id,
        date: today,
        checkIn: now,
        status: status as any,
        note: note || `${workLocation === 'REMOTE' ? '재택' : '사무실'} 출근 (IP: ${ipAddress || 'unknown'})`,
      },
    })

    // Invalidate attendance cache
    await redis.del(`attendance:api:${user.id}`)
    await redis.del(`attendance:mobile:${user.id}`)

    // CVE-CB-005 Fix: Use secure logging
    secureLogger.info('Attendance check-in successful', {
      operation: 'attendance.checkin',
      userId: user.id,
      status,
      workLocation,
      ipAddress,
    })

    return NextResponse.json(attendance)
  } catch (error) {
    secureLogger.error('Check-in failed', error as Error, { operation: 'attendance.checkin' })
    return createErrorResponse('Check-in failed', 500, 'CHECKIN_FAILED')
  }
}
