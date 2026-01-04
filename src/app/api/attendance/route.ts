// =============================================================================
// Attendance List API - CVE-CB-003 Fixed: Session-based Authentication
// =============================================================================

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getOrSet } from '@/lib/redis'
import { authenticateRequest, secureLogger, createErrorResponse } from '@/lib/security'
import { validateQuery, attendanceQuerySchema, validationErrorResponse } from '@/lib/validation'

export async function GET(request: NextRequest) {
  try {
    // CVE-CB-003 Fix: Use session-based authentication instead of x-user-id header
    const user = await authenticateRequest()
    if (!user) {
      return createErrorResponse('Unauthorized', 401, 'AUTH_REQUIRED')
    }

    const { searchParams } = new URL(request.url)

    // CVE-CB-007 Fix: Validate query parameters
    const validation = validateQuery(searchParams, attendanceQuerySchema)
    if (!validation.success) {
      return validationErrorResponse(validation.errors!)
    }

    // Get workspaceId from query params - required for proper workspace separation
    const workspaceId = searchParams.get('workspaceId')

    const cacheKey = workspaceId
      ? `attendance:api:${user.id}:${workspaceId}`
      : `attendance:api:${user.id}`

    // Cache for 1 hour (or until invalidated by check-in/out)
    const data = await getOrSet(cacheKey, async () => {
      const today = new Date()
      today.setHours(0, 0, 0, 0)

      // Get today's attendance - filter by workspace if provided
      const todayAttendance = await prisma.attendance.findFirst({
        where: {
          userId: user.id,
          ...(workspaceId ? { workspaceId } : {}),
          date: {
            gte: today,
          },
        },
      })

      // Get recent history (last 30 days)
      const thirtyDaysAgo = new Date()
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

      const history = await prisma.attendance.findMany({
        where: {
          userId: user.id,
          ...(workspaceId ? { workspaceId } : {}),
          date: {
            gte: thirtyDaysAgo,
          },
        },
        orderBy: {
          date: 'desc',
        },
        take: 30,
      })

      return {
        today: todayAttendance,
        history,
      }
    }, 3600)

    return NextResponse.json(data)
  } catch (error) {
    secureLogger.error('Failed to fetch attendance', error as Error, { operation: 'attendance.list' })
    return createErrorResponse('Failed to fetch attendance', 500, 'FETCH_FAILED')
  }
}
