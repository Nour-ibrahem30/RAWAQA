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
    formats: ['image/avif', 'image/webp'],
    deviceSizes: [360, 420, 640, 750, 828, 1080, 1200, 1920],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
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
      {
        source: '/admin/order',
        destination: '/admin/orders',
        permanent: true,
      },
      {
        source: '/:locale(ar|en)/admin',
        destination: '/admin',
        permanent: false,
      },
      {
        source: '/:locale(ar|en)/admin/:path*',
        destination: '/admin/:path*',
        permanent: false,
      },
      {
        source: '/orders',
        destination: '/ar/account',
        permanent: false,
      },
      {
        source: '/:locale(ar|en)/orders',
        destination: '/:locale/account',
        permanent: false,
      },
      {
        source: '/account/orders',
        destination: '/ar/account',
        permanent: false,
      },
      {
        source: '/:locale(ar|en)/account/orders',
        destination: '/:locale/account',
        permanent: false,
      },
      {
        source: '/products',
        destination: '/ar/shop',
        permanent: false,
      },
      {
        source: '/:locale(ar|en)/products',
        destination: '/:locale/shop',
        permanent: false,
      },
      {
        source: '/product',
        destination: '/ar/shop',
        permanent: false,
      },
      {
        source: '/:locale(ar|en)/product',
        destination: '/:locale/shop',
        permanent: false,
      },
    ];
  },
};

export default withNextIntl(nextConfig);
