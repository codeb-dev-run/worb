'use client'

// ===========================================
// Glass Morphism Project Create Wizard
// ===========================================

import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Project } from '@/types'
import {
  LayoutTemplate, Code, Smartphone, Megaphone, FileText,
  X, ChevronLeft, ChevronRight, Check, Users, Calendar,
  Info, Save, Sparkles, Shield, Eye, UserPlus, Trash2, Search
} from 'lucide-react'
import { useWorkspace } from '@/lib/workspace-context'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

interface ProjectCreateWizardProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (project: Omit<Project, 'id' | 'createdAt' | 'updatedAt'>) => void
}

interface StepProps {
  projectData: Partial<Project & { inviteMembers: InviteMember[] }>
  setProjectData: (data: Partial<Project & { inviteMembers: InviteMember[] }>) => void
  onNext: () => void
  onBack?: () => void
  onSaveDraft?: () => void
}

interface InviteMember {
  userId: string
  email: string
  name: string
  avatar?: string | null
  role: 'Viewer' | 'Developer' | 'Designer' | 'PM' | 'Admin'
}

interface WorkspaceMember {
  id: string
  email: string
  name: string
  avatar?: string | null
  department?: string | null
  departmentName?: string | null
  departmentColor?: string | null
}

// Template Definitions
const TEMPLATES = [
  {
    id: 'blank',
    name: '빈 프로젝트',
    description: '처음부터 직접 프로젝트를 설정합니다.',
    icon: FileText,
    color: 'slate',
    data: {}
  },
  {
    id: 'web',
    name: '웹사이트 개발',
    description: '웹사이트 구축을 위한 기본 설정이 포함되어 있습니다.',
    icon: LayoutTemplate,
    color: 'lime',
    data: {
      name: '새 웹사이트 프로젝트',
      description: '반응형 웹사이트 구축 프로젝트입니다.',
      status: 'planning' as const
    }
  },
  {
    id: 'app',
    name: '모바일 앱 개발',
    description: 'iOS 및 Android 앱 개발을 위한 템플릿입니다.',
    icon: Smartphone,
    color: 'violet',
    data: {
      name: '새 모바일 앱 프로젝트',
      description: '크로스 플랫폼 모바일 앱 개발 프로젝트입니다.',
      status: 'planning' as const
    }
  },
  {
    id: 'marketing',
    name: '마케팅 캠페인',
    description: '마케팅 및 광고 캠페인 관리를 위한 템플릿입니다.',
    icon: Megaphone,
    color: 'amber',
    data: {
      name: '새 마케팅 캠페인',
      description: '분기별 마케팅 캠페인 기획 및 실행',
      status: 'planning' as const
    }
  }
]

const ROLES = [
  { value: 'Viewer', label: '뷰어', description: '읽기 전용 권한', icon: Eye },
  { value: 'Developer', label: '개발자', description: '작업 수정 가능', icon: Code },
  { value: 'Designer', label: '디자이너', description: '디자인 작업 권한', icon: Sparkles },
  { value: 'PM', label: 'PM', description: '프로젝트 관리 권한', icon: Users },
  { value: 'Admin', label: '관리자', description: '전체 관리 권한', icon: Shield },
]

