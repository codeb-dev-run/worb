// =============================================================================
// Payroll API - CVE-CB-005 Fixed: Secure Logging
// =============================================================================

export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth-options'
import { prisma, getReadClient, parallelQueries } from '@/lib/prisma'
import { getOrSet, CacheKeys, CacheTTL, invalidateCache } from '@/lib/redis'
import { secureLogger, createErrorResponse } from '@/lib/security'

// =============================================================================
// Payroll API - Hyperscale Optimized
// Target: <100ms response time with caching + parallel queries
// =============================================================================

// GET: 급여 목록 조회 (관리자: 전체, 일반: 본인) - 캐싱 + 병렬 쿼리 최적화
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const workspaceId = request.headers.get('x-workspace-id')
    if (!workspaceId) {
      return NextResponse.json({ error: 'Workspace ID required' }, { status: 400 })
    }

    const searchParams = request.nextUrl.searchParams
    const year = searchParams.get('year') || new Date().getFullYear().toString()
    const month = searchParams.get('month')
    const employeeId = searchParams.get('employeeId')

    // 권한 확인 (캐시)
    const membershipCacheKey = `membership:${session.user.id}:${workspaceId}`
    const membership = await getOrSet(membershipCacheKey, async () => {
      return prisma.workspaceMember.findFirst({
        where: {
          workspaceId,
          userId: session.user.id
        }
      })
    }, CacheTTL.MEDIUM)

    if (!membership) {
      return NextResponse.json({ error: 'Not a member' }, { status: 403 })
    }

    const isAdmin = membership.role === 'admin'
    const readClient = getReadClient()

    // 기간 필터 설정
    const startOfYear = new Date(`${year}-01-01`)
    const endOfYear = new Date(`${parseInt(year) + 1}-01-01`)

    let periodFilter: any = {
      periodStart: { gte: startOfYear },
      periodEnd: { lt: endOfYear }
    }

    if (month) {
      const startOfMonth = new Date(`${year}-${month.padStart(2, '0')}-01`)
      const endOfMonth = new Date(startOfMonth)
      endOfMonth.setMonth(endOfMonth.getMonth() + 1)
      periodFilter = {
        periodStart: { gte: startOfMonth },
        periodEnd: { lt: endOfMonth }
      }
    }

    if (isAdmin) {
      // 관리자용 캐시 키
      const cacheKey = `${CacheKeys.payroll(workspaceId)}:admin:${year}:${month || 'all'}${employeeId ? `:${employeeId}` : ''}`

      const result = await getOrSet(cacheKey, async () => {
        const whereClause: any = { workspaceId, ...periodFilter }
        if (employeeId) {
          whereClause.employeeId = employeeId
        }

        const payrollRecords = await readClient.payrollRecord.findMany({
          where: whereClause,
          include: {
            employee: {
              select: {
                id: true,
                nameKor: true,
                nameEng: true,
                department: true,
                position: true,
                employeeNumber: true
              }
            }
          },
          orderBy: { periodStart: 'desc' }
        })

        const summary = {
          totalGrossPay: payrollRecords.reduce((sum, r) => sum + r.grossPay, 0),
          totalNetPay: payrollRecords.reduce((sum, r) => sum + r.netPay, 0),
          totalDeduction: payrollRecords.reduce((sum, r) => sum + r.totalDeduction, 0),
          recordCount: payrollRecords.length,
          avgGrossPay: payrollRecords.length > 0
            ? Math.round(payrollRecords.reduce((sum, r) => sum + r.grossPay, 0) / payrollRecords.length)
            : 0
        }

        return {
          payrollRecords: payrollRecords.map(formatPayrollRecord),
          summary
        }
      }, CacheTTL.PAYROLL)

      return NextResponse.json(result)
    } else {
      // 일반 직원용 캐시 키
      const cacheKey = `${CacheKeys.payroll(workspaceId)}:user:${session.user.id}:${year}:${month || 'all'}`

      const result = await getOrSet(cacheKey, async () => {
        // 본인 직원 정보 조회 (캐시)
        const myEmployee = await getOrSet(`employee:user:${session.user.id}:${workspaceId}`, async () => {
          return readClient.employee.findFirst({
            where: {
              workspaceId,
              userId: session.user.id
            }
          })
        }, CacheTTL.EMPLOYEES)

        if (!myEmployee) {
          return { payrollRecords: [], summary: null }
        }

        const payrollRecords = await readClient.payrollRecord.findMany({
          where: {
            workspaceId,
            employeeId: myEmployee.id,
            ...periodFilter
          },
          include: {
            employee: {
              select: {
                id: true,
                nameKor: true,
                nameEng: true,
                department: true,
                position: true,
                employeeNumber: true
              }
            }
          },
          orderBy: { periodStart: 'desc' }
        })

        const summary = {
          totalGrossPay: payrollRecords.reduce((sum, r) => sum + r.grossPay, 0),
          totalNetPay: payrollRecords.reduce((sum, r) => sum + r.netPay, 0),
          totalDeduction: payrollRecords.reduce((sum, r) => sum + r.totalDeduction, 0),
          recordCount: payrollRecords.length,
          avgGrossPay: payrollRecords.length > 0
            ? Math.round(payrollRecords.reduce((sum, r) => sum + r.grossPay, 0) / payrollRecords.length)
            : 0
        }

        return {
          payrollRecords: payrollRecords.map(formatPayrollRecord),
          summary
        }
      }, CacheTTL.PAYROLL)

      return NextResponse.json(result)
    }
  } catch (error) {
    // CVE-CB-005: Secure logging
    secureLogger.error('Failed to fetch payroll records', error as Error, { operation: 'payroll.list' })
    return createErrorResponse('Failed to fetch payroll records', 500, 'FETCH_FAILED')
  }
}

