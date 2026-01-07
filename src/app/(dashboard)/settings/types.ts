// ===========================================
// Settings Page - Type Definitions
// ===========================================

import {
  Bell, Shield, Lock, Palette, Settings2, UsersRound,
  Mail, Smartphone, Zap, Clock, CreditCard
} from 'lucide-react'

// ============================================
// Settings Interface
// ============================================

export interface ProfileSettings {
  displayName: string
  email: string
  phone: string
  company: string
  bio: string
  avatar: string
}

export interface NotificationSettings {
  email: boolean
  push: boolean
  sms: boolean
  projectUpdates: boolean
  taskReminders: boolean
  newMessages: boolean
  invoices: boolean
  marketing: boolean
}

export interface PreferencesSettings {
  theme: 'light' | 'dark' | 'system'
  language: string
  timezone: string
  dateFormat: string
  currency: string
  compactMode: boolean
}

export interface PrivacySettings {
  profileVisibility: 'public' | 'private' | 'team'
  showEmail: boolean
  showPhone: boolean
  activityStatus: boolean
  readReceipts: boolean
}

export interface SecuritySettings {
  twoFactorEnabled: boolean
  sessionTimeout: number
  passwordExpiry: number
  loginAlerts: boolean
}

export interface Settings {
  profile: ProfileSettings
  notifications: NotificationSettings
  preferences: PreferencesSettings
  privacy: PrivacySettings
  security: SecuritySettings
}

// ============================================
// Workspace Feature Settings
// ============================================

export interface WorkspaceFeatureSettings {
  // Project management
  projectEnabled: boolean
  kanbanEnabled: boolean
  ganttEnabled: boolean
  mindmapEnabled: boolean
  filesEnabled: boolean
  // HR features
  attendanceEnabled: boolean
  employeeEnabled: boolean
  payrollEnabled: boolean
  payslipEnabled: boolean
  leaveEnabled: boolean
  hrEnabled: boolean
  organizationEnabled: boolean
  // Finance features
  financeEnabled: boolean
  expenseEnabled: boolean
  invoiceEnabled: boolean
  corporateCardEnabled: boolean
  // Advanced features
  resumeParsingEnabled: boolean
  approvalEnabled: boolean
  marketingEnabled: boolean
  automationEnabled: boolean
  logsEnabled: boolean
  // Groupware features
  announcementEnabled: boolean
  boardEnabled: boolean
  calendarEnabled: boolean
  messageEnabled: boolean
  chatEnabled: boolean
}

// ============================================
// Default Values
// ============================================

export const DEFAULT_SETTINGS: Settings = {
  profile: {
    displayName: '',
    email: '',
    phone: '',
    company: '',
    bio: '',
    avatar: ''
  },
  notifications: {
    email: true,
    push: true,
    sms: false,
    projectUpdates: true,
    taskReminders: true,
    newMessages: true,
    invoices: true,
    marketing: false
  },
  preferences: {
    theme: 'system',
    language: 'ko',
    timezone: 'Asia/Seoul',
    dateFormat: 'YYYY-MM-DD',
    currency: 'KRW',
    compactMode: false
  },
  privacy: {
    profileVisibility: 'team',
    showEmail: false,
    showPhone: false,
    activityStatus: true,
    readReceipts: true
  },
  security: {
    twoFactorEnabled: false,
    sessionTimeout: 30,
    passwordExpiry: 90,
    loginAlerts: true
  }
}

export const DEFAULT_WORKSPACE_FEATURES: WorkspaceFeatureSettings = {
  projectEnabled: true,
  kanbanEnabled: true,
  ganttEnabled: true,
  mindmapEnabled: true,
  filesEnabled: true,
  attendanceEnabled: true,
  employeeEnabled: true,
  payrollEnabled: true,
  payslipEnabled: true,
  leaveEnabled: true,
  hrEnabled: true,
  organizationEnabled: true,
  financeEnabled: true,
  expenseEnabled: true,
  invoiceEnabled: true,
  corporateCardEnabled: true,
  resumeParsingEnabled: false,
  approvalEnabled: true,
  marketingEnabled: true,
  automationEnabled: true,
  logsEnabled: true,
  announcementEnabled: true,
  boardEnabled: true,
  calendarEnabled: true,
  messageEnabled: true,
  chatEnabled: true,
}

