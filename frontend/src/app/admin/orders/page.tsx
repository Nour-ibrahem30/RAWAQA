'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ordersApi } from '@/lib/api';
import { formatPrice, orderStatusColor, orderStatusLabel } from '@/lib/utils';
import AdminTable from '@/components/admin/AdminTable';
import type { Order } from '@/lib/types';

const STATUSES = ['', 'pending', 'confirmed', 'preparing', 'shipped', 'delivered', 'cancelled'];

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);

  const load = (p = 1, s = status) => {
    setLoading(true);
    ordersApi.adminList(p, s || undefined)
      .then(r => { setOrders(r.data ?? []); setTotal((r as { pagination?: { total?: number } }).pagination?.total ?? 0); })
      .catch(() => setOrders([]))
      .finally(() => setLoading(false));
  };

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { load(1, status); setPage(1); }, [status]);

  const columns = [
    { key: 'orderNumber', label: 'Order #', render: (o: Order) => <span className="font-mono text-xs" style={{ color: '#D2B56A' }}>{o.orderNumber}</span> },
    { key: 'customer', label: 'Customer', render: (o: Order) => (
      <div>
        <p className="text-sm" style={{ color: '#F7F4EC' }}>{o.shippingAddress.recipientName}</p>
        <p className="text-[.7rem]" style={{ color: 'rgba(247,244,236,.35)' }}>{o.shippingAddress.phone}</p>
      </div>
    )},
    { key: 'total', label: 'Total', render: (o: Order) => <span style={{ color: '#D2B56A', fontWeight: 600 }}>{formatPrice(o.total, 'en')}</span> },
    { key: 'status', label: 'Status', render: (o: Order) => (
      <span className={`text-[.65rem] font-semibold px-2 py-0.5 rounded-pill ${orderStatusColor(o.status)}`}>
        {orderStatusLabel(o.status, 'en')}
      </span>
    )},
    { key: 'date', label: 'Date', render: (o: Order) => <span className="text-xs" style={{ color: 'rgba(247,244,236,.45)' }}>{new Date(o.createdAt).toLocaleDateString('en-EG')}</span> },
    { key: 'actions', label: '', render: (o: Order) => (
      <Link href={`/admin/orders/${o.id}`} className="text-xs hover:underline" style={{ color: '#D2B56A' }}>View →</Link>
    )},
  ];

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold" style={{ color: '#F7F4EC', fontFamily: 'var(--font-fraunces, serif)' }}>Orders</h1>
          <p className="text-xs mt-0.5" style={{ color: 'rgba(247,244,236,.35)' }}>{total} total</p>
        </div>
      </div>

      {/* Filter */}
      <div className="flex gap-2 flex-wrap">
        {STATUSES.map(s => (
          <button
            key={s}
            onClick={() => setStatus(s)}
            className="text-xs px-3 py-1.5 rounded-pill transition-colors"
            style={{
              background: status === s ? '#D2B56A' : 'rgba(210,181,106,.08)',
              color: status === s ? '#15130F' : 'rgba(247,244,236,.6)',
              border: '1px solid rgba(210,181,106,.15)',
              fontWeight: status === s ? 700 : 400,
            }}
          >
            {s || 'All'}
          </button>
        ))}
      </div>

      <AdminTable columns={columns} data={orders} loading={loading} keyField="id" emptyText="No orders found" />

      {/* Pagination */}
      {total > 20 && (
        <div className="flex gap-2 justify-center">
          <button disabled={page <= 1} onClick={() => { setPage(p => p - 1); load(page - 1); }}
            className="text-sm px-4 py-2 rounded-xl" style={{ background: 'rgba(210,181,106,.08)', color: '#D2B56A', opacity: page <= 1 ? .3 : 1 }}>
            ←
          </button>
          <span className="text-sm px-4 py-2" style={{ color: 'rgba(247,244,236,.5)' }}>Page {page}</span>
          <button onClick={() => { setPage(p => p + 1); load(page + 1); }}
            className="text-sm px-4 py-2 rounded-xl" style={{ background: 'rgba(210,181,106,.08)', color: '#D2B56A' }}>
            →
          </button>
        </div>
      )}
    </div>
  );
}
