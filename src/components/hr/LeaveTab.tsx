'use client'
const isDev = process.env.NODE_ENV === 'development'

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  CalendarDays, Calendar, Plus, Loader2, CheckCircle,
  XCircle, Clock, Umbrella, Heart, Baby, Briefcase, X
} from 'lucide-react'
import { toast } from 'react-hot-toast'
import { LeaveRequest, LeaveBalance } from '@/types/hr'
import AdminLeaveManagement from './AdminLeaveManagement'

interface LeaveTabProps {
  userId: string
  workspaceId: string
  isAdmin: boolean
}

const leaveTypes = [
  { value: 'annual', label: '연차', icon: CalendarDays },
  { value: 'sick', label: '병가', icon: Heart },
  { value: 'half_am', label: '오전 반차', icon: Clock },
  { value: 'half_pm', label: '오후 반차', icon: Clock },
  { value: 'special', label: '특별휴가', icon: Umbrella },
  { value: 'maternity', label: '출산휴가', icon: Baby },
  { value: 'childcare', label: '육아휴직', icon: Baby },
  { value: 'official', label: '공가', icon: Briefcase }
]

export default function LeaveTab({ userId, workspaceId, isAdmin }: LeaveTabProps) {
  const [loading, setLoading] = useState(true)
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>([])
  const [leaveBalance, setLeaveBalance] = useState<LeaveBalance | null>(null)
  const [isRequestModalOpen, setIsRequestModalOpen] = useState(false)
  const [requestForm, setRequestForm] = useState({
    type: 'annual',
    startDate: '',
    endDate: '',
    reason: ''
  })
  useEffect(() => {
    loadLeaveData()
  }, [userId, workspaceId])

  const loadLeaveData = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/leave', {
        headers: { 'x-user-id': userId, 'x-workspace-id': workspaceId }
      })
      if (res.ok) {
        const data = await res.json()
        setLeaveRequests(data.requests || [])
        setLeaveBalance(data.balance || {
          annualTotal: 15,
          annualUsed: 0,
          annualRemaining: 15,
          sickTotal: 10,
          sickUsed: 0,
          sickRemaining: 10
        })
      }
    } catch (e) {
      if (isDev) console.error('Failed to load leave data:', e)
      // 기본값 설정
      setLeaveBalance({
        annualTotal: 15,
        annualUsed: 0,
        annualRemaining: 15,
        sickTotal: 10,
        sickUsed: 0,
        sickRemaining: 10
      })
    } finally {
      setLoading(false)
    }
  }

  const handleSubmitRequest = async () => {
    if (!requestForm.startDate) {
      toast.error('시작일을 입력해주세요')
      return
    }
    if (!requestForm.endDate) {
      setRequestForm({ ...requestForm, endDate: requestForm.startDate })
    }

    try {
      const res = await fetch('/api/leave', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': userId,
          'x-workspace-id': workspaceId
        },
        body: JSON.stringify({
          ...requestForm,
          endDate: requestForm.endDate || requestForm.startDate
        })
      })

      if (res.ok) {
        toast.success('휴가 신청이 완료되었습니다')
        setIsRequestModalOpen(false)
        setRequestForm({ type: 'annual', startDate: '', endDate: '', reason: '' })
        loadLeaveData()
      } else {
        const err = await res.json()
        toast.error(err.error || '휴가 신청 실패')
      }
    } catch (e) {
      toast.error('휴가 신청 중 오류가 발생했습니다')
    }
  }

  const getStatusBadge = (status: string) => {
    const map: Record<string, { color: string; text: string }> = {
      pending: { color: 'bg-yellow-100 text-yellow-700', text: '대기중' },
      approved: { color: 'bg-lime-100 text-lime-700', text: '승인' },
      rejected: { color: 'bg-red-100 text-red-700', text: '반려' }
    }
    const v = map[status] || { color: 'bg-slate-100 text-slate-600', text: status }
    return <Badge className={v.color}>{v.text}</Badge>
  }

  const getLeaveTypeLabel = (type: string) => {
    return leaveTypes.find(t => t.value === type)?.label || type
  }

  const canCancelLeave = (request: LeaveRequest) => {
    // 대기중인 휴가는 항상 취소 가능
    if (request.status === 'pending') return true
    // 승인된 휴가는 시작일 전에만 취소 가능
    if (request.status === 'approved') {
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      const startDate = new Date(request.startDate)
      startDate.setHours(0, 0, 0, 0)
      return startDate > today
    }
    return false
  }

  const handleCancelLeave = async (requestId: string) => {
    if (!confirm('휴가 신청을 취소하시겠습니까?')) return

    try {
      const res = await fetch(`/api/leave/${requestId}`, {
        method: 'DELETE',
        headers: {
          'x-user-id': userId,
          'x-workspace-id': workspaceId
        }
      })

      if (res.ok) {
        toast.success('휴가 신청이 취소되었습니다')
        loadLeaveData()
      } else {
        const err = await res.json()
        toast.error(err.error || '휴가 취소 실패')
      }
    } catch (e) {
      toast.error('휴가 취소 중 오류가 발생했습니다')
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-lime-400" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* 휴가 잔여 현황 */}
      <Card className="bg-white/60 backdrop-blur-xl border-white/40 shadow-sm rounded-3xl">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-slate-900 flex items-center gap-2">
            <CalendarDays className="w-5 h-5 text-lime-600" />
            휴가 현황
          </CardTitle>
          <Button onClick={() => setIsRequestModalOpen(true)} className="bg-black text-lime-400 hover:bg-black/90">
            <Plus className="w-4 h-4 mr-2" />
            휴가 신청
          </Button>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* 연차 */}
            <div className="p-4 rounded-xl bg-white/50 border border-white/60">
              <div className="flex items-center gap-2 mb-2">
                <CalendarDays className="w-5 h-5 text-blue-600" />
                <span className="text-slate-600">연차</span>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-bold text-slate-900">{leaveBalance?.annualRemaining || 0}</span>
                <span className="text-slate-500">/ {leaveBalance?.annualTotal || 0}일</span>
              </div>
              <div className="mt-2 h-2 bg-slate-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-blue-500 rounded-full"
                  style={{
                    width: `${((leaveBalance?.annualRemaining || 0) / (leaveBalance?.annualTotal || 1)) * 100}%`
                  }}
                />
              </div>
            </div>

            {/* 병가 */}
            <div className="p-4 rounded-xl bg-white/50 border border-white/60">
              <div className="flex items-center gap-2 mb-2">
                <Heart className="w-5 h-5 text-red-500" />
                <span className="text-slate-600">병가</span>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-bold text-slate-900">{leaveBalance?.sickRemaining || 0}</span>
                <span className="text-slate-500">/ {leaveBalance?.sickTotal || 0}일</span>
              </div>
              <div className="mt-2 h-2 bg-slate-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-red-500 rounded-full"
                  style={{
                    width: `${((leaveBalance?.sickRemaining || 0) / (leaveBalance?.sickTotal || 1)) * 100}%`
                  }}
                />
              </div>
            </div>

            {/* 사용 현황 */}
            <div className="p-4 rounded-xl bg-white/50 border border-white/60">
              <div className="flex items-center gap-2 mb-2">
                <Calendar className="w-5 h-5 text-lime-600" />
                <span className="text-slate-600">올해 사용</span>
              </div>
              <span className="text-3xl font-bold text-slate-900">
                {(leaveBalance?.annualUsed || 0) + (leaveBalance?.sickUsed || 0)}
              </span>
              <span className="text-slate-500 ml-1">일</span>
            </div>

            {/* 대기중 */}
            <div className="p-4 rounded-xl bg-white/50 border border-white/60">
              <div className="flex items-center gap-2 mb-2">
                <Clock className="w-5 h-5 text-yellow-600" />
                <span className="text-slate-600">승인 대기</span>
              </div>
              <span className="text-3xl font-bold text-slate-900">
                {leaveRequests.filter(r => r.status === 'pending').length}
              </span>
              <span className="text-slate-500 ml-1">건</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 관리자: 전체 휴가 신청 관리 */}
      {isAdmin && (
        <AdminLeaveManagement
          workspaceId={workspaceId}
          userId={userId}
          onUpdate={loadLeaveData}
        />
      )}

      {/* 휴가 신청 내역 */}
      <Card className="bg-white/60 backdrop-blur-xl border-white/40 shadow-sm rounded-3xl">
        <CardHeader>
          <CardTitle className="text-slate-900 flex items-center gap-2">
            <Calendar className="w-5 h-5 text-slate-600" />
            휴가 신청 내역
          </CardTitle>
        </CardHeader>
        <CardContent>
          {leaveRequests.length === 0 ? (
            <p className="text-center text-slate-500 py-8">휴가 신청 내역이 없습니다</p>
          ) : (
            <div className="space-y-3">
              {leaveRequests.map(request => (
                <div
                  key={request.id}
                  className="flex items-center justify-between p-4 rounded-xl bg-white/50 border border-white/60"
                >
                  <div className="flex items-center gap-4">
                    <div className="p-2 rounded-xl bg-slate-100">
                      {React.createElement(
                        leaveTypes.find(t => t.value === request.type)?.icon || CalendarDays,
                        { className: 'w-5 h-5 text-slate-600' }
                      )}
                    </div>
                    <div>
                      <p className="text-slate-900 font-medium">{getLeaveTypeLabel(request.type)}</p>
                      <p className="text-slate-600 text-sm">
                        {request.startDate}
                        {request.startDate !== request.endDate && ` ~ ${request.endDate}`}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    {request.reason && (
                      <span className="text-slate-500 text-sm max-w-xs truncate">{request.reason}</span>
                    )}
                    {getStatusBadge(request.status)}
                    {canCancelLeave(request) && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleCancelLeave(request.id)}
                        className="text-red-500 hover:text-red-700 hover:bg-red-50 px-2"
                        title={request.status === 'approved' ? '승인된 휴가 취소 (시작일 전까지만 가능)' : '휴가 신청 취소'}
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* 휴가 신청 모달 */}
      <Dialog open={isRequestModalOpen} onOpenChange={setIsRequestModalOpen}>
        <DialogContent className="bg-white border-slate-200 max-w-lg rounded-3xl">
          <DialogHeader>
            <DialogTitle className="text-slate-900">휴가 신청</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {/* 휴가 유형 */}
            <div>
              <Label className="text-slate-600">휴가 유형</Label>
              <div className="grid grid-cols-2 gap-2 mt-2">
                {leaveTypes.slice(0, 6).map(type => (
                  <Button
                    key={type.value}
                    variant={requestForm.type === type.value ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setRequestForm({ ...requestForm, type: type.value })}
                    className={`justify-start ${requestForm.type === type.value ? 'bg-black text-lime-400' : 'border-slate-200 text-slate-700 hover:bg-slate-50'}`}
                  >
                    <type.icon className="w-4 h-4 mr-2" />
                    {type.label}
                  </Button>
                ))}
              </div>
            </div>

            {/* 날짜 */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-slate-600">시작일</Label>
                <Input
                  type="date"
                  value={requestForm.startDate}
                  onChange={e => setRequestForm({ ...requestForm, startDate: e.target.value })}
                  className="mt-1 bg-slate-50 border-slate-200 text-slate-900"
                />
              </div>
              <div>
                <Label className="text-slate-600">종료일</Label>
                <Input
                  type="date"
                  value={requestForm.endDate}
                  onChange={e => setRequestForm({ ...requestForm, endDate: e.target.value })}
                  min={requestForm.startDate}
                  className="mt-1 bg-slate-50 border-slate-200 text-slate-900"
                />
              </div>
            </div>

            {/* 사유 */}
            <div>
              <Label className="text-slate-600">사유 (선택)</Label>
              <Textarea
                value={requestForm.reason}
                onChange={e => setRequestForm({ ...requestForm, reason: e.target.value })}
                placeholder="휴가 사유를 입력하세요"
                className="mt-1 bg-slate-50 border-slate-200 text-slate-900"
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsRequestModalOpen(false)} className="border-slate-200 text-slate-700 hover:bg-slate-50">취소</Button>
            <Button onClick={handleSubmitRequest} className="bg-black text-lime-400 hover:bg-black/90">신청</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
