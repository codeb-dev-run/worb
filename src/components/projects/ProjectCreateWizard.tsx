'use client'

import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Project } from '@/types'
import { getCustomers, getTeamMembers } from '@/actions/user'

interface ProjectCreateWizardProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (project: Omit<Project, 'id' | 'createdAt' | 'updatedAt'>) => void
}

interface StepProps {
  projectData: Partial<Project>
  setProjectData: (data: Partial<Project>) => void
  onNext: () => void
  onBack?: () => void
}

// Step 1: 기본 정보
const BasicInfoStep: React.FC<StepProps> = ({ projectData, setProjectData, onNext }) => {
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [clients, setClients] = useState<Array<{
    id: string;
    displayName: string;
    email: string;
    group?: string;
    company?: string;
  }>>([])

  // Prisma에서 고객 목록 가져오기
  useEffect(() => {
    const loadCustomers = async () => {
      const customers = await getCustomers()
      setClients(customers.map(c => ({
        id: c.id,
        displayName: c.name || c.email || '',
        email: c.email || '',
        group: c.department || undefined,
        company: c.companyName || undefined
      })))
    }

    loadCustomers()
  }, [])

  const validate = () => {
    const newErrors: Record<string, string> = {}

    if (!projectData.name?.trim()) {
      newErrors.name = '프로젝트 이름을 입력해주세요'
    }

    if (!projectData.description?.trim()) {
      newErrors.description = '프로젝트 설명을 입력해주세요'
    }

    if (!projectData.clientId) {
      newErrors.clientId = '고객을 선택해주세요'
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
        <h3 className="text-lg font-semibold mb-2">기본 정보</h3>
        <p className="text-sm text-gray-600">프로젝트의 기본 정보를 입력해주세요.</p>
      </div>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            프로젝트 이름 *
          </label>
          <input
            type="text"
            value={projectData.name || ''}
            onChange={(e) => setProjectData({ ...projectData, name: e.target.value })}
            className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary ${errors.name ? 'border-red-500' : 'border-gray-300'
              }`}
            placeholder="예: 웹사이트 리뉴얼"
          />
          {errors.name && <p className="text-sm text-red-500 mt-1">{errors.name}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            프로젝트 설명 *
          </label>
          <textarea
            value={projectData.description || ''}
            onChange={(e) => setProjectData({ ...projectData, description: e.target.value })}
            className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary ${errors.description ? 'border-red-500' : 'border-gray-300'
              }`}
            rows={3}
            placeholder="프로젝트에 대한 간단한 설명을 입력하세요"
          />
          {errors.description && <p className="text-sm text-red-500 mt-1">{errors.description}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            고객 *
          </label>
          <select
            value={projectData.clientId || ''}
            onChange={(e) => {
              const selectedClient = clients.find(c => c.id === e.target.value)
              setProjectData({
                ...projectData,
                clientId: e.target.value
              })
            }}
            className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary ${errors.clientId ? 'border-red-500' : 'border-gray-300'
              }`}
          >
            <option value="">고객을 선택하세요</option>
            {clients.map(client => (
              <option key={client.id} value={client.id}>
                {client.displayName} ({client.email})
                {client.company && ` - ${client.company}`}
              </option>
            ))}
          </select>
          {errors.clientId && <p className="text-sm text-red-500 mt-1">{errors.clientId}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            프로젝트 상태
          </label>
          <select
            value={projectData.status || 'planning'}
            onChange={(e) => setProjectData({ ...projectData, status: e.target.value as Project['status'] })}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary"
          >
            <option value="planning">기획</option>
            <option value="design">디자인</option>
            <option value="development">개발</option>
            <option value="testing">테스트</option>
            <option value="completed">완료</option>
          </select>
        </div>
      </div>

      <div className="flex justify-end">
        <button
          onClick={handleNext}
          className="btn btn-primary"
        >
          다음 단계
        </button>
      </div>
    </div>
  )
}

// Step 2: 일정 및 예산
const ScheduleBudgetStep: React.FC<StepProps> = ({ projectData, setProjectData, onNext, onBack }) => {
  const [errors, setErrors] = useState<Record<string, string>>({})

  const validate = () => {
    const newErrors: Record<string, string> = {}

    if (!projectData.startDate) {
      newErrors.startDate = '시작일을 선택해주세요'
    }

    if (!projectData.endDate) {
      newErrors.endDate = '종료일을 선택해주세요'
    }

    if (projectData.startDate && projectData.endDate &&
      new Date(projectData.startDate) > new Date(projectData.endDate)) {
      newErrors.endDate = '종료일은 시작일 이후여야 합니다'
    }

    if (!projectData.budget || projectData.budget <= 0) {
      newErrors.budget = '예산을 입력해주세요'
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
        <h3 className="text-lg font-semibold mb-2">일정 및 예산</h3>
        <p className="text-sm text-gray-600">프로젝트 일정과 예산을 설정해주세요.</p>
      </div>

      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              시작일 *
            </label>
            <input
              type="date"
              value={projectData.startDate ? new Date(projectData.startDate).toISOString().split('T')[0] : ''}
              onChange={(e) => setProjectData({ ...projectData, startDate: new Date(e.target.value) })}
              className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary ${errors.startDate ? 'border-red-500' : 'border-gray-300'
                }`}
            />
            {errors.startDate && <p className="text-sm text-red-500 mt-1">{errors.startDate}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              종료일 *
            </label>
            <input
              type="date"
              value={projectData.endDate ? new Date(projectData.endDate).toISOString().split('T')[0] : ''}
              onChange={(e) => setProjectData({ ...projectData, endDate: new Date(e.target.value) })}
              className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary ${errors.endDate ? 'border-red-500' : 'border-gray-300'
                }`}
            />
            {errors.endDate && <p className="text-sm text-red-500 mt-1">{errors.endDate}</p>}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            예산 (원) *
          </label>
          <input
            type="number"
            value={projectData.budget || ''}
            onChange={(e) => setProjectData({ ...projectData, budget: parseInt(e.target.value) || 0 })}
            className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary ${errors.budget ? 'border-red-500' : 'border-gray-300'
              }`}
            placeholder="10000000"
          />
          {errors.budget && <p className="text-sm text-red-500 mt-1">{errors.budget}</p>}
          {projectData.budget && projectData.budget > 0 && (
            <p className="text-sm text-gray-600 mt-1">
              {new Intl.NumberFormat('ko-KR', { style: 'currency', currency: 'KRW' }).format(projectData.budget)}
            </p>
          )}
        </div>
      </div>

      <div className="flex justify-between">
        <button
          onClick={onBack}
          className="btn btn-secondary"
        >
          이전
        </button>
        <button
          onClick={handleNext}
          className="btn btn-primary"
        >
          다음 단계
        </button>
      </div>
    </div>
  )
}

