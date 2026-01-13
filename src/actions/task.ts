'use server'

// =============================================================================
// Task Server Actions - CVE-CB-005 Fixed: Secure Logging
// =============================================================================

import { prisma } from '@/lib/prisma'
import { Task, TaskStatus, TaskPriority } from '@prisma/client'
import { revalidatePath } from 'next/cache'
import { invalidateCache } from '@/lib/redis'
import { secureLogger } from '@/lib/security'

export async function getTasks(projectId: string) {
    try {
        const tasks = await prisma.task.findMany({
            where: { projectId, deletedAt: null },
            select: {
                id: true,
                title: true,
                description: true,
                status: true,
                priority: true,
                startDate: true,
                dueDate: true,
                order: true,
                columnId: true,
                labels: true,
                color: true,
                projectId: true,
                assigneeId: true,
                teamId: true,
                createdBy: true,
                createdAt: true,
                updatedAt: true,
                deletedAt: true,
                assignee: {
                    select: { id: true, name: true, email: true, avatar: true }
                },
                attachments: {
                    select: { id: true, name: true, url: true, type: true, size: true }
                },
                checklist: {
                    select: { id: true, text: true, completed: true }
                },
                comments: {
                    select: {
                        id: true,
                        text: true,
                        createdAt: true,
                        user: { select: { id: true, name: true, avatar: true } }
                    },
                    orderBy: { createdAt: 'desc' },
                    take: 10  // 최신 10개만 조회 (N+1 방지)
                },
                team: {
                    select: { id: true, name: true, color: true }
                }
            },
            orderBy: {
                order: 'asc'
            }
        })
        // CVE-CB-005: Secure logging - debug info only in development
        secureLogger.debug(`Found ${tasks.length} tasks`, { operation: 'task.list', projectId })
        return tasks.map(t => ({
            ...t,
            // Map to frontend expected format if needed
            // Frontend expects 'assignee' string sometimes, or 'assigneeName'
            assigneeName: t.assignee?.name,
            assigneeId: t.assigneeId,
            // teamId를 department로 매핑 (프론트엔드 호환)
            department: t.teamId,
            // Team 색상 정보 포함 (초기 로딩 시 색상 즉시 적용)
            departmentColor: t.team?.color || null,
            departmentName: t.team?.name || null,
            // Ensure dates are Date objects (Prisma returns Date objects)
            startDate: t.startDate?.toISOString() || null,
            dueDate: t.dueDate?.toISOString() || null,
            createdAt: t.createdAt.toISOString(),
            updatedAt: t.updatedAt.toISOString(),
        }))
    } catch (error) {
        secureLogger.error('Failed to fetch tasks', error as Error, { operation: 'task.list' })
        return []
    }
}

