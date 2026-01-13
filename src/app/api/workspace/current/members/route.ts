// =============================================================================
// Current Workspace Members API - CVE-CB-003, CVE-CB-005 Fixed
// TeamMember 기반으로 워크스페이스별 부서 관리 지원
// Redis 캐싱 적용: TTL 5분 (멤버 목록은 자주 변경되지 않음)
// =============================================================================

export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth-options'
import { secureLogger, createErrorResponse } from '@/lib/security'
import { cachedApiResponse, CacheKeys, CacheTTL } from '@/lib/redis'

export async function GET(request: Request) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user?.email) {
            return createErrorResponse('Unauthorized', 401, 'AUTH_REQUIRED')
        }

        // CVE-CB-003 Fix: Prefer query parameter over header for workspace ID
        const { searchParams } = new URL(request.url)
        const workspaceId = searchParams.get('workspaceId') || request.headers.get('x-workspace-id')
        const forceRefresh = searchParams.get('refresh') === 'true'

        if (!workspaceId) {
            return createErrorResponse('Workspace ID required', 400, 'WORKSPACE_ID_REQUIRED')
        }

        // 현재 사용자 확인
        const currentUser = await prisma.user.findUnique({
            where: { email: session.user.email },
            select: { id: true }
        })

        if (!currentUser) {
            return createErrorResponse('User not found', 404, 'USER_NOT_FOUND')
        }

        // 멤버십 확인 (캐싱 전에 권한 검증)
        const membership = await prisma.workspaceMember.findUnique({
            where: {
                workspaceId_userId: { workspaceId, userId: currentUser.id }
            },
            select: { id: true }
        })

        if (!membership) {
            return createErrorResponse('Not a member of this workspace', 403, 'NOT_A_MEMBER')
        }

        // 캐싱된 멤버 목록 반환 (TTL: 5분)
        const members = await cachedApiResponse(
            CacheKeys.workspaceMembers(workspaceId),
            async () => {
                // 병렬 쿼리: 멤버 목록 조회 + 팀 정보 조회
                const [workspaceMembers, teamMembers] = await Promise.all([
                    prisma.workspaceMember.findMany({
                        where: { workspaceId },
                        select: {
                            userId: true,
                            user: {
                                select: {
                                    id: true,
                                    email: true,
                                    name: true,
                                    role: true,
                                    avatar: true
                                }
                            }
                        }
                    }),
                    // 별도 쿼리로 팀 멤버십 조회 (N+1 방지)
                    prisma.teamMember.findMany({
                        where: {
                            team: { workspaceId }
                        },
                        select: {
                            id: true,
                            userId: true,
                            team: {
                                select: { id: true, name: true, color: true }
                            }
                        }
                    })
                ])

                // 팀 멤버십을 userId 기반 Map으로 변환 (O(1) 조회)
                const teamMap = new Map(teamMembers.map(tm => [tm.userId, tm]))

                // User 정보 + 워크스페이스 내 팀 정보 반환
                return workspaceMembers.map(wm => {
                    const teamMembership = teamMap.get(wm.userId)
                    return {
                        id: wm.user.id,
                        email: wm.user.email,
                        name: wm.user.name,
                        role: wm.user.role,
                        avatar: wm.user.avatar,
                        department: teamMembership?.team?.id || null,
                        departmentName: teamMembership?.team?.name || null,
                        departmentColor: teamMembership?.team?.color || null,
                        teamMembershipId: teamMembership?.id || null,
                    }
                })
            },
            {
                ttl: CacheTTL.MEDIUM, // 5분
                tags: [`workspace:${workspaceId}`, 'members'],
                forceRefresh,
            }
        )

        return NextResponse.json(members)
    } catch (error) {
        // CVE-CB-005: Secure logging
        secureLogger.error('Failed to fetch members', error as Error, { operation: 'workspace.current.members' })
        return createErrorResponse('Failed to fetch members', 500, 'FETCH_FAILED')
    }
}
