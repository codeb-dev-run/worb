'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import GanttChartPro from '@/components/gantt/GanttChartPro'
import { Task } from 'gantt-task-react'
import { getDatabase, ref, onValue, off } from 'firebase/database'
import { app } from '@/lib/firebase'
import { useAuth } from '@/lib/auth-context'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Search, Filter, Download } from 'lucide-react'

export default function GlobalGanttPage() {
  const { user, userProfile } = useAuth()
  const [allTasks, setAllTasks] = useState<Task[]>([])
  const [filteredTasks, setFilteredTasks] = useState<Task[]>([])
  const [projects, setProjects] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  // 필터 상태
  const [selectedProject, setSelectedProject] = useState<string>('all')
  const [selectedAssignee, setSelectedAssignee] = useState<string>('all')
  const [searchTerm, setSearchTerm] = useState('')

  // Firebase에서 전체 프로젝트 및 태스크 데이터 로드
  useEffect(() => {
    if (!user) return

    const db = getDatabase(app)

    // Helper function to validate and create Date objects
    const createValidDate = (dateValue: any): Date | null => {
      if (!dateValue) return null
      const date = new Date(dateValue)
      return !isNaN(date.getTime()) ? date : null
    }

    // 프로젝트 목록 로드
    const projectsRef = ref(db, 'projects')
    const projectsUnsubscribe = onValue(projectsRef, (snapshot) => {
      const data = snapshot.val()
      if (data) {
        const projectsList = Object.entries(data)
          .map(([id, project]: [string, any]) => {
            const startDate = createValidDate(project.startDate)
            const endDate = createValidDate(project.endDate)

            return {
              id,
              name: project.name,
              startDate: startDate || new Date(),
              endDate: endDate || new Date(),
              status: project.status,
              progress: project.progress || 0
            }
          })
          .filter(project => project.startDate && project.endDate)

        setProjects(projectsList)

        // 프로젝트별 태스크 로드
        loadAllTasks(projectsList)
      }
      setLoading(false)
    })

    return () => {
      off(projectsRef)
    }
  }, [user])

  const loadAllTasks = (projectsList: any[]) => {
    const db = getDatabase(app)
    const tasks: Task[] = []

    // Helper function to validate and create Date objects
    const createValidDate = (dateValue: any): Date | null => {
      if (!dateValue) return null
      const date = new Date(dateValue)
      return !isNaN(date.getTime()) ? date : null
    }

    projectsList.forEach((project, projectIndex) => {
      // Validate project dates
      const projectStart = createValidDate(project.startDate)
      const projectEnd = createValidDate(project.endDate)

      // Only add project if it has valid dates
      if (projectStart && projectEnd) {
        tasks.push({
          id: `project-${project.id}`,
          name: project.name,
          start: projectStart,
          end: projectEnd,
          progress: project.progress,
          type: 'project',
          hideChildren: false,
          displayOrder: projectIndex * 100,
        })
      }

      // 각 프로젝트의 태스크 로드
      const tasksRef = ref(db, `projects/${project.id}/tasks`)
      onValue(tasksRef, (snapshot) => {
        const tasksData = snapshot.val()
        if (tasksData) {
          Object.entries(tasksData).forEach(([taskId, taskData]: [string, any], taskIndex) => {
            // Validate task dates
            const taskStart = createValidDate(taskData.startDate)
            const taskEnd = createValidDate(taskData.dueDate)

            // Only add task if it has valid dates and title
            if (taskStart && taskEnd && taskData.title) {
              tasks.push({
                id: taskId,
                name: taskData.title,
                start: taskStart,
                end: taskEnd,
                progress: taskData.progress || 0,
                type: 'task',
                project: `project-${project.id}`,
                displayOrder: projectIndex * 100 + taskIndex + 1,
              })
            }
          })
        }

        // 모든 태스크를 displayOrder로 정렬
        const sortedTasks = tasks.sort((a, b) => (a.displayOrder || 0) - (b.displayOrder || 0))
        setAllTasks([...sortedTasks])
        setFilteredTasks([...sortedTasks])
      })
    })
  }

  // 필터링 적용
  useEffect(() => {
    let filtered = [...allTasks]

    // 프로젝트 필터
    if (selectedProject !== 'all') {
      filtered = filtered.filter(task =>
        task.id === `project-${selectedProject}` ||
        task.project === `project-${selectedProject}`
      )
    }

    // 검색어 필터
    if (searchTerm) {
      filtered = filtered.filter(task =>
        task.name.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }

    setFilteredTasks(filtered)
  }, [allTasks, selectedProject, selectedAssignee, searchTerm])

  const handleTaskChange = (task: Task) => {
    console.log('Task changed:', task)
  }

  const handleTaskDelete = (task: Task) => {
    console.log('Task deleted:', task)
  }

  const handleProgressChange = (task: Task) => {
    console.log('Progress changed:', task)
  }

  const handleDateChange = (task: Task) => {
    console.log('Date changed:', task)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col space-y-6 p-6">
      {/* 헤더 */}
      <div className="flex items-center justify-between flex-shrink-0">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">전체 간트차트</h1>
          <p className="text-sm text-gray-600 mt-1">모든 프로젝트의 일정을 한눈에 확인하세요</p>
        </div>

        <div className="flex gap-3">
          <Button variant="outline">
            <Download className="mr-2 h-4 w-4" />
            내보내기
          </Button>
          <Button>
            <span className="mr-1">+</span> 작업 추가
          </Button>
        </div>
      </div>

      {/* 필터 영역 */}
      <div className="flex items-center gap-4 flex-shrink-0">
        {/* 검색 */}
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <Input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="작업 검색..."
            className="pl-10"
          />
        </div>

        {/* 프로젝트 필터 */}
        <Select value={selectedProject} onValueChange={setSelectedProject}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="프로젝트 선택" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">전체 프로젝트</SelectItem>
            {projects.map((project) => (
              <SelectItem key={project.id} value={project.id}>
                {project.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* 필터 버튼 */}
        <Button variant="outline" size="icon">
          <Filter className="h-4 w-4" />
        </Button>
      </div>

      {/* 통계 */}
      <div className="grid grid-cols-4 gap-4 flex-shrink-0">
        <div className="bg-white rounded-lg border p-4">
          <div className="text-sm text-gray-600">전체 프로젝트</div>
          <div className="text-2xl font-bold text-primary mt-1">{projects.length}</div>
        </div>
        <div className="bg-white rounded-lg border p-4">
          <div className="text-sm text-gray-600">전체 작업</div>
          <div className="text-2xl font-bold mt-1">
            {allTasks.filter(t => t.type === 'task').length}
          </div>
        </div>
        <div className="bg-white rounded-lg border p-4">
          <div className="text-sm text-gray-600">진행중</div>
          <div className="text-2xl font-bold text-orange-600 mt-1">
            {allTasks.filter(t => t.type === 'task' && t.progress > 0 && t.progress < 100).length}
          </div>
        </div>
        <div className="bg-white rounded-lg border p-4">
          <div className="text-sm text-gray-600">완료</div>
          <div className="text-2xl font-bold text-green-600 mt-1">
            {allTasks.filter(t => t.type === 'task' && t.progress === 100).length}
          </div>
        </div>
      </div>

      {/* 간트차트 */}
      <div className="flex-1 overflow-hidden bg-white rounded-lg border">
        {filteredTasks.length > 0 ? (
          <GanttChartPro
            tasks={filteredTasks}
            onTaskChange={handleTaskChange}
            onTaskDelete={handleTaskDelete}
            onProgressChange={handleProgressChange}
            onDateChange={handleDateChange}
          />
        ) : (
          <div className="flex items-center justify-center h-full">
            <div className="text-center text-gray-500">
              <p className="text-lg font-medium">표시할 작업이 없습니다</p>
              <p className="text-sm mt-2">필터를 조정하거나 새 작업을 추가해보세요</p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
