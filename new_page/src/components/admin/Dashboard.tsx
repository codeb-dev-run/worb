'use client'

import { useState, useEffect } from 'react'
import {
  Clock,
  Sun,
  Coffee,
  CheckCircle2,
  Timer,
  AlertCircle,
  FileText,
  ChevronRight,
  Plus,
  Calendar,
  Folder,
  UserCheck,
  MoreHorizontal,
  ArrowUpRight,
  Bell,
  Settings2,
  CloudRain,
  CloudSnow,
  Cloudy
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card"
import { Button } from "../ui/button"
import { Badge } from "../ui/badge"
import { format } from 'date-fns'
import { ko } from 'date-fns/locale'
import Link from 'next/link'

// ============================================================================
// 타입 정의
// ============================================================================

interface UserProfile {
  id: string
  displayName: string
  email?: string
}

interface Attendance {
  checkIn: string | null
  checkOut: string | null
  status: 'PRESENT' | 'LATE' | 'ABSENT' | 'REMOTE' | null
}

interface Weather {
  temp: number
  description: string
  humidity: number
  windSpeed: number
  icon?: string
}

interface ApprovalStats {
  pending: number
  inProgress: number
  rejected: number
  approved: number
}

interface RecentActivity {
  id: string
  title: string
  description: string
  requesterName: string
  requesterTeam: string
  time: string
  avatarUrl?: string
}

interface Announcement {
  id: string
  title: string
  date: string
  tag: string
  tagColor: string
  isNew?: boolean
}

interface BoardPost {
  id: string
  title: string
  author: string
  team: string
  date: string
  comments: number
}

interface DashboardProps {
  userProfile?: UserProfile | null
  currentTime?: Date
  attendance?: Attendance | null
  weather?: Weather | null
  approvalStats?: ApprovalStats
  recentActivities?: RecentActivity[]
  announcements?: Announcement[]
  boardPosts?: BoardPost[]
}

// ============================================================================
// 헬퍼 함수
// ============================================================================

const getGreeting = (hour: number): string => {
  if (hour < 6) return '새벽이에요'
  if (hour < 12) return '좋은 아침이에요'
  if (hour < 14) return '점심 맛있게 드세요'
  if (hour < 18) return '좋은 오후에요'
  if (hour < 22) return '좋은 저녁이에요'
  return '늦은 밤이에요'
}

const getTimeMessage = (hour: number): string => {
  if (hour >= 9 && hour < 12) return '오전 근무 시간입니다'
  if (hour >= 12 && hour < 13) return '점심 시간입니다'
  if (hour >= 13 && hour < 18) return '오후 근무 시간입니다'
  if (hour >= 18) return '퇴근 시간입니다'
  return '출근 전입니다'
}

const getAttendanceStatus = (status: string | null | undefined): { label: string; badge: string } => {
  switch (status) {
    case 'PRESENT':
      return { label: '정상 출근', badge: 'SAFE' }
    case 'LATE':
      return { label: '지각', badge: 'LATE' }
    case 'REMOTE':
      return { label: '재택 근무', badge: 'REMOTE' }
    case 'ABSENT':
      return { label: '결근', badge: 'ABSENT' }
    default:
      return { label: '미출근', badge: '--' }
  }
}

const getWeatherIcon = (description: string) => {
  const desc = description.toLowerCase()
  if (desc.includes('rain') || desc.includes('비')) return CloudRain
  if (desc.includes('snow') || desc.includes('눈')) return CloudSnow
  if (desc.includes('cloud') || desc.includes('흐림') || desc.includes('구름')) return Cloudy
  return Sun
}

const getTagColor = (tag: string): string => {
  switch (tag) {
    case '필독':
      return 'bg-red-50 text-red-600'
    case '공지':
      return 'bg-blue-50 text-blue-600'
    case '보안':
      return 'bg-slate-100 text-slate-600'
    case '행사':
      return 'bg-amber-50 text-amber-600'
    default:
      return 'bg-slate-100 text-slate-600'
  }
}

// ============================================================================
// 메인 컴포넌트
// ============================================================================

export function Dashboard({
  userProfile,
  currentTime: initialTime,
  attendance,
  weather,
  approvalStats = { pending: 0, inProgress: 0, rejected: 0, approved: 0 },
  recentActivities = [],
  announcements = [],
  boardPosts = []
}: DashboardProps) {
  const [currentTime, setCurrentTime] = useState(initialTime || new Date())

  // 실시간 시계 업데이트
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date())
    }, 1000)
    return () => clearInterval(timer)
  }, [])

  const hour = currentTime.getHours()
  const greeting = getGreeting(hour)
  const timeMessage = getTimeMessage(hour)
  const attendanceStatus = getAttendanceStatus(attendance?.status)
  const WeatherIcon = weather ? getWeatherIcon(weather.description) : Sun

  // 통계 위젯 데이터
  const statsData = [
    { label: "대기 문서", count: approvalStats.pending, icon: FileText, color: "text-slate-600", bg: "bg-white/60 backdrop-blur-xl", iconBg: "bg-slate-100/80" },
    { label: "진행 중", count: approvalStats.inProgress, icon: Timer, color: "text-blue-600", bg: "bg-white/60 backdrop-blur-xl", iconBg: "bg-blue-50/80" },
    { label: "반려됨", count: approvalStats.rejected, icon: AlertCircle, color: "text-rose-600", bg: "bg-white/60 backdrop-blur-xl", iconBg: "bg-rose-50/80" },
    { label: "승인 완료", count: approvalStats.approved, icon: CheckCircle2, color: "text-emerald-600", bg: "bg-white/60 backdrop-blur-xl", iconBg: "bg-emerald-50/80" },
  ]

  // 빠른 실행 메뉴
  const quickActions = [
    { label: "일정 추가", icon: Calendar, color: "bg-rose-50 text-rose-600", border: "hover:border-rose-100 hover:bg-rose-50/50", href: "/calendar" },
    { label: "프로젝트", icon: Folder, color: "bg-violet-50 text-violet-600", border: "hover:border-violet-100 hover:bg-violet-50/50", href: "/projects" },
    { label: "증명서 발급", icon: FileText, color: "bg-amber-50 text-amber-600", border: "hover:border-amber-100 hover:bg-amber-50/50", href: "/hr/certificates" },
    { label: "휴가 신청", icon: Sun, color: "bg-sky-50 text-sky-600", border: "hover:border-sky-100 hover:bg-sky-50/50", href: "/hr/leave" },
    { label: "조직도", icon: UserCheck, color: "bg-emerald-50 text-emerald-600", border: "hover:border-emerald-100 hover:bg-emerald-50/50", href: "/workspace/organization" },
    { label: "설정", icon: Settings2, color: "bg-slate-100 text-slate-600", border: "hover:border-slate-200 hover:bg-slate-100/50", href: "/settings" },
  ]

  return (
    <div className="max-w-7xl mx-auto w-full space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">
            {greeting}, {userProfile?.displayName || '사용자'}님
          </h1>
          <p className="text-slate-500 font-medium">
            오늘도 활기찬 하루 되세요! {format(currentTime, 'yyyy년 MM월 dd일 EEEE', { locale: ko })}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/calendar">
            <Button variant="outline" className="rounded-xl bg-white/50 hover:bg-white/80 text-slate-700 border-white/40 backdrop-blur-sm shadow-sm">
              <Calendar className="mr-2 h-4 w-4" /> 일정 관리
            </Button>
          </Link>
          <Link href="/tasks/new">
            <Button className="rounded-xl bg-black text-lime-400 hover:bg-slate-900 hover:text-lime-300 shadow-lg shadow-black/20 transition-all hover:-translate-y-0.5 font-bold">
              <Plus className="mr-2 h-4 w-4" /> 새 업무 작성
            </Button>
          </Link>
        </div>
      </div>

      {/* Top Widgets Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Time Widget */}
        <Card className="rounded-3xl border-0 shadow-[0_8px_30px_rgb(0,0,0,0.04)] bg-white/80 backdrop-blur-md hover:-translate-y-1 transition-all duration-300 border border-white/20">
          <CardContent className="p-6 flex flex-col justify-between h-[160px] relative overflow-hidden">
            <div className="absolute right-0 top-0 w-24 h-24 bg-lime-50 rounded-full -mr-8 -mt-8 blur-2xl opacity-60"></div>
            <div className="flex items-center justify-between relative z-10">
              <div className="p-2.5 bg-black text-lime-400 rounded-full shadow-md">
                <Clock className="h-5 w-5" />
              </div>
              <Badge variant="secondary" className="bg-lime-100 text-lime-800 hover:bg-lime-200 border-0 rounded-full px-3">
                Seoul
              </Badge>
            </div>
            <div className="relative z-10 mt-4">
              <span className="text-4xl font-bold tracking-tight text-slate-900">
                {format(currentTime, 'HH:mm')}
              </span>
              <p className="text-sm text-slate-500 mt-1 font-medium">{timeMessage}</p>
            </div>
          </CardContent>
        </Card>

        {/* Weather Widget */}
        <Card className="rounded-3xl border-0 shadow-[0_8px_30px_rgb(0,0,0,0.04)] bg-white/80 backdrop-blur-md hover:-translate-y-1 transition-all duration-300 group border border-white/20">
          <CardContent className="p-6 h-[160px] relative overflow-hidden">
            <div className="absolute right-0 top-0 w-24 h-24 bg-orange-50 rounded-full -mr-8 -mt-8 blur-2xl opacity-60"></div>
            <div className="flex justify-between h-full relative z-10">
              <div className="flex flex-col justify-between">
                <div className="p-2.5 bg-orange-50 text-orange-500 rounded-full w-fit shadow-sm">
                  <WeatherIcon className="h-5 w-5" />
                </div>
                <div className="flex items-center gap-3 text-xs font-medium text-slate-500">
                  <span className="flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-400"></span>
                    습도 {weather?.humidity ?? '--'}%
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-green-400"></span>
                    바람 {weather?.windSpeed ?? '--'}m/s
                  </span>
                </div>
              </div>
              <div className="flex flex-col justify-between items-end">
                <div className="text-right mt-2">
                  <span className="text-4xl font-bold text-slate-900">
                    {weather?.temp !== undefined ? `${Math.round(weather.temp)}°` : '--°'}
                  </span>
                  <p className="text-sm text-slate-500 mt-1">{weather?.description || '날씨 정보 없음'}</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Commute Status Widget - Lime Green Theme */}
        <Card className="rounded-3xl border-0 shadow-[0_8px_30px_rgb(0,0,0,0.04)] bg-lime-400 text-slate-900 hover:-translate-y-1 transition-all duration-300 col-span-1 md:col-span-2 lg:col-span-2 relative overflow-hidden group border border-white/10">
          <div className="absolute top-0 right-0 p-32 bg-white opacity-20 blur-3xl rounded-full -mr-20 -mt-20 transition-transform duration-700 group-hover:scale-110"></div>
          <div className="absolute bottom-0 left-0 p-20 bg-lime-300 opacity-40 blur-3xl rounded-full -ml-10 -mb-10"></div>

          <CardContent className="p-6 h-[160px] flex flex-col justify-between relative z-10">
            <div className="flex justify-between items-start">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-black/10 backdrop-blur-md rounded-full border border-black/5 shadow-sm">
                  <Coffee className="h-5 w-5 text-slate-900" />
                </div>
                <div>
                  <h3 className="font-bold text-lg tracking-tight text-slate-900">근태 현황</h3>
                  <p className="text-slate-800 text-xs font-medium opacity-80">오늘도 화이팅하세요!</p>
                </div>
              </div>
              <Badge className="bg-black text-lime-400 hover:bg-slate-900 border-0 backdrop-blur-md px-3 py-1 shadow-lg rounded-full">
                {attendanceStatus.label}
              </Badge>
            </div>

            <div className="grid grid-cols-2 gap-8 mt-2">
              <div className="relative">
                <p className="text-slate-800 text-xs font-medium mb-1 opacity-70">출근 시간</p>
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-bold tracking-tight text-slate-900 drop-shadow-sm">
                    {attendance?.checkIn ? format(new Date(attendance.checkIn), 'HH:mm') : '--:--'}
                  </span>
                  {attendance?.checkIn && (
                    <span className="text-[10px] font-bold bg-white/40 text-slate-900 border border-white/20 px-1.5 py-0.5 rounded-full backdrop-blur-sm shadow-sm">
                      {attendanceStatus.badge}
                    </span>
                  )}
                </div>
              </div>
              <div>
                <p className="text-slate-800 text-xs font-medium mb-1 opacity-70">퇴근 시간</p>
                <div className="flex items-baseline gap-2">
                  <span className={`text-3xl font-bold tracking-tight text-slate-900 ${!attendance?.checkOut ? 'opacity-50' : ''}`}>
                    {attendance?.checkOut ? format(new Date(attendance.checkOut), 'HH:mm') : '18:00'}
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Stats & Metrics Area - "Liquid Glass" Widgets */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Left Column: Approval Stats Widgets + Activity Widget */}
        <div className="lg:col-span-2 space-y-6">
          {/* 4 Independent Widget Cards - Liquid Glass Style */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {statsData.map((stat, index) => (
              <Card
                key={index}
                className={`rounded-3xl border border-white/40 shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] transition-all duration-300 hover:-translate-y-1 cursor-pointer group relative overflow-hidden ${stat.bg}`}
              >
                {/* Gloss Effect */}
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

          {/* Recent Activity Widget - Glass Style */}
          <Card className="rounded-3xl border-0 shadow-[0_8px_30px_rgb(0,0,0,0.04)] bg-white/70 backdrop-blur-xl border border-white/40">
            <CardHeader className="pb-4 border-b border-slate-100/50">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 bg-lime-100 rounded-full">
                    <Timer className="h-4 w-4 text-lime-700" />
                  </div>
                  <CardTitle className="text-base font-bold text-slate-900">최근 승인 활동</CardTitle>
                </div>
                <Link href="/approval">
                  <Button variant="ghost" size="sm" className="h-8 text-xs text-slate-400 hover:text-lime-600 rounded-full">
                    전체보기 <ChevronRight className="ml-1 h-3 w-3" />
                  </Button>
                </Link>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {recentActivities.length > 0 ? (
                recentActivities.map((activity) => (
                  <div key={activity.id} className="flex items-center gap-4 p-4 hover:bg-white/50 transition-colors border-b border-slate-50 last:border-0 cursor-pointer group">
                    <div className="relative">
                      <div className="h-10 w-10 rounded-full border-2 border-white shadow-sm group-hover:scale-105 transition-transform overflow-hidden bg-black flex items-center justify-center">
                        {activity.avatarUrl ? (
                          <img src={activity.avatarUrl} alt={activity.requesterName} className="h-full w-full object-cover" />
                        ) : (
                          <span className="text-lime-400 font-bold text-xs">
                            {activity.requesterName.charAt(0)}
                          </span>
                        )}
                      </div>
                      <div className="absolute -bottom-1 -right-1 bg-white rounded-full p-0.5">
                        <div className="w-2.5 h-2.5 bg-lime-500 rounded-full border-2 border-white"></div>
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <p className="text-sm font-semibold text-slate-900 truncate group-hover:text-lime-600 transition-colors">
                          {activity.title}
                        </p>
                        <span className="text-[10px] text-slate-400">{activity.time}</span>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-slate-500">
                        <span className="font-medium text-slate-700">{activity.requesterName} ({activity.requesterTeam})</span>
                        <span className="w-1 h-1 rounded-full bg-slate-300"></span>
                        <span>{activity.description}</span>
                      </div>
                    </div>
                    <Button size="icon" variant="secondary" className="h-8 w-8 rounded-full bg-slate-100/50 text-slate-400 group-hover:bg-lime-400 group-hover:text-slate-900 transition-colors">
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                ))
              ) : (
                <div className="p-8 text-center text-slate-400">
                  <Timer className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">최근 승인 활동이 없습니다</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Quick Actions Grid - Glass Style */}
        <div className="space-y-6">
          <Card className="rounded-3xl border-0 shadow-[0_8px_30px_rgb(0,0,0,0.04)] bg-white/70 backdrop-blur-xl border border-white/40 h-full flex flex-col">
            <CardHeader className="pb-4 border-b border-slate-100/50">
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-slate-100 rounded-full">
                  <MoreHorizontal className="h-4 w-4 text-slate-600" />
                </div>
                <CardTitle className="text-base font-bold text-slate-900">빠른 실행</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="flex-1 p-5">
              <div className="grid grid-cols-2 gap-3 h-full content-start">
                {quickActions.map((action, i) => (
                  <Link key={i} href={action.href}>
                    <Button
                      variant="ghost"
                      className={`w-full h-[5.5rem] flex flex-col gap-3 items-center justify-center bg-white/50 rounded-3xl border border-white/60 transition-all duration-300 hover:shadow-md hover:-translate-y-0.5 backdrop-blur-sm ${action.border}`}
                    >
                      <div className={`p-2.5 rounded-full ${action.color} transition-transform group-hover:scale-110 shadow-sm`}>
                        <action.icon className="h-5 w-5" />
                      </div>
                      <span className="text-xs font-semibold text-slate-600">{action.label}</span>
                    </Button>
                  </Link>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Notices & Board Row - Glass Style */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Notices */}
        <Card className="rounded-3xl border-0 shadow-[0_8px_30px_rgb(0,0,0,0.04)] bg-white/70 backdrop-blur-xl border border-white/40">
          <CardHeader className="pb-3 border-b border-slate-100/50">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="flex items-center justify-center w-8 h-8 rounded-full bg-red-50 text-red-500">
                  <Bell className="h-4 w-4" />
                </div>
                <h3 className="font-bold text-lg text-slate-900">공지사항</h3>
              </div>
              <Link href="/groupware/announcements">
                <Button variant="ghost" size="sm" className="text-xs font-medium text-slate-500 hover:text-slate-900 rounded-full">
                  더보기 <ChevronRight className="ml-1 h-3 w-3" />
                </Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {announcements.length > 0 ? (
              <div className="divide-y divide-slate-50/50">
                {announcements.map((item) => (
                  <Link key={item.id} href={`/groupware/announcements/${item.id}`}>
                    <div className="flex items-center justify-between px-5 py-3 hover:bg-white/60 transition-colors cursor-pointer group">
                      <div className="space-y-1.5">
                        <div className="flex items-center gap-2">
                          <Badge variant="secondary" className={`rounded-md px-2 py-0.5 text-[10px] font-bold border-0 ${item.tagColor || getTagColor(item.tag)}`}>
                            {item.tag}
                          </Badge>
                          <span className="text-sm font-medium text-slate-800 group-hover:text-lime-600 transition-colors truncate max-w-[240px] sm:max-w-md">
                            {item.title}
                          </span>
                          {item.isNew && <Badge variant="outline" className="ml-1 h-4 px-1 text-[9px] border-red-200 text-red-500 bg-red-50">N</Badge>}
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <span className="text-xs text-slate-400 hidden sm:block font-medium">{item.date}</span>
                        <ChevronRight className="h-4 w-4 text-slate-300 group-hover:text-lime-400 transition-colors" />
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="p-8 text-center text-slate-400">
                <Bell className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">공지사항이 없습니다</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Posts */}
        <Card className="rounded-3xl border-0 shadow-[0_8px_30px_rgb(0,0,0,0.04)] bg-white/70 backdrop-blur-xl border border-white/40">
          <CardHeader className="pb-3 border-b border-slate-100/50">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="flex items-center justify-center w-8 h-8 rounded-full bg-lime-100 text-lime-700">
                  <FileText className="h-4 w-4" />
                </div>
                <h3 className="font-bold text-lg text-slate-900">최근 게시글</h3>
              </div>
              <Link href="/groupware/board">
                <Button variant="ghost" size="sm" className="text-xs font-medium text-slate-500 hover:text-slate-900 rounded-full">
                  더보기 <ChevronRight className="ml-1 h-3 w-3" />
                </Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {boardPosts.length > 0 ? (
              <div className="divide-y divide-slate-50/50">
                {boardPosts.map((item) => (
                  <Link key={item.id} href={`/groupware/board/${item.id}`}>
                    <div className="flex items-center justify-between px-5 py-3 hover:bg-white/60 transition-colors cursor-pointer group">
                      <div className="flex items-center flex-1 min-w-0 gap-3 mr-4">
                        <span className="text-sm font-medium text-slate-800 group-hover:text-lime-600 transition-colors truncate">
                          {item.title}
                        </span>
                        {item.comments > 0 && (
                          <span className="flex items-center justify-center bg-lime-50 text-lime-700 text-[10px] font-bold h-5 min-w-5 px-1.5 rounded-full shrink-0">
                            {item.comments}
                          </span>
                        )}

                        <div className="hidden sm:flex items-center gap-2 ml-auto text-xs text-slate-400 shrink-0">
                          <span className="text-slate-600 font-medium">{item.team}</span>
                          <span className="text-slate-300">/</span>
                          <span className="text-slate-500">{item.author}</span>
                          <span className="text-slate-300">/</span>
                          <span className="text-slate-400">{item.date}</span>
                        </div>
                      </div>
                      <Button size="icon" variant="ghost" className="h-8 w-8 text-slate-300 group-hover:text-lime-600 hover:bg-lime-50 rounded-full shrink-0">
                        <ArrowUpRight className="h-4 w-4" />
                      </Button>
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="p-8 text-center text-slate-400">
                <FileText className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">최근 게시글이 없습니다</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
