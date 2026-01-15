'use client'

const isDev = process.env.NODE_ENV === 'development'

// ===========================================
// 기능 설정 및 권한 관리 페이지
// - 기능 토글 + 기능별 관리자 지정
// - 멤버 권한 관리 + 워크스페이스 승계
// ===========================================

import React, { useState, useEffect, useCallback } from 'react'
import { useWorkspace } from '@/lib/workspace-context'
import toast from 'react-hot-toast'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent } from '@/components/ui/tabs'
import {
  Settings2, Kanban, Calendar, Users, FileText, Briefcase,
  DollarSign, BarChart3, MessageSquare, Megaphone, Clock,
  CreditCard, Zap, Database, CheckCircle, Building, Shield,
  Loader2, AlertCircle, Save, UserCog, Crown, User, Trash2,
  UserPlus, X, ArrowRightLeft
} from 'lucide-react'

// 워크스페이스 기능 설정 인터페이스
interface WorkspaceFeatureSettings {
  projectEnabled: boolean
  kanbanEnabled: boolean
  ganttEnabled: boolean
  mindmapEnabled: boolean
  filesEnabled: boolean
  attendanceEnabled: boolean
  employeeEnabled: boolean
  payrollEnabled: boolean
  payslipEnabled: boolean
  leaveEnabled: boolean
  hrEnabled: boolean
  organizationEnabled: boolean
  financeEnabled: boolean
  expenseEnabled: boolean
  invoiceEnabled: boolean
  corporateCardEnabled: boolean
  resumeParsingEnabled: boolean
  approvalEnabled: boolean
  marketingEnabled: boolean
  automationEnabled: boolean
  logsEnabled: boolean
  announcementEnabled: boolean
  boardEnabled: boolean
  calendarEnabled: boolean
  messageEnabled: boolean
  chatEnabled: boolean
}

interface WorkspaceMember {
  id: string
  email: string
  name: string
  department?: string
  avatar?: string
  role: 'admin' | 'member'
  workspaceRole: 'admin' | 'member'
  adminLevel: 'SUPER_ADMIN' | 'ADMIN' | 'MEMBER'
  joinedAt: string
}

interface FeatureAdmin {
  id: string
  featureKey: string
  userId: string
  user: {
    id: string
    email: string
    name: string
    avatar?: string
    department?: string
  } | null
  createdAt: string
}

// 기능 카테고리 정의
const featureCategories = [
  {
    key: 'project',
    title: '프로젝트 관리',
    icon: Kanban,
    color: 'violet',
    description: '프로젝트 및 작업 관리 기능',
    features: [
      { key: 'projectEnabled', label: '프로젝트 기능', icon: Briefcase },
      { key: 'kanbanEnabled', label: '칸반 보드', icon: Kanban },
      { key: 'ganttEnabled', label: '간트 차트', icon: BarChart3 },
      { key: 'filesEnabled', label: '파일 관리', icon: FileText },
    ]
  },
  {
    key: 'hr',
    title: 'HR 관리',
    icon: Users,
    color: 'emerald',
    description: '인사 및 근태 관리 기능',
    features: [
      { key: 'attendanceEnabled', label: '근태 관리', icon: Clock },
      { key: 'employeeEnabled', label: '직원 관리', icon: Users },
      { key: 'payrollEnabled', label: '급여 관리', icon: CreditCard },
      { key: 'leaveEnabled', label: '휴가 관리', icon: Calendar },
      { key: 'organizationEnabled', label: '조직 관리', icon: Building },
    ]
  },
  {
    key: 'finance',
    title: '재무 관리',
    icon: DollarSign,
    color: 'amber',
    description: '재무 및 경비 관리 기능',
    features: [
      { key: 'financeEnabled', label: '재무 기능', icon: DollarSign },
      { key: 'expenseEnabled', label: '경비 관리', icon: CreditCard },
      { key: 'invoiceEnabled', label: '청구서 관리', icon: FileText },
      { key: 'corporateCardEnabled', label: '법인카드 관리', icon: CreditCard },
    ]
  },
  {
    key: 'groupware',
    title: '그룹웨어',
    icon: MessageSquare,
    color: 'blue',
    description: '커뮤니케이션 및 협업 기능',
    features: [
      { key: 'announcementEnabled', label: '공지사항', icon: Megaphone },
      { key: 'boardEnabled', label: '게시판', icon: FileText },
      { key: 'calendarEnabled', label: '캘린더', icon: Calendar },
      { key: 'messageEnabled', label: '메시지', icon: MessageSquare },
      { key: 'chatEnabled', label: '채팅', icon: MessageSquare },
    ]
  },
  {
    key: 'advanced',
    title: '고급 기능',
    icon: Zap,
    color: 'lime',
    description: '추가 기능 및 자동화',
    features: [
      { key: 'approvalEnabled', label: '결재 기능', icon: CheckCircle },
      { key: 'marketingEnabled', label: '마케팅 기능', icon: BarChart3 },
      { key: 'automationEnabled', label: '자동화', icon: Zap },
      { key: 'logsEnabled', label: '활동 로그', icon: Database },
    ]
  },
]

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

