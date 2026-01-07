/**
 * Lazy-loaded components for bundle optimization
 *
 * 무거운 라이브러리를 사용하는 컴포넌트들을 동적으로 로드하여
 * 초기 번들 크기를 줄입니다.
 *
 * 사용 예:
 * ```tsx
 * import { LazyGanttChart, LazyCalendarView } from '@/components/lazy'
 *
 * <Suspense fallback={<Loading />}>
 *   <LazyGanttChart tasks={tasks} />
 * </Suspense>
 * ```
 */

import dynamic from 'next/dynamic'
import { ComponentType, Suspense, ReactNode } from 'react'
import { Loader2 } from 'lucide-react'

// Loading fallback component
function LoadingFallback({ message = '로딩 중...' }: { message?: string }) {
  return (
    <div className="flex items-center justify-center min-h-[300px]">
      <div className="text-center">
        <Loader2 className="h-8 w-8 animate-spin text-lime-500 mx-auto" />
        <p className="mt-2 text-sm text-slate-500">{message}</p>
      </div>
    </div>
  )
}

// Gantt Chart - gantt-task-react (heavy)
export const LazyGanttChartPro = dynamic(
  () => import('@/components/gantt/GanttChartPro').then(mod => mod.default),
  {
    loading: () => <LoadingFallback message="간트 차트 로딩 중..." />,
    ssr: false
  }
)

// Calendar View - date-fns (moderate)
export const LazyCalendarView = dynamic(
  () => import('@/components/calendar/CalendarView').then(mod => mod.default),
  {
    loading: () => <LoadingFallback message="캘린더 로딩 중..." />,
    ssr: false
  }
)

// Kanban Board - @dnd-kit (moderate)
export const LazyKanbanBoard = dynamic(
  () => import('@/components/kanban/KanbanBoardDnD').then(mod => mod.default),
  {
    loading: () => <LoadingFallback message="칸반 보드 로딩 중..." />,
    ssr: false
  }
)

// Budget Manager - Recharts (heavy)
export const LazyBudgetManager = dynamic(
  () => import('@/components/finance/BudgetManager').then(mod => mod.default),
  {
    loading: () => <LoadingFallback message="예산 관리 로딩 중..." />,
    ssr: false
  }
)

// AI Assistant - Complex component
export const LazyAIAssistant = dynamic(
  () => import('@/components/ai/AIAssistant').then(mod => mod.default),
  {
    loading: () => null, // AI 버튼 클릭 시 로드
    ssr: false
  }
)

// Helper: Wrap component with Suspense
export function withSuspense<P extends object>(
  Component: ComponentType<P>,
  fallback: ReactNode = <LoadingFallback />
) {
  return function WrappedComponent(props: P) {
    return (
      <Suspense fallback={fallback}>
        <Component {...props} />
      </Suspense>
    )
  }
}
