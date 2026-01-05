// =============================================================================
// Weekly Evaluation API - CEO 주간 평가 입력
// POST: 주간 평가 생성/수정
// =============================================================================

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { authenticateRequest, secureLogger, createErrorResponse } from '@/lib/security'
import { z } from 'zod'

// 주 시작일 (월요일) 계산
function getWeekStartDate(year: number, weekNumber: number): Date {
  const jan1 = new Date(year, 0, 1)
  const daysToMonday = (jan1.getDay() + 6) % 7
  const firstMonday = new Date(jan1.getTime() - daysToMonday * 24 * 60 * 60 * 1000)
  return new Date(firstMonday.getTime() + (weekNumber - 1) * 7 * 24 * 60 * 60 * 1000)
}

// 주 종료일 (일요일) 계산
function getWeekEndDate(weekStartDate: Date): Date {
  return new Date(weekStartDate.getTime() + 6 * 24 * 60 * 60 * 1000)
}

// 현재 주차 계산
function getWeekNumber(date: Date): number {
  const startOfYear = new Date(date.getFullYear(), 0, 1)
  const days = Math.floor((date.getTime() - startOfYear.getTime()) / (24 * 60 * 60 * 1000))
  return Math.ceil((days + startOfYear.getDay() + 1) / 7)
}

const weeklyEvaluationSchema = z.object({
  workspaceId: z.string().uuid(),
  employeeId: z.string().uuid(),
  year: z.number().int().min(2020).max(2100),
  weekNumber: z.number().int().min(1).max(53),
  projectQuality: z.number().int().min(0).max(20),
  deadlineAdherence: z.number().int().min(0).max(20),
  presentation: z.number().int().min(0).max(20),
  collaboration: z.number().int().min(0).max(20),
  selfInitiative: z.number().int().min(0).max(20),
  feedback: z.string().max(2000).optional(),
})

export async function POST(request: NextRequest) {
  try {
    const user = await authenticateRequest()
    if (!user) {
      return createErrorResponse('Unauthorized', 401, 'AUTH_REQUIRED')
    }

    const body = await request.json()
    const validation = weeklyEvaluationSchema.safeParse(body)
    if (!validation.success) {
      return createErrorResponse('Validation failed', 400, 'VALIDATION_ERROR')
    }

    const data = validation.data

    // 평가 권한 확인
    const evaluator = await prisma.evaluator.findFirst({
      where: {
        workspaceId: data.workspaceId,
        userId: user.id,
        isActive: true,
      },
    })

    if (!evaluator) {
      return createErrorResponse('Not authorized to evaluate', 403, 'NOT_EVALUATOR')
    }

    // 대상 직원 확인
    const employee = await prisma.employee.findUnique({
      where: { id: data.employeeId },
    })

    if (!employee || employee.workspaceId !== data.workspaceId) {
      return createErrorResponse('Employee not found', 404, 'EMPLOYEE_NOT_FOUND')
    }

    // 총점 계산
    const totalScore = data.projectQuality + data.deadlineAdherence +
                       data.presentation + data.collaboration + data.selfInitiative

    const weekStartDate = getWeekStartDate(data.year, data.weekNumber)
    const weekEndDate = getWeekEndDate(weekStartDate)

    // 기존 평가 확인 (upsert)
    const evaluation = await prisma.weeklyEvaluation.upsert({
      where: {
        workspaceId_employeeId_year_weekNumber: {
          workspaceId: data.workspaceId,
          employeeId: data.employeeId,
          year: data.year,
          weekNumber: data.weekNumber,
        },
      },
      update: {
        projectQuality: data.projectQuality,
        deadlineAdherence: data.deadlineAdherence,
        presentation: data.presentation,
        collaboration: data.collaboration,
        selfInitiative: data.selfInitiative,
        totalScore,
        feedback: data.feedback,
        isSubmitted: true,
        isDefault: false,
        submittedAt: new Date(),
      },
      create: {
        workspaceId: data.workspaceId,
        employeeId: data.employeeId,
        evaluatorId: evaluator.id,
        year: data.year,
        weekNumber: data.weekNumber,
        weekStartDate,
        weekEndDate,
        projectQuality: data.projectQuality,
        deadlineAdherence: data.deadlineAdherence,
        presentation: data.presentation,
        collaboration: data.collaboration,
        selfInitiative: data.selfInitiative,
        totalScore,
        feedback: data.feedback,
        isSubmitted: true,
        submittedAt: new Date(),
      },
      include: {
        employee: {
          select: { id: true, nameKor: true, department: true }
        },
      },
    })

    // 월간 요약 업데이트
    await updateMonthlySummary(data.workspaceId, data.employeeId, data.year, weekStartDate.getMonth() + 1)

    secureLogger.info('Weekly evaluation submitted', {
      operation: 'evaluation.weekly.submit',
      workspaceId: data.workspaceId,
      employeeId: data.employeeId,
      evaluatorId: evaluator.id,
      weekNumber: data.weekNumber,
      totalScore,
    })

    return NextResponse.json(evaluation, { status: 201 })
  } catch (error) {
    secureLogger.error('Failed to submit evaluation', error as Error, { operation: 'evaluation.weekly.submit' })
    return createErrorResponse('Failed to submit evaluation', 500, 'SUBMIT_FAILED')
  }
}

