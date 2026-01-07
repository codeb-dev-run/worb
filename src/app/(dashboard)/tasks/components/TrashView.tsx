'use client'

// ===========================================
// Trash View Component
// ===========================================

import React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Trash, Trash2, RotateCcw, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { TrashedTask, STATUS_ICONS } from '../types'

interface TrashViewProps {
  trashedTasks: TrashedTask[]
  onRestoreTask: (taskId: string) => void
  onPermanentDelete: (taskId: string) => void
  onEmptyTrash: () => void
}

export function TrashView({
  trashedTasks,
  onRestoreTask,
  onPermanentDelete,
  onEmptyTrash
}: TrashViewProps) {
  return (
    <div className="flex-1 overflow-auto px-6 py-4 space-y-4">
      {/* Trash Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-rose-100 rounded-xl">
            <Trash className="w-5 h-5 text-rose-500" />
          </div>
          <div>
            <h3 className="font-semibold text-slate-900">휴지통</h3>
            <p className="text-xs text-slate-500">{trashedTasks.length}개 항목</p>
          </div>
        </div>
        {trashedTasks.length > 0 && (
          <Button
            variant="destructive"
            size="sm"
            onClick={onEmptyTrash}
            className="rounded-xl text-xs"
          >
            <Trash2 className="w-3.5 h-3.5 mr-1.5" />
            휴지통 비우기
          </Button>
        )}
      </div>

      {/* Trash List */}
      <div className="space-y-3">
        <AnimatePresence>
          {trashedTasks.map(task => {
            const StatusIcon = STATUS_ICONS[task.status as keyof typeof STATUS_ICONS]?.icon || STATUS_ICONS.todo.icon
            const deletedDate = task.deletedAt
              ? new Date(task.deletedAt).toLocaleDateString('ko-KR', {
                  month: 'short',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                })
              : ''

            return (
              <motion.div
                key={task.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, x: -100 }}
                className="group flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-3xl bg-rose-50/50 backdrop-blur-xl border border-rose-100/60 hover:bg-rose-50/80 transition-all duration-300 gap-4"
              >
                <div className="flex items-center gap-4 flex-1 min-w-0">
                  <div className="w-10 h-10 rounded-2xl flex items-center justify-center bg-rose-100/50 text-rose-400 shrink-0">
                    <StatusIcon className="w-5 h-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="font-medium text-slate-500 line-through truncate">
                      {task.title}
                    </h3>
                    <div className="flex items-center gap-3 mt-1 text-xs text-rose-400">
                      <span className="flex items-center gap-1">
                        <Trash2 className="w-3 h-3" />
                        {deletedDate} 삭제됨
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => onRestoreTask(task.id)}
                    className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-emerald-600 hover:bg-emerald-50 rounded-xl transition-all duration-200"
                    title="복원"
                  >
                    <RotateCcw className="w-4 h-4" />
                    복원
                  </button>
                  <button
                    onClick={() => onPermanentDelete(task.id)}
                    className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-rose-600 hover:bg-rose-100 rounded-xl transition-all duration-200"
                    title="영구 삭제"
                  >
                    <X className="w-4 h-4" />
                    삭제
                  </button>
                </div>
              </motion.div>
            )
          })}
        </AnimatePresence>

        {trashedTasks.length === 0 && (
          <div className="text-center py-16">
            <div className="w-16 h-16 mx-auto mb-4 rounded-3xl bg-slate-100/80 flex items-center justify-center">
              <Trash className="w-8 h-8 text-slate-300" />
            </div>
            <p className="text-slate-400 font-medium">휴지통이 비어있습니다</p>
            <p className="text-sm text-slate-400 mt-1">삭제한 작업이 여기에 표시됩니다</p>
          </div>
        )}
      </div>
    </div>
  )
}
