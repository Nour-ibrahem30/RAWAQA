'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { wishlistApi } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { useCart } from '@/context/CartContext';
import { useToast } from '@/context/ToastContext';
import { loc, formatPrice } from '@/lib/utils';
import type { Product } from '@/lib/types';
import Image from 'next/image';

const DARK   = '#0f0e0a';
const CARD   = 'rgba(30,27,21,.9)';
const BORDER = 'rgba(210,181,106,.1)';
const IVORY  = 'var(--ivory)';
const GOLD   = 'var(--gold-light)';

export default function WishlistPage() {
  const params = useParams();
  const router = useRouter();
  const locale = (params?.locale as string) || 'ar';
  const isAr = locale === 'ar';
  const { isLoggedIn, isLoading } = useAuth();
  const { addToCart } = useCart();
  const { showToast } = useToast();

  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [removing, setRemoving] = useState<string | null>(null);
  const [adding, setAdding] = useState<string | null>(null);

  useEffect(() => {
    if (!isLoading && !isLoggedIn) router.push(`/${locale}/login`);
  }, [isLoading, isLoggedIn, locale, router]);

  useEffect(() => {
    if (!isLoggedIn) return;
    wishlistApi.get()
      .then(r => setProducts((r.data as any)?.products ?? []))
      .catch(() => setProducts([]))
      .finally(() => setLoading(false));
  }, [isLoggedIn]);

  const handleRemove = async (productId: string) => {
    setRemoving(productId);
    try {
      await wishlistApi.remove(productId);
      setProducts(prev => prev.filter(p => p.id !== productId));
      showToast(isAr ? 'تمت الإزالة من المفضلة' : 'Removed from wishlist', 'success');
    } catch {
      showToast(isAr ? 'حدث خطأ' : 'Error', 'error');
    } finally {
      setRemoving(null);
    }
  };

  const handleAddToCart = async (productId: string) => {
    setAdding(productId);
    try {
      await addToCart(productId, 1);
      showToast(isAr ? 'تمت الإضافة إلى السلة' : 'Added to cart', 'success');
    } catch (err: unknown) {
      showToast((err as Error).message || (isAr ? 'حدث خطأ' : 'Error'), 'error');
    } finally {
      setAdding(null);
    }
  };

  if (isLoading || (!isLoggedIn && !isLoading)) return null;

  return (
    <div style={{ background: DARK, minHeight: '100vh', color: IVORY }}>
      <div className="wrap" style={{ paddingTop: '7rem', paddingBottom: '5rem' }}>

        {/* Header */}
        <div style={{ marginBottom: '2.5rem' }}>
          <p style={{ fontSize: '.62rem', letterSpacing: '.18em', textTransform: 'uppercase', color: GOLD, marginBottom: '.5rem' }}>
            {isAr ? 'قائمتك' : 'Your List'}
          </p>
          <h1 className="display-3" style={{ color: IVORY }}>
            {isAr ? 'المفضلة' : 'Wishlist'}
          </h1>
        </div>

        {loading ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(240px,1fr))', gap: '1.5rem' }}>
            {[1,2,3,4].map(i => (
              <div key={i} style={{ background: CARD, borderRadius: 20, overflow: 'hidden', border: `1px solid ${BORDER}` }}>
                <div className="skeleton" style={{ aspectRatio: '4/5', background: 'rgba(255,255,255,.04)' }} />
                <div style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '.75rem' }}>
                  <div className="skeleton" style={{ height: 14, width: '70%', borderRadius: 6, background: 'rgba(255,255,255,.04)' }} />
                  <div className="skeleton" style={{ height: 12, width: '40%', borderRadius: 6, background: 'rgba(255,255,255,.04)' }} />
                </div>
              </div>
            ))}
          </div>
        ) : products.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '5rem 0' }}>
            <div style={{ width: 80, height: 80, borderRadius: '50%', margin: '0 auto 1.5rem', background: 'rgba(210,181,106,.08)', border: `1px solid ${BORDER}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke={GOLD} strokeWidth="1.4">
                <path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"/>
              </svg>
            </div>
            <p style={{ fontSize: '1.1rem', fontWeight: 600, color: 'rgba(247,244,236,.65)', marginBottom: '.5rem' }}>
              {isAr ? 'قائمة المفضلة فارغة' : 'Your wishlist is empty'}
            </p>
            <p style={{ fontSize: '.875rem', color: 'rgba(247,244,236,.3)', marginBottom: '2rem' }}>
              {isAr ? 'أضف المنتجات التي تعجبك هنا' : 'Save products you love here'}
            </p>
            <Link href={`/${locale}/shop`} className="btn btn-gold btn-sm">
              {isAr ? 'تصفح المتجر' : 'Browse Shop'}
            </Link>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(240px,1fr))', gap: '1.5rem' }}>
            {products.map(product => {
              const name     = loc(product.nameAr, product.nameEn, locale);
              const image    = product.images?.[0];
              const available = product.inventory.availableQuantity > 0;

              return (
                <div key={product.id} style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 20, overflow: 'hidden', display: 'flex', flexDirection: 'column', transition: 'border-color 300ms ease' }}
                  onMouseEnter={e => (e.currentTarget.style.borderColor = 'rgba(210,181,106,.3)')}
                  onMouseLeave={e => (e.currentTarget.style.borderColor = BORDER)}>

                  {/* Image */}
                  <Link href={`/${locale}/product/${product.id}`} style={{ position: 'relative', aspectRatio: '4/5', display: 'block', background: 'rgba(232,224,210,.08)', overflow: 'hidden' }}>
                    {image ? (
                      <Image src={image} alt={name} fill style={{ objectFit: 'cover', transition: 'transform 400ms ease' }}
                        sizes="(max-width:640px) 100vw, 300px" />
                    ) : (
                      <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <svg width="50%" height="50%" viewBox="0 0 400 400" fill={GOLD} style={{ filter: `drop-shadow(0 10px 20px ${GOLD}44)` }}>
                          <path d="M80 300 C30 220 60 110 165 75 C270 40 360 120 350 220 C342 300 270 355 190 355 C130 355 115 345 80 300Z"/>
                        </svg>
                      </div>
                    )}
                    {!available && (
                      <div style={{ position: 'absolute', inset: 0, background: 'rgba(21,19,15,.55)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <span style={{ color: 'rgba(247,244,236,.8)', fontSize: '.78rem', fontWeight: 600 }}>{isAr ? 'نفذ' : 'Out of Stock'}</span>
                      </div>
                    )}
                  </Link>

                  {/* Info */}
                  <div style={{ padding: '1rem 1.25rem 1.25rem', display: 'flex', flexDirection: 'column', gap: '.5rem', flexGrow: 1 }}>
                    <p style={{ fontSize: '.62rem', letterSpacing: '.14em', textTransform: 'uppercase', color: GOLD }}>
                      {loc(product.category?.nameAr, product.category?.nameEn, locale)}
                    </p>
                    <Link href={`/${locale}/product/${product.id}`} style={{ fontWeight: 700, fontSize: '.95rem', color: IVORY, textDecoration: 'none', lineHeight: 1.3, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                      {name}
                    </Link>
                    <p style={{ fontWeight: 800, fontSize: '1rem', color: GOLD, marginTop: 'auto', paddingTop: '.5rem' }}>
                      {formatPrice(product.price, locale)}
                    </p>

                    {/* Actions */}
                    <div style={{ display: 'flex', gap: '.6rem', marginTop: '.5rem' }}>
                      <button onClick={() => handleAddToCart(product.id)} disabled={!available || adding === product.id}
                        className="btn btn-gold btn-sm" style={{ flex: 1, fontSize: '.78rem' }}>
                        {adding === product.id ? '...' : (isAr ? 'أضف للسلة' : 'Add to Cart')}
                      </button>
                      <button onClick={() => handleRemove(product.id)} disabled={removing === product.id}
                        style={{ width: 36, height: 36, borderRadius: 10, border: `1px solid ${BORDER}`, background: 'none', color: 'rgba(248,113,113,.7)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 250ms ease', flexShrink: 0 }}
                        onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(248,113,113,.4)'; e.currentTarget.style.background = 'rgba(248,113,113,.08)'; }}
                        onMouseLeave={e => { e.currentTarget.style.borderColor = BORDER; e.currentTarget.style.background = 'none'; }}
                        title={isAr ? 'إزالة من المفضلة' : 'Remove from wishlist'}>
                        {removing === product.id ? (
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ animation: 'rotateSlow .8s linear infinite' }}><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/></svg>
                        ) : (
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a1 1 0 011-1h4a1 1 0 011 1v2"/></svg>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
