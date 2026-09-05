'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useParams, useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useCart } from '@/context/CartContext';
import { useToast } from '@/context/ToastContext';
import { loc, formatPrice } from '@/lib/utils';

const DARK   = '#0f0e0a';
const CARD   = 'rgba(30,27,21,.95)';
const BORDER = 'rgba(210,181,106,.1)';
const IVORY  = 'var(--ivory)';
const GOLD   = 'var(--gold-light)';
const FREE   = 3000;

export default function CartPage() {
  const t      = useTranslations('cart');
  const params = useParams();
  const router = useRouter();
  const locale = (params?.locale as string) || 'ar';
  const isAr   = locale === 'ar';

  const { cart, isLoading, updateItem, removeItem, fetchCart } = useCart();
  const { showToast } = useToast();
  const [removingId, setRemovingId] = useState<string | null>(null);

  useEffect(() => { fetchCart(); }, [fetchCart]);

  const sub      = cart?.subtotal ?? 0;
  const shipping = sub >= FREE ? 0 : sub > 0 ? 50 : 0;
  const total    = sub + shipping;
  const empty    = !cart || cart.items.length === 0;

  const handleUpdate = async (productId: string, qty: number) => {
    if (qty < 1) return;
    try { await updateItem(productId, qty); }
    catch { showToast(isAr ? 'حدث خطأ' : 'Error', 'error'); }
  };

  const handleRemove = async (productId: string) => {
    setRemovingId(productId);
    try { await removeItem(productId); }
    catch { showToast(isAr ? 'حدث خطأ' : 'Error', 'error'); }
    finally { setRemovingId(null); }
  };

  if (isLoading) {
    return (
      <div style={{ background: DARK, minHeight: '100vh', paddingTop: '8rem' }}>
        <div className="wrap">
          <div className="skeleton h-8 w-48 rounded mb-8" style={{ background: 'rgba(255,255,255,.06)' }} />
          {[1, 2].map(i => <div key={i} className="skeleton rounded-soft mb-4" style={{ height: 96, background: 'rgba(255,255,255,.04)' }} />)}
        </div>
      </div>
    );
  }

  return (
    <div style={{ background: DARK, minHeight: '100vh', color: IVORY }}>
      {/* Subtle glow */}
      <div aria-hidden style={{
        position: 'fixed', inset: 0, pointerEvents: 'none',
        background: 'radial-gradient(ellipse 50% 30% at 50% 10%, rgba(173,138,76,.07) 0%, transparent 70%)',
      }} />

      <div className="wrap" style={{ paddingTop: '7.5rem', paddingBottom: '5rem' }}>
        <h1 className="display-3" style={{ color: IVORY, marginBottom: '2.5rem' }}>{t('title')}</h1>

        {/* ── Empty state ── */}
        {empty ? (
          <div style={{ textAlign: 'center', padding: '5rem 0' }}>
            <div style={{
              width: 80, height: 80, borderRadius: '50%', margin: '0 auto 1.75rem',
              background: 'rgba(210,181,106,.08)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <svg width="36" height="36" viewBox="0 0 24 24" fill="none">
                <path d="M6 8h12l-1 12H7L6 8z" stroke={GOLD} strokeWidth="1.5" strokeLinejoin="round" />
                <path d="M9 8V6a3 3 0 016 0v2" stroke={GOLD} strokeWidth="1.5" />
              </svg>
            </div>
            <p style={{ fontSize: '1.2rem', fontWeight: 700, color: IVORY, marginBottom: '.5rem' }}>{t('empty')}</p>
            <p style={{ color: 'rgba(247,244,236,.45)', marginBottom: '2.25rem' }}>{t('empty_sub')}</p>
            <Link href={`/${locale}/shop`} className="btn btn-gold">{t('shop_now')}</Link>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr min(340px, 100%)', gap: '2.5rem', alignItems: 'start' }}
            className="max-md:grid-cols-1">

            {/* ── Cart items ── */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {cart!.items.map(item => {
                const name = loc(item.product.nameAr, item.product.nameEn, locale);
                return (
                  <div
                    key={item.product.id}
                    style={{
                      display: 'flex', gap: '1rem', padding: '1.25rem',
                      background: CARD, borderRadius: 18, border: `1px solid ${BORDER}`,
                      transition: 'border-color 300ms ease',
                    }}
                    onMouseEnter={e => (e.currentTarget.style.borderColor = 'rgba(210,181,106,.22)')}
                    onMouseLeave={e => (e.currentTarget.style.borderColor = BORDER)}
                  >
                    {/* Thumbnail */}
                    <div style={{
                      position: 'relative', width: 80, height: 80,
                      borderRadius: 12, overflow: 'hidden', flexShrink: 0,
                      background: 'rgba(255,255,255,.04)',
                      border: `1px solid ${BORDER}`,
                    }}>
                      {item.product.images?.[0] ? (
                        <Image src={item.product.images[0]} alt={name} fill style={{ objectFit: 'cover' }} sizes="80px" />
                      ) : (
                        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <svg width="38" height="38" viewBox="0 0 400 400" fill="var(--gold-light)" opacity=".45">
                            <path d="M80 300 C30 220 60 110 165 75 C270 40 360 120 350 220 C342 300 270 355 190 355 C130 355 115 345 80 300Z" />
                          </svg>
                        </div>
                      )}
                    </div>

                    {/* Info */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <Link
                        href={`/${locale}/product/${item.product.id}`}
                        style={{ fontWeight: 600, fontSize: '.95rem', color: IVORY, display: 'block', marginBottom: '.25rem', transition: 'color 250ms ease' }}
                        onMouseEnter={e => (e.currentTarget.style.color = GOLD)}
                        onMouseLeave={e => (e.currentTarget.style.color = IVORY)}
                      >
                        {name}
                      </Link>
                      <p style={{ fontSize: '.72rem', color: 'rgba(247,244,236,.35)', marginBottom: '.5rem', letterSpacing: '.04em' }}>
                        SKU: {item.product.sku}
                      </p>
                      <p style={{ fontWeight: 800, color: GOLD, fontSize: '.95rem' }}>
                        {formatPrice(item.price, locale)}
                      </p>
                    </div>

                    {/* Qty + remove */}
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', justifyContent: 'space-between', gap: '.5rem' }}>
                      {/* Quantity controls */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '.5rem' }}>
                        {[
                          { icon: '−', onClick: () => handleUpdate(item.product.id, item.quantity - 1), disabled: item.quantity <= 1 },
                          { icon: '+', onClick: () => handleUpdate(item.product.id, item.quantity + 1), disabled: false },
                        ].reduce<React.ReactNode[]>((acc, btn, i) => {
                          if (i === 0) acc.push(
                            <button key="m" onClick={btn.onClick} disabled={btn.disabled}
                              style={{ width: 28, height: 28, borderRadius: '50%', border: `1px solid ${BORDER}`, background: 'none', color: IVORY, fontSize: '1rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: btn.disabled ? .3 : 1, transition: 'border-color 250ms ease' }}
                              onMouseEnter={e => !btn.disabled && (e.currentTarget.style.borderColor = GOLD)}
                              onMouseLeave={e => (e.currentTarget.style.borderColor = BORDER)}>
                              {btn.icon}
                            </button>
                          );
                          if (i === 0) acc.push(
                            <span key="q" style={{ minWidth: 24, textAlign: 'center', fontWeight: 700, fontSize: '.9rem', color: IVORY }}>
                              {item.quantity}
                            </span>
                          );
                          if (i === 1) acc.push(
                            <button key="p" onClick={btn.onClick}
                              style={{ width: 28, height: 28, borderRadius: '50%', border: `1px solid ${BORDER}`, background: 'none', color: IVORY, fontSize: '1rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'border-color 250ms ease' }}
                              onMouseEnter={e => (e.currentTarget.style.borderColor = GOLD)}
                              onMouseLeave={e => (e.currentTarget.style.borderColor = BORDER)}>
                              {btn.icon}
                            </button>
                          );
                          return acc;
                        }, [])}
                      </div>

                      {/* Line total */}
                      <p style={{ fontWeight: 700, color: IVORY, fontSize: '.9rem' }}>
                        {formatPrice(item.total, locale)}
                      </p>

                      {/* Remove */}
                      <button
                        onClick={() => handleRemove(item.product.id)}
                        disabled={removingId === item.product.id}
                        style={{ fontSize: '.72rem', color: 'rgba(247,244,236,.3)', background: 'none', border: 'none', cursor: 'pointer', transition: 'color 250ms ease', opacity: removingId === item.product.id ? .5 : 1 }}
                        onMouseEnter={e => (e.currentTarget.style.color = '#f87171')}
                        onMouseLeave={e => (e.currentTarget.style.color = 'rgba(247,244,236,.3)')}
                      >
                        {t('remove')}
                      </button>
                    </div>
                  </div>
                );
              })}

              <Link
                href={`/${locale}/shop`}
                style={{ fontSize: '.82rem', color: 'rgba(247,244,236,.38)', marginTop: '.5rem', display: 'inline-flex', alignItems: 'center', gap: '.35rem', transition: 'color 250ms ease' }}
                onMouseEnter={e => (e.currentTarget.style.color = GOLD)}
                onMouseLeave={e => (e.currentTarget.style.color = 'rgba(247,244,236,.38)')}
              >
                {isAr ? '→' : '←'} {t('continue_shopping')}
              </Link>
            </div>

            {/* ── Order summary ── */}
            <div style={{ position: 'sticky', top: '6.5rem' }}>
              <div style={{ background: CARD, borderRadius: 20, padding: '1.75rem', border: `1px solid ${BORDER}` }}>
                <h2 style={{ fontWeight: 700, color: IVORY, fontSize: '1.05rem', marginBottom: '1.75rem' }}>
                  {isAr ? 'ملخص الطلب' : 'Order Summary'}
                </h2>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '1.5rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '.875rem' }}>
                    <span style={{ color: 'rgba(247,244,236,.5)' }}>{t('subtotal')}</span>
                    <span style={{ fontWeight: 600, color: IVORY }}>{formatPrice(sub, locale)}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '.875rem' }}>
                    <span style={{ color: 'rgba(247,244,236,.5)' }}>{t('shipping')}</span>
                    <span style={{ fontWeight: 600, color: shipping === 0 ? '#4ade80' : IVORY }}>
                      {shipping === 0 ? t('free_shipping') : formatPrice(shipping, locale)}
                    </span>
                  </div>

                  {sub > 0 && sub < FREE && (
                    <div style={{
                      background: 'rgba(210,181,106,.08)', borderRadius: 10,
                      padding: '.65rem .9rem', border: `1px solid rgba(210,181,106,.15)`,
                    }}>
                      <p style={{ fontSize: '.72rem', color: GOLD, lineHeight: 1.5 }}>
                        {t('shipping_note')}
                      </p>
                      {/* Progress bar */}
                      <div style={{ height: 3, borderRadius: 999, background: 'rgba(210,181,106,.15)', marginTop: '.5rem', overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: `${Math.min(100, (sub / FREE) * 100)}%`, background: GOLD, borderRadius: 999, transition: 'width 500ms ease' }} />
                      </div>
                    </div>
                  )}

                  <div style={{ height: 1, background: BORDER }} />
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontWeight: 700, color: IVORY }}>{t('total')}</span>
                    <span style={{ fontWeight: 800, fontSize: '1.3rem', color: GOLD }}>{formatPrice(total, locale)}</span>
                  </div>
                </div>

                <button onClick={() => router.push(`/${locale}/checkout`)} className="btn btn-gold btn-block">
                  {t('checkout')}
                </button>

                {/* Payment badge */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '.4rem', marginTop: '1rem' }}>
                  <span style={{ fontSize: '.65rem', color: 'rgba(247,244,236,.25)', letterSpacing: '.05em' }}>
                    🔒 {isAr ? 'الدفع عند الاستلام' : 'Cash on Delivery'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
