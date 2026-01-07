'use client'

import React from 'react'
import { Input } from '@/components/ui/input'
import {
  Info, LayoutGrid, Calendar, FileText, Activity, UserPlus, Settings,
  Search, ChevronDown, AlertCircle, AlertTriangle, Flame
} from 'lucide-react'
import { ProjectTab } from '../types'

interface ProjectTabsProps {
  activeTab: ProjectTab
  isProjectAdmin: boolean
  searchQuery: string
  filterPriority: string
  onTabChange: (tab: ProjectTab) => void
  onSearchChange: (query: string) => void
  onFilterChange: (priority: string) => void
}

const TAB_DEFINITIONS = [
  { id: 'overview' as const, label: '개요', icon: Info },
  { id: 'kanban' as const, label: '보드', icon: LayoutGrid },
  { id: 'gantt' as const, label: '타임라인', icon: Calendar },
  { id: 'mindmap' as const, label: '마인드맵', icon: FileText },
  { id: 'files' as const, label: '파일', icon: FileText },
  { id: 'activity' as const, label: '활동', icon: Activity },
  { id: 'team' as const, label: '팀', icon: UserPlus },
]

const PRIORITY_FILTERS = [
  { value: 'all', label: '전체', icon: null, activeStyle: 'bg-slate-700 text-white' },
  { value: 'LOW', label: '낮음', icon: ChevronDown, activeStyle: 'bg-emerald-500 text-white' },
  { value: 'MEDIUM', label: '중간', icon: AlertCircle, activeStyle: 'bg-amber-500 text-white' },
  { value: 'HIGH', label: '높음', icon: AlertTriangle, activeStyle: 'bg-orange-500 text-white' },
  { value: 'URGENT', label: '긴급', icon: Flame, activeStyle: 'bg-rose-500 text-white' }
]

export function ProjectTabs({
  activeTab,
  isProjectAdmin,
  searchQuery,
  filterPriority,
  onTabChange,
  onSearchChange,
  onFilterChange
}: ProjectTabsProps) {
  const tabs = [
    ...TAB_DEFINITIONS,
    ...(isProjectAdmin ? [{ id: 'settings' as const, label: '설정', icon: Settings }] : []),
  ]

  return (
    <div className="flex-shrink-0 bg-white/60 backdrop-blur-sm border-b border-white/40 px-6">
      <div className="flex items-center justify-between gap-4 py-2">
        {/* Left: Tabs */}
        <nav className="flex gap-1 flex-shrink-0">
          {tabs.map(tab => {
            const Icon = tab.icon
            return (
              <button
                key={tab.id}
                onClick={() => onTabChange(tab.id)}
                className={`px-3 py-1.5 rounded-xl text-sm font-medium transition-all flex items-center gap-1.5 ${
                  activeTab === tab.id
                    ? 'bg-black text-lime-400 shadow-lg'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
                }`}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
              </button>
            )
          })}
        </nav>

        {/* Right: Search + Priority Filters (보드 탭일 때만 표시) */}
        {activeTab === 'kanban' && (
          <div className="flex items-center gap-2 flex-shrink-0">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 transform -translate-y-1/2 text-slate-400 h-3.5 w-3.5" />
              <Input
                type="text"
                placeholder="작업 검색"
                value={searchQuery}
                onChange={(e) => onSearchChange(e.target.value)}
                className="pl-8 h-8 w-36 text-sm bg-white/60 border-white/40"
              />
            </div>

            {/* Priority Filters */}
            <div className="flex gap-0.5 bg-white/40 rounded-xl p-0.5">
              {PRIORITY_FILTERS.map(priority => {
                const Icon = priority.icon
                return (
                  <button
                    key={priority.value}
                    type="button"
                    onClick={() => onFilterChange(priority.value)}
                    className={`flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium transition-all ${
                      filterPriority === priority.value
                        ? priority.activeStyle
                        : 'text-slate-500 hover:text-slate-700 hover:bg-white/60'
                    }`}
                  >
                    {Icon && <Icon className="h-3 w-3" />}
                    {priority.label}
                  </button>
                )
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default ProjectTabs
