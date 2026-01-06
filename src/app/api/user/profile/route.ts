// =============================================================================
// User Profile API - 사용자 프로필 업데이트 (이름, 아바타 등)
// =============================================================================

export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth-options'
import { prisma } from '@/lib/prisma'
import { secureLogger, createErrorResponse } from '@/lib/security'

// GET: 현재 로그인한 사용자의 프로필 조회
export async function GET() {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user?.id) {
            return createErrorResponse('Unauthorized', 401, 'AUTH_REQUIRED')
        }

        const user = await prisma.user.findUnique({
            where: { id: session.user.id },
            select: {
                id: true,
                name: true,
                email: true,
                avatar: true,
                role: true,
                createdAt: true,
                lastLogin: true,
            }
        })

        if (!user) {
            return createErrorResponse('User not found', 404, 'USER_NOT_FOUND')
        }

        return NextResponse.json({ user })
    } catch (error) {
        secureLogger.error('Failed to fetch user profile', error as Error, { operation: 'user.profile.get' })
        return createErrorResponse('Failed to fetch user profile', 500, 'FETCH_FAILED')
    }
}

// PUT: 사용자 프로필 업데이트 (이름, 아바타)
export async function PUT(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user?.id) {
            return createErrorResponse('Unauthorized', 401, 'AUTH_REQUIRED')
        }

        const body = await request.json()
        const { name, avatar } = body

        // 업데이트할 필드만 포함
        const updateData: { name?: string; avatar?: string } = {}
        if (name !== undefined) updateData.name = name
        if (avatar !== undefined) updateData.avatar = avatar

        if (Object.keys(updateData).length === 0) {
            return createErrorResponse('No fields to update', 400, 'NO_UPDATE_FIELDS')
        }

        const updatedUser = await prisma.user.update({
            where: { id: session.user.id },
            data: updateData,
            select: {
                id: true,
                name: true,
                email: true,
                avatar: true,
                role: true,
            }
        })

        return NextResponse.json({ user: updatedUser })
    } catch (error) {
        secureLogger.error('Failed to update user profile', error as Error, { operation: 'user.profile.update' })
        return createErrorResponse('Failed to update user profile', 500, 'UPDATE_FAILED')
    }
}
