// =============================================================================
// Attendance Change Request API - Get, Update, Delete Individual Request
// =============================================================================

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { authenticateRequest, secureLogger, createErrorResponse } from '@/lib/security'

interface RouteParams {
  params: Promise<{ id: string }>
}

// GET /api/attendance/change-request/[id] - Get request details
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const user = await authenticateRequest()
    if (!user) {
      return createErrorResponse('Unauthorized', 401, 'AUTH_REQUIRED')
    }

    const { id } = await params

    const changeRequest = await prisma.attendanceChangeRequest.findUnique({
      where: { id },
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
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        reviewer: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    })

    if (!changeRequest) {
      return createErrorResponse('Change request not found', 404, 'NOT_FOUND')
    }

    return NextResponse.json(changeRequest)
  } catch (error) {
    secureLogger.error('Failed to get attendance change request', error as Error, {
      operation: 'attendance.changeRequest.get',
    })
    return createErrorResponse('Failed to get change request', 500, 'CHANGE_REQUEST_GET_FAILED')
  }
}

// PATCH /api/attendance/change-request/[id] - Approve or reject request (Admin only)
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const user = await authenticateRequest()
    if (!user) {
      return createErrorResponse('Unauthorized', 401, 'AUTH_REQUIRED')
    }

    const { id } = await params
    const body = await request.json()
    const { action, rejectReason } = body

    if (!action || !['approve', 'reject'].includes(action)) {
      return createErrorResponse('Invalid action', 400, 'VALIDATION_ERROR')
    }

    if (action === 'reject' && (!rejectReason || rejectReason.trim().length < 3)) {
      return createErrorResponse('Reject reason is required', 400, 'VALIDATION_ERROR')
    }

    // Get the change request
    const changeRequest = await prisma.attendanceChangeRequest.findUnique({
      where: { id },
      include: {
        attendance: true,
      },
    })

    if (!changeRequest) {
      return createErrorResponse('Change request not found', 404, 'NOT_FOUND')
    }

    if (changeRequest.status !== 'PENDING') {
      return createErrorResponse('Request has already been processed', 400, 'ALREADY_PROCESSED')
    }

    // Check if user is admin in the workspace
    if (changeRequest.workspaceId) {
      const membership = await prisma.workspaceMember.findUnique({
        where: {
          workspaceId_userId: {
            workspaceId: changeRequest.workspaceId,
            userId: user.id,
          },
        },
      })

      if (!membership || membership.role !== 'admin') {
        return createErrorResponse('Only admins can approve or reject requests', 403, 'FORBIDDEN')
      }
    }

    // Process the request
    if (action === 'approve') {
      // Update the attendance record
      const updateData: { checkIn?: Date; checkOut?: Date } = {}

      if (changeRequest.requestType === 'CHECK_IN' || changeRequest.requestType === 'BOTH') {
        updateData.checkIn = changeRequest.requestedTime
      }
      if (changeRequest.requestType === 'CHECK_OUT' || changeRequest.requestType === 'BOTH') {
        updateData.checkOut = changeRequest.requestedTime
      }

      // Start transaction
      const [updatedRequest] = await prisma.$transaction([
        prisma.attendanceChangeRequest.update({
          where: { id },
          data: {
            status: 'APPROVED',
            reviewedBy: user.id,
            reviewedAt: new Date(),
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
            reviewer: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        }),
        prisma.attendance.update({
          where: { id: changeRequest.attendanceId },
          data: updateData,
        }),
      ])

      secureLogger.info('Attendance change request approved', {
        operation: 'attendance.changeRequest.approve',
        userId: user.id,
        requestId: id,
        attendanceId: changeRequest.attendanceId,
      })

      return NextResponse.json(updatedRequest)
    } else {
      // Reject the request
      const updatedRequest = await prisma.attendanceChangeRequest.update({
        where: { id },
        data: {
          status: 'REJECTED',
          reviewedBy: user.id,
          reviewedAt: new Date(),
          rejectReason: rejectReason.trim(),
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
          reviewer: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      })

      secureLogger.info('Attendance change request rejected', {
        operation: 'attendance.changeRequest.reject',
        userId: user.id,
        requestId: id,
        reason: rejectReason,
      })

      return NextResponse.json(updatedRequest)
    }
  } catch (error) {
    secureLogger.error('Failed to process attendance change request', error as Error, {
      operation: 'attendance.changeRequest.process',
    })
    return createErrorResponse('Failed to process change request', 500, 'CHANGE_REQUEST_PROCESS_FAILED')
  }
}

// DELETE /api/attendance/change-request/[id] - Cancel pending request
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const user = await authenticateRequest()
    if (!user) {
      return createErrorResponse('Unauthorized', 401, 'AUTH_REQUIRED')
    }

    const { id } = await params

    const changeRequest = await prisma.attendanceChangeRequest.findUnique({
      where: { id },
    })

    if (!changeRequest) {
      return createErrorResponse('Change request not found', 404, 'NOT_FOUND')
    }

    // Only allow user to cancel their own pending requests
    if (changeRequest.userId !== user.id) {
      return createErrorResponse('You can only cancel your own requests', 403, 'FORBIDDEN')
    }

    if (changeRequest.status !== 'PENDING') {
      return createErrorResponse('Can only cancel pending requests', 400, 'INVALID_STATUS')
    }

    await prisma.attendanceChangeRequest.delete({
      where: { id },
    })

    secureLogger.info('Attendance change request cancelled', {
      operation: 'attendance.changeRequest.cancel',
      userId: user.id,
      requestId: id,
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    secureLogger.error('Failed to cancel attendance change request', error as Error, {
      operation: 'attendance.changeRequest.cancel',
    })
    return createErrorResponse('Failed to cancel change request', 500, 'CHANGE_REQUEST_CANCEL_FAILED')
  }
}
