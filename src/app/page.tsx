import Link from 'next/link'
import { ArrowRight, CheckCircle2, Layout, Users, BarChart3, Clock } from 'lucide-react'

export default function Home() {
  return (
    <div className="flex flex-col min-h-screen bg-background">
      {/* Header */}
      <header className="px-6 h-16 flex items-center justify-between border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center text-primary-foreground font-bold text-lg">
            W
          </div>
          <span className="font-bold text-xl tracking-tight">WORKB</span>
        </div>
        <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-muted-foreground">
          <Link href="#features" className="hover:text-foreground transition-colors">기능</Link>
          <Link href="#pricing" className="hover:text-foreground transition-colors">요금제</Link>
          <Link href="#about" className="hover:text-foreground transition-colors">소개</Link>
        </nav>
        <div className="flex items-center gap-4">
          <Link href="/login" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
            로그인
          </Link>
          <Link href="/dashboard" className="bg-primary text-primary-foreground hover:bg-primary/90 px-4 py-2 rounded-lg text-sm font-medium transition-colors">
            무료로 시작하기
          </Link>
        </div>
      </header>

      <main className="flex-1">
        {/* Hero Section */}
        <section className="py-24 px-6 text-center relative overflow-hidden">
          <div className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary/20 via-background to-background opacity-40"></div>
          <div className="max-w-4xl mx-auto space-y-8">
            <div className="inline-flex items-center rounded-full border border-primary/20 bg-primary/5 px-3 py-1 text-sm font-medium text-primary">
              <span className="flex h-2 w-2 rounded-full bg-primary mr-2"></span>
              v1.0 정식 출시
            </div>
            <h1 className="text-5xl md:text-7xl font-bold tracking-tight text-foreground">
              프로젝트와 회사를 <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-purple-600">
                하나의 워크스페이스에서
              </span>
            </h1>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
              프로젝트 관리부터 근태, 전자결재, 재무까지. <br className="hidden md:block" />
              흩어진 업무 도구를 WORKB 하나로 통합하세요.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
              <Link href="/dashboard" className="h-12 px-8 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 flex items-center justify-center gap-2 font-semibold text-lg transition-all shadow-lg shadow-primary/20">
                무료로 시작하기 <ArrowRight className="w-5 h-5" />
              </Link>
              <Link href="#demo" className="h-12 px-8 rounded-xl border border-input bg-background hover:bg-accent hover:text-accent-foreground flex items-center justify-center font-medium text-lg transition-colors">
                데모 영상 보기
              </Link>
            </div>
          </div>

          {/* Dashboard Preview Placeholder */}
          <div className="mt-20 max-w-6xl mx-auto rounded-xl border border-border/50 shadow-2xl overflow-hidden bg-card/50 backdrop-blur-sm p-2">
            <div className="aspect-[16/9] bg-slate-100 rounded-lg flex items-center justify-center text-slate-400">
              {/* This would be a real screenshot */}
              <div className="text-center">
                <Layout className="w-16 h-16 mx-auto mb-4 opacity-50" />
                <p>Dashboard Preview</p>
              </div>
            </div>
          </div>
        </section>

        {/* Features Grid */}
        <section id="features" className="py-24 px-6 bg-slate-50/50 dark:bg-slate-900/20">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-16 space-y-4">
              <h2 className="text-3xl font-bold tracking-tight">모든 업무를 한곳에서</h2>
              <p className="text-muted-foreground text-lg">복잡한 도구들을 더 이상 따로 쓰지 마세요.</p>
            </div>

            <div className="grid md:grid-cols-3 gap-8">
              {/* Feature 1 */}
              <div className="bg-card p-8 rounded-2xl border border-border/50 shadow-sm hover:shadow-md transition-shadow">
                <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-xl flex items-center justify-center text-blue-600 mb-6">
                  <Layout className="w-6 h-6" />
                </div>
                <h3 className="text-xl font-bold mb-3">강력한 프로젝트 관리</h3>
                <p className="text-muted-foreground leading-relaxed">
                  칸반 보드, 간트 차트, 마인드맵까지.
                  프로젝트의 모든 단계를 시각적으로 관리하세요.
                </p>
              </div>

              {/* Feature 2 */}
              <div className="bg-card p-8 rounded-2xl border border-border/50 shadow-sm hover:shadow-md transition-shadow">
                <div className="w-12 h-12 bg-green-100 dark:bg-green-900/30 rounded-xl flex items-center justify-center text-green-600 mb-6">
                  <Clock className="w-6 h-6" />
                </div>
                <h3 className="text-xl font-bold mb-3">스마트한 근태 관리</h3>
                <p className="text-muted-foreground leading-relaxed">
                  유연근무, 재택근무, 휴가 관리까지.
                  복잡한 HR 정책을 시스템으로 자동화하세요.
                </p>
              </div>

              {/* Feature 3 */}
              <div className="bg-card p-8 rounded-2xl border border-border/50 shadow-sm hover:shadow-md transition-shadow">
                <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900/30 rounded-xl flex items-center justify-center text-purple-600 mb-6">
                  <BarChart3 className="w-6 h-6" />
                </div>
                <h3 className="text-xl font-bold mb-3">실시간 재무/손익</h3>
                <p className="text-muted-foreground leading-relaxed">
                  계약부터 인보이스, 비용 처리까지.
                  프로젝트별 손익을 실시간으로 확인하세요.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-24 px-6 text-center">
          <div className="max-w-3xl mx-auto bg-primary rounded-3xl p-12 text-primary-foreground shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-white/20 to-transparent opacity-50"></div>
            <div className="relative z-10 space-y-8">
              <h2 className="text-3xl md:text-4xl font-bold">지금 바로 시작하세요</h2>
              <p className="text-primary-foreground/80 text-lg max-w-xl mx-auto">
                30일 무료 체험으로 WORKB의 모든 기능을 경험해보세요.
                카드 등록 없이 바로 시작할 수 있습니다.
              </p>
              <Link href="/dashboard" className="inline-flex h-12 px-8 rounded-xl bg-background text-foreground hover:bg-background/90 items-center justify-center font-semibold text-lg transition-colors">
                무료로 시작하기
              </Link>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-border/40 py-12 px-6 bg-slate-50 dark:bg-slate-900/20">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-primary rounded-md flex items-center justify-center text-primary-foreground font-bold text-xs">
              W
            </div>
            <span className="font-bold text-lg">WORKB</span>
          </div>
          <div className="text-sm text-muted-foreground">
            © 2024 CodeB Platform. All rights reserved.
          </div>
          <div className="flex gap-6 text-sm text-muted-foreground">
            <Link href="#" className="hover:text-foreground">이용약관</Link>
            <Link href="#" className="hover:text-foreground">개인정보처리방침</Link>
            <Link href="#" className="hover:text-foreground">문의하기</Link>
          </div>
        </div>
      </footer>
    </div>
  )
}
