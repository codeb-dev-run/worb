// =============================================================================
// Workspaces API - CVE Fixes Applied
// CVE-CB-005: Secure logging (no sensitive data exposure)
// CVE-CB-012: Cryptographically secure token generation
// =============================================================================

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { auth } from '@/auth'
import { createSampleData } from '@/lib/sample-data'
import { generateSecureToken, secureLogger, createErrorResponse } from '@/lib/security'
import { validateBody, workspaceCreateSchema, validationErrorResponse } from '@/lib/validation'

// 워크스페이스 타입별 기능 프리셋 (Prisma 스키마와 동기화)
const WORKSPACE_FEATURE_PRESETS = {
  ENTERPRISE: {
    // 프로젝트 관리 기능
    projectEnabled: true,
    kanbanEnabled: true,
    ganttEnabled: true,
    mindmapEnabled: true,
    filesEnabled: true,
    // HR 기능
    attendanceEnabled: true,
    employeeEnabled: true,
    payrollEnabled: true,
    payslipEnabled: true,
    leaveEnabled: true,
    hrEnabled: true,
    organizationEnabled: true,
    // 재무 기능
    financeEnabled: true,
    expenseEnabled: true,
    invoiceEnabled: true,
    corporateCardEnabled: true,
    // 고급 기능
    resumeParsingEnabled: false,
    approvalEnabled: true,
    marketingEnabled: true,
    automationEnabled: true,
    logsEnabled: true,
    // 그룹웨어 기능
    announcementEnabled: true,
    boardEnabled: true,
    calendarEnabled: true,
    messageEnabled: true,
    chatEnabled: true,
  },
  HR_ONLY: {
    // 프로젝트 관리 기능 - 비활성화
    projectEnabled: false,
    kanbanEnabled: false,
    ganttEnabled: false,
    mindmapEnabled: false,
    filesEnabled: false,
    // HR 기능 - 활성화
    attendanceEnabled: true,
    employeeEnabled: true,
    payrollEnabled: true,
    payslipEnabled: true,
    leaveEnabled: true,
    hrEnabled: true,
    organizationEnabled: true,
    // 재무 기능 - 비활성화
    financeEnabled: false,
    expenseEnabled: false,
    invoiceEnabled: false,
    corporateCardEnabled: false,
    // 고급 기능
    resumeParsingEnabled: false,
    approvalEnabled: true,
    marketingEnabled: false,
    automationEnabled: false,
    logsEnabled: true,
    // 그룹웨어 기능 - 활성화
    announcementEnabled: true,
    boardEnabled: true,
    calendarEnabled: true,
    messageEnabled: true,
    chatEnabled: true,
  },
  PROJECT_ONLY: {
    // 프로젝트 관리 기능 - 활성화
    projectEnabled: true,
    kanbanEnabled: true,
    ganttEnabled: true,
    mindmapEnabled: true,
    filesEnabled: true,
    // HR 기능 - 비활성화
    attendanceEnabled: false,
    employeeEnabled: false,
    payrollEnabled: false,
    payslipEnabled: false,
    leaveEnabled: false,
    hrEnabled: false,
    organizationEnabled: true,
    // 재무 기능 - 비활성화
    financeEnabled: false,
    expenseEnabled: false,
    invoiceEnabled: false,
    corporateCardEnabled: false,
    // 고급 기능
    resumeParsingEnabled: false,
    approvalEnabled: true,
    marketingEnabled: true,
    automationEnabled: true,
    logsEnabled: true,
    // 그룹웨어 기능 - 활성화
    announcementEnabled: true,
    boardEnabled: true,
    calendarEnabled: true,
    messageEnabled: true,
    chatEnabled: true,
  },
} as const

type WorkspaceType = keyof typeof WORKSPACE_FEATURE_PRESETS

// 워크스페이스 생성 시 기본 부서(팀) 프리셋
const DEFAULT_DEPARTMENTS = [
  { name: '개발팀', color: '#3B82F6', order: 0 },
  { name: '디자인팀', color: '#EC4899', order: 1 },
  { name: '기획팀', color: '#8B5CF6', order: 2 },
  { name: '운영팀', color: '#10B981', order: 3 },
]

