"use client"

import React from 'react'
import { QAIssue } from './QABoard'

interface QAIssueCardProps {
  issue: QAIssue
  onClick: () => void
  onStatusChange: (issueId: string, status: string) => void
  typeIcons: Record<string, string>
  priorityColors: Record<string, string>
}

export default function QAIssueCard({
  issue,
  onClick,
  onStatusChange,
  typeIcons,
  priorityColors,
}: QAIssueCardProps) {
  const handleStatusClick = (e: React.MouseEvent, newStatus: string) => {
    e.stopPropagation()
    onStatusChange(issue.id, newStatus)
  }

  return (
    <div
      onClick={onClick}
      className="bg-white rounded-lg shadow-sm border border-gray-200 p-3 cursor-pointer hover:shadow-md transition-shadow"
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="text-lg">{typeIcons[issue.type]}</span>
          <span className={`px-2 py-0.5 rounded text-xs font-medium ${priorityColors[issue.priority]}`}>
            {issue.priority === 'LOW' ? '낮음' :
             issue.priority === 'MEDIUM' ? '보통' :
             issue.priority === 'HIGH' ? '높음' : '긴급'}
          </span>
        </div>
        {issue.syncedToGitHub && (
          <a
            href={issue.githubIssueUrl || '#'}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="text-gray-400 hover:text-gray-600"
            title={`GitHub #${issue.githubIssueNumber}`}
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 0C5.374 0 0 5.373 0 12c0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23A11.509 11.509 0 0112 5.803c1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576C20.566 21.797 24 17.3 24 12c0-6.627-5.373-12-12-12z"/>
            </svg>
          </a>
        )}
      </div>

      {/* Title */}
      <h4 className="font-medium text-gray-900 text-sm mb-2 line-clamp-2">
        {issue.title}
      </h4>

      {/* Labels */}
      {issue.labels.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-2">
          {issue.labels.slice(0, 3).map(label => (
            <span key={label} className="px-1.5 py-0.5 bg-blue-50 text-blue-600 rounded text-xs">
              {label}
            </span>
          ))}
          {issue.labels.length > 3 && (
            <span className="px-1.5 py-0.5 bg-gray-100 text-gray-500 rounded text-xs">
              +{issue.labels.length - 3}
            </span>
          )}
        </div>
      )}

      {/* Checklist Progress */}
      {issue.checklist && issue.checklist.length > 0 && (
        <div className="mb-2">
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
            <span>
              {issue.checklist.filter(i => i.completed).length}/{issue.checklist.length}
            </span>
            <div className="flex-1 h-1.5 bg-gray-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-green-500 rounded-full"
                style={{
                  width: `${(issue.checklist.filter(i => i.completed).length / issue.checklist.length) * 100}%`
                }}
              />
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between pt-2 border-t border-gray-100">
        <div className="flex items-center gap-2">
          {/* Assignee */}
          {issue.assignee ? (
            <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center text-xs text-blue-700">
              {issue.assignee.name.charAt(0)}
            </div>
          ) : (
            <div className="w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center text-xs text-gray-400">
              ?
            </div>
          )}
          {/* Comments count */}
          {issue._count && issue._count.comments > 0 && (
            <div className="flex items-center gap-1 text-gray-400 text-xs">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
              {issue._count.comments}
            </div>
          )}
          {/* Attachments count */}
          {issue._count && issue._count.attachments > 0 && (
            <div className="flex items-center gap-1 text-gray-400 text-xs">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
              </svg>
              {issue._count.attachments}
            </div>
          )}
        </div>
        {/* Date */}
        <span className="text-xs text-gray-400">
          {new Date(issue.createdAt).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' })}
        </span>
      </div>

      {/* Quick Status Change */}
      {issue.status !== 'CLOSED' && (
        <div className="flex gap-1 mt-2 pt-2 border-t border-gray-100">
          {issue.status === 'OPEN' && (
            <button
              onClick={(e) => handleStatusClick(e, 'IN_PROGRESS')}
              className="flex-1 text-xs py-1 rounded bg-yellow-50 text-yellow-700 hover:bg-yellow-100"
            >
              시작
            </button>
          )}
          {issue.status === 'IN_PROGRESS' && (
            <button
              onClick={(e) => handleStatusClick(e, 'RESOLVED')}
              className="flex-1 text-xs py-1 rounded bg-green-50 text-green-700 hover:bg-green-100"
            >
              해결
            </button>
          )}
          {issue.status === 'RESOLVED' && (
            <button
              onClick={(e) => handleStatusClick(e, 'CLOSED')}
              className="flex-1 text-xs py-1 rounded bg-gray-50 text-gray-700 hover:bg-gray-100"
            >
              완료
            </button>
          )}
        </div>
      )}
    </div>
  )
}
