import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// Mock user ID
const MOCK_USER_ID = 'test-user-id'

export async function GET(request: Request) {
    try {
        const today = new Date()
        today.setHours(0, 0, 0, 0)

        // Get today's attendance
        const todayAttendance = await prisma.attendance.findFirst({
            where: {
                userId: MOCK_USER_ID,
                date: {
                    gte: today,
                },
            },
        })

        // Get recent history (last 30 days)
        const thirtyDaysAgo = new Date()
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

        const history = await prisma.attendance.findMany({
            where: {
                userId: MOCK_USER_ID,
                date: {
                    gte: thirtyDaysAgo,
                },
            },
            orderBy: {
                date: 'desc',
            },
            take: 30,
        })

        return NextResponse.json({
            today: todayAttendance,
            history,
        })
    } catch (error) {
        console.error('Failed to fetch attendance:', error)
        return NextResponse.json({ error: 'Failed to fetch attendance' }, { status: 500 })
    }
}
