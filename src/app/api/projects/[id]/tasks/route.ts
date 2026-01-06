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

    const tasks = await getOrSet(cacheKey, async () => {
      return readClient.task.findMany({
        where: {
          projectId: projectId,
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
      })
    }, CacheTTL.TASKS)

    return NextResponse.json(tasks)
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

    // 프로젝트 태스크 캐시 무효화
    await invalidateCache(CacheKeys.projectTasks(projectId))
    // 대시보드 통계 캐시도 무효화 (태스크 수가 변경됨)
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      select: { workspaceId: true }
    })
    if (project?.workspaceId) {
      await invalidateCache(CacheKeys.dashboardStats(project.workspaceId))
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
