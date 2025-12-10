'use server'

// =============================================================================
// Project Server Actions - CVE-CB-005 Fixed: Secure Logging
// =============================================================================

import { prisma } from '@/lib/prisma'
import { Project, ProjectStatus, ProjectVisibility, ProjectPriority } from '@prisma/client'
import { revalidatePath } from 'next/cache'
import { nanoid } from 'nanoid'
import { sendProjectInviteEmail } from '@/lib/email'
import { secureLogger } from '@/lib/security'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth-options'

export async function getProjects(userId: string, workspaceId?: string) {
    try {
        // workspaceId가 있으면 해당 워크스페이스의 프로젝트만 가져오기
        if (workspaceId) {
            const projects = await prisma.project.findMany({
                where: {
                    workspaceId: workspaceId,
                },
                include: {
                    members: {
                        include: {
                            user: true
                        }
                    }
                },
                orderBy: {
                    updatedAt: 'desc'
                }
            })

            return projects.map(p => ({
                ...p,
                team: p.members.map((m: any) => ({
                    userId: m.userId,
                    name: m.user.name,
                    role: m.role
                }))
            }))
        }

        // workspaceId가 없으면 기존 로직 사용 (하위 호환성)
        const user = await prisma.user.findUnique({
            where: { id: userId },
            include: {
                projects: {
                    include: {
                        project: {
                            include: {
                                members: {
                                    include: {
                                        user: true
                                    }
                                }
                            }
                        }
                    }
                },
                createdProjects: {
                    include: {
                        members: {
                            include: {
                                user: true
                            }
                        }
                    }
                }
            }
        })

        if (!user) return []

        // Combine created projects and member projects
        // Use a Map to deduplicate by ID
        const projectMap = new Map<string, any>()

        user.createdProjects.forEach(p => projectMap.set(p.id, p))
        user.projects.forEach(pm => projectMap.set(pm.projectId, pm.project))

        const projects = Array.from(projectMap.values())

        // Transform to match frontend expected format if needed
        // For now, return Prisma objects, but we might need to map them
        return projects.map(p => ({
            ...p,
            team: p.members.map((m: any) => ({
                userId: m.userId,
                name: m.user.name,
                role: m.role
            }))
        }))

    } catch (error) {
        secureLogger.error('Error fetching projects', error as Error, { operation: 'project.list' })
        return []
    }
}

export async function createProject(data: {
    name: string
    description?: string
    startDate?: Date
    endDate?: Date
    budget?: number
    status?: ProjectStatus
    visibility?: ProjectVisibility
    priority?: ProjectPriority
    createdBy: string
    workspaceId?: string
    inviteMembers?: Array<{ email: string; role: string }>
}) {
    try {
        // 1. 프로젝트 생성
        const project = await prisma.project.create({
            data: {
                name: data.name,
                description: data.description,
                startDate: data.startDate,
                endDate: data.endDate,
                budget: data.budget,
                status: data.status || ProjectStatus.planning,
                visibility: data.visibility || ProjectVisibility.private,
                priority: data.priority || ProjectPriority.medium,
                createdBy: data.createdBy,
                workspaceId: data.workspaceId,
                members: {
                    create: {
                        userId: data.createdBy,
                        role: 'Admin'
                    }
                }
            }
        })

        // 2. 초대할 멤버가 있으면 초대 생성 및 이메일 발송
        if (data.inviteMembers && data.inviteMembers.length > 0) {
            // 생성자 정보 가져오기
            const inviter = await prisma.user.findUnique({
                where: { id: data.createdBy },
                select: { name: true, email: true }
            })

            const inviterName = inviter?.name || inviter?.email || '팀원'
            const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000'

            // 각 멤버에 대해 초대 생성
            for (const member of data.inviteMembers) {
                try {
                    // 토큰 생성
                    const token = nanoid(32)
                    const expiresAt = new Date()
                    expiresAt.setDate(expiresAt.getDate() + 7) // 7일 후 만료

                    // 초대 레코드 생성
                    await prisma.projectInvitation.create({
                        data: {
                            projectId: project.id,
                            email: member.email,
                            role: member.role,
                            token,
                            expiresAt,
                            invitedBy: data.createdBy,
                            status: 'PENDING'
                        }
                    })

                    // 초대 이메일 발송
                    const inviteUrl = `${baseUrl}/invite/project/${token}`
                    await sendProjectInviteEmail(
                        member.email,
                        inviteUrl,
                        project.name,
                        inviterName
                    )

                    secureLogger.info('Project invitation sent', { operation: 'project.invite', projectName: project.name })
                } catch (inviteError) {
                    secureLogger.error('Failed to send invitation', inviteError as Error, { operation: 'project.invite' })
                    // 개별 초대 실패는 전체 프로젝트 생성을 실패시키지 않음
                }
            }
        }

        revalidatePath('/projects')
        return { success: true, project }
    } catch (error) {
        secureLogger.error('Error creating project', error as Error, { operation: 'project.create' })
        return { success: false, error }
    }
}

