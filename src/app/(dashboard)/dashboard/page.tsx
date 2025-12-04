'use client'

import React, { useEffect, useState, useMemo, useCallback } from 'react'
import { useAuth } from '@/lib/auth-context'
import { useWorkspace } from '@/lib/workspace-context'
import { getDashboardStats } from '@/actions/dashboard'
import { getRandomQuote } from '@/constants/quotes'
import { HRDashboard } from '@/components/dashboard/layouts/HRDashboard'
import { ProjectDashboard } from '@/components/dashboard/layouts/ProjectDashboard'
import { EnterpriseDashboard } from '@/components/dashboard/layouts/EnterpriseDashboard'
import { format } from 'date-fns'

// ===========================================
// Glass Morphism Dashboard Page
// ===========================================

export default function DashboardPage() {
  const { userProfile } = useAuth()
  const { currentWorkspace, loading: workspaceLoading } = useWorkspace()
  const [stats, setStats] = useState({
    totalTasks: 0,
    completedTasks: 0,
    incompleteTasks: 0,
    overdueTasks: 0
  })

  // 워크스페이스 타입 확인
  const isHROnly = currentWorkspace?.type === 'HR_ONLY'
  const isProjectOnly = currentWorkspace?.type === 'PROJECT_ONLY'

  // HR 통계 상태
  const [hrStats, setHrStats] = useState({
    totalEmployees: 0,
    presentToday: 0,
    absentToday: 0,
    onLeave: 0,
    lateArrivals: 0,
    pendingApprovals: 0
  })
  const [loading, setLoading] = useState(true)
  const [currentTime, setCurrentTime] = useState(new Date())
  const [weather, setWeather] = useState({
    temp: 18,
    condition: 'sunny',
    humidity: 65,
    wind: 12
  })
  const [todayAttendance, setTodayAttendance] = useState<any>(null)
  const [announcements, setAnnouncements] = useState<Array<{
    id: string
    title: string
    date: string
    isNew: boolean
  }>>([])
  const [boardPosts, setBoardPosts] = useState<Array<{
    id: string
    title: string
    author: string
    team: string
    date: string
    comments: number
  }>>([])
  const [recentActivities, setRecentActivities] = useState<Array<{
    id: string
    title: string
    desc: string
    time: string
    status: string
    taskId?: string
  }>>([])
  const [attendanceList, setAttendanceList] = useState<Array<{
    id: string
    name: string
    team: string
    checkIn: string
    status: string
  }>>([])

  // 명언 - 페이지 로드 시 한번만 생성
  const quote = useMemo(() => getRandomQuote(), [])

  // 공지사항 로드
  const loadAnnouncements = useCallback(async () => {
    if (!currentWorkspace?.id) return
    try {
      const response = await fetch(`/api/announcements?workspaceId=${currentWorkspace.id}&limit=3`)
      if (!response.ok) return
      const data = await response.json()
      setAnnouncements(data.map((a: any) => ({
        id: a.id,
        title: a.title,
        date: format(new Date(a.createdAt), 'yyyy-MM-dd'),
        isNew: a.isNew || a.isPinned
      })))
    } catch (error) {
      console.error('Failed to load announcements:', error)
    }
  }, [currentWorkspace?.id])

  // 게시글 로드
  const loadBoardPosts = useCallback(async () => {
    if (!currentWorkspace?.id) return
    try {
      const response = await fetch(`/api/board?workspaceId=${currentWorkspace.id}&limit=4`)
      if (!response.ok) return
      const data = await response.json()
      setBoardPosts(data.map((post: any) => ({
        id: post.id,
        title: post.title,
        author: post.author?.name || '익명',
        team: post.category || '일반',
        date: format(new Date(post.createdAt), 'MM.dd'),
        comments: post.commentCount || post._count?.comments || 0
      })))
    } catch (error) {
      console.error('Failed to load board posts:', error)
    }
  }, [currentWorkspace?.id])

  // 최근 활동 로드 (최근 수정된 Task 기반)
  const loadRecentActivities = useCallback(async () => {
    if (!currentWorkspace?.id) return
    try {
      const response = await fetch(`/api/activities?workspaceId=${currentWorkspace.id}&limit=4`)
      if (!response.ok) return
      const data = await response.json()
      setRecentActivities(data)
    } catch (error) {
      console.error('Failed to load recent activities:', error)
    }
  }, [currentWorkspace?.id])

  // HR 통계 로드
  const loadHRStats = useCallback(async () => {
    if (!currentWorkspace?.id) return
    try {
      const response = await fetch(`/api/dashboard/hr-stats?workspaceId=${currentWorkspace.id}`)
      if (!response.ok) return
      const data = await response.json()
      setHrStats(data)
    } catch (error) {
      console.error('Failed to load HR stats:', error)
    }
  }, [currentWorkspace?.id])

  // 출근 현황 리스트 로드 (HR 대시보드용)
  const loadAttendanceList = useCallback(async () => {
    if (!currentWorkspace?.id) return
    try {
      const response = await fetch(`/api/dashboard/attendance-list?workspaceId=${currentWorkspace.id}&limit=4`)
      if (!response.ok) return
      const data = await response.json()
      setAttendanceList(data)
    } catch (error) {
      console.error('Failed to load attendance list:', error)
    }
  }, [currentWorkspace?.id])

  // 개인 출근 기록 로드
  const loadAttendance = useCallback(async () => {
    if (!userProfile?.uid) return
    try {
      const response = await fetch('/api/attendance', {
        headers: { 'x-user-id': userProfile.uid }
      })
      const data = await response.json()
      setTodayAttendance(data.today)
    } catch (error) {
      console.error('Failed to load attendance:', error)
    }
  }, [userProfile?.uid])

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000)
    return () => clearInterval(timer)
  }, [])

  useEffect(() => {
    const fetchData = async () => {
      try {
        const data = await getDashboardStats(currentWorkspace?.id)
        setStats(data.stats)
        setLoading(false)
      } catch (error) {
        console.error('Error fetching dashboard data:', error)
        setLoading(false)
      }
    }

    if (!workspaceLoading) {
      if (userProfile && currentWorkspace) {
        fetchData()
        loadAttendance()
        loadAnnouncements()
        loadBoardPosts()
        loadRecentActivities()
        // HR 통계와 출근 현황은 HR_ONLY 또는 ENTERPRISE 타입에서만 로드
        if (currentWorkspace.type === 'HR_ONLY' || currentWorkspace.type === 'ENTERPRISE') {
          loadHRStats()
          loadAttendanceList()
        }
      } else {
        setLoading(false)
      }
    }
  }, [userProfile, currentWorkspace, workspaceLoading, loadAttendance, loadAnnouncements, loadBoardPosts, loadRecentActivities, loadHRStats, loadAttendanceList])

  const getGreeting = () => {
    const hour = currentTime.getHours()
    if (hour < 12) return '좋은 아침입니다'
    if (hour < 18) return '좋은 오후입니다'
    return '좋은 저녁입니다'
  }

  if (loading || workspaceLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-lime-400"></div>
      </div>
    )
  }

  // ==========================================
  // HR_ONLY 워크스페이스 전용 대시보드
  // ==========================================
  if (isHROnly) {
    return (
      <HRDashboard
        userProfile={userProfile}
        currentWorkspace={currentWorkspace}
        currentTime={currentTime}
        quote={quote}
        weather={weather}
        todayAttendance={todayAttendance}
        hrStats={hrStats}
        announcements={announcements}
        boardPosts={boardPosts}
        attendanceList={attendanceList}
        getGreeting={getGreeting}
      />
    )
  }

  // ==========================================
  // PROJECT_ONLY (프리랜서) 워크스페이스 전용 대시보드
  // ==========================================
  if (isProjectOnly) {
    return (
      <ProjectDashboard
        userProfile={userProfile}
        currentWorkspace={currentWorkspace}
        currentTime={currentTime}
        quote={quote}
        weather={weather}
        stats={stats}
        announcements={announcements}
        boardPosts={boardPosts}
        recentActivities={recentActivities}
        getGreeting={getGreeting}
      />
    )
  }

  // ==========================================
  // ENTERPRISE 워크스페이스 대시보드 (전체 기능)
  // ==========================================
  return (
    <EnterpriseDashboard
      userProfile={userProfile}
      currentTime={currentTime}
      quote={quote}
      weather={weather}
      todayAttendance={todayAttendance}
      stats={stats}
      announcements={announcements}
      boardPosts={boardPosts}
      recentActivities={recentActivities}
      getGreeting={getGreeting}
    />
  )
}
