'use client'

// ===========================================
// HR 관리 페이지 - 관리자 전용 팀 대시보드
// 팀원 근태 현황, 승인 요청, 팀원 리스트
// ===========================================

const isDev = process.env.NODE_ENV === 'development'

import React, { useState, useEffect, useCallback } from 'react'
import { useAuth } from '@/lib/auth-context'
import { useWorkspace } from '@/lib/workspace-context'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Users, Clock, CalendarDays, CheckCircle2, XCircle, AlertCircle,
  Loader2, ChevronRight, UserCheck, UserX, Plane, Coffee,
  BarChart3, Download, Settings, MapPin, Wifi, Search,
  Filter, MoreHorizontal, Eye
} from 'lucide-react'
import Link from 'next/link'
import { format } from 'date-fns'
import { ko } from 'date-fns/locale'
import { toast } from 'react-hot-toast'

// HR Components
import StatsTab from '@/components/hr/StatsTab'
import ExportTab from '@/components/hr/ExportTab'
import SettingsTab from '@/components/hr/SettingsTab'
import AdminLeaveManagement from '@/components/hr/AdminLeaveManagement'

type HRAdminTab = 'dashboard' | 'attendance' | 'leave' | 'stats' | 'export' | 'settings'

interface TeamMember {
  id: string
  name: string
  email: string
  avatar?: string
  department?: string
  position?: string
  todayStatus: 'present' | 'absent' | 'leave' | 'late' | 'remote'
  checkIn?: string
  checkOut?: string
  workLocation?: 'OFFICE' | 'REMOTE'
}

interface AttendanceChangeRequest {
  id: string
  userId: string
  userName: string
  type: string
  date: string
  reason: string
  status: 'PENDING' | 'APPROVED' | 'REJECTED'
  createdAt: string
}

interface LeaveRequest {
  id: string
  userId: string
  userName: string
  type: string
  startDate: string
  endDate: string
  reason: string
  status: 'PENDING' | 'APPROVED' | 'REJECTED'
}