// Step 1: 템플릿 선택
const TemplateStep: React.FC<StepProps> = ({ projectData, setProjectData, onNext }) => {
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null)

  const handleSelect = (templateId: string) => {
    setSelectedTemplate(templateId)
    const template = TEMPLATES.find(t => t.id === templateId)
    if (template) {
      setProjectData({
        ...projectData,
        ...template.data
      })
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-bold text-slate-900 mb-1">템플릿 선택</h3>
        <p className="text-sm text-slate-500">프로젝트를 시작할 템플릿을 선택해주세요.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {TEMPLATES.map((template) => {
          const Icon = template.icon
          const isSelected = selectedTemplate === template.id
          return (
            <Card
              key={template.id}
              variant="glass"
              className={cn(
                "cursor-pointer transition-all duration-300 hover:shadow-xl hover:-translate-y-1",
                isSelected && "ring-2 ring-lime-400 bg-lime-50/50"
              )}
              onClick={() => handleSelect(template.id)}
            >
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <div className={cn(
                    "p-2.5 rounded-xl transition-colors",
                    isSelected ? "bg-lime-400 text-black" : "bg-slate-100 text-slate-500"
                  )}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <div className="flex-1">
                    <h4 className="font-semibold text-slate-900">{template.name}</h4>
                    <p className="text-sm text-slate-500 mt-0.5">{template.description}</p>
                  </div>
                  {isSelected && (
                    <div className="p-1 bg-lime-400 rounded-full">
                      <Check className="w-4 h-4 text-black" />
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      <div className="flex justify-end pt-4">
        <Button
          variant="limePrimary"
          onClick={onNext}
          disabled={!selectedTemplate}
          className="rounded-xl"
        >
          다음 단계
          <ChevronRight className="w-4 h-4 ml-1" />
        </Button>
      </div>
    </div>
  )
}

// Step 2: 기본 정보
const BasicInfoStep: React.FC<StepProps> = ({ projectData, setProjectData, onNext, onBack, onSaveDraft }) => {
  const [errors, setErrors] = useState<Record<string, string>>({})

  const validate = () => {
    const newErrors: Record<string, string> = {}
    if (!projectData.name?.trim()) {
      newErrors.name = '프로젝트 이름을 입력해주세요'
    }
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleNext = () => {
    if (validate()) {
      onNext()
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-bold text-slate-900 mb-1">기본 정보</h3>
        <p className="text-sm text-slate-500">프로젝트의 기본 정보를 입력해주세요.</p>
      </div>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">
            프로젝트 이름 <span className="text-rose-500">*</span>
          </label>
          <Input
            type="text"
            value={projectData.name || ''}
            onChange={(e) => setProjectData({ ...projectData, name: e.target.value })}
            className={cn(errors.name && "border-rose-500 focus:ring-rose-500")}
            placeholder="예: 웹사이트 리뉴얼"
          />
          {errors.name && <p className="text-sm text-rose-500 mt-1">{errors.name}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">
            프로젝트 설명
          </label>
          <textarea
            value={projectData.description || ''}
            onChange={(e) => setProjectData({ ...projectData, description: e.target.value })}
            className="w-full px-4 py-2.5 bg-white/60 border border-white/40 rounded-xl focus:ring-2 focus:ring-lime-400 focus:border-transparent transition-all text-sm resize-none"
            rows={3}
            placeholder="프로젝트에 대한 간단한 설명을 입력하세요"
          />
        </div>

        {/* 공개 여부 및 승인 설정 */}
        <Card variant="glass">
          <CardContent className="p-4 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-lime-100 rounded-xl">
                  <Eye className="w-4 h-4 text-lime-600" />
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-900">회사 공개로 설정</label>
                  <p className="text-xs text-slate-500">모든 회사 멤버가 이 프로젝트를 볼 수 있습니다.</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setProjectData({
                  ...projectData,
                  visibility: projectData.visibility === 'public' ? 'private' : 'public'
                })}
                className={cn(
                  "relative inline-flex h-6 w-11 items-center rounded-full transition-colors",
                  projectData.visibility === 'public' ? "bg-lime-400" : "bg-slate-200"
                )}
              >
                <span className={cn(
                  "inline-block h-5 w-5 transform rounded-full bg-white shadow-sm transition-transform",
                  projectData.visibility === 'public' ? "translate-x-5" : "translate-x-0.5"
                )} />
              </button>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-violet-100 rounded-xl">
                  <Shield className="w-4 h-4 text-violet-600" />
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-900">관리자 승인 후 참여 가능</label>
                  <p className="text-xs text-slate-500">멤버가 프로젝트에 참여하려면 관리자의 승인이 필요합니다.</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setProjectData({
                  ...projectData,
                  requireApproval: !projectData.requireApproval
                })}
                className={cn(
                  "relative inline-flex h-6 w-11 items-center rounded-full transition-colors",
                  projectData.requireApproval ? "bg-lime-400" : "bg-slate-200"
                )}
              >
                <span className={cn(
                  "inline-block h-5 w-5 transform rounded-full bg-white shadow-sm transition-transform",
                  projectData.requireApproval ? "translate-x-5" : "translate-x-0.5"
                )} />
              </button>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex justify-between items-center pt-4">
        <Button variant="glass" onClick={onBack} className="rounded-xl">
          <ChevronLeft className="w-4 h-4 mr-1" />
          이전
        </Button>
        <div className="flex gap-2">
          <Button variant="ghost" onClick={onSaveDraft} className="rounded-xl text-slate-600">
            <Save className="w-4 h-4 mr-1" />
            임시 저장
          </Button>
          <Button variant="limePrimary" onClick={handleNext} className="rounded-xl">
            다음 단계
            <ChevronRight className="w-4 h-4 ml-1" />
          </Button>
        </div>
      </div>
    </div>
  )
}

// Step 3: 일정 설정
const ScheduleStep: React.FC<StepProps> = ({ projectData, setProjectData, onNext, onBack, onSaveDraft }) => {
  const [errors, setErrors] = useState<Record<string, string>>({})

  const validate = () => {
    const newErrors: Record<string, string> = {}
    if (projectData.startDate && projectData.endDate &&
      new Date(projectData.startDate) > new Date(projectData.endDate)) {
      newErrors.endDate = '종료일은 시작일 이후여야 합니다'
    }
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleNext = () => {
    if (validate()) {
      onNext()
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-bold text-slate-900 mb-1">일정 설정</h3>
        <p className="text-sm text-slate-500">프로젝트 일정을 설정해주세요.</p>
      </div>

      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5 flex items-center gap-2">
              <Calendar className="w-4 h-4 text-lime-600" />
              시작일
            </label>
            <Input
              type="date"
              value={projectData.startDate ? new Date(projectData.startDate).toISOString().split('T')[0] : ''}
              onChange={(e) => setProjectData({ ...projectData, startDate: new Date(e.target.value) })}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5 flex items-center gap-2">
              <Calendar className="w-4 h-4 text-rose-600" />
              종료일
            </label>
            <Input
              type="date"
              value={projectData.endDate ? new Date(projectData.endDate).toISOString().split('T')[0] : ''}
              onChange={(e) => setProjectData({ ...projectData, endDate: new Date(e.target.value) })}
              className={cn(errors.endDate && "border-rose-500")}
            />
            {errors.endDate && <p className="text-sm text-rose-500 mt-1">{errors.endDate}</p>}
          </div>
        </div>
      </div>

      <div className="flex justify-between items-center pt-4">
        <Button variant="glass" onClick={onBack} className="rounded-xl">
          <ChevronLeft className="w-4 h-4 mr-1" />
          이전
        </Button>
        <div className="flex gap-2">
          <Button variant="ghost" onClick={onSaveDraft} className="rounded-xl text-slate-600">
            <Save className="w-4 h-4 mr-1" />
            임시 저장
          </Button>
          <Button variant="limePrimary" onClick={handleNext} className="rounded-xl">
            다음 단계
            <ChevronRight className="w-4 h-4 ml-1" />
          </Button>
        </div>
      </div>
    </div>
  )
}

// Step 4: 팀 초대 (워크스페이스 멤버 선택 방식)
const TeamInviteStep: React.FC<StepProps> = ({ projectData, setProjectData, onNext, onBack, onSaveDraft }) => {
  const { currentWorkspace } = useWorkspace()
  const [workspaceMembers, setWorkspaceMembers] = useState<WorkspaceMember[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedRole, setSelectedRole] = useState<InviteMember['role']>('Developer')

  // 워크스페이스 멤버 조회
  useEffect(() => {
    const loadMembers = async () => {
      if (!currentWorkspace?.id) return

      try {
        setLoading(true)
        const response = await fetch(`/api/workspace/current/members?workspaceId=${currentWorkspace.id}`)
        if (response.ok) {
          const members = await response.json()
          setWorkspaceMembers(members)
        }
      } catch (error) {
        console.error('Failed to load workspace members:', error)
      } finally {
        setLoading(false)
      }
    }

    loadMembers()
  }, [currentWorkspace?.id])

  // 검색 필터링
  const filteredMembers = workspaceMembers.filter(member => {
    const query = searchQuery.toLowerCase()
    return (
      member.name?.toLowerCase().includes(query) ||
      member.email?.toLowerCase().includes(query)
    )
  })

  // 이미 초대된 멤버인지 확인
  const isInvited = (memberId: string) => {
    return projectData.inviteMembers?.some(m => m.userId === memberId)
  }

  const addMember = (member: WorkspaceMember) => {
    if (isInvited(member.id)) return

    const newMember: InviteMember = {
      userId: member.id,
      email: member.email,
      name: member.name || member.email,
      avatar: member.avatar,
      role: selectedRole
    }
    setProjectData({
      ...projectData,
      inviteMembers: [...(projectData.inviteMembers || []), newMember]
    })
  }

  const removeMember = (userId: string) => {
    setProjectData({
      ...projectData,
      inviteMembers: projectData.inviteMembers?.filter(m => m.userId !== userId) || []
    })
  }

  const updateMemberRole = (userId: string, role: InviteMember['role']) => {
    setProjectData({
      ...projectData,
      inviteMembers: projectData.inviteMembers?.map(m =>
        m.userId === userId ? { ...m, role } : m
      ) || []
    })
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-bold text-slate-900 mb-1">팀 초대</h3>
        <p className="text-sm text-slate-500">워크스페이스 멤버 중 프로젝트에 참여할 팀원을 선택하세요.</p>
      </div>

      <Card variant="glass">
        <CardContent className="p-4 space-y-4">
          {/* 역할 선택 */}
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-2">추가할 역할 선택</label>
            <div className="grid grid-cols-5 gap-2">
              {ROLES.map(role => {
                const Icon = role.icon
                return (
                  <div
                    key={role.value}
                    className={cn(
                      "p-2 rounded-xl text-center cursor-pointer transition-all",
                      selectedRole === role.value
                        ? "bg-lime-100 border border-lime-300"
                        : "bg-slate-50 border border-transparent hover:bg-slate-100"
                    )}
                    onClick={() => setSelectedRole(role.value as InviteMember['role'])}
                  >
                    <Icon className={cn(
                      "w-4 h-4 mx-auto mb-1",
                      selectedRole === role.value ? "text-lime-600" : "text-slate-400"
                    )} />
                    <p className="text-xs font-medium text-slate-700">{role.label}</p>
                  </div>
                )
              })}
            </div>
          </div>

          {/* 멤버 검색 */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="이름 또는 이메일로 검색"
              className="pl-10"
            />
          </div>

          {/* 멤버 목록 */}
          <div className="max-h-48 overflow-y-auto space-y-2">
            {loading ? (
              <div className="text-center py-4">
                <div className="animate-spin w-6 h-6 border-2 border-lime-400 border-t-transparent rounded-full mx-auto"></div>
                <p className="text-sm text-slate-500 mt-2">멤버 불러오는 중...</p>
              </div>
            ) : filteredMembers.length === 0 ? (
              <div className="text-center py-4">
                <p className="text-sm text-slate-500">
                  {searchQuery ? '검색 결과가 없습니다' : '워크스페이스에 멤버가 없습니다'}
                </p>
              </div>
            ) : (
              filteredMembers.map((member) => {
                const invited = isInvited(member.id)
                return (
                  <div
                    key={member.id}
                    className={cn(
                      "flex items-center justify-between p-3 rounded-xl transition-all",
                      invited
                        ? "bg-lime-50 border border-lime-200"
                        : "bg-white/60 border border-transparent hover:bg-slate-50 cursor-pointer"
                    )}
                    onClick={() => !invited && addMember(member)}
                  >
                    <div className="flex items-center gap-3">
                      {member.avatar ? (
                        <img
                          src={member.avatar}
                          alt={member.name || member.email}
                          className="w-8 h-8 rounded-xl object-cover"
                        />
                      ) : (
                        <div className="w-8 h-8 rounded-xl bg-slate-100 flex items-center justify-center">
                          <span className="text-sm font-medium text-slate-600">
                            {(member.name || member.email)[0].toUpperCase()}
                          </span>
                        </div>
                      )}
                      <div>
                        <p className="text-sm font-medium text-slate-900">{member.name || member.email}</p>
                        <p className="text-xs text-slate-500">{member.email}</p>
                      </div>
                      {member.departmentName && (
                        <Badge
                          className="text-xs border-0"
                          style={{ backgroundColor: `${member.departmentColor}20`, color: member.departmentColor }}
                        >
                          {member.departmentName}
                        </Badge>
                      )}
                    </div>
                    {invited ? (
                      <Badge className="bg-lime-100 text-lime-700 border-0">
                        <Check className="w-3 h-3 mr-1" />
                        선택됨
                      </Badge>
                    ) : (
                      <Button variant="ghost" size="sm" className="rounded-lg h-7 text-xs">
                        <UserPlus className="w-3 h-3 mr-1" />
                        추가
                      </Button>
                    )}
                  </div>
                )
              })
            )}
          </div>
        </CardContent>
      </Card>

      {/* 선택된 팀원 목록 */}
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-2">
          선택된 팀원 ({projectData.inviteMembers?.length || 0}명)
        </label>
        <div className="space-y-2 max-h-48 overflow-y-auto">
          {projectData.inviteMembers?.map((member) => {
            const roleInfo = ROLES.find(r => r.value === member.role)
            const RoleIcon = roleInfo?.icon || Users
            return (
              <Card key={member.userId} variant="glass" className="hover:shadow-md transition-shadow">
                <CardContent className="p-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {member.avatar ? (
                        <img
                          src={member.avatar}
                          alt={member.name}
                          className="w-8 h-8 rounded-xl object-cover"
                        />
                      ) : (
                        <div className="w-8 h-8 rounded-xl bg-slate-100 flex items-center justify-center">
                          <span className="text-sm font-medium text-slate-600">
                            {member.name[0].toUpperCase()}
                          </span>
                        </div>
                      )}
                      <div>
                        <p className="text-sm font-medium text-slate-900">{member.name}</p>
                        <div className="flex items-center gap-1 mt-0.5">
                          <RoleIcon className="w-3 h-3 text-slate-400" />
                          <span className="text-xs text-slate-500">{roleInfo?.label}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="flex gap-1">
                        {ROLES.map(role => (
                          <button
                            key={role.value}
                            onClick={() => updateMemberRole(member.userId, role.value as InviteMember['role'])}
                            className={cn(
                              "px-2 py-1 text-xs rounded-lg transition-all",
                              member.role === role.value
                                ? "bg-lime-100 text-lime-700 ring-1 ring-lime-400"
                                : "bg-white/60 text-slate-500 hover:bg-slate-100"
                            )}
                          >
                            {role.label}
                          </button>
                        ))}
                      </div>
                      <button
                        onClick={() => removeMember(member.userId)}
                        className="p-1.5 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })}
          {(!projectData.inviteMembers || projectData.inviteMembers.length === 0) && (
            <Card variant="glass" className="py-8">
              <CardContent>
                <div className="flex flex-col items-center justify-center">
                  <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center mb-3">
                    <Users className="w-6 h-6 text-slate-400" />
                  </div>
                  <p className="text-sm text-slate-500">선택된 팀원이 없습니다</p>
                  <p className="text-xs text-slate-400 mt-1">위에서 멤버를 클릭하여 추가하세요</p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      <div className="flex justify-between items-center pt-4">
        <Button variant="glass" onClick={onBack} className="rounded-xl">
          <ChevronLeft className="w-4 h-4 mr-1" />
          이전
        </Button>
        <div className="flex gap-2">
          <Button variant="ghost" onClick={onSaveDraft} className="rounded-xl text-slate-600">
            <Save className="w-4 h-4 mr-1" />
            임시 저장
          </Button>
          <Button variant="limePrimary" onClick={onNext} className="rounded-xl">
            다음 단계
            <ChevronRight className="w-4 h-4 ml-1" />
          </Button>
        </div>
      </div>
    </div>
  )
}

// Step 5: 검토 및 확인
const ReviewStep: React.FC<StepProps & { onSubmit: () => void }> = ({ projectData, onBack, onSubmit, onSaveDraft }) => {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-bold text-slate-900 mb-1">검토 및 확인</h3>
        <p className="text-sm text-slate-500">입력한 정보를 확인하고 프로젝트를 생성하세요.</p>
      </div>

      <div className="space-y-4">
        <Card variant="glass">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-3">
              <div className="p-1.5 bg-lime-100 rounded-lg">
                <Info className="w-4 h-4 text-lime-600" />
              </div>
              <h4 className="font-semibold text-slate-900">기본 정보</h4>
            </div>
            <dl className="space-y-2 text-sm">
              <div className="flex justify-between">
                <dt className="text-slate-500">프로젝트명</dt>
                <dd className="font-medium text-slate-900">{projectData.name || '-'}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-slate-500">설명</dt>
                <dd className="font-medium text-slate-900 text-right max-w-xs truncate">{projectData.description || '-'}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-slate-500">공개 설정</dt>
                <dd>
                  <Badge className={cn(
                    "border-0",
                    projectData.visibility === 'public'
                      ? "bg-lime-100 text-lime-700"
                      : "bg-slate-100 text-slate-700"
                  )}>
                    {projectData.visibility === 'public' ? '회사 공개' : '비공개'}
                  </Badge>
                </dd>
              </div>
            </dl>
          </CardContent>
        </Card>

        <Card variant="glass">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-3">
              <div className="p-1.5 bg-violet-100 rounded-lg">
                <Calendar className="w-4 h-4 text-violet-600" />
              </div>
              <h4 className="font-semibold text-slate-900">일정</h4>
            </div>
            <dl className="space-y-2 text-sm">
              <div className="flex justify-between">
                <dt className="text-slate-500">시작일</dt>
                <dd className="font-medium text-slate-900">
                  {projectData.startDate ? new Date(projectData.startDate).toLocaleDateString('ko-KR') : '-'}
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-slate-500">종료일</dt>
                <dd className="font-medium text-slate-900">
                  {projectData.endDate ? new Date(projectData.endDate).toLocaleDateString('ko-KR') : '-'}
                </dd>
              </div>
            </dl>
          </CardContent>
        </Card>

        <Card variant="glass">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-3">
              <div className="p-1.5 bg-emerald-100 rounded-lg">
                <Users className="w-4 h-4 text-emerald-600" />
              </div>
              <h4 className="font-semibold text-slate-900">초대할 팀원</h4>
              <Badge className="bg-emerald-100 text-emerald-700 border-0 ml-auto">
                {projectData.inviteMembers?.length || 0}명
              </Badge>
            </div>
            <div className="text-sm">
              {projectData.inviteMembers && projectData.inviteMembers.length > 0 ? (
                <div className="space-y-1.5">
                  {projectData.inviteMembers.map((member) => {
                    const roleInfo = ROLES.find(r => r.value === member.role)
                    return (
                      <div key={member.userId || member.email} className="flex items-center justify-between py-1">
                        <div className="flex items-center gap-2">
                          {member.avatar ? (
                            <img src={member.avatar} alt={member.name} className="w-5 h-5 rounded-lg object-cover" />
                          ) : (
                            <div className="w-5 h-5 rounded-lg bg-slate-100 flex items-center justify-center">
                              <span className="text-xs font-medium text-slate-600">
                                {member.name[0].toUpperCase()}
                              </span>
                            </div>
                          )}
                          <span className="text-slate-600">{member.name}</span>
                        </div>
                        <Badge className="bg-slate-100 text-slate-600 border-0 text-xs">
                          {roleInfo?.label}
                        </Badge>
                      </div>
                    )
                  })}
                </div>
              ) : (
                <p className="text-slate-500">초대할 팀원이 없습니다</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex justify-between items-center pt-4">
        <Button variant="glass" onClick={onBack} className="rounded-xl">
          <ChevronLeft className="w-4 h-4 mr-1" />
          이전
        </Button>
        <div className="flex gap-2">
          <Button variant="ghost" onClick={onSaveDraft} className="rounded-xl text-slate-600">
            <Save className="w-4 h-4 mr-1" />
            임시 저장
          </Button>
          <Button variant="limePrimary" onClick={onSubmit} className="rounded-xl">
            <Sparkles className="w-4 h-4 mr-1" />
            프로젝트 생성
          </Button>
        </div>
      </div>
    </div>
  )
}

export default function ProjectCreateWizard({ isOpen, onClose, onSubmit }: ProjectCreateWizardProps) {
  const [currentStep, setCurrentStep] = useState(1)
  const [projectData, setProjectData] = useState<Partial<Project & { inviteMembers: InviteMember[] }>>({
    status: 'planning',
    progress: 0,
    team: [],
    inviteMembers: [],
    visibility: 'private'
  })

  const totalSteps = 5

  const handleSubmit = (status: Project['status'] = 'planning') => {
    const completeProject: Omit<Project, 'id' | 'createdAt' | 'updatedAt'> = {
      name: projectData.name || '제목 없는 프로젝트',
      description: projectData.description || '',
      status: status,
      progress: 0,
      startDate: projectData.startDate || new Date(),
      endDate: projectData.endDate || new Date(),
      budget: 0,
      team: projectData.team || [],
      clientId: projectData.clientId || '',
      priority: 'medium',
      createdBy: '',
      visibility: projectData.visibility || 'private',
      permissions: {
        viewerIds: [],
        editorIds: [],
        adminIds: []
      },
      // Pass invite members for post-creation invitation
      inviteMembers: projectData.inviteMembers
    } as any

    onSubmit(completeProject)

    // Reset
    setCurrentStep(1)
    setProjectData({
      status: 'planning',
      progress: 0,
      team: [],
      inviteMembers: [],
      visibility: 'private'
    })
  }

  const handleSaveDraft = () => {
    handleSubmit('draft' as any)
  }

  const handleClose = () => {
    onClose()
    setCurrentStep(1)
    setProjectData({
      status: 'planning',
      progress: 0,
      team: [],
      inviteMembers: [],
      visibility: 'private'
    })
  }

  if (!isOpen) return null

  const steps = [
    { id: 1, label: '템플릿' },
    { id: 2, label: '기본 정보' },
    { id: 3, label: '일정' },
    { id: 4, label: '팀 초대' },
    { id: 5, label: '확인' },
  ]

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-white/90 backdrop-blur-xl rounded-3xl w-full max-w-2xl max-h-[90vh] overflow-hidden shadow-2xl shadow-black/20 border border-white/40 flex flex-col"
      >
        {/* Header */}
        <div className="px-6 py-5 border-b border-slate-100 flex-shrink-0">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-slate-900">새 프로젝트 만들기</h2>
            <button
              onClick={handleClose}
              className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Step Indicators */}
          <div className="flex items-center justify-between">
            {steps.map((step, index) => (
              <React.Fragment key={step.id}>
                <div className="flex flex-col items-center">
                  <div className={cn(
                    "w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-all",
                    currentStep === step.id
                      ? "bg-lime-400 text-black"
                      : currentStep > step.id
                        ? "bg-lime-100 text-lime-700"
                        : "bg-slate-100 text-slate-400"
                  )}>
                    {currentStep > step.id ? <Check className="w-4 h-4" /> : step.id}
                  </div>
                  <span className={cn(
                    "text-xs mt-1 font-medium",
                    currentStep === step.id ? "text-lime-600" : "text-slate-400"
                  )}>
                    {step.label}
                  </span>
                </div>
                {index < steps.length - 1 && (
                  <div className={cn(
                    "flex-1 h-0.5 mx-2",
                    currentStep > step.id ? "bg-lime-400" : "bg-slate-200"
                  )} />
                )}
              </React.Fragment>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="px-6 py-6 overflow-y-auto flex-1">
          <AnimatePresence mode="wait">
            {currentStep === 1 && (
              <motion.div
                key="step1"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
              >
                <TemplateStep
                  projectData={projectData}
                  setProjectData={setProjectData}
                  onNext={() => setCurrentStep(2)}
                />
              </motion.div>
            )}

            {currentStep === 2 && (
              <motion.div
                key="step2"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
              >
                <BasicInfoStep
                  projectData={projectData}
                  setProjectData={setProjectData}
                  onNext={() => setCurrentStep(3)}
                  onBack={() => setCurrentStep(1)}
                  onSaveDraft={handleSaveDraft}
                />
              </motion.div>
            )}

            {currentStep === 3 && (
              <motion.div
                key="step3"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
              >
                <ScheduleStep
                  projectData={projectData}
                  setProjectData={setProjectData}
                  onNext={() => setCurrentStep(4)}
                  onBack={() => setCurrentStep(2)}
                  onSaveDraft={handleSaveDraft}
                />
              </motion.div>
            )}

            {currentStep === 4 && (
              <motion.div
                key="step4"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
              >
                <TeamInviteStep
                  projectData={projectData}
                  setProjectData={setProjectData}
                  onNext={() => setCurrentStep(5)}
                  onBack={() => setCurrentStep(3)}
                  onSaveDraft={handleSaveDraft}
                />
              </motion.div>
            )}

            {currentStep === 5 && (
              <motion.div
                key="step5"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
              >
                <ReviewStep
                  projectData={projectData}
                  setProjectData={setProjectData}
                  onNext={() => { }}
                  onBack={() => setCurrentStep(4)}
                  onSubmit={() => handleSubmit(projectData.status)}
                  onSaveDraft={handleSaveDraft}
                />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  )
}
