"use client"

import Link from 'next/link'
import { Menu, X } from 'lucide-react'
import { useState } from 'react'
import { cn } from '@/lib/utils'

export function SiteHeader() {
    const [isMenuOpen, setIsMenuOpen] = useState(false)

    return (
        <header className="sticky top-0 z-50 w-full border-b border-emerald-100 bg-white/90 backdrop-blur-md">
            <div className="container mx-auto px-4 lg:px-6 h-18 flex items-center justify-between">
                <Link href="/" className="flex items-center gap-2.5 group">
                    <div className="w-9 h-9 bg-emerald-600 rounded-lg flex items-center justify-center text-white shadow-md shadow-emerald-200 group-hover:bg-emerald-700 transition-colors duration-300">
                        <span className="font-bold text-xl">W</span>
                    </div>
                    <span className="font-bold text-2xl tracking-tight text-slate-900">WORKB</span>
                </Link>

                {/* Desktop Nav */}
                <nav className="hidden md:flex items-center gap-10 text-[16px] font-medium text-slate-600">
                    <Link href="/features/project" className="hover:text-emerald-600 transition-colors">프로젝트 관리</Link>
                    <Link href="/features/hr" className="hover:text-emerald-600 transition-colors">근태/인사</Link>
                    <Link href="/blog" className="hover:text-emerald-600 transition-colors">블로그</Link>
                    <Link href="/#pricing" className="hover:text-emerald-600 transition-colors">요금안내</Link>
                </nav>

                {/* Desktop Actions */}
                <div className="hidden md:flex items-center gap-4">
                    <Link href="/login" className="px-4 py-2 text-[15px] font-medium text-slate-600 hover:text-emerald-600 transition-colors">
                        로그인
                    </Link>
                    <Link
                        href="/dashboard"
                        className="px-6 py-2.5 rounded-lg bg-emerald-600 text-white text-[15px] font-bold hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-200 hover:shadow-emerald-300 transform hover:-translate-y-0.5"
                    >
                        무료로 시작하기
                    </Link>
                </div>

                {/* Mobile Menu Button */}
                <button
                    className="md:hidden p-2 text-slate-600"
                    onClick={() => setIsMenuOpen(!isMenuOpen)}
                >
                    {isMenuOpen ? <X /> : <Menu />}
                </button>
            </div>

            {/* Mobile Nav */}
            <div className={cn(
                "md:hidden absolute top-18 left-0 w-full bg-white border-b border-slate-100 shadow-xl transition-all duration-300 overflow-hidden",
                isMenuOpen ? "max-h-[400px] opacity-100" : "max-h-0 opacity-0"
            )}>
                <nav className="flex flex-col p-4 gap-4">
                    <Link href="/features/project" className="p-2 font-medium text-slate-600 hover:text-emerald-600">프로젝트 관리</Link>
                    <Link href="/features/hr" className="p-2 font-medium text-slate-600 hover:text-emerald-600">근태/인사</Link>
                    <Link href="/blog" className="p-2 font-medium text-slate-600 hover:text-emerald-600">블로그</Link>
                    <Link href="/#pricing" className="p-2 font-medium text-slate-600 hover:text-emerald-600">요금안내</Link>
                    <hr className="border-slate-100" />
                    <Link href="/login" className="p-2 font-medium text-slate-600">로그인</Link>
                    <Link href="/dashboard" className="p-2 font-bold text-emerald-600">무료로 시작하기</Link>
                </nav>
            </div>
        </header>
    )
}
