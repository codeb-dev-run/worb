"use client"

import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { toast } from 'react-hot-toast'
import { QAIssue } from './QABoard'

interface Comment {
  id: string
  content: string
  filePath?: string | null
  lineNumber?: number | null
  codeSnippet?: string | null
  isInternal: boolean
  createdAt: string
  author: {
    id: string
    name: string
    email: string
    avatar?: string | null
  }
}

interface QAIssueModalProps {
  issue: QAIssue
  onClose: () => void
  onUpdate: (issue: QAIssue) => void
  typeIcons: Record<string, string>
  priorityColors: Record<string, string>
}

export default function QAIssueModal({
  issue,
  onClose,
  onUpdate,
  typeIcons,
  priorityColors,
}: QAIssueModalProps) {
  const [comments, setComments] = useState<Comment[]>([])
  const [newComment, setNewComment] = useState('')
  const [isInternal, setIsInternal] = useState(false)
  const [loading, setLoading] = useState(false)
  const [activeTab, setActiveTab] = useState<'details' | 'comments' | 'history'>('details')
  const [editingStatus, setEditingStatus] = useState(false)
  const [status, setStatus] = useState(issue.status)

  useEffect(() => {
    loadComments()
  }, [issue.id])

  const loadComments = async () => {
    try {
      const res = await fetch(`/api/qa/${issue.id}/comments`)
      if (res.ok) {
        const data = await res.json()
        setComments(data)
      }
    } catch (error) {
      console.error('Failed to load comments:', error)
    }
  }

  const handleAddComment = async () => {
    if (!newComment.trim()) return

    setLoading(true)
    try {
      const res = await fetch(`/api/qa/${issue.id}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: newComment,
          isInternal,
        }),
      })

      if (res.ok) {
        const comment = await res.json()
        setComments(prev => [...prev, comment])
        setNewComment('')
        toast.success('댓글이 추가되었습니다')
      }
    } catch (error) {
      toast.error('댓글 추가에 실패했습니다')
    } finally {
      setLoading(false)
    }
  }

  const handleStatusChange = async () => {
    try {
      const res = await fetch(`/api/qa/${issue.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      })

      if (res.ok) {
        const updated = await res.json()
        onUpdate({ ...issue, ...updated })
        setEditingStatus(false)
        toast.success('상태가 변경되었습니다')
      }
    } catch (error) {
      toast.error('상태 변경에 실패했습니다')
    }
  }

  const statusOptions = [
    { value: 'OPEN', label: '오픈', color: 'bg-blue-100 text-blue-700' },
    { value: 'IN_PROGRESS', label: '진행 중', color: 'bg-yellow-100 text-yellow-700' },
    { value: 'RESOLVED', label: '해결됨', color: 'bg-green-100 text-green-700' },
    { value: 'CLOSED', label: '완료', color: 'bg-gray-100 text-gray-700' },
    { value: 'REOPENED', label: '재오픈', color: 'bg-purple-100 text-purple-700' },
  ]

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        onClick={(e) => e.stopPropagation()}
        className="bg-white rounded-xl shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <div className="flex items-center gap-3">
            <span className="text-2xl">{typeIcons[issue.type]}</span>
            <div>
              <h2 className="text-lg font-semibold">{issue.title}</h2>
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <span>보고자: {issue.reporter.name}</span>
                <span>|</span>
                <span>{new Date(issue.createdAt).toLocaleDateString('ko-KR')}</span>
                {issue.syncedToGitHub && (
                  <>
                    <span>|</span>
                    <a
                      href={issue.githubIssueUrl || '#'}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:underline"
                    >
                      GitHub #{issue.githubIssueNumber}
                    </a>
                  </>
                )}
              </div>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Status & Priority Bar */}
        <div className="flex items-center gap-4 px-4 py-3 bg-gray-50 border-b">
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-500">상태:</span>
            {editingStatus ? (
              <div className="flex items-center gap-2">
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as QAIssue['status'])}
                  className="px-2 py-1 border rounded text-sm"
                >
                  {statusOptions.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
                <button
                  onClick={handleStatusChange}
                  className="px-2 py-1 bg-blue-600 text-white rounded text-sm"
                >
                  저장
                </button>
                <button
                  onClick={() => { setEditingStatus(false); setStatus(issue.status); }}
                  className="px-2 py-1 bg-gray-200 rounded text-sm"
                >
                  취소
                </button>
              </div>
            ) : (
              <button
                onClick={() => setEditingStatus(true)}
                className={`px-2 py-1 rounded text-sm font-medium ${
                  statusOptions.find(s => s.value === issue.status)?.color
                }`}
              >
                {statusOptions.find(s => s.value === issue.status)?.label}
              </button>
            )}
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-500">우선순위:</span>
            <span className={`px-2 py-1 rounded text-sm font-medium ${priorityColors[issue.priority]}`}>
              {issue.priority === 'LOW' ? '낮음' :
               issue.priority === 'MEDIUM' ? '보통' :
               issue.priority === 'HIGH' ? '높음' : '긴급'}
            </span>
          </div>
          {issue.assignee && (
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-500">담당자:</span>
              <div className="flex items-center gap-1">
                <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center text-xs text-blue-700">
                  {issue.assignee.name.charAt(0)}
                </div>
                <span className="text-sm">{issue.assignee.name}</span>
              </div>
            </div>
          )}
        </div>

        {/* Tabs */}
        <div className="flex border-b">
          {['details', 'comments', 'history'].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab as typeof activeTab)}
              className={`px-4 py-3 text-sm font-medium ${
                activeTab === tab
                  ? 'border-b-2 border-blue-600 text-blue-600'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {tab === 'details' ? '상세 정보' : tab === 'comments' ? `댓글 (${comments.length})` : '변경 이력'}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {activeTab === 'details' && (
            <div className="space-y-6">
              {/* Description */}
              <div>
                <h3 className="text-sm font-medium text-gray-700 mb-2">설명</h3>
                <div
                  className="prose prose-sm max-w-none bg-gray-50 rounded-lg p-4"
                  dangerouslySetInnerHTML={{ __html: issue.description }}
                />
              </div>

              {/* Bug-specific fields */}
              {issue.type === 'BUG' && (
                <>
                  {issue.stepsToReproduce && (
                    <div>
                      <h3 className="text-sm font-medium text-gray-700 mb-2">재현 방법</h3>
                      <div className="bg-gray-50 rounded-lg p-4 text-sm whitespace-pre-wrap">
                        {issue.stepsToReproduce}
                      </div>
                    </div>
                  )}
                  {issue.expectedBehavior && (
                    <div>
                      <h3 className="text-sm font-medium text-gray-700 mb-2">기대 동작</h3>
                      <div className="bg-green-50 rounded-lg p-4 text-sm">
                        {issue.expectedBehavior}
                      </div>
                    </div>
                  )}
                  {issue.actualBehavior && (
                    <div>
                      <h3 className="text-sm font-medium text-gray-700 mb-2">실제 동작</h3>
                      <div className="bg-red-50 rounded-lg p-4 text-sm">
                        {issue.actualBehavior}
                      </div>
                    </div>
                  )}
                </>
              )}

              {/* Environment */}
              {issue.environment && (
                <div>
                  <h3 className="text-sm font-medium text-gray-700 mb-2">환경</h3>
                  <div className="bg-gray-50 rounded-lg p-4 text-sm">{issue.environment}</div>
                </div>
              )}

              {/* Affected Files */}
              {issue.affectedFiles.length > 0 && (
                <div>
                  <h3 className="text-sm font-medium text-gray-700 mb-2">영향받는 파일</h3>
                  <div className="space-y-1">
                    {issue.affectedFiles.map((file, idx) => (
                      <div key={idx} className="flex items-center gap-2 text-sm">
                        <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        <code className="bg-gray-100 px-2 py-0.5 rounded">{file}</code>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Labels */}
              {issue.labels.length > 0 && (
                <div>
                  <h3 className="text-sm font-medium text-gray-700 mb-2">라벨</h3>
                  <div className="flex flex-wrap gap-2">
                    {issue.labels.map(label => (
                      <span key={label} className="px-2 py-1 bg-blue-50 text-blue-700 rounded text-sm">
                        {label}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Checklist */}
              {issue.checklist && issue.checklist.length > 0 && (
                <div>
                  <h3 className="text-sm font-medium text-gray-700 mb-2">체크리스트</h3>
                  <div className="space-y-2">
                    {issue.checklist.map((item) => (
                      <label key={item.id} className="flex items-center gap-2 text-sm">
                        <input
                          type="checkbox"
                          checked={item.completed}
                          readOnly
                          className="rounded"
                        />
                        <span className={item.completed ? 'line-through text-gray-400' : ''}>
                          {item.text}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'comments' && (
            <div className="space-y-4">
              {/* Comments List */}
              <div className="space-y-4">
                {comments.map((comment) => (
                  <div
                    key={comment.id}
                    className={`p-4 rounded-lg ${comment.isInternal ? 'bg-yellow-50 border border-yellow-200' : 'bg-gray-50'}`}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-sm text-blue-700">
                        {comment.author.name.charAt(0)}
                      </div>
                      <div>
                        <span className="font-medium text-sm">{comment.author.name}</span>
                        {comment.isInternal && (
                          <span className="ml-2 text-xs text-yellow-600 bg-yellow-100 px-1.5 py-0.5 rounded">
                            내부 메모
                          </span>
                        )}
                      </div>
                      <span className="text-xs text-gray-400 ml-auto">
                        {new Date(comment.createdAt).toLocaleString('ko-KR')}
                      </span>
                    </div>
                    {comment.filePath && (
                      <div className="mb-2 text-xs text-gray-500">
                        <code className="bg-gray-200 px-1.5 py-0.5 rounded">{comment.filePath}</code>
                        {comment.lineNumber && <span> : {comment.lineNumber}</span>}
                      </div>
                    )}
                    {comment.codeSnippet && (
                      <pre className="mb-2 p-2 bg-gray-800 text-gray-100 rounded text-xs overflow-x-auto">
                        {comment.codeSnippet}
                      </pre>
                    )}
                    <div className="text-sm whitespace-pre-wrap">{comment.content}</div>
                  </div>
                ))}
                {comments.length === 0 && (
                  <p className="text-center text-gray-400 py-8">아직 댓글이 없습니다</p>
                )}
              </div>

              {/* Add Comment */}
              <div className="border-t pt-4">
                <textarea
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  placeholder="댓글을 입력하세요..."
                  className="w-full p-3 border rounded-lg text-sm resize-none"
                  rows={3}
                />
                <div className="flex items-center justify-between mt-2">
                  <label className="flex items-center gap-2 text-sm text-gray-600">
                    <input
                      type="checkbox"
                      checked={isInternal}
                      onChange={(e) => setIsInternal(e.target.checked)}
                      className="rounded"
                    />
                    내부 메모 (GitHub에 동기화되지 않음)
                  </label>
                  <button
                    onClick={handleAddComment}
                    disabled={!newComment.trim() || loading}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm disabled:opacity-50"
                  >
                    {loading ? '추가 중...' : '댓글 추가'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'history' && (
            <div className="text-center text-gray-400 py-8">
              변경 이력 기능은 곧 추가됩니다
            </div>
          )}
        </div>
      </motion.div>
    </div>
  )
}
