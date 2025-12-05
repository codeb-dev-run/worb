'use server'

import { prisma } from '@/lib/prisma'
import { WorkspaceType, BusinessType, Prisma } from '@prisma/client'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth-options'

/**
 * 사용자의 워크스페이스 목록을 조회합니다.
 */
export async function getWorkspaces() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) {
    // Return empty array instead of throwing - prevents JSON parse errors on client
    return []
  }

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

  if (!user) return []

  return user.workspaces.map(wm => ({
    ...wm.workspace,
    userRole: wm.role,
  }))
}


// WorkspaceType별 기본 기능 프리셋
const WORKSPACE_FEATURE_PRESETS: Record<WorkspaceType, Partial<Prisma.WorkspaceFeaturesCreateInput>> = {
  ENTERPRISE: {
    // 프로젝트 관리 기능 - 전체 활성화
    projectEnabled: true,
    kanbanEnabled: true,
    ganttEnabled: true,
    mindmapEnabled: true,

    // HR 기능 - 전체 활성화
    attendanceEnabled: true,
    employeeEnabled: true,
    payrollEnabled: true,
    payslipEnabled: true,
    leaveEnabled: true,

    // 고급 기능
    resumeParsingEnabled: true,
    approvalEnabled: true,

    // 그룹웨어 기능 - 전체 활성화
    announcementEnabled: true,
    boardEnabled: true,
    calendarEnabled: true,
    messageEnabled: true,
  },
  HR_ONLY: {
    // 프로젝트 관리 기능 - 비활성화
    projectEnabled: false,
    kanbanEnabled: false,
    ganttEnabled: false,
    mindmapEnabled: false,

    // HR 기능 - 전체 활성화
    attendanceEnabled: true,
    employeeEnabled: true,
    payrollEnabled: true,
    payslipEnabled: true,
    leaveEnabled: true,

    // 고급 기능 - 부분 활성화
    resumeParsingEnabled: false,
    approvalEnabled: true,

    // 그룹웨어 기능 - 기본만 활성화
    announcementEnabled: true,
    boardEnabled: false,
    calendarEnabled: true,
    messageEnabled: true,
  },
  PROJECT_ONLY: {
    // 프로젝트 관리 기능 - 전체 활성화
    projectEnabled: true,
    kanbanEnabled: true,
    ganttEnabled: true,
    mindmapEnabled: true,

    // HR 기능 - 전체 비활성화
    attendanceEnabled: false,
    employeeEnabled: false,
    payrollEnabled: false,
    payslipEnabled: false,
    leaveEnabled: false,

    // 고급 기능 - 비활성화
    resumeParsingEnabled: false,
    approvalEnabled: false,

    // 그룹웨어 기능 - 협업 중심
    announcementEnabled: true,
    boardEnabled: true,
    calendarEnabled: true,
    messageEnabled: true,
  },
}

export interface SetupWorkspaceTypeInput {
  workspaceId: string
  workspaceType: WorkspaceType
  businessType?: BusinessType
  businessName?: string
  ownerName?: string
  quickSetupData?: {
    workPattern: string
    payrollType: string
    hourlyWage: number
    weeklyAllowance: boolean
  }
}

/**
 * 워크스페이스 타입을 설정하고 관련 기능/정책을 자동 생성합니다.
 */
