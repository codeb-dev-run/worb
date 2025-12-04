'use client'

import React, { useState, useEffect } from 'react'
import {
  DndContext,
  DragEndEvent,
  DragOverEvent,
  DragStartEvent,
  DragOverlay,
  closestCorners,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  UniqueIdentifier,
} from '@dnd-kit/core'
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { motion } from 'framer-motion'
import { KanbanTask, TaskPriority, TaskStatus } from '@/types/task'
import { useWorkspace } from '@/lib/workspace-context'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { Edit2, Trash2, Plus, Search, Calendar, Paperclip, MessageSquare, CheckSquare, Flame, AlertTriangle, AlertCircle, ChevronDown } from 'lucide-react'

interface KanbanColumn {
  id: string
  title: string
  color: string
  limit?: number
  tasks: KanbanTask[]
}

interface KanbanBoardProProps {
  columns: KanbanColumn[]
  onColumnsChange?: (columns: KanbanColumn[]) => void
  onTaskAdd?: (columnId: string) => void
  onTaskEdit?: (task: KanbanTask) => void
  onTaskDelete?: (taskId: string, columnId: string) => void
}

const priorityConfig: Record<TaskPriority, { variant: 'default' | 'secondary' | 'destructive' | 'outline', icon: any, label: string }> = {
  [TaskPriority.LOW]: { variant: 'secondary', icon: ChevronDown, label: '낮음' },
  [TaskPriority.MEDIUM]: { variant: 'default', icon: AlertCircle, label: '중간' },
  [TaskPriority.HIGH]: { variant: 'default', icon: AlertTriangle, label: '높음' },
  [TaskPriority.URGENT]: { variant: 'destructive', icon: Flame, label: '긴급' }
}

// Sortable Task Item Component
function SortableTaskItem({ task, onEdit, onDelete }: {
  task: KanbanTask
  onEdit?: (task: KanbanTask) => void
  onDelete?: (taskId: string) => void
}) {
  const { getDepartmentColor } = useWorkspace()
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: task.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={`cursor-move transition-all ${isDragging ? 'opacity-50' : ''
        }`}
    >
      <Card
        className="p-3 hover:shadow-md transition-shadow"
        style={{ borderLeft: `4px solid ${getDepartmentColor(task.department)}` }}
      >
        <div className="flex justify-between items-start mb-2">
          <h4 className="text-sm font-medium flex-1">{task.title}</h4>
          <div className="flex gap-1 ml-2">
            {onEdit && (
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={(e) => {
                  e.stopPropagation()
                  console.log('Edit button clicked for task:', task)
                  onEdit(task)
                }}
              >
                <Edit2 className="h-3 w-3" />
              </Button>
            )}
            {onDelete && (
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 hover:text-destructive"
                onClick={(e) => {
                  e.stopPropagation()
                  console.log('Delete button clicked for task:', task.id)
                  onDelete(task.id)
                }}
              >
                <Trash2 className="h-3 w-3" />
              </Button>
            )}
          </div>
        </div>

        {task.description && (
          <p className="text-xs text-muted-foreground mb-2 line-clamp-2">{task.description}</p>
        )}

        <div className="flex items-center justify-between gap-2">
          <Badge variant={priorityConfig[task.priority].variant} className="text-xs">
            {React.createElement(priorityConfig[task.priority].icon, { className: "h-3 w-3 mr-1" })}
            {priorityConfig[task.priority].label}
          </Badge>

          {task.assignee && (
            <div className="flex items-center">
              <div
                className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium text-white"
                style={{ backgroundColor: getDepartmentColor(task.department) }}
              >
                {typeof task.assignee === 'string'
                  ? task.assignee.charAt(0).toUpperCase()
                  : (task.assignee as any)?.name?.charAt(0).toUpperCase() || '?'}
              </div>
            </div>
          )}
        </div>

        {task.dueDate && (
          <div className="mt-2 flex items-center text-xs text-muted-foreground">
            <Calendar className="h-3 w-3 mr-1" />
            {new Date(task.dueDate).toLocaleDateString('ko-KR')}
          </div>
        )}

        {(task.checklist || task.attachments || task.comments) && (
          <div className="flex gap-3 mt-2 text-xs text-muted-foreground">
            {task.checklist && task.checklist.length > 0 && (
              <span className="flex items-center">
                <CheckSquare className="h-3 w-3 mr-1" />
                {task.checklist.filter(item => item.completed).length}/{task.checklist.length}
              </span>
            )}
            {((task.attachmentCount && task.attachmentCount > 0) || (task.attachments && task.attachments.length > 0)) && (
              <span className="flex items-center">
                <Paperclip className="h-3 w-3 mr-1" />
                {task.attachmentCount || task.attachments.length}
              </span>
            )}
            {((task.commentCount && task.commentCount > 0) || (task.comments && task.comments.length > 0)) && (
              <span className="flex items-center">
                <MessageSquare className="h-3 w-3 mr-1" />
                {task.commentCount || task.comments?.length || 0}
              </span>
            )}
          </div>
        )}
      </Card>
    </div>
  )
}

