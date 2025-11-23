'use server'

import { prisma } from '@/lib/prisma'
import { Project, ProjectStatus, ProjectVisibility, ProjectPriority } from '@prisma/client'
import { revalidatePath } from 'next/cache'

export async function getProjects(userId: string) {
    try {
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
        console.error('Error fetching projects:', error)
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
}) {
    try {
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
                members: {
                    create: {
                        userId: data.createdBy,
                        role: 'Admin'
                    }
                }
            }
        })

        revalidatePath('/projects')
        return { success: true, project }
    } catch (error) {
        console.error('Error creating project:', error)
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
            team: team.map((m: any) => m.name), // Frontend expects string[] sometimes? No, ProjectMember[] in types.
            // Wait, ProjectDetail interface in page.tsx expects team: string[] (names?)
            // Let's check page.tsx again. It says `team: string[]`.
            // But `Project` interface says `team: ProjectMember[]`.
            // The page.tsx defines its own `ProjectDetail` interface.
            // I should align them.
            // For now, I will return both or map to what page expects.
            // Page expects `team: string[]`.
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
        console.error('Error fetching project:', error)
        return null
    }
}
