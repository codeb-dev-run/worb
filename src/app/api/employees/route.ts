// =============================================================================
// Employees API - CVE Fixes Applied
// CVE-CB-005: Secure Logging
// CVE-CB-009: Input Validation with Zod
// =============================================================================

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-options'
import { prisma, getReadClient } from '@/lib/prisma'
import { getOrSet, CacheKeys, CacheTTL, invalidateCache } from '@/lib/redis'
import { secureLogger, createErrorResponse } from '@/lib/security'
import { validateBody, employeeCreateSchema, validationErrorResponse } from '@/lib/validation'

// =============================================================================
// Employees API - Hyperscale Optimized
// Target: <100ms response time with caching
// =============================================================================

// GET: 워크스페이스의 전체 직원 목록 조회 - 캐싱 최적화
// WorkspaceMember 중 Employee가 없는 멤버는 자동으로 Employee 레코드 생성
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
      return NextResponse.json({ error: 'Not a member of this workspace' }, { status: 403 })
    }

    const isAdmin = membership.role === 'admin'
    const readClient = getReadClient()

    // 캐시 키 (관리자와 일반 사용자 구분)
    const cacheKey = `${CacheKeys.employees(workspaceId)}:${isAdmin ? 'admin' : 'user'}`

    // 기존 캐시가 빈 배열인 경우 무효화 (마이그레이션 대응)
    await invalidateEmptyCache(workspaceId, cacheKey)

    // WorkspaceMember 중 Employee가 없는 멤버 자동 생성 (최초 조회 시)
    // 생성된 경우 true 반환하여 캐시 우회
    const employeesCreated = await ensureEmployeesForWorkspaceMembers(workspaceId)

    // Employee가 새로 생성된 경우 캐시 우회하고 직접 조회
    const fetchEmployees = async () => {
      const employees = await readClient.employee.findMany({
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
        },
        orderBy: { createdAt: 'desc' }
      })

      // 관리자가 아닌 경우 민감 정보 제외
      const sanitizedEmployees = employees.map(emp => ({
        id: emp.id,
        userId: emp.userId,
        nameKor: emp.nameKor,
        nameEng: emp.nameEng,
        email: emp.email,
        employeeNumber: emp.employeeNumber,
        department: emp.department,
        position: emp.position,
        jobTitle: emp.jobTitle,
        employmentType: emp.employmentType,
        status: emp.status,
        hireDate: emp.hireDate,
        profileImage: emp.user?.avatar || emp.profileImage,
        // 관리자만 볼 수 있는 정보
        ...(isAdmin ? {
          mobile: emp.mobile,
          bankName: emp.bankName,
          bankAccount: emp.bankAccount,
          baseSalaryMonthly: emp.baseSalaryMonthly,
          hourlyWage: emp.hourlyWage,
          payrollType: emp.payrollType
        } : {})
      }))

      return { employees: sanitizedEmployees }
    }

    // 새 Employee 생성된 경우 캐시 우회
    const result = employeesCreated
      ? await fetchEmployees()
      : await getOrSet(cacheKey, fetchEmployees, CacheTTL.EMPLOYEES)

    return NextResponse.json(result)
  } catch (error) {
    // CVE-CB-005: Secure logging
    secureLogger.error('Failed to fetch employees', error as Error, { operation: 'employees.list' })
    return createErrorResponse('Failed to fetch employees', 500, 'FETCH_FAILED')
  }
}

// 빈 배열 캐시 무효화 (마이그레이션 대응)
// 기존에 Employee가 없어서 빈 배열이 캐시된 경우 무효화
async function invalidateEmptyCache(workspaceId: string, cacheKey: string): Promise<void> {
  try {
    // Employee가 DB에 존재하는지 확인
    const employeeCount = await prisma.employee.count({
      where: { workspaceId }
    })

    // Employee가 있는데 캐시가 빈 배열일 수 있으므로 무효화
    if (employeeCount > 0) {
      await invalidateCache(cacheKey)
      // admin/user 둘 다 무효화
      await invalidateCache(`${CacheKeys.employees(workspaceId)}:admin`)
      await invalidateCache(`${CacheKeys.employees(workspaceId)}:user`)
    }
  } catch {
    // Silent fail
  }
}

