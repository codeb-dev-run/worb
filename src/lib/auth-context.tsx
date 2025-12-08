'use client'
// =============================================================================
// Auth Context - CVE-CB-005 Fixed: Development-only Logging
// =============================================================================

import { createContext, useContext, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { SessionProvider, useSession, signIn as nextAuthSignIn, signOut as nextAuthSignOut } from 'next-auth/react'

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
  signInWithGoogle: (callbackUrl?: string) => Promise<void>
  signUp: (email: string, password: string, displayName: string, role?: 'admin' | 'member') => Promise<void>
  logout: () => Promise<void>
  updateUserProfile: (data: Partial<UserProfile>) => Promise<void>
}

const AuthContext = createContext<AuthContextType | null>(null)

function AuthProviderContent({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession()
  const [user, setUser] = useState<User | null>(null)
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    const initAuth = async () => {
      if (status === 'loading') return

      if (session?.user) {
        // Session exists (Google Login or NextAuth Credentials)
        const sessionUser = session.user as any

        const userData: User = {
          uid: sessionUser.uid || sessionUser.id || 'google-user',
          email: sessionUser.email || '',
          displayName: sessionUser.name || '',
          photoURL: sessionUser.image || ''
        }

        const profileData: UserProfile = {
          uid: sessionUser.uid || sessionUser.id || 'google-user',
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
        // No session, check local storage (Legacy/Local Auth)
        const storedUser = localStorage.getItem('user')
        const storedProfile = localStorage.getItem('userProfile')

        if (storedUser && storedProfile) {
          setUser(JSON.parse(storedUser))
          setUserProfile(JSON.parse(storedProfile))
        }
      }
      setLoading(false)
    }

    initAuth()
  }, [session, status])

  const signIn = async (email: string, password: string) => {
    try {
      const result = await nextAuthSignIn('credentials', {
        redirect: false,
        email,
        password,
      })

      if (result?.error) {
        throw new Error(result.error)
      }

      // Session update will be handled by the useEffect hook
    } catch (error) {
      // CVE-CB-005: Development-only error logging
      if (isDev) console.log('[DEV] Login failed')
      throw error
    }
  }

  const signInWithGoogle = async (callbackUrl?: string) => {
    await nextAuthSignIn('google', { callbackUrl: callbackUrl || '/dashboard' })
  }

  const signUp = async (email: string, password: string, displayName: string, role: 'admin' | 'member' = 'member') => {
    // Implement sign up API call if needed
    // CVE-CB-005: Development-only warning
    if (isDev) console.log('[DEV] Sign up not implemented for local DB')
  }

  const updateUserProfile = async (data: Partial<UserProfile>) => {
    if (!user) return
    // Implement update API call
    const updated = { ...userProfile!, ...data }
    setUserProfile(updated)
    localStorage.setItem('userProfile', JSON.stringify(updated))
  }

  const logout = async () => {
    setUser(null)
    setUserProfile(null)
    localStorage.removeItem('user')
    localStorage.removeItem('userProfile')
    await nextAuthSignOut({ redirect: true, callbackUrl: '/login' })
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
