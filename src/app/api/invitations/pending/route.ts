// =============================================================================
// Pending Invitations API - Get all pending invitations for current user
// =============================================================================

export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth-options'
import { secureLogger, createErrorResponse } from '@/lib/security'

// GET /api/invitations/pending - Get all pending invitations for current user
export async function GET(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user?.email) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const userEmail = session.user.email

        // Find all pending project invitations for this user
        const projectInvitations = await prisma.projectInvitation.findMany({
            where: {
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
                        avatar: true,
                    },
                },
                project: {
                    select: {
                        id: true,
                        name: true,
                        description: true,
                    },
                },
            },
            orderBy: {
                createdAt: 'desc',
            },
        })

        // Return formatted invitations
        const invitations = projectInvitations.map(inv => ({
            id: inv.id,
            type: 'project' as const,
            token: inv.token,
            role: inv.role,
            expiresAt: inv.expiresAt.toISOString(),
            createdAt: inv.createdAt.toISOString(),
            inviter: {
                name: inv.inviter?.name || inv.inviter?.email?.split('@')[0] || '알 수 없음',
                email: inv.inviter?.email || '',
                avatar: inv.inviter?.avatar || null,
            },
            project: {
                id: inv.project.id,
                name: inv.project.name,
                description: inv.project.description,
            },
        }))

        return NextResponse.json({
            total: invitations.length,
            invitations,
        })
    } catch (error) {
        secureLogger.error('Error fetching pending invitations', error as Error, { operation: 'invitations.pending' })
        return createErrorResponse('Failed to fetch invitations', 500, 'FETCH_FAILED')
    }
}
