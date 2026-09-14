import { getTranslations } from 'next-intl/server';
import HomeClient from './HomeClient';
import { contentApi } from '@/lib/api';

export const revalidate = 60;

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
  let initialContent: Record<string, any> = {};
  try {
    const fetchPromise = contentApi.getAll();
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('SSR timeout')), 1200)
    );
    const res = (await Promise.race([fetchPromise, timeoutPromise])) as any;
    initialContent = res?.data || res || {};
  } catch {
    // fallback to client-side fetching / defaults
  }
  return <HomeClient locale={locale} initialContent={initialContent} />;
}
