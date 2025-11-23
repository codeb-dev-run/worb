'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Bell, Pin, Plus } from 'lucide-react'
import { format } from 'date-fns'
import { ko } from 'date-fns/locale'

export default function AnnouncementsPage() {
    const [announcements, setAnnouncements] = useState<any[]>([])

    useEffect(() => {
        loadAnnouncements()
    }, [])

    const loadAnnouncements = async () => {
        try {
            const response = await fetch('/api/announcements')
            const data = await response.json()
            setAnnouncements(data)
        } catch (error) {
            console.error('Failed to load announcements:', error)
        }
    }

    return (
        <div className="p-6 space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold">공지사항</h1>
                    <p className="text-gray-500">중요한 공지사항을 확인합니다</p>
                </div>
                <Button>
                    <Plus className="w-4 h-4 mr-2" />
                    공지 작성
                </Button>
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
                                <td className="px-4 py-3 text-center text-sm text-gray-600">
                                    관리자
                                </td>
                                <td className="px-4 py-3 text-center text-sm text-gray-600">
                                    {format(new Date(announcement.createdAt), 'yyyy.MM.dd', { locale: ko })}
                                </td>
                            </tr>
                        ))}
                        {announcements.length === 0 && (
                            <tr>
                                <td colSpan={4} className="px-4 py-12 text-center text-gray-500">
                                    등록된 공지사항이 없습니다
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    )
}
