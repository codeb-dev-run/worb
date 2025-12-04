'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { KanbanBoardPro } from '@/components/kanban'
import KanbanCardModal from '@/components/kanban/KanbanCardModal'
import { KanbanTask, TaskPriority, TaskStatus } from '@/types/task'
import { KanbanCard } from '@/types/project'

// Mock 칸반보드 데이터 생성 함수
const createMockTask = (
  id: string,
  columnId: string,
  order: number,
  title: string,
  description: string,
  priority: TaskPriority,
  department: string = 'development',
  extras: Partial<KanbanTask> = {}
): KanbanTask => ({
  id,
  columnId,
  order,
  projectId: 'mock-project',
  title,
  description,
  priority,
  status: columnId as TaskStatus,
  labels: [],
  assignee: '김개발',
  assigneeId: 'user-1',
  assigneeName: '김개발',
  attachments: [],
  createdAt: new Date(),
  updatedAt: new Date(),
  createdBy: 'user-1',
  attachmentCount: 0,
  commentCount: 0,
  department,
  ...extras
})

// Mock 칸반보드 데이터
const mockKanbanColumns = [
  {
    id: 'todo',
    title: '할 일',
    color: '#ef4444',
    limit: 10,
    tasks: [
      createMockTask(
        'task-1',
        'todo',
        0,
        'API 설계 문서 작성',
        'RESTful API 엔드포인트 설계 및 문서화',
        TaskPriority.HIGH,
        'development',
        {
          labels: ['백엔드', '문서화'],
          dueDate: new Date('2024-02-01'),
          attachmentCount: 2,
          commentCount: 5,
        }
      ),
      createMockTask(
        'task-2',
        'todo',
        1,
        '데이터베이스 스키마 설계',
        'MySQL 데이터베이스 테이블 구조 설계',
        TaskPriority.URGENT,
        'development',
        {
          labels: ['DB', '설계'],
          dueDate: new Date('2024-01-25'),
          checklist: [
            { id: 'c1', text: '사용자 테이블', completed: true },
            { id: 'c2', text: '상품 테이블', completed: true },
            { id: 'c3', text: '주문 테이블', completed: false },
            { id: 'c4', text: '결제 테이블', completed: false },
          ]
        }
      ),
    ]
  },
  {
    id: 'in-progress',
    title: '진행 중',
    color: '#eab308',
    limit: 5,
    tasks: [
      createMockTask(
        'task-3',
        'in-progress',
        0,
        '홈페이지 UI 디자인',
        '메인 페이지 및 서브 페이지 UI 디자인 작업',
        TaskPriority.MEDIUM,
        'design',
        {
          labels: ['디자인', 'UI/UX'],
          assignee: '이디자인',
          assigneeName: '이디자인',
          dueDate: new Date('2024-02-10'),
          attachmentCount: 5,
          commentCount: 12,
          checklist: [
            { id: 'c1', text: '와이어프레임', completed: true },
            { id: 'c2', text: '컬러 팔레트', completed: true },
            { id: 'c3', text: '메인 페이지', completed: true },
            { id: 'c4', text: '서브 페이지', completed: false },
          ]
        }
      ),
      createMockTask(
        'task-4',
        'in-progress',
        1,
        '로그인 기능 구현',
        'JWT 기반 사용자 인증 시스템 구현',
        TaskPriority.HIGH,
        'development',
        {
          labels: ['프론트엔드', '백엔드'],
          assignee: '최개발',
          assigneeName: '최개발',
          dueDate: new Date('2024-02-05'),
        }
      ),
    ]
  },
  {
    id: 'review',
    title: '검토',
    color: '#8b5cf6',
    tasks: [
      createMockTask(
        'task-5',
        'review',
        0,
        '회원가입 플로우 검토',
        '회원가입 프로세스 UX 개선점 검토',
        TaskPriority.MEDIUM,
        'planning',
        {
          labels: ['UX', '검토'],
          assignee: '박기획',
          assigneeName: '박기획',
          commentCount: 8,
        }
      ),
    ]
  },
  {
    id: 'done',
    title: '완료',
    color: '#10b981',
    tasks: [
      createMockTask(
        'task-6',
        'done',
        0,
        '프로젝트 킥오프 미팅',
        '프로젝트 시작 미팅 및 요구사항 정리',
        TaskPriority.LOW,
        'planning',
        {
          labels: ['미팅'],
          assignee: '박기획',
          assigneeName: '박기획',
          checklist: [
            { id: 'c1', text: '요구사항 정리', completed: true },
            { id: 'c2', text: '일정 수립', completed: true },
            { id: 'c3', text: '역할 분담', completed: true },
          ]
        }
      ),
      createMockTask(
        'task-7',
        'done',
        1,
        '개발 환경 설정',
        'Next.js, TypeScript, Tailwind CSS 환경 구축',
        TaskPriority.MEDIUM,
        'operations',
        {
          labels: ['설정'],
        }
      ),
    ]
  }
]

