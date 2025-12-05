'use client'
// =============================================================================
// Auth Context - Auth.js v5 호환
// =============================================================================

import { createContext, useContext, useEffect, useState, useTransition } from 'react'
import { SessionProvider, useSession } from 'next-auth/react'
import { credentialsSignIn, googleSignIn, authSignOut } from './auth-actions'

const isDev = process.env.NODE_ENV === 'development'

interface User {
  uid: string
  email: string
  displayName: string
  photoURL?: string
}

interface UserProfile {
  uid: string
  email: string
  displayName: string
  role: 'admin' | 'member'
  createdAt: string
  lastLogin: string
  isOnline: boolean
  avatar?: string
  phone?: string
  company?: string
  group?: string
  department?: string
}

interface AuthContextType {
  user: User | null
  userProfile: UserProfile | null
  loading: boolean
  signIn: (email: string, password: string) => Promise<void>
  signInWithGoogle: () => Promise<void>
  signUp: (email: string, password: string, displayName: string, role?: 'admin' | 'member') => Promise<void>
  logout: () => Promise<void>
  updateUserProfile: (data: Partial<UserProfile>) => Promise<void>
}

const AuthContext = createContext<AuthContextType | null>(null)

function AuthProviderContent({ children }: { children: React.ReactNode }) {
  const { data: session, status, update } = useSession()
  const [user, setUser] = useState<User | null>(null)
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [isPending, startTransition] = useTransition()

  useEffect(() => {
    const initAuth = async () => {
      if (status === 'loading') return

      if (session?.user) {
        const sessionUser = session.user as any
        const userData: User = {
          uid: sessionUser.uid || sessionUser.id || sessionUser.email,
          email: sessionUser.email || '',
          displayName: sessionUser.name || '',
          photoURL: sessionUser.image || ''
        }
        const profileData: UserProfile = {
          uid: sessionUser.uid || sessionUser.id || sessionUser.email,
          email: sessionUser.email || '',
          displayName: sessionUser.name || '',
          role: sessionUser.role || 'member',
          createdAt: new Date().toISOString(),
          lastLogin: new Date().toISOString(),
          isOnline: true,
          avatar: sessionUser.image || '',
          department: sessionUser.department
        }
        setUser(userData)
        setUserProfile(profileData)
        localStorage.setItem('user', JSON.stringify(userData))
        localStorage.setItem('userProfile', JSON.stringify(profileData))
      } else {
        // 세션 없음 - 로컬 스토리지 확인
        const storedUser = localStorage.getItem('user')
        const storedProfile = localStorage.getItem('userProfile')
        if (storedUser && storedProfile) {
          setUser(JSON.parse(storedUser))
          setUserProfile(JSON.parse(storedProfile))
        } else {
          setUser(null)
          setUserProfile(null)
        }
      }
      setLoading(false)
    }

    initAuth()
  }, [session, status])

  // 이메일/패스워드 로그인 (서버 액션 사용)
  const signIn = async (email: string, password: string) => {
    const result = await credentialsSignIn(email, password)

    if (!result.success) {
      throw new Error(result.error || '로그인에 실패했습니다.')
    }

    // 세션 업데이트 트리거
    await update()
  }

  // Google OAuth 로그인 (서버 액션 사용)
  const signInWithGoogle = async () => {
    await googleSignIn()
  }

  const signUp = async (email: string, password: string, displayName: string, role: 'admin' | 'member' = 'member') => {
    if (isDev) console.log('[DEV] Sign up not implemented')
  }

  const updateUserProfile = async (data: Partial<UserProfile>) => {
    if (!user) return
    const updated = { ...userProfile!, ...data }
    setUserProfile(updated)
    localStorage.setItem('userProfile', JSON.stringify(updated))
  }

  const logout = async () => {
    setUser(null)
    setUserProfile(null)
    localStorage.removeItem('user')
    localStorage.removeItem('userProfile')
    await authSignOut()
  }

  const value = {
    user,
    userProfile,
    loading,
    signIn,
    signInWithGoogle,
    signUp,
    logout,
    updateUserProfile
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <AuthProviderContent>
        {children}
      </AuthProviderContent>
    </SessionProvider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

export type { UserProfile }
