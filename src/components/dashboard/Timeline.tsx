'use client'

import React, { useEffect, useState } from 'react'
import { useAuth } from '@/lib/auth-context'
import { getDatabase, ref, onValue, off, query, orderByChild, limitToLast } from 'firebase/database'
import { app } from '@/lib/firebase'

interface TimelineItem {
  id: string
  title: string
  description: string
  time: string
  status: 'complete' | 'active' | 'warning'
  type: string
  projectId?: string
  projectName?: string
}

export default function Timeline() {
  const { user, userProfile } = useAuth()
  const [items, setItems] = useState<TimelineItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user || !userProfile) return

    const db = getDatabase(app)
    const fetchTimelineData = async () => {
      try {
        const timelineItems: TimelineItem[] = []

        // 프로젝트 활동 가져오기
        const projectsRef = ref(db, 'projects')
        const projectsSnapshot = await new Promise<any>((resolve) => {
          onValue(projectsRef, resolve, { onlyOnce: true })
        })

        if (projectsSnapshot.exists()) {
          const projects = projectsSnapshot.val()

          // 각 프로젝트의 활동 가져오기
          for (const [projectId, project] of Object.entries(projects) as [string, any][]) {
            // 권한 체크
            if (userProfile.role === 'member' && !project.team?.includes(userProfile.email)) continue

            const activitiesRef = query(
              ref(db, `projectActivities/${projectId}`),
              orderByChild('timestamp'),
              limitToLast(5)
            )

            const activitiesSnapshot = await new Promise<any>((resolve) => {
              onValue(activitiesRef, resolve, { onlyOnce: true })
            })

            if (activitiesSnapshot.exists()) {
              Object.entries(activitiesSnapshot.val()).forEach(([id, activity]: [string, any]) => {
                const timeDiff = Date.now() - new Date(activity.timestamp).getTime()
                const timeString = getRelativeTime(timeDiff)

                timelineItems.push({
                  id: `${projectId}-${id}`,
                  title: activity.message,
                  description: `${project.name} 프로젝트`,
                  time: timeString,
                  status: activity.type === 'task' && activity.message.includes('완료') ? 'complete' :
                    activity.type === 'file' ? 'active' : 'active',
                  type: activity.type,
                  projectId,
                  projectName: project.name
                })
              })
            }
          }
        }

        // 시간순 정렬 (최신순)
        timelineItems.sort((a, b) => {
          const timeA = parseRelativeTime(a.time)
          const timeB = parseRelativeTime(b.time)
          return timeA - timeB
        })

        setItems(timelineItems.slice(0, 10))
        setLoading(false)
      } catch (error) {
        console.error('Error fetching timeline data:', error)
        setLoading(false)
      }
    }

    fetchTimelineData()
  }, [user, userProfile])

  const getRelativeTime = (milliseconds: number): string => {
    const seconds = Math.floor(milliseconds / 1000)
    const minutes = Math.floor(seconds / 60)
    const hours = Math.floor(minutes / 60)
    const days = Math.floor(hours / 24)

    if (days > 0) return `${days}일 전`
    if (hours > 0) return `${hours}시간 전`
    if (minutes > 0) return `${minutes}분 전`
    return '방금 전'
  }

  const parseRelativeTime = (timeString: string): number => {
    if (timeString === '방금 전') return 0

    const match = timeString.match(/(\d+)(분|시간|일) 전/)
    if (!match) return 0

    const value = parseInt(match[1])
    const unit = match[2]

    switch (unit) {
      case '분': return value
      case '시간': return value * 60
      case '일': return value * 60 * 24
      default: return 0
    }
  }

  const getStatusColor = (status: TimelineItem['status']) => {
    switch (status) {
      case 'complete':
        return 'bg-success border-success'
      case 'warning':
        return 'bg-warning border-warning'
      default:
        return 'bg-primary border-primary'
    }
  }

  return (
    <div className="card h-fit">
      <h3 className="text-lg font-semibold mb-6 flex items-center gap-2">
        <span>📋</span>
        <span>최근 활동</span>
      </h3>

      <div className="space-y-6">
        {items.map((item, index) => (
          <div key={item.id} className="relative">
            {/* Connecting line */}
            {index < items.length - 1 && (
              <div className="absolute left-2 top-8 bottom-0 w-0.5 bg-gray-200" />
            )}

            <div className="flex gap-4">
              {/* Timeline dot */}
              <div className={`
                relative z-10 w-4 h-4 rounded-full border-4 bg-white
                ${getStatusColor(item.status)}
              `} />

              {/* Content */}
              <div className="flex-1 -mt-1">
                <div className="bg-gray-50 rounded-lg p-4">
                  <h4 className="font-medium text-gray-900 mb-1">{item.title}</h4>
                  <p className="text-sm text-gray-600 mb-2">{item.description}</p>
                  <div className="text-xs text-gray-500 flex items-center gap-1">
                    <span>🕒</span>
                    <span>{item.time}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}