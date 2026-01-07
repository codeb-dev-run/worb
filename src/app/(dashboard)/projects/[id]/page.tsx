'use client'

// ===========================================
// Glass Morphism Project Detail Page (Refactored)
// 1696줄 → ~280줄 (타입/훅/컴포넌트 분리)
// ===========================================

import React, { useState, useCallback } from 'react'
import { useAuth } from '@/lib/auth-context'
import { useWorkspace } from '@/lib/workspace-context'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Loader2, FolderOpen, ArrowLeft, FileText, Activity } from 'lucide-react'
import Link from 'next/link'

// Components
import ProjectSidebar from '@/components/projects/ProjectSidebar'
import KanbanBoardDnD from '@/components/kanban/KanbanBoardDnD'
import GanttChartPro, { ExtendedTask } from '@/components/gantt/GanttChartPro'
import MindmapEditor from '@/components/mindmap/MindmapEditor'
import ProjectInvitations from '@/components/projects/ProjectInvitations'
import ProjectSettingsCard from '@/components/projects/ProjectSettingsCard'

// Local Components
import { ProjectHeader, ProjectTabs, OverviewTab, TaskModal } from './components'

// Hooks
import { useProjectData, useTaskModal } from './hooks'

// Types
import {
  ProjectTab,
  KanbanColumnWithTasks,
  DEFAULT_COLUMNS,
  TaskType,
  TaskPriority
} from './types'

