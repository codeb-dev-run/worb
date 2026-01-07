// ===========================================
// Tasks Page - Type Definitions
// ===========================================

import { Task as TaskType, KanbanColumn, TaskStatus, TaskPriority, KanbanTask } from '@/types/task'
import {
  Folder,
  Pause,
  Play,
  Eye,
  CheckCheck,
  AlertTriangle,
  ArrowUp,
  ArrowDown,
  Minus
} from 'lucide-react'

// ============================================
// View Types
// ============================================

export type ActiveTab = 'list' | 'kanban' | 'trash'

// ============================================
// Status Configuration
// ============================================

export interface StatusIconConfig {
  icon: React.ComponentType<{ className?: string }>
  label: string
  color: string
}

export const STATUS_ICONS: Record<string, StatusIconConfig> = {
  all: { icon: Folder, label: '전체', color: 'text-slate-500' },
  todo: { icon: Pause, label: '할일', color: 'text-slate-500' },
  in_progress: { icon: Play, label: '진행중', color: 'text-amber-500' },
  review: { icon: Eye, label: '검토', color: 'text-violet-500' },
  done: { icon: CheckCheck, label: '완료', color: 'text-lime-500' },
}

// ============================================
// Priority Configuration
// ============================================

export interface PriorityIconConfig {
  icon: React.ComponentType<{ className?: string }>
  label: string
  color: string
  bg: string
  border: string
  ring: string
}

export const PRIORITY_CONFIG: Record<string, PriorityIconConfig> = {
  urgent: { icon: AlertTriangle, label: '긴급', color: 'text-rose-500', bg: 'bg-rose-50', border: 'border-rose-200', ring: 'ring-rose-400' },
  high: { icon: ArrowUp, label: '높음', color: 'text-orange-500', bg: 'bg-orange-50', border: 'border-orange-200', ring: 'ring-orange-400' },
  medium: { icon: Minus, label: '보통', color: 'text-amber-500', bg: 'bg-amber-50', border: 'border-amber-200', ring: 'ring-amber-400' },
  low: { icon: ArrowDown, label: '낮음', color: 'text-sky-500', bg: 'bg-sky-50', border: 'border-sky-200', ring: 'ring-sky-400' },
}

// ============================================
// Kanban Columns
// ============================================

export interface KanbanColumnWithTasks {
  id: string
  title: string
  color: string
  order: number
  limit?: number
  tasks: KanbanTask[]
}

export const DEFAULT_COLUMNS: KanbanColumn[] = [
  { id: 'todo', title: '할 일', color: '#ef4444', order: 0 },
  { id: 'in_progress', title: '진행 중', color: '#eab308', order: 1 },
  { id: 'review', title: '검토', color: '#8b5cf6', order: 2 },
  { id: 'done', title: '완료', color: '#10b981', order: 3 }
]

// ============================================
// Edit Form Types
// ============================================

export interface TaskEditForm {
  title: string
  description: string
  projectId: string
  status: TaskStatus
  priority: TaskPriority
  startDate: string
  dueDate: string
}

export const INITIAL_EDIT_FORM: TaskEditForm = {
  title: '',
  description: '',
  projectId: 'personal',
  status: 'todo' as TaskStatus,
  priority: 'medium' as TaskPriority,
  startDate: '',
  dueDate: '',
}

// ============================================
// Trashed Task Type
// ============================================

export interface TrashedTask extends TaskType {
  deletedAt?: string
}

// ============================================
// Project Type
// ============================================

export interface ProjectOption {
  id: string
  name: string
  isMember?: boolean
  userRole?: string
}

// ============================================
// Utility Functions
// ============================================

/**
 * Format duration in days to human-readable string
 */
export function formatDuration(days: number): string {
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

/**
 * Duration quick select options
 */
export const DURATION_OPTIONS = [
  { label: '1일', value: 1 },
  { label: '3일', value: 3 },
  { label: '1주', value: 7 },
  { label: '10일', value: 10 },
  { label: '2주', value: 14 },
  { label: '30일', value: 30 },
  { label: '60일', value: 60 },
  { label: '90일', value: 90 },
  { label: '120일', value: 120 },
]

// Re-export task types
export { TaskStatus, TaskPriority }
export type { TaskType, KanbanColumn }
