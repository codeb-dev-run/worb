'use client'

import React, { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { signIn, useSession } from 'next-auth/react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Loader2,
  CheckCircle2,
  XCircle,
  Building2,
  Users,
  ArrowRight,
  Sparkles
} from 'lucide-react'
import toast from 'react-hot-toast'
import confetti from 'canvas-confetti'

const PENDING_JOIN_KEY = 'pendingWorkspaceJoin'

interface WorkspaceInfo {
  id: string
  name: string
  memberCount: number
  isPublic: boolean
}

export default function JoinByCodePage({ params }: { params: { code: string } }) {
  const router = useRouter()
  const { data: session, status } = useSession()
  const [loading, setLoading] = useState(true)
  const [workspace, setWorkspace] = useState<WorkspaceInfo | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [joining, setJoining] = useState(false)
  const [joined, setJoined] = useState(false)
  const hasAutoJoined = useRef(false)

  // 워크스페이스 정보 로드
  useEffect(() => {
    checkWorkspace()
  }, [params.code])

  // 로그인 후 자동 가입 처리
  useEffect(() => {
    const autoJoinWorkspace = async () => {
      if (hasAutoJoined.current) return
      if (status !== 'authenticated') return
      if (!workspace) return
      if (error) return
      if (joining) return

      // localStorage에서 pending join 확인
      const pendingJoin = localStorage.getItem(PENDING_JOIN_KEY)
      if (pendingJoin === params.code) {
        hasAutoJoined.current = true
        localStorage.removeItem(PENDING_JOIN_KEY)
        await handleJoinInternal()
      }
    }

    autoJoinWorkspace()
  }, [status, workspace, error, params.code])

  const checkWorkspace = async () => {
    try {
      const response = await fetch('/api/workspaces/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: params.code.toUpperCase() })
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || '유효하지 않은 초대 코드입니다')
      }

      const data = await response.json()
      // search API returns { workspace: {...} } format
      const workspaceData = data.workspace || data
      setWorkspace({
        id: workspaceData.id,
        name: workspaceData.name,
        memberCount: workspaceData._count?.members || workspaceData.memberCount || 0,
        isPublic: workspaceData.isPublic
      })
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleJoinInternal = async () => {
    if (!workspace) return

    setJoining(true)
    try {
      const response = await fetch('/api/workspaces/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ workspaceId: workspace.id })
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || '워크스페이스 가입에 실패했습니다')
      }

      setJoined(true)

      // 축하 효과
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 }
      })

      toast.success(`${workspace.name} 워크스페이스에 가입되었습니다!`)

      // 3초 후 메인 페이지로 이동
      setTimeout(() => {
        window.location.href = '/'
      }, 3000)
    } catch (err: any) {
      toast.error(err.message)
      setError(err.message)
      setJoining(false)
    }
  }

  const handleJoin = async () => {
    if (status === 'unauthenticated') {
      // 로그인 전에 초대 코드를 localStorage에 저장
      localStorage.setItem(PENDING_JOIN_KEY, params.code)
      signIn('google', { callbackUrl: `/join/${params.code}` })
      return
    }

    await handleJoinInternal()
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-lime-50/30 to-slate-50">
        <div className="flex flex-col items-center gap-4">
          <div className="relative">
            <div className="w-16 h-16 rounded-full border-4 border-lime-200 border-t-lime-500 animate-spin" />
            <div className="absolute inset-0 flex items-center justify-center">
              <Building2 className="w-6 h-6 text-lime-600" />
            </div>
          </div>
          <p className="text-slate-500 font-medium">워크스페이스 정보를 확인하는 중...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-rose-50/30 to-slate-50 p-4">
        <Card className="max-w-md w-full bg-white/80 backdrop-blur-xl border-white/60 rounded-3xl shadow-2xl">
          <CardContent className="pt-8 pb-8 text-center">
            <div className="w-20 h-20 bg-rose-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <XCircle className="w-10 h-10 text-rose-500" />
            </div>
            <h1 className="text-2xl font-bold text-slate-900 mb-3">초대 코드 오류</h1>
            <p className="text-slate-600 mb-8">{error}</p>
            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={() => router.push('/')}
                className="flex-1 rounded-xl h-11"
              >
                홈으로
              </Button>
              <Button
                variant="limePrimary"
                onClick={() => router.push('/workspaces/join')}
                className="flex-1 rounded-xl h-11"
              >
                다시 시도
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (joined) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-lime-50/50 to-slate-50 p-4">
        <Card className="max-w-md w-full bg-white/80 backdrop-blur-xl border-lime-200 rounded-3xl shadow-2xl">
          <CardContent className="pt-8 pb-8 text-center">
            <div className="relative w-24 h-24 mx-auto mb-6">
              <div className="absolute inset-0 bg-lime-100 rounded-full animate-ping opacity-50" />
              <div className="relative w-24 h-24 bg-gradient-to-br from-lime-400 to-lime-500 rounded-full flex items-center justify-center">
                <CheckCircle2 className="w-12 h-12 text-white" />
              </div>
            </div>
            <div className="flex items-center justify-center gap-2 mb-4">
              <Sparkles className="w-5 h-5 text-lime-500" />
              <h1 className="text-2xl font-bold text-slate-900">가입 완료!</h1>
              <Sparkles className="w-5 h-5 text-lime-500" />
            </div>
            <p className="text-slate-600 mb-6">
              <strong className="text-lime-700">{workspace?.name}</strong> 워크스페이스에
              <br />성공적으로 가입되었습니다.
            </p>
            <div className="p-4 bg-lime-50 rounded-2xl mb-6">
              <p className="text-sm text-lime-700">
                잠시 후 메인 페이지로 이동합니다...
              </p>
            </div>
            <Button
              variant="limePrimary"
              onClick={() => window.location.href = '/'}
              className="w-full rounded-xl h-12 text-base"
            >
              지금 바로 이동
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-lime-50/30 to-slate-50 p-4">
      <Card className="max-w-md w-full bg-white/80 backdrop-blur-xl border-white/60 rounded-3xl shadow-2xl overflow-hidden">
        {/* 헤더 배경 */}
        <div className="bg-gradient-to-r from-lime-500 to-lime-400 p-6 pb-12">
          <div className="flex items-center gap-2 text-lime-100 text-sm mb-2">
            <Building2 className="w-4 h-4" />
            <span>워크스페이스 초대</span>
          </div>
          <h1 className="text-2xl font-bold text-white">
            {workspace?.name}
          </h1>
        </div>

        <CardContent className="-mt-8 relative">
          {/* 워크스페이스 카드 */}
          <div className="bg-white rounded-2xl shadow-lg p-6 mb-6 border border-slate-100">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 bg-gradient-to-br from-slate-100 to-slate-200 rounded-2xl flex items-center justify-center">
                <Building2 className="w-7 h-7 text-slate-600" />
              </div>
              <div className="flex-1">
                <h2 className="font-bold text-lg text-slate-900">{workspace?.name}</h2>
                <div className="flex items-center gap-2 mt-1">
                  <Badge variant="secondary" className="gap-1 bg-slate-100 text-slate-600">
                    <Users className="w-3 h-3" />
                    {workspace?.memberCount || 0}명
                  </Badge>
                  {workspace?.isPublic && (
                    <Badge variant="outline" className="text-lime-600 border-lime-200">
                      공개
                    </Badge>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* 초대 코드 표시 */}
          <div className="text-center mb-6">
            <p className="text-sm text-slate-500 mb-2">초대 코드</p>
            <div className="inline-block px-6 py-2 bg-slate-100 rounded-xl">
              <span className="text-xl font-mono font-bold text-slate-700 tracking-widest">
                {params.code.toUpperCase()}
              </span>
            </div>
          </div>

          {/* 안내 문구 */}
          <div className="p-4 bg-amber-50 border border-amber-100 rounded-xl mb-6">
            <p className="text-sm text-amber-800">
              {status === 'authenticated' ? (
                <>아래 버튼을 클릭하여 <strong>{workspace?.name}</strong> 워크스페이스에 가입하세요.</>
              ) : (
                <>가입하려면 먼저 <strong>Google 계정</strong>으로 로그인해야 합니다.</>
              )}
            </p>
          </div>

          {/* 가입 버튼 */}
          <Button
            variant="limePrimary"
            onClick={handleJoin}
            disabled={joining}
            className="w-full rounded-xl h-14 text-base font-semibold"
          >
            {joining ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin mr-2" />
                가입 처리 중...
              </>
            ) : status === 'authenticated' ? (
              <>
                <CheckCircle2 className="w-5 h-5 mr-2" />
                워크스페이스 가입하기
              </>
            ) : (
              <>
                <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
                  <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                Google로 로그인하고 가입하기
              </>
            )}
          </Button>

          {/* 로그인 상태 표시 */}
          {status === 'authenticated' && session?.user && (
            <div className="mt-4 text-center">
              <p className="text-sm text-slate-500">
                <span className="font-medium text-slate-700">{session.user.email}</span>
                (으)로 가입됩니다
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
