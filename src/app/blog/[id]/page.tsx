import { SiteHeader } from '@/components/site-header'
import { SiteFooter } from '@/components/site-footer'
import Link from 'next/link'
import { Calendar, User, ArrowLeft, Share2 } from 'lucide-react'

export default function BlogPostPage({ params }: { params: { id: string } }) {
    // 실제로는 DB나 CMS에서 id로 데이터를 가져와야 합니다.
    // 여기서는 예시 정적 데이터를 보여줍니다.

    return (
        <div className="flex flex-col min-h-screen bg-white font-sans text-slate-900">
            <SiteHeader />

            <main className="flex-1">
                <article className="max-w-3xl mx-auto px-4 py-20">
                    <Link href="/blog" className="inline-flex items-center text-slate-500 hover:text-emerald-600 mb-8 transition-colors">
                        <ArrowLeft className="w-4 h-4 mr-2" />
                        블로그 목록으로
                    </Link>

                    <header className="mb-12">
                        <div className="text-sm font-bold text-emerald-600 mb-4 uppercase tracking-wide">
                            업무 꿀팁
                        </div>
                        <h1 className="text-4xl md:text-5xl font-bold text-slate-900 mb-6 leading-tight">
                            성공적인 프로젝트 관리를 위한 5가지 습관
                        </h1>
                        <div className="flex items-center justify-between text-slate-500 text-sm border-b border-slate-100 pb-8">
                            <div className="flex items-center gap-4">
                                <div className="flex items-center gap-2">
                                    <div className="w-8 h-8 bg-slate-100 rounded-full flex items-center justify-center">
                                        <User className="w-4 h-4 text-slate-400" />
                                    </div>
                                    <span className="font-medium text-slate-700">워크비 팀</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Calendar className="w-4 h-4" />
                                    <span>2026.01.10</span>
                                </div>
                            </div>
                            <button className="text-slate-400 hover:text-slate-600">
                                <Share2 className="w-5 h-5" />
                            </button>
                        </div>
                    </header>

                    <div className="prose prose-lg prose-slate max-w-none">
                        <p className="lead text-xl text-slate-600 mb-8">
                            프로젝트가 계획대로 끝나지 않아 고민이신가요?
                            성공하는 팀들이 공통적으로 가지고 있는 사소하지만 강력한 습관들을 소개합니다.
                            이 5가지만 지켜도 업무 효율이 2배는 올라갈 수 있습니다.
                        </p>

                        <h3 className="text-2xl font-bold text-slate-800 mt-12 mb-4">1. 모든 업무를 시각화하세요</h3>
                        <p>
                            머릿속에 있는 계획은 계획이 아닙니다.
                            <strong>칸반 보드</strong>나 <strong>간트 차트</strong>를 활용해 모든 업무를 눈에 보이게 만드세요.
                            누가 무엇을 하고 있는지 한눈에 파악하는 것이 관리의 시작입니다.
                        </p>

                        <h3 className="text-2xl font-bold text-slate-800 mt-12 mb-4">2. 데일리 스크럼은 짧게</h3>
                        <p>
                            회의가 길어지면 일이 멈춥니다. 매일 아침 15분,
                            어제 한 일과 오늘 할 일, 그리고 장애물만 빠르게 공유하세요.
                            워크비의 댓글 기능을 활용하면 비대면으로도 충분합니다.
                        </p>

                        <div className="bg-slate-50 p-6 rounded-xl border-l-4 border-emerald-500 my-8 italic text-slate-600">
                            "기록하지 않는 것은 관리되지 않는다. 하지만 너무 많은 기록은 일을 방해한다."
                        </div>

                        <h3 className="text-2xl font-bold text-slate-800 mt-12 mb-4">3. 마감일은 여유 있게</h3>
                        <p>
                            항상 예상치 못한 변수가 생깁니다.
                            스스로 생각하는 마감일보다 하루 이틀 정도 여유를 두고 일정을 잡으세요.
                            그래야 사고가 터져도 수습할 시간이 생깁니다.
                        </p>

                        <p className="mt-12">
                            더 많은 프로젝트 관리 노하우가 궁금하다면,<br />
                            지금 바로 <strong>워크비</strong>를 무료로 시작해보세요.
                        </p>
                    </div>

                    <div className="mt-16 pt-12 border-t border-slate-200">
                        <div className="bg-emerald-50 rounded-2xl p-8 text-center">
                            <h3 className="text-2xl font-bold text-slate-900 mb-4">우리 팀의 변화, 지금 시작하세요</h3>
                            <p className="text-slate-600 mb-8">20명까지 평생 무료로 모든 기능을 사용할 수 있습니다.</p>
                            <Link href="/dashboard" className="inline-block px-8 py-4 bg-emerald-600 text-white rounded-xl font-bold hover:bg-emerald-700 transition-colors shadow-lg shadow-emerald-200">
                                무료로 시작하기
                            </Link>
                        </div>
                    </div>
                </article>
            </main>

            <SiteFooter />
        </div>
    )
}
