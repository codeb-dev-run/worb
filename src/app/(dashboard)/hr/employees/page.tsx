'use client'

// ===========================================
// 팀원 목록 페이지 - 전체 팀원 리스트
// ===========================================

import React, { useState, useEffect, useCallback } from 'react'
import { useAuth } from '@/lib/auth-context'
import { useWorkspace } from '@/lib/workspace-context'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import {
  Users, Search, Filter, ChevronLeft, Eye, Mail, Phone,
  Building2, Briefcase, Calendar, Loader2, UserPlus,
  MoreHorizontal, MapPin, Wifi
} from 'lucide-react'
import Link from 'next/link'
import { format } from 'date-fns'
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

  // 상태별 색상
  const getStatusStyle = (status: string) => {
    switch (status) {
      case 'present': return { bg: 'bg-green-100', text: 'text-green-700', label: '근무중' }
      case 'remote': return { bg: 'bg-blue-100', text: 'text-blue-700', label: '재택' }
      case 'leave': return { bg: 'bg-purple-100', text: 'text-purple-700', label: '휴가' }
      case 'late': return { bg: 'bg-yellow-100', text: 'text-yellow-700', label: '지각' }
      case 'absent': return { bg: 'bg-red-100', text: 'text-red-700', label: '미출근' }
      default: return { bg: 'bg-slate-100', text: 'text-slate-600', label: '-' }
    }
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

        {/* 팀원 리스트 */}
        <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg">
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-50 border-b">
                  <tr>
                    <th className="text-left px-6 py-4 text-sm font-medium text-slate-600">이름</th>
                    <th className="text-left px-6 py-4 text-sm font-medium text-slate-600">부서/직책</th>
                    <th className="text-left px-6 py-4 text-sm font-medium text-slate-600">이메일</th>
                    <th className="text-center px-6 py-4 text-sm font-medium text-slate-600">오늘 근태</th>
                    <th className="text-center px-6 py-4 text-sm font-medium text-slate-600">출퇴근</th>
                    <th className="text-center px-6 py-4 text-sm font-medium text-slate-600">근무지</th>
                    <th className="text-center px-6 py-4 text-sm font-medium text-slate-600">액션</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {filteredEmployees.length > 0 ? (
                    filteredEmployees.map((emp) => {
                      const statusStyle = getStatusStyle(emp.todayStatus || 'absent')
                      return (
                        <tr key={emp.id} className="hover:bg-slate-50 transition-colors">
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-full bg-lime-100 flex items-center justify-center text-lime-700 font-medium">
                                {emp.avatar ? (
                                  <img src={emp.avatar} alt={emp.name} className="w-10 h-10 rounded-full" />
                                ) : (
                                  emp.name?.charAt(0) || '?'
                                )}
                              </div>
                              <div>
                                <p className="font-medium text-slate-900">{emp.name}</p>
                                {emp.employeeNumber && (
                                  <p className="text-xs text-slate-400">{emp.employeeNumber}</p>
                                )}
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <p className="text-slate-900">{emp.department || '-'}</p>
                            <p className="text-sm text-slate-500">{emp.position || '-'}</p>
                          </td>
                          <td className="px-6 py-4 text-slate-600">
                            {emp.email}
                          </td>
                          <td className="px-6 py-4 text-center">
                            <span className={`inline-flex px-3 py-1 rounded-full text-sm font-medium ${statusStyle.bg} ${statusStyle.text}`}>
                              {statusStyle.label}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-center text-sm text-slate-600">
                            {emp.checkIn ? format(new Date(emp.checkIn), 'HH:mm') : '--:--'}
                            {' → '}
                            {emp.checkOut ? format(new Date(emp.checkOut), 'HH:mm') : '--:--'}
                          </td>
                          <td className="px-6 py-4 text-center">
                            {emp.workLocation && (
                              <span className="inline-flex items-center gap-1 text-sm text-slate-500">
                                {emp.workLocation === 'OFFICE' ? (
                                  <><MapPin className="w-3 h-3" /> 사무실</>
                                ) : (
                                  <><Wifi className="w-3 h-3" /> 재택</>
                                )}
                              </span>
                            )}
                          </td>
                          <td className="px-6 py-4 text-center">
                            <Link href={`/hr/employees/${emp.id}`}>
                              <Button variant="ghost" size="sm">
                                <Eye className="w-4 h-4 mr-1" />
                                상세
                              </Button>
                            </Link>
                          </td>
                        </tr>
                      )
                    })
                  ) : (
                    <tr>
                      <td colSpan={7} className="px-6 py-12 text-center text-slate-500">
                        <Users className="w-12 h-12 mx-auto mb-4 text-slate-300" />
                        <p>검색 결과가 없습니다</p>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
