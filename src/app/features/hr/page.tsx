import { SiteHeader } from '@/components/site-header'
import { SiteFooter } from '@/components/site-footer'
import Link from 'next/link'
import { Clock, CheckCircle2, ArrowRight } from 'lucide-react'

export default function HRFeaturePage() {
    return (
        <div className="flex flex-col min-h-screen bg-white font-sans text-slate-900">
            <SiteHeader />

            <main className="flex-1">
                {/* Feature Hero */}
                <section className="bg-slate-50 py-24 md:py-32">
                    <div className="container mx-auto px-4 lg:px-6 text-center">
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-100 text-emerald-700 text-sm font-bold mb-8">
                            <Clock className="w-4 h-4" /> SMART HR
                        </div>
                        <h1 className="text-5xl md:text-6xl font-bold mb-6 text-slate-900 leading-tight">
                            근태관리가<br />
                            <span className="text-emerald-600">저절로 됩니다</span>
                        </h1>
                        <p className="text-xl text-slate-600 max-w-2xl mx-auto mb-12">
                            출퇴근 기록부터 연차 관리, 급여 정산 데이터까지.<br />
                            워크비 하나면 인사 담당자가 필요 없습니다.
                        </p>
                    </div>
                </section>

                {/* Feature Detail 1: Commute */}
                <section className="py-24">
                    <div className="container mx-auto px-4 lg:px-6">
                        <div className="grid md:grid-cols-2 gap-16 items-center">
                            <div className="order-2 md:order-1 space-y-6">
                                <h3 className="text-3xl font-bold text-slate-900">
                                    부정 출근 걱정 없는 <span className="text-emerald-600">스마트 체크</span>
                                </h3>
                                <p className="text-lg text-slate-600 leading-relaxed">
                                    GPS와 IP 기반으로 지정된 장소에서만 출근이 가능합니다.<br />
                                    재택근무 시에도 정확한 근태 기록이 가능합니다.
                                </p>
                                <ul className="space-y-3">
                                    {['GPS/IP 출퇴근 제한', '재택/외근 원격 신청 승인', '실시간 근무 현황판'].map((item, i) => (
                                        <li key={i} className="flex items-center gap-3 text-slate-700">
                                            <CheckCircle2 className="w-5 h-5 text-emerald-500" /> {item}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                            <div className="order-1 md:order-2 bg-emerald-50 rounded-2xl p-8 h-80 flex items-center justify-center">
                                {/* Visual Placeholder */}
                                <div className="text-emerald-400">출퇴근 체크화면 영역</div>
                            </div>
                        </div>
                    </div>
                </section>

                {/* Feature Detail 2: Vacation */}
                <section className="py-24 bg-slate-50">
                    <div className="container mx-auto px-4 lg:px-6">
                        <div className="grid md:grid-cols-2 gap-16 items-center">
                            <div className="bg-white rounded-2xl p-8 h-80 flex items-center justify-center border border-slate-200">
                                {/* Visual Placeholder */}
                                <div className="text-slate-400">휴가 관리 화면 영역</div>
                            </div>
                            <div className="space-y-6">
                                <h3 className="text-3xl font-bold text-slate-900">
                                    자동으로 계산되는 <span className="text-emerald-600">연차 관리</span>
                                </h3>
                                <p className="text-lg text-slate-600 leading-relaxed">
                                    입사일만 입력하세요. 법정 기준에 맞춰 연차가 자동 생성됩니다.<br />
                                    사용 내역과 잔여 연차도 직원들이 직접 확인합니다.
                                </p>
                                <ul className="space-y-3">
                                    {['근로기준법 맞춤 자동 생성', '반차/반반차 등 다양한 유형', '연차 촉진 제도 대응'].map((item, i) => (
                                        <li key={i} className="flex items-center gap-3 text-slate-700">
                                            <CheckCircle2 className="w-5 h-5 text-emerald-500" /> {item}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        </div>
                    </div>
                </section>

                {/* CTA */}
                <section className="py-24 text-center">
                    <h2 className="text-3xl font-bold mb-6">인사관리, 이제 엑셀은 그만!</h2>
                    <Link href="/dashboard" className="inline-flex items-center gap-2 px-8 py-4 bg-emerald-600 text-white rounded-xl font-bold text-lg hover:bg-emerald-700 transition-colors">
                        무료로 시작하기 <ArrowRight className="w-5 h-5" />
                    </Link>
                </section>
            </main>

            <SiteFooter />
        </div>
    )
}
