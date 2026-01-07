'use client'

import React from 'react'
import { motion } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Plus } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useWorkspace, LEGACY_DEPARTMENT_MAP } from '@/lib/workspace-context'
import { NewTaskForm, TaskType, TeamMember } from '../types'

interface TaskModalProps {
  isOpen: boolean
  editingTask: TaskType | null
  newTask: NewTaskForm
  teamMembers: TeamMember[]
  onClose: () => void
  onSave: () => void
  onUpdateForm: (updates: Partial<NewTaskForm>) => void
}

const PRESET_COLORS = [
  '#a3e635', // Lime
  '#ef4444', // Red
  '#10b981', // Emerald
  '#f59e0b', // Amber
  '#8b5cf6', // Violet
  '#6b7280', // Gray
  '#ec4899', // Pink
  '#14b8a6'  // Teal
]

const PRIORITY_OPTIONS = [
  { value: 'low', label: '낮음', activeStyle: 'bg-emerald-100 text-emerald-700 ring-2 ring-emerald-500' },
  { value: 'medium', label: '보통', activeStyle: 'bg-lime-100 text-lime-700 ring-2 ring-lime-500' },
  { value: 'high', label: '높음', activeStyle: 'bg-amber-100 text-amber-700 ring-2 ring-amber-500' },
  { value: 'urgent', label: '긴급', activeStyle: 'bg-rose-100 text-rose-700 ring-2 ring-rose-500' }
]

