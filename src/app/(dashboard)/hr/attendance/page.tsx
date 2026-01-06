"use client"

const isDev = process.env.NODE_ENV === 'development'

import React, { useState, useEffect } from 'react'
import { useAuth } from '@/lib/auth-context'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Clock, CheckCircle, XCircle, Calendar, Settings, Home, Building2, AlertCircle } from 'lucide-react'
import { format } from 'date-fns'
import { ko } from 'date-fns/locale'
import { toast } from 'react-hot-toast'

// ===========================================
// Glass Morphism Attendance Page
// ===========================================

export default function AttendancePage() {
    const { user, userProfile } = useAuth()
    const [todayAttendance, setTodayAttendance] = useState<any>(null)
    const [attendanceHistory, setAttendanceHistory] = useState<any[]>([])
    const [loading, setLoading] = useState(true)

    const [isSettingsOpen, setIsSettingsOpen] = useState(false)
    const [settings, setSettings] = useState({
        type: 'FIXED',
        dailyRequiredMinutes: 480,
        workStartTime: '09:00',
        workEndTime: '18:00',
        coreTimeStart: '11:00',
        coreTimeEnd: '16:00',
        presenceCheckEnabled: true,
        presenceIntervalMinutes: 90,
        officeIpWhitelist: [] as string[],
    })

    const [isCheckInModalOpen, setIsCheckInModalOpen] = useState(false)
    const [workLocation, setWorkLocation] = useState<'OFFICE' | 'REMOTE'>('OFFICE')
    const [userIP, setUserIP] = useState<string>('')
    const [isPresenceCheckOpen, setIsPresenceCheckOpen] = useState(false)

    useEffect(() => {
        if (user?.uid) {
            loadAttendanceData()
            loadSettings()
            fetchUserIP()
            startPresenceCheckTimer()
        }
    }, [user])

    const fetchUserIP = async () => {
        try {
            const response = await fetch('https://api.ipify.org?format=json')
            const data = await response.json()
            setUserIP(data.ip)
        } catch (error) {
            if (isDev) console.error('Failed to fetch IP:', error)
        }
    }

    const loadSettings = async () => {
        if (!user?.uid) return
        try {
            const response = await fetch('/api/attendance/settings', {
                headers: { 'x-user-id': user.uid }
            })
            if (response.ok) {
                const data = await response.json()
                setSettings({
                    type: data.type || 'FIXED',
                    dailyRequiredMinutes: data.dailyRequiredMinutes || 480,
                    workStartTime: data.workStartTime || '09:00',
                    workEndTime: data.workEndTime || '18:00',
                    coreTimeStart: data.coreTimeStart || '11:00',
                    coreTimeEnd: data.coreTimeEnd || '16:00',
                    presenceCheckEnabled: data.presenceCheckEnabled ?? true,
                    presenceIntervalMinutes: data.presenceIntervalMinutes || 90,
                    officeIpWhitelist: data.officeIpWhitelist || [],
                })
            }
        } catch (error) {
            if (isDev) console.error('Failed to load settings:', error)
        }
    }

    const saveSettings = async () => {
        if (!user?.uid) return
        try {
            const response = await fetch('/api/attendance/settings', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-user-id': user.uid
                },
                body: JSON.stringify(settings)
            })

            if (response.ok) {
                toast.success('설정이 저장되었습니다')
                setIsSettingsOpen(false)
            } else {
                toast.error('설정 저장 실패')
            }
        } catch (error) {
            if (isDev) console.error('Failed to save settings:', error)
            toast.error('설정 저장 중 오류가 발생했습니다')
        }
    }

    const loadAttendanceData = async () => {
        if (!user?.uid) return

        try {
            const response = await fetch('/api/attendance', {
                headers: {
                    'x-user-id': user.uid
                }
            })
            const data = await response.json()
            setTodayAttendance(data.today)
            setAttendanceHistory(data.history || [])
        } catch (error) {
            if (isDev) console.error('Failed to load attendance:', error)
        } finally {
            setLoading(false)
        }
    }

    const startPresenceCheckTimer = () => {
        if (!settings.presenceCheckEnabled) return

        const intervalMs = settings.presenceIntervalMinutes * 60 * 1000
        const timer = setInterval(() => {
            if (todayAttendance?.checkIn && !todayAttendance?.checkOut) {
                if (workLocation === 'REMOTE' || !settings.presenceCheckEnabled) {
                    setIsPresenceCheckOpen(true)
                }
            }
        }, intervalMs)

        return () => clearInterval(timer)
    }

    const handlePresenceConfirm = async () => {
        if (!user?.uid) return
        try {
            await fetch('/api/attendance/presence-check', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-user-id': user.uid
                },
                body: JSON.stringify({ status: 'confirmed' })
            })
            setIsPresenceCheckOpen(false)
            toast.success('근무 확인 완료')
        } catch (error) {
            if (isDev) console.error('Presence check failed:', error)
        }
    }

    const handleCheckInClick = () => {
        setIsCheckInModalOpen(true)
    }

    const handleCheckIn = async () => {
        if (!user?.uid) return

        const isOfficeIP = settings.officeIpWhitelist.includes(userIP)

        if (workLocation === 'OFFICE' && !isOfficeIP && settings.officeIpWhitelist.length > 0) {
            toast.error('회사 IP가 아닙니다. 재택근무로 전환하거나 관리자에게 문의하세요.')
            return
        }

        try {
            const response = await fetch('/api/attendance/checkin', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-user-id': user.uid
                },
                body: JSON.stringify({
                    workLocation,
                    ipAddress: userIP
                })
            })
            if (response.ok) {
                loadAttendanceData()
                toast.success(`출근 처리되었습니다 (${workLocation === 'OFFICE' ? '사무실' : '재택'})`)
                setIsCheckInModalOpen(false)
            } else {
                const data = await response.json()
                toast.error(data.error || '출근 처리 실패')
            }
        } catch (error) {
            if (isDev) console.error('Check-in failed:', error)
            toast.error('출근 처리 중 오류가 발생했습니다')
        }
    }

    const [isCheckingOut, setIsCheckingOut] = useState(false)

    const handleCheckOut = async (retryCount = 0) => {
        if (!user?.uid) return

        setIsCheckingOut(true)

        // 낙관적 UI 업데이트 - 즉시 퇴근 시간 표시
        const checkOutTime = new Date()
        setTodayAttendance((prev: any) => prev ? { ...prev, checkOut: checkOutTime } : null)

        try {
            const response = await fetch('/api/attendance/checkout', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({})
            })
            if (response.ok) {
                toast.success('퇴근 처리되었습니다')
                // 백그라운드에서 데이터 새로고침
                loadAttendanceData()
            } else {
                const data = await response.json()
                // 실패 시 롤백
                setTodayAttendance((prev: any) => prev ? { ...prev, checkOut: null } : null)
                toast.error(data.message || data.error || '퇴근 처리 실패')
            }
        } catch (error) {
            // 네트워크 에러 시 재시도 (최대 2회)
            if (retryCount < 2) {
                if (isDev) console.log(`Check-out retry ${retryCount + 1}`)
                setTimeout(() => handleCheckOut(retryCount + 1), 1000)
                return
            }
            // 실패 시 롤백
            setTodayAttendance((prev: any) => prev ? { ...prev, checkOut: null } : null)
            if (isDev) console.error('Check-out failed:', error)
            toast.error('퇴근 처리 중 오류가 발생했습니다. 다시 시도해주세요.')
        } finally {
            setIsCheckingOut(false)
        }
    }

    // 이어서 근무하기 (퇴근 후 다시 출근)
    const handleResumeWork = async () => {
        if (!user?.uid) return

        try {
            const response = await fetch('/api/attendance/checkin', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    workLocation,
                    ipAddress: userIP,
                    isResume: true // 이어서 근무하기 플래그
                })
            })
            if (response.ok) {
                const data = await response.json()
                loadAttendanceData()
                toast.success(data.message || '근무를 재개했습니다')
                setIsCheckInModalOpen(false)
            } else {
                const data = await response.json()
                toast.error(data.message || data.error || '근무 재개 실패')
            }
        } catch (error) {
            if (isDev) console.error('Resume work failed:', error)
            toast.error('근무 재개 중 오류가 발생했습니다')
        }
    }

    const getStatusBadge = (status: string) => {
        const styles = {
            PRESENT: 'bg-lime-100 text-lime-700',
            LATE: 'bg-amber-100 text-amber-700',
            ABSENT: 'bg-red-100 text-red-700',
            REMOTE: 'bg-violet-100 text-violet-700',
            HALF_DAY: 'bg-slate-100 text-slate-700',
        }
        return styles[status as keyof typeof styles] || 'bg-slate-100 text-slate-700'
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center h-full">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-lime-400"></div>
            </div>
        )
    }

    return (
        <div className="p-6 space-y-6">
            {/* Header - Glass Style */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">근태 관리</h1>
                    <p className="text-slate-500">출퇴근 기록 및 근태 현황을 관리합니다</p>
                </div>
                <Dialog open={isSettingsOpen} onOpenChange={setIsSettingsOpen}>
                    <DialogTrigger asChild>
                        <Button variant="glass" className="border-2 border-slate-200">
                            <Settings className="w-4 h-4 mr-2" />
                            근무 설정
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-2xl bg-white/90 backdrop-blur-2xl border-white/40 rounded-3xl">
                        <DialogHeader>
                            <DialogTitle>근무 정책 설정</DialogTitle>
                            <DialogDescription>
                                근무 형태와 시간을 설정합니다.
                            </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4 py-4 max-h-[60vh] overflow-y-auto">
                            <div className="space-y-2">
                                <Label>근무 형태</Label>
                                <div className="flex flex-col gap-2">
                                    {[
                                        { value: 'FIXED', label: '고정 근무제', desc: '정시 출퇴근', color: 'bg-blue-100 text-blue-700 ring-blue-400' },
                                        { value: 'FLEXIBLE', label: '유연 근무제', desc: '총 근무시간만 충족', color: 'bg-emerald-100 text-emerald-700 ring-emerald-400' },
                                        { value: 'CORE_TIME', label: '코어타임 근무제', desc: '필수 시간 + 자유', color: 'bg-violet-100 text-violet-700 ring-violet-400' }
                                    ].map((option) => (
                                        <button
                                            key={option.value}
                                            type="button"
                                            onClick={() => setSettings({ ...settings, type: option.value })}
                                            className={`flex flex-col items-start px-4 py-3 rounded-xl text-sm transition-all ${
                                                settings.type === option.value
                                                    ? `${option.color} ring-2`
                                                    : 'bg-white/60 border border-slate-200 text-slate-600 hover:bg-slate-50'
                                            }`}
                                        >
                                            <span className="font-medium">{option.label}</span>
                                            <span className="text-xs opacity-70">{option.desc}</span>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label>일일 필수 근무시간 (분)</Label>
                                <Input
                                    type="number"
                                    value={settings.dailyRequiredMinutes}
                                    onChange={(e) => setSettings({ ...settings, dailyRequiredMinutes: parseInt(e.target.value) })}
                                />
                                <p className="text-sm text-muted-foreground">
                                    {Math.floor(settings.dailyRequiredMinutes / 60)}시간 {settings.dailyRequiredMinutes % 60}분
                                </p>
                            </div>

                            {settings.type === 'FIXED' && (
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label>출근 시간</Label>
                                        <Input
                                            type="time"
                                            value={settings.workStartTime}
                                            onChange={(e) => setSettings({ ...settings, workStartTime: e.target.value })}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>퇴근 시간</Label>
                                        <Input
                                            type="time"
                                            value={settings.workEndTime}
                                            onChange={(e) => setSettings({ ...settings, workEndTime: e.target.value })}
                                        />
                                    </div>
                                </div>
                            )}

                            {(settings.type === 'CORE_TIME' || settings.type === 'FLEXIBLE') && (
                                <div className="space-y-4">
                                    {settings.type === 'CORE_TIME' && (
                                        <>
                                            <div className="text-sm text-slate-600 bg-lime-50 p-3 rounded-xl border border-lime-100">
                                                💡 코어타임은 필수 근무 시간입니다. 이 시간에는 반드시 근무해야 합니다.
                                            </div>
                                            <div className="grid grid-cols-2 gap-4">
                                                <div className="space-y-2">
                                                    <Label>코어타임 시작</Label>
                                                    <Input
                                                        type="time"
                                                        value={settings.coreTimeStart}
                                                        onChange={(e) => setSettings({ ...settings, coreTimeStart: e.target.value })}
                                                    />
                                                </div>
                                                <div className="space-y-2">
                                                    <Label>코어타임 종료</Label>
                                                    <Input
                                                        type="time"
                                                        value={settings.coreTimeEnd}
                                                        onChange={(e) => setSettings({ ...settings, coreTimeEnd: e.target.value })}
                                                    />
                                                </div>
                                            </div>
                                        </>
                                    )}
                                    {settings.type === 'FLEXIBLE' && (
                                        <div className="text-sm text-slate-600 bg-violet-50 p-3 rounded-xl border border-violet-100">
                                            ℹ️ 유연 근무제는 출퇴근 시간 제약이 없으며, 일일 필수 근무시간만 충족하면 됩니다.
                                        </div>
                                    )}
                                </div>
                            )}

                            <div className="space-y-2">
                                <Label>근무 확인 팝업 활성화</Label>
                                <div className="flex items-center gap-2">
                                    <input
                                        type="checkbox"
                                        checked={settings.presenceCheckEnabled}
                                        onChange={(e) => setSettings({ ...settings, presenceCheckEnabled: e.target.checked })}
                                        className="w-4 h-4"
                                    />
                                    <span className="text-sm">재택근무 시 주기적으로 근무 확인</span>
                                </div>
                                {settings.presenceCheckEnabled && (
                                    <Input
                                        type="number"
                                        value={settings.presenceIntervalMinutes}
                                        onChange={(e) => setSettings({ ...settings, presenceIntervalMinutes: parseInt(e.target.value) })}
                                        placeholder="확인 주기 (분)"
                                    />
                                )}
                            </div>

                            <div className="space-y-2">
                                <Label>회사 IP 화이트리스트</Label>
                                <Input
                                    type="text"
                                    value={settings.officeIpWhitelist.join(', ')}
                                    onChange={(e) => setSettings({
                                        ...settings,
                                        officeIpWhitelist: e.target.value.split(',').map(ip => ip.trim()).filter(Boolean)
                                    })}
                                    placeholder="예: 123.456.789.0, 123.456.789.1"
                                />
                                <p className="text-sm text-muted-foreground">
                                    현재 IP: {userIP}
                                </p>
                            </div>
                        </div>
                        <DialogFooter>
                            <Button variant="limePrimary" onClick={saveSettings}>저장하기</Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>

            {/* 근무 확인 팝업 - Glass Style */}
            <Dialog open={isPresenceCheckOpen} onOpenChange={setIsPresenceCheckOpen}>
                <DialogContent className="bg-white/90 backdrop-blur-2xl border-white/40 rounded-3xl">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <AlertCircle className="w-5 h-5 text-orange-500" />
                            근무 확인
                        </DialogTitle>
                        <DialogDescription>
                            현재 근무 중이신가요? 10분 내에 응답해주세요.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="py-4">
                        <p className="text-center text-lg">
                            지금 근무 중이시면 아래 버튼을 눌러주세요.
                        </p>
                    </div>
                    <DialogFooter>
                        <Button variant="limePrimary" onClick={handlePresenceConfirm} className="w-full">
                            네, 근무 중입니다
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* 출근 확인 모달 - Glass Style */}
            <Dialog open={isCheckInModalOpen} onOpenChange={setIsCheckInModalOpen}>
                <DialogContent className="bg-white/90 backdrop-blur-2xl border-white/40 rounded-3xl">
                    <DialogHeader>
                        <DialogTitle>
                            {todayAttendance?.checkOut ? '이어서 근무하기' : '출근 위치 확인'}
                        </DialogTitle>
                        <DialogDescription>
                            {todayAttendance?.checkOut
                                ? '퇴근 후 다시 근무를 시작합니다. 근무 위치를 선택해주세요.'
                                : '오늘 근무 위치를 선택해주세요.'}
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="text-sm text-slate-600 bg-slate-50 p-3 rounded-xl border border-slate-100">
                            현재 IP: {userIP}
                            {settings.officeIpWhitelist.includes(userIP) && (
                                <span className="ml-2 text-lime-600 font-medium">✓ 회사 IP</span>
                            )}
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <Button
                                variant={workLocation === 'OFFICE' ? 'limePrimary' : 'glass'}
                                className="h-24 flex flex-col items-center justify-center gap-2 rounded-2xl border-2 border-slate-200"
                                onClick={() => setWorkLocation('OFFICE')}
                            >
                                <Building2 className="w-8 h-8" />
                                <span>사무실 출근</span>
                            </Button>
                            <Button
                                variant={workLocation === 'REMOTE' ? 'limePrimary' : 'glass'}
                                className="h-24 flex flex-col items-center justify-center gap-2 rounded-2xl border-2 border-slate-200"
                                onClick={() => setWorkLocation('REMOTE')}
                            >
                                <Home className="w-8 h-8" />
                                <span>재택 근무</span>
                            </Button>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="glass" onClick={() => setIsCheckInModalOpen(false)}>
                            취소
                        </Button>
                        {todayAttendance?.checkOut ? (
                            <Button variant="limePrimary" onClick={handleResumeWork}>
                                근무 재개
                            </Button>
                        ) : (
                            <Button variant="limePrimary" onClick={handleCheckIn}>
                                출근 처리
                            </Button>
                        )}
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* 오늘의 출퇴근 - Glass Style */}
            <Card variant="glass">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-slate-900">
                        <div className="p-2 bg-lime-100 rounded-xl">
                            <Clock className="w-5 h-5 text-lime-600" />
                        </div>
                        오늘의 출퇴근
                    </CardTitle>
                    <CardDescription className="text-slate-500">{format(new Date(), 'yyyy년 MM월 dd일 EEEE', { locale: ko })}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="p-4 bg-white/60 backdrop-blur-sm rounded-2xl border border-white/40">
                            <div className="text-sm text-slate-500 mb-1">출근 시간</div>
                            <div className="text-2xl font-bold text-slate-900">
                                {todayAttendance?.checkIn ? format(new Date(todayAttendance.checkIn), 'HH:mm') : '--:--'}
                            </div>
                        </div>
                        <div className="p-4 bg-white/60 backdrop-blur-sm rounded-2xl border border-white/40">
                            <div className="text-sm text-slate-500 mb-1">퇴근 시간</div>
                            <div className="text-2xl font-bold text-slate-900">
                                {todayAttendance?.checkOut ? format(new Date(todayAttendance.checkOut), 'HH:mm') : '--:--'}
                            </div>
                        </div>
                    </div>

                    <div className="flex gap-3">
                        {/* 출근하기 / 이어서 근무하기 버튼 */}
                        {todayAttendance?.checkIn && todayAttendance?.checkOut ? (
                            // 퇴근한 상태 - 이어서 근무하기 버튼 표시
                            <Button
                                onClick={() => setIsCheckInModalOpen(true)}
                                variant="limePrimary"
                                className="flex-1 rounded-xl"
                            >
                                <CheckCircle className="w-4 h-4 mr-2" />
                                이어서 근무하기
                            </Button>
                        ) : (
                            // 출근 전 또는 근무 중 - 출근하기 버튼
                            <Button
                                onClick={handleCheckInClick}
                                disabled={!!todayAttendance?.checkIn}
                                variant="limePrimary"
                                className="flex-1 rounded-xl"
                            >
                                <CheckCircle className="w-4 h-4 mr-2" />
                                출근하기
                            </Button>
                        )}
                        <Button
                            onClick={() => handleCheckOut()}
                            disabled={!todayAttendance?.checkIn || !!todayAttendance?.checkOut || isCheckingOut}
                            variant="glass"
                            className="flex-1 rounded-xl border-2 border-slate-200"
                        >
                            {isCheckingOut ? (
                                <>
                                    <div className="w-4 h-4 mr-2 border-2 border-slate-400 border-t-transparent rounded-full animate-spin" />
                                    처리 중...
                                </>
                            ) : (
                                <>
                                    <XCircle className="w-4 h-4 mr-2" />
                                    퇴근하기
                                </>
                            )}
                        </Button>
                    </div>
                </CardContent>
            </Card>

            {/* 근태 기록 - Glass Style */}
            <Card variant="glass">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-slate-900">
                        <div className="p-2 bg-slate-100 rounded-xl">
                            <Calendar className="w-5 h-5 text-slate-600" />
                        </div>
                        근태 기록
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="space-y-2">
                        {attendanceHistory.length > 0 ? (
                            attendanceHistory.map((record: any) => (
                                <div key={record.id} className="flex items-center justify-between p-4 bg-white/60 backdrop-blur-sm rounded-2xl border border-white/40 hover:bg-white/80 transition-colors">
                                    <div>
                                        <div className="font-medium text-slate-900">{format(new Date(record.date), 'yyyy-MM-dd')}</div>
                                        <div className="text-sm text-slate-500">
                                            {record.checkIn && format(new Date(record.checkIn), 'HH:mm')} ~{' '}
                                            {record.checkOut && format(new Date(record.checkOut), 'HH:mm')}
                                        </div>
                                    </div>
                                    <span className={`px-3 py-1 rounded-xl text-xs font-medium ${getStatusBadge(record.status)}`}>
                                        {record.status}
                                    </span>
                                </div>
                            ))
                        ) : (
                            <p className="text-center text-slate-500 py-8">근태 기록이 없습니다</p>
                        )}
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}
