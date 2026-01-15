'use client'

// ===========================================
// 사원 상세 페이지 - 인사기록, 근태, 휴가, 급여, 평가
// ===========================================

import React, { useState, useEffect, useCallback } from 'react'
import { useParams } from 'next/navigation'
import { useAuth } from '@/lib/auth-context'
import { useWorkspace } from '@/lib/workspace-context'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import {
  User, ChevronLeft, Mail, Phone, Building2, Briefcase,
  Calendar, Loader2, Clock, MapPin, FileText, Award,
  DollarSign, BarChart2, Edit2, Save, X, Wifi
} from 'lucide-react'
import Link from 'next/link'
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isToday } from 'date-fns'
import { ko } from 'date-fns/locale'

type EmployeeTab = 'profile' | 'attendance' | 'leave' | 'payroll' | 'evaluation'

interface EmployeeDetail {
  id: string
  name: string
  email: string
  avatar?: string
  phone?: string
  department?: string
  position?: string
  employeeNumber?: string
  hireDate?: string
  status?: string
  role?: string
  address?: string
  emergencyContact?: string
  emergencyPhone?: string
}

interface AttendanceRecord {
  id: string
  date: string
  checkIn?: string
  checkOut?: string
  workLocation?: 'OFFICE' | 'REMOTE'
  status?: 'PRESENT' | 'LATE' | 'ABSENT' | 'LEAVE'
  workHours?: number
}

interface LeaveRecord {
  id: string
  type: string
  startDate: string
  endDate: string
  days: number
  status: 'PENDING' | 'APPROVED' | 'REJECTED'
  reason?: string
  createdAt: string
}

