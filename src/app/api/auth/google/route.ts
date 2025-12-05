// =============================================================================
// Google OAuth API - CVE-CB-005 Fixed: Secure Logging
// =============================================================================

import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { secureLogger, createErrorResponse } from '@/lib/security'

export async function POST(request: Request) {
  try {
    const session = await auth()

    if (!session || !session.user) {
      return createErrorResponse('Unauthorized', 401, 'AUTH_REQUIRED')
    }

    // Handle Google OAuth user creation/update in your database
    const { email, name, image } = session.user

    // CVE-CB-005: Secure logging (no sensitive data)
    secureLogger.info('Google OAuth session retrieved', {
      operation: 'auth.google',
      hasEmail: !!email,
      hasName: !!name,
    })

    return NextResponse.json({
      uid: (session.user as any).uid || email,
      email: email,
      displayName: name || email?.split('@')[0],
      photoURL: image,
      role: (session.user as any).role || 'member',
    })
  } catch (error) {
    // CVE-CB-005: Secure error logging
    secureLogger.error('Google auth error', error as Error, { operation: 'auth.google' })
    return createErrorResponse('Internal server error', 500, 'SERVER_ERROR')
  }
}
