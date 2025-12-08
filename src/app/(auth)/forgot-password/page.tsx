'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'

export default function ForgotPasswordPage() {
  const router = useRouter()
  const { status } = useSession()
  const [email, setEmail] = useState('')
  const [isSubmitted, setIsSubmitted] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // 이미 로그인된 경우 대시보드로 리다이렉트
  useEffect(() => {
    if (status === 'authenticated') {
      router.replace('/dashboard')
    }
  }, [status, router])

  // 로그인 체크 중이면 로딩 표시
  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary via-purple-600 to-pink-600">
        <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md">
          <div className="text-center">
            <h1 className="text-4xl font-bold text-primary mb-2">CodeB</h1>
            <p className="text-gray-600">로딩 중...</p>
          </div>
        </div>
      </div>
    )
  }

  // 이미 로그인된 경우 렌더링 방지
  if (status === 'authenticated') {
    return null
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      // Mock API call for password reset
      await new Promise(resolve => setTimeout(resolve, 1500))
      
      // Here you would typically call your password reset API
      console.log('Password reset requested for:', email)
      
      setIsSubmitted(true)
    } catch (err: any) {
      setError('비밀번호 재설정 요청에 실패했습니다.')
    } finally {
      setLoading(false)
    }
  }

  if (isSubmitted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary via-purple-600 to-pink-600">
        <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md">
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold text-primary mb-2">CodeB</h1>
            <p className="text-gray-600">AI 기반 개발 플랫폼</p>
          </div>

          <div className="text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">이메일을 확인하세요</h2>
            
            <p className="text-gray-600 mb-6">
              <span className="font-medium">{email}</span>로<br />
              비밀번호 재설정 링크를 보내드렸습니다.
            </p>
            
            <p className="text-sm text-gray-500 mb-8">
              이메일이 오지 않았다면 스팸 폴더를 확인해주세요.
            </p>

            <div className="space-y-3">
              <Link 
                href="/login" 
                className="w-full btn btn-primary block text-center"
              >
                로그인으로 돌아가기
              </Link>
              
              <button
                onClick={() => {
                  setIsSubmitted(false)
                  setEmail('')
                }}
                className="w-full btn btn-secondary"
              >
                다른 이메일로 재시도
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary via-purple-600 to-pink-600">
      <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-primary mb-2">CodeB</h1>
          <p className="text-gray-600">AI 기반 개발 플랫폼</p>
        </div>

        <h2 className="text-2xl font-semibold text-center mb-6">비밀번호 재설정</h2>
        
        <p className="text-gray-600 text-center mb-6">
          가입하신 이메일 주소를 입력하시면<br />
          비밀번호 재설정 링크를 보내드립니다.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
              이메일 주소
            </label>
            <input
              type="email"
              id="email"
              className="input"
              placeholder="your@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          {error && (
            <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full btn btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? '전송 중...' : '재설정 링크 보내기'}
          </button>
        </form>

        <div className="mt-6 text-center">
          <Link href="/login" className="text-sm text-primary hover:underline">
            ← 로그인으로 돌아가기
          </Link>
        </div>
      </div>
    </div>
  )
}