// WorkspaceMember 중 Employee가 없는 멤버에 대해 Employee 레코드 자동 생성
// 생성된 경우 true 반환 (캐시 우회용)
async function ensureEmployeesForWorkspaceMembers(workspaceId: string): Promise<boolean> {
  try {
    // 1. 워크스페이스의 모든 멤버 조회
    const workspaceMembers = await prisma.workspaceMember.findMany({
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

    // 2. 이미 Employee가 있는 userId 목록 조회
    const existingEmployees = await prisma.employee.findMany({
      where: { workspaceId },
      select: { userId: true }
    })
    const existingUserIds = new Set(existingEmployees.map(e => e.userId).filter(Boolean))

    // 3. Employee가 없는 멤버 필터링
    const membersWithoutEmployee = workspaceMembers.filter(
      wm => wm.user && !existingUserIds.has(wm.user.id)
    )

    if (membersWithoutEmployee.length === 0) {
      return false // 생성할 Employee 없음
    }

    // 4. Employee 레코드 일괄 생성
    const employeesToCreate = membersWithoutEmployee.map(wm => ({
      workspaceId,
      userId: wm.user.id,
      nameKor: wm.user.name || wm.user.email.split('@')[0],
      email: wm.user.email,
      profileImage: wm.user.avatar,
      status: 'ACTIVE' as const,
      employmentType: 'FULL_TIME' as const,
      payrollType: 'MONTHLY' as const
    }))

    await prisma.employee.createMany({
      data: employeesToCreate,
      skipDuplicates: true
    })

    // 5. 캐시 무효화 (새 Employee 생성됨)
    await invalidateCache(CacheKeys.employees(workspaceId))
    await invalidateCache(CacheKeys.hrStats(workspaceId))

    secureLogger.info('Auto-created employees for workspace members', {
      operation: 'employees.autoCreate',
      workspaceId,
      count: membersWithoutEmployee.length
    })

    return true // Employee 생성됨
  } catch (error) {
    // 자동 생성 실패해도 기존 조회는 계속 진행
    secureLogger.error('Failed to auto-create employees', error as Error, {
      operation: 'employees.autoCreate',
      workspaceId
    })
    return false
  }
}

// POST: 새 직원 생성 (관리자/HR 전용) - 캐시 무효화 포함
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

    // CVE-CB-009 Fix: Validate request body with Zod schema
    const validation = await validateBody(request, employeeCreateSchema)
    if (!validation.success) {
      return validationErrorResponse(validation.errors!)
    }

    const {
      userId,
      nameKor,
      nameEng,
      email,
      mobile,
      employeeNumber,
      department,
      position,
      jobTitle,
      hireDate,
      employmentType,
      payrollType,
      baseSalaryMonthly,
      hourlyWage,
      bankName,
      bankAccount
    } = validation.data!

    // 이메일 중복 확인
    const existingEmployee = await prisma.employee.findFirst({
      where: { workspaceId, email }
    })

    if (existingEmployee) {
      return NextResponse.json(
        { error: 'Employee with this email already exists' },
        { status: 400 }
      )
    }

    const employee = await prisma.employee.create({
      data: {
        workspaceId,
        userId,
        nameKor,
        nameEng,
        email,
        mobile,
        employeeNumber,
        department,
        position,
        jobTitle,
        hireDate: hireDate ? new Date(hireDate) : null,
        employmentType: employmentType || 'FULL_TIME',
        payrollType: payrollType || 'MONTHLY',
        baseSalaryMonthly,
        hourlyWage,
        bankName,
        bankAccount,
        status: 'ONBOARDING'
      }
    })

    // 온보딩 레코드 생성
    await prisma.employeeOnboarding.create({
      data: {
        employeeId: employee.id,
        status: 'NOT_STARTED'
      }
    })

    // 직원 목록 캐시 무효화
    await invalidateCache(CacheKeys.employees(workspaceId))
    // HR 통계 캐시도 무효화
    await invalidateCache(CacheKeys.hrStats(workspaceId))

    return NextResponse.json({ employee }, { status: 201 })
  } catch (error) {
    // CVE-CB-005: Secure logging
    secureLogger.error('Failed to create employee', error as Error, { operation: 'employees.create' })
    return createErrorResponse('Failed to create employee', 500, 'CREATE_FAILED')
  }
}
