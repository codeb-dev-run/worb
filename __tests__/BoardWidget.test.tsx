import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import { BoardWidget } from '@/components/dashboard/widgets/BoardWidget'

// Mock useRouter
const mockPush = jest.fn()
jest.mock('next/navigation', () => ({
    useRouter: () => ({
        push: mockPush,
        replace: jest.fn(),
        prefetch: jest.fn(),
    }),
    useSearchParams: () => new URLSearchParams(),
    usePathname: () => '',
}))

describe('BoardWidget', () => {
    const mockBoardPosts = [
        {
            id: 'post-1',
            title: '첫 번째 게시글',
            author: '홍길동',
            team: '개발팀',
            date: '12.10',
            comments: 5,
        },
        {
            id: 'post-2',
            title: '두 번째 게시글',
            author: '김철수',
            team: '기획팀',
            date: '12.09',
            comments: 0,
        },
        {
            id: 'post-3',
            title: '세 번째 게시글 (댓글 없음)',
            author: '이영희',
            team: '디자인팀',
            date: '12.08',
            comments: 0,
        },
    ]

    beforeEach(() => {
        mockPush.mockClear()
    })

    it('게시글 목록을 올바르게 렌더링한다', () => {
        render(<BoardWidget boardPosts={mockBoardPosts} />)

        expect(screen.getByText('첫 번째 게시글')).toBeInTheDocument()
        expect(screen.getByText('두 번째 게시글')).toBeInTheDocument()
        expect(screen.getByText('세 번째 게시글 (댓글 없음)')).toBeInTheDocument()
    })

    it('게시글 제목을 클릭하면 상세 페이지로 이동한다', () => {
        render(<BoardWidget boardPosts={mockBoardPosts} />)

        const firstPost = screen.getByText('첫 번째 게시글')
        const postRow = firstPost.closest('div[class*="cursor-pointer"]')

        if (postRow) {
            fireEvent.click(postRow)
        }

        expect(mockPush).toHaveBeenCalledWith('/groupware/board?postId=post-1')
    })

    it('두 번째 게시글 클릭 시 올바른 postId로 이동한다', () => {
        render(<BoardWidget boardPosts={mockBoardPosts} />)

        const secondPost = screen.getByText('두 번째 게시글')
        const postRow = secondPost.closest('div[class*="cursor-pointer"]')

        if (postRow) {
            fireEvent.click(postRow)
        }

        expect(mockPush).toHaveBeenCalledWith('/groupware/board?postId=post-2')
    })

    it('댓글이 있는 게시글은 댓글 수를 표시한다', () => {
        render(<BoardWidget boardPosts={mockBoardPosts} />)

        // 댓글 수 5가 표시되어야 함
        expect(screen.getByText('5')).toBeInTheDocument()
    })

    it('댓글이 없는 게시글은 댓글 수를 표시하지 않는다', () => {
        render(<BoardWidget boardPosts={[mockBoardPosts[1]]} />)

        // 댓글 수 0은 표시되지 않아야 함
        expect(screen.queryByText('0')).not.toBeInTheDocument()
    })

    it('더보기 버튼이 게시판 목록 페이지로 연결되어 있다', () => {
        render(<BoardWidget boardPosts={mockBoardPosts} />)

        const moreButton = screen.getByText('더보기')
        const link = moreButton.closest('a')

        expect(link).toHaveAttribute('href', '/groupware/board')
    })

    it('빈 게시글 목록을 처리한다', () => {
        render(<BoardWidget boardPosts={[]} />)

        // 게시글이 없어도 컴포넌트가 정상적으로 렌더링되어야 함
        expect(screen.getByText('최근 게시글')).toBeInTheDocument()
        expect(screen.getByText('더보기')).toBeInTheDocument()
    })

    it('게시글 작성자 정보를 표시한다', () => {
        render(<BoardWidget boardPosts={mockBoardPosts} />)

        expect(screen.getByText('홍길동')).toBeInTheDocument()
        expect(screen.getByText('김철수')).toBeInTheDocument()
    })

    it('게시글 팀/카테고리 정보를 표시한다', () => {
        render(<BoardWidget boardPosts={mockBoardPosts} />)

        expect(screen.getByText('개발팀')).toBeInTheDocument()
        expect(screen.getByText('기획팀')).toBeInTheDocument()
    })

    it('게시글 날짜를 표시한다', () => {
        render(<BoardWidget boardPosts={mockBoardPosts} />)

        expect(screen.getByText('12.10')).toBeInTheDocument()
        expect(screen.getByText('12.09')).toBeInTheDocument()
    })
})
