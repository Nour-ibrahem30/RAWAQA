import { getTranslations } from 'next-intl/server';
import HomeClient from './HomeClient';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'home' });
  return {
    title: `RAWAQA — ${t('hero.headline').replace('\n', ' ')}`,
    description: t('hero.sub'),
  };
}

export default async function HomePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  return <HomeClient locale={locale} />;
}
