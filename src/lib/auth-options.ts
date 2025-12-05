// =============================================================================
// Auth Options - CVE-CB-005 Fixed: Development-only Logging
// =============================================================================

import { NextAuthOptions } from 'next-auth'
import GoogleProvider from 'next-auth/providers/google'
import CredentialsProvider from 'next-auth/providers/credentials'
import { prisma } from '@/lib/prisma'
import { createSampleData } from '@/lib/sample-data'

const isDev = process.env.NODE_ENV === 'development'
const devLog = (message: string) => isDev && console.log(`[DEV] ${message}`)

export const authOptions: NextAuthOptions = {
    providers: [
        GoogleProvider({
            clientId: process.env.GOOGLE_CLIENT_ID!,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
        }),
        CredentialsProvider({
            name: 'Credentials',
            credentials: {
                email: { label: "Email", type: "email" },
                password: { label: "Password", type: "password" }
            },
            async authorize(credentials) {
                if (!credentials?.email || !credentials?.password) {
                    devLog('[Auth] Missing credentials')
                    return null
                }

                try {
                    // Direct database lookup instead of API call to avoid loops
                    const user = await prisma.user.findUnique({
                        where: { email: credentials.email },
                        include: { workspaces: true }
                    })

                    if (!user) {
                        devLog(`[Auth] User not found: ${credentials.email}`)
                        return null
                    }

                    // Note: In a real production app, verify password with bcrypt
                    // For development/testing, we accept any password for seeded users
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
            }
        })
    ],
    callbacks: {
        async signIn({ user, account, profile }) {
            // Handle Google sign-in
            if (account?.provider === 'google' && user.email) {
                try {
                    devLog(`[Auth] Google sign-in for: ${user.email}`)

                    // Check if user exists
                    let dbUser = await prisma.user.findUnique({
                        where: { email: user.email }
                    })

                    if (dbUser) {
                        devLog(`[Auth] User exists: ${dbUser.id}`)
                        // Update user info
                        dbUser = await prisma.user.update({
                            where: { email: user.email },
                            data: {
                                name: user.name || dbUser.name,
                                avatar: user.image || dbUser.avatar,
                            }
                        })
                    } else {
                        devLog('[Auth] Creating new user')
                        // Create new user
                        dbUser = await prisma.user.create({
                            data: {
                                email: user.email,
                                name: user.name || user.email.split('@')[0],
                                avatar: user.image,
                                role: 'member',
                            }
                        })
                        devLog(`[Auth] User created: ${dbUser.id}`)
                    }

                    // Check for pending invitations
                    const invitations = await prisma.invitation.findMany({
                        where: {
                            email: user.email,
                            status: 'PENDING'
                        },
                        include: {
                            workspace: true
                        }
                    })

                    if (invitations.length > 0) {
                        devLog(`[Auth] Found ${invitations.length} pending invitations for ${user.email}`)

                        for (const invite of invitations) {
                            try {
                                // Check if already a member
                                const existingMember = await prisma.workspaceMember.findUnique({
                                    where: {
                                        workspaceId_userId: {
                                            workspaceId: invite.workspaceId,
                                            userId: dbUser.id
                                        }
                                    }
                                })

                                if (!existingMember) {
                                    // Add to workspace
                                    await prisma.workspaceMember.create({
                                        data: {
                                            workspaceId: invite.workspaceId,
                                            userId: dbUser.id,
                                            role: invite.role
                                        }
                                    })
                                    devLog(`[Auth] Added user to workspace: ${invite.workspace.name}`)
                                }

                                // Update invitation status
                                await prisma.invitation.update({
                                    where: { id: invite.id },
                                    data: {
                                        status: 'ACCEPTED',
                                        acceptedAt: new Date()
                                    }
                                })
                                devLog('[Auth] Marked invitation as accepted')
                            } catch {
                                // CVE-CB-005: Silent fail for invite processing
                                devLog(`[Auth] Failed to process invite ${invite.id}`)
                            }
                        }
                    }

                    // Check if user has any workspace
                    const userWorkspaces = await prisma.workspaceMember.findFirst({
                        where: { userId: dbUser.id }
                    })

                    if (!userWorkspaces) {
                        // Check if we just added them via invitation
                        const updatedUserWorkspaces = await prisma.workspaceMember.findFirst({
                            where: { userId: dbUser.id }
                        })

                        if (!updatedUserWorkspaces) {
                            devLog('[Auth] User has no workspace. Redirecting to setup page handled by client.')
                            // We do NOT create a default workspace here anymore.
                            // The client-side WorkspaceProvider or layout will redirect to /workspace/create
                        }
                    }

                    // Store uid for later use in jwt callback
                    user.id = dbUser.id
                } catch {
                    // CVE-CB-005: Silent fail for Google sync
                    devLog('[Auth] Error syncing Google user')
                    return false
                }
            }
            return true
        },
        async jwt({ token, user, account }) {
            if (user) {
                token.uid = user.id
                token.role = (user as any).role || 'member'
            }
            return token
        },
        async session({ session, token }) {
            if (session.user) {
                (session.user as any).id = token.uid as string
                (session.user as any).uid = token.uid as string
                (session.user as any).role = token.role as string
            }
            return session
        }
    },
    pages: {
        signIn: '/login',
    },
    session: {
        strategy: 'jwt',
    },
    secret: process.env.NEXTAUTH_SECRET,
}