export async function getProject(projectId: string) {
    try {
        const project = await prisma.project.findUnique({
            where: { id: projectId },
            include: {
                members: {
                    include: {
                        user: true
                    }
                },
                files: true,
                activities: {
                    orderBy: { timestamp: 'desc' },
                    take: 20
                }
            }
        })

        if (!project) return null

        // Transform to match frontend expected format
        const team = project.members.map((m: any) => ({
            userId: m.userId,
            name: m.user.name,
            role: m.role,
            joinedAt: m.joinedAt
        }))

        const viewerIds = team.map((m: any) => m.userId)
        const editorIds = team.filter((m: any) => ['Admin', 'Developer', 'Designer', 'PM'].includes(m.role)).map((m: any) => m.userId)
        const adminIds = team.filter((m: any) => m.role === 'Admin').map((m: any) => m.userId)

        return {
            id: project.id,
            name: project.name,
            description: project.description || '',
            clientId: project.clientId || '',
            clientName: project.clientName || '',
            status: project.status,
            progress: project.progress,
            startDate: project.startDate || new Date(),
            endDate: project.endDate || new Date(),
            budget: project.budget || 0,
            visibility: project.visibility,
            priority: project.priority,
            tags: project.tags,
            createdBy: project.createdBy,
            createdAt: project.createdAt,
            updatedAt: project.updatedAt,
            team: team.map((m: any) => m.name), // string[]
            teamMembers: team, // Keep full details
            permissions: {
                viewerIds,
                editorIds,
                adminIds
            },
            files: project.files,
            activities: project.activities
        }
    } catch (error) {
        secureLogger.error('Error fetching project', error as Error, { operation: 'project.get' })
        return null
    }
}

export async function updateProject(projectId: string, data: Partial<Project>) {
    try {
        const project = await prisma.project.update({
            where: { id: projectId },
            data
        })

        revalidatePath(`/projects/${projectId}`)
        revalidatePath('/projects')
        return { success: true, project }
    } catch (error) {
        secureLogger.error('Error updating project', error as Error, { operation: 'project.update' })
        return { success: false, error }
    }
}

export async function deleteProject(projectId: string) {
    try {
        // 1. 세션 확인
        const session = await getServerSession(authOptions)
        if (!session?.user?.id) {
            return { success: false, error: 'Unauthorized' }
        }

        // 2. 프로젝트 존재 및 소유자 확인
        const project = await prisma.project.findUnique({
            where: { id: projectId },
            select: { createdBy: true }
        })

        if (!project) {
            return { success: false, error: 'Project not found' }
        }

        // 3. 소유자 권한 확인
        if (project.createdBy !== session.user.id) {
            secureLogger.warn('Unauthorized project deletion attempt', {
                operation: 'project.delete',
                projectId,
                attemptedBy: session.user.id,
                createdBy: project.createdBy
            })
            return { success: false, error: 'Permission denied' }
        }

        // 4. 프로젝트 삭제
        await prisma.project.delete({
            where: { id: projectId }
        })

        revalidatePath('/projects')
        return { success: true }
    } catch (error) {
        secureLogger.error('Error deleting project', error as Error, { operation: 'project.delete' })
        return { success: false, error }
    }
}