// Droppable Column Component
function DroppableColumn({
  column,
  children,
  onAddTask,
  showAddTask,
  setShowAddTask,
  newTaskTitle,
  setNewTaskTitle,
  onCreateTask
}: {
  column: KanbanColumn
  children: React.ReactNode
  onAddTask?: (columnId: string) => void
  showAddTask: boolean
  setShowAddTask: (show: boolean) => void
  newTaskTitle: string
  setNewTaskTitle: (title: string) => void
  onCreateTask: () => void
}) {
  const {
    setNodeRef,
    isOver,
  } = useSortable({
    id: column.id,
    data: {
      type: 'column',
      column,
    },
  })

  return (
    <div
      ref={setNodeRef}
      className={`flex-shrink-0 w-80 ${isOver ? 'ring-2 ring-primary ring-opacity-50' : ''
        }`}
    >
      <Card className="bg-muted/30 p-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className={`w-3 h-3 rounded-full ${column.color}`}></div>
            <h3 className="font-semibold">{column.title}</h3>
            <Badge variant="secondary" className="text-xs">
              {column.tasks.length}
            </Badge>
          </div>

          {onAddTask && (
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => {
                setShowAddTask(true)
                setNewTaskTitle('')
              }}
            >
              <Plus className="h-4 w-4" />
            </Button>
          )}
        </div>

        {showAddTask && (
          <div className="mb-4">
            <Input
              type="text"
              value={newTaskTitle}
              onChange={(e) => setNewTaskTitle(e.target.value)}
              onKeyPress={(e) => {
                if (e.key === 'Enter' && newTaskTitle.trim()) {
                  onCreateTask()
                }
              }}
              placeholder="새 작업 입력..."
              className="mb-2"
              autoFocus
            />
            <div className="flex gap-2">
              <Button
                onClick={onCreateTask}
                disabled={!newTaskTitle.trim()}
                size="sm"
              >
                추가
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setShowAddTask(false)
                  setNewTaskTitle('')
                }}
              >
                취소
              </Button>
            </div>
          </div>
        )}

        <div className="space-y-3 min-h-[100px]">
          {children}
        </div>
      </Card>
    </div>
  )
}

