import React from 'react'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { FileText, ChevronRight, ArrowUpRight } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

interface BoardWidgetProps {
    boardPosts: any[]
}

export function BoardWidget({ boardPosts }: BoardWidgetProps) {
    const router = useRouter()

    const handlePostClick = (postId: string) => {
        router.push(`/groupware/board?postId=${postId}`)
    }
    return (
        <Card className="rounded-3xl border-0 shadow-[0_8px_30px_rgb(0,0,0,0.04)] bg-white/70 backdrop-blur-xl border border-white/40">
            <CardHeader className="pb-3 border-b border-slate-100/50">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <div className="flex items-center justify-center w-8 h-8 rounded-full bg-lime-100 text-lime-700">
                            <FileText className="h-4 w-4" />
                        </div>
                        <h3 className="font-bold text-lg text-slate-900">최근 게시글</h3>
                    </div>
                    <Link href="/groupware/board">
                        <Button variant="ghost" size="sm" className="text-xs font-medium text-slate-500 hover:text-slate-900 rounded-full">
                            더보기 <ChevronRight className="ml-1 h-3 w-3" />
                        </Button>
                    </Link>
                </div>
            </CardHeader>
            <CardContent className="p-0">
                <div className="divide-y divide-slate-50/50">
                    {boardPosts.map((item) => (
                        <div
                            key={item.id}
                            onClick={() => handlePostClick(item.id)}
                            className="flex items-center justify-between px-5 py-3 hover:bg-white/60 transition-colors cursor-pointer group"
                        >
                            <div className="flex items-center flex-1 min-w-0 gap-3 mr-4">
                                <span className="text-sm font-medium text-slate-800 group-hover:text-lime-600 transition-colors truncate">
                                    {item.title}
                                </span>
                                {item.comments > 0 && (
                                    <span className="flex items-center justify-center bg-lime-50 text-lime-700 text-[10px] font-bold h-5 min-w-5 px-1.5 rounded-full shrink-0">
                                        {item.comments}
                                    </span>
                                )}
                                <div className="hidden sm:flex items-center gap-2 ml-auto text-xs text-slate-400 shrink-0">
                                    <span className="text-slate-600 font-medium">{item.team}</span>
                                    <span className="text-slate-300">/</span>
                                    <span className="text-slate-500">{item.author}</span>
                                    <span className="text-slate-300">/</span>
                                    <span className="text-slate-400">{item.date}</span>
                                </div>
                            </div>
                            <Button size="icon" variant="ghost" className="h-8 w-8 text-slate-300 group-hover:text-lime-600 hover:bg-lime-50 rounded-full shrink-0">
                                <ArrowUpRight className="h-4 w-4" />
                            </Button>
                        </div>
                    ))}
                </div>
            </CardContent>
        </Card>
    )
}