export async function getAllTasks(
    userId: string,
    workspaceId?: string,
    options?: { cursor?: string; limit?: number }
) {
    try {
        const limit = options?.limit ?? 100
        const cursor = options?.cursor

        // 사용자가 속한 프로젝트 ID 목록 가져오기
        const userProjects = await prisma.projectMember.findMany({
            where: { userId },
            select: { projectId: true }
        })
        const userProjectIds = userProjects.map(p => p.projectId)

        const whereClause: any = {
            deletedAt: null, // 삭제된 작업 제외
            OR: [
                // 1. 내가 만든 개인 작업 (projectId가 null이고 assignee가 없거나 나인 경우)
                {
                    createdBy: userId,
                    projectId: null,
                    OR: [
                        { assigneeId: null },
                        { assigneeId: userId }
                    ]
                },
                // 2. 나에게 할당된 작업
                { assigneeId: userId },
                // 3. 내가 멤버인 프로젝트의 모든 작업 (프로젝트 협업)
                { projectId: { in: userProjectIds } }
            ]
        }

        // 워크스페이스 필터링 추가
        if (workspaceId) {
            whereClause.AND = [
                {
                    OR: [
                        { project: { workspaceId: workspaceId } },
                        { projectId: null, createdBy: userId } // 개인 작업은 생성자만
                    ]
                }
            ]
        }

        const tasks = await prisma.task.findMany({
            where: whereClause,
            select: {
                id: true,
                title: true,
                description: true,
                status: true,
                priority: true,
                startDate: true,
                dueDate: true,
                order: true,
                columnId: true,
                labels: true,
                color: true,
                projectId: true,
                assigneeId: true,
                teamId: true,
                createdBy: true,
                createdAt: true,
                updatedAt: true,
                deletedAt: true,
                project: {
                    select: { name: true, workspaceId: true }
                },
                assignee: {
                    select: { id: true, name: true, avatar: true }
                }
            },
            orderBy: {
                dueDate: 'asc'
            },
            take: limit,
            ...(cursor ? { skip: 1, cursor: { id: cursor } } : {})
        })

        // 중복 제거 (여러 조건에 해당할 수 있음)
        const uniqueTasks = Array.from(new Map(tasks.map(t => [t.id, t])).values())

        return uniqueTasks.map(t => ({
            ...t,
            projectName: t.project?.name || 'Personal',
            assigneeName: t.assignee?.name,
            startDate: t.startDate?.toISOString() || null,
            dueDate: t.dueDate?.toISOString() || null,
            createdAt: t.createdAt.toISOString(),
            updatedAt: t.updatedAt.toISOString(),
        }))
    } catch (error) {
        secureLogger.error('Failed to fetch all tasks', error as Error, { operation: 'task.listAll' })
        return []
    }
}

import { emitToProject } from '@/lib/socket-emitter'

export async function createTask(projectId: string | undefined | null, data: {
    title: string
    description?: string
    status?: TaskStatus
    priority?: TaskPriority
    startDate?: Date
    dueDate?: Date
    assigneeId?: string
    createdBy: string
    columnId?: string
    order?: number
    labels?: string[]
    color?: string
    teamId?: string  // 부서(팀) ID 추가
}) {
    try {
        const task = await prisma.task.create({
            data: {
                ...(projectId ? { projectId } : {}),
                title: data.title,
                description: data.description,
                status: data.status || TaskStatus.todo,
                priority: data.priority || TaskPriority.medium,
                startDate: data.startDate,
                dueDate: data.dueDate,
                assigneeId: data.assigneeId,
                createdBy: data.createdBy,
                columnId: data.columnId,
                order: data.order || 0,
                labels: data.labels || [],
                color: data.color,
                teamId: data.teamId  // 부서(팀) ID 저장
            }
        })

        if (projectId) {
            revalidatePath(`/projects/${projectId}`)
            await updateProjectProgress(projectId)

            // Emit Socket Event
            emitToProject(projectId, 'task-created', task)
        }

        // Invalidate Dashboard Cache
        await invalidateCache('dashboard:stats:*')

        return {
            success: true,
            task: {
                ...task,
                startDate: task.startDate?.toISOString() || null,
                dueDate: task.dueDate?.toISOString() || null,
                createdAt: task.createdAt.toISOString(),
                updatedAt: task.updatedAt.toISOString(),
            }
        }
    } catch (error) {
        secureLogger.error('Failed to create task', error as Error, { operation: 'task.create' })
        return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
    }
}

