import NextAuth from 'next-auth'
import { authOptions } from '@/lib/auth-options'

// =============================================================================
// Next-Auth v4 Pages Router Handler
// This is more stable for credentials provider than App Router
// =============================================================================

export default NextAuth(authOptions)
