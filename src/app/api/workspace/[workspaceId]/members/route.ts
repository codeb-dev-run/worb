// =============================================================================
// Workspace Members API - CVE-CB-005 Fixed: Secure Logging
// =============================================================================

export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth-options'
import { secureLogger, createErrorResponse } from '@/lib/security'

// 워크스페이스 멤버 목록 조회
export async function GET(
    request: Request,
    { params }: { params: Promise<{ workspaceId: string }> }
) {
    try {
        const { workspaceId } = await params
        const session = await getServerSession(authOptions)
        if (!session?.user?.email) {
            return createErrorResponse('Unauthorized', 401, 'AUTH_REQUIRED')
        }

        // 현재 사용자가 이 워크스페이스의 멤버인지 확인
        const currentUser = await prisma.user.findUnique({
            where: { email: session.user.email }
        })

        if (!currentUser) {
            return createErrorResponse('User not found', 404, 'USER_NOT_FOUND')
        }

        const membership = await prisma.workspaceMember.findUnique({
            where: {
                workspaceId_userId: {
                    workspaceId,
                    userId: currentUser.id
                }
            }
        })

        if (!membership) {
            return createErrorResponse('Not a member of this workspace', 403, 'NOT_A_MEMBER')
        }

        // 워크스페이스의 멤버 목록 조회
        const workspaceMembers = await prisma.workspaceMember.findMany({
            where: {
                workspaceId: workspaceId,
            },
            include: {
                user: {
                    select: {
                        id: true,
                        email: true,
                        name: true,
                        department: true,
                        role: true,
                        avatar: true,
                    },
                },
            },
            orderBy: [
                { role: 'asc' }, // admin first
                { joinedAt: 'asc' }
            ]
        })

        // 사용자 정보와 워크스페이스 역할을 합쳐서 반환
        const members = workspaceMembers.map(wm => ({
            ...wm.user,
            workspaceRole: wm.role,
            joinedAt: wm.joinedAt.toISOString()
        }))

        return NextResponse.json(members)
    } catch (error) {
        // CVE-CB-005: Secure logging
        secureLogger.error('Failed to fetch members', error as Error, { operation: 'workspace.members.list' })
        return createErrorResponse('Failed to fetch members', 500, 'FETCH_FAILED')
    }
}