// Step 3: 팀 구성
const TeamStep: React.FC<StepProps> = ({ projectData, setProjectData, onNext, onBack }) => {
  const [teamMemberInput, setTeamMemberInput] = useState('')
  const [availableMembers, setAvailableMembers] = useState<Array<{ id: string; displayName: string; email: string; role: string }>>([])

  // Prisma에서 팀원 가능한 사용자 목록 가져오기
  useEffect(() => {
    const loadTeamMembers = async () => {
      const members = await getTeamMembers()
      setAvailableMembers(members.map(m => ({
        id: m.id,
        displayName: m.name || m.email || '',
        email: m.email || '',
        role: m.role || ''
      })))
    }

    loadTeamMembers()
  }, [])

  const addTeamMember = (member: string) => {
    if (!projectData.team?.some((m: any) => m.userId === member)) {
      setProjectData({
        ...projectData,
        team: [...(projectData.team || []), {
          userId: member,
          name: member,
          role: 'Developer',
          joinedAt: new Date()
        }]
      })
    }
  }

  const removeTeamMember = (member: string) => {
    setProjectData({
      ...projectData,
      team: projectData.team?.filter((m: any) => m.userId !== member) || []
    })
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-2">팀 구성</h3>
        <p className="text-sm text-gray-600">프로젝트에 참여할 팀원을 선택해주세요.</p>
      </div>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            사용 가능한 팀원
          </label>
          <div className="grid grid-cols-2 gap-2 max-h-60 overflow-y-auto">
            {availableMembers.map((member) => (
              <button
                key={member.id}
                onClick={() => addTeamMember(member.email)}
                disabled={projectData.team?.some((m: any) => m.userId === member.email)}
                className={`p-3 text-sm border rounded-lg transition-colors ${projectData.team?.some((m: any) => m.userId === member.email)
                  ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                  : 'hover:bg-gray-50 text-gray-700 border-gray-300'
                  }`}
              >
                <div className="text-left">
                  <div className="font-medium">{member.displayName}</div>
                  <div className="text-xs text-gray-500">{member.email}</div>
                  <div className="text-xs text-gray-400 mt-1">
                    {member.role === 'admin' ? '관리자' :
                      member.role === 'developer' ? '개발자' : '매니저'}
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            직접 추가
          </label>
          <div className="flex gap-2">
            <input
              type="email"
              value={teamMemberInput}
              onChange={(e) => setTeamMemberInput(e.target.value)}
              onKeyPress={(e) => {
                if (e.key === 'Enter' && teamMemberInput) {
                  addTeamMember(teamMemberInput)
                  setTeamMemberInput('')
                }
              }}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary"
              placeholder="이메일 주소"
            />
            <button
              onClick={() => {
                if (teamMemberInput) {
                  addTeamMember(teamMemberInput)
                  setTeamMemberInput('')
                }
              }}
              className="btn btn-secondary"
            >
              추가
            </button>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            선택된 팀원 ({projectData.team?.length || 0}명)
          </label>
          <div className="space-y-2 max-h-40 overflow-y-auto">
            {projectData.team?.map((member) => (
              <div
                key={String(member.userId || member)}
                className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
              >
                <span className="text-sm">{String(member.name || member)}</span>
                <button
                  onClick={() => removeTeamMember(String(member.userId || member))}
                  className="text-red-500 hover:text-red-700"
                >
                  삭제
                </button>
              </div>
            ))}
            {(!projectData.team || projectData.team.length === 0) && (
              <p className="text-sm text-gray-500 text-center py-4">
                선택된 팀원이 없습니다
              </p>
            )}
          </div>
        </div>
      </div>

      <div className="flex justify-between">
        <button
          onClick={onBack}
          className="btn btn-secondary"
        >
          이전
        </button>
        <button
          onClick={onNext}
          className="btn btn-primary"
        >
          다음 단계
        </button>
      </div>
    </div>
  )
}

// Step 4: 검토 및 확인
const ReviewStep: React.FC<StepProps & { onSubmit: () => void }> = ({ projectData, onBack, onSubmit }) => {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-2">검토 및 확인</h3>
        <p className="text-sm text-gray-600">입력한 정보를 확인하고 프로젝트를 생성하세요.</p>
      </div>

      <div className="space-y-4">
        <div className="bg-gray-50 rounded-lg p-4 space-y-3">
          <h4 className="font-medium text-gray-900">기본 정보</h4>
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between">
              <dt className="text-gray-600">프로젝트명:</dt>
              <dd className="font-medium">{projectData.name}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-gray-600">설명:</dt>
              <dd className="font-medium text-right max-w-xs">{projectData.description}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-gray-600">상태:</dt>
              <dd className="font-medium">{projectData.status}</dd>
            </div>
          </dl>
        </div>

        <div className="bg-gray-50 rounded-lg p-4 space-y-3">
          <h4 className="font-medium text-gray-900">일정 및 예산</h4>
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between">
              <dt className="text-gray-600">시작일:</dt>
              <dd className="font-medium">
                {projectData.startDate ? new Date(projectData.startDate).toLocaleDateString('ko-KR') : '-'}
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-gray-600">종료일:</dt>
              <dd className="font-medium">
                {projectData.endDate ? new Date(projectData.endDate).toLocaleDateString('ko-KR') : '-'}
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-gray-600">예산:</dt>
              <dd className="font-medium">
                {projectData.budget ? new Intl.NumberFormat('ko-KR', { style: 'currency', currency: 'KRW' }).format(projectData.budget) : '-'}
              </dd>
            </div>
          </dl>
        </div>

        <div className="bg-gray-50 rounded-lg p-4 space-y-3">
          <h4 className="font-medium text-gray-900">팀 구성</h4>
          <div className="text-sm">
            {projectData.team && projectData.team.length > 0 ? (
              <div className="space-y-1">
                {projectData.team.map((member, idx) => (
                  <div key={idx} className="text-gray-600">• {String(member.name || member)}</div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500">팀원이 지정되지 않았습니다</p>
            )}
          </div>
        </div>
      </div>

      <div className="flex justify-between">
        <button
          onClick={onBack}
          className="btn btn-secondary"
        >
          이전
        </button>
        <button
          onClick={onSubmit}
          className="btn btn-primary"
        >
          프로젝트 생성
        </button>
      </div>
    </div>
  )
}

export default function ProjectCreateWizard({ isOpen, onClose, onSubmit }: ProjectCreateWizardProps) {
  const [currentStep, setCurrentStep] = useState(1)
  const [projectData, setProjectData] = useState<Partial<Project>>({
    status: 'planning',
    progress: 0,
    team: []
  })

  const totalSteps = 4

  const handleSubmit = () => {
    const completeProject: Omit<Project, 'id' | 'createdAt' | 'updatedAt'> = {
      name: projectData.name!,
      description: projectData.description!,
      status: projectData.status!,
      progress: 0,
      startDate: projectData.startDate!,
      endDate: projectData.endDate!,
      budget: projectData.budget!,
      team: projectData.team || [],
      clientId: projectData.clientId!,
      priority: 'medium',
      createdBy: '',
      visibility: 'private',
      permissions: {
        viewerIds: [],
        editorIds: [],
        adminIds: []
      }
    }

    onSubmit(completeProject)

    // Reset
    setCurrentStep(1)
    setProjectData({
      status: 'planning',
      progress: 0,
      team: []
    })
  }

  const handleClose = () => {
    onClose()
    setCurrentStep(1)
    setProjectData({
      status: 'planning',
      progress: 0,
      team: []
    })
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.9 }}
        className="bg-white rounded-xl w-full max-w-2xl max-h-[90vh] overflow-hidden shadow-xl"
      >
        {/* Header */}
        <div className="px-6 py-4 border-b">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-gray-900">새 프로젝트 만들기</h2>
            <button
              onClick={handleClose}
              className="text-gray-400 hover:text-gray-600"
            >
              ✕
            </button>
          </div>

          {/* Progress Bar */}
          <div className="mt-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-600">
                {currentStep}단계 / {totalSteps}단계
              </span>
              <span className="text-sm text-gray-600">
                {Math.round((currentStep / totalSteps) * 100)}% 완료
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-primary h-2 rounded-full transition-all duration-300"
                style={{ width: `${(currentStep / totalSteps) * 100}%` }}
              />
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="px-6 py-6 overflow-y-auto max-h-[calc(90vh-180px)]">
          <AnimatePresence mode="wait">
            {currentStep === 1 && (
              <motion.div
                key="step1"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
              >
                <BasicInfoStep
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
                <ScheduleBudgetStep
                  projectData={projectData}
                  setProjectData={setProjectData}
                  onNext={() => setCurrentStep(3)}
                  onBack={() => setCurrentStep(1)}
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
                <TeamStep
                  projectData={projectData}
                  setProjectData={setProjectData}
                  onNext={() => setCurrentStep(4)}
                  onBack={() => setCurrentStep(2)}
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
                <ReviewStep
                  projectData={projectData}
                  setProjectData={setProjectData}
                  onNext={() => { }}
                  onBack={() => setCurrentStep(3)}
                  onSubmit={handleSubmit}
                />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  )
}