'use client'

import React, { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { signIn, useSession } from 'next-auth/react'
import { Button } from '@/components/ui/button'
import { Loader2, CheckCircle2, XCircle } from 'lucide-react'
import toast from 'react-hot-toast'

export default function InviteAcceptPage({ params }: { params: { code: string } }) {
  const router = useRouter()
  const { data: session, status } = useSession()
  const [loading, setLoading] = useState(true)
  const [invite, setInvite] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    checkInvite()
  }, [params.code])

  const checkInvite = async () => {
    try {
      const response = await fetch(`/api/invite/${params.code}`)
      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Invalid invite code')
      }
      const data = await response.json()
      setInvite(data)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleAccept = async () => {
    if (status === 'unauthenticated') {
      // 로그인 후 다시 이 페이지로 돌아오도록 설정
      signIn('google', { callbackUrl: `/invite/${params.code}` })
      return
    }

    setLoading(true)
    try {
      const response = await fetch(`/api/invite/${params.code}/accept`, {
        method: 'POST',
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to accept invite')
      }

      toast.success('워크스페이스에 참여했습니다!')
      // 워크스페이스 목록을 새로고침하기 위해 전체 페이지 리로드
      window.location.href = '/dashboard'
    } catch (err: any) {
      toast.error(err.message)
      setError(err.message)
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
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