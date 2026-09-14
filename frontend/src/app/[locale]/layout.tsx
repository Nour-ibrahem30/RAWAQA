import type { Metadata } from 'next';
import { NextIntlClientProvider } from 'next-intl';
import { getMessages } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { routing } from '@/i18n/routing';
import { fontClasses } from '@/lib/fonts';
import '../globals.css';
import { CartProvider } from '@/context/CartContext';
import { AuthProvider } from '@/context/AuthContext';
import { ToastProvider } from '@/context/ToastContext';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import Toast from '@/components/ui/Toast';
import ColorLoader from '@/components/ui/ColorLoader';
import { ScrollReveal } from '@/components/ui/ScrollAnimations';
import BackToTop from '@/components/ui/BackToTop';
import LocaleHtmlAttrs from '@/components/ui/LocaleHtmlAttrs';

export const metadata: Metadata = {
  title: 'RAWAQA — Crafted Comfort. Designed for Life.',
  description: 'Premium bean bags and relaxed seating for the Egyptian home.',
  icons: {
    icon: [
      { url: '/favicon.ico?v=2', sizes: 'any' },
      { url: '/favicon-32x32.png?v=2', sizes: '32x32', type: 'image/png' },
      { url: '/favicon-16x16.png?v=2', sizes: '16x16', type: 'image/png' },
      { url: '/logo.png?v=2', sizes: '192x192', type: 'image/png' },
    ],
    apple: [
      { url: '/apple-touch-icon.png?v=2', sizes: '180x180', type: 'image/png' },
    ],
    shortcut: '/favicon.ico?v=2',
  },
};

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;

  if (!routing.locales.includes(locale as 'ar' | 'en')) notFound();

  const messages = await getMessages();

  return (
    <NextIntlClientProvider messages={messages}>
      {/* Sets lang, dir, and font class-names on <html> client-side for root doc sync */}
      <LocaleHtmlAttrs locale={locale} fontClasses={fontClasses} />
      <div dir={locale === 'ar' ? 'rtl' : 'ltr'} lang={locale} className={`${fontClasses} min-h-screen flex flex-col`}>
        <AuthProvider>
          <CartProvider>
            <ToastProvider>
              <Navbar />
              <ColorLoader />
              <ScrollReveal />
              <main className="flex-1">{children}</main>
              <Footer />
              <BackToTop />
              <Toast />
            </ToastProvider>
          </CartProvider>
        </AuthProvider>
      </div>
    </NextIntlClientProvider>
  );
}
