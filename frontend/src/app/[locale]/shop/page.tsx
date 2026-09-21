/**
 * shop/page.tsx — Server Component
 * Pre-fetches first page of products + categories at SSR time
 * so the product grid is visible on first paint (improves LCP).
 * ShopClient handles all interactive filtering/search/pagination.
 */
import { productsApi, categoriesApi } from '@/lib/api';
import { STATIC_PRODUCTS, STATIC_CATEGORIES } from '@/lib/staticProducts';
import type { Product, Category } from '@/lib/types';
import ShopClient from './ShopClient';

export const revalidate = 60; // ISR — re-fetch every 60s

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
