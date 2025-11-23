'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import WorkflowMonitor from '@/components/automation/WorkflowMonitor'
import { useAuth } from '@/lib/auth-context'
import { WorkflowRun } from '@/types/automation'

export default function WorkflowRunsPage() {
  const { userProfile } = useAuth()

  // 권한 체크
  if (userProfile?.role !== 'admin' && userProfile?.role !== 'member') {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">접근 권한 없음</h2>
          <p className="text-gray-600">자동화 기능은 팀 멤버 이상만 사용할 수 있습니다.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* 헤더 */}
      <div className="flex items-center gap-4">
        <Link
          href="/automation"
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
        >
          ← 뒤로
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">워크플로우 실행 이력</h1>
          <p className="text-gray-600 mt-1">모든 워크플로우의 실행 상태와 로그를 확인하세요.</p>
        </div>
      </div>

      {/* 실행 모니터 */}
      <WorkflowMonitor />
    </div>
  )
}