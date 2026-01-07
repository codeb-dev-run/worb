'use client'

const isDev = process.env.NODE_ENV === 'development'

import React, { useState, Suspense } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { LazyGanttChartPro } from '@/components/lazy'
import { Loader2 } from 'lucide-react'
import type { Task } from 'gantt-task-react'

// Mock 간트차트 데이터를 gantt-task-react 형식으로 변환
const mockGanttTasks: Task[] = [
  {
    id: '1',
    name: '웹사이트 리뉴얼',
    start: new Date(2024, 0, 1),
    end: new Date(2024, 2, 31),
    progress: 65,
    type: 'project',
    hideChildren: false,
    displayOrder: 1,
  },
  {
    id: '2',
    name: '기획 단계',
    start: new Date(2024, 0, 1),
    end: new Date(2024, 0, 15),
    progress: 100,
    type: 'task',
    project: '1',
    displayOrder: 2,
  },
  {
    id: '3',
    name: '디자인 단계',
    start: new Date(2024, 0, 16),
    end: new Date(2024, 1, 15),
    progress: 100,
    type: 'task',
    project: '1',
    dependencies: ['2'],
    displayOrder: 3,
  },
  {
    id: '4',
    name: '개발 단계',
    start: new Date(2024, 1, 1),
    end: new Date(2024, 2, 15),
    progress: 45,
    type: 'task',
    project: '1',
    dependencies: ['3'],
    displayOrder: 4,
  },
  {
    id: '5',
    name: '프론트엔드 개발',
    start: new Date(2024, 1, 1),
    end: new Date(2024, 1, 28),
    progress: 60,
    type: 'task',
    project: '1',
    dependencies: ['3'],
    displayOrder: 5,
  },
  {
    id: '6',
    name: '백엔드 개발',
    start: new Date(2024, 1, 15),
    end: new Date(2024, 2, 15),
    progress: 30,
    type: 'task',
    project: '1',
    dependencies: ['3'],
    displayOrder: 6,
  },
  {
    id: '7',
    name: '테스트 단계',
    start: new Date(2024, 2, 16),
    end: new Date(2024, 2, 25),
    progress: 0,
    type: 'task',
    project: '1',
    dependencies: ['5', '6'],
    displayOrder: 7,
  },
  {
    id: '8',
    name: '프로젝트 완료',
    start: new Date(2024, 2, 31),
    end: new Date(2024, 2, 31),
    progress: 0,
    type: 'milestone',
    project: '1',
    dependencies: ['7'],
    displayOrder: 8,
  },
]

export default function GanttPage() {
  const params = useParams()
  const projectId = params?.id as string
  const [tasks, setTasks] = useState<Task[]>(mockGanttTasks)

  const handleTaskChange = (task: Task) => {
    if (isDev) console.log("Task changed:", task)
    const newTasks = tasks.map((t) => (t.id === task.id ? task : t))
    setTasks(newTasks)
  }

  const handleTaskDelete = (task: Task) => {
    if (isDev) console.log("Task deleted:", task)
    setTasks(tasks.filter((t) => t.id !== task.id))
  }

  const handleProgressChange = (task: Task) => {
    if (isDev) console.log("Progress changed:", task)
    const newTasks = tasks.map((t) => (t.id === task.id ? task : t))
    setTasks(newTasks)
  }

  const handleDateChange = (task: Task) => {
    if (isDev) console.log("Date changed:", task)
    const newTasks = tasks.map((t) => (t.id === task.id ? task : t))
    setTasks(newTasks)
  }

  return (
    <div className="space-y-6">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link
            href={`/projects`}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            ← 프로젝트 목록
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">프로젝트 간트차트</h1>
            <div className="flex items-center gap-4 mt-1">
              <Link
                href={`/projects/${projectId}`}
                className="text-sm text-gray-600 hover:text-gray-900"
              >
                ← 프로젝트 상세
              </Link>
              <span className="text-gray-400">|</span>
              <Link
                href={`/projects/${projectId}/gantt`}
                className="text-sm font-medium text-primary"
              >
                간트차트
              </Link>
              <span className="text-gray-400">|</span>
              <Link
                href={`/projects/${projectId}/kanban`}
                className="text-sm text-gray-600 hover:text-gray-900"
              >
                칸반보드
              </Link>
            </div>
          </div>
        </div>

        <div className="flex gap-3">
          <button className="btn btn-secondary">
            <span className="mr-1">↓</span> 내보내기
          </button>
          <button className="btn btn-primary">
            <span className="mr-1">+</span> 작업 추가
          </button>
        </div>
      </div>

      {/* 프로젝트 통계 */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="card">
          <div className="text-sm text-gray-600">전체 진행률</div>
          <div className="text-2xl font-bold text-primary mt-1">65%</div>
          <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
            <div className="bg-primary h-2 rounded-full" style={{ width: '65%' }}></div>
          </div>
        </div>
        <div className="card">
          <div className="text-sm text-gray-600">총 작업</div>
          <div className="text-2xl font-bold mt-1">{tasks.length}</div>
          <div className="text-xs text-gray-500 mt-1">완료 3 / 진행중 3 / 대기 2</div>
        </div>
        <div className="card">
          <div className="text-sm text-gray-600">남은 기간</div>
          <div className="text-2xl font-bold mt-1">45일</div>
          <div className="text-xs text-gray-500 mt-1">2024.03.31 마감</div>
        </div>
        <div className="card">
          <div className="text-sm text-gray-600">팀원</div>
          <div className="flex -space-x-2 mt-2">
            {['김개발', '이디자인', '박기획'].map((member, idx) => (
              <div
                key={idx}
                className="w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center text-xs font-medium text-gray-700 border-2 border-white"
              >
                {member.charAt(0)}
              </div>
            ))}
            <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center text-xs font-medium text-gray-600 border-2 border-white">
              +2
            </div>
          </div>
        </div>
      </div>

      {/* 간트차트 - 동적 로딩 */}
      <Suspense fallback={
        <div className="flex items-center justify-center min-h-[400px] bg-white rounded-lg">
          <div className="text-center">
            <Loader2 className="h-8 w-8 animate-spin text-lime-500 mx-auto" />
            <p className="mt-2 text-sm text-slate-500">간트 차트 로딩 중...</p>
          </div>
        </div>
      }>
        <LazyGanttChartPro
          tasks={tasks}
          onTaskChange={handleTaskChange}
          onTaskDelete={handleTaskDelete}
          onProgressChange={handleProgressChange}
          onDateChange={handleDateChange}
        />
      </Suspense>
    </div>
  )
}