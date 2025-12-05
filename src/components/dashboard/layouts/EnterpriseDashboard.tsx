import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Calendar, Plus, FolderKanban, ArrowUpRight } from 'lucide-react'
import Link from 'next/link'
import { format } from 'date-fns'
import { ko } from 'date-fns/locale'
import { TimeWidget } from '../widgets/TimeWidget'
import { WeatherWidget } from '../widgets/WeatherWidget'
import { AttendanceWidget } from '../widgets/AttendanceWidget'
import { StatsWidget } from '../widgets/StatsWidget'
import { RecentActivityWidget } from '../widgets/RecentActivityWidget'
import { NoticeWidget } from '../widgets/NoticeWidget'
import { BoardWidget } from '../widgets/BoardWidget'
import { BirthdayBanner } from '../widgets/BirthdayBanner'

interface Activity {
    id: string
    title: string
    desc: string
    time: string
    status: string
    taskId?: string
}

interface EnterpriseDashboardProps {
    userProfile: any
    currentTime: Date
    quote: string
    weather: any
    todayAttendance: any
    stats: any
    announcements: any[]
    boardPosts: any[]
    recentActivities?: Activity[]
    getGreeting: () => string
}

export function EnterpriseDashboard({
    userProfile,
    currentTime,
    quote,
    weather,
    todayAttendance,
    stats,
    announcements,
    boardPosts,
    recentActivities = [],
    getGreeting
}: EnterpriseDashboardProps) {
    return (
        <div className="max-w-7xl mx-auto w-full space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700 p-6">
            <BirthdayBanner userProfile={userProfile} />

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
                    <p className="text-slate-500 font-medium">
                        {format(currentTime, 'yyyy년 MM월 dd일 EEEE', { locale: ko })}
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <Link href="/calendar">
                        <Button variant="outline" className="rounded-xl bg-white/50 hover:bg-white/80 text-slate-700 border-white/40 backdrop-blur-sm shadow-sm">
                            <Calendar className="mr-2 h-4 w-4" /> 일정 관리
                        </Button>
                    </Link>
                    <Link href="/tasks">
                        <Button className="rounded-xl bg-black text-lime-400 hover:bg-slate-900 hover:text-lime-300 shadow-lg shadow-black/20 transition-all hover:-translate-y-0.5 font-bold">
                            <Plus className="mr-2 h-4 w-4" /> 새 업무 작성
                        </Button>
                    </Link>
                </div>
            </div>

            {/* Top Widgets Row */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <TimeWidget />
                <WeatherWidget weather={weather} />
                <AttendanceWidget todayAttendance={todayAttendance} />
            </div>

            {/* Stats & Metrics Area */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Left Column: Stats Widgets + Activity Widget */}
                <div className="lg:col-span-2 space-y-6">
                    <StatsWidget stats={stats} />
                    <RecentActivityWidget userProfile={userProfile} activities={recentActivities} />
                </div>

                {/* Right Column: Project Summary */}
                <div className="space-y-6">
                    <Card className="rounded-3xl border-0 shadow-[0_8px_30px_rgb(0,0,0,0.04)] bg-white/70 backdrop-blur-xl border border-white/40 h-full flex flex-col">
                        <CardHeader className="pb-4 border-b border-slate-100/50">
                            <div className="flex items-center gap-2">
                                <div className="p-1.5 bg-slate-100 rounded-full">
                                    <FolderKanban className="h-4 w-4 text-slate-600" />
                                </div>
                                <CardTitle className="text-base font-bold text-slate-900">프로젝트 현황</CardTitle>
                            </div>
                        </CardHeader>
                        <CardContent className="flex-1 p-5">
                            <div className="space-y-4">
                                <div className="text-center py-4">
                                    <div className="text-5xl font-bold text-lime-500 mb-2">{stats.totalTasks}</div>
                                    <p className="text-sm text-slate-500">전체 작업</p>
                                </div>
                                <div className="space-y-3">
                                    <div className="flex items-center justify-between p-3 bg-white/50 rounded-2xl">
                                        <span className="text-sm text-slate-600">완료율</span>
                                        <span className="font-bold text-lime-600">
                                            {stats.totalTasks > 0
                                                ? Math.round((stats.completedTasks / stats.totalTasks) * 100)
                                                : 0}%
                                        </span>
                                    </div>
                                    <div className="flex items-center justify-between p-3 bg-white/50 rounded-2xl">
                                        <span className="text-sm text-slate-600">진행 중</span>
                                        <span className="font-bold text-blue-600">{stats.incompleteTasks}</span>
                                    </div>
                                    <div className="flex items-center justify-between p-3 bg-white/50 rounded-2xl">
                                        <span className="text-sm text-slate-600">지연</span>
                                        <span className="font-bold text-rose-600">{stats.overdueTasks}</span>
                                    </div>
                                </div>
                                <Link href="/projects" className="block">
                                    <Button className="w-full rounded-xl bg-black text-lime-400 hover:bg-slate-900 font-bold mt-2">
                                        프로젝트 보기 <ArrowUpRight className="ml-2 h-4 w-4" />
                                    </Button>
                                </Link>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>

            {/* Notices & Board Row */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <NoticeWidget announcements={announcements} />
                <BoardWidget boardPosts={boardPosts} />
            </div>
        </div>
    )
}
