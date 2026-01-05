'use client'

import React, { useEffect, useState, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { signIn, useSession } from 'next-auth/react'
import { Button } from '@/components/ui/button'
import { Loader2, CheckCircle2, XCircle } from 'lucide-react'
import toast from 'react-hot-toast'

const PENDING_INVITE_KEY = 'pendingWorkspaceInvite'

export default function InviteAcceptPage({ params }: { params: { code: string } }) {
  const router = useRouter()
  const { data: session, status } = useSession()
  const [loading, setLoading] = useState(true)
  const [invite, setInvite] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)
  const [accepting, setAccepting] = useState(false)
  const hasAutoAccepted = useRef(false)

  // 초대 정보 로드
  useEffect(() => {
    checkInvite()
  }, [params.code])

  // 로그인 후 자동 수락 처리
  useEffect(() => {
    const autoAcceptInvite = async () => {
      // 이미 자동 수락 시도했거나 조건이 안 맞으면 스킵
      if (hasAutoAccepted.current) return
      if (status !== 'authenticated') return
      if (!invite) return
      if (error) return
      if (accepting) return

      // localStorage에서 pending invite 확인 (OAuth 리다이렉트 후에도 유지됨)
      const pendingInvite = localStorage.getItem(PENDING_INVITE_KEY)
      if (pendingInvite === params.code) {
        hasAutoAccepted.current = true
        localStorage.removeItem(PENDING_INVITE_KEY)
        await handleAcceptInternal()
      }
    }

    autoAcceptInvite()
  }, [status, invite, error, params.code])

  const checkInvite = async () => {
    try {
      const response = await fetch(`/api/invite/${params.code}`)
      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Invalid invite code')
      }
      const data = await response.json()

      // 이미 멤버인 경우 바로 대시보드로 이동
      if (data.alreadyMember) {
        toast.success('이미 이 워크스페이스의 멤버입니다!')
        window.location.href = `/dashboard?workspace=${data.workspaceId}`
        return
      }

      setInvite(data)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  // 내부 수락 처리 함수 (자동 수락용)
  const handleAcceptInternal = async () => {
    setAccepting(true)
    try {
      const response = await fetch(`/api/invite/${params.code}/accept`, {
        method: 'POST',
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to accept invite')
      }

      // 이미 멤버인 경우와 새로 가입한 경우 모두 처리
      if (data.alreadyMember) {
        toast.success('이미 이 워크스페이스의 멤버입니다!')
      } else {
        toast.success('워크스페이스에 참여했습니다!')
      }

      // 워크스페이스 목록을 새로고침하기 위해 전체 페이지 리로드
      const workspaceId = data.workspaceId || invite?.workspace?.id
      window.location.href = workspaceId ? `/dashboard?workspace=${workspaceId}` : '/dashboard'
    } catch (err: any) {
      toast.error(err.message)
      setError(err.message)
      setAccepting(false)
    }
  }

  const handleAccept = async () => {
    if (status === 'unauthenticated') {
      // 로그인 전에 초대 코드를 localStorage에 저장 (OAuth 리다이렉트 후에도 유지됨)
      localStorage.setItem(PENDING_INVITE_KEY, params.code)
      // 로그인 후 다시 이 페이지로 돌아오도록 설정
      signIn('google', { callbackUrl: `/invite/${params.code}` })
      return
    }

    await handleAcceptInternal()
  }

  if (loading || accepting) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <p className="text-gray-500">
            {accepting ? '초대 수락 처리 중...' : '초대 정보를 불러오는 중...'}
          </p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <div className="bg-white p-8 rounded-xl shadow-lg max-w-md w-full text-center">
          <XCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">초대 오류</h1>
          <p className="text-gray-600 mb-6">{error}</p>
          <Button onClick={() => router.push('/')} variant="outline">
            홈으로 돌아가기
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <div className="bg-white p-8 rounded-xl shadow-lg max-w-md w-full text-center">
        <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <CheckCircle2 className="w-8 h-8 text-blue-600" />
        </div>

        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          워크스페이스 초대
        </h1>

        <p className="text-gray-600 mb-6">
          <strong>{invite.inviter.name}</strong>님이<br />
          <strong>{invite.workspace.name}</strong> 워크스페이스에 초대했습니다.
        </p>

        <div className="bg-gray-50 p-4 rounded-lg mb-6 text-left">
          <p className="text-sm text-gray-500 mb-1">초대받은 이메일</p>
          <p className="font-medium">{invite.email}</p>
        </div>

        <Button
          onClick={handleAccept}
          className="w-full h-12 text-lg mb-3"
        >
          {status === 'authenticated' ? '초대 수락하기' : '로그인하고 수락하기'}
        </Button>

        {status === 'authenticated' && session?.user?.email !== invite.email && (
          <p className="text-xs text-red-500 mt-2">
            주의: 현재 로그인된 계정({session.user.email})이<br />
            초대받은 이메일({invite.email})과 다릅니다.
          </p>
        )}
      </div>
    </div>
  )
}