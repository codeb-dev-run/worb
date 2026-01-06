// =============================================================================
// Announcement API - CVE-CB-002, CVE-CB-003, CVE-CB-004, CVE-CB-005 Fixed
// =============================================================================

import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { secureLogger, createErrorResponse, authenticateRequest } from '@/lib/security'

// GET - Get single announcement
export async function GET(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params
        // CVE-CB-002: Add authentication
        const user = await authenticateRequest()
        if (!user) {
            return createErrorResponse('Unauthorized', 401, 'AUTH_REQUIRED')
        }

        const announcement = await prisma.announcement.findUnique({
            where: { id },
            include: {
                author: {
                    select: { id: true, name: true, email: true, avatar: true }
                }
            }
        })

        if (!announcement) {
            return createErrorResponse('Announcement not found', 404, 'NOT_FOUND')
        }

        return NextResponse.json(announcement)
    } catch (error) {
        // CVE-CB-005: Secure logging
        secureLogger.error('Failed to fetch announcement', error as Error, { operation: 'announcements.get' })
        return createErrorResponse('Failed to fetch announcement', 500, 'FETCH_FAILED')
    }
}

// PUT - Update announcement
export async function PUT(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params
        // CVE-CB-002: Add authentication
        const user = await authenticateRequest()
        if (!user) {
            return createErrorResponse('Unauthorized', 401, 'AUTH_REQUIRED')
        }

        // CVE-CB-004: Verify ownership or admin role
        const existing = await prisma.announcement.findUnique({
            where: { id },
            select: { authorId: true }
        })

        if (!existing) {
            return createErrorResponse('Announcement not found', 404, 'NOT_FOUND')
        }

        // Only author or admin can update
        if (existing.authorId !== user.id && user.role !== 'admin') {
            return createErrorResponse('Forbidden', 403, 'NOT_AUTHORIZED')
        }

        const body = await request.json()
        const { title, content, isPinned } = body

        const announcement = await prisma.announcement.update({
            where: { id },
            data: {
                title,
                content,
                isPinned,
                updatedAt: new Date(),
            },
        })

        secureLogger.info('Announcement updated', {
            operation: 'announcements.update',
            announcementId: id,
            userId: user.id,
        })

        return NextResponse.json(announcement)
    } catch (error) {
        // CVE-CB-005: Secure logging
        secureLogger.error('Failed to update announcement', error as Error, { operation: 'announcements.update' })
        return createErrorResponse('Failed to update announcement', 500, 'UPDATE_FAILED')
    }
}

// DELETE - Delete announcement
export async function DELETE(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params
        // CVE-CB-002: Add authentication
        const user = await authenticateRequest()
        if (!user) {
            return createErrorResponse('Unauthorized', 401, 'AUTH_REQUIRED')
        }

        // CVE-CB-004: Verify ownership or admin role
        const existing = await prisma.announcement.findUnique({
            where: { id },
            select: { authorId: true }
        })

        if (!existing) {
            return createErrorResponse('Announcement not found', 404, 'NOT_FOUND')
        }

        // Only author or admin can delete
        if (existing.authorId !== user.id && user.role !== 'admin') {
            return createErrorResponse('Forbidden', 403, 'NOT_AUTHORIZED')
        }

        await prisma.announcement.delete({
            where: { id },
        })

        secureLogger.info('Announcement deleted', {
            operation: 'announcements.delete',
            announcementId: id,
            userId: user.id,
        })

        return NextResponse.json({ success: true })
    } catch (error) {
        // CVE-CB-005: Secure logging
        secureLogger.error('Failed to delete announcement', error as Error, { operation: 'announcements.delete' })
        return createErrorResponse('Failed to delete announcement', 500, 'DELETE_FAILED')
    }
}
