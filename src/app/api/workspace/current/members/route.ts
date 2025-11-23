import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

const MOCK_WORKSPACE_ID = 'test-workspace-id'

export async function GET(request: Request) {
    try {
        const members = await prisma.user.findMany({
            select: {
                id: true,
                email: true,
                name: true,
                department: true,
                role: true,
                avatar: true,
            },
            orderBy: {
                name: 'asc',
            },
        })

        return NextResponse.json(members)
    } catch (error) {
        console.error('Failed to fetch members:', error)
        return NextResponse.json({ error: 'Failed to fetch members' }, { status: 500 })
    }
}
