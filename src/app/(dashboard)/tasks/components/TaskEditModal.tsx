'use client'

// ===========================================
// Task Edit Modal Component
// ===========================================

import React from 'react'
import { Calendar, User } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { TaskStatus, TaskPriority } from '@/types/task'
import {
  TaskEditForm,
  STATUS_ICONS,
  PRIORITY_CONFIG,
  DURATION_OPTIONS,
  formatDuration,
  ProjectOption
} from '../types'

interface TaskEditModalProps {
  isOpen: boolean
  onClose: () => void
  editForm: TaskEditForm
  onFormChange: (form: TaskEditForm) => void
  onStartDateChange: (date: string) => void
  onDurationChange: (days: number) => void
  durationDays: number
  projects: ProjectOption[]
  onSave: () => void
}

export function TaskEditModal({
  isOpen,
  onClose,
  editForm,
  onFormChange,
  onStartDateChange,
  onDurationChange,
  durationDays,
  projects,
  onSave,
}: TaskEditModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[95vh] bg-white/95 backdrop-blur-2xl border-white/40 rounded-3xl shadow-2xl flex flex-col overflow-hidden">
        <DialogHeader className="pb-4 border-b border-slate-100 shrink-0">
          <div className="space-y-1">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Task</p>
            <DialogTitle className="text-xl font-bold text-slate-900">작업 수정</DialogTitle>
          </div>
        </DialogHeader>

        <div className="space-y-5 py-6 overflow-y-auto flex-1">
          {/* Title */}
          <div className="space-y-2">
            <Label className="text-xs font-bold text-slate-400 uppercase tracking-wider">작업명</Label>
            <Input
              value={editForm.title}
              onChange={(e) => onFormChange({ ...editForm, title: e.target.value })}
              placeholder="작업명을 입력하세요"
              className="rounded-xl h-11"
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label className="text-xs font-bold text-slate-400 uppercase tracking-wider">설명</Label>
            <Input
              value={editForm.description}
              onChange={(e) => onFormChange({ ...editForm, description: e.target.value })}
              placeholder="작업 설명 (선택사항)"
              className="rounded-xl h-11"
            />
          </div>

          {/* Status */}
          <div className="space-y-2">
            <Label className="text-xs font-bold text-slate-400 uppercase tracking-wider">상태</Label>
            <div className="flex gap-2 flex-wrap">
              {Object.entries(STATUS_ICONS)
                .filter(([key]) => key !== 'all')
                .map(([key, { icon: Icon, label, color }]) => (
                  <button
                    key={key}
                    onClick={() => onFormChange({ ...editForm, status: key as TaskStatus })}
                    className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border transition-all duration-300 ${
                      editForm.status === key
                        ? 'border-lime-400 bg-lime-50 text-black shadow-sm'
                        : 'border-slate-200 hover:border-lime-300 text-slate-600 bg-white/60'
                    }`}
                  >
                    <Icon className={`w-4 h-4 ${editForm.status === key ? 'text-lime-600' : color}`} />
                    <span className="text-sm font-medium">{label}</span>
                  </button>
                ))}
            </div>
          </div>

          {/* Priority */}
          <div className="space-y-2">
            <Label className="text-xs font-bold text-slate-400 uppercase tracking-wider">우선순위</Label>
            <div className="flex gap-2 flex-wrap">
              {Object.entries(PRIORITY_CONFIG).map(([key, { icon: Icon, label, color, bg, border, ring }]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => onFormChange({ ...editForm, priority: key as TaskPriority })}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border transition-all duration-300 ${
                    editForm.priority === key
                      ? `${bg} ${border} ring-2 ${ring} shadow-sm`
                      : 'border-slate-200 hover:border-slate-300 text-slate-600 bg-white/60'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${editForm.priority === key ? color : 'text-slate-400'}`} />
                  <span className={`text-sm font-medium ${editForm.priority === key ? color : ''}`}>{label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Project */}
          <div className="space-y-2">
            <Label className="text-xs font-bold text-slate-400 uppercase tracking-wider">프로젝트</Label>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => onFormChange({ ...editForm, projectId: 'personal' })}
                className={`flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium transition-all ${
                  editForm.projectId === 'personal' || !editForm.projectId
                    ? 'bg-lime-100 text-lime-700 ring-2 ring-lime-400'
                    : 'bg-white/60 text-slate-600 hover:bg-slate-100'
                }`}
              >
                <User className="w-4 h-4" />
                개인 작업
              </button>
              {projects.map(project => (
                <button
                  key={project.id}
                  type="button"
                  onClick={() => onFormChange({ ...editForm, projectId: project.id })}
                  className={`px-3 py-2 rounded-xl text-sm font-medium transition-all ${
                    editForm.projectId === project.id
                      ? 'bg-lime-100 text-lime-700 ring-2 ring-lime-400'
                      : 'bg-white/60 text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  {project.name}
                </button>
              ))}
            </div>
          </div>

          {/* Start Date */}
          <div className="space-y-2">
            <Label className="text-xs font-bold text-slate-400 uppercase tracking-wider">시작일</Label>
            <Input
              type="date"
              value={editForm.startDate}
              onChange={(e) => onStartDateChange(e.target.value)}
              className="rounded-xl h-11"
            />
          </div>

          {/* Duration Slider (shown after start date is selected) */}
          {editForm.startDate && (
            <div className="space-y-4 p-4 bg-slate-50/80 rounded-2xl border border-slate-100">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-bold text-slate-400 uppercase tracking-wider">기간 설정</Label>
                <div className="flex items-center gap-2">
                  <span className="text-2xl font-bold text-lime-600">{formatDuration(durationDays)}</span>
                  <span className="text-xs text-slate-400">({durationDays}일)</span>
                </div>
              </div>

              {/* Slider */}
              <div className="relative pt-2">
                <input
                  type="range"
                  min="1"
                  max="120"
                  value={durationDays}
                  onChange={(e) => onDurationChange(parseInt(e.target.value))}
                  onWheel={(e) => {
                    e.preventDefault()
                    const delta = e.deltaY < 0 ? 1 : -1
                    const newValue = Math.min(120, Math.max(1, durationDays + delta))
                    onDurationChange(newValue)
                  }}
                  className="w-full h-3 bg-slate-200 rounded-full appearance-none cursor-pointer
                    [&::-webkit-slider-thumb]:appearance-none
                    [&::-webkit-slider-thumb]:w-6
                    [&::-webkit-slider-thumb]:h-6
                    [&::-webkit-slider-thumb]:rounded-full
                    [&::-webkit-slider-thumb]:bg-lime-500
                    [&::-webkit-slider-thumb]:shadow-lg
                    [&::-webkit-slider-thumb]:shadow-lime-500/30
                    [&::-webkit-slider-thumb]:cursor-grab
                    [&::-webkit-slider-thumb]:active:cursor-grabbing
                    [&::-webkit-slider-thumb]:hover:bg-lime-400
                    [&::-webkit-slider-thumb]:transition-all
                    [&::-moz-range-thumb]:w-6
                    [&::-moz-range-thumb]:h-6
                    [&::-moz-range-thumb]:rounded-full
                    [&::-moz-range-thumb]:bg-lime-500
                    [&::-moz-range-thumb]:border-0
                    [&::-moz-range-thumb]:shadow-lg
                    [&::-moz-range-thumb]:cursor-grab"
                  style={{
                    background: `linear-gradient(to right, #a3e635 0%, #a3e635 ${(durationDays / 120) * 100}%, #e2e8f0 ${(durationDays / 120) * 100}%, #e2e8f0 100%)`
                  }}
                />
                {/* Slider markers */}
                <div className="flex justify-between mt-2 text-[10px] text-slate-400 font-medium">
                  <span>1일</span>
                  <span>1주</span>
                  <span>10일</span>
                  <span>30일</span>
                  <span>60일</span>
                  <span>90일</span>
                  <span>120일</span>
                </div>
              </div>

              {/* Quick buttons */}
              <div className="flex flex-wrap gap-2">
                {DURATION_OPTIONS.map(({ label, value }) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => onDurationChange(value)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all duration-200 ${
                      durationDays === value
                        ? 'bg-lime-400 text-black shadow-sm'
                        : 'bg-white text-slate-500 hover:bg-lime-50 hover:text-lime-600 border border-slate-200'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>

              {/* Due date display */}
              <div className="flex items-center justify-between pt-3 border-t border-slate-200">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">마감일</span>
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-lime-500" />
                  <span className="text-sm font-semibold text-slate-700">
                    {editForm.dueDate ? new Date(editForm.dueDate).toLocaleDateString('ko-KR', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                      weekday: 'short'
                    }) : '-'}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="pt-4 border-t border-slate-100 shrink-0">
          <Button variant="glass" onClick={onClose} className="rounded-xl">
            취소
          </Button>
          <Button variant="limePrimary" onClick={onSave} className="rounded-xl">
            저장
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
