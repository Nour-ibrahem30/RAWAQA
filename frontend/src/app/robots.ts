import { MetadataRoute } from 'next';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://rawaqa-ruby.vercel.app';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: ['/', '/ar/', '/en/', '/ar/shop', '/en/shop', '/ar/product/', '/en/product/'],
        disallow: [
          // Private user pages
          '/ar/cart',
          '/en/cart',
          '/ar/checkout',
          '/en/checkout',
          '/ar/account',
          '/en/account',
          '/ar/wishlist',
          '/en/wishlist',
          '/ar/order-confirmation',
          '/en/order-confirmation',
          '/ar/track',
          '/en/track',
          '/ar/login',
          '/en/login',
          '/ar/register',
          '/en/register',
          '/ar/forgot-password',
          '/en/forgot-password',
          '/ar/reset-password',
          '/en/reset-password',
          '/ar/verify-email',
          '/en/verify-email',
          '/ar/verify-phone',
          '/en/verify-phone',
          // Admin panel — completely blocked
          '/admin',
          '/admin/',
          // API routes
          '/api/',
        ],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
