'use client'

import React, { useState, useEffect } from 'react'
import { useAuth } from '@/lib/auth-context'
import { useWorkspace } from '@/lib/workspace-context'
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
import {
    Plus,
    Search,
    ArrowLeft,
    Edit,
    Trash2,
    MessageCircle,
    Eye,
    Pin,
    FileText
} from 'lucide-react'
import { format } from 'date-fns'
import { ko } from 'date-fns/locale'
import { toast } from 'react-hot-toast'
import TipTapEditor, { TipTapViewer } from '@/components/editor/TipTapEditor'
import { Switch } from '@/components/ui/switch'

// ===========================================
// Glass Morphism Board Page
// ===========================================

type ViewMode = 'list' | 'view' | 'write' | 'edit'

interface BoardPost {
    id: string
    title: string
    content: string
    authorId: string
    category: string
    viewCount: number
    isPinned: boolean
    createdAt: string
    updatedAt: string
    commentCount?: number
    isNew?: boolean
    author?: {
        id: string
        name: string
        email: string
        avatar?: string
    }
    comments?: Comment[]
}

interface Comment {
    id: string
    content: string
    createdAt: string
    updatedAt: string
    authorId: string
    author: {
        id: string
        name: string
        avatar?: string
    }
}

export default function BoardPage() {
    const { userProfile } = useAuth()
    const { currentWorkspace } = useWorkspace()
    const [posts, setPosts] = useState<BoardPost[]>([])
    const [loading, setLoading] = useState(true)
    const [viewMode, setViewMode] = useState<ViewMode>('list')
    const [selectedPost, setSelectedPost] = useState<BoardPost | null>(null)
    const [searchQuery, setSearchQuery] = useState('')

    // Form states
    const [title, setTitle] = useState('')
    const [content, setContent] = useState('')
    const [isPinned, setIsPinned] = useState(false)
    const [isSubmitting, setIsSubmitting] = useState(false)

    // Delete confirmation
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
    const [postToDelete, setPostToDelete] = useState<string | null>(null)

    // Comment states
    const [newComment, setNewComment] = useState('')
    const [editingCommentId, setEditingCommentId] = useState<string | null>(null)
    const [editingCommentContent, setEditingCommentContent] = useState('')
    const [isCommentSubmitting, setIsCommentSubmitting] = useState(false)
    const [deleteCommentDialogOpen, setDeleteCommentDialogOpen] = useState(false)
    const [commentToDelete, setCommentToDelete] = useState<string | null>(null)

    useEffect(() => {
        if (currentWorkspace) {
            loadPosts()
        }
    }, [currentWorkspace])

    const loadPosts = async () => {
        if (!currentWorkspace) return

        try {
            const response = await fetch(`/api/board?workspaceId=${currentWorkspace.id}`)
            const data = await response.json()
            setPosts(Array.isArray(data) ? data : [])
        } catch (error) {
            console.error('Failed to load posts:', error)
            toast.error('게시글을 불러오는데 실패했습니다')
            setPosts([])
        } finally {
            setLoading(false)
        }
    }

    const handleRowClick = async (post: BoardPost) => {
        try {
            const response = await fetch(`/api/board/${post.id}`)
            const data = await response.json()
            setSelectedPost(data)
            setViewMode('view')
        } catch (error) {
            console.error('Failed to load post:', error)
            toast.error('게시글을 불러오는데 실패했습니다')
        }
    }

    const handleWriteClick = () => {
        setTitle('')
        setContent('')
        setIsPinned(false)
        setSelectedPost(null)
        setViewMode('write')
    }

    const handleEditClick = () => {
        if (selectedPost) {
            setTitle(selectedPost.title)
            setContent(selectedPost.content)
            setIsPinned(selectedPost.isPinned)
            setViewMode('edit')
        }
    }

    const handleBackToList = () => {
        setViewMode('list')
        setSelectedPost(null)
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
        if (!currentWorkspace) {
            toast.error('워크스페이스를 선택해주세요')
            return
        }

        setIsSubmitting(true)
        try {
            if (viewMode === 'write') {
                const response = await fetch('/api/board', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        title,
                        content,
                        isPinned,
                        authorId: userProfile.uid,
                        workspaceId: currentWorkspace.id,
                    }),
                })

                if (!response.ok) throw new Error('Failed to create')
                toast.success('게시글이 등록되었습니다')
            } else if (viewMode === 'edit' && selectedPost) {
                const response = await fetch(`/api/board/${selectedPost.id}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ title, content, isPinned }),
                })

                if (!response.ok) throw new Error('Failed to update')
                toast.success('게시글이 수정되었습니다')
            }

            loadPosts()
            handleBackToList()
        } catch (error) {
            console.error('Failed to save post:', error)
            toast.error('저장에 실패했습니다')
        } finally {
            setIsSubmitting(false)
        }
    }

    const handleDelete = async () => {
        if (!postToDelete) return

        try {
            const response = await fetch(`/api/board/${postToDelete}`, {
                method: 'DELETE',
            })

            if (!response.ok) throw new Error('Failed to delete')

            toast.success('게시글이 삭제되었습니다')
            loadPosts()
            handleBackToList()
        } catch (error) {
            console.error('Failed to delete post:', error)
            toast.error('삭제에 실패했습니다')
        } finally {
            setDeleteDialogOpen(false)
            setPostToDelete(null)
        }
    }

    const confirmDelete = (id: string) => {
        setPostToDelete(id)
        setDeleteDialogOpen(true)
    }

    // Comment handlers
    const handleAddComment = async () => {
        if (!newComment.trim()) {
            toast.error('댓글 내용을 입력해주세요')
            return
        }
        if (!userProfile || !selectedPost) {
            toast.error('로그인이 필요합니다')
            return
        }

        setIsCommentSubmitting(true)
        try {
            const response = await fetch(`/api/board/${selectedPost.id}/comments`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    content: newComment,
                    authorId: userProfile.uid,
                }),
            })

            if (!response.ok) throw new Error('Failed to create comment')

            const newCommentData = await response.json()
            setSelectedPost({
                ...selectedPost,
                comments: [...(selectedPost.comments || []), newCommentData],
            })
            setNewComment('')
            toast.success('댓글이 등록되었습니다')
        } catch (error) {
            console.error('Failed to add comment:', error)
            toast.error('댓글 등록에 실패했습니다')
        } finally {
            setIsCommentSubmitting(false)
        }
    }

    const handleEditComment = (comment: Comment) => {
        setEditingCommentId(comment.id)
        setEditingCommentContent(comment.content)
    }

    const handleCancelEditComment = () => {
        setEditingCommentId(null)
        setEditingCommentContent('')
    }

    const handleSaveEditComment = async () => {
        if (!editingCommentContent.trim()) {
            toast.error('댓글 내용을 입력해주세요')
            return
        }
        if (!selectedPost || !editingCommentId) return

        setIsCommentSubmitting(true)
        try {
            const response = await fetch(`/api/board/${selectedPost.id}/comments/${editingCommentId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ content: editingCommentContent }),
            })

            if (!response.ok) throw new Error('Failed to update comment')

            const updatedComment = await response.json()
            setSelectedPost({
                ...selectedPost,
                comments: selectedPost.comments?.map(c =>
                    c.id === editingCommentId ? updatedComment : c
                ),
            })
            setEditingCommentId(null)
            setEditingCommentContent('')
            toast.success('댓글이 수정되었습니다')
        } catch (error) {
            console.error('Failed to update comment:', error)
            toast.error('댓글 수정에 실패했습니다')
        } finally {
            setIsCommentSubmitting(false)
        }
    }

    const confirmDeleteComment = (commentId: string) => {
        setCommentToDelete(commentId)
        setDeleteCommentDialogOpen(true)
    }

    const handleDeleteComment = async () => {
        if (!selectedPost || !commentToDelete) return

        try {
            const response = await fetch(`/api/board/${selectedPost.id}/comments/${commentToDelete}`, {
                method: 'DELETE',
            })

            if (!response.ok) throw new Error('Failed to delete comment')

            setSelectedPost({
                ...selectedPost,
                comments: selectedPost.comments?.filter(c => c.id !== commentToDelete),
            })
            toast.success('댓글이 삭제되었습니다')
        } catch (error) {
            console.error('Failed to delete comment:', error)
            toast.error('댓글 삭제에 실패했습니다')
        } finally {
            setDeleteCommentDialogOpen(false)
            setCommentToDelete(null)
        }
    }

    const filteredPosts = posts.filter(post =>
        post.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        post.author?.name?.toLowerCase().includes(searchQuery.toLowerCase())
    )

    // 본인 게시물이거나 관리자인 경우 수정/삭제 가능
    const isAuthor = selectedPost && userProfile && selectedPost.authorId === userProfile.uid
    const isAdmin = userProfile?.role === 'admin'
    const canEdit = selectedPost && userProfile && (isAuthor || isAdmin)

    // List View - Glass Style
    if (viewMode === 'list') {
        return (
            <div className="p-6 space-y-6">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold flex items-center gap-2 text-slate-900">
                            <div className="p-2 bg-lime-100 rounded-xl">
                                <FileText className="w-5 h-5 text-lime-600" />
                            </div>
                            게시판
                        </h1>
                        <p className="text-slate-500 mt-1">자유롭게 소통하는 공간입니다</p>
                    </div>
                    <Button variant="limePrimary" onClick={handleWriteClick}>
                        <Plus className="w-4 h-4 mr-2" />
                        글쓰기
                    </Button>
                </div>

                {/* 검색 - Glass Style */}
                <div className="flex gap-2">
                    <div className="flex-1 relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <input
                            type="text"
                            placeholder="제목, 작성자 검색"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 bg-white/70 backdrop-blur-sm border border-white/40 rounded-xl focus:outline-none focus:ring-2 focus:ring-lime-400 text-slate-900 placeholder:text-slate-400"
                        />
                    </div>
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
                                <th className="px-4 py-3 text-center text-sm font-medium text-slate-700 w-20">조회</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/40">
                            {filteredPosts.length > 0 ? (
                                filteredPosts.map((post, index) => (
                                    <tr
                                        key={post.id}
                                        onClick={() => handleRowClick(post)}
                                        className={`hover:bg-white/60 cursor-pointer transition-colors ${post.isPinned ? 'bg-lime-50/50' : ''}`}
                                    >
                                        <td className="px-4 py-3 text-center text-sm">
                                            {post.isPinned ? (
                                                <Pin className="w-4 h-4 text-lime-600 mx-auto" />
                                            ) : (
                                                <span className="text-slate-500">{filteredPosts.length - index}</span>
                                            )}
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="flex items-center gap-2">
                                                {post.isPinned && (
                                                    <span className="px-2 py-0.5 text-xs bg-black text-lime-400 rounded-lg font-medium">공지</span>
                                                )}
                                                <span className="text-sm font-medium text-slate-900 hover:text-lime-600">
                                                    {post.title}
                                                </span>
                                                {(post.commentCount ?? 0) > 0 && (
                                                    <span className="text-xs text-lime-600 flex items-center gap-0.5">
                                                        <MessageCircle className="w-3 h-3" />
                                                        {post.commentCount}
                                                    </span>
                                                )}
                                                {post.isNew && (
                                                    <span className="px-1.5 py-0.5 text-xs bg-lime-400 text-slate-900 rounded-lg font-bold">N</span>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-4 py-3 text-center text-sm text-slate-600">
                                            {post.author?.name || '알 수 없음'}
                                        </td>
                                        <td className="px-4 py-3 text-center text-sm text-slate-500">
                                            {format(new Date(post.createdAt), 'MM.dd', { locale: ko })}
                                        </td>
                                        <td className="px-4 py-3 text-center text-sm text-slate-500">
                                            {post.viewCount || 0}
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan={5} className="px-4 py-12 text-center text-slate-500">
                                        {loading ? (
                                            <div className="flex justify-center">
                                                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-lime-400"></div>
                                            </div>
                                        ) : '등록된 게시글이 없습니다'}
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
    if (viewMode === 'view' && selectedPost) {
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
                            <Button variant="destructive" onClick={() => confirmDelete(selectedPost.id)}>
                                <Trash2 className="w-4 h-4 mr-2" />
                                삭제
                            </Button>
                        </div>
                    )}
                </div>

                <div className="bg-white/70 backdrop-blur-xl border border-white/40 rounded-2xl overflow-hidden shadow-lg shadow-black/5">
                    <div className="p-6 border-b border-white/40 bg-white/60">
                        <div className="flex items-center gap-2 mb-2">
                            {selectedPost.isPinned && (
                                <span className="px-2 py-0.5 text-xs bg-black text-lime-400 rounded-lg flex items-center gap-1 font-medium">
                                    <Pin className="w-3 h-3" />
                                    공지
                                </span>
                            )}
                        </div>
                        <h1 className="text-2xl font-bold text-slate-900">{selectedPost.title}</h1>
                        <div className="flex items-center gap-4 mt-4 text-sm text-slate-500">
                            <span>{selectedPost.author?.name || '알 수 없음'}</span>
                            <span>|</span>
                            <span>{format(new Date(selectedPost.createdAt), 'yyyy.MM.dd HH:mm', { locale: ko })}</span>
                            <span>|</span>
                            <span className="flex items-center gap-1">
                                <Eye className="w-4 h-4" />
                                {selectedPost.viewCount}
                            </span>
                        </div>
                    </div>
                    <div className="p-6">
                        <TipTapViewer content={selectedPost.content} />
                    </div>
                </div>

                {/* Comments Section - Glass Style */}
                <div className="bg-white/70 backdrop-blur-xl border border-white/40 rounded-2xl p-6 shadow-lg shadow-black/5">
                    <h3 className="font-semibold mb-4 flex items-center gap-2 text-slate-900">
                        <div className="p-1.5 bg-lime-100 rounded-lg">
                            <MessageCircle className="w-4 h-4 text-lime-600" />
                        </div>
                        댓글 ({selectedPost.comments?.length || 0})
                    </h3>

                    {/* Comment List */}
                    {selectedPost.comments && selectedPost.comments.length > 0 && (
                        <div className="space-y-4 mb-6">
                            {selectedPost.comments.map(comment => (
                                <div key={comment.id} className="border-b border-white/40 pb-4 last:border-b-0 last:pb-0">
                                    <div className="flex items-center justify-between mb-2">
                                        <div className="flex items-center gap-2">
                                            <div className="w-8 h-8 rounded-full bg-lime-100 flex items-center justify-center text-sm font-medium text-lime-700">
                                                {comment.author.name?.[0] || 'U'}
                                            </div>
                                            <span className="font-medium text-sm text-slate-900">{comment.author.name}</span>
                                            <span className="text-xs text-slate-400">
                                                {format(new Date(comment.createdAt), 'yyyy.MM.dd HH:mm', { locale: ko })}
                                            </span>
                                            {comment.createdAt !== comment.updatedAt && (
                                                <span className="text-xs text-slate-400">(수정됨)</span>
                                            )}
                                        </div>
                                        {userProfile && comment.authorId === userProfile.uid && (
                                            <div className="flex gap-1">
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => handleEditComment(comment)}
                                                    className="text-xs h-7 px-2 hover:bg-lime-50"
                                                >
                                                    수정
                                                </Button>
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => confirmDeleteComment(comment.id)}
                                                    className="text-xs h-7 px-2 text-red-600 hover:text-red-700 hover:bg-red-50"
                                                >
                                                    삭제
                                                </Button>
                                            </div>
                                        )}
                                    </div>
                                    {editingCommentId === comment.id ? (
                                        <div className="space-y-2">
                                            <textarea
                                                value={editingCommentContent}
                                                onChange={(e) => setEditingCommentContent(e.target.value)}
                                                className="w-full p-2 bg-white/60 border border-white/40 rounded-xl text-sm resize-none focus:outline-none focus:ring-2 focus:ring-lime-400 text-slate-900"
                                                rows={3}
                                            />
                                            <div className="flex justify-end gap-2">
                                                <Button
                                                    variant="glass"
                                                    size="sm"
                                                    onClick={handleCancelEditComment}
                                                >
                                                    취소
                                                </Button>
                                                <Button
                                                    variant="limePrimary"
                                                    size="sm"
                                                    onClick={handleSaveEditComment}
                                                    disabled={isCommentSubmitting}
                                                >
                                                    {isCommentSubmitting ? '저장 중...' : '저장'}
                                                </Button>
                                            </div>
                                        </div>
                                    ) : (
                                        <p className="text-sm text-slate-700 whitespace-pre-wrap">{comment.content}</p>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Add Comment Form */}
                    {userProfile && (
                        <div className="space-y-2">
                            <textarea
                                value={newComment}
                                onChange={(e) => setNewComment(e.target.value)}
                                placeholder="댓글을 입력하세요..."
                                className="w-full p-3 bg-white/60 border border-white/40 rounded-xl text-sm resize-none focus:outline-none focus:ring-2 focus:ring-lime-400 text-slate-900 placeholder:text-slate-400"
                                rows={3}
                            />
                            <div className="flex justify-end">
                                <Button
                                    variant="limePrimary"
                                    onClick={handleAddComment}
                                    disabled={isCommentSubmitting || !newComment.trim()}
                                >
                                    {isCommentSubmitting ? '등록 중...' : '댓글 등록'}
                                </Button>
                            </div>
                        </div>
                    )}
                </div>

                {/* Delete Comment Confirmation Dialog - Glass Style */}
                <Dialog open={deleteCommentDialogOpen} onOpenChange={setDeleteCommentDialogOpen}>
                    <DialogContent className="bg-white/90 backdrop-blur-2xl border-white/40 rounded-3xl">
                        <DialogHeader>
                            <DialogTitle className="text-slate-900">댓글 삭제</DialogTitle>
                            <DialogDescription className="text-slate-500">
                                정말로 이 댓글을 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.
                            </DialogDescription>
                        </DialogHeader>
                        <DialogFooter>
                            <Button variant="glass" onClick={() => setDeleteCommentDialogOpen(false)}>
                                취소
                            </Button>
                            <Button variant="destructive" onClick={handleDeleteComment}>
                                삭제
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>

                {/* Delete Confirmation Dialog - Glass Style */}
                <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
                    <DialogContent className="bg-white/90 backdrop-blur-2xl border-white/40 rounded-3xl">
                        <DialogHeader>
                            <DialogTitle className="text-slate-900">게시글 삭제</DialogTitle>
                            <DialogDescription className="text-slate-500">
                                정말로 이 게시글을 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.
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
                    {viewMode === 'write' ? '새 게시글 작성' : '게시글 수정'}
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
                        <Label htmlFor="isPinned" className="cursor-pointer text-slate-700">공지로 등록</Label>
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