export async function setupWorkspaceType(input: SetupWorkspaceTypeInput) {
  const {
    workspaceId,
    workspaceType,
    businessType,
    businessName,
    ownerName,
    quickSetupData,
  } = input

  // 트랜잭션으로 모든 작업을 원자적으로 처리
  return await prisma.$transaction(async (tx) => {
    // 1. 워크스페이스 타입 업데이트
    const workspace = await tx.workspace.update({
      where: { id: workspaceId },
      data: {
        type: workspaceType,
        businessType,
        businessName,
        ownerName,
      },
    })

    // 2. WorkspaceFeatures 생성 (이미 있으면 업데이트)
    const featurePreset = WORKSPACE_FEATURE_PRESETS[workspaceType]
    const features = await tx.workspaceFeatures.upsert({
      where: { workspaceId },
      create: {
        workspace: { connect: { id: workspaceId } },
        ...featurePreset,
      },
      update: featurePreset,
    })

    // 3. WorkspaceOnboarding 생성/업데이트
    const onboarding = await tx.workspaceOnboarding.upsert({
      where: { workspaceId },
      create: {
        workspace: { connect: { id: workspaceId } },
        status: 'IN_PROGRESS',
        typeSelected: true,
        businessInfoCompleted: !!businessType,
        quickSetupData: quickSetupData ? quickSetupData : undefined,
        currentStep: quickSetupData ? 4 : (businessType ? 3 : 2),
      },
      update: {
        status: 'IN_PROGRESS',
        typeSelected: true,
        businessInfoCompleted: !!businessType,
        quickSetupData: quickSetupData ? quickSetupData : undefined,
        currentStep: quickSetupData ? 4 : (businessType ? 3 : 2),
      },
    })

    // 4. HR_ONLY인 경우 WorkPolicy도 설정
    if (workspaceType === 'HR_ONLY' && quickSetupData) {
      const workPolicyType = quickSetupData.workPattern === 'FIXED'
        ? 'FIXED'
        : quickSetupData.workPattern === 'FLEXIBLE'
          ? 'FLEXIBLE'
          : 'CORE_TIME'

      await tx.workPolicy.upsert({
        where: { workspaceId },
        create: {
          workspace: { connect: { id: workspaceId } },
          type: workPolicyType,
          dailyRequiredMinutes: 480, // 8시간
          weeklyRequiredMinutes: 2400, // 40시간
          workStartTime: quickSetupData.workPattern === 'SHIFT' ? null : '09:00',
          workEndTime: quickSetupData.workPattern === 'SHIFT' ? null : '18:00',
          allowRemoteCheckIn: true,
          autoClockOutEnabled: true,
        },
        update: {
          type: workPolicyType,
          workStartTime: quickSetupData.workPattern === 'SHIFT' ? null : '09:00',
          workEndTime: quickSetupData.workPattern === 'SHIFT' ? null : '18:00',
        },
      })
    }

    return { workspace, features, onboarding }
  })
}

/**
 * 온보딩 완료 처리
 */
export async function completeOnboarding(workspaceId: string) {
  return await prisma.workspaceOnboarding.update({
    where: { workspaceId },
    data: {
      status: 'COMPLETED',
      invitationSent: true,
      completedAt: new Date(),
    },
  })
}

/**
 * 워크스페이스 기능 설정 조회
 */
export async function getWorkspaceFeatures(workspaceId: string) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) return null

  // Check membership
  const member = await prisma.workspaceMember.findFirst({
    where: {
      workspaceId,
      user: { email: session.user.email }
    }
  })

  if (!member) return null

  return await prisma.workspaceFeatures.findUnique({
    where: { workspaceId },
  })
}

/**
 * 워크스페이스 기능 개별 토글
 */
export async function toggleWorkspaceFeature(
  workspaceId: string,
  feature: keyof Prisma.WorkspaceFeaturesUpdateInput,
  enabled: boolean
) {
  return await prisma.workspaceFeatures.update({
    where: { workspaceId },
    data: { [feature]: enabled },
  })
}

/**
 * 워크스페이스 타입 변경 (기능 프리셋도 함께 변경)
 */
export async function changeWorkspaceType(
  workspaceId: string,
  newType: WorkspaceType
) {
  const featurePreset = WORKSPACE_FEATURE_PRESETS[newType]

  return await prisma.$transaction([
    prisma.workspace.update({
      where: { id: workspaceId },
      data: { type: newType },
    }),
    prisma.workspaceFeatures.update({
      where: { workspaceId },
      data: featurePreset,
    }),
  ])
}

/**
 * 워크스페이스 정보 조회 (타입, 기능, 온보딩 상태 포함)
 */
export async function getWorkspaceWithFeatures(workspaceId: string) {
  return await prisma.workspace.findUnique({
    where: { id: workspaceId },
    include: {
      features: true,
      workspaceOnboarding: true,
      workPolicy: true,
    },
  })
}
