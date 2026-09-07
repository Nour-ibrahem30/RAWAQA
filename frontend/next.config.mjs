import createNextIntlPlugin from 'next-intl/plugin';
import { withSentryConfig } from '@sentry/nextjs';

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts');

/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      { protocol: 'http',  hostname: 'localhost' },
      { protocol: 'https', hostname: '**' },
    ],
  },
};

const withIntl = withNextIntl(nextConfig);

export default withSentryConfig(withIntl, {
  // Suppress Sentry CLI output during builds
  silent: true,

  // Upload source maps only when SENTRY_AUTH_TOKEN is set (CI/CD)
  authToken: process.env.SENTRY_AUTH_TOKEN,

  org:     process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,

  // Disable source-map upload in development (no token needed locally)
  disableServerWebpackPlugin: !process.env.SENTRY_AUTH_TOKEN,
  disableClientWebpackPlugin: !process.env.SENTRY_AUTH_TOKEN,

  // Wrap server components to report errors automatically
  autoInstrumentServerFunctions: true,
  autoInstrumentMiddleware:       true,
});
