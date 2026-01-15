// =============================================================================
// Member Role API - CVE-CB-005 Fixed: Secure Logging
// 권한 등급 3단계: SUPER_ADMIN, ADMIN, MEMBER
// =============================================================================

export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth-options'
import { secureLogger, createErrorResponse } from '@/lib/security'

// 멤버 역할 및 권한 레벨 변경
export async function PATCH(
    request: Request,
    { params }: { params: Promise<{ workspaceId: string; memberId: string }> }
) {
    try {
        const { workspaceId, memberId } = await params
        const session = await getServerSession(authOptions)
        if (!session?.user?.email) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const { role, adminLevel } = await request.json()

        // 유효한 역할인지 확인
        if (role && !['admin', 'member'].includes(role)) {
            return NextResponse.json({ error: 'Invalid role' }, { status: 400 })
        }

        // 유효한 권한 레벨인지 확인
        const validAdminLevels = ['SUPER_ADMIN', 'ADMIN', 'MEMBER']
        if (adminLevel && !validAdminLevels.includes(adminLevel)) {
            return NextResponse.json({ error: 'Invalid admin level' }, { status: 400 })
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
            return NextResponse.json({ error: 'Only admins can change roles' }, { status: 403 })
        }

        // 대상 멤버 확인
        const targetMember = await prisma.workspaceMember.findUnique({
            where: {
                workspaceId_userId: {
                    workspaceId,
                    userId: memberId
                }
            }
        })

        if (!targetMember) {
            return NextResponse.json({ error: 'Member not found' }, { status: 404 })
        }

        // admin을 member로 변경하는 경우, 마지막 admin인지 확인
        if (targetMember.role === 'admin' && role === 'member') {
            const adminCount = await prisma.workspaceMember.count({
                where: {
                    workspaceId,
                    role: 'admin'
                }
            })

            if (adminCount <= 1) {
                return NextResponse.json({
                    error: 'Cannot demote the last admin. Assign another admin first.'
                }, { status: 400 })
            }
        }

        // 역할 및 권한 레벨 변경
        const updateData: Record<string, unknown> = {}
        if (role) updateData.role = role
        if (adminLevel) updateData.adminLevel = adminLevel

        // role이 admin이 아니면 adminLevel을 MEMBER로 자동 설정
        if (role === 'member' && !adminLevel) {
            updateData.adminLevel = 'MEMBER'
        }

        const updatedMember = await prisma.workspaceMember.update({
            where: {
                workspaceId_userId: {
                    workspaceId,
                    userId: memberId
                }
            },
            data: updateData,
            include: {
                user: {
                    select: {
                        id: true,
                        email: true,
                        name: true,
                        department: true,
                        avatar: true,
                    }
                }
            }
        })

        secureLogger.info('Member role changed', {
            operation: 'workspace.member.role.change',
            workspaceId,
            memberId,
            newRole: role,
            newAdminLevel: adminLevel,
        })

        return NextResponse.json({
            ...updatedMember.user,
            workspaceRole: updatedMember.role,
            adminLevel: updatedMember.adminLevel,
            joinedAt: updatedMember.joinedAt.toISOString()
        })
    } catch (error) {
        // CVE-CB-005: Secure logging
        secureLogger.error('Failed to change member role', error as Error, { operation: 'workspace.member.role.change' })
        return createErrorResponse('Failed to change member role', 500, 'ROLE_CHANGE_FAILED')
    }
}