export async function updateTask(taskId: string, data: Partial<Task>) {
    try {
        secureLogger.debug('Updating task', { operation: 'task.update', taskId })

        // Date 객체를 올바르게 처리
        const updateData: any = { ...data }
        if (data.startDate) {
            updateData.startDate = new Date(data.startDate)
        }
        if (data.dueDate) {
            updateData.dueDate = new Date(data.dueDate)
        }

        const task = await prisma.task.update({
            where: { id: taskId },
            data: updateData
        })

        revalidatePath(`/projects/${task.projectId}`)
        if (task.projectId) {
            await updateProjectProgress(task.projectId)

            // Emit Socket Event
            emitToProject(task.projectId, 'task-updated', task)
        }

        // Invalidate Dashboard Cache
        await invalidateCache('dashboard:stats:*')

        return {
            success: true,
            task: {
                ...task,
                startDate: task.startDate?.toISOString() || null,
                dueDate: task.dueDate?.toISOString() || null,
                createdAt: task.createdAt.toISOString(),
                updatedAt: task.updatedAt.toISOString(),
            }
        }
    } catch (error) {
        secureLogger.error('Failed to update task', error as Error, { operation: 'task.update' })
        return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
    }
}

// Soft delete - 휴지통으로 이동
export async function deleteTask(taskId: string) {
    try {
        const task = await prisma.task.update({
            where: { id: taskId },
            data: { deletedAt: new Date() }
        })

        revalidatePath(`/projects/${task.projectId}`)
        if (task.projectId) {
            await updateProjectProgress(task.projectId)

            // Emit Socket Event
            emitToProject(task.projectId, 'task-deleted', { id: taskId })
        }

        // Invalidate Dashboard Cache
        await invalidateCache('dashboard:stats:*')

        return { success: true }
    } catch (error) {
        secureLogger.error('Failed to delete task', error as Error, { operation: 'task.delete' })
        return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
    }
}

// 휴지통에서 복원
export async function restoreTask(taskId: string) {
    try {
        const task = await prisma.task.update({
            where: { id: taskId },
            data: { deletedAt: null }
        })

        revalidatePath(`/projects/${task.projectId}`)
        if (task.projectId) {
            await updateProjectProgress(task.projectId)
            emitToProject(task.projectId, 'task-restored', task)
        }

        await invalidateCache('dashboard:stats:*')

        return {
            success: true,
            task: {
                ...task,
                startDate: task.startDate?.toISOString() || null,
                dueDate: task.dueDate?.toISOString() || null,
                createdAt: task.createdAt.toISOString(),
                updatedAt: task.updatedAt.toISOString(),
            }
        }
    } catch (error) {
        secureLogger.error('Failed to restore task', error as Error, { operation: 'task.restore' })
        return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
    }
}

// 영구 삭제
export async function permanentDeleteTask(taskId: string) {
    try {
        const task = await prisma.task.delete({
            where: { id: taskId }
        })

        revalidatePath(`/projects/${task.projectId}`)
        if (task.projectId) {
            await updateProjectProgress(task.projectId)
        }

        await invalidateCache('dashboard:stats:*')

        return { success: true }
    } catch (error) {
        secureLogger.error('Failed to permanently delete task', error as Error, { operation: 'task.permanentDelete' })
        return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
    }
}

// 휴지통 조회
export async function getTrashedTasks(userId: string, workspaceId?: string) {
    try {
        const userProjects = await prisma.projectMember.findMany({
            where: { userId },
            select: { projectId: true }
        })
        const userProjectIds = userProjects.map(p => p.projectId)

        const whereClause: any = {
            deletedAt: { not: null },
            OR: [
                { createdBy: userId, projectId: null },
                { assigneeId: userId },
                { createdBy: userId },
                { projectId: { in: userProjectIds } }
            ]
        }

        if (workspaceId) {
            whereClause.AND = [
                {
                    OR: [
                        { project: { workspaceId: workspaceId } },
                        { projectId: null, createdBy: userId }
                    ]
                }
            ]
        }

        const tasks = await prisma.task.findMany({
            where: whereClause,
            include: {
                project: { select: { name: true, workspaceId: true } },
                assignee: true
            },
            orderBy: { deletedAt: 'desc' }
        })

        const uniqueTasks = Array.from(new Map(tasks.map(t => [t.id, t])).values())

        return uniqueTasks.map(t => ({
            ...t,
            projectName: t.project?.name || 'Personal',
            assigneeName: t.assignee?.name,
            startDate: t.startDate?.toISOString() || null,
            dueDate: t.dueDate?.toISOString() || null,
            createdAt: t.createdAt.toISOString(),
            updatedAt: t.updatedAt.toISOString(),
            deletedAt: t.deletedAt?.toISOString() || null,
        }))
    } catch (error) {
        secureLogger.error('Failed to fetch trashed tasks', error as Error, { operation: 'task.listTrashed' })
        return []
    }
}

