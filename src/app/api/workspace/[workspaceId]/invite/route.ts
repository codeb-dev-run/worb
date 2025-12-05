// =============================================================================
// Workspace Invite API - CVE-CB-005 Fixed: Secure Logging
// =============================================================================

import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { auth } from '@/auth'
import { sendInviteEmail } from '@/lib/email'
import { v4 as uuidv4 } from 'uuid'
import { secureLogger, createErrorResponse, validateBody, ValidationError } from '@/lib/security'
import { z } from 'zod'

// CVE-CB-007: Input validation
const inviteSchema = z.object({
    email: z.string().email('Invalid email format').max(255),
    name: z.string().max(100).optional(),
})

export async function POST(
    request: Request,
    { params }: { params: { workspaceId: string } }
) {
    try {
        const session = await auth()
        if (!session?.user?.email) {
            return createErrorResponse('Unauthorized', 401, 'AUTH_REQUIRED')
        }

        // CVE-CB-007: Validate input (throws ValidationError on failure)
        let validatedData: z.infer<typeof inviteSchema>
        try {
            validatedData = await validateBody(request, inviteSchema)
        } catch (error) {
            if (error instanceof ValidationError) {
                return createErrorResponse(error.message, 400, 'VALIDATION_ERROR')
            }
            throw error
        }

        const { email, name } = validatedData
        const workspaceId = params.workspaceId

        // 1. 권한 확인 (초대자가 워크스페이스 멤버인지)
        const inviter = await prisma.user.findUnique({
            where: { email: session.user.email },
        })

        if (!inviter) {
            return createErrorResponse('User not found', 404, 'USER_NOT_FOUND')
        }

        const membership = await prisma.workspaceMember.findUnique({
            where: {
                workspaceId_userId: {
                    workspaceId,
                    userId: inviter.id,
                },
            },
            include: {
                workspace: true,
            },
        })

        if (!membership) {
            return createErrorResponse('Not a member of this workspace', 403, 'NOT_A_MEMBER')
        }

        // 2. 이미 멤버인지 확인
        const existingMember = await prisma.workspaceMember.findFirst({
            where: {
                workspaceId,
                user: {
                    email,
                },
            },
        })

        if (existingMember) {
            return createErrorResponse('User is already a member', 400, 'ALREADY_MEMBER')
        }

        // 3. 초대 생성
        const token = uuidv4()
        const expiresAt = new Date()
        expiresAt.setDate(expiresAt.getDate() + 7) // 7일 후 만료

        const invite = await prisma.invitation.create({
            data: {
                workspaceId,
                email,
                token,
                invitedBy: inviter.id,
                expiresAt,
                status: 'PENDING',
            },
        })

        // 4. 이메일 발송
        const inviteUrl = `${process.env.NEXTAUTH_URL}/invite/${token}`
        const emailSent = await sendInviteEmail(
            email,
            inviteUrl,
            membership.workspace.name,
            inviter.name || inviter.email
        )

        if (!emailSent) {
            // CVE-CB-005: Secure logging
            secureLogger.warn('Failed to send invite email', {
                operation: 'workspace.invite.email_failed',
                workspaceId,
                inviteId: invite.id,
            })
        }

        // CVE-CB-005: Secure logging
        secureLogger.info('Invitation created', {
            operation: 'workspace.invite.created',
            workspaceId,
            inviteId: invite.id,
            inviterId: inviter.id,
        })

        return NextResponse.json({ success: true, invite })
    } catch (error) {
        // CVE-CB-005: Secure logging
        secureLogger.error('Failed to invite member', error as Error, { operation: 'workspace.invite' })
        return createErrorResponse('Failed to invite member', 500, 'INVITE_FAILED')
    }
}
