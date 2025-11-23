'use client'

import React, { useState, useEffect } from 'react'
import { useAuth } from '@/lib/auth-context'
import { Button } from '@/components/ui/button'
import { Plus, Search } from 'lucide-react'
import { format } from 'date-fns'
import { ko } from 'date-fns/locale'

export default function BoardPage() {
    const { userProfile } = useAuth()
    const [posts, setPosts] = useState<any[]>([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        loadPosts()
    }, [])

    const loadPosts = async () => {
        try {
            const response = await fetch('/api/board')
            const data = await response.json()
            setPosts(data)
        } catch (error) {
            console.error('Failed to load posts:', error)
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="p-6 space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold">게시판</h1>
                    <p className="text-gray-500">자유롭게 소통하는 공간입니다</p>
                </div>
                <Button>
                    <Plus className="w-4 h-4 mr-2" />
                    글쓰기
                </Button>
            </div>

            {/* 검색 */}
            <div className="flex gap-2">
                <div className="flex-1 relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                        type="text"
                        placeholder="제목, 내용, 작성자 검색"
                        className="w-full pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                </div>
                <Button variant="outline">검색</Button>
            </div>

            {/* 한국형 게시판 테이블 */}
            <div className="bg-white border rounded-lg overflow-hidden">
                <table className="w-full">
                    <thead className="bg-gray-50 border-b">
                        <tr>
                            <th className="px-4 py-3 text-center text-sm font-medium text-gray-700 w-20">번호</th>
                            <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">제목</th>
                            <th className="px-4 py-3 text-center text-sm font-medium text-gray-700 w-32">작성자</th>
                            <th className="px-4 py-3 text-center text-sm font-medium text-gray-700 w-32">작성일</th>
                            <th className="px-4 py-3 text-center text-sm font-medium text-gray-700 w-20">조회</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y">
                        {posts.length > 0 ? (
                            posts.map((post, index) => (
                                <tr key={post.id} className="hover:bg-gray-50 cursor-pointer">
                                    <td className="px-4 py-3 text-center text-sm text-gray-600">
                                        {posts.length - index}
                                    </td>
                                    <td className="px-4 py-3">
                                        <div className="flex items-center gap-2">
                                            <span className="text-sm font-medium text-gray-900 hover:text-blue-600">
                                                {post.title}
                                            </span>
                                            {post.commentCount > 0 && (
                                                <span className="text-xs text-blue-600">[{post.commentCount}]</span>
                                            )}
                                            {post.isNew && (
                                                <span className="px-1.5 py-0.5 text-xs bg-red-500 text-white rounded">N</span>
                                            )}
                                        </div>
                                    </td>
                                    <td className="px-4 py-3 text-center text-sm text-gray-600">
                                        {post.author?.name || '알 수 없음'}
                                    </td>
                                    <td className="px-4 py-3 text-center text-sm text-gray-600">
                                        {format(new Date(post.createdAt), 'MM.dd', { locale: ko })}
                                    </td>
                                    <td className="px-4 py-3 text-center text-sm text-gray-600">
                                        {post.views || 0}
                                    </td>
                                </tr>
                            ))
                        ) : (
                            <tr>
                                <td colSpan={5} className="px-4 py-12 text-center text-gray-500">
                                    등록된 게시글이 없습니다
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            {/* 페이지네이션 */}
            <div className="flex justify-center gap-2">
                <Button variant="outline" size="sm">이전</Button>
                <Button variant="outline" size="sm" className="bg-blue-600 text-white">1</Button>
                <Button variant="outline" size="sm">2</Button>
                <Button variant="outline" size="sm">3</Button>
                <Button variant="outline" size="sm">다음</Button>
            </div>
        </div>
    )
}
