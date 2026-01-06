// =============================================================================
// Mindmap Convert API - CVE-CB-005 Fixed: Secure Logging
// =============================================================================

import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { secureLogger, createErrorResponse } from '@/lib/security'

export async function POST(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params
        const { nodes } = await request.json()
        const projectId = id

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
        // CVE-CB-005: Secure logging
        secureLogger.error('Failed to convert mindmap to tasks', error as Error, { operation: 'mindmap.convert' })
        return createErrorResponse('Failed to convert tasks', 500, 'CONVERT_FAILED')
    }
}
