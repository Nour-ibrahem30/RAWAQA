import type { Metadata } from 'next';
import { fontClasses } from '@/lib/fonts';

export const metadata: Metadata = {
  title: 'RAWAQA — Crafted Comfort. Designed for Life.',
  icons: {
    icon: [
      { url: '/favicon.ico?v=3', sizes: 'any' },
      { url: '/favicon-32x32.png?v=3', sizes: '32x32', type: 'image/png' },
      { url: '/favicon-16x16.png?v=3', sizes: '16x16', type: 'image/png' },
      { url: '/icon-192.png?v=3', sizes: '192x192', type: 'image/png' },
    ],
    apple: [
      { url: '/apple-touch-icon.png?v=3', sizes: '180x180', type: 'image/png' },
    ],
    shortcut: '/favicon.ico?v=3',
  },
};

// Root layout — Next.js App Router requires html + body here.
// The locale layout ([locale]/layout.tsx) overrides lang/dir via
// suppressHydrationWarning, which prevents React from warning about
// server/client attribute mismatches when the locale is applied.
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html className={fontClasses} suppressHydrationWarning>
      <head>
        <link rel="icon" href="/favicon.ico?v=3" sizes="any" />
        <link rel="icon" href="/favicon-32x32.png?v=3" type="image/png" sizes="32x32" />
        <link rel="icon" href="/favicon-16x16.png?v=3" type="image/png" sizes="16x16" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png?v=3" />
        <link rel="shortcut icon" href="/favicon.ico?v=3" />
        <link rel="preconnect" href="https://res.cloudinary.com" crossOrigin="anonymous" />
        <link rel="dns-prefetch" href="https://res.cloudinary.com" />
        <link rel="preconnect" href="https://rawaqa-backend.onrender.com" crossOrigin="anonymous" />
        <link rel="dns-prefetch" href="https://rawaqa-backend.onrender.com" />
        <link rel="preconnect" href="https://accounts.google.com" crossOrigin="anonymous" />
        <link rel="dns-prefetch" href="https://accounts.google.com" />
        {/* Preload LCP hero image — visible immediately on first paint */}
        <link
          rel="preload"
          as="image"
          href="/hero/hero-1.jpg"
          fetchPriority="high"
        />
      </head>
      <body suppressHydrationWarning>
        {children}
      </body>
    </html>
  );
}
