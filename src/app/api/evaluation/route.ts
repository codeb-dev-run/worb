// =============================================================================
// Performance Evaluation API - 성과평가 조회/관리
// GET: 평가 목록 조회 (주간/월간/연간)
// =============================================================================

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { authenticateRequest, secureLogger, createErrorResponse } from '@/lib/security'

// 현재 주차 계산
function getWeekNumber(date: Date): number {
  const startOfYear = new Date(date.getFullYear(), 0, 1)
  const days = Math.floor((date.getTime() - startOfYear.getTime()) / (24 * 60 * 60 * 1000))
  return Math.ceil((days + startOfYear.getDay() + 1) / 7)
}

// 주 시작일 (월요일) 계산
function getWeekStartDate(year: number, weekNumber: number): Date {
  const startOfYear = new Date(year, 0, 1)
  const daysToMonday = (startOfYear.getDay() + 6) % 7
  const firstMonday = new Date(startOfYear.getTime() - daysToMonday * 24 * 60 * 60 * 1000)
  return new Date(firstMonday.getTime() + (weekNumber - 1) * 7 * 24 * 60 * 60 * 1000)
}

export async function GET(request: NextRequest) {
  try {
    const user = await authenticateRequest()
    if (!user) {
      return createErrorResponse('Unauthorized', 401, 'AUTH_REQUIRED')
    }

    const { searchParams } = new URL(request.url)
    const workspaceId = searchParams.get('workspaceId')
    const employeeId = searchParams.get('employeeId')
    const type = searchParams.get('type') || 'weekly' // weekly, monthly, yearly
    const year = parseInt(searchParams.get('year') || new Date().getFullYear().toString())
    const month = searchParams.get('month') ? parseInt(searchParams.get('month')!) : undefined
    const weekNumber = searchParams.get('week') ? parseInt(searchParams.get('week')!) : undefined

    if (!workspaceId) {
      return createErrorResponse('workspaceId is required', 400, 'MISSING_WORKSPACE')
    }

    // 본인 또는 평가권한자인지 확인
    const employee = await prisma.employee.findFirst({
      where: { workspaceId, userId: user.id }
    })

    const isEvaluator = await prisma.evaluator.findFirst({
      where: { workspaceId, userId: user.id, isActive: true }
    })

    // 평가권한자가 아니면 본인 데이터만 조회 가능
    const targetEmployeeId = isEvaluator && employeeId ? employeeId : employee?.id

    if (!targetEmployeeId && !isEvaluator) {
      return createErrorResponse('Employee not found', 404, 'EMPLOYEE_NOT_FOUND')
    }

    if (type === 'weekly') {
      const evaluations = await prisma.weeklyEvaluation.findMany({
        where: {
          workspaceId,
          ...(targetEmployeeId ? { employeeId: targetEmployeeId } : {}),
          year,
          ...(weekNumber ? { weekNumber } : {}),
        },
        include: {
          employee: {
            select: { id: true, nameKor: true, nameEng: true, department: true, position: true }
          },
          evaluator: {
            include: {
              user: { select: { id: true, name: true } }
            }
          },
          employeeFeedback: true,
        },
        orderBy: [{ weekNumber: 'desc' }],
      })

      return NextResponse.json({
        type: 'weekly',
        year,
        evaluations,
        currentWeek: getWeekNumber(new Date()),
        isEvaluator: !!isEvaluator,
      })
    }

    if (type === 'monthly') {
      const summaries = await prisma.monthlyEvaluationSummary.findMany({
        where: {
          workspaceId,
          ...(targetEmployeeId ? { employeeId: targetEmployeeId } : {}),
          year,
          ...(month ? { month } : {}),
        },
        include: {
          employee: {
            select: { id: true, nameKor: true, nameEng: true, department: true, position: true }
          },
        },
        orderBy: [{ month: 'desc' }],
      })

      return NextResponse.json({
        type: 'monthly',
        year,
        summaries,
        isEvaluator: !!isEvaluator,
      })
    }

    if (type === 'yearly') {
      const summaries = await prisma.yearlyEvaluationSummary.findMany({
        where: {
          workspaceId,
          ...(targetEmployeeId ? { employeeId: targetEmployeeId } : {}),
          year,
        },
        include: {
          employee: {
            select: { id: true, nameKor: true, nameEng: true, department: true, position: true }
          },
        },
      })

      return NextResponse.json({
        type: 'yearly',
        year,
        summaries,
        isEvaluator: !!isEvaluator,
      })
    }

    return createErrorResponse('Invalid type', 400, 'INVALID_TYPE')
  } catch (error) {
    secureLogger.error('Failed to fetch evaluations', error as Error, { operation: 'evaluation.list' })
    return createErrorResponse('Failed to fetch evaluations', 500, 'FETCH_FAILED')
  }
}
