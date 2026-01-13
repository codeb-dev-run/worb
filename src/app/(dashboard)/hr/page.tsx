'use client'

const isDev = process.env.NODE_ENV === 'development'

import React, { useState, useEffect, useCallback } from 'react'
import { useAuth } from '@/lib/auth-context'
import { useWorkspace } from '@/lib/workspace-context'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Clock, Users, FileText, DollarSign, CalendarDays,
  BarChart3, Loader2, Plane, Download, Home, Star, Zap, Sliders
} from 'lucide-react'

// Storyboard Design Colors
// Primary accent: lime-400 (#a3e635)
// Active state: bg-black text-lime-400
// Cards: bg-white/60 backdrop-blur-xl border-white/40 rounded-3xl

// 분리된 탭 컴포넌트들
import AttendanceTab from '@/components/hr/AttendanceTab'
import ProfileTab from '@/components/hr/ProfileTab'
import PayrollTab from '@/components/hr/PayrollTab'
import LeaveTab from '@/components/hr/LeaveTab'
import StatsTab from '@/components/hr/StatsTab'
import SettingsTab from '@/components/hr/SettingsTab'
import ExportTab from '@/components/hr/ExportTab'
import EvaluationTab from '@/components/hr/EvaluationTab'
import { FlexibleWorkDashboard } from '@/components/hr/FlexibleWorkDashboard'

import { HRTab, UserRole } from '@/types/hr'

// 기본 탭 (모든 사용자에게 표시)
const baseTabs = [
  { id: 'attendance' as HRTab, label: '출근 관리', icon: Clock },
  { id: 'flexible' as HRTab, label: '유연근무', icon: Home },
  { id: 'leave' as HRTab, label: '휴가 관리', icon: Plane },
  { id: 'profile' as HRTab, label: '인사기록', icon: FileText },
  { id: 'payroll' as HRTab, label: '급여', icon: DollarSign },
  { id: 'evaluation' as HRTab, label: '성과평가', icon: Star },
  { id: 'stats' as HRTab, label: '통계', icon: BarChart3 },
]

// 관리자 전용 탭
const adminTabs = [
  { id: 'export' as HRTab, label: '내보내기', icon: Download },
  { id: 'settings-quick' as HRTab, label: '설정(퀵)', icon: Zap },
  { id: 'settings-advanced' as HRTab, label: '설정(고급)', icon: Sliders }
]

