'use server'

import { prisma } from '@/lib/prisma'
import { TaskStatus } from '@/types/task'
import { startOfDay, endOfDay, subDays, addDays, format, isBefore } from 'date-fns'

export async function getDashboardStats() {
    try {
        const now = new Date()

        // 1. Fetch all tasks with project info
        const tasks = await prisma.task.findMany({
            include: {
                project: {
                    select: {
                        name: true
                    }
                }
            }
        })

        // 2. Calculate counts
        const totalTasks = tasks.length
        const completedTasks = tasks.filter(t => t.status === 'done').length
        const incompleteTasks = totalTasks - completedTasks
        const overdueTasks = tasks.filter(t =>
            t.status !== 'done' &&
            t.dueDate &&
            isBefore(new Date(t.dueDate), now)
        ).length

        // 3. Bar Chart: Tasks by Project (Incomplete)
        const tasksByProject: Record<string, number> = {}
        tasks.filter(t => t.status !== 'done').forEach(task => {
            const pName = task.project.name
            tasksByProject[pName] = (tasksByProject[pName] || 0) + 1
        })
        const barData = Object.entries(tasksByProject).map(([name, value]) => ({ name, value }))

        // 4. Donut Chart: Task Status Distribution
        const statusCount = {
            todo: 0,
            in_progress: 0,
            review: 0,
            done: 0,
            backlog: 0
        }
        tasks.forEach(task => {
            const status = task.status as keyof typeof statusCount
            if (status in statusCount) {
                statusCount[status]++
            }
        })
        const donutData = [
            { name: '완료', value: statusCount.done },
            { name: '진행중', value: statusCount.in_progress },
            { name: '검토', value: statusCount.review },
            { name: '할일', value: statusCount.todo },
        ]

        // 5. Line Chart: Recent Activity (using updatedAt for done tasks as proxy)
        // This is an approximation. Ideally we'd have a 'completedAt' field or activity log.
        const lineData = Array.from({ length: 7 }).map((_, i) => {
            const date = subDays(now, 6 - i)
            const dateStr = format(date, 'MM/dd')
            const start = startOfDay(date)
            const end = endOfDay(date)

            // Count tasks updated to 'done' on this day (approximate)
            const count = tasks.filter(t =>
                t.status === 'done' &&
                t.updatedAt >= start &&
                t.updatedAt <= end
            ).length

            return {
                date: dateStr,
                completed: count
            }
        })

        // 6. Area Chart: Upcoming Deadlines
        const areaData = Array.from({ length: 7 }).map((_, i) => {
            const date = addDays(now, i)
            const start = startOfDay(date)
            const end = endOfDay(date)

            const count = tasks.filter(t =>
                t.dueDate &&
                new Date(t.dueDate) >= start &&
                new Date(t.dueDate) <= end
            ).length

            return {
                name: format(date, 'MM/dd'),
                value: count
            }
        })

        return {
            stats: {
                totalTasks,
                completedTasks,
                incompleteTasks,
                overdueTasks
            },
            charts: {
                barData,
                donutData,
                lineData,
                areaData
            }
        }

    } catch (error) {
        console.error('Error fetching dashboard stats:', error)
        throw new Error('Failed to fetch dashboard statistics')
    }
}
