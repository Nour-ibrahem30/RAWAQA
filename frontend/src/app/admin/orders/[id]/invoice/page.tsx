'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ordersApi } from '@/lib/api';
import type { Order } from '@/lib/types';
import OrderInvoiceModal from '@/components/admin/OrderInvoiceModal';

export default function OrderInvoicePage() {
  const params = useParams();
  const router = useRouter();
  const id = (params?.id as string) || '';
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    ordersApi.get(id, 'ar')
      .then(r => {
        if (r && r.data) {
          setOrder(r.data);
        } else {
          setError('Order not found');
        }
      })
      .catch((e: unknown) => {
        setError((e as Error)?.message || 'Failed to load order');
      })
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <p style={{ color: 'rgba(247,244,236,.6)', fontSize: '.9rem' }}>
          جاري تجهيز الفاتورة وبوليصة الشحن...
        </p>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="p-8 text-center" style={{ color: '#F7F4EC' }}>
        <p className="mb-4">{error || 'الطلب غير موجود'}</p>
        <button
          onClick={() => router.back()}
          className="btn btn-gold btn-sm"
        >
          ← العودة للطلبات
        </button>
      </div>
    );
  }

  return (
    <OrderInvoiceModal
      order={order}
      onClose={() => router.push(`/admin/orders/${id}`)}
      defaultLang="ar"
    />
  );
}
