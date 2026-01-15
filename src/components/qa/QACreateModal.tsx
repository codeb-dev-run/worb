"use client"

import React, { useState } from 'react'
import { motion } from 'framer-motion'
import { toast } from 'react-hot-toast'
import { QAIssue } from './QABoard'

interface QACreateModalProps {
  workspaceId: string
  projectId?: string
  onClose: () => void
  onCreate: (issue: QAIssue) => void
}

interface ChecklistItem {
  id: string
  text: string
  completed: boolean
}

export default function QACreateModal({
  workspaceId,
  projectId,
  onClose,
  onCreate,
}: QACreateModalProps) {
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    type: 'BUG' as 'BUG' | 'FEATURE' | 'IMPROVEMENT' | 'TASK' | 'QUESTION',
    priority: 'MEDIUM' as 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL',
    stepsToReproduce: '',
    expectedBehavior: '',
    actualBehavior: '',
    syncToGitHub: false,
  })
  const [checklist, setChecklist] = useState<ChecklistItem[]>([])
  const [newChecklistItem, setNewChecklistItem] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.title.trim()) {
      toast.error('제목을 입력해주세요')
      return
    }
    if (!formData.description.trim()) {
      toast.error('설명을 입력해주세요')
      return
    }

    setLoading(true)
    try {
      const res = await fetch('/api/qa', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          workspaceId,
          projectId,
          ...formData,
          checklist: checklist.length > 0 ? checklist : undefined,
        }),
      })

      if (res.ok) {
        const issue = await res.json()
        onCreate(issue)
      } else {
        const error = await res.json()
        toast.error(error.error || '이슈 생성에 실패했습니다')
      }
    } catch (error) {
      toast.error('이슈 생성에 실패했습니다')
    } finally {
      setLoading(false)
    }
  }

  const addChecklistItem = () => {
    if (!newChecklistItem.trim()) return
    setChecklist(prev => [...prev, {
      id: `check-${Date.now()}`,
      text: newChecklistItem.trim(),
      completed: false,
    }])
    setNewChecklistItem('')
  }

  const removeChecklistItem = (id: string) => {
    setChecklist(prev => prev.filter(item => item.id !== id))
  }

  const typeOptions = [
    { value: 'BUG', label: '버그', icon: '🐛' },
    { value: 'FEATURE', label: '기능', icon: '✨' },
    { value: 'IMPROVEMENT', label: '개선', icon: '🔧' },
    { value: 'TASK', label: '작업', icon: '📋' },
    { value: 'QUESTION', label: '질문', icon: '❓' },
  ]

  const priorityOptions = [
    { value: 'LOW', label: '낮음', color: 'bg-gray-200 text-gray-700' },
    { value: 'MEDIUM', label: '보통', color: 'bg-blue-200 text-blue-700' },
    { value: 'HIGH', label: '높음', color: 'bg-orange-200 text-orange-700' },
    { value: 'CRITICAL', label: '긴급', color: 'bg-red-200 text-red-700' },
  ]

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        onClick={(e) => e.stopPropagation()}
        className="bg-white rounded-xl shadow-xl w-full max-w-3xl max-h-[90vh] flex flex-col"
      >
        <form onSubmit={handleSubmit} className="flex flex-col h-full min-h-0">
          {/* Header - 고정 */}
          <div className="flex-shrink-0 flex items-center justify-between p-4 border-b">
            <h2 className="text-lg font-semibold">새 이슈 생성</h2>
            <button type="button" onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Content - 스크롤 가능 영역 */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 min-h-0">
            {/* Type & Priority */}
            <div className="flex gap-4">
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700 mb-1">유형</label>
                <div className="flex gap-2">
                  {typeOptions.map(opt => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setFormData(prev => ({ ...prev, type: opt.value as typeof formData.type }))}
                      className={`px-3 py-2 rounded-lg border text-sm flex items-center gap-1 ${
                        formData.type === opt.value
                          ? 'border-blue-500 bg-blue-50 text-blue-700'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <span>{opt.icon}</span>
                      <span>{opt.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">우선순위</label>
              <div className="flex gap-2">
                {priorityOptions.map(opt => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setFormData(prev => ({ ...prev, priority: opt.value as typeof formData.priority }))}
                    className={`px-3 py-2 rounded-lg text-sm ${
                      formData.priority === opt.value
                        ? opt.color
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Title */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                제목 <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                placeholder="이슈 제목을 입력하세요"
                className="w-full px-3 py-2 border rounded-lg"
                required
              />
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                설명 <span className="text-red-500">*</span>
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                placeholder="이슈에 대한 자세한 설명을 입력하세요"
                className="w-full px-3 py-2 border rounded-lg resize-none"
                rows={4}
                required
              />
            </div>

            {/* Bug-specific fields */}
            {formData.type === 'BUG' && (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">재현 방법</label>
                  <textarea
                    value={formData.stepsToReproduce}
                    onChange={(e) => setFormData(prev => ({ ...prev, stepsToReproduce: e.target.value }))}
                    placeholder="1. 로그인 후&#10;2. 설정 페이지로 이동&#10;3. ..."
                    className="w-full px-3 py-2 border rounded-lg resize-none"
                    rows={3}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">기대 동작</label>
                    <textarea
                      value={formData.expectedBehavior}
                      onChange={(e) => setFormData(prev => ({ ...prev, expectedBehavior: e.target.value }))}
                      placeholder="정상적으로 동작해야 하는 내용"
                      className="w-full px-3 py-2 border rounded-lg resize-none"
                      rows={2}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">실제 동작</label>
                    <textarea
                      value={formData.actualBehavior}
                      onChange={(e) => setFormData(prev => ({ ...prev, actualBehavior: e.target.value }))}
                      placeholder="실제로 발생하는 문제"
                      className="w-full px-3 py-2 border rounded-lg resize-none"
                      rows={2}
                    />
                  </div>
                </div>
              </>
            )}

            {/* Checklist */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">체크리스트</label>
              <div className="flex gap-2 mb-2">
                <input
                  type="text"
                  value={newChecklistItem}
                  onChange={(e) => setNewChecklistItem(e.target.value)}
                  placeholder="체크리스트 항목 추가"
                  className="flex-1 px-3 py-2 border rounded-lg text-sm"
                  onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addChecklistItem())}
                />
                <button
                  type="button"
                  onClick={addChecklistItem}
                  className="px-3 py-2 bg-gray-100 rounded-lg text-sm hover:bg-gray-200"
                >
                  추가
                </button>
              </div>
              {checklist.length > 0 && (
                <div className="space-y-2">
                  {checklist.map((item) => (
                    <div key={item.id} className="flex items-center gap-2 text-sm bg-gray-50 px-3 py-2 rounded">
                      <input type="checkbox" disabled className="rounded" />
                      <span className="flex-1">{item.text}</span>
                      <button
                        type="button"
                        onClick={() => removeChecklistItem(item.id)}
                        className="text-red-500 hover:text-red-700"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* GitHub Sync */}
            <div className="bg-gray-50 rounded-lg p-4">
              <label className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={formData.syncToGitHub}
                  onChange={(e) => setFormData(prev => ({ ...prev, syncToGitHub: e.target.checked }))}
                  className="rounded"
                />
                <div>
                  <span className="font-medium text-sm">GitHub Issue 자동 생성</span>
                  <p className="text-xs text-gray-500">워크스페이스에 GitHub 연동이 설정된 경우 자동으로 Issue가 생성됩니다</p>
                </div>
              </label>
            </div>
          </div>

          {/* Footer - 고정 */}
          <div className="flex-shrink-0 flex items-center justify-end gap-3 p-4 border-t bg-gray-50">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 hover:bg-gray-200 rounded-lg text-sm"
            >
              취소
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? '생성 중...' : '이슈 생성'}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  )
}
