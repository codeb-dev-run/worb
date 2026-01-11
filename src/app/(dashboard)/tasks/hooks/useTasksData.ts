'use client'

// ===========================================
// Tasks Data Hook
// ===========================================

import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '@/lib/auth-context'
import { useWorkspace } from '@/lib/workspace-context'
import { Task as TaskType, TaskStatus, TaskPriority, KanbanTask } from '@/types/task'
import { getAllTasks, updateTask, deleteTask, createTask, getTrashedTasks, restoreTask, permanentDeleteTask, emptyTrash } from '@/actions/task'
import { getProjects } from '@/actions/project'
import { customToast as toast } from '@/components/notification/NotificationToast'
import { ProjectOption, DEFAULT_COLUMNS, TrashedTask, KanbanColumnWithTasks } from '../types'

const isDev = process.env.NODE_ENV === 'development'

export interface UseTasksDataReturn {
  tasks: TaskType[]
  projects: ProjectOption[]
  loading: boolean
  workspaceLoading: boolean
  currentWorkspace: { id: string } | null
  user: { uid: string } | null
  isAdmin: boolean
  loadData: () => Promise<void>
  handleCreateTask: (title: string, projectId?: string) => Promise<boolean>
  handleStatusChange: (taskId: string, newStatus: TaskStatus) => Promise<void>
  handleUpdateTask: (taskId: string, data: Partial<TaskType>) => Promise<boolean>
  handleKanbanColumnsChange: (newColumns: KanbanColumnWithTasks[]) => Promise<void>
  getFilteredTasks: (filterStatus: string, filterProject: string) => TaskType[]
  getKanbanColumns: (filteredTasks: TaskType[]) => KanbanColumnWithTasks[]
  // Trash management
  trashedTasks: TrashedTask[]
  handleMoveToTrash: (taskId: string) => void
  handleRestoreTask: (taskId: string) => void
  handlePermanentDelete: (taskId: string) => Promise<void>
  handleEmptyTrash: () => Promise<void>
}

