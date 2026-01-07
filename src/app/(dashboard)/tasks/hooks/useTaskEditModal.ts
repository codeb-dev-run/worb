'use client'

// ===========================================
// Task Edit Modal Hook
// ===========================================

import { useState, useCallback } from 'react'
import { Task as TaskType, TaskStatus, TaskPriority } from '@/types/task'
import { TaskEditForm, INITIAL_EDIT_FORM } from '../types'

export interface UseTaskEditModalReturn {
  editingTask: TaskType | null
  isEditModalOpen: boolean
  editForm: TaskEditForm
  durationDays: number
  openEditModal: (task: TaskType) => void
  closeEditModal: () => void
  setEditForm: React.Dispatch<React.SetStateAction<TaskEditForm>>
  handleStartDateChange: (newStartDate: string) => void
  handleDurationChange: (days: number) => void
}

export function useTaskEditModal(): UseTaskEditModalReturn {
  const [editingTask, setEditingTask] = useState<TaskType | null>(null)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [editForm, setEditForm] = useState<TaskEditForm>(INITIAL_EDIT_FORM)
  const [durationDays, setDurationDays] = useState(7)

  const openEditModal = useCallback((task: TaskType) => {
    setEditingTask(task)

    const today = new Date().toISOString().split('T')[0]
    const startDate = task.startDate
      ? new Date(task.startDate).toISOString().split('T')[0]
      : today

    let dueDate = ''
    let days = 7

    if (task.startDate && task.dueDate) {
      dueDate = new Date(task.dueDate).toISOString().split('T')[0]
      const start = new Date(task.startDate)
      const end = new Date(task.dueDate)
      const diffDays = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24))
      days = Math.min(Math.max(diffDays, 1), 120)
    } else if (task.dueDate) {
      dueDate = new Date(task.dueDate).toISOString().split('T')[0]
    } else {
      const endDate = new Date(today)
      endDate.setDate(endDate.getDate() + 7)
      dueDate = endDate.toISOString().split('T')[0]
    }

    setDurationDays(days)

    setEditForm({
      title: task.title,
      description: task.description || '',
      projectId: task.projectId || 'personal',
      status: task.status as TaskStatus,
      priority: task.priority as TaskPriority,
      startDate,
      dueDate,
    })
    setIsEditModalOpen(true)
  }, [])

  const closeEditModal = useCallback(() => {
    setIsEditModalOpen(false)
    setEditingTask(null)
  }, [])

  const handleStartDateChange = useCallback((newStartDate: string) => {
    if (newStartDate) {
      const start = new Date(newStartDate)
      const end = new Date(start)
      end.setDate(end.getDate() + durationDays)
      setEditForm(prev => ({
        ...prev,
        startDate: newStartDate,
        dueDate: end.toISOString().split('T')[0]
      }))
    } else {
      setEditForm(prev => ({ ...prev, startDate: newStartDate }))
    }
  }, [durationDays])

  const handleDurationChange = useCallback((days: number) => {
    setDurationDays(days)
    setEditForm(prev => {
      if (prev.startDate) {
        const start = new Date(prev.startDate)
        const end = new Date(start)
        end.setDate(end.getDate() + days)
        return {
          ...prev,
          dueDate: end.toISOString().split('T')[0]
        }
      }
      return prev
    })
  }, [])

  return {
    editingTask,
    isEditModalOpen,
    editForm,
    durationDays,
    openEditModal,
    closeEditModal,
    setEditForm,
    handleStartDateChange,
    handleDurationChange,
  }
}
