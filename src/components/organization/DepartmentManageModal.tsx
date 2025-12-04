'use client'

import React, { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Edit2, Trash2, Plus, Save, X, Settings, Palette, Loader2 } from 'lucide-react'
import { customToast as toast } from '@/components/notification/NotificationToast'
import { useWorkspace, Department } from '@/lib/workspace-context'

interface DepartmentManageModalProps {
    isOpen: boolean
    onClose: () => void
}

export default function DepartmentManageModal({
    isOpen,
    onClose,
}: DepartmentManageModalProps) {
    const { currentWorkspace, departments, refreshDepartments, isAdmin } = useWorkspace()
    const [editingId, setEditingId] = useState<string | null>(null)
    const [editName, setEditName] = useState('')
    const [editColor, setEditColor] = useState('')
    const [newName, setNewName] = useState('')
    const [newColor, setNewColor] = useState('#3B82F6')
    const [loading, setLoading] = useState(false)

    // 모달이 열릴 때 데이터 새로고침
    useEffect(() => {
        if (isOpen) {
            refreshDepartments()
        }
    }, [isOpen])

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

        if (!currentWorkspace?.id || !editingId) return

        setLoading(true)
        try {
            const response = await fetch(`/api/workspace/${currentWorkspace.id}/teams/${editingId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: editName.trim(), color: editColor }),
            })

            if (!response.ok) {
                const error = await response.json()
                throw new Error(error.error || 'Failed to update department')
            }

            toast.success('부서가 수정되었습니다')
            setEditingId(null)
            await refreshDepartments()
        } catch (error) {
            toast.error(error instanceof Error ? error.message : '부서 수정에 실패했습니다')
        } finally {
            setLoading(false)
        }
    }

    const handleDelete = async (id: string) => {
        if (!confirm('이 부서를 삭제하시겠습니까? 부서에 속한 멤버는 미배정 상태가 됩니다.')) {
            return
        }

        if (!currentWorkspace?.id) return

        setLoading(true)
        try {
            const response = await fetch(`/api/workspace/${currentWorkspace.id}/teams/${id}`, {
                method: 'DELETE',
            })

            if (!response.ok) {
                const error = await response.json()
                throw new Error(error.error || 'Failed to delete department')
            }

            toast.success('부서가 삭제되었습니다')
            await refreshDepartments()
        } catch (error) {
            toast.error(error instanceof Error ? error.message : '부서 삭제에 실패했습니다')
        } finally {
            setLoading(false)
        }
    }

    const handleAdd = async () => {
        if (!newName.trim()) {
            toast.error('부서 이름을 입력해주세요')
            return
        }

        if (!currentWorkspace?.id) return

        setLoading(true)
        try {
            const response = await fetch(`/api/workspace/${currentWorkspace.id}/teams`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: newName.trim(), color: newColor }),
            })

            if (!response.ok) {
                const error = await response.json()
                throw new Error(error.error || 'Failed to create department')
            }

            toast.success('부서가 추가되었습니다')
            setNewName('')
            setNewColor('#3B82F6')
            await refreshDepartments()
        } catch (error) {
            toast.error(error instanceof Error ? error.message : '부서 추가에 실패했습니다')
        } finally {
            setLoading(false)
        }
    }

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-2xl bg-white/95 backdrop-blur-2xl border-white/60 rounded-3xl shadow-2xl">
                <DialogHeader className="pb-4 border-b border-slate-100/50">
                    <DialogTitle className="text-xl font-bold text-slate-900 flex items-center gap-2">
                        <div className="p-2 bg-slate-100 rounded-xl">
                            <Settings className="w-5 h-5 text-slate-600" />
                        </div>
                        부서 관리
                    </DialogTitle>
                    <DialogDescription className="text-slate-500">
                        부서를 추가, 수정, 삭제할 수 있습니다
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-6 py-4">
                    {/* 기존 부서 목록 */}
                    <div className="space-y-3">
                        <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2">
                            <Palette className="w-4 h-4 text-slate-400" />
                            기존 부서 ({departments.length}개)
                        </h3>
                        <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
                            {departments.map(dept => (
                                <div
                                    key={dept.id}
                                    className={`
                                        flex items-center gap-3 p-4 rounded-2xl transition-all duration-300
                                        ${editingId === dept.id
                                            ? 'bg-lime-50/80 border-2 border-lime-300 shadow-lg shadow-lime-100'
                                            : 'bg-white/70 border border-slate-100 hover:border-slate-200 hover:shadow-md'
                                        }
                                    `}
                                >
                                    {editingId === dept.id ? (
                                        <>
                                            <div className="relative">
                                                <input
                                                    type="color"
                                                    value={editColor}
                                                    onChange={(e) => setEditColor(e.target.value)}
                                                    className="w-12 h-12 rounded-xl cursor-pointer border-2 border-white shadow-md"
                                                />
                                            </div>
                                            <Input
                                                value={editName}
                                                onChange={(e) => setEditName(e.target.value)}
                                                className="flex-1 rounded-xl bg-white border-slate-200 focus:border-lime-400 focus:ring-lime-400/20"
                                                placeholder="부서 이름"
                                                disabled={loading}
                                            />
                                            <Button
                                                size="sm"
                                                onClick={handleSaveEdit}
                                                disabled={loading}
                                                className="rounded-xl bg-lime-500 hover:bg-lime-600 text-white font-medium shadow-lg shadow-lime-500/30"
                                            >
                                                {loading ? (
                                                    <Loader2 className="w-4 h-4 animate-spin" />
                                                ) : (
                                                    <>
                                                        <Save className="w-4 h-4 mr-1.5" />
                                                        저장
                                                    </>
                                                )}
                                            </Button>
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                onClick={() => setEditingId(null)}
                                                disabled={loading}
                                                className="rounded-xl border-slate-200 hover:bg-slate-50"
                                            >
                                                <X className="w-4 h-4" />
                                            </Button>
                                        </>
                                    ) : (
                                        <>
                                            <div
                                                className="w-12 h-12 rounded-xl shadow-md border-2 border-white flex items-center justify-center text-white font-bold text-lg"
                                                style={{ backgroundColor: dept.color }}
                                            >
                                                {dept.name[0]}
                                            </div>
                                            <div className="flex-1">
                                                <div className="font-bold text-slate-900">{dept.name}</div>
                                                <div className="text-xs text-slate-400 font-medium">{dept.color}</div>
                                            </div>
                                            {isAdmin && (
                                                <>
                                                    <Button
                                                        size="sm"
                                                        variant="outline"
                                                        onClick={() => handleEdit(dept)}
                                                        disabled={loading}
                                                        className="rounded-xl border-slate-200 hover:border-lime-300 hover:bg-lime-50 hover:text-lime-600 transition-all"
                                                    >
                                                        <Edit2 className="w-4 h-4 mr-1.5" />
                                                        수정
                                                    </Button>
                                                    <Button
                                                        size="sm"
                                                        variant="outline"
                                                        onClick={() => handleDelete(dept.id)}
                                                        disabled={loading}
                                                        className="rounded-xl border-slate-200 hover:border-rose-300 hover:bg-rose-50 hover:text-rose-600 transition-all"
                                                    >
                                                        <Trash2 className="w-4 h-4 mr-1.5" />
                                                        삭제
                                                    </Button>
                                                </>
                                            )}
                                        </>
                                    )}
                                </div>
                            ))}
                            {departments.length === 0 && (
                                <div className="text-center py-8 text-slate-400">
                                    <Palette className="w-12 h-12 mx-auto mb-3 text-slate-200" />
                                    <p className="font-medium">등록된 부서가 없습니다</p>
                                    <p className="text-sm mt-1">아래에서 새 부서를 추가해보세요</p>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* 새 부서 추가 - 관리자만 */}
                    {isAdmin && (
                        <div className="space-y-4 pt-4 border-t border-slate-100/50">
                            <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2">
                                <Plus className="w-4 h-4 text-lime-500" />
                                새 부서 추가
                            </h3>
                            <div className="flex items-end gap-4 p-4 bg-slate-50/70 rounded-2xl border border-slate-100">
                                <div className="space-y-2">
                                    <Label className="text-xs font-bold text-slate-500 uppercase tracking-wider">색상</Label>
                                    <div className="relative">
                                        <input
                                            type="color"
                                            value={newColor}
                                            onChange={(e) => setNewColor(e.target.value)}
                                            className="w-14 h-12 rounded-xl cursor-pointer border-2 border-white shadow-md"
                                        />
                                    </div>
                                </div>
                                <div className="flex-1 space-y-2">
                                    <Label className="text-xs font-bold text-slate-500 uppercase tracking-wider">부서 이름</Label>
                                    <Input
                                        value={newName}
                                        onChange={(e) => setNewName(e.target.value)}
                                        placeholder="예: 인사팀, 총무팀"
                                        className="rounded-xl bg-white border-slate-200 focus:border-lime-400 focus:ring-lime-400/20 h-12"
                                        onKeyDown={(e) => e.key === 'Enter' && !loading && handleAdd()}
                                        disabled={loading}
                                    />
                                </div>
                                <Button
                                    onClick={handleAdd}
                                    disabled={loading}
                                    className="rounded-xl h-12 px-6 bg-slate-900 text-lime-400 hover:bg-lime-400 hover:text-slate-900 transition-colors font-bold shadow-lg shadow-slate-900/10"
                                >
                                    {loading ? (
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                    ) : (
                                        <>
                                            <Plus className="w-4 h-4 mr-1.5" />
                                            추가
                                        </>
                                    )}
                                </Button>
                            </div>
                        </div>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    )
}
