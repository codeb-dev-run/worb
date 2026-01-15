'use client'

// ===========================================
// 마이페이지 - 직원 개인 페이지
// 출퇴근, 근태이력, 휴가, 인사기록, 급여, 평가
// ===========================================

import React, { useState, useEffect, useCallback } from 'react'
import { useAuth } from '@/lib/auth-context'
import { useWorkspace } from '@/lib/workspace-context'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Clock,
  Calendar,
  User,
  Wallet,
  Star,
  LogIn,
  LogOut,
  MapPin,
  Wifi,
  History,
  Loader2,
  CheckCircle2,
  XCircle,
  Coffee
} from 'lucide-react'
import { toast } from 'react-hot-toast'
import { format } from 'date-fns'
import { ko } from 'date-fns/locale'

// HR Components (재사용)
import ProfileTab from '@/components/hr/ProfileTab'
import LeaveTab from '@/components/hr/LeaveTab'
import PayrollTab from '@/components/hr/PayrollTab'
import EvaluationTab from '@/components/hr/EvaluationTab'
import AttendanceTab from '@/components/hr/AttendanceTab'

type MyTab = 'attendance' | 'history' | 'leave' | 'profile' | 'payroll' | 'evaluation'

interface AttendanceData {
  id: string
  date: string
  checkIn: string | null
  checkOut: string | null
  status: string
  workedMinutes: number
  workLocation: 'OFFICE' | 'REMOTE'
}

interface WorkSession {
  id: string
  startTime: string
  endTime: string | null
  type: string
  isActive: boolean
}

