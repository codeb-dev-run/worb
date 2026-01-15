import Link from 'next/link'
import Image from 'next/image'
import {
  ArrowRight, Check, Layout, Clock, Shield, Globe, Menu, X, CheckCircle2,
  Users, Zap, Calendar, FileText, Smartphone, ChevronRight, Star, HelpCircle
} from 'lucide-react'
import { SiteHeader } from '@/components/site-header'
import { SiteFooter } from '@/components/site-footer'

export default function Home() {
  return (
    <div className="flex flex-col min-h-screen bg-white text-slate-900 selection:bg-emerald-100 selection:text-emerald-900 font-sans">

      <SiteHeader />

      <main className="flex-1">
        {/* Hero Section */}
        <section className="relative pt-24 pb-32 overflow-hidden">
          <div className="absolute top-0 inset-x-0 h-[800px] bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-emerald-50 via-white to-white -z-10" />

          <div className="container mx-auto px-4 lg:px-6 text-center space-y-10 relative z-10">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 px-5 py-2 rounded-full bg-white border border-emerald-100 text-emerald-700 text-sm font-bold shadow-sm animate-fade-in-up hover:border-emerald-200 transition-colors cursor-default">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
              20명 미만 100% 평생 무료
            </div>

            {/* Headline */}
            <h1 className="text-5xl md:text-7xl font-bold tracking-tight leading-[1.1] text-slate-900 max-w-6xl mx-auto">
              협업과 근태관리를<br className="md:hidden" /> 한 번에,<br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-600 to-teal-600">
                가장 쉬운 그룹웨어 워크비
              </span>
            </h1>

            <p className="text-xl md:text-2xl text-slate-600 max-w-3xl mx-auto leading-relaxed font-medium">
              다른 도구는 필요 없습니다.<br className="hidden md:block" />
              프로젝트 관리부터 출퇴근 체크까지, 워크비 하나로 충분합니다.
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-5 pt-6">
              <Link
                href="/dashboard"
                className="w-full sm:w-auto h-16 px-10 rounded-xl bg-emerald-600 text-white font-bold text-lg hover:bg-emerald-700 transition-all shadow-xl shadow-emerald-500/20 hover:shadow-emerald-500/30 hover:-translate-y-1 flex items-center justify-center gap-3"
              >
                지금 무료로 시작하기 <ArrowRight className="w-5 h-5" />
              </Link>
              <Link
                href="/features/project"
                className="w-full sm:w-auto h-16 px-10 rounded-xl bg-white border border-slate-200 text-slate-700 font-bold text-lg hover:bg-slate-50 transition-all hover:-translate-y-1 flex items-center justify-center gap-2"
              >
                기능 자세히 보기
              </Link>
            </div>

            {/* Dashboard Visual (Browser Mockup) */}
            <div className="mt-24 max-w-7xl mx-auto transform hover:scale-[1.01] transition-transform duration-700">
              <div className="relative rounded-2xl bg-white shadow-[0_20px_60px_-15px_rgba(0,0,0,0.1)] border border-slate-200/60 p-2 md:p-4">
                {/* Browser Controls */}
                <div className="absolute top-0 left-0 w-full h-10 flex items-center gap-2 px-5 border-b border-slate-100 bg-slate-50/80 backdrop-blur rounded-t-xl z-20">
                  <div className="flex gap-2">
                    <div className="w-3 h-3 rounded-full bg-red-400/80"></div>
                    <div className="w-3 h-3 rounded-full bg-amber-400/80"></div>
                    <div className="w-3 h-3 rounded-full bg-emerald-400/80"></div>
                  </div>
                  <div className="flex-1 mx-4">
                    <div className="max-w-md mx-auto h-6 bg-white rounded-md border border-slate-200 flex items-center justify-center text-xs text-slate-400 font-medium">
                      workb.co.kr
                    </div>
                  </div>
                </div>

                {/* Image Placeholder */}
                <div className="pt-10 bg-slate-50 rounded-lg overflow-hidden aspect-[16/10] relative group">
                  <Image
                    src="/images/dashboard-preview.png"
                    alt="WorkB Dashboard Interface"
                    fill
                    priority
                    className="object-cover object-top"
                  />
                  {/* Overlay shadow for depth */}
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-900/5 to-transparent pointer-events-none"></div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Why WorkB Section */}
        <section className="py-32 bg-slate-50">
          <div className="container mx-auto px-4 lg:px-6">
            <div className="text-center max-w-3xl mx-auto mb-20">
              <h2 className="text-base font-bold text-emerald-600 tracking-wide uppercase mb-3">Why WorkB?</h2>
              <h3 className="text-3xl md:text-5xl font-bold text-slate-900 mb-6 leading-tight">
                왜 <span className="text-emerald-600">워크비</span>여야 할까요?
              </h3>
              <p className="text-xl text-slate-600 leading-relaxed">
                근태관리 따로, 협업툴 따로... 불편하지 않으셨나요?<br />
                워크비는 기업 운영에 꼭 필요한 기능만 모아 가장 쉽게 만들었습니다.
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-8">
              {[
                {
                  icon: <Zap className="w-8 h-8 text-amber-500" />,
                  title: "압도적인 속도",
                  desc: "무거운 그룹웨어는 이제 그만. 로딩 없는 쾌적한 속도로 업무 효율을 높여드립니다."
                },
                {
                  icon: <Layout className="w-8 h-8 text-blue-500" />,
                  title: "직관적인 UI",
                  desc: "매뉴얼이 필요 없습니다. 카톡을 쓸 줄 안다면 누구나 바로 업무에 활용할 수 있습니다."
                },
                {
                  icon: <Shield className="w-8 h-8 text-emerald-500" />,
                  title: "엔터프라이즈급 보안",
                  desc: "모든 데이터는 암호화되어 저장되며, 매일 자동으로 백업됩니다. 안심하고 사용하세요."
                }
              ].map((item, i) => (
                <div key={i} className="bg-white p-10 rounded-3xl shadow-sm border border-slate-100 hover:shadow-xl hover:-translate-y-2 transition-all duration-300 group">
                  <div className="w-16 h-16 rounded-2xl bg-slate-50 flex items-center justify-center mb-8 group-hover:scale-110 transition-transform">
                    {item.icon}
                  </div>
                  <h4 className="text-2xl font-bold text-slate-900 mb-4">{item.title}</h4>
                  <p className="text-slate-600 leading-relaxed text-lg">
                    {item.desc}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Deep Dive 1: Project Management */}
        <section id="features" className="py-32 bg-white overflow-hidden">
          <div className="container mx-auto px-4 lg:px-6">
            <div className="flex flex-col lg:flex-row items-center gap-16 lg:gap-24">
              <div className="lg:w-1/2 space-y-10">
                <div>
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 text-blue-600 text-sm font-bold mb-6">
                    PROJECT MANAGEMENT
                  </div>
                  <h2 className="text-4xl md:text-5xl font-bold text-slate-900 leading-tight mb-6">
                    업무 흐름이 한눈에 보이는<br />
                    <span className="text-blue-600">쉬운 프로젝트 관리</span>
                  </h2>
                  <p className="text-xl text-slate-600 leading-relaxed">
                    할 일, 진행 중, 완료. 상태별로 업무를 시각화하세요.<br />
                    팀원 간의 업무 공유가 놀랍도록 투명해집니다.
                  </p>
                </div>

                <div className="space-y-6">
                  {[
                    { title: "칸반 보드 (Kanban)", desc: "포스트잇처럼 드래그하여 업무 상태를 변경하세요." },
                    { title: "간트 차트 (Gantt)", desc: "프로젝트 전체 일정을 타임라인으로 한눈에 파악합니다." },
                    { title: "실시간 피드백", desc: "업무 카드 내에서 댓글과 파일 첨부로 바로 소통합니다." }
                  ].map((feature, i) => (
                    <div key={i} className="flex gap-4 p-4 rounded-xl hover:bg-slate-50 transition-colors">
                      <div className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 mt-1">
                        <Check className="w-3.5 h-3.5" />
                      </div>
                      <div>
                        <h4 className="text-lg font-bold text-slate-900 mb-1">{feature.title}</h4>
                        <p className="text-slate-600">{feature.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>

                <Link href="/features/project" className="inline-flex items-center font-bold text-blue-600 hover:text-blue-700 hover:underline">
                  프로젝트 기능 더 자세히 보기 <ArrowRight className="w-4 h-4 ml-1" />
                </Link>
              </div>

              <div className="lg:w-1/2 relative">
                <div className="absolute -inset-4 bg-gradient-to-r from-blue-100 to-indigo-50 rounded-[3rem] transform rotate-3 -z-10 opacity-70"></div>
                <div className="relative bg-white rounded-3xl shadow-2xl border border-slate-100 p-2 overflow-hidden">
                  <Image
                    src="/images/dashboard-preview.png"
                    width={800}
                    height={600}
                    alt="Project Board"
                    className="rounded-2xl"
                  />
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Deep Dive 2: HR & Attendance */}
        <section className="py-32 bg-slate-50 overflow-hidden">
          <div className="container mx-auto px-4 lg:px-6">
            <div className="flex flex-col lg:flex-row-reverse items-center gap-16 lg:gap-24">
              <div className="lg:w-1/2 space-y-10">
                <div>
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-100 text-emerald-700 text-sm font-bold mb-6">
                    SMART HR
                  </div>
                  <h2 className="text-4xl md:text-5xl font-bold text-slate-900 leading-tight mb-6">
                    버튼 하나로 끝나는<br />
                    <span className="text-emerald-600">스마트한 근태관리</span>
                  </h2>
                  <p className="text-xl text-slate-600 leading-relaxed">
                    출근부터 퇴근까지, 번거로운 기록은 이제 그만.<br />
                    복잡한 주 52시간 관리도 워크비가 알아서 체크해드립니다.
                  </p>
                </div>

                <div className="space-y-6">
                  {[
                    { title: "원클릭 출퇴근", desc: "GPS/IP 기반으로 언제 어디서든 정확하게 기록합니다." },
                    { title: "자동 연차 관리", desc: "입사일 기준 자동 생성 및 남은 연차 실시간 조회." },
                    { title: "초과근무 알림", desc: "법정 근로시간 초과 전 관리자에게 자동 알림 발송." }
                  ].map((feature, i) => (
                    <div key={i} className="flex gap-4 p-4 rounded-xl hover:bg-white transition-colors">
                      <div className="flex-shrink-0 w-6 h-6 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600 mt-1">
                        <Check className="w-3.5 h-3.5" />
                      </div>
                      <div>
                        <h4 className="text-lg font-bold text-slate-900 mb-1">{feature.title}</h4>
                        <p className="text-slate-600">{feature.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>

                <Link href="/features/hr" className="inline-flex items-center font-bold text-emerald-600 hover:text-emerald-700 hover:underline">
                  근태관리 기능 더 자세히 보기 <ArrowRight className="w-4 h-4 ml-1" />
                </Link>
              </div>

              <div className="lg:w-1/2 relative">
                <div className="absolute -inset-4 bg-gradient-to-r from-emerald-100 to-teal-50 rounded-[3rem] transform -rotate-3 -z-10 opacity-70"></div>
                <div className="relative bg-white rounded-3xl shadow-2xl border border-slate-100 flex items-center justify-center h-[500px] overflow-hidden">
                  <div className="text-center p-10">
                    <Smartphone className="w-24 h-24 text-emerald-500 mx-auto mb-4" />
                    <p className="font-bold text-slate-400">모바일 출퇴근 화면</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>


        {/* Pricing Section */}
        <section id="pricing" className="py-32 bg-white text-center">
          <div className="container mx-auto px-4 lg:px-6">
            <div className="mb-20">
              <h2 className="text-4xl md:text-5xl font-bold text-slate-900 mb-6">
                가격 정책은 <span className="text-emerald-600">단순해야 합니다</span>
              </h2>
              <p className="text-xl text-slate-600">
                복잡한 옵션 없이, 인원 수에 따라 심플하게 결정하세요.
              </p>
            </div>

            <div className="grid md:grid-cols-2 gap-8 max-w-5xl mx-auto">
              {/* Free Plan */}
              <div className="relative rounded-[2.5rem] bg-white border-2 border-emerald-500 p-10 md:p-14 shadow-2xl shadow-emerald-500/10 overflow-hidden text-left group hover:-translate-y-2 transition-transform duration-300">
                <div className="absolute top-0 right-0 bg-emerald-500 text-white text-sm font-bold px-6 py-3 rounded-bl-2xl">
                  가장 인기있는 플랜
                </div>
                <h3 className="text-3xl font-bold text-slate-900 mb-2">스타트업</h3>
                <div className="flex items-baseline gap-1 my-8">
                  <span className="text-6xl font-extrabold text-emerald-600 tracking-tight">0</span>
                  <span className="text-2xl font-bold text-slate-400">원</span>
                  <span className="ml-2 text-slate-500 font-medium">/ 평생</span>
                </div>
                <p className="text-lg text-slate-600 mb-10 font-medium border-b border-slate-100 pb-10">
                  20명 이하 팀이라면 충분합니다.<br />
                  모든 기능을 제한 없이 사용하세요.
                </p>

                <ul className="space-y-5 mb-12">
                  {[
                    "최대 20명 사용자",
                    "모든 프로젝트 기능 무제한",
                    "모든 근태/인사 기능 무제한",
                    "기본 5GB 저장공간 제공",
                    "모바일 앱 지원"
                  ].map((feat, i) => (
                    <li key={i} className="flex items-center gap-4 text-lg">
                      <CheckCircle2 className="w-6 h-6 text-emerald-500 flex-shrink-0" />
                      <span className="text-slate-700 font-medium">{feat}</span>
                    </li>
                  ))}
                </ul>

                <Link href="/dashboard" className="block w-full py-5 rounded-2xl bg-emerald-600 text-white text-center font-bold text-xl hover:bg-emerald-700 transition-colors shadow-lg shadow-emerald-200">
                  지금 무료로 시작하기
                </Link>
              </div>

              {/* Enterprise Plan */}
              <div className="rounded-[2.5rem] bg-slate-50 border border-slate-200 p-10 md:p-14 text-left hover:bg-white hover:shadow-xl transition-all duration-300">
                <h3 className="text-3xl font-bold text-slate-900 mb-2">엔터프라이즈</h3>
                <div className="flex items-baseline gap-1 my-8">
                  <span className="text-4xl font-bold text-slate-700">별도 문의</span>
                </div>
                <p className="text-lg text-slate-600 mb-10 font-medium border-b border-slate-200 pb-10">
                  20명 초과, 무제한 용량이 필요하신가요?<br />
                  합리적인 가격으로 제안해 드립니다.
                </p>

                <ul className="space-y-5 mb-12 opacity-80">
                  {[
                    "21명 이상 사용자",
                    "무제한 저장공간",
                    "전담 매니저 지원",
                    "API 연동 지원",
                    "사내 구축(On-premise) 옵션"
                  ].map((feat, i) => (
                    <li key={i} className="flex items-center gap-4 text-lg">
                      <Check className="w-6 h-6 text-slate-400 flex-shrink-0" />
                      <span className="text-slate-600 font-medium">{feat}</span>
                    </li>
                  ))}
                </ul>

                <Link href="#" className="block w-full py-5 rounded-2xl bg-white border-2 border-slate-200 text-slate-700 text-center font-bold text-xl hover:border-slate-300 hover:bg-slate-50 transition-colors">
                  도입 문의하기
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* FAQ Section */}
        <section id="faq" className="py-24 bg-slate-50">
          <div className="container mx-auto px-4 lg:px-6">
            <h2 className="text-3xl font-bold text-center mb-16">자주 묻는 질문</h2>
            <div className="max-w-3xl mx-auto space-y-4">
              {[
                { q: "정말로 무료인가요?", a: "네, 20명 이하 팀은 인원 수가 초과되지 않는 한 평생 무료로 사용하실 수 있습니다." },
                { q: "데이터는 안전한가요?", a: "모든 데이터는 금융권 수준의 암호화 기술(AES-256)로 보호되며, 매일 2회 자동 백업됩니다." },
                { q: "사용법이 어렵지는 않나요?", a: "워크비는 별도의 교육 없이도 바로 사용할 수 있도록 직관적으로 설계되었습니다." },
                { q: "모바일 앱도 있나요?", a: "네, 안드로이드와 iOS 모두 지원하며 PC와 완벽하게 동기화됩니다." }
              ].map((item, i) => (
                <div key={i} className="bg-white rounded-2xl p-8 shadow-sm border border-slate-100 hover:shadow-md transition-shadow">
                  <h4 className="text-xl font-bold text-slate-900 mb-3 flex items-start gap-3">
                    <HelpCircle className="w-6 h-6 text-emerald-500 mt-0.5 flex-shrink-0" />
                    {item.q}
                  </h4>
                  <p className="text-slate-600 pl-9 leading-relaxed">{item.a}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  )
}