// ============================================
// Tab Configuration
// ============================================

export interface TabConfig {
  id: string
  label: string
  icon: React.ComponentType<{ className?: string }>
  adminOnly?: boolean
}

export const SETTINGS_TABS: TabConfig[] = [
  { id: 'notifications', label: '알림', icon: Bell },
  { id: 'preferences', label: '환경설정', icon: Palette },
  { id: 'privacy', label: '개인정보', icon: Shield },
  { id: 'security', label: '보안', icon: Lock },
  { id: 'members', label: '멤버', icon: UsersRound },
  { id: 'features', label: '기능 설정', icon: Settings2, adminOnly: true }
]

// ============================================
// Option Configurations
// ============================================

export const THEME_OPTIONS = [
  { value: 'light', label: '라이트', icon: 'Sun' },
  { value: 'dark', label: '다크', icon: 'Moon' },
  { value: 'system', label: '시스템', icon: 'Monitor' }
] as const

export const LANGUAGE_OPTIONS = [
  { value: 'ko', label: '한국어', flag: '🇰🇷' },
  { value: 'en', label: 'English', flag: '🇺🇸' },
  { value: 'ja', label: '日本語', flag: '🇯🇵' },
  { value: 'zh', label: '中文', flag: '🇨🇳' }
] as const

export const TIMEZONE_OPTIONS = [
  { value: 'Asia/Seoul', label: '서울 (GMT+9)' },
  { value: 'Asia/Tokyo', label: '도쿄 (GMT+9)' },
  { value: 'America/New_York', label: '뉴욕 (GMT-5)' },
  { value: 'Europe/London', label: '런던 (GMT+0)' }
] as const

export const DATE_FORMAT_OPTIONS = [
  { value: 'YYYY-MM-DD', label: '2024-01-20' },
  { value: 'MM/DD/YYYY', label: '01/20/2024' },
  { value: 'DD/MM/YYYY', label: '20/01/2024' }
] as const

export const SESSION_TIMEOUT_OPTIONS = [
  { value: 15, label: '15분' },
  { value: 30, label: '30분' },
  { value: 60, label: '1시간' },
  { value: 120, label: '2시간' }
] as const

export const PASSWORD_EXPIRY_OPTIONS = [
  { value: 30, label: '30일' },
  { value: 60, label: '60일' },
  { value: 90, label: '90일' },
  { value: 180, label: '180일' }
] as const

export const VISIBILITY_OPTIONS = [
  { value: 'public', label: '전체 공개' },
  { value: 'team', label: '팀원에게만' },
  { value: 'private', label: '비공개' }
] as const

// ============================================
// Notification Channel Config
// ============================================

export interface NotificationChannelConfig {
  key: keyof NotificationSettings
  icon: React.ComponentType<{ className?: string }>
  iconBg: string
  iconColor: string
  title: string
  description: string
}

export const NOTIFICATION_CHANNELS: NotificationChannelConfig[] = [
  {
    key: 'email',
    icon: Mail,
    iconBg: 'bg-lime-100',
    iconColor: 'text-lime-600',
    title: '이메일 알림',
    description: '중요한 업데이트를 이메일로 받습니다'
  },
  {
    key: 'push',
    icon: Bell,
    iconBg: 'bg-violet-100',
    iconColor: 'text-violet-600',
    title: '푸시 알림',
    description: '브라우저 푸시 알림을 받습니다'
  },
  {
    key: 'sms',
    icon: Smartphone,
    iconBg: 'bg-amber-100',
    iconColor: 'text-amber-600',
    title: 'SMS 알림',
    description: '긴급한 알림을 SMS로 받습니다'
  }
]

export interface NotificationTypeConfig {
  key: keyof NotificationSettings
  icon: React.ComponentType<{ className?: string }>
  iconColor: string
  label: string
}

export const NOTIFICATION_TYPES: NotificationTypeConfig[] = [
  { key: 'projectUpdates', icon: Zap, iconColor: 'text-lime-600', label: '프로젝트 업데이트' },
  { key: 'taskReminders', icon: Clock, iconColor: 'text-violet-600', label: '작업 알림' },
  { key: 'newMessages', icon: Mail, iconColor: 'text-emerald-600', label: '새 메시지' },
  { key: 'invoices', icon: CreditCard, iconColor: 'text-amber-600', label: '청구서 알림' }
]