export function TaskModal({
  isOpen,
  editingTask,
  newTask,
  teamMembers,
  onClose,
  onSave,
  onUpdateForm
}: TaskModalProps) {
  const { departments } = useWorkspace()

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white/90 backdrop-blur-xl rounded-2xl shadow-2xl shadow-black/20 border border-white/40 max-w-md w-full p-6"
      >
        <h3 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
          <div className="p-2 bg-lime-100 rounded-xl">
            <Plus className="w-5 h-5 text-lime-600" />
          </div>
          {editingTask ? '작업 수정' : '새 작업 만들기'}
        </h3>

        <div className="space-y-4">
          {/* Title */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">제목</label>
            <Input
              type="text"
              value={newTask.title}
              onChange={(e) => onUpdateForm({ title: e.target.value })}
              placeholder="작업 제목을 입력하세요"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">설명</label>
            <textarea
              value={newTask.description}
              onChange={(e) => onUpdateForm({ description: e.target.value })}
              rows={3}
              className="w-full px-4 py-2.5 bg-white/60 border border-white/40 rounded-xl focus:ring-2 focus:ring-lime-400 focus:border-transparent transition-all text-sm"
              placeholder="작업 설명을 입력하세요"
            />
          </div>

          {/* Department */}
          <DepartmentSelector
            departments={departments}
            selectedDepartment={newTask.department}
            onSelect={(department) => onUpdateForm({ department })}
          />

          {/* Assignee */}
          <AssigneeSelector
            teamMembers={teamMembers}
            selectedAssignee={newTask.assignee}
            onSelect={(assignee) => onUpdateForm({ assignee })}
          />

          {/* Dates */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">시작일</label>
              <Input
                type="date"
                value={newTask.startDate}
                onChange={(e) => onUpdateForm({ startDate: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">마감일</label>
              <Input
                type="date"
                value={newTask.dueDate}
                onChange={(e) => onUpdateForm({ dueDate: e.target.value })}
              />
            </div>
          </div>

          {/* Priority */}
          <PrioritySelector
            selectedPriority={newTask.priority}
            onSelect={(priority) => onUpdateForm({ priority })}
          />

          {/* Color */}
          <ColorSelector
            selectedColor={newTask.color}
            onSelect={(color) => onUpdateForm({ color })}
          />
        </div>

        {/* Actions */}
        <div className="flex gap-3 mt-6">
          <Button
            variant="glass"
            onClick={onClose}
            className="flex-1 rounded-xl"
          >
            취소
          </Button>
          <Button
            variant="limePrimary"
            onClick={onSave}
            className="flex-1 rounded-xl"
          >
            {editingTask ? '수정' : '생성'}
          </Button>
        </div>
      </motion.div>
    </div>
  )
}

// ===========================================
// Sub Components
// ===========================================

function DepartmentSelector({
  departments,
  selectedDepartment,
  onSelect
}: {
  departments: Array<{ id: string; name: string; color: string }>
  selectedDepartment: string
  onSelect: (department: string) => void
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-slate-700 mb-2">부서</label>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => onSelect('')}
          className={cn(
            "px-3 py-1.5 rounded-lg text-xs font-medium transition-all",
            selectedDepartment === ''
              ? 'bg-slate-100 text-slate-600 ring-2 ring-offset-1 ring-slate-400'
              : 'bg-white/60 text-slate-600 hover:bg-white/80'
          )}
        >
          선택 안함
        </button>
        {departments.length > 0 ? (
          departments.map(dept => (
            <button
              key={dept.id}
              type="button"
              onClick={() => onSelect(dept.id)}
              className={cn(
                "px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5",
                selectedDepartment === dept.id
                  ? 'ring-2 ring-offset-1 ring-slate-400'
                  : 'bg-white/60 text-slate-600 hover:bg-white/80'
              )}
              style={{
                backgroundColor: selectedDepartment === dept.id ? `${dept.color}20` : undefined,
                color: selectedDepartment === dept.id ? dept.color : undefined,
              }}
            >
              <span
                className="w-2 h-2 rounded-full"
                style={{ backgroundColor: dept.color }}
              />
              {dept.name}
            </button>
          ))
        ) : (
          Object.entries(LEGACY_DEPARTMENT_MAP).map(([key, dept]) => (
            <button
              key={key}
              type="button"
              onClick={() => onSelect(key)}
              className={cn(
                "px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5",
                selectedDepartment === key
                  ? 'ring-2 ring-offset-1 ring-slate-400'
                  : 'bg-white/60 text-slate-600 hover:bg-white/80'
              )}
              style={{
                backgroundColor: selectedDepartment === key ? `${dept.color}20` : undefined,
                color: selectedDepartment === key ? dept.color : undefined,
              }}
            >
              <span
                className="w-2 h-2 rounded-full"
                style={{ backgroundColor: dept.color }}
              />
              {dept.name}
            </button>
          ))
        )}
      </div>
    </div>
  )
}

function AssigneeSelector({
  teamMembers,
  selectedAssignee,
  onSelect
}: {
  teamMembers: TeamMember[]
  selectedAssignee: string
  onSelect: (assignee: string) => void
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-slate-700 mb-2">담당자</label>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => onSelect('')}
          className={cn(
            "px-3 py-1.5 rounded-lg text-xs font-medium transition-all",
            selectedAssignee === ''
              ? 'bg-slate-100 text-slate-700 ring-2 ring-offset-1 ring-slate-400'
              : 'bg-white/60 text-slate-600 hover:bg-white/80'
          )}
        >
          할당 안함
        </button>
        {teamMembers?.map((member) => (
          <button
            key={member.userId}
            type="button"
            onClick={() => onSelect(member.userId)}
            className={cn(
              "px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5",
              selectedAssignee === member.userId
                ? 'bg-lime-100 text-lime-700 ring-2 ring-offset-1 ring-lime-500'
                : 'bg-white/60 text-slate-600 hover:bg-white/80'
            )}
          >
            <span className="w-5 h-5 rounded-full bg-gradient-to-br from-slate-200 to-slate-300 flex items-center justify-center text-[10px] font-bold text-slate-600">
              {member.name?.charAt(0) || '?'}
            </span>
            {member.name}
          </button>
        ))}
      </div>
    </div>
  )
}

function PrioritySelector({
  selectedPriority,
  onSelect
}: {
  selectedPriority: string
  onSelect: (priority: 'low' | 'medium' | 'high' | 'urgent') => void
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-slate-700 mb-2">우선순위</label>
      <div className="flex gap-2">
        {PRIORITY_OPTIONS.map(priority => (
          <button
            key={priority.value}
            type="button"
            onClick={() => onSelect(priority.value as 'low' | 'medium' | 'high' | 'urgent')}
            className={cn(
              "flex-1 px-3 py-2 rounded-xl text-sm font-medium transition-all",
              selectedPriority === priority.value
                ? priority.activeStyle
                : 'bg-white/60 text-slate-700 hover:bg-white/80'
            )}
          >
            {priority.label}
          </button>
        ))}
      </div>
    </div>
  )
}

function ColorSelector({
  selectedColor,
  onSelect
}: {
  selectedColor: string
  onSelect: (color: string) => void
}) {
  const isCustomColor = !PRESET_COLORS.includes(selectedColor)

  return (
    <div>
      <label className="block text-sm font-medium text-slate-700 mb-2">색상</label>
      <div className="flex gap-2 items-center">
        {PRESET_COLORS.map(color => (
          <button
            key={color}
            type="button"
            onClick={() => onSelect(color)}
            className={cn(
              "w-8 h-8 rounded-full border-2 transition-all",
              selectedColor === color ? 'border-slate-900 scale-110' : 'border-transparent hover:scale-105'
            )}
            style={{ backgroundColor: color }}
          />
        ))}
        {/* Custom color picker */}
        <div className="relative ml-2">
          <input
            type="color"
            value={selectedColor}
            onChange={(e) => onSelect(e.target.value)}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          />
          <div
            className={cn(
              "w-8 h-8 rounded-full border-2 transition-all flex items-center justify-center",
              isCustomColor ? 'border-slate-900 scale-110' : 'border-dashed border-slate-400 hover:border-slate-600'
            )}
            style={{
              backgroundColor: isCustomColor ? selectedColor : 'transparent'
            }}
          >
            {!isCustomColor && <Plus className="h-4 w-4 text-slate-500" />}
          </div>
        </div>
      </div>
    </div>
  )
}

export default TaskModal
