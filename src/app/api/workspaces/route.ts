import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// Mock user ID for now since we don't have full auth integration with Prisma yet
// In a real app, this would come from the session
const MOCK_USER_ID = 'test-user-id'

export async function GET(request: Request) {
    try {
        // In a real implementation, get userId from session/token
        // const session = await getSession()
        // const userId = session.user.id

        // For now, return all workspaces to demonstrate the UI
        const workspaces = await prisma.workspace.findMany({
            orderBy: { createdAt: 'desc' }
        })

        return NextResponse.json(workspaces)
    } catch (error) {
        console.error('Failed to fetch workspaces:', error)
        return NextResponse.json({ error: 'Failed to fetch workspaces' }, { status: 500 })
    }
}

export async function POST(request: Request) {
    try {
        const body = await request.json()
        const { name, domain } = body

        const workspace = await prisma.workspace.create({
            data: {
                name,
                domain,
                plan: 'free'
            }
        })

        return NextResponse.json(workspace)
    } catch (error) {
        console.error('Failed to create workspace:', error)
        return NextResponse.json({ error: 'Failed to create workspace' }, { status: 500 })
    }
}
