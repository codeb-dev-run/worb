// =============================================================================
// Activities API - 최근 활동 조회
// =============================================================================

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { authenticateRequest, secureLogger, createErrorResponse } from '@/lib/security'
import { formatDistanceToNow } from 'date-fns'
import { ko } from 'date-fns/locale'

export async function GET(request: NextRequest) {
  try {
    const user = await authenticateRequest()
    if (!user) {
      return createErrorResponse('Unauthorized', 401, 'AUTH_REQUIRED')
    }

    const { searchParams } = new URL(request.url)
    const workspaceId = searchParams.get('workspaceId')
    const limit = Math.min(parseInt(searchParams.get('limit') || '4'), 10)

    if (!workspaceId) {
      return createErrorResponse('Workspace ID required', 400, 'MISSING_WORKSPACE_ID')
    }

    // 워크스페이스 멤버십 확인
    const membership = await prisma.workspaceMember.findUnique({
      where: {
        workspaceId_userId: {
          workspaceId,
          userId: user.id,
        },
      },
    })

    if (!membership) {
      return createErrorResponse('Forbidden', 403, 'NOT_A_MEMBER')
    }

    // 최근 수정된 Task 조회 (사용자가 담당자이거나 생성한 작업)
    const recentTasks = await prisma.task.findMany({
      where: {
        project: {
          workspaceId,
        },
        OR: [
          { assigneeId: user.id },
          { createdBy: user.id },
        ],
      },
      orderBy: {
        updatedAt: 'desc',
      },
      take: limit,
      include: {
        project: {
          select: {
            name: true,
          },
        },
        assignee: {
          select: {
            name: true,
          },
        },
      },
    })

    // Task 상태에 따른 설명 생성
    const getStatusDescription = (status: string) => {
      switch (status) {
        case 'todo': return '할 일'
        case 'in_progress': return '진행 중'
        case 'review': return '검토 대기'
        case 'done': return '완료'
        default: return status
      }
    }

    // 활동 데이터 변환
    const activities = recentTasks.map((task) => ({
      id: task.id,
      title: task.title,
      desc: `${task.project?.name || '프로젝트'} - ${getStatusDescription(task.status)}`,
      time: formatDistanceToNow(new Date(task.updatedAt), { addSuffix: true, locale: ko }),
      status: task.status === 'done' ? 'completed' :
              task.status === 'in_progress' ? 'progress' :
              task.status === 'review' ? 'pending' :
              task.dueDate && new Date(task.dueDate) < new Date() ? 'overdue' : 'pending',
      taskId: task.id,
    }))

    return NextResponse.json(activities)
  } catch (error) {
    secureLogger.error('Failed to fetch activities', error as Error, { operation: 'activities.list' })
    return createErrorResponse('Failed to fetch activities', 500, 'FETCH_FAILED')
  }
}
