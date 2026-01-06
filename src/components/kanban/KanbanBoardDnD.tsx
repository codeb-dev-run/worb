'use client'

import React, { useState, useEffect, useMemo } from 'react'
import {
    DndContext,
    DragOverlay,
    closestCorners,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
    DragStartEvent,
    DragEndEvent,
    UniqueIdentifier,
    useDroppable,
} from '@dnd-kit/core'
import {
    arrayMove,
    SortableContext,
    sortableKeyboardCoordinates,
    verticalListSortingStrategy,
    useSortable,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
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
    // External filter control (optional)
    searchQuery?: string
    filterPriority?: string
    hideFilters?: boolean
    // 권한 제어 (본인 할일만 수정/삭제)
    currentUserId?: string
    isAdmin?: boolean
}

const priorityConfig: Record<TaskPriority, { variant: 'default' | 'secondary' | 'destructive' | 'outline', icon: any, label: string, color: string }> = {
    [TaskPriority.LOW]: {
        variant: 'outline',
        icon: ChevronDown,
        label: '낮음',
        color: '#10B981'
    },
    [TaskPriority.MEDIUM]: {
        variant: 'default',
        icon: AlertCircle,
        label: '중간',
        color: '#F59E0B'
    },
    [TaskPriority.HIGH]: {
        variant: 'destructive',
        icon: AlertTriangle,
        label: '높음',
        color: '#EF4444'
    },
    [TaskPriority.URGENT]: {
        variant: 'destructive',
        icon: Flame,
        label: '긴급',
        color: '#DC2626'
    }
}

