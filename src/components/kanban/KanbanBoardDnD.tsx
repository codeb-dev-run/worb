'use client'

import React, { useState, useEffect } from 'react'
import { DragDropContext, Droppable, Draggable, DropResult, DroppableProvided, DraggableProvided, DraggableStateSnapshot, DroppableStateSnapshot } from '@hello-pangea/dnd'
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

interface KanbanBoardDnDProps {
    columns: KanbanColumn[]
    onColumnsChange?: (columns: KanbanColumn[]) => void
    onTaskAdd?: (columnId: string) => void
    onTaskEdit?: (task: KanbanTask) => void
    onTaskDelete?: (taskId: string, columnId: string) => void
    onTaskCreate?: (columnId: string, title: string) => Promise<KanbanTask | null>
}

const priorityConfig: Record<TaskPriority, { variant: 'default' | 'secondary' | 'destructive' | 'outline', icon: any, label: string, color: string }> = {
    [TaskPriority.LOW]: {
        variant: 'outline',
        icon: ChevronDown,
        label: '낮음',
        color: '#10B981' // Green
    },
    [TaskPriority.MEDIUM]: {
        variant: 'default',
        icon: AlertCircle,
        label: '중간',
        color: '#F59E0B' // Orange
    },
    [TaskPriority.HIGH]: {
        variant: 'destructive',
        icon: AlertTriangle,
        label: '높음',
        color: '#EF4444' // Red
    },
    [TaskPriority.URGENT]: {
        variant: 'destructive',
        icon: Flame,
        label: '긴급',
        color: '#DC2626' // Dark Red
    }
}

