/**
 * shop/page.tsx — Server Component
 * Pre-fetches first page of products + categories at SSR time
 * so the product grid is visible on first paint (improves LCP).
 * ShopClient handles all interactive filtering/search/pagination.
 */
import type { Metadata } from 'next';
import { productsApi, categoriesApi } from '@/lib/api';
import { STATIC_PRODUCTS, STATIC_CATEGORIES } from '@/lib/staticProducts';
import type { Product, Category } from '@/lib/types';
import ShopClient from './ShopClient';

export const revalidate = 60; // ISR — re-fetch every 60s

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://rawaqa-ruby.vercel.app';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const isAr = locale === 'ar';
  const url = `${SITE_URL}/${locale}/shop`;

  return {
    title: isAr ? 'المتجر — رواقة | كراسي بين باج فاخرة' : 'Shop — RAWAQA | Premium Bean Bags',
    description: isAr
      ? 'تسوّق أجود كراسي البين باج المصرية — تصاميم عصرية للاسترخاء والألعاب والأطفال والهواء الطلق.'
      : 'Shop premium Egyptian bean bags — modern designs for relaxing, gaming, kids, and outdoor living.',
    alternates: {
      canonical: url,
      languages: {
        ar: `${SITE_URL}/ar/shop`,
        en: `${SITE_URL}/en/shop`,
        'x-default': `${SITE_URL}/ar/shop`,
      },
    },
    openGraph: {
      type: 'website',
      url,
      title: isAr ? 'المتجر — رواقة' : 'Shop — RAWAQA',
      description: isAr
        ? 'كراسي بين باج فاخرة مصنوعة في مصر'
        : 'Premium bean bags made in Egypt',
      images: [{ url: `${SITE_URL}/og-image.jpg`, width: 1200, height: 630 }],
    },
  };
}

export default async function ShopPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;

  let initialProducts: Product[] = [];
  let initialCategories: Category[] = [];
  let initialTotal = 0;

  try {
    const [productsRes, categoriesRes] = await Promise.all([
      productsApi.list({ page: 1, limit: 12 }, locale),
      categoriesApi.list(locale),
    ]);

    initialProducts   = productsRes.data ?? [];
    initialTotal      = productsRes.pagination?.total ?? initialProducts.length;
    initialCategories = categoriesRes.data && categoriesRes.data.length > 0
      ? categoriesRes.data
      : (STATIC_CATEGORIES as Category[]);
  } catch {
    initialProducts   = STATIC_PRODUCTS.slice(0, 12) as unknown as Product[];
    initialCategories = STATIC_CATEGORIES as Category[];
    initialTotal      = initialProducts.length;
  }

  return (
    <ShopClient
      initialProducts={initialProducts}
      initialCategories={initialCategories}
      initialTotal={initialTotal}
    />
  );
}
