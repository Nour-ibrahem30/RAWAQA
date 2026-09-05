'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import ProductCard from '@/components/product/ProductCard';
import { SkeletonGrid } from '@/components/ui/SkeletonCard';
import { productsApi, categoriesApi } from '@/lib/api';
import { STATIC_PRODUCTS, STATIC_CATEGORIES } from '@/lib/staticProducts';
import { loc } from '@/lib/utils';
import type { Category, Product } from '@/lib/types';

export default function ShopPage() {
  const t = useTranslations('shop');
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const locale = (params?.locale as string) || 'ar';
  const isAr = locale === 'ar';

  const [products, setProducts] = useState<Product[]>(STATIC_PRODUCTS);
  const [categories, setCategories] = useState<Category[]>(STATIC_CATEGORIES as Category[]);
  const [total, setTotal] = useState(STATIC_PRODUCTS.length);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);

  // Filter state
  const [search, setSearch] = useState(searchParams?.get('q') || '');
  const [category, setCategory] = useState(searchParams?.get('category') || '');
  const [sort, setSort] = useState(searchParams?.get('sort') || '');
  const [inStock, setInStock] = useState(false);
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');

  const searchDebounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Load categories once
  useEffect(() => {
    categoriesApi.list(locale).then(r => setCategories(r.data ?? [])).catch(() => {});
  }, [locale]);

  const fetchProducts = useCallback(async (pg = 1, reset = true) => {
    setLoading(true);
    try {
      const res = await productsApi.list({
        page: pg,
        limit: 12,
        ...(category && { category }),
        ...(search && { search }),
        ...(sort && { sort: sort.split('-')[0], order: sort.split('-')[1] || 'asc' }),
        ...(minPrice && { minPrice: Number(minPrice) }),
        ...(maxPrice && { maxPrice: Number(maxPrice) }),
      }, locale);
      const data = res.data ?? [];
      setProducts(prev => reset ? data : [...prev, ...data]);
      setTotal(res.pagination?.total ?? data.length);
      setHasMore((res.pagination?.page ?? 1) < (res.pagination?.pages ?? 1));
      setPage(pg);
    } catch {
      if (reset) setProducts([]);
    } finally {
      setLoading(false);
    }
  }, [category, search, sort, minPrice, maxPrice, locale]);

  useEffect(() => {
    fetchProducts(1, true);
  }, [fetchProducts]);

  // URL sync
  useEffect(() => {
    const q: Record<string, string> = {};
    if (search) q.q = search;
    if (category) q.category = category;
    if (sort) q.sort = sort;
    const qs = new URLSearchParams(q).toString();
    router.replace(`/${locale}/shop${qs ? `?${qs}` : ''}`, { scroll: false });
  }, [search, category, sort, locale, router]);

  const handleSearch = (v: string) => {
    if (searchDebounce.current) clearTimeout(searchDebounce.current);
    searchDebounce.current = setTimeout(() => setSearch(v), 400);
  };

  const clearFilters = () => {
    setSearch('');
    setCategory('');
    setSort('');
    setInStock(false);
    setMinPrice('');
    setMaxPrice('');
  };

  const sortOptions = [
    { value: '', label: t('sort_recommended') },
    { value: 'price-asc', label: t('sort_price_asc') },
    { value: 'price-desc', label: t('sort_price_desc') },
    { value: 'createdAt-desc', label: t('sort_newest') },
  ];

  const hasActiveFilters = !!(search || category || sort || inStock || minPrice || maxPrice);

  return (
    <div style={{ background: '#12100c', minHeight: '100vh', color: 'var(--ivory)' }}>
      {/* Header bar */}
      <div
        className="pt-28 pb-8 border-b"
        style={{ borderColor: 'rgba(210,181,106,.1)', background: '#0f0e0a' }}
      >
        <div className="wrap">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
            <div>
              <p style={{ fontSize: '.68rem', letterSpacing: '.2em', textTransform: 'uppercase', color: 'var(--gold)', marginBottom: '.4rem' }}>
                RAWAQA
              </p>
              <h1 className="display-3" style={{ color: 'var(--ivory)' }}>{t('title')}</h1>
              {!loading && (
                <p style={{ fontSize: '.82rem', color: 'rgba(247,244,236,.4)', marginTop: '.4rem' }}>
                  {total} {t('results')}
                </p>
              )}
            </div>

            {/* Search + sort toolbar */}
            <div className="flex items-center gap-3 flex-wrap">
              {/* Search */}
              <div className="relative">
                <svg
                  className="absolute top-1/2 -translate-y-1/2"
                  style={{ [isAr ? 'right' : 'left']: '0.75rem', color: 'rgba(247,244,236,.35)' }}
                  width="16" height="16" viewBox="0 0 24 24" fill="none"
                >
                  <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="1.6" />
                  <path d="M21 21l-4.3-4.3" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
                </svg>
                <input
                  type="text"
                  placeholder={t('search_placeholder')}
                  defaultValue={search}
                  onChange={e => handleSearch(e.target.value)}
                  style={{
                    border: '1px solid rgba(210,181,106,.15)',
                    borderRadius: 999,
                    fontSize: '.82rem',
                    padding: '.5rem 1rem',
                    background: 'rgba(255,255,255,.05)',
                    color: 'var(--ivory)',
                    outline: 'none',
                    minWidth: 200,
                    [isAr ? 'paddingRight' : 'paddingLeft']: '2.2rem',
                    transition: 'border-color 250ms ease',
                  }}
                  onFocus={e => (e.currentTarget.style.borderColor = 'var(--gold)')}
                  onBlur={e => (e.currentTarget.style.borderColor = 'rgba(210,181,106,.15)')}
                />
              </div>

              {/* Sort */}
              <select
                value={sort}
                onChange={e => setSort(e.target.value)}
                style={{
                  border: '1px solid rgba(210,181,106,.15)',
                  borderRadius: 999,
                  fontSize: '.82rem',
                  padding: '.5rem 1rem',
                  background: 'rgba(255,255,255,.05)',
                  color: 'var(--ivory)',
                  outline: 'none',
                  cursor: 'pointer',
                }}
              >
                {sortOptions.map(o => (
                  <option key={o.value} value={o.value} style={{ background: '#1a1710', color: 'var(--ivory)' }}>{o.label}</option>
                ))}
              </select>

              {/* Filters toggle mobile */}
              <button
                onClick={() => setFiltersOpen(p => !p)}
                className="md:hidden btn btn-line-dark btn-sm"
              >
                {t('filters')}
              </button>

              {hasActiveFilters && (
                <button onClick={clearFilters} style={{ fontSize: '.8rem', color: 'rgba(247,244,236,.4)', textDecoration: 'underline', background: 'none', border: 'none', cursor: 'pointer' }}>
                  {t('clear_filters')}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Body */}
      <div className="wrap py-10">
        <div className="flex gap-8">
          {/* Sidebar Filters — desktop */}
          <aside
            className={`w-60 flex-shrink-0 ${filtersOpen ? 'block' : 'hidden'} md:block`}
          >
            <div className="sticky top-28 flex flex-col gap-6">
              {/* Categories */}
              <div>
                <p style={{ fontSize: '.62rem', letterSpacing: '.18em', textTransform: 'uppercase', color: 'rgba(247,244,236,.35)', marginBottom: '.875rem', fontWeight: 600 }}>
                  {isAr ? 'الفئات' : 'Categories'}
                </p>
                <ul className="flex flex-col gap-1">
                  <li>
                    <button
                      onClick={() => setCategory('')}
                      style={{
                        width: '100%', textAlign: isAr ? 'right' : 'left',
                        fontSize: '.85rem', padding: '.45rem .75rem', borderRadius: 10,
                        cursor: 'pointer', border: 'none',
                        background: !category ? 'rgba(210,181,106,.15)' : 'transparent',
                        color: !category ? 'var(--gold-light)' : 'rgba(247,244,236,.55)',
                        fontWeight: !category ? 700 : 400,
                        transition: 'all 250ms ease',
                      }}
                    >
                      {t('all')}
                    </button>
                  </li>
                  {categories.map(cat => (
                    <li key={cat.id}>
                      <button
                        onClick={() => setCategory(cat.slug)}
                        style={{
                          width: '100%', textAlign: isAr ? 'right' : 'left',
                          fontSize: '.85rem', padding: '.45rem .75rem', borderRadius: 10,
                          cursor: 'pointer', border: 'none',
                          background: category === cat.slug ? 'rgba(210,181,106,.15)' : 'transparent',
                          color: category === cat.slug ? 'var(--gold-light)' : 'rgba(247,244,236,.55)',
                          fontWeight: category === cat.slug ? 700 : 400,
                          transition: 'all 250ms ease',
                        }}
                      >
                        {loc(cat.nameAr, cat.nameEn, locale)}
                      </button>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Price range */}
              <div>
                <p style={{ fontSize: '.62rem', letterSpacing: '.18em', textTransform: 'uppercase', color: 'rgba(247,244,236,.35)', marginBottom: '.875rem', fontWeight: 600 }}>
                  {t('price_range')}
                </p>
                <div className="flex gap-2 items-center">
                  {[
                    { val: minPrice, setter: setMinPrice, ph: '0' },
                    { val: maxPrice, setter: setMaxPrice, ph: '∞' },
                  ].map((f, i) => (
                    <input
                      key={i}
                      type="number"
                      placeholder={f.ph}
                      value={f.val}
                      onChange={e => f.setter(e.target.value)}
                      style={{ width: '100%', border: '1px solid rgba(210,181,106,.15)', borderRadius: 8, fontSize: '.8rem', padding: '.4rem .6rem', background: 'rgba(255,255,255,.05)', color: 'var(--ivory)', outline: 'none' }}
                    />
                  ))}
                </div>
              </div>

              {/* In stock */}
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={inStock}
                  onChange={e => setInStock(e.target.checked)}
                  style={{ accentColor: 'var(--gold)' }}
                />
                <span style={{ fontSize: '.85rem', color: 'rgba(247,244,236,.6)' }}>{t('in_stock')}</span>
              </label>
            </div>
          </aside>

          {/* Product grid */}
          <div className="flex-1 min-w-0">
            {loading && products.length === 0 ? (
              <SkeletonGrid count={12} />
            ) : products.length === 0 ? (
              <div className="text-center py-20">
                <p style={{ color: 'rgba(247,244,236,.4)', fontSize: '1.1rem', marginBottom: '1.5rem' }}>{t('no_results')}</p>
                <button onClick={clearFilters} className="btn btn-gold btn-sm">
                  {t('clear_filters')}
                </button>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  {products.map(p => <ProductCard key={p.id} product={p} />)}
                </div>
                {/* Load more */}
                {hasMore && (
                  <div className="text-center mt-10">
                    <button
                      onClick={() => fetchProducts(page + 1, false)}
                      disabled={loading}
                      className="btn btn-line-dark"
                    >
                      {loading ? t('loading') : isAr ? 'تحميل المزيد' : 'Load More'}
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
