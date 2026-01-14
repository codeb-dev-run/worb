'use client'
const isDev = process.env.NODE_ENV === 'development'

import React, { useEffect, useState, useMemo } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useAuth } from '@/lib/auth-context'
import { useWorkspace, WorkspaceFeatures } from '@/lib/workspace-context'
import { icons } from '@/styles/design-system'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { ChevronDown, ChevronRight, LogOut, Menu, X, Star, PanelBottom, Trash2 } from 'lucide-react'
import toast from 'react-hot-toast'
import WorkspaceSwitcher from '@/components/workspace/WorkspaceSwitcher'
import { useNavigation } from '@/hooks/useNavigation'

// ===========================================
// Glass Morphism Sidebar Component
// ===========================================

type FeatureFlagKey = keyof Omit<WorkspaceFeatures, 'id' | 'workspaceId'>

interface MenuItem {
  href: string
  label: string
  icon: keyof typeof icons
  badge?: {
    count?: number
    hasNew?: boolean
  }
  roles?: string[]
  featureFlag?: FeatureFlagKey // WorkspaceFeatures의 필드명
}

interface MenuGroup {
  id: string
  label: string
  icon: keyof typeof icons
  items: MenuItem[]
  roles?: string[]
  featureFlag?: FeatureFlagKey // 그룹 전체를 제어하는 기능 플래그
}

