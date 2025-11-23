'use client'

import React from 'react'
import { Calendar, DollarSign, Users, Clock } from 'lucide-react'

interface ProjectSidebarProps {
    project: {
        id: string
        name: string
        status: string
        progress: number
        startDate: Date | null
        endDate: Date | null
        budget: number | null
        spentBudget?: number
        team?: string[]
        teamMembers?: any[]
        createdAt: Date
        updatedAt: Date
    }
    activities?: Array<{
        id: string
        type: string
        message: string
        userName: string
        timestamp: Date
        icon: string
    }>
}

export default function ProjectSidebar({ project, activities = [] }: ProjectSidebarProps) {
    const daysLeft = project.endDate
        ? Math.ceil((new Date(project.endDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
        : 0

    return (
        <div className="w-80 bg-white border-l border-gray-200 flex flex-col overflow-hidden">
            {/* Sidebar Header */}
            <div className="p-4 border-b border-gray-200">
                <h2 className="text-sm font-semibold text-gray-900">프로젝트 세부정보</h2>
            </div>

            {/* Sidebar Content */}
            <div className="flex-1 overflow-y-auto p-4 space-y-6">
                {/* Progress Section */}
                <div>
                    <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">진행 상황</h3>
                    <div className="space-y-2">
                        <div className="flex items-center justify-between text-sm">
                            <span className="text-gray-600">진행률</span>
                            <span className="font-medium text-gray-900">{project.progress}%</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-1.5">
                            <div
                                className="bg-blue-600 h-1.5 rounded-full transition-all"
                                style={{ width: `${project.progress}%` }}
                            />
                        </div>
                    </div>
                </div>

                {/* Details Section */}
                <div>
                    <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">세부 정보</h3>
                    <div className="space-y-3">
                        {/* Start Date */}
                        <div className="flex items-start gap-3">
                            <Calendar className="w-4 h-4 text-gray-400 mt-0.5" />
                            <div className="flex-1 min-w-0">
                                <div className="text-xs text-gray-500 mb-0.5">시작일</div>
                                <div className="text-sm text-gray-900">
                                    {project.startDate ? new Date(project.startDate).toLocaleDateString('ko-KR', {
                                        year: 'numeric',
                                        month: 'short',
                                        day: 'numeric'
                                    }) : '-'}
                                </div>
                            </div>
                        </div>

                        {/* End Date */}
                        <div className="flex items-start gap-3">
                            <Clock className="w-4 h-4 text-gray-400 mt-0.5" />
                            <div className="flex-1 min-w-0">
                                <div className="text-xs text-gray-500 mb-0.5">마감일</div>
                                <div className="text-sm text-gray-900">
                                    {project.endDate ? new Date(project.endDate).toLocaleDateString('ko-KR', {
                                        year: 'numeric',
                                        month: 'short',
                                        day: 'numeric'
                                    }) : '-'}
                                </div>
                                {daysLeft > 0 && (
                                    <div className="text-xs text-gray-500 mt-0.5">{daysLeft}일 남음</div>
                                )}
                            </div>
                        </div>

                        {/* Budget */}
                        <div className="flex items-start gap-3">
                            <DollarSign className="w-4 h-4 text-gray-400 mt-0.5" />
                            <div className="flex-1 min-w-0">
                                <div className="text-xs text-gray-500 mb-0.5">예산</div>
                                <div className="text-sm text-gray-900">
                                    {new Intl.NumberFormat('ko-KR', { style: 'currency', currency: 'KRW', maximumFractionDigits: 0 }).format(project.budget || 0)}
                                </div>
                                {project.spentBudget !== undefined && (
                                    <div className="text-xs text-gray-500 mt-0.5">
                                        사용: {new Intl.NumberFormat('ko-KR', { style: 'currency', currency: 'KRW', maximumFractionDigits: 0 }).format(project.spentBudget)}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Team Section */}
                <div>
                    <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">팀원</h3>
                    <div className="space-y-2">
                        {project.teamMembers && project.teamMembers.length > 0 ? (
                            project.teamMembers.slice(0, 5).map((member, idx) => (
                                <div key={idx} className="flex items-center gap-2">
                                    <div className="w-6 h-6 bg-blue-100 text-blue-700 rounded-full flex items-center justify-center text-xs font-medium">
                                        {member.name?.charAt(0) || '?'}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="text-sm text-gray-900 truncate">{member.name}</div>
                                        <div className="text-xs text-gray-500">{member.role}</div>
                                    </div>
                                </div>
                            ))
                        ) : project.team && project.team.length > 0 ? (
                            project.team.slice(0, 5).map((member, idx) => (
                                <div key={idx} className="flex items-center gap-2">
                                    <div className="w-6 h-6 bg-blue-100 text-blue-700 rounded-full flex items-center justify-center text-xs font-medium">
                                        {member.charAt(0)}
                                    </div>
                                    <div className="text-sm text-gray-900">{member}</div>
                                </div>
                            ))
                        ) : (
                            <div className="text-sm text-gray-500">팀원이 없습니다</div>
                        )}
                        {((project.teamMembers?.length || 0) > 5 || (project.team?.length || 0) > 5) && (
                            <button className="text-xs text-blue-600 hover:text-blue-700 font-medium">
                                +{(project.teamMembers?.length || project.team?.length || 0) - 5}명 더보기
                            </button>
                        )}
                    </div>
                </div>

                {/* Recent Activity */}
                {activities.length > 0 && (
                    <div>
                        <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">최근 활동</h3>
                        <div className="space-y-3">
                            {activities.slice(0, 5).map((activity) => (
                                <div key={activity.id} className="flex gap-2">
                                    <div className="text-sm">{activity.icon}</div>
                                    <div className="flex-1 min-w-0">
                                        <div className="text-xs text-gray-900">{activity.message}</div>
                                        <div className="text-xs text-gray-500 mt-0.5">
                                            {activity.userName} · {new Date(activity.timestamp).toLocaleDateString('ko-KR', {
                                                month: 'short',
                                                day: 'numeric',
                                                hour: '2-digit',
                                                minute: '2-digit'
                                            })}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}
