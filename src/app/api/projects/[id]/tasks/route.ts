import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(
    request: Request,
    { params }: { params: { id: string } }
) {
    try {
        const tasks = await prisma.task.findMany({
            where: {
                projectId: params.id,
            },
            orderBy: {
                createdAt: 'desc',
            },
        })

        return NextResponse.json(tasks)
    } catch (error) {
        console.error('Failed to fetch tasks:', error)
        return NextResponse.json({ error: 'Failed to fetch tasks' }, { status: 500 })
    }
}

export async function POST(
    request: Request,
    { params }: { params: { id: string } }
) {
    try {
        const body = await request.json()

        const task = await prisma.task.create({
            data: {
                projectId: params.id,
                title: body.title,
                description: body.description || '',
                status: body.status || 'todo',
                priority: body.priority || 'medium',
                assignedTo: body.assignedTo,
                createdBy: body.createdBy || 'system',
            },
        })

        return NextResponse.json(task)
    } catch (error) {
        console.error('Failed to create task:', error)
        return NextResponse.json({ error: 'Failed to create task' }, { status: 500 })
    }
}
