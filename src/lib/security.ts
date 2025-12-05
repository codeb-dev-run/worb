// =============================================================================
// Security Utilities - Comprehensive Security Module
// CVE-CB-001 ~ CVE-CB-015 Remediation
// =============================================================================

import crypto from 'crypto'
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { redis } from '@/lib/redis'
import { ZodSchema, ZodError } from 'zod'

// =============================================================================
// Types
// =============================================================================

export interface AuthenticatedUser {
  id: string
  email: string
  name?: string
  role?: string
}

export interface AuthenticatedRequest {
  user: AuthenticatedUser
  workspaceId?: string
  workspaceRole?: string
}

export type WorkspaceRole = 'admin' | 'manager' | 'member' | 'viewer'

// =============================================================================
// CVE-CB-012: Secure Token Generation (Cryptographic)
// =============================================================================

/**
 * Generate cryptographically secure random token
 * Replaces Math.random() with crypto.randomBytes()
 */
export function generateSecureToken(length: number = 32): string {
  return crypto.randomBytes(length).toString('hex')
}

/**
 * Generate secure invite code (shorter, user-friendly)
 */
export function generateInviteCode(): string {
  return crypto.randomBytes(4).toString('hex').toUpperCase()
}

/**
 * Generate secure API key
 */
export function generateApiKey(): string {
  const prefix = 'cb_'
  const key = crypto.randomBytes(24).toString('base64url')
  return `${prefix}${key}`
}

// =============================================================================
// CVE-CB-002 & CVE-CB-003: Authentication Middleware
// =============================================================================

/**
 * Verify session and return authenticated user
 * Replaces header-based authentication (x-user-id)
 */
export async function authenticateRequest(): Promise<AuthenticatedUser | null> {
  try {
    const session = await auth()

    if (!session?.user?.email) {
      return null
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
      },
    })

    if (!user) {
      return null
    }

    return {
      id: user.id,
      email: user.email,
      name: user.name || undefined,
      role: user.role || undefined,
    }
  } catch (error) {
    // CVE-CB-005: Development-only logging for security module internals
    if (process.env.NODE_ENV === 'development') {
      console.error('[Security] Authentication failed:', error)
    }
    return null
  }
}

/**
 * Authentication guard - returns 401 response if not authenticated
 */
export async function requireAuth(): Promise<{ user: AuthenticatedUser } | NextResponse> {
  const user = await authenticateRequest()

  if (!user) {
    return NextResponse.json(
      { error: 'Unauthorized', code: 'AUTH_REQUIRED' },
      { status: 401 }
    )
  }

  return { user }
}

// =============================================================================
// CVE-CB-004 & CVE-CB-010: Role-Based Access Control (RBAC)
// =============================================================================

const ROLE_HIERARCHY: Record<WorkspaceRole, number> = {
  admin: 100,
  manager: 75,
  member: 50,
  viewer: 25,
}

/**
 * Check if user has required role in workspace
 */
export async function checkWorkspaceRole(
  userId: string,
  workspaceId: string,
  requiredRoles: WorkspaceRole[]
): Promise<{ hasAccess: boolean; userRole?: WorkspaceRole }> {
  try {
    const membership = await prisma.workspaceMember.findUnique({
      where: {
        workspaceId_userId: {
          workspaceId,
          userId,
        },
      },
      select: { role: true },
    })

    if (!membership) {
      return { hasAccess: false }
    }

    const userRole = membership.role.toLowerCase() as WorkspaceRole
    const hasAccess = requiredRoles.includes(userRole)

    return { hasAccess, userRole }
  } catch (error) {
    // CVE-CB-005: Development-only logging for security module internals
    if (process.env.NODE_ENV === 'development') {
      console.error('[Security] Role check failed:', error)
    }
    return { hasAccess: false }
  }
}

/**
 * Authorization guard - requires specific workspace roles
 */
