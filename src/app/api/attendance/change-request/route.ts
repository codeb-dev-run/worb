// =============================================================================
// Attendance Change Request API - List and Create
// =============================================================================

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { authenticateRequest, secureLogger, createErrorResponse } from '@/lib/security'

// GET /api/attendance/change-request - Get user's change requests
export async function GET(request: NextRequest) {
  try {
    const user = await authenticateRequest()
    if (!user) {
      return createErrorResponse('Unauthorized', 401, 'AUTH_REQUIRED')
    }

    const { searchParams } = new URL(request.url)
    const workspaceId = searchParams.get('workspaceId')
    const status = searchParams.get('status')

    const requests = await prisma.attendanceChangeRequest.findMany({
      where: {
        userId: user.id,
        ...(workspaceId && { workspaceId }),
        ...(status && { status: status as 'PENDING' | 'APPROVED' | 'REJECTED' }),
      },
      include: {
        attendance: {
          select: {
            id: true,
            date: true,
            checkIn: true,
            checkOut: true,
            status: true,
          },
        },
        reviewer: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    })

    return NextResponse.json(requests)
  } catch (error) {
    secureLogger.error('Failed to get attendance change requests', error as Error, {
      operation: 'attendance.changeRequest.list',
    })
    return createErrorResponse('Failed to get change requests', 500, 'CHANGE_REQUEST_LIST_FAILED')
  }
}

// POST /api/attendance/change-request - Create change request
export async function POST(request: NextRequest) {
  try {
    const user = await authenticateRequest()
    if (!user) {
      return createErrorResponse('Unauthorized', 401, 'AUTH_REQUIRED')
    }

    const body = await request.json()
    const { attendanceId, requestType, requestedTime, reason, workspaceId } = body

    // Validation
    if (!attendanceId) {
      return createErrorResponse('Attendance ID is required', 400, 'VALIDATION_ERROR')
    }
    if (!requestType || !['CHECK_IN', 'CHECK_OUT', 'BOTH'].includes(requestType)) {
      return createErrorResponse('Invalid request type', 400, 'VALIDATION_ERROR')
    }
    if (!requestedTime) {
      return createErrorResponse('Requested time is required', 400, 'VALIDATION_ERROR')
    }
    if (!reason || reason.trim().length < 5) {
      return createErrorResponse('Reason must be at least 5 characters', 400, 'VALIDATION_ERROR')
    }

    // Get attendance record
    const attendance = await prisma.attendance.findUnique({
      where: { id: attendanceId },
    })

    if (!attendance) {
      return createErrorResponse('Attendance record not found', 404, 'ATTENDANCE_NOT_FOUND')
    }

    // Verify user owns this attendance
    if (attendance.userId !== user.id) {
      return createErrorResponse('You can only request changes for your own attendance', 403, 'FORBIDDEN')
    }

    // Check for existing pending request
    const existingRequest = await prisma.attendanceChangeRequest.findFirst({
      where: {
        attendanceId,
        status: 'PENDING',
      },
    })

    if (existingRequest) {
      return createErrorResponse('A pending request already exists for this record', 400, 'DUPLICATE_REQUEST')
    }

    // Get original time based on request type
    let originalTime: Date | null = null
    if (requestType === 'CHECK_IN') {
      originalTime = attendance.checkIn
    } else if (requestType === 'CHECK_OUT') {
      originalTime = attendance.checkOut
    }

    // Create change request
    const changeRequest = await prisma.attendanceChangeRequest.create({
      data: {
        attendanceId,
        userId: user.id,
        workspaceId: workspaceId || attendance.workspaceId,
        requestType,
        originalTime,
        requestedTime: new Date(requestedTime),
        reason: reason.trim(),
        status: 'PENDING',
      },
      include: {
        attendance: {
          select: {
            id: true,
            date: true,
            checkIn: true,
            checkOut: true,
          },
        },
      },
    })

    secureLogger.info('Attendance change request created', {
      operation: 'attendance.changeRequest.create',
      userId: user.id,
      requestId: changeRequest.id,
      attendanceId,
      requestType,
    })

    return NextResponse.json(changeRequest, { status: 201 })
  } catch (error) {
    secureLogger.error('Failed to create attendance change request', error as Error, {
      operation: 'attendance.changeRequest.create',
    })
    return createErrorResponse('Failed to create change request', 500, 'CHANGE_REQUEST_CREATE_FAILED')
  }
}
