'use client'

import React, { useState, useEffect } from 'react'
import { useAuth } from '@/lib/auth-context'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Plus, Search, Pin, Calendar as CalendarIcon } from 'lucide-react'
import { format } from 'date-fns'
import { ko } from 'date-fns/locale'

export default function GroupwarePage() {
    const [announcements, setAnnouncements] = useState<any[]>([])
    const [posts, setPosts] = useState<any[]>([])

    useEffect(() => {
        loadData()
    }, [])

    const loadData = async () => {
        try {
            const [announcementsRes, postsRes] = await Promise.all([
                fetch('/api/announcements'),
                fetch('/api/board'),
            ])
            setAnnouncements(await announcementsRes.json())
            setPosts(await postsRes.json())
        } catch (error) {
            console.error('Failed to load data:', error)
        }
    }

    return (
        <div className="p-6 space-y-6">
            <div>
                <h1 className="text-2xl font-bold">그룹웨어</h1>
                <p className="text-gray-500">공지사항, 게시판, 캘린더를 한 곳에서 관리합니다</p>
            </div>

            <Tabs defaultValue="announcements" className="w-full">
                <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="announcements" className="flex items-center gap-2">
                        공지사항
                        <div className="flex items-center gap-1">
                            <span className="px-1.5 py-0.5 text-xs bg-blue-600 text-white rounded">
                                {announcements.length}
                            </span>
                            {announcements.some(a => a.isNew) && (
                                <span className="px-1.5 py-0.5 text-xs bg-red-500 text-white rounded font-bold">
                                    N
                                </span>
                            )}
                        </div>
                    </TabsTrigger>
                    <TabsTrigger value="board" className="flex items-center gap-2">
                        게시판
                        <div className="flex items-center gap-1">
                            <span className="px-1.5 py-0.5 text-xs bg-blue-600 text-white rounded">
                                {posts.length}
                            </span>
                            {posts.some(p => p.isNew) && (
                                <span className="px-1.5 py-0.5 text-xs bg-red-500 text-white rounded font-bold">
                                    N
                                </span>
                            )}
                        </div>
                    </TabsTrigger>
                    <TabsTrigger value="calendar">캘린더</TabsTrigger>
                </TabsList>

                {/* 공지사항 탭 */}
                <TabsContent value="announcements" className="space-y-4">
                    <div className="flex justify-end">
                        <Button>
                            <Plus className="w-4 h-4 mr-2" />
                            공지 작성
                        </Button>
                    </div>

                    <div className="bg-white border rounded-lg overflow-hidden">
                        <table className="w-full">
                            <thead className="bg-gray-50 border-b">
                                <tr>
                                    <th className="px-4 py-3 text-center text-sm font-medium text-gray-700 w-20">번호</th>
                                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">제목</th>
                                    <th className="px-4 py-3 text-center text-sm font-medium text-gray-700 w-32">작성자</th>
                                    <th className="px-4 py-3 text-center text-sm font-medium text-gray-700 w-32">작성일</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y">
                                {announcements.map((announcement, index) => (
                                    <tr key={announcement.id} className={`hover:bg-gray-50 cursor-pointer ${announcement.isPinned ? 'bg-blue-50' : ''}`}>
                                        <td className="px-4 py-3 text-center text-sm">
                                            {announcement.isPinned ? (
                                                <Pin className="w-4 h-4 text-blue-600 mx-auto" />
                                            ) : (
                                                <span className="text-gray-600">{announcements.length - index}</span>
                                            )}
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="flex items-center gap-2">
                                                {announcement.isPinned && (
                                                    <span className="px-2 py-0.5 text-xs bg-blue-600 text-white rounded">공지</span>
                                                )}
                                                <span className="text-sm font-medium text-gray-900 hover:text-blue-600">
                                                    {announcement.title}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-4 py-3 text-center text-sm text-gray-600">관리자</td>
                                        <td className="px-4 py-3 text-center text-sm text-gray-600">
                                            {format(new Date(announcement.createdAt), 'yyyy.MM.dd', { locale: ko })}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </TabsContent>

                {/* 게시판 탭 */}
                <TabsContent value="board" className="space-y-4">
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
                        <Button>
                            <Plus className="w-4 h-4 mr-2" />
                            글쓰기
                        </Button>
                    </div>

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
                                {posts.map((post, index) => (
                                    <tr key={post.id} className="hover:bg-gray-50 cursor-pointer">
                                        <td className="px-4 py-3 text-center text-sm text-gray-600">{posts.length - index}</td>
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
                                        <td className="px-4 py-3 text-center text-sm text-gray-600">{post.views || 0}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </TabsContent>

                {/* 캘린더 탭 */}
                <TabsContent value="calendar" className="space-y-4">
                    <div className="flex items-center justify-center h-96 border rounded-lg bg-gray-50">
                        <div className="text-center">
                            <CalendarIcon className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                            <p className="text-gray-500">캘린더 기능은 준비 중입니다</p>
                        </div>
                    </div>
                </TabsContent>
            </Tabs>
        </div>
    )
}
