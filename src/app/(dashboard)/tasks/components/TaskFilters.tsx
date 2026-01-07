'use client'

// ===========================================
// Task Filters Component
// ===========================================

import React from 'react'
import { User, Folder, ChevronDown, ChevronRight } from 'lucide-react'
import { STATUS_ICONS, ProjectOption } from '../types'

interface TaskFiltersProps {
  filterStatus: string
  filterProject: string
  onStatusChange: (status: string) => void
  onProjectChange: (projectId: string) => void
  projects: ProjectOption[]
  showOtherProjects: boolean
  onToggleOtherProjects: () => void
}

export function TaskFilters({
  filterStatus,
  filterProject,
  onStatusChange,
  onProjectChange,
  projects,
  showOtherProjects,
  onToggleOtherProjects,
}: TaskFiltersProps) {
  const myProjects = projects.filter(p => p.isMember)
  const otherProjects = projects.filter(p => !p.isMember)

  return (
    <div className="flex flex-col sm:flex-row sm:items-center gap-6 bg-white/40 backdrop-blur-md px-6 py-4 border-b border-slate-200/60 shrink-0">
      {/* Status Filter */}
      <div className="flex items-center gap-3">
        <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Status:</span>
        <div className="flex gap-1">
          {Object.entries(STATUS_ICONS).map(([key, { icon: Icon, label, color }]) => (
            <button
              key={key}
              onClick={() => onStatusChange(key)}
              className={`p-2.5 rounded-xl transition-all duration-300 ${
                filterStatus === key
                  ? 'bg-lime-400 text-black shadow-lg shadow-lime-400/30'
                  : 'bg-white/60 hover:bg-lime-50 text-slate-400 hover:text-lime-500'
              }`}
              title={label}
            >
              <Icon className={`w-4 h-4 ${filterStatus === key ? 'text-black' : color}`} />
            </button>
          ))}
        </div>
      </div>

      <div className="hidden sm:block w-px h-8 bg-slate-200/60" />

      {/* Project Filter */}
      <div className="flex items-center gap-3 flex-wrap">
        <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Project:</span>
        <div className="flex gap-1.5 flex-wrap items-center">
          <button
            onClick={() => onProjectChange('all')}
            className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all duration-300 ${
              filterProject === 'all'
                ? 'bg-lime-400 text-black shadow-lg shadow-lime-400/30'
                : 'bg-white/60 hover:bg-lime-50 text-slate-500 hover:text-slate-700'
            }`}
          >
            전체
          </button>
          <button
            onClick={() => onProjectChange('personal')}
            className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all duration-300 flex items-center gap-1.5 ${
              filterProject === 'personal'
                ? 'bg-lime-400 text-black shadow-lg shadow-lime-400/30'
                : 'bg-white/60 hover:bg-lime-50 text-slate-500 hover:text-slate-700'
            }`}
          >
            <User className="w-3 h-3" />
            개인 작업
          </button>

          {/* My Projects Group */}
          {myProjects.length > 0 && (
            <>
              <div className="w-px h-5 bg-slate-300/60 mx-1" />
              <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider">내 프로젝트</span>
              {myProjects.map(project => (
                <button
                  key={project.id}
                  onClick={() => onProjectChange(project.id)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all duration-300 flex items-center gap-1.5 ${
                    filterProject === project.id
                      ? 'bg-lime-400 text-black shadow-lg shadow-lime-400/30'
                      : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700 hover:text-emerald-800 border border-emerald-200'
                  }`}
                >
                  <Folder className="w-3 h-3" />
                  {project.name}
                </button>
              ))}
            </>
          )}

          {/* Other Projects Group */}
          {otherProjects.length > 0 && (
            <>
              <div className="w-px h-5 bg-slate-300/60 mx-1" />
              <button
                onClick={onToggleOtherProjects}
                className="flex items-center gap-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider hover:text-slate-600 transition-colors cursor-pointer"
              >
                {showOtherProjects ? (
                  <ChevronDown className="w-3 h-3" />
                ) : (
                  <ChevronRight className="w-3 h-3" />
                )}
                다른 프로젝트 ({otherProjects.length})
              </button>
              {showOtherProjects && otherProjects.map(project => (
                <button
                  key={project.id}
                  onClick={() => onProjectChange(project.id)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all duration-300 ${
                    filterProject === project.id
                      ? 'bg-lime-400 text-black shadow-lg shadow-lime-400/30'
                      : 'bg-white/60 hover:bg-lime-50 text-slate-500 hover:text-slate-700'
                  }`}
                >
                  {project.name}
                </button>
              ))}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
