// =============================================================================
// Workspace Current Members API - CVE-CB-005 Fixed: Secure Logging
// TeamMember 기반으로 워크스페이스별 부서 관리 지원
// =============================================================================

import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { auth } from '@/auth'
import { secureLogger, createErrorResponse } from '@/lib/security'

export async function PATCH(
    request: Request,
    { params }: { params: { id: string } }
) {
    try {
        const session = await auth()
        if (!session?.user?.email) {
            return createErrorResponse('Unauthorized', 401, 'AUTH_REQUIRED')
        }

        const body = await request.json()
        const { department: newTeamId, workspaceId } = body

        if (!workspaceId) {
            return createErrorResponse('Workspace ID required', 400, 'WORKSPACE_ID_REQUIRED')
        }

        const userId = params.id

        // 현재 사용자 확인 및 권한 체크
        const currentUser = await prisma.user.findUnique({
            where: { email: session.user.email }
        })

        if (!currentUser) {
            return createErrorResponse('User not found', 404, 'USER_NOT_FOUND')
        }

        // 현재 사용자가 워크스페이스 멤버인지 확인
        const membership = await prisma.workspaceMember.findUnique({
            where: {
                workspaceId_userId: {
                    workspaceId,
                    userId: currentUser.id
                }
            }
        })

        if (!membership) {
            return createErrorResponse('Not a member of this workspace', 403, 'NOT_A_MEMBER')
        }

        // 대상 사용자가 이 워크스페이스의 멤버인지 확인
        const targetMembership = await prisma.workspaceMember.findUnique({
            where: {
                workspaceId_userId: {
                    workspaceId,
                    userId
                }
            }
        })

        if (!targetMembership) {
            return createErrorResponse('Target user is not a member of this workspace', 404, 'TARGET_NOT_MEMBER')
        }

        // 이 워크스페이스에서 기존 TeamMember 관계 삭제
        await prisma.teamMember.deleteMany({
            where: {
                userId,
                team: {
                    workspaceId
                }
            }
        })

        let teamMembership = null

        // 새로운 팀이 지정된 경우 TeamMember 생성
        if (newTeamId) {
            // 팀이 이 워크스페이스에 속하는지 확인
            const team = await prisma.team.findFirst({
                where: {
                    id: newTeamId,
                    workspaceId
                }
            })

            if (!team) {
                return createErrorResponse('Team not found in this workspace', 404, 'TEAM_NOT_FOUND')
            }

            teamMembership = await prisma.teamMember.create({
                data: {
                    teamId: newTeamId,
                    userId
                },
                include: {
                    team: {
                        select: {
                            id: true,
                            name: true,
                            color: true
                        }
                    }
                }
            })
        }

        // 업데이트된 사용자 정보 반환
        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: {
                id: true,
                email: true,
                name: true,
                role: true,
                avatar: true
            }
        })

        secureLogger.info('Member department updated', {
            operation: 'workspace.current.members.update',
            workspaceId,
            userId,
            newTeamId: newTeamId || 'unassigned'
        })

        return NextResponse.json({
            ...user,
            department: teamMembership?.team?.id || null,
            departmentName: teamMembership?.team?.name || null,
            departmentColor: teamMembership?.team?.color || null,
            teamMembershipId: teamMembership?.id || null
        })
    } catch (error) {
        // CVE-CB-005: Secure logging
        secureLogger.error('Failed to update member', error as Error, { operation: 'workspace.current.members.update' })
        return createErrorResponse('Failed to update member', 500, 'UPDATE_FAILED')
    }
}
