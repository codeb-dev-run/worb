// =============================================================================
// Next.js Middleware - CVE-CB-008 & CVE-CB-013 Security Headers & CORS
// =============================================================================

import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// CORS allowed origins (configure via environment variable)
const ALLOWED_ORIGINS = (process.env.CORS_ORIGINS || 'http://localhost:3000,https://codeb.app,https://www.codeb.app')
  .split(',')
  .map(origin => origin.trim())

// Paths that should skip authentication
const PUBLIC_PATHS = [
  '/api/auth',
  '/api/health',
  '/api/public',
  '/_next',
  '/favicon.ico',
  '/images',
  '/fonts',
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

// Clean up old rate limit entries periodically
setInterval(() => {
  const now = Date.now()
  authRateLimits.forEach((data, ip) => {
    if (data.resetAt < now) {
      authRateLimits.delete(ip)
    }
  })
}, 60000)

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  const origin = request.headers.get('origin')
  const response = NextResponse.next()

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
