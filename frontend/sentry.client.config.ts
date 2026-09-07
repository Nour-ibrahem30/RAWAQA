/**
 * Sentry client-side (browser) configuration.
 * Loaded automatically by @sentry/nextjs via next.config.mjs.
 */
import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

  environment: process.env.NODE_ENV,

  // Replay 10% of sessions, 100% of sessions with errors
  integrations: [
    Sentry.replayIntegration({
      maskAllText: true,
      blockAllMedia: true,
    }),
  ],

  tracesSampleRate:   process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
  replaysSessionSampleRate: 0.1,
  replaysOnErrorSampleRate: 1.0,

  // Only send errors in production; skip in development to reduce noise
  enabled: process.env.NODE_ENV === 'production',

  beforeSend(event) {
    // Strip access tokens from request URLs captured in the event
    if (event.request?.url) {
      event.request.url = event.request.url.replace(/token=[^&]+/, 'token=REDACTED');
    }
    return event;
  },
});
