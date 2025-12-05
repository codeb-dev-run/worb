// =============================================================================
// Workspace Features API - CVE-CB-005 Fixed: Secure Logging
// =============================================================================

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { secureLogger, createErrorResponse } from '@/lib/security'

// 기능 설정 필드 목록 (업데이트 가능한 필드)
const FEATURE_FIELDS = [
  'projectEnabled',
  'kanbanEnabled',
  'ganttEnabled',
  'mindmapEnabled',
  'filesEnabled',
  'attendanceEnabled',
  'employeeEnabled',
  'payrollEnabled',
  'payslipEnabled',
  'leaveEnabled',
  'hrEnabled',
  'organizationEnabled',
  'financeEnabled',
  'expenseEnabled',
  'invoiceEnabled',
  'corporateCardEnabled',
  'resumeParsingEnabled',
  'approvalEnabled',
  'marketingEnabled',
  'automationEnabled',
  'logsEnabled',
  'announcementEnabled',
  'boardEnabled',
  'calendarEnabled',
  'messageEnabled',
  'chatEnabled',
] as const

// GET /api/workspace/[workspaceId]/features
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ workspaceId: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { workspaceId } = await params

    // 워크스페이스 features 조회
    const features = await prisma.workspaceFeatures.findUnique({
      where: { workspaceId }
    })

    if (!features) {
      // features가 없으면 기본값 생성
      const workspace = await prisma.workspace.findUnique({
        where: { id: workspaceId }
      })

      if (!workspace) {
        return NextResponse.json({ error: 'Workspace not found' }, { status: 404 })
      }

      // 워크스페이스 타입에 따른 기본 features 생성
      const defaultFeatures = getDefaultFeatures(workspace.type as string)

      const newFeatures = await prisma.workspaceFeatures.create({
        data: {
          workspaceId,
          ...defaultFeatures
        }
      })

      return NextResponse.json(newFeatures)
    }

    return NextResponse.json(features)
  } catch (error) {
    // CVE-CB-005: Secure logging
    secureLogger.error('Failed to get workspace features', error as Error, { operation: 'workspace.features.get' })
    return createErrorResponse('Failed to get workspace features', 500, 'FETCH_FAILED')
  }
}

// 워크스페이스 타입별 기본 features (WORKSPACE_FEATURE_PRESETS와 동기화)
function getDefaultFeatures(type: string) {
  switch (type) {
    case 'HR_ONLY':
      return {
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
      }
    case 'PROJECT_ONLY':
      return {
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
      }
    case 'ENTERPRISE':
    default:
      return {
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
      }
  }
}

// PUT /api/workspace/[workspaceId]/features
// 워크스페이스 기능 설정 업데이트 (관리자 전용)
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ workspaceId: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { workspaceId } = await params

    // 사용자가 해당 워크스페이스의 관리자인지 확인
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      include: {
        workspaces: {
          where: { workspaceId },
          select: { role: true }
        }
      }
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const membership = user.workspaces[0]
    if (!membership || membership.role !== 'admin') {
      return NextResponse.json(
        { error: 'Admin permission required' },
        { status: 403 }
      )
    }

    // 요청 본문에서 기능 설정 추출
    const body = await request.json()

    // 허용된 필드만 추출 (보안)
    const updateData: Record<string, boolean> = {}
    for (const field of FEATURE_FIELDS) {
      if (typeof body[field] === 'boolean') {
        updateData[field] = body[field]
      }
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { error: 'No valid feature fields provided' },
        { status: 400 }
      )
    }

    // 기존 features 레코드 확인
    const existingFeatures = await prisma.workspaceFeatures.findUnique({
      where: { workspaceId }
    })

    let updatedFeatures

    if (existingFeatures) {
      // 기존 레코드 업데이트
      updatedFeatures = await prisma.workspaceFeatures.update({
        where: { workspaceId },
        data: updateData
      })
    } else {
      // 새 레코드 생성 (워크스페이스 타입 기반 기본값 + 업데이트)
      const workspace = await prisma.workspace.findUnique({
        where: { id: workspaceId }
      })

      if (!workspace) {
        return NextResponse.json(
          { error: 'Workspace not found' },
          { status: 404 }
        )
      }

      const defaultFeatures = getDefaultFeatures(workspace.type as string)
      updatedFeatures = await prisma.workspaceFeatures.create({
        data: {
          workspaceId,
          ...defaultFeatures,
          ...updateData
        }
      })
    }

    // CVE-CB-005: Secure logging
    secureLogger.info('Workspace features updated', {
      operation: 'workspace.features.update',
      workspaceId,
      updatedFields: Object.keys(updateData)
    })

    return NextResponse.json({
      success: true,
      features: updatedFeatures,
      message: '기능 설정이 업데이트되었습니다'
    })

  } catch (error) {
    // CVE-CB-005: Secure logging
    secureLogger.error('Failed to update workspace features', error as Error, { operation: 'workspace.features.update' })
    return createErrorResponse('Failed to update workspace features', 500, 'UPDATE_FAILED')
  }
}
