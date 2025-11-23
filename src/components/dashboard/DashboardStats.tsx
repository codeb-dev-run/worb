'use client'

import React, { useEffect, useState } from 'react'
import { useAuth } from '@/lib/auth-context'
import { getDatabase, ref, onValue, off } from 'firebase/database'
import { app } from '@/lib/firebase'
import statsService from '@/services/stats-service'

interface StatCardProps {
  icon: string
  iconBg: string
  value: string | number
  label: string
  change?: {
    value: string
    isPositive: boolean
  }
  loading?: boolean
}

function StatCard({ icon, iconBg, value, label, change, loading }: StatCardProps) {
  return (
    <div className="card hover:shadow-md transition-shadow">
      <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-2xl mb-4 ${iconBg}`}>
        {icon}
      </div>
      {loading ? (
        <div className="space-y-2">
          <div className="h-8 bg-gray-200 rounded animate-pulse w-20"></div>
          <div className="h-4 bg-gray-200 rounded animate-pulse w-16"></div>
        </div>
      ) : (
        <>
          <div className="text-3xl font-bold text-gray-900 mb-1">{value}</div>
          <div className="text-sm text-gray-600">{label}</div>
          {change && (
            <div className={`inline-flex items-center gap-1 mt-3 px-2 py-1 rounded text-xs ${change.isPositive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
              }`}>
              <span>{change.isPositive ? '↑' : '↓'}</span>
              <span>{change.value}</span>
            </div>
          )}
        </>
      )}
    </div>
  )
}

interface DashboardData {
  completedTasks: number
  activeTasks: number
  totalProjects: number
  activeProjects: number
  totalMessages: number
  unreadMessages: number
  totalRevenue: number
  monthlyRevenue: number
  totalCustomers: number
  activeCustomers: number
  // 이전 기간 데이터 (비교용)
  prevCompletedTasks: number
  prevActiveTasks: number
  prevActiveProjects: number
  prevMonthlyRevenue: number
  prevActiveCustomers: number
  // 변화량
  taskCompletionChange: number
  newActiveTasks: number
  projectChange: number
}

export default function DashboardStats() {
  const { userProfile } = useAuth()
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState<DashboardData>({
    completedTasks: 0,
    activeTasks: 0,
    totalProjects: 0,
    activeProjects: 0,
    totalMessages: 0,
    unreadMessages: 0,
    totalRevenue: 0,
    monthlyRevenue: 0,
    totalCustomers: 0,
    activeCustomers: 0,
    prevCompletedTasks: 0,
    prevActiveTasks: 0,
    prevActiveProjects: 0,
    prevMonthlyRevenue: 0,
    prevActiveCustomers: 0,
    taskCompletionChange: 0,
    newActiveTasks: 0,
    projectChange: 0
  })

  useEffect(() => {
    if (!userProfile) return

    const db = getDatabase(app)
    const fetchData = async () => {
      try {
        // 이전 통계 데이터 가져오기
        const prevStats = await statsService.getPreviousDayStats(userProfile.uid)
        if (prevStats) {
          setData(prev => ({
            ...prev,
            prevCompletedTasks: prevStats.completedTasks,
            prevActiveTasks: prevStats.activeTasks,
            prevActiveProjects: prevStats.activeProjects,
            prevMonthlyRevenue: prevStats.monthlyRevenue,
            prevActiveCustomers: prevStats.activeCustomers
          }))
        }
        // Fetch projects data
        const projectsRef = ref(db, 'projects')
        onValue(projectsRef, (snapshot) => {
          const projects = snapshot.val() || {}
          const projectArray = Object.values(projects) as any[]

          const totalProjects = projectArray.length
          const activeProjects = projectArray.filter(p => p.status === 'in_progress').length

          // 실제 tasks 데이터에서 직접 카운트
          const tasksRef = ref(db, 'tasks')
          onValue(tasksRef, (tasksSnapshot) => {
            const tasks = tasksSnapshot.val() || {}
            const taskArray = Object.values(tasks) as any[]

            const completedTasks = taskArray.filter(t => t.status === 'completed').length
            const activeTasks = taskArray.filter(t => t.status === 'in_progress' || t.status === 'pending').length

            setData(prev => {
              // 이전 값 저장 및 변화량 계산
              const taskCompletionChange = prev.completedTasks > 0
                ? Math.round(((completedTasks - prev.completedTasks) / prev.completedTasks) * 100)
                : 0
              const newActiveTasks = activeTasks - prev.activeTasks
              const projectChange = activeProjects - prev.activeProjects

              return {
                ...prev,
                totalProjects,
                activeProjects,
                completedTasks,
                activeTasks,
                prevCompletedTasks: prev.completedTasks || completedTasks,
                prevActiveTasks: prev.activeTasks || activeTasks,
                prevActiveProjects: prev.activeProjects || activeProjects,
                taskCompletionChange,
                newActiveTasks,
                projectChange
              }
            })
          })
        })

        // Fetch messages data for admin/manager
        if (userProfile.role === 'admin' || userProfile.role === 'member') {
          const messagesRef = ref(db, 'messages')
          onValue(messagesRef, (snapshot) => {
            const messages = snapshot.val() || {}
            let totalMessages = 0
            let unreadMessages = 0

            Object.values(messages).forEach((room: any) => {
              const roomMessages = Object.values(room || {}) as any[]
              totalMessages += roomMessages.length
              unreadMessages += roomMessages.filter(m => !m.read && m.senderId !== userProfile.uid).length
            })

            setData(prev => ({
              ...prev,
              totalMessages,
              unreadMessages
            }))
          })
        }

        // Fetch financial data for admin
        if (userProfile.role === 'admin') {
          const financialRef = ref(db, 'financial')
          onValue(financialRef, (snapshot) => {
            const financial = snapshot.val() || {}
            const totalRevenue = financial.totalRevenue || 0
            const monthlyRevenue = financial.monthlyRevenue || 0
            const lastMonthRevenue = financial.lastMonthRevenue || monthlyRevenue * 0.88 // 임시로 12% 낮은 값 사용

            setData(prev => ({
              ...prev,
              totalRevenue,
              monthlyRevenue,
              prevMonthlyRevenue: lastMonthRevenue
            }))
          })

          // Fetch customers data
          const usersRef = ref(db, 'users')
          onValue(usersRef, (snapshot) => {
            const users = snapshot.val() || {}
            const userArray = Object.values(users) as any[]
            const totalCustomers = userArray.filter(u => u.role === 'customer').length
            const activeCustomers = userArray.filter(u => u.role === 'customer' && u.isOnline).length

            setData(prev => ({
              ...prev,
              totalCustomers,
              activeCustomers,
              prevActiveCustomers: prev.activeCustomers || activeCustomers
            }))
          })
        }

        setLoading(false)

        // 현재 통계 저장 (하루에 한 번)
        const saveStats = async () => {
          const lastSaved = localStorage.getItem('lastStatsSaved')
          const today = new Date().toDateString()
          if (lastSaved !== today && data.completedTasks > 0) {
            try {
              await statsService.saveDailyStats(userProfile.uid, {
                completedTasks: data.completedTasks,
                activeTasks: data.activeTasks,
                activeProjects: data.activeProjects,
                monthlyRevenue: data.monthlyRevenue,
                activeCustomers: data.activeCustomers
              })
              localStorage.setItem('lastStatsSaved', today)
            } catch (error) {
              console.error('Error saving stats:', error)
            }
          }
        }

        saveStats()
      } catch (error) {
        console.error('Error fetching dashboard data:', error)
        setLoading(false)
      }
    }

    fetchData()

    // Cleanup listeners
    return () => {
      const db = getDatabase(app)
      off(ref(db, 'projects'))
      off(ref(db, 'tasks'))
      off(ref(db, 'messages'))
      off(ref(db, 'financial'))
      off(ref(db, 'users'))
    }
  }, [userProfile])

  // Define stats based on user role
  const getStats = () => {
    if (!userProfile) return []

    const baseStats: Array<{
      icon: string
      iconBg: string
      value: string | number
      label: string
      change?: { value: string; isPositive: boolean }
    }> = [
        {
          icon: '📊',
          iconBg: 'bg-blue-100 text-blue-600',
          value: data.completedTasks,
          label: '완료된 작업',
          change: data.taskCompletionChange !== 0 ? {
            value: `${Math.abs(data.taskCompletionChange)}% ${data.taskCompletionChange > 0 ? '증가' : '감소'}`,
            isPositive: data.taskCompletionChange > 0
          } : undefined
        },
        {
          icon: '⏱️',
          iconBg: 'bg-green-100 text-green-600',
          value: data.activeTasks,
          label: '진행 중인 작업',
          change: data.newActiveTasks !== 0 ? {
            value: `${Math.abs(data.newActiveTasks)}개 ${data.newActiveTasks > 0 ? '추가' : '감소'}`,
            isPositive: data.newActiveTasks >= 0
          } : undefined
        },
        {
          icon: '📁',
          iconBg: 'bg-purple-100 text-purple-600',
          value: data.activeProjects,
          label: '진행중 프로젝트',
          change: { value: `총 ${data.totalProjects}개`, isPositive: true }
        }
      ]

    if (userProfile.role === 'admin' || userProfile.role === 'member') {
      baseStats.push({
        icon: '💬',
        iconBg: 'bg-indigo-100 text-indigo-600',
        value: data.unreadMessages,
        label: '읽지 않은 메시지',
        change: { value: `총 ${data.totalMessages}개`, isPositive: data.unreadMessages === 0 }
      })
    }

    if (userProfile.role === 'admin') {
      const revenueChange = data.prevMonthlyRevenue > 0
        ? Math.round(((data.monthlyRevenue - data.prevMonthlyRevenue) / data.prevMonthlyRevenue) * 100)
        : 0

      baseStats.push(
        {
          icon: '💰',
          iconBg: 'bg-orange-100 text-orange-600',
          value: `₩${data.monthlyRevenue.toLocaleString()}`,
          label: '이번달 수익',
          change: revenueChange !== 0 ? {
            value: `${Math.abs(revenueChange)}% ${revenueChange > 0 ? '증가' : '감소'}`,
            isPositive: revenueChange > 0
          } : undefined
        },
        {
          icon: '👥',
          iconBg: 'bg-pink-100 text-pink-600',
          value: data.activeCustomers,
          label: '활성 고객',
          change: { value: `총 ${data.totalCustomers}명`, isPositive: true }
        }
      )
    }

    return baseStats.slice(0, 4) // Show only 4 stats
  }

  const stats = getStats()

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {stats.map((stat, index) => (
        <StatCard key={index} {...stat} loading={loading} />
      ))}
    </div>
  )
}