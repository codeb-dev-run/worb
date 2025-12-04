'use client'

import React, { useState, useEffect, useRef } from 'react'
import { useAuth } from '@/lib/auth-context'
import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import { Bell, Search, ChevronRight, User, Settings, LogOut, PanelLeft } from 'lucide-react'
import toast from 'react-hot-toast'

// ===========================================
// Glass Morphism Header Component
// ===========================================

interface Notification {
  id: string
  title: string
  message: string
  time: string
  read: boolean
  type: 'info' | 'success' | 'warning' | 'error'
  link?: string
}

interface HeaderProps {
  showSidebarToggle?: boolean
  onSidebarToggle?: () => void
}

export default function Header({ showSidebarToggle = true, onSidebarToggle }: HeaderProps) {
  const { user, userProfile, logout } = useAuth()
  const router = useRouter()
  const pathname = usePathname()
  const [showNotifications, setShowNotifications] = useState(false)
  const [showUserMenu, setShowUserMenu] = useState(false)
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const notificationRef = useRef<HTMLDivElement>(null)
  const userMenuRef = useRef<HTMLDivElement>(null)

  // 알림 구독
  useEffect(() => {
    if (!user) return
    // TODO: Implement PostgreSQL notifications
  }, [user])

  // 외부 클릭 감지
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (notificationRef.current && !notificationRef.current.contains(event.target as Node)) {
        setShowNotifications(false)
      }
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setShowUserMenu(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleLogout = async () => {
    try {
      await logout()
      router.push('/login')
      toast.success('로그아웃되었습니다.')
    } catch (error) {
      console.error('Logout error:', error)
      toast.error('로그아웃 중 오류가 발생했습니다.')
    }
  }

  const handleNotificationClick = async (notification: Notification) => {
    if (notification.link) {
      router.push(notification.link)
      setShowNotifications(false)
    }
  }

  const markAllAsRead = async () => {
    if (!user) return
    toast.success('모든 알림을 읽음으로 표시했습니다.')
  }

  // 페이지 경로 가져오기
  const getBreadcrumbs = () => {
    const path = (pathname || '').split('/').filter(Boolean)
    if (path.length === 0) return { parent: 'groupware', current: 'Dashboard' }

    const titleMap: Record<string, string> = {
      'dashboard': 'Dashboard',
      'projects': 'Projects',
      'tasks': 'My Tasks',
      'clients': 'Clients',
      'marketing': 'Marketing',
      'files': 'Files',
      'analytics': 'Analytics',
      'automation': 'Automation',
      'finance': 'Finance',
      'settings': 'Settings',
      'profile': 'Profile',
      'calendar': 'Calendar',
      'kanban': 'Kanban',
      'gantt': 'Gantt',
      'groupware': 'Groupware',
    }

    return {
      parent: 'groupware',
      current: titleMap[path[path.length - 1]] || path[path.length - 1]
    }
  }

  const breadcrumbs = getBreadcrumbs()

  const getNotificationIcon = (type: Notification['type']) => {
    switch (type) {
      case 'success': return '✓'
      case 'warning': return '!'
      case 'error': return '×'
      default: return 'i'
    }
  }

  const getRelativeTime = (time: string) => {
    const now = new Date()
    const notificationTime = new Date(time)
    const diffMs = now.getTime() - notificationTime.getTime()
    const diffSecs = Math.floor(diffMs / 1000)
    const diffMins = Math.floor(diffSecs / 60)
    const diffHours = Math.floor(diffMins / 60)
    const diffDays = Math.floor(diffHours / 24)

    if (diffDays > 0) return `${diffDays}일 전`
    if (diffHours > 0) return `${diffHours}시간 전`
    if (diffMins > 0) return `${diffMins}분 전`
    return '방금 전'
  }

  return (
    <header className="flex h-16 shrink-0 items-center gap-2 bg-white/50 backdrop-blur-md border-b border-white/40 sticky top-0 z-10 transition-all duration-300">
      <div className="flex items-center gap-2 px-4 w-full">
        {/* Sidebar Toggle */}
        {showSidebarToggle && (
          <>
            <button
              onClick={onSidebarToggle}
              className="p-2 hover:bg-white/60 rounded-lg text-slate-500 hover:text-slate-900 transition-colors"
            >
              <PanelLeft className="h-5 w-5" />
            </button>
            <div className="h-4 w-px bg-slate-300 mx-2" />
          </>
        )}

        {/* Breadcrumb */}
        <nav className="flex items-center gap-2 text-sm">
          <Link
            href="/dashboard"
            className="text-slate-500 hover:text-lime-600 cursor-pointer font-medium transition-colors"
          >
            {breadcrumbs.parent}
          </Link>
          <ChevronRight className="h-4 w-4 text-slate-400" />
          <span className="font-bold text-slate-900">{breadcrumbs.current}</span>
        </nav>

        {/* Right Side */}
        <div className="ml-auto flex items-center gap-4">
          {/* Search */}
          <div className="relative hidden md:block w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
            <input
              type="search"
              placeholder="검색..."
              className="pl-9 h-9 w-full bg-white/60 border border-white/40 rounded-xl text-sm placeholder:text-slate-400 shadow-sm backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-lime-400/20 focus:border-lime-400 transition-all"
            />
          </div>

          {/* Notifications */}
          <div className="relative" ref={notificationRef}>
            <button
              onClick={() => setShowNotifications(!showNotifications)}
              className="relative p-2 hover:bg-white/60 rounded-full text-slate-600 transition-colors"
            >
              <Bell className="h-5 w-5" />
              {unreadCount > 0 && (
                <span className="absolute top-2 right-2 h-2 w-2 bg-red-500 rounded-full ring-2 ring-white" />
              )}
            </button>

            {/* Notification Dropdown */}
            <AnimatePresence>
              {showNotifications && (
                <motion.div
                  initial={{ opacity: 0, y: -10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -10, scale: 0.95 }}
                  transition={{ duration: 0.2 }}
                  className="absolute right-0 mt-2 w-80 bg-white/90 backdrop-blur-xl rounded-2xl shadow-xl shadow-black/10 border border-white/40 overflow-hidden"
                >
                  <div className="p-4 border-b border-slate-100 flex items-center justify-between">
                    <h3 className="font-bold text-slate-900">알림</h3>
                    {unreadCount > 0 && (
                      <button
                        onClick={markAllAsRead}
                        className="text-xs text-lime-600 hover:text-lime-700 font-medium"
                      >
                        모두 읽음
                      </button>
                    )}
                  </div>

                  <div className="max-h-96 overflow-y-auto">
                    {notifications.length > 0 ? (
                      notifications.slice(0, 10).map(notification => (
                        <div
                          key={notification.id}
                          onClick={() => handleNotificationClick(notification)}
                          className={`p-4 border-b border-slate-50 hover:bg-slate-50/50 cursor-pointer transition-colors ${
                            !notification.read ? 'bg-lime-50/50' : ''
                          }`}
                        >
                          <div className="flex gap-3">
                            <div className={`w-8 h-8 rounded-xl flex items-center justify-center text-xs font-bold ${
                              notification.type === 'success' ? 'bg-lime-100 text-lime-700' :
                              notification.type === 'warning' ? 'bg-amber-100 text-amber-700' :
                              notification.type === 'error' ? 'bg-red-100 text-red-700' :
                              'bg-slate-100 text-slate-700'
                            }`}>
                              {getNotificationIcon(notification.type)}
                            </div>
                            <div className="flex-1 min-w-0">
                              <h4 className="font-medium text-sm text-slate-900 truncate">{notification.title}</h4>
                              <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">{notification.message}</p>
                              <p className="text-xs text-slate-400 mt-1">{getRelativeTime(notification.time)}</p>
                            </div>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="p-8 text-center">
                        <div className="w-12 h-12 mx-auto mb-3 rounded-2xl bg-slate-100 flex items-center justify-center">
                          <Bell className="w-6 h-6 text-slate-300" />
                        </div>
                        <p className="text-sm text-slate-500">새로운 알림이 없습니다</p>
                      </div>
                    )}
                  </div>

                  {notifications.length > 10 && (
                    <Link
                      href="/notifications"
                      className="block p-3 text-center text-sm text-lime-600 hover:bg-slate-50 font-medium"
                    >
                      모든 알림 보기
                    </Link>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* User Menu */}
          <div className="relative" ref={userMenuRef}>
            <button
              onClick={() => setShowUserMenu(!showUserMenu)}
              className="flex items-center"
            >
              <div className="h-9 w-9 rounded-xl border-2 border-white shadow-sm bg-black text-lime-400 flex items-center justify-center font-bold text-xs hover:scale-105 transition-transform">
                {userProfile?.displayName?.charAt(0).toUpperCase() || 'U'}
              </div>
            </button>

            {/* User Menu Dropdown */}
            <AnimatePresence>
              {showUserMenu && (
                <motion.div
                  initial={{ opacity: 0, y: -10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -10, scale: 0.95 }}
                  transition={{ duration: 0.2 }}
                  className="absolute right-0 mt-2 w-56 bg-white/90 backdrop-blur-xl rounded-2xl shadow-xl shadow-black/10 border border-white/40 overflow-hidden"
                >
                  <div className="p-4 border-b border-slate-100">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-xl bg-black text-lime-400 flex items-center justify-center font-bold">
                        {userProfile?.displayName?.charAt(0).toUpperCase() || 'U'}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-slate-900 truncate">{userProfile?.displayName || 'User'}</p>
                        <p className="text-xs text-slate-500 truncate">{userProfile?.email}</p>
                      </div>
                    </div>
                    {userProfile?.role && (
                      <span className="inline-block mt-2 px-2 py-0.5 rounded-full text-xs font-medium bg-lime-100 text-lime-700">
                        {userProfile.role}
                      </span>
                    )}
                  </div>

                  <div className="py-2">
                    <Link
                      href="/profile"
                      className="flex items-center gap-3 px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 transition-colors"
                      onClick={() => setShowUserMenu(false)}
                    >
                      <User className="w-4 h-4 text-slate-400" />
                      프로필
                    </Link>
                    <Link
                      href="/settings"
                      className="flex items-center gap-3 px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 transition-colors"
                      onClick={() => setShowUserMenu(false)}
                    >
                      <Settings className="w-4 h-4 text-slate-400" />
                      설정
                    </Link>
                    <hr className="my-2 border-slate-100" />
                    <button
                      onClick={handleLogout}
                      className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors"
                    >
                      <LogOut className="w-4 h-4" />
                      로그아웃
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </header>
  )
}
