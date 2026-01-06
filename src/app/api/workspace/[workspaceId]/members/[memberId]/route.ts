// =============================================================================
// Workspace Member API - CVE-CB-005 Fixed: Secure Logging
// =============================================================================

export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth-options'
import { secureLogger, createErrorResponse } from '@/lib/security'

// 멤버 정보 조회
export async function GET(
    request: Request,
    { params }: { params: Promise<{ workspaceId: string; memberId: string }> }
) {
    try {
        const { workspaceId, memberId } = await params
        const session = await getServerSession(authOptions)
        if (!session?.user?.email) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const member = await prisma.workspaceMember.findFirst({
            where: {
                workspaceId,
                userId: memberId
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
                    }
                }
            }
        })

        if (!member) {
            return NextResponse.json({ error: 'Member not found' }, { status: 404 })
        }

        return NextResponse.json({
            ...member.user,
            workspaceRole: member.role,
            joinedAt: member.joinedAt.toISOString()
        })
    } catch (error) {
        // CVE-CB-005: Secure logging
        secureLogger.error('Failed to fetch member', error as Error, { operation: 'workspace.member.get' })
        return createErrorResponse('Failed to fetch member', 500, 'FETCH_FAILED')
    }
}

// 멤버 제거
export async function DELETE(
    request: Request,
    { params }: { params: Promise<{ workspaceId: string; memberId: string }> }
) {
    try {
        const { workspaceId, memberId } = await params
        const session = await getServerSession(authOptions)
        if (!session?.user?.email) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        // 현재 사용자가 admin인지 확인
        const currentUser = await prisma.user.findUnique({
            where: { email: session.user.email }
        })

        if (!currentUser) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 })
        }

        const currentMembership = await prisma.workspaceMember.findUnique({
            where: {
                workspaceId_userId: {
                    workspaceId,
                    userId: currentUser.id
                }
            }
        })

        if (!currentMembership || currentMembership.role !== 'admin') {
            return NextResponse.json({ error: 'Only admins can remove members' }, { status: 403 })
        }

        // 자기 자신은 제거 불가
        if (memberId === currentUser.id) {
            return NextResponse.json({ error: 'Cannot remove yourself from workspace' }, { status: 400 })
        }

        // 워크스페이스의 마지막 admin인지 확인
        const adminCount = await prisma.workspaceMember.count({
            where: {
                workspaceId,
                role: 'admin'
            }
        })

        const targetMember = await prisma.workspaceMember.findUnique({
            where: {
                workspaceId_userId: {
                    workspaceId,
                    userId: memberId
                }
            }
        })

        if (targetMember?.role === 'admin' && adminCount <= 1) {
            return NextResponse.json({
                error: 'Cannot remove the last admin. Assign another admin first.'
            }, { status: 400 })
        }

        // 멤버 제거
        await prisma.workspaceMember.delete({
            where: {
                workspaceId_userId: {
                    workspaceId,
                    userId: memberId
                }
            }
        })

        secureLogger.info('Member removed from workspace', {
            operation: 'workspace.member.remove',
            workspaceId,
            memberId,
        })

        return NextResponse.json({ success: true })
    } catch (error) {
        // CVE-CB-005: Secure logging
        secureLogger.error('Failed to remove member', error as Error, { operation: 'workspace.member.remove' })
        return createErrorResponse('Failed to remove member', 500, 'REMOVE_FAILED')
    }
}
