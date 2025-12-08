'use client'

import React, { useState, useEffect, useCallback, useRef } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { KanbanBoardPro } from '@/components/kanban'
import KanbanCardModal from '@/components/kanban/KanbanCardModal'
import { KanbanTask, TaskPriority, TaskStatus } from '@/types/task'
import { KanbanCard } from '@/types/project'
import { useAuth } from '@/lib/auth-context'
import { getTasks, createTask, updateTask, deleteTask, updateTasksOrder } from '@/actions/task'
import { getProject } from '@/actions/project'
import { addActivity } from '@/actions/activity'
import { toast } from 'react-hot-toast'
import { Loader2 } from 'lucide-react'

// 기본 칸반 컬럼 설정
const DEFAULT_COLUMNS = [
  { id: 'todo', title: '할 일', color: '#ef4444', limit: 10 },
  { id: 'in_progress', title: '진행 중', color: '#eab308', limit: 5 },
  { id: 'review', title: '검토', color: '#8b5cf6' },
  { id: 'done', title: '완료', color: '#10b981' }
]

interface KanbanColumnWithTasks {
  id: string
  title: string
  color: string
  limit?: number
  tasks: KanbanTask[]
}

// Status to columnId mapping
const getColumnIdFromStatus = (status: string): string => {
  const statusMap: Record<string, string> = {
    'TODO': 'todo',
    'todo': 'todo',
    'IN_PROGRESS': 'in_progress',
    'in_progress': 'in_progress',
    'REVIEW': 'review',
    'review': 'review',
    'DONE': 'done',
    'done': 'done',
    'COMPLETED': 'done'
  }
  return statusMap[status] || 'todo'
}

