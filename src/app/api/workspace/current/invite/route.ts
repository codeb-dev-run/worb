import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function POST(request: Request) {
    try {
        const body = await request.json()
        const { email, name } = body

        if (!email || !name) {
            return NextResponse.json(
                { error: 'Email and name are required' },
                { status: 400 }
            )
        }

        // Check if user already exists
        const existingUser = await prisma.user.findUnique({
            where: { email },
        })

        if (existingUser) {
            return NextResponse.json(
                { error: 'User already exists' },
                { status: 400 }
            )
        }

        // TODO: Send actual invitation email
        // For now, just log the invitation
        console.log(`Sending invitation to ${email} (${name})`)

        // In a real implementation, you would:
        // 1. Generate a unique invitation token
        // 2. Store it in the database
        // 3. Send an email with a signup link containing the token
        // 4. When they click the link, verify the token and create their account

        return NextResponse.json({
            success: true,
            message: 'Invitation sent successfully',
        })
    } catch (error) {
        console.error('Failed to send invitation:', error)
        return NextResponse.json(
            { error: 'Failed to send invitation' },
            { status: 500 }
        )
    }
}
