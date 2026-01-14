'use client'

const isDev = process.env.NODE_ENV === 'development'

import React, { useState, useEffect, useMemo } from 'react'
import { motion } from 'framer-motion'
import Link from 'next/link'
import { useAuth } from '@/lib/auth-context'
import { useWorkspace } from '@/lib/workspace-context'
import { Project } from '@/types'
import ProjectCreateWizard from '@/components/projects/ProjectCreateWizard'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input, SearchInput } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { cn } from '@/lib/utils'
import { Search, LayoutGrid, LayoutList, Plus, Calendar, Filter, ChevronRight, Users, FolderOpen, BarChart3, TrendingUp, Star } from 'lucide-react'
import { Progress } from '@/components/ui/progress'
import { getProjects, createProject } from '@/actions/project'
import { toast } from 'react-hot-toast'
import { useNavigation } from '@/hooks/useNavigation'

// ===========================================
// Glass Morphism Projects Page
// ===========================================

const statusLabels: Record<Project['status'], string> = {
  planning: '기획',
  design: '디자인',
  development: '개발',
  testing: '테스트',
  completed: '완료',
  pending: '대기'
}

const statusVariants: Record<Project['status'], 'default' | 'secondary' | 'outline' | 'destructive'> = {
  planning: 'outline',
  design: 'secondary',
  development: 'default',
  testing: 'secondary',
  completed: 'default',
  pending: 'outline'
}

// 데드라인 상태 계산 헬퍼 함수
type DeadlineStatus = 'overdue' | 'urgent' | 'warning' | 'normal' | 'completed'

function getDeadlineStatus(project: Project): DeadlineStatus {
  // 완료된 프로젝트는 항상 completed
  if (project.status === 'completed') return 'completed'

  // 마감일이 없으면 normal
  if (!project.endDate) return 'normal'

  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const deadline = new Date(project.endDate)
  deadline.setHours(0, 0, 0, 0)

  const diffDays = Math.ceil((deadline.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))

  // 진행률이 낮은데 데드라인이 가까우면 더 긴급
  const progressFactor = project.progress < 50 ? 0 : project.progress < 80 ? 1 : 2
  const adjustedDays = diffDays + progressFactor * 2

  if (diffDays < 0) return 'overdue'        // 마감 지남
  if (adjustedDays <= 3) return 'urgent'    // 3일 이내 (진행률 고려)
  if (adjustedDays <= 7) return 'warning'   // 7일 이내 (진행률 고려)
  return 'normal'
}

// 데드라인 상태별 스타일
const deadlineStyles: Record<DeadlineStatus, { progress: string; text: string; bg: string; border: string }> = {
  overdue: {
    progress: 'bg-red-500',
    text: 'text-red-600',
    bg: 'bg-red-50',
    border: 'border-red-200 ring-2 ring-red-100'
  },
  urgent: {
    progress: 'bg-orange-500',
    text: 'text-orange-600',
    bg: 'bg-orange-50',
    border: 'border-orange-200'
  },
  warning: {
    progress: 'bg-amber-500',
    text: 'text-amber-600',
    bg: 'bg-amber-50',
    border: 'border-amber-200'
  },
  normal: {
    progress: 'bg-lime-500',
    text: 'text-slate-600',
    bg: 'bg-white/70',
    border: 'border-white/40'
  },
  completed: {
    progress: 'bg-emerald-500',
    text: 'text-emerald-600',
    bg: 'bg-emerald-50/50',
    border: 'border-emerald-200'
  }
}

