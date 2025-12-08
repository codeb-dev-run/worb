// =============================================================================
// Project Members API - 프로젝트 멤버 조회
// =============================================================================

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth-options'
import { secureLogger, createErrorResponse } from '@/lib/security'

// GET /api/projects/[id]/members - Get project members
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

        // 로그인한 사용자는 프로젝트 멤버 목록을 조회할 수 있음
        // (프로젝트 멤버가 아니어도 팀 탭에서 멤버 확인 가능)

        // Get all project members with user details
        const members = await prisma.projectMember.findMany({
            where: { projectId: params.id },
            include: {
                user: {
                    select: {
                        id: true,
                        email: true,
                        name: true,
                        avatar: true,
                    },
                },
            },
            orderBy: { joinedAt: 'asc' },
        })

        // Transform to expected format
        const formattedMembers = members.map(member => ({
            id: member.id,
            userId: member.userId,
            email: member.user.email,
            name: member.user.name,
            avatar: member.user.avatar,
            role: member.role,
            joinedAt: member.joinedAt.toISOString(),
        }))

        return NextResponse.json(formattedMembers)
    } catch (error) {
        secureLogger.error('Error fetching project members', error as Error, { operation: 'projects.members.list' })
        return createErrorResponse('Failed to fetch members', 500, 'FETCH_FAILED')
    }
}
