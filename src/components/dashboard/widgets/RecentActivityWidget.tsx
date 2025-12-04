import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Timer, ChevronRight } from 'lucide-react'
import Link from 'next/link'
import { UserProfile } from '@/lib/auth-context'

interface Activity {
    id: string
    title: string
    desc: string
    time: string
    status: string
    taskId?: string
}

interface RecentActivityWidgetProps {
    userProfile: UserProfile | null
    activities?: Activity[]
}

export function RecentActivityWidget({ userProfile, activities = [] }: RecentActivityWidgetProps) {
    // 활동이 없을 경우 기본 메시지 표시를 위한 빈 배열 처리
    const displayActivities = activities.length > 0 ? activities : []

    return (
        <Card className="rounded-3xl border-0 shadow-[0_8px_30px_rgb(0,0,0,0.04)] bg-white/70 backdrop-blur-xl border border-white/40 lg:col-span-2">
            <CardHeader className="pb-4 border-b border-slate-100/50">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <div className="p-1.5 bg-lime-100 rounded-full">
                            <Timer className="h-4 w-4 text-lime-700" />
                        </div>
                        <CardTitle className="text-base font-bold text-slate-900">최근 활동</CardTitle>
                    </div>
                    <Link href="/tasks">
                        <Button variant="ghost" size="sm" className="h-8 text-xs text-slate-400 hover:text-lime-600 rounded-full">
                            전체보기 <ChevronRight className="ml-1 h-3 w-3" />
                        </Button>
                    </Link>
                </div>
            </CardHeader>
            <CardContent className="p-0">
                {displayActivities.length > 0 ? (
                    displayActivities.map((item) => (
                        <Link key={item.id} href={item.taskId ? `/tasks?taskId=${item.taskId}` : '/tasks'}>
                            <div className="flex items-center gap-4 p-4 hover:bg-white/50 transition-colors border-b border-slate-50 last:border-0 cursor-pointer group">
                                <div className="relative">
                                    <Avatar className="h-10 w-10 border-2 border-white shadow-sm group-hover:scale-105 transition-transform">
                                        <AvatarFallback className="bg-black text-lime-400 font-bold text-xs">
                                            {userProfile?.displayName?.charAt(0) || 'U'}
                                        </AvatarFallback>
                                    </Avatar>
                                    <div className="absolute -bottom-1 -right-1 bg-white rounded-full p-0.5">
                                        <div className={`w-2.5 h-2.5 rounded-full border-2 border-white ${item.status === 'completed' ? 'bg-emerald-500' :
                                                item.status === 'progress' ? 'bg-blue-500' :
                                                    item.status === 'overdue' ? 'bg-rose-500' :
                                                        'bg-slate-400'
                                            }`}></div>
                                    </div>
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center justify-between mb-1">
                                        <p className="text-sm font-semibold text-slate-900 truncate group-hover:text-lime-600 transition-colors">{item.title}</p>
                                        <span className="text-[10px] text-slate-400">{item.time}</span>
                                    </div>
                                    <p className="text-xs text-slate-500">{item.desc}</p>
                                </div>
                                <Button size="icon" variant="secondary" className="h-8 w-8 rounded-full bg-slate-100/50 text-slate-400 group-hover:bg-lime-400 group-hover:text-slate-900 transition-colors">
                                    <ChevronRight className="h-4 w-4" />
                                </Button>
                            </div>
                        </Link>
                    ))
                ) : (
                    <div className="p-8 text-center text-slate-400">
                        <Timer className="h-8 w-8 mx-auto mb-2 opacity-50" />
                        <p className="text-sm">최근 활동이 없습니다</p>
                    </div>
                )}
            </CardContent>
        </Card>
    )
}
