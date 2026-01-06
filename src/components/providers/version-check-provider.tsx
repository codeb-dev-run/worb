'use client'

/**
 * Version Check Provider
 *
 * 해외 상위 1% 개발자 전략:
 * - Build ID를 폴링하여 새 배포 감지
 * - 새 버전 감지 시 사용자에게 알림 또는 자동 리로드
 *
 * References:
 * - https://dev.to/walrusai/prompting-users-to-reload-your-next-js-app-after-an-update-2jpf
 * - https://makerkit.dev/blog/tutorials/force-update-nextjs
 * - https://github.com/vercel/next.js/issues/5652
 */

import { useEffect, useRef, useCallback } from 'react'

// 폴링 간격 (프로덕션: 30초, 개발: 비활성화)
const POLLING_INTERVAL = 30 * 1000

export function VersionCheckProvider({ children }: { children: React.ReactNode }) {
  const currentVersionRef = useRef<string | null>(null)
  const hasShownToastRef = useRef(false)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // 버전 체크 함수
  const checkForUpdates = useCallback(async () => {
    // 개발 환경에서는 비활성화
    if (process.env.NODE_ENV === 'development') return

    try {
      const response = await fetch(`/api/version?t=${Date.now()}`, {
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
        },
      })

      if (!response.ok) return

      const data = await response.json()
      const serverVersion = data.buildId

      if (!serverVersion) return

      // 최초 버전 설정
      if (!currentVersionRef.current) {
        currentVersionRef.current = serverVersion
        return
      }

      // 버전 비교 - 다르면 새로고침
      if (serverVersion !== currentVersionRef.current && !hasShownToastRef.current) {
        hasShownToastRef.current = true

        // 간단한 알림 후 자동 새로고침
        if (typeof window !== 'undefined') {
          console.log('[VersionCheck] 새 버전 감지, 새로고침합니다...')
          window.location.reload()
        }
      }
    } catch (error) {
      // 에러 무시 (네트워크 문제 등)
    }
  }, [])

  // 폴링 시작
  useEffect(() => {
    // 개발 환경에서는 비활성화
    if (process.env.NODE_ENV === 'development') return

    // 초기 버전 체크 (약간의 딜레이)
    const initTimeout = setTimeout(checkForUpdates, 3000)

    // 주기적 폴링
    intervalRef.current = setInterval(checkForUpdates, POLLING_INTERVAL)

    // 페이지 visibility 변경 시 체크 (탭 전환 후 돌아왔을 때)
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        checkForUpdates()
      }
    }
    document.addEventListener('visibilitychange', handleVisibilityChange)

    // 포커스 이벤트 (창 전환 후 돌아왔을 때)
    const handleFocus = () => {
      checkForUpdates()
    }
    window.addEventListener('focus', handleFocus)

    return () => {
      clearTimeout(initTimeout)
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      window.removeEventListener('focus', handleFocus)
    }
  }, [checkForUpdates])

  return <>{children}</>
}
