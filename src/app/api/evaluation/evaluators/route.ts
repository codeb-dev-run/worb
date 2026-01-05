// =============================================================================
// Evaluators API - 평가 권한자 관리
// GET: 평가권한자 목록 조회
// POST: 평가권한자 추가 (관리자 전용)
// DELETE: 평가권한자 비활성화
// =============================================================================

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { authenticateRequest, secureLogger, createErrorResponse } from '@/lib/security'
import { z } from 'zod'

const addEvaluatorSchema = z.object({
  workspaceId: z.string().uuid(),
  userId: z.string().uuid(),
})

export async function GET(request: NextRequest) {
  try {
    const user = await authenticateRequest()
    if (!user) {
      return createErrorResponse('Unauthorized', 401, 'AUTH_REQUIRED')
    }

    const { searchParams } = new URL(request.url)
    const workspaceId = searchParams.get('workspaceId')

    if (!workspaceId) {
      return createErrorResponse('workspaceId is required', 400, 'MISSING_WORKSPACE')
    }

    // 워크스페이스 멤버인지 확인
    const membership = await prisma.workspaceMember.findUnique({
      where: {
        workspaceId_userId: { workspaceId, userId: user.id },
      },
    })

    if (!membership) {
      return createErrorResponse('Not a member', 403, 'NOT_MEMBER')
    }

    const evaluators = await prisma.evaluator.findMany({
      where: { workspaceId, isActive: true },
      include: {
        user: {
          select: { id: true, name: true, email: true, avatar: true }
        },
      },
      orderBy: { assignedAt: 'asc' },
    })

    // 본인이 평가권한자인지도 반환
    const isEvaluator = evaluators.some(e => e.userId === user.id)

    return NextResponse.json({
      evaluators,
      isEvaluator,
      isAdmin: membership.role === 'admin',
    })
  } catch (error) {
    secureLogger.error('Failed to fetch evaluators', error as Error, { operation: 'evaluators.list' })
    return createErrorResponse('Failed to fetch evaluators', 500, 'FETCH_FAILED')
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await authenticateRequest()
    if (!user) {
      return createErrorResponse('Unauthorized', 401, 'AUTH_REQUIRED')
    }

    const body = await request.json()
    const validation = addEvaluatorSchema.safeParse(body)
    if (!validation.success) {
      return createErrorResponse('Validation failed', 400, 'VALIDATION_ERROR')
    }

    const { workspaceId, userId } = validation.data

    // 관리자 권한 확인
    const membership = await prisma.workspaceMember.findUnique({
      where: {
        workspaceId_userId: { workspaceId, userId: user.id },
      },
    })

    if (!membership || membership.role !== 'admin') {
      return createErrorResponse('Admin access required', 403, 'ADMIN_REQUIRED')
    }

    // 대상 유저가 워크스페이스 멤버인지 확인
    const targetMembership = await prisma.workspaceMember.findUnique({
      where: {
        workspaceId_userId: { workspaceId, userId },
      },
    })

    if (!targetMembership) {
      return createErrorResponse('User is not a workspace member', 400, 'NOT_MEMBER')
    }

    // 평가권한자 추가 (이미 있으면 활성화)
    const evaluator = await prisma.evaluator.upsert({
      where: {
        workspaceId_userId: { workspaceId, userId },
      },
      update: {
        isActive: true,
        assignedBy: user.id,
        assignedAt: new Date(),
      },
      create: {
        workspaceId,
        userId,
        isActive: true,
        assignedBy: user.id,
      },
      include: {
        user: {
          select: { id: true, name: true, email: true, avatar: true }
        },
      },
    })

    secureLogger.info('Evaluator added', {
      operation: 'evaluators.add',
      workspaceId,
      userId,
      assignedBy: user.id,
    })

    return NextResponse.json(evaluator, { status: 201 })
  } catch (error) {
    secureLogger.error('Failed to add evaluator', error as Error, { operation: 'evaluators.add' })
    return createErrorResponse('Failed to add evaluator', 500, 'ADD_FAILED')
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const user = await authenticateRequest()
    if (!user) {
      return createErrorResponse('Unauthorized', 401, 'AUTH_REQUIRED')
    }

    const { searchParams } = new URL(request.url)
    const workspaceId = searchParams.get('workspaceId')
    const evaluatorId = searchParams.get('evaluatorId')

    if (!workspaceId || !evaluatorId) {
      return createErrorResponse('workspaceId and evaluatorId are required', 400, 'MISSING_PARAMS')
    }

    // 관리자 권한 확인
    const membership = await prisma.workspaceMember.findUnique({
      where: {
        workspaceId_userId: { workspaceId, userId: user.id },
      },
    })

    if (!membership || membership.role !== 'admin') {
      return createErrorResponse('Admin access required', 403, 'ADMIN_REQUIRED')
    }

    // 평가권한자 비활성화
    await prisma.evaluator.update({
      where: { id: evaluatorId },
      data: { isActive: false },
    })

    secureLogger.info('Evaluator removed', {
      operation: 'evaluators.remove',
      workspaceId,
      evaluatorId,
      removedBy: user.id,
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    secureLogger.error('Failed to remove evaluator', error as Error, { operation: 'evaluators.remove' })
    return createErrorResponse('Failed to remove evaluator', 500, 'REMOVE_FAILED')
  }
}
