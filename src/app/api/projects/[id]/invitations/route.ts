// =============================================================================
// Project Invitations API - CVE-CB-005 Fixed: Secure Logging
// =============================================================================

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth-options'
import { nanoid } from 'nanoid'
import { sendProjectInviteEmail } from '@/lib/email'
import { secureLogger, createErrorResponse } from '@/lib/security'

// GET /api/projects/[id]/invitations - Get project invitations
export async function GET(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user?.email) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const user = await prisma.user.findUnique({
            where: { email: session.user.email },
        })

        if (!user) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 })
        }

        // Check if user has access to project
        const projectMember = await prisma.projectMember.findUnique({
            where: {
                projectId_userId: {
                    projectId: params.id,
                    userId: user.id,
                },
            },
        })

        if (!projectMember) {
            return NextResponse.json({ error: 'Access denied' }, { status: 403 })
        }

        // Get invitations
        const invitations = await prisma.projectInvitation.findMany({
            where: { projectId: params.id },
            include: {
                inviter: {
                    select: {
                        name: true,
                        email: true,
                    },
                },
            },
            orderBy: { createdAt: 'desc' },
        })

        return NextResponse.json(invitations)
    } catch (error) {
        // CVE-CB-005: Secure logging
        secureLogger.error('Error fetching invitations', error as Error, { operation: 'projects.invitations.list' })
        return createErrorResponse('Failed to fetch invitations', 500, 'FETCH_FAILED')
    }
}

// POST /api/projects/[id]/invitations - Create new invitation
export async function POST(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user?.email) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const user = await prisma.user.findUnique({
            where: { email: session.user.email },
        })

        if (!user) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 })
        }

        // Check if user has Admin role on project
        const projectMember = await prisma.projectMember.findUnique({
            where: {
                projectId_userId: {
                    projectId: params.id,
                    userId: user.id,
                },
            },
        })

        if (!projectMember || projectMember.role !== 'Admin') {
            return NextResponse.json({ error: 'Only project admins can invite members' }, { status: 403 })
        }

        const body = await request.json()
        const { email, role = 'Viewer' } = body

        if (!email) {
            return NextResponse.json({ error: 'Email is required' }, { status: 400 })
        }

        // Check if user is already a member
        const existingUser = await prisma.user.findUnique({
            where: { email },
        })

        if (existingUser) {
            const existingMember = await prisma.projectMember.findUnique({
                where: {
                    projectId_userId: {
                        projectId: params.id,
                        userId: existingUser.id,
                    },
                },
            })

            if (existingMember) {
                return NextResponse.json({ error: 'User is already a member of this project' }, { status: 400 })
            }
        }

        // Check for pending invitation
        const existingInvite = await prisma.projectInvitation.findFirst({
            where: {
                projectId: params.id,
                email,
                status: 'PENDING',
            },
        })

        if (existingInvite) {
            return NextResponse.json({ error: 'An invitation is already pending for this email' }, { status: 400 })
        }

        // Get project info for email
        const project = await prisma.project.findUnique({
            where: { id: params.id },
            select: { name: true },
        })

        if (!project) {
            return NextResponse.json({ error: 'Project not found' }, { status: 404 })
        }

        // Generate unique token
        const token = nanoid(32)
        const expiresAt = new Date()
        expiresAt.setDate(expiresAt.getDate() + 7) // 7 days expiry

        // Create invitation
        const invitation = await prisma.projectInvitation.create({
            data: {
                projectId: params.id,
                email,
                token,
                role,
                invitedBy: user.id,
                expiresAt,
            },
            include: {
                inviter: {
                    select: {
                        name: true,
                        email: true,
                    },
                },
            },
        })

        // Send invitation email
        const inviteUrl = `${process.env.NEXTAUTH_URL}/invite/project/${token}`
        await sendProjectInviteEmail(email, inviteUrl, project.name, user.name)

        return NextResponse.json(invitation)
    } catch (error) {
        // CVE-CB-005: Secure logging
        secureLogger.error('Error creating invitation', error as Error, { operation: 'projects.invitations.create' })
        return createErrorResponse('Failed to create invitation', 500, 'CREATE_FAILED')
    }
}

// DELETE /api/projects/[id]/invitations - Revoke invitation
export async function DELETE(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user?.email) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const user = await prisma.user.findUnique({
            where: { email: session.user.email },
        })

        if (!user) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 })
        }

        // Check admin access
        const projectMember = await prisma.projectMember.findUnique({
            where: {
                projectId_userId: {
                    projectId: params.id,
                    userId: user.id,
                },
            },
        })

        if (!projectMember || projectMember.role !== 'Admin') {
            return NextResponse.json({ error: 'Only project admins can revoke invitations' }, { status: 403 })
        }

        const { searchParams } = new URL(request.url)
        const invitationId = searchParams.get('invitationId')

        if (!invitationId) {
            return NextResponse.json({ error: 'Invitation ID is required' }, { status: 400 })
        }

        await prisma.projectInvitation.update({
            where: { id: invitationId },
            data: { status: 'REVOKED' },
        })

        return NextResponse.json({ success: true })
    } catch (error) {
        // CVE-CB-005: Secure logging
        secureLogger.error('Error revoking invitation', error as Error, { operation: 'projects.invitations.revoke' })
        return createErrorResponse('Failed to revoke invitation', 500, 'REVOKE_FAILED')
    }
}
