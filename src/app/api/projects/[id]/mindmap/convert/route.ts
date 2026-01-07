// =============================================================================
// Mindmap Convert API - CVE-CB-005 Fixed: Secure Logging
// N+1 Query Fixed: Batch operations instead of loop
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

        // N+1 Fix: Batch fetch existing tasks
        const nodeIds = nodes.map((node: { id: string }) => node.id)
        const existingTasks = await prisma.task.findMany({
            where: {
                projectId,
                mindmapNodeId: { in: nodeIds }
            },
            select: { mindmapNodeId: true }
        })
        const existingNodeIds = new Set(existingTasks.map(t => t.mindmapNodeId))

        // Filter nodes that don't have tasks yet
        const nodesToCreate = nodes.filter(
            (node: { id: string }) => !existingNodeIds.has(node.id)
        )

        // N+1 Fix: Batch create tasks using createMany
        if (nodesToCreate.length > 0) {
            await prisma.task.createMany({
                data: nodesToCreate.map((node: { id: string; data: { label: string } }) => ({
                    title: node.data.label,
                    projectId,
                    createdBy: userId,
                    status: 'todo',
                    mindmapNodeId: node.id,
                    priority: 'medium',
                })),
                skipDuplicates: true
            })
        }

        return NextResponse.json({ success: true, createdCount: nodesToCreate.length })
    } catch (error) {
        // CVE-CB-005: Secure logging
        secureLogger.error('Failed to convert mindmap to tasks', error as Error, { operation: 'mindmap.convert' })
        return createErrorResponse('Failed to convert tasks', 500, 'CONVERT_FAILED')
    }
}
