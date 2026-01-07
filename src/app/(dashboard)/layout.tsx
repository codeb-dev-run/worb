'use client'

import React, { useState, useEffect, Suspense } from 'react'
import Sidebar from '@/components/layout/Sidebar'
import Header from '@/components/layout/Header'
import ChatNotifications from '@/components/chat/ChatNotifications'
import { LazyAIAssistant } from '@/components/lazy'
import { useNavigation } from '@/hooks/useNavigation'
import DockNavigation from '@/components/layout/DockNavigation'
import { ErrorBoundary } from '@/components/error'
import { cn } from '@/lib/utils'

// ===========================================
// Glass Morphism Dashboard Layout
// ===========================================

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const [isAIAssistantOpen, setIsAIAssistantOpen] = useState(false)
  const { mode, toggleMode } = useNavigation()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  // Prevent hydration mismatch by rendering a default state until mounted
  if (!mounted) {
    return null
  }

  return (
    <>
      {/* Glass Morphism Page Container */}
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100 relative overflow-hidden">
        {/* Ambient Background Blobs */}
        <div className="absolute top-[-20%] left-[-10%] w-[500px] h-[500px] bg-lime-200/40 rounded-full blur-[100px] pointer-events-none" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[600px] h-[600px] bg-emerald-100/40 rounded-full blur-[120px] pointer-events-none" />
        <div className="absolute top-[30%] right-[10%] w-[400px] h-[400px] bg-lime-100/30 rounded-full blur-[80px] pointer-events-none" />

        {/* Main Layout */}
        <div className="flex h-screen relative z-10">
          {mode === 'sidebar' && <Sidebar />}

          <div className={cn(
            "flex-1 flex flex-col transition-all duration-300 min-w-0",
            mode === 'sidebar' ? "lg:ml-[280px]" : "ml-0"
          )}>
            <Header onSidebarToggle={toggleMode} />
            <main className={cn(
              "flex-1 overflow-y-auto",
              mode === 'dock' && "pb-32"
            )}>
              <div className="w-full min-h-full">
                <ErrorBoundary>
                  {children}
                </ErrorBoundary>
              </div>
            </main>
          </div>

          {mode === 'dock' && <DockNavigation />}
        </div>
      </div>

      <ChatNotifications />

      {/* AI Assistant Button - Glass Style */}
      <button
        onClick={() => setIsAIAssistantOpen(true)}
        className="fixed bottom-6 right-6 w-14 h-14 bg-black text-lime-400 rounded-2xl shadow-lg shadow-black/20 hover:shadow-xl hover:scale-110 transition-all duration-300 flex items-center justify-center z-40"
        title="AI 어시스턴트"
      >
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 2a2 2 0 0 1 2 2c0 .6-.4 1-1 1h-2a1 1 0 0 0 0 2h1a2 2 0 0 1 0 4h-1a1 1 0 0 0 0 2h2a1 1 0 0 1 1 1 2 2 0 0 1-2 2m0-16v16m-7-9a5 5 0 0 1 5-5m0 0a5 5 0 0 1 5 5m-5 0a5 5 0 0 0-5 5m5 0a5 5 0 0 0 5 5" />
        </svg>
      </button>

      {/* AI Assistant - 동적 로딩 (클릭 시 로드) */}
      {isAIAssistantOpen && (
        <Suspense fallback={null}>
          <LazyAIAssistant
            isOpen={isAIAssistantOpen}
            onClose={() => setIsAIAssistantOpen(false)}
          />
        </Suspense>
      )}
    </>
  )
}
