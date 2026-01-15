// =============================================================================
// Feature Permissions API - 기능별 권한 레벨 설정
// =============================================================================

export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth-options'
import { secureLogger, createErrorResponse } from '@/lib/security'

// 기본 권한 설정 (기능별 최소 권한 레벨)
const DEFAULT_FEATURE_PERMISSIONS: Record<string, string> = {
    // 1등급 전용 (SUPER_ADMIN)
    'evaluation': 'SUPER_ADMIN',    // 성과 등록
    'payroll': 'SUPER_ADMIN',       // 급여 관리
    'organization': 'SUPER_ADMIN',  // 조직 관리

    // 2등급 이상 (ADMIN)
    'attendance': 'ADMIN',          // 출퇴근 관리
    'employee': 'ADMIN',            // 직원 관리
    'leave': 'ADMIN',               // 휴가 관리
    'hr': 'ADMIN',                  // HR 메뉴
    'announcement': 'ADMIN',        // 공지사항 관리

    // 3등급도 가능 (MEMBER)
    'project': 'MEMBER',            // 프로젝트
    'board': 'MEMBER',              // 게시판
    'calendar': 'MEMBER',           // 캘린더
}

// 기능별 권한 목록 조회
export async function GET(
    request: Request,
    { params }: { params: Promise<{ workspaceId: string }> }
) {
    try {
        const { workspaceId } = await params
        const session = await getServerSession(authOptions)
        if (!session?.user?.email) {
            return createErrorResponse('Unauthorized', 401, 'AUTH_REQUIRED')
        }

        // 현재 사용자 확인
        const currentUser = await prisma.user.findUnique({
            where: { email: session.user.email }
        })

        if (!currentUser) {
            return createErrorResponse('User not found', 404, 'USER_NOT_FOUND')
        }

        // 멤버십 확인
        const membership = await prisma.workspaceMember.findUnique({
            where: {
                workspaceId_userId: {
                    workspaceId,
                    userId: currentUser.id
                }
            }
        })

        if (!membership || membership.role !== 'admin') {
            return createErrorResponse('Admin access required', 403, 'ADMIN_REQUIRED')
        }

        // 저장된 권한 설정 조회
        const savedPermissions = await prisma.featurePermission.findMany({
            where: { workspaceId }
        })

        // 기본값과 병합
        const permissions = Object.entries(DEFAULT_FEATURE_PERMISSIONS).map(([featureKey, defaultLevel]) => {
            const saved = savedPermissions.find(p => p.featureKey === featureKey)
            return {
                featureKey,
                minLevel: saved?.minLevel || defaultLevel,
                isCustom: !!saved,
                updatedAt: saved?.updatedAt?.toISOString() || null
            }
        })

        return NextResponse.json({
            permissions,
            defaults: DEFAULT_FEATURE_PERMISSIONS
        })
    } catch (error) {
        secureLogger.error('Failed to fetch feature permissions', error as Error, { operation: 'workspace.feature-permissions.list' })
        return createErrorResponse('Failed to fetch permissions', 500, 'FETCH_FAILED')
    }
}

// 기능별 권한 설정 변경
export async function PUT(
    request: Request,
    { params }: { params: Promise<{ workspaceId: string }> }
) {
    try {
        const { workspaceId } = await params
        const session = await getServerSession(authOptions)
        if (!session?.user?.email) {
            return createErrorResponse('Unauthorized', 401, 'AUTH_REQUIRED')
        }

        const { featureKey, minLevel } = await request.json()

        // 유효성 검증
        const validLevels = ['SUPER_ADMIN', 'ADMIN', 'MEMBER']
        if (!featureKey || !minLevel || !validLevels.includes(minLevel)) {
            return createErrorResponse('Invalid parameters', 400, 'INVALID_PARAMS')
        }

        // 현재 사용자 확인
        const currentUser = await prisma.user.findUnique({
            where: { email: session.user.email }
        })

        if (!currentUser) {
            return createErrorResponse('User not found', 404, 'USER_NOT_FOUND')
        }

        // SUPER_ADMIN만 권한 변경 가능
        const membership = await prisma.workspaceMember.findUnique({
            where: {
                workspaceId_userId: {
                    workspaceId,
                    userId: currentUser.id
                }
            }
        })

        if (!membership || membership.adminLevel !== 'SUPER_ADMIN') {
            return createErrorResponse('Super admin access required', 403, 'SUPER_ADMIN_REQUIRED')
        }

        // 권한 설정 업데이트 또는 생성
        const permission = await prisma.featurePermission.upsert({
            where: {
                workspaceId_featureKey: {
                    workspaceId,
                    featureKey
                }
            },
            update: { minLevel },
            create: {
                workspaceId,
                featureKey,
                minLevel
            }
        })

        secureLogger.info('Feature permission updated', {
            operation: 'workspace.feature-permissions.update',
            workspaceId,
            featureKey,
            minLevel
        })

        return NextResponse.json(permission)
    } catch (error) {
        secureLogger.error('Failed to update feature permission', error as Error, { operation: 'workspace.feature-permissions.update' })
        return createErrorResponse('Failed to update permission', 500, 'UPDATE_FAILED')
    }
}

// 권한 설정 초기화 (기본값으로)
export async function DELETE(
    request: Request,
    { params }: { params: Promise<{ workspaceId: string }> }
) {
    try {
        const { workspaceId } = await params
        const session = await getServerSession(authOptions)
        if (!session?.user?.email) {
            return createErrorResponse('Unauthorized', 401, 'AUTH_REQUIRED')
        }

        const { searchParams } = new URL(request.url)
        const featureKey = searchParams.get('featureKey')

        if (!featureKey) {
            return createErrorResponse('Feature key required', 400, 'FEATURE_KEY_REQUIRED')
        }

        // 현재 사용자 확인
        const currentUser = await prisma.user.findUnique({
            where: { email: session.user.email }
        })

        if (!currentUser) {
            return createErrorResponse('User not found', 404, 'USER_NOT_FOUND')
        }

        // SUPER_ADMIN만 가능
        const membership = await prisma.workspaceMember.findUnique({
            where: {
                workspaceId_userId: {
                    workspaceId,
                    userId: currentUser.id
                }
            }
        })

        if (!membership || membership.adminLevel !== 'SUPER_ADMIN') {
            return createErrorResponse('Super admin access required', 403, 'SUPER_ADMIN_REQUIRED')
        }

        // 커스텀 설정 삭제 (기본값으로 복원)
        await prisma.featurePermission.deleteMany({
            where: {
                workspaceId,
                featureKey
            }
        })

        secureLogger.info('Feature permission reset', {
            operation: 'workspace.feature-permissions.reset',
            workspaceId,
            featureKey
        })

        return NextResponse.json({ success: true, featureKey })
    } catch (error) {
        secureLogger.error('Failed to reset feature permission', error as Error, { operation: 'workspace.feature-permissions.reset' })
        return createErrorResponse('Failed to reset permission', 500, 'RESET_FAILED')
    }
}