export default function ProjectDetailPage() {
  const { user, userProfile } = useAuth()
  const { isAdmin: isWorkspaceAdmin } = useWorkspace()

  // Project data and actions
  const {
    project,
    tasks,
    activities,
    loading,
    calculatedProgress,
    isProjectMember,
    isProjectAdmin,
    loadProjectData,
    handleColumnsChange,
    handleCreateTask,
    handleTaskDelete,
    handleInlineTaskCreate,
    handleGanttTaskChange,
    handleGanttDateChange,
    handleGanttProgressChange,
    handleGanttTaskDelete,
    setTasks
  } = useProjectData()

  // Task modal state
  const {
    showTaskModal,
    selectedColumnId,
    editingTask,
    newTask,
    openCreateModal,
    openEditModal,
    closeModal,
    updateTaskForm
  } = useTaskModal()

  // UI state
  const [activeTab, setActiveTab] = useState<ProjectTab>('kanban')
  const [showSidebar, setShowSidebar] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [filterPriority, setFilterPriority] = useState<string>('all')

  // Handle task save
  const handleSaveTask = useCallback(async () => {
    const success = await handleCreateTask(newTask, selectedColumnId, editingTask)
    if (success) {
      closeModal()
    }
  }, [handleCreateTask, newTask, selectedColumnId, editingTask, closeModal])

  // Loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-lime-400 mx-auto" />
          <p className="mt-4 text-slate-500">프로젝트를 불러오는 중...</p>
        </div>
      </div>
    )
  }

  // Not found state
  if (!project) {
    return (
      <div className="flex items-center justify-center h-full">
        <Card variant="glass" className="max-w-md">
          <CardContent className="p-8 text-center">
            <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-lime-100 flex items-center justify-center">
              <FolderOpen className="w-8 h-8 text-lime-600" />
            </div>
            <h2 className="text-xl font-semibold text-slate-900 mb-2">프로젝트를 찾을 수 없습니다</h2>
            <p className="text-slate-500 mb-4">요청하신 프로젝트가 존재하지 않거나 접근 권한이 없습니다.</p>
            <Link href="/projects">
              <Button variant="limePrimary" className="rounded-xl">
                <ArrowLeft className="w-4 h-4 mr-2" />
                프로젝트 목록으로 돌아가기
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="h-full flex overflow-hidden bg-gradient-to-br from-slate-50 to-slate-100">
      {/* Main Content Area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <ProjectHeader
          project={project}
          showSidebar={showSidebar}
          onToggleSidebar={() => setShowSidebar(!showSidebar)}
        />

        {/* Tabs + Filters */}
        <ProjectTabs
          activeTab={activeTab}
          isProjectAdmin={isProjectAdmin}
          searchQuery={searchQuery}
          filterPriority={filterPriority}
          onTabChange={setActiveTab}
          onSearchChange={setSearchQuery}
          onFilterChange={setFilterPriority}
        />

        {/* Tab Content */}
        <div className="flex-1 overflow-hidden">
          {activeTab === 'overview' && (
            <OverviewTab
              project={project}
              tasks={tasks}
              activities={activities}
              calculatedProgress={calculatedProgress}
              isProjectAdmin={isProjectAdmin}
              onTabChange={setActiveTab}
              onProjectReload={loadProjectData}
            />
          )}

          {activeTab === 'kanban' && (
            <div className="h-full isolate" style={{ transform: 'none' }}>
              <KanbanBoardDnD
                columns={DEFAULT_COLUMNS.map(col => {
                  const colTasks = tasks.filter(task =>
                    task.status === col.id ||
                    (col.id === 'todo' && !['in_progress', 'review', 'done'].includes(task.status as string))
                  )
                  return {
                    ...col,
                    tasks: colTasks.map(task => ({
                      ...task,
                      dueDate: task.dueDate ? new Date(task.dueDate) : undefined,
                      priority: (task.priority || TaskPriority.MEDIUM) as TaskPriority
                    }))
                  }
                })}
                searchQuery={searchQuery}
                filterPriority={filterPriority}
                hideFilters={true}
                currentUserId={user?.uid}
                isAdmin={isWorkspaceAdmin}
                onColumnsChange={(newColumns) => handleColumnsChange(newColumns as KanbanColumnWithTasks[])}
                onTaskAdd={openCreateModal}
                onTaskEdit={openEditModal}
                onTaskDelete={(taskId) => {
                  if (confirm('정말로 이 작업을 삭제하시겠습니까?')) {
                    handleTaskDelete(taskId)
                  }
                }}
                onTaskCreate={handleInlineTaskCreate}
              />
            </div>
          )}

          {activeTab === 'gantt' && (
            <div className="h-full w-full overflow-hidden p-4">
              <GanttChartPro
                tasks={tasks.map((task): ExtendedTask => ({
                  id: task.id,
                  name: task.title,
                  start: task.startDate ? new Date(task.startDate) : new Date(),
                  end: task.dueDate ? new Date(task.dueDate) : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
                  progress: task.progress || 0,
                  type: 'task',
                  assigneeDepartment: task.department,
                  styles: task.color ? {
                    progressColor: task.color,
                    progressSelectedColor: task.color,
                    backgroundColor: task.color + '40',
                    backgroundSelectedColor: task.color + '60',
                  } : undefined,
                }))}
                onTaskChange={handleGanttTaskChange}
                onDateChange={handleGanttDateChange}
                onProgressChange={handleGanttProgressChange}
                onTaskDelete={handleGanttTaskDelete}
              />
            </div>
          )}

          {activeTab === 'mindmap' && (
            <div className="h-full w-full overflow-hidden p-6">
              <MindmapEditor projectId={project.id} projectName={project.name} />
            </div>
          )}

          {activeTab === 'files' && (
            <div className="h-full overflow-y-auto p-6">
              <Card variant="glass" className="max-w-2xl mx-auto py-12">
                <CardContent>
                  <div className="flex flex-col items-center justify-center">
                    <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-lime-100 flex items-center justify-center">
                      <FileText className="h-8 w-8 text-lime-600" />
                    </div>
                    <h3 className="text-lg font-semibold text-slate-900 mb-2">파일 관리</h3>
                    <p className="text-slate-500">파일 관리 기능은 준비 중입니다.</p>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {activeTab === 'activity' && (
            <div className="h-full overflow-y-auto p-6">
              <div className="max-w-4xl">
                <h3 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
                  <div className="p-2 bg-lime-100 rounded-xl">
                    <Activity className="w-5 h-5 text-lime-600" />
                  </div>
                  프로젝트 활동
                </h3>
                <div className="space-y-3">
                  {activities.length > 0 ? (
                    activities.map((activity) => (
                      <Card key={activity.id} variant="glass" className="hover:shadow-lg transition-shadow">
                        <CardContent className="p-4">
                          <div className="flex gap-3">
                            <div className="text-2xl">{activity.icon}</div>
                            <div className="flex-1">
                              <p className="text-sm text-slate-900">{activity.message}</p>
                              <p className="text-xs text-slate-500 mt-1">
                                {activity.userName} · {new Date(activity.timestamp).toLocaleString('ko-KR')}
                              </p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))
                  ) : (
                    <Card variant="glass" className="py-12">
                      <CardContent>
                        <div className="flex flex-col items-center justify-center">
                          <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-lime-100 flex items-center justify-center">
                            <Activity className="h-8 w-8 text-lime-600" />
                          </div>
                          <p className="text-slate-500">활동 내역이 없습니다.</p>
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'team' && (
            <div className="h-full overflow-y-auto p-6">
              <ProjectInvitations projectId={project.id} isAdmin={isProjectMember} />
            </div>
          )}

          {activeTab === 'settings' && isProjectAdmin && (
            <div className="h-full overflow-y-auto p-6">
              <div className="max-w-2xl mx-auto">
                <ProjectSettingsCard
                  projectId={project.id}
                  projectName={project.name}
                  initialProgress={calculatedProgress}
                  initialStatus={project.status}
                  initialPriority={project.priority || 'medium'}
                  onUpdate={loadProjectData}
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Sidebar */}
      {showSidebar && <ProjectSidebar project={{ ...project, progress: calculatedProgress }} activities={activities} />}

      {/* Task Creation/Edit Modal */}
      <TaskModal
        isOpen={showTaskModal}
        editingTask={editingTask}
        newTask={newTask}
        teamMembers={project.teamMembers || []}
        onClose={closeModal}
        onSave={handleSaveTask}
        onUpdateForm={updateTaskForm}
      />
    </div>
  )
}
