// =============================================================================
// Invite Accept API - CVE-CB-005 Fixed: Secure Logging
// =============================================================================

export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth-options'
import { secureLogger, createErrorResponse } from '@/lib/security'

export async function POST(
    request: Request,
    { params }: { params: Promise<{ code: string }> }
) {
    try {
        const { code } = await params
        const session = await getServerSession(authOptions)
        if (!session?.user?.email) {
            return createErrorResponse('Unauthorized', 401, 'AUTH_REQUIRED')
        }

        // 1. 초대 확인
        const invite = await prisma.invitation.findUnique({
            where: { token: code },
        })

        if (!invite) {
            return createErrorResponse('Invalid invite code', 404, 'INVALID_CODE')
        }

        if (invite.status !== 'PENDING') {
            return createErrorResponse('Invite already accepted', 400, 'INVITE_USED')
        }

        if (new Date() > invite.expiresAt) {
            return createErrorResponse('Invite expired', 400, 'INVITE_EXPIRED')
        }

        // 2. 사용자 확인
        const user = await prisma.user.findUnique({
            where: { email: session.user.email },
        })

        if (!user) {
            return createErrorResponse('User not found', 404, 'USER_NOT_FOUND')
        }

        // 3. 이미 워크스페이스 멤버인지 확인
        const existingMember = await prisma.workspaceMember.findUnique({
            where: {
                workspaceId_userId: {
                    workspaceId: invite.workspaceId,
                    userId: user.id,
                },
            },
        })

        if (existingMember) {
            // 이미 멤버인 경우 초대 상태만 업데이트하고 성공 반환
            await prisma.invitation.update({
                where: { id: invite.id },
                data: {
                    status: 'ACCEPTED',
                    acceptedAt: new Date(),
                },
            })

            secureLogger.info('Invite accepted (already member)', {
                operation: 'invite.accept',
                userId: user.id,
                workspaceId: invite.workspaceId,
            })

            return NextResponse.json({
                success: true,
                alreadyMember: true,
                workspaceId: invite.workspaceId
            })
        }

        // 4. 트랜잭션으로 멤버 추가 및 초대 상태 업데이트
        await prisma.$transaction(async (tx) => {
            // 멤버 추가
            await tx.workspaceMember.create({
                data: {
                    workspaceId: invite.workspaceId,
                    userId: user.id,
                    role: invite.role,
                },
            })

            // 초대 상태 업데이트
            await tx.invitation.update({
                where: { id: invite.id },
                data: {
                    status: 'ACCEPTED',
                    acceptedAt: new Date(),
                },
            })
        })

        // CVE-CB-005: Secure logging
        secureLogger.info('Invite accepted', {
            operation: 'invite.accept',
            userId: user.id,
            workspaceId: invite.workspaceId,
        })

        return NextResponse.json({ success: true })
    } catch (error: any) {
        // CVE-CB-005: Secure logging
        secureLogger.error('Failed to accept invite', error as Error, { operation: 'invite.accept' })

        // 이미 멤버인 경우 처리
        if (error.code === 'P2002') {
            return createErrorResponse('Already a member of this workspace', 400, 'ALREADY_MEMBER')
        }
        return createErrorResponse('Failed to accept invite', 500, 'ACCEPT_FAILED')
    }
}
