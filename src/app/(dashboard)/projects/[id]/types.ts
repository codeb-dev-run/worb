// ===========================================
// Project Detail Page - Type Definitions
// ===========================================

import { KanbanTask as TaskType, KanbanColumn, TaskStatus, TaskPriority } from '@/types/task'

// ============================================
// Project Types
// ============================================

export type ProjectStatus = 'planning' | 'design' | 'development' | 'testing' | 'completed' | 'pending'

export interface TeamMember {
  userId: string
  name: string
  role: 'Admin' | 'PM' | 'Developer' | 'Designer' | 'Viewer'
  avatar?: string
  email?: string
}

export interface ProjectFile {
  id: string
  name: string
  url: string
  size: number
  type: string
  uploadedBy: string
  uploadedAt?: Date
  createdAt?: Date
  category?: string
  projectId?: string
}

export interface ProjectDetail {
  id: string
  name: string
  description: string
  status: ProjectStatus
  progress: number
  startDate: Date | null
  endDate: Date | null
  budget: number | null
  spentBudget?: number
  team: string[]
  teamMembers: TeamMember[]
  clientId: string | null
  clientName?: string | null
  createdAt: Date
  updatedAt: Date
  tasks?: TaskType[]
  files?: ProjectFile[]
  activities?: Activity[]
  priority?: 'low' | 'medium' | 'high' | 'urgent'
}

// ============================================
// Activity Types
// ============================================

export interface Activity {
  id: string
  type: string
  message: string
  userName: string
  timestamp: Date
  icon: string
}

// ============================================
// Tab Types
// ============================================

export type ProjectTab = 'overview' | 'kanban' | 'gantt' | 'mindmap' | 'files' | 'activity' | 'team' | 'settings'

// ============================================
// Status Configuration
// ============================================

export interface StatusConfig {
  label: string
  color: 'amber' | 'violet' | 'lime' | 'sky' | 'emerald' | 'slate'
}

export const STATUS_CONFIG: Record<ProjectStatus, StatusConfig> = {
  planning: { label: '기획', color: 'amber' },
  design: { label: '디자인', color: 'violet' },
  development: { label: '개발', color: 'lime' },
  testing: { label: '테스트', color: 'sky' },
  completed: { label: '완료', color: 'emerald' },
  pending: { label: '대기', color: 'slate' }
}

// ============================================
// Kanban Types
// ============================================

export interface KanbanColumnWithTasks extends KanbanColumn {
  tasks: TaskType[]
}

export const DEFAULT_COLUMNS: KanbanColumn[] = [
  { id: 'todo', title: '할 일', color: '#ef4444', order: 0 },
  { id: 'in_progress', title: '진행 중', color: '#eab308', order: 1 },
  { id: 'review', title: '검토', color: '#8b5cf6', order: 2 },
  { id: 'done', title: '완료', color: '#10b981', order: 3 }
]

// ============================================
// Task Form Types
// ============================================

export interface NewTaskForm {
  title: string
  description: string
  assignee: string
  dueDate: string
  startDate: string
  priority: 'low' | 'medium' | 'high' | 'urgent'
  department: string
  color: string
  progress: number
}

export const INITIAL_TASK_FORM: NewTaskForm = {
  title: '',
  description: '',
  assignee: '',
  dueDate: '',
  startDate: '',
  priority: 'medium',
  department: '',
  color: '#a3e635',
  progress: 0
}

// ============================================
// Priority Configuration
// ============================================

export interface PriorityConfig {
  value: string
  label: string
  icon: React.ComponentType<{ className?: string }> | null
  activeStyle: string
}

// ============================================
// Role Colors
// ============================================

export interface RoleColorConfig {
  bg: string
  text: string
  border: string
}

export const ROLE_COLORS: Record<string, RoleColorConfig> = {
  Admin: { bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200' },
  PM: { bg: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-200' },
  Developer: { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200' },
  Designer: { bg: 'bg-pink-50', text: 'text-pink-700', border: 'border-pink-200' },
  Viewer: { bg: 'bg-slate-50', text: 'text-slate-700', border: 'border-slate-200' },
}

// ============================================
// Utility Functions
// ============================================

/**
 * Convert task status to columnId
 */
export function getColumnIdFromStatus(status: string): string {
  const statusMap: Record<string, string> = {
    // 대문자 (legacy)
    'TODO': 'todo',
    'IN_PROGRESS': 'in_progress',
    'REVIEW': 'review',
    'DONE': 'done',
    'COMPLETED': 'done',
    // 소문자 (Prisma enum)
    'todo': 'todo',
    'in_progress': 'in_progress',
    'review': 'review',
    'done': 'done',
  }
  return statusMap[status] || 'todo'
}

/**
 * Format relative time
 */
export function formatRelativeTime(timestamp: Date): string {
  const diff = Date.now() - new Date(timestamp).getTime()
  const minutes = Math.floor(diff / 60000)
  const hours = Math.floor(diff / 3600000)
  const days = Math.floor(diff / 86400000)

  if (minutes < 1) return '방금 전'
  if (minutes < 60) return `${minutes}분 전`
  if (hours < 24) return `${hours}시간 전`
  return `${days}일 전`
}

/**
 * Calculate days remaining until deadline
 */
export function calculateDaysRemaining(endDate: Date): { text: string; isOverdue: boolean } {
  const daysLeft = Math.ceil((new Date(endDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24))

  if (daysLeft > 0) return { text: `${daysLeft}일 남음`, isOverdue: false }
  if (daysLeft === 0) return { text: '오늘 마감', isOverdue: false }
  return { text: `${Math.abs(daysLeft)}일 초과`, isOverdue: true }
}

// Re-export task types for convenience
export { TaskStatus, TaskPriority }
export type { TaskType, KanbanColumn }
