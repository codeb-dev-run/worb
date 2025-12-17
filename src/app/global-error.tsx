'use client'

// =============================================================================
// Global Error Handler - Catches errors in root layout
// https://nextjs.org/docs/app/building-your-application/routing/error-handling
// =============================================================================

import * as Sentry from '@sentry/nextjs'
import { useEffect } from 'react'

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    // Log error to Sentry
    Sentry.captureException(error)
  }, [error])

  return (
    <html lang="ko">
      <body>
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
            <div className="mb-6">
              <svg
                className="w-16 h-16 mx-auto text-red-500"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-4">
              예기치 않은 오류가 발생했습니다
            </h1>
            <p className="text-gray-600 mb-6">
              죄송합니다. 문제가 발생했습니다. 개발팀에 자동으로 보고되었습니다.
            </p>
            {error.digest && (
              <p className="text-sm text-gray-400 mb-4">
                오류 ID: {error.digest}
              </p>
            )}
            <div className="space-y-3">
              <button
                onClick={reset}
                className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors"
              >
                다시 시도
              </button>
              <button
                onClick={() => (window.location.href = '/')}
                className="w-full bg-gray-100 text-gray-700 py-2 px-4 rounded-lg hover:bg-gray-200 transition-colors"
              >
                홈으로 이동
              </button>
            </div>
          </div>
        </div>
      </body>
    </html>
  )
}
