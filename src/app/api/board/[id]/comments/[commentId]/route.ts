// =============================================================================
// Board Comment API - CVE-CB-005 Fixed: Secure Logging
// =============================================================================

import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { secureLogger, createErrorResponse } from '@/lib/security'

// PUT - Update a comment
export async function PUT(
    request: Request,
    { params }: { params: Promise<{ id: string; commentId: string }> }
) {
    try {
        const { id, commentId } = await params
        const body = await request.json()
        const { content } = body

        if (!content) {
            return NextResponse.json(
                { error: 'Content is required' },
                { status: 400 }
            )
        }

        const comment = await prisma.boardComment.update({
            where: { id: commentId },
            data: {
                content,
                updatedAt: new Date(),
            },
            include: {
                author: {
                    select: { id: true, name: true, email: true, avatar: true }
                }
            }
        })

        return NextResponse.json(comment)
    } catch (error) {
        // CVE-CB-005: Secure logging
        secureLogger.error('Failed to update comment', error as Error, { operation: 'board.comments.update' })
        return createErrorResponse('Failed to update comment', 500, 'UPDATE_FAILED')
    }
}

// DELETE - Delete a comment
export async function DELETE(
    request: Request,
    { params }: { params: Promise<{ id: string; commentId: string }> }
) {
    try {
        const { id, commentId } = await params
        await prisma.boardComment.delete({
            where: { id: commentId },
        })

        return NextResponse.json({ success: true })
    } catch (error) {
        // CVE-CB-005: Secure logging
        secureLogger.error('Failed to delete comment', error as Error, { operation: 'board.comments.delete' })
        return createErrorResponse('Failed to delete comment', 500, 'DELETE_FAILED')
    }
}
