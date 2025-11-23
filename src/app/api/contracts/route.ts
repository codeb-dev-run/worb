import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(request: Request) {
    try {
        const contracts = await prisma.contract.findMany({
            orderBy: { createdAt: 'desc' },
            take: 50,
        })
        return NextResponse.json(contracts)
    } catch (error) {
        console.error('Failed to fetch contracts:', error)
        return NextResponse.json({ error: 'Failed to fetch contracts' }, { status: 500 })
    }
}

export async function POST(request: Request) {
    try {
        const body = await request.json()
        const contract = await prisma.contract.create({
            data: body,
        })
        return NextResponse.json(contract)
    } catch (error) {
        console.error('Failed to create contract:', error)
        return NextResponse.json({ error: 'Failed to create contract' }, { status: 500 })
    }
}
