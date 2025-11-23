'use client'

import React, { useState } from 'react'
import { Gantt, Task as GanttTask, ViewMode } from 'gantt-task-react'
import 'gantt-task-react/dist/index.css'

interface GanttChartSimplifiedProps {
  tasks: GanttTask[]
  onTaskChange?: (task: GanttTask) => void
  onTaskDelete?: (task: GanttTask) => void
}

export default function GanttChartSimplified({
  tasks,
  onTaskChange,
  onTaskDelete
}: GanttChartSimplifiedProps) {
  const [viewMode, setViewMode] = useState<ViewMode>(ViewMode.Day)

  const handleTaskChange = (task: GanttTask) => {
    console.log('Task changed:', task)
    if (onTaskChange) {
      onTaskChange(task)
    }
  }

  const handleTaskDelete = (task: GanttTask) => {
    console.log('Task deleted:', task)
    if (onTaskDelete) {
      onTaskDelete(task)
    }
  }

  const handleProgressChange = async (task: GanttTask) => {
    console.log('Progress changed:', task)
    if (onTaskChange) {
      onTaskChange(task)
    }
  }

  const handleDoubleClick = (task: GanttTask) => {
    console.log('Task double clicked:', task)
  }

  const handleSelect = (task: GanttTask, isSelected: boolean) => {
    console.log('Task selected:', task, isSelected)
  }

  if (tasks.length === 0) {
    return (
      <div className="h-full flex items-center justify-center bg-white rounded-lg">
        <div className="text-center">
          <p className="text-gray-500">작업이 없습니다</p>
          <p className="text-sm text-gray-400 mt-1">작업을 추가하면 간트 차트가 표시됩니다</p>
        </div>
      </div>
    )
  }

  return (
    <div className="h-full bg-white rounded-lg overflow-hidden flex flex-col">
      {/* Custom CSS for fixed column */}
      <style jsx global>{`
        /* Hide the default scrollbar for the task list */
        .gantt-task-list {
          overflow: hidden !important;
        }
        
        /* Allow horizontal scroll for the timeline */
        .gantt-horizontal-scroll {
          overflow-x: auto !important;
        }
        
        /* Ensure the container takes full height */
        .gantt-container {
          height: 100%;
        }
      `}</style>

      {/* Controls */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
        <h2 className="text-lg font-semibold text-gray-900">프로젝트 타임라인</h2>
        <div className="flex gap-2">
          <button
            onClick={() => setViewMode(ViewMode.Day)}
            className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${viewMode === ViewMode.Day
              ? 'bg-blue-600 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
          >
            일
          </button>
          <button
            onClick={() => setViewMode(ViewMode.Week)}
            className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${viewMode === ViewMode.Week
              ? 'bg-blue-600 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
          >
            주
          </button>
          <button
            onClick={() => setViewMode(ViewMode.Month)}
            className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${viewMode === ViewMode.Month
              ? 'bg-blue-600 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
          >
            월
          </button>
        </div>
      </div>

      {/* Gantt Chart */}
      <div className="flex-1 overflow-hidden p-4">
        <div className="h-full w-full">
          <Gantt
            tasks={tasks}
            viewMode={viewMode}
            onDateChange={handleTaskChange}
            onDelete={handleTaskDelete}
            onProgressChange={handleProgressChange}
            onDoubleClick={handleDoubleClick}
            onSelect={handleSelect}
            locale="ko"
            listCellWidth="200px"
            columnWidth={viewMode === ViewMode.Month ? 300 : viewMode === ViewMode.Week ? 250 : 60}
            rowHeight={50}
            barCornerRadius={4}
            barFill={60}
            barProgressColor="#3b82f6"
            barProgressSelectedColor="#2563eb"
            barBackgroundColor="#93c5fd"
            barBackgroundSelectedColor="#60a5fa"
            projectProgressColor="#10b981"
            projectProgressSelectedColor="#059669"
            projectBackgroundColor="#6ee7b7"
            projectBackgroundSelectedColor="#34d399"
            milestoneBackgroundColor="#f59e0b"
            milestoneBackgroundSelectedColor="#d97706"
            fontSize="14px"
            fontFamily="Inter, system-ui, sans-serif"
            arrowColor="#6b7280"
            arrowIndent={20}
            todayColor="rgba(239, 68, 68, 0.2)"
            TooltipContent={({ task }) => (
              <div className="bg-gray-900 text-white px-3 py-2 rounded-lg shadow-lg text-sm">
                <div className="font-semibold mb-1">{task.name}</div>
                <div className="text-gray-300">
                  {task.start.toLocaleDateString('ko-KR')} ~ {task.end.toLocaleDateString('ko-KR')}
                </div>
                <div className="text-gray-300 mt-1">진행률: {task.progress}%</div>
              </div>
            )}
          />
        </div>
      </div>
    </div>
  )
}