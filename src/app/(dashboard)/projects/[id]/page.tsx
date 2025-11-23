'use client'

import React, { useState, useEffect, useCallback, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '@/lib/auth-context'
import { motion } from 'framer-motion'
import { useSocket } from '@/components/providers/socket-provider'
import ProjectSidebar from '@/components/projects/ProjectSidebar'
import KanbanBoardDnD from '@/components/kanban/KanbanBoardDnD'
import FrappeGanttChart from '@/components/gantt/FrappeGanttChart'
import MindmapEditor from '@/components/mindmap/MindmapEditor'
import { Task as TaskType, KanbanColumn } from '@/services/task-service'
import { TaskStatus, TaskPriority } from '@/types/task'
import { getProject } from '@/actions/project'
import { getTasks, createTask, updateTask, deleteTask, updateTasksOrder } from '@/actions/task'
import { getActivities, addActivity } from '@/actions/activity'
import { toast } from 'react-hot-toast'
import { ArrowLeft, Plus, Info, LayoutGrid, Calendar, FileText, Activity, PanelRightClose, PanelRightOpen } from 'lucide-react'

interface ProjectDetail {
  id: string
  name: string
  description: string
  status: 'planning' | 'design' | 'development' | 'testing' | 'completed' | 'pending'
  progress: number
  startDate: Date | null
  endDate: Date | null
  budget: number | null
  spentBudget?: number
  team: string[]
  teamMembers: any[]
  clientId: string | null
  clientName?: string | null
  createdAt: Date
  updatedAt: Date
  tasks?: TaskType[]
  files?: any[]
  activities?: Activity[]
}

interface Activity {
  id: string
  type: string
  message: string
  userName: string
  timestamp: Date
  icon: string
}

const statusLabels = {
  planning: '기획',
  design: '디자인',
  development: '개발',
  testing: '테스트',
  completed: '완료',
  pending: '대기'
}

interface KanbanColumnWithTasks extends KanbanColumn {
  tasks: TaskType[]
}

const DEFAULT_COLUMNS: KanbanColumn[] = [
  { id: 'todo', title: '할 일', color: '#ef4444', order: 0 },
  { id: 'in_progress', title: '진행 중', color: '#eab308', order: 1 },
  { id: 'review', title: '검토', color: '#8b5cf6', order: 2 },
  { id: 'done', title: '완료', color: '#10b981', order: 3 }
]

export default function ProjectDetailPage() {
  const params = useParams()
  const router = useRouter()
  const { user, userProfile } = useAuth()
  const { socket, isConnected } = useSocket()
  const [project, setProject] = useState<ProjectDetail | null>(null)
  const [activities, setActivities] = useState<Activity[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'overview' | 'kanban' | 'gantt' | 'mindmap' | 'files' | 'activity'>('kanban')
  const [tasks, setTasks] = useState<TaskType[]>([])
  const [kanbanColumns] = useState<KanbanColumn[]>(DEFAULT_COLUMNS)
  const [showTaskModal, setShowTaskModal] = useState(false)
  const [selectedColumnId, setSelectedColumnId] = useState<string>('todo')
  const [editingTask, setEditingTask] = useState<TaskType | null>(null)
  const [newTask, setNewTask] = useState({
    title: '',
    description: '',
    assignee: '',
    dueDate: '',
    startDate: '',
    priority: 'medium' as 'low' | 'medium' | 'high' | 'urgent'
  })

  // Use ref to track if we're currently updating to prevent loops
  const isUpdatingRef = useRef(false)

  // Status to columnId mapping
  const getColumnIdFromStatus = (status: string): string => {
    const statusMap: Record<string, string> = {
      'TODO': 'todo',
      'IN_PROGRESS': 'in_progress',
      'REVIEW': 'review',
      'DONE': 'done',
      'COMPLETED': 'done'
    }
    return statusMap[status] || 'todo'
  }

  const loadProjectData = async () => {
    if (!params.id || typeof params.id !== 'string') return

    try {
      setLoading(true)
      const [projectData, tasksData, activitiesData] = await Promise.all([
        getProject(params.id),
        getTasks(params.id),
        getActivities(params.id)
      ])

      if (projectData) {
        setProject(projectData as any)
      }

      // Ensure all tasks have columnId
      const tasksWithColumnId = (tasksData as any[]).map(task => ({
        ...task,
        columnId: task.columnId || getColumnIdFromStatus(task.status)
      }))

      setTasks(tasksWithColumnId)
      setActivities(activitiesData as any)
    } catch (error) {
      console.error('Failed to load project data:', error)
      toast.error('프로젝트 데이터를 불러오는데 실패했습니다.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadProjectData()
  }, [params.id])

  // Socket.io real-time collaboration
  useEffect(() => {
    if (!socket || !params.id) return

    // Join project room
    socket.emit('join-project', params.id)

    // Listen for task movements from other users
    const handleTaskMoved = (data: any) => {
      console.log('Received task-moved event:', data)
      // Reload tasks to sync with other users
      loadProjectData()
    }

    socket.on('task-moved', handleTaskMoved)

    return () => {
      socket.off('task-moved', handleTaskMoved)
    }
  }, [socket, params.id])

  const handleColumnsChange = useCallback(async (newColumns: KanbanColumnWithTasks[]) => {
    console.log('handleColumnsChange called', { isUpdating: isUpdatingRef.current, newColumns })

    if (isUpdatingRef.current) {
      console.log('Already updating, skipping')
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

      console.log('Task updates:', taskUpdates)

      if (taskUpdates.length > 0 && user && project) {
        // Update local state first for immediate feedback
        setTasks(allTasks)

        // Then update server
        const result = await updateTasksOrder(project.id, taskUpdates)
        console.log('Update result:', result)

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

        // Emit socket event to notify other users
        if (socket && project) {
          socket.emit('task-moved', {
            projectId: project.id,
            updates: taskUpdates,
            userId: user.uid
          })
        }
      }
    } catch (error) {
      console.error('Failed to update tasks:', error)
      toast.error('작업 업데이트에 실패했습니다.')
      // Reload data on error
      await loadProjectData()
    } finally {
      isUpdatingRef.current = false
    }
  }, [tasks, user, userProfile, project])

  const handleCreateTask = async () => {
    if (!project || !user) return
    if (!newTask.title.trim()) {
      toast.error('작업 제목을 입력해주세요.')
      return
    }

    try {
      const result = await createTask(project.id, {
        title: newTask.title,
        description: newTask.description,
        status: selectedColumnId as TaskStatus,
        priority: newTask.priority.toUpperCase() as TaskPriority,
        startDate: newTask.startDate ? new Date(newTask.startDate) : undefined,
        dueDate: newTask.dueDate ? new Date(newTask.dueDate) : undefined,
        assigneeId: newTask.assignee || undefined,
        createdBy: user.uid,
        columnId: selectedColumnId,
        order: tasks.filter(t => t.columnId === selectedColumnId).length
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

        setShowTaskModal(false)
        setNewTask({
          title: '',
          description: '',
          assignee: '',
          dueDate: '',
          startDate: '',
          priority: 'medium'
        })
        loadProjectData()
      }
    } catch (error) {
      console.error('Error creating task:', error)
      toast.error('작업 생성 중 오류가 발생했습니다.')
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (!project) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">프로젝트를 찾을 수 없습니다</h2>
          <Link href="/projects" className="text-blue-600 hover:text-blue-700">
            프로젝트 목록으로 돌아가기
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="h-full flex overflow-hidden bg-gray-50">
      {/* Main Content Area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex-shrink-0 bg-white border-b border-gray-200 px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Link href="/projects" className="text-gray-400 hover:text-gray-600 transition-colors">
                <ArrowLeft className="w-5 h-5" />
              </Link>
              <div>
                <h1 className="text-xl font-semibold text-gray-900">{project.name}</h1>
                <p className="text-sm text-gray-500 mt-0.5">{project.description}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className={`px-3 py-1 rounded-full text-xs font-medium ${project.status === 'completed' ? 'bg-green-100 text-green-700' :
                project.status === 'development' ? 'bg-blue-100 text-blue-700' :
                  project.status === 'testing' ? 'bg-purple-100 text-purple-700' :
                    'bg-gray-100 text-gray-700'
                }`}>
                {statusLabels[project.status]}
              </span>
              <button
                onClick={() => setShowSidebar(!showSidebar)}
                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                title={showSidebar ? '사이드바 숨기기' : '사이드바 보기'}
              >
                {showSidebar ? <PanelRightClose className="w-5 h-5" /> : <PanelRightOpen className="w-5 h-5" />}
              </button>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex-shrink-0 bg-white border-b border-gray-200">
          <nav className="flex gap-6 px-6">
            {[
              { id: 'overview', label: '개요', icon: Info },
              { id: 'kanban', label: '보드', icon: LayoutGrid },
              { id: 'gantt', label: '타임라인', icon: Calendar },
              { id: 'mindmap', label: '마인드맵', icon: FileText },
              { id: 'files', label: '파일', icon: FileText },
              { id: 'activity', label: '활동', icon: Activity },
            ].map(tab => {
              const Icon = tab.icon
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`py-3 px-1 border-b-2 font-medium text-sm transition-colors flex items-center gap-2 ${activeTab === tab.id
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                >
                  <Icon className="w-4 h-4" />
                  {tab.label}
                </button>
              )
            })}
          </nav>
        </div>

        {/* Tab Content */}
        <div className="flex-1 overflow-hidden">
          {activeTab === 'overview' && (
            <div className="h-full overflow-y-auto p-6">
              <div className="max-w-4xl space-y-6">
                <div className="bg-white rounded-lg border border-gray-200 p-6">
                  <h3 className="text-sm font-semibold text-gray-900 mb-4">프로젝트 진행 상황</h3>
                  <div className="space-y-4">
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm text-gray-600">진행률</span>
                        <span className="text-sm font-medium text-gray-900">{project.progress}%</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-blue-600 h-2 rounded-full transition-all"
                          style={{ width: `${project.progress}%` }}
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-lg border border-gray-200 p-6">
                  <h3 className="text-sm font-semibold text-gray-900 mb-4">프로젝트 정보</h3>
                  <dl className="grid grid-cols-2 gap-4">
                    <div>
                      <dt className="text-xs text-gray-500 mb-1">시작일</dt>
                      <dd className="text-sm text-gray-900">
                        {project.startDate ? new Date(project.startDate).toLocaleDateString('ko-KR') : '-'}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-xs text-gray-500 mb-1">종료일</dt>
                      <dd className="text-sm text-gray-900">
                        {project.endDate ? new Date(project.endDate).toLocaleDateString('ko-KR') : '-'}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-xs text-gray-500 mb-1">예산</dt>
                      <dd className="text-sm text-gray-900">
                        {new Intl.NumberFormat('ko-KR', { style: 'currency', currency: 'KRW', maximumFractionDigits: 0 }).format(project.budget || 0)}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-xs text-gray-500 mb-1">팀원</dt>
                      <dd className="text-sm text-gray-900">{project.team?.length || 0}명</dd>
                    </div>
                  </dl>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'kanban' && (
            <div className="h-full">
              <KanbanBoardDnD
                columns={kanbanColumns.map(col => ({
                  ...col,
                  tasks: tasks.filter(task => task.columnId === col.id).map(task => ({
                    ...task,
                    dueDate: task.dueDate ? new Date(task.dueDate) : undefined,
                    priority: (task.priority || 'MEDIUM') as TaskPriority
                  }))
                }))}
                onColumnsChange={(newColumns) => {
                  handleColumnsChange(newColumns as KanbanColumnWithTasks[])
                }}
                onTaskAdd={(columnId) => {
                  setSelectedColumnId(columnId)
                  setShowTaskModal(true)
                }}
                onTaskEdit={(task) => {
                  // Open edit modal with task data
                  setEditingTask(task)
                  setShowTaskModal(true)
                  setSelectedColumnId(task.columnId || task.status)
                  setNewTask({
                    title: task.title,
                    description: task.description || '',
                    assignee: task.assigneeId || '',
                    dueDate: task.dueDate ? new Date(task.dueDate).toISOString().split('T')[0] : '',
                    startDate: task.startDate ? new Date(task.startDate).toISOString().split('T')[0] : '',
                    priority: task.priority.toLowerCase() as 'low' | 'medium' | 'high' | 'urgent'
                  })
                }}
                onTaskDelete={async (taskId, columnId) => {
                  if (confirm('정말로 이 작업을 삭제하시겠습니까?') && user) {
                    await deleteTask(taskId)
                    await addActivity(project.id, {
                      type: 'task',
                      message: '작업을 삭제했습니다',
                      userId: user.uid,
                      userName: userProfile?.displayName || '알 수 없음',
                      icon: '🗑️'
                    })
                    loadProjectData()
                  }
                }}
              />
            </div>
          )}

          {activeTab === 'gantt' && (
            <div className="h-full w-full overflow-hidden">
              <FrappeGanttChart tasks={tasks} />
            </div>
          )}

          {activeTab === 'mindmap' && (
            <div className="h-full w-full overflow-hidden p-6">
              <MindmapEditor projectId={project.id} />
            </div>
          )}

          {activeTab === 'files' && (
            <div className="h-full overflow-y-auto p-6">
              <div className="text-center py-12">
                <p className="text-gray-500">파일 관리 기능은 준비 중입니다.</p>
              </div>
            </div>
          )}

          {activeTab === 'activity' && (
            <div className="h-full overflow-y-auto p-6">
              <div className="max-w-4xl">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">프로젝트 활동</h3>
                <div className="space-y-4">
                  {activities.length > 0 ? (
                    activities.map((activity) => (
                      <div key={activity.id} className="flex gap-3 p-4 bg-white rounded-lg border border-gray-200">
                        <div className="text-2xl">{activity.icon}</div>
                        <div className="flex-1">
                          <p className="text-sm text-gray-900">{activity.message}</p>
                          <p className="text-xs text-gray-500 mt-1">
                            {activity.userName} · {new Date(activity.timestamp).toLocaleString('ko-KR')}
                          </p>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-gray-500 text-center py-8">활동 내역이 없습니다.</p>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Sidebar */}
      {showSidebar && <ProjectSidebar project={project} activities={activities} />}

      {/* Task Creation Modal */}
      {showTaskModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-lg shadow-xl max-w-md w-full p-6"
          >
            <h3 className="text-lg font-semibold text-gray-900 mb-4">새 작업 만들기</h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">제목</label>
                <input
                  type="text"
                  value={newTask.title}
                  onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:border-transparent"
                  placeholder="작업 제목을 입력하세요"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">설명</label>
                <textarea
                  value={newTask.description}
                  onChange={(e) => setNewTask({ ...newTask, description: e.target.value })}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:border-transparent"
                  placeholder="작업 설명을 입력하세요"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">시작일</label>
                  <input
                    type="date"
                    value={newTask.startDate}
                    onChange={(e) => setNewTask({ ...newTask, startDate: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">마감일</label>
                  <input
                    type="date"
                    value={newTask.dueDate}
                    onChange={(e) => setNewTask({ ...newTask, dueDate: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:border-transparent"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">우선순위</label>
                <div className="flex gap-2">
                  {[
                    { value: 'low', label: '낮음', color: 'green' },
                    { value: 'medium', label: '보통', color: 'blue' },
                    { value: 'high', label: '높음', color: 'orange' },
                    { value: 'urgent', label: '긴급', color: 'red' }
                  ].map(priority => (
                    <button
                      key={priority.value}
                      type="button"
                      onClick={() => setNewTask({ ...newTask, priority: priority.value as any })}
                      className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${newTask.priority === priority.value
                        ? `bg-${priority.color}-100 text-${priority.color}-700 ring-2 ring-${priority.color}-600`
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                    >
                      {priority.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowTaskModal(false)}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                취소
              </button>
              <button
                onClick={handleCreateTask}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                생성
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  )
}
