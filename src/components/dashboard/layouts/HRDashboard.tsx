import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Users, UserCheck, UserX, Briefcase, Building2, CalendarDays, Bell, TrendingUp, ChevronRight, FileText, Calendar } from 'lucide-react'
import Link from 'next/link'
import { format } from 'date-fns'
import { ko } from 'date-fns/locale'
import { TimeWidget } from '../widgets/TimeWidget'
import { WeatherWidget } from '../widgets/WeatherWidget'
import { AttendanceWidget } from '../widgets/AttendanceWidget'
import { NoticeWidget } from '../widgets/NoticeWidget'
import { BoardWidget } from '../widgets/BoardWidget'

interface AttendanceRecord {
    id: string
    name: string
    team: string
    checkIn: string
    status: string
}

interface HRDashboardProps {
    userProfile: any
    currentWorkspace: any
    currentTime: Date
    quote: string
    weather: any
    todayAttendance: any
    hrStats: any
    announcements: any[]
    boardPosts: any[]
    attendanceList?: AttendanceRecord[]
    getGreeting: () => string
    workspaceId?: string
    userId?: string
    onAttendanceUpdate?: () => void
}

export function HRDashboard({
    userProfile,
    currentWorkspace,
    currentTime,
    quote,
    weather,
    todayAttendance,
    hrStats,
    announcements,
    boardPosts,
    attendanceList = [],
    getGreeting,
    workspaceId = '',
    userId = '',
    onAttendanceUpdate
}: HRDashboardProps) {
    return (
        <div className="max-w-7xl mx-auto w-full space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700 p-6">
            {/* Header Section */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div className="space-y-1">
                    <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                        <h1 className="text-3xl font-bold tracking-tight text-slate-900">
                            {getGreeting()}, {userProfile?.displayName}님
                        </h1>
                        <span className="text-sm text-slate-400 italic">
                            &ldquo;{quote}&rdquo;
                        </span>
                    </div>
                    <p className="text-slate-500 font-medium flex items-center gap-2">
                        <Building2 className="h-4 w-4" />
                        {currentWorkspace?.name} · {format(currentTime, 'yyyy년 MM월 dd일 EEEE', { locale: ko })}
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <Link href="/hr/attendance">
                        <Button variant="outline" className="rounded-xl bg-white/50 hover:bg-white/80 text-slate-700 border-white/40 backdrop-blur-sm shadow-sm">
                            <CalendarDays className="mr-2 h-4 w-4" /> 근태 관리
                        </Button>
                    </Link>
                    <Link href="/groupware/announcements">
                        <Button className="rounded-xl bg-black text-lime-400 hover:bg-slate-900 hover:text-lime-300 shadow-lg shadow-black/20 transition-all hover:-translate-y-0.5 font-bold">
                            <Bell className="mr-2 h-4 w-4" /> 공지 작성
                        </Button>
                    </Link>
                </div>
            </div>

            {/* Top Widgets Row */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <TimeWidget />
                <WeatherWidget weather={weather} />
                <AttendanceWidget
                    todayAttendance={todayAttendance}
                    workspaceId={workspaceId}
                    userId={userId}
                    onAttendanceUpdate={onAttendanceUpdate}
                />
            </div>

            {/* HR Stats Widgets */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {[
                    { label: "전체 직원", count: hrStats.totalEmployees, icon: Users, color: "text-slate-600", bg: "bg-white/60 backdrop-blur-xl", iconBg: "bg-slate-100/80" },
                    { label: "출근", count: hrStats.presentToday, icon: UserCheck, color: "text-emerald-600", bg: "bg-white/60 backdrop-blur-xl", iconBg: "bg-emerald-50/80" },
                    { label: "미출근", count: hrStats.absentToday, icon: UserX, color: "text-rose-600", bg: "bg-white/60 backdrop-blur-xl", iconBg: "bg-rose-50/80" },
                    { label: "휴가", count: hrStats.onLeave, icon: Briefcase, color: "text-blue-600", bg: "bg-white/60 backdrop-blur-xl", iconBg: "bg-blue-50/80" },
                ].map((stat, index) => (
                    <Card
                        key={index}
                        className={`rounded-3xl border border-white/40 shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] transition-all duration-300 hover:-translate-y-1 cursor-pointer group relative overflow-hidden ${stat.bg}`}
                    >
                        <div className="absolute inset-0 bg-gradient-to-br from-white/40 to-transparent pointer-events-none" />
                        <CardContent className="p-5 flex flex-col items-center justify-center text-center h-[140px] relative z-10">
                            <div className={`p-3 rounded-full mb-3 transition-transform duration-300 group-hover:scale-110 shadow-sm backdrop-blur-sm ${stat.iconBg} ${stat.color}`}>
                                <stat.icon className="h-6 w-6" />
                            </div>
                            <span className="text-3xl font-bold text-slate-800 tracking-tight drop-shadow-sm">{stat.count}</span>
                            <p className="text-xs text-slate-500 mt-1 font-medium">{stat.label}</p>
                        </CardContent>
                    </Card>
                ))}
            </div>

            {/* Quick Actions & Attendance List */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Quick Actions */}
                <Card className="rounded-3xl border-0 shadow-[0_8px_30px_rgb(0,0,0,0.04)] bg-white/70 backdrop-blur-xl border border-white/40">
                    <CardHeader className="pb-4 border-b border-slate-100/50">
                        <div className="flex items-center gap-2">
                            <div className="p-1.5 bg-lime-100 rounded-full">
                                <TrendingUp className="h-4 w-4 text-lime-700" />
                            </div>
                            <CardTitle className="text-base font-bold text-slate-900">빠른 실행</CardTitle>
                        </div>
                    </CardHeader>
                    <CardContent className="p-5 space-y-3">
                        <Link href="/hr/attendance" className="block">
                            <Button variant="outline" className="w-full justify-start rounded-xl h-12 hover:bg-lime-50 hover:border-lime-200 hover:text-lime-700">
                                <CalendarDays className="mr-3 h-5 w-5" />
                                근태 기록 확인
                            </Button>
                        </Link>
                        <Link href="/groupware/announcements" className="block">
                            <Button variant="outline" className="w-full justify-start rounded-xl h-12 hover:bg-lime-50 hover:border-lime-200 hover:text-lime-700">
                                <Bell className="mr-3 h-5 w-5" />
                                공지사항 보기
                            </Button>
                        </Link>
                        <Link href="/groupware/board" className="block">
                            <Button variant="outline" className="w-full justify-start rounded-xl h-12 hover:bg-lime-50 hover:border-lime-200 hover:text-lime-700">
                                <FileText className="mr-3 h-5 w-5" />
                                게시판 보기
                            </Button>
                        </Link>
                        <Link href="/calendar" className="block">
                            <Button variant="outline" className="w-full justify-start rounded-xl h-12 hover:bg-lime-50 hover:border-lime-200 hover:text-lime-700">
                                <Calendar className="mr-3 h-5 w-5" />
                                일정 확인
                            </Button>
                        </Link>
                        <Link href="/workspace/organization" className="block">
                            <Button variant="outline" className="w-full justify-start rounded-xl h-12 hover:bg-lime-50 hover:border-lime-200 hover:text-lime-700">
                                <Users className="mr-3 h-5 w-5" />
                                조직 관리
                            </Button>
                        </Link>
                    </CardContent>
                </Card>

                {/* Today's Attendance Status */}
                <Card className="rounded-3xl border-0 shadow-[0_8px_30px_rgb(0,0,0,0.04)] bg-white/70 backdrop-blur-xl border border-white/40 lg:col-span-2">
                    <CardHeader className="pb-4 border-b border-slate-100/50">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <div className="p-1.5 bg-emerald-100 rounded-full">
                                    <UserCheck className="h-4 w-4 text-emerald-700" />
                                </div>
                                <CardTitle className="text-base font-bold text-slate-900">오늘의 출근 현황</CardTitle>
                            </div>
                            <Link href="/hr/attendance">
                                <Button variant="ghost" size="sm" className="h-8 text-xs text-slate-400 hover:text-lime-600 rounded-full">
                                    전체보기 <ChevronRight className="ml-1 h-3 w-3" />
                                </Button>
                            </Link>
                        </div>
                    </CardHeader>
                    <CardContent className="p-0">
                        {attendanceList.length > 0 ? (
                            attendanceList.map((employee) => (
                                <div key={employee.id} className="flex items-center gap-4 p-4 hover:bg-white/50 transition-colors border-b border-slate-50 last:border-0 cursor-pointer group">
                                    <Avatar className="h-10 w-10 border-2 border-white shadow-sm group-hover:scale-105 transition-transform">
                                        <AvatarFallback className="bg-black text-lime-400 font-bold text-xs">
                                            {employee.name.charAt(0)}
                                        </AvatarFallback>
                                    </Avatar>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center justify-between mb-1">
                                            <p className="text-sm font-semibold text-slate-900">{employee.name}</p>
                                            <Badge className={`rounded-full text-[10px] ${employee.status === 'present' || employee.status === 'remote' ? 'bg-emerald-100 text-emerald-700' :
                                                    employee.status === 'late' ? 'bg-amber-100 text-amber-700' :
                                                        'bg-rose-100 text-rose-700'
                                                }`}>
                                                {employee.status === 'present' ? '출근' :
                                                 employee.status === 'remote' ? '재택' :
                                                 employee.status === 'late' ? '지각' : '미출근'}
                                            </Badge>
                                        </div>
                                        <p className="text-xs text-slate-500">{employee.team} · 출근 {employee.checkIn}</p>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="p-8 text-center text-slate-400">
                                <Users className="h-8 w-8 mx-auto mb-2 opacity-50" />
                                <p className="text-sm">오늘 출근 기록이 없습니다</p>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>

            {/* Notices & Board Row */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <NoticeWidget announcements={announcements} />
                <BoardWidget boardPosts={boardPosts} />
            </div>
        </div>
    )
}
