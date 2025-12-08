// =============================================================================
// Project Member Delete API - 프로젝트 멤버 제외
// =============================================================================

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth-options'
import { secureLogger, createErrorResponse } from '@/lib/security'

// DELETE /api/projects/[id]/members/[memberId] - Remove a member from project
export async function DELETE(
    request: NextRequest,
    { params }: { params: { id: string; memberId: string } }
) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user?.email) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const currentUser = await prisma.user.findUnique({
            where: { email: session.user.email },
        })

        if (!currentUser) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 })
        }

        // Check if current user has Admin role on project
        const currentUserMember = await prisma.projectMember.findUnique({
            where: {
                projectId_userId: {
                    projectId: params.id,
                    userId: currentUser.id,
                },
            },
        })

        if (!currentUserMember || currentUserMember.role !== 'Admin') {
            return NextResponse.json(
                { error: 'Only project admins can remove members' },
                { status: 403 }
            )
        }

        // Get the member to be removed
        const memberToRemove = await prisma.projectMember.findUnique({
            where: { id: params.memberId },
            include: {
                user: {
                    select: {
                        email: true,
                        name: true,
                    },
                },
            },
        })

        if (!memberToRemove) {
            return NextResponse.json({ error: 'Member not found' }, { status: 404 })
        }

        // Prevent self-removal
        if (memberToRemove.userId === currentUser.id) {
            return NextResponse.json(
                { error: 'You cannot remove yourself from the project' },
                { status: 400 }
            )
        }

        // Check if removing last admin
        if (memberToRemove.role === 'Admin') {
            const adminCount = await prisma.projectMember.count({
                where: {
                    projectId: params.id,
                    role: 'Admin',
                },
            })

            if (adminCount <= 1) {
                return NextResponse.json(
                    { error: 'Cannot remove the last admin. Assign another admin first.' },
                    { status: 400 }
                )
            }
        }

        // Remove the member
        await prisma.projectMember.delete({
            where: { id: params.memberId },
        })

        secureLogger.info('Project member removed', {
            operation: 'projects.members.remove',
            projectId: params.id,
            removedUserId: memberToRemove.userId,
            removedByUserId: currentUser.id,
        })

        return NextResponse.json({
            success: true,
            message: `${memberToRemove.user.name || memberToRemove.user.email} has been removed from the project`,
        })
    } catch (error) {
        secureLogger.error('Error removing project member', error as Error, { operation: 'projects.members.remove' })
        return createErrorResponse('Failed to remove member', 500, 'REMOVE_FAILED')
    }
}
