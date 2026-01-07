'use client'

// ===========================================
// Tasks List View Component
// ===========================================

import React from 'react'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import { Task as TaskType, TaskStatus } from '@/types/task'
import { Folder, Calendar, Edit2, Trash2, CheckCircle2 } from 'lucide-react'
import { STATUS_ICONS, PRIORITY_CONFIG } from '../types'

interface ListViewProps {
  tasks: TaskType[]
  onStatusChange: (taskId: string, newStatus: TaskStatus) => void
  onEditTask: (task: TaskType) => void
  onMoveToTrash: (taskId: string) => void
}

export function ListView({ tasks, onStatusChange, onEditTask, onMoveToTrash }: ListViewProps) {
  if (tasks.length === 0) {
    return (
      <div className="text-center py-16">
        <div className="w-16 h-16 mx-auto mb-4 rounded-3xl bg-slate-100/80 flex items-center justify-center">
          <CheckCircle2 className="w-8 h-8 text-slate-300" />
        </div>
        <p className="text-slate-400 font-medium">작업이 없습니다.</p>
        <p className="text-sm text-slate-400 mt-1">새 작업을 추가해보세요</p>
      </div>
    )
  }

  return (
    <div className="space-y-3 pb-24">
      <AnimatePresence>
        {tasks.map(task => {
          const StatusIcon = STATUS_ICONS[task.status as keyof typeof STATUS_ICONS]?.icon || STATUS_ICONS.todo.icon
          const isPersonal = !task.projectId
          const priorityInfo = task.priority ? PRIORITY_CONFIG[task.priority as keyof typeof PRIORITY_CONFIG] : null

          return (
            <motion.div
              key={task.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, x: -100 }}
              onDoubleClick={() => onEditTask(task)}
              className="group flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-3xl bg-white/70 backdrop-blur-xl border border-white/60 hover:bg-white/90 hover:shadow-lg hover:shadow-lime-500/5 hover:-translate-y-0.5 transition-all duration-300 cursor-pointer gap-4"
            >
              <div className="flex items-center gap-4 flex-1 min-w-0">
                <div className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 ${
                  task.status === 'done'
                    ? 'bg-lime-100 text-lime-600'
                    : task.status === 'in_progress'
                      ? 'bg-amber-100 text-amber-600'
                      : task.status === 'review'
                        ? 'bg-violet-100 text-violet-600'
                        : 'bg-slate-100 text-slate-500'
                }`}>
                  <StatusIcon className="w-5 h-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className={`font-medium text-slate-900 truncate ${task.status === 'done' ? 'line-through text-slate-400' : ''}`}>
                      {task.title}
                    </h3>
                    {priorityInfo && (
                      <span className={`flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full font-medium shrink-0 ${priorityInfo.bg} ${priorityInfo.color}`}>
                        {React.createElement(priorityInfo.icon, { className: 'w-3 h-3' })}
                        {priorityInfo.label}
                      </span>
                    )}
                    {isPersonal && (
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 font-medium shrink-0">개인</span>
                    )}
                  </div>
                  {task.description && (
                    <p className="text-sm text-slate-500 truncate mt-0.5">{task.description}</p>
                  )}
                  <div className="flex items-center gap-3 mt-1.5 text-xs text-slate-400">
                    <Link
                      href={task.projectId ? `/projects/${task.projectId}` : '#'}
                      className="flex items-center gap-1 hover:text-lime-500 transition-colors"
                    >
                      <Folder className="w-3 h-3" />
                      {(task as { projectName?: string }).projectName || 'Personal'}
                    </Link>
                    {task.dueDate && (
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {new Date(task.dueDate).toLocaleDateString('ko-KR')}
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                {Object.entries(STATUS_ICONS)
                  .filter(([key]) => key !== 'all' && key !== task.status)
                  .map(([key, { icon: Icon, label, color }]) => (
                    <button
                      key={key}
                      onClick={(e) => {
                        e.stopPropagation()
                        onStatusChange(task.id, key as TaskStatus)
                      }}
                      className="p-2 text-slate-400 hover:bg-lime-50 rounded-xl transition-all duration-200"
                      title={`${label}로 변경`}
                    >
                      <Icon className={`w-4 h-4 ${color}`} />
                    </button>
                  ))}
                <div className="w-px h-6 bg-slate-200/60 mx-1" />
                <button
                  onClick={() => onEditTask(task)}
                  className="p-2 text-slate-400 hover:text-lime-500 hover:bg-lime-50 rounded-xl transition-all duration-200"
                  title="수정"
                >
                  <Edit2 className="w-4 h-4" />
                </button>
                <button
                  onClick={() => onMoveToTrash(task.id)}
                  className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all duration-200"
                  title="휴지통으로 이동"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </motion.div>
          )
        })}
      </AnimatePresence>
    </div>
  )
}