// POST: 급여 레코드 생성 (관리자 전용) - 캐시 무효화 포함
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const workspaceId = request.headers.get('x-workspace-id')
    if (!workspaceId) {
      return NextResponse.json({ error: 'Workspace ID required' }, { status: 400 })
    }

    // 관리자 권한 확인 (캐시)
    const membershipCacheKey = `membership:${session.user.id}:${workspaceId}`
    const membership = await getOrSet(membershipCacheKey, async () => {
      return prisma.workspaceMember.findFirst({
        where: {
          workspaceId,
          userId: session.user.id,
          role: 'admin'
        }
      })
    }, CacheTTL.MEDIUM)

    if (!membership) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    const body = await request.json()
    const {
      employeeId,
      periodStart,
      periodEnd,
      normalHours,
      overtimeHours,
      nightHours,
      holidayHours,
      paidLeaveHours,
      unpaidHours,
      basePay,
      overtimePay,
      nightPay,
      holidayPay,
      weeklyAllowance,
      bonusPay,
      otherAllowance,
      nationalPension,
      healthInsurance,
      longTermCare,
      employmentInsurance,
      incomeTax,
      localTax,
      otherDeduction
    } = body

    // 총 지급액 계산
    const grossPay = (basePay || 0) +
                     (overtimePay || 0) +
                     (nightPay || 0) +
                     (holidayPay || 0) +
                     (weeklyAllowance || 0) +
                     (bonusPay || 0) +
                     (otherAllowance || 0)

    // 총 공제액 계산
    const totalDeduction = (nationalPension || 0) +
                           (healthInsurance || 0) +
                           (longTermCare || 0) +
                           (employmentInsurance || 0) +
                           (incomeTax || 0) +
                           (localTax || 0) +
                           (otherDeduction || 0)

    // 실수령액 계산
    const netPay = grossPay - totalDeduction

    const payrollRecord = await prisma.payrollRecord.create({
      data: {
        workspaceId,
        employeeId,
        periodStart: new Date(periodStart),
        periodEnd: new Date(periodEnd),
        normalHours: normalHours || 0,
        overtimeHours: overtimeHours || 0,
        nightHours: nightHours || 0,
        holidayHours: holidayHours || 0,
        paidLeaveHours: paidLeaveHours || 0,
        unpaidHours: unpaidHours || 0,
        basePay: basePay || 0,
        overtimePay: overtimePay || 0,
        nightPay: nightPay || 0,
        holidayPay: holidayPay || 0,
        weeklyAllowance: weeklyAllowance || 0,
        bonusPay: bonusPay || 0,
        otherAllowance: otherAllowance || 0,
        grossPay,
        nationalPension: nationalPension || 0,
        healthInsurance: healthInsurance || 0,
        longTermCare: longTermCare || 0,
        employmentInsurance: employmentInsurance || 0,
        incomeTax: incomeTax || 0,
        localTax: localTax || 0,
        otherDeduction: otherDeduction || 0,
        totalDeduction,
        netPay,
        status: 'DRAFT'
      },
      include: {
        employee: {
          select: {
            id: true,
            nameKor: true,
            department: true,
            position: true
          }
        }
      }
    })

    // 100K CCU: 캐시 무효화를 비동기로 처리 (응답 지연 방지)
    invalidateCache(CacheKeys.payroll(workspaceId))

    return NextResponse.json(
      { payrollRecord: formatPayrollRecord(payrollRecord) },
      { status: 201 }
    )
  } catch (error) {
    // CVE-CB-005: Secure logging
    secureLogger.error('Failed to create payroll record', error as Error, { operation: 'payroll.create' })
    return createErrorResponse('Failed to create payroll record', 500, 'CREATE_FAILED')
  }
}

function formatPayrollRecord(record: any) {
  return {
    id: record.id,
    employeeId: record.employeeId,
    employee: record.employee,
    period: `${record.periodStart.toISOString().slice(0, 7)}`,
    periodStart: record.periodStart.toISOString().split('T')[0],
    periodEnd: record.periodEnd.toISOString().split('T')[0],
    workHours: {
      normal: record.normalHours,
      overtime: record.overtimeHours,
      night: record.nightHours,
      holiday: record.holidayHours,
      paidLeave: record.paidLeaveHours,
      unpaid: record.unpaidHours,
      total: record.normalHours + record.overtimeHours + record.nightHours + record.holidayHours
    },
    earnings: {
      basePay: record.basePay,
      overtimePay: record.overtimePay,
      nightPay: record.nightPay,
      holidayPay: record.holidayPay,
      weeklyAllowance: record.weeklyAllowance,
      bonusPay: record.bonusPay,
      otherAllowance: record.otherAllowance,
      grossPay: record.grossPay
    },
    deductions: {
      nationalPension: record.nationalPension,
      healthInsurance: record.healthInsurance,
      longTermCare: record.longTermCare,
      employmentInsurance: record.employmentInsurance,
      incomeTax: record.incomeTax,
      localTax: record.localTax,
      otherDeduction: record.otherDeduction,
      totalDeduction: record.totalDeduction
    },
    grossPay: record.grossPay,
    netPay: record.netPay,
    status: record.status,
    createdAt: record.createdAt?.toISOString(),
    paidAt: record.paidAt?.toISOString()
  }
}
