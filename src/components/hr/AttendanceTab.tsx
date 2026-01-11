'use client'
const isDev = process.env.NODE_ENV === 'development'

import React, { useState, useEffect, useCallback, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import {
  Clock, Calendar, Coffee, CheckCircle, XCircle, AlertCircle,
  MapPin, Loader2, Home, Wifi, Timer, Building2, Play, Square, History, RotateCcw, Edit3
} from 'lucide-react'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from 'react-hot-toast'
import { WorkSettings } from '@/types/hr'

// Storyboard Design Colors
// Primary accent: lime-400 (#a3e635)
// Active state: bg-black text-lime-400
// Cards: bg-white/60 backdrop-blur-xl border-white/40 rounded-3xl
// Status icons: lime-100/lime-600, slate-100/slate-500, orange-100/orange-500, purple-100/purple-500

interface AttendanceTabProps {
  userId: string
  workspaceId: string
  isAdmin: boolean
}

// API request options with workspace header
const getApiOptions = (workspaceId: string, userId: string) => ({
  headers: {
    'x-user-id': userId,
    'x-workspace-id': workspaceId,
  },
})

interface AttendanceRecord {
  id: string
  date: string
  checkIn: string | null
  checkOut: string | null
  workLocation: 'OFFICE' | 'REMOTE'
  status: string
  totalMinutes: number
  note?: string | null
  createdAt?: string
  updatedAt?: string
}

export default function AttendanceTab({ userId, workspaceId, isAdmin }: AttendanceTabProps) {
  const [loading, setLoading] = useState(true)
  const [todayAttendance, setTodayAttendance] = useState<any>(null)
  const [attendanceHistory, setAttendanceHistory] = useState<AttendanceRecord[]>([])
  const [workLocation, setWorkLocation] = useState<'OFFICE' | 'REMOTE'>('OFFICE')
  const [userIP, setUserIP] = useState('')
  const [isOfficeIP, setIsOfficeIP] = useState(false)
  const [isPresenceCheckOpen, setIsPresenceCheckOpen] = useState(false)
  const [selectedRecord, setSelectedRecord] = useState<AttendanceRecord | null>(null)
  const [isChangeRequestOpen, setIsChangeRequestOpen] = useState(false)
  const [changeRequestForm, setChangeRequestForm] = useState({
    requestType: 'CHECK_IN' as 'CHECK_IN' | 'CHECK_OUT' | 'BOTH',
    requestedTime: '',
    reason: '',
  })
  const [changeRequestLoading, setChangeRequestLoading] = useState(false)
  const [settings, setSettings] = useState<WorkSettings>({
    type: 'FIXED',
    dailyRequiredMinutes: 480,
    workStartTime: '09:00',
    workEndTime: '18:00',
    coreTimeStart: '11:00',
    coreTimeEnd: '16:00',
    presenceCheckEnabled: true,
    presenceIntervalMinutes: 90,
    officeIpWhitelist: []
  })

  useEffect(() => {
    loadData()
  }, [userId, workspaceId])

  // Presence Check 타이머
  useEffect(() => {
    if (!settings.presenceCheckEnabled || !todayAttendance?.checkIn || todayAttendance?.checkOut) return
    if (todayAttendance?.workLocation !== 'remote' && todayAttendance?.workLocation !== 'REMOTE') return

    const intervalMs = settings.presenceIntervalMinutes * 60 * 1000
    const timer = setInterval(() => setIsPresenceCheckOpen(true), intervalMs)
    return () => clearInterval(timer)
  }, [settings.presenceCheckEnabled, settings.presenceIntervalMinutes, todayAttendance])

  const loadData = async () => {
    setLoading(true)
    try {
      await Promise.all([loadAttendance(), loadSettings(), fetchUserIP()])
    } finally {
      setLoading(false)
    }
  }

  const fetchUserIP = async () => {
    try {
      const res = await fetch('https://api.ipify.org?format=json')
      const data = await res.json()
      setUserIP(data.ip)
      return data.ip
    } catch (e) {
      if (isDev) console.error('Failed to fetch IP:', e)
      return ''
    }
  }

  // IP 기반 자동 근무 위치 감지
  useEffect(() => {
    if (userIP && settings.officeIpWhitelist.length > 0) {
      const isOffice = settings.officeIpWhitelist.includes(userIP)
      setIsOfficeIP(isOffice)
      // 사무실 IP면 자동으로 사무실 선택, 아니면 재택
      setWorkLocation(isOffice ? 'OFFICE' : 'REMOTE')
    }
  }, [userIP, settings.officeIpWhitelist])

  const loadSettings = async () => {
    try {
      const res = await fetch('/api/attendance/settings', {
        headers: { 'x-user-id': userId, 'x-workspace-id': workspaceId }
      })
      if (res.ok) {
        const data = await res.json()
        setSettings({
          type: data.type || 'FIXED',
          dailyRequiredMinutes: data.dailyRequiredMinutes || 480,
          workStartTime: data.workStartTime || '09:00',
          workEndTime: data.workEndTime || '18:00',
          coreTimeStart: data.coreTimeStart || '11:00',
          coreTimeEnd: data.coreTimeEnd || '16:00',
          presenceCheckEnabled: data.presenceCheckEnabled ?? true,
          presenceIntervalMinutes: data.presenceIntervalMinutes || 90,
          officeIpWhitelist: data.officeIpWhitelist || []
        })
      }
    } catch (e) {
      if (isDev) console.error('Failed to load settings:', e)
    }
  }

  const loadAttendance = async () => {
    try {
      // Include workspaceId in query params for proper filtering
      const res = await fetch(`/api/attendance?workspaceId=${workspaceId}`, {
        headers: { 'x-user-id': userId, 'x-workspace-id': workspaceId }
      })
      if (res.ok) {
        const data = await res.json()
        setTodayAttendance(data.today)
        setAttendanceHistory(data.history || [])
      }
    } catch (e) {
      if (isDev) console.error('Failed to load attendance:', e)
    }
  }

  const handleCheckIn = async () => {
    // 사무실 IP인데 사무실 선택 안 한 경우 (재택 선택 시도) - 차단
    if (isOfficeIP && workLocation === 'REMOTE') {
      toast.error('사무실 IP에서는 재택근무를 선택할 수 없습니다.')
      return
    }
    // 사무실 선택했는데 사무실 IP가 아닌 경우 - 차단
    if (workLocation === 'OFFICE' && !isOfficeIP && settings.officeIpWhitelist.length > 0) {
      toast.error('회사 IP가 아닙니다. 재택근무로 전환해주세요.')
      return
    }
    try {
      const res = await fetch('/api/attendance/checkin', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': userId,
          'x-workspace-id': workspaceId
        },
        body: JSON.stringify({ workLocation, ipAddress: userIP, workspaceId })
      })
      const data = await res.json()
      if (res.ok) {
        toast.success('출근이 기록되었습니다')
        // Use API response directly to avoid race condition with cache
        setTodayAttendance(data)
      } else {
        toast.error(data.error || '출근 기록 실패')
        // 에러 시에도 서버 상태와 동기화
        await loadAttendance()
      }
    } catch (e) {
      toast.error('출근 기록 중 오류가 발생했습니다')
      // 네트워크 에러 시에도 서버 상태 확인
      await loadAttendance()
    }
  }

  // 이어서 근무 시작 (퇴근 후 다른 장소에서 다시 출근)
  const handleResumeWork = async () => {
    // 사무실 IP인데 재택 선택 시도 - 차단
    if (isOfficeIP && workLocation === 'REMOTE') {
      toast.error('사무실 IP에서는 재택근무를 선택할 수 없습니다.')
      return
    }
    // 사무실 선택했는데 사무실 IP가 아닌 경우 - 차단
    if (workLocation === 'OFFICE' && !isOfficeIP && settings.officeIpWhitelist.length > 0) {
      toast.error('회사 IP가 아닙니다. 재택근무로 전환해주세요.')
      return
    }
    try {
      const res = await fetch('/api/attendance/checkin', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': userId,
          'x-workspace-id': workspaceId
        },
        body: JSON.stringify({
          workLocation,
          ipAddress: userIP,
          workspaceId,
          isResume: true  // 이어서 근무 플래그
        })
      })
      const data = await res.json()
      if (res.ok) {
        toast.success(`${workLocation === 'OFFICE' ? '사무실' : '재택'}에서 근무를 다시 시작합니다`)
        // Use API response directly to avoid race condition with cache
        setTodayAttendance(data)
      } else {
        toast.error(data.error || '근무 재시작 실패')
        // 에러 시에도 서버 상태와 동기화
        await loadAttendance()
      }
    } catch (e) {
      toast.error('근무 재시작 중 오류가 발생했습니다')
      // 네트워크 에러 시에도 서버 상태 확인
      await loadAttendance()
    }
  }

  const handleCheckOut = async () => {
    try {
      const res = await fetch('/api/attendance/checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': userId,
          'x-workspace-id': workspaceId
        },
        body: JSON.stringify({ workspaceId })
      })
      const data = await res.json()
      if (res.ok) {
        toast.success('퇴근이 기록되었습니다')
        // Use API response directly to avoid race condition with cache
        setTodayAttendance(data)
      } else {
        toast.error(data.error || '퇴근 기록 실패')
        // 에러 시에도 서버 상태와 동기화
        await loadAttendance()
      }
    } catch (e) {
      toast.error('퇴근 기록 중 오류가 발생했습니다')
      // 네트워크 에러 시에도 서버 상태 확인
      await loadAttendance()
    }
  }

  const handlePresenceConfirm = async () => {
    try {
      await fetch('/api/attendance/presence-check', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': userId,
          'x-workspace-id': workspaceId
        },
        body: JSON.stringify({ status: 'confirmed' })
      })
      setIsPresenceCheckOpen(false)
      toast.success('근무 확인 완료')
    } catch (e) {
      if (isDev) console.error('Presence check failed:', e)
    }
  }

  // 시간 변경 요청 모달 열기
  const openChangeRequestModal = (record: AttendanceRecord) => {
    // 요청 날짜의 기존 시간으로 초기값 설정
    const date = record.date
    const existingTime = record.checkIn
      ? new Date(record.checkIn).toTimeString().slice(0, 5)
      : '09:00'
    setChangeRequestForm({
      requestType: 'CHECK_IN',
      requestedTime: `${date}T${existingTime}`,
      reason: '',
    })
    setIsChangeRequestOpen(true)
  }

  // 시간 변경 요청 제출
  const handleSubmitChangeRequest = async () => {
    if (!selectedRecord) return
    if (!changeRequestForm.reason || changeRequestForm.reason.trim().length < 5) {
      toast.error('변경 사유를 5자 이상 입력해주세요')
      return
    }
    if (!changeRequestForm.requestedTime) {
      toast.error('변경할 시간을 선택해주세요')
      return
    }

    setChangeRequestLoading(true)
    try {
      const res = await fetch('/api/attendance/change-request', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': userId,
          'x-workspace-id': workspaceId,
        },
        body: JSON.stringify({
          attendanceId: selectedRecord.id,
          requestType: changeRequestForm.requestType,
          requestedTime: new Date(changeRequestForm.requestedTime).toISOString(),
          reason: changeRequestForm.reason.trim(),
          workspaceId,
        }),
      })

      if (res.ok) {
        toast.success('시간 변경 요청이 제출되었습니다')
        setIsChangeRequestOpen(false)
        setSelectedRecord(null)
        setChangeRequestForm({ requestType: 'CHECK_IN', requestedTime: '', reason: '' })
      } else {
        const err = await res.json()
        toast.error(err.error || '시간 변경 요청 실패')
      }
    } catch (e) {
      if (isDev) console.error('Change request failed:', e)
      toast.error('시간 변경 요청 중 오류가 발생했습니다')
    } finally {
      setChangeRequestLoading(false)
    }
  }

  // Memoized formatTime function
  const formatTime = useCallback((time: string | null) => {
    if (!time) return '--:--'
    return new Date(time).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })
  }, [])

  // Memoized status variants
  const statusVariants = useMemo(() => ({
    present: { color: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30', text: '출근' },
    PRESENT: { color: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30', text: '출근' },
    late: { color: 'bg-amber-500/20 text-amber-400 border-amber-500/30', text: '지각' },
    LATE: { color: 'bg-amber-500/20 text-amber-400 border-amber-500/30', text: '지각' },
    absent: { color: 'bg-rose-500/20 text-rose-400 border-rose-500/30', text: '결근' },
    ABSENT: { color: 'bg-rose-500/20 text-rose-400 border-rose-500/30', text: '결근' }
  }), [])

  const getStatusBadge = useCallback((status: string) => {
    const v = statusVariants[status as keyof typeof statusVariants] || { color: 'bg-slate-500/20 text-slate-400 border-slate-500/30', text: status }
    return <Badge className={`${v.color} border`}>{v.text}</Badge>
  }, [statusVariants])

  const isWorking = todayAttendance?.checkIn && !todayAttendance?.checkOut
  const isWorkCompleted = todayAttendance?.checkIn && todayAttendance?.checkOut

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-lime-400" />
      </div>
    )
  }

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Status Cards Grid - 4 columns (Storyboard Design) */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* 출근 시간 - lime-100/lime-600 */}
        <Card className="bg-white/60 backdrop-blur-xl border-white/40 shadow-sm rounded-3xl overflow-hidden">
          <CardContent className="p-6 flex flex-col items-center text-center gap-2">
            <div className="w-10 h-10 rounded-full bg-lime-100 flex items-center justify-center text-lime-600 mb-1">
              <Coffee className="w-5 h-5" />
            </div>
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">출근 시간</span>
            <span className="text-2xl font-bold text-slate-900">{formatTime(todayAttendance?.checkIn)}</span>
          </CardContent>
        </Card>

        {/* 퇴근 시간 - slate-100/slate-500 */}
        <Card className="bg-white/60 backdrop-blur-xl border-white/40 shadow-sm rounded-3xl overflow-hidden">
          <CardContent className="p-6 flex flex-col items-center text-center gap-2">
            <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 mb-1">
              <History className="w-5 h-5" />
            </div>
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">퇴근 시간</span>
            <span className="text-2xl font-bold text-slate-900">{formatTime(todayAttendance?.checkOut)}</span>
          </CardContent>
        </Card>

        {/* 근무 시간 - orange-100/orange-500 */}
        <Card className="bg-white/60 backdrop-blur-xl border-white/40 shadow-sm rounded-3xl overflow-hidden">
          <CardContent className="p-6 flex flex-col items-center text-center gap-2">
            <div className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center text-orange-500 mb-1">
              <Clock className="w-5 h-5" />
            </div>
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">근무 시간</span>
            <span className="text-2xl font-bold text-slate-900">
              {todayAttendance?.totalMinutes
                ? `${Math.floor(todayAttendance.totalMinutes / 60)}h ${todayAttendance.totalMinutes % 60}m`
                : '0h 0m'}
            </span>
          </CardContent>
        </Card>

        {/* 근무 위치 - purple-100/purple-500 */}
        <Card className="bg-white/60 backdrop-blur-xl border-white/40 shadow-sm rounded-3xl overflow-hidden">
          <CardContent className="p-6 flex flex-col items-center text-center gap-2">
            <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center text-purple-500 mb-1">
              <MapPin className="w-5 h-5" />
            </div>
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">근무 위치</span>
            <span className="text-lg font-bold text-slate-900 truncate w-full">
              {todayAttendance?.workLocation === 'REMOTE' || todayAttendance?.workLocation === 'remote'
                ? '재택 근무'
                : todayAttendance?.checkIn
                  ? '사무실'
                  : '서울 강남구'}
            </span>
          </CardContent>
        </Card>
      </div>

      {/* Control Section (Storyboard Design) */}
      <Card className="bg-white/70 backdrop-blur-2xl border-white/50 shadow-lg shadow-slate-200/40 rounded-[2.5rem] overflow-hidden">
        <CardContent className="p-8 md:p-10">
          <div className="space-y-8 flex flex-col items-center">
            {/* Work Type Selector */}
            <div className="space-y-4 w-full max-w-2xl">
              <div className="flex items-center justify-center">
                <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider text-center">근무 형태 선택</h3>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <button
                  onClick={() => setWorkLocation('OFFICE')}
                  disabled={isWorking || (isOfficeIP === false && settings.officeIpWhitelist.length > 0)}
                  className={`relative group flex items-center p-4 rounded-2xl border-2 transition-all duration-300 ${
                    workLocation === 'OFFICE'
                      ? 'bg-black border-black text-lime-400 shadow-xl shadow-lime-400/10 scale-[1.02]'
                      : 'bg-white border-slate-100 text-slate-500 hover:border-slate-200 hover:bg-slate-50'
                  } ${isWorking || (isOfficeIP === false && settings.officeIpWhitelist.length > 0) ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center mr-4 transition-colors ${
                    workLocation === 'OFFICE' ? 'bg-lime-400 text-black' : 'bg-slate-100 text-slate-400'
                  }`}>
                    <Building2 className="w-6 h-6" />
                  </div>
                  <div className="text-left">
                    <div className={`font-bold text-lg ${workLocation === 'OFFICE' ? 'text-white' : 'text-slate-900'}`}>사무실 출근</div>
                    <div className={`text-xs ${workLocation === 'OFFICE' ? 'text-lime-400/60' : 'text-slate-400'}`}>
                      {isOfficeIP ? '✓ 사무실 IP 감지됨' : '오피스 근무'}
                    </div>
                  </div>
                  {workLocation === 'OFFICE' && (
                    <div className="absolute top-4 right-4 w-3 h-3 bg-lime-400 rounded-full shadow-[0_0_10px_rgba(163,230,53,0.8)] animate-pulse" />
                  )}
                </button>

                <button
                  onClick={() => setWorkLocation('REMOTE')}
                  disabled={isWorking || isOfficeIP}
                  className={`relative group flex items-center p-4 rounded-2xl border-2 transition-all duration-300 ${
                    workLocation === 'REMOTE'
                      ? 'bg-black border-black text-lime-400 shadow-xl shadow-lime-400/10 scale-[1.02]'
                      : 'bg-white border-slate-100 text-slate-500 hover:border-slate-200 hover:bg-slate-50'
                  } ${isWorking || isOfficeIP ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center mr-4 transition-colors ${
                    workLocation === 'REMOTE' ? 'bg-lime-400 text-black' : 'bg-slate-100 text-slate-400'
                  }`}>
                    <Wifi className="w-6 h-6" />
                  </div>
                  <div className="text-left">
                    <div className={`font-bold text-lg ${workLocation === 'REMOTE' ? 'text-white' : 'text-slate-900'}`}>재택 근무</div>
                    <div className={`text-xs ${workLocation === 'REMOTE' ? 'text-lime-400/60' : 'text-slate-400'}`}>
                      {isOfficeIP ? '사무실 IP에서 선택 불가' : '원격 근무'}
                    </div>
                  </div>
                  {workLocation === 'REMOTE' && (
                    <div className="absolute top-4 right-4 w-3 h-3 bg-lime-400 rounded-full shadow-[0_0_10px_rgba(163,230,53,0.8)] animate-pulse" />
                  )}
                </button>
              </div>
            </div>

            {/* Action Buttons (Storyboard: lime-400 for check-in, black for check-out) */}
            <div className="flex items-center justify-center gap-6 pt-4 w-full">
              <button
                onClick={handleCheckIn}
                disabled={!!todayAttendance?.checkIn}
                className={`group relative flex flex-col items-center justify-center w-32 h-32 rounded-full transition-all duration-500 ${
                  todayAttendance?.checkIn
                    ? 'bg-slate-100 text-slate-300 cursor-not-allowed scale-95 opacity-50'
                    : 'bg-lime-400 text-black shadow-[0_10px_40px_-10px_rgba(163,230,53,0.6)] hover:scale-105 hover:shadow-[0_20px_50px_-10px_rgba(163,230,53,0.8)]'
                }`}
              >
                <Play className="w-10 h-10 mb-2 fill-current" />
                <span className="font-bold text-sm">출근</span>
              </button>

              <button
                onClick={handleCheckOut}
                disabled={!isWorking}
                className={`group relative flex flex-col items-center justify-center w-32 h-32 rounded-full transition-all duration-500 ${
                  !isWorking
                    ? 'bg-slate-100 text-slate-300 cursor-not-allowed scale-95 opacity-50'
                    : 'bg-black text-white shadow-[0_10px_40px_-10px_rgba(0,0,0,0.3)] hover:scale-105 hover:shadow-[0_20px_50px_-10px_rgba(0,0,0,0.5)] hover:bg-slate-900'
                }`}
              >
                <Square className="w-10 h-10 mb-2 fill-current" />
                <span className="font-bold text-sm">퇴근</span>
              </button>
            </div>

            {/* 이어서 근무 버튼 (퇴근 후 다른 장소에서 근무 재개) */}
            {isWorkCompleted && (
              <div className="flex flex-col items-center gap-4">
                <div className="flex items-center gap-2 text-lime-600 bg-lime-100 px-6 py-3 rounded-full border border-lime-200">
                  <CheckCircle className="w-5 h-5" />
                  <span className="font-medium">근무 중단됨</span>
                </div>
                <button
                  onClick={handleResumeWork}
                  className="group relative flex items-center gap-3 px-8 py-4 rounded-2xl bg-gradient-to-r from-blue-500 to-indigo-600 text-white shadow-lg shadow-blue-500/30 hover:shadow-xl hover:shadow-blue-500/40 hover:scale-105 transition-all duration-300"
                >
                  <RotateCcw className="w-5 h-5" />
                  <span className="font-bold">이어서 근무하기</span>
                  <span className="text-xs text-blue-200">({workLocation === 'OFFICE' ? '사무실' : '재택'})</span>
                </button>
                <p className="text-xs text-slate-400">다른 장소에서 근무를 이어서 할 수 있습니다</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Recent Records (Storyboard Design) */}
      <div className="space-y-4">
        <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider px-1">최근 출근 기록</h3>
        <Card className="bg-white/60 backdrop-blur-md border-white/40 shadow-sm rounded-3xl overflow-hidden">
          {attendanceHistory.length === 0 ? (
            <div className="p-12 flex flex-col items-center justify-center text-slate-400 gap-3">
              <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mb-2">
                <History className="w-8 h-8 opacity-50" />
              </div>
              <p className="text-sm font-medium">최근 출근 기록이 없습니다.</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {attendanceHistory.slice(0, 10).map((record) => (
                <div
                  key={record.id}
                  onClick={() => setSelectedRecord(record)}
                  className="flex items-center justify-between p-4 hover:bg-white/50 transition-colors cursor-pointer group"
                >
                  <div className="flex items-center gap-4">
                    <span className="text-slate-700 font-medium min-w-[100px]">{record.date}</span>
                    {getStatusBadge(record.status)}
                    <Badge variant="outline" className="text-xs border-slate-200 text-slate-500">
                      {record.workLocation === 'REMOTE' ? '재택' : '사무실'}
                    </Badge>
                    {record.note && (
                      <span className="text-xs text-slate-400 max-w-[200px] truncate hidden sm:inline" title={record.note}>
                        {record.note}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-6 text-sm">
                    <span className="text-slate-500">
                      출근: <span className="text-slate-700 font-medium">{formatTime(record.checkIn)}</span>
                    </span>
                    <span className="text-slate-500">
                      퇴근: <span className="text-slate-700 font-medium">{formatTime(record.checkOut)}</span>
                    </span>
                    <span className="text-slate-500">
                      근무: <span className="text-lime-600 font-bold">
                        {record.totalMinutes
                          ? `${Math.floor(record.totalMinutes / 60)}h ${record.totalMinutes % 60}m`
                          : '-'}
                      </span>
                    </span>
                    <svg className="w-4 h-4 text-slate-300 group-hover:text-slate-500 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      {/* Presence Check Modal (Storyboard Design) */}
      <Dialog open={isPresenceCheckOpen} onOpenChange={setIsPresenceCheckOpen}>
        <DialogContent className="bg-white border-slate-200 rounded-3xl shadow-xl">
          <DialogHeader>
            <DialogTitle className="text-slate-900 flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-amber-500" />
              근무 확인
            </DialogTitle>
          </DialogHeader>
          <p className="text-slate-600">현재 근무 중이신가요? 확인 버튼을 눌러주세요.</p>
          <DialogFooter>
            <Button onClick={handlePresenceConfirm} className="w-full bg-black hover:bg-slate-900 text-lime-400 font-bold rounded-xl">
              근무 확인
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Attendance Detail Modal */}
      <Dialog open={!!selectedRecord} onOpenChange={() => setSelectedRecord(null)}>
        <DialogContent className="bg-white border-slate-200 rounded-3xl shadow-xl max-w-md">
          <DialogHeader>
            <DialogTitle className="text-slate-900 flex items-center gap-2">
              <Calendar className="w-5 h-5 text-lime-500" />
              출근 기록 상세
            </DialogTitle>
          </DialogHeader>
          {selectedRecord && (
            <div className="space-y-4">
              <div className="flex items-center justify-between py-2 border-b border-slate-100">
                <span className="text-slate-500">날짜</span>
                <span className="text-slate-900 font-medium">{selectedRecord.date}</span>
              </div>
              <div className="flex items-center justify-between py-2 border-b border-slate-100">
                <span className="text-slate-500">상태</span>
                {getStatusBadge(selectedRecord.status)}
              </div>
              <div className="flex items-center justify-between py-2 border-b border-slate-100">
                <span className="text-slate-500">근무 형태</span>
                <Badge variant="outline" className="text-xs border-slate-200">
                  {selectedRecord.workLocation === 'REMOTE' ? '재택근무' : '사무실 근무'}
                </Badge>
              </div>
              <div className="flex items-center justify-between py-2 border-b border-slate-100">
                <span className="text-slate-500">출근 시간</span>
                <span className="text-slate-900 font-medium">{formatTime(selectedRecord.checkIn) || '-'}</span>
              </div>
              <div className="flex items-center justify-between py-2 border-b border-slate-100">
                <span className="text-slate-500">퇴근 시간</span>
                <span className="text-slate-900 font-medium">{formatTime(selectedRecord.checkOut) || '-'}</span>
              </div>
              <div className="flex items-center justify-between py-2 border-b border-slate-100">
                <span className="text-slate-500">총 근무 시간</span>
                <span className="text-lime-600 font-bold">
                  {selectedRecord.totalMinutes
                    ? `${Math.floor(selectedRecord.totalMinutes / 60)}시간 ${selectedRecord.totalMinutes % 60}분`
                    : '-'}
                </span>
              </div>
              {selectedRecord.note && (
                <div className="py-2">
                  <span className="text-slate-500 block mb-2">메모</span>
                  <div className="bg-slate-50 rounded-xl p-3 text-sm text-slate-700">
                    {selectedRecord.note}
                  </div>
                </div>
              )}
              {selectedRecord.createdAt && (
                <div className="text-xs text-slate-400 text-center pt-2">
                  기록 생성: {new Date(selectedRecord.createdAt).toLocaleString('ko-KR')}
                </div>
              )}
            </div>
          )}
          <DialogFooter className="flex gap-2">
            <Button
              onClick={() => openChangeRequestModal(selectedRecord!)}
              className="flex-1 bg-amber-500 hover:bg-amber-600 text-white rounded-xl"
            >
              <Edit3 className="w-4 h-4 mr-2" />
              시간 변경 요청
            </Button>
            <Button
              onClick={() => setSelectedRecord(null)}
              variant="outline"
              className="flex-1 border-slate-200 text-slate-700 rounded-xl"
            >
              닫기
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Time Change Request Modal */}
      <Dialog open={isChangeRequestOpen} onOpenChange={setIsChangeRequestOpen}>
        <DialogContent className="bg-white border-slate-200 rounded-3xl shadow-xl max-w-md">
          <DialogHeader>
            <DialogTitle className="text-slate-900 flex items-center gap-2">
              <Edit3 className="w-5 h-5 text-amber-500" />
              출퇴근 시간 변경 요청
            </DialogTitle>
          </DialogHeader>
          {selectedRecord && (
            <div className="space-y-4">
              <div className="bg-slate-50 rounded-xl p-3 text-sm">
                <p className="text-slate-500">
                  {selectedRecord.date} 기록에 대한 시간 변경을 요청합니다.
                </p>
              </div>

              <div>
                <Label className="text-slate-600">변경 유형</Label>
                <div className="grid grid-cols-3 gap-2 mt-2">
                  {[
                    { value: 'CHECK_IN', label: '출근 시간' },
                    { value: 'CHECK_OUT', label: '퇴근 시간' },
                    { value: 'BOTH', label: '둘 다' },
                  ].map((type) => (
                    <Button
                      key={type.value}
                      variant={changeRequestForm.requestType === type.value ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setChangeRequestForm({ ...changeRequestForm, requestType: type.value as 'CHECK_IN' | 'CHECK_OUT' | 'BOTH' })}
                      className={changeRequestForm.requestType === type.value
                        ? 'bg-black text-lime-400'
                        : 'border-slate-200 text-slate-700'
                      }
                    >
                      {type.label}
                    </Button>
                  ))}
                </div>
              </div>

              <div>
                <Label className="text-slate-600">변경할 시간</Label>
                <Input
                  type="datetime-local"
                  value={changeRequestForm.requestedTime}
                  onChange={(e) => setChangeRequestForm({ ...changeRequestForm, requestedTime: e.target.value })}
                  className="mt-2 bg-slate-50 border-slate-200 text-slate-900 rounded-xl"
                />
              </div>

              <div>
                <Label className="text-slate-600">변경 사유 (필수)</Label>
                <Textarea
                  value={changeRequestForm.reason}
                  onChange={(e) => setChangeRequestForm({ ...changeRequestForm, reason: e.target.value })}
                  placeholder="변경이 필요한 사유를 입력해주세요 (최소 5자)"
                  className="mt-2 bg-slate-50 border-slate-200 text-slate-900 rounded-xl"
                  rows={3}
                />
              </div>

              <div className="text-xs text-slate-400">
                * 변경 요청은 관리자 승인 후 반영됩니다.
              </div>
            </div>
          )}
          <DialogFooter className="flex gap-2">
            <Button
              onClick={() => setIsChangeRequestOpen(false)}
              variant="outline"
              className="flex-1 border-slate-200 text-slate-700 rounded-xl"
              disabled={changeRequestLoading}
            >
              취소
            </Button>
            <Button
              onClick={handleSubmitChangeRequest}
              className="flex-1 bg-amber-500 hover:bg-amber-600 text-white rounded-xl"
              disabled={changeRequestLoading}
            >
              {changeRequestLoading ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <CheckCircle className="w-4 h-4 mr-2" />
              )}
              요청 제출
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  )
}
