'use client'

// ===========================================
// Glass Morphism Settings Page
// ===========================================

import React, { useState, useEffect } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth-context'
import { useWorkspace } from '@/lib/workspace-context'
import toast from 'react-hot-toast'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Separator } from '@/components/ui/separator'
import { Badge } from '@/components/ui/badge'
import {
  User, Bell, Shield, Palette, Key, Database,
  Mail, Save, RefreshCcw,
  Sun, Moon, Monitor, Loader2, AlertCircle, CheckCircle,
  Lock, Smartphone, CreditCard, Zap, Clock,
  Settings2, Kanban, Calendar, Users, FileText, Briefcase,
  DollarSign, BarChart3, MessageSquare, Megaphone, Building,
  UserPlus
} from 'lucide-react'
import WorkspaceInvitations from '@/components/workspace/WorkspaceInvitations'

interface Settings {
  profile: {
    displayName: string
    email: string
    phone: string
    company: string
    bio: string
    avatar: string
  }
  notifications: {
    email: boolean
    push: boolean
    sms: boolean
    projectUpdates: boolean
    taskReminders: boolean
    newMessages: boolean
    invoices: boolean
    marketing: boolean
  }
  preferences: {
    theme: 'light' | 'dark' | 'system'
    language: string
    timezone: string
    dateFormat: string
    currency: string
    compactMode: boolean
  }
  privacy: {
    profileVisibility: 'public' | 'private' | 'team'
    showEmail: boolean
    showPhone: boolean
    activityStatus: boolean
    readReceipts: boolean
  }
  security: {
    twoFactorEnabled: boolean
    sessionTimeout: number
    passwordExpiry: number
    loginAlerts: boolean
  }
}

