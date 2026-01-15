'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useParams } from 'next/navigation'
import { useAuth } from '@/lib/auth-context'
import { useWorkspace } from '@/lib/workspace-context'
import { useCentrifugo } from '@/components/providers/centrifugo-provider'
import { getProject } from '@/actions/project'
import { getTasks, createTask, updateTask, deleteTask, updateTasksOrder } from '@/actions/task'
import { getActivities, addActivity } from '@/actions/activity'
import { toast } from 'react-hot-toast'
import {
  ProjectDetail,
  Activity,
  TaskType,
  KanbanColumnWithTasks,
  TaskStatus,
  TaskPriority,
  getColumnIdFromStatus,
  NewTaskForm,
  INITIAL_TASK_FORM
} from '../types'

const isDev = process.env.NODE_ENV === 'development'

interface UseProjectDataReturn {
  // Data
  project: ProjectDetail | null
  tasks: TaskType[]
  activities: Activity[]
  loading: boolean

  // Computed
  calculatedProgress: number
  isProjectMember: boolean
  isProjectAdmin: boolean

  // Actions
  loadProjectData: () => Promise<void>
  handleColumnsChange: (newColumns: KanbanColumnWithTasks[]) => Promise<void>
  handleCreateTask: (newTask: NewTaskForm, selectedColumnId: string, editingTask: TaskType | null) => Promise<boolean>
  handleTaskDelete: (taskId: string) => Promise<void>
  handleInlineTaskCreate: (columnId: string, title: string) => Promise<TaskType | null>
  handleGanttTaskChange: (ganttTask: { id: string; name: string; start: Date; end: Date; progress: number; styles?: { progressColor?: string } }) => Promise<void>
  handleGanttDateChange: (ganttTask: { id: string; start: Date; end: Date }) => Promise<void>
  handleGanttProgressChange: (ganttTask: { id: string; progress: number }) => Promise<void>
  handleGanttTaskDelete: (ganttTask: { id: string }) => Promise<void>
  setTasks: React.Dispatch<React.SetStateAction<TaskType[]>>
}