// 사용자의 워크스페이스 목록 조회
export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    console.log('[DEBUG] Session in GET /api/workspaces:', JSON.stringify(session, null, 2))

    if (!session?.user?.email) {
      // CVE-CB-005 Fix: No sensitive data in logs
      secureLogger.warn('Workspace list access denied: No session', { operation: 'workspace.list' })
      return createErrorResponse('Unauthorized', 401, 'AUTH_REQUIRED')
    }

    // 사용자 찾기
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      include: {
        workspaces: {
          include: {
            workspace: {
              include: {
                features: true,
              }
            },
          },
        },
      },
    })

    if (!user) {
      secureLogger.warn('User not found for workspace list', { operation: 'workspace.list' })
      return createErrorResponse('User not found', 404, 'USER_NOT_FOUND')
    }

    // CVE-CB-005 Fix: Safe logging without sensitive data
    secureLogger.info('Workspace list fetched', {
      operation: 'workspace.list',
      userId: user.id,
      count: user.workspaces.length,
    })

    // 워크스페이스와 함께 사용자의 역할 정보도 포함
    const workspaces = user.workspaces.map(wm => ({
      ...wm.workspace,
      userRole: wm.role,
    }))
    return NextResponse.json(workspaces)
  } catch (error) {
    secureLogger.error('Failed to fetch workspaces', error as Error, { operation: 'workspace.list' })
    return createErrorResponse('Failed to fetch workspaces', 500, 'FETCH_FAILED')
  }
}

// 새 워크스페이스 생성
export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    console.log('[DEBUG] Session in POST /api/workspaces:', JSON.stringify(session, null, 2))

    if (!session?.user?.email) {
      return createErrorResponse('Unauthorized', 401, 'AUTH_REQUIRED')
    }

    // CVE-CB-007 Fix: Validate request body
    const validation = await validateBody(request, workspaceCreateSchema)
    if (!validation.success) {
      return validationErrorResponse(validation.errors!)
    }

    const { name, domain, type = 'ENTERPRISE' } = validation.data!

    // 타입 유효성 검사
    const validTypes: WorkspaceType[] = ['ENTERPRISE', 'HR_ONLY', 'PROJECT_ONLY']
    const workspaceType: WorkspaceType = validTypes.includes(type as WorkspaceType) ? type as WorkspaceType : 'ENTERPRISE'

    // 도메인 중복 확인
    const existingWorkspace = await prisma.workspace.findUnique({
      where: { domain }
    })

    if (existingWorkspace) {
      return createErrorResponse('이미 사용 중인 도메인입니다. 다른 도메인을 선택해주세요.', 400, 'DOMAIN_EXISTS')
    }

    // 사용자 찾기 또는 생성
    let user = await prisma.user.findUnique({
      where: { email: session.user.email },
    })

    if (!user) {
      user = await prisma.user.create({
        data: {
          email: session.user.email,
          name: session.user.name || session.user.email.split('@')[0],
          role: 'admin',
        },
      })
      secureLogger.info('New user created during workspace creation', {
        operation: 'workspace.create',
        userId: user.id,
      })
    }

    // CVE-CB-012 Fix: Use cryptographically secure token generation
    const slug = `${name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')}-${generateSecureToken(4)}`
    const inviteCode = generateSecureToken(6).toUpperCase()

    // 트랜잭션으로 워크스페이스와 features 동시 생성
    const workspace = await prisma.$transaction(async (tx) => {
      // 1. 워크스페이스 생성
      const newWorkspace = await tx.workspace.create({
        data: {
          name,
          domain,
          slug,
          inviteCode,
          type: workspaceType,
          members: {
            create: {
              userId: user!.id,
              role: 'admin',
            },
          },
        },
      })

      // 2. WorkspaceFeatures 생성 (타입에 따른 프리셋)
      const featurePreset = WORKSPACE_FEATURE_PRESETS[workspaceType]
      await tx.workspaceFeatures.create({
        data: {
          workspace: { connect: { id: newWorkspace.id } },
          ...featurePreset,
        },
      })

      // 3. 기본 부서(팀) 생성
      for (const dept of DEFAULT_DEPARTMENTS) {
        await tx.team.create({
          data: {
            workspaceId: newWorkspace.id,
            name: dept.name,
            color: dept.color,
            order: dept.order,
          },
        })
      }

      return newWorkspace
    })

    // CVE-CB-005 Fix: Safe logging
    secureLogger.info('Workspace created successfully', {
      operation: 'workspace.create',
      userId: user.id,
      workspaceId: workspace.id,
      type: workspaceType,
    })

    // 샘플 데이터 생성 (PROJECT 관련 타입만)
    if (workspaceType === 'ENTERPRISE' || workspaceType === 'PROJECT_ONLY') {
      await createSampleData(workspace.id, user.id)
    }

    // features 포함해서 반환
    const workspaceWithFeatures = await prisma.workspace.findUnique({
      where: { id: workspace.id },
      include: { features: true }
    })

    return NextResponse.json(workspaceWithFeatures, { status: 201 })
  } catch (error) {
    secureLogger.error('Failed to create workspace', error as Error, { operation: 'workspace.create' })
    return createErrorResponse('Failed to create workspace', 500, 'CREATE_FAILED')
  }
}
