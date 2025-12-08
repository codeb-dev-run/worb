// =============================================================================
// Next.js Middleware - CVE-CB-008 & CVE-CB-013 Security Headers & CORS
// + Authentication Routing
// =============================================================================

import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { getToken } from 'next-auth/jwt'

// =============================================================================
// Route Configuration (inline for Edge Runtime compatibility)
// =============================================================================

const GUEST_ONLY_ROUTES = ['/login', '/forgot-password']

const AUTH_REQUIRED_ROUTES = ['/workspace/create', '/workspaces/join']

const PROTECTED_ROUTES_LIST = [
  '/dashboard', '/profile', '/calendar', '/messages', '/tasks',
  '/kanban', '/gantt', '/files', '/logs', '/ai', '/analytics',
  '/meetings', '/deliverables', '/projects', '/groupware',
  '/automation', '/marketing', '/settings', '/users',
  '/workspace/organization', '/hr', '/finance', '/contracts', '/invoices',
]

const ROUTES = {
  login: '/login',
  dashboard: '/dashboard',
}

function isGuestOnlyRoute(pathname: string): boolean {
  return GUEST_ONLY_ROUTES.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`)
  )
}

function isAuthRequiredRoute(pathname: string): boolean {
  return AUTH_REQUIRED_ROUTES.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`)
  )
}

