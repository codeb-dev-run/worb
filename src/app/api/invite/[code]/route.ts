// =============================================================================
// Invite Code API - CVE-CB-005 Fixed: Secure Logging
// =============================================================================

import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { secureLogger, createErrorResponse } from '@/lib/security'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth-options'

export async function GET(
    request: Request,
    { params }: { params: { code: string } }
) {
    try {
        const invite = await prisma.invitation.findUnique({
            where: { token: params.code },
            include: {
                workspace: {
                    select: {
                        id: true,
                        name: true,
                    },
                },
                inviter: {
                    select: {
                        name: true,
                        email: true,
                    },
                },
            },
        })

        if (!invite) {
            return createErrorResponse('Invalid invite code', 404, 'INVALID_CODE')
        }

        // 이미 수락된 초대인 경우
        if (invite.status === 'ACCEPTED') {
            // 현재 로그인된 사용자가 이미 멤버인지 확인
            const session = await getServerSession(authOptions)
            if (session?.user?.email) {
                const user = await prisma.user.findUnique({
                    where: { email: session.user.email },
                })

                if (user) {
                    const existingMember = await prisma.workspaceMember.findUnique({
                        where: {
                            workspaceId_userId: {
                                workspaceId: invite.workspaceId,
                                userId: user.id,
                            },
                        },
                    })

                    if (existingMember) {
                        // 이미 멤버인 경우 - 성공 응답과 함께 멤버임을 알림
                        return NextResponse.json({
                            ...invite,
                            alreadyMember: true,
                            workspaceId: invite.workspaceId,
                        })
                    }
                }
            }

            return createErrorResponse('Invite already accepted', 400, 'INVITE_USED')
        }

        if (invite.status === 'EXPIRED' || invite.status === 'REVOKED') {
            return createErrorResponse('Invite expired or revoked', 400, 'INVITE_EXPIRED')
        }

        if (new Date() > invite.expiresAt) {
            return createErrorResponse('Invite expired', 400, 'INVITE_EXPIRED')
        }

        return NextResponse.json(invite)
    } catch (error) {
        // CVE-CB-005: Secure logging
        secureLogger.error('Failed to fetch invite', error as Error, { operation: 'invite.get' })
        return createErrorResponse('Failed to fetch invite', 500, 'FETCH_FAILED')
    }
}
