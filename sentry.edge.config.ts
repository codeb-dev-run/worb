// =============================================================================
// Sentry Edge Configuration
// This file configures the initialization of Sentry on the Edge Runtime.
// The config you add here will be used whenever middleware or edge routes are used.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/
// =============================================================================

import * as Sentry from '@sentry/nextjs'

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

  // Adjust this value in production, or use tracesSampler for greater control
  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,

  // Setting this option to true will print useful information to the console
  debug: false,

  // Only enable in production or staging
  enabled: process.env.NODE_ENV !== 'development' || !!process.env.NEXT_PUBLIC_SENTRY_DSN,

  // Environment
  environment: process.env.NODE_ENV,

  // Release tracking
  release: process.env.NEXT_PUBLIC_SENTRY_RELEASE || 'codeb-platform@1.0.0',

  // Ignore specific errors
  ignoreErrors: [
    /^NEXT_REDIRECT$/,
    /^NEXT_NOT_FOUND$/,
    /RATE_LIMIT/,
  ],
})
