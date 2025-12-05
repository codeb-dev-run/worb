// =============================================================================
// Employee Payroll API - CVE-CB-005 Fixed: Secure Logging
// =============================================================================

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth-options'
import { prisma } from '@/lib/prisma'
import { secureLogger, createErrorResponse } from '@/lib/security'

// GET: 특정 직원의 급여 정보 조회
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ employeeId: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { employeeId } = await params
    const workspaceId = request.headers.get('x-workspace-id')
    if (!workspaceId) {
      return NextResponse.json({ error: 'Workspace ID required' }, { status: 400 })
    }

    // 권한 확인
    const membership = await prisma.workspaceMember.findFirst({
      where: {
        workspaceId,
        userId: session.user.id
      }
    })

    if (!membership) {
      return NextResponse.json({ error: 'Not a member' }, { status: 403 })
    }

    // 직원 정보 조회
    const employee = await prisma.employee.findFirst({
      where: { id: employeeId, workspaceId }
    })

    if (!employee) {
      return NextResponse.json({ error: 'Employee not found' }, { status: 404 })
    }

    const isAdmin = membership.role === 'admin'
    const isSelf = employee.userId === session.user.id

    // 본인이 아니고 관리자도 아닌 경우
    if (!isAdmin && !isSelf) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    const searchParams = request.nextUrl.searchParams
    const year = searchParams.get('year') || new Date().getFullYear().toString()
    const limit = parseInt(searchParams.get('limit') || '12')

    // 급여 레코드 조회
    const startOfYear = new Date(`${year}-01-01`)
    const endOfYear = new Date(`${parseInt(year) + 1}-01-01`)

    const payrollRecords = await prisma.payrollRecord.findMany({
      where: {
        employeeId,
        workspaceId,
        periodStart: { gte: startOfYear },
        periodEnd: { lt: endOfYear }
      },
      orderBy: { periodStart: 'desc' },
      take: limit
    })

    // 급여 프로필 정보 구성
    const payrollInfo = {
      payrollType: employee.payrollType,
      baseSalaryMonthly: employee.baseSalaryMonthly,
      hourlyWage: employee.hourlyWage,
      contractType: employee.employmentType === 'FULL_TIME' ? '정규직' :
                    employee.employmentType === 'PART_TIME' ? '파트타임' :
                    employee.employmentType === 'CONTRACT' ? '계약직' : '인턴',
      workingHoursPerWeek: 40,
      allowances: [
        { name: '식대', amount: 150000, type: 'fixed' as const },
        { name: '교통비', amount: 100000, type: 'fixed' as const }
      ],
      deductions: [
        { name: '국민연금', amount: 4.5, type: 'rate' as const },
        { name: '건강보험', amount: 3.545, type: 'rate' as const },
        { name: '고용보험', amount: 0.9, type: 'rate' as const },
        { name: '소득세', amount: 0, type: 'fixed' as const }
      ],
      payslips: payrollRecords.map(record => ({
        id: record.id,
        period: record.periodStart.toISOString().slice(0, 7),
        periodStart: record.periodStart,
        periodEnd: record.periodEnd,
        basePay: record.basePay,
        grossPay: record.grossPay,
        totalDeduction: record.totalDeduction,
        netPay: record.netPay,
        status: record.status.toLowerCase() as 'draft' | 'confirmed' | 'paid'
      }))
    }

    // 연간 통계
    const yearlyStats = {
      totalGrossPay: payrollRecords.reduce((sum, r) => sum + r.grossPay, 0),
      totalNetPay: payrollRecords.reduce((sum, r) => sum + r.netPay, 0),
      totalDeduction: payrollRecords.reduce((sum, r) => sum + r.totalDeduction, 0),
      avgMonthlyPay: payrollRecords.length > 0
        ? Math.round(payrollRecords.reduce((sum, r) => sum + r.netPay, 0) / payrollRecords.length)
        : 0,
      recordCount: payrollRecords.length
    }

    return NextResponse.json({
      employee: {
        id: employee.id,
        nameKor: employee.nameKor,
        department: employee.department,
        position: employee.position,
        employeeNumber: employee.employeeNumber
      },
      payrollInfo,
      yearlyStats
    })
  } catch (error) {
    // CVE-CB-005: Secure logging
    secureLogger.error('Failed to fetch employee payroll', error as Error, { operation: 'payroll.employee.get' })
    return createErrorResponse('Failed to fetch employee payroll', 500, 'FETCH_FAILED')
  }
}

// PUT: 급여 레코드 수정 (관리자 전용)
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ employeeId: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { employeeId } = await params
    const workspaceId = request.headers.get('x-workspace-id')
    if (!workspaceId) {
      return NextResponse.json({ error: 'Workspace ID required' }, { status: 400 })
    }

    // 관리자 권한 확인
    const membership = await prisma.workspaceMember.findFirst({
      where: {
        workspaceId,
        userId: session.user.id,
        role: 'admin'
      }
    })

    if (!membership) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    const body = await request.json()
    const { payrollType, baseSalaryMonthly, hourlyWage, bankName, bankAccount } = body

    // 직원 급여 정보 업데이트
    const employee = await prisma.employee.update({
      where: { id: employeeId },
      data: {
        payrollType,
        baseSalaryMonthly,
        hourlyWage,
        bankName,
        bankAccount
      }
    })

    return NextResponse.json({
      success: true,
      employee: {
        id: employee.id,
        payrollType: employee.payrollType,
        baseSalaryMonthly: employee.baseSalaryMonthly,
        hourlyWage: employee.hourlyWage
      }
    })
  } catch (error) {
    // CVE-CB-005: Secure logging
    secureLogger.error('Failed to update employee payroll', error as Error, { operation: 'payroll.employee.update' })
    return createErrorResponse('Failed to update employee payroll', 500, 'UPDATE_FAILED')
  }
}
