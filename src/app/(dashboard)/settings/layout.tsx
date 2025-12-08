'use client'

import { ReactNode } from 'react'
import { useRouteGuard } from '@/hooks/useRouteGuard'

interface SettingsLayoutProps {
  children: ReactNode
}

/**
 * Settings 모듈 레이아웃
 * OWNER 또는 ADMIN 권한이 있는 사용자만 접근 가능
 */
export default function SettingsLayout({ children }: SettingsLayoutProps) {
  const { isChecking, hasAccess } = useRouteGuard({
    allowedRoles: ['admin'],
  })

  // 권한 체크 중
  if (isChecking) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-2 text-gray-500">권한 확인 중...</p>
        </div>
      </div>
    )
  }

  // 권한 없음 (리다이렉트 중)
  if (!hasAccess) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="text-red-500 text-xl mb-2">접근 권한이 없습니다</div>
          <p className="text-gray-500">대시보드로 이동합니다...</p>
        </div>
      </div>
    )
  }

  return <>{children}</>
}
