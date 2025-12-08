// =============================================================================
// Project Invitation Decline API - Decline project invitation
// =============================================================================

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth-options'
import { secureLogger, createErrorResponse } from '@/lib/security'

// POST /api/project-invitations/[token]/decline - Decline project invitation
export async function POST(
    request: NextRequest,
    { params }: { params: { token: string } }
) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user?.email) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        // 1. Find invitation
        const invitation = await prisma.projectInvitation.findUnique({
            where: { token: params.token },
            include: {
                project: {
                    select: {
                        id: true,
                        name: true,
                    },
                },
            },
        })

        if (!invitation) {
            return NextResponse.json({ error: 'Invalid invitation token' }, { status: 404 })
        }

        // 2. Check invitation status
        if (invitation.status !== 'PENDING') {
            return NextResponse.json(
                { error: 'This invitation is no longer valid' },
                { status: 400 }
            )
        }

        // 3. Check expiration
        if (new Date() > invitation.expiresAt) {
            await prisma.projectInvitation.update({
                where: { id: invitation.id },
                data: { status: 'EXPIRED' },
            })
            return NextResponse.json(
                { error: 'This invitation has expired' },
                { status: 400 }
            )
        }

        // 4. Update invitation status to REVOKED (declined by user)
        await prisma.projectInvitation.update({
            where: { id: invitation.id },
            data: { status: 'REVOKED' },
        })

        return NextResponse.json({
            success: true,
            message: 'Invitation declined successfully',
        })
    } catch (error: any) {
        secureLogger.error('Error declining project invitation', error as Error, { operation: 'projectInvitations.decline' })
        return createErrorResponse('Failed to decline invitation', 500, 'DECLINE_FAILED')
    }
}
