'use client'

import React, { useState, useEffect, useRef } from 'react'
import { useAuth } from '@/lib/auth-context'
import { useWorkspace } from '@/lib/workspace-context'
import { motion, AnimatePresence } from 'framer-motion'
import { Task as TaskType, KanbanColumn } from '@/types/task'
import { TaskStatus, TaskPriority } from '@/types/task'
import { getAllTasks, updateTask, deleteTask, createTask } from '@/actions/task'
import { getProjects } from '@/actions/project'
import { getDepartmentColor } from '@/constants/departments'
import { customToast as toast } from '@/components/notification/NotificationToast'
import Link from 'next/link'
import {
  Send,
  Folder,
  CheckCircle2,
  Pause,
  Play,
  Eye,
  CheckCheck,
  Calendar,
  Edit2,
  Trash2,
  X,
  LayoutGrid,
  List,
  User,
  Plus,
  Trash,
  RotateCcw,
  AlertTriangle,
  Flag,
  ArrowUp,
  ArrowDown,
  Minus
} from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import KanbanBoardDnD from '@/components/kanban/KanbanBoardDnD'

// ===========================================
// Glass Morphism Tasks Page
// ===========================================

const statusIcons = {
  all: { icon: Folder, label: '전체', color: 'text-slate-500' },
  todo: { icon: Pause, label: '할일', color: 'text-slate-500' },
  in_progress: { icon: Play, label: '진행중', color: 'text-amber-500' },
  review: { icon: Eye, label: '검토', color: 'text-violet-500' },
  done: { icon: CheckCheck, label: '완료', color: 'text-lime-500' },
}

const DEFAULT_COLUMNS: KanbanColumn[] = [
  { id: 'todo', title: '할 일', color: '#ef4444', order: 0 },
  { id: 'in_progress', title: '진행 중', color: '#eab308', order: 1 },
  { id: 'review', title: '검토', color: '#8b5cf6', order: 2 },
  { id: 'done', title: '완료', color: '#10b981', order: 3 }
]

const priorityConfig = {
  urgent: { icon: AlertTriangle, label: '긴급', color: 'text-rose-500', bg: 'bg-rose-50', border: 'border-rose-200', ring: 'ring-rose-400' },
  high: { icon: ArrowUp, label: '높음', color: 'text-orange-500', bg: 'bg-orange-50', border: 'border-orange-200', ring: 'ring-orange-400' },
  medium: { icon: Minus, label: '보통', color: 'text-amber-500', bg: 'bg-amber-50', border: 'border-amber-200', ring: 'ring-amber-400' },
  low: { icon: ArrowDown, label: '낮음', color: 'text-sky-500', bg: 'bg-sky-50', border: 'border-sky-200', ring: 'ring-sky-400' },
}

