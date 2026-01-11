'use client'

import React, { useEffect, useRef, useState } from 'react'
import { Gantt, Task, ViewMode } from 'gantt-task-react'
import "gantt-task-react/dist/index.css"
import { motion, AnimatePresence } from 'framer-motion'
import { useWorkspace } from '@/lib/workspace-context'
import styles from './GanttChartPro.module.css'

// 확장된 Task 타입 (담당자 부서 정보 포함)
export interface ExtendedTask extends Task {
  assigneeDepartment?: string  // 담당자 부서 ID
}

// 색상 팔레트
const colorPalette = [
  { name: '파랑', value: '#4f7eff', bg: '#e5edff' },
  { name: '초록', value: '#10b981', bg: '#d1fae5' },
  { name: '빨강', value: '#ef4444', bg: '#fee2e2' },
  { name: '주황', value: '#f97316', bg: '#ffedd5' },
  { name: '보라', value: '#8b5cf6', bg: '#ede9fe' },
  { name: '분홍', value: '#ec4899', bg: '#fce7f3' },
  { name: '청록', value: '#06b6d4', bg: '#cffafe' },
  { name: '노랑', value: '#eab308', bg: '#fef3c7' },
]

interface GanttChartProProps {
  tasks: ExtendedTask[]
  onTaskChange?: (task: ExtendedTask) => void
  onTaskDelete?: (task: ExtendedTask) => void
  onProgressChange?: (task: ExtendedTask) => void
  onDateChange?: (task: ExtendedTask) => void
}

// 셀 너비 상수 정의 (헤더와 테이블에서 동일하게 사용)
const COLUMN_WIDTHS = {
  taskName: '155px',
  startDate: '100px',
  endDate: '100px',
}

// 커스텀 TaskListHeader 컴포넌트
const TaskListHeader: React.FC<{
  headerHeight: number
  rowWidth: string
  fontFamily: string
  fontSize: string
}> = ({ headerHeight, fontFamily, fontSize }) => {
  return (
    <div
      className={styles.taskListHeader}
      style={{
        height: headerHeight,
        fontFamily: fontFamily,
        fontSize: fontSize,
      }}
    >
      <div className={styles.taskListHeaderCell} style={{ width: COLUMN_WIDTHS.taskName, minWidth: COLUMN_WIDTHS.taskName }}>
        작업명
      </div>
      <div className={styles.taskListHeaderCell} style={{ width: COLUMN_WIDTHS.startDate, minWidth: COLUMN_WIDTHS.startDate }}>
        시작일
      </div>
      <div className={styles.taskListHeaderCell} style={{ width: COLUMN_WIDTHS.endDate, minWidth: COLUMN_WIDTHS.endDate }}>
        종료일
      </div>
    </div>
  )
}

