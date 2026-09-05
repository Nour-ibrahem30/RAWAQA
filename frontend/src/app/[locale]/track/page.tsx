'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { ordersApi } from '@/lib/api';
import { formatPrice, loc, orderStatusColor, orderStatusLabel } from '@/lib/utils';
import type { Order } from '@/lib/types';

const STATUS_ORDER: Order['status'][] = ['pending', 'confirmed', 'preparing', 'shipped', 'delivered'];

const DARK   = '#0f0e0a';
const CARD   = 'rgba(30,27,21,.9)';
const BORDER = 'rgba(210,181,106,.1)';
const IVORY  = 'var(--ivory)';
const GOLD   = 'var(--gold-light)';

export default function TrackPage() {
  const t      = useTranslations('track');
  const params = useParams();
  const locale = (params?.locale as string) || 'ar';
  const isAr   = locale === 'ar';

  const [input, setInput]   = useState('');
  const [loading, setLoading] = useState(false);
  const [order, setOrder]   = useState<Order | null>(null);
  const [notFound, setNotFound] = useState(false);

  const handleTrack = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;
    setLoading(true);
    setOrder(null);
    setNotFound(false);
    try {
      const res = await ordersApi.getByNumber(input.trim(), locale);
      setOrder(res.data);
    } catch {
      setNotFound(true);
    } finally {
      setLoading(false);
    }
  };

  const currentIndex = order ? STATUS_ORDER.indexOf(order.status as Order['status']) : -1;

  return (
    <div style={{ background: DARK, minHeight: '100vh', color: IVORY }}>
      {/* Background glow */}
      <div aria-hidden style={{
        position: 'fixed', inset: 0, pointerEvents: 'none',
        background: 'radial-gradient(ellipse 50% 40% at 50% 20%, rgba(173,138,76,.08) 0%, transparent 70%)',
      }} />

      <div className="wrap" style={{ paddingTop: '8rem', paddingBottom: '5rem' }}>
        <div style={{ maxWidth: 680, margin: '0 auto' }}>

          {/* Header */}
          <div style={{ textAlign: 'center', marginBottom: '3.5rem' }}>
            <p style={{ fontSize: '.68rem', letterSpacing: '.2em', textTransform: 'uppercase', color: GOLD, marginBottom: '.75rem' }}>
              {isAr ? 'تتبع طلبك' : 'Order Tracking'}
            </p>
            <h1 className="display-2" style={{ color: IVORY, marginBottom: '.75rem' }}>{t('title')}</h1>
            <p style={{ fontSize: '1rem', color: 'rgba(247,244,236,.5)' }}>{t('sub')}</p>
          </div>

          {/* Search form */}
          <form onSubmit={handleTrack} style={{ display: 'flex', gap: '.75rem', marginBottom: '3rem' }}>
            <input
              type="text"
              value={input}
              onChange={e => setInput(e.target.value)}
              placeholder={t('placeholder')}
              dir="ltr"
              style={{
                flex: 1,
                background: CARD,
                border: `1px solid ${BORDER}`,
                borderRadius: 999,
                padding: '.85rem 1.5rem',
                fontSize: '.9rem',
                color: IVORY,
                outline: 'none',
                transition: 'border-color 250ms ease',
              }}
              onFocus={e => (e.currentTarget.style.borderColor = GOLD)}
              onBlur={e => (e.currentTarget.style.borderColor = BORDER)}
            />
            <button type="submit" disabled={loading} className="btn btn-gold" style={{ whiteSpace: 'nowrap' }}>
              {loading ? t('tracking') : t('submit')}
            </button>
          </form>

          {/* Not found */}
          {notFound && (
            <div style={{
              textAlign: 'center', padding: '3rem',
              background: CARD, borderRadius: 20, border: `1px solid ${BORDER}`,
            }}>
              <div style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>🔍</div>
              <p style={{ fontSize: '1.1rem', fontWeight: 700, color: IVORY, marginBottom: '.5rem' }}>
                {t('not_found')}
              </p>
              <p style={{ fontSize: '.875rem', color: 'rgba(247,244,236,.45)' }}>
                {t('not_found_sub')}
              </p>
            </div>
          )}

          {/* Order found */}
          {order && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

              {/* Meta cards */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: '1rem' }}>
                {[
                  { label: t('order_number'), value: order.orderNumber, mono: true },
                  { label: t('status'), value: (
                    <span className={`text-xs font-semibold px-2.5 py-1 rounded-pill ${orderStatusColor(order.status)}`}>
                      {orderStatusLabel(order.status, locale)}
                    </span>
                  )},
                  { label: t('date'), value: new Date(order.createdAt).toLocaleDateString(isAr ? 'ar-EG' : 'en-EG') },
                  { label: t('total'), value: formatPrice(order.total, locale) },
                ].map((m, i) => (
                  <div key={i} style={{ background: CARD, borderRadius: 16, padding: '1rem 1.25rem', border: `1px solid ${BORDER}` }}>
                    <p style={{ fontSize: '.6rem', letterSpacing: '.14em', textTransform: 'uppercase', color: 'rgba(247,244,236,.35)', marginBottom: '.5rem' }}>
                      {m.label}
                    </p>
                    <p style={{
                      fontWeight: 700, color: IVORY, fontSize: '.88rem',
                      fontFamily: m.mono ? 'monospace' : 'inherit',
                      letterSpacing: m.mono ? '.06em' : 'inherit',
                    }}>
                      {m.value}
                    </p>
                  </div>
                ))}
              </div>

              {/* Timeline */}
              {order.status !== 'cancelled' && (
                <div style={{ background: CARD, borderRadius: 20, padding: '1.75rem', border: `1px solid ${BORDER}` }}>
                  <h2 style={{ fontWeight: 700, color: IVORY, marginBottom: '1.75rem', fontSize: '1rem' }}>
                    {isAr ? 'مراحل الطلب' : 'Order Progress'}
                  </h2>
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    {STATUS_ORDER.map((s, i) => {
                      const done    = i < currentIndex;
                      const current = i === currentIndex;
                      const pending = i > currentIndex;
                      return (
                        <div key={s} style={{ display: 'flex', gap: '1rem' }}>
                          {/* Node + line */}
                          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                            <div style={{
                              width: 34, height: 34, borderRadius: '50%',
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              fontWeight: 800, fontSize: '.82rem', flexShrink: 0,
                              background: done
                                ? 'rgba(74,222,128,.15)'
                                : current
                                ? 'rgba(210,181,106,.2)'
                                : 'rgba(255,255,255,.04)',
                              color: done ? '#4ade80' : current ? GOLD : 'rgba(247,244,236,.3)',
                              border: `1.5px solid ${done ? 'rgba(74,222,128,.4)' : current ? 'rgba(210,181,106,.5)' : BORDER}`,
                              boxShadow: current ? `0 0 16px rgba(210,181,106,.25)` : 'none',
                              transition: 'all 400ms ease',
                            }}>
                              {done ? '✓' : i + 1}
                            </div>
                            {i < STATUS_ORDER.length - 1 && (
                              <div style={{
                                width: 1.5, flex: 1, minHeight: 32,
                                background: done ? 'rgba(74,222,128,.3)' : BORDER,
                                margin: '.25rem 0',
                                transition: 'background 400ms ease',
                              }} />
                            )}
                          </div>

                          {/* Label */}
                          <div style={{ paddingBottom: i < STATUS_ORDER.length - 1 ? '1.5rem' : 0, paddingTop: '.4rem' }}>
                            <p style={{
                              fontSize: '.9rem', fontWeight: current ? 700 : 500,
                              color: pending ? 'rgba(247,244,236,.3)' : IVORY,
                              transition: 'color 400ms ease',
                            }}>
                              {orderStatusLabel(s, locale)}
                            </p>
                            {current && (
                              <p style={{ fontSize: '.72rem', color: GOLD, marginTop: '.2rem' }}>
                                {isAr ? '← الحالة الحالية' : 'Current status →'}
                              </p>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Items */}
              <div style={{ background: CARD, borderRadius: 20, padding: '1.75rem', border: `1px solid ${BORDER}` }}>
                <h2 style={{ fontWeight: 700, color: IVORY, marginBottom: '1.25rem', fontSize: '1rem' }}>
                  {t('items')}
                </h2>
                {order.items.map((item, i) => (
                  <div key={i} style={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    padding: '.75rem 0',
                    borderBottom: i < order.items.length - 1 ? `1px solid ${BORDER}` : 'none',
                    fontSize: '.875rem',
                  }}>
                    <span style={{ color: 'rgba(247,244,236,.75)' }}>
                      {loc(item.product.nameAr, item.product.nameEn, locale)} × {item.quantity}
                    </span>
                    <span style={{ fontWeight: 700, color: GOLD }}>
                      {formatPrice(item.total, locale)}
                    </span>
                  </div>
                ))}
              </div>

              {/* Shipping */}
              <div style={{ background: CARD, borderRadius: 20, padding: '1.75rem', border: `1px solid ${BORDER}` }}>
                <h2 style={{ fontWeight: 700, color: IVORY, marginBottom: '1.25rem', fontSize: '1rem' }}>
                  {t('shipping_to')}
                </h2>
                <p style={{ fontSize: '.875rem', fontWeight: 600, color: IVORY, marginBottom: '.25rem' }}>
                  {order.shippingAddress.recipientName}
                </p>
                <p style={{ fontSize: '.875rem', color: 'rgba(247,244,236,.5)' }}>
                  {order.shippingAddress.streetAddress}
                </p>
                <p style={{ fontSize: '.875rem', color: 'rgba(247,244,236,.5)' }}>
                  {order.shippingAddress.city}{isAr ? '، ' : ', '}{order.shippingAddress.governorate}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