export default function TasksPage() {
  const { userProfile } = useAuth()
  const { currentWorkspace, loading: workspaceLoading } = useWorkspace()
  const [tasks, setTasks] = useState<TaskType[]>([])
  const [projects, setProjects] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [filterStatus, setFilterStatus] = useState<string>('all')
  const [filterProject, setFilterProject] = useState<string>('all')
  const [activeTab, setActiveTab] = useState<'list' | 'kanban' | 'trash'>('list')

  // 휴지통 상태 (로컬 스토리지로 관리)
  const [trashedTasks, setTrashedTasks] = useState<TaskType[]>([])

  const [newTaskTitle, setNewTaskTitle] = useState('')
  const [isCreating, setIsCreating] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const [editingTask, setEditingTask] = useState<TaskType | null>(null)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [editForm, setEditForm] = useState({
    title: '',
    description: '',
    projectId: 'personal', // Default to personal
    status: 'todo' as TaskStatus,
    priority: 'medium' as TaskPriority,
    startDate: '',
    dueDate: '',
  })

  // 기간 슬라이더 상태
  const [durationDays, setDurationDays] = useState(7) // 기본 7일
  const [useSlider, setUseSlider] = useState(false)

  const loadData = async () => {
    if (!userProfile || !currentWorkspace) return

    try {
      console.log('[TasksPage] Loading data for workspace:', currentWorkspace.id)
      const [tasksData, projectsData] = await Promise.all([
        getAllTasks(userProfile.uid, currentWorkspace.id),
        getProjects(userProfile.uid, currentWorkspace.id)
      ])

      console.log('[TasksPage] Loaded tasks:', tasksData.length)
      console.log('[TasksPage] Loaded projects:', projectsData.length)

      setTasks(tasksData as unknown as TaskType[])
      setProjects(projectsData)
    } catch (error) {
      console.error('Error loading tasks data:', error)
      toast.error('데이터를 불러오는데 실패했습니다.')
    } finally {
      setLoading(false)
    }
  }

  // 휴지통 데이터 로드 (localStorage)
  useEffect(() => {
    if (currentWorkspace?.id) {
      const stored = localStorage.getItem(`trash_tasks_${currentWorkspace.id}`)
      if (stored) {
        try {
          setTrashedTasks(JSON.parse(stored))
        } catch (e) {
          console.error('Failed to parse trash data:', e)
        }
      }
    }
  }, [currentWorkspace?.id])

  // 휴지통 데이터 저장
  const saveTrashedTasks = (newTrashedTasks: TaskType[]) => {
    if (currentWorkspace?.id) {
      localStorage.setItem(`trash_tasks_${currentWorkspace.id}`, JSON.stringify(newTrashedTasks))
      setTrashedTasks(newTrashedTasks)
    }
  }

  useEffect(() => {
    if (!workspaceLoading) {
      if (userProfile && currentWorkspace) {
        loadData()
      } else {
        setLoading(false)
      }
    }
  }, [userProfile, currentWorkspace, workspaceLoading])

  const handleCreateTask = async () => {
    if (!newTaskTitle.trim() || !userProfile) return

    // Create as Personal Task by default if no project selected in filter
    const targetProjectId = filterProject !== 'all' && filterProject !== 'personal' ? filterProject : undefined

    setIsCreating(true)
    try {
      const result = await createTask(targetProjectId || '', { // Empty string or undefined for personal? Action expects string | undefined
        title: newTaskTitle,
        status: 'todo' as TaskStatus,
        priority: 'medium' as TaskPriority,
        createdBy: userProfile.uid,
      })

      if (result.success) {
        toast.success('작업이 생성되었습니다.')
        setNewTaskTitle('')
        loadData()
      } else {
        throw new Error('Create failed')
      }
    } catch (error) {
      console.error('[TasksPage] Error creating task:', error)
      toast.error('작업 생성 실패')
    } finally {
      setIsCreating(false)
    }
  }

  const handleStatusChange = async (taskId: string, newStatus: TaskStatus) => {
    try {
      const result = await updateTask(taskId, { status: newStatus })
      if (result.success) {
        toast.success('상태가 업데이트되었습니다.')
        loadData()
      } else {
        throw new Error('Update failed')
      }
    } catch (error) {
      console.error('Error updating task:', error)
      toast.error('상태 업데이트 실패')
    }
  }

  // 휴지통으로 이동 (확인 없이)
  const handleMoveToTrash = (taskId: string) => {
    const taskToTrash = tasks.find(t => t.id === taskId)
    if (!taskToTrash) return

    // 휴지통에 추가 (삭제 시간 기록)
    const trashedTask = {
      ...taskToTrash,
      deletedAt: new Date().toISOString()
    }
    saveTrashedTasks([trashedTask, ...trashedTasks])

    // tasks 목록에서 제거 (optimistic update)
    setTasks(prev => prev.filter(t => t.id !== taskId))
    toast.success('휴지통으로 이동되었습니다.')
  }

  // 휴지통에서 복원
  const handleRestoreTask = (taskId: string) => {
    const taskToRestore = trashedTasks.find(t => t.id === taskId)
    if (!taskToRestore) return

    // 휴지통에서 제거
    saveTrashedTasks(trashedTasks.filter(t => t.id !== taskId))

    // tasks 목록에 다시 추가
    const { deletedAt, ...restoredTask } = taskToRestore as any
    setTasks(prev => [restoredTask, ...prev])
    toast.success('작업이 복원되었습니다.')
  }

  // 휴지통에서 영구 삭제
  const handlePermanentDelete = async (taskId: string) => {
    try {
      const result = await deleteTask(taskId)
      if (result.success) {
        saveTrashedTasks(trashedTasks.filter(t => t.id !== taskId))
        toast.success('영구 삭제되었습니다.')
      } else {
        throw new Error('Delete failed')
      }
    } catch (error) {
      console.error('Error deleting task:', error)
      toast.error('삭제 실패')
    }
  }

  // 휴지통 비우기
  const handleEmptyTrash = async () => {
    if (trashedTasks.length === 0) return

    try {
      // 모든 휴지통 항목 영구 삭제
      await Promise.all(trashedTasks.map(task => deleteTask(task.id)))
      saveTrashedTasks([])
      toast.success('휴지통을 비웠습니다.')
    } catch (error) {
      console.error('Error emptying trash:', error)
      toast.error('휴지통 비우기 실패')
    }
  }

  const openEditModal = (task: TaskType) => {
    setEditingTask(task)

    // 오늘 날짜
    const today = new Date().toISOString().split('T')[0]

    // 시작일: 기존 값이 있으면 사용, 없으면 오늘
    const startDate = task.startDate
      ? new Date(task.startDate).toISOString().split('T')[0]
      : today

    // 마감일 계산
    let dueDate = ''
    let days = 7 // 기본 7일

    if (task.startDate && task.dueDate) {
      // 기존 시작일과 마감일이 있으면 그 기간 계산
      dueDate = new Date(task.dueDate).toISOString().split('T')[0]
      const start = new Date(task.startDate)
      const end = new Date(task.dueDate)
      const diffDays = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24))
      days = Math.min(Math.max(diffDays, 1), 120)
    } else if (task.dueDate) {
      // 마감일만 있으면 그대로 사용
      dueDate = new Date(task.dueDate).toISOString().split('T')[0]
    } else {
      // 둘 다 없으면 오늘 + 7일
      const endDate = new Date(today)
      endDate.setDate(endDate.getDate() + 7)
      dueDate = endDate.toISOString().split('T')[0]
    }

    setDurationDays(days)
    setUseSlider(true)

    setEditForm({
      title: task.title,
      description: task.description || '',
      projectId: task.projectId || 'personal',
      status: task.status,
      priority: task.priority,
      startDate,
      dueDate,
    })
    setIsEditModalOpen(true)
  }

  // 시작일 변경 시 슬라이더 활성화 및 마감일 계산
  const handleStartDateChange = (newStartDate: string) => {
    if (newStartDate) {
      setUseSlider(true)
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
  }

  // 슬라이더로 기간 변경 시 마감일 자동 계산
  const handleDurationChange = (days: number) => {
    setDurationDays(days)
    if (editForm.startDate) {
      const start = new Date(editForm.startDate)
      const end = new Date(start)
      end.setDate(end.getDate() + days)
      setEditForm(prev => ({
        ...prev,
        dueDate: end.toISOString().split('T')[0]
      }))
    }
  }

  // 기간 포맷팅 (일 → 주/월 표시)
  const formatDuration = (days: number) => {
    if (days === 1) return '1일'
    if (days < 7) return `${days}일`
    if (days === 7) return '1주'
    if (days < 14) return `${days}일`
    if (days === 14) return '2주'
    if (days < 30) return `${days}일`
    if (days === 30) return '1개월'
    if (days < 60) return `${days}일`
    if (days === 60) return '2개월'
    if (days < 90) return `${days}일`
    if (days === 90) return '3개월'
    if (days < 120) return `${days}일`
    if (days === 120) return '4개월'
    return `${days}일`
  }

  const handleEditTask = async () => {
    if (!editingTask) return

    try {
      const result = await updateTask(editingTask.id, {
        title: editForm.title,
        description: editForm.description,
        projectId: editForm.projectId === 'personal' ? null : editForm.projectId, // Handle personal task mapping
        status: editForm.status,
        priority: editForm.priority,
        startDate: editForm.startDate ? new Date(editForm.startDate) : undefined,
        dueDate: editForm.dueDate ? new Date(editForm.dueDate) : undefined,
      })

      if (result.success) {
        toast.success('작업이 수정되었습니다.')
        setIsEditModalOpen(false)
        loadData()
      } else {
        throw new Error('Update failed')
      }
    } catch (error) {
      console.error('Error updating task:', error)
      toast.error('수정 실패')
    }
  }

  const handleKanbanColumnsChange = async (newColumns: any[]) => {
    // Optimistic update
    const allTasks = newColumns.flatMap(col => col.tasks)

    // Find changed tasks
    const updates: Promise<any>[] = []

    newColumns.forEach(column => {
      column.tasks.forEach((task: TaskType) => {
        const originalTask = tasks.find(t => t.id === task.id)
        if (originalTask && originalTask.status !== column.id) {
          // status와 columnId를 함께 업데이트하여 두 페이지 간 동기화 보장
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
      console.error('Failed to update tasks:', error)
      toast.error('작업 업데이트 실패')
      loadData() // Revert on error
    }
  }

  const filteredTasks = tasks
    .filter(task => {
      if (filterStatus !== 'all' && task.status !== filterStatus) return false
      if (filterProject !== 'all') {
        if (filterProject === 'personal') {
          return !task.projectId // Show only tasks without projectId
        }
        return task.projectId === filterProject
      }
      return true
    })
    // 최신 작업이 상단에 표시되도록 정렬 (createdAt 기준 내림차순)
    .sort((a, b) => {
      const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0
      const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0
      return dateB - dateA
    })

  // Prepare columns for Kanban
  const kanbanColumns = DEFAULT_COLUMNS.map(col => ({
    ...col,
    tasks: filteredTasks.filter(task => (task.status === col.id) || (col.id === 'todo' && !['in_progress', 'review', 'done'].includes(task.status)))
      .map(task => ({
        ...task,
        columnId: col.id,
        // Ensure required fields for KanbanTask
        checklist: task.checklist || [],
        attachments: task.attachments || [],
        labels: task.labels || []
      }))
  }))

  if (loading || workspaceLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-lime-400"></div>
      </div>
    )
  }

  return (
    <div className="h-[calc(100vh-4rem)] flex flex-col animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 px-6 py-4 border-b border-slate-200/60 bg-white/40 backdrop-blur-sm shrink-0">
        <div className="space-y-1">
          <h2 className="text-sm font-medium text-slate-500">작업 관리</h2>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">내 작업</h1>
        </div>

        {/* View Toggle - Glass Style */}
        <div className="flex bg-white/60 backdrop-blur-sm p-1 rounded-xl border border-white/40">
          <button
            onClick={() => setActiveTab('list')}
            className={`px-4 py-2 rounded-xl flex items-center gap-2 text-xs font-medium transition-all duration-300 ${activeTab === 'list' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-900'
              }`}
          >
            <List className="w-4 h-4" />
            리스트
          </button>
          <button
            onClick={() => setActiveTab('kanban')}
            className={`px-4 py-2 rounded-xl flex items-center gap-2 text-xs font-medium transition-all duration-300 ${activeTab === 'kanban' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-900'
              }`}
          >
            <LayoutGrid className="w-4 h-4" />
            칸반 보드
          </button>
          <button
            onClick={() => setActiveTab('trash')}
            className={`px-4 py-2 rounded-xl flex items-center gap-2 text-xs font-medium transition-all duration-300 relative ${activeTab === 'trash' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-900'
              }`}
          >
            <Trash className="w-4 h-4" />
            {trashedTasks.length > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-rose-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                {trashedTasks.length > 9 ? '9+' : trashedTasks.length}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Filters - 휴지통이 아닐 때만 표시 */}
      {activeTab !== 'trash' && (
        <div className="flex flex-col sm:flex-row sm:items-center gap-6 bg-white/40 backdrop-blur-md px-6 py-4 border-b border-slate-200/60 shrink-0">
          <div className="flex items-center gap-3">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Status:</span>
            <div className="flex gap-1">
              {Object.entries(statusIcons).map(([key, { icon: Icon, label, color }]) => (
                <button
                  key={key}
                  onClick={() => setFilterStatus(key)}
                  className={`p-2.5 rounded-xl transition-all duration-300 ${filterStatus === key
                    ? 'bg-lime-400 text-black shadow-lg shadow-lime-400/30'
                    : 'bg-white/60 hover:bg-lime-50 text-slate-400 hover:text-lime-500'
                    }`}
                  title={label}
                >
                  <Icon className={`w-4 h-4 ${filterStatus === key ? 'text-black' : color}`} />
                </button>
              ))}
            </div>
          </div>

          <div className="hidden sm:block w-px h-8 bg-slate-200/60" />

          <div className="flex items-center gap-3 flex-wrap">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Project:</span>
            <div className="flex gap-1.5 flex-wrap">
              <button
                onClick={() => setFilterProject('all')}
                className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all duration-300 ${filterProject === 'all'
                  ? 'bg-lime-400 text-black shadow-lg shadow-lime-400/30'
                  : 'bg-white/60 hover:bg-lime-50 text-slate-500 hover:text-slate-700'
                  }`}
              >
                전체
              </button>
              <button
                onClick={() => setFilterProject('personal')}
                className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all duration-300 flex items-center gap-1.5 ${filterProject === 'personal'
                  ? 'bg-lime-400 text-black shadow-lg shadow-lime-400/30'
                  : 'bg-white/60 hover:bg-lime-50 text-slate-500 hover:text-slate-700'
                  }`}
              >
                <User className="w-3 h-3" />
                개인 작업
              </button>
              {projects.map(project => (
                <button
                  key={project.id}
                  onClick={() => setFilterProject(project.id)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all duration-300 ${filterProject === project.id
                    ? 'bg-lime-400 text-black shadow-lg shadow-lime-400/30'
                    : 'bg-white/60 hover:bg-lime-50 text-slate-500 hover:text-slate-700'
                    }`}
                >
                  {project.name}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Content Area */}
      {activeTab === 'trash' ? (
        /* 휴지통 뷰 */
        <div className="flex-1 overflow-auto px-6 py-4 space-y-4">
          {/* 휴지통 헤더 */}
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
                onClick={handleEmptyTrash}
                className="rounded-xl text-xs"
              >
                <Trash2 className="w-3.5 h-3.5 mr-1.5" />
                휴지통 비우기
              </Button>
            )}
          </div>

          {/* 휴지통 목록 */}
          <div className="space-y-3">
            <AnimatePresence>
              {trashedTasks.map((task) => {
                const StatusIcon = statusIcons[task.status as keyof typeof statusIcons]?.icon || Pause
                const deletedDate = (task as any).deletedAt
                  ? new Date((task as any).deletedAt).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
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
                        onClick={() => handleRestoreTask(task.id)}
                        className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-emerald-600 hover:bg-emerald-50 rounded-xl transition-all duration-200"
                        title="복원"
                      >
                        <RotateCcw className="w-4 h-4" />
                        복원
                      </button>
                      <button
                        onClick={() => handlePermanentDelete(task.id)}
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
      ) : activeTab === 'list' ? (
        <div className="flex-1 overflow-auto px-6 py-4">
          {/* Tasks List */}
          <div className="space-y-3 pb-24">
            <AnimatePresence>
              {filteredTasks.map((task) => {
                const StatusIcon = statusIcons[task.status as keyof typeof statusIcons]?.icon || Pause
                const statusColor = statusIcons[task.status as keyof typeof statusIcons]?.color || 'text-gray-600'
                const isPersonal = !task.projectId

                return (
                  <motion.div
                    key={task.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, x: -100 }}
                    onDoubleClick={() => openEditModal(task)}
                    className="group flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-3xl bg-white/70 backdrop-blur-xl border border-white/60 hover:bg-white/90 hover:shadow-lg hover:shadow-lime-500/5 hover:-translate-y-0.5 transition-all duration-300 cursor-pointer gap-4"
                  >
                    <div className="flex items-center gap-4 flex-1 min-w-0">
                      <div className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 ${
                        task.status === 'done'
                          ? 'bg-lime-100 text-lime-600'
                          : task.status === 'in_progress'
                            ? 'bg-amber-100 text-amber-600'
                            : task.status === 'review'
                              ? 'bg-violet-100 text-violet-600'
                              : 'bg-slate-100 text-slate-500'
                      }`}>
                        <StatusIcon className="w-5 h-5" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <h3 className={`font-medium text-slate-900 truncate ${task.status === 'done' ? 'line-through text-slate-400' : ''}`}>
                            {task.title}
                          </h3>
                          {/* 우선순위 배지 */}
                          {task.priority && priorityConfig[task.priority as keyof typeof priorityConfig] && (
                            <span className={`flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full font-medium shrink-0 ${priorityConfig[task.priority as keyof typeof priorityConfig].bg} ${priorityConfig[task.priority as keyof typeof priorityConfig].color}`}>
                              {React.createElement(priorityConfig[task.priority as keyof typeof priorityConfig].icon, { className: 'w-3 h-3' })}
                              {priorityConfig[task.priority as keyof typeof priorityConfig].label}
                            </span>
                          )}
                          {isPersonal && (
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 font-medium shrink-0">개인</span>
                          )}
                        </div>
                        {task.description && (
                          <p className="text-sm text-slate-500 truncate mt-0.5">{task.description}</p>
                        )}
                        <div className="flex items-center gap-3 mt-1.5 text-xs text-slate-400">
                          <Link href={task.projectId ? `/projects/${task.projectId}` : '#'} className="flex items-center gap-1 hover:text-lime-500 transition-colors">
                            <Folder className="w-3 h-3" />
                            {(task as any).projectName || 'Personal'}
                          </Link>
                          {task.dueDate && (
                            <span className="flex items-center gap-1">
                              <Calendar className="w-3 h-3" />
                              {new Date(task.dueDate).toLocaleDateString('ko-KR')}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                      {/* Quick Status Change Icons */}
                      {Object.entries(statusIcons)
                        .filter(([key]) => key !== 'all' && key !== task.status)
                        .map(([key, { icon: Icon, label, color }]) => (
                          <button
                            key={key}
                            onClick={(e) => {
                              e.stopPropagation()
                              handleStatusChange(task.id, key as TaskStatus)
                            }}
                            className="p-2 text-slate-400 hover:bg-lime-50 rounded-xl transition-all duration-200"
                            title={`${label}로 변경`}
                          >
                            <Icon className={`w-4 h-4 ${color}`} />
                          </button>
                        ))}
                      <div className="w-px h-6 bg-slate-200/60 mx-1"></div>
                      <button
                        onClick={() => openEditModal(task)}
                        className="p-2 text-slate-400 hover:text-lime-500 hover:bg-lime-50 rounded-xl transition-all duration-200"
                        title="수정"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleMoveToTrash(task.id)}
                        className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all duration-200"
                        title="휴지통으로 이동"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </motion.div>
                )
              })}
            </AnimatePresence>

            {filteredTasks.length === 0 && (
              <div className="text-center py-16">
                <div className="w-16 h-16 mx-auto mb-4 rounded-3xl bg-slate-100/80 flex items-center justify-center">
                  <CheckCircle2 className="w-8 h-8 text-slate-300" />
                </div>
                <p className="text-slate-400 font-medium">작업이 없습니다.</p>
                <p className="text-sm text-slate-400 mt-1">새 작업을 추가해보세요</p>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="flex-1 overflow-auto px-6 py-4">
          <KanbanBoardDnD
            columns={kanbanColumns as any}
            onColumnsChange={handleKanbanColumnsChange}
            onTaskAdd={() => {
              setNewTaskTitle('')
              setIsCreating(true)
              inputRef.current?.focus()
            }}
            onTaskEdit={openEditModal}
            onTaskDelete={(taskId) => handleMoveToTrash(taskId)}
          />
        </div>
      )}

      {/* Floating Task Input - 하단 고정 */}
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 w-full max-w-3xl px-6 z-50">
        <div className="relative group">
          <div className="absolute -inset-1 bg-gradient-to-r from-lime-300 to-emerald-300 rounded-[2rem] blur opacity-20 group-hover:opacity-40 transition duration-1000 group-hover:duration-200"></div>
          <div className="relative flex items-center bg-white/90 backdrop-blur-2xl border border-white/50 rounded-[2rem] shadow-xl shadow-slate-200/50 p-2 pr-2.5">
            <div className="flex items-center justify-center w-10 h-10 rounded-full bg-lime-100 text-lime-600 ml-1">
              <Plus className="w-5 h-5" />
            </div>
            <input
              ref={inputRef}
              type="text"
              value={newTaskTitle}
              onChange={(e) => setNewTaskTitle(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleCreateTask()}
              placeholder="새 작업을 입력하세요..."
              className="flex-1 px-4 py-3 bg-transparent text-slate-700 placeholder:text-slate-400 focus:outline-none text-sm"
              disabled={isCreating}
            />
            <button
              onClick={handleCreateTask}
              disabled={!newTaskTitle.trim() || isCreating}
              className="flex items-center gap-2 px-5 py-2.5 bg-lime-400 text-black font-medium rounded-full hover:bg-lime-500 shadow-lg shadow-lime-400/30 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 text-sm"
            >
              <Send className="w-4 h-4" />
              추가
            </button>
          </div>
        </div>
      </div>

      {/* Edit Modal - Glass Style */}
      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] bg-white/95 backdrop-blur-2xl border-white/40 rounded-3xl shadow-2xl flex flex-col">
          <DialogHeader className="pb-4 border-b border-slate-100 shrink-0">
            <div className="space-y-1">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Task</p>
              <DialogTitle className="text-xl font-bold text-slate-900">작업 수정</DialogTitle>
            </div>
          </DialogHeader>
          <div className="space-y-5 py-6 overflow-y-auto flex-1">
            <div className="space-y-2">
              <Label className="text-xs font-bold text-slate-400 uppercase tracking-wider">작업명</Label>
              <Input
                value={editForm.title}
                onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                placeholder="작업명을 입력하세요"
                className="rounded-xl h-11"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-bold text-slate-400 uppercase tracking-wider">설명</Label>
              <Input
                value={editForm.description}
                onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                placeholder="작업 설명 (선택사항)"
                className="rounded-xl h-11"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-bold text-slate-400 uppercase tracking-wider">상태</Label>
              <div className="flex gap-2 flex-wrap">
                {Object.entries(statusIcons)
                  .filter(([key]) => key !== 'all')
                  .map(([key, { icon: Icon, label, color }]) => (
                    <button
                      key={key}
                      onClick={() => setEditForm({ ...editForm, status: key as TaskStatus })}
                      className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border transition-all duration-300 ${editForm.status === key
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

            {/* 우선순위 */}
            <div className="space-y-2">
              <Label className="text-xs font-bold text-slate-400 uppercase tracking-wider">우선순위</Label>
              <div className="flex gap-2 flex-wrap">
                {Object.entries(priorityConfig).map(([key, { icon: Icon, label, color, bg, border, ring }]) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setEditForm({ ...editForm, priority: key as TaskPriority })}
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

            <div className="space-y-2">
              <Label className="text-xs font-bold text-slate-400 uppercase tracking-wider">프로젝트</Label>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setEditForm({ ...editForm, projectId: 'personal' })}
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
                    onClick={() => setEditForm({ ...editForm, projectId: project.id })}
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

            {/* 시작일 입력 */}
            <div className="space-y-2">
              <Label className="text-xs font-bold text-slate-400 uppercase tracking-wider">시작일</Label>
              <Input
                type="date"
                value={editForm.startDate}
                onChange={(e) => handleStartDateChange(e.target.value)}
                className="rounded-xl h-11"
              />
            </div>

            {/* 기간 슬라이더 (시작일 선택 후 표시) */}
            {editForm.startDate && (
              <div className="space-y-4 p-4 bg-slate-50/80 rounded-2xl border border-slate-100">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-bold text-slate-400 uppercase tracking-wider">기간 설정</Label>
                  <div className="flex items-center gap-2">
                    <span className="text-2xl font-bold text-lime-600">{formatDuration(durationDays)}</span>
                    <span className="text-xs text-slate-400">({durationDays}일)</span>
                  </div>
                </div>

                {/* 슬라이더 */}
                <div className="relative pt-2">
                  <input
                    type="range"
                    min="1"
                    max="120"
                    value={durationDays}
                    onChange={(e) => handleDurationChange(parseInt(e.target.value))}
                    onWheel={(e) => {
                      e.preventDefault()
                      const delta = e.deltaY < 0 ? 1 : -1
                      const newValue = Math.min(120, Math.max(1, durationDays + delta))
                      handleDurationChange(newValue)
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
                  {/* 슬라이더 마커 */}
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

                {/* 퀵 버튼 */}
                <div className="flex flex-wrap gap-2">
                  {[
                    { label: '1일', value: 1 },
                    { label: '3일', value: 3 },
                    { label: '1주', value: 7 },
                    { label: '10일', value: 10 },
                    { label: '2주', value: 14 },
                    { label: '30일', value: 30 },
                    { label: '60일', value: 60 },
                    { label: '90일', value: 90 },
                    { label: '120일', value: 120 },
                  ].map(({ label, value }) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => handleDurationChange(value)}
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

                {/* 마감일 표시 */}
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
            <Button variant="glass" onClick={() => setIsEditModalOpen(false)} className="rounded-xl">
              취소
            </Button>
            <Button variant="limePrimary" onClick={handleEditTask} className="rounded-xl">
              저장
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}