function isProtectedRoute(pathname: string): boolean {
  return PROTECTED_ROUTES_LIST.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`)
  )
}

// CORS allowed origins (configure via environment variable)
const ALLOWED_ORIGINS = (process.env.CORS_ORIGINS || 'http://localhost:3000,https://codeb.app,https://www.codeb.app')
  .split(',')
  .map(origin => origin.trim())

// Paths that should skip middleware entirely (static files, etc.)
const SKIP_MIDDLEWARE_PATHS = [
  '/_next',
  '/favicon.ico',
  '/images',
  '/fonts',
  '/api/auth', // NextAuth handles its own routes
  '/api/health',
  '/api/public',
]

// Rate limit config for auth endpoints (basic in-memory - use Redis in production)
const authRateLimits = new Map<string, { count: number; resetAt: number }>()

function getClientIp(request: NextRequest): string {
  return request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    request.headers.get('x-real-ip') ||
    '127.0.0.1'
}

function checkAuthRateLimit(ip: string): boolean {
  const now = Date.now()
  const windowMs = 60000 // 1 minute
  const maxRequests = 10 // 10 auth requests per minute

  const current = authRateLimits.get(ip)

  if (!current || current.resetAt < now) {
    authRateLimits.set(ip, { count: 1, resetAt: now + windowMs })
    return true
  }

  if (current.count >= maxRequests) {
    return false
  }

  current.count++
  return true
}

// Note: setInterval removed for Edge Runtime compatibility
// Rate limit cleanup happens naturally via TTL check in checkAuthRateLimit

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  const origin = request.headers.get('origin')

  // ==========================================================================
  // Skip middleware for static files and certain paths
  // ==========================================================================
  if (SKIP_MIDDLEWARE_PATHS.some((path) => pathname.startsWith(path))) {
    return NextResponse.next()
  }

  // ==========================================================================
  // Authentication Routing
  // ==========================================================================
  const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET })
  const isAuthenticated = !!token

  // Debug logging in development
  if (process.env.NODE_ENV === 'development') {
    const isProtected = isProtectedRoute(pathname)
    const isAuthReq = isAuthRequiredRoute(pathname)
    const isGuestOnly = isGuestOnlyRoute(pathname)
    if (isProtected || isAuthReq || isGuestOnly) {
      console.log(`[Middleware] ${pathname} | auth: ${isAuthenticated} | protected: ${isProtected} | authReq: ${isAuthReq} | guestOnly: ${isGuestOnly}`)
    }
  }

  // 1. Guest Only Routes - 로그인 상태면 /dashboard로 리다이렉트
  if (isGuestOnlyRoute(pathname) && isAuthenticated) {
    return NextResponse.redirect(new URL(ROUTES.dashboard, request.url))
  }

  // 2. Auth Required Routes - 비로그인이면 /login으로 리다이렉트
  if (isAuthRequiredRoute(pathname) && !isAuthenticated) {
    const loginUrl = new URL(ROUTES.login, request.url)
    loginUrl.searchParams.set('redirect', pathname)
    return NextResponse.redirect(loginUrl)
  }

  // 3. Protected Routes - 비로그인이면 /login으로 리다이렉트
  if (isProtectedRoute(pathname) && !isAuthenticated) {
    const loginUrl = new URL(ROUTES.login, request.url)
    loginUrl.searchParams.set('redirect', pathname)
    return NextResponse.redirect(loginUrl)
  }

  // Continue with security headers
  const response = NextResponse.next()

  // Debug headers to verify middleware is running
  response.headers.set('X-Middleware-Test', 'running')
  response.headers.set('X-Middleware-Auth', isAuthenticated ? 'true' : 'false')

  // ==========================================================================
  // CVE-CB-008: CORS Headers
  // ==========================================================================

  if (origin) {
    const isAllowedOrigin = ALLOWED_ORIGINS.includes(origin) ||
      (process.env.NODE_ENV === 'development' && origin.startsWith('http://localhost'))

    if (isAllowedOrigin) {
      response.headers.set('Access-Control-Allow-Origin', origin)
      response.headers.set('Access-Control-Allow-Credentials', 'true')
      response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS')
      response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With')
      response.headers.set('Access-Control-Max-Age', '86400') // 24 hours
    }
  }

  // Handle preflight requests
  if (request.method === 'OPTIONS') {
    return new NextResponse(null, {
      status: 200,
      headers: response.headers,
    })
  }

  // ==========================================================================
  // CVE-CB-013: Security Headers
  // ==========================================================================

  // Content Security Policy
  const cspDirectives = [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://accounts.google.com https://apis.google.com",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://cdn.jsdelivr.net",
    "font-src 'self' https://fonts.gstatic.com",
    "img-src 'self' data: blob: https: http:",
    "connect-src 'self' https://accounts.google.com https://apis.google.com wss: https: http://localhost:3003 ws://localhost:3003",
    "frame-src 'self' https://accounts.google.com",
    "frame-ancestors 'self'",
    "form-action 'self'",
    "base-uri 'self'",
    "object-src 'none'",
  ].join('; ')

  response.headers.set('Content-Security-Policy', cspDirectives)

  // Other security headers
  response.headers.set('X-Content-Type-Options', 'nosniff')
  response.headers.set('X-Frame-Options', 'SAMEORIGIN')
  response.headers.set('X-XSS-Protection', '1; mode=block')
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')
  response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()')

  // HSTS (Strict Transport Security) - Only in production
  if (process.env.NODE_ENV === 'production') {
    response.headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload')
  }

  // ==========================================================================
  // CVE-CB-006: Rate Limiting for Auth Endpoints
  // ==========================================================================

  if (pathname.startsWith('/api/auth')) {
    const clientIp = getClientIp(request)

    if (!checkAuthRateLimit(clientIp)) {
      return new NextResponse(
        JSON.stringify({
          error: 'Too many requests',
          code: 'RATE_LIMIT_EXCEEDED'
        }),
        {
          status: 429,
          headers: {
            'Content-Type': 'application/json',
            'Retry-After': '60',
            ...Object.fromEntries(response.headers),
          },
        }
      )
    }
  }

  // ==========================================================================
  // Remove potentially dangerous headers from response
  // ==========================================================================

  response.headers.delete('X-Powered-By')
  response.headers.delete('Server')

  return response
}

// Configure which paths should run the middleware
export const config = {
  matcher: [
    // Match all API routes
    '/api/:path*',
    // Match all pages except static files
    '/((?!_next/static|_next/image|favicon.ico|images|fonts).*)',
  ],
}
