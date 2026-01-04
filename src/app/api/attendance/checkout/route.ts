// =============================================================================
// Attendance Check-out API - CVE-CB-003 Fixed: Session-based Authentication
// =============================================================================

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { redis } from '@/lib/redis'
import { authenticateRequest, secureLogger, createErrorResponse } from '@/lib/security'

export async function POST(request: NextRequest) {
  try {
    // CVE-CB-003 Fix: Use session-based authentication instead of x-user-id header
    const user = await authenticateRequest()
    if (!user) {
      return createErrorResponse('Unauthorized', 401, 'AUTH_REQUIRED')
    }

    // Get workspaceId from request body
    let workspaceId: string | undefined
    try {
      const body = await request.json()
      workspaceId = body.workspaceId
    } catch {
      // Body parsing failed, proceed without workspaceId
    }

    const now = new Date()
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    // Find today's attendance for this workspace
    const attendance = await prisma.attendance.findFirst({
      where: {
        userId: user.id,
        ...(workspaceId ? { workspaceId } : {}),
        date: {
          gte: today,
        },
      },
    })

    if (!attendance) {
      return createErrorResponse('No check-in record found', 400, 'NO_CHECKIN_RECORD')
    }

    if (attendance.checkOut) {
      return createErrorResponse('Already checked out', 400, 'ALREADY_CHECKED_OUT')
    }

    const updated = await prisma.attendance.update({
      where: { id: attendance.id },
      data: {
        checkOut: now,
      },
    })

    // Invalidate attendance cache (including workspace-specific cache)
    await redis.del(`attendance:api:${user.id}`)
    await redis.del(`attendance:mobile:${user.id}`)
    if (workspaceId) {
      await redis.del(`attendance:api:${user.id}:${workspaceId}`)
    }

    // CVE-CB-005 Fix: Use secure logging
    secureLogger.info('Attendance check-out successful', {
      operation: 'attendance.checkout',
      userId: user.id,
      attendanceId: attendance.id,
    })

    return NextResponse.json(updated)
  } catch (error) {
    secureLogger.error('Check-out failed', error as Error, { operation: 'attendance.checkout' })
    return createErrorResponse('Check-out failed', 500, 'CHECKOUT_FAILED')
  }
}
