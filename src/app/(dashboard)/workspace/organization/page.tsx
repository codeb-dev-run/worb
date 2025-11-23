'use client'

import React, { useState, useEffect } from 'react'
import { DndContext, DragEndEvent, DragOverlay, closestCenter } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Plus, Users, Mail, UserPlus, Settings } from 'lucide-react'
import DepartmentColumn from '@/components/organization/DepartmentColumn'
import MemberCard from '@/components/organization/MemberCard'
import DepartmentManageModal from '@/components/organization/DepartmentManageModal'
import { toast } from 'react-hot-toast'

const DEPARTMENTS = [
    { id: 'planning', name: '기획', color: '#8B5CF6' },
    { id: 'development', name: '개발', color: '#3B82F6' },
    { id: 'design', name: '디자인', color: '#EC4899' },
    { id: 'operations', name: '운영', color: '#10B981' },
    { id: 'marketing', name: '마케팅', color: '#F59E0B' },
]

export default function OrganizationPage() {
    const [members, setMembers] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [activeMember, setActiveMember] = useState<any>(null)
    const [inviteEmail, setInviteEmail] = useState('')
    const [inviteName, setInviteName] = useState('')
    const [isInviteOpen, setIsInviteOpen] = useState(false)
    const [isDeptManageOpen, setIsDeptManageOpen] = useState(false)
    const [sending, setSending] = useState(false)

    useEffect(() => {
        loadMembers()
    }, [])

    const loadMembers = async () => {
        try {
            const response = await fetch('/api/workspace/current/members')
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

        if (!over) return

        const memberId = active.id as string
        const newDepartment = over.id as string

        // Update UI optimistically
        setMembers(prev =>
            prev.map(m =>
                m.id === memberId ? { ...m, department: newDepartment } : m
            )
        )

        // Update DB
        try {
            await fetch(`/api/workspace/current/members/${memberId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ department: newDepartment }),
            })
            toast.success('부서가 변경되었습니다')
        } catch (error) {
            console.error('Failed to update member department:', error)
            toast.error('부서 변경에 실패했습니다')
            // Revert on error
            loadMembers()
        }

        setActiveMember(null)
    }

    const handleInvite = async () => {
        if (!inviteEmail || !inviteName) {
            toast.error('이메일과 이름을 입력해주세요')
            return
        }

        setSending(true)
        try {
            const response = await fetch('/api/workspace/current/invite', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    email: inviteEmail,
                    name: inviteName,
                }),
            })

            if (!response.ok) throw new Error('Failed to send invite')

            toast.success('초대 이메일이 발송되었습니다')
            setInviteEmail('')
            setInviteName('')
            setIsInviteOpen(false)
        } catch (error) {
            console.error('Failed to send invite:', error)
            toast.error('초대 발송에 실패했습니다')
        } finally {
            setSending(false)
        }
    }

    const getMembersByDepartment = (departmentId: string) => {
        return members.filter(m => m.department === departmentId)
    }

    const unassignedMembers = members.filter(m => !m.department)

    if (loading) {
        return <div className="flex items-center justify-center h-full">로딩 중...</div>
    }

    return (
        <div className="p-6 space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold flex items-center gap-2">
                        <Users className="w-6 h-6" />
                        조직 관리
                    </h1>
                    <p className="text-gray-500">팀원을 부서별로 관리합니다</p>
                </div>

                <div className="flex gap-2">
                    <Button variant="outline" onClick={() => setIsDeptManageOpen(true)}>
                        <Settings className="w-4 h-4 mr-2" />
                        부서 관리
                    </Button>

                    <Dialog open={isInviteOpen} onOpenChange={setIsInviteOpen}>
                        <DialogTrigger asChild>
                            <Button>
                                <Mail className="w-4 h-4 mr-2" />
                                멤버 초대
                            </Button>
                        </DialogTrigger>
                        <DialogContent>
                            <DialogHeader>
                                <DialogTitle>멤버 초대</DialogTitle>
                                <DialogDescription>
                                    이메일로 새로운 팀원을 초대합니다
                                </DialogDescription>
                            </DialogHeader>
                            <div className="space-y-4 py-4">
                                <div className="space-y-2">
                                    <Label htmlFor="name">이름</Label>
                                    <Input
                                        id="name"
                                        placeholder="홍길동"
                                        value={inviteName}
                                        onChange={(e) => setInviteName(e.target.value)}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="email">이메일</Label>
                                    <Input
                                        id="email"
                                        type="email"
                                        placeholder="example@company.com"
                                        value={inviteEmail}
                                        onChange={(e) => setInviteEmail(e.target.value)}
                                    />
                                </div>
                                <Button
                                    onClick={handleInvite}
                                    disabled={sending}
                                    className="w-full"
                                >
                                    {sending ? '발송 중...' : '초대 이메일 발송'}
                                </Button>
                            </div>
                        </DialogContent>
                    </Dialog>
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
                {/* 가입된 멤버 리스트 */}
                <div className="bg-white border rounded-lg p-4">
                    <h2 className="font-semibold mb-3 flex items-center gap-2">
                        <UserPlus className="w-5 h-5" />
                        가입된 멤버 ({members.length}명)
                    </h2>
                    <p className="text-sm text-gray-500 mb-3">
                        💡 멤버 카드를 드래그하여 아래 부서로 배정할 수 있습니다
                    </p>
                    <SortableContext items={members.map(m => m.id)} strategy={verticalListSortingStrategy}>
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                            {members.map(member => (
                                <MemberCard key={member.id} member={member} showDepartment />
                            ))}
                        </div>
                    </SortableContext>
                </div>

                {/* 부서별 조직도 */}
                <div>
                    <h2 className="font-semibold mb-3">부서별 조직도</h2>
                    <div className="grid grid-cols-5 gap-4">
                        {DEPARTMENTS.map(dept => (
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

            {/* 미배정 멤버 */}
            {
                unassignedMembers.length > 0 && (
                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                        <h3 className="font-semibold text-yellow-800 mb-2">
                            부서 미배정 멤버 ({unassignedMembers.length}명)
                        </h3>
                        <p className="text-sm text-yellow-700 mb-3">
                            아래 멤버들을 위 부서로 드래그하여 배정해주세요
                        </p>
                        <div className="grid grid-cols-3 gap-2">
                            {unassignedMembers.map(member => (
                                <MemberCard key={member.id} member={member} />
                            ))}
                        </div>
                    </div>
                )
            }

            <div className="mt-6 p-4 bg-gray-50 rounded-lg">
                <div className="text-sm text-gray-600">
                    💡 <strong>Tip:</strong> 멤버 카드를 드래그하여 다른 부서로 이동할 수 있습니다.
                    칸반, 간트, 마인드맵에서 담당자를 지정할 때 부서별로 그룹화되어 표시됩니다.
                </div>
            </div>

            {/* 부서 관리 모달 */}
            <DepartmentManageModal
                isOpen={isDeptManageOpen}
                onClose={() => setIsDeptManageOpen(false)}
                departments={DEPARTMENTS}
                onUpdate={loadMembers}
            />
        </div >
    )
}
