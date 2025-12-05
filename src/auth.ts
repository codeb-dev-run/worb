// =============================================================================
// Auth.js v5 Configuration
// Credentials + Google OAuth 지원
// =============================================================================

import NextAuth from 'next-auth'
import Google from 'next-auth/providers/google'
import Credentials from 'next-auth/providers/credentials'
import { prisma } from '@/lib/prisma'

const isDev = process.env.NODE_ENV === 'development'
const devLog = (message: string) => isDev && console.log(`[DEV] ${message}`)

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    // Google OAuth
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),

    // Credentials (이메일/패스워드)
    Credentials({
      name: 'Credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          devLog('[Auth] Missing credentials')
          return null
        }

        try {
          const user = await prisma.user.findUnique({
            where: { email: credentials.email as string },
            include: { workspaces: true },
          })

          if (!user) {
            devLog(`[Auth] User not found: ${credentials.email}`)
            return null
          }

          // Note: 프로덕션에서는 bcrypt로 패스워드 검증 필요
          devLog(`[Auth] User authenticated: ${user.email}`)

          return {
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role,
            image: user.avatar,
          }
        } catch (error) {
          devLog(`[Auth] Authorize error: ${error}`)
          return null
        }
      },
    }),
  ],

  callbacks: {
    async signIn({ user, account }) {
      // Google 로그인 시 DB 동기화
      if (account?.provider === 'google' && user.email) {
        try {
          devLog(`[Auth] Google sign-in for: ${user.email}`)

          let dbUser = await prisma.user.findUnique({
            where: { email: user.email },
          })

          if (dbUser) {
            dbUser = await prisma.user.update({
              where: { email: user.email },
              data: {
                name: user.name || dbUser.name,
                avatar: user.image || dbUser.avatar,
              },
            })
          } else {
            dbUser = await prisma.user.create({
              data: {
                email: user.email,
                name: user.name || user.email.split('@')[0],
                avatar: user.image,
                role: 'member',
              },
            })
            devLog(`[Auth] User created: ${dbUser.id}`)
          }

          // 초대장 처리
          const invitations = await prisma.invitation.findMany({
            where: { email: user.email, status: 'PENDING' },
            include: { workspace: true },
          })

          for (const invite of invitations) {
            try {
              const existingMember = await prisma.workspaceMember.findUnique({
                where: {
                  workspaceId_userId: {
                    workspaceId: invite.workspaceId,
                    userId: dbUser.id,
                  },
                },
              })

              if (!existingMember) {
                await prisma.workspaceMember.create({
                  data: {
                    workspaceId: invite.workspaceId,
                    userId: dbUser.id,
                    role: invite.role,
                  },
                })
              }

              await prisma.invitation.update({
                where: { id: invite.id },
                data: { status: 'ACCEPTED', acceptedAt: new Date() },
              })
            } catch {
              devLog(`[Auth] Failed to process invite ${invite.id}`)
            }
          }

          user.id = dbUser.id
        } catch {
          devLog('[Auth] Error syncing Google user')
          return false
        }
      }
      return true
    },

    async jwt({ token, user }) {
      if (user) {
        token.uid = user.id
        token.role = (user as any).role || 'member'
      }
      return token
    },

    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.uid as string
        ;(session.user as any).uid = token.uid as string
        ;(session.user as any).role = token.role as string
      }
      return session
    },
  },

  pages: {
    signIn: '/login',
  },

  session: {
    strategy: 'jwt',
  },

  trustHost: true,
})
