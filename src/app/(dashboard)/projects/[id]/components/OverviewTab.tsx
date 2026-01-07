'use client'

import React from 'react'
import { motion } from 'framer-motion'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import ProjectInviteBanner from '@/components/projects/ProjectInviteBanner'
import { cn } from '@/lib/utils'
import {
  Users, Wallet, CalendarDays, Clock, UserPlus, TrendingUp, Zap,
  AlertCircle, BarChart3, FileText, Activity, Trophy
} from 'lucide-react'
import {
  ProjectDetail,
  Activity as ActivityType,
  TaskType,
  ProjectTab,
  ROLE_COLORS,
  formatRelativeTime,
  calculateDaysRemaining
} from '../types'

interface OverviewTabProps {
  project: ProjectDetail
  tasks: TaskType[]
  activities: ActivityType[]
  calculatedProgress: number
  isProjectAdmin: boolean
  onTabChange: (tab: ProjectTab) => void
  onProjectReload: () => void
}

export function OverviewTab({
  project,
  tasks,
  activities,
  calculatedProgress,
  isProjectAdmin,
  onTabChange,
  onProjectReload
}: OverviewTabProps) {
  return (
    <div className="h-full overflow-y-auto p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* 초대 배너 - 초대받은 사용자에게만 표시 */}
        {!isProjectAdmin && (
          <ProjectInviteBanner
            projectId={project.id}
            isAdmin={isProjectAdmin}
            onAccepted={onProjectReload}
          />
        )}

        {/* Hero Progress Section */}
        <ProgressHeroSection
          tasks={tasks}
          calculatedProgress={calculatedProgress}
        />

        {/* Quick Stats Row */}
        <QuickStatsRow project={project} tasks={tasks} />

        {/* Two Column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Team Members Card */}
          <TeamMembersCard
            project={project}
            tasks={tasks}
            onTabChange={onTabChange}
          />

          {/* Recent Activity Card */}
          <RecentActivityCard
            activities={activities}
            onTabChange={onTabChange}
          />
        </div>

        {/* Urgent Tasks & Task Distribution Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <UrgentTasksCard
            tasks={tasks}
            onTabChange={onTabChange}
          />
          <TaskDistributionCard tasks={tasks} />
        </div>

        {/* Description Card */}
        {project.description && (
          <DescriptionCard description={project.description} />
        )}
      </div>
    </div>
  )
}

// ===========================================
// Sub Components
// ===========================================

function ProgressHeroSection({ tasks, calculatedProgress }: { tasks: TaskType[]; calculatedProgress: number }) {
  const todoCount = tasks.filter(t => t.columnId === 'todo').length
  const inProgressCount = tasks.filter(t => t.columnId === 'in_progress').length
  const reviewCount = tasks.filter(t => t.columnId === 'review').length
  const doneCount = tasks.filter(t => t.columnId === 'done').length

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <Card variant="glass" className="overflow-hidden">
        <CardContent className="p-0">
          <div className="relative">
            <div className="absolute inset-0 bg-gradient-to-br from-lime-500/20 via-emerald-500/10 to-teal-500/20" />

            <div className="relative p-6">
              <div className="flex items-start justify-between mb-6">
                <div>
                  <h3 className="text-lg font-bold text-slate-900 mb-1 flex items-center gap-2">
                    <div className="p-2 bg-lime-500 rounded-xl shadow-lg shadow-lime-500/30">
                      <TrendingUp className="w-5 h-5 text-white" />
                    </div>
                    프로젝트 진행 현황
                  </h3>
                  <p className="text-sm text-slate-500">전체 작업 진행률과 주요 지표를 한눈에 확인하세요</p>
                </div>
                <Badge className={cn(
                  "text-sm font-bold px-4 py-2 border-0 rounded-xl shadow-lg",
                  calculatedProgress >= 80 ? 'bg-emerald-500 text-white shadow-emerald-500/30' :
                  calculatedProgress >= 50 ? 'bg-lime-500 text-black shadow-lime-500/30' :
                  calculatedProgress >= 30 ? 'bg-amber-500 text-white shadow-amber-500/30' :
                  'bg-slate-400 text-white shadow-slate-400/30'
                )}>
                  {calculatedProgress >= 80 ? '순조로움' :
                   calculatedProgress >= 50 ? '진행 중' :
                   calculatedProgress >= 30 ? '시작 단계' : '준비 중'}
                </Badge>
              </div>

              {/* Large Progress Display */}
              <div className="flex items-center gap-8 mb-6">
                <div className="relative w-32 h-32">
                  <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                    <circle
                      cx="50" cy="50" r="42"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="12"
                      className="text-slate-200"
                    />
                    <circle
                      cx="50" cy="50" r="42"
                      fill="none"
                      stroke="url(#progressGradient)"
                      strokeWidth="12"
                      strokeLinecap="round"
                      strokeDasharray={`${calculatedProgress * 2.64} 264`}
                      className="transition-all duration-1000"
                    />
                    <defs>
                      <linearGradient id="progressGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                        <stop offset="0%" stopColor="#a3e635" />
                        <stop offset="100%" stopColor="#22c55e" />
                      </linearGradient>
                    </defs>
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-3xl font-black text-slate-900">{calculatedProgress}%</span>
                    <span className="text-xs text-slate-500">완료</span>
                  </div>
                </div>

                <div className="flex-1 grid grid-cols-2 md:grid-cols-4 gap-4">
                  <StatBox label="할 일" count={todoCount} dotColor="bg-slate-400" />
                  <StatBox label="진행 중" count={inProgressCount} dotColor="bg-amber-500" animated />
                  <StatBox label="검토" count={reviewCount} dotColor="bg-violet-500" />
                  <StatBox label="완료" count={doneCount} dotColor="bg-emerald-500" textColor="text-emerald-600" />
                </div>
              </div>

              {/* Progress Bar */}
              <div className="space-y-2">
                <div className="flex justify-between text-xs font-medium text-slate-500">
                  <span>전체 진행률</span>
                  <span>{doneCount}/{tasks.length} 작업 완료</span>
                </div>
                <div className="h-3 bg-slate-200/60 rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${calculatedProgress}%` }}
                    transition={{ duration: 1, ease: "easeOut" }}
                    className="h-full bg-gradient-to-r from-lime-400 to-emerald-500 rounded-full"
                  />
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}

