// =============================================================================
// Board Post API - CVE-CB-002, CVE-CB-003, CVE-CB-005 Fixed
// =============================================================================

import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { auth } from '@/auth'
import { secureLogger, createErrorResponse, authenticateRequest } from '@/lib/security'

// GET - Get single post with view count increment
export async function GET(
    request: Request,
    { params }: { params: { id: string } }
) {
    try {
        // CVE-CB-002: Add authentication
        const session = await auth()
        if (!session?.user?.email) {
            return createErrorResponse('Unauthorized', 401, 'AUTH_REQUIRED')
        }

        // Increment view count and get post
        const post = await prisma.board.update({
            where: { id: params.id },
            data: {
                viewCount: { increment: 1 }
            },
            include: {
                author: {
                    select: { id: true, name: true, email: true, avatar: true }
                },
                comments: {
                    include: {
                        author: {
                            select: { id: true, name: true, avatar: true }
                        }
                    },
                    orderBy: { createdAt: 'asc' }
                }
            }
        })

        if (!post) {
            return createErrorResponse('Post not found', 404, 'NOT_FOUND')
        }

        return NextResponse.json(post)
    } catch (error) {
        // CVE-CB-005: Secure logging
        secureLogger.error('Failed to fetch post', error as Error, { operation: 'board.get' })
        return createErrorResponse('Failed to fetch post', 500, 'FETCH_FAILED')
    }
}

// PUT - Update post
export async function PUT(
    request: Request,
    { params }: { params: { id: string } }
) {
    try {
        // CVE-CB-002: Add authentication
        const user = await authenticateRequest()
        if (!user) {
            return createErrorResponse('Unauthorized', 401, 'AUTH_REQUIRED')
        }

        // CVE-CB-004: Verify ownership before update
        const existingPost = await prisma.board.findUnique({
            where: { id: params.id },
            select: { authorId: true }
        })

        if (!existingPost) {
            return createErrorResponse('Post not found', 404, 'NOT_FOUND')
        }

        // Only author or admin can update
        if (existingPost.authorId !== user.id && user.role !== 'admin') {
            return createErrorResponse('Forbidden', 403, 'NOT_AUTHORIZED')
        }

        const body = await request.json()
        const { title, content, category, isPinned } = body

        const post = await prisma.board.update({
            where: { id: params.id },
            data: {
                title,
                content,
                category,
                isPinned,
                updatedAt: new Date(),
            },
            include: {
                author: {
                    select: { id: true, name: true, email: true, avatar: true }
                }
            }
        })

        secureLogger.info('Board post updated', {
            operation: 'board.update',
            postId: params.id,
            userId: user.id,
        })

        return NextResponse.json(post)
    } catch (error) {
        // CVE-CB-005: Secure logging
        secureLogger.error('Failed to update post', error as Error, { operation: 'board.update' })
        return createErrorResponse('Failed to update post', 500, 'UPDATE_FAILED')
    }
}

// DELETE - Delete post
export async function DELETE(
    request: Request,
    { params }: { params: { id: string } }
) {
    try {
        // CVE-CB-002: Add authentication
        const user = await authenticateRequest()
        if (!user) {
            return createErrorResponse('Unauthorized', 401, 'AUTH_REQUIRED')
        }

        // CVE-CB-004: Verify ownership before delete
        const existingPost = await prisma.board.findUnique({
            where: { id: params.id },
            select: { authorId: true }
        })

        if (!existingPost) {
            return createErrorResponse('Post not found', 404, 'NOT_FOUND')
        }

        // Only author or admin can delete
        if (existingPost.authorId !== user.id && user.role !== 'admin') {
            return createErrorResponse('Forbidden', 403, 'NOT_AUTHORIZED')
        }

        await prisma.board.delete({
            where: { id: params.id },
        })

        secureLogger.info('Board post deleted', {
            operation: 'board.delete',
            postId: params.id,
            userId: user.id,
        })

        return NextResponse.json({ success: true })
    } catch (error) {
        // CVE-CB-005: Secure logging
        secureLogger.error('Failed to delete post', error as Error, { operation: 'board.delete' })
        return createErrorResponse('Failed to delete post', 500, 'DELETE_FAILED')
    }
}
