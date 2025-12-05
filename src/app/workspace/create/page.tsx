'use client'

// ===========================================
// Glass Morphism Workspace Create Page
// 워크스페이스 타입 선택 기능 포함
// ===========================================

import React, { useState, useEffect, Suspense } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useWorkspace } from '@/lib/workspace-context'
import { useRouter, useSearchParams } from 'next/navigation'
import { SessionProvider, useSession } from 'next-auth/react'
import {
  Plus,
  Link as LinkIcon,
  Building2,
  ArrowRight,
  ArrowLeft,
  Loader2,
  Briefcase,
  Users,
  FolderKanban,
  Check,
  Clock,
  DollarSign,
  BarChart3,
  Calendar,
  FileText
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { toast } from 'react-hot-toast'

type WorkspaceType = 'ENTERPRISE' | 'HR_ONLY' | 'PROJECT_ONLY'

interface WorkspaceTypeOption {
  type: WorkspaceType
  title: string
  subtitle: string
  description: string
  icon: React.ReactNode
  color: string
  bgColor: string
  features: string[]
}

const workspaceTypes: WorkspaceTypeOption[] = [
  {
    type: 'ENTERPRISE',
    title: '기업용 풀패키지',
    subtitle: 'Enterprise',
    description: '프로젝트 관리 + HR + 급여 + 재무 모든 기능',
    icon: <Building2 className="w-7 h-7" />,
    color: 'text-blue-600',
    bgColor: 'bg-blue-100',
    features: ['프로젝트 관리', '칸반/간트', '근태관리', '급여관리', '재무관리', '조직도']
  },
  {
    type: 'HR_ONLY',
    title: '소상공인용',
    subtitle: 'HR Only',
    description: '근태관리 + 급여관리 핵심 기능만',
    icon: <Users className="w-7 h-7" />,
    color: 'text-emerald-600',
    bgColor: 'bg-emerald-100',
    features: ['근태관리', '급여관리', '휴가관리', '조직관리']
  },
  {
    type: 'PROJECT_ONLY',
    title: '프리랜서/에이전시용',
    subtitle: 'Project Only',
    description: '프로젝트 관리 + 협업 기능 중심',
    icon: <FolderKanban className="w-7 h-7" />,
    color: 'text-violet-600',
    bgColor: 'bg-violet-100',
    features: ['프로젝트 관리', '칸반보드', '간트차트', '파일관리', '팀 협업']
  }
]

// Feature icons mapping
const featureIcons: Record<string, React.ReactNode> = {
  '프로젝트 관리': <Briefcase className="w-3.5 h-3.5" />,
  '칸반/간트': <BarChart3 className="w-3.5 h-3.5" />,
  '칸반보드': <BarChart3 className="w-3.5 h-3.5" />,
  '간트차트': <BarChart3 className="w-3.5 h-3.5" />,
  '근태관리': <Clock className="w-3.5 h-3.5" />,
  '급여관리': <DollarSign className="w-3.5 h-3.5" />,
  '재무관리': <DollarSign className="w-3.5 h-3.5" />,
  '조직도': <Users className="w-3.5 h-3.5" />,
  '조직관리': <Users className="w-3.5 h-3.5" />,
  '휴가관리': <Calendar className="w-3.5 h-3.5" />,
  '파일관리': <FileText className="w-3.5 h-3.5" />,
  '팀 협업': <Users className="w-3.5 h-3.5" />,
}

// Separate component that uses useSearchParams
function WorkspaceCreateContent() {
  const { createWorkspace, refreshWorkspaces } = useWorkspace()
  const router = useRouter()
  const searchParams = useSearchParams()
  const { data: session, status } = useSession()
  const [mode, setMode] = useState<'select' | 'type' | 'create' | 'join'>('select')
  const [selectedType, setSelectedType] = useState<WorkspaceType>('ENTERPRISE')
  const [companyName, setCompanyName] = useState('')
  const [domain, setDomain] = useState('')
  const [inviteCode, setInviteCode] = useState('')
  const [loading, setLoading] = useState(false)

  // 로그인 안된 사용자는 로그인 페이지로 리다이렉트
  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login?redirect=/workspace/create')
    }
  }, [status, router])

  useEffect(() => {
    const code = searchParams?.get('code')
    if (code) {
      setInviteCode(code)
      setMode('join')
    }
  }, [searchParams])

  // 세션 로딩 중이거나 인증 안됨
  if (status === 'loading' || status === 'unauthenticated') {
    return <WorkspaceCreateLoading />
  }

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!companyName.trim() || !domain.trim()) return

    setLoading(true)
    try {
      // API 호출로 워크스페이스 생성 (타입 포함)
      const response = await fetch('/api/workspaces', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: companyName,
          domain: domain,
          type: selectedType
        })
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || '워크스페이스 생성 실패')
      }

      const workspace = await response.json()

      // 워크스페이스 목록 새로고침
      await refreshWorkspaces()

      // localStorage에 현재 워크스페이스 ID 저장
      localStorage.setItem('currentWorkspaceId', workspace.id)

      toast.success('회사가 생성되었습니다!')
      router.push('/dashboard')
    } catch (error: any) {
      console.error('Failed to create workspace:', error)
      toast.error(error.message || '회사 생성에 실패했습니다.')
    } finally {
      setLoading(false)
    }
  }

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!inviteCode.trim()) return

    setLoading(true)
    try {
      // 초대 코드로 워크스페이스 참여
      const response = await fetch(`/api/invitations/accept`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: inviteCode })
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || '참여 실패')
      }

      await refreshWorkspaces()
      toast.success('워크스페이스에 참여했습니다!')
      router.push('/dashboard')
    } catch (error: any) {
      console.error('Failed to join workspace:', error)
      toast.error(error.message || '회사 참여에 실패했습니다.')
    } finally {
      setLoading(false)
    }
  }

  const getStepIndicator = () => {
    if (mode === 'select') return null
    if (mode === 'join') return null

    const steps = ['타입 선택', '정보 입력']
    const currentStep = mode === 'type' ? 0 : 1

    return (
      <div className="flex items-center justify-center gap-2 mb-6">
        {steps.map((step, index) => (
          <React.Fragment key={step}>
            <div className={`flex items-center gap-2 ${index <= currentStep ? 'text-lime-600' : 'text-slate-300'}`}>
              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium
                ${index < currentStep ? 'bg-lime-500 text-white' :
                  index === currentStep ? 'bg-lime-100 text-lime-600 border-2 border-lime-500' :
                  'bg-slate-100 text-slate-400'}`}>
                {index < currentStep ? <Check className="w-3.5 h-3.5" /> : index + 1}
              </div>
              <span className="text-sm font-medium hidden sm:inline">{step}</span>
            </div>
            {index < steps.length - 1 && (
              <div className={`w-8 h-0.5 ${index < currentStep ? 'bg-lime-500' : 'bg-slate-200'}`} />
            )}
          </React.Fragment>
        ))}
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className={`w-full ${mode === 'type' ? 'max-w-2xl' : 'max-w-md'}`}
      >
        <Card variant="glass" className="shadow-2xl shadow-black/10">
          <CardContent className="p-8">
            {/* 단계 표시 */}
            {getStepIndicator()}

            {/* 헤더 */}
            <AnimatePresence mode="wait">
              <motion.div
                key={mode}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="text-center mb-8"
              >
                <div className={`w-16 h-16 mx-auto mb-4 rounded-2xl flex items-center justify-center
                  ${mode === 'type' ? workspaceTypes.find(t => t.type === selectedType)?.bgColor || 'bg-lime-100' : 'bg-lime-100'}`}>
                  {mode === 'select' && <Building2 className="w-8 h-8 text-lime-600" />}
                  {mode === 'type' && <Briefcase className="w-8 h-8 text-blue-600" />}
                  {mode === 'create' && (
                    <span className={workspaceTypes.find(t => t.type === selectedType)?.color}>
                      {workspaceTypes.find(t => t.type === selectedType)?.icon}
                    </span>
                  )}
                  {mode === 'join' && <LinkIcon className="w-8 h-8 text-emerald-600" />}
                </div>
                <h1 className="text-2xl font-bold text-slate-900 mb-2">
                  {mode === 'select' && '회사 설정하기'}
                  {mode === 'type' && '워크스페이스 타입 선택'}
                  {mode === 'create' && '회사 정보 입력'}
                  {mode === 'join' && '회사 참여하기'}
                </h1>
                <p className="text-slate-500 text-sm">
                  {mode === 'select' && (
                    <>신규 회사 계정을 만들거나<br />이미 생성된 회사 계정에 직원으로 참여할 수 있어요.</>
                  )}
                  {mode === 'type' && '비즈니스에 맞는 워크스페이스 타입을 선택하세요.'}
                  {mode === 'create' && `${workspaceTypes.find(t => t.type === selectedType)?.title} 워크스페이스를 생성합니다.`}
                  {mode === 'join' && '초대 코드를 입력하여 기존 회사에 참여합니다.'}
                </p>
              </motion.div>
            </AnimatePresence>

            {/* 모드 선택 */}
            {mode === 'select' && (
              <div className="space-y-3">
                <button
                  onClick={() => setMode('type')}
                  className="w-full p-4 bg-white/60 border border-white/40 rounded-2xl hover:bg-white/80 hover:shadow-lg hover:-translate-y-0.5 transition-all flex items-center gap-4 group text-left"
                >
                  <div className="w-12 h-12 bg-lime-100 rounded-xl flex items-center justify-center text-lime-600 group-hover:scale-110 transition-transform">
                    <Plus className="w-6 h-6" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-slate-900">새 회사 만들기</h3>
                    <p className="text-sm text-slate-500">새로운 워크스페이스를 생성합니다</p>
                  </div>
                  <ArrowRight className="w-5 h-5 text-slate-300 group-hover:text-lime-600 transition-colors" />
                </button>

                <button
                  onClick={() => setMode('join')}
                  className="w-full p-4 bg-white/60 border border-white/40 rounded-2xl hover:bg-white/80 hover:shadow-lg hover:-translate-y-0.5 transition-all flex items-center gap-4 group text-left"
                >
                  <div className="w-12 h-12 bg-emerald-100 rounded-xl flex items-center justify-center text-emerald-600 group-hover:scale-110 transition-transform">
                    <LinkIcon className="w-6 h-6" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-slate-900">기존 회사 참여하기</h3>
                    <p className="text-sm text-slate-500">초대 코드로 참여합니다</p>
                  </div>
                  <ArrowRight className="w-5 h-5 text-slate-300 group-hover:text-emerald-600 transition-colors" />
                </button>
              </div>
            )}

            {/* 워크스페이스 타입 선택 */}
            {mode === 'type' && (
              <div className="space-y-4">
                <div className="grid gap-3">
                  {workspaceTypes.map((option) => (
                    <button
                      key={option.type}
                      onClick={() => setSelectedType(option.type)}
                      className={`w-full p-4 rounded-2xl border-2 transition-all text-left
                        ${selectedType === option.type
                          ? `border-lime-500 bg-lime-50/50 shadow-lg`
                          : 'border-white/40 bg-white/60 hover:bg-white/80 hover:border-slate-200'
                        }`}
                    >
                      <div className="flex items-start gap-4">
                        <div className={`w-12 h-12 ${option.bgColor} rounded-xl flex items-center justify-center ${option.color} shrink-0`}>
                          {option.icon}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-semibold text-slate-900">{option.title}</h3>
                            <span className="text-xs px-2 py-0.5 bg-slate-100 text-slate-500 rounded-full">
                              {option.subtitle}
                            </span>
                          </div>
                          <p className="text-sm text-slate-500 mb-3">{option.description}</p>
                          <div className="flex flex-wrap gap-1.5">
                            {option.features.map((feature) => (
                              <span
                                key={feature}
                                className={`inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full
                                  ${selectedType === option.type
                                    ? 'bg-lime-100 text-lime-700'
                                    : 'bg-slate-100 text-slate-600'
                                  }`}
                              >
                                {featureIcons[feature]}
                                {feature}
                              </span>
                            ))}
                          </div>
                        </div>
                        <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0
                          ${selectedType === option.type
                            ? 'border-lime-500 bg-lime-500'
                            : 'border-slate-300'
                          }`}
                        >
                          {selectedType === option.type && (
                            <Check className="w-3 h-3 text-white" />
                          )}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>

                <div className="flex gap-2 pt-4">
                  <Button
                    type="button"
                    variant="glass"
                    className="flex-1 rounded-xl"
                    onClick={() => setMode('select')}
                  >
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    이전
                  </Button>
                  <Button
                    type="button"
                    variant="limePrimary"
                    className="flex-1 rounded-xl"
                    onClick={() => setMode('create')}
                  >
                    다음
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </div>
              </div>
            )}

            {/* 회사 만들기 폼 */}
            {mode === 'create' && (
              <form onSubmit={handleCreate} className="space-y-5">
                {/* 선택된 타입 표시 */}
                <div className={`p-3 rounded-xl ${workspaceTypes.find(t => t.type === selectedType)?.bgColor} bg-opacity-50`}>
                  <div className="flex items-center gap-2">
                    <span className={workspaceTypes.find(t => t.type === selectedType)?.color}>
                      {workspaceTypes.find(t => t.type === selectedType)?.icon}
                    </span>
                    <div>
                      <p className="text-sm font-medium text-slate-700">
                        {workspaceTypes.find(t => t.type === selectedType)?.title}
                      </p>
                      <p className="text-xs text-slate-500">
                        {workspaceTypes.find(t => t.type === selectedType)?.description}
                      </p>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    회사 이름
                  </label>
                  <Input
                    type="text"
                    value={companyName}
                    onChange={(e) => {
                      setCompanyName(e.target.value)
                      const slug = e.target.value.toLowerCase().replace(/[^a-z0-9]/g, '')
                      setDomain(slug)
                    }}
                    placeholder="예: (주)코드비"
                    autoFocus
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    도메인 (URL)
                  </label>
                  <div className="flex items-center gap-2">
                    <span className="text-slate-500 text-sm whitespace-nowrap">workb.net/</span>
                    <Input
                      type="text"
                      value={domain}
                      onChange={(e) => setDomain(e.target.value)}
                      placeholder="company-name"
                    />
                  </div>
                  <p className="text-xs text-slate-500 mt-2">영문 소문자와 숫자만 사용 가능합니다.</p>
                </div>
                <div className="flex gap-2 pt-2">
                  <Button
                    type="button"
                    variant="glass"
                    className="flex-1 rounded-xl"
                    onClick={() => setMode('type')}
                  >
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    이전
                  </Button>
                  <Button
                    type="submit"
                    variant="limePrimary"
                    className="flex-1 rounded-xl"
                    disabled={!companyName.trim() || !domain.trim() || loading}
                  >
                    {loading ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        생성 중...
                      </>
                    ) : (
                      '회사 만들기'
                    )}
                  </Button>
                </div>
              </form>
            )}

            {/* 참여하기 폼 */}
            {mode === 'join' && (
              <form onSubmit={handleJoin} className="space-y-5">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    초대 코드
                  </label>
                  <Input
                    type="text"
                    value={inviteCode}
                    onChange={(e) => setInviteCode(e.target.value)}
                    placeholder="초대 코드를 입력하세요"
                    autoFocus
                  />
                </div>
                <div className="flex gap-2 pt-2">
                  <Button
                    type="button"
                    variant="glass"
                    className="flex-1 rounded-xl"
                    onClick={() => setMode('select')}
                  >
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    이전
                  </Button>
                  <Button
                    type="submit"
                    variant="limePrimary"
                    className="flex-1 rounded-xl"
                    disabled={!inviteCode.trim() || loading}
                  >
                    {loading ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        확인 중...
                      </>
                    ) : (
                      '참여하기'
                    )}
                  </Button>
                </div>
              </form>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </div>
  )
}

// Loading fallback for Suspense
function WorkspaceCreateLoading() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 p-4">
      <div className="w-full max-w-md">
        <Card variant="glass" className="shadow-2xl shadow-black/10">
          <CardContent className="p-8">
            <div className="text-center">
              <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-lime-100 flex items-center justify-center">
                <Loader2 className="w-8 h-8 text-lime-600 animate-spin" />
              </div>
              <h1 className="text-2xl font-bold text-slate-900 mb-2">로딩 중...</h1>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

// Main page component with Suspense boundary
export default function WorkspaceCreatePage() {
  return (
    <SessionProvider>
      <Suspense fallback={<WorkspaceCreateLoading />}>
        <WorkspaceCreateContent />
      </Suspense>
    </SessionProvider>
  )
}
