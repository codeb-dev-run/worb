import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

const MOCK_USER_ID = 'test-user-id'

export async function POST(request: Request) {
    try {
        const now = new Date()
        const today = new Date()
        today.setHours(0, 0, 0, 0)

        // Check if already checked in today
        const existing = await prisma.attendance.findFirst({
            where: {
                userId: MOCK_USER_ID,
                date: {
                    gte: today,
                },
            },
        })

        if (existing) {
            return NextResponse.json({ error: 'Already checked in today' }, { status: 400 })
        }

        // Determine status based on time (9 AM threshold)
        const hour = now.getHours()
        const status = hour >= 9 ? 'LATE' : 'PRESENT'

        const attendance = await prisma.attendance.create({
            data: {
                userId: MOCK_USER_ID,
                date: today,
                checkIn: now,
                status,
            },
        })

        return NextResponse.json(attendance)
    } catch (error) {
        console.error('Check-in failed:', error)
        return NextResponse.json({ error: 'Check-in failed' }, { status: 500 })
    }
}
