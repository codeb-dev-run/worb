'use server'

import { prisma } from '@/lib/prisma'
import { Task, TaskStatus, TaskPriority } from '@prisma/client'
import { revalidatePath } from 'next/cache'

export async function getTasks(projectId: string) {
    try {
        const tasks = await prisma.task.findMany({
            where: { projectId },
            include: {
                assignee: true,
                attachments: true,
                checklist: true,
                comments: {
                    include: {
                        user: true
                    }
                }
            },
            orderBy: {
                order: 'asc'
            }
        })

        return tasks.map(t => ({
            ...t,
            // Map to frontend expected format if needed
            // Frontend expects 'assignee' string sometimes, or 'assigneeName'
            assigneeName: t.assignee?.name,
            assigneeId: t.assigneeId,
            // Ensure dates are Date objects (Prisma returns Date objects)
        }))
    } catch (error) {
        console.error('Error fetching tasks:', error)
        return []
    }
}

export async function getAllTasks(userId: string) {
    try {
        // Fetch tasks where user is assignee or creator, or if admin (logic to be added)
        // For now, let's fetch all tasks for projects the user has access to.
        // Or just all tasks if we assume user can see everything for now (simplification).
        // Better: fetch tasks where assigneeId = userId OR project.members includes userId.

        const tasks = await prisma.task.findMany({
            where: {
                OR: [
                    { assigneeId: userId },
                    { createdBy: userId },
                    {
                        project: {
                            members: {
                                some: {
                                    userId: userId
                                }
                            }
                        }
                    }
                ]
            },
            include: {
                project: {
                    select: {
                        name: true
                    }
                },
                assignee: true
            },
            orderBy: {
                dueDate: 'asc'
            }
        })

        return tasks.map(t => ({
            ...t,
            projectName: t.project.name,
            assigneeName: t.assignee?.name
        }))
    } catch (error) {
        console.error('Error fetching all tasks:', error)
        return []
    }
}

export async function createTask(projectId: string, data: {
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
}) {
    try {
        const task = await prisma.task.create({
            data: {
                projectId,
                title: data.title,
                description: data.description,
                status: data.status || TaskStatus.todo,
                priority: data.priority || TaskPriority.medium,
                startDate: data.startDate,
                dueDate: data.dueDate,
                assigneeId: data.assigneeId,
                createdBy: data.createdBy,
                columnId: data.columnId,
                order: data.order || 0
            }
        })

        revalidatePath(`/projects/${projectId}`)
        await updateProjectProgress(projectId)
        return { success: true, task }
    } catch (error) {
        console.error('Error creating task:', error)
        return { success: false, error }
    }
}

export async function updateTask(taskId: string, data: Partial<Task>) {
    try {
        const task = await prisma.task.update({
            where: { id: taskId },
            data
        })

        revalidatePath(`/projects/${task.projectId}`)
        await updateProjectProgress(task.projectId)
        return { success: true, task }
    } catch (error) {
        console.error('Error updating task:', error)
        return { success: false, error }
    }
}

export async function deleteTask(taskId: string) {
    try {
        const task = await prisma.task.delete({
            where: { id: taskId }
        })

        revalidatePath(`/projects/${task.projectId}`)
        await updateProjectProgress(task.projectId)
        return { success: true }
    } catch (error) {
        console.error('Error deleting task:', error)
        return { success: false, error }
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
            console.warn('No valid tasks to update')
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
        return { success: true }
    } catch (error) {
        console.error('Error updating tasks order:', error)
        return { success: false, error: 'Failed to update task order' }
    }
}

async function updateProjectProgress(projectId: string) {
    try {
        const tasks = await prisma.task.findMany({
            where: { projectId }
        })

        if (tasks.length === 0) {
            await prisma.project.update({
                where: { id: projectId },
                data: { progress: 0 }
            })
            return
        }

        const completedTasks = tasks.filter(t => t.status === TaskStatus.done).length
        const progress = Math.round((completedTasks / tasks.length) * 100)

        await prisma.project.update({
            where: { id: projectId },
            data: { progress }
        })
    } catch (error) {
        console.error('Error updating project progress:', error)
    }
}
