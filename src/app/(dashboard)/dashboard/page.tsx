'use client'

import React, { useEffect, useState } from 'react'
import { useAuth } from '@/lib/auth-context'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  Calendar,
  Plus
} from 'lucide-react'
import { TaskBarChart, TaskDonutChart, TaskLineChart, OverdueAreaChart } from '@/components/dashboard/DashboardCharts'
import { getDashboardStats } from '@/actions/dashboard'

export default function DashboardPage() {
  const { userProfile } = useAuth()
  const [stats, setStats] = useState({
    totalTasks: 0,
    completedTasks: 0,
    incompleteTasks: 0,
    overdueTasks: 0
  })
  const [chartData, setChartData] = useState({
    barData: [],
    donutData: [],
    lineData: [],
    areaData: []
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchData = async () => {
      try {
        const data = await getDashboardStats()

        setStats(data.stats)
        setChartData(data.charts as any)

        setLoading(false)
      } catch (error) {
        console.error('Error fetching dashboard data:', error)
        setLoading(false)
      }
    }

    if (userProfile) {
      fetchData()
    }
  }, [userProfile])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">로딩중...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="w-full max-w-[1920px] mx-auto p-6 space-y-6">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">CMS 개발</h1>
          <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
            <span>상태: <span className="text-green-600 font-medium">상태 좋음</span></span>
            <span>|</span>
            <span>관리자: <span className="text-foreground font-medium">{userProfile?.displayName}</span></span>
          </div>
        </div>
        <div className="flex gap-3">
          <Button variant="outline">
            <Calendar className="mr-2 h-4 w-4" />
            일정
          </Button>
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            작업 추가
          </Button>
        </div>
      </div>

      {/* 요약 카드 */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <SummaryCard title="완료된 작업 합계" value={stats.completedTasks} subText="전체 완료" />
        <SummaryCard title="미완료 작업 합계" value={stats.incompleteTasks} subText="진행중 + 대기" />
        <SummaryCard title="마감일이 지난 작업 합계" value={stats.overdueTasks} subText="조치 필요" />
        <SummaryCard title="작업 합계" value={stats.totalTasks} subText="전체 프로젝트" />
      </div>

      {/* 차트 영역 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <TaskBarChart data={chartData.barData} />
        <TaskDonutChart data={chartData.donutData} />
      </div>

      {/* 차트 영역 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <OverdueAreaChart data={chartData.areaData} />
        <TaskLineChart data={chartData.lineData} />
      </div>
    </div>
  )
}

function SummaryCard({ title, value, subText }: { title: string, value: number, subText: string }) {
  return (
    <Card>
      <CardContent className="p-6 text-center">
        <h3 className="text-sm font-medium text-muted-foreground mb-2">{title}</h3>
        <div className="text-4xl font-bold mb-2">{value}</div>
        <p className="text-xs text-muted-foreground">{subText}</p>
      </CardContent>
    </Card>
  )
}