export default function EmployeeDetailPage() {
  const params = useParams()
  const employeeId = params?.id as string
  const { user } = useAuth()
  const { currentWorkspace, isAdmin } = useWorkspace()

  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<EmployeeTab>('profile')
  const [employee, setEmployee] = useState<EmployeeDetail | null>(null)
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([])
  const [leaveRecords, setLeaveRecords] = useState<LeaveRecord[]>([])
  const [selectedMonth, setSelectedMonth] = useState(new Date())
  const [isEditing, setIsEditing] = useState(false)
  const [editForm, setEditForm] = useState<Partial<EmployeeDetail>>({})

  const workspaceId = currentWorkspace?.id || ''

  // 사원 정보 로드
  const loadEmployeeData = useCallback(async () => {
    if (!workspaceId || !employeeId) return

    try {
      setLoading(true)

      // 기본 사원 정보 로드 (team-attendance API에서)
      const response = await fetch(`/api/hr/team-attendance?workspaceId=${workspaceId}`)
      if (response.ok) {
        const data = await response.json()
        const emp = data.members?.find((m: EmployeeDetail) => m.id === employeeId)
        if (emp) {
          setEmployee(emp)
          setEditForm(emp)
        }
      }

      // 근태 기록 로드
      const attendanceRes = await fetch(
        `/api/hr/attendance?workspaceId=${workspaceId}&userId=${employeeId}&month=${format(selectedMonth, 'yyyy-MM')}`
      )
      if (attendanceRes.ok) {
        const attendanceData = await attendanceRes.json()
        setAttendanceRecords(attendanceData.records || [])
      }

      // 휴가 기록 로드
      const leaveRes = await fetch(
        `/api/hr/leave-requests?workspaceId=${workspaceId}&userId=${employeeId}`
      )
      if (leaveRes.ok) {
        const leaveData = await leaveRes.json()
        setLeaveRecords(leaveData.requests || [])
      }
    } catch (error) {
      console.error('Failed to load employee data:', error)
    } finally {
      setLoading(false)
    }
  }, [workspaceId, employeeId, selectedMonth])

  useEffect(() => {
    loadEmployeeData()
  }, [loadEmployeeData])

  // 프로필 저장
  const handleSaveProfile = async () => {
    // TODO: API 연동
    setIsEditing(false)
    setEmployee(prev => prev ? { ...prev, ...editForm } : null)
  }

  // 탭 목록
  const tabs: { id: EmployeeTab; label: string; icon: React.ReactNode }[] = [
    { id: 'profile', label: '인사기록', icon: <User className="w-4 h-4" /> },
    { id: 'attendance', label: '근태이력', icon: <Clock className="w-4 h-4" /> },
    { id: 'leave', label: '휴가현황', icon: <Calendar className="w-4 h-4" /> },
    { id: 'payroll', label: '급여정보', icon: <DollarSign className="w-4 h-4" /> },
    { id: 'evaluation', label: '성과평가', icon: <Award className="w-4 h-4" /> },
  ]

  // 상태별 색상
  const getStatusStyle = (status: string) => {
    switch (status) {
      case 'PRESENT': return { bg: 'bg-green-100', text: 'text-green-700', label: '정상출근' }
      case 'LATE': return { bg: 'bg-yellow-100', text: 'text-yellow-700', label: '지각' }
      case 'ABSENT': return { bg: 'bg-red-100', text: 'text-red-700', label: '결근' }
      case 'LEAVE': return { bg: 'bg-purple-100', text: 'text-purple-700', label: '휴가' }
      default: return { bg: 'bg-slate-100', text: 'text-slate-600', label: '-' }
    }
  }

  // 휴가 상태별 색상
  const getLeaveStatusStyle = (status: string) => {
    switch (status) {
      case 'APPROVED': return { bg: 'bg-green-100', text: 'text-green-700', label: '승인' }
      case 'PENDING': return { bg: 'bg-yellow-100', text: 'text-yellow-700', label: '대기' }
      case 'REJECTED': return { bg: 'bg-red-100', text: 'text-red-700', label: '반려' }
      default: return { bg: 'bg-slate-100', text: 'text-slate-600', label: '-' }
    }
  }

  // 월간 달력 생성
  const calendarDays = eachDayOfInterval({
    start: startOfMonth(selectedMonth),
    end: endOfMonth(selectedMonth)
  })

  if (!isAdmin) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-4rem)]">
        <Card className="p-8 max-w-md">
          <div className="text-center">
            <User className="w-12 h-12 text-slate-400 mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">접근 권한이 없습니다</h2>
            <p className="text-slate-500">관리자만 접근할 수 있는 페이지입니다.</p>
          </div>
        </Card>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-4rem)]">
        <Loader2 className="w-8 h-8 animate-spin text-lime-500" />
      </div>
    )
  }

  if (!employee) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-4rem)]">
        <Card className="p-8 max-w-md">
          <div className="text-center">
            <User className="w-12 h-12 text-slate-400 mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">사원을 찾을 수 없습니다</h2>
            <p className="text-slate-500 mb-4">요청하신 사원 정보가 존재하지 않습니다.</p>
            <Link href="/hr/employees">
              <Button variant="outline">
                <ChevronLeft className="w-4 h-4 mr-1" />
                팀원 목록으로
              </Button>
            </Link>
          </div>
        </Card>
      </div>
    )
  }

  return (
    <div className="h-full overflow-auto bg-gradient-to-br from-slate-50 to-slate-100 p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* 헤더 */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/hr/employees">
              <Button variant="ghost" size="sm">
                <ChevronLeft className="w-4 h-4 mr-1" />
                팀원 목록
              </Button>
            </Link>
          </div>
        </div>

        {/* 사원 프로필 카드 */}
        <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg">
          <CardContent className="p-6">
            <div className="flex items-start gap-6">
              {/* 아바타 */}
              <div className="w-24 h-24 rounded-2xl bg-lime-100 flex items-center justify-center text-lime-700 text-3xl font-bold flex-shrink-0">
                {employee.avatar ? (
                  <img src={employee.avatar} alt={employee.name} className="w-24 h-24 rounded-2xl object-cover" />
                ) : (
                  employee.name?.charAt(0) || '?'
                )}
              </div>

              {/* 기본 정보 */}
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <h1 className="text-2xl font-bold text-slate-900">{employee.name}</h1>
                  {employee.employeeNumber && (
                    <Badge variant="outline">{employee.employeeNumber}</Badge>
                  )}
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div className="flex items-center gap-2 text-slate-600">
                    <Building2 className="w-4 h-4 text-slate-400" />
                    <span>{employee.department || '-'}</span>
                  </div>
                  <div className="flex items-center gap-2 text-slate-600">
                    <Briefcase className="w-4 h-4 text-slate-400" />
                    <span>{employee.position || '-'}</span>
                  </div>
                  <div className="flex items-center gap-2 text-slate-600">
                    <Mail className="w-4 h-4 text-slate-400" />
                    <span>{employee.email}</span>
                  </div>
                  <div className="flex items-center gap-2 text-slate-600">
                    <Calendar className="w-4 h-4 text-slate-400" />
                    <span>
                      {employee.hireDate
                        ? format(new Date(employee.hireDate), 'yyyy.MM.dd', { locale: ko })
                        : '-'}
                      {' 입사'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 탭 네비게이션 */}
        <div className="flex gap-2 overflow-x-auto pb-2">
          {tabs.map(tab => (
            <Button
              key={tab.id}
              variant={activeTab === tab.id ? 'default' : 'outline'}
              size="sm"
              onClick={() => setActiveTab(tab.id)}
              className={activeTab === tab.id ? 'bg-lime-500 hover:bg-lime-600 text-white' : ''}
            >
              {tab.icon}
              <span className="ml-2">{tab.label}</span>
            </Button>
          ))}
        </div>

        {/* 탭 콘텐츠 */}
        {activeTab === 'profile' && (
          <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <User className="w-5 h-5 text-lime-600" />
                인사기록
              </CardTitle>
              {isEditing ? (
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => setIsEditing(false)}>
                    <X className="w-4 h-4 mr-1" />
                    취소
                  </Button>
                  <Button size="sm" onClick={handleSaveProfile} className="bg-lime-500 hover:bg-lime-600 text-white">
                    <Save className="w-4 h-4 mr-1" />
                    저장
                  </Button>
                </div>
              ) : (
                <Button size="sm" variant="outline" onClick={() => setIsEditing(true)}>
                  <Edit2 className="w-4 h-4 mr-1" />
                  수정
                </Button>
              )}
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="text-sm font-medium text-slate-600">이름</label>
                  {isEditing ? (
                    <Input
                      value={editForm.name || ''}
                      onChange={e => setEditForm({ ...editForm, name: e.target.value })}
                      className="mt-1"
                    />
                  ) : (
                    <p className="mt-1 text-slate-900">{employee.name}</p>
                  )}
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-600">이메일</label>
                  <p className="mt-1 text-slate-900">{employee.email}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-600">전화번호</label>
                  {isEditing ? (
                    <Input
                      value={editForm.phone || ''}
                      onChange={e => setEditForm({ ...editForm, phone: e.target.value })}
                      className="mt-1"
                    />
                  ) : (
                    <p className="mt-1 text-slate-900">{employee.phone || '-'}</p>
                  )}
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-600">부서</label>
                  {isEditing ? (
                    <Input
                      value={editForm.department || ''}
                      onChange={e => setEditForm({ ...editForm, department: e.target.value })}
                      className="mt-1"
                    />
                  ) : (
                    <p className="mt-1 text-slate-900">{employee.department || '-'}</p>
                  )}
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-600">직책</label>
                  {isEditing ? (
                    <Input
                      value={editForm.position || ''}
                      onChange={e => setEditForm({ ...editForm, position: e.target.value })}
                      className="mt-1"
                    />
                  ) : (
                    <p className="mt-1 text-slate-900">{employee.position || '-'}</p>
                  )}
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-600">사원번호</label>
                  <p className="mt-1 text-slate-900">{employee.employeeNumber || '-'}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-600">입사일</label>
                  <p className="mt-1 text-slate-900">
                    {employee.hireDate
                      ? format(new Date(employee.hireDate), 'yyyy년 MM월 dd일', { locale: ko })
                      : '-'}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-600">재직상태</label>
                  <p className="mt-1">
                    <Badge className="bg-green-100 text-green-700">재직중</Badge>
                  </p>
                </div>
              </div>

              <div className="border-t pt-6">
                <h3 className="font-medium text-slate-900 mb-4">비상연락처</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="text-sm font-medium text-slate-600">비상연락인</label>
                    {isEditing ? (
                      <Input
                        value={editForm.emergencyContact || ''}
                        onChange={e => setEditForm({ ...editForm, emergencyContact: e.target.value })}
                        className="mt-1"
                      />
                    ) : (
                      <p className="mt-1 text-slate-900">{employee.emergencyContact || '-'}</p>
                    )}
                  </div>
                  <div>
                    <label className="text-sm font-medium text-slate-600">비상연락처</label>
                    {isEditing ? (
                      <Input
                        value={editForm.emergencyPhone || ''}
                        onChange={e => setEditForm({ ...editForm, emergencyPhone: e.target.value })}
                        className="mt-1"
                      />
                    ) : (
                      <p className="mt-1 text-slate-900">{employee.emergencyPhone || '-'}</p>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {activeTab === 'attendance' && (
          <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Clock className="w-5 h-5 text-lime-600" />
                근태이력
              </CardTitle>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setSelectedMonth(prev => new Date(prev.getFullYear(), prev.getMonth() - 1))}
                >
                  이전
                </Button>
                <span className="px-4 py-2 text-sm font-medium">
                  {format(selectedMonth, 'yyyy년 MM월', { locale: ko })}
                </span>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setSelectedMonth(prev => new Date(prev.getFullYear(), prev.getMonth() + 1))}
                >
                  다음
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {/* 월간 통계 */}
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
                <div className="bg-slate-50 rounded-xl p-4 text-center">
                  <p className="text-2xl font-bold text-slate-900">
                    {attendanceRecords.filter(r => r.status === 'PRESENT').length}
                  </p>
                  <p className="text-sm text-slate-500">정상출근</p>
                </div>
                <div className="bg-yellow-50 rounded-xl p-4 text-center">
                  <p className="text-2xl font-bold text-yellow-600">
                    {attendanceRecords.filter(r => r.status === 'LATE').length}
                  </p>
                  <p className="text-sm text-slate-500">지각</p>
                </div>
                <div className="bg-red-50 rounded-xl p-4 text-center">
                  <p className="text-2xl font-bold text-red-600">
                    {attendanceRecords.filter(r => r.status === 'ABSENT').length}
                  </p>
                  <p className="text-sm text-slate-500">결근</p>
                </div>
                <div className="bg-purple-50 rounded-xl p-4 text-center">
                  <p className="text-2xl font-bold text-purple-600">
                    {attendanceRecords.filter(r => r.status === 'LEAVE').length}
                  </p>
                  <p className="text-sm text-slate-500">휴가</p>
                </div>
                <div className="bg-blue-50 rounded-xl p-4 text-center">
                  <p className="text-2xl font-bold text-blue-600">
                    {attendanceRecords.filter(r => r.workLocation === 'REMOTE').length}
                  </p>
                  <p className="text-sm text-slate-500">재택</p>
                </div>
              </div>

              {/* 상세 기록 테이블 */}
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="text-left px-4 py-3 text-sm font-medium text-slate-600">날짜</th>
                      <th className="text-center px-4 py-3 text-sm font-medium text-slate-600">출근</th>
                      <th className="text-center px-4 py-3 text-sm font-medium text-slate-600">퇴근</th>
                      <th className="text-center px-4 py-3 text-sm font-medium text-slate-600">근무지</th>
                      <th className="text-center px-4 py-3 text-sm font-medium text-slate-600">상태</th>
                      <th className="text-center px-4 py-3 text-sm font-medium text-slate-600">근무시간</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {attendanceRecords.length > 0 ? (
                      attendanceRecords.map(record => {
                        const statusStyle = getStatusStyle(record.status || 'ABSENT')
                        return (
                          <tr key={record.id} className="hover:bg-slate-50">
                            <td className="px-4 py-3 text-sm">
                              {format(new Date(record.date), 'MM/dd (E)', { locale: ko })}
                            </td>
                            <td className="px-4 py-3 text-sm text-center">
                              {record.checkIn ? format(new Date(record.checkIn), 'HH:mm') : '--:--'}
                            </td>
                            <td className="px-4 py-3 text-sm text-center">
                              {record.checkOut ? format(new Date(record.checkOut), 'HH:mm') : '--:--'}
                            </td>
                            <td className="px-4 py-3 text-center">
                              {record.workLocation && (
                                <span className="inline-flex items-center gap-1 text-xs text-slate-500">
                                  {record.workLocation === 'OFFICE' ? (
                                    <><MapPin className="w-3 h-3" /> 사무실</>
                                  ) : (
                                    <><Wifi className="w-3 h-3" /> 재택</>
                                  )}
                                </span>
                              )}
                            </td>
                            <td className="px-4 py-3 text-center">
                              <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${statusStyle.bg} ${statusStyle.text}`}>
                                {statusStyle.label}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-sm text-center text-slate-600">
                              {record.workHours ? `${record.workHours}시간` : '-'}
                            </td>
                          </tr>
                        )
                      })
                    ) : (
                      <tr>
                        <td colSpan={6} className="px-4 py-8 text-center text-slate-500">
                          근태 기록이 없습니다
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}

        {activeTab === 'leave' && (
          <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="w-5 h-5 text-lime-600" />
                휴가현황
              </CardTitle>
            </CardHeader>
            <CardContent>
              {/* 휴가 잔여일 */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                <div className="bg-lime-50 rounded-xl p-4 text-center">
                  <p className="text-2xl font-bold text-lime-600">15</p>
                  <p className="text-sm text-slate-500">연차 총일수</p>
                </div>
                <div className="bg-blue-50 rounded-xl p-4 text-center">
                  <p className="text-2xl font-bold text-blue-600">
                    {leaveRecords.filter(l => l.status === 'APPROVED').reduce((sum, l) => sum + l.days, 0)}
                  </p>
                  <p className="text-sm text-slate-500">사용일수</p>
                </div>
                <div className="bg-green-50 rounded-xl p-4 text-center">
                  <p className="text-2xl font-bold text-green-600">
                    {15 - leaveRecords.filter(l => l.status === 'APPROVED').reduce((sum, l) => sum + l.days, 0)}
                  </p>
                  <p className="text-sm text-slate-500">잔여일수</p>
                </div>
                <div className="bg-yellow-50 rounded-xl p-4 text-center">
                  <p className="text-2xl font-bold text-yellow-600">
                    {leaveRecords.filter(l => l.status === 'PENDING').length}
                  </p>
                  <p className="text-sm text-slate-500">승인대기</p>
                </div>
              </div>

              {/* 휴가 기록 */}
              <div className="space-y-4">
                {leaveRecords.length > 0 ? (
                  leaveRecords.map(leave => {
                    const statusStyle = getLeaveStatusStyle(leave.status)
                    return (
                      <div key={leave.id} className="border rounded-xl p-4">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-3">
                            <Badge variant="outline">{leave.type}</Badge>
                            <span className="font-medium">
                              {format(new Date(leave.startDate), 'yyyy.MM.dd')}
                              {leave.days > 1 && ` ~ ${format(new Date(leave.endDate), 'yyyy.MM.dd')}`}
                            </span>
                            <span className="text-slate-500">({leave.days}일)</span>
                          </div>
                          <span className={`inline-flex px-3 py-1 rounded-full text-sm font-medium ${statusStyle.bg} ${statusStyle.text}`}>
                            {statusStyle.label}
                          </span>
                        </div>
                        {leave.reason && (
                          <p className="text-sm text-slate-600">{leave.reason}</p>
                        )}
                        <p className="text-xs text-slate-400 mt-2">
                          신청일: {format(new Date(leave.createdAt), 'yyyy.MM.dd HH:mm')}
                        </p>
                      </div>
                    )
                  })
                ) : (
                  <div className="text-center py-8 text-slate-500">
                    휴가 기록이 없습니다
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {activeTab === 'payroll' && (
          <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="w-5 h-5 text-lime-600" />
                급여정보
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col items-center justify-center py-12 text-slate-500">
                <DollarSign className="w-12 h-12 text-slate-300 mb-4" />
                <p>급여 정보 기능은 준비 중입니다.</p>
                <p className="text-sm">곧 제공될 예정입니다.</p>
              </div>
            </CardContent>
          </Card>
        )}

        {activeTab === 'evaluation' && (
          <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Award className="w-5 h-5 text-lime-600" />
                성과평가
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col items-center justify-center py-12 text-slate-500">
                <BarChart2 className="w-12 h-12 text-slate-300 mb-4" />
                <p>성과평가 기능은 준비 중입니다.</p>
                <p className="text-sm">곧 제공될 예정입니다.</p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