// Task Item Component
function TaskItem({ task, index, onEdit, onDelete }: {
    task: KanbanTask
    index: number
    onEdit?: (task: KanbanTask) => void
    onDelete?: (taskId: string) => void
}) {
    const { getDepartmentColor } = useWorkspace()
    // Task에 포함된 색상 정보 우선 사용, 없으면 context에서 조회 (초기 로딩 시 색상 즉시 적용)
    const displayColor = (task as any).departmentColor || getDepartmentColor(task.department)

    return (
        <Draggable draggableId={task.id} index={index}>
            {(provided: DraggableProvided, snapshot: DraggableStateSnapshot) => (
                <div
                    ref={provided.innerRef}
                    {...provided.draggableProps}
                    {...provided.dragHandleProps}
                    className={`mb-3 ${snapshot.isDragging ? 'opacity-50' : ''}`}
                    style={{
                        ...provided.draggableProps.style,
                    }}
                    onDoubleClick={() => onEdit?.(task)}
                >
                    <Card
                        className="p-3 hover:shadow-md transition-shadow cursor-pointer"
                        style={{ borderLeft: `4px solid ${displayColor}` }}
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
                            {(() => {
                                const config = priorityConfig[task.priority] || priorityConfig[TaskPriority.MEDIUM]
                                return (
                                    <div
                                        className="px-2 py-1 rounded-md text-xs font-medium text-white flex items-center gap-1"
                                        style={{ backgroundColor: config.color }}
                                    >
                                        {React.createElement(config.icon, { className: "h-3 w-3" })}
                                        {config.label}
                                    </div>
                                )
                            })()}

                            {/* Member Avatar with Department Color */}
                            {task.assigneeId ? (
                                <div
                                    className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-semibold"
                                    style={{ backgroundColor: displayColor }}
                                    title={typeof task.assignee === 'object' && (task.assignee as any)?.name ? (task.assignee as any).name : task.assigneeId}
                                >
                                    {typeof task.assignee === 'string'
                                        ? task.assignee.charAt(0).toUpperCase()
                                        : (task.assignee as any)?.name?.charAt(0).toUpperCase() || task.assigneeId?.[0]?.toUpperCase() || '?'}
                                </div>
                            ) : task.assignee && (
                                <div className="flex items-center">
                                    <div
                                        className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-semibold"
                                        style={{ backgroundColor: displayColor }}
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
            )}
        </Draggable>
    )
}


// Column Component
function Column({
    column,
    tasks,
    onAddTask,
    showAddTask,
    setShowAddTask,
    newTaskTitle,
    setNewTaskTitle,
    onCreateTask,
    isCreating = false,
    onTaskEdit,
    onTaskDelete
}: {
    column: KanbanColumn
    tasks: KanbanTask[]
    onAddTask?: (columnId: string) => void
    showAddTask: boolean
    setShowAddTask: (show: boolean) => void
    newTaskTitle: string
    setNewTaskTitle: (title: string) => void
    onCreateTask: () => void
    isCreating?: boolean
    onTaskEdit?: (task: KanbanTask) => void
    onTaskDelete?: (taskId: string) => void
}) {
    return (
        <div className="flex-shrink-0 w-80">
            <Card className="bg-muted/30 p-4 h-full flex flex-col max-h-full">
                <div className="flex items-center justify-between mb-4 flex-shrink-0">
                    <div className="flex items-center gap-2">
                        <div className={`w-3 h-3 rounded-full ${column.color}`}></div>
                        <h3 className="font-semibold">{column.title}</h3>
                        <Badge variant="secondary" className="text-xs">
                            {tasks.length}
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
                    <div className="mb-4 flex-shrink-0">
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
                                disabled={!newTaskTitle.trim() || isCreating}
                                size="sm"
                            >
                                {isCreating ? '추가 중...' : '추가'}
                            </Button>
                            <Button
                                variant="ghost"
                                size="sm"
                                disabled={isCreating}
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

                <Droppable droppableId={column.id}>
                    {(provided: DroppableProvided, snapshot: DroppableStateSnapshot) => (
                        <div
                            {...provided.droppableProps}
                            ref={provided.innerRef}
                            className={`flex-1 overflow-y-auto min-h-[100px] transition-colors ${snapshot.isDraggingOver ? 'bg-primary/5 rounded-lg' : ''}`}
                        >
                            {tasks.map((task, index) => (
                                <TaskItem
                                    key={task.id}
                                    task={task}
                                    index={index}
                                    onEdit={onTaskEdit}
                                    onDelete={onTaskDelete}
                                />
                            ))}
                            {provided.placeholder}
                        </div>
                    )}
                </Droppable>
            </Card>
        </div>
    )
}

export default function KanbanBoardDnD({
    columns: initialColumns,
    onColumnsChange,
    onTaskAdd,
    onTaskEdit,
    onTaskDelete,
    onTaskCreate
}: KanbanBoardDnDProps) {
    const [columns, setColumns] = useState(initialColumns)
    const [showAddTask, setShowAddTask] = useState<string | null>(null)
    const [newTaskTitle, setNewTaskTitle] = useState('')
    const [searchQuery, setSearchQuery] = useState('')
    const [filterPriority, setFilterPriority] = useState<string>('all')
    const [isBrowser, setIsBrowser] = useState(false)
    const [isCreatingTask, setIsCreatingTask] = useState(false)

    useEffect(() => {
        setIsBrowser(true)
    }, [])

    useEffect(() => {
        setColumns(initialColumns)
    }, [initialColumns])

    const onDragEnd = (result: DropResult) => {
        const { source, destination } = result

        // Dropped outside the list
        if (!destination) {
            return
        }

        // Dropped in the same position
        if (
            source.droppableId === destination.droppableId &&
            source.index === destination.index
        ) {
            return
        }

        const sourceColumn = columns.find(col => col.id === source.droppableId)
        const destColumn = columns.find(col => col.id === destination.droppableId)

        if (!sourceColumn || !destColumn) return

        // Moving within the same column
        if (source.droppableId === destination.droppableId) {
            const newTasks = Array.from(sourceColumn.tasks)
            const [removed] = newTasks.splice(source.index, 1)
            newTasks.splice(destination.index, 0, removed)

            const newColumns = columns.map(col => {
                if (col.id === sourceColumn.id) {
                    return { ...col, tasks: newTasks }
                }
                return col
            })

            setColumns(newColumns)
            if (onColumnsChange) onColumnsChange(newColumns)
        } else {
            // Moving to a different column
            const sourceTasks = Array.from(sourceColumn.tasks)
            const destTasks = Array.from(destColumn.tasks)
            const [removed] = sourceTasks.splice(source.index, 1)

            // Update task status and columnId
            const updatedTask = {
                ...removed,
                status: destColumn.id as TaskStatus,
                columnId: destColumn.id
            }

            destTasks.splice(destination.index, 0, updatedTask)

            const newColumns = columns.map(col => {
                if (col.id === sourceColumn.id) {
                    return { ...col, tasks: sourceTasks }
                }
                if (col.id === destColumn.id) {
                    return { ...col, tasks: destTasks }
                }
                return col
            })

            setColumns(newColumns)
            if (onColumnsChange) onColumnsChange(newColumns)
        }
    }

    const handleAddTask = async (columnId: string, title: string) => {
        // onTaskCreate 콜백이 있으면 서버에 생성 요청
        if (onTaskCreate) {
            const createdTask = await onTaskCreate(columnId, title)
            if (createdTask) {
                // 서버에서 생성된 실제 작업으로 로컬 상태 업데이트
                const newColumns = columns.map(col => {
                    if (col.id === columnId) {
                        return {
                            ...col,
                            tasks: [...col.tasks, createdTask]
                        }
                    }
                    return col
                })

                setColumns(newColumns)
                if (onColumnsChange) onColumnsChange(newColumns)
            }
            return
        }

        // onTaskCreate가 없으면 임시 ID로 로컬에만 추가 (기존 방식)
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

        const newColumns = columns.map(col => {
            if (col.id === columnId) {
                return {
                    ...col,
                    tasks: [...col.tasks, newTask]
                }
            }
            return col
        })

        setColumns(newColumns)
        if (onColumnsChange) onColumnsChange(newColumns)
    }

    // Filter tasks
    const getFilteredTasks = (tasks: KanbanTask[]) => {
        return tasks.filter(task => {
            const matchesSearch = searchQuery === '' ||
                task.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                task.description?.toLowerCase().includes(searchQuery.toLowerCase())

            const matchesPriority = filterPriority === 'all' || task.priority === filterPriority

            return matchesSearch && matchesPriority
        })
    }

    if (!isBrowser) {
        return null // Prevent SSR hydration mismatch
    }

    return (
        <div className="h-full flex flex-col">
            {/* Search and Filter */}
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

            {/* Kanban Board */}
            <div className="flex-1 overflow-x-auto">
                <DragDropContext onDragEnd={onDragEnd}>
                    <div className="flex gap-4 h-full pb-4 min-w-max">
                        {columns.map(column => {
                            const filteredTasks = getFilteredTasks(column.tasks)

                            return (
                                <Column
                                    key={column.id}
                                    column={column}
                                    tasks={filteredTasks}
                                    onAddTask={onTaskAdd ? () => onTaskAdd(column.id) : () => setShowAddTask(column.id)}
                                    showAddTask={showAddTask === column.id}
                                    setShowAddTask={(show) => setShowAddTask(show ? column.id : null)}
                                    newTaskTitle={newTaskTitle}
                                    setNewTaskTitle={setNewTaskTitle}
                                    onCreateTask={async () => {
                                        if (newTaskTitle.trim() && !isCreatingTask) {
                                            setIsCreatingTask(true)
                                            try {
                                                await handleAddTask(column.id, newTaskTitle.trim())
                                                setNewTaskTitle('')
                                                setShowAddTask(null)
                                            } finally {
                                                setIsCreatingTask(false)
                                            }
                                        }
                                    }}
                                    isCreating={isCreatingTask}
                                    onTaskEdit={onTaskEdit}
                                    onTaskDelete={(taskId) => onTaskDelete?.(taskId, column.id)}
                                />
                            )
                        })}
                    </div>
                </DragDropContext>
            </div>
        </div>
    )
}