export default function KanbanPage() {
  const params = useParams()
  const projectId = params?.id as string
  const { user, userProfile } = useAuth()

  const [tasks, setTasks] = useState<KanbanTask[]>([])
  const [columns, setColumns] = useState<KanbanColumnWithTasks[]>([])
  const [selectedTask, setSelectedTask] = useState<KanbanTask | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [loading, setLoading] = useState(true)
  const [projectName, setProjectName] = useState<string>('')

  // 업데이트 중복 방지용 ref
  const isUpdatingRef = useRef(false)

  // 데이터 로드 함수
  const loadData = useCallback(async () => {
    if (!projectId) return

    try {
      setLoading(true)
      const [tasksData, projectData] = await Promise.all([
        getTasks(projectId),
        getProject(projectId)
      ])

      if (projectData) {
        setProjectName(projectData.name)
      }

      // 작업 데이터에 columnId 매핑
      const tasksWithColumnId = (tasksData as any[]).map(task => ({
        ...task,
        columnId: task.columnId || getColumnIdFromStatus(task.status),
        // KanbanTask 타입에 맞게 변환
        priority: task.priority as TaskPriority,
        status: task.status as TaskStatus,
        department: task.department || task.teamId,
      }))

      setTasks(tasksWithColumnId)

      // 컬럼에 작업 배치
      const columnsWithTasks: KanbanColumnWithTasks[] = DEFAULT_COLUMNS.map(col => ({
        ...col,
        tasks: tasksWithColumnId
          .filter(task => task.columnId === col.id)
          .sort((a, b) => (a.order || 0) - (b.order || 0))
      }))

      setColumns(columnsWithTasks)
    } catch (error) {
      console.error('Failed to load kanban data:', error)
      toast.error('칸반 데이터를 불러오는데 실패했습니다.')
    } finally {
      setLoading(false)
    }
  }, [projectId])

  useEffect(() => {
    loadData()
  }, [loadData])

  // 컬럼 변경 핸들러 (드래그 앤 드롭)
  const handleColumnsChange = useCallback(async (newColumns: KanbanColumnWithTasks[]) => {
    if (isUpdatingRef.current) return
    isUpdatingRef.current = true

    try {
      const allTasks = newColumns.flatMap(col => col.tasks)

      // 변경된 작업 찾기
      const taskUpdates: Array<{ id: string; columnId: string; order: number }> = []
      newColumns.forEach((column) => {
        column.tasks.forEach((task, index) => {
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

      if (taskUpdates.length > 0 && user) {
        // 로컬 상태 먼저 업데이트 (즉각적 피드백)
        setColumns(newColumns)
        setTasks(allTasks)

        // 서버에 업데이트
        const result = await updateTasksOrder(projectId, taskUpdates)

        if (result.success) {
          // 활동 로그 기록
          for (const update of taskUpdates) {
            const task = allTasks.find(t => t.id === update.id)
            const newColumn = newColumns.find(c => c.id === update.columnId)
            if (task && newColumn) {
              await addActivity(projectId, {
                type: 'task',
                message: `"${task.title}" 작업을 "${newColumn.title}"(으)로 이동`,
                userId: user.uid,
                userName: userProfile?.displayName || '알 수 없음',
                icon: '📋'
              })
            }
          }
          toast.success('작업이 이동되었습니다.')
        } else {
          toast.error('작업 이동에 실패했습니다.')
          await loadData() // 실패 시 데이터 다시 로드
        }
      }
    } catch (error) {
      console.error('Failed to update tasks:', error)
      toast.error('작업 업데이트에 실패했습니다.')
      await loadData()
    } finally {
      isUpdatingRef.current = false
    }
  }, [tasks, user, userProfile, projectId, loadData])

  const handleTaskAdd = (columnId: string) => {
    console.log('Add task to column:', columnId)
  }

  const handleTaskEdit = (task: KanbanTask) => {
    setSelectedTask(task)
    setIsModalOpen(true)
  }

  // 작업 수정 핸들러
  const handleTaskUpdate = async (updatedCard: KanbanCard) => {
    if (!user || !selectedTask) return

    try {
      // 실제 DB ID로 업데이트 (임시 ID가 아닌 경우만)
      const isTemporaryId = selectedTask.id.startsWith('task-') && /^task-\d+$/.test(selectedTask.id)

      if (isTemporaryId) {
        toast.error('임시 작업은 수정할 수 없습니다. 먼저 저장해주세요.')
        return
      }

      const result = await updateTask(selectedTask.id, {
        title: updatedCard.title,
        description: updatedCard.description || '',
        priority: updatedCard.priority as TaskPriority,
        dueDate: updatedCard.dueDate ? new Date(updatedCard.dueDate) : undefined,
        teamId: (updatedCard as any).department || null,
      })

      if (result.success) {
        toast.success('작업이 수정되었습니다.')

        await addActivity(projectId, {
          type: 'task',
          message: `작업 "${updatedCard.title}" 수정`,
          userId: user.uid,
          userName: userProfile?.displayName || '알 수 없음',
          icon: '✏️'
        })

        setIsModalOpen(false)
        setSelectedTask(null)
        await loadData() // 데이터 다시 로드
      } else {
        toast.error(result.error || '작업 수정에 실패했습니다.')
      }
    } catch (error) {
      console.error('Failed to update task:', error)
      toast.error('작업 수정 중 오류가 발생했습니다.')
    }
  }

  // 작업 삭제 핸들러
  const handleTaskDelete = async (taskId: string, columnId: string) => {
    if (!user) return

    try {
      // 임시 ID인 경우 로컬에서만 삭제
      const isTemporaryId = taskId.startsWith('task-') && /^task-\d+$/.test(taskId)

      if (isTemporaryId) {
        setColumns(prev => prev.map(col => ({
          ...col,
          tasks: col.tasks.filter(task => task.id !== taskId)
        })))
        toast.success('작업이 삭제되었습니다.')
        return
      }

      const taskToDelete = tasks.find(t => t.id === taskId)

      const result = await deleteTask(taskId)

      if (result.success) {
        toast.success('작업이 삭제되었습니다.')

        if (taskToDelete) {
          await addActivity(projectId, {
            type: 'task',
            message: `작업 "${taskToDelete.title}" 삭제`,
            userId: user.uid,
            userName: userProfile?.displayName || '알 수 없음',
            icon: '🗑️'
          })
        }

        await loadData() // 데이터 다시 로드
      } else {
        toast.error(result.error || '작업 삭제에 실패했습니다.')
      }
    } catch (error) {
      console.error('Failed to delete task:', error)
      toast.error('작업 삭제 중 오류가 발생했습니다.')
    }
  }

  // 새 작업 생성 핸들러
  const handleTaskCreate = async (columnId: string, title: string): Promise<KanbanTask | null> => {
    if (!user) return null

    try {
      const result = await createTask(projectId, {
        title,
        description: '',
        status: columnId as TaskStatus,
        priority: TaskPriority.MEDIUM,
        createdBy: user.uid,
        columnId,
        order: columns.find(c => c.id === columnId)?.tasks.length || 0,
      })

      if (result.success && result.task) {
        toast.success('작업이 생성되었습니다.')

        await addActivity(projectId, {
          type: 'task',
          message: `작업 "${title}" 생성`,
          userId: user.uid,
          userName: userProfile?.displayName || '알 수 없음',
          icon: '➕'
        })

        // 서버에서 받은 작업을 KanbanTask 형식으로 변환
        const newTask: KanbanTask = {
          id: result.task.id,
          projectId: result.task.projectId || projectId,
          title: result.task.title,
          description: result.task.description || '',
          columnId: result.task.columnId || columnId,
          order: result.task.order || 0,
          priority: result.task.priority as TaskPriority,
          status: result.task.status as TaskStatus,
          department: (result.task as any).teamId,
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

        return newTask
      } else {
        toast.error(result.error || '작업 생성에 실패했습니다.')
        return null
      }
    } catch (error) {
      console.error('Failed to create task:', error)
      toast.error('작업 생성 중 오류가 발생했습니다.')
      return null
    }
  }

  // 로딩 상태
  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="ml-2 text-gray-600">칸반보드 로딩 중...</span>
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col space-y-6">
      {/* 헤더 */}
      <div className="flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-4">
          <Link
            href={`/projects`}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            ← 프로젝트 목록
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              {projectName || '프로젝트'} - 칸반보드
            </h1>
            <div className="flex items-center gap-4 mt-1">
              <Link
                href={`/projects/${projectId}`}
                className="text-sm text-gray-600 hover:text-gray-900"
              >
                ← 프로젝트 상세
              </Link>
              <span className="text-gray-400">|</span>
              <Link
                href={`/projects/${projectId}/gantt`}
                className="text-sm text-gray-600 hover:text-gray-900"
              >
                간트차트
              </Link>
              <span className="text-gray-400">|</span>
              <Link
                href={`/projects/${projectId}/kanban`}
                className="text-sm font-medium text-primary"
              >
                칸반보드
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* 칸반보드 */}
      <div className="flex-1 overflow-hidden">
        <KanbanBoardPro
          columns={columns}
          onColumnsChange={handleColumnsChange}
          onTaskAdd={handleTaskAdd}
          onTaskEdit={handleTaskEdit}
          onTaskDelete={handleTaskDelete}
          onTaskCreate={handleTaskCreate}
        />
      </div>

      <KanbanCardModal
        card={selectedTask as unknown as KanbanCard}
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false)
          setSelectedTask(null)
        }}
        onUpdate={handleTaskUpdate}
        onDelete={(taskId) => {
          // 컬럼 ID를 찾아야 함
          const columnId = columns.find(col => col.tasks.some(t => t.id === taskId))?.id
          if (columnId) {
            handleTaskDelete(taskId, columnId)
          }
          setIsModalOpen(false)
        }}
      />
    </div>
  )
}