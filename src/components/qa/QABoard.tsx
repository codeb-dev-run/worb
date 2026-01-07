"use client"

import React, { useState, useEffect, useCallback, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useAuth } from '@/lib/auth-context'
import { toast } from 'react-hot-toast'
import QAIssueCard from './QAIssueCard'
import QAIssueModal from './QAIssueModal'
import QACreateModal from './QACreateModal'

// Types
export interface QAIssue {
  id: string
  workspaceId: string
  projectId?: string | null
  title: string
  description: string
  type: 'BUG' | 'FEATURE' | 'IMPROVEMENT' | 'TASK' | 'QUESTION'
  status: 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED' | 'REOPENED'
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
  stepsToReproduce?: string | null
  expectedBehavior?: string | null
  actualBehavior?: string | null
  environment?: string | null
  affectedFiles: string[]
  codeChanges?: any
  githubIssueUrl?: string | null
  githubIssueNumber?: number | null
  syncedToGitHub: boolean
  reporterId: string
  assigneeId?: string | null
  resolvedAt?: string | null
  closedAt?: string | null
  dueDate?: string | null
  checklist?: { id: string; text: string; completed: boolean }[]
  labels: string[]
  viewCount: number
  createdAt: string
  updatedAt: string
  reporter: {
    id: string
    name: string
    email: string
    avatar?: string | null
  }
  assignee?: {
    id: string
    name: string
    email: string
    avatar?: string | null
  } | null
  project?: {
    id: string
    name: string
  } | null
  _count?: {
    comments: number
    attachments: number
  }
}

interface QABoardProps {
  workspaceId: string
  projectId?: string
}

const statusColumns = [
  { id: 'OPEN', title: '오픈', color: 'bg-blue-100 border-blue-300' },
  { id: 'IN_PROGRESS', title: '진행 중', color: 'bg-yellow-100 border-yellow-300' },
  { id: 'RESOLVED', title: '해결됨', color: 'bg-green-100 border-green-300' },
  { id: 'CLOSED', title: '완료', color: 'bg-gray-100 border-gray-300' },
]

const typeIcons: Record<string, string> = {
  BUG: '🐛',
  FEATURE: '✨',
  IMPROVEMENT: '🔧',
  TASK: '📋',
  QUESTION: '❓',
}

const priorityColors: Record<string, string> = {
  LOW: 'bg-gray-200 text-gray-700',
  MEDIUM: 'bg-blue-200 text-blue-700',
  HIGH: 'bg-orange-200 text-orange-700',
  CRITICAL: 'bg-red-200 text-red-700',
}

