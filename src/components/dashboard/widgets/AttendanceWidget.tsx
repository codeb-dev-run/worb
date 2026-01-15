'use client'

import { useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Coffee, LogIn, LogOut, Clock, Loader2, CheckCircle2, MapPin } from 'lucide-react'
import { format } from 'date-fns'
import { toast } from 'react-hot-toast'

interface AttendanceWidgetProps {
    todayAttendance: any
    workspaceId: string
    userId: string
    onAttendanceUpdate?: () => void
}

export function AttendanceWidget({ todayAttendance, workspaceId, userId, onAttendanceUpdate }: AttendanceWidgetProps) {
    const [showModal, setShowModal] = useState(false)
    const [isLoading, setIsLoading] = useState(false)
    const [currentLocation, setCurrentLocation] = useState<{ lat: number; lon: number } | null>(null)
    const [locationLoading, setLocationLoading] = useState(false)

    // 현재 위치 가져오기
    const getCurrentLocation = (): Promise<{ lat: number; lon: number }> => {
        return new Promise((resolve, reject) => {
            if (!navigator.geolocation) {
                reject(new Error('Geolocation not supported'))
                return
            }
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    resolve({
                        lat: position.coords.latitude,
                        lon: position.coords.longitude
                    })
                },
                (error) => reject(error),
                { enableHighAccuracy: true, timeout: 10000 }
            )
        })
    }

    // 모달 열기
    const handleOpenModal = async () => {
        setShowModal(true)
        setLocationLoading(true)
        try {
            const location = await getCurrentLocation()
            setCurrentLocation(location)
        } catch {
            // 위치 정보 없이 진행
            setCurrentLocation(null)
        } finally {
            setLocationLoading(false)
        }
    }

    // 출근 처리
    const handleCheckIn = async () => {
        if (todayAttendance?.checkIn) {
            toast.error('이미 출근 처리되었습니다')
            return
        }

        setIsLoading(true)
        try {
            const res = await fetch('/api/attendance/checkin', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-workspace-id': workspaceId,
                    'x-user-id': userId
                },
                body: JSON.stringify({
                    workspaceId,
                    latitude: currentLocation?.lat,
                    longitude: currentLocation?.lon
                })
            })

            if (!res.ok) {
                const data = await res.json()
                throw new Error(data.message || '출근 처리에 실패했습니다')
            }

            toast.success('출근 처리되었습니다!')
            setShowModal(false)
            onAttendanceUpdate?.()
        } catch (error: any) {
            toast.error(error.message || '출근 처리에 실패했습니다')
        } finally {
            setIsLoading(false)
        }
    }

    // 퇴근 처리
    const handleCheckOut = async () => {
        if (!todayAttendance?.checkIn) {
            toast.error('먼저 출근 처리가 필요합니다')
            return
        }
        if (todayAttendance?.checkOut) {
            toast.error('이미 퇴근 처리되었습니다')
            return
        }

        setIsLoading(true)
        try {
            const res = await fetch('/api/attendance/checkout', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-workspace-id': workspaceId,
                    'x-user-id': userId
                },
                body: JSON.stringify({
                    workspaceId,
                    latitude: currentLocation?.lat,
                    longitude: currentLocation?.lon
                })
            })

            if (!res.ok) {
                const data = await res.json()
                throw new Error(data.message || '퇴근 처리에 실패했습니다')
            }

            toast.success('퇴근 처리되었습니다!')
            setShowModal(false)
            onAttendanceUpdate?.()
        } catch (error: any) {
            toast.error(error.message || '퇴근 처리에 실패했습니다')
        } finally {
            setIsLoading(false)
        }
    }

    const isCheckedIn = !!todayAttendance?.checkIn
    const isCheckedOut = !!todayAttendance?.checkOut

    return (
        <>
            <Card
                className="rounded-3xl border-0 shadow-[0_8px_30px_rgb(0,0,0,0.04)] bg-lime-400 text-slate-900 hover:-translate-y-1 transition-all duration-300 col-span-1 md:col-span-2 lg:col-span-2 relative overflow-hidden group border border-white/10"
            >
                <div className="absolute top-0 right-0 p-32 bg-white opacity-20 blur-3xl rounded-full -mr-20 -mt-20 transition-transform duration-700 group-hover:scale-110"></div>
                <div className="absolute bottom-0 left-0 p-20 bg-lime-300 opacity-40 blur-3xl rounded-full -ml-10 -mb-10"></div>

                <CardContent className="p-6 h-[180px] flex flex-col justify-between relative z-10">
                    <div className="flex justify-between items-start">
                        <div className="flex items-center gap-3 cursor-pointer" onClick={handleOpenModal}>
                            <div className="p-2.5 bg-black/10 backdrop-blur-md rounded-full border border-black/5 shadow-sm">
                                <Coffee className="h-5 w-5 text-slate-900" />
                            </div>
                            <div>
                                <h3 className="font-bold text-lg tracking-tight text-slate-900">내 근태 현황</h3>
                                <p className="text-slate-800 text-xs font-medium opacity-80">클릭하여 상세보기</p>
                            </div>
                        </div>
                        <Badge className="bg-black text-lime-400 hover:bg-slate-900 border-0 backdrop-blur-md px-3 py-1 shadow-lg rounded-full">
                            {isCheckedOut ? '퇴근 완료' : isCheckedIn ? '출근 완료' : '미출근'}
                        </Badge>
                    </div>

                    <div className="grid grid-cols-2 gap-4 mt-2">
                        <div className="relative">
                            <p className="text-slate-800 text-xs font-medium mb-1 opacity-70">출근 시간</p>
                            <div className="flex items-baseline gap-2">
                                <span className="text-2xl font-bold tracking-tight text-slate-900 drop-shadow-sm">
                                    {todayAttendance?.checkIn
                                        ? format(new Date(todayAttendance.checkIn), 'HH:mm')
                                        : '--:--'}
                                </span>
                                {todayAttendance?.checkIn && (
                                    <span className="text-[10px] font-bold bg-white/40 text-slate-900 border border-white/20 px-1.5 py-0.5 rounded-full backdrop-blur-sm shadow-sm">정상</span>
                                )}
                            </div>
                        </div>
                        <div>
                            <p className="text-slate-800 text-xs font-medium mb-1 opacity-70">퇴근 시간</p>
                            <div className="flex items-baseline gap-2">
                                <span className={`text-2xl font-bold tracking-tight text-slate-900 ${!todayAttendance?.checkOut ? 'opacity-50' : ''}`}>
                                    {todayAttendance?.checkOut
                                        ? format(new Date(todayAttendance.checkOut), 'HH:mm')
                                        : '--:--'}
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* 출퇴근 버튼 */}
                    <div className="flex gap-2 mt-2">
                        {!isCheckedIn ? (
                            <Button
                                onClick={handleCheckIn}
                                disabled={isLoading}
                                className="flex-1 h-10 bg-black hover:bg-slate-800 text-lime-400 rounded-xl font-bold text-sm"
                            >
                                {isLoading ? (
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                    <>
                                        <LogIn className="w-4 h-4 mr-1" />
                                        출근하기
                                    </>
                                )}
                            </Button>
                        ) : !isCheckedOut ? (
                            <Button
                                onClick={handleCheckOut}
                                disabled={isLoading}
                                className="flex-1 h-10 bg-black hover:bg-slate-800 text-lime-400 rounded-xl font-bold text-sm"
                            >
                                {isLoading ? (
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                    <>
                                        <LogOut className="w-4 h-4 mr-1" />
                                        퇴근하기
                                    </>
                                )}
                            </Button>
                        ) : (
                            <div className="flex-1 h-10 bg-black/20 rounded-xl flex items-center justify-center text-slate-800 font-bold text-sm">
                                <CheckCircle2 className="w-4 h-4 mr-1" />
                                오늘 근무 완료
                            </div>
                        )}
                    </div>
                </CardContent>
            </Card>

            {/* 출퇴근 모달 */}
            <Dialog open={showModal} onOpenChange={setShowModal}>
                <DialogContent className="bg-white border-slate-200 rounded-3xl shadow-xl max-w-md">
                    <DialogHeader>
                        <DialogTitle className="text-slate-900 flex items-center gap-2 text-xl">
                            <Clock className="w-6 h-6 text-lime-500" />
                            출퇴근 관리
                        </DialogTitle>
                    </DialogHeader>

                    <div className="space-y-6 py-4">
                        {/* 현재 시간 */}
                        <div className="text-center">
                            <p className="text-sm text-slate-500 mb-1">현재 시간</p>
                            <p className="text-4xl font-bold text-slate-900">
                                {format(new Date(), 'HH:mm:ss')}
                            </p>
                            <p className="text-sm text-slate-500 mt-1">
                                {format(new Date(), 'yyyy년 M월 d일 (EEEE)')}
                            </p>
                        </div>

                        {/* 위치 정보 */}
                        <div className="flex items-center justify-center gap-2 text-sm">
                            {locationLoading ? (
                                <span className="text-slate-400 flex items-center gap-1">
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                    위치 확인 중...
                                </span>
                            ) : currentLocation ? (
                                <span className="text-green-600 flex items-center gap-1">
                                    <MapPin className="w-4 h-4" />
                                    위치 확인됨
                                </span>
                            ) : (
                                <span className="text-slate-400 flex items-center gap-1">
                                    <MapPin className="w-4 h-4" />
                                    위치 정보 없음
                                </span>
                            )}
                        </div>

                        {/* 오늘 출퇴근 현황 */}
                        <div className="bg-slate-50 rounded-2xl p-4 space-y-3">
                            <h4 className="font-semibold text-slate-700 text-sm">오늘 출퇴근 현황</h4>
                            <div className="grid grid-cols-2 gap-4">
                                <div className={`p-3 rounded-xl ${isCheckedIn ? 'bg-lime-100' : 'bg-white'} border border-slate-200`}>
                                    <p className="text-xs text-slate-500 mb-1">출근</p>
                                    <p className={`font-bold text-lg ${isCheckedIn ? 'text-lime-700' : 'text-slate-400'}`}>
                                        {todayAttendance?.checkIn
                                            ? format(new Date(todayAttendance.checkIn), 'HH:mm')
                                            : '--:--'}
                                    </p>
                                </div>
                                <div className={`p-3 rounded-xl ${isCheckedOut ? 'bg-blue-100' : 'bg-white'} border border-slate-200`}>
                                    <p className="text-xs text-slate-500 mb-1">퇴근</p>
                                    <p className={`font-bold text-lg ${isCheckedOut ? 'text-blue-700' : 'text-slate-400'}`}>
                                        {todayAttendance?.checkOut
                                            ? format(new Date(todayAttendance.checkOut), 'HH:mm')
                                            : '--:--'}
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* 출퇴근 버튼 */}
                        <div className="grid grid-cols-2 gap-3">
                            <Button
                                onClick={(e) => {
                                    e.stopPropagation()
                                    handleCheckIn()
                                }}
                                disabled={isLoading || isCheckedIn}
                                className={`h-14 rounded-2xl font-bold text-base ${
                                    isCheckedIn
                                        ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                                        : 'bg-lime-500 hover:bg-lime-600 text-white'
                                }`}
                            >
                                {isLoading ? (
                                    <Loader2 className="w-5 h-5 animate-spin" />
                                ) : isCheckedIn ? (
                                    <>
                                        <CheckCircle2 className="w-5 h-5 mr-2" />
                                        출근 완료
                                    </>
                                ) : (
                                    <>
                                        <LogIn className="w-5 h-5 mr-2" />
                                        출근하기
                                    </>
                                )}
                            </Button>
                            <Button
                                onClick={(e) => {
                                    e.stopPropagation()
                                    handleCheckOut()
                                }}
                                disabled={isLoading || !isCheckedIn || isCheckedOut}
                                className={`h-14 rounded-2xl font-bold text-base ${
                                    isCheckedOut
                                        ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                                        : !isCheckedIn
                                        ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                                        : 'bg-blue-500 hover:bg-blue-600 text-white'
                                }`}
                            >
                                {isLoading ? (
                                    <Loader2 className="w-5 h-5 animate-spin" />
                                ) : isCheckedOut ? (
                                    <>
                                        <CheckCircle2 className="w-5 h-5 mr-2" />
                                        퇴근 완료
                                    </>
                                ) : (
                                    <>
                                        <LogOut className="w-5 h-5 mr-2" />
                                        퇴근하기
                                    </>
                                )}
                            </Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        </>
    )
}
