'use client'

import React, { Suspense, ReactNode } from 'react'
import { ErrorBoundary } from './ErrorBoundary'
import { Loader2 } from 'lucide-react'

interface AsyncBoundaryProps {
  children: ReactNode
  /** 로딩 중일 때 표시할 UI */
  loadingFallback?: ReactNode
  /** 에러 발생 시 표시할 UI */
  errorFallback?: ReactNode
  /** 에러 발생 시 호출될 콜백 */
  onError?: (error: Error) => void
  /** 에러 상세 정보 표시 여부 */
  showErrorDetails?: boolean
}

/**
 * 기본 로딩 컴포넌트
 */
function DefaultLoadingFallback() {
  return (
    <div className="flex items-center justify-center min-h-[200px]">
      <div className="text-center">
        <Loader2 className="h-8 w-8 animate-spin text-lime-500 mx-auto" />
        <p className="mt-2 text-sm text-slate-500">로딩 중...</p>
      </div>
    </div>
  )
}

/**
 * AsyncBoundary - Suspense + ErrorBoundary 조합
 *
 * 비동기 컴포넌트(React.lazy, use() 등)의 로딩 상태와
 * 에러 상태를 모두 처리하는 래퍼 컴포넌트입니다.
 *
 * @example
 * ```tsx
 * <AsyncBoundary
 *   loadingFallback={<Skeleton />}
 *   errorFallback={<ErrorMessage />}
 * >
 *   <AsyncComponent />
 * </AsyncBoundary>
 * ```
 */
export function AsyncBoundary({
  children,
  loadingFallback = <DefaultLoadingFallback />,
  errorFallback,
  onError,
  showErrorDetails
}: AsyncBoundaryProps) {
  return (
    <ErrorBoundary
      fallback={errorFallback}
      onError={onError ? (error) => onError(error) : undefined}
      showDetails={showErrorDetails}
    >
      <Suspense fallback={loadingFallback}>
        {children}
      </Suspense>
    </ErrorBoundary>
  )
}

export default AsyncBoundary
