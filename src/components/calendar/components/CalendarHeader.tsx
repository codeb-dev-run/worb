'use client'

import React from 'react'
import { format, startOfWeek, endOfWeek } from 'date-fns'
import { ko } from 'date-fns/locale'
import { ChevronLeft, ChevronRight, Plus, Video, User, Users } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ViewMode, FilterMode } from '../types'

interface CalendarHeaderProps {
  currentDate: Date
  viewMode: ViewMode
  filterMode: FilterMode
  onNavigatePrev: () => void
  onNavigateNext: () => void
  onGoToToday: () => void
  onViewModeChange: (mode: ViewMode) => void
  onFilterModeChange: (mode: FilterMode) => void
  onOpenCreateModal: () => void
  onOpenMeetingModal: () => void
}

export function CalendarHeader({
  currentDate,
  viewMode,
  filterMode,
  onNavigatePrev,
  onNavigateNext,
  onGoToToday,
  onViewModeChange,
  onFilterModeChange,
  onOpenCreateModal,
  onOpenMeetingModal
}: CalendarHeaderProps) {
  const getHeaderTitle = () => {
    if (viewMode === 'month') return format(currentDate, 'yyyy년 M월', { locale: ko })
    if (viewMode === 'week') {
      const weekStart = startOfWeek(currentDate)
      const weekEnd = endOfWeek(currentDate)
      return `${format(weekStart, 'M월 d일', { locale: ko })} - ${format(weekEnd, 'M월 d일', { locale: ko })}`
    }
    return format(currentDate, 'yyyy년 M월 d일 (EEEE)', { locale: ko })
  }

  return (
    <div className="p-4 border-b border-white/40 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
      <div className="flex items-center gap-4">
        <h2 className="text-xl font-bold text-slate-900">
          {getHeaderTitle()}
        </h2>
        <div className="flex items-center gap-1 bg-white/60 backdrop-blur-sm rounded-xl p-1 border border-white/40">
          <Button variant="ghost" size="icon" onClick={onNavigatePrev} className="rounded-lg hover:bg-lime-50">
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" onClick={onNavigateNext} className="rounded-lg hover:bg-lime-50">
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button variant="ghost" onClick={onGoToToday} className="rounded-lg hover:bg-lime-50 text-sm">
            오늘
          </Button>
        </div>
      </div>

      <div className="flex items-center gap-3 flex-wrap">
        {/* View Mode Toggle */}
        <div className="flex bg-white/60 backdrop-blur-sm rounded-xl p-1 border border-white/40">
          {(['day', 'week', 'month'] as ViewMode[]).map(mode => (
            <button
              key={mode}
              onClick={() => onViewModeChange(mode)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                viewMode === mode
                  ? 'bg-lime-400 text-black shadow-sm'
                  : 'text-slate-500 hover:text-slate-700 hover:bg-lime-50'
              }`}
            >
              {mode === 'day' ? '일' : mode === 'week' ? '주' : '월'}
            </button>
          ))}
        </div>

        {/* Filter Toggle */}
        <div className="flex bg-white/60 backdrop-blur-sm rounded-xl p-1 border border-white/40">
          <button
            onClick={() => onFilterModeChange('all')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              filterMode === 'all'
                ? 'bg-lime-400 text-black shadow-sm'
                : 'text-slate-500 hover:text-slate-700 hover:bg-lime-50'
            }`}
          >
            전체
          </button>
          <button
            onClick={() => onFilterModeChange('personal')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              filterMode === 'personal'
                ? 'bg-lime-400 text-black shadow-sm'
                : 'text-slate-500 hover:text-slate-700 hover:bg-lime-50'
            }`}
          >
            <User className="w-3 h-3" />
            개인
          </button>
          <button
            onClick={() => onFilterModeChange('team')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              filterMode === 'team'
                ? 'bg-lime-400 text-black shadow-sm'
                : 'text-slate-500 hover:text-slate-700 hover:bg-lime-50'
            }`}
          >
            <Users className="w-3 h-3" />
            팀
          </button>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={onOpenMeetingModal} className="rounded-xl">
            <Video className="h-4 w-4 mr-2" />
            미팅 신청
          </Button>
          <Button variant="limePrimary" onClick={onOpenCreateModal} className="rounded-xl">
            <Plus className="h-4 w-4 mr-2" />
            일정 추가
          </Button>
        </div>
      </div>
    </div>
  )
}

export default CalendarHeader