export function useProjectData(): UseProjectDataReturn {
  const params = useParams()
  const { user, userProfile } = useAuth()
  const { isAdmin: isWorkspaceAdmin } = useWorkspace()
  const { subscribe, publish } = useCentrifugo()

  const [project, setProject] = useState<ProjectDetail | null>(null)
  const [tasks, setTasks] = useState<TaskType[]>([])
  const [activities, setActivities] = useState<Activity[]>([])
  const [loading, setLoading] = useState(true)

  // Use ref to track if we're currently updating to prevent loops
  const isUpdatingRef = useRef(false)

  // Calculate progress locally based on tasks (real-time update)
  const calculatedProgress = tasks.length === 0
    ? 0
    : Math.round((tasks.filter(t => t.columnId === 'done' || t.status === 'done').length / tasks.length) * 100)

  // Check if current user is project member (any role)
  const isProjectMember = project?.teamMembers?.some(
    (member) => member.userId === user?.uid
  ) ?? false

  // Check if current user is project admin (프로젝트 Admin 역할 OR 워크스페이스 관리자)
  const isProjectAdmin = isWorkspaceAdmin || (project?.teamMembers?.some(
    (member) => member.userId === user?.uid && member.role === 'Admin'
  ) ?? false)

  // Extract id once to avoid dependency on params object
  const projectId = params?.id as string | undefined

  const loadProjectData = useCallback(async () => {
    if (!projectId) return

    try {
      setLoading(true)
      const [projectData, tasksData, activitiesData] = await Promise.all([
        getProject(projectId),
        getTasks(projectId),
        getActivities(projectId)
      ])

      if (projectData) {
        setProject(projectData as unknown as ProjectDetail)
      }

      // Ensure all tasks have columnId
      const tasksWithColumnId = (tasksData as unknown as TaskType[]).map(task => ({
        ...task,
        columnId: task.columnId || getColumnIdFromStatus(task.status as string)
      }))

      if (isDev) console.log('loadProjectData: Received tasks:', tasksWithColumnId.length)

      setTasks(tasksWithColumnId)
      setActivities(activitiesData as unknown as Activity[])
    } catch (error) {
      if (isDev) console.error('Failed to load project data:', error)
      toast.error('프로젝트 데이터를 불러오는데 실패했습니다.')
    } finally {
      setLoading(false)
    }
  }, [projectId])

  // Initial data load
  useEffect(() => {
    loadProjectData()
  }, [loadProjectData])

  // Centrifugo real-time collaboration
  useEffect(() => {
    if (!projectId) return

    let cancelled = false

    const unsubscribe = subscribe(`project:${projectId}`, (data: { event: string; userId: string }) => {
      if (isDev) console.log('Received Centrifugo event:', data)

      // Handle task move events from other users
      if (data.event === 'task-moved' && data.userId !== user?.uid && !cancelled) {
        loadProjectData()
      }
    })

    return () => {
      cancelled = true
      unsubscribe()
    }
  }, [projectId, subscribe, user?.uid, loadProjectData])

  const handleColumnsChange = useCallback(async (newColumns: KanbanColumnWithTasks[]) => {
    if (isDev) console.log('handleColumnsChange called', { isUpdating: isUpdatingRef.current })

    if (isUpdatingRef.current) {
      if (isDev) console.log('Already updating, skipping')
      return
    }

    isUpdatingRef.current = true

    try {
      const allTasks = newColumns.flatMap(col => col.tasks)

      const taskUpdates: Array<{ id: string; columnId: string; order: number }> = []
      newColumns.forEach((column: KanbanColumnWithTasks) => {
        column.tasks.forEach((task: TaskType, index: number) => {
          const originalTask = tasks.find(t => t.id === task.id)
          if (originalTask && (originalTask.columnId !== column.id || originalTask.order !== index)) {
            taskUpdates.push({
              id: task.id,
              columnId: column.id,
              order: index
            })
          }
        })
      })

      if (isDev) console.log('Task updates:', taskUpdates)

      if (taskUpdates.length > 0 && user && project) {
        // Update local state first for immediate feedback
        setTasks(allTasks)

        // Then update server
        const result = await updateTasksOrder(project.id, taskUpdates)
        if (isDev) console.log('Update result:', result)

        // Log activities
        for (const update of taskUpdates) {
          const task = allTasks.find(t => t.id === update.id)
          const newColumn = newColumns.find(c => c.id === update.columnId)
          if (task && newColumn) {
            await addActivity(project.id, {
              type: 'task',
              message: `"${task.title}" 작업을 "${newColumn.title}"(으)로 이동`,
              userId: user.uid,
              userName: userProfile?.displayName || '알 수 없음',
              icon: '📋'
            })
          }
        }

        toast.success('작업이 이동되었습니다.')

        // Notify other users via Centrifugo
        if (project) {
          publish(`project:${project.id}`, {
            event: 'task-moved',
            projectId: project.id,
            updates: taskUpdates,
            userId: user.uid
          })
        }
      }
    } catch (error) {
      if (isDev) console.error('Failed to update tasks:', error)
      toast.error('작업 업데이트에 실패했습니다.')
      // Reload data on error
      await loadProjectData()
    } finally {
      isUpdatingRef.current = false
    }
  }, [tasks, user, userProfile, project, publish, loadProjectData])

  const handleCreateTask = useCallback(async (
    newTask: NewTaskForm,
    selectedColumnId: string,
    editingTask: TaskType | null
  ): Promise<boolean> => {
    if (!project || !user) return false
    if (!newTask.title.trim()) {
      toast.error('작업 제목을 입력해주세요.')
      return false
    }

    try {
      if (editingTask) {
        const result = await updateTask(editingTask.id, {
          title: newTask.title,
          description: newTask.description,
          priority: newTask.priority as TaskPriority,
          startDate: newTask.startDate ? new Date(newTask.startDate) : undefined,
          dueDate: newTask.dueDate ? new Date(newTask.dueDate) : undefined,
          assigneeId: newTask.assignee || null,
          teamId: newTask.department || null,
          color: newTask.color,
          progress: newTask.progress ?? 0
        })

        if (result.success) {
          toast.success('작업이 수정되었습니다.')
          await addActivity(project.id, {
            type: 'task',
            message: `작업 "${newTask.title}" 수정`,
            userId: user.uid,
            userName: userProfile?.displayName || '알 수 없음',
            icon: '✏️'
          })
          await loadProjectData()
          return true
        }
      } else {
        const result = await createTask(project.id, {
          title: newTask.title,
          description: newTask.description,
          status: selectedColumnId as TaskStatus,
          priority: newTask.priority as TaskPriority,
          startDate: newTask.startDate ? new Date(newTask.startDate) : undefined,
          dueDate: newTask.dueDate ? new Date(newTask.dueDate) : undefined,
          assigneeId: newTask.assignee || undefined,
          createdBy: user.uid,
          columnId: selectedColumnId,
          order: tasks.filter(t => t.columnId === selectedColumnId).length,
          teamId: newTask.department || undefined,
          color: newTask.color,
          progress: newTask.progress ?? 0
        })

        if (result.success) {
          toast.success('작업이 생성되었습니다.')
          await addActivity(project.id, {
            type: 'task',
            message: `새 작업 "${newTask.title}" 생성`,
            userId: user.uid,
            userName: userProfile?.displayName || '알 수 없음',
            icon: '✅'
          })
          await loadProjectData()
          return true
        }
      }
    } catch (error) {
      if (isDev) console.error('Error saving task:', error)
      toast.error('작업 저장 중 오류가 발생했습니다.')
    }
    return false
  }, [project, user, userProfile, tasks, loadProjectData])

  const handleTaskDelete = useCallback(async (taskId: string) => {
    if (!user || !project) return

    try {
      await deleteTask(taskId)
      await addActivity(project.id, {
        type: 'task',
        message: '작업을 삭제했습니다',
        userId: user.uid,
        userName: userProfile?.displayName || '알 수 없음',
        icon: '🗑️'
      })
      await loadProjectData()
    } catch (error) {
      if (isDev) console.error('Failed to delete task:', error)
      toast.error('작업 삭제에 실패했습니다.')
    }
  }, [user, userProfile, project, loadProjectData])

  const handleInlineTaskCreate = useCallback(async (columnId: string, title: string): Promise<TaskType | null> => {
    if (!user || !project) return null

    try {
      const result = await createTask(project.id, {
        title,
        description: '',
        status: columnId as TaskStatus,
        priority: TaskPriority.MEDIUM,
        createdBy: user.uid,
        columnId,
        order: tasks.filter(t => t.columnId === columnId || t.status === columnId).length,
      })

      if (result.success && result.task) {
        toast.success('작업이 생성되었습니다.')

        await addActivity(project.id, {
          type: 'task',
          message: `작업 "${title}" 생성`,
          userId: user.uid,
          userName: userProfile?.displayName || '알 수 없음',
          icon: '➕'
        })

        // Convert server response to KanbanTask format
        const newTask: TaskType = {
          id: result.task.id,
          projectId: result.task.projectId || project.id,
          title: result.task.title,
          description: result.task.description || '',
          columnId: result.task.columnId || columnId,
          order: result.task.order || 0,
          priority: result.task.priority as TaskPriority,
          status: result.task.status as TaskStatus,
          department: (result.task as { teamId?: string }).teamId,
          assignee: '',
          labels: result.task.labels || [],
          checklist: [],
          attachments: [],
          attachmentCount: 0,
          commentCount: 0,
          createdAt: new Date(result.task.createdAt),
          updatedAt: new Date(result.task.updatedAt),
          createdBy: result.task.createdBy,
        }

        // Update tasks state
        setTasks(prev => [...prev, newTask])

        return newTask
      } else {
        toast.error(result.error || '작업 생성에 실패했습니다.')
        return null
      }
    } catch (error) {
      if (isDev) console.error('Failed to create task:', error)
      toast.error('작업 생성 중 오류가 발생했습니다.')
      return null
    }
  }, [user, userProfile, project, tasks])

  // Gantt chart handlers
  const handleGanttTaskChange = useCallback(async (ganttTask: {
    id: string
    name: string
    start: Date
    end: Date
    progress: number
    styles?: { progressColor?: string }
  }) => {
    const originalTask = tasks.find(t => t.id === ganttTask.id)
    if (!originalTask) return

    try {
      const result = await updateTask(ganttTask.id, {
        title: ganttTask.name,
        startDate: ganttTask.start,
        dueDate: ganttTask.end,
        progress: ganttTask.progress,
        color: ganttTask.styles?.progressColor || originalTask.color,
      })

      if (result.success) {
        toast.success('작업이 수정되었습니다.')
        await loadProjectData()
      } else {
        toast.error('작업 수정에 실패했습니다.')
      }
    } catch (error) {
      if (isDev) console.error('Failed to update task:', error)
      toast.error('오류가 발생했습니다.')
    }
  }, [tasks, loadProjectData])

  const handleGanttDateChange = useCallback(async (ganttTask: { id: string; start: Date; end: Date }) => {
    try {
      const result = await updateTask(ganttTask.id, {
        startDate: ganttTask.start,
        dueDate: ganttTask.end,
      })

      if (result.success) {
        toast.success('일정이 변경되었습니다.')
        await loadProjectData()
      } else {
        toast.error('일정 변경에 실패했습니다.')
      }
    } catch (error) {
      if (isDev) console.error('Failed to update task date:', error)
      toast.error('오류가 발생했습니다.')
    }
  }, [loadProjectData])

  const handleGanttProgressChange = useCallback(async (ganttTask: { id: string; progress: number }) => {
    try {
      const result = await updateTask(ganttTask.id, {
        progress: ganttTask.progress,
      })

      if (result.success) {
        toast.success('진행률이 변경되었습니다.')
        await loadProjectData()
      } else {
        toast.error('진행률 변경에 실패했습니다.')
      }
    } catch (error) {
      if (isDev) console.error('Failed to update task progress:', error)
      toast.error('오류가 발생했습니다.')
    }
  }, [loadProjectData])

  const handleGanttTaskDelete = useCallback(async (ganttTask: { id: string }) => {
    try {
      await deleteTask(ganttTask.id)
      toast.success('작업이 삭제되었습니다.')
      await loadProjectData()
    } catch (error) {
      if (isDev) console.error('Failed to delete task:', error)
      toast.error('작업 삭제에 실패했습니다.')
    }
  }, [loadProjectData])

  return {
    project,
    tasks,
    activities,
    loading,
    calculatedProgress,
    isProjectMember,
    isProjectAdmin,
    loadProjectData,
    handleColumnsChange,
    handleCreateTask,
    handleTaskDelete,
    handleInlineTaskCreate,
    handleGanttTaskChange,
    handleGanttDateChange,
    handleGanttProgressChange,
    handleGanttTaskDelete,
    setTasks
  }
}
