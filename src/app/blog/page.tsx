import { SiteHeader } from '@/components/site-header'
import { SiteFooter } from '@/components/site-footer'
import Link from 'next/link'
import { Calendar, User } from 'lucide-react'

// Mock Data
const BLOG_POSTS = [
    {
        id: 1,
        title: "성공적인 프로젝트 관리를 위한 5가지 습관",
        excerpt: "프로젝트가 자꾸 지연되나요? 성공하는 팀들이 꼭 지키는 사소하지만 강력한 습관들을 소개합니다.",
        date: "2026.01.10",
        author: "워크비 팀",
        category: "업무 꿀팁",
        image: "/images/blog/project-tips.jpg"
    },
    {
        id: 2,
        title: "2026년 인사관리 트렌드 전망",
        excerpt: "변화하는 노동 환경과 법규, 2026년에는 어떤 점을 주목해야 할까요? 전문가들이 꼽은 HR 트렌드.",
        date: "2026.01.05",
        author: "HR 연구소",
        category: "인사이트",
        image: "/images/blog/hr-trends.jpg"
    },
    {
        id: 3,
        title: "워크비 도입 후 야근이 30% 줄어든 스타트업 이야기",
        excerpt: "A사 대표님의 생생한 인터뷰. '근태관리 자동화 덕분에 불필요한 행정 업무가 사라졌어요.'",
        date: "2025.12.28",
        author: "김코드 에디터",
        category: "고객 사례",
        image: "/images/blog/case-study-a.jpg"
    }
]

export default function BlogListPage() {
    return (
        <div className="flex flex-col min-h-screen bg-white font-sans text-slate-900">
            <SiteHeader />

            <main className="flex-1">
                {/* Header */}
                <section className="bg-slate-50 py-20 text-center border-b border-slate-200">
                    <div className="container mx-auto px-4">
                        <h1 className="text-4xl font-bold mb-4">워크비 블로그</h1>
                        <p className="text-slate-500 text-lg">
                            더 나은 업무 방식을 위한 고민과 노하우를 나눕니다.
                        </p>
                    </div>
                </section>

                {/* Blog Grid */}
                <section className="py-20">
                    <div className="container mx-auto px-4 lg:px-6">
                        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
                            {BLOG_POSTS.map((post) => (
                                <Link key={post.id} href={`/blog/${post.id}`} className="group block h-full">
                                    <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden hover:shadow-xl hover:-translate-y-1 transition-all duration-300 h-full flex flex-col">
                                        <div className="h-48 bg-slate-200 relative overflow-hidden">
                                            {/* Placeholder for Image */}
                                            <div className="absolute inset-0 flex items-center justify-center text-slate-400 font-medium bg-slate-100 group-hover:bg-slate-200 transition-colors">
                                                이미지 준비중
                                            </div>
                                        </div>
                                        <div className="p-6 flex-1 flex flex-col">
                                            <div className="text-xs font-bold text-emerald-600 mb-2 uppercase tracking-wide">
                                                {post.category}
                                            </div>
                                            <h3 className="text-xl font-bold text-slate-900 mb-3 group-hover:text-emerald-600 transition-colors line-clamp-2">
                                                {post.title}
                                            </h3>
                                            <p className="text-slate-500 text-sm leading-relaxed mb-6 line-clamp-3">
                                                {post.excerpt}
                                            </p>

                                            <div className="mt-auto flex items-center justify-between text-xs text-slate-400 border-t border-slate-100 pt-4">
                                                <div className="flex items-center gap-2">
                                                    <User className="w-3 h-3" /> {post.author}
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <Calendar className="w-3 h-3" /> {post.date}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </Link>
                            ))}
                        </div>
                    </div>
                </section>
            </main>

            <SiteFooter />
        </div>
    )
}