export function useTasksData(): UseTasksDataReturn {
  const { user, userProfile } = useAuth()
  const { currentWorkspace, loading: workspaceLoading, isAdmin } = useWorkspace()

  const [tasks, setTasks] = useState<TaskType[]>([])
  const [projects, setProjects] = useState<ProjectOption[]>([])
  const [loading, setLoading] = useState(true)
  const [trashedTasks, setTrashedTasks] = useState<TrashedTask[]>([])

  // Load trash data from server
  const loadTrashedTasks = useCallback(async () => {
    if (!userProfile || !currentWorkspace) return

    try {
      const trashed = await getTrashedTasks(userProfile.uid, currentWorkspace.id)
      setTrashedTasks(trashed as unknown as TrashedTask[])
    } catch (e) {
      if (isDev) console.error('Failed to load trashed tasks:', e)
    }
  }, [userProfile, currentWorkspace])

  const loadData = useCallback(async () => {
    if (!userProfile || !currentWorkspace) return

    try {
      if (isDev) console.log('[TasksPage] Loading data for workspace:', currentWorkspace.id)
      const [tasksData, projectsData, trashedData] = await Promise.all([
        getAllTasks(userProfile.uid, currentWorkspace.id),
        getProjects(userProfile.uid, currentWorkspace.id),
        getTrashedTasks(userProfile.uid, currentWorkspace.id)
      ])

      if (isDev) console.log('[TasksPage] Loaded tasks:', tasksData.length)
      if (isDev) console.log('[TasksPage] Loaded projects:', projectsData.length)
      if (isDev) console.log('[TasksPage] Loaded trashed:', trashedData.length)

      setTasks(tasksData as unknown as TaskType[])
      setProjects(projectsData as ProjectOption[])
      setTrashedTasks(trashedData as unknown as TrashedTask[])
    } catch (error) {
      if (isDev) console.error('Error loading tasks data:', error)
      toast.error('데이터를 불러오는데 실패했습니다.')
    } finally {
      setLoading(false)
    }
  }, [userProfile, currentWorkspace])

  // Initial data load with cleanup
  useEffect(() => {
    let cancelled = false

    if (!workspaceLoading) {
      if (userProfile && currentWorkspace) {
        loadData().then(() => {
          if (cancelled) return
        })
      } else {
        setLoading(false)
      }
    }

    return () => {
      cancelled = true
    }
  }, [userProfile, currentWorkspace, workspaceLoading, loadData])

  const handleCreateTask = useCallback(async (title: string, projectId?: string): Promise<boolean> => {
    if (!title.trim() || !userProfile) return false

    try {
      const result = await createTask(projectId || '', {
        title,
        status: 'todo' as TaskStatus,
        priority: 'medium' as TaskPriority,
        createdBy: userProfile.uid,
      })

      if (result.success) {
        toast.success('작업이 생성되었습니다.')
        loadData()
        return true
      }
      throw new Error('Create failed')
    } catch (error) {
      if (isDev) console.error('[TasksPage] Error creating task:', error)
      toast.error('작업 생성 실패')
      return false
    }
  }, [userProfile, loadData])

  const handleStatusChange = useCallback(async (taskId: string, newStatus: TaskStatus) => {
    try {
      const result = await updateTask(taskId, { status: newStatus })
      if (result.success) {
        toast.success('상태가 업데이트되었습니다.')
        loadData()
      } else {
        throw new Error('Update failed')
      }
    } catch (error) {
      if (isDev) console.error('Error updating task:', error)
      toast.error('상태 업데이트 실패')
    }
  }, [loadData])

  const handleUpdateTask = useCallback(async (taskId: string, data: Partial<TaskType>): Promise<boolean> => {
    try {
      const result = await updateTask(taskId, data)
      if (result.success) {
        toast.success('작업이 수정되었습니다.')
        loadData()
        return true
      }
      throw new Error('Update failed')
    } catch (error) {
      if (isDev) console.error('Error updating task:', error)
      toast.error('수정 실패')
      return false
    }
  }, [loadData])

  const handleKanbanColumnsChange = useCallback(async (newColumns: KanbanColumnWithTasks[]) => {
    const allTasks = newColumns.flatMap(col => col.tasks)
    const updates: Promise<unknown>[] = []

    newColumns.forEach(column => {
      column.tasks.forEach((task: KanbanTask) => {
        const originalTask = tasks.find(t => t.id === task.id)
        if (originalTask && originalTask.status !== column.id) {
          updates.push(updateTask(task.id, {
            status: column.id as TaskStatus,
            columnId: column.id
          }))
        }
      })
    })

    setTasks(allTasks)

    try {
      await Promise.all(updates)
      toast.success('작업 상태가 업데이트되었습니다.')
    } catch (error) {
      if (isDev) console.error('Failed to update tasks:', error)
      toast.error('작업 업데이트 실패')
      loadData()
    }
  }, [tasks, loadData])

  // Trash handlers - Server-side soft delete
  const handleMoveToTrash = useCallback(async (taskId: string) => {
    try {
      const result = await deleteTask(taskId)
      if (result.success) {
        // Refresh data from server
        loadData()
        toast.success('휴지통으로 이동되었습니다.')
      } else {
        throw new Error('Delete failed')
      }
    } catch (error) {
      if (isDev) console.error('Error moving to trash:', error)
      toast.error('휴지통 이동 실패')
    }
  }, [loadData])

  const handleRestoreTask = useCallback(async (taskId: string) => {
    try {
      const result = await restoreTask(taskId)
      if (result.success) {
        // Refresh data from server
        loadData()
        toast.success('작업이 복원되었습니다.')
      } else {
        throw new Error('Restore failed')
      }
    } catch (error) {
      if (isDev) console.error('Error restoring task:', error)
      toast.error('복원 실패')
    }
  }, [loadData])

  const handlePermanentDelete = useCallback(async (taskId: string) => {
    try {
      const result = await permanentDeleteTask(taskId)
      if (result.success) {
        // Refresh data from server
        loadData()
        toast.success('영구 삭제되었습니다.')
      } else {
        throw new Error('Delete failed')
      }
    } catch (error) {
      if (isDev) console.error('Error deleting task:', error)
      toast.error('삭제 실패')
    }
  }, [loadData])

  const handleEmptyTrash = useCallback(async () => {
    if (trashedTasks.length === 0) return
    if (!userProfile || !currentWorkspace) return

    try {
      const result = await emptyTrash(userProfile.uid, currentWorkspace.id)
      if (result.success) {
        setTrashedTasks([])
        toast.success('휴지통을 비웠습니다.')
      } else {
        throw new Error('Empty trash failed')
      }
    } catch (error) {
      if (isDev) console.error('Error emptying trash:', error)
      toast.error('휴지통 비우기 실패')
    }
  }, [trashedTasks.length, userProfile, currentWorkspace])

  const getFilteredTasks = useCallback((filterStatus: string, filterProject: string): TaskType[] => {
    return tasks
      .filter(task => {
        if (filterStatus !== 'all' && task.status !== filterStatus) return false
        if (filterProject !== 'all') {
          if (filterProject === 'personal') {
            return !task.projectId
          }
          return task.projectId === filterProject
        }
        return true
      })
      .sort((a, b) => {
        const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0
        const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0
        return dateB - dateA
      })
  }, [tasks])

  const getKanbanColumns = useCallback((filteredTasks: TaskType[]): KanbanColumnWithTasks[] => {
    return DEFAULT_COLUMNS.map(col => ({
      ...col,
      tasks: filteredTasks
        .filter(task => (task.status === col.id) || (col.id === 'todo' && !['in_progress', 'review', 'done'].includes(task.status)))
        .map(task => ({
          ...task,
          columnId: col.id,
          checklist: task.checklist || [],
          attachments: task.attachments || [],
          labels: task.labels || []
        })) as KanbanTask[]
    }))
  }, [])

  return {
    tasks,
    projects,
    loading,
    workspaceLoading,
    currentWorkspace,
    user,
    isAdmin,
    loadData,
    handleCreateTask,
    handleStatusChange,
    handleUpdateTask,
    handleKanbanColumnsChange,
    getFilteredTasks,
    getKanbanColumns,
    trashedTasks,
    handleMoveToTrash,
    handleRestoreTask,
    handlePermanentDelete,
    handleEmptyTrash,
  }
}
