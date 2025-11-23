'use client'

import React, { useEffect, useState } from 'react'
import { useAuth } from '@/lib/auth-context'
import { getDatabase, ref, onValue, off } from 'firebase/database'
import { app } from '@/lib/firebase'
import Link from 'next/link'

interface Step {
  id: number
  label: string
  status: 'completed' | 'active' | 'pending'
}

interface Project {
  id: string
  name: string
  status: string
  progress: number
  startDate: string
  endDate: string
  team: string[]
  clientId: string
}

export default function ProjectProgress() {
  const { user, userProfile } = useAuth()
  const [projects, setProjects] = useState<Project[]>([])
  const [selectedProject, setSelectedProject] = useState<Project | null>(null)
  const [loading, setLoading] = useState(true)

  const statusSteps: Record<string, Step> = {
    planning: { id: 1, label: '기획', status: 'completed' },
    design: { id: 2, label: '디자인', status: 'completed' },
    development: { id: 3, label: '개발', status: 'active' },
    testing: { id: 4, label: '테스트', status: 'pending' },
    completed: { id: 5, label: '완료', status: 'pending' },
  }

  useEffect(() => {
    if (!user || !userProfile) return

    const db = getDatabase(app)
    const projectsRef = ref(db, 'projects')

    onValue(projectsRef, (snapshot) => {
      const data = snapshot.val()
      if (data) {
        const projectsList = Object.entries(data).map(([id, project]: [string, any]) => ({
          id,
          ...project
        }))

        // 사용자 권한에 따른 필터링
        let filteredProjects = projectsList
        if (userProfile.role === 'member') {
          filteredProjects = projectsList.filter(p =>
            p.team?.includes(userProfile.email)
          )
        }

        // 진행중인 프로젝트 우선, 최신순 정렬
        filteredProjects.sort((a, b) => {
          if (a.status !== 'completed' && b.status === 'completed') return -1
          if (a.status === 'completed' && b.status !== 'completed') return 1
          return new Date(b.startDate).getTime() - new Date(a.startDate).getTime()
        })

        setProjects(filteredProjects)
        if (filteredProjects.length > 0) {
          setSelectedProject(filteredProjects[0])
        }
      }
      setLoading(false)
    })

    return () => off(projectsRef)
  }, [user, userProfile])

  const getSteps = (projectStatus: string): Step[] => {
    const steps: Step[] = []
    const statusOrder = ['planning', 'design', 'development', 'testing', 'completed']
    const currentIndex = statusOrder.indexOf(projectStatus)

    statusOrder.forEach((status, index) => {
      const step = { ...statusSteps[status] }
      if (index < currentIndex) {
        step.status = 'completed'
      } else if (index === currentIndex) {
        step.status = 'active'
      } else {
        step.status = 'pending'
      }
      steps.push(step)
    })

    return steps
  }

  if (loading) {
    return (
      <div className="card">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="h-32 bg-gray-200 rounded"></div>
        </div>
      </div>
    )
  }

  if (!selectedProject) {
    return (
      <div className="card">
        <h2 className="text-xl font-semibold mb-4">현재 프로젝트 진행 상황</h2>
        <p className="text-gray-500 text-center py-8">진행중인 프로젝트가 없습니다.</p>
        {userProfile?.role === 'admin' && (
          <Link href="/projects" className="btn btn-primary mx-auto mt-4">
            새 프로젝트 만들기
          </Link>
        )}
      </div>
    )
  }

  const steps = getSteps(selectedProject.status)
  const progress = selectedProject.progress || 0

  return (
    <div className="card">
      <div className="flex justify-between items-center mb-8">
        <h2 className="text-xl font-semibold">현재 프로젝트 진행 상황</h2>
        <div className="text-sm text-gray-600">
          전체 진행률 <strong className="text-primary">{progress}%</strong>
        </div>
      </div>

      {/* Progress Steps */}
      <div className="relative mb-12">
        <div className="absolute top-5 left-0 right-0 h-0.5 bg-gray-200" />
        <div
          className="absolute top-5 left-0 h-0.5 bg-primary transition-all duration-500"
          style={{ width: `${(steps.filter(s => s.status === 'completed').length / steps.length) * 100}%` }}
        />

        <div className="relative flex justify-between">
          {steps.map((step) => (
            <div key={step.id} className="flex flex-col items-center">
              <div className={`
                w-10 h-10 rounded-full flex items-center justify-center
                transition-all duration-300 relative z-10
                ${step.status === 'completed' ? 'bg-success text-white' :
                  step.status === 'active' ? 'bg-primary text-white ring-4 ring-primary/20' :
                    'bg-gray-100 text-gray-400'}
              `}>
                {step.status === 'completed' ? '✓' : step.id}
              </div>
              <span className={`
                mt-2 text-sm
                ${step.status === 'active' ? 'text-gray-900 font-medium' : 'text-gray-500'}
              `}>
                {step.label}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Progress Bar */}
      <div>
        <div className="flex justify-between mb-2">
          <span className="text-sm text-gray-600">프로젝트 완료까지</span>
          <span className="text-sm font-medium text-primary">{progress}%</span>
        </div>
        <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-primary to-primary-light transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Project Selector */}
      {projects.length > 1 && (
        <div className="flex gap-2 mt-6 mb-4">
          {projects.slice(0, 3).map(project => (
            <button
              key={project.id}
              onClick={() => setSelectedProject(project)}
              className={`px-3 py-1 rounded-lg text-sm transition-colors ${selectedProject.id === project.id
                  ? 'bg-primary text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
            >
              {project.name}
            </button>
          ))}
          {projects.length > 3 && (
            <Link href="/projects" className="px-3 py-1 rounded-lg text-sm bg-gray-100 text-gray-700 hover:bg-gray-200">
              +{projects.length - 3} 더보기
            </Link>
          )}
        </div>
      )}

      {/* Quick Actions */}
      <div className="grid grid-cols-3 gap-4 mt-8">
        <Link
          href={`/projects/${selectedProject.id}`}
          className="p-4 border-2 border-gray-200 rounded-lg hover:border-primary hover:text-primary transition-all text-center"
        >
          <span className="block text-2xl mb-2">📋</span>
          <span className="text-sm font-medium">상세 보기</span>
        </Link>
        <Link
          href="/files"
          className="p-4 border-2 border-gray-200 rounded-lg hover:border-primary hover:text-primary transition-all text-center"
        >
          <span className="block text-2xl mb-2">📁</span>
          <span className="text-sm font-medium">파일 확인</span>
        </Link>
        <Link
          href={`/projects/${selectedProject.id}?tab=kanban`}
          className="p-4 border-2 border-gray-200 rounded-lg hover:border-primary hover:text-primary transition-all text-center"
        >
          <span className="block text-2xl mb-2">📊</span>
          <span className="text-sm font-medium">작업 보기</span>
        </Link>
      </div>
    </div>
  )
}