export default function FeaturesSettingsPage() {
  const { currentWorkspace, features, refreshWorkspaces, isAdmin } = useWorkspace()
  const [workspaceFeatures, setWorkspaceFeatures] = useState<WorkspaceFeatureSettings>(defaultWorkspaceFeatures)
  const [members, setMembers] = useState<WorkspaceMember[]>([])
  const [featureAdmins, setFeatureAdmins] = useState<FeatureAdmin[]>([])
  const [loading, setLoading] = useState(true)
  const [savingFeatures, setSavingFeatures] = useState(false)
  const [savingRole, setSavingRole] = useState<string | null>(null)
  const [hasFeatureChanges, setHasFeatureChanges] = useState(false)
  const [activeTab, setActiveTab] = useState('features')

  // 기능별 권한 모달
  const [permissionModal, setPermissionModal] = useState<{ open: boolean; featureKey: string; title: string } | null>(null)
  const [addingAdmin, setAddingAdmin] = useState(false)

  // 워크스페이스 승계 모달
  const [transferModal, setTransferModal] = useState(false)
  const [transferring, setTransferring] = useState(false)
  const [selectedNewOwner, setSelectedNewOwner] = useState<string | null>(null)

  // 권한 등급 변경
  const [savingAdminLevel, setSavingAdminLevel] = useState<string | null>(null)

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
    setLoading(false)
  }, [features])

  // 멤버 목록 및 기능별 관리자 로드
  const loadData = useCallback(async () => {
    if (!currentWorkspace?.id) return

    try {
      const [membersRes, adminsRes] = await Promise.all([
        fetch(`/api/workspace/${currentWorkspace.id}/members`),
        fetch(`/api/workspace/${currentWorkspace.id}/feature-admins`)
      ])

      if (membersRes.ok) {
        const data = await membersRes.json()
        setMembers(data)
      }

      if (adminsRes.ok) {
        const data = await adminsRes.json()
        setFeatureAdmins(data)
      }
    } catch (error) {
      if (isDev) console.error('Failed to load data:', error)
    }
  }, [currentWorkspace?.id])

  useEffect(() => {
    loadData()
  }, [loadData])

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
  }

  const handleRoleChange = async (memberId: string, newRole: 'admin' | 'member') => {
    if (!currentWorkspace?.id) return

    setSavingRole(memberId)
    try {
      const response = await fetch(`/api/workspace/${currentWorkspace.id}/members/${memberId}/role`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: newRole })
      })

      if (response.ok) {
        toast.success('권한이 변경되었습니다')
        await loadData()
      } else {
        const error = await response.json()
        toast.error(error.error || '권한 변경 실패')
      }
    } catch (error) {
      if (isDev) console.error('Failed to change role:', error)
      toast.error('권한 변경 중 오류가 발생했습니다')
    } finally {
      setSavingRole(null)
    }
  }

  // 권한 등급 변경 (3등급 시스템)
  const handleAdminLevelChange = async (memberId: string, newLevel: 'SUPER_ADMIN' | 'ADMIN' | 'MEMBER') => {
    if (!currentWorkspace?.id) return

    setSavingAdminLevel(memberId)
    try {
      // SUPER_ADMIN이나 ADMIN으로 변경하면 role도 admin으로 변경
      const newRole = newLevel === 'MEMBER' ? 'member' : 'admin'

      const response = await fetch(`/api/workspace/${currentWorkspace.id}/members/${memberId}/role`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: newRole, adminLevel: newLevel })
      })

      if (response.ok) {
        toast.success('권한 등급이 변경되었습니다')
        await loadData()
      } else {
        const error = await response.json()
        toast.error(error.error || '권한 등급 변경 실패')
      }
    } catch (error) {
      if (isDev) console.error('Failed to change admin level:', error)
      toast.error('권한 등급 변경 중 오류가 발생했습니다')
    } finally {
      setSavingAdminLevel(null)
    }
  }

  const handleRemoveMember = async (memberId: string) => {
    if (!currentWorkspace?.id) return

    if (!confirm('정말로 이 멤버를 워크스페이스에서 제거하시겠습니까?')) {
      return
    }

    try {
      const response = await fetch(`/api/workspace/${currentWorkspace.id}/members/${memberId}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        toast.success('멤버가 제거되었습니다')
        await loadData()
      } else {
        const error = await response.json()
        toast.error(error.error || '멤버 제거 실패')
      }
    } catch (error) {
      if (isDev) console.error('Failed to remove member:', error)
      toast.error('멤버 제거 중 오류가 발생했습니다')
    }
  }

  // 기능별 관리자 추가
  const handleAddFeatureAdmin = async (userId: string) => {
    if (!currentWorkspace?.id || !permissionModal) return

    setAddingAdmin(true)
    try {
      const response = await fetch(`/api/workspace/${currentWorkspace.id}/feature-admins`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          featureKey: permissionModal.featureKey
        })
      })

      if (response.ok) {
        toast.success('기능 관리자가 추가되었습니다')
        await loadData()
      } else {
        const error = await response.json()
        toast.error(error.error || '기능 관리자 추가 실패')
      }
    } catch (error) {
      if (isDev) console.error('Failed to add feature admin:', error)
      toast.error('기능 관리자 추가 중 오류가 발생했습니다')
    } finally {
      setAddingAdmin(false)
    }
  }

  // 기능별 관리자 삭제
  const handleRemoveFeatureAdmin = async (featureAdminId: string) => {
    if (!currentWorkspace?.id) return

    try {
      const response = await fetch(`/api/workspace/${currentWorkspace.id}/feature-admins?id=${featureAdminId}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        toast.success('기능 관리자가 제거되었습니다')
        await loadData()
      } else {
        const error = await response.json()
        toast.error(error.error || '기능 관리자 제거 실패')
      }
    } catch (error) {
      if (isDev) console.error('Failed to remove feature admin:', error)
      toast.error('기능 관리자 제거 중 오류가 발생했습니다')
    }
  }

  // 워크스페이스 승계
  const handleTransferOwnership = async () => {
    if (!currentWorkspace?.id || !selectedNewOwner) return

    if (!confirm('정말로 워크스페이스 관리 권한을 이 멤버에게 승계하시겠습니까?')) {
      return
    }

    setTransferring(true)
    try {
      const response = await fetch(`/api/workspace/${currentWorkspace.id}/transfer`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ newOwnerId: selectedNewOwner })
      })

      if (response.ok) {
        toast.success('워크스페이스 관리 권한이 승계되었습니다')
        setTransferModal(false)
        setSelectedNewOwner(null)
        await loadData()
      } else {
        const error = await response.json()
        toast.error(error.error || '워크스페이스 승계 실패')
      }
    } catch (error) {
      if (isDev) console.error('Failed to transfer ownership:', error)
      toast.error('워크스페이스 승계 중 오류가 발생했습니다')
    } finally {
      setTransferring(false)
    }
  }

  // 특정 기능의 관리자 목록 가져오기
  const getFeatureAdmins = (featureKey: string) => {
    return featureAdmins.filter(fa => fa.featureKey === featureKey)
  }

  // 관리자가 아니면 접근 불가
  if (!isAdmin) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <Shield className="h-16 w-16 text-slate-300 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-slate-700">접근 권한이 없습니다</h2>
          <p className="text-slate-500 mt-2">이 페이지는 워크스페이스 관리자만 접근할 수 있습니다</p>
        </div>
      </div>
    )
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
      {/* 헤더 */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 flex items-center gap-3">
            <div className="p-2 bg-lime-100 rounded-xl">
              <Settings2 className="w-6 h-6 text-lime-600" />
            </div>
            기능 및 권한 설정
          </h1>
          <p className="text-slate-500 mt-2">워크스페이스 기능과 멤버 권한을 관리합니다</p>
        </div>
      </div>

      {/* 탭 네비게이션 */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <div className="bg-white/60 backdrop-blur-sm rounded-2xl shadow-lg shadow-black/5 p-1.5 border border-white/40 max-w-[400px]">
          <div className="grid grid-cols-2 gap-1">
            <button
              onClick={() => setActiveTab('features')}
              className={`flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${
                activeTab === 'features'
                  ? 'bg-black text-lime-400 shadow-lg'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
              }`}
            >
              <Settings2 className="w-4 h-4" />
              기능 설정
            </button>
            <button
              onClick={() => setActiveTab('permissions')}
              className={`flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${
                activeTab === 'permissions'
                  ? 'bg-black text-lime-400 shadow-lg'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
              }`}
            >
              <UserCog className="w-4 h-4" />
              권한 관리
            </button>
          </div>
        </div>

        {/* 기능 설정 탭 */}
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

          {/* 기능 카테고리별 카드 */}
          {featureCategories.map((category) => {
            const categoryAdmins = getFeatureAdmins(category.key)
            const IconComponent = category.icon

            return (
              <Card key={category.key} variant="glass">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-slate-900 flex items-center gap-2">
                        <IconComponent className={`h-5 w-5 text-${category.color}-600`} />
                        {category.title}
                      </CardTitle>
                      <CardDescription className="text-slate-500">{category.description}</CardDescription>
                    </div>
                    {/* 권한 버튼 */}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPermissionModal({ open: true, featureKey: category.key, title: category.title })}
                      className="rounded-xl border-slate-200 hover:border-lime-400 hover:bg-lime-50"
                    >
                      <UserCog className="h-4 w-4 mr-2" />
                      권한 ({categoryAdmins.length})
                    </Button>
                  </div>
                  {/* 현재 관리자 표시 */}
                  {categoryAdmins.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-3">
                      {categoryAdmins.map((admin) => (
                        <Badge key={admin.id} variant="secondary" className="bg-lime-100 text-lime-700 gap-1">
                          {admin.user?.avatar ? (
                            <img src={admin.user.avatar} className="w-4 h-4 rounded-full" alt="" />
                          ) : (
                            <User className="w-3 h-3" />
                          )}
                          {admin.user?.name || '알 수 없음'}
                        </Badge>
                      ))}
                    </div>
                  )}
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {category.features.map((feature) => {
                      const FeatureIcon = feature.icon
                      return (
                        <div key={feature.key} className="flex items-center justify-between p-3 bg-white/60 rounded-xl border border-white/40">
                          <div className="flex items-center gap-2">
                            <FeatureIcon className="h-4 w-4 text-slate-600" />
                            <Label className="cursor-pointer text-slate-700">{feature.label}</Label>
                          </div>
                          <Switch
                            checked={workspaceFeatures[feature.key as keyof WorkspaceFeatureSettings]}
                            onCheckedChange={(checked) => updateWorkspaceFeature(feature.key as keyof WorkspaceFeatureSettings, checked)}
                          />
                        </div>
                      )
                    })}
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </TabsContent>

        {/* 권한 관리 탭 */}
        <TabsContent value="permissions" className="space-y-4 mt-6">
          {/* 워크스페이스 승계 */}
          <Card variant="glass">
            <CardHeader>
              <CardTitle className="text-slate-900 flex items-center gap-2">
                <ArrowRightLeft className="h-5 w-5 text-rose-600" />
                워크스페이스 승계
              </CardTitle>
              <CardDescription className="text-slate-500">
                워크스페이스의 관리 권한을 다른 멤버에게 이전합니다
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button
                variant="outline"
                onClick={() => setTransferModal(true)}
                className="rounded-xl border-rose-200 text-rose-600 hover:bg-rose-50 hover:border-rose-400"
              >
                <ArrowRightLeft className="h-4 w-4 mr-2" />
                워크스페이스 승계하기
              </Button>
            </CardContent>
          </Card>

          {/* 멤버 권한 관리 (3등급 시스템) */}
          <Card variant="glass">
            <CardHeader>
              <CardTitle className="text-slate-900 flex items-center gap-2">
                <UserCog className="h-5 w-5 text-violet-600" />
                멤버 권한 관리 (3등급)
              </CardTitle>
              <CardDescription className="text-slate-500">
                워크스페이스 멤버의 권한 등급을 관리합니다. 등급별로 접근 가능한 기능이 다릅니다.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {members.length === 0 ? (
                <div className="text-center py-8 text-slate-500">
                  <Users className="h-12 w-12 mx-auto mb-2 text-slate-300" />
                  <p>멤버가 없습니다</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {members.map((member) => {
                    const levelColors: Record<string, string> = {
                      SUPER_ADMIN: 'bg-rose-100 text-rose-700 border-rose-200',
                      ADMIN: 'bg-amber-100 text-amber-700 border-amber-200',
                      MEMBER: 'bg-slate-100 text-slate-700 border-slate-200'
                    }
                    const levelLabels: Record<string, string> = {
                      SUPER_ADMIN: '1등급 (최고관리자)',
                      ADMIN: '2등급 (관리자)',
                      MEMBER: '3등급 (멤버)'
                    }
                    return (
                      <div
                        key={member.id}
                        className="flex items-center justify-between p-4 bg-white/60 rounded-xl border border-white/40"
                      >
                        <div className="flex items-center gap-3">
                          {member.avatar ? (
                            <img
                              src={member.avatar}
                              alt={member.name}
                              className="w-10 h-10 rounded-full object-cover"
                            />
                          ) : (
                            <div className="w-10 h-10 bg-lime-100 rounded-full flex items-center justify-center">
                              <User className="h-5 w-5 text-lime-600" />
                            </div>
                          )}
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-slate-900">{member.name}</span>
                              <Badge className={`${levelColors[member.adminLevel || 'MEMBER']} gap-1`}>
                                {member.adminLevel === 'SUPER_ADMIN' && <Crown className="h-3 w-3" />}
                                {member.adminLevel === 'ADMIN' && <Shield className="h-3 w-3" />}
                                {levelLabels[member.adminLevel || 'MEMBER']}
                              </Badge>
                            </div>
                            <span className="text-sm text-slate-500">{member.email}</span>
                            {member.department && (
                              <span className="text-sm text-slate-400 ml-2">· {member.department}</span>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <select
                            value={member.adminLevel || 'MEMBER'}
                            onChange={(e) => handleAdminLevelChange(member.id, e.target.value as 'SUPER_ADMIN' | 'ADMIN' | 'MEMBER')}
                            disabled={savingAdminLevel === member.id}
                            className="px-3 py-2 rounded-xl text-sm border border-white/40 bg-white/60 text-slate-700 focus:outline-none focus:ring-2 focus:ring-lime-400"
                          >
                            <option value="SUPER_ADMIN">1등급 (최고관리자)</option>
                            <option value="ADMIN">2등급 (관리자)</option>
                            <option value="MEMBER">3등급 (멤버)</option>
                          </select>
                          {savingAdminLevel === member.id && (
                            <Loader2 className="h-4 w-4 animate-spin text-lime-600" />
                          )}
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleRemoveMember(member.id)}
                            className="text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-xl"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          {/* 권한 등급 설명 (3등급) */}
          <Card variant="glass">
            <CardHeader>
              <CardTitle className="text-slate-900 flex items-center gap-2">
                <Shield className="h-5 w-5 text-blue-600" />
                권한 등급 안내
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-4 bg-rose-50 rounded-xl border border-rose-100">
                  <div className="flex items-center gap-2 mb-2">
                    <Crown className="h-5 w-5 text-rose-600" />
                    <span className="font-semibold text-rose-800">1등급 (최고관리자)</span>
                  </div>
                  <ul className="text-sm text-rose-700 space-y-1 ml-7">
                    <li>• <strong>성과 등록</strong> (팀원 평가)</li>
                    <li>• <strong>급여 관리</strong></li>
                    <li>• 조직 구조 변경</li>
                    <li>• 모든 설정 접근</li>
                    <li>• 권한 등급 변경</li>
                  </ul>
                </div>
                <div className="p-4 bg-amber-50 rounded-xl border border-amber-100">
                  <div className="flex items-center gap-2 mb-2">
                    <Shield className="h-5 w-5 text-amber-600" />
                    <span className="font-semibold text-amber-800">2등급 (관리자)</span>
                  </div>
                  <ul className="text-sm text-amber-700 space-y-1 ml-7">
                    <li>• <strong>출퇴근 관리</strong> (팀원 체크)</li>
                    <li>• 직원 정보 관리</li>
                    <li>• 휴가 승인</li>
                    <li>• 공지사항 작성</li>
                    <li>• HR 메뉴 접근</li>
                  </ul>
                </div>
                <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                  <div className="flex items-center gap-2 mb-2">
                    <User className="h-5 w-5 text-slate-600" />
                    <span className="font-semibold text-slate-800">3등급 (멤버)</span>
                  </div>
                  <ul className="text-sm text-slate-700 space-y-1 ml-7">
                    <li>• 본인 출퇴근</li>
                    <li>• 프로젝트 참여</li>
                    <li>• 휴가 신청</li>
                    <li>• 게시판/공지 열람</li>
                    <li>• 본인 데이터 관리</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* 기능별 권한 모달 */}
      {permissionModal && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[80vh] overflow-hidden">
            <div className="flex items-center justify-between p-6 border-b border-slate-100">
              <h3 className="text-lg font-semibold text-slate-900">
                {permissionModal.title} 관리자 설정
              </h3>
              <button
                onClick={() => setPermissionModal(null)}
                className="p-2 hover:bg-slate-100 rounded-xl transition-colors"
              >
                <X className="h-5 w-5 text-slate-500" />
              </button>
            </div>

            <div className="p-6 space-y-6 overflow-y-auto max-h-[60vh]">
              {/* 현재 기능 관리자 */}
              <div>
                <h4 className="text-sm font-medium text-slate-700 mb-3">현재 기능 관리자</h4>
                {getFeatureAdmins(permissionModal.featureKey).length === 0 ? (
                  <p className="text-sm text-slate-500 py-4 text-center bg-slate-50 rounded-xl">
                    지정된 기능 관리자가 없습니다
                  </p>
                ) : (
                  <div className="space-y-2">
                    {getFeatureAdmins(permissionModal.featureKey).map((admin) => (
                      <div key={admin.id} className="flex items-center justify-between p-3 bg-lime-50 rounded-xl">
                        <div className="flex items-center gap-3">
                          {admin.user?.avatar ? (
                            <img src={admin.user.avatar} className="w-8 h-8 rounded-full" alt="" />
                          ) : (
                            <div className="w-8 h-8 bg-lime-200 rounded-full flex items-center justify-center">
                              <User className="h-4 w-4 text-lime-700" />
                            </div>
                          )}
                          <div>
                            <p className="text-sm font-medium text-slate-900">{admin.user?.name}</p>
                            <p className="text-xs text-slate-500">{admin.user?.email}</p>
                          </div>
                        </div>
                        <button
                          onClick={() => handleRemoveFeatureAdmin(admin.id)}
                          className="p-2 text-rose-500 hover:bg-rose-50 rounded-lg transition-colors"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* 멤버 목록에서 추가 */}
              <div>
                <h4 className="text-sm font-medium text-slate-700 mb-3">멤버에서 추가</h4>
                <div className="space-y-2">
                  {members
                    .filter(m => !getFeatureAdmins(permissionModal.featureKey).some(fa => fa.userId === m.id))
                    .map((member) => (
                      <div key={member.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl">
                        <div className="flex items-center gap-3">
                          {member.avatar ? (
                            <img src={member.avatar} className="w-8 h-8 rounded-full" alt="" />
                          ) : (
                            <div className="w-8 h-8 bg-slate-200 rounded-full flex items-center justify-center">
                              <User className="h-4 w-4 text-slate-600" />
                            </div>
                          )}
                          <div>
                            <p className="text-sm font-medium text-slate-900">{member.name}</p>
                            <p className="text-xs text-slate-500">{member.email}</p>
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleAddFeatureAdmin(member.id)}
                          disabled={addingAdmin}
                          className="text-lime-600 hover:bg-lime-50"
                        >
                          {addingAdmin ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <UserPlus className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                    ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 워크스페이스 승계 모달 */}
      {transferModal && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full">
            <div className="flex items-center justify-between p-6 border-b border-slate-100">
              <h3 className="text-lg font-semibold text-slate-900">워크스페이스 승계</h3>
              <button
                onClick={() => {
                  setTransferModal(false)
                  setSelectedNewOwner(null)
                }}
                className="p-2 hover:bg-slate-100 rounded-xl transition-colors"
              >
                <X className="h-5 w-5 text-slate-500" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              <div className="p-4 bg-amber-50 rounded-xl border border-amber-200">
                <div className="flex gap-3">
                  <AlertCircle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
                  <div className="text-sm text-amber-700">
                    <p className="font-medium mb-1">주의사항</p>
                    <ul className="list-disc list-inside space-y-1">
                      <li>선택한 멤버에게 관리자 권한이 부여됩니다</li>
                      <li>기존 관리자 권한은 유지됩니다</li>
                      <li>이 작업은 되돌릴 수 없습니다</li>
                    </ul>
                  </div>
                </div>
              </div>

              <div>
                <h4 className="text-sm font-medium text-slate-700 mb-3">새로운 관리자 선택</h4>
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {members
                    .filter(m => m.workspaceRole !== 'admin')
                    .map((member) => (
                      <div
                        key={member.id}
                        onClick={() => setSelectedNewOwner(member.id)}
                        className={`flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-colors ${
                          selectedNewOwner === member.id
                            ? 'bg-lime-100 border-2 border-lime-400'
                            : 'bg-slate-50 hover:bg-slate-100 border-2 border-transparent'
                        }`}
                      >
                        {member.avatar ? (
                          <img src={member.avatar} className="w-10 h-10 rounded-full" alt="" />
                        ) : (
                          <div className="w-10 h-10 bg-slate-200 rounded-full flex items-center justify-center">
                            <User className="h-5 w-5 text-slate-600" />
                          </div>
                        )}
                        <div>
                          <p className="font-medium text-slate-900">{member.name}</p>
                          <p className="text-sm text-slate-500">{member.email}</p>
                        </div>
                      </div>
                    ))}
                  {members.filter(m => m.workspaceRole !== 'admin').length === 0 && (
                    <p className="text-sm text-slate-500 py-4 text-center">
                      승계할 수 있는 멤버가 없습니다
                    </p>
                  )}
                </div>
              </div>

              <div className="flex justify-end gap-3">
                <Button
                  variant="outline"
                  onClick={() => {
                    setTransferModal(false)
                    setSelectedNewOwner(null)
                  }}
                  className="rounded-xl"
                >
                  취소
                </Button>
                <Button
                  variant="limePrimary"
                  onClick={handleTransferOwnership}
                  disabled={!selectedNewOwner || transferring}
                  className="rounded-xl"
                >
                  {transferring ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <ArrowRightLeft className="h-4 w-4 mr-2" />
                  )}
                  승계하기
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
