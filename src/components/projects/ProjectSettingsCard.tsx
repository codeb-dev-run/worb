'use client'

import React, { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
    Settings,
    Save,
    Loader2,
    Target,
    Sparkles,
    Zap,
    AlertCircle,
    CheckCircle2,
    Clock,
    TrendingUp,
    Trash2,
    AlertTriangle,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { updateProject, deleteProject } from '@/actions/project'
import toast from 'react-hot-toast'
import { useRouter } from 'next/navigation'
import { Input } from '@/components/ui/input'

interface ProjectSettingsCardProps {
    projectId: string
    projectName: string
    initialProgress: number
    initialStatus: string
    initialPriority: string
    onUpdate?: () => void
}

const statusOptions = [
    { value: 'planning', label: '기획', icon: Target, color: 'violet' },
    { value: 'design', label: '디자인', icon: Sparkles, color: 'pink' },
    { value: 'development', label: '개발', icon: Zap, color: 'blue' },
    { value: 'testing', label: '테스트', icon: AlertCircle, color: 'amber' },
    { value: 'completed', label: '완료', icon: CheckCircle2, color: 'emerald' },
    { value: 'pending', label: '대기', icon: Clock, color: 'slate' },
]

const priorityOptions = [
    { value: 'low', label: '낮음', color: 'slate' },
    { value: 'medium', label: '보통', color: 'amber' },
    { value: 'high', label: '높음', color: 'orange' },
    { value: 'urgent', label: '긴급', color: 'red' },
]

const getStatusColor = (color: string) => {
    const colors: Record<string, { bg: string; text: string; ring: string }> = {
        violet: { bg: 'bg-violet-100', text: 'text-violet-700', ring: 'ring-violet-400' },
        pink: { bg: 'bg-pink-100', text: 'text-pink-700', ring: 'ring-pink-400' },
        blue: { bg: 'bg-blue-100', text: 'text-blue-700', ring: 'ring-blue-400' },
        amber: { bg: 'bg-amber-100', text: 'text-amber-700', ring: 'ring-amber-400' },
        emerald: { bg: 'bg-emerald-100', text: 'text-emerald-700', ring: 'ring-emerald-400' },
        slate: { bg: 'bg-slate-100', text: 'text-slate-700', ring: 'ring-slate-400' },
    }
    return colors[color] || colors.slate
}

const getPriorityColor = (color: string) => {
    const colors: Record<string, { bg: string; text: string; ring: string }> = {
        slate: { bg: 'bg-slate-100', text: 'text-slate-600', ring: 'ring-slate-400' },
        amber: { bg: 'bg-amber-100', text: 'text-amber-700', ring: 'ring-amber-400' },
        orange: { bg: 'bg-orange-100', text: 'text-orange-700', ring: 'ring-orange-400' },
        red: { bg: 'bg-red-100', text: 'text-red-700', ring: 'ring-red-400' },
    }
    return colors[color] || colors.slate
}

export default function ProjectSettingsCard({
    projectId,
    projectName,
    initialProgress,
    initialStatus,
    initialPriority,
    onUpdate,
}: ProjectSettingsCardProps) {
    const router = useRouter()
    const [status, setStatus] = useState(initialStatus)
    const [priority, setPriority] = useState(initialPriority || 'medium')
    const [saving, setSaving] = useState(false)
    const [hasChanges, setHasChanges] = useState(false)

    // 삭제 관련 상태
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
    const [deleteConfirmText, setDeleteConfirmText] = useState('')
    const [deleting, setDeleting] = useState(false)

    useEffect(() => {
        const changed =
            status !== initialStatus ||
            priority !== (initialPriority || 'medium')
        setHasChanges(changed)
    }, [status, priority, initialStatus, initialPriority])

    const handleSave = async () => {
        setSaving(true)
        try {
            const result = await updateProject(projectId, {
                status: status as any,
                priority: priority as any,
            })

            if (result.success) {
                toast.success('프로젝트 설정이 저장되었습니다.')
                setHasChanges(false)
                onUpdate?.()
            } else {
                toast.error('설정 저장에 실패했습니다.')
            }
        } catch (error) {
            toast.error('설정 저장 중 오류가 발생했습니다.')
        } finally {
            setSaving(false)
        }
    }

    const handleDelete = async () => {
        if (deleteConfirmText !== projectName) {
            toast.error('프로젝트명이 일치하지 않습니다.')
            return
        }

        setDeleting(true)
        try {
            const result = await deleteProject(projectId)
            if (result.success) {
                toast.success('프로젝트가 삭제되었습니다.')
                router.push('/projects')
            } else {
                toast.error('프로젝트 삭제에 실패했습니다.')
            }
        } catch (error) {
            toast.error('프로젝트 삭제 중 오류가 발생했습니다.')
        } finally {
            setDeleting(false)
        }
    }

    const handleCancelDelete = () => {
        setShowDeleteConfirm(false)
        setDeleteConfirmText('')
    }

    const getProgressColor = () => {
        if (initialProgress >= 80) return 'bg-emerald-500'
        if (initialProgress >= 50) return 'bg-lime-500'
        if (initialProgress >= 30) return 'bg-amber-500'
        return 'bg-slate-400'
    }

    const getProgressLabel = () => {
        if (initialProgress >= 80) return '거의 완료'
        if (initialProgress >= 50) return '절반 이상'
        if (initialProgress >= 30) return '진행 중'
        return '시작 단계'
    }

    return (
        <Card className="bg-white/60 backdrop-blur-xl border-white/40 shadow-xl rounded-3xl overflow-hidden">
            <CardHeader className="pb-4">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center">
                            <Settings className="w-5 h-5 text-slate-600" />
                        </div>
                        <div>
                            <CardTitle className="text-lg font-bold text-slate-900">프로젝트 설정</CardTitle>
                            <p className="text-xs text-slate-500">진행 현황 및 상태를 관리합니다</p>
                        </div>
                    </div>
                    <Button
                        onClick={handleSave}
                        disabled={saving || !hasChanges}
                        className={cn(
                            "rounded-xl font-bold gap-2 transition-all",
                            hasChanges
                                ? "bg-lime-500 hover:bg-lime-600 text-black"
                                : "bg-slate-200 text-slate-400 cursor-not-allowed"
                        )}
                    >
                        {saving ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                            <Save className="h-4 w-4" />
                        )}
                        저장
                    </Button>
                </div>
            </CardHeader>
            <CardContent className="space-y-6">
                {/* Progress Display (Read-only) */}
                <div className="space-y-3">
                    <div className="flex items-center justify-between">
                        <label className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                            <TrendingUp className="w-4 h-4 text-lime-500" />
                            진행률
                        </label>
                        <div className="flex items-center gap-2">
                            <Badge className={cn("rounded-lg text-xs", getProgressColor(), "text-white")}>
                                {getProgressLabel()}
                            </Badge>
                            <span className="text-2xl font-black text-slate-900">{initialProgress}%</span>
                        </div>
                    </div>
                    <div className="relative h-3 bg-slate-200 rounded-full overflow-hidden">
                        <div
                            className="h-full bg-gradient-to-r from-lime-400 to-emerald-500 transition-all duration-500"
                            style={{ width: `${initialProgress}%` }}
                        />
                    </div>
                    <p className="text-xs text-slate-500">
                        작업 완료율에 따라 자동으로 계산됩니다
                    </p>
                </div>

                {/* Status Selection */}
                <div className="space-y-3">
                    <label className="text-sm font-semibold text-slate-700">프로젝트 상태</label>
                    <div className="grid grid-cols-3 gap-2">
                        {statusOptions.map((option) => {
                            const colors = getStatusColor(option.color)
                            const Icon = option.icon
                            const isSelected = status === option.value
                            return (
                                <button
                                    key={option.value}
                                    type="button"
                                    onClick={() => setStatus(option.value)}
                                    className={cn(
                                        "flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm font-medium transition-all",
                                        isSelected
                                            ? cn(colors.bg, colors.text, "ring-2", colors.ring)
                                            : "bg-white/60 border border-slate-200 text-slate-600 hover:bg-slate-50"
                                    )}
                                >
                                    <Icon className="w-4 h-4" />
                                    {option.label}
                                </button>
                            )
                        })}
                    </div>
                </div>

                {/* Priority Selection */}
                <div className="space-y-3">
                    <label className="text-sm font-semibold text-slate-700">우선순위</label>
                    <div className="flex gap-2">
                        {priorityOptions.map((option) => {
                            const colors = getPriorityColor(option.color)
                            const isSelected = priority === option.value
                            return (
                                <button
                                    key={option.value}
                                    type="button"
                                    onClick={() => setPriority(option.value)}
                                    className={cn(
                                        "flex-1 px-3 py-2.5 rounded-xl text-sm font-medium transition-all",
                                        isSelected
                                            ? cn(colors.bg, colors.text, "ring-2", colors.ring)
                                            : "bg-white/60 border border-slate-200 text-slate-600 hover:bg-slate-50"
                                    )}
                                >
                                    {option.label}
                                </button>
                            )
                        })}
                    </div>
                </div>

                {/* Change Indicator */}
                {hasChanges && (
                    <div className="flex items-center gap-2 p-3 bg-amber-50 border border-amber-200 rounded-xl">
                        <AlertCircle className="w-4 h-4 text-amber-600" />
                        <span className="text-sm text-amber-700">변경사항이 있습니다. 저장 버튼을 눌러주세요.</span>
                    </div>
                )}

                {/* Danger Zone - 프로젝트 삭제 */}
                <div className="pt-6 mt-6 border-t border-red-200">
                    <div className="space-y-4">
                        <div className="flex items-center gap-2">
                            <AlertTriangle className="w-5 h-5 text-red-500" />
                            <h3 className="text-sm font-bold text-red-600">위험 영역</h3>
                        </div>

                        {!showDeleteConfirm ? (
                            <div className="p-4 bg-red-50 border border-red-200 rounded-xl space-y-3">
                                <div>
                                    <p className="text-sm font-medium text-red-700">프로젝트 삭제</p>
                                    <p className="text-xs text-red-600 mt-1">
                                        이 작업은 되돌릴 수 없습니다. 모든 작업, 파일, 댓글이 영구 삭제됩니다.
                                    </p>
                                </div>
                                <Button
                                    variant="outline"
                                    onClick={() => setShowDeleteConfirm(true)}
                                    className="w-full border-red-300 text-red-600 hover:bg-red-100 hover:text-red-700 rounded-xl"
                                >
                                    <Trash2 className="w-4 h-4 mr-2" />
                                    프로젝트 삭제
                                </Button>
                            </div>
                        ) : (
                            <div className="p-4 bg-red-50 border-2 border-red-300 rounded-xl space-y-4">
                                <div className="flex items-start gap-3">
                                    <AlertTriangle className="w-5 h-5 text-red-500 mt-0.5 flex-shrink-0" />
                                    <div>
                                        <p className="text-sm font-bold text-red-700">정말로 삭제하시겠습니까?</p>
                                        <p className="text-xs text-red-600 mt-1">
                                            확인을 위해 프로젝트명 <span className="font-bold">&quot;{projectName}&quot;</span>을 입력해주세요.
                                        </p>
                                    </div>
                                </div>

                                <Input
                                    type="text"
                                    placeholder="프로젝트명을 입력하세요"
                                    value={deleteConfirmText}
                                    onChange={(e) => setDeleteConfirmText(e.target.value)}
                                    className="bg-white border-red-200 focus:border-red-400 focus:ring-red-400 rounded-xl"
                                />

                                <div className="flex gap-2">
                                    <Button
                                        variant="outline"
                                        onClick={handleCancelDelete}
                                        disabled={deleting}
                                        className="flex-1 rounded-xl"
                                    >
                                        취소
                                    </Button>
                                    <Button
                                        onClick={handleDelete}
                                        disabled={deleting || deleteConfirmText !== projectName}
                                        className={cn(
                                            "flex-1 rounded-xl",
                                            deleteConfirmText === projectName
                                                ? "bg-red-500 hover:bg-red-600 text-white"
                                                : "bg-red-200 text-red-400 cursor-not-allowed"
                                        )}
                                    >
                                        {deleting ? (
                                            <Loader2 className="w-4 h-4 animate-spin mr-2" />
                                        ) : (
                                            <Trash2 className="w-4 h-4 mr-2" />
                                        )}
                                        삭제
                                    </Button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </CardContent>
        </Card>
    )
}
