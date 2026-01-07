'use client'

// ===========================================
// Settings Data Hook
// ===========================================

import { useState, useEffect, useCallback } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth-context'
import { useWorkspace } from '@/lib/workspace-context'
import toast from 'react-hot-toast'
import {
  Settings,
  WorkspaceFeatureSettings,
  DEFAULT_SETTINGS,
  DEFAULT_WORKSPACE_FEATURES
} from '../types'

const isDev = process.env.NODE_ENV === 'development'

export interface UseSettingsDataReturn {
  settings: Settings
  workspaceFeatures: WorkspaceFeatureSettings
  loading: boolean
  saving: boolean
  savingFeatures: boolean
  activeTab: string
  hasChanges: boolean
  hasFeatureChanges: boolean
  currentWorkspace: { id: string; name?: string; type?: string } | null
  isAdmin: boolean
  setActiveTab: (tab: string) => void
  updateSettings: <K extends keyof Settings>(category: K, field: string, value: unknown) => void
  updateWorkspaceFeature: (field: keyof WorkspaceFeatureSettings, value: boolean) => void
  handleSave: () => Promise<void>
  handleSaveFeatures: () => Promise<void>
}

export function useSettingsData(): UseSettingsDataReturn {
  const searchParams = useSearchParams()
  const router = useRouter()
  const { user, userProfile } = useAuth()
  const { currentWorkspace, features, refreshWorkspaces, isAdmin } = useWorkspace()

  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS)
  const [workspaceFeatures, setWorkspaceFeatures] = useState<WorkspaceFeatureSettings>(DEFAULT_WORKSPACE_FEATURES)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [savingFeatures, setSavingFeatures] = useState(false)

  const initialTab = searchParams?.get('tab') || 'notifications'
  const [activeTab, setActiveTab] = useState(initialTab)
  const [hasChanges, setHasChanges] = useState(false)
  const [hasFeatureChanges, setHasFeatureChanges] = useState(false)

  // Load settings data
  useEffect(() => {
    if (!user) return

    setSettings(prevSettings => ({
      ...prevSettings,
      profile: {
        ...prevSettings.profile,
        email: user.email || '',
        displayName: userProfile?.displayName || ''
      }
    }))
    setLoading(false)
  }, [user, userProfile])

  // Load workspace feature settings
  useEffect(() => {
    if (features) {
      setWorkspaceFeatures({
        projectEnabled: features.projectEnabled ?? true,
        kanbanEnabled: features.kanbanEnabled ?? true,
        ganttEnabled: features.ganttEnabled ?? true,
        mindmapEnabled: features.mindmapEnabled ?? true,
        filesEnabled: features.filesEnabled ?? true,
        attendanceEnabled: features.attendanceEnabled ?? true,
        employeeEnabled: features.employeeEnabled ?? true,
        payrollEnabled: features.payrollEnabled ?? true,
        payslipEnabled: features.payslipEnabled ?? true,
        leaveEnabled: features.leaveEnabled ?? true,
        hrEnabled: features.hrEnabled ?? true,
        organizationEnabled: features.organizationEnabled ?? true,
        financeEnabled: features.financeEnabled ?? true,
        expenseEnabled: features.expenseEnabled ?? true,
        invoiceEnabled: features.invoiceEnabled ?? true,
        corporateCardEnabled: features.corporateCardEnabled ?? true,
        resumeParsingEnabled: features.resumeParsingEnabled ?? false,
        approvalEnabled: features.approvalEnabled ?? true,
        marketingEnabled: features.marketingEnabled ?? true,
        automationEnabled: features.automationEnabled ?? true,
        logsEnabled: features.logsEnabled ?? true,
        announcementEnabled: features.announcementEnabled ?? true,
        boardEnabled: features.boardEnabled ?? true,
        calendarEnabled: features.calendarEnabled ?? true,
        messageEnabled: features.messageEnabled ?? true,
        chatEnabled: features.chatEnabled ?? true,
      })
    }
  }, [features])

  // Handle URL param for tab changes (redirect profile tab)
  useEffect(() => {
    const tab = searchParams?.get('tab')
    if (tab === 'profile') {
      router.push('/profile')
      return
    }
    if (tab) {
      setActiveTab(tab)
    }
  }, [searchParams, router])

  const updateSettings = useCallback(<K extends keyof Settings>(
    category: K,
    field: string,
    value: unknown
  ) => {
    setSettings(prev => ({
      ...prev,
      [category]: {
        ...prev[category],
        [field]: value
      }
    }))
    setHasChanges(true)
  }, [])

  const updateWorkspaceFeature = useCallback((
    field: keyof WorkspaceFeatureSettings,
    value: boolean
  ) => {
    setWorkspaceFeatures(prev => ({
      ...prev,
      [field]: value
    }))
    setHasFeatureChanges(true)
  }, [])

  const handleSave = useCallback(async () => {
    setSaving(true)
    try {
      toast.success('설정 저장 기능은 현재 사용할 수 없습니다.')
      setHasChanges(false)
    } catch (error) {
      if (isDev) console.error('Error saving settings:', error)
      toast.error('설정 저장 중 오류가 발생했습니다.')
    } finally {
      setSaving(false)
    }
  }, [])

  const handleSaveFeatures = useCallback(async () => {
    if (!currentWorkspace?.id) {
      toast.error('워크스페이스를 찾을 수 없습니다')
      return
    }

    setSavingFeatures(true)
    try {
      const response = await fetch(`/api/workspace/${currentWorkspace.id}/features`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(workspaceFeatures)
      })

      if (response.ok) {
        toast.success('기능 설정이 저장되었습니다')
        setHasFeatureChanges(false)
        await refreshWorkspaces()
        window.location.reload()
      } else {
        const error = await response.json()
        toast.error(error.error || '기능 설정 저장 실패')
      }
    } catch (error) {
      if (isDev) console.error('Failed to save features:', error)
      toast.error('기능 설정 저장 중 오류가 발생했습니다')
    } finally {
      setSavingFeatures(false)
    }
  }, [currentWorkspace?.id, workspaceFeatures, refreshWorkspaces])

  return {
    settings,
    workspaceFeatures,
    loading,
    saving,
    savingFeatures,
    activeTab,
    hasChanges,
    hasFeatureChanges,
    currentWorkspace,
    isAdmin,
    setActiveTab,
    updateSettings,
    updateWorkspaceFeature,
    handleSave,
    handleSaveFeatures,
  }
}
