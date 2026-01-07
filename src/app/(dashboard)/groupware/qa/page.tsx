'use client'

import React from 'react'
import { useWorkspace } from '@/lib/workspace-context'
import QABoard from '@/components/qa/QABoard'

export default function QABoardPage() {
  const { currentWorkspace } = useWorkspace()

  if (!currentWorkspace) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-slate-500">워크스페이스를 선택해주세요.</p>
      </div>
    )
  }

  return (
    <div className="h-full">
      <QABoard workspaceId={currentWorkspace.id} />
    </div>
  )
}
