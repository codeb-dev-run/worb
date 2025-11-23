'use client'

import React, { useState } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Edit2, Trash2, Plus, Save, X } from 'lucide-react'
import { toast } from 'react-hot-toast'

interface Department {
    id: string
    name: string
    color: string
}

interface DepartmentManageModalProps {
    isOpen: boolean
    onClose: () => void
    departments: Department[]
    onUpdate: () => void
}

export default function DepartmentManageModal({
    isOpen,
    onClose,
    departments: initialDepartments,
    onUpdate,
}: DepartmentManageModalProps) {
    const [departments, setDepartments] = useState<Department[]>(initialDepartments)
    const [editingId, setEditingId] = useState<string | null>(null)
    const [editName, setEditName] = useState('')
    const [editColor, setEditColor] = useState('')
    const [newName, setNewName] = useState('')
    const [newColor, setNewColor] = useState('#3B82F6')

    const handleEdit = (dept: Department) => {
        setEditingId(dept.id)
        setEditName(dept.name)
        setEditColor(dept.color)
    }

    const handleSaveEdit = async () => {
        if (!editName.trim()) {
            toast.error('부서 이름을 입력해주세요')
            return
        }

        try {
            // TODO: API call to update department
            setDepartments(prev =>
                prev.map(d => (d.id === editingId ? { ...d, name: editName, color: editColor } : d))
            )
            toast.success('부서가 수정되었습니다')
            setEditingId(null)
            onUpdate()
        } catch (error) {
            toast.error('부서 수정에 실패했습니다')
        }
    }

    const handleDelete = async (id: string) => {
        if (!confirm('이 부서를 삭제하시겠습니까? 부서에 속한 멤버는 미배정 상태가 됩니다.')) {
            return
        }

        try {
            // TODO: API call to delete department
            setDepartments(prev => prev.filter(d => d.id !== id))
            toast.success('부서가 삭제되었습니다')
            onUpdate()
        } catch (error) {
            toast.error('부서 삭제에 실패했습니다')
        }
    }

    const handleAdd = async () => {
        if (!newName.trim()) {
            toast.error('부서 이름을 입력해주세요')
            return
        }

        try {
            // TODO: API call to create department
            const newDept: Department = {
                id: `dept-${Date.now()}`,
                name: newName,
                color: newColor,
            }
            setDepartments(prev => [...prev, newDept])
            toast.success('부서가 추가되었습니다')
            setNewName('')
            setNewColor('#3B82F6')
            onUpdate()
        } catch (error) {
            toast.error('부서 추가에 실패했습니다')
        }
    }

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-2xl">
                <DialogHeader>
                    <DialogTitle>부서 관리</DialogTitle>
                    <DialogDescription>
                        부서를 추가, 수정, 삭제할 수 있습니다
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-6 py-4">
                    {/* 기존 부서 목록 */}
                    <div className="space-y-3">
                        <h3 className="font-semibold">기존 부서</h3>
                        <div className="space-y-2">
                            {departments.map(dept => (
                                <div
                                    key={dept.id}
                                    className="flex items-center gap-3 p-3 border rounded-lg hover:bg-gray-50"
                                >
                                    {editingId === dept.id ? (
                                        <>
                                            <input
                                                type="color"
                                                value={editColor}
                                                onChange={(e) => setEditColor(e.target.value)}
                                                className="w-10 h-10 rounded cursor-pointer"
                                            />
                                            <Input
                                                value={editName}
                                                onChange={(e) => setEditName(e.target.value)}
                                                className="flex-1"
                                                placeholder="부서 이름"
                                            />
                                            <Button size="sm" onClick={handleSaveEdit}>
                                                <Save className="w-4 h-4 mr-1" />
                                                저장
                                            </Button>
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                onClick={() => setEditingId(null)}
                                            >
                                                <X className="w-4 h-4" />
                                            </Button>
                                        </>
                                    ) : (
                                        <>
                                            <div
                                                className="w-10 h-10 rounded"
                                                style={{ backgroundColor: dept.color }}
                                            />
                                            <div className="flex-1">
                                                <div className="font-medium">{dept.name}</div>
                                            </div>
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                onClick={() => handleEdit(dept)}
                                            >
                                                <Edit2 className="w-4 h-4 mr-1" />
                                                수정
                                            </Button>
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                onClick={() => handleDelete(dept.id)}
                                            >
                                                <Trash2 className="w-4 h-4 mr-1" />
                                                삭제
                                            </Button>
                                        </>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* 새 부서 추가 */}
                    <div className="space-y-3 pt-4 border-t">
                        <h3 className="font-semibold">새 부서 추가</h3>
                        <div className="flex items-end gap-3">
                            <div className="space-y-2">
                                <Label>색상</Label>
                                <input
                                    type="color"
                                    value={newColor}
                                    onChange={(e) => setNewColor(e.target.value)}
                                    className="w-20 h-10 rounded cursor-pointer"
                                />
                            </div>
                            <div className="flex-1 space-y-2">
                                <Label>부서 이름</Label>
                                <Input
                                    value={newName}
                                    onChange={(e) => setNewName(e.target.value)}
                                    placeholder="예: 인사팀, 총무팀"
                                />
                            </div>
                            <Button onClick={handleAdd}>
                                <Plus className="w-4 h-4 mr-1" />
                                추가
                            </Button>
                        </div>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    )
}
