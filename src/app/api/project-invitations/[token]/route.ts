// =============================================================================
// Project Invitation API - CVE-CB-005 Fixed: Secure Logging
// =============================================================================

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { secureLogger, createErrorResponse } from '@/lib/security'

// GET /api/project-invitations/[token] - Get invitation details by token
export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ token: string }> }
) {
    try {
        const { token } = await params
        const invitation = await prisma.projectInvitation.findUnique({
            where: { token },
            include: {
                project: {
                    select: {
                        id: true,
                        name: true,
                    },
                },
                inviter: {
                    select: {
                        name: true,
                        email: true,
                    },
                },
            },
        })

        if (!invitation) {
            return NextResponse.json(
                { error: 'Invalid invitation token' },
                { status: 404 }
            )
        }

        // Check expiration
        const isExpired = new Date() > invitation.expiresAt
        if (isExpired && invitation.status === 'PENDING') {
            await prisma.projectInvitation.update({
                where: { id: invitation.id },
                data: { status: 'EXPIRED' },
            })
        }

        return NextResponse.json({
            invitation: {
                id: invitation.id,
                email: invitation.email,
                role: invitation.role,
                status: isExpired ? 'EXPIRED' : invitation.status,
                expiresAt: invitation.expiresAt,
                project: invitation.project,
                inviter: invitation.inviter,
            },
        })
    } catch (error) {
        // CVE-CB-005: Secure logging
        secureLogger.error('Error fetching project invitation', error as Error, { operation: 'projectInvitations.get' })
        return createErrorResponse('Failed to fetch invitation', 500, 'FETCH_FAILED')
    }
}
