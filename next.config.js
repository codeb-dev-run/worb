const { withSentryConfig } = require('@sentry/nextjs')
const withBundleAnalyzer = require('@next/bundle-analyzer')({
  enabled: process.env.ANALYZE === 'true',
})

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,

  // =============================================================================
  // Build ID를 환경변수로 노출 (버전 체크용)
  // =============================================================================
  generateBuildId: async () => {
    // 고유한 빌드 ID 생성 (timestamp + random)
    const buildId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    return buildId
  },
  env: {
    NEXT_BUILD_ID: process.env.NEXT_BUILD_ID || `${Date.now()}`,
  },

  // =============================================================================
  // Performance Optimization - Hyperscale Production
  // Next.js 16: swcMinify는 기본값이므로 제거
  // =============================================================================
  compress: true,
  poweredByHeader: false,

  // =============================================================================
  // Server External Packages - Next.js 16 새 위치
  // (experimental.serverComponentsExternalPackages에서 이동)
  // =============================================================================
  serverExternalPackages: [
    '@sentry/nextjs',
    '@sentry/node',
    '@opentelemetry/instrumentation',
    '@opentelemetry/api',
    '@prisma/instrumentation',
    'require-in-the-middle',
    'import-in-the-middle',
  ],

  // =============================================================================
  // Experimental Features - CSP Nonce Support
  // =============================================================================
  experimental: {
    serverActions: {
      allowedOrigins: ['localhost:3000', 'localhost:3003', 'localhost:3100', 'codeb.app', 'www.codeb.app'],
    },
  },

  // Output configuration for standalone deployment
  output: 'standalone',

  // =============================================================================
  // Image Optimization with CDN - Next.js 16 remotePatterns
  // (images.domains는 deprecated, remotePatterns 사용)
  // =============================================================================
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'lh3.googleusercontent.com',
      },
      {
        protocol: 'https',
        hostname: 'cdn.codeb.app',
      },
      {
        protocol: 'https',
        hostname: 'images.codeb.app',
      },
      {
        protocol: 'https',
        hostname: '*.googleusercontent.com',
      },
    ],
    formats: ['image/webp', 'image/avif'],
    minimumCacheTTL: 31536000, // 1 year
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    loader: 'default',
    // Use CDN for image optimization in production
    ...(process.env.NODE_ENV === 'production' && {
      loader: 'custom',
      loaderFile: './src/lib/image-loader.ts',
    }),
  },

  // =============================================================================
  // CDN & Edge Caching Headers
  // =============================================================================
  async headers() {
    return [
      // Static assets - Long cache with immutable
      {
        source: '/_next/static/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
          {
            key: 'CDN-Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
      // Images - Long cache
      {
        source: '/images/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
          {
            key: 'CDN-Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
      // Fonts - Long cache
      {
        source: '/fonts/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
      // API health endpoints - Short cache
      {
        source: '/api/health/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=60, stale-while-revalidate=300',
          },
        ],
      },
      // API endpoints - No cache (dynamic)
      {
        source: '/api/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'no-store, must-revalidate',
          },
          {
            key: 'CDN-Cache-Control',
            value: 'no-store',
          },
        ],
      },
      // =============================================================================
      // HTML Pages - NO CACHE (핵심: 브라우저 캐시 문제 근본 해결)
      // 해외 1% 개발자 전략: HTML은 항상 서버에서 새로 받고, JS/CSS는 해시로 관리
      // =============================================================================
      {
        source: '/:path*',
        headers: [
          // HTML 페이지 캐시 완전 비활성화 - 항상 최신 버전 로드
          {
            key: 'Cache-Control',
            value: 'no-cache, no-store, must-revalidate',
          },
          {
            key: 'Pragma',
            value: 'no-cache',
          },
          {
            key: 'Expires',
            value: '0',
          },
          // CDN도 캐시하지 않음
          {
            key: 'CDN-Cache-Control',
            value: 'no-store',
          },
          {
            key: 'Surrogate-Control',
            value: 'no-store',
          },
          // 보안 헤더
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
          {
            key: 'Cross-Origin-Opener-Policy',
            value: 'same-origin-allow-popups',
          },
          {
            key: 'Cross-Origin-Embedder-Policy',
            value: 'unsafe-none',
          },
          {
            key: 'X-DNS-Prefetch-Control',
            value: 'on',
          },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=31536000; includeSubDomains; preload',
          },
        ],
      },
    ]
  },
}

// =============================================================================
// Sentry Configuration
// =============================================================================
const sentryWebpackPluginOptions = {
  // For all available options, see:
  // https://github.com/getsentry/sentry-webpack-plugin#options

  org: process.env.SENTRY_ORG || 'codeb',
  project: process.env.SENTRY_PROJECT || 'codeb-platform',

  // Only print logs for uploading source maps in CI
  silent: !process.env.CI,

  // Upload a larger set of source maps for prettier stack traces (increases build time)
  widenClientFileUpload: true,

  // Automatically annotate React components to show their full name in breadcrumbs and session replay
  reactComponentAnnotation: {
    enabled: true,
  },

  // Route browser requests to Sentry through a Next.js rewrite to circumvent ad-blockers.
  tunnelRoute: '/monitoring',

  // Hides source maps from generated client bundles
  hideSourceMaps: true,

  // Automatically tree-shake Sentry logger statements to reduce bundle size
  disableLogger: true,

  // Enables automatic instrumentation of Vercel Cron Monitors (Does not yet work with Pages Router)
  automaticVercelMonitors: true,
}

// Export with Sentry wrapper and Bundle Analyzer
const finalConfig = process.env.NEXT_PUBLIC_SENTRY_DSN
  ? withSentryConfig(nextConfig, sentryWebpackPluginOptions)
  : nextConfig

module.exports = withBundleAnalyzer(finalConfig)