function StatBox({
  label,
  count,
  dotColor,
  textColor = "text-slate-900",
  animated = false
}: {
  label: string
  count: number
  dotColor: string
  textColor?: string
  animated?: boolean
}) {
  return (
    <div className="p-4 bg-white/60 rounded-2xl border border-white/40">
      <div className="flex items-center gap-2 mb-2">
        <div className={cn("w-2.5 h-2.5 rounded-full", dotColor, animated && "animate-pulse")} />
        <span className="text-xs font-medium text-slate-500">{label}</span>
      </div>
      <span className={cn("text-2xl font-bold", textColor)}>{count}</span>
    </div>
  )
}

function QuickStatsRow({ project, tasks }: { project: ProjectDetail; tasks: TaskType[] }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.1 }}
      className="grid grid-cols-2 md:grid-cols-4 gap-4"
    >
      <QuickStatCard
        label="시작일"
        value={project.startDate ? new Date(project.startDate).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' }) : '-'}
        subValue={project.startDate ? new Date(project.startDate).toLocaleDateString('ko-KR', { year: 'numeric' }) : undefined}
        icon={CalendarDays}
        iconBg="bg-lime-100"
        iconColor="text-lime-600"
        hoverBg="group-hover:bg-lime-500"
        hoverShadow="group-hover:shadow-lime-500/30"
      />

      <QuickStatCard
        label="종료일"
        value={project.endDate ? new Date(project.endDate).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' }) : '-'}
        subValue={project.endDate ? calculateDaysRemaining(project.endDate).text : undefined}
        icon={Clock}
        iconBg="bg-rose-100"
        iconColor="text-rose-600"
        hoverBg="group-hover:bg-rose-500"
        hoverShadow="group-hover:shadow-rose-500/30"
      />

      <QuickStatCard
        label="예산"
        value={project.budget ? `₩${(project.budget / 10000).toFixed(0)}만` : '-'}
        subValue={project.budget && project.spentBudget ? `${((project.spentBudget / project.budget) * 100).toFixed(0)}% 사용` : undefined}
        icon={Wallet}
        iconBg="bg-violet-100"
        iconColor="text-violet-600"
        hoverBg="group-hover:bg-violet-500"
        hoverShadow="group-hover:shadow-violet-500/30"
      />

      <QuickStatCard
        label="팀원"
        value={`${project.teamMembers?.length || 0}명`}
        subValue={tasks.length > 0 ? `${(tasks.length / (project.teamMembers?.length || 1)).toFixed(1)} 작업/인` : '작업 없음'}
        icon={Users}
        iconBg="bg-emerald-100"
        iconColor="text-emerald-600"
        hoverBg="group-hover:bg-emerald-500"
        hoverShadow="group-hover:shadow-emerald-500/30"
      />
    </motion.div>
  )
}

