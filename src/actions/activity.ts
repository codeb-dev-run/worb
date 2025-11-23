'use server'

import { prisma } from '@/lib/prisma'
import { revalidatePath } from 'next/cache'

export async function getActivities(projectId: string) {
    try {
        const activities = await prisma.activity.findMany({
            where: { projectId },
            orderBy: { timestamp: 'desc' },
            take: 50
        })
        return activities
    } catch (error) {
        console.error('Error fetching activities:', error)
        return []
    }
}

export async function addActivity(projectId: string, data: {
    type: string
    message: string
    userId: string
    userName: string
    icon: string
}) {
    try {
        const activity = await prisma.activity.create({
            data: {
                projectId,
                type: data.type,
                message: data.message,
                userId: data.userId,
                userName: data.userName,
                icon: data.icon
            }
        })

        revalidatePath(`/projects/${projectId}`)
        return { success: true, activity }
    } catch (error) {
        console.error('Error adding activity:', error)
        return { success: false, error }
    }
}
