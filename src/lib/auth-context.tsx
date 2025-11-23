'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import {
  User,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  createUserWithEmailAndPassword,
  updateProfile
} from 'firebase/auth'
import { ref, set, get } from 'firebase/database'
import { auth, database, googleProvider } from './firebase'

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
  group?: string // 고객 그룹 ID
}

const AuthContext = createContext<AuthContextType | null>(null)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setUser(user)

      if (user) {
        setUser(user)
        try {
          // 사용자 프로필 로드
          const profileRef = ref(database, `users/${user.uid}`)
          const snapshot = await get(profileRef)

          if (snapshot.exists()) {
            const profile = snapshot.val()
            setUserProfile(profile)
            // localStorage에 역할 저장 (로그인 리다이렉트용)
            localStorage.setItem('userRole', profile.role)
            // 온라인 상태 업데이트
            await set(ref(database, `users/${user.uid}/isOnline`), true)
            await set(ref(database, `users/${user.uid}/lastLogin`), new Date().toISOString())
          } else {
            // 프로필이 없으면 기본 프로필 생성
            const defaultProfile: UserProfile = {
              uid: user.uid,
              email: user.email!,
              displayName: user.displayName || user.email!.split('@')[0],
              role: 'member',
              createdAt: new Date().toISOString(),
              lastLogin: new Date().toISOString(),
              isOnline: true,
              avatar: user.photoURL || undefined
            }
            setUserProfile(defaultProfile)
            localStorage.setItem('userRole', defaultProfile.role)
          }
        } catch (error) {
          console.warn('Realtime Database 연결 실패, 기본 프로필 사용:', error)
          // Database 연결 실패 시 기본 프로필 사용
          const defaultProfile: UserProfile = {
            uid: user.uid,
            email: user.email!,
            displayName: user.displayName || user.email!.split('@')[0],
            role: 'member',
            createdAt: new Date().toISOString(),
            lastLogin: new Date().toISOString(),
            isOnline: true,
            avatar: user.photoURL || undefined
          }
          setUserProfile(defaultProfile)
          localStorage.setItem('userRole', defaultProfile.role)
        }
      } else {
        // 개발 환경이고 저장된 세션이 있는 경우 복구 시도
        if (process.env.NODE_ENV === 'development') {
          const savedEmail = localStorage.getItem('userEmail')
          const savedRole = localStorage.getItem('userRole')
          const savedUid = localStorage.getItem('userUid')

          if (savedEmail && savedRole && savedUid) {
            console.log('Dev mode: Restoring session in onAuthStateChanged', { savedEmail, savedRole })
            const mockUser: UserProfile = {
              uid: savedUid,
              email: savedEmail,
              displayName: savedRole === 'admin' ? '관리자' : '팀원',
              role: savedRole as 'admin' | 'member',
              createdAt: new Date().toISOString(),
              lastLogin: new Date().toISOString(),
              isOnline: true,
            }
            setUserProfile(mockUser)
            setUser({ uid: mockUser.uid, email: mockUser.email } as any)
          } else {
            setUser(null)
            setUserProfile(null)
          }
        } else {
          setUser(null)
          setUserProfile(null)
        }
      }

      setLoading(false)
    })

    return () => unsubscribe()
  }, [])



  // 사용자가 오프라인될 때 상태 업데이트
  useEffect(() => {
    if (user) {
      const handleBeforeUnload = async () => {
        await set(ref(database, `users/${user.uid}/isOnline`), false)
      }

      window.addEventListener('beforeunload', handleBeforeUnload)
      return () => window.removeEventListener('beforeunload', handleBeforeUnload)
    }
  }, [user])

  const signIn = async (email: string, password: string) => {
    // 개발 환경 테스트 계정 바이패스
    if (process.env.NODE_ENV === 'development' && (email === 'admin@codeb.com' || email === 'member@codeb.com')) {
      console.log('Dev mode: Bypassing Firebase Auth for test account')

      let mockUser;
      if (email === 'admin@codeb.com' && password === 'admin123!') {
        mockUser = {
          uid: 'test-admin-uid',
          email: 'admin@codeb.com',
          displayName: '관리자',
          role: 'admin' as const,
          createdAt: new Date().toISOString(),
          lastLogin: new Date().toISOString(),
          isOnline: true,
        }
      } else if (email === 'member@codeb.com' && password === 'member123!') {
        mockUser = {
          uid: 'test-member-uid',
          email: 'member@codeb.com',
          displayName: '팀원',
          role: 'member' as const,
          createdAt: new Date().toISOString(),
          lastLogin: new Date().toISOString(),
          isOnline: true,
        }
      }

      if (mockUser) {
        setUserProfile(mockUser)
        localStorage.setItem('userRole', mockUser.role)
        localStorage.setItem('userEmail', mockUser.email)
        localStorage.setItem('userUid', mockUser.uid)
        setUser({ uid: mockUser.uid, email: mockUser.email } as any)
        return
      }
    }

    try {
      await signInWithEmailAndPassword(auth, email, password)
    } catch (error: any) {
      // Firebase 연결 실패 시 테스트 계정으로 로그인 (기존 로직 유지)
      if (error.code === 'auth/invalid-api-key' ||
        error.code === 'auth/network-request-failed' ||
        error.code === 'auth/configuration-not-found') {
        console.warn('Firebase 연결 실패, 테스트 모드로 전환:', error.code)
        // ... (fallback logic if needed)
      }
      throw error
    }
  }

  const signInWithGoogle = async () => {
    try {
      const result = await signInWithPopup(auth, googleProvider)
      const user = result.user

      // 기존 사용자 확인
      const profileRef = ref(database, `users/${user.uid}`)
      const snapshot = await get(profileRef)

      if (!snapshot.exists()) {
        // 새 사용자인 경우 프로필 생성
        const userProfile: UserProfile = {
          uid: user.uid,
          email: user.email!,
          displayName: user.displayName || '사용자',
          role: 'member', // 기본값은 member
          createdAt: new Date().toISOString(),
          lastLogin: new Date().toISOString(),
          isOnline: true,
          avatar: user.photoURL || undefined
        }

        await set(profileRef, userProfile)
      }
    } catch (error: any) {
      console.error('Google 로그인 실패:', error)
      throw error
    }
  }

  const signUp = async (email: string, password: string, displayName: string, role: 'admin' | 'member' = 'member') => {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password)

    // 프로필 업데이트
    await updateProfile(userCredential.user, { displayName })

    // 데이터베이스에 사용자 정보 저장
    const userProfile: UserProfile = {
      uid: userCredential.user.uid,
      email: userCredential.user.email!,
      displayName,
      role: role as UserProfile['role'],
      createdAt: new Date().toISOString(),
      lastLogin: new Date().toISOString(),
      isOnline: true
    }

    await set(ref(database, `users/${userCredential.user.uid}`), userProfile)
  }

  const updateUserProfile = async (data: Partial<UserProfile>) => {
    if (!user) return

    const updates = { ...data, uid: user.uid }
    await set(ref(database, `users/${user.uid}`), { ...userProfile, ...updates })
    setUserProfile(prev => prev ? { ...prev, ...updates } : null)
  }

  const logout = async () => {
    try {
      if (user) {
        try {
          await set(ref(database, `users/${user.uid}/isOnline`), false)
        } catch (error) {
          console.warn('오프라인 상태 업데이트 실패:', error)
        }
      }

      // 테스트 모드인 경우 처리
      if (userProfile && userProfile.uid?.startsWith('test-')) {
        setUserProfile(null)
        setUser(null as any)
      }

      localStorage.removeItem('userRole')
      localStorage.removeItem('userEmail')
      localStorage.removeItem('userUid')
      await signOut(auth)

      // 로그인 페이지로 리다이렉트
      window.location.href = '/login'
    } catch (error) {
      console.error('로그아웃 실패:', error)
      // Firebase 오류가 발생해도 로컬 상태는 초기화
      setUserProfile(null)
      setUser(null as any)
      localStorage.removeItem('userRole')
      localStorage.removeItem('userEmail')
      localStorage.removeItem('userUid')
      window.location.href = '/login'
    }
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

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

// 기존 타입과의 호환성을 위한 타입 변환 함수
export function convertToLegacyUser(userProfile: UserProfile | null): any {
  if (!userProfile) return null

  return {
    id: userProfile.uid,
    email: userProfile.email,
    name: userProfile.displayName,
    role: userProfile.role,
    createdAt: new Date(userProfile.createdAt),
    updatedAt: new Date(userProfile.lastLogin),
  }
}

export type { UserProfile }
