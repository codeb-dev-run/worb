'use client'

import React from 'react'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { User, Mail } from 'lucide-react'
import { useWorkspace } from '@/lib/workspace-context'

interface MemberCardProps {
    member: {
        id: string
        name?: string
        email?: string
        role?: string
        avatar?: string
        department?: string | null
        departmentName?: string | null
        departmentColor?: string | null
        teamMembershipId?: string | null
    }
    isDragging?: boolean
    showDepartment?: boolean
}

export default function MemberCard({ member, isDragging = false, showDepartment = false }: MemberCardProps) {
    const { getDepartmentColor, getDepartmentName } = useWorkspace()
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging: isSortableDragging,
    } = useSortable({ id: member.id })

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isSortableDragging ? 0.5 : 1,
    }

    // API에서 반환된 색상을 우선 사용, 없으면 context에서 조회 (레거시 호환)
    const departmentColor = member.departmentColor || getDepartmentColor(member.department || undefined)
    const departmentName = member.departmentName || getDepartmentName(member.department || undefined)

    // Compact layout for member list
    if (showDepartment) {
        return (
            <div
                ref={setNodeRef}
                style={style}
                {...attributes}
                {...listeners}
                className={`
                    relative group bg-white border border-slate-100 rounded-xl shadow-sm
                    hover:shadow-md hover:border-lime-300 transition-all cursor-grab active:cursor-grabbing p-3
                    ${isDragging || isSortableDragging ? 'shadow-lg rotate-2 scale-105 opacity-80' : ''}
                `}
            >
                <div className="flex items-center gap-3">
                    {/* Color Indicator Dot */}
                    <div
                        className="w-1.5 h-8 rounded-full"
                        style={{ backgroundColor: member.department ? departmentColor : '#e2e8f0' }}
                    />

                    {/* Avatar */}
                    <div
                        className="w-9 h-9 rounded-lg flex items-center justify-center text-white text-sm font-bold border border-white/50 shadow-sm"
                        style={{ backgroundColor: departmentColor }}
                    >
                        {member.name?.[0] || 'U'}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                            <span className="text-sm font-bold text-slate-900 truncate">{member.name || '이름 없음'}</span>
                            {member.role && (
                                <span className="text-[10px] px-1.5 h-5 flex items-center bg-slate-50 text-slate-500 rounded-md shrink-0">
                                    {member.role}
                                </span>
                            )}
                        </div>
                        <div className="text-xs text-slate-400 truncate">{member.email}</div>
                    </div>

                    {/* Department Badge */}
                    {member.department && (
                        <div
                            className="text-[10px] px-2 py-1 rounded-lg text-white font-medium shrink-0 shadow-sm"
                            style={{ backgroundColor: departmentColor }}
                        >
                            {departmentName}
                        </div>
                    )}
                </div>
            </div>
        )
    }

    // Full layout for department columns
    return (
        <div
            ref={setNodeRef}
            style={style}
            {...attributes}
            {...listeners}
            className={`
                relative group bg-white border border-slate-100 rounded-xl shadow-sm
                hover:shadow-md hover:border-lime-300 transition-all cursor-grab active:cursor-grabbing p-4
                ${isDragging || isSortableDragging ? 'shadow-lg rotate-2 scale-105 opacity-80' : ''}
            `}
        >
            <div className="flex items-center gap-3">
                {/* Color Indicator Dot */}
                <div
                    className="w-1.5 h-8 rounded-full"
                    style={{ backgroundColor: member.department ? departmentColor : '#e2e8f0' }}
                />

                {/* Avatar */}
                <div
                    className="w-10 h-10 rounded-lg flex items-center justify-center text-white font-bold border border-white/50 shadow-sm"
                    style={{ backgroundColor: departmentColor }}
                >
                    {member.name?.[0] || <User className="w-5 h-5" />}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                        <span className="text-sm font-bold text-slate-900 truncate">{member.name || '이름 없음'}</span>
                        {member.role && (
                            <span className="text-[10px] px-1.5 h-5 flex items-center bg-slate-50 text-slate-500 rounded-md">
                                {member.role}
                            </span>
                        )}
                    </div>
                    <div className="text-xs text-slate-400 truncate">{member.email}</div>
                </div>
            </div>
        </div>
    )
}
