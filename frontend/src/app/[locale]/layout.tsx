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

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://rawaqa.com';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;

  const titleAr      = 'رواقة — كل الراحة. صُنعت لحياتك.';
  const titleEn      = 'RAWAQA — Crafted Comfort. Designed for Life.';
  const descriptionAr = 'بين باقز وكراسي جلوس عصرية للبيت المصري — تصاميم مميزة بجودة استثنائية من رواقة.';
  const descriptionEn = 'Premium bean bags and relaxed seating crafted for the Egyptian home — exceptional quality from RAWAQA.';

  const title       = locale === 'ar' ? titleAr       : titleEn;
  const description = locale === 'ar' ? descriptionAr : descriptionEn;
  const url         = `${SITE_URL}/${locale}`;

  return {
    title,
    description,
    metadataBase: new URL(SITE_URL),
    alternates: {
      canonical: url,
      languages: {
        ar:          `${SITE_URL}/ar`,
        en:          `${SITE_URL}/en`,
        'x-default': `${SITE_URL}/ar`,
      },
    },
    openGraph: {
      type:        'website',
      locale:      locale === 'ar' ? 'ar_EG' : 'en_US',
      url,
      siteName:    'RAWAQA',
      title,
      description,
      images: [
        {
          url:    `${SITE_URL}/og-image.jpg`,
          width:  1200,
          height: 630,
          alt:    title,
        },
      ],
    },
    twitter: {
      card:        'summary_large_image',
      title,
      description,
      images:      [`${SITE_URL}/og-image.jpg`],
    },
  };
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;

  if (!routing.locales.includes(locale as 'ar' | 'en')) notFound();

  const messages = await getMessages();  return (
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
