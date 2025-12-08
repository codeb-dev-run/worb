'use client'

import React, { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
    Clock,
    XCircle,
    Loader2,
    PartyPopper,
    UserCheck,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import toast from 'react-hot-toast'

// 내 초대 정보 타입
interface MyInvitation {
    id: string
    token: string
    role: string
    expiresAt: string
    inviter: {
        name: string
        email: string
    }
    project: {
        id: string
        name: string
    }
}

const roleColors: Record<string, { bg: string; text: string; border: string }> = {
    Admin: { bg: 'bg-violet-50', text: 'text-violet-700', border: 'border-violet-200' },
    PM: { bg: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-200' },
    Developer: { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200' },
    Designer: { bg: 'bg-pink-50', text: 'text-pink-700', border: 'border-pink-200' },
    Viewer: { bg: 'bg-slate-50', text: 'text-slate-700', border: 'border-slate-200' },
}

interface ProjectInviteBannerProps {
    projectId: string
    isAdmin?: boolean
    onAccepted?: () => void
}

export default function ProjectInviteBanner({ projectId, isAdmin = false, onAccepted }: ProjectInviteBannerProps) {
    const [myInvitation, setMyInvitation] = useState<MyInvitation | null>(null)
    const [acceptingInvite, setAcceptingInvite] = useState(false)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        const fetchMyInvitation = async () => {
            // Admin이면 이미 멤버이므로 초대 확인 불필요
            if (isAdmin) {
                setLoading(false)
                return
            }

            try {
                const res = await fetch(`/api/projects/${projectId}/invitations/me`)
                if (res.ok) {
                    const data = await res.json()
                    setMyInvitation(data)
                }
            } catch (err) {
                console.error('Failed to fetch my invitation:', err)
            } finally {
                setLoading(false)
            }
        }

        fetchMyInvitation()
    }, [projectId, isAdmin])

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('ko-KR', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
        })
    }

    // 초대 수락 핸들러
    const handleAcceptInvite = async () => {
        if (!myInvitation) return

        setAcceptingInvite(true)
        try {
            const response = await fetch(`/api/project-invitations/${myInvitation.token}/accept`, {
                method: 'POST',
            })

            if (response.ok) {
                toast.success('초대를 수락했습니다. 프로젝트 멤버가 되었습니다!')
                setMyInvitation(null)
                onAccepted?.()
            } else {
                const data = await response.json()
                toast.error(data.error || '초대 수락에 실패했습니다.')
            }
        } catch (err) {
            toast.error('초대 수락 중 오류가 발생했습니다.')
        } finally {
            setAcceptingInvite(false)
        }
    }

    // 초대 거절 핸들러
    const handleDeclineInvite = async () => {
        if (!myInvitation) return

        try {
            await fetch(`/api/project-invitations/${myInvitation.token}/decline`, {
                method: 'POST',
            })

            toast.success('초대를 거절했습니다.')
            setMyInvitation(null)
        } catch (err) {
            toast.error('초대 거절 중 오류가 발생했습니다.')
        }
    }

    // 로딩 중이거나 초대가 없으면 렌더링하지 않음
    if (loading || !myInvitation) {
        return null
    }

    return (
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-lime-500/10 via-emerald-500/10 to-teal-500/10 border border-lime-200/60 p-6">
            {/* 배경 장식 */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-lime-400/20 rounded-full blur-3xl" />
            <div className="absolute bottom-0 left-0 w-24 h-24 bg-emerald-400/20 rounded-full blur-2xl" />

            <div className="relative">
                <div className="flex items-start gap-4">
                    <div className="flex-shrink-0 p-3 bg-lime-500 rounded-2xl shadow-lg shadow-lime-500/30">
                        <PartyPopper className="h-6 w-6 text-white" />
                    </div>
                    <div className="flex-1">
                        <h4 className="text-lg font-bold text-slate-900 mb-1">
                            이 프로젝트에 초대되었습니다!
                        </h4>
                        <p className="text-sm text-slate-600 mb-4">
                            <span className="font-semibold text-slate-800">{myInvitation.inviter.name}</span>님이
                            당신을 <Badge className={cn('mx-1', roleColors[myInvitation.role]?.bg, roleColors[myInvitation.role]?.text, roleColors[myInvitation.role]?.border, 'border')}>
                                {myInvitation.role}
                            </Badge> 역할로 초대했습니다.
                        </p>
                        <div className="flex items-center gap-3">
                            <Button
                                variant="outline"
                                onClick={handleDeclineInvite}
                                className="rounded-xl border-slate-300 text-slate-600 hover:bg-slate-100"
                            >
                                <XCircle className="h-4 w-4 mr-2" />
                                거절
                            </Button>
                            <Button
                                onClick={handleAcceptInvite}
                                disabled={acceptingInvite}
                                className="rounded-xl bg-lime-500 hover:bg-lime-600 text-black font-bold shadow-lg shadow-lime-500/30"
                            >
                                {acceptingInvite ? (
                                    <>
                                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                        처리 중...
                                    </>
                                ) : (
                                    <>
                                        <UserCheck className="h-4 w-4 mr-2" />
                                        초대 수락하기
                                    </>
                                )}
                            </Button>
                        </div>
                        <p className="text-xs text-slate-400 mt-3">
                            <Clock className="h-3 w-3 inline mr-1" />
                            {formatDate(myInvitation.expiresAt)}까지 유효
                        </p>
                    </div>
                </div>
            </div>
        </div>
    )
}
