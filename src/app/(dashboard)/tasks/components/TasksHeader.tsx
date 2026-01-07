'use client'

// ===========================================
// Tasks Header Component
// ===========================================

import React from 'react'
import { List, LayoutGrid, Trash } from 'lucide-react'
import { ActiveTab } from '../types'

interface TasksHeaderProps {
  activeTab: ActiveTab
  onTabChange: (tab: ActiveTab) => void
  trashedCount: number
}

export function TasksHeader({ activeTab, onTabChange, trashedCount }: TasksHeaderProps) {
  return (
    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 px-6 py-4 border-b border-slate-200/60 bg-white/40 backdrop-blur-sm shrink-0">
      <div className="space-y-1">
        <h2 className="text-sm font-medium text-slate-500">작업 관리</h2>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">내 작업</h1>
      </div>

      {/* View Toggle - Glass Style */}
      <div className="flex bg-white/60 backdrop-blur-sm p-1 rounded-xl border border-white/40">
        <button
          onClick={() => onTabChange('list')}
          className={`px-4 py-2 rounded-xl flex items-center gap-2 text-xs font-medium transition-all duration-300 ${
            activeTab === 'list'
              ? 'bg-white text-slate-900 shadow-sm'
              : 'text-slate-500 hover:text-slate-900'
          }`}
        >
          <List className="w-4 h-4" />
          리스트
        </button>
        <button
          onClick={() => onTabChange('kanban')}
          className={`px-4 py-2 rounded-xl flex items-center gap-2 text-xs font-medium transition-all duration-300 ${
            activeTab === 'kanban'
              ? 'bg-white text-slate-900 shadow-sm'
              : 'text-slate-500 hover:text-slate-900'
          }`}
        >
          <LayoutGrid className="w-4 h-4" />
          칸반 보드
        </button>
        <button
          onClick={() => onTabChange('trash')}
          className={`px-4 py-2 rounded-xl flex items-center gap-2 text-xs font-medium transition-all duration-300 relative ${
            activeTab === 'trash'
              ? 'bg-white text-slate-900 shadow-sm'
              : 'text-slate-500 hover:text-slate-900'
          }`}
        >
          <Trash className="w-4 h-4" />
          {trashedCount > 0 && (
            <span className="absolute -top-1 -right-1 w-4 h-4 bg-rose-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
              {trashedCount > 9 ? '9+' : trashedCount}
            </span>
          )}
        </button>
      </div>
    </div>
  )
}