export default function MyPage() {
  const { user } = useAuth()
  const { currentWorkspace } = useWorkspace()

  const [activeTab, setActiveTab] = useState<MyTab>('attendance')
  const [loading, setLoading] = useState(true)
  const [checkingIn, setCheckingIn] = useState(false)
  const [checkingOut, setCheckingOut] = useState(false)

  // 출퇴근 상태
  const [todayAttendance, setTodayAttendance] = useState<AttendanceData | null>(null)
  const [currentSession, setCurrentSession] = useState<WorkSession | null>(null)
  const [attendanceHistory, setAttendanceHistory] = useState<AttendanceData[]>([])
  const [workLocation, setWorkLocation] = useState<'OFFICE' | 'REMOTE'>('OFFICE')

  // 현재 시간
  const [currentTime, setCurrentTime] = useState(new Date())

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000)
    return () => clearInterval(timer)
  }, [])

  // 출퇴근 데이터 로드
  const loadAttendanceData = useCallback(async () => {
    if (!currentWorkspace?.id) return

    try {
      setLoading(true)
      const response = await fetch(`/api/attendance?workspaceId=${currentWorkspace.id}`)
      if (response.ok) {
        const data = await response.json()
        setTodayAttendance(data.today)
        setCurrentSession(data.currentSession)
        setAttendanceHistory(data.history || [])
      }
    } catch (error) {
      console.error('Failed to load attendance:', error)
    } finally {
      setLoading(false)
    }
  }, [currentWorkspace?.id])

  useEffect(() => {
    loadAttendanceData()
  }, [loadAttendanceData])

  // 출근하기
  const handleCheckIn = async () => {
    if (!currentWorkspace?.id) return

    try {
      setCheckingIn(true)
      const response = await fetch('/api/attendance/checkin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          workspaceId: currentWorkspace.id,
          location: workLocation,
        })
      })

      if (response.ok) {
        toast.success('출근 완료!')
        loadAttendanceData()
      } else {
        const error = await response.json()
        toast.error(error.message || '출근 처리에 실패했습니다.')
      }
    } catch (error) {
      toast.error('출근 처리 중 오류가 발생했습니다.')
    } finally {
      setCheckingIn(false)
    }
  }

  // 퇴근하기
  const handleCheckOut = async () => {
    if (!currentWorkspace?.id) return

    try {
      setCheckingOut(true)
      const response = await fetch('/api/attendance/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          workspaceId: currentWorkspace.id,
        })
      })

      if (response.ok) {
        toast.success('퇴근 완료! 오늘도 수고하셨습니다.')
        loadAttendanceData()
      } else {
        const error = await response.json()
        toast.error(error.message || '퇴근 처리에 실패했습니다.')
      }
    } catch (error) {
      toast.error('퇴근 처리 중 오류가 발생했습니다.')
    } finally {
      setCheckingOut(false)
    }
  }

  // 근무 시간 계산
  const getWorkedTime = () => {
    if (!todayAttendance?.checkIn) return '0시간 0분'

    const checkInTime = new Date(todayAttendance.checkIn)
    const now = todayAttendance.checkOut ? new Date(todayAttendance.checkOut) : new Date()
    const diffMs = now.getTime() - checkInTime.getTime()
    const hours = Math.floor(diffMs / (1000 * 60 * 60))
    const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60))

    return `${hours}시간 ${minutes}분`
  }

  // 출근 상태 표시
  const getAttendanceStatus = () => {
    if (!todayAttendance) return { label: '미출근', color: 'text-slate-500', bg: 'bg-slate-100' }
    if (todayAttendance.checkOut) return { label: '퇴근', color: 'text-blue-600', bg: 'bg-blue-100' }
    if (todayAttendance.checkIn) return { label: '근무중', color: 'text-green-600', bg: 'bg-green-100' }
    return { label: '미출근', color: 'text-slate-500', bg: 'bg-slate-100' }
  }

  const status = getAttendanceStatus()

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-8 w-8 animate-spin text-lime-500" />
      </div>
    )
  }

  return (
    <div className="h-full overflow-auto bg-gradient-to-br from-slate-50 to-slate-100 p-6">
      <div className="max-w-5xl mx-auto space-y-6">
        {/* 헤더 */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">마이페이지</h1>
            <p className="text-slate-500">내 근태 및 인사 정보를 관리합니다</p>
          </div>
          <div className="text-right">
            <p className="text-3xl font-bold text-slate-900">
              {format(currentTime, 'HH:mm:ss')}
            </p>
            <p className="text-sm text-slate-500">
              {format(currentTime, 'yyyy년 M월 d일 (EEEE)', { locale: ko })}
            </p>
          </div>
        </div>

        {/* 출퇴근 카드 */}
        <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              {/* 현재 상태 */}
              <div className="flex items-center gap-6">
                <div className={`w-20 h-20 rounded-2xl ${status.bg} flex items-center justify-center`}>
                  {todayAttendance?.checkIn && !todayAttendance?.checkOut ? (
                    <Clock className={`w-10 h-10 ${status.color}`} />
                  ) : todayAttendance?.checkOut ? (
                    <CheckCircle2 className={`w-10 h-10 ${status.color}`} />
                  ) : (
                    <Coffee className={`w-10 h-10 ${status.color}`} />
                  )}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className={`px-3 py-1 rounded-full text-sm font-medium ${status.bg} ${status.color}`}>
                      {status.label}
                    </span>
                    {todayAttendance?.workLocation && (
                      <span className="px-2 py-1 rounded-full text-xs bg-slate-100 text-slate-600 flex items-center gap-1">
                        {todayAttendance.workLocation === 'OFFICE' ? (
                          <><MapPin className="w-3 h-3" /> 사무실</>
                        ) : (
                          <><Wifi className="w-3 h-3" /> 재택</>
                        )}
                      </span>
                    )}
                  </div>
                  <div className="mt-2 text-sm text-slate-600">
                    {todayAttendance?.checkIn && (
                      <span>출근: {format(new Date(todayAttendance.checkIn), 'HH:mm')}</span>
                    )}
                    {todayAttendance?.checkOut && (
                      <span className="ml-4">퇴근: {format(new Date(todayAttendance.checkOut), 'HH:mm')}</span>
                    )}
                  </div>
                  <p className="mt-1 text-2xl font-bold text-slate-900">
                    {getWorkedTime()}
                  </p>
                </div>
              </div>

              {/* 출퇴근 버튼 */}
              <div className="flex items-center gap-4">
                {/* 근무 위치 선택 */}
                {!todayAttendance?.checkIn && (
                  <div className="flex rounded-xl overflow-hidden border border-slate-200">
                    <button
                      onClick={() => setWorkLocation('OFFICE')}
                      className={`px-4 py-2 text-sm font-medium flex items-center gap-2 transition-colors ${
                        workLocation === 'OFFICE'
                          ? 'bg-lime-500 text-white'
                          : 'bg-white text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      <MapPin className="w-4 h-4" />
                      사무실
                    </button>
                    <button
                      onClick={() => setWorkLocation('REMOTE')}
                      className={`px-4 py-2 text-sm font-medium flex items-center gap-2 transition-colors ${
                        workLocation === 'REMOTE'
                          ? 'bg-lime-500 text-white'
                          : 'bg-white text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      <Wifi className="w-4 h-4" />
                      재택
                    </button>
                  </div>
                )}

                {/* 출근 버튼 */}
                {!todayAttendance?.checkIn && (
                  <Button
                    onClick={handleCheckIn}
                    disabled={checkingIn}
                    className="bg-green-500 hover:bg-green-600 text-white px-8 py-6 text-lg rounded-xl"
                  >
                    {checkingIn ? (
                      <Loader2 className="w-5 h-5 animate-spin mr-2" />
                    ) : (
                      <LogIn className="w-5 h-5 mr-2" />
                    )}
                    출근하기
                  </Button>
                )}

                {/* 퇴근 버튼 */}
                {todayAttendance?.checkIn && !todayAttendance?.checkOut && (
                  <Button
                    onClick={handleCheckOut}
                    disabled={checkingOut}
                    className="bg-blue-500 hover:bg-blue-600 text-white px-8 py-6 text-lg rounded-xl"
                  >
                    {checkingOut ? (
                      <Loader2 className="w-5 h-5 animate-spin mr-2" />
                    ) : (
                      <LogOut className="w-5 h-5 mr-2" />
                    )}
                    퇴근하기
                  </Button>
                )}

                {/* 퇴근 완료 */}
                {todayAttendance?.checkOut && (
                  <div className="text-center px-8 py-4 bg-blue-50 rounded-xl">
                    <CheckCircle2 className="w-8 h-8 text-blue-500 mx-auto mb-1" />
                    <p className="text-sm text-blue-600 font-medium">퇴근 완료</p>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 탭 컨텐츠 */}
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as MyTab)}>
          <TabsList className="bg-white/80 backdrop-blur-sm p-1 rounded-xl">
            <TabsTrigger value="attendance" className="rounded-lg data-[state=active]:bg-lime-500 data-[state=active]:text-white">
              <Clock className="w-4 h-4 mr-2" />
              출퇴근
            </TabsTrigger>
            <TabsTrigger value="history" className="rounded-lg data-[state=active]:bg-lime-500 data-[state=active]:text-white">
              <History className="w-4 h-4 mr-2" />
              근태이력
            </TabsTrigger>
            <TabsTrigger value="leave" className="rounded-lg data-[state=active]:bg-lime-500 data-[state=active]:text-white">
              <Calendar className="w-4 h-4 mr-2" />
              휴가
            </TabsTrigger>
            <TabsTrigger value="profile" className="rounded-lg data-[state=active]:bg-lime-500 data-[state=active]:text-white">
              <User className="w-4 h-4 mr-2" />
              인사기록
            </TabsTrigger>
            <TabsTrigger value="payroll" className="rounded-lg data-[state=active]:bg-lime-500 data-[state=active]:text-white">
              <Wallet className="w-4 h-4 mr-2" />
              급여
            </TabsTrigger>
            <TabsTrigger value="evaluation" className="rounded-lg data-[state=active]:bg-lime-500 data-[state=active]:text-white">
              <Star className="w-4 h-4 mr-2" />
              평가
            </TabsTrigger>
          </TabsList>

          {/* 출퇴근 탭 - 오늘 상세 */}
          <TabsContent value="attendance" className="mt-4">
            <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg">
              <CardHeader>
                <CardTitle>오늘의 근무</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 gap-6">
                  <div className="text-center p-6 bg-slate-50 rounded-xl">
                    <p className="text-sm text-slate-500 mb-1">출근 시간</p>
                    <p className="text-2xl font-bold text-slate-900">
                      {todayAttendance?.checkIn
                        ? format(new Date(todayAttendance.checkIn), 'HH:mm')
                        : '--:--'}
                    </p>
                  </div>
                  <div className="text-center p-6 bg-slate-50 rounded-xl">
                    <p className="text-sm text-slate-500 mb-1">퇴근 시간</p>
                    <p className="text-2xl font-bold text-slate-900">
                      {todayAttendance?.checkOut
                        ? format(new Date(todayAttendance.checkOut), 'HH:mm')
                        : '--:--'}
                    </p>
                  </div>
                  <div className="text-center p-6 bg-lime-50 rounded-xl">
                    <p className="text-sm text-lime-600 mb-1">총 근무시간</p>
                    <p className="text-2xl font-bold text-lime-700">
                      {getWorkedTime()}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* 근태이력 탭 - AttendanceTab 컴포넌트 사용 (수정 요청 기능 포함) */}
          <TabsContent value="history" className="mt-4">
            <AttendanceTab userId={user?.uid || ''} workspaceId={currentWorkspace?.id || ''} isAdmin={false} />
          </TabsContent>

          {/* 휴가 탭 */}
          <TabsContent value="leave" className="mt-4">
            <LeaveTab userId={user?.uid || ''} workspaceId={currentWorkspace?.id || ''} isAdmin={false} />
          </TabsContent>

          {/* 인사기록 탭 */}
          <TabsContent value="profile" className="mt-4">
            <ProfileTab userId={user?.uid || ''} workspaceId={currentWorkspace?.id || ''} isAdmin={false} />
          </TabsContent>

          {/* 급여 탭 */}
          <TabsContent value="payroll" className="mt-4">
            <PayrollTab userId={user?.uid || ''} workspaceId={currentWorkspace?.id || ''} isAdmin={false} />
          </TabsContent>

          {/* 평가 탭 */}
          <TabsContent value="evaluation" className="mt-4">
            <EvaluationTab userId={user?.uid || ''} workspaceId={currentWorkspace?.id || ''} isAdmin={false} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
