'use client'

import React, { useState, useEffect } from 'react'
import { useAuth } from '@/lib/auth-context'
import { useWorkspace } from '@/lib/workspace-context'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Clock, Users, FileText, Plane, BarChart3, Loader2, Star, Lock, Eye, EyeOff
} from 'lucide-react'
import { toast } from 'react-hot-toast'

// 분리된 탭 컴포넌트들
import AttendanceTab from '@/components/hr/AttendanceTab'
import ProfileTab from '@/components/hr/ProfileTab'
import PayrollTab from '@/components/hr/PayrollTab'
import LeaveTab from '@/components/hr/LeaveTab'
import StatsTab from '@/components/hr/StatsTab'
import EvaluationTab from '@/components/hr/EvaluationTab'

type AttendanceTabType = 'attendance' | 'profile' | 'leave' | 'stats' | 'evaluation'

// 직원용 탭 (관리자 기능 제외)
const employeeTabs = [
  { id: 'attendance' as AttendanceTabType, label: '출퇴근', icon: Clock },
  { id: 'profile' as AttendanceTabType, label: '인사기록/연봉', icon: FileText },
  { id: 'leave' as AttendanceTabType, label: '휴가', icon: Plane },
  { id: 'stats' as AttendanceTabType, label: '통계', icon: BarChart3 },
  { id: 'evaluation' as AttendanceTabType, label: '성과평가', icon: Star },
]

