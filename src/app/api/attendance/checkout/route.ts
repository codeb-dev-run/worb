import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

const MOCK_USER_ID = 'test-user-id'

export async function POST(request: Request) {
    try {
        const now = new Date()
        const today = new Date()
        today.setHours(0, 0, 0, 0)

        // Find today's attendance
        const attendance = await prisma.attendance.findFirst({
            where: {
                userId: MOCK_USER_ID,
                date: {
                    gte: today,
                },
            },
        })

        if (!attendance) {
            return NextResponse.json({ error: 'No check-in record found' }, { status: 400 })
        }

        if (attendance.checkOut) {
            return NextResponse.json({ error: 'Already checked out' }, { status: 400 })
        }

        const updated = await prisma.attendance.update({
            where: { id: attendance.id },
            data: {
                checkOut: now,
            },
        })

        return NextResponse.json(updated)
    } catch (error) {
        console.error('Check-out failed:', error)
        return NextResponse.json({ error: 'Check-out failed' }, { status: 500 })
    }
}
