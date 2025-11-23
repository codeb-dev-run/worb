'use client'

import React, { useState, useEffect } from 'react'
import { useAuth } from '@/lib/auth-context'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Clock, CheckCircle, XCircle, Calendar } from 'lucide-react'
import { format } from 'date-fns'
import { ko } from 'date-fns/locale'

export default function AttendancePage() {
    const { user, userProfile } = useAuth()
    const [todayAttendance, setTodayAttendance] = useState<any>(null)
    const [attendanceHistory, setAttendanceHistory] = useState<any[]>([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        loadAttendanceData()
    }, [])

    const loadAttendanceData = async () => {
        try {
            const response = await fetch('/api/attendance')
            const data = await response.json()
            setTodayAttendance(data.today)
            setAttendanceHistory(data.history || [])
        } catch (error) {
            console.error('Failed to load attendance:', error)
        } finally {
            setLoading(false)
        }
    }

    const handleCheckIn = async () => {
        try {
            const response = await fetch('/api/attendance/checkin', {
                method: 'POST',
            })
            if (response.ok) {
                loadAttendanceData()
            }
        } catch (error) {
            console.error('Check-in failed:', error)
        }
    }

    const handleCheckOut = async () => {
        try {
            const response = await fetch('/api/attendance/checkout', {
                method: 'POST',
            })
            if (response.ok) {
                loadAttendanceData()
            }
        } catch (error) {
            console.error('Check-out failed:', error)
        }
    }

    const getStatusBadge = (status: string) => {
        const styles = {
            PRESENT: 'bg-green-100 text-green-700',
            LATE: 'bg-yellow-100 text-yellow-700',
            ABSENT: 'bg-red-100 text-red-700',
            REMOTE: 'bg-blue-100 text-blue-700',
            HALF_DAY: 'bg-purple-100 text-purple-700',
        }
        return styles[status as keyof typeof styles] || 'bg-gray-100 text-gray-700'
    }

    if (loading) {
        return <div className="flex items-center justify-center h-full">로딩 중...</div>
    }

    return (
        <div className="p-6 space-y-6">
            <div>
                <h1 className="text-2xl font-bold">근태 관리</h1>
                <p className="text-gray-500">출퇴근 기록 및 근태 현황을 관리합니다</p>
            </div>

            {/* 오늘의 출퇴근 */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Clock className="w-5 h-5" />
                        오늘의 출퇴근
                    </CardTitle>
                    <CardDescription>{format(new Date(), 'yyyy년 MM월 dd일 EEEE', { locale: ko })}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="p-4 border rounded-lg">
                            <div className="text-sm text-gray-500 mb-1">출근 시간</div>
                            <div className="text-2xl font-bold">
                                {todayAttendance?.checkIn ? format(new Date(todayAttendance.checkIn), 'HH:mm') : '--:--'}
                            </div>
                        </div>
                        <div className="p-4 border rounded-lg">
                            <div className="text-sm text-gray-500 mb-1">퇴근 시간</div>
                            <div className="text-2xl font-bold">
                                {todayAttendance?.checkOut ? format(new Date(todayAttendance.checkOut), 'HH:mm') : '--:--'}
                            </div>
                        </div>
                    </div>

                    <div className="flex gap-3">
                        <Button
                            onClick={handleCheckIn}
                            disabled={!!todayAttendance?.checkIn}
                            className="flex-1"
                        >
                            <CheckCircle className="w-4 h-4 mr-2" />
                            출근하기
                        </Button>
                        <Button
                            onClick={handleCheckOut}
                            disabled={!todayAttendance?.checkIn || !!todayAttendance?.checkOut}
                            variant="outline"
                            className="flex-1"
                        >
                            <XCircle className="w-4 h-4 mr-2" />
                            퇴근하기
                        </Button>
                    </div>
                </CardContent>
            </Card>

            {/* 근태 기록 */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Calendar className="w-5 h-5" />
                        근태 기록
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="space-y-2">
                        {attendanceHistory.length > 0 ? (
                            attendanceHistory.map((record: any) => (
                                <div key={record.id} className="flex items-center justify-between p-3 border rounded-lg">
                                    <div>
                                        <div className="font-medium">{format(new Date(record.date), 'yyyy-MM-dd')}</div>
                                        <div className="text-sm text-gray-500">
                                            {record.checkIn && format(new Date(record.checkIn), 'HH:mm')} ~{' '}
                                            {record.checkOut && format(new Date(record.checkOut), 'HH:mm')}
                                        </div>
                                    </div>
                                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusBadge(record.status)}`}>
                                        {record.status}
                                    </span>
                                </div>
                            ))
                        ) : (
                            <p className="text-center text-gray-500 py-8">근태 기록이 없습니다</p>
                        )}
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}
