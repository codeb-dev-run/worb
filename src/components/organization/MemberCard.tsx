'use client'

import React from 'react'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { User, Mail } from 'lucide-react'

interface MemberCardProps {
    member: any
    isDragging?: boolean
    showDepartment?: boolean
}

const DEPARTMENTS = [
    { id: 'planning', name: '기획', color: '#8B5CF6' },
    { id: 'development', name: '개발', color: '#3B82F6' },
    { id: 'design', name: '디자인', color: '#EC4899' },
    { id: 'operations', name: '운영', color: '#10B981' },
    { id: 'marketing', name: '마케팅', color: '#F59E0B' },
]

export default function MemberCard({ member, isDragging = false, showDepartment = false }: MemberCardProps) {
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

    // Get department color or use default gradient
    const department = DEPARTMENTS.find(d => d.id === member.department)
    const avatarStyle = department
        ? { backgroundColor: department.color }
        : { background: 'linear-gradient(135deg, #3B82F6 0%, #8B5CF6 100%)' }

    // Compact layout for member list
    if (showDepartment) {
        return (
            <div
                ref={setNodeRef}
                style={style}
                {...attributes}
                {...listeners}
                className={`flex items-center gap-2 p-2 border rounded cursor-move hover:shadow-md transition-shadow ${isDragging ? 'shadow-lg rotate-2' : ''
                    }`}
            >
                <div
                    className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-semibold"
                    style={avatarStyle}
                >
                    {member.name?.[0] || 'U'}
                </div>
                <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate">{member.name || '이름 없음'}</div>
                    <div className="text-xs text-gray-500 truncate">{member.email}</div>
                </div>
                {member.department && (
                    <div className="text-xs px-2 py-0.5 bg-blue-100 text-blue-700 rounded">
                        {DEPARTMENTS.find(d => d.id === member.department)?.name || member.department}
                    </div>
                )}
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
            className={`bg-white border rounded-lg p-3 cursor-move hover:shadow-md transition-shadow ${isDragging ? 'shadow-lg rotate-2' : ''
                }`}
        >
            <div className="flex items-start gap-3">
                <div
                    className="w-10 h-10 rounded-full flex items-center justify-center text-white font-semibold"
                    style={avatarStyle}
                >
                    {member.name?.[0] || <User className="w-5 h-5" />}
                </div>
                <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm truncate">{member.name || '이름 없음'}</div>
                    <div className="text-xs text-gray-500 flex items-center gap-1 truncate">
                        <Mail className="w-3 h-3" />
                        {member.email}
                    </div>
                    {member.role && (
                        <div className="mt-1 text-xs text-gray-600 bg-gray-100 px-2 py-0.5 rounded inline-block">
                            {member.role}
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}