// 월간 요약 업데이트 함수
async function updateMonthlySummary(
  workspaceId: string,
  employeeId: string,
  year: number,
  month: number
) {
  // 해당 월의 주간 평가들 조회
  const monthStart = new Date(year, month - 1, 1)
  const monthEnd = new Date(year, month, 0)

  const weeklyEvaluations = await prisma.weeklyEvaluation.findMany({
    where: {
      workspaceId,
      employeeId,
      weekStartDate: { gte: monthStart },
      weekEndDate: { lte: monthEnd },
      isSubmitted: true,
    },
  })

  if (weeklyEvaluations.length === 0) return

  // 평균 계산
  const weekCount = weeklyEvaluations.length
  const totalScore = weeklyEvaluations.reduce((sum, e) => sum + e.totalScore, 0)
  const averageScore = Math.round(totalScore / weekCount)

  const avgProjectQuality = weeklyEvaluations.reduce((sum, e) => sum + e.projectQuality, 0) / weekCount
  const avgDeadlineAdherence = weeklyEvaluations.reduce((sum, e) => sum + e.deadlineAdherence, 0) / weekCount
  const avgPresentation = weeklyEvaluations.reduce((sum, e) => sum + e.presentation, 0) / weekCount
  const avgCollaboration = weeklyEvaluations.reduce((sum, e) => sum + e.collaboration, 0) / weekCount
  const avgSelfInitiative = weeklyEvaluations.reduce((sum, e) => sum + e.selfInitiative, 0) / weekCount

  // 유연근무 등급 결정
  let flexWorkTier: 'FULL_FLEX' | 'HIGH_FLEX' | 'MID_FLEX' | 'STANDARD'
  if (averageScore >= 85) flexWorkTier = 'FULL_FLEX'
  else if (averageScore >= 80) flexWorkTier = 'HIGH_FLEX'
  else if (averageScore >= 75) flexWorkTier = 'MID_FLEX'
  else flexWorkTier = 'STANDARD'

  await prisma.monthlyEvaluationSummary.upsert({
    where: {
      workspaceId_employeeId_year_month: {
        workspaceId,
        employeeId,
        year,
        month,
      },
    },
    update: {
      weekCount,
      totalScore,
      averageScore,
      avgProjectQuality,
      avgDeadlineAdherence,
      avgPresentation,
      avgCollaboration,
      avgSelfInitiative,
      flexWorkTier,
      calculatedAt: new Date(),
    },
    create: {
      workspaceId,
      employeeId,
      year,
      month,
      weekCount,
      totalScore,
      averageScore,
      avgProjectQuality,
      avgDeadlineAdherence,
      avgPresentation,
      avgCollaboration,
      avgSelfInitiative,
      flexWorkTier,
    },
  })

  // 연간 요약도 업데이트
  await updateYearlySummary(workspaceId, employeeId, year)
}

// 연간 요약 업데이트 함수
async function updateYearlySummary(workspaceId: string, employeeId: string, year: number) {
  const monthlySummaries = await prisma.monthlyEvaluationSummary.findMany({
    where: { workspaceId, employeeId, year },
    orderBy: { month: 'asc' },
  })

  if (monthlySummaries.length === 0) return

  const monthlyScores = Array(12).fill(0)
  monthlySummaries.forEach(s => {
    monthlyScores[s.month - 1] = s.averageScore
  })

  const validScores = monthlySummaries.map(s => s.averageScore)
  const averageScore = validScores.reduce((a, b) => a + b, 0) / validScores.length

  // 최고/최저 점수 월
  let highestMonth = monthlySummaries[0]?.month
  let lowestMonth = monthlySummaries[0]?.month
  let highest = monthlySummaries[0]?.averageScore || 0
  let lowest = monthlySummaries[0]?.averageScore || 100

  monthlySummaries.forEach(s => {
    if (s.averageScore > highest) {
      highest = s.averageScore
      highestMonth = s.month
    }
    if (s.averageScore < lowest) {
      lowest = s.averageScore
      lowestMonth = s.month
    }
  })

  // 분기별 평균
  const q1 = monthlySummaries.filter(s => s.month >= 1 && s.month <= 3)
  const q2 = monthlySummaries.filter(s => s.month >= 4 && s.month <= 6)
  const q3 = monthlySummaries.filter(s => s.month >= 7 && s.month <= 9)
  const q4 = monthlySummaries.filter(s => s.month >= 10 && s.month <= 12)

  const calcAvg = (arr: typeof monthlySummaries) =>
    arr.length > 0 ? arr.reduce((sum, s) => sum + s.averageScore, 0) / arr.length : 0

  const q1Average = calcAvg(q1)
  const q2Average = calcAvg(q2)
  const q3Average = calcAvg(q3)
  const q4Average = calcAvg(q4)

  // 연봉 인상 제안 (3개월 롤링 최고치)
  let suggestedRaisePercent = 0
  const rollingAverages = [q1Average, q2Average, q3Average, q4Average].filter(v => v > 0)
  if (rollingAverages.length > 0) {
    const maxRolling = Math.max(...rollingAverages)
    if (maxRolling >= 88) suggestedRaisePercent = 10
    else if (maxRolling >= 83) suggestedRaisePercent = 7
  }

  await prisma.yearlyEvaluationSummary.upsert({
    where: {
      workspaceId_employeeId_year: { workspaceId, employeeId, year },
    },
    update: {
      monthlyScores,
      averageScore,
      highestMonth,
      lowestMonth,
      q1Average,
      q2Average,
      q3Average,
      q4Average,
      suggestedRaisePercent,
      calculatedAt: new Date(),
    },
    create: {
      workspaceId,
      employeeId,
      year,
      monthlyScores,
      averageScore,
      highestMonth,
      lowestMonth,
      q1Average,
      q2Average,
      q3Average,
      q4Average,
      suggestedRaisePercent,
    },
  })
}