export default function Sidebar() {
  const pathname = usePathname()
  const { userProfile, logout } = useAuth()
  const { isFeatureEnabled, currentWorkspace, features, isAdmin } = useWorkspace()
  const { favorites, toggleFavorite, isFavorite, toggleMode } = useNavigation()
  const [isOpen, setIsOpen] = React.useState(false)
  const [expandedGroups, setExpandedGroups] = React.useState<string[]>(['projects', 'overview', 'groupware', 'admin-manage'])
  const [projects, setProjects] = useState<any[]>([])
  const [isDeleting, setIsDeleting] = useState(false)
  const [testDataDeleted, setTestDataDeleted] = useState(false)

  // 테스트 데이터 삭제 여부 확인 (localStorage)
  useEffect(() => {
    const deleted = localStorage.getItem('testDataDeleted')
    if (deleted === 'true') {
      setTestDataDeleted(true)
    }
  }, [])

  // 테스트 데이터 삭제 함수
  const handleDeleteTestData = async () => {
    if (!confirm('정말 테스트 계정과 모든 테스트 데이터를 삭제하시겠습니까?\n\n삭제 대상:\n- 모든 프로젝트 및 작업\n- 테스트 계정 (현재 로그인 계정 제외)\n- 파일, 공지사항, 게시글, 근태기록 등\n\n⚠️ 이 작업은 되돌릴 수 없으며, 1회만 실행됩니다.')) {
      return
    }

    setIsDeleting(true)
    try {
      const response = await fetch('/api/admin/delete-test-data', {
        method: 'DELETE',
      })

      if (response.ok) {
        const result = await response.json()
        const deleted = result.deleted
        toast.success(
          `삭제 완료!\n` +
          `프로젝트: ${deleted?.projects || 0}개\n` +
          `작업: ${deleted?.tasks || 0}개\n` +
          `계정: ${deleted?.users || 0}개\n` +
          `멤버: ${deleted?.workspaceMembers || 0}명`
        )
        // localStorage에 삭제 완료 표시 - 메뉴 숨김
        localStorage.setItem('testDataDeleted', 'true')
        setTestDataDeleted(true)
        // 프로젝트 목록 새로고침
        setProjects([])
        setTimeout(() => window.location.reload(), 1500)
      } else {
        const error = await response.json()
        toast.error(error.error || '삭제 실패')
      }
    } catch (error) {
      if (isDev) console.error('Failed to delete test data:', error)
      toast.error('테스트 데이터 삭제 중 오류가 발생했습니다')
    } finally {
      setIsDeleting(false)
    }
  }

  // Fetch Projects from API
  useEffect(() => {
    const fetchProjects = async () => {
      // workspaceId가 없으면 API 호출하지 않음
      if (!currentWorkspace?.id) return

      try {
        const response = await fetch(`/api/projects?workspaceId=${currentWorkspace.id}`)
        if (response.ok) {
          const data = await response.json()
          setProjects(data)
        }
      } catch (error) {
      if (isDev) console.error('Failed to fetch projects:', error)
      }
    }

    fetchProjects()
  }, [currentWorkspace?.id])

  // 메인 네비게이션 (항상 표시)
  const navMain: MenuItem[] = React.useMemo(() => {
    const items: MenuItem[] = [
      { href: '/dashboard', label: '홈', icon: 'dashboard' },
    ]

    if (isFeatureEnabled('projectEnabled')) {
      items.push({ href: '/tasks', label: '내 작업', icon: 'tasks' })
    }

    if (isFeatureEnabled('filesEnabled')) {
      items.push({ href: '/files', label: '파일 보관함', icon: 'files' })
    }

    return items
  }, [isFeatureEnabled, features])

  // 그룹 메뉴 (Collapsible)
  const menuGroups = React.useMemo(() => {
    const groups: MenuGroup[] = []

    // 프로젝트 그룹 (PROJECT_ONLY, ENTERPRISE)
    if (isFeatureEnabled('projectEnabled')) {
      groups.push({
        id: 'projects',
        label: '프로젝트',
        icon: 'projects',
        items: [
          { href: '/projects', label: '진행 중인 프로젝트', icon: 'list' },
          ...projects
            .filter(p => isFavorite(`/projects/${p.id}`))
            .map(p => ({
              href: `/projects/${p.id}`,
              label: p.name,
              icon: 'file' as keyof typeof icons
            }))
        ]
      })
    }

    // 그룹웨어 (모든 타입)
    const groupwareItems: MenuItem[] = []
    if (isFeatureEnabled('announcementEnabled')) {
      groupwareItems.push({ href: '/groupware/announcements', label: '공지사항', icon: 'notification' })
    }
    if (isFeatureEnabled('boardEnabled')) {
      groupwareItems.push({ href: '/groupware/board', label: '게시판', icon: 'board' })
      groupwareItems.push({ href: '/groupware/qa', label: 'QA 게시판', icon: 'board' })
    }
    if (isFeatureEnabled('calendarEnabled')) {
      groupwareItems.push({ href: '/calendar', label: '일정 (캘린더)', icon: 'calendar' })
    }
    if (isFeatureEnabled('organizationEnabled')) {
      groupwareItems.push({ href: '/workspace/organization', label: '조직 관리', icon: 'users' })
    }
    if (isFeatureEnabled('attendanceEnabled')) {
      groupwareItems.push({ href: '/attendance', label: '근태', icon: 'calendar' })
      // 관리자용 근태관리 메뉴
      if (isAdmin) {
        groupwareItems.push({ href: '/hr', label: '근태관리', icon: 'users', roles: ['admin'] })
      }
    }
    // 재무 기능 제거됨 (2024-12)
    // if (isFeatureEnabled('financeEnabled')) {
    //   groupwareItems.push({ href: '/finance/expenses', label: '재무 관리', icon: 'finance' })
    // }

    if (groupwareItems.length > 0) {
      groups.push({
        id: 'groupware',
        label: '그룹웨어',
        icon: 'chat',
        items: groupwareItems
      })
    }

    // 관리자 설정 (현재 워크스페이스에서 admin인 경우만)
    if (isAdmin) {
      groups.push({
        id: 'admin-manage',
        label: '관리자 설정',
        icon: 'settings',
        items: [
          { href: '/settings', label: '시스템 설정', icon: 'settings' },
          { href: '/settings?tab=features', label: '기능 설정', icon: 'settings' },
        ]
      })
    }

    return groups
  }, [isAdmin, projects, isFeatureEnabled, features, currentWorkspace?.id, isFavorite])

  // 그룹 토글
  const toggleGroup = (groupId: string) => {
    setExpandedGroups(prev =>
      prev.includes(groupId)
        ? prev.filter(id => id !== groupId)
        : [...prev, groupId]
    )
  }

  // 현재 경로가 그룹에 속하는지 확인
  const isGroupActive = (group: MenuGroup) => {
    return group.items.some(item => pathname === item.href || pathname?.startsWith(item.href + '/'))
  }

  return (
    <>
      {/* Mobile Menu Button */}
      <Button
        variant="ghost"
        size="icon"
        className="lg:hidden fixed top-4 left-4 z-50 bg-white/60 backdrop-blur-sm hover:bg-white/80"
        onClick={() => setIsOpen(!isOpen)}
      >
        {isOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
      </Button>

      {/* Sidebar Container - Glass Morphism */}
      <aside
        className={cn(
          "fixed top-0 left-0 z-40 h-screen w-[280px] bg-white/80 backdrop-blur-2xl border-r border-slate-100 transition-transform duration-300 lg:translate-x-0 flex flex-col",
          isOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        {/* Workspace Switcher */}
        <div className="p-4 border-b border-slate-100">
          <WorkspaceSwitcher />
        </div>

        {/* Navigation Menu */}
        <ScrollArea className="flex-1 py-4">
          <div className="px-3">
            {/* Main Nav - 홈, 내 작업, 파일 */}
            <div className="space-y-1 mb-4">
              {navMain.map((item) => {
                const isActive = pathname === item.href || pathname?.startsWith(item.href + '/')
                const Icon = icons[item.icon]
                const isFav = isFavorite(item.href)

                return (
                  <div key={item.href} className="group flex items-center gap-1">
                    <Link
                      href={item.href}
                      className={cn(
                        "flex-1 flex items-center px-3 py-2.5 text-sm rounded-2xl transition-all duration-300",
                        isActive
                          ? "bg-lime-400 text-slate-900 shadow-lg shadow-lime-400/20 font-bold"
                          : "text-slate-500 hover:text-slate-900 hover:bg-slate-100 font-medium"
                      )}
                    >
                      <Icon className={cn(
                        "w-5 h-5 mr-3 transition-colors",
                        isActive ? "text-slate-900" : "text-slate-400 group-hover:text-slate-600"
                      )} />
                      <span className="flex-1 truncate">{item.label}</span>
                    </Link>
                    <button
                      onClick={(e) => {
                        e.preventDefault()
                        toggleFavorite(item.href)
                      }}
                      className={cn(
                        "p-1.5 rounded-xl transition-all duration-200 opacity-0 group-hover:opacity-100 focus:opacity-100",
                        isFav ? "text-amber-400 opacity-100" : "text-slate-300 hover:text-amber-400"
                      )}
                    >
                      <Star className={cn("w-3.5 h-3.5", isFav && "fill-current")} />
                    </button>
                  </div>
                )
              })}
            </div>

            {/* Collapsible Groups - 프로젝트, 그룹웨어 */}
            {menuGroups.filter(g => g.id !== 'admin-manage').length > 0 && (
              <div className="pt-2">
                <div className="px-3 py-2 mb-1 text-xs font-bold text-slate-400 uppercase tracking-wider opacity-60">
                  Applications
                </div>
                <div className="space-y-1">
                  {menuGroups.filter(g => g.id !== 'admin-manage').map((group) => (
                    <div key={group.id}>
                      <button
                        onClick={() => toggleGroup(group.id)}
                        className="flex items-center w-full px-3 py-2.5 text-sm font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 hover:shadow-sm transition-all duration-300 rounded-xl"
                      >
                        {React.createElement(icons[group.icon], { className: "w-4 h-4 mr-2 text-slate-400" })}
                        <span className="flex-1 text-left">{group.label}</span>
                        {expandedGroups.includes(group.id) ? (
                          <ChevronDown className="w-4 h-4 text-slate-300" />
                        ) : (
                          <ChevronRight className="w-4 h-4 text-slate-300" />
                        )}
                      </button>

                      {expandedGroups.includes(group.id) && (
                        <div className="mt-1 ml-5 pl-3 border-l border-slate-200 space-y-1">
                          {group.items.map((item) => {
                            const isActive = pathname === item.href || pathname?.startsWith(item.href + '/')
                            const Icon = icons[item.icon]
                            const isFav = isFavorite(item.href)

                            return (
                              <div key={item.href} className="group flex items-center gap-1">
                                <Link
                                  href={item.href}
                                  className={cn(
                                    "flex-1 flex items-center px-3 py-2 text-sm rounded-lg transition-all duration-200",
                                    isActive
                                      ? "text-slate-900 font-bold bg-slate-100"
                                      : "text-slate-500 hover:text-slate-900 hover:bg-slate-50"
                                  )}
                                >
                                  <Icon className={cn(
                                    "w-3.5 h-3.5 mr-2 transition-colors",
                                    isActive ? "text-slate-900" : "opacity-60 group-hover:opacity-100 group-hover:text-slate-600"
                                  )} />
                                  <span className="flex-1 truncate">{item.label}</span>
                                </Link>
                                <button
                                  onClick={(e) => {
                                    e.preventDefault()
                                    toggleFavorite(item.href)
                                  }}
                                  className={cn(
                                    "p-1 rounded-lg transition-all duration-200 opacity-0 group-hover:opacity-100 focus:opacity-100",
                                    isFav ? "text-amber-400 opacity-100" : "text-slate-300 hover:text-amber-400"
                                  )}
                                >
                                  <Star className={cn("w-3 h-3", isFav && "fill-current")} />
                                </button>
                              </div>
                            )
                          })}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 관리자 설정 - 별도 섹션 (현재 워크스페이스에서 admin인 경우) */}
            {isAdmin && (
              <div className="pt-4">
                <div className="px-3 py-2 mb-1 text-xs font-bold text-slate-400 uppercase tracking-wider opacity-60">
                  관리자
                </div>
                <div className="space-y-1">
                  <Link
                    href="/settings"
                    className={cn(
                      "flex items-center px-3 py-2.5 text-sm rounded-2xl transition-all duration-300",
                      pathname === '/settings' && !pathname?.includes('tab=')
                        ? "bg-lime-400 text-slate-900 shadow-lg shadow-lime-400/20 font-bold"
                        : "text-slate-500 hover:text-slate-900 hover:bg-slate-100 font-medium"
                    )}
                  >
                    {React.createElement(icons.settings, { className: "w-5 h-5 mr-3 text-slate-400" })}
                    <span>시스템 설정</span>
                  </Link>
                  <Link
                    href="/settings/features"
                    className={cn(
                      "flex items-center px-3 py-2.5 text-sm rounded-2xl transition-all duration-300",
                      pathname === '/settings/features'
                        ? "bg-lime-400 text-slate-900 shadow-lg shadow-lime-400/20 font-bold"
                        : "text-slate-500 hover:text-slate-900 hover:bg-slate-100 font-medium"
                    )}
                  >
                    {React.createElement(icons.settings, { className: "w-5 h-5 mr-3 text-slate-400" })}
                    <span>기능 및 권한</span>
                  </Link>
                </div>
              </div>
            )}
          </div>
        </ScrollArea>

        {/* User Profile & Footer - Glass Style */}
        <div className="p-3 border-t border-slate-100">
          <div className="bg-white/40 backdrop-blur-sm rounded-3xl p-1 border border-white/40 shadow-sm">
            {/* Delete Test Data - 현재 워크스페이스 Admin Only & 1회만 표시 */}
            {isAdmin && !testDataDeleted && (
              <div className="px-2 py-1">
                <button
                  onClick={handleDeleteTestData}
                  disabled={isDeleting}
                  className="flex items-center gap-2 w-full px-2 py-2 rounded-2xl hover:bg-rose-50 cursor-pointer transition-colors group disabled:opacity-50"
                >
                  <Trash2 className="h-4 w-4 text-slate-400 group-hover:text-rose-500" />
                  <span className="text-xs font-medium text-slate-500 group-hover:text-rose-500">
                    {isDeleting ? '삭제 중...' : '테스트 데이터 삭제'}
                  </span>
                </button>
              </div>
            )}

            {/* Dock Mode Toggle */}
            <div className="px-2 py-1">
              <button
                onClick={toggleMode}
                className="flex items-center gap-2 w-full px-2 py-2 rounded-2xl hover:bg-white/80 cursor-pointer transition-colors group"
              >
                <PanelBottom className="h-4 w-4 text-slate-400 group-hover:text-slate-900" />
                <span className="text-xs font-medium text-slate-500 group-hover:text-slate-900">Dock Mode</span>
              </button>
            </div>

            {/* User Info */}
            <div className="flex items-center gap-3 px-2 py-2 hover:bg-white/60 rounded-2xl transition-all duration-300 cursor-pointer">
              <div className="w-9 h-9 rounded-xl bg-black text-lime-400 flex items-center justify-center font-bold text-sm border-2 border-white shadow-sm">
                {userProfile?.displayName?.[0] || 'U'}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-sm text-slate-900 truncate">{userProfile?.displayName}</p>
                <p className="text-xs text-slate-500 font-medium">
                  {isAdmin ? '관리자' : '팀원'}
                </p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={logout}
                className="h-8 w-8 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-xl transition-all duration-200"
              >
                <LogOut className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      </aside>
    </>
  )
}