import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import { AuthProvider } from '@/lib/auth-context'
import './globals.css'
// import { SocketProvider } from '@/components/providers/socket-provider'
import { WorkspaceProvider } from '@/lib/workspace-context'
import { NotificationProvider } from '@/lib/notification-context'
import NotificationToast from '@/components/notification/NotificationToast'
import { getNonce } from '@/lib/csp-nonce'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'CodeB Platform - AI 기반 개발 플랫폼',
  description: '웹 에이전시를 위한 통합 프로젝트 관리 플랫폼',
}

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const nonce = await getNonce()

  return (
    <html lang="ko">
      <head>
        <link
          rel="stylesheet"
          as="style"
          crossOrigin="anonymous"
          href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/static/pretendard.min.css"
          nonce={nonce}
        />
        {/* CSP Nonce meta tag for client-side scripts */}
        {nonce && <meta name="csp-nonce" content={nonce} />}
      </head>
      <body className={inter.className} suppressHydrationWarning>
        <AuthProvider>
          <WorkspaceProvider>
            {/* SocketProvider 임시 비활성화 - webpack 문제 디버깅 */}
            <NotificationProvider>
              {children}
              <NotificationToast />
            </NotificationProvider>
          </WorkspaceProvider>
        </AuthProvider>
      </body>
    </html>
  )
}
