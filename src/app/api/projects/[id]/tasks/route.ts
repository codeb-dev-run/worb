// =============================================================================
// Project Tasks API - CVE Fixes Applied
// CVE-CB-005: Secure Logging
// CVE-CB-009: Input Validation with Zod
// =============================================================================

export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth-options'
import { prisma, getReadClient } from '@/lib/prisma'
import { getOrSet, CacheKeys, CacheTTL, invalidateCache } from '@/lib/redis'
import { secureLogger, createErrorResponse } from '@/lib/security'
import { validateBody, taskCreateSchema, validationErrorResponse } from '@/lib/validation'
import { notifyTaskAssigned } from '@/lib/centrifugo-client'

// =============================================================================
// Project Tasks API - Hyperscale Optimized
// Target: <100ms response time with caching
// =============================================================================

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return createErrorResponse('Unauthorized', 401, 'AUTH_REQUIRED')
    }

    const projectId = id
    const readClient = getReadClient()

    // 캐시 키 설정
    const cacheKey = CacheKeys.projectTasks(projectId)

    // URL에서 limit 파라미터 추출 (기본값: 200, 최대: 500)
    const { searchParams } = new URL(request.url)
    const limit = Math.min(parseInt(searchParams.get('limit') || '200'), 500)
    const cursor = searchParams.get('cursor') || undefined

    const tasks = await getOrSet(
      `${cacheKey}:${limit}:${cursor || 'first'}`,
      async () => {
        return readClient.task.findMany({
          where: {
            projectId: projectId,
            deletedAt: null,
          },
          include: {
            assignee: {
              select: {
                id: true,
                name: true,
                email: true,
                avatar: true
              }
            },
            project: {
              select: {
                id: true,
                name: true
              }
            }
          },
          orderBy: {
            createdAt: 'desc',
          },
          take: limit + 1,  // 100K CCU: 결과 제한 필수
          ...(cursor && {
            cursor: { id: cursor },
            skip: 1,
          }),
        })
      },
      CacheTTL.TASKS
    )

    // 다음 페이지 존재 여부 확인
    const hasMore = tasks.length > limit
    const items = hasMore ? tasks.slice(0, -1) : tasks
    const nextCursor = hasMore ? items[items.length - 1]?.id : null

    return NextResponse.json({
      items,
      nextCursor,
      hasMore,
    })
  } catch (error) {
    // CVE-CB-005: Secure logging
    secureLogger.error('Failed to fetch tasks', error as Error, { operation: 'project.tasks.list' })
    return createErrorResponse('Failed to fetch tasks', 500, 'FETCH_FAILED')
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return createErrorResponse('Unauthorized', 401, 'AUTH_REQUIRED')
    }

    const projectId = id

    // CVE-CB-009 Fix: Validate request body with Zod schema
    const validation = await validateBody(request, taskCreateSchema.omit({ projectId: true }))
    if (!validation.success) {
      return validationErrorResponse(validation.errors!)
    }

    const { title, description, status, priority, assigneeId, dueDate, estimatedHours, tags } = validation.data!

    const task = await prisma.task.create({
      data: {
        projectId: projectId,
        title,
        description: description || '',
        status: status || 'todo',
        priority: priority || 'medium',
        assigneeId: assigneeId,
        dueDate: dueDate,
        createdBy: session.user.id,
      },
      include: {
        assignee: {
          select: {
            id: true,
            name: true,
            email: true,
            avatar: true
          }
        }
      }
    })

    // 100K CCU: 캐시 무효화를 비동기로 처리 (응답 지연 방지)
    // 프로젝트 정보 먼저 조회 (알림에도 필요)
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      select: { workspaceId: true, name: true }
    })

    // 비동기 캐시 무효화 (await 없음 - fire-and-forget)
    invalidateCache(CacheKeys.projectTasks(projectId))
    if (project?.workspaceId) {
      invalidateCache(CacheKeys.dashboardStats(project.workspaceId))
    }

    // 작업 할당 알림 발송 (담당자가 본인이 아닌 경우)
    if (assigneeId && assigneeId !== session.user.id) {
      try {
        const currentUser = await prisma.user.findUnique({
          where: { id: session.user.id },
          select: { name: true, email: true }
        })
        await notifyTaskAssigned(
          assigneeId,
          task.id,
          title,
          projectId,
          project?.name || '프로젝트',
          currentUser?.name || currentUser?.email || '팀원'
        )
      } catch {
        // 알림 실패는 무시
      }
    }

    // CVE-CB-005: Secure logging
    secureLogger.info('Task created', {
      operation: 'project.tasks.create',
      projectId,
      taskId: task.id,
      userId: session.user.id,
    })

    return NextResponse.json(task, { status: 201 })
  } catch (error) {
    // CVE-CB-005: Secure logging
    secureLogger.error('Failed to create task', error as Error, { operation: 'project.tasks.create' })
    return createErrorResponse('Failed to create task', 500, 'CREATE_FAILED')
  }
}
