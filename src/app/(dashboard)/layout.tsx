'use client'

import React, { useState } from 'react'
import Sidebar from '@/components/layout/Sidebar'
import Header from '@/components/layout/Header'
import ChatNotifications from '@/components/chat/ChatNotifications'
import AIAssistant from '@/components/ai/AIAssistant'
import { AuthProvider } from '@/lib/auth-context'
import { NotificationProvider } from '@/lib/notification-context'
import NotificationToast from '@/components/notification/NotificationToast'
import { Toaster } from 'react-hot-toast'

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const [isAIAssistantOpen, setIsAIAssistantOpen] = useState(false)

  return (
    <AuthProvider>
      <NotificationProvider>
        <div className="flex h-screen bg-background">
          <Sidebar />
          <div className="flex-1 lg:ml-[var(--sidebar-width)] flex flex-col">
            <Header />
            <main className="flex-1 overflow-y-auto overflow-x-hidden">
              <div className="w-full h-full">
                {children}
              </div>
            </main>
          </div>
        </div>
        <NotificationToast />
        <ChatNotifications /> {/* 채팅 알림을 헤더 알림 시스템과 통합 */}

        {/* AI Assistant 버튼 */}
        <button
          onClick={() => setIsAIAssistantOpen(true)}
          className="fixed bottom-6 right-6 w-14 h-14 bg-primary text-primary-foreground rounded-full shadow-lg hover:shadow-xl transition-all duration-300 flex items-center justify-center z-40 hover:scale-110"
          title="AI 어시스턴트"
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 2a2 2 0 0 1 2 2c0 .6-.4 1-1 1h-2a1 1 0 0 0 0 2h1a2 2 0 0 1 0 4h-1a1 1 0 0 0 0 2h2a1 1 0 0 1 1 1 2 2 0 0 1-2 2m0-16v16m-7-9a5 5 0 0 1 5-5m0 0a5 5 0 0 1 5 5m-5 0a5 5 0 0 0-5 5m5 0a5 5 0 0 0 5 5" />
          </svg>
        </button>

        <AIAssistant
          isOpen={isAIAssistantOpen}
          onClose={() => setIsAIAssistantOpen(false)}
        />

        {/* Toast Notifications - Handled by NotificationToast component */}
      </NotificationProvider>
    </AuthProvider>
  )
}