export default function AttendancePage() {
  const { user, userProfile } = useAuth()
  const { currentWorkspace, loading: workspaceLoading } = useWorkspace()

  const [activeTab, setActiveTab] = useState<AttendanceTabType>('attendance')
  const [loading, setLoading] = useState(true)
  const [refreshKey, setRefreshKey] = useState(0)

  // 연봉 잠금 상태
  const [isSalaryLocked, setIsSalaryLocked] = useState(true)
  const [salaryPin, setSalaryPin] = useState('')
  const [showPinModal, setShowPinModal] = useState(false)
  const [pinInput, setPinInput] = useState('')
  const [showPin, setShowPin] = useState(false)
  const [isSettingPin, setIsSettingPin] = useState(false)
  const [confirmPin, setConfirmPin] = useState('')

  const userId = userProfile?.uid || user?.uid || ''
  const workspaceId = currentWorkspace?.id || ''

  useEffect(() => {
    if (userId && workspaceId) {
      setLoading(false)
      // 저장된 PIN 확인
      const savedPin = localStorage.getItem(`salary_pin_${userId}`)
      if (savedPin) {
        setSalaryPin(savedPin)
      }
    } else {
      setLoading(false)
    }
  }, [userId, workspaceId])

  // 탭 변경 시 데이터 새로고침
  const handleTabChange = (newTab: AttendanceTabType) => {
    setActiveTab(newTab)
    setRefreshKey(prev => prev + 1)
  }

  // PIN 설정
  const handleSetPin = () => {
    if (pinInput.length < 4) {
      toast.error('PIN은 4자리 이상이어야 합니다')
      return
    }
    if (pinInput !== confirmPin) {
      toast.error('PIN이 일치하지 않습니다')
      return
    }
    localStorage.setItem(`salary_pin_${userId}`, pinInput)
    setSalaryPin(pinInput)
    setIsSalaryLocked(false)
    setShowPinModal(false)
    setPinInput('')
    setConfirmPin('')
    setIsSettingPin(false)
    toast.success('PIN이 설정되었습니다')
  }

  // PIN 확인
  const handleVerifyPin = () => {
    if (pinInput === salaryPin) {
      setIsSalaryLocked(false)
      setShowPinModal(false)
      setPinInput('')
      toast.success('연봉 정보가 해제되었습니다')
    } else {
      toast.error('PIN이 올바르지 않습니다')
    }
  }

  // 연봉 잠금 해제 시도
  const handleUnlockSalary = () => {
    if (!salaryPin) {
      // PIN이 없으면 설정 모드
      setIsSettingPin(true)
    }
    setShowPinModal(true)
  }

  // 다시 잠금
  const handleLockSalary = () => {
    setIsSalaryLocked(true)
    toast.success('연봉 정보가 잠겼습니다')
  }

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
            <p className="text-slate-500">근태 기능을 사용하려면 먼저 로그인해주세요</p>
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
            <p className="text-slate-500">근태 기능을 사용하려면 워크스페이스에 가입해야 합니다</p>
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
      {/* 헤더 */}
      <div className="space-y-1">
        <h2 className="text-sm font-medium text-slate-500">My Workspace</h2>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">근태</h1>
      </div>

      {/* 탭 네비게이션 */}
      <div className="bg-white/60 backdrop-blur-md p-1 rounded-2xl border border-white/40 w-auto inline-flex h-auto shadow-sm">
        {employeeTabs.map(tab => (
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
            {/* 연봉 잠금 표시 */}
            {tab.id === 'profile' && isSalaryLocked && (
              <Lock className="w-3 h-3 text-amber-500" />
            )}
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
            isAdmin={false}
          />
        )}
        {activeTab === 'profile' && (
          <div className="space-y-4">
            {/* 연봉 잠금/해제 버튼 */}
            <div className="flex justify-end">
              {isSalaryLocked ? (
                <Button
                  onClick={handleUnlockSalary}
                  variant="outline"
                  className="border-amber-300 text-amber-600 hover:bg-amber-50"
                >
                  <Lock className="w-4 h-4 mr-2" />
                  연봉 정보 보기 (PIN 입력)
                </Button>
              ) : (
                <Button
                  onClick={handleLockSalary}
                  variant="outline"
                  className="border-slate-300 text-slate-600 hover:bg-slate-50"
                >
                  <Lock className="w-4 h-4 mr-2" />
                  연봉 정보 잠금
                </Button>
              )}
            </div>

            {/* 인사기록 */}
            <ProfileTab
              userId={userId}
              workspaceId={workspaceId}
              isAdmin={false}
            />

            {/* 연봉 (잠금 상태에 따라) */}
            {isSalaryLocked ? (
              <Card className="bg-white/60 backdrop-blur-xl border-white/40 rounded-3xl">
                <CardContent className="p-8 text-center">
                  <Lock className="w-12 h-12 text-amber-400 mx-auto mb-4" />
                  <h3 className="text-lg font-bold text-slate-900 mb-2">연봉 정보 잠금</h3>
                  <p className="text-slate-500 mb-4">
                    연봉 정보는 보안을 위해 잠겨 있습니다.<br/>
                    PIN을 입력하여 확인하세요.
                  </p>
                  <Button
                    onClick={handleUnlockSalary}
                    className="bg-amber-500 hover:bg-amber-600 text-white"
                  >
                    <Eye className="w-4 h-4 mr-2" />
                    연봉 정보 보기
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <PayrollTab
                userId={userId}
                workspaceId={workspaceId}
                isAdmin={false}
              />
            )}
          </div>
        )}
        {activeTab === 'leave' && (
          <LeaveTab
            userId={userId}
            workspaceId={workspaceId}
            isAdmin={false}
          />
        )}
        {activeTab === 'stats' && (
          <StatsTab
            userId={userId}
            workspaceId={workspaceId}
            isAdmin={false}
          />
        )}
        {activeTab === 'evaluation' && (
          <EvaluationTab
            userId={userId}
            workspaceId={workspaceId}
            isAdmin={false}
          />
        )}
      </div>

      {/* PIN 입력 모달 */}
      <Dialog open={showPinModal} onOpenChange={setShowPinModal}>
        <DialogContent className="bg-white border-slate-200 rounded-3xl shadow-xl max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-slate-900 flex items-center gap-2">
              <Lock className="w-5 h-5 text-amber-500" />
              {isSettingPin ? 'PIN 설정' : 'PIN 입력'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {isSettingPin ? (
              <>
                <p className="text-sm text-slate-500">
                  연봉 정보 보호를 위한 PIN을 설정해주세요.
                </p>
                <div>
                  <Label className="text-slate-600">PIN (4자리 이상)</Label>
                  <div className="relative mt-2">
                    <Input
                      type={showPin ? 'text' : 'password'}
                      value={pinInput}
                      onChange={(e) => setPinInput(e.target.value)}
                      placeholder="PIN 입력"
                      className="bg-slate-50 border-slate-200 text-slate-900 rounded-xl pr-10"
                      maxLength={8}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPin(!showPin)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                      {showPin ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
                <div>
                  <Label className="text-slate-600">PIN 확인</Label>
                  <Input
                    type={showPin ? 'text' : 'password'}
                    value={confirmPin}
                    onChange={(e) => setConfirmPin(e.target.value)}
                    placeholder="PIN 다시 입력"
                    className="mt-2 bg-slate-50 border-slate-200 text-slate-900 rounded-xl"
                    maxLength={8}
                  />
                </div>
              </>
            ) : (
              <>
                <p className="text-sm text-slate-500">
                  연봉 정보를 확인하려면 PIN을 입력하세요.
                </p>
                <div>
                  <Label className="text-slate-600">PIN</Label>
                  <div className="relative mt-2">
                    <Input
                      type={showPin ? 'text' : 'password'}
                      value={pinInput}
                      onChange={(e) => setPinInput(e.target.value)}
                      placeholder="PIN 입력"
                      className="bg-slate-50 border-slate-200 text-slate-900 rounded-xl pr-10"
                      maxLength={8}
                      onKeyDown={(e) => e.key === 'Enter' && handleVerifyPin()}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPin(!showPin)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                      {showPin ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
          <DialogFooter className="flex gap-2">
            <Button
              onClick={() => {
                setShowPinModal(false)
                setPinInput('')
                setConfirmPin('')
                setIsSettingPin(false)
              }}
              variant="outline"
              className="flex-1 border-slate-200 text-slate-700 rounded-xl"
            >
              취소
            </Button>
            <Button
              onClick={isSettingPin ? handleSetPin : handleVerifyPin}
              className="flex-1 bg-amber-500 hover:bg-amber-600 text-white rounded-xl"
            >
              {isSettingPin ? 'PIN 설정' : '확인'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
