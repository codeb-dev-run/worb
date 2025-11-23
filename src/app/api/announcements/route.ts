import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(request: Request) {
    try {
        const announcements = await prisma.announcement.findMany({
            orderBy: [
                { isPinned: 'desc' },
                { createdAt: 'desc' },
            ],
            take: 50,
        })

        // Add isNew flag for posts created in last 24 hours
        const now = new Date()
        const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000)

        const announcementsWithNew = announcements.map(a => ({
            ...a,
            isNew: new Date(a.createdAt) > oneDayAgo
        }))

        return NextResponse.json(announcementsWithNew)
    } catch (error) {
        console.error('Failed to fetch announcements:', error)
        return NextResponse.json({ error: 'Failed to fetch announcements' }, { status: 500 })
    }
}

export async function POST(request: Request) {
    try {
        const body = await request.json()
        const announcement = await prisma.announcement.create({
            data: body,
        })
        return NextResponse.json(announcement)
    } catch (error) {
        console.error('Failed to create announcement:', error)
        return NextResponse.json({ error: 'Failed to create announcement' }, { status: 500 })
    }
}
