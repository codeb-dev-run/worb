import { SiteHeader } from '@/components/site-header'
import { SiteFooter } from '@/components/site-footer'
import Link from 'next/link'
import Image from 'next/image'
import { Layout, CheckCircle2, ArrowRight } from 'lucide-react'

export default function ProjectFeaturePage() {
    return (
        <div className="flex flex-col min-h-screen bg-white font-sans text-slate-900">
            <SiteHeader />

            <main className="flex-1">
                {/* Feature Hero */}
                <section className="bg-slate-50 py-24 md:py-32">
                    <div className="container mx-auto px-4 lg:px-6 text-center">
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-100 text-blue-700 text-sm font-bold mb-8">
                            <Layout className="w-4 h-4" /> PROJECT MANAGEMENT
                        </div>
                        <h1 className="text-5xl md:text-6xl font-bold mb-6 text-slate-900 leading-tight">
                            프로젝트 관리가<br />
                            <span className="text-blue-600">이렇게 쉬워집니다</span>
                        </h1>
                        <p className="text-xl text-slate-600 max-w-2xl mx-auto mb-12">
                            복잡한 매뉴얼은 잊으세요. 워크비 프로젝트 관리는<br />
                            직관적인 UI로 누구나 1분 만에 적응할 수 있습니다.
                        </p>
                        <div className="relative max-w-5xl mx-auto shadow-2xl rounded-2xl overflow-hidden border border-slate-200">
                            <Image
                                src="/images/dashboard-preview.png"
                                width={1200}
                                height={675}
                                alt="Project Dashboard"
                                className="w-full h-auto"
                            />
                        </div>
                    </div>
                </section>

                {/* Feature Detail 1: Kanban */}
                <section className="py-24">
                    <div className="container mx-auto px-4 lg:px-6">
                        <div className="grid md:grid-cols-2 gap-16 items-center">
                            <div className="order-2 md:order-1 space-y-6">
                                <h3 className="text-3xl font-bold text-slate-900">
                                    한눈에 보이는 <span className="text-blue-600">칸반 보드</span>
                                </h3>
                                <p className="text-lg text-slate-600 leading-relaxed">
                                    포스트잇을 붙이듯 업무를 생성하고,<br />
                                    진행 상황에 따라 드래그하여 이동하세요.
                                </p>
                                <ul className="space-y-3">
                                    {['상태별 업무 분류 (할 일, 진행 중, 완료)', '담당자 지정 및 마감일 설정', '우선순위 라벨링'].map((item, i) => (
                                        <li key={i} className="flex items-center gap-3 text-slate-700">
                                            <CheckCircle2 className="w-5 h-5 text-blue-500" /> {item}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                            <div className="order-1 md:order-2 bg-slate-100 rounded-2xl p-8 h-80 flex items-center justify-center">
                                {/* Visual Placeholder */}
                                <div className="text-slate-400">칸반 보드 이미지 영역</div>
                            </div>
                        </div>
                    </div>
                </section>

                {/* Feature Detail 2: Gantt */}
                <section className="py-24 bg-slate-50">
                    <div className="container mx-auto px-4 lg:px-6">
                        <div className="grid md:grid-cols-2 gap-16 items-center">
                            <div className="bg-white rounded-2xl p-8 h-80 flex items-center justify-center border border-slate-200">
                                {/* Visual Placeholder */}
                                <div className="text-slate-400">간트 차트 이미지 영역</div>
                            </div>
                            <div className="space-y-6">
                                <h3 className="text-3xl font-bold text-slate-900">
                                    전체 흐름을 파악하는 <span className="text-purple-600">간트 차트</span>
                                </h3>
                                <p className="text-lg text-slate-600 leading-relaxed">
                                    프로젝트의 시작부터 끝까지, 타임라인으로 확인하세요.<br />
                                    일정이 변경되어도 드래그 한 번이면 수정됩니다.
                                </p>
                                <ul className="space-y-3">
                                    {['직관적인 타임라인 뷰', '마일스톤 설정', '업무 간 의존성 연결'].map((item, i) => (
                                        <li key={i} className="flex items-center gap-3 text-slate-700">
                                            <CheckCircle2 className="w-5 h-5 text-purple-500" /> {item}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        </div>
                    </div>
                </section>

                {/* CTA */}
                <section className="py-24 text-center">
                    <h2 className="text-3xl font-bold mb-6">지금 바로 시작해볼까요?</h2>
                    <Link href="/dashboard" className="inline-flex items-center gap-2 px-8 py-4 bg-emerald-600 text-white rounded-xl font-bold text-lg hover:bg-emerald-700 transition-colors">
                        무료로 프로젝트 만들기 <ArrowRight className="w-5 h-5" />
                    </Link>
                </section>
            </main>

            <SiteFooter />
        </div>
    )
}
