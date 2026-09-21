import { MetadataRoute } from 'next';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://rawaqa-ruby.vercel.app';
const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'https://api.rawaqa.com/api';

/** Fetch with a short timeout so a slow API never blocks the build */
async function safeFetch<T>(url: string): Promise<T[]> {
  try {
    const res = await fetch(url, {
      next: { revalidate: 3600 },
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) return [];
    const json = await res.json();
    return json?.data ?? json ?? [];
  } catch {
    return [];
  }
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const locales = ['ar', 'en'];

  // ── Static routes ──────────────────────────────────────────────────────────
  const staticRoutes: MetadataRoute.Sitemap = [
    {
      url: `${SITE_URL}/ar`,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 1.0,
      alternates: {
        languages: {
          ar:           `${SITE_URL}/ar`,
          en:           `${SITE_URL}/en`,
          'x-default':  `${SITE_URL}/ar`,
        },
      },
    },
    {
      url: `${SITE_URL}/en`,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 1.0,
      alternates: {
        languages: {
          ar:           `${SITE_URL}/ar`,
          en:           `${SITE_URL}/en`,
          'x-default':  `${SITE_URL}/ar`,
        },
      },
    },
    ...locales.map((locale) => ({
      url: `${SITE_URL}/${locale}/shop`,
      lastModified: new Date(),
      changeFrequency: 'daily' as const,
      priority: 0.9,
      alternates: {
        languages: {
          ar:          `${SITE_URL}/ar/shop`,
          en:          `${SITE_URL}/en/shop`,
          'x-default': `${SITE_URL}/ar/shop`,
        },
      },
    })),
  ];

  // ── Dynamic: products ─────────────────────────────────────────────────────
  const products = await safeFetch<any>(
    `${API_BASE}/products?limit=200&status=active`
  );

  const productRoutes: MetadataRoute.Sitemap = [];
  for (const product of products) {
    const slugAr = product.slugAr || product.slug;
    const slugEn = product.slugEn || product.slug;
    if (!slugAr && !slugEn) continue;

    for (const locale of locales) {
      const slug = locale === 'ar' ? slugAr : slugEn;
      if (!slug) continue;
      productRoutes.push({
        url: `${SITE_URL}/${locale}/product/${slug}`,
        lastModified: product.updatedAt ? new Date(product.updatedAt) : new Date(),
        changeFrequency: 'weekly',
        priority: 0.8,
        alternates: {
          languages: {
            ar:          `${SITE_URL}/ar/product/${slugAr}`,
            en:          `${SITE_URL}/en/product/${slugEn}`,
            'x-default': `${SITE_URL}/ar/product/${slugAr}`,
          },
        },
      });
    }
  }

  // ── Dynamic: categories ───────────────────────────────────────────────────
  const categories = await safeFetch<any>(`${API_BASE}/categories/active`);

  const categoryRoutes: MetadataRoute.Sitemap = [];
  for (const cat of categories) {
    for (const locale of locales) {
      const slug = locale === 'ar' ? cat.slugAr : cat.slugEn;
      if (!slug) continue;
      categoryRoutes.push({
        url: `${SITE_URL}/${locale}/shop?category=${slug}`,
        lastModified: cat.updatedAt ? new Date(cat.updatedAt) : new Date(),
        changeFrequency: 'weekly',
        priority: 0.7,
      });
    }
  }

  return [...staticRoutes, ...productRoutes, ...categoryRoutes];
}
