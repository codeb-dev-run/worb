// =============================================================================
// Workspace Teams API - Team(부서) CRUD
// =============================================================================

export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth-options'
import { secureLogger, createErrorResponse } from '@/lib/security'

// 팀(부서) 목록 조회
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

        // 팀(부서) 목록 조회
        const teams = await prisma.team.findMany({
            where: {
                workspaceId: workspaceId,
            },
            include: {
                _count: {
                    select: { members: true }
                }
            },
            orderBy: { order: 'asc' }
        })

        // 반환 형식 변환
        const result = teams.map(team => ({
            id: team.id,
            name: team.name,
            color: team.color,
            order: team.order,
            memberCount: team._count.members,
            createdAt: team.createdAt.toISOString(),
            updatedAt: team.updatedAt.toISOString(),
        }))

        return NextResponse.json(result)
    } catch (error) {
        secureLogger.error('Failed to fetch teams', error as Error, { operation: 'workspace.teams.list' })
        return createErrorResponse('Failed to fetch teams', 500, 'FETCH_FAILED')
    }
}

// 팀(부서) 생성
export async function POST(
    request: Request,
    { params }: { params: Promise<{ workspaceId: string }> }
) {
    try {
        const { workspaceId } = await params
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

        const body = await request.json()
        const { name, color } = body

        if (!name || typeof name !== 'string' || name.trim() === '') {
            return createErrorResponse('Team name is required', 400, 'INVALID_NAME')
        }

        // 현재 워크스페이스의 최대 order 값 조회
        const maxOrderTeam = await prisma.team.findFirst({
            where: { workspaceId },
            orderBy: { order: 'desc' },
            select: { order: true }
        })

        const newOrder = (maxOrderTeam?.order ?? -1) + 1

        // 팀 생성
        const team = await prisma.team.create({
            data: {
                workspaceId,
                name: name.trim(),
                color: color || '#3B82F6',
                order: newOrder,
            }
        })

        secureLogger.info('Team created', {
            operation: 'workspace.teams.create',
            workspaceId,
            resourceId: team.id,
            userId: currentUser.id
        })

        return NextResponse.json({
            id: team.id,
            name: team.name,
            color: team.color,
            order: team.order,
            memberCount: 0,
            createdAt: team.createdAt.toISOString(),
            updatedAt: team.updatedAt.toISOString(),
        }, { status: 201 })
    } catch (error) {
        secureLogger.error('Failed to create team', error as Error, { operation: 'workspace.teams.create' })
        return createErrorResponse('Failed to create team', 500, 'CREATE_FAILED')
    }
}
