'use client'

// ===========================================
// Glass Morphism Project Detail Page
// ===========================================

import React, { useState, useEffect, useCallback, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '@/lib/auth-context'
import { useWorkspace, LEGACY_DEPARTMENT_MAP } from '@/lib/workspace-context'
import { motion } from 'framer-motion'
import { useSocket } from '@/components/providers/socket-provider'
import ProjectSidebar from '@/components/projects/ProjectSidebar'
import KanbanBoardDnD from '@/components/kanban/KanbanBoardDnD'
import GanttChartPro, { ExtendedTask } from '@/components/gantt/GanttChartPro'
import MindmapEditor from '@/components/mindmap/MindmapEditor'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { KanbanTask as TaskType, KanbanColumn, TaskStatus, TaskPriority } from '@/types/task'
import { getProject } from '@/actions/project'
import { getTasks, createTask, updateTask, deleteTask, updateTasksOrder } from '@/actions/task'
import { getActivities, addActivity } from '@/actions/activity'
import { toast } from 'react-hot-toast'
import {
  ArrowLeft, Plus, Info, LayoutGrid, Calendar, FileText, Activity,
  PanelRightClose, PanelRightOpen, Loader2, FolderOpen, Users, Wallet,
  CalendarDays, Clock, CheckCircle, UserPlus, TrendingUp, Target,
  AlertCircle, BarChart3, ListTodo, CircleDot, Zap, Trophy, Settings
} from 'lucide-react'
import ProjectInvitations from '@/components/projects/ProjectInvitations'
import ProjectInviteBanner from '@/components/projects/ProjectInviteBanner'
import ProjectSettingsCard from '@/components/projects/ProjectSettingsCard'
import { cn } from '@/lib/utils'

const isDev = process.env.NODE_ENV === 'development'

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

const statusConfig = {
  planning: { label: '기획', color: 'amber' },
  design: { label: '디자인', color: 'violet' },
  development: { label: '개발', color: 'lime' },
  testing: { label: '테스트', color: 'sky' },
  completed: { label: '완료', color: 'emerald' },
  pending: { label: '대기', color: 'slate' }
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
  const { departments } = useWorkspace()
  const { socket, isConnected } = useSocket()
  const [project, setProject] = useState<ProjectDetail | null>(null)
  const [activities, setActivities] = useState<Activity[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'overview' | 'kanban' | 'gantt' | 'mindmap' | 'files' | 'activity' | 'team' | 'settings'>('kanban')
  const [tasks, setTasks] = useState<TaskType[]>([])
  const [kanbanColumns] = useState<KanbanColumn[]>(DEFAULT_COLUMNS)
  const [showTaskModal, setShowTaskModal] = useState(false)
  const [showSidebar, setShowSidebar] = useState(true)
  const [selectedColumnId, setSelectedColumnId] = useState<string>('todo')
  const [editingTask, setEditingTask] = useState<TaskType | null>(null)
  const [newTask, setNewTask] = useState({
    title: '',
    description: '',
    assignee: '',
    dueDate: '',
    startDate: '',
    priority: 'medium' as 'low' | 'medium' | 'high' | 'urgent',
    department: '',
    color: '#a3e635'
  })

  // Use ref to track if we're currently updating to prevent loops
  const isUpdatingRef = useRef(false)

  // Calculate progress locally based on tasks (real-time update)
  const calculatedProgress = tasks.length === 0
    ? 0
    : Math.round((tasks.filter(t => t.columnId === 'done' || t.status === 'done').length / tasks.length) * 100)

  // Check if current user is project admin
  const isProjectAdmin = project?.teamMembers?.some(
    (member: any) => member.userId === user?.uid && member.role === 'Admin'
  ) ?? false

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
    if (!params?.id || typeof params.id !== 'string') return

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

      if (isDev) console.log('loadProjectData: Received tasks:', tasksWithColumnId.length, tasksWithColumnId[0])

      setTasks(tasksWithColumnId)
      setActivities(activitiesData as any)
    } catch (error) {
      if (isDev) console.error('Failed to load project data:', error)
      toast.error('프로젝트 데이터를 불러오는데 실패했습니다.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadProjectData()
  }, [params?.id])

  // Socket.io real-time collaboration
  useEffect(() => {
    if (!socket || !params?.id) return

    // Join project room
    socket.emit('join-project', params.id)

    // Listen for task movements from other users
    const handleTaskMoved = (data: any) => {
      if (isDev) console.log('Received task-moved event:', data)
      // Reload tasks to sync with other users
      loadProjectData()
    }

    socket.on('task-moved', handleTaskMoved)

    return () => {
      socket.off('task-moved', handleTaskMoved)
    }
  }, [socket, params?.id])

  const handleColumnsChange = useCallback(async (newColumns: KanbanColumnWithTasks[]) => {
    if (isDev) console.log('handleColumnsChange called', { isUpdating: isUpdatingRef.current, newColumns })

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
      if (isDev) console.error('Failed to update tasks:', error)
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
      if (editingTask) {
        const result = await updateTask(editingTask.id, {
          title: newTask.title,
          description: newTask.description,
          priority: newTask.priority as TaskPriority,
          startDate: newTask.startDate ? new Date(newTask.startDate) : undefined,
          dueDate: newTask.dueDate ? new Date(newTask.dueDate) : undefined,
          assigneeId: newTask.assignee || null,
          teamId: newTask.department || null,  // 빈 문자열이면 null로 부서 해제
          color: newTask.color
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

          setShowTaskModal(false)
          setEditingTask(null)
          setNewTask({
            title: '',
            description: '',
            assignee: '',
            dueDate: '',
            startDate: '',
            priority: 'medium',
            department: '',
            color: '#a3e635'
          })
          loadProjectData()
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
          color: newTask.color
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
            priority: 'medium',
            department: '',
            color: '#a3e635'
          })
          loadProjectData()
        }
      }
    } catch (error) {
      if (isDev) console.error('Error saving task:', error)
      toast.error('작업 저장 중 오류가 발생했습니다.')
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-lime-400 mx-auto" />
          <p className="mt-4 text-slate-500">프로젝트를 불러오는 중...</p>
        </div>
      </div>
    )
  }

  if (!project) {
    return (
      <div className="flex items-center justify-center h-full">
        <Card variant="glass" className="max-w-md">
          <CardContent className="p-8 text-center">
            <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-lime-100 flex items-center justify-center">
              <FolderOpen className="w-8 h-8 text-lime-600" />
            </div>
            <h2 className="text-xl font-semibold text-slate-900 mb-2">프로젝트를 찾을 수 없습니다</h2>
            <p className="text-slate-500 mb-4">요청하신 프로젝트가 존재하지 않거나 접근 권한이 없습니다.</p>
            <Link href="/projects">
              <Button variant="limePrimary" className="rounded-xl">
                <ArrowLeft className="w-4 h-4 mr-2" />
                프로젝트 목록으로 돌아가기
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    )
  }

  const status = statusConfig[project.status]

  return (
    <div className="h-full flex overflow-hidden bg-gradient-to-br from-slate-50 to-slate-100">
      {/* Main Content Area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header - Glass Morphism */}
        <div className="flex-shrink-0 bg-white/70 backdrop-blur-xl border-b border-white/40 px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link
                href="/projects"
                className="p-2 text-slate-400 hover:text-slate-600 hover:bg-white/60 rounded-xl transition-all"
              >
                <ArrowLeft className="w-5 h-5" />
              </Link>
              <div>
                <h1 className="text-xl font-bold text-slate-900">{project.name}</h1>
                <p className="text-sm text-slate-500 mt-0.5">{project.description}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Badge className={cn(
                "border-0 px-3 py-1",
                status.color === 'amber' && 'bg-amber-100 text-amber-700',
                status.color === 'violet' && 'bg-violet-100 text-violet-700',
                status.color === 'lime' && 'bg-lime-100 text-lime-700',
                status.color === 'sky' && 'bg-sky-100 text-sky-700',
                status.color === 'emerald' && 'bg-emerald-100 text-emerald-700',
                status.color === 'slate' && 'bg-slate-100 text-slate-700'
              )}>
                {status.label}
              </Badge>
              <button
                onClick={() => setShowSidebar(!showSidebar)}
                className="p-2 text-slate-400 hover:text-slate-600 hover:bg-white/60 rounded-xl transition-all"
                title={showSidebar ? '사이드바 숨기기' : '사이드바 보기'}
              >
                {showSidebar ? <PanelRightClose className="w-5 h-5" /> : <PanelRightOpen className="w-5 h-5" />}
              </button>
            </div>
          </div>
        </div>

        {/* Tabs - Glass Morphism */}
        <div className="flex-shrink-0 bg-white/60 backdrop-blur-sm border-b border-white/40 px-6">
          <nav className="flex gap-1 py-2">
            {[
              { id: 'overview', label: '개요', icon: Info },
              { id: 'kanban', label: '보드', icon: LayoutGrid },
              { id: 'gantt', label: '타임라인', icon: Calendar },
              { id: 'mindmap', label: '마인드맵', icon: FileText },
              { id: 'files', label: '파일', icon: FileText },
              { id: 'activity', label: '활동', icon: Activity },
              { id: 'team', label: '팀', icon: UserPlus },
              ...(isProjectAdmin ? [{ id: 'settings', label: '설정', icon: Settings }] : []),
            ].map(tab => {
              const Icon = tab.icon
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`px-4 py-2 rounded-xl text-sm font-medium transition-all flex items-center gap-2 ${
                    activeTab === tab.id
                      ? 'bg-black text-lime-400 shadow-lg'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
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
              <div className="max-w-6xl mx-auto space-y-6">
                {/* 초대 배너 - 초대받은 사용자에게만 표시 */}
                {!isProjectAdmin && (
                  <ProjectInviteBanner
                    projectId={project.id}
                    isAdmin={isProjectAdmin}
                    onAccepted={loadProjectData}
                  />
                )}

                {/* Hero Progress Section */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5 }}
                >
                  <Card variant="glass" className="overflow-hidden">
                    <CardContent className="p-0">
                      <div className="relative">
                        {/* Background gradient */}
                        <div className="absolute inset-0 bg-gradient-to-br from-lime-500/20 via-emerald-500/10 to-teal-500/20" />

                        <div className="relative p-6">
                          <div className="flex items-start justify-between mb-6">
                            <div>
                              <h3 className="text-lg font-bold text-slate-900 mb-1 flex items-center gap-2">
                                <div className="p-2 bg-lime-500 rounded-xl shadow-lg shadow-lime-500/30">
                                  <TrendingUp className="w-5 h-5 text-white" />
                                </div>
                                프로젝트 진행 현황
                              </h3>
                              <p className="text-sm text-slate-500">전체 작업 진행률과 주요 지표를 한눈에 확인하세요</p>
                            </div>
                            <Badge className={cn(
                              "text-sm font-bold px-4 py-2 border-0 rounded-xl shadow-lg",
                              calculatedProgress >= 80 ? 'bg-emerald-500 text-white shadow-emerald-500/30' :
                              calculatedProgress >= 50 ? 'bg-lime-500 text-black shadow-lime-500/30' :
                              calculatedProgress >= 30 ? 'bg-amber-500 text-white shadow-amber-500/30' :
                              'bg-slate-400 text-white shadow-slate-400/30'
                            )}>
                              {calculatedProgress >= 80 ? '순조로움' :
                               calculatedProgress >= 50 ? '진행 중' :
                               calculatedProgress >= 30 ? '시작 단계' : '준비 중'}
                            </Badge>
                          </div>

                          {/* Large Progress Display */}
                          <div className="flex items-center gap-8 mb-6">
                            <div className="relative w-32 h-32">
                              <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                                <circle
                                  cx="50" cy="50" r="42"
                                  fill="none"
                                  stroke="currentColor"
                                  strokeWidth="12"
                                  className="text-slate-200"
                                />
                                <circle
                                  cx="50" cy="50" r="42"
                                  fill="none"
                                  stroke="url(#progressGradient)"
                                  strokeWidth="12"
                                  strokeLinecap="round"
                                  strokeDasharray={`${calculatedProgress * 2.64} 264`}
                                  className="transition-all duration-1000"
                                />
                                <defs>
                                  <linearGradient id="progressGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                                    <stop offset="0%" stopColor="#a3e635" />
                                    <stop offset="100%" stopColor="#22c55e" />
                                  </linearGradient>
                                </defs>
                              </svg>
                              <div className="absolute inset-0 flex flex-col items-center justify-center">
                                <span className="text-3xl font-black text-slate-900">{calculatedProgress}%</span>
                                <span className="text-xs text-slate-500">완료</span>
                              </div>
                            </div>

                            <div className="flex-1 grid grid-cols-2 md:grid-cols-4 gap-4">
                              {/* Task Stats */}
                              {(() => {
                                const todoCount = tasks.filter(t => t.columnId === 'todo').length
                                const inProgressCount = tasks.filter(t => t.columnId === 'in_progress').length
                                const reviewCount = tasks.filter(t => t.columnId === 'review').length
                                const doneCount = tasks.filter(t => t.columnId === 'done').length

                                return (
                                  <>
                                    <div className="p-4 bg-white/60 rounded-2xl border border-white/40">
                                      <div className="flex items-center gap-2 mb-2">
                                        <div className="w-2.5 h-2.5 rounded-full bg-slate-400" />
                                        <span className="text-xs font-medium text-slate-500">할 일</span>
                                      </div>
                                      <span className="text-2xl font-bold text-slate-900">{todoCount}</span>
                                    </div>
                                    <div className="p-4 bg-white/60 rounded-2xl border border-white/40">
                                      <div className="flex items-center gap-2 mb-2">
                                        <div className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse" />
                                        <span className="text-xs font-medium text-slate-500">진행 중</span>
                                      </div>
                                      <span className="text-2xl font-bold text-amber-600">{inProgressCount}</span>
                                    </div>
                                    <div className="p-4 bg-white/60 rounded-2xl border border-white/40">
                                      <div className="flex items-center gap-2 mb-2">
                                        <div className="w-2.5 h-2.5 rounded-full bg-violet-500" />
                                        <span className="text-xs font-medium text-slate-500">검토</span>
                                      </div>
                                      <span className="text-2xl font-bold text-violet-600">{reviewCount}</span>
                                    </div>
                                    <div className="p-4 bg-white/60 rounded-2xl border border-white/40">
                                      <div className="flex items-center gap-2 mb-2">
                                        <div className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                                        <span className="text-xs font-medium text-slate-500">완료</span>
                                      </div>
                                      <span className="text-2xl font-bold text-emerald-600">{doneCount}</span>
                                    </div>
                                  </>
                                )
                              })()}
                            </div>
                          </div>

                          {/* Progress Bar */}
                          <div className="space-y-2">
                            <div className="flex justify-between text-xs font-medium text-slate-500">
                              <span>전체 진행률</span>
                              <span>{tasks.filter(t => t.columnId === 'done' || t.status === 'done').length}/{tasks.length} 작업 완료</span>
                            </div>
                            <div className="h-3 bg-slate-200/60 rounded-full overflow-hidden">
                              <motion.div
                                initial={{ width: 0 }}
                                animate={{ width: `${calculatedProgress}%` }}
                                transition={{ duration: 1, ease: "easeOut" }}
                                className="h-full bg-gradient-to-r from-lime-400 to-emerald-500 rounded-full"
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>

                {/* Quick Stats Row */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 0.1 }}
                  className="grid grid-cols-2 md:grid-cols-4 gap-4"
                >
                  <Card variant="glass" className="group hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
                    <CardContent className="p-5">
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">시작일</p>
                          <p className="text-lg font-bold text-slate-900">
                            {project.startDate ? new Date(project.startDate).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' }) : '-'}
                          </p>
                          {project.startDate && (
                            <p className="text-xs text-slate-500 mt-1">
                              {new Date(project.startDate).toLocaleDateString('ko-KR', { year: 'numeric' })}
                            </p>
                          )}
                        </div>
                        <div className="p-2.5 bg-lime-100 rounded-xl group-hover:bg-lime-500 group-hover:shadow-lg group-hover:shadow-lime-500/30 transition-all">
                          <CalendarDays className="w-5 h-5 text-lime-600 group-hover:text-white transition-colors" />
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card variant="glass" className="group hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
                    <CardContent className="p-5">
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">종료일</p>
                          <p className="text-lg font-bold text-slate-900">
                            {project.endDate ? new Date(project.endDate).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' }) : '-'}
                          </p>
                          {project.endDate && (
                            <p className="text-xs text-slate-500 mt-1">
                              {(() => {
                                const daysLeft = Math.ceil((new Date(project.endDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
                                return daysLeft > 0 ? `${daysLeft}일 남음` : daysLeft === 0 ? '오늘 마감' : `${Math.abs(daysLeft)}일 초과`
                              })()}
                            </p>
                          )}
                        </div>
                        <div className="p-2.5 bg-rose-100 rounded-xl group-hover:bg-rose-500 group-hover:shadow-lg group-hover:shadow-rose-500/30 transition-all">
                          <Clock className="w-5 h-5 text-rose-600 group-hover:text-white transition-colors" />
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card variant="glass" className="group hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
                    <CardContent className="p-5">
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">예산</p>
                          <p className="text-lg font-bold text-slate-900">
                            {project.budget ? `₩${(project.budget / 10000).toFixed(0)}만` : '-'}
                          </p>
                          {project.budget && project.spentBudget && (
                            <p className="text-xs text-slate-500 mt-1">
                              {((project.spentBudget / project.budget) * 100).toFixed(0)}% 사용
                            </p>
                          )}
                        </div>
                        <div className="p-2.5 bg-violet-100 rounded-xl group-hover:bg-violet-500 group-hover:shadow-lg group-hover:shadow-violet-500/30 transition-all">
                          <Wallet className="w-5 h-5 text-violet-600 group-hover:text-white transition-colors" />
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card variant="glass" className="group hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
                    <CardContent className="p-5">
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">팀원</p>
                          <p className="text-lg font-bold text-slate-900">{project.teamMembers?.length || 0}명</p>
                          <p className="text-xs text-slate-500 mt-1">
                            {tasks.length > 0 ? `${(tasks.length / (project.teamMembers?.length || 1)).toFixed(1)} 작업/인` : '작업 없음'}
                          </p>
                        </div>
                        <div className="p-2.5 bg-emerald-100 rounded-xl group-hover:bg-emerald-500 group-hover:shadow-lg group-hover:shadow-emerald-500/30 transition-all">
                          <Users className="w-5 h-5 text-emerald-600 group-hover:text-white transition-colors" />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>

                {/* Two Column Layout */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Team Members Card */}
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: 0.2 }}
                  >
                    <Card variant="glass" className="h-full">
                      <CardContent className="p-6">
                        <div className="flex items-center justify-between mb-5">
                          <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                            <div className="p-2 bg-blue-100 rounded-xl">
                              <Users className="w-4 h-4 text-blue-600" />
                            </div>
                            팀 구성원
                          </h3>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setActiveTab('team')}
                            className="text-xs text-slate-500 hover:text-slate-900"
                          >
                            전체보기 →
                          </Button>
                        </div>

                        <div className="space-y-3">
                          {project.teamMembers && project.teamMembers.length > 0 ? (
                            project.teamMembers.slice(0, 5).map((member: any, index: number) => {
                              const roleColors: Record<string, { bg: string; text: string; border: string }> = {
                                Admin: { bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200' },
                                PM: { bg: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-200' },
                                Developer: { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200' },
                                Designer: { bg: 'bg-pink-50', text: 'text-pink-700', border: 'border-pink-200' },
                                Viewer: { bg: 'bg-slate-50', text: 'text-slate-700', border: 'border-slate-200' },
                              }
                              const colors = roleColors[member.role] || roleColors.Viewer
                              const memberTasks = tasks.filter(t => t.assigneeId === member.userId)
                              const completedTasks = memberTasks.filter(t => t.columnId === 'done').length

                              return (
                                <motion.div
                                  key={member.userId}
                                  initial={{ opacity: 0, x: -20 }}
                                  animate={{ opacity: 1, x: 0 }}
                                  transition={{ delay: index * 0.1 }}
                                  className="flex items-center gap-3 p-3 bg-white/50 rounded-xl hover:bg-white/80 transition-colors"
                                >
                                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center text-sm font-bold text-slate-600">
                                    {member.name?.charAt(0) || '?'}
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <p className="font-medium text-slate-900 truncate">{member.name}</p>
                                    <div className="flex items-center gap-2 mt-0.5">
                                      <span className={cn(
                                        "px-2 py-0.5 text-xs font-medium rounded-md border",
                                        colors.bg, colors.text, colors.border
                                      )}>
                                        {member.role}
                                      </span>
                                      {memberTasks.length > 0 && (
                                        <span className="text-xs text-slate-400">
                                          {completedTasks}/{memberTasks.length} 완료
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                  {memberTasks.length > 0 && (
                                    <div className="w-12">
                                      <div className="h-1.5 bg-slate-200 rounded-full overflow-hidden">
                                        <div
                                          className="h-full bg-lime-500 rounded-full"
                                          style={{ width: `${(completedTasks / memberTasks.length) * 100}%` }}
                                        />
                                      </div>
                                    </div>
                                  )}
                                </motion.div>
                              )
                            })
                          ) : (
                            <div className="text-center py-8 text-slate-500">
                              <Users className="w-12 h-12 mx-auto mb-3 text-slate-300" />
                              <p className="text-sm">아직 팀원이 없습니다</p>
                              <Button
                                variant="glass"
                                size="sm"
                                onClick={() => setActiveTab('team')}
                                className="mt-3"
                              >
                                <UserPlus className="w-4 h-4 mr-2" />
                                팀원 초대하기
                              </Button>
                            </div>
                          )}

                          {project.teamMembers && project.teamMembers.length > 5 && (
                            <p className="text-xs text-slate-400 text-center pt-2">
                              +{project.teamMembers.length - 5}명 더 있음
                            </p>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>

                  {/* Recent Activity Card */}
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: 0.3 }}
                  >
                    <Card variant="glass" className="h-full">
                      <CardContent className="p-6">
                        <div className="flex items-center justify-between mb-5">
                          <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                            <div className="p-2 bg-amber-100 rounded-xl">
                              <Zap className="w-4 h-4 text-amber-600" />
                            </div>
                            최근 활동
                          </h3>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setActiveTab('activity')}
                            className="text-xs text-slate-500 hover:text-slate-900"
                          >
                            전체보기 →
                          </Button>
                        </div>

                        <div className="space-y-3">
                          {activities.length > 0 ? (
                            activities.slice(0, 5).map((activity, index) => (
                              <motion.div
                                key={activity.id}
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: index * 0.1 }}
                                className="flex gap-3 p-3 bg-white/50 rounded-xl hover:bg-white/80 transition-colors"
                              >
                                <div className="text-xl flex-shrink-0">{activity.icon}</div>
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm text-slate-900 line-clamp-2">{activity.message}</p>
                                  <div className="flex items-center gap-2 mt-1.5">
                                    <span className="text-xs font-medium text-slate-600">{activity.userName}</span>
                                    <span className="text-xs text-slate-400">
                                      {(() => {
                                        const diff = Date.now() - new Date(activity.timestamp).getTime()
                                        const minutes = Math.floor(diff / 60000)
                                        const hours = Math.floor(diff / 3600000)
                                        const days = Math.floor(diff / 86400000)
                                        if (minutes < 1) return '방금 전'
                                        if (minutes < 60) return `${minutes}분 전`
                                        if (hours < 24) return `${hours}시간 전`
                                        return `${days}일 전`
                                      })()}
                                    </span>
                                  </div>
                                </div>
                              </motion.div>
                            ))
                          ) : (
                            <div className="text-center py-8 text-slate-500">
                              <Activity className="w-12 h-12 mx-auto mb-3 text-slate-300" />
                              <p className="text-sm">아직 활동 내역이 없습니다</p>
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                </div>

                {/* Urgent Tasks & Milestones Row */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Urgent/High Priority Tasks */}
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: 0.4 }}
                  >
                    <Card variant="glass">
                      <CardContent className="p-6">
                        <div className="flex items-center justify-between mb-5">
                          <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                            <div className="p-2 bg-rose-100 rounded-xl">
                              <AlertCircle className="w-4 h-4 text-rose-600" />
                            </div>
                            긴급 작업
                          </h3>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setActiveTab('kanban')}
                            className="text-xs text-slate-500 hover:text-slate-900"
                          >
                            전체보기 →
                          </Button>
                        </div>

                        <div className="space-y-2">
                          {(() => {
                            const urgentTasks = tasks.filter(t =>
                              (t.priority === 'urgent' || t.priority === 'high') && t.columnId !== 'done'
                            ).slice(0, 4)

                            if (urgentTasks.length === 0) {
                              return (
                                <div className="text-center py-6 text-slate-500">
                                  <Trophy className="w-12 h-12 mx-auto mb-3 text-lime-400" />
                                  <p className="text-sm font-medium text-slate-900">긴급 작업이 없습니다!</p>
                                  <p className="text-xs text-slate-400 mt-1">훌륭해요, 계속 진행하세요 🎉</p>
                                </div>
                              )
                            }

                            return urgentTasks.map((task, index) => (
                              <motion.div
                                key={task.id}
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                transition={{ delay: index * 0.1 }}
                                className="flex items-center gap-3 p-3 bg-white/50 rounded-xl hover:bg-white/80 transition-colors cursor-pointer"
                                onClick={() => setActiveTab('kanban')}
                              >
                                <div className={cn(
                                  "w-2 h-2 rounded-full flex-shrink-0",
                                  task.priority === 'urgent' ? 'bg-rose-500 animate-pulse' : 'bg-amber-500'
                                )} />
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-medium text-slate-900 truncate">{task.title}</p>
                                  <p className="text-xs text-slate-500">
                                    {task.dueDate && `마감: ${new Date(task.dueDate).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' })}`}
                                  </p>
                                </div>
                                <Badge className={cn(
                                  "text-xs border-0",
                                  task.priority === 'urgent' ? 'bg-rose-100 text-rose-700' : 'bg-amber-100 text-amber-700'
                                )}>
                                  {task.priority === 'urgent' ? '긴급' : '높음'}
                                </Badge>
                              </motion.div>
                            ))
                          })()}
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>

                  {/* Task Distribution */}
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: 0.5 }}
                  >
                    <Card variant="glass">
                      <CardContent className="p-6">
                        <div className="flex items-center justify-between mb-5">
                          <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                            <div className="p-2 bg-indigo-100 rounded-xl">
                              <BarChart3 className="w-4 h-4 text-indigo-600" />
                            </div>
                            작업 분포
                          </h3>
                        </div>

                        <div className="space-y-4">
                          {(() => {
                            const statusDistribution = [
                              { id: 'todo', label: '할 일', count: tasks.filter(t => t.columnId === 'todo').length, color: 'bg-slate-400' },
                              { id: 'in_progress', label: '진행 중', count: tasks.filter(t => t.columnId === 'in_progress').length, color: 'bg-amber-500' },
                              { id: 'review', label: '검토', count: tasks.filter(t => t.columnId === 'review').length, color: 'bg-violet-500' },
                              { id: 'done', label: '완료', count: tasks.filter(t => t.columnId === 'done').length, color: 'bg-emerald-500' },
                            ]

                            const total = tasks.length || 1

                            return (
                              <>
                                {/* Stacked Bar */}
                                <div className="h-4 bg-slate-100 rounded-full overflow-hidden flex">
                                  {statusDistribution.map((status) => (
                                    <motion.div
                                      key={status.id}
                                      initial={{ width: 0 }}
                                      animate={{ width: `${(status.count / total) * 100}%` }}
                                      transition={{ duration: 0.8, delay: 0.2 }}
                                      className={cn("h-full", status.color)}
                                    />
                                  ))}
                                </div>

                                {/* Legend */}
                                <div className="grid grid-cols-2 gap-3">
                                  {statusDistribution.map((status) => (
                                    <div key={status.id} className="flex items-center gap-2">
                                      <div className={cn("w-3 h-3 rounded-full", status.color)} />
                                      <span className="text-xs text-slate-600">{status.label}</span>
                                      <span className="text-xs font-bold text-slate-900 ml-auto">{status.count}</span>
                                    </div>
                                  ))}
                                </div>
                              </>
                            )
                          })()}
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                </div>

                {/* Description Card */}
                {project.description && (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: 0.6 }}
                  >
                    <Card variant="glass">
                      <CardContent className="p-6">
                        <h3 className="text-base font-bold text-slate-900 flex items-center gap-2 mb-4">
                          <div className="p-2 bg-slate-100 rounded-xl">
                            <FileText className="w-4 h-4 text-slate-600" />
                          </div>
                          프로젝트 설명
                        </h3>
                        <p className="text-sm text-slate-600 leading-relaxed whitespace-pre-wrap">
                          {project.description}
                        </p>
                      </CardContent>
                    </Card>
                  </motion.div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'kanban' && (
            <div className="h-full">
              <KanbanBoardDnD
                columns={kanbanColumns.map(col => ({
                  ...col,
                  // status를 기준으로 필터링하여 /tasks 페이지와 동기화 (columnId fallback 포함)
                  tasks: tasks.filter(task =>
                    task.status === col.id ||
                    (task.columnId === col.id && !task.status) ||
                    (col.id === 'todo' && !task.status && !task.columnId)
                  ).map(task => ({
                    ...task,
                    dueDate: task.dueDate ? new Date(task.dueDate) : undefined,
                    priority: (task.priority || TaskPriority.MEDIUM) as TaskPriority
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
                    priority: task.priority.toLowerCase() as 'low' | 'medium' | 'high' | 'urgent',
                    department: (task as any).department || (task as any).teamId || '',
                    color: task.color || '#a3e635'
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
                onTaskCreate={async (columnId, title) => {
                  if (!user) return null

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

                      // 서버에서 받은 작업을 KanbanTask 형식으로 변환
                      const newTask: TaskType = {
                        id: result.task.id,
                        projectId: result.task.projectId || project.id,
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

                      // tasks 상태 업데이트
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
                }}
              />
            </div>
          )}

          {activeTab === 'gantt' && (
            <div className="h-full w-full overflow-hidden p-4">
              <GanttChartPro
                tasks={tasks.map((task): ExtendedTask => ({
                  id: task.id,
                  name: task.title,
                  start: task.startDate ? new Date(task.startDate) : new Date(),
                  end: task.dueDate ? new Date(task.dueDate) : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
                  progress: task.progress || 0,
                  type: 'task',
                  assigneeDepartment: task.department,
                  styles: task.color ? {
                    progressColor: task.color,
                    progressSelectedColor: task.color,
                    backgroundColor: task.color + '40',
                    backgroundSelectedColor: task.color + '60',
                  } : undefined,
                }))}
                onTaskChange={async (ganttTask) => {
                  const originalTask = tasks.find(t => t.id === ganttTask.id)
                  if (!originalTask) return

                  try {
                    const result = await updateTask(ganttTask.id, {
                      title: ganttTask.name,
                      startDate: ganttTask.start,
                      dueDate: ganttTask.end,
                      progress: ganttTask.progress,
                      color: (ganttTask as any).styles?.progressColor || originalTask.color,
                    })

                    if (result.success) {
                      toast.success('작업이 수정되었습니다.')
                      loadProjectData()
                    } else {
                      toast.error('작업 수정에 실패했습니다.')
                    }
                  } catch (error) {
                    if (isDev) console.error('Failed to update task:', error)
                    toast.error('오류가 발생했습니다.')
                  }
                }}
                onDateChange={async (ganttTask) => {
                  try {
                    const result = await updateTask(ganttTask.id, {
                      startDate: ganttTask.start,
                      dueDate: ganttTask.end,
                    })

                    if (result.success) {
                      toast.success('일정이 변경되었습니다.')
                      loadProjectData()
                    } else {
                      toast.error('일정 변경에 실패했습니다.')
                    }
                  } catch (error) {
                    if (isDev) console.error('Failed to update task date:', error)
                    toast.error('오류가 발생했습니다.')
                  }
                }}
                onProgressChange={async (ganttTask) => {
                  try {
                    const result = await updateTask(ganttTask.id, {
                      progress: ganttTask.progress,
                    })

                    if (result.success) {
                      toast.success('진행률이 변경되었습니다.')
                      loadProjectData()
                    } else {
                      toast.error('진행률 변경에 실패했습니다.')
                    }
                  } catch (error) {
                    if (isDev) console.error('Failed to update task progress:', error)
                    toast.error('오류가 발생했습니다.')
                  }
                }}
                onTaskDelete={async (ganttTask) => {
                  if (confirm('정말로 이 작업을 삭제하시겠습니까?')) {
                    try {
                      await deleteTask(ganttTask.id)
                      toast.success('작업이 삭제되었습니다.')
                      loadProjectData()
                    } catch (error) {
                      if (isDev) console.error('Failed to delete task:', error)
                      toast.error('작업 삭제에 실패했습니다.')
                    }
                  }
                }}
              />
            </div>
          )}

          {activeTab === 'mindmap' && (
            <div className="h-full w-full overflow-hidden p-6">
              <MindmapEditor projectId={project.id} projectName={project.name} />
            </div>
          )}

          {activeTab === 'files' && (
            <div className="h-full overflow-y-auto p-6">
              <Card variant="glass" className="max-w-2xl mx-auto py-12">
                <CardContent>
                  <div className="flex flex-col items-center justify-center">
                    <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-lime-100 flex items-center justify-center">
                      <FileText className="h-8 w-8 text-lime-600" />
                    </div>
                    <h3 className="text-lg font-semibold text-slate-900 mb-2">파일 관리</h3>
                    <p className="text-slate-500">파일 관리 기능은 준비 중입니다.</p>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {activeTab === 'activity' && (
            <div className="h-full overflow-y-auto p-6">
              <div className="max-w-4xl">
                <h3 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
                  <div className="p-2 bg-lime-100 rounded-xl">
                    <Activity className="w-5 h-5 text-lime-600" />
                  </div>
                  프로젝트 활동
                </h3>
                <div className="space-y-3">
                  {activities.length > 0 ? (
                    activities.map((activity) => (
                      <Card key={activity.id} variant="glass" className="hover:shadow-lg transition-shadow">
                        <CardContent className="p-4">
                          <div className="flex gap-3">
                            <div className="text-2xl">{activity.icon}</div>
                            <div className="flex-1">
                              <p className="text-sm text-slate-900">{activity.message}</p>
                              <p className="text-xs text-slate-500 mt-1">
                                {activity.userName} · {new Date(activity.timestamp).toLocaleString('ko-KR')}
                              </p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))
                  ) : (
                    <Card variant="glass" className="py-12">
                      <CardContent>
                        <div className="flex flex-col items-center justify-center">
                          <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-lime-100 flex items-center justify-center">
                            <Activity className="h-8 w-8 text-lime-600" />
                          </div>
                          <p className="text-slate-500">활동 내역이 없습니다.</p>
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'team' && (
            <div className="h-full overflow-y-auto p-6">
              <ProjectInvitations projectId={project.id} isAdmin={isProjectAdmin} />
            </div>
          )}

          {activeTab === 'settings' && isProjectAdmin && (
            <div className="h-full overflow-y-auto p-6">
              <div className="max-w-2xl mx-auto">
                <ProjectSettingsCard
                  projectId={project.id}
                  projectName={project.name}
                  initialProgress={calculatedProgress}
                  initialStatus={project.status}
                  initialPriority={(project as any).priority || 'medium'}
                  onUpdate={loadProjectData}
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Sidebar */}
      {showSidebar && <ProjectSidebar project={{ ...project, progress: calculatedProgress }} activities={activities} />}

      {/* Task Creation Modal - Glass Morphism */}
      {showTaskModal && (
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
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">제목</label>
                <Input
                  type="text"
                  value={newTask.title}
                  onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
                  placeholder="작업 제목을 입력하세요"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">설명</label>
                <textarea
                  value={newTask.description}
                  onChange={(e) => setNewTask({ ...newTask, description: e.target.value })}
                  rows={3}
                  className="w-full px-4 py-2.5 bg-white/60 border border-white/40 rounded-xl focus:ring-2 focus:ring-lime-400 focus:border-transparent transition-all text-sm"
                  placeholder="작업 설명을 입력하세요"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">부서</label>
                <div className="flex flex-wrap gap-2">
                  {/* 선택 안함 옵션 */}
                  <button
                    type="button"
                    onClick={() => setNewTask({ ...newTask, department: '' })}
                    className={cn(
                      "px-3 py-1.5 rounded-lg text-xs font-medium transition-all",
                      newTask.department === ''
                        ? 'bg-slate-100 text-slate-600 ring-2 ring-offset-1 ring-slate-400'
                        : 'bg-white/60 text-slate-600 hover:bg-white/80'
                    )}
                  >
                    선택 안함
                  </button>
                  {/* 동적 부서 목록 또는 레거시 fallback */}
                  {departments.length > 0 ? (
                    departments.map(dept => (
                      <button
                        key={dept.id}
                        type="button"
                        onClick={() => setNewTask({ ...newTask, department: dept.id })}
                        className={cn(
                          "px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5",
                          newTask.department === dept.id
                            ? 'ring-2 ring-offset-1 ring-slate-400'
                            : 'bg-white/60 text-slate-600 hover:bg-white/80'
                        )}
                        style={{
                          backgroundColor: newTask.department === dept.id ? `${dept.color}20` : undefined,
                          color: newTask.department === dept.id ? dept.color : undefined,
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
                    // 레거시 fallback (부서 미설정 시)
                    Object.entries(LEGACY_DEPARTMENT_MAP).map(([key, dept]) => (
                      <button
                        key={key}
                        type="button"
                        onClick={() => setNewTask({ ...newTask, department: key })}
                        className={cn(
                          "px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5",
                          newTask.department === key
                            ? 'ring-2 ring-offset-1 ring-slate-400'
                            : 'bg-white/60 text-slate-600 hover:bg-white/80'
                        )}
                        style={{
                          backgroundColor: newTask.department === key ? `${dept.color}20` : undefined,
                          color: newTask.department === key ? dept.color : undefined,
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

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">담당자</label>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => setNewTask({ ...newTask, assignee: '' })}
                    className={cn(
                      "px-3 py-1.5 rounded-lg text-xs font-medium transition-all",
                      newTask.assignee === ''
                        ? 'bg-slate-100 text-slate-700 ring-2 ring-offset-1 ring-slate-400'
                        : 'bg-white/60 text-slate-600 hover:bg-white/80'
                    )}
                  >
                    할당 안함
                  </button>
                  {project.teamMembers?.map((member: any) => (
                    <button
                      key={member.userId}
                      type="button"
                      onClick={() => setNewTask({ ...newTask, assignee: member.userId })}
                      className={cn(
                        "px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5",
                        newTask.assignee === member.userId
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

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">시작일</label>
                  <Input
                    type="date"
                    value={newTask.startDate}
                    onChange={(e) => setNewTask({ ...newTask, startDate: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">마감일</label>
                  <Input
                    type="date"
                    value={newTask.dueDate}
                    onChange={(e) => setNewTask({ ...newTask, dueDate: e.target.value })}
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">우선순위</label>
                <div className="flex gap-2">
                  {[
                    { value: 'low', label: '낮음', activeStyle: 'bg-emerald-100 text-emerald-700 ring-2 ring-emerald-500' },
                    { value: 'medium', label: '보통', activeStyle: 'bg-lime-100 text-lime-700 ring-2 ring-lime-500' },
                    { value: 'high', label: '높음', activeStyle: 'bg-amber-100 text-amber-700 ring-2 ring-amber-500' },
                    { value: 'urgent', label: '긴급', activeStyle: 'bg-rose-100 text-rose-700 ring-2 ring-rose-500' }
                  ].map(priority => (
                    <button
                      key={priority.value}
                      type="button"
                      onClick={() => setNewTask({ ...newTask, priority: priority.value as any })}
                      className={cn(
                        "flex-1 px-3 py-2 rounded-xl text-sm font-medium transition-all",
                        newTask.priority === priority.value
                          ? priority.activeStyle
                          : 'bg-white/60 text-slate-700 hover:bg-white/80'
                      )}
                    >
                      {priority.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">색상</label>
                <div className="flex gap-2">
                  {[
                    '#a3e635', // Lime
                    '#ef4444', // Red
                    '#10b981', // Emerald
                    '#f59e0b', // Amber
                    '#8b5cf6', // Violet
                    '#6b7280', // Gray
                    '#ec4899', // Pink
                    '#14b8a6'  // Teal
                  ].map(color => (
                    <button
                      key={color}
                      type="button"
                      onClick={() => setNewTask({ ...newTask, color })}
                      className={cn(
                        "w-8 h-8 rounded-full border-2 transition-all",
                        newTask.color === color ? 'border-slate-900 scale-110' : 'border-transparent hover:scale-105'
                      )}
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <Button
                variant="glass"
                onClick={() => {
                  setShowTaskModal(false)
                  setEditingTask(null)
                  setNewTask({
                    title: '',
                    description: '',
                    assignee: '',
                    dueDate: '',
                    startDate: '',
                    priority: 'medium',
                    department: '',
                    color: '#a3e635'
                  })
                }}
                className="flex-1 rounded-xl"
              >
                취소
              </Button>
              <Button
                variant="limePrimary"
                onClick={handleCreateTask}
                className="flex-1 rounded-xl"
              >
                {editingTask ? '수정' : '생성'}
              </Button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  )
}
