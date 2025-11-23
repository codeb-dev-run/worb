import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function PATCH(
    request: Request,
    { params }: { params: { id: string } }
) {
    try {
        const body = await request.json()

        const updatedMember = await prisma.user.update({
            where: { id: params.id },
            data: {
                department: body.department,
            },
        })

        return NextResponse.json(updatedMember)
    } catch (error) {
        console.error('Failed to update member:', error)
        return NextResponse.json({ error: 'Failed to update member' }, { status: 500 })
    }
}
