'use client'

// ===========================================
// Glass Morphism Tasks Page (Refactored)
// 1098줄 → ~150줄 (타입/훅/컴포넌트 분리)
// ===========================================

import React, { useState, useCallback, useMemo } from 'react'
import KanbanBoardDnD from '@/components/kanban/KanbanBoardDnD'

// Types
import { ActiveTab, KanbanColumnWithTasks } from './types'

// Hooks
import { useTasksData, useTaskEditModal } from './hooks'

// Components
import {
  TasksHeader,
  TaskFilters,
  ListView,
  TrashView,
  TaskInput,
  TaskEditModal
} from './components'

export default function TasksPage() {
  // UI State
  const [activeTab, setActiveTab] = useState<ActiveTab>('list')
  const [filterStatus, setFilterStatus] = useState<string>('all')
  const [filterProject, setFilterProject] = useState<string>('all')
  const [showOtherProjects, setShowOtherProjects] = useState(false)
  const [newTaskTitle, setNewTaskTitle] = useState('')
  const [isCreating, setIsCreating] = useState(false)

  // Data Hook
  const {
    projects,
    loading,
    workspaceLoading,
    user,
    isAdmin,
    handleCreateTask,
    handleStatusChange,
    handleUpdateTask,
    handleKanbanColumnsChange,
    getFilteredTasks,
    getKanbanColumns,
    trashedTasks,
    handleMoveToTrash,
    handleRestoreTask,
    handlePermanentDelete,
    handleEmptyTrash,
  } = useTasksData()

  // Edit Modal Hook
  const {
    editingTask,
    isEditModalOpen,
    editForm,
    durationDays,
    openEditModal,
    closeEditModal,
    setEditForm,
    handleStartDateChange,
    handleDurationChange,
  } = useTaskEditModal()

  // Memoized filtered tasks
  const filteredTasks = useMemo(
    () => getFilteredTasks(filterStatus, filterProject),
    [getFilteredTasks, filterStatus, filterProject]
  )

  // Memoized kanban columns
  const kanbanColumns = useMemo(
    () => getKanbanColumns(filteredTasks),
    [getKanbanColumns, filteredTasks]
  )

  // Create task handler
  const handleCreateNewTask = useCallback(async () => {
    if (!newTaskTitle.trim()) return

    const targetProjectId = filterProject !== 'all' && filterProject !== 'personal' ? filterProject : undefined

    setIsCreating(true)
    const success = await handleCreateTask(newTaskTitle, targetProjectId)
    if (success) {
      setNewTaskTitle('')
    }
    setIsCreating(false)
  }, [newTaskTitle, filterProject, handleCreateTask])

  // Edit task save handler
  const handleEditSave = useCallback(async () => {
    if (!editingTask) return

    const success = await handleUpdateTask(editingTask.id, {
      title: editForm.title,
      description: editForm.description,
      projectId: editForm.projectId === 'personal' ? undefined : editForm.projectId,
      status: editForm.status,
      priority: editForm.priority,
      startDate: editForm.startDate ? new Date(editForm.startDate) : undefined,
      dueDate: editForm.dueDate ? new Date(editForm.dueDate) : undefined,
    })

    if (success) {
      closeEditModal()
    }
  }, [editingTask, editForm, handleUpdateTask, closeEditModal])

  // Loading state
  if (loading || workspaceLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-lime-400" />
      </div>
    )
  }

  return (
    <div className="h-[calc(100vh-4rem)] flex flex-col animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Header */}
      <TasksHeader
        activeTab={activeTab}
        onTabChange={setActiveTab}
        trashedCount={trashedTasks.length}
      />

      {/* Filters - 휴지통이 아닐 때만 표시 */}
      {activeTab !== 'trash' && (
        <TaskFilters
          filterStatus={filterStatus}
          filterProject={filterProject}
          onStatusChange={setFilterStatus}
          onProjectChange={setFilterProject}
          projects={projects}
          showOtherProjects={showOtherProjects}
          onToggleOtherProjects={() => setShowOtherProjects(prev => !prev)}
        />
      )}

      {/* Content Area */}
      {activeTab === 'trash' ? (
        <TrashView
          trashedTasks={trashedTasks}
          onRestoreTask={handleRestoreTask}
          onPermanentDelete={handlePermanentDelete}
          onEmptyTrash={handleEmptyTrash}
        />
      ) : activeTab === 'list' ? (
        <div className="flex-1 overflow-auto px-6 py-4">
          <ListView
            tasks={filteredTasks}
            onStatusChange={handleStatusChange}
            onEditTask={openEditModal}
            onMoveToTrash={handleMoveToTrash}
          />
        </div>
      ) : (
        <div className="flex-1 overflow-auto px-6 py-4">
          <KanbanBoardDnD
            columns={kanbanColumns}
            onColumnsChange={(columns) => handleKanbanColumnsChange(columns as KanbanColumnWithTasks[])}
            onTaskAdd={() => {
              setNewTaskTitle('')
              setIsCreating(true)
            }}
            onTaskEdit={openEditModal}
            onTaskDelete={(taskId) => handleMoveToTrash(taskId)}
            currentUserId={user?.uid}
            isAdmin={isAdmin}
          />
        </div>
      )}

      {/* Floating Task Input */}
      <TaskInput
        value={newTaskTitle}
        onChange={setNewTaskTitle}
        onSubmit={handleCreateNewTask}
        isCreating={isCreating}
      />

      {/* Edit Modal */}
      <TaskEditModal
        isOpen={isEditModalOpen}
        onClose={closeEditModal}
        editForm={editForm}
        onFormChange={setEditForm}
        onStartDateChange={handleStartDateChange}
        onDurationChange={handleDurationChange}
        durationDays={durationDays}
        projects={projects}
        onSave={handleEditSave}
      />
    </div>
  )
}
