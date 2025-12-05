// =============================================================================
// Current Workspace Members API - CVE-CB-003, CVE-CB-005 Fixed
// TeamMember 기반으로 워크스페이스별 부서 관리 지원
// =============================================================================

import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { auth } from '@/auth'
import { secureLogger, createErrorResponse } from '@/lib/security'

export async function GET(request: Request) {
    try {
        const session = await auth()
        if (!session?.user?.email) {
            return createErrorResponse('Unauthorized', 401, 'AUTH_REQUIRED')
        }

        // CVE-CB-003 Fix: Prefer query parameter over header for workspace ID
        const { searchParams } = new URL(request.url)
        const workspaceId = searchParams.get('workspaceId') || request.headers.get('x-workspace-id')

        if (!workspaceId) {
            return createErrorResponse('Workspace ID required', 400, 'WORKSPACE_ID_REQUIRED')
        }

        // Verify user is a member of this workspace
        const currentUser = await prisma.user.findUnique({
            where: { email: session.user.email }
        })

        if (!currentUser) {
            return createErrorResponse('User not found', 404, 'USER_NOT_FOUND')
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
            return createErrorResponse('Not a member of this workspace', 403, 'NOT_A_MEMBER')
        }

        // 워크스페이스의 멤버 조회 (TeamMember 포함)
        const workspaceMembers = await prisma.workspaceMember.findMany({
            where: {
                workspaceId: workspaceId,
            },
            include: {
                user: {
                    select: {
                        id: true,
                        email: true,
                        name: true,
                        role: true,
                        avatar: true,
                        // TeamMember를 통해 이 워크스페이스에서의 팀(부서) 정보 조회
                        teamMemberships: {
                            where: {
                                team: {
                                    workspaceId: workspaceId
                                }
                            },
                            include: {
                                team: {
                                    select: {
                                        id: true,
                                        name: true,
                                        color: true,
                                    }
                                }
                            }
                        }
                    },
                },
            },
        })

        // User 정보 + 워크스페이스 내 팀 정보 반환
        const members = workspaceMembers.map(wm => {
            // 이 워크스페이스에서의 첫 번째 팀 멤버십 (1인 1팀 가정, 필요시 확장 가능)
            const teamMembership = wm.user.teamMemberships[0]
            return {
                id: wm.user.id,
                email: wm.user.email,
                name: wm.user.name,
                role: wm.user.role,
                avatar: wm.user.avatar,
                // 워크스페이스별 부서 정보 (TeamMember 기반)
                department: teamMembership?.team?.id || null,
                departmentName: teamMembership?.team?.name || null,
                departmentColor: teamMembership?.team?.color || null,
                teamMembershipId: teamMembership?.id || null,
            }
        })
        return NextResponse.json(members)
    } catch (error) {
        // CVE-CB-005: Secure logging
        secureLogger.error('Failed to fetch members', error as Error, { operation: 'workspace.current.members' })
        return createErrorResponse('Failed to fetch members', 500, 'FETCH_FAILED')
    }
}
