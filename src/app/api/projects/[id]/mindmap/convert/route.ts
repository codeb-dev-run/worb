import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function POST(
    request: Request,
    { params }: { params: { id: string } }
) {
    try {
        const { nodes } = await request.json()
        const projectId = params.id

        // Get current user (mock)
        const userId = 'test-user-id' // Replace with actual session user

        const createdTasks = []

        for (const node of nodes) {
            // Check if task already exists for this node
            const existingTask = await prisma.task.findFirst({
                where: {
                    projectId,
                    mindmapNodeId: node.id
                }
            })

            if (!existingTask) {
                const task = await prisma.task.create({
                    data: {
                        title: node.data.label,
                        projectId,
                        createdBy: userId,
                        status: 'todo',
                        mindmapNodeId: node.id,
                        // Default values
                        priority: 'medium',
                    }
                })
                createdTasks.push(task)
            }
        }

        return NextResponse.json({ success: true, createdCount: createdTasks.length })
    } catch (error) {
        console.error('Failed to convert mindmap to tasks:', error)
        return NextResponse.json({ error: 'Failed to convert tasks' }, { status: 500 })
    }
}
