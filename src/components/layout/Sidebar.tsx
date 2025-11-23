'use client'

import React, { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useAuth } from '@/lib/auth-context'
import { icons } from '@/styles/design-system'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { ChevronDown, ChevronRight, LogOut, Menu, X } from 'lucide-react'
import { database } from '@/lib/firebase'
import { ref, onValue } from 'firebase/database'
import WorkspaceSwitcher from '@/components/workspace/WorkspaceSwitcher'


interface MenuItem {
  href: string
  label: string
  icon: keyof typeof icons
  badge?: {
    count?: number
    hasNew?: boolean
  }
  roles?: string[]
}

interface MenuGroup {
  id: string
  label: string
  icon: keyof typeof icons
  items: MenuItem[]
  roles?: string[]
}

export default function Sidebar() {
  const pathname = usePathname()
  const { userProfile, logout } = useAuth()
  const [isOpen, setIsOpen] = React.useState(false)
  const [expandedGroups, setExpandedGroups] = React.useState<string[]>(['projects', 'overview', 'collaboration', 'admin-manage'])
  const [projects, setProjects] = useState<any[]>([])

  // 프로젝트 목록 가져오기
  useEffect(() => {
    const projectsRef = ref(database, 'projects')
    const unsubscribe = onValue(projectsRef, (snapshot) => {
      const data = snapshot.val()
      if (data) {
        const projectList = Object.entries(data).map(([id, value]: [string, any]) => ({
          id,
          ...value
        }))
        setProjects(projectList)
      } else {
        setProjects([])
      }
    })

    return () => unsubscribe()
  }, [])

  // 사용자 역할 및 프로젝트에 따른 메뉴 가져오기
  const menuGroups = React.useMemo(() => {
    const role = userProfile?.role || 'member'

    // 프로젝트 메뉴 그룹 생성
    const projectItems: MenuItem[] = [
      { href: '/projects', label: '전체 프로젝트', icon: 'list' },
      ...projects.map(p => ({
        href: `/projects/${p.id}`,
        label: p.title,
        icon: 'file' as keyof typeof icons // file 아이콘 사용
      }))
    ]

    const projectGroup: MenuGroup = {
      id: 'projects',
      label: '프로젝트',
      icon: 'projects',
      items: projectItems
    }

    // 모든 멤버가 접근 가능한 공통 메뉴
    const workspaceMenus: MenuGroup[] = [
      {
        id: 'overview',
        label: '워크스페이스',
        icon: 'dashboard',
        items: [
          { href: '/dashboard', label: '홈', icon: 'dashboard' },
          { href: '/tasks', label: '내 작업', icon: 'tasks' },
          { href: '/files', label: '파일', icon: 'files' },
          { href: '/calendar', label: '캘린더', icon: 'calendar' },
          { href: '/workspace/organization', label: '조직 관리', icon: 'users' },
        ]
      },
      {
        id: 'hr',
        label: 'HR',
        icon: 'users',
        items: [
          { href: '/hr/attendance', label: '근태 관리', icon: 'calendar' },
          { href: '/hr/leave', label: '휴가 관리', icon: 'calendar' },
        ]
      },
      {
        id: 'finance',
        label: '재무',
        icon: 'finance',
        items: [
          { href: '/finance/contracts', label: '계약 관리', icon: 'file' },
          { href: '/finance/pl', label: '손익 관리', icon: 'finance' },
        ]
      },
      {
        id: 'groupware',
        label: '그룹웨어',
        icon: 'chat',
        items: [
          {
            href: '/groupware',
            label: '그룹웨어',
            icon: 'chat',
            badge: { count: 5, hasNew: true } // 예시: 5개 게시물, 새 글 있음
          },
        ]
      }
    ]

    // 관리자 전용 메뉴
    const adminMenus: MenuGroup[] = [
      {
        id: 'admin-manage',
        label: '관리자 설정',
        icon: 'settings',
        items: [
          { href: '/users', label: '멤버 관리', icon: 'users' },
          { href: '/finance', label: '재무 관리', icon: 'finance' },
          { href: '/marketing', label: '마케팅', icon: 'marketing' },
          { href: '/settings', label: '시스템 설정', icon: 'settings' },
          { href: '/logs', label: '활동 로그', icon: 'logs' },
          { href: '/automation', label: '자동화', icon: 'automation' },
        ]
      }
    ]

    // 프로젝트 그룹을 워크스페이스 다음에 배치
    const baseMenus = [
      workspaceMenus[0], // 워크스페이스 (홈, 내 작업, 파일, 캘린더)
      projectGroup,      // 프로젝트
      workspaceMenus[1], // HR
      workspaceMenus[2], // Finance
      workspaceMenus[3], // Groupware
    ]

    if (role === 'admin') {
      return [...baseMenus, ...adminMenus]
    }

    return baseMenus
  }, [userProfile?.role, projects])

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
      {/* 모바일 메뉴 버튼 */}
      <Button
        variant="ghost"
        size="icon"
        onClick={() => setIsOpen(!isOpen)}
        className="lg:hidden fixed top-4 left-4 z-50 bg-background border"
      >
        {isOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
      </Button>

      {/* 모바일 오버레이 */}
      {isOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-background/80 backdrop-blur-sm z-40"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* 사이드바 */}
      <aside className={cn(
        "fixed left-0 top-0 h-full bg-background border-r flex flex-col z-40",
        "transition-transform duration-300 ease-in-out",
        "w-[280px] lg:w-[var(--sidebar-width)]",
        isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
      )}>
        <div className="p-4 border-b">
          <WorkspaceSwitcher />
        </div>

        <ScrollArea className="flex-1 px-4 py-6">
          <div className="space-y-6">
            {menuGroups.map((group) => {
              const isExpanded = expandedGroups.includes(group.id)
              const isActive = isGroupActive(group)
              const GroupIcon = icons[group.icon]

              return (
                <div key={group.id}>
                  {/* 그룹 헤더 */}
                  <button
                    onClick={() => toggleGroup(group.id)}
                    className={cn(
                      "w-full flex items-center justify-between px-3 py-2 rounded-lg",
                      "text-sm font-medium transition-all duration-200",
                      "hover:bg-accent hover:text-accent-foreground",
                      isActive && "bg-accent/50 text-accent-foreground"
                    )}
                  >
                    <div className="flex items-center gap-3">
                      {GroupIcon && <GroupIcon className="h-4 w-4" />}
                      <span>{group.label}</span>
                    </div>
                    {isExpanded ? (
                      <ChevronDown className="h-4 w-4" />
                    ) : (
                      <ChevronRight className="h-4 w-4" />
                    )}
                  </button>

                  {/* 그룹 아이템 */}
                  {isExpanded && (
                    <div className="mt-2 space-y-1 pl-4">
                      {group.items.map((item) => {
                        const isItemActive = pathname === item.href
                        const ItemIcon = icons[item.icon]

                        return (
                          <Link
                            key={item.href}
                            href={item.href}
                            className={cn(
                              "flex items-center gap-3 px-3 py-2 rounded-lg transition-colors",
                              pathname === item.href
                                ? "bg-primary text-primary-foreground"
                                : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                            )}
                          >
                            {icons[item.icon as keyof typeof icons] &&
                              React.createElement(icons[item.icon as keyof typeof icons], { className: "w-4 h-4" })
                            }
                            <span className="flex-1">{item.label}</span>
                            {/* 게시물 개수 및 새 글 표시 */}
                            {item.badge && (
                              <div className="flex items-center gap-1">
                                {item.badge.count > 0 && (
                                  <span className="px-1.5 py-0.5 text-xs bg-blue-600 text-white rounded">
                                    {item.badge.count}
                                  </span>
                                )}
                                {item.badge.hasNew && (
                                  <span className="px-1.5 py-0.5 text-xs bg-red-500 text-white rounded font-bold">
                                    N
                                  </span>
                                )}
                              </div>
                            )}
                          </Link>
                        )
                      })}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </ScrollArea>

        <div className="p-4 border-t">
          <div className="flex items-center gap-3 mb-3">
            <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
              <span className="text-sm font-medium">
                {userProfile?.displayName?.charAt(0)?.toUpperCase() || 'U'}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-sm truncate">{userProfile?.displayName}</p>
              <p className="text-xs text-muted-foreground">
                {userProfile?.role === 'admin' ? '관리자' : '팀원'}
              </p>
            </div>
          </div>

          <Button
            variant="outline"
            size="sm"
            className="w-full"
            onClick={async () => {
              try {
                await logout()
              } catch (error) {
                console.error('로그아웃 실패:', error)
              }
            }}
          >
            <LogOut className="mr-2 h-4 w-4" />
            로그아웃
          </Button>
        </div>
      </aside>
    </>
  )
}