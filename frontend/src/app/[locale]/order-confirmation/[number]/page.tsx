'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { ordersApi } from '@/lib/api';
import { formatPrice, loc } from '@/lib/utils';
import type { Order } from '@/lib/types';

export default function ConfirmationPage() {
  const t = useTranslations('confirmation');
  const params = useParams();
  const locale = (params?.locale as string) || 'ar';
  const orderNumber = params?.number as string;
  const isAr = locale === 'ar';

  const [order, setOrder] = useState<Order | null>(null);

  useEffect(() => {
    ordersApi.getByNumber(orderNumber, locale)
      .then(r => setOrder(r.data))
      .catch(() => {});
  }, [orderNumber, locale]);

  return (
    <div style={{ background: '#0f0e0a', minHeight: '100vh', color: 'var(--ivory)' }}>
      <div className="wrap pt-32 pb-20">
        <div className="max-w-xl mx-auto text-center">
          {/* Success icon */}
          <div style={{ width:72,height:72,borderRadius:'50%',margin:'0 auto 1.5rem',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'1.5rem',background:'rgba(74,222,128,.12)',border:'1px solid rgba(74,222,128,.3)',color:'#4ade80' }}>
            ✓
          </div>

          <h1 className="display-3" style={{ color:'var(--ivory)', marginBottom:'.75rem' }}>{t('title')}</h1>
          <p style={{ color:'rgba(247,244,236,.55)', marginBottom:'.5rem' }}>{t('sub')}</p>
          <p style={{ fontSize:'.8rem',color:'rgba(247,244,236,.3)', marginBottom:'2rem' }}>{t('sms_note')}</p>

          {/* Order number */}
          <div style={{ display:'inline-block',padding:'1.25rem 2rem',borderRadius:20,border:'1px solid rgba(210,181,106,.2)',background:'rgba(30,27,21,.9)',marginBottom:'2rem' }}>
            <p style={{ fontSize:'.65rem',letterSpacing:'.18em',textTransform:'uppercase',color:'rgba(247,244,236,.35)',marginBottom:'.5rem' }}>{t('order_number')}</p>
            <p style={{ fontFamily:'monospace',fontSize:'1.8rem',fontWeight:800,color:'var(--gold-light)',letterSpacing:'.1em' }}>{orderNumber}</p>
          </div>

          {/* Order items if loaded */}
          {order && (
            <div style={{ textAlign:'start',borderRadius:20,border:'1px solid rgba(210,181,106,.1)',padding:'1.5rem',marginBottom:'2rem',background:'rgba(30,27,21,.7)' }}>
              <p style={{ fontSize:'.65rem',letterSpacing:'.18em',textTransform:'uppercase',color:'rgba(247,244,236,.35)',marginBottom:'1rem' }}>
                {isAr ? 'المنتجات' : 'Items'}
              </p>
              {order.items.map((item, i) => (
                <div key={i} style={{ display:'flex',justifyContent:'space-between',fontSize:'.875rem',padding:'.6rem 0',borderBottom: i<order.items.length-1?'1px solid rgba(210,181,106,.08)':'none' }}>
                  <span style={{ color:'rgba(247,244,236,.7)' }}>{loc(item.product.nameAr, item.product.nameEn, locale)} × {item.quantity}</span>
                  <span style={{ fontWeight:600,color:'var(--gold-light)' }}>{formatPrice(item.total, locale)}</span>
                </div>
              ))}
              <div style={{ display:'flex',justifyContent:'space-between',paddingTop:'.875rem',fontWeight:800,color:'var(--ivory)' }}>
                <span>{isAr?'الإجمالي':'Total'}</span>
                <span>{formatPrice(order.total, locale)}</span>
              </div>
            </div>
          )}

          {/* CTAs */}
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link href={`/${locale}/track`} className="btn btn-gold">{t('track')}</Link>
            <Link href={`/${locale}/shop`} className="btn btn-line-dark">{t('continue')}</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
