'use client'

import React, { useEffect, useRef, useState } from 'react'
import Gantt from 'frappe-gantt'
import './frappe-gantt.css'
import { Task } from '@/types/task'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

interface FrappeGanttChartProps {
  tasks: Task[]
}

export default function FrappeGanttChart({ tasks }: FrappeGanttChartProps) {
  const ganttRef = useRef<HTMLDivElement>(null)
  const listRef = useRef<HTMLDivElement>(null)
  const scrollSyncRef = useRef<boolean>(false)
  const [ganttInstance, setGanttInstance] = useState<any>(null)
  const [viewMode, setViewMode] = useState<string>('Day')

  const HEADER_HEIGHT = 50 + 10
  const ROW_HEIGHT = 38

  useEffect(() => {
    if (!ganttRef.current || tasks.length === 0) return

    const ganttData = tasks.map(task => {
      let startDate = task.startDate ? new Date(task.startDate) : new Date(task.createdAt)
      if (isNaN(startDate.getTime())) startDate = new Date()

      let endDate = task.dueDate ? new Date(task.dueDate) : new Date(startDate.getTime() + 24 * 60 * 60 * 1000)
      if (isNaN(endDate.getTime())) endDate = new Date(startDate.getTime() + 24 * 60 * 60 * 1000)

      if (endDate <= startDate) {
        endDate = new Date(startDate.getTime() + 24 * 60 * 60 * 1000)
      }

      return {
        id: task.id,
        name: task.title,
        start: startDate.toISOString().split('T')[0],
        end: endDate.toISOString().split('T')[0],
        progress: (task as any).progress || 0,
        dependencies: '',
        custom_class: `gantt-task-priority-${task.priority?.toLowerCase() || 'medium'}`
      }
    })

    ganttRef.current.innerHTML = ''

    try {
      // Simplified custom view modes with proper formatting
      const customViewModes = [
        {
          name: 'Day',
          step: 24,
          column_width: 50,
          upper_text: (d: Date, ld: Date, lang: string) => {
            if (!ld || d.getMonth() !== ld.getMonth()) {
              return `${d.getFullYear()}년 ${d.getMonth() + 1}월`
            }
            return ''
          },
          lower_text: (d: Date, ld: Date, lang: string) => {
            return `${d.getMonth() + 1}/${d.getDate()}`
          }
        },
        {
          name: 'Week',
          step: 24 * 7,
          column_width: 140,
          upper_text: (d: Date, ld: Date, lang: string) => {
            if (!ld || d.getMonth() !== ld.getMonth()) {
              return `${d.getFullYear()}년 ${d.getMonth() + 1}월`
            }
            return ''
          },
          lower_text: (d: Date, ld: Date, lang: string) => {
            const end = new Date(d)
            end.setDate(end.getDate() + 6)
            return `${d.getMonth() + 1}/${d.getDate()} - ${end.getMonth() + 1}/${end.getDate()}`
          }
        },
        {
          name: 'Month',
          step: 24 * 30,
          column_width: 120,
          upper_text: (d: Date, ld: Date, lang: string) => {
            if (!ld || d.getFullYear() !== ld.getFullYear()) {
              return `${d.getFullYear()}년`
            }
            return ''
          },
          lower_text: (d: Date, ld: Date, lang: string) => {
            return `${d.getMonth() + 1}월`
          }
        }
      ]

      const gantt = new Gantt(ganttRef.current, ganttData, {
        header_height: 50,
        column_width: 50,
        step: 24,
        view_modes: customViewModes,
        bar_height: 20,
        bar_corner_radius: 3,
        arrow_curve: 5,
        padding: 18,
        view_mode: viewMode,
        date_format: 'YYYY-MM-DD',
        language: 'ko',
        custom_popup_html: function (task: any) {
          return `
            <div class="p-3 w-64 text-sm">
              <div class="font-bold mb-1">${task.name}</div>
              <div class="text-gray-600 text-xs mb-2">
                ${task.start} ~ ${task.end}
              </div>
              <div class="flex items-center justify-between">
                <span class="text-xs text-gray-500">진행률</span>
                <span class="font-medium">${task.progress}%</span>
              </div>
            </div>
          `
        },
        on_click: (task: any) => {
          console.log('Task clicked:', task)
        },
        on_date_change: (task: any, start: Date, end: Date) => {
          console.log('Task date changed:', task, start, end)
        },
        on_progress_change: (task: any, progress: number) => {
          console.log('Task progress changed:', task, progress)
        },
        on_view_change: (mode: string) => {
          console.log('View mode changed:', mode)
        }
      })

      setGanttInstance(gantt)

      // Wait for DOM to be ready, then configure container
      setTimeout(() => {
        const ganttContainer = ganttRef.current?.querySelector('.gantt-container') as HTMLElement
        if (ganttContainer) {
          ganttContainer.style.height = '100%'
          ganttContainer.style.overflow = 'auto'

          // Sync scroll handler
          const handleScroll = () => {
            if (listRef.current && !scrollSyncRef.current) {
              scrollSyncRef.current = true
              listRef.current.scrollTop = ganttContainer.scrollTop
              setTimeout(() => { scrollSyncRef.current = false }, 10)
            }
          }

          ganttContainer.addEventListener('scroll', handleScroll)

          // Scroll to today after a short delay
          setTimeout(() => {
            const todayHighlight = ganttContainer.querySelector('.current-date-highlight') || ganttContainer.querySelector('.today-highlight')
            if (todayHighlight) {
              const scrollLeft = (todayHighlight as HTMLElement).offsetLeft - ganttContainer.clientWidth / 2
              ganttContainer.scrollLeft = scrollLeft > 0 ? scrollLeft : 0
            }
          }, 100)
        }
      }, 50)

    } catch (error) {
      console.error('Failed to initialize Frappe Gantt:', error)
    }

  }, [tasks, viewMode])

  const handleViewModeChange = (mode: string) => {
    setViewMode(mode)
    if (ganttInstance) {
      ganttInstance.change_view_mode(mode)
    }
  }

  const handleListScroll = () => {
    const ganttContainer = ganttRef.current?.querySelector('.gantt-container') as HTMLElement
    if (ganttContainer && listRef.current && !scrollSyncRef.current) {
      scrollSyncRef.current = true
      ganttContainer.scrollTop = listRef.current.scrollTop
      setTimeout(() => { scrollSyncRef.current = false }, 10)
    }
  }

  if (tasks.length === 0) {
    return (
      <div className="h-full flex items-center justify-center bg-gray-50">
        <p className="text-gray-500">표시할 작업이 없습니다.</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      {/* View Mode Selector */}
      <div className="flex justify-end p-4 border-b bg-white">
        <Select value={viewMode} onValueChange={setViewMode}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="보기 모드" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="Day">일별</SelectItem>
            <SelectItem value="Week">주별</SelectItem>
            <SelectItem value="Month">월별</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Gantt Chart Container */}
      <div className="flex-1 flex overflow-hidden">
        {/* Task List */}
        <div
          ref={listRef}
          className="w-64 border-r bg-white overflow-y-auto flex-shrink-0"
          onScroll={handleListScroll}
        >
          {/* Header */}
          <div
            className="sticky top-0 z-10 bg-gray-50 border-b font-semibold text-sm px-3 flex items-center"
            style={{ height: `${HEADER_HEIGHT}px` }}
          >
            <span className="flex-1">작업</span>
            <span className="w-10 text-center">담당</span>
          </div>

          {/* Task Rows */}
          {tasks.map((task, index) => {
            const department = getDepartmentByMember(task.assigneeId)
            const departmentColor = department?.color || '#3B82F6'

            // Handle assignee - it could be a string (ID) or an object
            const assigneeName = typeof task.assignee === 'object' && task.assignee?.name
              ? task.assignee.name
              : task.assigneeId
            const memberInitial = assigneeName?.[0]?.toUpperCase() || 'U'

            return (
              <div
                key={task.id}
                className="flex items-center px-3 border-b hover:bg-gray-50 transition-colors"
                style={{
                  height: `${ROW_HEIGHT}px`,
                  borderLeft: `3px solid ${departmentColor}`
                }}
              >
                <div className="flex-1 min-w-0 pr-2">
                  <div className="text-sm font-medium truncate">{task.title}</div>
                  <div className="text-xs text-gray-500 truncate">
                    {task.startDate && task.dueDate && (
                      <>
                        {new Date(task.startDate).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' })} -
                        {new Date(task.dueDate).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' })}
                      </>
                    )}
                  </div>
                </div>

                {/* Member Avatar */}
                <div className="w-10 flex justify-center flex-shrink-0">
                  {task.assigneeId ? (
                    <div
                      className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-semibold"
                      style={{ backgroundColor: departmentColor }}
                      title={assigneeName || task.assigneeId}
                    >
                      {memberInitial}
                    </div>
                  ) : (
                    <div className="w-7 h-7 rounded-full bg-gray-200 flex items-center justify-center text-gray-400 text-xs">
                      ?
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>

        {/* Gantt Chart */}
        <div
          ref={ganttRef}
          className="flex-1 overflow-x-auto overflow-y-auto bg-white"
        />
      </div>
    </div>
  )
}

// Helper function to get department by member
function getDepartmentByMember(memberId?: string) {
  // This would ideally come from a context or prop
  // For now, return a default department
  const DEPARTMENTS = [
    { id: 'planning', name: '기획', color: '#8B5CF6' },
    { id: 'development', name: '개발', color: '#3B82F6' },
    { id: 'design', name: '디자인', color: '#EC4899' },
    { id: 'operations', name: '운영', color: '#10B981' },
    { id: 'marketing', name: '마케팅', color: '#F59E0B' },
  ]

  // TODO: Get actual member department from API/context
  // For now, return a random department for demonstration
  return DEPARTMENTS[Math.floor(Math.random() * DEPARTMENTS.length)]
}
