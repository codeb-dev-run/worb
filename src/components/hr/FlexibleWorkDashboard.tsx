'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import {
  Clock, Building, Home, Play, Square, RefreshCw,
  Calendar, TrendingUp, Wifi, WifiOff, Check, AlertCircle,
  ChevronRight, Timer, Target
} from 'lucide-react'

interface WorkSession {
  id: string
  sessionType: 'OFFICE_WORK' | 'REMOTE_WORK'
  startTime: string
  endTime?: string
  durationMinutes?: number
  isVerified: boolean
  wifiSSID?: string
}

interface WeeklySummary {
  weekStart: string
  weekEnd: string
  targetMinutes: number
  totalWorkedMinutes: number
  officeMinutes: number
  remoteMinutes: number
  remainingMinutes: number
  isCompleted: boolean
  progressPercent: number
  dailyBreakdown?: Array<{
    date: string
    totalMinutes: number
    officeMinutes: number
    remoteMinutes: number
    status: string
  }>
}

interface FlexibleWorkDashboardProps {
  workspaceId: string
  userId: string
}

export function FlexibleWorkDashboard({ workspaceId, userId }: FlexibleWorkDashboardProps) {
  const [loading, setLoading] = useState(true)
  const [sessions, setSessions] = useState<WorkSession[]>([])
  const [activeSession, setActiveSession] = useState<WorkSession | null>(null)
  const [todaySummary, setTodaySummary] = useState({ totalMinutes: 0, officeMinutes: 0, remoteMinutes: 0 })
  const [weeklySummary, setWeeklySummary] = useState<WeeklySummary | null>(null)
  const [currentWifi, setCurrentWifi] = useState<string | null>(null)
  const [startingSession, setStartingSession] = useState(false)
  const [endingSession, setEndingSession] = useState(false)
  const [elapsedTime, setElapsedTime] = useState(0)

  // 데이터 로드
  const fetchData = useCallback(async () => {
    try {
      setLoading(true)

      // 오늘 세션 조회
      const sessionRes = await fetch(`/api/attendance/session?workspaceId=${workspaceId}`)
      const sessionData = await sessionRes.json()

      setSessions(sessionData.sessions || [])
      setActiveSession(sessionData.activeSession || null)
      setTodaySummary(sessionData.todaySummary || { totalMinutes: 0, officeMinutes: 0, remoteMinutes: 0 })

      // 주간 요약 조회
      const weeklyRes = await fetch(`/api/attendance/weekly?workspaceId=${workspaceId}`)
      const weeklyData = await weeklyRes.json()
      setWeeklySummary(weeklyData.currentWeek || null)
    } catch (error) {
      console.error('Failed to fetch work data:', error)
    } finally {
      setLoading(false)
    }
  }, [workspaceId])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  // 활성 세션 타이머
  useEffect(() => {
    if (!activeSession) {
      setElapsedTime(0)
      return
    }

    const startTime = new Date(activeSession.startTime).getTime()
    const updateElapsed = () => {
      setElapsedTime(Math.floor((Date.now() - startTime) / 1000))
    }

    updateElapsed()
    const interval = setInterval(updateElapsed, 1000)

    return () => clearInterval(interval)
  }, [activeSession])

  // 세션 시작
  const startSession = async (type: 'OFFICE_WORK' | 'REMOTE_WORK') => {
    try {
      setStartingSession(true)

      // 현재 WiFi 정보 가져오기 (브라우저 API 제한으로 사용자 입력 또는 앱에서 전달)
      const wifiSSID = currentWifi || undefined

      const res = await fetch('/api/attendance/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          workspaceId,
          sessionType: type,
          wifiSSID,
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        alert(data.message || '세션 시작에 실패했습니다.')
        return
      }

      await fetchData()
    } catch (error) {
      console.error('Failed to start session:', error)
      alert('세션 시작에 실패했습니다.')
    } finally {
      setStartingSession(false)
    }
  }

  // 세션 종료
  const endSession = async (isCheckout = false) => {
    try {
      setEndingSession(true)

      const res = await fetch('/api/attendance/session/end', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          workspaceId,
          isCheckout,
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        alert(data.message || '세션 종료에 실패했습니다.')
        return
      }

      await fetchData()
    } catch (error) {
      console.error('Failed to end session:', error)
      alert('세션 종료에 실패했습니다.')
    } finally {
      setEndingSession(false)
    }
  }

  // 시간 포맷
  const formatTime = (seconds: number) => {
    const h = Math.floor(seconds / 3600)
    const m = Math.floor((seconds % 3600) / 60)
    const s = seconds % 60
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
  }

  const formatMinutes = (minutes: number) => {
    const h = Math.floor(minutes / 60)
    const m = minutes % 60
    return `${h}시간 ${m}분`
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="w-8 h-8 animate-spin text-slate-400" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* 주간 진행률 카드 */}
      <Card className="border-0 shadow-lg bg-gradient-to-br from-slate-900 to-slate-800 text-white">
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-xl font-bold">이번 주 근무시간</h2>
              <p className="text-slate-400 text-sm">
                {weeklySummary ? (
                  `${new Date(weeklySummary.weekStart).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' })} - ${new Date(weeklySummary.weekEnd).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' })}`
                ) : '-'}
              </p>
            </div>
            <div className="text-right">
              <div className="text-3xl font-bold text-lime-400">
                {weeklySummary ? formatMinutes(weeklySummary.totalWorkedMinutes) : '0시간'}
              </div>
              <div className="text-slate-400 text-sm">
                / {weeklySummary ? formatMinutes(weeklySummary.targetMinutes) : '40시간'}
              </div>
            </div>
          </div>

          <Progress
            value={weeklySummary?.progressPercent || 0}
            className="h-3 bg-slate-700"
          />

          <div className="flex items-center justify-between mt-4 text-sm">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Building className="w-4 h-4 text-lime-400" />
                <span>사무실: {formatMinutes(weeklySummary?.officeMinutes || 0)}</span>
              </div>
              <div className="flex items-center gap-2">
                <Home className="w-4 h-4 text-blue-400" />
                <span>재택: {formatMinutes(weeklySummary?.remoteMinutes || 0)}</span>
              </div>
            </div>
            {weeklySummary && !weeklySummary.isCompleted && (
              <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30">
                <Target className="w-3 h-3 mr-1" />
                {formatMinutes(weeklySummary.remainingMinutes)} 남음
              </Badge>
            )}
            {weeklySummary?.isCompleted && (
              <Badge className="bg-lime-500/20 text-lime-400 border-lime-500/30">
                <Check className="w-3 h-3 mr-1" />
                목표 달성!
              </Badge>
            )}
          </div>
        </CardContent>
      </Card>

      {/* 현재 세션 카드 */}
      <Card className="border-2 border-slate-200">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Timer className="w-5 h-5 text-lime-600" />
            현재 근무 상태
          </CardTitle>
        </CardHeader>
        <CardContent>
          {activeSession ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-lime-50 rounded-xl border border-lime-200">
                <div className="flex items-center gap-3">
                  {activeSession.sessionType === 'OFFICE_WORK' ? (
                    <div className="p-3 bg-lime-100 rounded-xl">
                      <Building className="w-6 h-6 text-lime-600" />
                    </div>
                  ) : (
                    <div className="p-3 bg-blue-100 rounded-xl">
                      <Home className="w-6 h-6 text-blue-600" />
                    </div>
                  )}
                  <div>
                    <div className="font-bold text-lg">
                      {activeSession.sessionType === 'OFFICE_WORK' ? '사무실 근무 중' : '재택 근무 중'}
                    </div>
                    <div className="text-sm text-slate-500">
                      {new Date(activeSession.startTime).toLocaleTimeString('ko-KR', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}에 시작
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-3xl font-mono font-bold text-slate-800">
                    {formatTime(elapsedTime)}
                  </div>
                  {activeSession.isVerified && activeSession.sessionType === 'OFFICE_WORK' && (
                    <Badge className="bg-lime-100 text-lime-700 mt-1">
                      <Wifi className="w-3 h-3 mr-1" />
                      WiFi 인증됨
                    </Badge>
                  )}
                </div>
              </div>

              <div className="flex gap-3">
                {activeSession.sessionType === 'OFFICE_WORK' && (
                  <Button
                    onClick={() => startSession('REMOTE_WORK')}
                    disabled={startingSession}
                    variant="outline"
                    className="flex-1"
                  >
                    <Home className="w-4 h-4 mr-2" />
                    재택으로 전환
                  </Button>
                )}
                {activeSession.sessionType === 'REMOTE_WORK' && (
                  <Button
                    onClick={() => startSession('OFFICE_WORK')}
                    disabled={startingSession}
                    variant="outline"
                    className="flex-1"
                  >
                    <Building className="w-4 h-4 mr-2" />
                    사무실로 전환
                  </Button>
                )}
                <Button
                  onClick={() => endSession(true)}
                  disabled={endingSession}
                  className="flex-1 bg-rose-500 hover:bg-rose-600"
                >
                  <Square className="w-4 h-4 mr-2" />
                  퇴근하기
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="text-center py-6 text-slate-500">
                <Clock className="w-12 h-12 mx-auto mb-3 text-slate-300" />
                <p>현재 활성 근무 세션이 없습니다.</p>
                <p className="text-sm">아래 버튼을 눌러 근무를 시작하세요.</p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Button
                  onClick={() => startSession('OFFICE_WORK')}
                  disabled={startingSession}
                  className="h-16 bg-lime-600 hover:bg-lime-700 text-white"
                >
                  <div className="text-center">
                    <Building className="w-6 h-6 mx-auto mb-1" />
                    <span>사무실 출근</span>
                  </div>
                </Button>
                <Button
                  onClick={() => startSession('REMOTE_WORK')}
                  disabled={startingSession}
                  variant="outline"
                  className="h-16 border-2 border-blue-200 text-blue-600 hover:bg-blue-50"
                >
                  <div className="text-center">
                    <Home className="w-6 h-6 mx-auto mb-1" />
                    <span>재택 근무</span>
                  </div>
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 오늘 근무 요약 */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Calendar className="w-5 h-5 text-lime-600" />
            오늘 근무 요약
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center p-4 bg-slate-50 rounded-xl">
              <div className="text-2xl font-bold text-slate-800">
                {formatMinutes(todaySummary.totalMinutes + (activeSession ? Math.floor(elapsedTime / 60) : 0))}
              </div>
              <div className="text-sm text-slate-500">총 근무</div>
            </div>
            <div className="text-center p-4 bg-lime-50 rounded-xl">
              <div className="text-2xl font-bold text-lime-600">
                {formatMinutes(todaySummary.officeMinutes + (activeSession?.sessionType === 'OFFICE_WORK' ? Math.floor(elapsedTime / 60) : 0))}
              </div>
              <div className="text-sm text-slate-500">사무실</div>
            </div>
            <div className="text-center p-4 bg-blue-50 rounded-xl">
              <div className="text-2xl font-bold text-blue-600">
                {formatMinutes(todaySummary.remoteMinutes + (activeSession?.sessionType === 'REMOTE_WORK' ? Math.floor(elapsedTime / 60) : 0))}
              </div>
              <div className="text-sm text-slate-500">재택</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 오늘 세션 히스토리 */}
      {sessions.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <TrendingUp className="w-5 h-5 text-lime-600" />
              오늘 근무 기록
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {sessions.map((session, index) => (
                <div
                  key={session.id}
                  className={`flex items-center justify-between p-3 rounded-xl border ${
                    !session.endTime ? 'bg-lime-50 border-lime-200' : 'bg-white border-slate-200'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${
                      session.sessionType === 'OFFICE_WORK' ? 'bg-lime-100' : 'bg-blue-100'
                    }`}>
                      {session.sessionType === 'OFFICE_WORK' ? (
                        <Building className="w-4 h-4 text-lime-600" />
                      ) : (
                        <Home className="w-4 h-4 text-blue-600" />
                      )}
                    </div>
                    <div>
                      <div className="font-medium text-sm">
                        {session.sessionType === 'OFFICE_WORK' ? '사무실' : '재택'}
                      </div>
                      <div className="text-xs text-slate-500">
                        {new Date(session.startTime).toLocaleTimeString('ko-KR', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                        {session.endTime && (
                          <> - {new Date(session.endTime).toLocaleTimeString('ko-KR', {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}</>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {session.isVerified && session.sessionType === 'OFFICE_WORK' && (
                      <Badge variant="outline" className="text-xs border-lime-300 text-lime-600">
                        <Wifi className="w-3 h-3 mr-1" />
                        인증
                      </Badge>
                    )}
                    <div className="text-sm font-medium text-slate-700">
                      {session.endTime ? formatMinutes(session.durationMinutes || 0) : (
                        <Badge className="bg-lime-500 text-white animate-pulse">
                          진행 중
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
