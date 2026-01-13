// =============================================================================
// Projects List API - CVE Fixes Applied + Redis Caching
// CVE-CB-002: Session-based authentication required
// CVE-CB-003: No header-based authentication bypass
// CVE-CB-004: Workspace membership verification
// Redis 캐싱 적용: TTL 5분 (프로젝트 목록은 자주 변경되지 않음)
// =============================================================================

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { authenticateRequest, secureLogger, createErrorResponse } from '@/lib/security'
import { cachedApiResponse, CacheTTL } from '@/lib/redis'

export async function GET(request: NextRequest) {
  try {
    // CVE-CB-002 Fix: Require session-based authentication
    const user = await authenticateRequest()
    if (!user) {
      return createErrorResponse('Unauthorized', 401, 'AUTH_REQUIRED')
    }

    // Get workspace ID from query params (not header)
    const { searchParams } = new URL(request.url)
    const workspaceId = searchParams.get('workspaceId')
    const forceRefresh = searchParams.get('refresh') === 'true'

    if (!workspaceId) {
      return createErrorResponse('Workspace ID required', 400, 'WORKSPACE_ID_REQUIRED')
    }

    // CVE-CB-004 Fix: Verify user has access to workspace
    const membership = await prisma.workspaceMember.findUnique({
      where: {
        workspaceId_userId: {
          workspaceId,
          userId: user.id,
        },
      },
    })

    if (!membership) {
      return createErrorResponse('Forbidden: Not a workspace member', 403, 'NOT_A_MEMBER')
    }

    // 캐싱된 응답 반환 (TTL: 5분)
    const projects = await cachedApiResponse(
      `projects:${workspaceId}:list`,
      async () => {
        return prisma.project.findMany({
          where: {
            workspaceId: workspaceId,
          },
          orderBy: {
            updatedAt: 'desc',
          },
          select: {
            id: true,
            name: true,
            description: true,
            status: true,
            priority: true,
            startDate: true,
            endDate: true,
            createdAt: true,
            updatedAt: true,
          },
        })
      },
      {
        ttl: CacheTTL.MEDIUM, // 5분
        tags: [`workspace:${workspaceId}`, 'projects'],
        forceRefresh,
      }
    )

    return NextResponse.json(projects)
  } catch (error) {
    secureLogger.error('Failed to fetch projects', error as Error, { operation: 'project.list' })
    return createErrorResponse('Failed to fetch projects', 500, 'FETCH_FAILED')
  }
}