export default function QABoard({ workspaceId, projectId }: QABoardProps) {
  const { user } = useAuth()
  const [issues, setIssues] = useState<QAIssue[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedIssue, setSelectedIssue] = useState<QAIssue | null>(null)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [filter, setFilter] = useState({
    type: '' as string,
    priority: '' as string,
    assigneeId: '' as string,
    search: '',
  })
  const [viewMode, setViewMode] = useState<'kanban' | 'list'>('kanban')

  const loadIssues = useCallback(async () => {
    try {
      const params = new URLSearchParams({
        workspaceId,
        ...(projectId && { projectId }),
        ...(filter.type && { type: filter.type }),
        ...(filter.priority && { priority: filter.priority }),
        ...(filter.assigneeId && { assigneeId: filter.assigneeId }),
        ...(filter.search && { search: filter.search }),
        limit: '100',
      })

      const res = await fetch(`/api/qa?${params}`)
      if (res.ok) {
        const data = await res.json()
        setIssues(data.issues)
      }
    } catch (error) {
      console.error('Failed to load issues:', error)
      toast.error('이슈를 불러오는데 실패했습니다')
    } finally {
      setLoading(false)
    }
  }, [workspaceId, projectId, filter])

  useEffect(() => {
    loadIssues()
  }, [loadIssues])

  // Memoized handlers to prevent unnecessary re-renders
  const handleStatusChange = useCallback(async (issueId: string, newStatus: string) => {
    try {
      const res = await fetch(`/api/qa/${issueId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      })

      if (res.ok) {
        const updated = await res.json()
        setIssues(prev => prev.map(i => i.id === issueId ? { ...i, ...updated } : i))
        toast.success('상태가 변경되었습니다')
      }
    } catch (error) {
      toast.error('상태 변경에 실패했습니다')
    }
  }, [])

  const handleIssueCreated = useCallback((newIssue: QAIssue) => {
    setIssues(prev => [newIssue, ...prev])
    setShowCreateModal(false)
    toast.success('이슈가 생성되었습니다')
  }, [])

  const handleIssueUpdated = useCallback((updatedIssue: QAIssue) => {
    setIssues(prev => prev.map(i => i.id === updatedIssue.id ? updatedIssue : i))
    setSelectedIssue(null)
  }, [])

  // Memoized issuesByStatus to prevent recalculation on every render
  const issuesByStatus = useMemo(() => {
    return statusColumns.reduce((acc, col) => {
      acc[col.id] = issues.filter(i => i.status === col.id || (col.id === 'OPEN' && i.status === 'REOPENED'))
      return acc
    }, {} as Record<string, QAIssue[]>)
  }, [issues])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between mb-4 px-4 py-3 bg-white rounded-lg shadow-sm">
        <div className="flex items-center gap-4">
          <h2 className="text-lg font-semibold">QA 보드</h2>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setViewMode('kanban')}
              className={`p-2 rounded ${viewMode === 'kanban' ? 'bg-blue-100 text-blue-700' : 'text-gray-500 hover:bg-gray-100'}`}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2" />
              </svg>
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-2 rounded ${viewMode === 'list' ? 'bg-blue-100 text-blue-700' : 'text-gray-500 hover:bg-gray-100'}`}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
              </svg>
            </button>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {/* Search */}
          <input
            type="text"
            placeholder="검색..."
            value={filter.search}
            onChange={(e) => setFilter(prev => ({ ...prev, search: e.target.value }))}
            className="px-3 py-2 border rounded-lg text-sm w-48"
          />
          {/* Type Filter */}
          <select
            value={filter.type}
            onChange={(e) => setFilter(prev => ({ ...prev, type: e.target.value }))}
            className="px-3 py-2 border rounded-lg text-sm"
          >
            <option value="">모든 유형</option>
            <option value="BUG">버그</option>
            <option value="FEATURE">기능</option>
            <option value="IMPROVEMENT">개선</option>
            <option value="TASK">작업</option>
            <option value="QUESTION">질문</option>
          </select>
          {/* Priority Filter */}
          <select
            value={filter.priority}
            onChange={(e) => setFilter(prev => ({ ...prev, priority: e.target.value }))}
            className="px-3 py-2 border rounded-lg text-sm"
          >
            <option value="">모든 우선순위</option>
            <option value="LOW">낮음</option>
            <option value="MEDIUM">보통</option>
            <option value="HIGH">높음</option>
            <option value="CRITICAL">긴급</option>
          </select>
          {/* Create Button */}
          <button
            onClick={() => setShowCreateModal(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2 text-sm font-medium"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            이슈 생성
          </button>
        </div>
      </div>

      {/* Kanban View */}
      {viewMode === 'kanban' && (
        <div className="flex-1 overflow-x-auto">
          <div className="flex gap-4 h-full min-w-max pb-4">
            {statusColumns.map((column) => (
              <div
                key={column.id}
                className={`flex-shrink-0 w-80 rounded-lg border ${column.color}`}
              >
                <div className="p-3 border-b bg-white/50 rounded-t-lg">
                  <div className="flex items-center justify-between">
                    <h3 className="font-medium">{column.title}</h3>
                    <span className="text-sm text-gray-500 bg-white px-2 py-0.5 rounded-full">
                      {issuesByStatus[column.id]?.length || 0}
                    </span>
                  </div>
                </div>
                <div className="p-2 space-y-2 max-h-[calc(100vh-280px)] overflow-y-auto">
                  <AnimatePresence>
                    {issuesByStatus[column.id]?.map((issue) => (
                      <motion.div
                        key={issue.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                      >
                        <QAIssueCard
                          issue={issue}
                          onClick={() => setSelectedIssue(issue)}
                          onStatusChange={handleStatusChange}
                          typeIcons={typeIcons}
                          priorityColors={priorityColors}
                        />
                      </motion.div>
                    ))}
                  </AnimatePresence>
                  {(!issuesByStatus[column.id] || issuesByStatus[column.id].length === 0) && (
                    <p className="text-center text-gray-400 text-sm py-8">이슈 없음</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* List View */}
      {viewMode === 'list' && (
        <div className="flex-1 overflow-y-auto bg-white rounded-lg shadow-sm">
          <table className="w-full">
            <thead className="bg-gray-50 sticky top-0">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">유형</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">제목</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">상태</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">우선순위</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">담당자</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">생성일</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">GitHub</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {issues.map((issue) => (
                <tr
                  key={issue.id}
                  onClick={() => setSelectedIssue(issue)}
                  className="hover:bg-gray-50 cursor-pointer"
                >
                  <td className="px-4 py-3">
                    <span className="text-lg">{typeIcons[issue.type]}</span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="font-medium text-gray-900">{issue.title}</div>
                    {issue.labels.length > 0 && (
                      <div className="flex gap-1 mt-1">
                        {issue.labels.slice(0, 3).map(label => (
                          <span key={label} className="px-2 py-0.5 bg-gray-100 rounded text-xs text-gray-600">
                            {label}
                          </span>
                        ))}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 rounded text-xs font-medium ${
                      issue.status === 'OPEN' ? 'bg-blue-100 text-blue-700' :
                      issue.status === 'IN_PROGRESS' ? 'bg-yellow-100 text-yellow-700' :
                      issue.status === 'RESOLVED' ? 'bg-green-100 text-green-700' :
                      'bg-gray-100 text-gray-700'
                    }`}>
                      {issue.status}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 rounded text-xs font-medium ${priorityColors[issue.priority]}`}>
                      {issue.priority}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {issue.assignee ? (
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center text-xs">
                          {issue.assignee.name.charAt(0)}
                        </div>
                        <span className="text-sm">{issue.assignee.name}</span>
                      </div>
                    ) : (
                      <span className="text-gray-400 text-sm">-</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-500">
                    {new Date(issue.createdAt).toLocaleDateString('ko-KR')}
                  </td>
                  <td className="px-4 py-3">
                    {issue.syncedToGitHub && issue.githubIssueUrl ? (
                      <a
                        href={issue.githubIssueUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="text-blue-600 hover:underline text-sm"
                      >
                        #{issue.githubIssueNumber}
                      </a>
                    ) : (
                      <span className="text-gray-400 text-sm">-</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {issues.length === 0 && (
            <div className="text-center py-12 text-gray-500">
              등록된 이슈가 없습니다
            </div>
          )}
        </div>
      )}

      {/* Issue Detail Modal */}
      {selectedIssue && (
        <QAIssueModal
          issue={selectedIssue}
          onClose={() => setSelectedIssue(null)}
          onUpdate={handleIssueUpdated}
          typeIcons={typeIcons}
          priorityColors={priorityColors}
        />
      )}

      {/* Create Issue Modal */}
      {showCreateModal && (
        <QACreateModal
          workspaceId={workspaceId}
          projectId={projectId}
          onClose={() => setShowCreateModal(false)}
          onCreate={handleIssueCreated}
        />
      )}
    </div>
  )
}
