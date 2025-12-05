// =============================================================================
// Board Comments API - CVE-CB-002, CVE-CB-003, CVE-CB-005 Fixed
// =============================================================================

import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { auth } from '@/auth'
import { secureLogger, createErrorResponse, validateBody, ValidationError } from '@/lib/security'
import { z } from 'zod'

// CVE-CB-007: Input validation
const commentSchema = z.object({
    content: z.string().min(1).max(2000),
})

// GET - Get all comments for a post
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

        const comments = await prisma.boardComment.findMany({
            where: { boardId: params.id },
            include: {
                author: {
                    select: { id: true, name: true, email: true, avatar: true }
                }
            },
            orderBy: { createdAt: 'asc' }
        })

        return NextResponse.json(comments)
    } catch (error) {
        // CVE-CB-005: Secure logging
        secureLogger.error('Failed to fetch comments', error as Error, { operation: 'board.comments.list' })
        return createErrorResponse('Failed to fetch comments', 500, 'FETCH_FAILED')
    }
}

// POST - Create a new comment
export async function POST(
    request: Request,
    { params }: { params: { id: string } }
) {
    try {
        // CVE-CB-002, CVE-CB-003: Session-based authentication (not header-based authorId)
        const session = await auth()
        if (!session?.user?.email) {
            return createErrorResponse('Unauthorized', 401, 'AUTH_REQUIRED')
        }

        const currentUser = await prisma.user.findUnique({
            where: { email: session.user.email }
        })

        if (!currentUser) {
            return createErrorResponse('User not found', 404, 'USER_NOT_FOUND')
        }

        // CVE-CB-007: Validate input (throws ValidationError on failure)
        let validatedData: z.infer<typeof commentSchema>
        try {
            validatedData = await validateBody(request, commentSchema)
        } catch (error) {
            if (error instanceof ValidationError) {
                return createErrorResponse(error.message, 400, 'VALIDATION_ERROR')
            }
            throw error
        }

        const { content } = validatedData

        const comment = await prisma.boardComment.create({
            data: {
                boardId: params.id,
                content,
                authorId: currentUser.id, // Use session user ID, not request body
            },
            include: {
                author: {
                    select: { id: true, name: true, email: true, avatar: true }
                }
            }
        })

        secureLogger.info('Comment created', {
            operation: 'board.comments.create',
            boardId: params.id,
            commentId: comment.id,
            userId: currentUser.id,
        })

        return NextResponse.json(comment)
    } catch (error) {
        // CVE-CB-005: Secure logging
        secureLogger.error('Failed to create comment', error as Error, { operation: 'board.comments.create' })
        return createErrorResponse('Failed to create comment', 500, 'CREATE_FAILED')
    }
}
