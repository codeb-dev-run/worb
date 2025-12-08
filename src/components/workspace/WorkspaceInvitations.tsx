'use client'

import React, { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
    UserPlus,
    Mail,
    Clock,
    CheckCircle2,
    XCircle,
    Loader2,
    Copy,
    RefreshCw,
    Link as LinkIcon,
} from 'lucide-react'
import toast from 'react-hot-toast'

interface WorkspaceInvitation {
    id: string
    email: string
    token: string
    role: string
    status: 'PENDING' | 'ACCEPTED' | 'EXPIRED' | 'REVOKED'
    expiresAt: string
    createdAt: string
    inviteUrl: string
    inviter: {
        name: string
        email: string
    }
}

const statusConfig = {
    PENDING: { label: '대기 중', color: 'bg-amber-100 text-amber-700', icon: Clock },
    ACCEPTED: { label: '수락됨', color: 'bg-green-100 text-green-700', icon: CheckCircle2 },
    EXPIRED: { label: '만료됨', color: 'bg-slate-100 text-slate-500', icon: Clock },
    REVOKED: { label: '취소됨', color: 'bg-red-100 text-red-700', icon: XCircle },
}

export default function WorkspaceInvitations({ workspaceId }: { workspaceId: string }) {
    const [invitations, setInvitations] = useState<WorkspaceInvitation[]>([])
    const [loading, setLoading] = useState(true)
    const [sending, setSending] = useState(false)
    const [dialogOpen, setDialogOpen] = useState(false)
    const [email, setEmail] = useState('')
    const [error, setError] = useState<string | null>(null)
    const [success, setSuccess] = useState<string | null>(null)
    const [newInviteUrl, setNewInviteUrl] = useState<string | null>(null)

    const fetchInvitations = async () => {
        try {
            setLoading(true)
            const response = await fetch(`/api/workspace/${workspaceId}/invite`)
            if (response.ok) {
                const data = await response.json()
                setInvitations(data)
            }
        } catch (err) {
            console.error('Failed to fetch invitations:', err)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        if (workspaceId) {
            fetchInvitations()
        }
    }, [workspaceId])

    const handleSendInvite = async () => {
        if (!email) {
            setError('이메일을 입력해주세요.')
            return
        }

        setSending(true)
        setError(null)
        setNewInviteUrl(null)

        try {
            const response = await fetch(`/api/workspace/${workspaceId}/invite`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email }),
            })

            const data = await response.json()

            if (!response.ok) {
                setError(data.error || '초대 전송에 실패했습니다.')
                return
            }

            // 초대 URL 표시
            setNewInviteUrl(data.inviteUrl)
            setSuccess(data.emailSent
                ? '초대 이메일이 전송되었습니다.'
                : '초대가 생성되었습니다. 아래 링크를 직접 공유해주세요.')

            setEmail('')
            fetchInvitations()

        } catch (err) {
            setError('초대 전송 중 오류가 발생했습니다.')
        } finally {
            setSending(false)
        }
    }

    const copyInviteLink = (url: string) => {
        navigator.clipboard.writeText(url)
        toast.success('초대 링크가 복사되었습니다.')
    }

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('ko-KR', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
        })
    }

    const closeDialog = () => {
        setDialogOpen(false)
        setEmail('')
        setError(null)
        setSuccess(null)
        setNewInviteUrl(null)
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-lime-500" />
            </div>
        )
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h3 className="text-lg font-bold text-slate-900">멤버 초대</h3>
                    <p className="text-sm text-slate-500">팀원을 워크스페이스에 초대하세요</p>
                </div>
                <div className="flex items-center gap-2">
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={fetchInvitations}
                        className="rounded-xl hover:bg-slate-100"
                    >
                        <RefreshCw className="h-4 w-4" />
                    </Button>
                    <Dialog open={dialogOpen} onOpenChange={(open) => open ? setDialogOpen(true) : closeDialog()}>
                        <DialogTrigger asChild>
                            <Button className="rounded-xl bg-lime-500 hover:bg-lime-600 text-black font-bold gap-2">
                                <UserPlus className="h-4 w-4" />
                                멤버 초대
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="rounded-3xl bg-white/95 backdrop-blur-xl border-white/60 shadow-2xl">
                            <DialogHeader>
                                <DialogTitle className="text-xl font-bold text-slate-900">멤버 초대</DialogTitle>
                                <DialogDescription className="text-slate-500">
                                    이메일로 워크스페이스에 멤버를 초대합니다.
                                </DialogDescription>
                            </DialogHeader>
                            <div className="space-y-4 pt-4">
                                {!newInviteUrl ? (
                                    <>
                                        <div className="space-y-2">
                                            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                                                이메일 주소
                                            </label>
                                            <Input
                                                type="email"
                                                placeholder="team@example.com"
                                                value={email}
                                                onChange={(e) => setEmail(e.target.value)}
                                                className="rounded-xl"
                                            />
                                        </div>

                                        {error && (
                                            <Alert variant="destructive" className="rounded-xl">
                                                <AlertDescription>{error}</AlertDescription>
                                            </Alert>
                                        )}

                                        <Button
                                            onClick={handleSendInvite}
                                            disabled={sending || !email}
                                            className="w-full rounded-xl bg-lime-500 hover:bg-lime-600 text-black font-bold"
                                        >
                                            {sending ? (
                                                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                            ) : (
                                                <Mail className="h-4 w-4 mr-2" />
                                            )}
                                            초대 보내기
                                        </Button>
                                    </>
                                ) : (
                                    <>
                                        {success && (
                                            <Alert className="rounded-xl bg-lime-50 border-lime-200">
                                                <CheckCircle2 className="h-4 w-4 text-lime-600" />
                                                <AlertDescription className="text-lime-700">{success}</AlertDescription>
                                            </Alert>
                                        )}

                                        <div className="space-y-2">
                                            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                                                초대 링크
                                            </label>
                                            <div className="flex gap-2">
                                                <Input
                                                    value={newInviteUrl}
                                                    readOnly
                                                    className="rounded-xl bg-slate-50 text-sm"
                                                />
                                                <Button
                                                    variant="outline"
                                                    size="icon"
                                                    onClick={() => copyInviteLink(newInviteUrl)}
                                                    className="rounded-xl shrink-0"
                                                >
                                                    <Copy className="h-4 w-4" />
                                                </Button>
                                            </div>
                                            <p className="text-xs text-slate-500">
                                                이 링크를 초대할 사람에게 직접 전달해주세요. (7일간 유효)
                                            </p>
                                        </div>

                                        <div className="flex gap-2">
                                            <Button
                                                variant="outline"
                                                onClick={() => {
                                                    setNewInviteUrl(null)
                                                    setSuccess(null)
                                                }}
                                                className="flex-1 rounded-xl"
                                            >
                                                다른 멤버 초대
                                            </Button>
                                            <Button
                                                onClick={closeDialog}
                                                className="flex-1 rounded-xl bg-lime-500 hover:bg-lime-600 text-black font-bold"
                                            >
                                                완료
                                            </Button>
                                        </div>
                                    </>
                                )}
                            </div>
                        </DialogContent>
                    </Dialog>
                </div>
            </div>

            {/* Pending Invitations */}
            {invitations.filter(inv => inv.status === 'PENDING').length > 0 && (
                <div className="space-y-3">
                    <h4 className="text-sm font-semibold text-slate-700">대기 중인 초대</h4>
                    <div className="space-y-2">
                        {invitations
                            .filter(inv => inv.status === 'PENDING')
                            .map((invitation) => {
                                const StatusIcon = statusConfig[invitation.status].icon
                                return (
                                    <div
                                        key={invitation.id}
                                        className="flex items-center justify-between p-4 bg-white/60 rounded-2xl border border-white/40"
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className="p-2 bg-amber-100 rounded-xl">
                                                <Mail className="h-4 w-4 text-amber-600" />
                                            </div>
                                            <div>
                                                <p className="font-medium text-slate-900">{invitation.email}</p>
                                                <p className="text-xs text-slate-500">
                                                    {formatDate(invitation.createdAt)} 초대 &middot; {formatDate(invitation.expiresAt)} 만료
                                                </p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <Badge className={statusConfig[invitation.status].color}>
                                                <StatusIcon className="h-3 w-3 mr-1" />
                                                {statusConfig[invitation.status].label}
                                            </Badge>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                onClick={() => copyInviteLink(invitation.inviteUrl)}
                                                className="rounded-xl hover:bg-slate-100"
                                                title="초대 링크 복사"
                                            >
                                                <LinkIcon className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    </div>
                                )
                            })}
                    </div>
                </div>
            )}

            {/* All Invitations History */}
            {invitations.length > 0 ? (
                <div className="space-y-3">
                    <h4 className="text-sm font-semibold text-slate-700">초대 히스토리</h4>
                    <div className="space-y-2">
                        {invitations.map((invitation) => {
                            const StatusIcon = statusConfig[invitation.status].icon
                            return (
                                <div
                                    key={invitation.id}
                                    className="flex items-center justify-between p-3 bg-white/40 rounded-xl border border-white/30"
                                >
                                    <div className="flex items-center gap-3">
                                        <Mail className="h-4 w-4 text-slate-400" />
                                        <div>
                                            <p className="text-sm font-medium text-slate-700">{invitation.email}</p>
                                            <p className="text-xs text-slate-400">
                                                {invitation.inviter?.name || invitation.inviter?.email}님이 초대
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Badge variant="outline" className={statusConfig[invitation.status].color}>
                                            <StatusIcon className="h-3 w-3 mr-1" />
                                            {statusConfig[invitation.status].label}
                                        </Badge>
                                        {invitation.status === 'PENDING' && (
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => copyInviteLink(invitation.inviteUrl)}
                                                className="rounded-lg text-xs"
                                            >
                                                <Copy className="h-3 w-3 mr-1" />
                                                링크 복사
                                            </Button>
                                        )}
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                </div>
            ) : (
                <div className="text-center py-12 text-slate-500">
                    <UserPlus className="h-12 w-12 mx-auto mb-4 text-slate-300" />
                    <p>아직 초대한 멤버가 없습니다.</p>
                    <p className="text-sm">위의 "멤버 초대" 버튼을 클릭하여 팀원을 초대하세요.</p>
                </div>
            )}
        </div>
    )
}
