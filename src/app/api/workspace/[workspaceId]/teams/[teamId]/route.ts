// =============================================================================
// Workspace Team API - 개별 팀(부서) 조회/수정/삭제
// =============================================================================

export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth-options'
import { secureLogger, createErrorResponse } from '@/lib/security'

// 개별 팀(부서) 조회
export async function GET(
    request: Request,
    { params }: { params: Promise<{ workspaceId: string; teamId: string }> }
) {
    try {
        const { workspaceId, teamId } = await params
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

        // 팀 조회 (멤버 포함)
        const team = await prisma.team.findFirst({
            where: {
                id: teamId,
                workspaceId: workspaceId,
            },
            include: {
                members: {
                    include: {
                        user: {
                            select: {
                                id: true,
                                name: true,
                                email: true,
                                avatar: true,
                            }
                        }
                    }
                }
            }
        })

        if (!team) {
            return createErrorResponse('Team not found', 404, 'TEAM_NOT_FOUND')
        }

        return NextResponse.json({
            id: team.id,
            name: team.name,
            color: team.color,
            order: team.order,
            members: team.members.map(m => ({
                id: m.id,
                userId: m.userId,
                role: m.role,
                user: m.user,
                joinedAt: m.joinedAt.toISOString(),
            })),
            createdAt: team.createdAt.toISOString(),
            updatedAt: team.updatedAt.toISOString(),
        })
    } catch (error) {
        secureLogger.error('Failed to fetch team', error as Error, { operation: 'workspace.teams.get' })
        return createErrorResponse('Failed to fetch team', 500, 'FETCH_FAILED')
    }
}

// 팀(부서) 수정
export async function PATCH(
    request: Request,
    { params }: { params: Promise<{ workspaceId: string; teamId: string }> }
) {
    try {
        const { workspaceId, teamId } = await params
        const session = await getServerSession(authOptions)
        if (!session?.user?.email) {
            return createErrorResponse('Unauthorized', 401, 'AUTH_REQUIRED')
        }

        // 현재 사용자 확인
        const currentUser = await prisma.user.findUnique({
            where: { email: session.user.email }
        })

        if (!currentUser) {
            return createErrorResponse('User not found', 404, 'USER_NOT_FOUND')
        }

        // 관리자 권한 확인
        const membership = await prisma.workspaceMember.findUnique({
            where: {
                workspaceId_userId: {
                    workspaceId,
                    userId: currentUser.id
                }
            }
        })

        if (!membership || membership.role !== 'admin') {
            return createErrorResponse('Admin access required', 403, 'ADMIN_REQUIRED')
        }

        // 팀 존재 확인
        const existingTeam = await prisma.team.findFirst({
            where: {
                id: teamId,
                workspaceId: workspaceId,
            }
        })

        if (!existingTeam) {
            return createErrorResponse('Team not found', 404, 'TEAM_NOT_FOUND')
        }

        const body = await request.json()
        const { name, color, order } = body

        // 업데이트할 데이터 준비
        const updateData: { name?: string; color?: string; order?: number } = {}

        if (name !== undefined) {
            if (typeof name !== 'string' || name.trim() === '') {
                return createErrorResponse('Team name cannot be empty', 400, 'INVALID_NAME')
            }
            updateData.name = name.trim()
        }

        if (color !== undefined) {
            updateData.color = color
        }

        if (order !== undefined) {
            updateData.order = order
        }

        // 팀 업데이트
        const updatedTeam = await prisma.team.update({
            where: { id: teamId },
            data: updateData,
            include: {
                _count: {
                    select: { members: true }
                }
            }
        })

        secureLogger.info('Team updated', {
            operation: 'workspace.teams.update',
            workspaceId,
            resourceId: teamId,
            userId: currentUser.id
        })

        return NextResponse.json({
            id: updatedTeam.id,
            name: updatedTeam.name,
            color: updatedTeam.color,
            order: updatedTeam.order,
            memberCount: updatedTeam._count.members,
            createdAt: updatedTeam.createdAt.toISOString(),
            updatedAt: updatedTeam.updatedAt.toISOString(),
        })
    } catch (error) {
        secureLogger.error('Failed to update team', error as Error, { operation: 'workspace.teams.update' })
        return createErrorResponse('Failed to update team', 500, 'UPDATE_FAILED')
    }
}

// 팀(부서) 삭제
export async function DELETE(
    request: Request,
    { params }: { params: Promise<{ workspaceId: string; teamId: string }> }
) {
    try {
        const { workspaceId, teamId } = await params
        const session = await getServerSession(authOptions)
        if (!session?.user?.email) {
            return createErrorResponse('Unauthorized', 401, 'AUTH_REQUIRED')
        }

        // 현재 사용자 확인
        const currentUser = await prisma.user.findUnique({
            where: { email: session.user.email }
        })

        if (!currentUser) {
            return createErrorResponse('User not found', 404, 'USER_NOT_FOUND')
        }

        // 관리자 권한 확인
        const membership = await prisma.workspaceMember.findUnique({
            where: {
                workspaceId_userId: {
                    workspaceId,
                    userId: currentUser.id
                }
            }
        })

        if (!membership || membership.role !== 'admin') {
            return createErrorResponse('Admin access required', 403, 'ADMIN_REQUIRED')
        }

        // 팀 존재 확인
        const existingTeam = await prisma.team.findFirst({
            where: {
                id: teamId,
                workspaceId: workspaceId,
            }
        })

        if (!existingTeam) {
            return createErrorResponse('Team not found', 404, 'TEAM_NOT_FOUND')
        }

        // 팀 삭제 (TeamMember도 cascade로 삭제됨)
        await prisma.team.delete({
            where: { id: teamId }
        })

        secureLogger.info('Team deleted', {
            operation: 'workspace.teams.delete',
            workspaceId,
            resourceId: teamId,
            userId: currentUser.id
        })

        return NextResponse.json({ success: true })
    } catch (error) {
        secureLogger.error('Failed to delete team', error as Error, { operation: 'workspace.teams.delete' })
        return createErrorResponse('Failed to delete team', 500, 'DELETE_FAILED')
    }
}