// 커스텀 TaskListTable 컴포넌트
const TaskListTable: React.FC<{
  tasks: ExtendedTask[]
  rowHeight: number
  rowWidth: string
  fontFamily: string
  fontSize: string
  locale: string
  onExpanderClick: (task: ExtendedTask) => void
  onTaskDoubleClick?: (task: ExtendedTask) => void
}> = ({ tasks, rowHeight, rowWidth, fontFamily, fontSize, locale, onExpanderClick, onTaskDoubleClick }) => {
  const { getDepartmentColor } = useWorkspace()
  const formatDate = (date: Date) => {
    return date.toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    })
  }

  return (
    <div
      className={styles.taskListWrapper}
      style={{ fontFamily: fontFamily, fontSize: fontSize }}
    >
      {tasks.map((task, index) => {
        const isProject = task.type === 'project'
        const isMilestone = task.type === 'milestone'
        const extTask = task as ExtendedTask
        const departmentColor = getDepartmentColor(extTask.assigneeDepartment)

        return (
          <div
            key={task.id}
            className={styles.taskListRow}
            style={{ height: rowHeight }}
            onDoubleClick={() => onTaskDoubleClick?.(task)}
          >
            <div
              className={styles.taskListCell}
              style={{ width: COLUMN_WIDTHS.taskName, minWidth: COLUMN_WIDTHS.taskName }}
              title={task.name}
            >
              <div className={styles.taskNameWrapper}>
                {isProject && (
                  <button
                    className={styles.expanderButton}
                    onClick={() => onExpanderClick(task)}
                  >
                    {task.hideChildren ? '▶' : '▼'}
                  </button>
                )}
                {/* 부서 컬러 도트 */}
                <span
                  className={styles.departmentDot}
                  style={{ backgroundColor: departmentColor }}
                  title={extTask.assigneeDepartment || '미지정'}
                />
                <span
                  className={`${styles.taskName} ${isProject ? styles.projectName : ''} ${isMilestone ? styles.milestoneName : ''}`}
                  style={{
                    paddingLeft: isProject ? '0' : '4px',
                    color: (task as any).styles?.progressColor || (task as any).styles?.backgroundColor || undefined
                  }}
                >
                  {isMilestone && '◆ '}
                  {task.name}
                </span>
              </div>
            </div>
            <div className={styles.taskListCell} style={{ width: COLUMN_WIDTHS.startDate, minWidth: COLUMN_WIDTHS.startDate }}>
              {formatDate(task.start)}
            </div>
            <div className={styles.taskListCell} style={{ width: COLUMN_WIDTHS.endDate, minWidth: COLUMN_WIDTHS.endDate }}>
              {formatDate(task.end)}
            </div>
          </div>
        )
      })}
    </div>
  )
}

// 작업 편집 모달
interface TaskEditModalProps {
  task: Task
  isOpen: boolean
  onClose: () => void
  onSave: (updatedTask: Task) => void
}

