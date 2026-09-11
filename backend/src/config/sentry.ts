/**
 * Sentry initialization for the backend (Node.js / Express).
 * Must be imported BEFORE any other modules in server.ts so
 * Sentry can instrument them correctly.
 */
import { env } from './env';
import { logInfo, logWarn } from './logger';

let Sentry: any = null;

try {
  Sentry = require('@sentry/node');
} catch (err) {
  // Sentry not installed — monitoring will be disabled
}

export function initSentry(): void {
  if (!Sentry) {
    logWarn('Sentry not installed — error monitoring disabled');
    return;
  }

  if (!env.SENTRY_DSN) {
    logWarn('Sentry DSN not configured — error monitoring disabled');
    return;
  }

  Sentry.init({
    dsn:         env.SENTRY_DSN,
    environment: env.SENTRY_ENVIRONMENT,
    enabled:     !!env.SENTRY_DSN,

    // Capture 10% of transactions in production, 100% in dev/staging
    tracesSampleRate: env.NODE_ENV === 'production' ? 0.1 : 1.0,

    // Strip sensitive headers and bodies from requests
    beforeSend(event: any) {
      // Remove auth headers from captured requests
      if (event.request?.headers) {
        delete event.request.headers['authorization'];
        delete event.request.headers['cookie'];
      }
      return event;
    },
  });

  logInfo(`Sentry initialized (env: ${env.SENTRY_ENVIRONMENT})`);
}

/** Express request handler — attach before routes */
export const sentryRequestHandler = (): any => {
  if (!Sentry) return (_req: any, _res: any, next: any) => next();
  return Sentry.Handlers?.requestHandler() || ((_req: any, _res: any, next: any) => next());
};

/** Express error handler — attach after all routes, before your own error handler */
export const sentryErrorHandler = (): any => {
  if (!Sentry) return (_err: any, _req: any, _res: any, next: any) => next(_err);
  return Sentry.Handlers?.errorHandler() || ((_err: any, _req: any, _res: any, next: any) => next(_err));
};

/** Manually capture an exception */
export const captureException = (err: unknown, context?: Record<string, unknown>) => {
  if (!Sentry || !env.SENTRY_DSN) return;
  Sentry.withScope((scope: any) => {
    if (context) scope.setContext('extra', context);
    Sentry.captureException(err);
  });
};

/** Set the authenticated user on the current Sentry scope */
export const setSentryUser = (userId: string, email?: string) => {
  if (!Sentry || !env.SENTRY_DSN) return;
  Sentry.setUser({ id: userId, email });
};

/** Clear user from scope (on logout) */
export const clearSentryUser = () => {
  if (!env.SENTRY_DSN) return;
  Sentry.setUser(null);
};
