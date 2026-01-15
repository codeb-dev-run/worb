// =============================================================================
// Team Attendance API - 팀원 근태 현황 조회 (관리자용)
// v2: 입사일, 휴가잔여일, 주간성과점수 포함
// =============================================================================

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { authenticateRequest, createErrorResponse } from '@/lib/security'
import { startOfDay, endOfDay, startOfWeek, endOfWeek } from 'date-fns'

export async function GET(request: NextRequest) {
  try {
    const user = await authenticateRequest()
    if (!user) {
      return createErrorResponse('Unauthorized', 401, 'AUTH_REQUIRED')
    }

    const { searchParams } = new URL(request.url)
    const workspaceId = searchParams.get('workspaceId')

    if (!workspaceId) {
      return createErrorResponse('workspaceId is required', 400, 'MISSING_PARAM')
    }

    // 관리자 권한 확인
    const membership = await prisma.workspaceMember.findUnique({
      where: {
        workspaceId_userId: {
          workspaceId,
          userId: user.id
        }
      }
    })

    if (!membership || !['admin', 'owner', 'hr'].includes(membership.role)) {
      return createErrorResponse('Admin access required', 403, 'FORBIDDEN')
    }

    // 워크스페이스의 모든 멤버 조회
    const members = await prisma.workspaceMember.findMany({
      where: { workspaceId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            avatar: true
          }
        }
      }
    })

    // 오늘의 출근 기록 조회
    const today = new Date()
    const todayStart = startOfDay(today)
    const todayEnd = endOfDay(today)

    const attendances = await prisma.attendance.findMany({
      where: {
        workspaceId,
        date: {
          gte: todayStart,
          lte: todayEnd
        }
      }
    })

    // 오늘 휴가 중인 사람 조회 (employee의 userId로 매핑)
    const leaveRequests = await prisma.leaveRequest.findMany({
      where: {
        workspaceId,
        status: 'APPROVED',
        startDate: { lte: today },
        endDate: { gte: today }
      },
      include: {
        employee: {
          select: { userId: true }
        }
      }
    })

    const leaveUserIds = new Set(leaveRequests.map(l => l.employee.userId).filter(Boolean))

    // Employee 정보 조회 (입사일, 부서, 직책 등)
    const employees = await prisma.employee.findMany({
      where: {
        workspaceId,
        userId: { in: members.map(m => m.userId) }
      }
    })
    const employeeMap = new Map(employees.map(e => [e.userId, e]))

    // 휴가 잔여일 조회
    const leaveBalances = await prisma.leaveBalance.findMany({
      where: {
        workspaceId,
        year: today.getFullYear(),
        employeeId: { in: employees.map(e => e.id) }
      }
    })
    const leaveBalanceMap = new Map(leaveBalances.map(lb => [lb.employeeId, lb]))

    // 이번 주 성과 평가 조회
    const weekStart = startOfWeek(today, { weekStartsOn: 1 }) // 월요일 시작
    const weekEnd = endOfWeek(today, { weekStartsOn: 1 })

    const weeklyEvaluations = await prisma.weeklyEvaluation.findMany({
      where: {
        workspaceId,
        weekStartDate: {
          gte: weekStart,
          lte: weekEnd
        }
      }
    })
    const evaluationMap = new Map(weeklyEvaluations.map(we => [we.employeeId, we]))

    // 멤버별 근태 상태 계산
    const memberAttendance = members.map(member => {
      const attendance = attendances.find(a => a.userId === member.userId)
      const isOnLeave = leaveUserIds.has(member.userId)
      const employee = employeeMap.get(member.userId)
      const leaveBalance = employee ? leaveBalanceMap.get(employee.id) : null
      const weeklyEval = employee ? evaluationMap.get(employee.id) : null

      let todayStatus: 'present' | 'absent' | 'leave' | 'late' | 'remote' = 'absent'

      if (isOnLeave) {
        todayStatus = 'leave'
      } else if (attendance) {
        // remoteWorkedMinutes가 있으면 재택 근무로 판단
        if (attendance.remoteWorkedMinutes > 0 && attendance.officeWorkedMinutes === 0) {
          todayStatus = 'remote'
        } else if (attendance.status === 'LATE') {
          todayStatus = 'late'
        } else {
          todayStatus = 'present'
        }
      }

      // 휴가 잔여일 계산
      const annualTotal = leaveBalance?.annualTotal || 15
      const annualUsed = leaveBalance?.annualUsed || 0
      const remainingLeave = annualTotal - annualUsed

      return {
        id: member.userId,
        name: member.user.name || member.user.email?.split('@')[0] || 'Unknown',
        email: member.user.email,
        avatar: member.user.avatar,
        department: employee?.department || (member.role === 'admin' ? '관리자' : '팀원'),
        position: employee?.position || member.role,
        hireDate: employee?.hireDate?.toISOString() || null,
        employeeNumber: employee?.employeeNumber || null,
        todayStatus,
        checkIn: attendance?.checkIn?.toISOString() || null,
        checkOut: attendance?.checkOut?.toISOString() || null,
        workLocation: (attendance?.remoteWorkedMinutes ?? 0) > 0 ? 'REMOTE' : 'OFFICE',
        // 추가 정보
        remainingLeave,
        annualTotal,
        annualUsed,
        weeklyScore: weeklyEval?.totalScore || null,
        weeklyFlexTier: null // MonthlyEvaluationSummary에서 계산됨
      }
    })

    // 통계 계산
    const stats = {
      total: memberAttendance.length,
      present: memberAttendance.filter(m => m.todayStatus === 'present').length,
      remote: memberAttendance.filter(m => m.todayStatus === 'remote').length,
      leave: memberAttendance.filter(m => m.todayStatus === 'leave').length,
      late: memberAttendance.filter(m => m.todayStatus === 'late').length,
      absent: memberAttendance.filter(m => m.todayStatus === 'absent').length
    }

    return NextResponse.json({
      members: memberAttendance,
      stats
    })
  } catch (error) {
    console.error('Failed to fetch team attendance:', error)
    return createErrorResponse('Failed to fetch team attendance', 500, 'FETCH_FAILED')
  }
}
