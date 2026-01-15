'use client'

// ===========================================
// 팀원 목록 페이지 - 버튼 형태 카드 레이아웃
// 입사일, 휴가, 근태상태, 주간 성과점수 표시
// ===========================================

import React, { useState, useEffect, useCallback } from 'react'
import { useAuth } from '@/lib/auth-context'
import { useWorkspace } from '@/lib/workspace-context'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import {
  Users, Search, ChevronLeft, Eye, Calendar, Loader2, UserPlus,
  MapPin, Wifi, Clock, Palmtree, Star, TrendingUp, Building2
} from 'lucide-react'
import Link from 'next/link'
import { format, differenceInDays } from 'date-fns'
import { ko } from 'date-fns/locale'

interface Employee {
  id: string
  name: string
  email: string
  avatar?: string
  department?: string
  position?: string
  employeeNumber?: string
  hireDate?: string
  status?: string
  todayStatus?: 'present' | 'absent' | 'leave' | 'late' | 'remote'
  checkIn?: string
  checkOut?: string
  workLocation?: 'OFFICE' | 'REMOTE'
  // 추가 정보
  remainingLeave?: number
  annualTotal?: number
  annualUsed?: number
  weeklyScore?: number
  weeklyFlexTier?: string
}

export default function EmployeesPage() {
  const { user } = useAuth()
  const { currentWorkspace, isAdmin } = useWorkspace()

  const [loading, setLoading] = useState(true)
  const [employees, setEmployees] = useState<Employee[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [filterDepartment, setFilterDepartment] = useState<string>('all')
  const [filterStatus, setFilterStatus] = useState<string>('all')

  const workspaceId = currentWorkspace?.id || ''

  // 팀원 목록 로드
  const loadEmployees = useCallback(async () => {
    if (!workspaceId) return

    try {
      setLoading(true)
      const response = await fetch(`/api/hr/team-attendance?workspaceId=${workspaceId}`)
      if (response.ok) {
        const data = await response.json()
        setEmployees(data.members || [])
      }
    } catch (error) {
      console.error('Failed to load employees:', error)
    } finally {
      setLoading(false)
    }
  }, [workspaceId])

  useEffect(() => {
    loadEmployees()
  }, [loadEmployees])

  // 필터링
  const filteredEmployees = employees.filter(emp => {
    const matchesSearch =
      emp.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      emp.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      emp.department?.toLowerCase().includes(searchQuery.toLowerCase())

    const matchesDepartment = filterDepartment === 'all' || emp.department === filterDepartment
    const matchesStatus = filterStatus === 'all' || emp.todayStatus === filterStatus

    return matchesSearch && matchesDepartment && matchesStatus
  })

  // 부서 목록 추출
  const departments = Array.from(new Set(employees.map(e => e.department).filter(Boolean)))

  // 상태별 스타일
  const getStatusStyle = (status: string) => {
    switch (status) {
      case 'present': return { bg: 'bg-green-500', text: 'text-white', label: '근무중' }
      case 'remote': return { bg: 'bg-blue-500', text: 'text-white', label: '재택' }
      case 'leave': return { bg: 'bg-purple-500', text: 'text-white', label: '휴가' }
      case 'late': return { bg: 'bg-yellow-500', text: 'text-white', label: '지각' }
      case 'absent': return { bg: 'bg-red-500', text: 'text-white', label: '미출근' }
      default: return { bg: 'bg-slate-400', text: 'text-white', label: '-' }
    }
  }

  // 근속기간 계산
  const getTenure = (hireDate: string | undefined) => {
    if (!hireDate) return null
    const days = differenceInDays(new Date(), new Date(hireDate))
    const years = Math.floor(days / 365)
    const months = Math.floor((days % 365) / 30)
    if (years > 0) return `${years}년 ${months}개월`
    return `${months}개월`
  }

  // 성과 점수 색상
  const getScoreColor = (score: number | undefined | null) => {
    if (!score) return 'bg-slate-100 text-slate-600'
    if (score >= 85) return 'bg-green-100 text-green-700'
    if (score >= 75) return 'bg-lime-100 text-lime-700'
    if (score >= 65) return 'bg-yellow-100 text-yellow-700'
    return 'bg-red-100 text-red-700'
  }

  if (!isAdmin) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-4rem)]">
        <Card className="p-8 max-w-md">
          <div className="text-center">
            <Users className="w-12 h-12 text-slate-400 mx-auto mb-4" />
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

  return (
    <div className="h-full overflow-auto bg-gradient-to-br from-slate-50 to-slate-100 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* 헤더 */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/hr">
              <Button variant="ghost" size="sm">
                <ChevronLeft className="w-4 h-4 mr-1" />
                HR 관리
              </Button>
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-slate-900">팀원 목록</h1>
              <p className="text-slate-500">전체 {employees.length}명</p>
            </div>
          </div>
          <Button className="bg-lime-500 hover:bg-lime-600 text-white gap-2">
            <UserPlus className="w-4 h-4" />
            팀원 초대
          </Button>
        </div>

        {/* 필터 & 검색 */}
        <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-sm">
          <CardContent className="p-4">
            <div className="flex flex-wrap gap-4">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input
                  placeholder="이름, 이메일, 부서 검색..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
              <select
                value={filterDepartment}
                onChange={(e) => setFilterDepartment(e.target.value)}
                className="px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-lime-500"
              >
                <option value="all">전체 부서</option>
                {departments.map(dept => (
                  <option key={dept} value={dept}>{dept}</option>
                ))}
              </select>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-lime-500"
              >
                <option value="all">전체 상태</option>
                <option value="present">근무중</option>
                <option value="remote">재택</option>
                <option value="leave">휴가</option>
                <option value="late">지각</option>
                <option value="absent">미출근</option>
              </select>
            </div>
          </CardContent>
        </Card>

        {/* 팀원 카드 리스트 */}
        {filteredEmployees.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredEmployees.map((emp) => {
              const statusStyle = getStatusStyle(emp.todayStatus || 'absent')
              const tenure = getTenure(emp.hireDate)

              return (
                <Card key={emp.id} className="bg-white/90 backdrop-blur-sm border-0 shadow-lg hover:shadow-xl transition-all">
                  <CardContent className="p-5">
                    {/* 헤더: 프로필 & 상태 */}
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-full bg-lime-100 flex items-center justify-center text-lime-700 font-bold text-lg">
                          {emp.avatar ? (
                            <img src={emp.avatar} alt={emp.name} className="w-12 h-12 rounded-full" />
                          ) : (
                            emp.name?.charAt(0) || '?'
                          )}
                        </div>
                        <div>
                          <p className="font-bold text-slate-900">{emp.name}</p>
                          <p className="text-sm text-slate-500">{emp.department || '-'} · {emp.position || '-'}</p>
                        </div>
                      </div>
                      <span className={`px-3 py-1 rounded-full text-xs font-bold ${statusStyle.bg} ${statusStyle.text}`}>
                        {statusStyle.label}
                      </span>
                    </div>

                    {/* 정보 버튼들 - 전체 노출 (펼침목록 X) */}
                    <div className="grid grid-cols-2 gap-2 mb-4">
                      {/* 입사일 */}
                      <div className="flex items-center gap-2 px-3 py-2 bg-slate-50 rounded-xl">
                        <Calendar className="w-4 h-4 text-slate-400" />
                        <div className="text-xs">
                          <p className="text-slate-400">입사일</p>
                          <p className="font-semibold text-slate-700">
                            {emp.hireDate ? format(new Date(emp.hireDate), 'yy.MM.dd') : '-'}
                          </p>
                          {tenure && <p className="text-slate-500">{tenure}</p>}
                        </div>
                      </div>

                      {/* 휴가 잔여 */}
                      <div className="flex items-center gap-2 px-3 py-2 bg-purple-50 rounded-xl">
                        <Palmtree className="w-4 h-4 text-purple-400" />
                        <div className="text-xs">
                          <p className="text-purple-400">휴가 잔여</p>
                          <p className="font-semibold text-purple-700">
                            {emp.remainingLeave ?? '-'}일
                          </p>
                          <p className="text-purple-500">{emp.annualUsed || 0}/{emp.annualTotal || 15} 사용</p>
                        </div>
                      </div>

                      {/* 오늘 출퇴근 */}
                      <div className="flex items-center gap-2 px-3 py-2 bg-blue-50 rounded-xl">
                        <Clock className="w-4 h-4 text-blue-400" />
                        <div className="text-xs">
                          <p className="text-blue-400">오늘 출퇴근</p>
                          <p className="font-semibold text-blue-700">
                            {emp.checkIn ? format(new Date(emp.checkIn), 'HH:mm') : '--:--'}
                            {' → '}
                            {emp.checkOut ? format(new Date(emp.checkOut), 'HH:mm') : '--:--'}
                          </p>
                          <p className="text-blue-500 flex items-center gap-1">
                            {emp.workLocation === 'OFFICE' ? (
                              <><MapPin className="w-3 h-3" /> 사무실</>
                            ) : (
                              <><Wifi className="w-3 h-3" /> 재택</>
                            )}
                          </p>
                        </div>
                      </div>

                      {/* 주간 성과 */}
                      <div className={`flex items-center gap-2 px-3 py-2 rounded-xl ${getScoreColor(emp.weeklyScore)}`}>
                        <Star className="w-4 h-4" />
                        <div className="text-xs">
                          <p className="opacity-70">주간 성과</p>
                          <p className="font-semibold">
                            {emp.weeklyScore ? `${emp.weeklyScore}점` : '미등록'}
                          </p>
                          {emp.weeklyFlexTier && (
                            <p className="opacity-70">{emp.weeklyFlexTier}</p>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* 액션 버튼 */}
                    <div className="flex gap-2">
                      <Link href={`/hr/employees/${emp.id}`} className="flex-1">
                        <Button variant="outline" className="w-full rounded-xl border-slate-200 hover:border-lime-400 hover:bg-lime-50">
                          <Eye className="w-4 h-4 mr-2" />
                          상세 보기
                        </Button>
                      </Link>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        ) : (
          <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg">
            <CardContent className="p-12 text-center">
              <Users className="w-12 h-12 mx-auto mb-4 text-slate-300" />
              <p className="text-slate-500">검색 결과가 없습니다</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
