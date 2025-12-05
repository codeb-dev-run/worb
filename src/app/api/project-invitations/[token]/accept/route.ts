// =============================================================================
// Project Invitation Accept API - CVE-CB-005 Fixed: Secure Logging
// =============================================================================

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth-options'
import { secureLogger, createErrorResponse } from '@/lib/security'

// POST /api/project-invitations/[token]/accept - Accept project invitation
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
        if (invitation.status === 'ACCEPTED') {
            return NextResponse.json(
                { error: 'This invitation has already been accepted' },
                { status: 400 }
            )
        }

        if (invitation.status === 'REVOKED') {
            return NextResponse.json(
                { error: 'This invitation has been revoked' },
                { status: 400 }
            )
        }

        // 3. Check expiration
        if (invitation.status === 'EXPIRED' || new Date() > invitation.expiresAt) {
            if (invitation.status !== 'EXPIRED') {
                await prisma.projectInvitation.update({
                    where: { id: invitation.id },
                    data: { status: 'EXPIRED' },
                })
            }
            return NextResponse.json(
                { error: 'This invitation has expired' },
                { status: 400 }
            )
        }

        // 4. Get current user
        const user = await prisma.user.findUnique({
            where: { email: session.user.email },
        })

        if (!user) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 })
        }

        // 5. Check if user is already a member
        const existingMember = await prisma.projectMember.findUnique({
            where: {
                projectId_userId: {
                    projectId: invitation.projectId,
                    userId: user.id,
                },
            },
        })

        if (existingMember) {
            // Update invitation status but return success
            await prisma.projectInvitation.update({
                where: { id: invitation.id },
                data: {
                    status: 'ACCEPTED',
                    acceptedAt: new Date(),
                },
            })

            return NextResponse.json({
                success: true,
                message: 'You are already a member of this project',
                project: invitation.project,
            })
        }

        // 6. Add user to project and mark invitation as accepted
        const [projectMember] = await prisma.$transaction([
            prisma.projectMember.create({
                data: {
                    projectId: invitation.projectId,
                    userId: user.id,
                    role: invitation.role,
                },
            }),
            prisma.projectInvitation.update({
                where: { id: invitation.id },
                data: {
                    status: 'ACCEPTED',
                    acceptedAt: new Date(),
                },
            }),
        ])

        return NextResponse.json({
            success: true,
            project: invitation.project,
            member: projectMember,
        })
    } catch (error: any) {
        // CVE-CB-005: Secure logging
        secureLogger.error('Error accepting project invitation', error as Error, { operation: 'projectInvitations.accept' })

        // Handle duplicate member error
        if (error.code === 'P2002') {
            return NextResponse.json(
                { error: 'You are already a member of this project' },
                { status: 400 }
            )
        }

        return createErrorResponse('Failed to accept invitation', 500, 'ACCEPT_FAILED')
    }
}