export async function requireWorkspaceRole(
  userId: string,
  workspaceId: string,
  requiredRoles: WorkspaceRole[]
): Promise<{ userRole: WorkspaceRole } | NextResponse> {
  const { hasAccess, userRole } = await checkWorkspaceRole(userId, workspaceId, requiredRoles)

  if (!hasAccess) {
    return NextResponse.json(
      { error: 'Forbidden', code: 'INSUFFICIENT_PERMISSIONS' },
      { status: 403 }
    )
  }

  return { userRole: userRole! }
}

/**
 * Check if user has minimum role level
 */
export async function requireMinimumRole(
  userId: string,
  workspaceId: string,
  minimumRole: WorkspaceRole
): Promise<{ userRole: WorkspaceRole } | NextResponse> {
  const { hasAccess, userRole } = await checkWorkspaceRole(
    userId,
    workspaceId,
    Object.keys(ROLE_HIERARCHY) as WorkspaceRole[]
  )

  if (!hasAccess || !userRole) {
    return NextResponse.json(
      { error: 'Forbidden', code: 'NOT_A_MEMBER' },
      { status: 403 }
    )
  }

  const userLevel = ROLE_HIERARCHY[userRole]
  const requiredLevel = ROLE_HIERARCHY[minimumRole]

  if (userLevel < requiredLevel) {
    return NextResponse.json(
      { error: 'Forbidden', code: 'INSUFFICIENT_ROLE_LEVEL' },
      { status: 403 }
    )
  }

  return { userRole }
}

// =============================================================================
// CVE-CB-006: Rate Limiting
// =============================================================================

interface RateLimitConfig {
  windowMs: number      // Time window in milliseconds
  maxRequests: number   // Max requests per window
}

const RATE_LIMIT_CONFIGS: Record<string, RateLimitConfig> = {
  auth: { windowMs: 60000, maxRequests: 5 },       // 5 requests per minute for auth
  api: { windowMs: 60000, maxRequests: 100 },      // 100 requests per minute for API
  upload: { windowMs: 60000, maxRequests: 10 },    // 10 uploads per minute
  critical: { windowMs: 60000, maxRequests: 3 },   // 3 requests per minute for critical ops
}

/**
 * Check rate limit for a given identifier
 */
export async function checkRateLimit(
  identifier: string,
  configType: keyof typeof RATE_LIMIT_CONFIGS = 'api'
): Promise<{ allowed: boolean; remaining: number; resetAt: number }> {
  const config = RATE_LIMIT_CONFIGS[configType]
  const key = `ratelimit:${configType}:${identifier}`
  const now = Date.now()
  const windowStart = now - config.windowMs

  try {
    // Get current count from Redis
    const currentCount = await redis.get(key)
    const count = currentCount ? parseInt(currentCount as string, 10) : 0

    if (count >= config.maxRequests) {
      const ttl = await redis.ttl(key)
      return {
        allowed: false,
        remaining: 0,
        resetAt: now + (ttl > 0 ? ttl * 1000 : config.windowMs),
      }
    }

    // Increment counter
    await redis.incr(key)
    if (count === 0) {
      await redis.expire(key, Math.ceil(config.windowMs / 1000))
    }

    return {
      allowed: true,
      remaining: config.maxRequests - count - 1,
      resetAt: now + config.windowMs,
    }
  } catch (error) {
    // CVE-CB-005: Development-only logging for security module internals
    // If Redis fails, allow the request but log in development
    if (process.env.NODE_ENV === 'development') {
      console.error('[Security] Rate limit check failed:', error)
    }
    return { allowed: true, remaining: config.maxRequests, resetAt: now + config.windowMs }
  }
}

/**
 * Rate limiting middleware
 */