export default function HRAdminPage() {
  const { user, userProfile } = useAuth()
  const { currentWorkspace, isAdmin: workspaceIsAdmin, loading: workspaceLoading } = useWorkspace()

  const [activeTab, setActiveTab] = useState<HRAdminTab>('dashboard')
  const [loading, setLoading] = useState(true)
  const [isAdmin, setIsAdmin] = useState(false)

  // 대시보드 데이터
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([])
  const [attendanceRequests, setAttendanceRequests] = useState<AttendanceChangeRequest[]>([])
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>([])
  const [stats, setStats] = useState({
    present: 0,
    absent: 0,
    leave: 0,
    late: 0,
    remote: 0,
    total: 0
  })

  const [searchQuery, setSearchQuery] = useState('')

  const userId = userProfile?.uid || user?.uid || ''
  const workspaceId = currentWorkspace?.id || ''

  // 권한 확인 및 데이터 로드
  useEffect(() => {
    if (userId && workspaceId) {
      checkAdminAndLoadData()
    } else {
      setLoading(false)
    }
  }, [userId, workspaceId])

  const checkAdminAndLoadData = async () => {
    setLoading(true)
    try {
      // 관리자 권한 확인
      if (workspaceIsAdmin) {
        setIsAdmin(true)
        await loadDashboardData()
      } else {
        const res = await fetch(`/api/workspace/${workspaceId}/members`)
        if (res.ok) {
          const data = await res.json()
          const myMember = data.members?.find(
            (m: any) => m.userId === userId || m.user?.id === userId
          )
          if (myMember?.role === 'admin' || myMember?.role === 'owner' || myMember?.role === 'hr') {
            setIsAdmin(true)
            await loadDashboardData()
          } else {
            setIsAdmin(false)
          }
        }
      }
    } catch (e) {
      if (isDev) console.error('Failed to check admin:', e)
    } finally {
      setLoading(false)
    }
  }

  const loadDashboardData = async () => {
    try {
      // 팀원 근태 현황 로드
      const [membersRes, requestsRes, leaveRes] = await Promise.all([
        fetch(`/api/hr/team-attendance?workspaceId=${workspaceId}`),
        fetch(`/api/attendance/change-request?workspaceId=${workspaceId}&status=PENDING`),
        fetch(`/api/leave?workspaceId=${workspaceId}&status=PENDING`)
      ])

      if (membersRes.ok) {
        const data = await membersRes.json()
        setTeamMembers(data.members || [])
        setStats(data.stats || stats)
      }

      if (requestsRes.ok) {
        const data = await requestsRes.json()
        setAttendanceRequests(data.requests || [])
      }

      if (leaveRes.ok) {
        const data = await leaveRes.json()
        setLeaveRequests(data.requests?.filter((r: any) => r.status === 'PENDING') || [])
      }
    } catch (e) {
      if (isDev) console.error('Failed to load dashboard data:', e)
    }
  }

  // 근태 수정 요청 승인/반려
  const handleAttendanceRequest = async (requestId: string, action: 'approve' | 'reject') => {
    try {
      const res = await fetch(`/api/attendance/change-request/${requestId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action })
      })

      if (res.ok) {
        toast.success(action === 'approve' ? '승인되었습니다.' : '반려되었습니다.')
        loadDashboardData()
      } else {
        toast.error('처리에 실패했습니다.')
      }
    } catch (e) {
      toast.error('오류가 발생했습니다.')
    }
  }

  // 휴가 요청 승인/반려
  const handleLeaveRequest = async (requestId: string, action: 'approve' | 'reject') => {
    try {
      const res = await fetch(`/api/leave/${requestId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: action === 'approve' ? 'APPROVED' : 'REJECTED' })
      })

      if (res.ok) {
        toast.success(action === 'approve' ? '휴가가 승인되었습니다.' : '휴가가 반려되었습니다.')
        loadDashboardData()
      } else {
        toast.error('처리에 실패했습니다.')
      }
    } catch (e) {
      toast.error('오류가 발생했습니다.')
    }
  }

  // 필터링된 팀원 목록
  const filteredMembers = teamMembers.filter(member =>
    member.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    member.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    member.department?.toLowerCase().includes(searchQuery.toLowerCase())
  )

  // 상태별 색상
  const getStatusStyle = (status: string) => {
    switch (status) {
      case 'present': return { bg: 'bg-green-100', text: 'text-green-700', label: '근무중' }
      case 'remote': return { bg: 'bg-blue-100', text: 'text-blue-700', label: '재택근무' }
      case 'leave': return { bg: 'bg-purple-100', text: 'text-purple-700', label: '휴가' }
      case 'late': return { bg: 'bg-yellow-100', text: 'text-yellow-700', label: '지각' }
      case 'absent': return { bg: 'bg-red-100', text: 'text-red-700', label: '미출근' }
      default: return { bg: 'bg-slate-100', text: 'text-slate-600', label: status }
    }
  }

  // 워크스페이스 로딩 중
  if (workspaceLoading || loading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-4rem)]">
        <Loader2 className="w-8 h-8 animate-spin text-lime-500" />
      </div>
    )
  }

  // 로그인 필요
  if (!userId) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-4rem)]">
        <Card className="p-8">
          <div className="text-center">
            <Users className="w-12 h-12 text-slate-400 mx-auto mb-4" />
            <h2 className="text-xl mb-2">로그인이 필요합니다</h2>
          </div>
        </Card>
      </div>
    )
  }

  // 관리자 권한 없음 - 마이페이지로 안내
  if (!isAdmin) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-4rem)]">
        <Card className="p-8 max-w-md">
          <div className="text-center">
            <AlertCircle className="w-12 h-12 text-yellow-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">관리자 전용 페이지입니다</h2>
            <p className="text-slate-500 mb-4">
              개인 근태 관리는 마이페이지에서 이용해주세요.
            </p>
            <Link href="/my">
              <Button className="bg-lime-500 hover:bg-lime-600 text-white">
                마이페이지로 이동
              </Button>
            </Link>
          </div>
        </Card>
      </div>
    )
  }

  return (
    <div className="h-full overflow-auto bg-gradient-to-br from-slate-50 to-slate-100">
      <div className="p-6 space-y-6">
        {/* 헤더 */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">HR 관리</h1>
            <p className="text-slate-500">팀원 근태 및 인사 관리</p>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/hr/employees">
              <Button variant="outline" className="gap-2">
                <Users className="w-4 h-4" />
                팀원 목록
              </Button>
            </Link>
          </div>
        </div>

        {/* 탭 */}
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as HRAdminTab)}>
          <TabsList className="bg-white/80 backdrop-blur-sm p-1 rounded-xl">
            <TabsTrigger value="dashboard" className="rounded-lg data-[state=active]:bg-lime-500 data-[state=active]:text-white">
              대시보드
            </TabsTrigger>
            <TabsTrigger value="attendance" className="rounded-lg data-[state=active]:bg-lime-500 data-[state=active]:text-white">
              근태 관리
            </TabsTrigger>
            <TabsTrigger value="leave" className="rounded-lg data-[state=active]:bg-lime-500 data-[state=active]:text-white">
              휴가 관리
            </TabsTrigger>
            <TabsTrigger value="stats" className="rounded-lg data-[state=active]:bg-lime-500 data-[state=active]:text-white">
              통계
            </TabsTrigger>
            <TabsTrigger value="export" className="rounded-lg data-[state=active]:bg-lime-500 data-[state=active]:text-white">
              내보내기
            </TabsTrigger>
            <TabsTrigger value="settings" className="rounded-lg data-[state=active]:bg-lime-500 data-[state=active]:text-white">
              설정
            </TabsTrigger>
          </TabsList>

          {/* 대시보드 탭 */}
          <TabsContent value="dashboard" className="mt-6 space-y-6">
            {/* 오늘의 근태 현황 카드 */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
              <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-sm">
                <CardContent className="p-4 text-center">
                  <div className="w-12 h-12 mx-auto mb-2 rounded-xl bg-slate-100 flex items-center justify-center">
                    <Users className="w-6 h-6 text-slate-600" />
                  </div>
                  <p className="text-2xl font-bold text-slate-900">{stats.total}</p>
                  <p className="text-sm text-slate-500">전체 인원</p>
                </CardContent>
              </Card>
              <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-sm">
                <CardContent className="p-4 text-center">
                  <div className="w-12 h-12 mx-auto mb-2 rounded-xl bg-green-100 flex items-center justify-center">
                    <UserCheck className="w-6 h-6 text-green-600" />
                  </div>
                  <p className="text-2xl font-bold text-green-600">{stats.present}</p>
                  <p className="text-sm text-slate-500">출근</p>
                </CardContent>
              </Card>
              <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-sm">
                <CardContent className="p-4 text-center">
                  <div className="w-12 h-12 mx-auto mb-2 rounded-xl bg-blue-100 flex items-center justify-center">
                    <Wifi className="w-6 h-6 text-blue-600" />
                  </div>
                  <p className="text-2xl font-bold text-blue-600">{stats.remote}</p>
                  <p className="text-sm text-slate-500">재택</p>
                </CardContent>
              </Card>
              <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-sm">
                <CardContent className="p-4 text-center">
                  <div className="w-12 h-12 mx-auto mb-2 rounded-xl bg-purple-100 flex items-center justify-center">
                    <Plane className="w-6 h-6 text-purple-600" />
                  </div>
                  <p className="text-2xl font-bold text-purple-600">{stats.leave}</p>
                  <p className="text-sm text-slate-500">휴가</p>
                </CardContent>
              </Card>
              <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-sm">
                <CardContent className="p-4 text-center">
                  <div className="w-12 h-12 mx-auto mb-2 rounded-xl bg-yellow-100 flex items-center justify-center">
                    <Clock className="w-6 h-6 text-yellow-600" />
                  </div>
                  <p className="text-2xl font-bold text-yellow-600">{stats.late}</p>
                  <p className="text-sm text-slate-500">지각</p>
                </CardContent>
              </Card>
              <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-sm">
                <CardContent className="p-4 text-center">
                  <div className="w-12 h-12 mx-auto mb-2 rounded-xl bg-red-100 flex items-center justify-center">
                    <UserX className="w-6 h-6 text-red-600" />
                  </div>
                  <p className="text-2xl font-bold text-red-600">{stats.absent}</p>
                  <p className="text-sm text-slate-500">미출근</p>
                </CardContent>
              </Card>
            </div>

            <div className="grid lg:grid-cols-2 gap-6">
              {/* 승인 대기 - 근태 수정 요청 */}
              <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg">
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Clock className="w-5 h-5 text-orange-500" />
                    근태 수정 요청
                    {attendanceRequests.length > 0 && (
                      <Badge className="bg-orange-100 text-orange-700">{attendanceRequests.length}</Badge>
                    )}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {attendanceRequests.length > 0 ? (
                    <div className="space-y-3">
                      {attendanceRequests.slice(0, 5).map((req) => (
                        <div key={req.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl">
                          <div>
                            <p className="font-medium text-slate-900">{req.userName}</p>
                            <p className="text-sm text-slate-500">{req.reason}</p>
                            <p className="text-xs text-slate-400">{format(new Date(req.date), 'M월 d일')}</p>
                          </div>
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-red-600 hover:bg-red-50"
                              onClick={() => handleAttendanceRequest(req.id, 'reject')}
                            >
                              <XCircle className="w-4 h-4" />
                            </Button>
                            <Button
                              size="sm"
                              className="bg-green-500 hover:bg-green-600 text-white"
                              onClick={() => handleAttendanceRequest(req.id, 'approve')}
                            >
                              <CheckCircle2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-slate-500">
                      <CheckCircle2 className="w-8 h-8 mx-auto mb-2 text-green-500" />
                      <p>대기 중인 요청이 없습니다</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* 승인 대기 - 휴가 요청 */}
              <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg">
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Plane className="w-5 h-5 text-purple-500" />
                    휴가 신청
                    {leaveRequests.length > 0 && (
                      <Badge className="bg-purple-100 text-purple-700">{leaveRequests.length}</Badge>
                    )}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {leaveRequests.length > 0 ? (
                    <div className="space-y-3">
                      {leaveRequests.slice(0, 5).map((req) => (
                        <div key={req.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl">
                          <div>
                            <p className="font-medium text-slate-900">{req.userName}</p>
                            <p className="text-sm text-slate-500">
                              {format(new Date(req.startDate), 'M/d')} - {format(new Date(req.endDate), 'M/d')}
                            </p>
                            <p className="text-xs text-slate-400">{req.reason}</p>
                          </div>
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-red-600 hover:bg-red-50"
                              onClick={() => handleLeaveRequest(req.id, 'reject')}
                            >
                              <XCircle className="w-4 h-4" />
                            </Button>
                            <Button
                              size="sm"
                              className="bg-green-500 hover:bg-green-600 text-white"
                              onClick={() => handleLeaveRequest(req.id, 'approve')}
                            >
                              <CheckCircle2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-slate-500">
                      <CheckCircle2 className="w-8 h-8 mx-auto mb-2 text-green-500" />
                      <p>대기 중인 휴가 신청이 없습니다</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* 팀원 근태 리스트 */}
            <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg">
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-lg">오늘의 근태 현황</CardTitle>
                <div className="flex items-center gap-2">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                      type="text"
                      placeholder="이름, 부서 검색..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-9 pr-4 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-lime-500"
                    />
                  </div>
                  <Link href="/hr/employees">
                    <Button variant="outline" size="sm">
                      전체 보기 <ChevronRight className="w-4 h-4 ml-1" />
                    </Button>
                  </Link>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {filteredMembers.length > 0 ? (
                    filteredMembers.slice(0, 10).map((member) => {
                      const statusStyle = getStatusStyle(member.todayStatus)
                      return (
                        <div
                          key={member.id}
                          className="flex items-center justify-between p-4 bg-slate-50 rounded-xl hover:bg-slate-100 transition-colors"
                        >
                          <div className="flex items-center gap-4">
                            <div className="w-10 h-10 rounded-full bg-lime-100 flex items-center justify-center text-lime-700 font-medium">
                              {member.name?.charAt(0) || '?'}
                            </div>
                            <div>
                              <p className="font-medium text-slate-900">{member.name}</p>
                              <p className="text-sm text-slate-500">
                                {member.department} · {member.position}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-4">
                            <div className="text-right text-sm">
                              <p className="text-slate-600">
                                {member.checkIn ? format(new Date(member.checkIn), 'HH:mm') : '--:--'}
                                {' → '}
                                {member.checkOut ? format(new Date(member.checkOut), 'HH:mm') : '--:--'}
                              </p>
                              {member.workLocation && (
                                <p className="text-xs text-slate-400 flex items-center justify-end gap-1">
                                  {member.workLocation === 'OFFICE' ? (
                                    <><MapPin className="w-3 h-3" /> 사무실</>
                                  ) : (
                                    <><Wifi className="w-3 h-3" /> 재택</>
                                  )}
                                </p>
                              )}
                            </div>
                            <span className={`px-3 py-1 rounded-full text-sm font-medium ${statusStyle.bg} ${statusStyle.text}`}>
                              {statusStyle.label}
                            </span>
                            <Link href={`/hr/employees/${member.id}`}>
                              <Button variant="ghost" size="sm">
                                <Eye className="w-4 h-4" />
                              </Button>
                            </Link>
                          </div>
                        </div>
                      )
                    })
                  ) : (
                    <div className="text-center py-12 text-slate-500">
                      <Users className="w-12 h-12 mx-auto mb-4 text-slate-300" />
                      <p>팀원 데이터가 없습니다</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* 근태 관리 탭 */}
          <TabsContent value="attendance" className="mt-6">
            <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg">
              <CardHeader>
                <CardTitle>근태 수정 요청 관리</CardTitle>
              </CardHeader>
              <CardContent>
                {attendanceRequests.length > 0 ? (
                  <div className="space-y-3">
                    {attendanceRequests.map((req) => (
                      <div key={req.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-xl">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <p className="font-medium text-slate-900">{req.userName}</p>
                            <Badge variant="outline">{req.type}</Badge>
                          </div>
                          <p className="text-sm text-slate-500 mt-1">{req.reason}</p>
                          <p className="text-xs text-slate-400 mt-1">
                            {format(new Date(req.date), 'yyyy년 M월 d일')} ·
                            요청일: {format(new Date(req.createdAt), 'M/d HH:mm')}
                          </p>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            className="text-red-600 hover:bg-red-50"
                            onClick={() => handleAttendanceRequest(req.id, 'reject')}
                          >
                            반려
                          </Button>
                          <Button
                            className="bg-green-500 hover:bg-green-600 text-white"
                            onClick={() => handleAttendanceRequest(req.id, 'approve')}
                          >
                            승인
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12 text-slate-500">
                    <CheckCircle2 className="w-12 h-12 mx-auto mb-4 text-green-500" />
                    <p>처리할 근태 수정 요청이 없습니다</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* 휴가 관리 탭 */}
          <TabsContent value="leave" className="mt-6">
            <AdminLeaveManagement workspaceId={workspaceId} userId={userId} />
          </TabsContent>

          {/* 통계 탭 */}
          <TabsContent value="stats" className="mt-6">
            <StatsTab userId={userId} workspaceId={workspaceId} isAdmin={true} />
          </TabsContent>

          {/* 내보내기 탭 */}
          <TabsContent value="export" className="mt-6">
            <ExportTab userId={userId} workspaceId={workspaceId} isAdmin={true} />
          </TabsContent>

          {/* 설정 탭 */}
          <TabsContent value="settings" className="mt-6">
            <SettingsTab userId={userId} workspaceId={workspaceId} isAdmin={true} mode="advanced" />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
