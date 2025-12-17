// =============================================================================
// Sentry Client Configuration
// This file configures the initialization of Sentry on the client.
// The config you add here will be used whenever a users loads a page in browser.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/
// =============================================================================

import * as Sentry from '@sentry/nextjs'

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

  // Adjust this value in production, or use tracesSampler for greater control
  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,

  // Enable Session Replay in production
  replaysSessionSampleRate: 0.1, // 10% of sessions
  replaysOnErrorSampleRate: 1.0, // 100% of errors

  // Setting this option to true will print useful information to the console
  debug: false,

  // Enable or disable integrations
  integrations: [
    Sentry.replayIntegration({
      // Additional SDK configuration goes here
      maskAllText: true,
      blockAllMedia: true,
    }),
    Sentry.browserTracingIntegration(),
    Sentry.breadcrumbsIntegration({
      console: true,
      dom: true,
      fetch: true,
      history: true,
      xhr: true,
    }),
  ],

  // Only enable in production or staging
  enabled: process.env.NODE_ENV !== 'development' || !!process.env.NEXT_PUBLIC_SENTRY_DSN,

  // Environment
  environment: process.env.NODE_ENV,

  // Release tracking
  release: process.env.NEXT_PUBLIC_SENTRY_RELEASE || 'codeb-platform@1.0.0',

  // Ignore specific errors
  ignoreErrors: [
    // Browser extensions
    /^Script error$/,
    /^ResizeObserver loop/,
    // Network errors that are not actionable
    /^Network request failed$/,
    /^Load failed$/,
    // Cancel errors
    /AbortError/,
    /cancelled/i,
  ],

  // Filter events before sending
  beforeSend(event, hint) {
    // Don't send events for certain types
    const error = hint.originalException as Error
    if (error?.message?.includes('hydration')) {
      return null // Ignore hydration errors
    }
    return event
  },
})
