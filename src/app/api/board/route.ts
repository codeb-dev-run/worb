import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// Mock data for demonstration
const mockPosts = [
    {
        id: '1',
        title: '프로젝트 킥오프 미팅 안내',
        content: '다음 주 월요일 오전 10시에 프로젝트 킥오프 미팅이 있습니다.',
        author: { name: '김철수' },
        createdAt: new Date(),
        views: 45,
        commentCount: 3,
        isNew: true,
    },
    {
        id: '2',
        title: '점심 메뉴 추천 받습니다',
        content: '오늘 점심 뭐 먹을까요?',
        author: { name: '이영희' },
        createdAt: new Date(Date.now() - 12 * 60 * 60 * 1000), // 12시간 전
        views: 128,
        commentCount: 12,
        isNew: true,
    },
    {
        id: '3',
        title: '개발 환경 세팅 가이드',
        content: '신규 입사자분들을 위한 개발 환경 세팅 가이드입니다.',
        author: { name: '박민수' },
        createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000), // 3일 전
        views: 89,
        commentCount: 5,
        isNew: false,
    },
]

export async function GET(request: Request) {
    try {
        // TODO: Replace with actual database query
        // const posts = await prisma.boardPost.findMany({
        //   orderBy: { createdAt: 'desc' },
        //   include: { author: true },
        //   take: 50,
        // })

        return NextResponse.json(mockPosts)
    } catch (error) {
        console.error('Failed to fetch board posts:', error)
        return NextResponse.json({ error: 'Failed to fetch posts' }, { status: 500 })
    }
}

export async function POST(request: Request) {
    try {
        const body = await request.json()
        // TODO: Create board post in database
        return NextResponse.json({ success: true })
    } catch (error) {
        console.error('Failed to create post:', error)
        return NextResponse.json({ error: 'Failed to create post' }, { status: 500 })
    }
}
