'use client'

import { useState, useEffect, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useSession, signIn } from 'next-auth/react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Loader2, Mail, CheckCircle2, XCircle, Clock, FolderKanban } from 'lucide-react'

const PENDING_PROJECT_INVITE_KEY = 'pendingProjectInvite'

interface ProjectInvitation {
    id: string
    email: string
    role: string
    status: string
    expiresAt: string
    project: {
        id: string
        name: string
    }
    inviter: {
        name: string
        email: string
    }
}

export default function ProjectInvitePage() {
    const params = useParams()
    const router = useRouter()
    const { data: session, status: sessionStatus } = useSession()
    const [invitation, setInvitation] = useState<ProjectInvitation | null>(null)
    const [loading, setLoading] = useState(true)
    const [accepting, setAccepting] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [success, setSuccess] = useState(false)
    const hasAutoAccepted = useRef(false)

    const token = params?.token as string

    // 초대 정보 로드
    useEffect(() => {
        const fetchInvitation = async () => {
            try {
                const response = await fetch(`/api/project-invitations/${token}`)
                const data = await response.json()

                if (!response.ok) {
                    setError(data.error || 'Invalid invitation')
                    return
                }

                setInvitation(data.invitation)
            } catch (err) {
                setError('Failed to load invitation')
            } finally {
                setLoading(false)
            }
        }

        fetchInvitation()
    }, [token])

    // 로그인 후 자동 수락 처리
    useEffect(() => {
        const autoAcceptInvite = async () => {
            // 이미 자동 수락 시도했거나 조건이 안 맞으면 스킵
            if (hasAutoAccepted.current) return
            if (sessionStatus !== 'authenticated') return
            if (!invitation) return
            if (error) return
            if (accepting) return
            if (invitation.status !== 'PENDING') return
            if (new Date() > new Date(invitation.expiresAt)) return

            // localStorage에서 pending invite 확인 (OAuth 리다이렉트 후에도 유지됨)
            const pendingInvite = localStorage.getItem(PENDING_PROJECT_INVITE_KEY)
            if (pendingInvite === token) {
                hasAutoAccepted.current = true
                localStorage.removeItem(PENDING_PROJECT_INVITE_KEY)
                await handleAcceptInternal()
            }
        }

        autoAcceptInvite()
    }, [sessionStatus, invitation, error, token])

    // 내부 수락 처리 함수 (자동 수락용)
    const handleAcceptInternal = async () => {
        setAccepting(true)
        setError(null)

        try {
            const response = await fetch(`/api/project-invitations/${token}/accept`, {
                method: 'POST',
            })

            const data = await response.json()

            if (!response.ok) {
                setError(data.error || 'Failed to accept invitation')
                setAccepting(false)
                return
            }

            setSuccess(true)
            setTimeout(() => {
                router.push(`/projects/${data.project.id}`)
            }, 2000)
        } catch (err) {
            setError('Failed to accept invitation')
            setAccepting(false)
        }
    }

    const handleAccept = async () => {
        if (!session?.user) {
            // 로그인 전에 초대 토큰을 localStorage에 저장 (OAuth 리다이렉트 후에도 유지됨)
            localStorage.setItem(PENDING_PROJECT_INVITE_KEY, token)
            signIn(undefined, { callbackUrl: window.location.href })
            return
        }

        await handleAcceptInternal()
    }

    if (loading || (accepting && !success)) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100">
                <div className="flex flex-col items-center gap-4">
                    <Loader2 className="h-8 w-8 animate-spin text-lime-500" />
                    <p className="text-slate-500">
                        {accepting ? '초대 수락 처리 중...' : '초대 정보를 불러오는 중...'}
                    </p>
                </div>
            </div>
        )
    }

    if (error && !invitation) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 p-4">
                <Card className="w-full max-w-md rounded-3xl bg-white/80 backdrop-blur-xl border-white/60 shadow-xl">
                    <CardHeader className="text-center">
                        <div className="mx-auto w-16 h-16 rounded-2xl bg-red-100 flex items-center justify-center mb-4">
                            <XCircle className="h-8 w-8 text-red-500" />
                        </div>
                        <CardTitle className="text-xl font-bold text-slate-900">초대를 찾을 수 없습니다</CardTitle>
                        <CardDescription className="text-slate-500">
                            {error}
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="flex justify-center">
                        <Button
                            onClick={() => router.push('/')}
                            className="rounded-xl bg-slate-900 hover:bg-slate-800"
                        >
                            홈으로 돌아가기
                        </Button>
                    </CardContent>
                </Card>
            </div>
        )
    }

    if (success) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 p-4">
                <Card className="w-full max-w-md rounded-3xl bg-white/80 backdrop-blur-xl border-white/60 shadow-xl">
                    <CardHeader className="text-center">
                        <div className="mx-auto w-16 h-16 rounded-2xl bg-lime-100 flex items-center justify-center mb-4">
                            <CheckCircle2 className="h-8 w-8 text-lime-600" />
                        </div>
                        <CardTitle className="text-xl font-bold text-slate-900">초대를 수락했습니다!</CardTitle>
                        <CardDescription className="text-slate-500">
                            프로젝트 페이지로 이동합니다...
                        </CardDescription>
                    </CardHeader>
                </Card>
            </div>
        )
    }

    const isExpired = invitation && new Date() > new Date(invitation.expiresAt)
    const isInvalid = invitation && (invitation.status !== 'PENDING' || isExpired)

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 p-4">
            <Card className="w-full max-w-md rounded-3xl bg-white/80 backdrop-blur-xl border-white/60 shadow-xl">
                <CardHeader className="text-center">
                    <div className="mx-auto w-16 h-16 rounded-2xl bg-lime-100 flex items-center justify-center mb-4">
                        <FolderKanban className="h-8 w-8 text-lime-600" />
                    </div>
                    <CardTitle className="text-xl font-bold text-slate-900">프로젝트 초대</CardTitle>
                    <CardDescription className="text-slate-500">
                        {invitation?.inviter.name}님이 프로젝트에 초대했습니다
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    {/* Project Info */}
                    <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 space-y-3">
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">프로젝트</span>
                            <span className="font-semibold text-slate-900">{invitation?.project.name}</span>
                        </div>
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">역할</span>
                            <span className="px-3 py-1 rounded-full text-xs font-bold bg-lime-100 text-lime-700">
                                {invitation?.role}
                            </span>
                        </div>
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">초대자</span>
                            <span className="text-slate-600 text-sm">{invitation?.inviter.email}</span>
                        </div>
                    </div>

                    {/* Status Messages */}
                    {isExpired && (
                        <Alert className="rounded-2xl border-amber-200 bg-amber-50">
                            <Clock className="h-4 w-4 text-amber-600" />
                            <AlertDescription className="text-amber-800">
                                이 초대는 만료되었습니다. 초대자에게 새 초대를 요청하세요.
                            </AlertDescription>
                        </Alert>
                    )}

                    {invitation?.status === 'ACCEPTED' && (
                        <Alert className="rounded-2xl border-blue-200 bg-blue-50">
                            <CheckCircle2 className="h-4 w-4 text-blue-600" />
                            <AlertDescription className="text-blue-800">
                                이 초대는 이미 수락되었습니다.
                            </AlertDescription>
                        </Alert>
                    )}

                    {invitation?.status === 'REVOKED' && (
                        <Alert className="rounded-2xl border-red-200 bg-red-50">
                            <XCircle className="h-4 w-4 text-red-600" />
                            <AlertDescription className="text-red-800">
                                이 초대는 취소되었습니다.
                            </AlertDescription>
                        </Alert>
                    )}

                    {error && (
                        <Alert className="rounded-2xl border-red-200 bg-red-50">
                            <XCircle className="h-4 w-4 text-red-600" />
                            <AlertDescription className="text-red-800">
                                {error}
                            </AlertDescription>
                        </Alert>
                    )}

                    {/* Email mismatch warning */}
                    {session?.user?.email && invitation?.email !== session.user.email && (
                        <Alert className="rounded-2xl border-amber-200 bg-amber-50">
                            <Mail className="h-4 w-4 text-amber-600" />
                            <AlertDescription className="text-amber-800">
                                이 초대는 {invitation?.email}로 전송되었습니다.
                                현재 {session.user.email}로 로그인되어 있습니다.
                            </AlertDescription>
                        </Alert>
                    )}

                    {/* Action Buttons */}
                    <div className="flex flex-col gap-3">
                        {!isInvalid && (
                            <Button
                                onClick={handleAccept}
                                disabled={accepting}
                                className="w-full h-12 rounded-xl bg-lime-500 hover:bg-lime-600 text-black font-bold"
                            >
                                {accepting ? (
                                    <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        처리 중...
                                    </>
                                ) : sessionStatus === 'unauthenticated' ? (
                                    '로그인하고 초대 수락하기'
                                ) : (
                                    '초대 수락하기'
                                )}
                            </Button>
                        )}
                        <Button
                            variant="ghost"
                            onClick={() => router.push('/')}
                            className="w-full h-12 rounded-xl text-slate-500 hover:text-slate-900"
                        >
                            나중에 하기
                        </Button>
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}