export default function HRPage() {
  const { user, userProfile } = useAuth()
  const { currentWorkspace, isAdmin: workspaceIsAdmin, loading: workspaceLoading } = useWorkspace()

  const [activeTab, setActiveTab] = useState<HRTab>('attendance')
  const [loading, setLoading] = useState(true)
  const [userRole, setUserRole] = useState<UserRole>('employee')
  // Refresh key to force re-mount components when switching tabs
  const [refreshKey, setRefreshKey] = useState(0)

  const userId = userProfile?.uid || user?.uid || ''
  const workspaceId = currentWorkspace?.id || ''

  useEffect(() => {
    if (userId && workspaceId) {
      checkUserRole()
    } else {
      setLoading(false)
    }
  }, [userId, workspaceId])

  const checkUserRole = async () => {
    setLoading(true)
    try {
      // 워크스페이스 컨텍스트의 isAdmin 헬퍼 사용
      if (workspaceIsAdmin) {
        setUserRole('admin')
      } else {
        // API에서 더 세부적인 역할 확인
        const res = await fetch(`/api/workspace/${workspaceId}/members`)
        if (res.ok) {
          const data = await res.json()
          const myMember = data.members?.find(
            (m: any) => m.userId === userId || m.user?.id === userId
          )
          if (myMember?.role === 'admin' || myMember?.role === 'owner' || myMember?.role === 'hr') {
            setUserRole('admin')
          } else if (myMember?.role === 'manager') {
            setUserRole('manager')
          } else {
            setUserRole('employee')
          }
        }
      }
    } catch (e) {
      if (isDev) console.error('Failed to check user role:', e)
    } finally {
      setLoading(false)
    }
  }

  const isAdmin = userRole === 'admin' || userRole === 'hr'

  // 권한에 따라 표시할 탭 결정
  const visibleTabs = isAdmin ? [...baseTabs, ...adminTabs] : baseTabs

  // Handle tab change - increment refresh key to force data reload
  const handleTabChange = useCallback((newTab: HRTab) => {
    setActiveTab(newTab)
    // Increment refresh key to force component remount and data refresh
    setRefreshKey(prev => prev + 1)
  }, [])

  // 워크스페이스 로딩 중
  if (workspaceLoading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-4rem)]">
        <Loader2 className="w-8 h-8 animate-spin text-lime-400" />
      </div>
    )
  }

  // 로그인 필요
  if (!userId) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-4rem)]">
        <Card className="bg-white/60 backdrop-blur-xl border-white/40 p-8 rounded-3xl shadow-lg">
          <div className="text-center">
            <Users className="w-12 h-12 text-slate-400 mx-auto mb-4" />
            <h2 className="text-slate-900 text-xl mb-2">로그인이 필요합니다</h2>
            <p className="text-slate-500">HR 기능을 사용하려면 먼저 로그인해주세요</p>
          </div>
        </Card>
      </div>
    )
  }

  // 워크스페이스 선택 필요
  if (!workspaceId) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-4rem)]">
        <Card className="bg-white/60 backdrop-blur-xl border-white/40 p-8 rounded-3xl shadow-lg">
          <div className="text-center">
            <Users className="w-12 h-12 text-slate-400 mx-auto mb-4" />
            <h2 className="text-slate-900 text-xl mb-2">워크스페이스를 선택해주세요</h2>
            <p className="text-slate-500">HR 기능을 사용하려면 워크스페이스에 가입해야 합니다</p>
            <Button
              onClick={() => window.location.href = '/workspaces/join'}
              className="mt-4 bg-lime-400 text-slate-900 hover:bg-lime-500"
            >
              워크스페이스 찾기
            </Button>
          </div>
        </Card>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-4rem)]">
        <Loader2 className="w-8 h-8 animate-spin text-lime-400" />
      </div>
    )
  }

  return (
    <div className="w-full space-y-6 pb-24 animate-in fade-in slide-in-from-bottom-4 duration-500 px-6 pt-6">
      {/* 헤더 (Storyboard Design) */}
      <div className="space-y-1">
        <h2 className="text-sm font-medium text-slate-500">인사 관리</h2>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">HR & 근태 관리</h1>
      </div>

      {/* 탭 네비게이션 (Storyboard Design) - 권한에 따라 탭 표시 */}
      <div className="bg-white/60 backdrop-blur-md p-1 rounded-2xl border border-white/40 w-auto inline-flex h-auto shadow-sm">
        {visibleTabs.map(tab => (
          <button
            key={tab.id}
            className={`flex items-center gap-2 rounded-xl px-6 py-2.5 text-sm font-bold transition-all whitespace-nowrap ${
              activeTab === tab.id
                ? 'bg-black text-lime-400 shadow-lg shadow-lime-400/20'
                : 'text-slate-500 hover:text-slate-900 hover:bg-white/60'
            }`}
            onClick={() => handleTabChange(tab.id)}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* 탭 컨텐츠 */}
      <div className="min-h-[400px]">
        {activeTab === 'attendance' && (
          <AttendanceTab
            key={`attendance-${refreshKey}`}
            userId={userId}
            workspaceId={workspaceId}
            isAdmin={isAdmin}
          />
        )}
        {activeTab === 'flexible' && (
          <FlexibleWorkDashboard
            key={`flexible-${refreshKey}`}
            userId={userId}
            workspaceId={workspaceId}
          />
        )}
        {activeTab === 'profile' && (
          <ProfileTab
            userId={userId}
            workspaceId={workspaceId}
            isAdmin={isAdmin}
          />
        )}
        {activeTab === 'payroll' && (
          <PayrollTab
            userId={userId}
            workspaceId={workspaceId}
            isAdmin={isAdmin}
          />
        )}
        {activeTab === 'leave' && (
          <LeaveTab
            userId={userId}
            workspaceId={workspaceId}
            isAdmin={isAdmin}
          />
        )}
        {activeTab === 'stats' && (
          <StatsTab
            userId={userId}
            workspaceId={workspaceId}
            isAdmin={isAdmin}
          />
        )}
        {activeTab === 'evaluation' && (
          <EvaluationTab
            userId={userId}
            workspaceId={workspaceId}
            isAdmin={isAdmin}
          />
        )}
        {activeTab === 'export' && (
          <ExportTab
            userId={userId}
            workspaceId={workspaceId}
            isAdmin={isAdmin}
          />
        )}
        {activeTab === 'settings-quick' && (
          <SettingsTab
            userId={userId}
            workspaceId={workspaceId}
            isAdmin={isAdmin}
            mode="quick"
          />
        )}
        {activeTab === 'settings-advanced' && (
          <SettingsTab
            userId={userId}
            workspaceId={workspaceId}
            isAdmin={isAdmin}
            mode="advanced"
          />
        )}
      </div>
    </div>
  )
}
