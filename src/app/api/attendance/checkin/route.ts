// =============================================================================
// Attendance Check-in API - CVE-CB-003 Fixed: Session-based Authentication
// 지원 기능: 출근, 퇴근 후 이어서 근무 (isResume)
// CVE-CB-010 Fixed: Server-side IP validation for office check-in
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

    const { workLocation, note, isResume, ipAddress, workspaceId } = validation.data!

    // CVE-CB-010 Fix: Server-side IP validation for office check-in
    // Fetch Work Policy to get office IP whitelist
    const policy = await prisma.workPolicy.findFirst({
      where: { workspaceId: workspaceId || null }
    })

    const officeIps = (policy?.officeIpWhitelist as string[]) || []
    const hasIpWhitelist = officeIps.length > 0
    const isOfficeIP = ipAddress && officeIps.includes(ipAddress)

    // IP 화이트리스트가 설정된 경우에만 검증
    if (hasIpWhitelist) {
      // Block: Trying to check-in as OFFICE from non-office IP
      if (workLocation === 'OFFICE' && !isOfficeIP) {
        secureLogger.warn('Office check-in attempted from non-office IP', {
          operation: 'attendance.checkin.blocked',
          userId: user.id,
          ipAddress,
          workLocation,
        })
        return createErrorResponse(
          '회사 IP가 아닙니다. 재택근무로 전환해주세요.',
          403,
          'OFFICE_IP_REQUIRED'
        )
      }

      // Block: Trying to check-in as REMOTE from office IP
      if (workLocation === 'REMOTE' && isOfficeIP) {
        secureLogger.warn('Remote check-in attempted from office IP', {
          operation: 'attendance.checkin.blocked',
          userId: user.id,
          ipAddress,
          workLocation,
        })
        return createErrorResponse(
          '사무실 IP에서는 재택근무를 선택할 수 없습니다.',
          403,
          'REMOTE_NOT_ALLOWED_FROM_OFFICE'
        )
      }
    }
    // IP 화이트리스트가 없으면 사무실 출근 제한 없음 (워크스페이스 설정에 따라 동작)

    const now = new Date()
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    // Check if already checked in today for this workspace
    const existing = await prisma.attendance.findFirst({
      where: {
        userId: user.id,
        ...(workspaceId ? { workspaceId } : {}),
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

        // Invalidate attendance cache (including workspace-specific cache)
        await redis.del(`attendance:api:${user.id}`)
        await redis.del(`attendance:mobile:${user.id}`)
        if (workspaceId) {
          await redis.del(`attendance:api:${user.id}:${workspaceId}`)
        }

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

    // Determine status based on policy (policy already fetched for IP validation)
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
        workspaceId: workspaceId || null,
        date: today,
        checkIn: now,
        status: status as any,
        note: note || `${workLocation === 'REMOTE' ? '재택' : '사무실'} 출근 (IP: ${ipAddress || 'unknown'})`,
      },
    })

    // Invalidate attendance cache (including workspace-specific cache)
    await redis.del(`attendance:api:${user.id}`)
    await redis.del(`attendance:mobile:${user.id}`)
    if (workspaceId) {
      await redis.del(`attendance:api:${user.id}:${workspaceId}`)
    }

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
