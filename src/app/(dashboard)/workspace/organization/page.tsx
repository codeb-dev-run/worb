'use client'

import React, { useState, useEffect } from 'react'
import { DndContext, DragEndEvent, DragOverlay, closestCenter } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Users, UserPlus, Settings, Search, Lightbulb } from 'lucide-react'
import DepartmentColumn from '@/components/organization/DepartmentColumn'
import MemberCard from '@/components/organization/MemberCard'
import DepartmentManageModal from '@/components/organization/DepartmentManageModal'
import { customToast as toast } from '@/components/notification/NotificationToast'
import { useWorkspace } from '@/lib/workspace-context'

export default function OrganizationPage() {
    const { currentWorkspace, loading: workspaceLoading, departments, refreshDepartments } = useWorkspace()
    const [members, setMembers] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [activeMember, setActiveMember] = useState<any>(null)
    const [isDeptManageOpen, setIsDeptManageOpen] = useState(false)
    const [searchQuery, setSearchQuery] = useState('')

    useEffect(() => {
        if (currentWorkspace) {
            loadMembers()
        } else if (!workspaceLoading) {
            setLoading(false)
        }
    }, [currentWorkspace, workspaceLoading])

    const loadMembers = async () => {
        if (!currentWorkspace) return

        try {
            const response = await fetch(`/api/workspace/current/members?workspaceId=${currentWorkspace.id}`)
            const data = await response.json()
            setMembers(data)
        } catch (error) {
            console.error('Failed to load members:', error)
        } finally {
            setLoading(false)
        }
    }

    const handleDragEnd = async (event: DragEndEvent) => {
        const { active, over } = event

        if (!over || !currentWorkspace) return

        const memberId = active.id as string
        const newDepartment = over.id as string

        // 드롭 대상이 부서인지 확인 (departments 배열에 있는 id인지)
        const targetDept = departments.find(d => d.id === newDepartment)

        // Update UI optimistically
        setMembers(prev =>
            prev.map(m =>
                m.id === memberId ? {
                    ...m,
                    department: newDepartment,
                    departmentName: targetDept?.name || null,
                    departmentColor: targetDept?.color || null,
                } : m
            )
        )

        // Update DB (TeamMember 기반)
        try {
            await fetch(`/api/workspace/current/members/${memberId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    department: newDepartment,
                    workspaceId: currentWorkspace.id
                }),
            })
            toast.success('부서가 변경되었습니다')
        } catch (error) {
            console.error('Failed to update member department:', error)
            toast.error('부서 변경에 실패했습니다')
            loadMembers()
        }

        setActiveMember(null)
    }

    const getMembersByDepartment = (departmentId: string) => {
        return members.filter(m => m.department === departmentId)
    }

    const unassignedMembers = members.filter(m => !m.department)

    // 검색 필터링
    const filteredMembers = members.filter(m =>
        m.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        m.email?.toLowerCase().includes(searchQuery.toLowerCase())
    )

    if (workspaceLoading || loading) {
        return (
            <div className="flex items-center justify-center h-full min-h-[60vh]">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-lime-500 mx-auto mb-4"></div>
                    <p className="text-slate-500 font-medium">로딩 중...</p>
                </div>
            </div>
        )
    }

    if (!currentWorkspace) {
        return (
            <div className="flex items-center justify-center h-full min-h-[60vh]">
                <div className="text-center bg-white/70 backdrop-blur-xl border border-white/60 rounded-3xl p-12 shadow-xl">
                    <Users className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                    <h2 className="text-xl font-bold text-slate-900 mb-2">워크스페이스가 선택되지 않았습니다</h2>
                    <p className="text-slate-500">워크스페이스를 먼저 선택해주세요.</p>
                </div>
            </div>
        )
    }

    return (
        <div className="w-full space-y-6 pb-24 px-6 lg:px-8 xl:px-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="space-y-1">
                    <div className="flex items-center gap-2 text-slate-500 text-sm font-medium">
                        <Users className="w-4 h-4" />
                        <span>Workspace</span>
                    </div>
                    <h1 className="text-3xl font-bold tracking-tight text-slate-900">조직 관리</h1>
                    <p className="text-slate-500">팀원을 부서별로 관리합니다</p>
                </div>

                <div className="flex items-center gap-3">
                    <Button
                        variant="outline"
                        onClick={() => setIsDeptManageOpen(true)}
                        className="rounded-xl h-10 bg-white/70 backdrop-blur-sm border-white/60 hover:bg-white/90 hover:border-slate-200 transition-all"
                    >
                        <Settings className="w-4 h-4 mr-2" />
                        부서 관리
                    </Button>
                </div>
            </div>

            {/* 전체 드래그앤드롭 컨텍스트 */}
            <DndContext
                collisionDetection={closestCenter}
                onDragEnd={handleDragEnd}
                onDragStart={(event) => {
                    const member = members.find(m => m.id === event.active.id)
                    setActiveMember(member)
                }}
            >
                {/* 가입된 멤버 리스트 - Glass Morphism Card */}
                <div className="bg-white/70 backdrop-blur-2xl border border-white/50 rounded-[2rem] shadow-lg shadow-slate-200/50 overflow-hidden">
                    {/* Card Header */}
                    <div className="border-b border-slate-100/50 px-8 py-6">
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                            <div className="space-y-1">
                                <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                                    <UserPlus className="w-5 h-5 text-slate-400" />
                                    가입된 멤버 ({members.length}명)
                                </h2>
                                <p className="text-xs text-slate-500 font-medium flex items-center gap-1">
                                    <Lightbulb className="w-3 h-3" />
                                    멤버 카드를 드래그하여 아래 부서로 배정할 수 있습니다
                                </p>
                            </div>
                            <div className="relative w-64">
                                <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                                <Input
                                    placeholder="멤버 검색..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="pl-9 rounded-xl bg-white/50 border-slate-200 focus:bg-white focus:border-lime-400 transition-all"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Card Content */}
                    <div className="p-6 lg:p-8">
                        <SortableContext items={filteredMembers.map(m => m.id)} strategy={verticalListSortingStrategy}>
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4">
                                {filteredMembers.map(member => (
                                    <MemberCard key={member.id} member={member} showDepartment />
                                ))}
                            </div>
                        </SortableContext>
                        {filteredMembers.length === 0 && (
                            <div className="text-center py-12 text-slate-400">
                                {searchQuery ? '검색 결과가 없습니다' : '멤버가 없습니다'}
                            </div>
                        )}
                    </div>
                </div>

                {/* 부서별 조직도 */}
                <div className="space-y-4">
                    <h2 className="text-lg font-bold text-slate-900 px-2">부서별 조직도</h2>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-7 gap-4">
                        {departments.map(dept => (
                            <DepartmentColumn
                                key={dept.id}
                                department={dept}
                                members={getMembersByDepartment(dept.id)}
                            />
                        ))}
                    </div>
                </div>

                <DragOverlay>
                    {activeMember ? (
                        <MemberCard member={activeMember} isDragging />
                    ) : null}
                </DragOverlay>
            </DndContext>

            {/* 미배정 멤버 - Glass Morphism Style */}
            {unassignedMembers.length > 0 && (
                <div className="bg-amber-50/70 backdrop-blur-xl border border-amber-200/50 rounded-3xl p-6 shadow-lg">
                    <h3 className="font-bold text-amber-800 mb-2 flex items-center gap-2">
                        <Users className="w-5 h-5" />
                        부서 미배정 멤버 ({unassignedMembers.length}명)
                    </h3>
                    <p className="text-sm text-amber-700 mb-4">
                        아래 멤버들을 위 부서로 드래그하여 배정해주세요
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-3">
                        {unassignedMembers.map(member => (
                            <MemberCard key={member.id} member={member} />
                        ))}
                    </div>
                </div>
            )}

            {/* Footer Tip - Glass Morphism Style */}
            <div className="bg-slate-50/70 backdrop-blur-xl border border-slate-200/50 rounded-2xl p-4 flex items-start gap-3 text-slate-600 text-sm shadow-sm">
                <div className="mt-0.5 bg-slate-100 p-1.5 rounded-full">
                    <Lightbulb className="w-3.5 h-3.5 text-slate-500" />
                </div>
                <p>
                    <span className="font-bold text-slate-800">Tip:</span> 멤버 카드를 드래그하여 다른 부서로 이동할 수 있습니다.
                    칸반, 간트, 마인드맵에서 담당자를 지정할 때 부서별로 그룹화되어 표시됩니다.
                </p>
            </div>

            {/* 부서 관리 모달 */}
            <DepartmentManageModal
                isOpen={isDeptManageOpen}
                onClose={() => setIsDeptManageOpen(false)}
            />
        </div>
    )
}
