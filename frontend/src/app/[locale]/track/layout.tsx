import type { Metadata } from 'next';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://rawaqa-ruby.vercel.app';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const isAr = locale === 'ar';
  const url = `${SITE_URL}/${locale}/track`;

  return {
    title: isAr ? 'تتبع طلبك — رواقة' : 'Track Your Order — RAWAQA',
    description: isAr
      ? 'تتبع حالة طلبك من رواقة بسهولة وسرعة.'
      : 'Easily track the status of your RAWAQA order.',
    robots: { index: false, follow: false },   // noindex — private page
    alternates: {
      canonical: url,
      languages: {
        ar: `${SITE_URL}/ar/track`,
        en: `${SITE_URL}/en/track`,
        'x-default': `${SITE_URL}/ar/track`,
      },
    },
  };
}

export default function TrackLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
