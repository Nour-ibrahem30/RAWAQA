import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts');

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Don't fail production build on ESLint warnings/errors
  // (TypeScript is the type-safety gate; ESLint is for dev guidance only)
  eslint: {
    ignoreDuringBuilds: true,
  },
  // Don't fail on TypeScript errors that tsc already checks
  typescript: {
    ignoreBuildErrors: false,
  },
  images: {
    remotePatterns: [
      { protocol: 'http',  hostname: 'localhost' },
      { protocol: 'https', hostname: '**' },
    ],
  },
  experimental: {
    instrumentationHook: true,
  },
  async redirects() {
    return [
      {
        source: '/admin/product',
        destination: '/admin/products',
        permanent: true,
      },
    ];
  },
};

export default withNextIntl(nextConfig);
