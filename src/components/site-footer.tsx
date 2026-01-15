import Link from 'next/link'

export function SiteFooter() {
    return (
        <footer className="border-t border-slate-200 bg-white pt-20 pb-12">
            <div className="container mx-auto px-4 lg:px-6">
                <div className="grid md:grid-cols-4 gap-12 mb-16">
                    <div className="col-span-1 md:col-span-2">
                        <div className="flex items-center gap-2.5 mb-6">
                            <div className="w-8 h-8 bg-emerald-600 rounded-lg flex items-center justify-center text-white font-bold">W</div>
                            <span className="font-bold text-xl text-slate-900">WORKB</span>
                        </div>
                        <p className="text-slate-500 leading-relaxed mb-6 max-w-sm">
                            워크비는 기업의 성장을 돕는 올인원 협업 플랫폼입니다.<br />
                            더 나은 업무 환경을 위해 끊임없이 고민합니다.
                        </p>
                        <div className="flex gap-4">
                            <div className="w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center text-slate-400 hover:bg-emerald-50 hover:text-emerald-600 cursor-pointer transition-colors font-bold text-xs">B</div>
                            <div className="w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center text-slate-400 hover:bg-emerald-50 hover:text-emerald-600 cursor-pointer transition-colors font-bold text-xs">F</div>
                            <div className="w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center text-slate-400 hover:bg-emerald-50 hover:text-emerald-600 cursor-pointer transition-colors font-bold text-xs">I</div>
                        </div>
                    </div>
                    <div>
                        <h4 className="font-bold text-slate-900 mb-6">서비스</h4>
                        <ul className="space-y-3 text-slate-500 text-sm">
                            <li><Link href="/features/project" className="hover:text-emerald-600 transition-colors">프로젝트 관리</Link></li>
                            <li><Link href="/features/hr" className="hover:text-emerald-600 transition-colors">근태/인사</Link></li>
                            <li><Link href="/#pricing" className="hover:text-emerald-600 transition-colors">요금 안내</Link></li>
                            <li><Link href="/blog" className="hover:text-emerald-600 transition-colors">블로그</Link></li>
                        </ul>
                    </div>
                    <div>
                        <h4 className="font-bold text-slate-900 mb-6">고객 지원</h4>
                        <ul className="space-y-3 text-slate-500 text-sm">
                            <li><Link href="#" className="hover:text-emerald-600 transition-colors">도움말 센터</Link></li>
                            <li><Link href="#" className="hover:text-emerald-600 transition-colors">일대일 문의</Link></li>
                            <li><Link href="#" className="hover:text-emerald-600 transition-colors">제휴 문의</Link></li>
                        </ul>
                    </div>
                </div>

                <div className="pt-8 border-t border-slate-100 flex flex-col md:flex-row justify-between items-center gap-4 text-sm text-slate-400">
                    <div className="flex flex-col md:flex-row gap-2 md:gap-8 text-center md:text-left">
                        <span>(주)코드비 플랫폼</span>
                        <span>사업자등록번호: 123-45-67890</span>
                        <span>대표: 김코드</span>
                        <span>서울시 강남구 테헤란로 123</span>
                    </div>
                    <div className="flex gap-6">
                        <Link href="#" className="hover:text-slate-600">이용약관</Link>
                        <Link href="#" className="hover:text-slate-600">개인정보처리방침</Link>
                    </div>
                </div>
                <div className="text-center mt-8 text-xs text-slate-300">
                    &copy; 2026 CodeB Platform. All rights reserved.
                </div>
            </div>
        </footer>
    )
}