export async function rateLimit(
  request: NextRequest,
  configType: keyof typeof RATE_LIMIT_CONFIGS = 'api'
): Promise<NextResponse | null> {
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
             request.headers.get('x-real-ip') ||
             '127.0.0.1'

  const { allowed, remaining, resetAt } = await checkRateLimit(ip, configType)

  if (!allowed) {
    return NextResponse.json(
      { error: 'Too many requests', code: 'RATE_LIMIT_EXCEEDED' },
      {
        status: 429,
        headers: {
          'X-RateLimit-Remaining': '0',
          'X-RateLimit-Reset': resetAt.toString(),
          'Retry-After': Math.ceil((resetAt - Date.now()) / 1000).toString(),
        },
      }
    )
  }

  return null // Allow request
}

// =============================================================================
// CVE-CB-011: CSRF Protection
// =============================================================================

/**
 * Validate request origin for CSRF protection
 */
export function validateOrigin(request: NextRequest): boolean {
  const origin = request.headers.get('origin')
  const referer = request.headers.get('referer')

  // In development, allow all origins
  if (process.env.NODE_ENV === 'development') {
    return true
  }

  const allowedOrigins = (process.env.CORS_ORIGINS || 'https://codeb.app')
    .split(',')
    .map(o => o.trim())

  // Check origin header
  if (origin) {
    return allowedOrigins.some(allowed => origin.startsWith(allowed))
  }

  // Check referer as fallback
  if (referer) {
    return allowedOrigins.some(allowed => referer.startsWith(allowed))
  }

  // No origin/referer for same-origin requests
  return true
}

/**
 * CSRF protection middleware
 */
export function csrfProtection(request: NextRequest): NextResponse | null {
  // Only check state-changing methods
  const method = request.method.toUpperCase()
  if (['GET', 'HEAD', 'OPTIONS'].includes(method)) {
    return null
  }

  if (!validateOrigin(request)) {
    return NextResponse.json(
      { error: 'Invalid origin', code: 'CSRF_VIOLATION' },
      { status: 403 }
    )
  }

  return null
}

// =============================================================================
// CVE-CB-005 & CVE-CB-015: Secure Logging
// =============================================================================

type LogLevel = 'debug' | 'info' | 'warn' | 'error'

interface LogContext {
  operation?: string
  userId?: string
  workspaceId?: string
  resourceId?: string
  errorCode?: string
  [key: string]: unknown
}

// Fields that should never be logged
const SENSITIVE_FIELDS = [
  'password',
  'token',
  'secret',
  'apiKey',
  'api_key',
  'authorization',
  'cookie',
  'creditCard',
  'ssn',
  'socialSecurityNumber',
]

/**
 * Sanitize object for logging - remove sensitive fields
 */
function sanitizeForLogging(obj: unknown): unknown {
  if (obj === null || obj === undefined) {
    return obj
  }

  if (typeof obj !== 'object') {
    return obj
  }

  if (Array.isArray(obj)) {
    return obj.map(sanitizeForLogging)
  }

  const sanitized: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(obj)) {
    const lowerKey = key.toLowerCase()
    if (SENSITIVE_FIELDS.some(field => lowerKey.includes(field.toLowerCase()))) {
      sanitized[key] = '[REDACTED]'
    } else if (typeof value === 'object') {
      sanitized[key] = sanitizeForLogging(value)
    } else {
      sanitized[key] = value
    }
  }

  return sanitized
}

/**
 * Secure logger that sanitizes sensitive data
 */
export const secureLogger = {
  debug(message: string, context?: LogContext) {
    if (process.env.NODE_ENV === 'development') {
      console.debug(`[DEBUG] ${message}`, sanitizeForLogging(context))
    }
  },

  info(message: string, context?: LogContext) {
    console.info(`[INFO] ${message}`, sanitizeForLogging(context))
  },

  warn(message: string, context?: LogContext) {
    console.warn(`[WARN] ${message}`, sanitizeForLogging(context))
  },

  error(message: string, error?: Error, context?: LogContext) {
    const errorInfo = error ? {
      name: error.name,
      message: error.message,
      // Only include stack in development
      ...(process.env.NODE_ENV === 'development' ? { stack: error.stack } : {}),
    } : undefined

    const sanitized = sanitizeForLogging(context)
    console.error(`[ERROR] ${message}`, {
      error: errorInfo,
      ...(sanitized || {}),
    })
  },
}

