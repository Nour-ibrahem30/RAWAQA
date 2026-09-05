'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { ordersApi } from '@/lib/api';
import { formatPrice, loc, orderStatusColor, orderStatusLabel } from '@/lib/utils';
import type { Order } from '@/lib/types';

export default function OrderDetailPage() {
  const params = useParams();
  const locale = (params?.locale as string) || 'ar';
  const id = params?.id as string;
  const isAr = locale === 'ar';

  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    ordersApi.get(id, locale).then(r => setOrder(r.data)).catch(() => {}).finally(() => setLoading(false));
  }, [id, locale]);

  if (loading) return (
    <div className="wrap pt-32 pb-20">
      <div className="skeleton h-8 w-64 rounded mb-6" />
      <div className="skeleton h-64 rounded-soft" />
    </div>
  );

  if (!order) return (
    <div className="wrap pt-32 pb-20 text-center">
      <p className="text-ink-soft">{isAr ? 'الطلب غير موجود' : 'Order not found'}</p>
      <Link href={`/${locale}/account`} className="btn btn-gold mt-4">{isAr ? 'حسابي' : 'My Account'}</Link>
    </div>
  );

  return (
    <div style={{ background: 'var(--ivory)', minHeight: '100vh' }}>
      <div className="wrap pt-28 pb-20">
        <Link href={`/${locale}/account`} className="text-sm text-ink-soft hover:text-ink flex items-center gap-1 mb-8">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className={isAr ? '' : 'rotate-180'}>
            <path d="M15 18l-6-6 6-6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
          </svg>
          {isAr ? 'رجوع لطلباتي' : 'Back to Orders'}
        </Link>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="font-mono text-2xl font-bold text-ink">{order.orderNumber}</h1>
            <p className="text-sm text-ink-soft mt-1">
              {new Date(order.createdAt).toLocaleDateString(isAr ? 'ar-EG' : 'en-EG', { year: 'numeric', month: 'long', day: 'numeric' })}
            </p>
          </div>
          <span className={`text-sm font-semibold px-4 py-2 rounded-pill self-start ${orderStatusColor(order.status)}`}>
            {orderStatusLabel(order.status, locale)}
          </span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Items */}
          <div className="lg:col-span-2 rounded-soft border p-6 bg-ivory-2" style={{ borderColor: 'var(--sand)' }}>
            <h2 className="font-semibold text-ink mb-4">{isAr ? 'المنتجات' : 'Items'}</h2>
            <div className="flex flex-col gap-3">
              {order.items.map((item, i) => (
                <div key={i} className="flex justify-between py-3 border-b last:border-0" style={{ borderColor: 'var(--sand)' }}>
                  <div>
                    <p className="text-sm font-medium text-ink">
                      {loc(item.product.nameAr, item.product.nameEn, locale)}
                    </p>
                    <p className="text-xs text-ink-soft">SKU: {item.product.sku} × {item.quantity}</p>
                  </div>
                  <p className="font-semibold text-ink text-sm">{formatPrice(item.total, locale)}</p>
                </div>
              ))}
            </div>
            <div className="mt-4 pt-4 border-t flex justify-between font-bold text-ink" style={{ borderColor: 'var(--sand)' }}>
              <span>{isAr ? 'الإجمالي' : 'Total'}</span>
              <span>{formatPrice(order.total, locale)}</span>
            </div>
          </div>

          {/* Shipping */}
          <div className="rounded-soft border p-6 bg-ivory-2 self-start" style={{ borderColor: 'var(--sand)' }}>
            <h2 className="font-semibold text-ink mb-4">{isAr ? 'التوصيل إلى' : 'Shipping To'}</h2>
            <p className="text-sm text-ink font-medium">{order.shippingAddress.recipientName}</p>
            <p className="text-sm text-ink-soft mt-1">{order.shippingAddress.phone}</p>
            <p className="text-sm text-ink-soft">{order.shippingAddress.streetAddress}</p>
            <p className="text-sm text-ink-soft">{order.shippingAddress.city}، {order.shippingAddress.governorate}</p>
            {order.shippingAddress.notes && (
              <p className="text-xs text-ink-soft mt-2 bg-sand/50 rounded-lg p-2">
                {order.shippingAddress.notes}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
