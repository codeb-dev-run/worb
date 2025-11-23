'use client'

import React, { useState, useEffect } from 'react'
import { useAuth } from '@/lib/auth-context'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Calendar, Plus, Check, X } from 'lucide-react'
import { format } from 'date-fns'
import { ko } from 'date-fns/locale'

export default function LeavePage() {
    const { user, userProfile } = useAuth()
    const [leaveRequests, setLeaveRequests] = useState<any[]>([])
    const [leaveBalance, setLeaveBalance] = useState({ total: 15, used: 0, remaining: 15 })
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        loadLeaveData()
    }, [])

    const loadLeaveData = async () => {
        try {
            const response = await fetch('/api/leave')
            const data = await response.json()
            setLeaveRequests(data.requests || [])
            setLeaveBalance(data.balance || { total: 15, used: 0, remaining: 15 })
        } catch (error) {
            console.error('Failed to load leave data:', error)
        } finally {
            setLoading(false)
        }
    }

    const getStatusBadge = (status: string) => {
        const styles = {
            PENDING: 'bg-yellow-100 text-yellow-700',
            APPROVED: 'bg-green-100 text-green-700',
            REJECTED: 'bg-red-100 text-red-700',
        }
        const labels = {
            PENDING: '대기중',
            APPROVED: '승인',
            REJECTED: '반려',
        }
        return { style: styles[status as keyof typeof styles], label: labels[status as keyof typeof labels] }
    }

    const getLeaveType = (type: string) => {
        const types: Record<string, string> = {
            ANNUAL: '연차',
            SICK: '병가',
            HALF_DAY: '반차',
            SPECIAL: '특별휴가',
        }
        return types[type] || type
    }

    if (loading) {
        return <div className="flex items-center justify-center h-full">로딩 중...</div>
    }

    return (
        <div className="p-6 space-y-6">
            <div>
                <h1 className="text-2xl font-bold">휴가 관리</h1>
                <p className="text-gray-500">휴가 신청 및 사용 현황을 관리합니다</p>
            </div>

            {/* 휴가 잔여 현황 */}
            <div className="grid grid-cols-3 gap-4">
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-gray-500">총 연차</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold">{leaveBalance.total}일</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-gray-500">사용</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold text-blue-600">{leaveBalance.used}일</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-gray-500">잔여</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold text-green-600">{leaveBalance.remaining}일</div>
                    </CardContent>
                </Card>
            </div>

            {/* 휴가 신청 */}
            <Card>
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <CardTitle className="flex items-center gap-2">
                            <Calendar className="w-5 h-5" />
                            휴가 신청
                        </CardTitle>
                        <Button>
                            <Plus className="w-4 h-4 mr-2" />
                            신청하기
                        </Button>
                    </div>
                </CardHeader>
            </Card>

            {/* 휴가 신청 내역 */}
            <Card>
                <CardHeader>
                    <CardTitle>신청 내역</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="bg-white border rounded-lg overflow-hidden">
                        <table className="w-full">
                            <thead className="bg-gray-50 border-b">
                                <tr>
                                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">구분</th>
                                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">기간</th>
                                    <th className="px-4 py-3 text-center text-sm font-medium text-gray-700">일수</th>
                                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">사유</th>
                                    <th className="px-4 py-3 text-center text-sm font-medium text-gray-700">상태</th>
                                    <th className="px-4 py-3 text-center text-sm font-medium text-gray-700">신청일</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y">
                                {leaveRequests.length > 0 ? (
                                    leaveRequests.map((request: any) => {
                                        const badge = getStatusBadge(request.status)
                                        return (
                                            <tr key={request.id} className="hover:bg-gray-50">
                                                <td className="px-4 py-3 text-sm">
                                                    <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs">
                                                        {getLeaveType(request.type)}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-3 text-sm text-gray-900">
                                                    {format(new Date(request.startDate), 'yyyy.MM.dd')} ~ {format(new Date(request.endDate), 'yyyy.MM.dd')}
                                                </td>
                                                <td className="px-4 py-3 text-center text-sm text-gray-900">
                                                    {request.days}일
                                                </td>
                                                <td className="px-4 py-3 text-sm text-gray-600">
                                                    {request.reason}
                                                </td>
                                                <td className="px-4 py-3 text-center">
                                                    <span className={`px-2 py-1 rounded text-xs ${badge.style}`}>
                                                        {badge.label}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-3 text-center text-sm text-gray-600">
                                                    {format(new Date(request.createdAt), 'MM.dd')}
                                                </td>
                                            </tr>
                                        )
                                    })
                                ) : (
                                    <tr>
                                        <td colSpan={6} className="px-4 py-12 text-center text-gray-500">
                                            신청 내역이 없습니다
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}
