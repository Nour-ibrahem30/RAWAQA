import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'RAWAQA',
};

// Root layout — Next.js App Router requires html + body here.
// The locale layout ([locale]/layout.tsx) overrides lang/dir/fonts via
// suppressHydrationWarning, which prevents React from warning about
// server/client attribute mismatches when the locale is applied.
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html suppressHydrationWarning>
      <body suppressHydrationWarning>
        {children}
      </body>
    </html>
  );
}
