'use client'

import React, { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Bell, Pin, Plus, ArrowLeft, Edit, Trash2, Eye } from 'lucide-react'
import { format } from 'date-fns'
import { ko } from 'date-fns/locale'
import { toast } from 'react-hot-toast'
import { useAuth } from '@/lib/auth-context'
import { useWorkspace } from '@/lib/workspace-context'
import TipTapEditor, { TipTapViewer } from '@/components/editor/TipTapEditor'
import { Switch } from '@/components/ui/switch'

// ===========================================
// Glass Morphism Announcements Page
// ===========================================

type ViewMode = 'list' | 'view' | 'write' | 'edit'

interface Announcement {
    id: string
    title: string
    content: string
    authorId: string
    isPinned: boolean
    createdAt: string
    updatedAt: string
    isNew?: boolean
    author?: {
        id: string
        name: string
        email: string
        avatar?: string
    }
}

export default function AnnouncementsPage() {
    const { userProfile } = useAuth()
    const { currentWorkspace } = useWorkspace()
    const [announcements, setAnnouncements] = useState<Announcement[]>([])
    const [loading, setLoading] = useState(true)
    const [viewMode, setViewMode] = useState<ViewMode>('list')
    const [selectedAnnouncement, setSelectedAnnouncement] = useState<Announcement | null>(null)

    // Form states
    const [title, setTitle] = useState('')
    const [content, setContent] = useState('')
    const [isPinned, setIsPinned] = useState(false)
    const [isSubmitting, setIsSubmitting] = useState(false)

    // Delete confirmation
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
    const [announcementToDelete, setAnnouncementToDelete] = useState<string | null>(null)

    useEffect(() => {
        loadAnnouncements()
    }, [currentWorkspace])

    const loadAnnouncements = async () => {
        try {
            const params = currentWorkspace ? `?workspaceId=${currentWorkspace.id}` : ''
            const response = await fetch(`/api/announcements${params}`)
            const data = await response.json()
            setAnnouncements(data)
        } catch (error) {
            console.error('Failed to load announcements:', error)
            toast.error('공지사항을 불러오는데 실패했습니다')
        } finally {
            setLoading(false)
        }
    }

    const handleRowClick = async (announcement: Announcement) => {
        try {
            const response = await fetch(`/api/announcements/${announcement.id}`)
            const data = await response.json()
            setSelectedAnnouncement(data)
            setViewMode('view')
        } catch (error) {
            console.error('Failed to load announcement:', error)
            toast.error('공지사항을 불러오는데 실패했습니다')
        }
    }

    const handleWriteClick = () => {
        setTitle('')
        setContent('')
        setIsPinned(false)
        setSelectedAnnouncement(null)
        setViewMode('write')
    }

    const handleEditClick = () => {
        if (selectedAnnouncement) {
            setTitle(selectedAnnouncement.title)
            setContent(selectedAnnouncement.content)
            setIsPinned(selectedAnnouncement.isPinned)
            setViewMode('edit')
        }
    }

    const handleBackToList = () => {
        setViewMode('list')
        setSelectedAnnouncement(null)
        setTitle('')
        setContent('')
        setIsPinned(false)
    }

    const handleSubmit = async () => {
        if (!title.trim()) {
            toast.error('제목을 입력해주세요')
            return
        }
        if (!content.trim() || content === '<p></p>') {
            toast.error('내용을 입력해주세요')
            return
        }
        if (!userProfile) {
            toast.error('로그인이 필요합니다')
            return
        }

        setIsSubmitting(true)
        try {
            if (viewMode === 'write') {
                const response = await fetch('/api/announcements', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        title,
                        content,
                        isPinned,
                        authorId: userProfile.uid,
                        workspaceId: currentWorkspace?.id,
                    }),
                })

                if (!response.ok) throw new Error('Failed to create')
                toast.success('공지사항이 등록되었습니다')
            } else if (viewMode === 'edit' && selectedAnnouncement) {
                const response = await fetch(`/api/announcements/${selectedAnnouncement.id}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ title, content, isPinned }),
                })

                if (!response.ok) throw new Error('Failed to update')
                toast.success('공지사항이 수정되었습니다')
            }

            loadAnnouncements()
            handleBackToList()
        } catch (error) {
            console.error('Failed to save announcement:', error)
            toast.error('저장에 실패했습니다')
        } finally {
            setIsSubmitting(false)
        }
    }

    const handleDelete = async () => {
        if (!announcementToDelete) return

        try {
            const response = await fetch(`/api/announcements/${announcementToDelete}`, {
                method: 'DELETE',
            })

            if (!response.ok) throw new Error('Failed to delete')

            toast.success('공지사항이 삭제되었습니다')
            loadAnnouncements()
            handleBackToList()
        } catch (error) {
            console.error('Failed to delete announcement:', error)
            toast.error('삭제에 실패했습니다')
        } finally {
            setDeleteDialogOpen(false)
            setAnnouncementToDelete(null)
        }
    }

    const confirmDelete = (id: string) => {
        setAnnouncementToDelete(id)
        setDeleteDialogOpen(true)
    }

    // 본인 게시물이거나 관리자인 경우 수정/삭제 가능
    const isAuthor = selectedAnnouncement && userProfile && selectedAnnouncement.authorId === userProfile.uid
    const isAdmin = userProfile?.role === 'admin'
    const canEdit = selectedAnnouncement && userProfile && (isAuthor || isAdmin)

    // List View - Glass Style
    if (viewMode === 'list') {
        return (
            <div className="p-6 space-y-6">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold flex items-center gap-2 text-slate-900">
                            <div className="p-2 bg-lime-100 rounded-xl">
                                <Bell className="w-5 h-5 text-lime-600" />
                            </div>
                            공지사항
                        </h1>
                        <p className="text-slate-500 mt-1">중요한 공지사항을 확인합니다</p>
                    </div>
                    <Button variant="limePrimary" onClick={handleWriteClick}>
                        <Plus className="w-4 h-4 mr-2" />
                        공지 작성
                    </Button>
                </div>

                {/* 한국형 게시판 테이블 - Glass Style */}
                <div className="bg-white/70 backdrop-blur-xl border border-white/40 rounded-2xl overflow-hidden shadow-lg shadow-black/5">
                    <table className="w-full">
                        <thead className="bg-white/60 border-b border-white/40">
                            <tr>
                                <th className="px-4 py-3 text-center text-sm font-medium text-slate-700 w-20">번호</th>
                                <th className="px-4 py-3 text-left text-sm font-medium text-slate-700">제목</th>
                                <th className="px-4 py-3 text-center text-sm font-medium text-slate-700 w-32">작성자</th>
                                <th className="px-4 py-3 text-center text-sm font-medium text-slate-700 w-32">작성일</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/40">
                            {announcements.map((announcement, index) => (
                                <tr
                                    key={announcement.id}
                                    onClick={() => handleRowClick(announcement)}
                                    className={`hover:bg-white/60 cursor-pointer transition-colors ${announcement.isPinned ? 'bg-lime-50/50' : ''}`}
                                >
                                    <td className="px-4 py-3 text-center text-sm">
                                        {announcement.isPinned ? (
                                            <Pin className="w-4 h-4 text-lime-600 mx-auto" />
                                        ) : (
                                            <span className="text-slate-500">{announcements.length - index}</span>
                                        )}
                                    </td>
                                    <td className="px-4 py-3">
                                        <div className="flex items-center gap-2">
                                            {announcement.isPinned && (
                                                <span className="px-2 py-0.5 text-xs bg-black text-lime-400 rounded-lg font-medium">공지</span>
                                            )}
                                            <span className="text-sm font-medium text-slate-900 hover:text-lime-600">
                                                {announcement.title}
                                            </span>
                                            {announcement.isNew && (
                                                <span className="px-1.5 py-0.5 text-xs bg-lime-400 text-slate-900 rounded-lg font-bold">N</span>
                                            )}
                                        </div>
                                    </td>
                                    <td className="px-4 py-3 text-center text-sm text-slate-600">
                                        {announcement.author?.name || '관리자'}
                                    </td>
                                    <td className="px-4 py-3 text-center text-sm text-slate-500">
                                        {format(new Date(announcement.createdAt), 'yyyy.MM.dd', { locale: ko })}
                                    </td>
                                </tr>
                            ))}
                            {announcements.length === 0 && !loading && (
                                <tr>
                                    <td colSpan={4} className="px-4 py-12 text-center text-slate-500">
                                        등록된 공지사항이 없습니다
                                    </td>
                                </tr>
                            )}
                            {loading && (
                                <tr>
                                    <td colSpan={4} className="px-4 py-12 text-center">
                                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-lime-400 mx-auto"></div>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        )
    }

    // View Mode - Glass Style
    if (viewMode === 'view' && selectedAnnouncement) {
        return (
            <div className="p-6 space-y-6 max-w-4xl mx-auto">
                <div className="flex items-center justify-between">
                    <Button variant="ghost" onClick={handleBackToList} className="hover:bg-lime-50">
                        <ArrowLeft className="w-4 h-4 mr-2" />
                        목록으로
                    </Button>
                    {canEdit && (
                        <div className="flex gap-2">
                            <Button variant="glass" className="border-2 border-slate-200" onClick={handleEditClick}>
                                <Edit className="w-4 h-4 mr-2" />
                                수정
                            </Button>
                            <Button variant="destructive" onClick={() => confirmDelete(selectedAnnouncement.id)}>
                                <Trash2 className="w-4 h-4 mr-2" />
                                삭제
                            </Button>
                        </div>
                    )}
                </div>

                <div className="bg-white/70 backdrop-blur-xl border border-white/40 rounded-2xl overflow-hidden shadow-lg shadow-black/5">
                    <div className="p-6 border-b border-white/40 bg-white/60">
                        <div className="flex items-center gap-2 mb-2">
                            {selectedAnnouncement.isPinned && (
                                <span className="px-2 py-0.5 text-xs bg-black text-lime-400 rounded-lg flex items-center gap-1 font-medium">
                                    <Pin className="w-3 h-3" />
                                    공지
                                </span>
                            )}
                        </div>
                        <h1 className="text-2xl font-bold text-slate-900">{selectedAnnouncement.title}</h1>
                        <div className="flex items-center gap-4 mt-4 text-sm text-slate-500">
                            <span>{selectedAnnouncement.author?.name || '관리자'}</span>
                            <span>|</span>
                            <span>{format(new Date(selectedAnnouncement.createdAt), 'yyyy.MM.dd HH:mm', { locale: ko })}</span>
                        </div>
                    </div>
                    <div className="p-6">
                        <TipTapViewer content={selectedAnnouncement.content} />
                    </div>
                </div>

                {/* Delete Confirmation Dialog - Glass Style */}
                <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
                    <DialogContent className="bg-white/90 backdrop-blur-2xl border-white/40 rounded-3xl">
                        <DialogHeader>
                            <DialogTitle className="text-slate-900">공지사항 삭제</DialogTitle>
                            <DialogDescription className="text-slate-500">
                                정말로 이 공지사항을 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.
                            </DialogDescription>
                        </DialogHeader>
                        <DialogFooter>
                            <Button variant="glass" onClick={() => setDeleteDialogOpen(false)}>
                                취소
                            </Button>
                            <Button variant="destructive" onClick={handleDelete}>
                                삭제
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>
        )
    }

    // Write/Edit Mode - Glass Style
    return (
        <div className="p-6 space-y-6 max-w-4xl mx-auto">
            <div className="flex items-center justify-between">
                <Button variant="ghost" onClick={handleBackToList} className="hover:bg-lime-50">
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    목록으로
                </Button>
            </div>

            <div className="bg-white/70 backdrop-blur-xl border border-white/40 rounded-2xl p-6 space-y-6 shadow-lg shadow-black/5">
                <h2 className="text-xl font-bold text-slate-900">
                    {viewMode === 'write' ? '공지사항 작성' : '공지사항 수정'}
                </h2>

                <div className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="title" className="text-slate-700">제목</Label>
                        <Input
                            id="title"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            placeholder="제목을 입력하세요"
                            className="rounded-xl"
                        />
                    </div>

                    <div className="flex items-center gap-2">
                        <Switch
                            id="isPinned"
                            checked={isPinned}
                            onCheckedChange={setIsPinned}
                        />
                        <Label htmlFor="isPinned" className="cursor-pointer text-slate-700">상단 고정</Label>
                    </div>

                    <div className="space-y-2">
                        <Label className="text-slate-700">내용</Label>
                        <TipTapEditor
                            content={content}
                            onChange={setContent}
                            placeholder="내용을 입력하세요..."
                        />
                    </div>
                </div>

                <div className="flex justify-end gap-2">
                    <Button variant="glass" onClick={handleBackToList}>
                        취소
                    </Button>
                    <Button variant="limePrimary" onClick={handleSubmit} disabled={isSubmitting}>
                        {isSubmitting ? '저장 중...' : viewMode === 'write' ? '등록' : '수정'}
                    </Button>
                </div>
            </div>
        </div>
    )
}
