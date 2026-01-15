'use client'

import { useState, useCallback } from 'react'
import { TaskType, NewTaskForm, INITIAL_TASK_FORM } from '../types'

interface UseTaskModalReturn {
  showTaskModal: boolean
  selectedColumnId: string
  editingTask: TaskType | null
  newTask: NewTaskForm

  openCreateModal: (columnId: string) => void
  openEditModal: (task: TaskType) => void
  closeModal: () => void
  updateTaskForm: (updates: Partial<NewTaskForm>) => void
  resetForm: () => void
}

export function useTaskModal(): UseTaskModalReturn {
  const [showTaskModal, setShowTaskModal] = useState(false)
  const [selectedColumnId, setSelectedColumnId] = useState<string>('todo')
  const [editingTask, setEditingTask] = useState<TaskType | null>(null)
  const [newTask, setNewTask] = useState<NewTaskForm>(INITIAL_TASK_FORM)

  const openCreateModal = useCallback((columnId: string) => {
    setSelectedColumnId(columnId)
    setEditingTask(null)
    setNewTask(INITIAL_TASK_FORM)
    setShowTaskModal(true)
  }, [])

  const openEditModal = useCallback((task: TaskType) => {
    setEditingTask(task)
    setShowTaskModal(true)
    setSelectedColumnId(task.columnId || task.status as string)
    setNewTask({
      title: task.title,
      description: task.description || '',
      assignee: task.assigneeId || '',
      dueDate: task.dueDate ? new Date(task.dueDate).toISOString().split('T')[0] : '',
      startDate: task.startDate ? new Date(task.startDate).toISOString().split('T')[0] : '',
      priority: (task.priority as string).toLowerCase() as 'low' | 'medium' | 'high' | 'urgent',
      department: task.department || (task as { teamId?: string }).teamId || '',
      color: task.color || '#a3e635',
      progress: task.progress ?? 0
    })
  }, [])

  const closeModal = useCallback(() => {
    setShowTaskModal(false)
    setEditingTask(null)
    setNewTask(INITIAL_TASK_FORM)
  }, [])

  const updateTaskForm = useCallback((updates: Partial<NewTaskForm>) => {
    setNewTask(prev => ({ ...prev, ...updates }))
  }, [])

  const resetForm = useCallback(() => {
    setNewTask(INITIAL_TASK_FORM)
  }, [])

  return {
    showTaskModal,
    selectedColumnId,
    editingTask,
    newTask,
    openCreateModal,
    openEditModal,
    closeModal,
    updateTaskForm,
    resetForm
  }
}
