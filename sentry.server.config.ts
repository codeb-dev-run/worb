// =============================================================================
// Sentry Server Configuration
// This file configures the initialization of Sentry on the server.
// The config you add here will be used whenever the server handles a request.
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

  // Integrations for server-side
  integrations: [
    // Automatically instrument Node.js libraries
    Sentry.httpIntegration(),
    Sentry.prismaIntegration(),
  ],

  // Ignore specific errors
  ignoreErrors: [
    // NEXT_REDIRECT is expected behavior
    /^NEXT_REDIRECT$/,
    // Not found errors are expected
    /^NEXT_NOT_FOUND$/,
    // Rate limit errors are expected
    /RATE_LIMIT/,
  ],

  // Filter events before sending
  beforeSend(event, hint) {
    const error = hint.originalException as Error

    // Don't send expected errors
    if (error?.message?.includes('NEXT_REDIRECT')) {
      return null
    }
    if (error?.message?.includes('NEXT_NOT_FOUND')) {
      return null
    }

    return event
  },
})
