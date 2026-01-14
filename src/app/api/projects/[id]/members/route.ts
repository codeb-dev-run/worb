// =============================================================================
// Project Members API - 프로젝트 멤버 조회
// =============================================================================

export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth-options'
import { secureLogger, createErrorResponse } from '@/lib/security'
import { notifyProjectMemberAdded } from '@/lib/centrifugo-client'

// GET /api/projects/[id]/members - Get project members
export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params
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
            where: { projectId: id },
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

// POST /api/projects/[id]/members - Add workspace member directly to project
export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params
        const session = await getServerSession(authOptions)
        if (!session?.user?.email) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const body = await request.json()
        const { userId, role = 'Viewer' } = body

        if (!userId) {
            return NextResponse.json({ error: 'User ID is required' }, { status: 400 })
        }

        // 병렬 쿼리: 현재 사용자, 프로젝트, 대상 사용자를 동시에 조회
        const [currentUser, project, targetUser] = await Promise.all([
            prisma.user.findUnique({
                where: { email: session.user.email },
                select: { id: true }
            }),
            prisma.project.findUnique({
                where: { id },
                select: { name: true, workspaceId: true }
            }),
            prisma.user.findUnique({
                where: { id: userId },
                select: { id: true, email: true, name: true, avatar: true }
            })
        ])

        if (!currentUser) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 })
        }
        if (!project) {
            return NextResponse.json({ error: 'Project not found' }, { status: 404 })
        }
        if (!targetUser) {
            return NextResponse.json({ error: 'Target user not found' }, { status: 404 })
        }

        // 병렬 쿼리: 권한 확인 및 중복 멤버 확인
        const [projectMember, existingMember, workspaceMember] = await Promise.all([
            prisma.projectMember.findUnique({
                where: {
                    projectId_userId: { projectId: id, userId: currentUser.id }
                }
            }),
            prisma.projectMember.findUnique({
                where: {
                    projectId_userId: { projectId: id, userId }
                }
            }),
            project.workspaceId ? prisma.workspaceMember.findUnique({
                where: {
                    workspaceId_userId: { workspaceId: project.workspaceId, userId }
                }
            }) : Promise.resolve(null)
        ])

        if (!projectMember) {
            return NextResponse.json({ error: 'Only project members can add new members' }, { status: 403 })
        }
        if (existingMember) {
            return NextResponse.json({ error: 'User is already a member of this project' }, { status: 400 })
        }
        if (project.workspaceId && !workspaceMember) {
            return NextResponse.json({ error: 'User is not a member of this workspace' }, { status: 403 })
        }

        // Add member to project
        const newMember = await prisma.projectMember.create({
            data: {
                projectId: id,
                userId,
                role,
            },
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
        })

        // 프로젝트 멤버 추가 알림 발송
        try {
            const adderName = session.user.name || session.user.email || '팀원'
            await notifyProjectMemberAdded(userId, id, project.name, adderName)
        } catch {
            // 알림 실패는 무시
        }

        return NextResponse.json({
            id: newMember.id,
            userId: newMember.userId,
            email: newMember.user.email,
            name: newMember.user.name,
            avatar: newMember.user.avatar,
            role: newMember.role,
            joinedAt: newMember.joinedAt.toISOString(),
        })
    } catch (error) {
        secureLogger.error('Error adding project member', error as Error, { operation: 'projects.members.add' })
        return createErrorResponse('Failed to add member', 500, 'ADD_FAILED')
    }
}
