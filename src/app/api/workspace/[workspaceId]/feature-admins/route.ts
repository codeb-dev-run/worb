// =============================================================================
// Feature Admins API - CVE-CB-005 Fixed: Secure Logging
// =============================================================================

import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth-options'
import { secureLogger, createErrorResponse } from '@/lib/security'

// 기능별 관리자 목록 조회
export async function GET(
    request: Request,
    { params }: { params: { workspaceId: string } }
) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user?.email) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const { workspaceId } = params
        const { searchParams } = new URL(request.url)
        const featureKey = searchParams.get('featureKey')

        // 현재 사용자가 admin인지 확인
        const currentUser = await prisma.user.findUnique({
            where: { email: session.user.email }
        })

        if (!currentUser) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 })
        }

        const membership = await prisma.workspaceMember.findUnique({
            where: {
                workspaceId_userId: {
                    workspaceId,
                    userId: currentUser.id
                }
            }
        })

        if (!membership) {
            return NextResponse.json({ error: 'Not a member' }, { status: 403 })
        }

        // 워크스페이스 features 조회
        const features = await prisma.workspaceFeatures.findUnique({
            where: { workspaceId }
        })

        if (!features) {
            return NextResponse.json([])
        }

        // 기능별 관리자 조회
        const whereClause: { featuresId: string; featureKey?: string } = {
            featuresId: features.id
        }

        if (featureKey) {
            whereClause.featureKey = featureKey
        }

        const featureAdmins = await prisma.featureAdmin.findMany({
            where: whereClause
        })

        // 사용자 정보 조회
        const userIds = Array.from(new Set(featureAdmins.map(fa => fa.userId)))
        const users = await prisma.user.findMany({
            where: { id: { in: userIds } },
            select: {
                id: true,
                email: true,
                name: true,
                avatar: true,
                department: true
            }
        })

        const usersMap = new Map(users.map(u => [u.id, u]))

        const result = featureAdmins.map(fa => ({
            id: fa.id,
            featureKey: fa.featureKey,
            userId: fa.userId,
            user: usersMap.get(fa.userId) || null,
            createdAt: fa.createdAt.toISOString()
        }))

        return NextResponse.json(result)
    } catch (error) {
        // CVE-CB-005: Secure logging
        secureLogger.error('Failed to fetch feature admins', error as Error, { operation: 'workspace.featureAdmins.list' })
        return createErrorResponse('Failed to fetch feature admins', 500, 'FETCH_FAILED')
    }
}

// 기능별 관리자 추가
export async function POST(
    request: Request,
    { params }: { params: { workspaceId: string } }
) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user?.email) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const { workspaceId } = params
        const { userId, featureKey } = await request.json()

        if (!userId || !featureKey) {
            return NextResponse.json({ error: 'userId and featureKey are required' }, { status: 400 })
        }

        // 유효한 featureKey인지 확인
        const validFeatureKeys = ['project', 'hr', 'finance', 'groupware', 'advanced']
        if (!validFeatureKeys.includes(featureKey)) {
            return NextResponse.json({ error: 'Invalid featureKey' }, { status: 400 })
        }

        // 현재 사용자가 admin인지 확인
        const currentUser = await prisma.user.findUnique({
            where: { email: session.user.email }
        })

        if (!currentUser) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 })
        }

        const membership = await prisma.workspaceMember.findUnique({
            where: {
                workspaceId_userId: {
                    workspaceId,
                    userId: currentUser.id
                }
            }
        })

        if (!membership || membership.role !== 'admin') {
            return NextResponse.json({ error: 'Only admins can manage feature admins' }, { status: 403 })
        }

        // 대상 사용자가 워크스페이스 멤버인지 확인
        const targetMembership = await prisma.workspaceMember.findUnique({
            where: {
                workspaceId_userId: {
                    workspaceId,
                    userId
                }
            }
        })

        if (!targetMembership) {
            return NextResponse.json({ error: 'User is not a workspace member' }, { status: 400 })
        }

        // 워크스페이스 features 조회/생성
        let features = await prisma.workspaceFeatures.findUnique({
            where: { workspaceId }
        })

        if (!features) {
            features = await prisma.workspaceFeatures.create({
                data: { workspaceId }
            })
        }

        // 이미 등록되어 있는지 확인
        const existing = await prisma.featureAdmin.findUnique({
            where: {
                featuresId_userId_featureKey: {
                    featuresId: features.id,
                    userId,
                    featureKey
                }
            }
        })

        if (existing) {
            return NextResponse.json({ error: 'Already assigned as feature admin' }, { status: 400 })
        }

        // 기능별 관리자 추가
        const featureAdmin = await prisma.featureAdmin.create({
            data: {
                featuresId: features.id,
                userId,
                featureKey
            }
        })

        // 사용자 정보 조회
        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: {
                id: true,
                email: true,
                name: true,
                avatar: true,
                department: true
            }
        })

        secureLogger.info('Feature admin added', {
            operation: 'workspace.featureAdmins.add',
            workspaceId,
            userId,
            featureKey,
        })

        return NextResponse.json({
            id: featureAdmin.id,
            featureKey: featureAdmin.featureKey,
            userId: featureAdmin.userId,
            user,
            createdAt: featureAdmin.createdAt.toISOString()
        })
    } catch (error) {
        // CVE-CB-005: Secure logging
        secureLogger.error('Failed to add feature admin', error as Error, { operation: 'workspace.featureAdmins.add' })
        return createErrorResponse('Failed to add feature admin', 500, 'ADD_FAILED')
    }
}

// 기능별 관리자 삭제
export async function DELETE(
    request: Request,
    { params }: { params: { workspaceId: string } }
) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user?.email) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const { workspaceId } = params
        const { searchParams } = new URL(request.url)
        const featureAdminId = searchParams.get('id')

        if (!featureAdminId) {
            return NextResponse.json({ error: 'Feature admin ID is required' }, { status: 400 })
        }

        // 현재 사용자가 admin인지 확인
        const currentUser = await prisma.user.findUnique({
            where: { email: session.user.email }
        })

        if (!currentUser) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 })
        }

        const membership = await prisma.workspaceMember.findUnique({
            where: {
                workspaceId_userId: {
                    workspaceId,
                    userId: currentUser.id
                }
            }
        })

        if (!membership || membership.role !== 'admin') {
            return NextResponse.json({ error: 'Only admins can manage feature admins' }, { status: 403 })
        }

        // 삭제
        await prisma.featureAdmin.delete({
            where: { id: featureAdminId }
        })

        secureLogger.info('Feature admin removed', {
            operation: 'workspace.featureAdmins.remove',
            workspaceId,
            featureAdminId,
        })

        return NextResponse.json({ success: true })
    } catch (error) {
        // CVE-CB-005: Secure logging
        secureLogger.error('Failed to remove feature admin', error as Error, { operation: 'workspace.featureAdmins.remove' })
        return createErrorResponse('Failed to remove feature admin', 500, 'REMOVE_FAILED')
    }
}