// Task Card Content Component
function TaskCardContent({ task, displayColor, onEdit, onDelete, isDragging = false, canEdit = true, canDelete = true }: {
    task: KanbanTask
    displayColor: string
    onEdit?: (task: KanbanTask) => void
    onDelete?: (taskId: string) => void
    isDragging?: boolean
    canEdit?: boolean
    canDelete?: boolean
}) {
    // 진행률 계산: 체크리스트 기반 또는 task.progress 사용
    const progress = useMemo(() => {
        if (task.progress !== undefined && task.progress !== null) {
            return task.progress
        }
        if (task.checklist && task.checklist.length > 0) {
            const completed = task.checklist.filter(item => item.completed).length
            return Math.round((completed / task.checklist.length) * 100)
        }
        return 0
    }, [task.progress, task.checklist])

    // 진행률에 따른 색상
    const progressColor = progress >= 100 ? '#10b981' : progress >= 50 ? '#eab308' : '#f97316'

    // 카드 배경색: task.color가 있으면 10% 투명도로 적용, 없으면 흰색
    const cardBgColor = task.color ? `${task.color}1A` : 'white' // 1A = 10% opacity (hex)

    return (
        <Card
            className={`p-3 transition-shadow cursor-grab rounded-md ${isDragging ? 'shadow-2xl ring-2 ring-lime-400/50 rotate-2' : 'hover:shadow-md'}`}
            style={{
                borderLeft: `4px solid ${displayColor}`,
                backgroundColor: cardBgColor
            }}
        >
            <div className="flex justify-between items-start mb-2">
                <h4 className="text-sm font-medium flex-1">{task.title}</h4>
                <div className="flex gap-1 ml-2">
                    {onEdit && canEdit && (
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
                    {onDelete && canDelete && (
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

            {/* 진행률 바 */}
            <div className="mb-2">
                <div className="flex items-center justify-between mb-1">
                    <span className="text-[10px] text-muted-foreground">진행률</span>
                    <span className="text-[10px] font-medium" style={{ color: progressColor }}>{progress}%</span>
                </div>
                <div className="h-1.5 bg-gray-100 rounded-sm overflow-hidden">
                    <div
                        className="h-full transition-all duration-300 rounded-sm"
                        style={{
                            width: `${progress}%`,
                            backgroundColor: progressColor
                        }}
                    />
                </div>
            </div>

            <div className="flex items-center justify-between gap-2">
                {(() => {
                    const config = priorityConfig[task.priority] || priorityConfig[TaskPriority.MEDIUM]
                    return (
                        <div
                            className="px-2 py-1 rounded text-xs font-medium text-white flex items-center gap-1"
                            style={{ backgroundColor: config.color }}
                        >
                            {React.createElement(config.icon, { className: "h-3 w-3" })}
                            {config.label}
                        </div>
                    )
                })()}

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
    )
}

// Sortable Task Item using dnd-kit
function SortableTaskItem({ task, onEdit, onDelete, canEdit = true, canDelete = true }: {
    task: KanbanTask
    onEdit?: (task: KanbanTask) => void
    onDelete?: (taskId: string) => void
    canEdit?: boolean
    canDelete?: boolean
}) {
    const { getDepartmentColor } = useWorkspace()
    const displayColor = (task as any).departmentColor || getDepartmentColor(task.department)

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
            className="mb-3"
            onDoubleClick={() => canEdit && onEdit?.(task)}
        >
            <TaskCardContent
                task={task}
                displayColor={displayColor}
                onEdit={onEdit}
                onDelete={onDelete}
                canEdit={canEdit}
                canDelete={canDelete}
            />
        </div>
    )
}

// Droppable Column Component
function DroppableColumn({
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
    onTaskDelete,
    currentUserId,
    isAdmin = false,
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
    currentUserId?: string
    isAdmin?: boolean
}) {
    const taskIds = useMemo(() => tasks.map(task => task.id), [tasks])

    // useDroppable로 컬럼 자체를 드롭 대상으로 등록 (빈 컬럼에도 드롭 가능)
    // 빈 컬럼용 별도 드롭 영역 ID 사용
    const { setNodeRef: setColumnRef, isOver: isOverColumn } = useDroppable({
        id: `column-${column.id}`,
        data: {
            type: 'column',
            columnId: column.id
        }
    })

    return (
        <div className="flex-shrink-0 w-80">
            <Card className={`bg-muted/30 p-4 h-full flex flex-col max-h-full transition-colors rounded-lg ${isOverColumn ? 'bg-lime-50/50 ring-2 ring-lime-400/30' : ''}`}>
                <div className="flex items-center justify-between mb-4 flex-shrink-0">
                    <div className="flex items-center gap-2">
                        <div className={`w-3 h-3 rounded ${column.color}`}></div>
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

                {/* ref를 드롭 영역에 연결 - 빈 컬럼도 드롭 가능 */}
                <div ref={setColumnRef} className="flex-1 overflow-y-auto min-h-[200px]">
                    <SortableContext items={taskIds} strategy={verticalListSortingStrategy}>
                        {tasks.map((task) => {
                            // 권한 체크: 관리자이거나 본인이 작성한 할일만 수정/삭제 가능
                            const canModify = isAdmin || !currentUserId || task.createdBy === currentUserId
                            return (
                                <SortableTaskItem
                                    key={task.id}
                                    task={task}
                                    onEdit={onTaskEdit}
                                    onDelete={onTaskDelete}
                                    canEdit={canModify}
                                    canDelete={canModify}
                                />
                            )
                        })}
                    </SortableContext>
                    {/* 빈 컬럼일 때 전체 영역이 드롭 대상이 되도록 높이 확보 */}
                    {tasks.length === 0 && (
                        <div className={`h-full min-h-[180px] border-2 border-dashed rounded-md flex items-center justify-center text-sm text-muted-foreground transition-colors ${isOverColumn ? 'border-lime-400 bg-lime-50/50' : 'border-gray-200'}`}>
                            여기에 드롭하세요
                        </div>
                    )}
                </div>
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
    onTaskCreate,
    searchQuery: externalSearchQuery,
    filterPriority: externalFilterPriority,
    hideFilters = false,
    currentUserId,
    isAdmin = false
}: KanbanBoardDnDProps) {
    const { getDepartmentColor } = useWorkspace()
    const [columns, setColumns] = useState(initialColumns)
    const [showAddTask, setShowAddTask] = useState<string | null>(null)
    const [newTaskTitle, setNewTaskTitle] = useState('')
    const [internalSearchQuery, setInternalSearchQuery] = useState('')
    const [internalFilterPriority, setInternalFilterPriority] = useState<string>('all')
    const [isBrowser, setIsBrowser] = useState(false)
    const [isCreatingTask, setIsCreatingTask] = useState(false)
    const [activeId, setActiveId] = useState<UniqueIdentifier | null>(null)

    // Use external values if provided, otherwise use internal state
    const searchQuery = externalSearchQuery !== undefined ? externalSearchQuery : internalSearchQuery
    const filterPriority = externalFilterPriority !== undefined ? externalFilterPriority : internalFilterPriority

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
        setIsBrowser(true)
    }, [])

    useEffect(() => {
        setColumns(initialColumns)
    }, [initialColumns])

    // Find task by ID across all columns
    const findTask = (id: UniqueIdentifier): KanbanTask | undefined => {
        for (const column of columns) {
            const task = column.tasks.find(t => t.id === id)
            if (task) return task
        }
        return undefined
    }

    // Find column containing a task
    const findColumnByTaskId = (taskId: UniqueIdentifier): KanbanColumn | undefined => {
        return columns.find(col => col.tasks.some(t => t.id === taskId))
    }

    // Find column by ID
    const findColumnById = (columnId: string): KanbanColumn | undefined => {
        return columns.find(col => col.id === columnId)
    }

    const handleDragStart = (event: DragStartEvent) => {
        setActiveId(event.active.id)
    }

    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event

        setActiveId(null)

        if (!over) return

        const activeColumn = findColumnByTaskId(active.id)
        if (!activeColumn) return

        const activeTask = activeColumn.tasks.find(t => t.id === active.id)
        if (!activeTask) return

        // 1. over.id 분석
        const overId = over.id as string

        // column-{id} 형태인지 확인 (빈 컬럼 드롭)
        const isColumnDrop = overId.startsWith('column-')
        const targetColumnId = isColumnDrop ? overId.replace('column-', '') : null

        // 태스크 위에 드롭인지 확인
        const isOverTask = findColumnByTaskId(over.id)

        // 컬럼 드롭 대상 찾기
        const targetColumn = targetColumnId ? findColumnById(targetColumnId) : null

        // Case 1: 빈 컬럼에 직접 드롭 (column-{id} 형태)
        if (isColumnDrop && targetColumn) {
            // 같은 컬럼이면 아무것도 안함
            if (activeColumn.id === targetColumn.id) return

            const newColumns = columns.map(col => {
                if (col.id === activeColumn.id) {
                    return {
                        ...col,
                        tasks: col.tasks.filter(t => t.id !== active.id)
                    }
                }
                if (col.id === targetColumn.id) {
                    const updatedTask = {
                        ...activeTask,
                        status: col.id as TaskStatus,
                        columnId: col.id
                    }
                    return { ...col, tasks: [...col.tasks, updatedTask] }
                }
                return col
            })
            setColumns(newColumns)
            if (onColumnsChange) onColumnsChange(newColumns)
            return
        }

        // Case 2: 태스크 위에 드롭
        if (isOverTask) {
            if (activeColumn.id === isOverTask.id) {
                // 같은 컬럼 내 재정렬
                const oldIndex = activeColumn.tasks.findIndex(t => t.id === active.id)
                const newIndex = activeColumn.tasks.findIndex(t => t.id === over.id)

                if (oldIndex !== newIndex && newIndex >= 0) {
                    const newColumns = columns.map(col => {
                        if (col.id === activeColumn.id) {
                            return {
                                ...col,
                                tasks: arrayMove(col.tasks, oldIndex, newIndex)
                            }
                        }
                        return col
                    })
                    setColumns(newColumns)
                    if (onColumnsChange) onColumnsChange(newColumns)
                }
            } else {
                // 다른 컬럼으로 이동 (태스크 위에 드롭)
                const newColumns = columns.map(col => {
                    if (col.id === activeColumn.id) {
                        return {
                            ...col,
                            tasks: col.tasks.filter(t => t.id !== active.id)
                        }
                    }
                    if (col.id === isOverTask.id) {
                        const overIndex = col.tasks.findIndex(t => t.id === over.id)
                        const updatedTask = {
                            ...activeTask,
                            status: col.id as TaskStatus,
                            columnId: col.id
                        }
                        const newTasks = [...col.tasks]
                        if (overIndex >= 0) {
                            newTasks.splice(overIndex, 0, updatedTask)
                        } else {
                            newTasks.push(updatedTask)
                        }
                        return { ...col, tasks: newTasks }
                    }
                    return col
                })
                setColumns(newColumns)
                if (onColumnsChange) onColumnsChange(newColumns)
            }
        }
    }

    const handleAddTask = async (columnId: string, title: string) => {
        if (onTaskCreate) {
            const createdTask = await onTaskCreate(columnId, title)
            if (createdTask) {
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

    const getFilteredTasks = (tasks: KanbanTask[]) => {
        return tasks.filter(task => {
            const matchesSearch = searchQuery === '' ||
                task.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                task.description?.toLowerCase().includes(searchQuery.toLowerCase())

            const matchesPriority = filterPriority === 'all' || task.priority === filterPriority

            return matchesSearch && matchesPriority
        })
    }

    // Get active task for DragOverlay
    const activeTask = activeId ? findTask(activeId) : null
    const activeDisplayColor = activeTask
        ? (activeTask as any).departmentColor || getDepartmentColor(activeTask.department)
        : '#94A3B8'

    if (!isBrowser) {
        return null
    }

    return (
        <div className="h-full flex flex-col">
            {/* Search and Filter - only show if hideFilters is false */}
            {!hideFilters && (
                <div className="mb-4 flex items-center gap-3">
                    <div className="relative flex-1 max-w-md">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                        <Input
                            type="text"
                            placeholder="작업 검색..."
                            value={searchQuery}
                            onChange={(e) => setInternalSearchQuery(e.target.value)}
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
                                    onClick={() => setInternalFilterPriority(priority.value)}
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
            )}

            {/* Kanban Board with dnd-kit */}
            <div className="flex-1 overflow-x-auto">
                <DndContext
                    sensors={sensors}
                    collisionDetection={closestCorners}
                    onDragStart={handleDragStart}
                    onDragEnd={handleDragEnd}
                >
                    <div className="flex gap-4 h-full pb-4 min-w-max">
                        {columns.map(column => {
                            const filteredTasks = getFilteredTasks(column.tasks)

                            return (
                                <DroppableColumn
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
                                    currentUserId={currentUserId}
                                    isAdmin={isAdmin}
                                />
                            )
                        })}
                    </div>

                    {/* DragOverlay - Renders outside document flow, fixing position issues */}
                    <DragOverlay>
                        {activeTask ? (
                            <div className="w-80">
                                <TaskCardContent
                                    task={activeTask}
                                    displayColor={activeDisplayColor}
                                    isDragging={true}
                                />
                            </div>
                        ) : null}
                    </DragOverlay>
                </DndContext>
            </div>
        </div>
    )
}