export default function ProjectsPage() {
  const { user, userProfile } = useAuth()
  const { currentWorkspace } = useWorkspace()
  const router = useRouter()
  const { toggleFavorite, isFavorite } = useNavigation()
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedTab, setSelectedTab] = useState<'all' | 'active' | 'completed'>('all')
  const [viewMode, setViewMode] = useState<'table' | 'grid'>('table')
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [filterStatus, setFilterStatus] = useState<Project['status'] | 'all'>('all')
  const [searchTerm, setSearchTerm] = useState('')
  const [sortBy, setSortBy] = useState<'name' | 'date' | 'progress'>('progress')
  const [showMyProjectsOnly, setShowMyProjectsOnly] = useState(false)

  // 프로젝트 데이터 로드
  useEffect(() => {
    if (!user || !currentWorkspace) return

    const loadProjects = async () => {
      setLoading(true)
      try {
        const data = await getProjects(user.uid, currentWorkspace.id)
        setProjects(data as unknown as Project[])
      } catch (error) {
        if (isDev) console.error('Failed to load projects:', error)
        toast.error('프로젝트 목록을 불러오는데 실패했습니다.')
      } finally {
        setLoading(false)
      }
    }

    loadProjects()
  }, [user, currentWorkspace])

  // 프로젝트 필터링 및 검색
  const filteredProjects = useMemo(() => {
    let filtered = projects

    // 내 프로젝트만 필터링
    if (showMyProjectsOnly && user) {
      filtered = filtered.filter(project => {
        // createdBy가 내 ID인 경우
        if (project.createdBy === user.uid) return true
        // team 배열에 내가 포함된 경우
        if (project.team?.some(member =>
          member.userId === user.uid
        )) return true
        return false
      })
    }

    // 탭 필터링
    if (selectedTab === 'active') {
      filtered = filtered.filter(project => project.status !== 'completed')
    } else if (selectedTab === 'completed') {
      filtered = filtered.filter(project => project.status === 'completed')
    }

    // 상태 필터링
    if (filterStatus !== 'all') {
      filtered = filtered.filter(project => project.status === filterStatus)
    }

    // 검색어 필터링
    if (searchTerm) {
      filtered = filtered.filter(project =>
        project.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        project.description.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }

    // 정렬
    filtered.sort((a, b) => {
      if (sortBy === 'name') {
        return a.name.localeCompare(b.name)
      } else if (sortBy === 'progress') {
        // 진행률순: 촉박한 프로젝트(진행률 낮고 데드라인 가까운)가 먼저
        const statusA = getDeadlineStatus(a)
        const statusB = getDeadlineStatus(b)
        const priorityOrder: Record<DeadlineStatus, number> = {
          overdue: 0,
          urgent: 1,
          warning: 2,
          normal: 3,
          completed: 4
        }
        const priorityDiff = priorityOrder[statusA] - priorityOrder[statusB]
        if (priorityDiff !== 0) return priorityDiff
        // 같은 우선순위면 진행률 오름차순 (낮은 진행률 먼저)
        return a.progress - b.progress
      } else {
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      }
    })

    return filtered
  }, [projects, selectedTab, filterStatus, searchTerm, sortBy, showMyProjectsOnly, user])

  // 프로젝트 생성 핸들러
  const handleCreateProject = async (projectData: Omit<Project, 'id' | 'createdAt' | 'updatedAt'> & { inviteMembers?: Array<{ email: string; role: string }> }) => {
    if (!user || !currentWorkspace) {
      if (isDev) console.error('Missing context:', { user: !!user, workspace: !!currentWorkspace })
      toast.error('사용자 또는 워크스페이스 정보를 찾을 수 없습니다. 페이지를 새로고침 해주세요.')
      return
    }

    try {
      const result = await createProject({
        name: projectData.name,
        description: projectData.description,
        startDate: projectData.startDate,
        endDate: projectData.endDate,
        budget: projectData.budget,
        status: projectData.status,
        visibility: projectData.visibility,
        priority: projectData.priority,
        createdBy: user.uid,
        workspaceId: currentWorkspace.id,
        inviteMembers: projectData.inviteMembers
      })

      if (result.success && result.project) {
        const inviteCount = projectData.inviteMembers?.length || 0
        if (inviteCount > 0) {
          toast.success(`프로젝트가 생성되었습니다. ${inviteCount}명에게 초대 이메일을 발송했습니다.`)
        } else {
          toast.success('프로젝트가 생성되었습니다.')
        }
        setShowCreateModal(false)

        // 목록 새로고침
        const data = await getProjects(user.uid, currentWorkspace.id)
        setProjects(data as unknown as Project[])

        router.push(`/projects/${result.project.id}`)
      } else {
        throw new Error('Project creation failed')
      }
    } catch (error) {
      if (isDev) console.error('Error creating project:', error)
      toast.error('프로젝트 생성 중 오류가 발생했습니다.')
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-lime-400"></div>
      </div>
    )
  }

  return (
    <div className="w-full max-w-[1920px] mx-auto px-6 py-6 space-y-6">
      {/* 헤더 - Glass Style */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">프로젝트 관리</h1>
          <p className="text-slate-500 mt-1">전체 프로젝트를 관리하고 진행 상황을 확인합니다.</p>
        </div>

        <Button variant="limePrimary" onClick={() => setShowCreateModal(true)}>
          <Plus className="mr-2 h-4 w-4" />
          새 프로젝트
        </Button>
      </div>

      {/* 필터 및 검색 - shadcn/ui */}
      <div className="space-y-4">
        {/* 첫 번째 줄: 탭 필터와 검색 */}
        <div className="flex items-center gap-4">
          {/* 탭 필터 */}
          <Tabs value={selectedTab} onValueChange={(v) => setSelectedTab(v as any)}>
            <TabsList>
              <TabsTrigger value="all">전체 ({projects.length})</TabsTrigger>
              <TabsTrigger value="active">진행 중 ({projects.filter(p => p.status !== 'completed').length})</TabsTrigger>
              <TabsTrigger value="completed">완료 ({projects.filter(p => p.status === 'completed').length})</TabsTrigger>
            </TabsList>
          </Tabs>

          {/* 검색 - Glass Style */}
          <div className="flex-1">
            <SearchInput
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="프로젝트 검색..."
            />
          </div>

          {/* 뷰 모드 전환 - Glass Style */}
          <div className="flex gap-1 bg-white/60 backdrop-blur-sm rounded-xl p-1 border border-white/40">
            <Button
              variant={viewMode === 'table' ? 'limeSecondary' : 'ghost'}
              size="icon"
              className="h-8 w-8 rounded-lg"
              onClick={() => setViewMode('table')}
            >
              <LayoutList className="h-4 w-4" />
            </Button>
            <Button
              variant={viewMode === 'grid' ? 'limeSecondary' : 'ghost'}
              size="icon"
              className="h-8 w-8 rounded-lg"
              onClick={() => setViewMode('grid')}
            >
              <LayoutGrid className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* 두 번째 줄: 상태 필터와 정렬 */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          {/* 상태 필터 */}
          <div className="flex flex-wrap gap-2">
            {/* 내 프로젝트만 보기 토글 */}
            <Button
              variant={showMyProjectsOnly ? 'limePrimary' : 'outline'}
              size="sm"
              onClick={() => setShowMyProjectsOnly(!showMyProjectsOnly)}
              className="gap-1.5"
            >
              <Users className="h-3.5 w-3.5" />
              내 프로젝트
            </Button>
            <div className="w-px h-6 bg-slate-200 mx-1" />
            <Button
              variant={filterStatus === 'all' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilterStatus('all')}
            >
              전체
            </Button>
            {Object.entries(statusLabels).map(([status, label]) => (
              <Button
                key={status}
                variant={filterStatus === status ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilterStatus(status as any)}
              >
                {label}
              </Button>
            ))}
          </div>

          {/* 정렬 옵션 */}
          <div className="flex gap-1">
            {[
              { value: 'date', label: '최신순', icon: Calendar },
              { value: 'name', label: '이름순', icon: FolderOpen },
              { value: 'progress', label: '진행률순', icon: TrendingUp }
            ].map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => setSortBy(option.value as any)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm font-medium transition-all ${
                  sortBy === option.value
                    ? 'bg-lime-100 text-lime-700 ring-2 ring-lime-400'
                    : 'bg-white/60 text-slate-600 hover:bg-slate-100'
                }`}
              >
                <option.icon className="h-3.5 w-3.5" />
                {option.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* 프로젝트 목록 - Glass Style */}
      {filteredProjects.length === 0 ? (
        <Card variant="glass" className="p-12 text-center">
          <div className="text-muted-foreground mb-4">
            <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 13h6m-3-3v6m-9 1V7a2 2 0 012-2h6l2 2h6a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
            </svg>
          </div>
          <h3 className="text-lg font-medium mb-2">
            {searchTerm || filterStatus !== 'all' ? '검색 결과가 없습니다' : '프로젝트가 없습니다'}
          </h3>
          <p className="text-muted-foreground mb-4">
            {searchTerm || filterStatus !== 'all'
              ? '다른 검색어나 필터를 시도해보세요.'
              : '첫 번째 프로젝트를 생성해보세요.'}
          </p>
          {!searchTerm && filterStatus === 'all' && (
            <Button variant="limePrimary" onClick={() => setShowCreateModal(true)}>
              <Plus className="mr-2 h-4 w-4" />
              새 프로젝트 만들기
            </Button>
          )}
        </Card>
      ) : viewMode === 'table' ? (
        <div className="overflow-hidden rounded-3xl bg-white/70 backdrop-blur-xl border border-white/40 shadow-lg shadow-black/5">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[300px]">프로젝트</TableHead>
                <TableHead>상태</TableHead>
                <TableHead>진행률</TableHead>
                <TableHead>팀</TableHead>
                <TableHead>기간</TableHead>
                <TableHead className="text-right">액션</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredProjects.map((project) => {
                const deadlineStatus = getDeadlineStatus(project)
                const style = deadlineStyles[deadlineStatus]
                return (
                <TableRow
                  key={project.id}
                  className={cn("cursor-pointer transition-colors", style.bg, deadlineStatus !== 'normal' && style.border)}
                  onClick={() => router.push(`/projects/${project.id}`)}
                >
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {deadlineStatus === 'overdue' && (
                        <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                      )}
                      {deadlineStatus === 'urgent' && (
                        <span className="w-2 h-2 rounded-full bg-orange-500" />
                      )}
                      <div>
                        <div className="font-medium">{project.name}</div>
                        <div className="text-sm text-muted-foreground">{project.description}</div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={statusVariants[project.status]}>
                      {statusLabels[project.status]}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {(() => {
                      const status = getDeadlineStatus(project)
                      const style = deadlineStyles[status]
                      return (
                        <div className="flex items-center gap-3 min-w-[120px]">
                          <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                            <div
                              className={cn("h-full rounded-full transition-all", style.progress)}
                              style={{ width: `${project.progress}%` }}
                            />
                          </div>
                          <span className={cn("text-sm font-medium w-10 text-right", style.text)}>
                            {project.progress}%
                          </span>
                        </div>
                      )
                    })()}
                  </TableCell>
                  <TableCell>
                    <div className="flex -space-x-2">
                      {project.team?.slice(0, 3).map((member, idx) => (
                        <div
                          key={idx}
                          className="w-8 h-8 bg-black text-lime-400 rounded-xl flex items-center justify-center text-xs font-bold border-2 border-white"
                        >
                          {(typeof member === 'string' ? member : member.name)?.charAt(0) || '?'}
                        </div>
                      )) || <span className="text-sm text-slate-400">팀 미배정</span>}
                      {project.team && project.team.length > 3 && (
                        <div className="w-8 h-8 bg-slate-100 text-slate-600 rounded-xl flex items-center justify-center text-xs font-medium border-2 border-white">
                          +{project.team.length - 3}
                        </div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {project.startDate ? new Date(project.startDate).toLocaleDateString('ko-KR') : '-'} - {project.endDate ? new Date(project.endDate).toLocaleDateString('ko-KR') : '-'}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex gap-2 justify-end" onClick={(e) => e.stopPropagation()}>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 rounded-xl hover:bg-lime-50"
                        onClick={(e) => {
                          e.stopPropagation()
                          toggleFavorite(`/projects/${project.id}`)
                        }}
                      >
                        <Star className={cn("h-4 w-4 transition-colors", isFavorite(`/projects/${project.id}`) ? "fill-lime-400 text-lime-500" : "text-slate-400 hover:text-lime-400")} />
                      </Button>
                      <Button asChild variant="ghost" size="sm">
                        <Link href={`/projects/${project.id}`}>
                          상세보기
                        </Link>
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              )})}
            </TableBody>
          </Table>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredProjects.map((project) => {
            const deadlineStatus = getDeadlineStatus(project)
            const style = deadlineStyles[deadlineStatus]
            return (
            <motion.div
              key={project.id}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
            >
              <Card
                variant="glass"
                className={cn(
                  "cursor-pointer hover:shadow-xl hover:-translate-y-1 transition-all duration-300 h-full",
                  style.bg,
                  deadlineStatus !== 'normal' && style.border
                )}
                onClick={() => router.push(`/projects/${project.id}`)}
              >
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div className="flex items-center gap-2">
                      <CardTitle className="text-lg text-slate-900">{project.name}</CardTitle>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 rounded-lg hover:bg-lime-50"
                        onClick={(e) => {
                          e.stopPropagation()
                          toggleFavorite(`/projects/${project.id}`)
                        }}
                      >
                        <Star className={cn("h-4 w-4 transition-colors", isFavorite(`/projects/${project.id}`) ? "fill-lime-400 text-lime-500" : "text-slate-400 hover:text-lime-400")} />
                      </Button>
                    </div>
                    <Badge variant={statusVariants[project.status]}>
                      {statusLabels[project.status]}
                    </Badge>
                  </div>
                  <CardDescription className="text-slate-500">{project.description}</CardDescription>
                </CardHeader>

                <CardContent className="space-y-4">
                  <div>
                    <div className="flex justify-between text-sm mb-2">
                      <span className="text-slate-500">진행률</span>
                      <span className={cn("font-bold", style.text)}>{project.progress}%</span>
                    </div>
                    <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className={cn("h-full rounded-full transition-all", style.progress)}
                        style={{ width: `${project.progress}%` }}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4 text-slate-400" />
                      <span className="text-slate-500">팀원</span>
                    </div>
                    <div className="flex -space-x-2 justify-end">
                      {project.team?.slice(0, 3).map((member, idx) => (
                        <div
                          key={idx}
                          className="w-6 h-6 bg-black text-lime-400 rounded-lg flex items-center justify-center text-xs font-bold border-2 border-white"
                        >
                          {(typeof member === 'string' ? member : member.name)?.charAt(0) || '?'}
                        </div>
                      )) || <span className="text-sm text-slate-400">미배정</span>}
                      {project.team && project.team.length > 3 && (
                        <div className="w-6 h-6 bg-slate-100 text-slate-600 rounded-lg flex items-center justify-center text-xs font-medium border-2 border-white">
                          +{project.team.length - 3}
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      <Calendar className={cn("h-4 w-4", deadlineStatus === 'overdue' || deadlineStatus === 'urgent' ? style.text : 'text-slate-400')} />
                      <span className={cn(deadlineStatus === 'overdue' || deadlineStatus === 'urgent' ? style.text : 'text-slate-500')}>
                        {deadlineStatus === 'overdue' ? '마감 지남' : deadlineStatus === 'urgent' ? '긴급' : '기간'}
                      </span>
                    </div>
                    <span className={cn("text-xs text-right", deadlineStatus === 'overdue' || deadlineStatus === 'urgent' ? style.text + ' font-semibold' : 'text-slate-500')}>
                      {project.endDate ? new Date(project.endDate).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' }) : '-'}
                    </span>
                  </div>
                </CardContent>

                <CardFooter className="pt-0">
                  <Button
                    asChild
                    variant="limeSecondary"
                    size="sm"
                    className="w-full rounded-xl"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <Link href={`/projects/${project.id}`}>
                      상세보기
                    </Link>
                  </Button>
                </CardFooter>
              </Card>
            </motion.div>
          )})}
        </div>
      )}

      {/* 프로젝트 생성 위자드 */}
      <ProjectCreateWizard
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSubmit={handleCreateProject}
      />
    </div>
  )
}