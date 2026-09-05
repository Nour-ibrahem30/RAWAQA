'use client';

import { use, useEffect, useState } from 'react';
import Link from 'next/link';
import { ordersApi } from '@/lib/api';
import { useToast } from '@/context/ToastContext';
import { formatPrice, loc, orderStatusColor, orderStatusLabel } from '@/lib/utils';
import type { Order } from '@/lib/types';

const STATUS_TRANSITIONS: Record<string, string[]> = {
  pending: ['confirmed', 'cancelled'],
  confirmed: ['preparing', 'cancelled'],
  preparing: ['shipped'],
  shipped: ['delivered'],
  delivered: [],
  cancelled: [],
};

export default function AdminOrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [note, setNote] = useState('');
  const { showToast } = useToast();

  const load = () => {
    setLoading(true);
    ordersApi.get(id, 'en').then(r => setOrder(r.data)).catch(() => {}).finally(() => setLoading(false));
  };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { load(); }, [id]);

  const handleStatusUpdate = async (newStatus: string) => {
    if (!order) return;
    setUpdating(true);
    try {
      await ordersApi.updateStatus(order.id, newStatus, note || undefined);
      showToast(`Status updated to ${newStatus}`, 'success');
      setNote('');
      load();
    } catch (e: unknown) { showToast((e as Error).message, 'error'); }
    finally { setUpdating(false); }
  };

  const CARD = { background: '#15130F', border: '1px solid rgba(210,181,106,.1)', borderRadius: 16, padding: 24 };

  if (loading || !order) return (
    <div className="flex flex-col gap-4">
      <div className="h-8 w-48 rounded-xl skeleton" style={{ background: 'rgba(255,255,255,.06)' }} />
      <div className="h-64 rounded-2xl skeleton" style={{ background: 'rgba(255,255,255,.04)' }} />
    </div>
  );

  const nextStatuses = STATUS_TRANSITIONS[order.status] || [];

  return (
    <div className="flex flex-col gap-6 max-w-3xl">
      <div className="flex items-center justify-between">
        <div>
          <Link href="/admin/orders" style={{ fontSize: '.75rem', color: 'rgba(247,244,236,.4)' }}>← Orders</Link>
          <h1 className="font-mono text-xl font-bold mt-1" style={{ color: '#F7F4EC', letterSpacing: '.06em' }}>{order.orderNumber}</h1>
        </div>
        <span className={`text-xs font-semibold px-3 py-1.5 rounded-pill ${orderStatusColor(order.status)}`}>
          {orderStatusLabel(order.status, 'en')}
        </span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Items */}
        <div style={CARD} className="lg:col-span-2">
          <p className="text-sm font-semibold mb-4" style={{ color: '#D2B56A' }}>Order Items</p>
          {order.items.map((item, i) => (
            <div key={i} className="flex justify-between py-3 border-b last:border-0" style={{ borderColor: 'rgba(210,181,106,.08)' }}>
              <div>
                <p className="text-sm" style={{ color: '#F7F4EC' }}>{loc(item.product.nameAr, item.product.nameEn, 'en')}</p>
                <p className="text-xs" style={{ color: 'rgba(247,244,236,.35)' }}>SKU: {item.product.sku} × {item.quantity}</p>
              </div>
              <p className="font-semibold text-sm" style={{ color: '#D2B56A' }}>{formatPrice(item.total, 'en')}</p>
            </div>
          ))}
          <div className="flex justify-between pt-4 font-bold" style={{ color: '#F7F4EC' }}>
            <span>Total</span>
            <span>{formatPrice(order.total, 'en')}</span>
          </div>
        </div>

        {/* Customer */}
        <div style={CARD}>
          <p className="text-sm font-semibold mb-4" style={{ color: '#D2B56A' }}>Customer</p>
          <p className="text-sm font-medium" style={{ color: '#F7F4EC' }}>{order.shippingAddress.recipientName}</p>
          <p className="text-sm" style={{ color: 'rgba(247,244,236,.5)' }}>{order.shippingAddress.phone}</p>
          <div className="mt-3 text-sm" style={{ color: 'rgba(247,244,236,.5)' }}>
            <p>{order.shippingAddress.streetAddress}</p>
            <p>{order.shippingAddress.city}, {order.shippingAddress.governorate}</p>
          </div>
          {order.shippingAddress.notes && (
            <p className="mt-2 text-xs rounded-lg p-2" style={{ background: 'rgba(255,255,255,.04)', color: 'rgba(247,244,236,.45)' }}>
              {order.shippingAddress.notes}
            </p>
          )}
        </div>

        {/* Status Update */}
        <div style={CARD}>
          <p className="text-sm font-semibold mb-4" style={{ color: '#D2B56A' }}>Update Status</p>
          {nextStatuses.length === 0 ? (
            <p className="text-sm" style={{ color: 'rgba(247,244,236,.35)' }}>No further status updates available</p>
          ) : (
            <div className="flex flex-col gap-3">
              <textarea
                placeholder="Optional note..."
                value={note}
                onChange={e => setNote(e.target.value)}
                rows={2}
                className="w-full rounded-xl px-3 py-2 text-sm resize-none"
                style={{ background: '#1E1B15', border: '1px solid rgba(210,181,106,.2)', color: '#F7F4EC', outline: 'none' }}
              />
              <div className="flex gap-2 flex-wrap">
                {nextStatuses.map(s => (
                  <button
                    key={s}
                    onClick={() => handleStatusUpdate(s)}
                    disabled={updating}
                    className="text-sm font-semibold px-4 py-2 rounded-pill transition-opacity"
                    style={{
                      background: s === 'cancelled' ? '#8B2020' : '#D2B56A',
                      color: s === 'cancelled' ? '#fff' : '#15130F',
                      opacity: updating ? .6 : 1,
                    }}
                  >
                    → {orderStatusLabel(s, 'en')}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Integration status */}
          <div className="mt-5 pt-4 border-t flex flex-col gap-2" style={{ borderColor: 'rgba(210,181,106,.08)' }}>
            <div className="flex items-center justify-between text-xs">
              <span style={{ color: 'rgba(247,244,236,.4)' }}>Odoo Sync</span>
              <span style={{ color: order.odooSyncStatus === 'synced' ? '#4B5B45' : '#A8543A' }}>{order.odooSyncStatus || 'pending'}</span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span style={{ color: 'rgba(247,244,236,.4)' }}>SMS</span>
              <span style={{ color: order.smsStatus === 'sent' ? '#4B5B45' : '#A8543A' }}>{order.smsStatus || 'pending'}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
