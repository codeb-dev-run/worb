'use server'
// =============================================================================
// Auth Server Actions - Auth.js v5 호환
// Credentials 로그인을 서버 액션으로 처리하여 JSON 파싱 문제 해결
// =============================================================================

import { signIn, signOut } from '@/auth'
import { AuthError } from 'next-auth'

export async function credentialsSignIn(email: string, password: string) {
  try {
    await signIn('credentials', {
      email,
      password,
      redirect: false,
    })
    return { success: true }
  } catch (error) {
    if (error instanceof AuthError) {
      switch (error.type) {
        case 'CredentialsSignin':
          return { success: false, error: '이메일 또는 비밀번호가 올바르지 않습니다.' }
        default:
          return { success: false, error: '로그인 중 오류가 발생했습니다.' }
      }
    }
    // NEXT_REDIRECT 에러는 성공적인 리다이렉트를 의미
    if (error instanceof Error && error.message.includes('NEXT_REDIRECT')) {
      return { success: true }
    }
    throw error
  }
}

export async function googleSignIn() {
  await signIn('google', { redirectTo: '/dashboard' })
}

export async function authSignOut() {
  await signOut({ redirectTo: '/login' })
}