export default function KanbanBoardPro({
  columns: initialColumns,
  onColumnsChange,
  onTaskEdit,
  onTaskDelete
}: KanbanBoardProProps) {
  const [columns, setColumns] = useState(initialColumns)
  const [activeId, setActiveId] = useState<UniqueIdentifier | null>(null)
  const [showAddTask, setShowAddTask] = useState<string | null>(null)
  const [newTaskTitle, setNewTaskTitle] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [filterPriority, setFilterPriority] = useState<string>('all')

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  useEffect(() => {
    setColumns(initialColumns)
  }, [initialColumns])

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id)
  }

  const handleDragOver = (event: DragOverEvent) => {
    const { active, over } = event

    if (!over) return

    const activeColumnId = findColumnByTaskId(active.id as string)
    const overColumnId = over.data.current?.column?.id || findColumnByTaskId(over.id as string)

    if (!activeColumnId || !overColumnId || activeColumnId === overColumnId) {
      return
    }

    setColumns((columns) => {
      const activeColumn = columns.find(col => col.id === activeColumnId)
      const overColumn = columns.find(col => col.id === overColumnId)

      if (!activeColumn || !overColumn) return columns

      const activeTask = activeColumn.tasks.find(task => task.id === active.id)
      if (!activeTask) return columns

      const newColumns = columns.map(col => {
        if (col.id === activeColumnId) {
          return {
            ...col,
            tasks: col.tasks.filter(task => task.id !== active.id)
          }
        }
        if (col.id === overColumnId) {
          const overTaskIndex = col.tasks.findIndex(t => t.id === over.id)

          let newTasks = [...col.tasks]

          // Calculate insertion index based on cursor position relative to the over item
          const isBelowOverItem = over &&
            active.rect.current.translated &&
            active.rect.current.translated.top > over.rect.top + over.rect.height;

          const modifier = isBelowOverItem ? 1 : 0;

          // If over a task, insert at that index + modifier
          // If over the column (overTaskIndex === -1), insert at the end
          const newIndex = overTaskIndex >= 0 ? overTaskIndex + modifier : newTasks.length + 1

          newTasks.splice(newIndex, 0, { ...activeTask, status: col.id as TaskStatus, columnId: col.id })

          return {
            ...col,
            tasks: newTasks
          }
        }
        return col
      })

      return newColumns
    })
  }

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event

    if (!over) {
      setActiveId(null)
      return
    }

    // Find columns based on the *current* state when the function runs
    // Note: handleDragOver might have already updated the local state visually
    const activeIdStr = active.id as string
    const overIdStr = over.id as string

    setColumns((currentColumns) => {
      const activeColumnId = currentColumns.find(col => col.tasks.some(t => t.id === activeIdStr))?.id
      const overColumnId = currentColumns.find(col => col.tasks.some(t => t.id === overIdStr))?.id ||
        currentColumns.find(col => col.id === overIdStr)?.id

      if (!activeColumnId || !overColumnId) {
        return currentColumns
      }

      let newColumns = [...currentColumns]

      if (activeColumnId === overColumnId) {
        // Same column reordering
        const columnIndex = newColumns.findIndex(col => col.id === activeColumnId)
        const column = newColumns[columnIndex]
        const oldIndex = column.tasks.findIndex(task => task.id === activeIdStr)
        const newIndex = column.tasks.findIndex(task => task.id === overIdStr)

        // Check if task properties match the column (defensive programming)
        const task = column.tasks[oldIndex]
        const needsPropertyUpdate = task.columnId !== activeColumnId || task.status !== activeColumnId

        if (needsPropertyUpdate || oldIndex !== newIndex) {
          const updatedTask = needsPropertyUpdate
            ? { ...task, columnId: activeColumnId, status: activeColumnId as TaskStatus }
            : task

          const newTasks = [...column.tasks]
          if (needsPropertyUpdate) {
            newTasks[oldIndex] = updatedTask
          }

          newColumns[columnIndex] = {
            ...column,
            tasks: arrayMove(newTasks, oldIndex, newIndex)
          }
        }
      } else {
        // Cross-column move (if handleDragOver didn't catch it or for robustness)
        const activeColumnIndex = newColumns.findIndex(col => col.id === activeColumnId)
        const overColumnIndex = newColumns.findIndex(col => col.id === overColumnId)

        const activeColumn = newColumns[activeColumnIndex]
        const overColumn = newColumns[overColumnIndex]

        const activeTask = activeColumn.tasks.find(t => t.id === activeIdStr)

        if (activeTask) {
          // Remove from old
          newColumns[activeColumnIndex] = {
            ...activeColumn,
            tasks: activeColumn.tasks.filter(t => t.id !== activeIdStr)
          }

          // Add to new
          // Calculate insert index
          const overTaskIndex = overColumn.tasks.findIndex(t => t.id === overIdStr)
          const newIndex = overTaskIndex >= 0 ? overTaskIndex : overColumn.tasks.length

          const newTasks = [...overColumn.tasks]
          newTasks.splice(newIndex, 0, { ...activeTask, status: overColumnId as TaskStatus, columnId: overColumnId })

          newColumns[overColumnIndex] = {
            ...overColumn,
            tasks: newTasks
          }
        }
      }

      // Final safety check: Ensure all tasks have the correct columnId and status matching their column
      // This fixes the issue where visual state updates but data properties lag behind
      const finalColumns = newColumns.map(col => ({
        ...col,
        tasks: col.tasks.map(task => ({
          ...task,
          columnId: col.id,
          status: col.id as TaskStatus
        }))
      }))

      // Trigger parent update with the final state
      if (onColumnsChange) {
        // Use setTimeout to ensure this runs after the state update is processed
        setTimeout(() => {
          console.log('Triggering onColumnsChange from handleDragEnd', finalColumns)
          onColumnsChange(finalColumns)
        }, 0)
      }

      return finalColumns
    })

    setActiveId(null)
  }

  const findColumnByTaskId = (taskId: string): string | null => {
    for (const column of columns) {
      if (column.tasks.find(task => task.id === taskId)) {
        return column.id
      }
    }
    return null
  }

  const handleAddTask = (columnId: string, title: string) => {
    const newTask: KanbanTask = {
      id: `task-${Date.now()}`,
      columnId,
      order: 0,
      projectId: 'default',
      title,
      description: '',
      status: columnId as TaskStatus,
      priority: TaskPriority.MEDIUM,
      assignee: '',
      labels: [],
      dueDate: undefined,
      checklist: [],
      attachments: [],
      attachmentCount: 0,
      commentCount: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: 'user'
    }

    setColumns(columns => {
      const newColumns = columns.map(col => {
        if (col.id === columnId) {
          return {
            ...col,
            tasks: [...col.tasks, newTask]
          }
        }
        return col
      })

      if (onColumnsChange) {
        onColumnsChange(newColumns)
      }

      return newColumns
    })
  }

  const handleDeleteTask = (taskId: string, columnId: string) => {
    setColumns(columns => {
      const newColumns = columns.map(col => {
        if (col.id === columnId) {
          return {
            ...col,
            tasks: col.tasks.filter(task => task.id !== taskId)
          }
        }
        return col
      })

      if (onColumnsChange) {
        onColumnsChange(newColumns)
      }

      return newColumns
    })

    if (onTaskDelete) {
      onTaskDelete(taskId, columnId)
    }
  }

  // Filter tasks based on search and priority
  const getFilteredTasks = (tasks: KanbanTask[]) => {
    return tasks.filter(task => {
      const matchesSearch = searchQuery === '' ||
        task.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        task.description?.toLowerCase().includes(searchQuery.toLowerCase())

      const matchesPriority = filterPriority === 'all' || task.priority === filterPriority

      return matchesSearch && matchesPriority
    })
  }

  const activeTask = activeId
    ? columns.flatMap(col => col.tasks).find(task => task.id === activeId)
    : null

  return (
    <div className="h-full flex flex-col">
      {/* 검색 및 필터 - 한 줄로 정리 */}
      <div className="mb-4 flex items-center gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
          <Input
            type="text"
            placeholder="작업 검색..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        <div className="flex gap-1">
          {[
            { value: 'all', label: '전체', icon: null, activeStyle: 'bg-slate-100 text-slate-700 ring-2 ring-slate-400' },
            { value: TaskPriority.LOW, label: '낮음', icon: ChevronDown, activeStyle: 'bg-green-100 text-green-700 ring-2 ring-green-400' },
            { value: TaskPriority.MEDIUM, label: '중간', icon: AlertCircle, activeStyle: 'bg-amber-100 text-amber-700 ring-2 ring-amber-400' },
            { value: TaskPriority.HIGH, label: '높음', icon: AlertTriangle, activeStyle: 'bg-orange-100 text-orange-700 ring-2 ring-orange-400' },
            { value: TaskPriority.URGENT, label: '긴급', icon: Flame, activeStyle: 'bg-red-100 text-red-700 ring-2 ring-red-400' }
          ].map(priority => {
            const Icon = priority.icon
            return (
              <button
                key={priority.value}
                type="button"
                onClick={() => setFilterPriority(priority.value)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm font-medium transition-all ${
                  filterPriority === priority.value
                    ? priority.activeStyle
                    : 'bg-white/60 text-slate-600 hover:bg-slate-100'
                }`}
              >
                {Icon && <Icon className="h-3.5 w-3.5" />}
                {priority.label}
              </button>
            )
          })}
        </div>
      </div>

      {/* 칸반 보드 */}
      <div className="flex-1 overflow-x-auto">
        <DndContext
          sensors={sensors}
          collisionDetection={closestCorners}
          onDragStart={handleDragStart}
          onDragOver={handleDragOver}
          onDragEnd={handleDragEnd}
        >
          <div className="flex gap-4 h-full pb-4">
            {columns.map(column => {
              const filteredTasks = getFilteredTasks(column.tasks)
              const columnWithFilteredTasks = { ...column, tasks: filteredTasks }

              return (
                <SortableContext
                  key={column.id}
                  items={filteredTasks.map(t => t.id)}
                  strategy={verticalListSortingStrategy}
                >
                  <DroppableColumn
                    column={columnWithFilteredTasks}
                    onAddTask={() => setShowAddTask(column.id)}
                    showAddTask={showAddTask === column.id}
                    setShowAddTask={(show) => setShowAddTask(show ? column.id : null)}
                    newTaskTitle={newTaskTitle}
                    setNewTaskTitle={setNewTaskTitle}
                    onCreateTask={() => {
                      if (newTaskTitle.trim()) {
                        handleAddTask(column.id, newTaskTitle.trim())
                        setNewTaskTitle('')
                        setShowAddTask(null)
                      }
                    }}
                  >
                    {filteredTasks.map(task => (
                      <SortableTaskItem
                        key={task.id}
                        task={task}
                        onEdit={onTaskEdit}
                        onDelete={(taskId) => handleDeleteTask(taskId, column.id)}
                      />
                    ))}
                  </DroppableColumn>
                </SortableContext>
              )
            })}
          </div>

          <DragOverlay>
            {activeTask && (
              <Card className="p-3 shadow-lg opacity-90">
                <h4 className="text-sm font-medium">{activeTask.title}</h4>
                {activeTask.description && (
                  <p className="text-xs text-muted-foreground mt-1">{activeTask.description}</p>
                )}
              </Card>
            )}
          </DragOverlay>
        </DndContext>
      </div>
    </div>
  )
}