export interface User {
  id: string
  email: string
  name: string
  role: 'admin' | 'member'
  department?: string // 직원의 부서 (개발, 디자인, 기획 등)
  permissions?: {
    projects: string[] // 접근 가능한 프로젝트 ID 목록
    canCreateProject?: boolean
    canManageUsers?: boolean
    canViewAllProjects?: boolean
  }
  avatar?: string
  phoneNumber?: string
  companyName?: string // 거래처명
  isActive: boolean
  createdAt: Date
  updatedAt: Date
  lastLogin?: Date
}

export interface Project {
  id: string
  name: string
  description: string
  clientId: string // 거래처 ID
  clientName?: string // 거래처명
  status: 'planning' | 'design' | 'development' | 'testing' | 'completed' | 'pending'
  progress: number
  startDate: Date
  endDate: Date
  team: ProjectMember[] // 팀 멤버 상세 정보
  budget: number
  visibility: 'public' | 'private' | 'client' // 공개 범위
  permissions: {
    viewerIds: string[] // 열람 가능한 사용자 ID
    editorIds: string[] // 편집 가능한 사용자 ID
    adminIds: string[] // 관리 권한 사용자 ID
  }
  tags?: string[]
  priority: 'low' | 'medium' | 'high' | 'urgent'
  createdBy: string
  createdAt: Date
  updatedAt: Date
}

export interface ProjectMember {
  userId: string
  name: string
  role: string // PM, Developer, Designer 등
  department?: string
  joinedAt: Date
}

// Task 타입은 task.ts에서 import
export type {
  Task,
  BaseTask,
  KanbanTask,
  GanttTask,
  TaskStatus,
  TaskPriority,
  ChecklistItem,
  TaskAttachment,
  TaskComment,
  TaskSummary
} from './task'

export interface Message {
  id: string
  senderId: string
  receiverId: string
  content: string
  attachments?: string[]
  read: boolean
  timestamp: Date
}

export interface File {
  id: string
  name: string
  size: number
  type: string
  url: string
  projectId: string
  uploadedBy: string
  category: 'document' | 'image' | 'video' | 'other'
  createdAt: Date
}

export interface ProjectInvitation {
  id: string
  projectId: string
  projectName: string
  invitedBy: string
  inviteCode: string
  email?: string
  invitationType: 'email' | 'link' | 'manual' // 초대 방식
  targetRole: 'client' | 'employee' | 'viewer' // 초대 대상 역할
  expiresAt: Date
  usedAt?: Date
  usedBy?: string
  status: 'pending' | 'accepted' | 'expired' | 'revoked'
  permissions: {
    viewProject: boolean
    viewTasks: boolean
    createTasks: boolean
    viewFiles: boolean
    uploadFiles: boolean
    viewChat: boolean
    sendChat: boolean
  }
  message?: string // 초대 메시지
  createdAt: Date
}

export interface ClientUser {
  id: string
  email: string
  name: string
  companyName: string
  phoneNumber?: string
  invitationId?: string // 초대로 가입한 경우
  googleId?: string // 구글 로그인 ID
  projectIds: string[] // 접근 가능한 프로젝트
  permissions: ProjectPermission[] // 프로젝트별 권한
  isActive: boolean
  lastAccess: Date
  createdAt: Date
  updatedAt: Date
}

export interface ProjectPermission {
  projectId: string
  canView: boolean
  canComment: boolean
  canApprove: boolean
  canRequestChange: boolean
}

// Export Organization and Employee types
export type {
  Organization,
  OrganizationSettings,
  BillingInfo,
  Department,
  DepartmentMember,
  OrganizationInviteSettings,
  OrganizationStats,
  OrganizationActivity,
} from './organization'

export type {
  EmployeeInvitation,
  EmployeePermissions,
  EmployeeProfile,
  EmployeeActivity,
  EmployeeStats,
  EmployeeFilter,
  EmployeeSortOption,
} from './employee'

export { ROLE_PERMISSION_TEMPLATES } from './employee'
