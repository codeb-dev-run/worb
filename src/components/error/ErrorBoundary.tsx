'use client'

import React, { Component, ErrorInfo, ReactNode } from 'react'
import { AlertTriangle, RefreshCw, Home, Bug } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'

interface ErrorBoundaryProps {
  children: ReactNode
  fallback?: ReactNode
  onError?: (error: Error, errorInfo: ErrorInfo) => void
  showDetails?: boolean
}

interface ErrorBoundaryState {
  hasError: boolean
  error: Error | null
  errorInfo: ErrorInfo | null
}

/**
 * ErrorBoundary - React 에러 경계 컴포넌트
 * 자식 컴포넌트에서 발생하는 JavaScript 에러를 캐치하고
 * 폴백 UI를 표시합니다.
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props)
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null
    }
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    this.setState({ errorInfo })

    // 커스텀 에러 핸들러 호출
    this.props.onError?.(error, errorInfo)

    // Production에서는 에러 로깅 서비스로 전송
    if (process.env.NODE_ENV === 'production') {
      // Sentry, LogRocket 등 에러 로깅 서비스 연동
      console.error('ErrorBoundary caught an error:', error, errorInfo)
    }
  }

  handleReset = (): void => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null
    })
  }

  handleReload = (): void => {
    window.location.reload()
  }

  handleGoHome = (): void => {
    window.location.href = '/'
  }

  render(): ReactNode {
    if (this.state.hasError) {
      // 커스텀 폴백이 있으면 사용
      if (this.props.fallback) {
        return this.props.fallback
      }

      const { error, errorInfo } = this.state
      const { showDetails = process.env.NODE_ENV === 'development' } = this.props

      return (
        <div className="min-h-[400px] flex items-center justify-center p-6">
          <Card className="w-full max-w-lg border-red-200 bg-red-50/50">
            <CardHeader className="text-center">
              <div className="mx-auto mb-4 p-3 bg-red-100 rounded-full w-fit">
                <AlertTriangle className="h-8 w-8 text-red-600" />
              </div>
              <CardTitle className="text-red-900">문제가 발생했습니다</CardTitle>
              <CardDescription className="text-red-700">
                예기치 않은 오류가 발생했습니다. 페이지를 새로고침하거나 잠시 후 다시 시도해 주세요.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* 에러 상세 정보 (개발 모드) */}
              {showDetails && error && (
                <div className="p-4 bg-red-100 rounded-lg text-sm">
                  <p className="font-medium text-red-900 mb-2 flex items-center gap-2">
                    <Bug className="h-4 w-4" />
                    Error Details
                  </p>
                  <p className="text-red-800 font-mono text-xs break-all">
                    {error.name}: {error.message}
                  </p>
                  {errorInfo?.componentStack && (
                    <details className="mt-2">
                      <summary className="cursor-pointer text-red-700 hover:text-red-900">
                        Component Stack
                      </summary>
                      <pre className="mt-2 text-xs text-red-700 whitespace-pre-wrap overflow-x-auto max-h-32">
                        {errorInfo.componentStack}
                      </pre>
                    </details>
                  )}
                </div>
              )}

              {/* 액션 버튼들 */}
              <div className="flex flex-col sm:flex-row gap-2">
                <Button
                  onClick={this.handleReset}
                  variant="outline"
                  className="flex-1"
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  다시 시도
                </Button>
                <Button
                  onClick={this.handleReload}
                  variant="outline"
                  className="flex-1"
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  페이지 새로고침
                </Button>
                <Button
                  onClick={this.handleGoHome}
                  variant="default"
                  className="flex-1"
                >
                  <Home className="h-4 w-4 mr-2" />
                  홈으로
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )
    }

    return this.props.children
  }
}

export default ErrorBoundary