function QuickStatCard({
  label,
  value,
  subValue,
  icon: Icon,
  iconBg,
  iconColor,
  hoverBg,
  hoverShadow
}: {
  label: string
  value: string
  subValue?: string
  icon: React.ComponentType<{ className?: string }>
  iconBg: string
  iconColor: string
  hoverBg: string
  hoverShadow: string
}) {
  return (
    <Card variant="glass" className="group hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">{label}</p>
            <p className="text-lg font-bold text-slate-900">{value}</p>
            {subValue && <p className="text-xs text-slate-500 mt-1">{subValue}</p>}
          </div>
          <div className={cn(
            "p-2.5 rounded-xl transition-all",
            iconBg,
            hoverBg,
            "group-hover:shadow-lg",
            hoverShadow
          )}>
            <Icon className={cn("w-5 h-5 transition-colors", iconColor, "group-hover:text-white")} />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function TeamMembersCard({
  project,
  tasks,
  onTabChange
}: {
  project: ProjectDetail
  tasks: TaskType[]
  onTabChange: (tab: ProjectTab) => void
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.2 }}
    >
      <Card variant="glass" className="h-full">
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-5">
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <div className="p-2 bg-blue-100 rounded-xl">
                <Users className="w-4 h-4 text-blue-600" />
              </div>
              팀 구성원
            </h3>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onTabChange('team')}
              className="text-xs text-slate-500 hover:text-slate-900"
            >
              전체보기 →
            </Button>
          </div>

          <div className="space-y-3">
            {project.teamMembers && project.teamMembers.length > 0 ? (
              project.teamMembers.slice(0, 5).map((member, index) => {
                const colors = ROLE_COLORS[member.role] || ROLE_COLORS.Viewer
                const memberTasks = tasks.filter(t => t.assigneeId === member.userId)
                const completedTasks = memberTasks.filter(t => t.columnId === 'done').length

                return (
                  <motion.div
                    key={member.userId}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className="flex items-center gap-3 p-3 bg-white/50 rounded-xl hover:bg-white/80 transition-colors"
                  >
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center text-sm font-bold text-slate-600">
                      {member.name?.charAt(0) || '?'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-slate-900 truncate">{member.name}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className={cn(
                          "px-2 py-0.5 text-xs font-medium rounded-md border",
                          colors.bg, colors.text, colors.border
                        )}>
                          {member.role}
                        </span>
                        {memberTasks.length > 0 && (
                          <span className="text-xs text-slate-400">
                            {completedTasks}/{memberTasks.length} 완료
                          </span>
                        )}
                      </div>
                    </div>
                    {memberTasks.length > 0 && (
                      <div className="w-12">
                        <div className="h-1.5 bg-slate-200 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-lime-500 rounded-full"
                            style={{ width: `${(completedTasks / memberTasks.length) * 100}%` }}
                          />
                        </div>
                      </div>
                    )}
                  </motion.div>
                )
              })
            ) : (
              <div className="text-center py-8 text-slate-500">
                <Users className="w-12 h-12 mx-auto mb-3 text-slate-300" />
                <p className="text-sm">아직 팀원이 없습니다</p>
                <Button
                  variant="glass"
                  size="sm"
                  onClick={() => onTabChange('team')}
                  className="mt-3"
                >
                  <UserPlus className="w-4 h-4 mr-2" />
                  팀원 초대하기
                </Button>
              </div>
            )}

            {project.teamMembers && project.teamMembers.length > 5 && (
              <p className="text-xs text-slate-400 text-center pt-2">
                +{project.teamMembers.length - 5}명 더 있음
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}

function RecentActivityCard({
  activities,
  onTabChange
}: {
  activities: ActivityType[]
  onTabChange: (tab: ProjectTab) => void
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.3 }}
    >
      <Card variant="glass" className="h-full">
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-5">
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <div className="p-2 bg-amber-100 rounded-xl">
                <Zap className="w-4 h-4 text-amber-600" />
              </div>
              최근 활동
            </h3>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onTabChange('activity')}
              className="text-xs text-slate-500 hover:text-slate-900"
            >
              전체보기 →
            </Button>
          </div>

          <div className="space-y-3">
            {activities.length > 0 ? (
              activities.slice(0, 5).map((activity, index) => (
                <motion.div
                  key={activity.id}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="flex gap-3 p-3 bg-white/50 rounded-xl hover:bg-white/80 transition-colors"
                >
                  <div className="text-xl flex-shrink-0">{activity.icon}</div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-slate-900 line-clamp-2">{activity.message}</p>
                    <div className="flex items-center gap-2 mt-1.5">
                      <span className="text-xs font-medium text-slate-600">{activity.userName}</span>
                      <span className="text-xs text-slate-400">
                        {formatRelativeTime(activity.timestamp)}
                      </span>
                    </div>
                  </div>
                </motion.div>
              ))
            ) : (
              <div className="text-center py-8 text-slate-500">
                <Activity className="w-12 h-12 mx-auto mb-3 text-slate-300" />
                <p className="text-sm">아직 활동 내역이 없습니다</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}

function UrgentTasksCard({
  tasks,
  onTabChange
}: {
  tasks: TaskType[]
  onTabChange: (tab: ProjectTab) => void
}) {
  const urgentTasks = tasks.filter(t =>
    (t.priority === 'urgent' || t.priority === 'high') && t.columnId !== 'done'
  ).slice(0, 4)

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.4 }}
    >
      <Card variant="glass">
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-5">
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <div className="p-2 bg-rose-100 rounded-xl">
                <AlertCircle className="w-4 h-4 text-rose-600" />
              </div>
              긴급 작업
            </h3>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onTabChange('kanban')}
              className="text-xs text-slate-500 hover:text-slate-900"
            >
              전체보기 →
            </Button>
          </div>

          <div className="space-y-2">
            {urgentTasks.length === 0 ? (
              <div className="text-center py-6 text-slate-500">
                <Trophy className="w-12 h-12 mx-auto mb-3 text-lime-400" />
                <p className="text-sm font-medium text-slate-900">긴급 작업이 없습니다!</p>
                <p className="text-xs text-slate-400 mt-1">훌륭해요, 계속 진행하세요</p>
              </div>
            ) : (
              urgentTasks.map((task, index) => (
                <motion.div
                  key={task.id}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: index * 0.1 }}
                  className="flex items-center gap-3 p-3 bg-white/50 rounded-xl hover:bg-white/80 transition-colors cursor-pointer"
                  onClick={() => onTabChange('kanban')}
                >
                  <div className={cn(
                    "w-2 h-2 rounded-full flex-shrink-0",
                    task.priority === 'urgent' ? 'bg-rose-500 animate-pulse' : 'bg-amber-500'
                  )} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-900 truncate">{task.title}</p>
                    <p className="text-xs text-slate-500">
                      {task.dueDate && `마감: ${new Date(task.dueDate).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' })}`}
                    </p>
                  </div>
                  <Badge className={cn(
                    "text-xs border-0",
                    task.priority === 'urgent' ? 'bg-rose-100 text-rose-700' : 'bg-amber-100 text-amber-700'
                  )}>
                    {task.priority === 'urgent' ? '긴급' : '높음'}
                  </Badge>
                </motion.div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}

function TaskDistributionCard({ tasks }: { tasks: TaskType[] }) {
  const statusDistribution = [
    { id: 'todo', label: '할 일', count: tasks.filter(t => t.columnId === 'todo').length, color: 'bg-slate-400' },
    { id: 'in_progress', label: '진행 중', count: tasks.filter(t => t.columnId === 'in_progress').length, color: 'bg-amber-500' },
    { id: 'review', label: '검토', count: tasks.filter(t => t.columnId === 'review').length, color: 'bg-violet-500' },
    { id: 'done', label: '완료', count: tasks.filter(t => t.columnId === 'done').length, color: 'bg-emerald-500' },
  ]
  const total = tasks.length || 1

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.5 }}
    >
      <Card variant="glass">
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-5">
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <div className="p-2 bg-indigo-100 rounded-xl">
                <BarChart3 className="w-4 h-4 text-indigo-600" />
              </div>
              작업 분포
            </h3>
          </div>

          <div className="space-y-4">
            {/* Stacked Bar */}
            <div className="h-4 bg-slate-100 rounded-full overflow-hidden flex">
              {statusDistribution.map((status) => (
                <motion.div
                  key={status.id}
                  initial={{ width: 0 }}
                  animate={{ width: `${(status.count / total) * 100}%` }}
                  transition={{ duration: 0.8, delay: 0.2 }}
                  className={cn("h-full", status.color)}
                />
              ))}
            </div>

            {/* Legend */}
            <div className="grid grid-cols-2 gap-3">
              {statusDistribution.map((status) => (
                <div key={status.id} className="flex items-center gap-2">
                  <div className={cn("w-3 h-3 rounded-full", status.color)} />
                  <span className="text-xs text-slate-600">{status.label}</span>
                  <span className="text-xs font-bold text-slate-900 ml-auto">{status.count}</span>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}

function DescriptionCard({ description }: { description: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.6 }}
    >
      <Card variant="glass">
        <CardContent className="p-6">
          <h3 className="text-base font-bold text-slate-900 flex items-center gap-2 mb-4">
            <div className="p-2 bg-slate-100 rounded-xl">
              <FileText className="w-4 h-4 text-slate-600" />
            </div>
            프로젝트 설명
          </h3>
          <p className="text-sm text-slate-600 leading-relaxed whitespace-pre-wrap">
            {description}
          </p>
        </CardContent>
      </Card>
    </motion.div>
  )
}

export default OverviewTab
