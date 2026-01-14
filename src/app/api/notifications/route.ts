// =============================================================================
// Notifications API - 알림 목록 조회 및 읽음 처리
// =============================================================================

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { authenticateRequest, secureLogger, createErrorResponse } from '@/lib/security'

// GET: 알림 목록 조회
export async function GET(request: NextRequest) {
  try {
    const user = await authenticateRequest()
    if (!user) {
      return createErrorResponse('Unauthorized', 401, 'AUTH_REQUIRED')
    }

    const { searchParams } = new URL(request.url)
    const workspaceId = searchParams.get('workspaceId')
    const unreadOnly = searchParams.get('unreadOnly') === 'true'
    const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 100)

    const notifications = await prisma.notification.findMany({
      where: {
        userId: user.id,
        ...(workspaceId && { workspaceId }),
        ...(unreadOnly && { isRead: false }),
        OR: [
          { expiresAt: null },
          { expiresAt: { gt: new Date() } }
        ]
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    })

    // 읽지 않은 알림 수
    const unreadCount = await prisma.notification.count({
      where: {
        userId: user.id,
        isRead: false,
        ...(workspaceId && { workspaceId }),
        OR: [
          { expiresAt: null },
          { expiresAt: { gt: new Date() } }
        ]
      }
    })

    return NextResponse.json({
      notifications: notifications.map(n => ({
        id: n.id,
        type: n.type.toLowerCase(),
        title: n.title,
        message: n.message,
        link: n.link,
        read: n.isRead,
        time: n.createdAt.toISOString(),
        metadata: n.metadata,
      })),
      unreadCount,
    })
  } catch (error) {
    secureLogger.error('Failed to fetch notifications', error as Error, { operation: 'notifications.list' })
    return createErrorResponse('Failed to fetch notifications', 500, 'FETCH_FAILED')
  }
}

// PATCH: 알림 읽음 처리
export async function PATCH(request: NextRequest) {
  try {
    const user = await authenticateRequest()
    if (!user) {
      return createErrorResponse('Unauthorized', 401, 'AUTH_REQUIRED')
    }

    const body = await request.json()
    const { notificationIds, markAllAsRead } = body

    if (markAllAsRead) {
      // 모든 알림 읽음 처리
      await prisma.notification.updateMany({
        where: {
          userId: user.id,
          isRead: false,
        },
        data: {
          isRead: true,
          readAt: new Date(),
        }
      })

      return NextResponse.json({ success: true, message: '모든 알림을 읽음으로 표시했습니다.' })
    }

    if (notificationIds && Array.isArray(notificationIds)) {
      // 특정 알림들 읽음 처리
      await prisma.notification.updateMany({
        where: {
          id: { in: notificationIds },
          userId: user.id,
        },
        data: {
          isRead: true,
          readAt: new Date(),
        }
      })

      return NextResponse.json({ success: true, message: '알림을 읽음으로 표시했습니다.' })
    }

    return createErrorResponse('notificationIds or markAllAsRead is required', 400, 'INVALID_REQUEST')
  } catch (error) {
    secureLogger.error('Failed to update notifications', error as Error, { operation: 'notifications.update' })
    return createErrorResponse('Failed to update notifications', 500, 'UPDATE_FAILED')
  }
}
