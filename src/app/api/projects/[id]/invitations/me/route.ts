// =============================================================================
// My Project Invitation API - Check if current user has pending invitation
// =============================================================================

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth-options'
import { secureLogger, createErrorResponse } from '@/lib/security'

// GET /api/projects/[id]/invitations/me - Get my pending invitation for this project
export async function GET(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user?.email) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const userEmail = session.user.email

        // Check if user is already a member of this project
        const user = await prisma.user.findUnique({
            where: { email: userEmail },
        })

        if (user) {
            const existingMember = await prisma.projectMember.findUnique({
                where: {
                    projectId_userId: {
                        projectId: params.id,
                        userId: user.id,
                    },
                },
            })

            // If already a member, no need to show invitation banner
            if (existingMember) {
                return NextResponse.json(null)
            }
        }

        // Find pending invitation for this user in this project
        const invitation = await prisma.projectInvitation.findFirst({
            where: {
                projectId: params.id,
                email: userEmail,
                status: 'PENDING',
                expiresAt: {
                    gt: new Date(), // Not expired
                },
            },
            include: {
                inviter: {
                    select: {
                        name: true,
                        email: true,
                    },
                },
                project: {
                    select: {
                        id: true,
                        name: true,
                    },
                },
            },
        })

        if (!invitation) {
            return NextResponse.json(null)
        }

        // Return invitation details
        return NextResponse.json({
            id: invitation.id,
            token: invitation.token,
            role: invitation.role,
            expiresAt: invitation.expiresAt.toISOString(),
            inviter: invitation.inviter,
            project: invitation.project,
        })
    } catch (error) {
        secureLogger.error('Error fetching my invitation', error as Error, { operation: 'projects.invitations.me' })
        return createErrorResponse('Failed to fetch invitation', 500, 'FETCH_FAILED')
    }
}
