'use client'

import { useEffect } from 'react'
import { AlertTriangle, RefreshCw, Home, Bug } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'

interface ErrorProps {
  error: Error & { digest?: string }
  reset: () => void
}

/**
 * 루트 레벨 에러 페이지
 * Next.js App Router의 error.tsx convention
 */
export default function GlobalError({ error, reset }: ErrorProps) {
  useEffect(() => {
    // Production에서 에러 로깅 서비스로 전송
    if (process.env.NODE_ENV === 'production') {
      console.error('Application error:', error)
      // TODO: Sentry, LogRocket 등 에러 로깅 서비스 연동
    }
  }, [error])

  const isDev = process.env.NODE_ENV === 'development'

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-gradient-to-br from-slate-50 to-slate-100">
      <Card className="w-full max-w-lg border-red-200 bg-white shadow-xl">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 p-4 bg-red-100 rounded-full w-fit">
            <AlertTriangle className="h-10 w-10 text-red-600" />
          </div>
          <CardTitle className="text-2xl text-red-900">문제가 발생했습니다</CardTitle>
          <CardDescription className="text-red-700">
            예기치 않은 오류가 발생했습니다.
            <br />
            페이지를 새로고침하거나 잠시 후 다시 시도해 주세요.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* 에러 다이제스트 (프로덕션에서 추적용) */}
          {error.digest && (
            <div className="p-3 bg-slate-100 rounded-lg text-center">
              <p className="text-xs text-slate-500">오류 코드</p>
              <p className="font-mono text-sm text-slate-700">{error.digest}</p>
            </div>
          )}

          {/* 개발 환경에서 에러 상세 정보 */}
          {isDev && (
            <div className="p-4 bg-red-50 rounded-lg border border-red-200">
              <p className="font-medium text-red-900 mb-2 flex items-center gap-2">
                <Bug className="h-4 w-4" />
                Error Details (Dev Only)
              </p>
              <p className="text-red-800 font-mono text-xs break-all">
                {error.name}: {error.message}
              </p>
              {error.stack && (
                <details className="mt-2">
                  <summary className="cursor-pointer text-red-700 hover:text-red-900 text-sm">
                    Stack Trace
                  </summary>
                  <pre className="mt-2 text-xs text-red-600 whitespace-pre-wrap overflow-x-auto max-h-40 bg-red-100 p-2 rounded">
                    {error.stack}
                  </pre>
                </details>
              )}
            </div>
          )}

          {/* 액션 버튼들 */}
          <div className="flex flex-col gap-2">
            <Button
              onClick={() => reset()}
              variant="outline"
              className="w-full"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              다시 시도
            </Button>
            <Button
              onClick={() => window.location.reload()}
              variant="outline"
              className="w-full"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              페이지 새로고침
            </Button>
            <Button
              onClick={() => window.location.href = '/'}
              className="w-full bg-lime-500 hover:bg-lime-600 text-white"
            >
              <Home className="h-4 w-4 mr-2" />
              홈으로 이동
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