// =============================================================================
// CVE-CB-015: Secure Error Response
// =============================================================================

interface ApiError {
  error: string
  code?: string
  details?: unknown
}

/**
 * Create secure error response - hides internal details in production
 */
export function createErrorResponse(
  message: string,
  statusCode: number,
  code?: string,
  details?: unknown
): NextResponse<ApiError> {
  const isProduction = process.env.NODE_ENV === 'production'

  const response: ApiError = {
    error: message,
    ...(code ? { code } : {}),
    ...(!isProduction && details ? { details } : {}),
  }

  return NextResponse.json(response, { status: statusCode })
}

// =============================================================================
// Combined Security Middleware
// =============================================================================

export interface SecurityOptions {
  requireAuth?: boolean
  rateLimitType?: keyof typeof RATE_LIMIT_CONFIGS
  csrfProtect?: boolean
  workspaceId?: string
  requiredRoles?: WorkspaceRole[]
}

/**
 * Combined security middleware - applies multiple security checks
 */
export async function applySecurity(
  request: NextRequest,
  options: SecurityOptions = {}
): Promise<{ user?: AuthenticatedUser; workspaceRole?: WorkspaceRole } | NextResponse> {
  const {
    requireAuth: authRequired = true,
    rateLimitType,
    csrfProtect = true,
    workspaceId,
    requiredRoles,
  } = options

  // 1. CSRF Protection (for state-changing requests)
  if (csrfProtect) {
    const csrfResult = csrfProtection(request)
    if (csrfResult) return csrfResult
  }

  // 2. Rate Limiting
  if (rateLimitType) {
    const rateLimitResult = await rateLimit(request, rateLimitType)
    if (rateLimitResult) return rateLimitResult
  }

  // 3. Authentication
  let user: AuthenticatedUser | null = null
  if (authRequired) {
    user = await authenticateRequest()
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized', code: 'AUTH_REQUIRED' },
        { status: 401 }
      )
    }
  }

  // 4. Authorization (workspace role check)
  if (workspaceId && requiredRoles && user) {
    const roleResult = await requireWorkspaceRole(user.id, workspaceId, requiredRoles)
    if (roleResult instanceof NextResponse) {
      return roleResult
    }
    return { user, workspaceRole: roleResult.userRole }
  }

  return { user: user || undefined }
}

// =============================================================================
// CVE-CB-009: Request Body Validation with Zod
// =============================================================================

/**
 * Validate request body against a Zod schema
 * Returns parsed data or throws validation error
 */
export async function validateBody<T>(
  request: Request,
  schema: ZodSchema<T>
): Promise<T> {
  try {
    const body = await request.json()
    return schema.parse(body)
  } catch (error) {
    if (error instanceof ZodError) {
      const zodErrors = error.issues.map((e) => ({
        path: e.path.map(String).join('.'),
        message: e.message
      }))
      throw new ValidationError('Invalid request body', zodErrors)
    }
    throw new ValidationError('Failed to parse request body')
  }
}

/**
 * Custom validation error class
 */
export class ValidationError extends Error {
  public errors: Array<{ path: string; message: string }>

  constructor(message: string, errors: Array<{ path: string; message: string }> = []) {
    super(message)
    this.name = 'ValidationError'
    this.errors = errors
  }
}

/**
 * Create validation error response
 */
export function createValidationErrorResponse(error: ValidationError): NextResponse {
  return NextResponse.json(
    {
      error: error.message,
      code: 'VALIDATION_ERROR',
      details: process.env.NODE_ENV !== 'production' ? error.errors : undefined
    },
    { status: 400 }
  )
}
