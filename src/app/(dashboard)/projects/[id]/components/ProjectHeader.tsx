'use client'

import React from 'react'
import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { ArrowLeft, PanelRightClose, PanelRightOpen } from 'lucide-react'
import { ProjectDetail, STATUS_CONFIG } from '../types'

interface ProjectHeaderProps {
  project: ProjectDetail
  showSidebar: boolean
  onToggleSidebar: () => void
}

export function ProjectHeader({ project, showSidebar, onToggleSidebar }: ProjectHeaderProps) {
  const status = STATUS_CONFIG[project.status]

  return (
    <div className="flex-shrink-0 bg-white/70 backdrop-blur-xl border-b border-white/40 px-6 py-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link
            href="/projects"
            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-white/60 rounded-xl transition-all"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-xl font-bold text-slate-900">{project.name}</h1>
            <p className="text-sm text-slate-500 mt-0.5">{project.description}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Badge className={cn(
            "border-0 px-3 py-1",
            status.color === 'amber' && 'bg-amber-100 text-amber-700',
            status.color === 'violet' && 'bg-violet-100 text-violet-700',
            status.color === 'lime' && 'bg-lime-100 text-lime-700',
            status.color === 'sky' && 'bg-sky-100 text-sky-700',
            status.color === 'emerald' && 'bg-emerald-100 text-emerald-700',
            status.color === 'slate' && 'bg-slate-100 text-slate-700'
          )}>
            {status.label}
          </Badge>
          <button
            onClick={onToggleSidebar}
            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-white/60 rounded-xl transition-all"
            title={showSidebar ? '사이드바 숨기기' : '사이드바 보기'}
          >
            {showSidebar ? <PanelRightClose className="w-5 h-5" /> : <PanelRightOpen className="w-5 h-5" />}
          </button>
        </div>
      </div>
    </div>
  )
}

export default ProjectHeader