const defaultSettings: Settings = {
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

// 워크스페이스 기능 설정 인터페이스
interface WorkspaceFeatureSettings {
  // 프로젝트 관리 기능
  projectEnabled: boolean
  kanbanEnabled: boolean
  ganttEnabled: boolean
  mindmapEnabled: boolean
  filesEnabled: boolean
  // HR 기능
  attendanceEnabled: boolean
  employeeEnabled: boolean
  payrollEnabled: boolean
  payslipEnabled: boolean
  leaveEnabled: boolean
  hrEnabled: boolean
  organizationEnabled: boolean
  // 재무 기능
  financeEnabled: boolean
  expenseEnabled: boolean
  invoiceEnabled: boolean
  corporateCardEnabled: boolean
  // 고급 기능
  resumeParsingEnabled: boolean
  approvalEnabled: boolean
  marketingEnabled: boolean
  automationEnabled: boolean
  logsEnabled: boolean
  // 그룹웨어 기능
  announcementEnabled: boolean
  boardEnabled: boolean
  calendarEnabled: boolean
  messageEnabled: boolean
  chatEnabled: boolean
}

const defaultWorkspaceFeatures: WorkspaceFeatureSettings = {
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

export default function SettingsPage() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const { user, userProfile } = useAuth()
  const { currentWorkspace, features, refreshWorkspaces, isAdmin } = useWorkspace()
  const [settings, setSettings] = useState<Settings>(defaultSettings)
  const [workspaceFeatures, setWorkspaceFeatures] = useState<WorkspaceFeatureSettings>(defaultWorkspaceFeatures)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [savingFeatures, setSavingFeatures] = useState(false)
  const initialTab = searchParams?.get('tab') || 'notifications'
  const [activeTab, setActiveTab] = useState(initialTab)
  const [hasChanges, setHasChanges] = useState(false)
  const [hasFeatureChanges, setHasFeatureChanges] = useState(false)

  // 설정 데이터 로드
  useEffect(() => {
    if (!user) return
    // Firebase logic removed
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

  // 워크스페이스 기능 설정 로드
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

  // URL 파라미터로 탭 변경 시 반영 (profile 탭은 /profile 페이지로 리다이렉트)
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

  const handleSave = async () => {
    setSaving(true)

    try {
      // Firebase logic removed
      toast.success('설정 저장 기능은 현재 사용할 수 없습니다.')
      setHasChanges(false)
    } catch (error) {
      console.error('Error saving settings:', error)
      toast.error('설정 저장 중 오류가 발생했습니다.')
    } finally {
      setSaving(false)
    }
  }

  const updateSettings = (category: keyof Settings, field: string, value: any) => {
    setSettings(prev => ({
      ...prev,
      [category]: {
        ...prev[category],
        [field]: value
      }
    }))
    setHasChanges(true)
  }

  const updateWorkspaceFeature = (field: keyof WorkspaceFeatureSettings, value: boolean) => {
    setWorkspaceFeatures(prev => ({
      ...prev,
      [field]: value
    }))
    setHasFeatureChanges(true)
  }

  const handleSaveFeatures = async () => {
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
        // 워크스페이스 새로고침하여 사이드바에 반영
        await refreshWorkspaces()
        window.location.reload()
      } else {
        const error = await response.json()
        toast.error(error.error || '기능 설정 저장 실패')
      }
    } catch (error) {
      console.error('Failed to save features:', error)
      toast.error('기능 설정 저장 중 오류가 발생했습니다')
    } finally {
      setSavingFeatures(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-lime-400 mx-auto" />
          <p className="mt-4 text-slate-500">설정을 불러오는 중...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="w-full max-w-[1920px] mx-auto px-6 py-6 space-y-6">
      {/* 헤더 - Glass Morphism */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 flex items-center gap-3">
            <div className="p-2 bg-lime-100 rounded-xl">
              <User className="w-6 h-6 text-lime-600" />
            </div>
            설정
          </h1>
          <p className="text-slate-500 mt-2">계정 및 환경 설정을 관리합니다</p>
        </div>

        {hasChanges && (
          <div className="flex items-center gap-3">
            <Badge className="gap-1 bg-amber-100 text-amber-700 border-amber-200">
              <AlertCircle className="h-3 w-3" />
              변경사항 있음
            </Badge>
            <Button variant="limePrimary" onClick={handleSave} disabled={saving} className="rounded-xl">
              {saving ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Save className="h-4 w-4 mr-2" />
              )}
              저장
            </Button>
          </div>
        )}
      </div>

      {/* 설정 탭 - Glass Morphism */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <div className="bg-white/60 backdrop-blur-sm rounded-2xl shadow-lg shadow-black/5 p-1.5 border border-white/40 max-w-[1000px]">
          <div className="grid grid-cols-4 sm:grid-cols-6 gap-1">
            {[
              { id: 'notifications', label: '알림', icon: Bell },
              { id: 'preferences', label: '환경설정', icon: Palette },
              { id: 'privacy', label: '개인정보', icon: Shield },
              { id: 'security', label: '보안', icon: Lock },
              { id: 'members', label: '멤버 초대', icon: UserPlus, adminOnly: true },
              { id: 'features', label: '기능 설정', icon: Settings2, adminOnly: true }
            ].filter(tab => !tab.adminOnly || isAdmin).map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                  activeTab === tab.id
                    ? 'bg-black text-lime-400 shadow-lg'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
                }`}
              >
                <tab.icon className="w-4 h-4" />
                <span className="hidden sm:inline">{tab.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* 알림 설정 - Glass Morphism */}
        <TabsContent value="notifications" className="space-y-4 mt-6">
          <Card variant="glass">
            <CardHeader>
              <CardTitle className="text-slate-900">알림 채널</CardTitle>
              <CardDescription className="text-slate-500">알림을 받을 방법을 선택하세요</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-white/60 rounded-xl border border-white/40">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-lime-100 rounded-xl">
                    <Mail className="h-5 w-5 text-lime-600" />
                  </div>
                  <div>
                    <p className="font-medium text-slate-900">이메일 알림</p>
                    <p className="text-sm text-slate-500">중요한 업데이트를 이메일로 받습니다</p>
                  </div>
                </div>
                <Switch
                  checked={settings.notifications.email}
                  onCheckedChange={(checked) => updateSettings('notifications', 'email', checked)}
                />
              </div>

              <div className="flex items-center justify-between p-3 bg-white/60 rounded-xl border border-white/40">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-violet-100 rounded-xl">
                    <Bell className="h-5 w-5 text-violet-600" />
                  </div>
                  <div>
                    <p className="font-medium text-slate-900">푸시 알림</p>
                    <p className="text-sm text-slate-500">브라우저 푸시 알림을 받습니다</p>
                  </div>
                </div>
                <Switch
                  checked={settings.notifications.push}
                  onCheckedChange={(checked) => updateSettings('notifications', 'push', checked)}
                />
              </div>

              <div className="flex items-center justify-between p-3 bg-white/60 rounded-xl border border-white/40">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-amber-100 rounded-xl">
                    <Smartphone className="h-5 w-5 text-amber-600" />
                  </div>
                  <div>
                    <p className="font-medium text-slate-900">SMS 알림</p>
                    <p className="text-sm text-slate-500">긴급한 알림을 SMS로 받습니다</p>
                  </div>
                </div>
                <Switch
                  checked={settings.notifications.sms}
                  onCheckedChange={(checked) => updateSettings('notifications', 'sms', checked)}
                />
              </div>
            </CardContent>
          </Card>

          <Card variant="glass">
            <CardHeader>
              <CardTitle className="text-slate-900">알림 유형</CardTitle>
              <CardDescription className="text-slate-500">받고 싶은 알림 유형을 선택하세요</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-center justify-between p-3 bg-white/60 rounded-xl border border-white/40">
                  <Label htmlFor="projectUpdates" className="flex items-center gap-2 cursor-pointer text-slate-700">
                    <Zap className="h-4 w-4 text-lime-600" />
                    프로젝트 업데이트
                  </Label>
                  <Switch
                    id="projectUpdates"
                    checked={settings.notifications.projectUpdates}
                    onCheckedChange={(checked) => updateSettings('notifications', 'projectUpdates', checked)}
                  />
                </div>

                <div className="flex items-center justify-between p-3 bg-white/60 rounded-xl border border-white/40">
                  <Label htmlFor="taskReminders" className="flex items-center gap-2 cursor-pointer text-slate-700">
                    <Clock className="h-4 w-4 text-violet-600" />
                    작업 알림
                  </Label>
                  <Switch
                    id="taskReminders"
                    checked={settings.notifications.taskReminders}
                    onCheckedChange={(checked) => updateSettings('notifications', 'taskReminders', checked)}
                  />
                </div>

                <div className="flex items-center justify-between p-3 bg-white/60 rounded-xl border border-white/40">
                  <Label htmlFor="newMessages" className="flex items-center gap-2 cursor-pointer text-slate-700">
                    <Mail className="h-4 w-4 text-emerald-600" />
                    새 메시지
                  </Label>
                  <Switch
                    id="newMessages"
                    checked={settings.notifications.newMessages}
                    onCheckedChange={(checked) => updateSettings('notifications', 'newMessages', checked)}
                  />
                </div>

                <div className="flex items-center justify-between p-3 bg-white/60 rounded-xl border border-white/40">
                  <Label htmlFor="invoices" className="flex items-center gap-2 cursor-pointer text-slate-700">
                    <CreditCard className="h-4 w-4 text-amber-600" />
                    청구서 알림
                  </Label>
                  <Switch
                    id="invoices"
                    checked={settings.notifications.invoices}
                    onCheckedChange={(checked) => updateSettings('notifications', 'invoices', checked)}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 환경설정 - Glass Morphism */}
        <TabsContent value="preferences" className="space-y-4 mt-6">
          <Card variant="glass">
            <CardHeader>
              <CardTitle className="text-slate-900">표시 설정</CardTitle>
              <CardDescription className="text-slate-500">인터페이스 표시 방법을 설정합니다</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <Label className="mb-3 text-slate-700">테마</Label>
                <div className="grid grid-cols-3 gap-3 mt-2">
                  {[
                    { value: 'light', label: '라이트', icon: Sun },
                    { value: 'dark', label: '다크', icon: Moon },
                    { value: 'system', label: '시스템', icon: Monitor }
                  ].map((theme) => (
                    <button
                      key={theme.value}
                      className={`flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                        settings.preferences.theme === theme.value
                          ? 'bg-black text-lime-400 shadow-lg'
                          : 'bg-white/60 border border-white/40 text-slate-600 hover:text-slate-900 hover:bg-white/80'
                      }`}
                      onClick={() => updateSettings('preferences', 'theme', theme.value)}
                    >
                      <theme.icon className="h-4 w-4" />
                      {theme.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <Label className="text-slate-700">언어</Label>
                <div className="flex flex-wrap gap-2 mt-2">
                  {[
                    { value: 'ko', label: '한국어', flag: '🇰🇷' },
                    { value: 'en', label: 'English', flag: '🇺🇸' },
                    { value: 'ja', label: '日本語', flag: '🇯🇵' },
                    { value: 'zh', label: '中文', flag: '🇨🇳' }
                  ].map((lang) => (
                    <button
                      key={lang.value}
                      type="button"
                      onClick={() => updateSettings('preferences', 'language', lang.value)}
                      className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                        settings.preferences.language === lang.value
                          ? 'bg-lime-100 text-lime-700 ring-2 ring-lime-400'
                          : 'bg-white/60 border border-white/40 text-slate-600 hover:text-slate-900 hover:bg-white/80'
                      }`}
                    >
                      <span>{lang.flag}</span>
                      {lang.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <Label className="text-slate-700">시간대</Label>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {[
                      { value: 'Asia/Seoul', label: '서울 (GMT+9)' },
                      { value: 'Asia/Tokyo', label: '도쿄 (GMT+9)' },
                      { value: 'America/New_York', label: '뉴욕 (GMT-5)' },
                      { value: 'Europe/London', label: '런던 (GMT+0)' }
                    ].map((tz) => (
                      <button
                        key={tz.value}
                        type="button"
                        onClick={() => updateSettings('preferences', 'timezone', tz.value)}
                        className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                          settings.preferences.timezone === tz.value
                            ? 'bg-violet-100 text-violet-700 ring-2 ring-violet-400'
                            : 'bg-white/60 border border-white/40 text-slate-600 hover:text-slate-900 hover:bg-white/80'
                        }`}
                      >
                        {tz.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <Label className="text-slate-700">날짜 형식</Label>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {[
                      { value: 'YYYY-MM-DD', label: '2024-01-20' },
                      { value: 'MM/DD/YYYY', label: '01/20/2024' },
                      { value: 'DD/MM/YYYY', label: '20/01/2024' }
                    ].map((df) => (
                      <button
                        key={df.value}
                        type="button"
                        onClick={() => updateSettings('preferences', 'dateFormat', df.value)}
                        className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                          settings.preferences.dateFormat === df.value
                            ? 'bg-emerald-100 text-emerald-700 ring-2 ring-emerald-400'
                            : 'bg-white/60 border border-white/40 text-slate-600 hover:text-slate-900 hover:bg-white/80'
                        }`}
                      >
                        {df.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between p-3 bg-white/60 rounded-xl border border-white/40">
                <div>
                  <p className="font-medium text-slate-900">컴팩트 모드</p>
                  <p className="text-sm text-slate-500">더 많은 콘텐츠를 한 화면에 표시합니다</p>
                </div>
                <Switch
                  checked={settings.preferences.compactMode}
                  onCheckedChange={(checked) => updateSettings('preferences', 'compactMode', checked)}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 개인정보 설정 - Glass Morphism */}
        <TabsContent value="privacy" className="space-y-4 mt-6">
          <Card variant="glass">
            <CardHeader>
              <CardTitle className="text-slate-900">프로필 공개 설정</CardTitle>
              <CardDescription className="text-slate-500">프로필 정보 공개 범위를 설정합니다</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <Label className="text-slate-700">프로필 공개 범위</Label>
                <div className="grid grid-cols-3 gap-3 mt-3">
                  {[
                    { value: 'public', label: '전체 공개' },
                    { value: 'team', label: '팀원에게만' },
                    { value: 'private', label: '비공개' }
                  ].map((option) => (
                    <button
                      key={option.value}
                      className={`px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                        settings.privacy.profileVisibility === option.value
                          ? 'bg-black text-lime-400 shadow-lg'
                          : 'bg-white/60 border border-white/40 text-slate-600 hover:text-slate-900 hover:bg-white/80'
                      }`}
                      onClick={() => updateSettings('privacy', 'profileVisibility', option.value)}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="border-t border-white/40 pt-6 space-y-4">
                <div className="flex items-center justify-between p-3 bg-white/60 rounded-xl border border-white/40">
                  <Label htmlFor="showEmail" className="cursor-pointer text-slate-700">
                    이메일 주소 공개
                  </Label>
                  <Switch
                    id="showEmail"
                    checked={settings.privacy.showEmail}
                    onCheckedChange={(checked) => updateSettings('privacy', 'showEmail', checked)}
                  />
                </div>

                <div className="flex items-center justify-between p-3 bg-white/60 rounded-xl border border-white/40">
                  <Label htmlFor="showPhone" className="cursor-pointer text-slate-700">
                    전화번호 공개
                  </Label>
                  <Switch
                    id="showPhone"
                    checked={settings.privacy.showPhone}
                    onCheckedChange={(checked) => updateSettings('privacy', 'showPhone', checked)}
                  />
                </div>

                <div className="flex items-center justify-between p-3 bg-white/60 rounded-xl border border-white/40">
                  <Label htmlFor="activityStatus" className="cursor-pointer text-slate-700">
                    활동 상태 표시
                  </Label>
                  <Switch
                    id="activityStatus"
                    checked={settings.privacy.activityStatus}
                    onCheckedChange={(checked) => updateSettings('privacy', 'activityStatus', checked)}
                  />
                </div>

                <div className="flex items-center justify-between p-3 bg-white/60 rounded-xl border border-white/40">
                  <Label htmlFor="readReceipts" className="cursor-pointer text-slate-700">
                    읽음 확인 표시
                  </Label>
                  <Switch
                    id="readReceipts"
                    checked={settings.privacy.readReceipts}
                    onCheckedChange={(checked) => updateSettings('privacy', 'readReceipts', checked)}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 보안 설정 - Glass Morphism */}
        <TabsContent value="security" className="space-y-4 mt-6">
          <Card variant="glass">
            <CardHeader>
              <CardTitle className="text-slate-900">계정 보안</CardTitle>
              <CardDescription className="text-slate-500">계정을 안전하게 보호하는 설정입니다</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between p-4 bg-white/60 rounded-2xl border border-white/40">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-lime-100 rounded-xl">
                    <Shield className="h-5 w-5 text-lime-600" />
                  </div>
                  <div>
                    <p className="font-medium text-slate-900">2단계 인증</p>
                    <p className="text-sm text-slate-500">
                      {settings.security.twoFactorEnabled ? '활성화됨' : '비활성화됨'}
                    </p>
                  </div>
                </div>
                <Button
                  variant={settings.security.twoFactorEnabled ? 'glass' : 'limePrimary'}
                  className="rounded-xl"
                >
                  {settings.security.twoFactorEnabled ? '비활성화' : '활성화'}
                </Button>
              </div>

              <div className="space-y-4">
                <div>
                  <Label className="text-slate-700">세션 타임아웃</Label>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {[
                      { value: 15, label: '15분' },
                      { value: 30, label: '30분' },
                      { value: 60, label: '1시간' },
                      { value: 120, label: '2시간' }
                    ].map((option) => (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => updateSettings('security', 'sessionTimeout', option.value)}
                        className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                          settings.security.sessionTimeout === option.value
                            ? 'bg-amber-100 text-amber-700 ring-2 ring-amber-400'
                            : 'bg-white/60 border border-white/40 text-slate-600 hover:text-slate-900 hover:bg-white/80'
                        }`}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <Label className="text-slate-700">비밀번호 변경 주기</Label>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {[
                      { value: 30, label: '30일' },
                      { value: 60, label: '60일' },
                      { value: 90, label: '90일' },
                      { value: 180, label: '180일' }
                    ].map((option) => (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => updateSettings('security', 'passwordExpiry', option.value)}
                        className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                          settings.security.passwordExpiry === option.value
                            ? 'bg-rose-100 text-rose-700 ring-2 ring-rose-400'
                            : 'bg-white/60 border border-white/40 text-slate-600 hover:text-slate-900 hover:bg-white/80'
                        }`}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex items-center justify-between p-3 bg-white/60 rounded-xl border border-white/40">
                  <Label htmlFor="loginAlerts" className="cursor-pointer text-slate-700">
                    로그인 알림
                  </Label>
                  <Switch
                    id="loginAlerts"
                    checked={settings.security.loginAlerts}
                    onCheckedChange={(checked) => updateSettings('security', 'loginAlerts', checked)}
                  />
                </div>
              </div>

              <div className="border-t border-white/40 pt-6 space-y-3">
                <Button variant="glass" className="w-full justify-start rounded-xl">
                  <Key className="h-4 w-4 mr-2 text-lime-600" />
                  비밀번호 변경
                </Button>
                <Button variant="glass" className="w-full justify-start rounded-xl">
                  <RefreshCcw className="h-4 w-4 mr-2 text-violet-600" />
                  활성 세션 관리
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 멤버 초대 - 워크스페이스 관리자 전용 */}
        {isAdmin && currentWorkspace?.id && (
          <TabsContent value="members" className="space-y-4 mt-6">
            <Card variant="glass">
              <CardContent className="pt-6">
                <WorkspaceInvitations workspaceId={currentWorkspace.id} />
              </CardContent>
            </Card>
          </TabsContent>
        )}

        {/* 기능 설정 - 워크스페이스 관리자 전용 */}
        {isAdmin && (
          <TabsContent value="features" className="space-y-4 mt-6">
            {/* 저장 버튼 */}
            {hasFeatureChanges && (
              <div className="flex items-center justify-between p-4 bg-amber-50 rounded-2xl border border-amber-200">
                <div className="flex items-center gap-2">
                  <AlertCircle className="h-5 w-5 text-amber-600" />
                  <span className="text-amber-700 font-medium">변경사항이 있습니다</span>
                </div>
                <Button
                  variant="limePrimary"
                  onClick={handleSaveFeatures}
                  disabled={savingFeatures}
                  className="rounded-xl"
                >
                  {savingFeatures ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <Save className="h-4 w-4 mr-2" />
                  )}
                  기능 설정 저장
                </Button>
              </div>
            )}

            {/* 현재 워크스페이스 정보 */}
            <Card variant="glass">
              <CardHeader>
                <CardTitle className="text-slate-900 flex items-center gap-2">
                  <Building className="h-5 w-5 text-lime-600" />
                  워크스페이스 정보
                </CardTitle>
                <CardDescription className="text-slate-500">
                  현재 워크스페이스: <span className="font-semibold text-slate-700">{currentWorkspace?.name}</span>
                  {currentWorkspace?.type && (
                    <Badge className="ml-2" variant="outline">
                      {currentWorkspace.type === 'ENTERPRISE' ? '엔터프라이즈' :
                       currentWorkspace.type === 'HR_ONLY' ? 'HR 전용' :
                       currentWorkspace.type === 'PROJECT_ONLY' ? '프로젝트 전용' : currentWorkspace.type}
                    </Badge>
                  )}
                </CardDescription>
              </CardHeader>
            </Card>

            {/* 프로젝트 관리 기능 */}
            <Card variant="glass">
              <CardHeader>
                <CardTitle className="text-slate-900 flex items-center gap-2">
                  <Kanban className="h-5 w-5 text-violet-600" />
                  프로젝트 관리
                </CardTitle>
                <CardDescription className="text-slate-500">프로젝트 및 작업 관리 기능을 설정합니다</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex items-center justify-between p-3 bg-white/60 rounded-xl border border-white/40">
                    <div className="flex items-center gap-2">
                      <Briefcase className="h-4 w-4 text-violet-600" />
                      <Label className="cursor-pointer text-slate-700">프로젝트 기능</Label>
                    </div>
                    <Switch
                      checked={workspaceFeatures.projectEnabled}
                      onCheckedChange={(checked) => updateWorkspaceFeature('projectEnabled', checked)}
                    />
                  </div>
                  <div className="flex items-center justify-between p-3 bg-white/60 rounded-xl border border-white/40">
                    <div className="flex items-center gap-2">
                      <Kanban className="h-4 w-4 text-emerald-600" />
                      <Label className="cursor-pointer text-slate-700">칸반 보드</Label>
                    </div>
                    <Switch
                      checked={workspaceFeatures.kanbanEnabled}
                      onCheckedChange={(checked) => updateWorkspaceFeature('kanbanEnabled', checked)}
                    />
                  </div>
                  <div className="flex items-center justify-between p-3 bg-white/60 rounded-xl border border-white/40">
                    <div className="flex items-center gap-2">
                      <BarChart3 className="h-4 w-4 text-blue-600" />
                      <Label className="cursor-pointer text-slate-700">간트 차트</Label>
                    </div>
                    <Switch
                      checked={workspaceFeatures.ganttEnabled}
                      onCheckedChange={(checked) => updateWorkspaceFeature('ganttEnabled', checked)}
                    />
                  </div>
                  <div className="flex items-center justify-between p-3 bg-white/60 rounded-xl border border-white/40">
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4 text-amber-600" />
                      <Label className="cursor-pointer text-slate-700">파일 관리</Label>
                    </div>
                    <Switch
                      checked={workspaceFeatures.filesEnabled}
                      onCheckedChange={(checked) => updateWorkspaceFeature('filesEnabled', checked)}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* HR 기능 */}
            <Card variant="glass">
              <CardHeader>
                <CardTitle className="text-slate-900 flex items-center gap-2">
                  <Users className="h-5 w-5 text-emerald-600" />
                  HR 관리
                </CardTitle>
                <CardDescription className="text-slate-500">인사 및 근태 관리 기능을 설정합니다</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex items-center justify-between p-3 bg-white/60 rounded-xl border border-white/40">
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-emerald-600" />
                      <Label className="cursor-pointer text-slate-700">근태 관리</Label>
                    </div>
                    <Switch
                      checked={workspaceFeatures.attendanceEnabled}
                      onCheckedChange={(checked) => updateWorkspaceFeature('attendanceEnabled', checked)}
                    />
                  </div>
                  <div className="flex items-center justify-between p-3 bg-white/60 rounded-xl border border-white/40">
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4 text-blue-600" />
                      <Label className="cursor-pointer text-slate-700">직원 관리</Label>
                    </div>
                    <Switch
                      checked={workspaceFeatures.employeeEnabled}
                      onCheckedChange={(checked) => updateWorkspaceFeature('employeeEnabled', checked)}
                    />
                  </div>
                  <div className="flex items-center justify-between p-3 bg-white/60 rounded-xl border border-white/40">
                    <div className="flex items-center gap-2">
                      <CreditCard className="h-4 w-4 text-violet-600" />
                      <Label className="cursor-pointer text-slate-700">급여 관리</Label>
                    </div>
                    <Switch
                      checked={workspaceFeatures.payrollEnabled}
                      onCheckedChange={(checked) => updateWorkspaceFeature('payrollEnabled', checked)}
                    />
                  </div>
                  <div className="flex items-center justify-between p-3 bg-white/60 rounded-xl border border-white/40">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-rose-600" />
                      <Label className="cursor-pointer text-slate-700">휴가 관리</Label>
                    </div>
                    <Switch
                      checked={workspaceFeatures.leaveEnabled}
                      onCheckedChange={(checked) => updateWorkspaceFeature('leaveEnabled', checked)}
                    />
                  </div>
                  <div className="flex items-center justify-between p-3 bg-white/60 rounded-xl border border-white/40">
                    <div className="flex items-center gap-2">
                      <Building className="h-4 w-4 text-slate-600" />
                      <Label className="cursor-pointer text-slate-700">조직 관리</Label>
                    </div>
                    <Switch
                      checked={workspaceFeatures.organizationEnabled}
                      onCheckedChange={(checked) => updateWorkspaceFeature('organizationEnabled', checked)}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* 재무 기능 */}
            <Card variant="glass">
              <CardHeader>
                <CardTitle className="text-slate-900 flex items-center gap-2">
                  <DollarSign className="h-5 w-5 text-amber-600" />
                  재무 관리
                </CardTitle>
                <CardDescription className="text-slate-500">재무 및 경비 관리 기능을 설정합니다</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex items-center justify-between p-3 bg-white/60 rounded-xl border border-white/40">
                    <div className="flex items-center gap-2">
                      <DollarSign className="h-4 w-4 text-amber-600" />
                      <Label className="cursor-pointer text-slate-700">재무 기능</Label>
                    </div>
                    <Switch
                      checked={workspaceFeatures.financeEnabled}
                      onCheckedChange={(checked) => updateWorkspaceFeature('financeEnabled', checked)}
                    />
                  </div>
                  <div className="flex items-center justify-between p-3 bg-white/60 rounded-xl border border-white/40">
                    <div className="flex items-center gap-2">
                      <CreditCard className="h-4 w-4 text-rose-600" />
                      <Label className="cursor-pointer text-slate-700">경비 관리</Label>
                    </div>
                    <Switch
                      checked={workspaceFeatures.expenseEnabled}
                      onCheckedChange={(checked) => updateWorkspaceFeature('expenseEnabled', checked)}
                    />
                  </div>
                  <div className="flex items-center justify-between p-3 bg-white/60 rounded-xl border border-white/40">
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4 text-blue-600" />
                      <Label className="cursor-pointer text-slate-700">청구서 관리</Label>
                    </div>
                    <Switch
                      checked={workspaceFeatures.invoiceEnabled}
                      onCheckedChange={(checked) => updateWorkspaceFeature('invoiceEnabled', checked)}
                    />
                  </div>
                  <div className="flex items-center justify-between p-3 bg-white/60 rounded-xl border border-white/40">
                    <div className="flex items-center gap-2">
                      <CreditCard className="h-4 w-4 text-violet-600" />
                      <Label className="cursor-pointer text-slate-700">법인카드 관리</Label>
                    </div>
                    <Switch
                      checked={workspaceFeatures.corporateCardEnabled}
                      onCheckedChange={(checked) => updateWorkspaceFeature('corporateCardEnabled', checked)}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* 그룹웨어 기능 */}
            <Card variant="glass">
              <CardHeader>
                <CardTitle className="text-slate-900 flex items-center gap-2">
                  <MessageSquare className="h-5 w-5 text-blue-600" />
                  그룹웨어
                </CardTitle>
                <CardDescription className="text-slate-500">커뮤니케이션 및 협업 기능을 설정합니다</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex items-center justify-between p-3 bg-white/60 rounded-xl border border-white/40">
                    <div className="flex items-center gap-2">
                      <Megaphone className="h-4 w-4 text-rose-600" />
                      <Label className="cursor-pointer text-slate-700">공지사항</Label>
                    </div>
                    <Switch
                      checked={workspaceFeatures.announcementEnabled}
                      onCheckedChange={(checked) => updateWorkspaceFeature('announcementEnabled', checked)}
                    />
                  </div>
                  <div className="flex items-center justify-between p-3 bg-white/60 rounded-xl border border-white/40">
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4 text-emerald-600" />
                      <Label className="cursor-pointer text-slate-700">게시판</Label>
                    </div>
                    <Switch
                      checked={workspaceFeatures.boardEnabled}
                      onCheckedChange={(checked) => updateWorkspaceFeature('boardEnabled', checked)}
                    />
                  </div>
                  <div className="flex items-center justify-between p-3 bg-white/60 rounded-xl border border-white/40">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-blue-600" />
                      <Label className="cursor-pointer text-slate-700">캘린더</Label>
                    </div>
                    <Switch
                      checked={workspaceFeatures.calendarEnabled}
                      onCheckedChange={(checked) => updateWorkspaceFeature('calendarEnabled', checked)}
                    />
                  </div>
                  <div className="flex items-center justify-between p-3 bg-white/60 rounded-xl border border-white/40">
                    <div className="flex items-center gap-2">
                      <MessageSquare className="h-4 w-4 text-violet-600" />
                      <Label className="cursor-pointer text-slate-700">메시지</Label>
                    </div>
                    <Switch
                      checked={workspaceFeatures.messageEnabled}
                      onCheckedChange={(checked) => updateWorkspaceFeature('messageEnabled', checked)}
                    />
                  </div>
                  <div className="flex items-center justify-between p-3 bg-white/60 rounded-xl border border-white/40">
                    <div className="flex items-center gap-2">
                      <MessageSquare className="h-4 w-4 text-amber-600" />
                      <Label className="cursor-pointer text-slate-700">채팅</Label>
                    </div>
                    <Switch
                      checked={workspaceFeatures.chatEnabled}
                      onCheckedChange={(checked) => updateWorkspaceFeature('chatEnabled', checked)}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* 고급 기능 */}
            <Card variant="glass">
              <CardHeader>
                <CardTitle className="text-slate-900 flex items-center gap-2">
                  <Zap className="h-5 w-5 text-lime-600" />
                  고급 기능
                </CardTitle>
                <CardDescription className="text-slate-500">추가 기능 및 자동화를 설정합니다</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex items-center justify-between p-3 bg-white/60 rounded-xl border border-white/40">
                    <div className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-emerald-600" />
                      <Label className="cursor-pointer text-slate-700">결재 기능</Label>
                    </div>
                    <Switch
                      checked={workspaceFeatures.approvalEnabled}
                      onCheckedChange={(checked) => updateWorkspaceFeature('approvalEnabled', checked)}
                    />
                  </div>
                  <div className="flex items-center justify-between p-3 bg-white/60 rounded-xl border border-white/40">
                    <div className="flex items-center gap-2">
                      <BarChart3 className="h-4 w-4 text-violet-600" />
                      <Label className="cursor-pointer text-slate-700">마케팅 기능</Label>
                    </div>
                    <Switch
                      checked={workspaceFeatures.marketingEnabled}
                      onCheckedChange={(checked) => updateWorkspaceFeature('marketingEnabled', checked)}
                    />
                  </div>
                  <div className="flex items-center justify-between p-3 bg-white/60 rounded-xl border border-white/40">
                    <div className="flex items-center gap-2">
                      <Zap className="h-4 w-4 text-amber-600" />
                      <Label className="cursor-pointer text-slate-700">자동화</Label>
                    </div>
                    <Switch
                      checked={workspaceFeatures.automationEnabled}
                      onCheckedChange={(checked) => updateWorkspaceFeature('automationEnabled', checked)}
                    />
                  </div>
                  <div className="flex items-center justify-between p-3 bg-white/60 rounded-xl border border-white/40">
                    <div className="flex items-center gap-2">
                      <Database className="h-4 w-4 text-slate-600" />
                      <Label className="cursor-pointer text-slate-700">활동 로그</Label>
                    </div>
                    <Switch
                      checked={workspaceFeatures.logsEnabled}
                      onCheckedChange={(checked) => updateWorkspaceFeature('logsEnabled', checked)}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        )}
      </Tabs>
    </div>
  )
}