import React from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Briefcase, FolderKanban, Plus, Clock } from 'lucide-react'
import Link from 'next/link'
import { format } from 'date-fns'
import { ko } from 'date-fns/locale'
import { TimeWidget } from '../widgets/TimeWidget'
import { WeatherWidget } from '../widgets/WeatherWidget'
import { StatsWidget } from '../widgets/StatsWidget'
import { QuickActionsWidget } from '../widgets/QuickActionsWidget'
import { RecentActivityWidget } from '../widgets/RecentActivityWidget'
import { NoticeWidget } from '../widgets/NoticeWidget'
import { BoardWidget } from '../widgets/BoardWidget'

interface Activity {
    id: string
    title: string
    desc: string
    time: string
    status: string
    taskId?: string
}

interface ProjectDashboardProps {
    userProfile: any
    currentWorkspace: any
    currentTime: Date
    quote: string
    weather: any
    stats: any
    announcements: any[]
    boardPosts: any[]
    recentActivities?: Activity[]
    getGreeting: () => string
}

export function ProjectDashboard({
    userProfile,
    currentWorkspace,
    currentTime,
    quote,
    weather,
    stats,
    announcements,
    boardPosts,
    recentActivities = [],
    getGreeting
}: ProjectDashboardProps) {
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
                        <Briefcase className="h-4 w-4" />
                        {currentWorkspace?.name} · {format(currentTime, 'yyyy년 MM월 dd일 EEEE', { locale: ko })}
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <Link href="/projects">
                        <Button variant="outline" className="rounded-xl bg-white/50 hover:bg-white/80 text-slate-700 border-white/40 backdrop-blur-sm shadow-sm">
                            <FolderKanban className="mr-2 h-4 w-4" /> 프로젝트
                        </Button>
                    </Link>
                    <Link href="/tasks">
                        <Button className="rounded-xl bg-black text-lime-400 hover:bg-slate-900 hover:text-lime-300 shadow-lg shadow-black/20 transition-all hover:-translate-y-0.5 font-bold">
                            <Plus className="mr-2 h-4 w-4" /> 새 업무
                        </Button>
                    </Link>
                </div>
            </div>

            {/* Top Widgets Row */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <TimeWidget />
                <WeatherWidget weather={weather} />

                {/* Project Progress Widget - Lime Green Theme */}
                <Card className="rounded-3xl border-0 shadow-[0_8px_30px_rgb(0,0,0,0.04)] bg-lime-400 text-slate-900 hover:-translate-y-1 transition-all duration-300 col-span-1 md:col-span-2 lg:col-span-2 relative overflow-hidden group border border-white/10">
                    <div className="absolute top-0 right-0 p-32 bg-white opacity-20 blur-3xl rounded-full -mr-20 -mt-20 transition-transform duration-700 group-hover:scale-110"></div>
                    <div className="absolute bottom-0 left-0 p-20 bg-lime-300 opacity-40 blur-3xl rounded-full -ml-10 -mb-10"></div>

                    <CardContent className="p-6 h-[160px] flex flex-col justify-between relative z-10">
                        <div className="flex justify-between items-start">
                            <div className="flex items-center gap-3">
                                <div className="p-2.5 bg-black/10 backdrop-blur-md rounded-full border border-black/5 shadow-sm">
                                    <FolderKanban className="h-5 w-5 text-slate-900" />
                                </div>
                                <div>
                                    <h3 className="font-bold text-lg tracking-tight text-slate-900">프로젝트 현황</h3>
                                    <p className="text-slate-800 text-xs font-medium opacity-80">오늘도 화이팅하세요!</p>
                                </div>
                            </div>
                            <Badge className="bg-black text-lime-400 hover:bg-slate-900 border-0 backdrop-blur-md px-3 py-1 shadow-lg rounded-full">
                                {stats.totalTasks > 0 ? `${Math.round((stats.completedTasks / stats.totalTasks) * 100)}% 완료` : '진행 중'}
                            </Badge>
                        </div>

                        <div className="grid grid-cols-3 gap-4 mt-2">
                            <div className="relative">
                                <p className="text-slate-800 text-xs font-medium mb-1 opacity-70">전체 작업</p>
                                <span className="text-3xl font-bold tracking-tight text-slate-900 drop-shadow-sm">
                                    {stats.totalTasks}
                                </span>
                            </div>
                            <div>
                                <p className="text-slate-800 text-xs font-medium mb-1 opacity-70">완료</p>
                                <span className="text-3xl font-bold tracking-tight text-slate-900">
                                    {stats.completedTasks}
                                </span>
                            </div>
                            <div>
                                <p className="text-slate-800 text-xs font-medium mb-1 opacity-70">지연</p>
                                <span className="text-3xl font-bold tracking-tight text-rose-700">
                                    {stats.overdueTasks}
                                </span>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Task Stats Widgets */}
            <StatsWidget stats={stats} />

            {/* Quick Actions & Recent Activity */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <QuickActionsWidget />
                <RecentActivityWidget userProfile={userProfile} activities={recentActivities} />
            </div>

            {/* Notices & Board Row */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <NoticeWidget announcements={announcements} />
                <BoardWidget boardPosts={boardPosts} />
            </div>
        </div>
    )
}