interface KanbanColumn {
  id: string
  title: string
  color: string
  limit?: number
  tasks: KanbanTask[]
}

export default function KanbanPage() {
  const params = useParams()
  const projectId = params?.id as string
  const [columns, setColumns] = useState<KanbanColumn[]>(mockKanbanColumns)
  const [selectedTask, setSelectedTask] = useState<KanbanTask | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)

  const handleColumnsChange = (newColumns: KanbanColumn[]) => {
    setColumns(newColumns)
    console.log('Columns updated:', newColumns)
  }

  const handleTaskAdd = (columnId: string) => {
    console.log('Add task to column:', columnId)
  }

  const handleTaskEdit = (task: KanbanTask) => {
    console.log('Edit task:', task)
    setSelectedTask(task)
    setIsModalOpen(true)
  }

  const handleTaskUpdate = (updatedCard: KanbanCard) => {
    // KanbanCard를 KanbanTask로 변환 (타입 호환성 처리)
    const updatedTask = updatedCard as unknown as KanbanTask

    setColumns(prevColumns => prevColumns.map(col => ({
      ...col,
      tasks: col.tasks.map(task =>
        task.id === updatedTask.id
          ? {
              ...task,
              ...updatedTask,
              // department 변경 시 명시적으로 반영
              department: updatedTask.department || task.department
            }
          : task
      )
    })))
    setIsModalOpen(false)
    setSelectedTask(null)
  }

  const handleTaskDelete = (taskId: string, columnId: string) => {
    console.log('Delete task:', taskId, 'from column:', columnId)
    const newColumns = columns.map(col => {
      if (col.id === columnId) {
        return {
          ...col,
          tasks: col.tasks.filter(task => task.id !== taskId)
        }
      }
      return col
    })
    setColumns(newColumns)
  }

  return (
    <div className="h-full flex flex-col space-y-6">
      {/* 헤더 */}
      <div className="flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-4">
          <Link
            href={`/projects`}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            ← 프로젝트 목록
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">프로젝트 칸반보드</h1>
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
                className="text-sm text-gray-600 hover:text-gray-900"
              >
                간트차트
              </Link>
              <span className="text-gray-400">|</span>
              <Link
                href={`/projects/${projectId}/kanban`}
                className="text-sm font-medium text-primary"
              >
                칸반보드
              </Link>
            </div>
          </div>
        </div>

        <div className="flex gap-3">
          <button className="btn btn-secondary">
            <span className="mr-1">⚙️</span> 설정
          </button>
          <button className="btn btn-primary">
            <span className="mr-1">+</span> 작업 추가
          </button>
        </div>
      </div>

      {/* 칸반보드 */}
      <div className="flex-1 overflow-hidden">
        <KanbanBoardPro
          columns={columns}
          onColumnsChange={handleColumnsChange}
          onTaskAdd={handleTaskAdd}
          onTaskEdit={handleTaskEdit}
          onTaskDelete={handleTaskDelete}
        />
      </div>

      <KanbanCardModal
        card={selectedTask as unknown as KanbanCard}
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false)
          setSelectedTask(null)
        }}
        onUpdate={handleTaskUpdate}
        onDelete={(taskId) => {
          // 컬럼 ID를 찾아야 함
          const columnId = columns.find(col => col.tasks.some(t => t.id === taskId))?.id
          if (columnId) {
            handleTaskDelete(taskId, columnId)
          }
          setIsModalOpen(false)
        }}
      />
    </div>
  )
}