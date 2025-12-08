'use client'

import { useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { useWorkspace } from '@/lib/workspace-context'
import {
  isAdminRoute,
  isHRRoute,
  isFinanceRoute,
  ROUTES,
} from '@/config/routes'

type WorkspaceRole = 'admin' | 'member'

interface RouteGuardOptions {
  /** 허용된 역할 목록 */
  allowedRoles?: WorkspaceRole[]
  /** 필요한 기능 권한 (HR_ADMIN, FINANCE_ADMIN 등) */
  requiredFeature?: 'HR_ADMIN' | 'FINANCE_ADMIN' | 'PROJECT_ADMIN'
  /** 권한 없을 때 리다이렉트할 경로 (기본: /dashboard) */
  redirectTo?: string
  /** 권한 체크 비활성화 */
  skip?: boolean
}

interface RouteGuardResult {
  /** 권한 체크 완료 여부 */
  isChecking: boolean
  /** 접근 권한 있음 */
  hasAccess: boolean
  /** 현재 사용자 역할 */
  currentRole: WorkspaceRole
  /** 관리자 여부 */
  isAdmin: boolean
}

/**
 * 라우트 권한 체크 훅
 *
 * @example
 * // HR 페이지에서 사용
 * const { hasAccess, isChecking } = useRouteGuard({ requiredFeature: 'HR_ADMIN' })
 *
 * @example
 * // Admin 전용 페이지
 * const { hasAccess } = useRouteGuard({ allowedRoles: ['admin'] })
 */
export function useRouteGuard(options: RouteGuardOptions = {}): RouteGuardResult {
  const {
    allowedRoles,
    requiredFeature,
    redirectTo = ROUTES.dashboard,
    skip = false,
  } = options

  const router = useRouter()
  const pathname = usePathname()
  const { currentWorkspace, currentRole, isAdmin, loading } = useWorkspace()

  // 권한 체크 로직
  const checkAccess = (): boolean => {
    if (skip) return true
    if (!currentWorkspace) return false

    // OWNER/Admin은 모든 권한
    // 현재 workspace-context에서는 'admin' | 'member'만 사용
    // OWNER는 admin으로 처리됨
    if (isAdmin) return true

    // 역할 기반 체크
    if (allowedRoles && allowedRoles.length > 0) {
      if (!allowedRoles.includes(currentRole)) {
        return false
      }
    }

    // 기능 권한 체크 (현재는 admin만 HR/Finance 접근 가능)
    if (requiredFeature) {
      // TODO: Feature Admin 시스템 구현 시 확장
      // 현재는 admin만 HR/Finance 접근 가능
      if (!isAdmin) {
        return false
      }
    }

    return true
  }

  const hasAccess = checkAccess()

  // 권한 없으면 리다이렉트
  useEffect(() => {
    if (skip || loading) return

    // 워크스페이스 로드 완료 후 권한 체크
    if (currentWorkspace && !hasAccess) {
      router.replace(redirectTo)
    }
  }, [currentWorkspace, hasAccess, loading, skip, redirectTo, router])

  return {
    isChecking: loading,
    hasAccess,
    currentRole,
    isAdmin,
  }
}

/**
 * 현재 경로 기반 자동 권한 체크 훅
 * 경로에 따라 자동으로 필요한 권한을 체크합니다.
 */
export function useAutoRouteGuard(): RouteGuardResult {
  const pathname = usePathname()

  // 경로에 따라 자동으로 옵션 설정
  let options: RouteGuardOptions = {}

  if (pathname && isAdminRoute(pathname)) {
    options = { allowedRoles: ['admin'] }
  } else if (pathname && isHRRoute(pathname)) {
    options = { requiredFeature: 'HR_ADMIN' }
  } else if (pathname && isFinanceRoute(pathname)) {
    options = { requiredFeature: 'FINANCE_ADMIN' }
  }

  return useRouteGuard(options)
}

export default useRouteGuard
