// =============================================================================
// Attendance Change Request Admin API - List all requests in workspace
// =============================================================================

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { authenticateRequest, secureLogger, createErrorResponse } from '@/lib/security'

// GET /api/attendance/change-request/admin - Get all change requests (Admin)
export async function GET(request: NextRequest) {
  try {
    const user = await authenticateRequest()
    if (!user) {
      return createErrorResponse('Unauthorized', 401, 'AUTH_REQUIRED')
    }

    const { searchParams } = new URL(request.url)
    const workspaceId = searchParams.get('workspaceId')
    const status = searchParams.get('status')

    if (!workspaceId) {
      return createErrorResponse('Workspace ID is required', 400, 'VALIDATION_ERROR')
    }

    // Check if user is admin
    const membership = await prisma.workspaceMember.findUnique({
      where: {
        workspaceId_userId: {
          workspaceId,
          userId: user.id,
        },
      },
    })

    if (!membership || membership.role !== 'admin') {
      return createErrorResponse('Admin access required', 403, 'FORBIDDEN')
    }

    const requests = await prisma.attendanceChangeRequest.findMany({
      where: {
        workspaceId,
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
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            avatar: true,
          },
        },
        reviewer: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: [
        { status: 'asc' }, // PENDING first
        { createdAt: 'desc' },
      ],
      take: 100,
    })

    return NextResponse.json(requests)
  } catch (error) {
    secureLogger.error('Failed to get admin attendance change requests', error as Error, {
      operation: 'attendance.changeRequest.adminList',
    })
    return createErrorResponse('Failed to get change requests', 500, 'CHANGE_REQUEST_ADMIN_LIST_FAILED')
  }
}
