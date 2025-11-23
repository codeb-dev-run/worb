'use client'

import React from 'react'
import { useDroppable } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import MemberCard from './MemberCard'

interface DepartmentColumnProps {
    department: {
        id: string
        name: string
        color: string
    }
    members: any[]
}

export default function DepartmentColumn({ department, members }: DepartmentColumnProps) {
    const { setNodeRef, isOver } = useDroppable({
        id: department.id,
    })

    return (
        <div
            ref={setNodeRef}
            className={`bg-white border-2 rounded-lg p-4 transition-colors ${isOver ? 'border-blue-500 bg-blue-50' : 'border-gray-200'
                }`}
        >
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                    <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: department.color }}
                    />
                    <h3 className="font-semibold">{department.name}</h3>
                </div>
                <span className="text-sm text-gray-500">{members.length}명</span>
            </div>

            <SortableContext
                items={members.map(m => m.id)}
                strategy={verticalListSortingStrategy}
            >
                <div className="space-y-2 min-h-[200px]">
                    {members.map(member => (
                        <MemberCard key={member.id} member={member} />
                    ))}
                    {members.length === 0 && (
                        <div className="flex items-center justify-center h-32 text-gray-400 text-sm">
                            멤버 없음
                        </div>
                    )}
                </div>
            </SortableContext>
        </div>
    )
}
