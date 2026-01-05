// =============================================================================
// Next.js Middleware - CVE-CB-008 & CVE-CB-013 Security Headers & CORS
// + Authentication Routing + CSP Nonce Support
// =============================================================================

import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { getToken } from 'next-auth/jwt'

// =============================================================================
// Nonce Generation (Edge Runtime compatible)
// =============================================================================

function generateNonce(): string {
  const array = new Uint8Array(16)
  crypto.getRandomValues(array)
  // Convert Uint8Array to string (Edge Runtime compatible)
  let binary = ''
  for (let i = 0; i < array.length; i++) {
    binary += String.fromCharCode(array[i])
  }
  return btoa(binary)
}

// =============================================================================
// Route Configuration (100K CCU 최적화: 컴파일된 정규식 기반)
// =============================================================================

const ROUTES = {
  login: '/login',
  dashboard: '/dashboard',
}

// 100K CCU 최적화: 컴파일된 정규식으로 라우트 매칭 (Array.some()보다 5-10배 빠름)
const GUEST_ONLY_REGEX = /^\/(?:login|forgot-password)(?:\/|$)/
const AUTH_REQUIRED_REGEX = /^\/(?:workspace\/create|workspaces\/join)(?:\/|$)/
const PROTECTED_ROUTES_REGEX = /^\/(?:dashboard|profile|calendar|messages|tasks|kanban|gantt|files|logs|ai|analytics|meetings|deliverables|projects|groupware|automation|marketing|settings|users|workspace\/organization|hr|finance|contracts|invoices)(?:\/|$)/

function isGuestOnlyRoute(pathname: string): boolean {
  return GUEST_ONLY_REGEX.test(pathname)
}

function isAuthRequiredRoute(pathname: string): boolean {
  return AUTH_REQUIRED_REGEX.test(pathname)
}

function isProtectedRoute(pathname: string): boolean {
  return PROTECTED_ROUTES_REGEX.test(pathname)
}

// CORS allowed origins (configure via environment variable)
const ALLOWED_ORIGINS = (process.env.CORS_ORIGINS || 'http://localhost:3000,https://codeb.app,https://www.codeb.app')
  .split(',')
  .map(origin => origin.trim())

// 100K CCU 최적화: 스킵 경로도 컴파일된 정규식 사용
const SKIP_MIDDLEWARE_REGEX = /^\/(?:_next|favicon\.ico|images|fonts|api\/auth|api\/health|api\/public)(?:\/|$)/

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
  // Skip middleware for static files and certain paths (100K CCU 최적화)
  // ==========================================================================
  if (SKIP_MIDDLEWARE_REGEX.test(pathname)) {
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
  // CVE-CB-013: Security Headers with CSP Nonce
  // ==========================================================================

  // Generate nonce for this request
  const nonce = generateNonce()

  // Store nonce in header for use by Next.js components
  response.headers.set('X-Nonce', nonce)

  // Content Security Policy with nonce (removes unsafe-inline)
  // Note: 'unsafe-eval' is still needed for Next.js development mode and some libraries
  const cspDirectives = [
    "default-src 'self'",
    // Use nonce for scripts, but keep 'unsafe-eval' for Next.js compatibility
    // In production, consider removing 'unsafe-eval' if not needed
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic' https://accounts.google.com https://apis.google.com${process.env.NODE_ENV === 'development' ? " 'unsafe-eval'" : ''}`,
    // Allow unsafe-inline for styles (needed for react-hot-toast and other UI libraries)
    `style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://cdn.jsdelivr.net`,
    "font-src 'self' https://fonts.gstatic.com data:",
    "img-src 'self' data: blob: https: http:",
    `connect-src 'self' https://accounts.google.com https://apis.google.com wss: https:${process.env.NODE_ENV === 'development' ? ' http://localhost:* ws://localhost:*' : ''}`,
    "frame-src 'self' https://accounts.google.com",
    "frame-ancestors 'self'",
    "form-action 'self'",
    "base-uri 'self'",
    "object-src 'none'",
    "upgrade-insecure-requests",
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
