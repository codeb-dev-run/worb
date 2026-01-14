// =============================================================================
// Announcements API - CVE-CB-002 Fixed: Authentication Required
// =============================================================================

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { authenticateRequest, secureLogger, createErrorResponse } from '@/lib/security'
import {
  validateBody,
  validateQuery,
  validationErrorResponse,
  announcementCreateSchema,
  announcementQuerySchema,
  uuidSchema,
} from '@/lib/validation'
import { z } from 'zod'
import { notifyAnnouncement } from '@/lib/centrifugo-client'

export async function GET(request: NextRequest) {
  try {
    // CVE-CB-002 Fix: Require authentication
    const user = await authenticateRequest()
    if (!user) {
      return createErrorResponse('Unauthorized', 401, 'AUTH_REQUIRED')
    }

    const { searchParams } = new URL(request.url)

    // CVE-CB-007 Fix: Validate query parameters
    const validation = validateQuery(searchParams, announcementQuerySchema)
    if (!validation.success) {
      return validationErrorResponse(validation.errors!)
    }

    const { workspaceId, page, limit, sortOrder } = validation.data!

    // If workspaceId provided, verify user has access to it
    if (workspaceId) {
      const membership = await prisma.workspaceMember.findUnique({
        where: {
          workspaceId_userId: {
            workspaceId,
            userId: user.id,
          },
        },
      })

      if (!membership) {
        return createErrorResponse('Forbidden', 403, 'NOT_A_MEMBER')
      }
    }

    const announcements = await prisma.announcement.findMany({
      where: workspaceId ? { workspaceId } : {},
      orderBy: [
        { isPinned: 'desc' },
        { createdAt: sortOrder },
      ],
      include: {
        author: {
          select: { id: true, name: true, email: true, avatar: true }
        }
      },
      skip: (page - 1) * limit,
      take: limit,
    })

    // Add isNew flag for posts created in last 24 hours
    const now = new Date()
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000)

    const announcementsWithNew = announcements.map(a => ({
      ...a,
      isNew: new Date(a.createdAt) > oneDayAgo
    }))

    return NextResponse.json(announcementsWithNew)
  } catch (error) {
    // CVE-CB-005 Fix: Use secure logging
    secureLogger.error('Failed to fetch announcements', error as Error, { operation: 'announcements.list' })
    return createErrorResponse('Failed to fetch announcements', 500, 'FETCH_FAILED')
  }
}

export async function POST(request: NextRequest) {
  try {
    // CVE-CB-002 Fix: Require authentication
    const user = await authenticateRequest()
    if (!user) {
      return createErrorResponse('Unauthorized', 401, 'AUTH_REQUIRED')
    }

    // CVE-CB-007 Fix: Validate request body with Zod schema
    const validation = await validateBody(request, announcementCreateSchema.omit({ authorId: true }))
    if (!validation.success) {
      return validationErrorResponse(validation.errors!)
    }

    const { title, content, workspaceId, isPinned } = validation.data!

    // Verify user has access to workspace
    const membership = await prisma.workspaceMember.findUnique({
      where: {
        workspaceId_userId: {
          workspaceId,
          userId: user.id,
        },
      },
    })

    if (!membership) {
      return createErrorResponse('Forbidden', 403, 'NOT_A_MEMBER')
    }

    // CVE-CB-004 Fix: Only admin/manager/owner can create announcements
    if (!['admin', 'manager', 'owner'].includes(membership.role)) {
      return createErrorResponse('Forbidden', 403, 'INSUFFICIENT_PERMISSIONS')
    }

    const announcement = await prisma.announcement.create({
      data: {
        title,
        content,
        workspaceId,
        authorId: user.id, // Use authenticated user's ID
        isPinned: isPinned || false,
      },
      include: {
        author: {
          select: { id: true, name: true, email: true, avatar: true }
        }
      }
    })

    // 공지사항 발행 알림 발송
    try {
      await notifyAnnouncement(
        workspaceId,
        announcement.id,
        title,
        announcement.author?.name || user.email || '관리자'
      )
    } catch {
      // 알림 실패는 무시
    }

    secureLogger.info('Announcement created', {
      operation: 'announcements.create',
      userId: user.id,
      workspaceId,
      resourceId: announcement.id,
    })

    return NextResponse.json(announcement, { status: 201 })
  } catch (error) {
    secureLogger.error('Failed to create announcement', error as Error, { operation: 'announcements.create' })
    return createErrorResponse('Failed to create announcement', 500, 'CREATE_FAILED')
  }
}