// 휴지통 비우기
export async function emptyTrash(userId: string, workspaceId?: string) {
    try {
        const userProjects = await prisma.projectMember.findMany({
            where: { userId },
            select: { projectId: true }
        })
        const userProjectIds = userProjects.map(p => p.projectId)

        const whereClause: any = {
            deletedAt: { not: null },
            OR: [
                { createdBy: userId, projectId: null },
                { createdBy: userId },
                { projectId: { in: userProjectIds } }
            ]
        }

        if (workspaceId) {
            whereClause.AND = [
                {
                    OR: [
                        { project: { workspaceId: workspaceId } },
                        { projectId: null, createdBy: userId }
                    ]
                }
            ]
        }

        await prisma.task.deleteMany({ where: whereClause })
        await invalidateCache('dashboard:stats:*')

        return { success: true }
    } catch (error) {
        secureLogger.error('Failed to empty trash', error as Error, { operation: 'task.emptyTrash' })
        return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
    }
}

export async function updateTasksOrder(projectId: string, tasks: { id: string; columnId: string; order: number }[]) {
    try {
        // ColumnId to Status mapping
        const columnToStatus: Record<string, TaskStatus> = {
            'todo': 'todo' as TaskStatus,
            'in_progress': 'in_progress' as TaskStatus,
            'review': 'review' as TaskStatus,
            'done': 'done' as TaskStatus
        }

        // Filter out tasks that don't exist in the database
        const existingTaskIds = await prisma.task.findMany({
            where: {
                id: { in: tasks.map(t => t.id) },
                projectId
            },
            select: { id: true }
        })

        const existingIds = new Set(existingTaskIds.map(t => t.id))
        const validTasks = tasks.filter(t => existingIds.has(t.id))

        if (validTasks.length === 0) {
            secureLogger.warn('No valid tasks to update', { operation: 'task.updateOrder' })
            return { success: true }
        }

        // Run in transaction
        await prisma.$transaction(
            validTasks.map(t =>
                prisma.task.update({
                    where: { id: t.id },
                    data: {
                        columnId: t.columnId,
                        order: t.order,
                        status: columnToStatus[t.columnId] || ('todo' as TaskStatus)
                    }
                })
            )
        )

        revalidatePath(`/projects/${projectId}`)

        // Emit Socket Event
        emitToProject(projectId, 'tasks-reordered', tasks)

        // Invalidate Dashboard Cache
        await invalidateCache('dashboard:stats:*')

        // Update project progress based on task completion
        await updateProjectProgress(projectId)

        return { success: true }
    } catch (error) {
        secureLogger.error('Failed to update tasks order', error as Error, { operation: 'task.updateOrder' })
        return { success: false, error: 'Failed to update task order' }
    }
}

async function updateProjectProgress(projectId: string) {
    try {
        // count 쿼리로 최적화 (전체 데이터 로드 방지)
        const [totalCount, completedCount] = await Promise.all([
            prisma.task.count({
                where: { projectId, deletedAt: null }
            }),
            prisma.task.count({
                where: { projectId, deletedAt: null, status: TaskStatus.done }
            })
        ])

        const progress = totalCount === 0 ? 0 : Math.round((completedCount / totalCount) * 100)

        await prisma.project.update({
            where: { id: projectId },
            data: { progress }
        })
    } catch (error) {
        secureLogger.error('Error updating project progress', error as Error, { operation: 'project.updateProgress' })
    }
}