const TaskEditModal: React.FC<TaskEditModalProps> = ({ task, isOpen, onClose, onSave }) => {
  const [name, setName] = useState(task.name)
  const [startDate, setStartDate] = useState(task.start.toISOString().split('T')[0])
  const [endDate, setEndDate] = useState(task.end.toISOString().split('T')[0])
  const [progress, setProgress] = useState(task.progress)
  const [selectedColor, setSelectedColor] = useState(
    (task as any).styles?.progressColor || colorPalette[0].value
  )

  useEffect(() => {
    setName(task.name)
    setStartDate(task.start.toISOString().split('T')[0])
    setEndDate(task.end.toISOString().split('T')[0])
    setProgress(task.progress)
    setSelectedColor((task as any).styles?.progressColor || colorPalette[0].value)
  }, [task])

  const handleSave = () => {
    const colorInfo = colorPalette.find(c => c.value === selectedColor) || colorPalette[0]

    const updatedTask: Task = {
      ...task,
      name,
      start: new Date(startDate),
      end: new Date(endDate),
      progress,
      styles: {
        progressColor: colorInfo.value,
        progressSelectedColor: colorInfo.value,
        backgroundColor: colorInfo.bg,
        backgroundSelectedColor: colorInfo.bg,
      }
    }
    onSave(updatedTask)
    onClose()
  }

  if (!isOpen) return null

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            className="bg-white rounded-xl shadow-2xl w-full max-w-md mx-4 overflow-hidden"
            onClick={e => e.stopPropagation()}
          >
            {/* 모달 헤더 */}
            <div className="px-6 py-4 border-b bg-gray-50">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900">작업 수정</h3>
                <button
                  onClick={onClose}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            {/* 모달 바디 */}
            <div className="px-6 py-4 space-y-4">
              {/* 작업명 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  작업명
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                  placeholder="작업명을 입력하세요"
                />
              </div>

              {/* 날짜 */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    시작일
                  </label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={e => setStartDate(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    종료일
                  </label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={e => setEndDate(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                  />
                </div>
              </div>

              {/* 진행률 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  진행률: {progress}%
                </label>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={progress}
                  onChange={e => setProgress(Number(e.target.value))}
                  className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-primary"
                />
                <div className="flex justify-between text-xs text-gray-500 mt-1">
                  <span>0%</span>
                  <span>50%</span>
                  <span>100%</span>
                </div>
              </div>

              {/* 색상 선택 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  바 색상
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {colorPalette.map(color => (
                    <button
                      key={color.value}
                      onClick={() => setSelectedColor(color.value)}
                      className={`
                        flex flex-col items-center justify-center p-2 rounded-lg border-2 transition-all
                        ${selectedColor === color.value
                          ? 'border-gray-900 ring-2 ring-gray-200'
                          : 'border-transparent hover:border-gray-200'
                        }
                      `}
                    >
                      <div
                        className="w-8 h-4 rounded"
                        style={{ backgroundColor: color.value }}
                      />
                      <span className="text-xs text-gray-600 mt-1">{color.name}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* 미리보기 */}
              <div className="bg-gray-50 rounded-lg p-3">
                <label className="block text-xs font-medium text-gray-500 mb-2">미리보기</label>
                <div className="relative h-6 bg-gray-200 rounded overflow-hidden">
                  <div
                    className="absolute top-0 left-0 h-full rounded transition-all"
                    style={{
                      width: `${progress}%`,
                      backgroundColor: selectedColor
                    }}
                  />
                </div>
              </div>
            </div>

            {/* 모달 푸터 */}
            <div className="px-6 py-4 border-t bg-gray-50 flex justify-end gap-3">
              <button
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                취소
              </button>
              <button
                onClick={handleSave}
                className="px-4 py-2 text-sm font-medium text-white bg-primary rounded-lg hover:bg-primary/90 transition-colors"
              >
                저장
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

export default function GanttChartPro({
  tasks,
  onTaskChange,
  onTaskDelete,
  onProgressChange,
  onDateChange
}: GanttChartProProps) {
  const [view, setView] = useState<ViewMode>(ViewMode.Day)
  const [isChecked, setIsChecked] = useState(true)
  const [selectedTask, setSelectedTask] = useState<ExtendedTask | null>(null)
  const [editModalOpen, setEditModalOpen] = useState(false)
  const [editingTask, setEditingTask] = useState<ExtendedTask | null>(null)
  const [localTasks, setLocalTasks] = useState<ExtendedTask[]>(tasks)
  const ganttWrapperRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setLocalTasks(tasks)
  }, [tasks])

  // 드래그 중 뷰포트 자동 스크롤
  useEffect(() => {
    const ganttWrapper = ganttWrapperRef.current
    if (!ganttWrapper) return

    let isDragging = false
    let scrollInterval: NodeJS.Timeout | null = null
    const scrollSpeed = 10
    const edgeThreshold = 50 // 가장자리에서 얼마나 가까워야 스크롤할지

    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging) return

      const rect = ganttWrapper.getBoundingClientRect()
      const mouseX = e.clientX - rect.left
      const mouseY = e.clientY - rect.top

      // 가로 스크롤
      if (mouseX < edgeThreshold) {
        // 왼쪽 가장자리에 가까움 - 왼쪽으로 스크롤
        ganttWrapper.scrollLeft -= scrollSpeed
      } else if (mouseX > rect.width - edgeThreshold) {
        // 오른쪽 가장자리에 가까움 - 오른쪽으로 스크롤
        ganttWrapper.scrollLeft += scrollSpeed
      }

      // 세로 스크롤
      if (mouseY < edgeThreshold) {
        ganttWrapper.scrollTop -= scrollSpeed
      } else if (mouseY > rect.height - edgeThreshold) {
        ganttWrapper.scrollTop += scrollSpeed
      }
    }

    const handleMouseDown = (e: MouseEvent) => {
      // 간트 바에서 드래그 시작 감지
      const target = e.target as HTMLElement
      if (target.closest('[class*="bar"]') || target.closest('[class*="handle"]')) {
        isDragging = true
        // 부드러운 스크롤을 위한 interval 시작
        scrollInterval = setInterval(() => {
          // interval 내에서는 마지막 마우스 위치로 체크
        }, 16) // ~60fps
      }
    }

    const handleMouseUp = () => {
      isDragging = false
      if (scrollInterval) {
        clearInterval(scrollInterval)
        scrollInterval = null
      }
    }

    ganttWrapper.addEventListener('mousedown', handleMouseDown)
    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)

    return () => {
      ganttWrapper.removeEventListener('mousedown', handleMouseDown)
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
      if (scrollInterval) {
        clearInterval(scrollInterval)
      }
    }
  }, [])

  const handleTaskClick = (task: ExtendedTask) => {
    setSelectedTask(task)
  }

  const handleTaskDoubleClick = (task: ExtendedTask) => {
    setEditingTask(task)
    setEditModalOpen(true)
  }

  const handleExpanderClick = (task: ExtendedTask) => {
    const updatedTasks = localTasks.map(t => {
      if (t.id === task.id) {
        return { ...t, hideChildren: !t.hideChildren }
      }
      return t
    })
    setLocalTasks(updatedTasks)
  }

  const handleTaskSave = (updatedTask: ExtendedTask) => {
    const newTasks = localTasks.map(t => t.id === updatedTask.id ? updatedTask : t)
    setLocalTasks(newTasks)
    onTaskChange?.(updatedTask)
  }

  const columnWidth = view === ViewMode.Year ? 350 :
                    view === ViewMode.Month ? 300 :
                    view === ViewMode.Week ? 250 : 65

  // 표시할 작업 필터링 (hideChildren 처리)
  const getVisibleTasks = () => {
    const hiddenProjectIds = new Set(
      localTasks.filter(t => t.type === 'project' && t.hideChildren).map(t => t.id)
    )
    return localTasks.filter(t => !t.project || !hiddenProjectIds.has(t.project))
  }

  const visibleTasks = getVisibleTasks()

  return (
    <div className={styles.ganttContainer}>
      {/* 툴바 */}
      <div className="flex-shrink-0 mb-4 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <h2 className="text-xl font-semibold">프로젝트 간트차트</h2>
          <span className="text-sm text-gray-500">
            ({localTasks.length}개 작업)
          </span>
        </div>

        <div className="flex items-center gap-4">
          {/* 뷰 모드 선택 */}
          <div className="flex gap-2 bg-gray-100 p-1 rounded-lg">
            <button
              className={`px-3 py-1 rounded text-sm transition-colors ${
                view === ViewMode.Day
                  ? 'bg-white text-primary shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
              onClick={() => setView(ViewMode.Day)}
            >
              일
            </button>
            <button
              className={`px-3 py-1 rounded text-sm transition-colors ${
                view === ViewMode.Week
                  ? 'bg-white text-primary shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
              onClick={() => setView(ViewMode.Week)}
            >
              주
            </button>
            <button
              className={`px-3 py-1 rounded text-sm transition-colors ${
                view === ViewMode.Month
                  ? 'bg-white text-primary shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
              onClick={() => setView(ViewMode.Month)}
            >
              월
            </button>
            <button
              className={`px-3 py-1 rounded text-sm transition-colors ${
                view === ViewMode.Year
                  ? 'bg-white text-primary shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
              onClick={() => setView(ViewMode.Year)}
            >
              년
            </button>
          </div>

          {/* 왼쪽 리스트 표시 토글 */}
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={isChecked}
              onChange={(e) => setIsChecked(e.target.checked)}
              className="w-4 h-4 text-primary rounded focus:ring-primary"
            />
            <span className="text-sm text-gray-700">작업 목록 표시</span>
          </label>
        </div>
      </div>

      {/* 안내 메시지 */}
      <div className="text-xs text-gray-500 mb-2">
        💡 작업을 더블클릭하면 수정할 수 있습니다
      </div>

      {/* 간트차트 */}
      <div ref={ganttWrapperRef} className={styles.ganttWrapper}>
        {visibleTasks.length > 0 ? (
          <Gantt
            tasks={visibleTasks}
            viewMode={view}
            onDateChange={onDateChange}
            onDelete={onTaskDelete}
            onProgressChange={onProgressChange}
            onDoubleClick={handleTaskDoubleClick}
            onClick={handleTaskClick}
            onExpanderClick={handleExpanderClick}
            listCellWidth={isChecked ? "155px" : ""}
            ganttHeight={Math.max(400, visibleTasks.length * 50 + 100)}
            columnWidth={columnWidth}
            locale="ko"
            barCornerRadius={3}
            barProgressColor="#4f7eff"
            barProgressSelectedColor="#3b5fd1"
            barBackgroundColor="#e5e7eb"
            barBackgroundSelectedColor="#d1d5db"
            projectProgressColor="#10b981"
            projectProgressSelectedColor="#059669"
            projectBackgroundColor="#d1fae5"
            projectBackgroundSelectedColor="#a7f3d0"
            milestoneBackgroundColor="#ef4444"
            milestoneBackgroundSelectedColor="#dc2626"
            rtl={false}
            handleWidth={8}
            timeStep={300}
            arrowColor="#6b7280"
            fontFamily="Pretendard, -apple-system, BlinkMacSystemFont, sans-serif"
            fontSize="14px"
            rowHeight={50}
            headerHeight={50}
            todayColor="rgba(79, 126, 255, 0.1)"
            TaskListHeader={({ headerHeight, rowWidth, fontFamily, fontSize }) => (
              <TaskListHeader
                headerHeight={headerHeight}
                rowWidth={rowWidth}
                fontFamily={fontFamily}
                fontSize={fontSize}
              />
            )}
            TaskListTable={({ tasks, rowHeight, rowWidth, fontFamily, fontSize, locale, onExpanderClick }) => (
              <TaskListTable
                tasks={tasks}
                rowHeight={rowHeight}
                rowWidth={rowWidth}
                fontFamily={fontFamily}
                fontSize={fontSize}
                locale={locale}
                onExpanderClick={onExpanderClick}
                onTaskDoubleClick={handleTaskDoubleClick}
              />
            )}
          />
        ) : (
          <div className="text-center py-12 text-gray-500">
            작업이 없습니다. 새 작업을 추가해주세요.
          </div>
        )}
      </div>

      {/* 선택된 작업 정보 */}
      {selectedTask && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex-shrink-0 mt-4 p-4 bg-gray-50 rounded-lg"
        >
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-medium text-gray-900">작업 상세 정보</h3>
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  setEditingTask(selectedTask)
                  setEditModalOpen(true)
                }}
                className="text-primary hover:text-primary/80 text-sm font-medium"
              >
                수정
              </button>
              <button
                onClick={() => setSelectedTask(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <span className="text-gray-600">작업명:</span>
              <p className="font-medium">{selectedTask.name}</p>
            </div>
            <div>
              <span className="text-gray-600">시작일:</span>
              <p className="font-medium">
                {new Date(selectedTask.start).toLocaleDateString('ko-KR')}
              </p>
            </div>
            <div>
              <span className="text-gray-600">종료일:</span>
              <p className="font-medium">
                {new Date(selectedTask.end).toLocaleDateString('ko-KR')}
              </p>
            </div>
            <div>
              <span className="text-gray-600">진행률:</span>
              <p className="font-medium">{selectedTask.progress}%</p>
            </div>
          </div>

          {selectedTask.dependencies && selectedTask.dependencies.length > 0 && (
            <div className="mt-3">
              <span className="text-sm text-gray-600">종속성:</span>
              <p className="text-sm font-medium">{selectedTask.dependencies.join(', ')}</p>
            </div>
          )}
        </motion.div>
      )}

      {/* 범례 */}
      <div className="flex-shrink-0 mt-4 flex flex-wrap gap-4 text-sm">
        <div className="flex items-center gap-2">
          <div className="w-4 h-3 bg-[#4f7eff] rounded"></div>
          <span className="text-gray-600">일반 작업</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-3 bg-[#10b981] rounded"></div>
          <span className="text-gray-600">프로젝트</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-3 bg-[#ef4444] rounded"></div>
          <span className="text-gray-600">마일스톤</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-0.5 h-3 bg-gray-400"></div>
          <span className="text-gray-600">오늘</span>
        </div>
      </div>

      {/* 작업 편집 모달 */}
      {editingTask && (
        <TaskEditModal
          task={editingTask}
          isOpen={editModalOpen}
          onClose={() => {
            setEditModalOpen(false)
            setEditingTask(null)
          }}
          onSave={handleTaskSave}
        />
      )}
    </div>
  )
}
