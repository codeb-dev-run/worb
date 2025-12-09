// =============================================================================
// Login API - CVE-CB-003, CVE-CB-005, CVE-CB-012 Fixed
// =============================================================================

import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createSampleData } from '@/lib/sample-data'
import { generateSecureToken, secureLogger, createErrorResponse, validateBody } from '@/lib/security'
import { z } from 'zod'

// CVE-CB-007: Input validation schema
const loginSchema = z.object({
  email: z.string().email('Invalid email format').max(255),
  password: z.string().min(1, 'Password is required').max(128),
})

export async function POST(request: Request) {
  try {
    // CVE-CB-007: Validate input
    const body = await request.json()
    const result = loginSchema.safeParse(body)

    if (!result.success) {
      return createErrorResponse('Invalid input', 400, 'VALIDATION_ERROR')
    }

    const { email } = result.data
    // Note: In production, verify password with bcrypt/argon2
    // This is a simplified version - real auth should use NextAuth.js

    // Check if user exists with email
    let user = await prisma.user.findUnique({
      where: { email },
      include: {
        workspaces: true
      }
    })

    // If user doesn't exist, return error (don't auto-create for security)
    if (!user) {
      // CVE-CB-005: Don't log actual email to prevent enumeration info leak
      secureLogger.warn('Login attempt for non-existent user', {
        operation: 'auth.login',
        // Redact email - only show domain for debugging
        emailDomain: email.split('@')[1] || 'unknown',
      })
      return createErrorResponse('Invalid credentials', 401, 'AUTH_FAILED')
    }

    // Check if user has any workspaces
    if (user.workspaces.length === 0) {
      // CVE-CB-005: Use secure logger
      secureLogger.info('Creating default workspace for user', {
        operation: 'auth.login.workspace_create',
        userId: user.id,
      })

      // CVE-CB-012: Use secure token generation
      const name = 'My Workspace'
      const domain = `workspace-${Date.now()}`
      const slug = `${name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')}-${generateSecureToken(4)}`
      const inviteCode = generateSecureToken(6).toUpperCase()

      const workspace = await prisma.workspace.create({
        data: {
          name,
          domain,
          slug,
          inviteCode,
          members: {
            create: {
              userId: user.id,
              role: 'admin',
            },
          },
        },
      })

      // CVE-CB-005: Use secure logger
      secureLogger.info('Default workspace created', {
        operation: 'auth.login.workspace_created',
        userId: user.id,
        workspaceId: workspace.id,
      })

      // Create sample data (disabled)
      // await createSampleData(workspace.id, user.id)
    }

    // CVE-CB-005: Log successful login (without sensitive data)
    secureLogger.info('User login successful', {
      operation: 'auth.login',
      userId: user.id,
    })

    // Return user info (excluding sensitive data)
    return NextResponse.json({
      id: user.id,
      uid: user.id,
      email: user.email,
      displayName: user.name,
      role: user.role,
      photoURL: user.avatar,
    })

  } catch (error) {
    // CVE-CB-005: Secure error logging
    secureLogger.error('Login error', error as Error, { operation: 'auth.login' })
    return createErrorResponse('Internal server error', 500, 'SERVER_ERROR')
  }
}
