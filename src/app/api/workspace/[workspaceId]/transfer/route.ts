// =============================================================================
// Workspace Transfer API - CVE-CB-005 Fixed: Secure Logging
// =============================================================================

export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth-options'
import { secureLogger, createErrorResponse } from '@/lib/security'

// 워크스페이스 소유권 이전 (승계)
export async function POST(
    request: Request,
    { params }: { params: Promise<{ workspaceId: string }> }
) {
    try {
        const { workspaceId } = await params
        const session = await getServerSession(authOptions)
        if (!session?.user?.email) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const { newOwnerId } = await request.json()

        if (!newOwnerId) {
            return NextResponse.json({ error: 'New owner ID is required' }, { status: 400 })
        }

        // 현재 사용자 확인
        const currentUser = await prisma.user.findUnique({
            where: { email: session.user.email }
        })

        if (!currentUser) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 })
        }

        // 현재 사용자가 admin인지 확인
        const currentMembership = await prisma.workspaceMember.findUnique({
            where: {
                workspaceId_userId: {
                    workspaceId,
                    userId: currentUser.id
                }
            }
        })

        if (!currentMembership || currentMembership.role !== 'admin') {
            return NextResponse.json({ error: 'Only admins can transfer workspace ownership' }, { status: 403 })
        }

        // 새 소유자가 워크스페이스 멤버인지 확인
        const newOwnerMembership = await prisma.workspaceMember.findUnique({
            where: {
                workspaceId_userId: {
                    workspaceId,
                    userId: newOwnerId
                }
            }
        })

        if (!newOwnerMembership) {
            return NextResponse.json({ error: 'New owner must be a workspace member' }, { status: 400 })
        }

        // 자기 자신에게 승계할 수 없음
        if (newOwnerId === currentUser.id) {
            return NextResponse.json({ error: 'Cannot transfer ownership to yourself' }, { status: 400 })
        }

        // 트랜잭션으로 소유권 이전
        await prisma.$transaction(async (tx) => {
            // 새 소유자를 admin으로 승격
            await tx.workspaceMember.update({
                where: {
                    workspaceId_userId: {
                        workspaceId,
                        userId: newOwnerId
                    }
                },
                data: { role: 'admin' }
            })

            // 현재 사용자를 member로 변경 (선택사항 - 관리자 유지 가능)
            // 여기서는 원래 관리자도 admin으로 유지
        })

        // 새 소유자 정보 조회
        const newOwner = await prisma.user.findUnique({
            where: { id: newOwnerId },
            select: {
                id: true,
                email: true,
                name: true,
                avatar: true
            }
        })

        secureLogger.info('Workspace ownership transferred', {
            operation: 'workspace.transfer',
            workspaceId,
            newOwnerId,
        })

        return NextResponse.json({
            success: true,
            message: `Workspace ownership transferred to ${newOwner?.name}`,
            newOwner
        })
    } catch (error) {
        // CVE-CB-005: Secure logging
        secureLogger.error('Failed to transfer workspace ownership', error as Error, { operation: 'workspace.transfer' })
        return createErrorResponse('Failed to transfer workspace ownership', 500, 'TRANSFER_FAILED')
    }
}
