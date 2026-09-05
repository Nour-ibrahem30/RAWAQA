'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ordersApi, productsApi } from '@/lib/api';
import { formatPrice, orderStatusColor, orderStatusLabel } from '@/lib/utils';
import type { Order, Product } from '@/lib/types';

interface Stats {
  totalOrders: number;
  pendingOrders: number;
  totalRevenue: number;
  totalProducts: number;
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [recentOrders, setRecentOrders] = useState<Order[]>([]);
  const [lowStock, setLowStock] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      ordersApi.adminList(1).catch(() => ({ data: [], pagination: null })),
      productsApi.lowStock().catch(() => ({ data: [] })),
    ]).then(([ordersRes, stockRes]) => {
      const orders = ordersRes.data ?? [];
      setRecentOrders(orders.slice(0, 6));
      setStats({
        totalOrders: (ordersRes as { pagination?: { total?: number } }).pagination?.total ?? orders.length,
        pendingOrders: orders.filter((o: Order) => o.status === 'pending' || o.status === 'confirmed').length,
        totalRevenue: orders.reduce((s: number, o: Order) => s + o.total, 0),
        totalProducts: 0,
      });
      setLowStock((stockRes.data ?? []).slice(0, 5));
    }).finally(() => setLoading(false));
  }, []);

  const cards = [
    { label: 'Total Orders', value: stats?.totalOrders ?? '—', icon: '✦', color: '#D2B56A' },
    { label: 'Pending', value: stats?.pendingOrders ?? '—', icon: '◷', color: '#BE8F2E' },
    { label: 'Revenue', value: stats ? formatPrice(stats.totalRevenue, 'en') : '—', icon: '◈', color: '#4B5B45' },
    { label: 'Low Stock', value: lowStock.length, icon: '⚠', color: '#A8543A' },
  ];

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-2xl font-semibold mb-1" style={{ fontFamily: 'var(--font-fraunces, serif)', color: '#F7F4EC' }}>Dashboard</h1>
        <p style={{ color: 'rgba(247,244,236,.4)', fontSize: '.82rem' }}>Welcome back. Here&apos;s what&apos;s happening.</p>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map(c => (
          <div key={c.label} className="rounded-2xl p-5" style={{ background: '#15130F', border: '1px solid rgba(210,181,106,.1)' }}>
            <div className="flex items-center justify-between mb-3">
              <span style={{ fontSize: '1.2rem', color: c.color }}>{c.icon}</span>
            </div>
            {loading ? (
              <div className="skeleton h-7 w-16 rounded mb-1" style={{ background: 'rgba(255,255,255,.06)' }} />
            ) : (
              <p className="text-2xl font-bold mb-0.5" style={{ color: '#F7F4EC' }}>{c.value}</p>
            )}
            <p style={{ fontSize: '.72rem', color: 'rgba(247,244,236,.4)', letterSpacing: '.04em' }}>{c.label}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Orders */}
        <div className="lg:col-span-2 rounded-2xl p-5" style={{ background: '#15130F', border: '1px solid rgba(210,181,106,.1)' }}>
          <div className="flex items-center justify-between mb-5">
            <p className="font-semibold" style={{ color: '#F7F4EC' }}>Recent Orders</p>
            <Link href="/admin/orders" style={{ fontSize: '.72rem', color: '#D2B56A' }}>View all →</Link>
          </div>
          {loading ? (
            <div className="flex flex-col gap-2">
              {[1,2,3,4].map(i => <div key={i} className="h-10 rounded-xl" style={{ background: 'rgba(255,255,255,.05)' }} />)}
            </div>
          ) : recentOrders.length === 0 ? (
            <p style={{ color: 'rgba(247,244,236,.3)', fontSize: '.82rem' }}>No orders yet</p>
          ) : (
            <div className="flex flex-col gap-1">
              {recentOrders.map(order => (
                <Link
                  key={order.id}
                  href={`/admin/orders/${order.id}`}
                  className="flex items-center justify-between px-3 py-2.5 rounded-xl transition-colors"
                  style={{ background: 'transparent' }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,.04)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                >
                  <div>
                    <p className="font-mono text-sm" style={{ color: '#F7F4EC', letterSpacing: '.04em' }}>{order.orderNumber}</p>
                    <p style={{ fontSize: '.7rem', color: 'rgba(247,244,236,.35)' }}>
                      {new Date(order.createdAt).toLocaleDateString('en-EG')}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`text-[.65rem] font-semibold px-2 py-0.5 rounded-pill ${orderStatusColor(order.status)}`}>
                      {orderStatusLabel(order.status, 'en')}
                    </span>
                    <span className="text-sm font-semibold" style={{ color: '#D2B56A' }}>
                      {formatPrice(order.total, 'en')}
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Low Stock */}
        <div className="rounded-2xl p-5" style={{ background: '#15130F', border: '1px solid rgba(210,181,106,.1)' }}>
          <div className="flex items-center justify-between mb-5">
            <p className="font-semibold" style={{ color: '#F7F4EC' }}>Low Stock</p>
            <Link href="/admin/products" style={{ fontSize: '.72rem', color: '#D2B56A' }}>Manage →</Link>
          </div>
          {loading ? (
            <div className="flex flex-col gap-2">
              {[1,2,3].map(i => <div key={i} className="h-10 rounded-xl" style={{ background: 'rgba(255,255,255,.05)' }} />)}
            </div>
          ) : lowStock.length === 0 ? (
            <p style={{ color: 'rgba(247,244,236,.3)', fontSize: '.82rem' }}>All products are well stocked</p>
          ) : (
            <div className="flex flex-col gap-2">
              {lowStock.map(p => (
                <Link
                  key={p.id}
                  href={`/admin/products/${p.id}`}
                  className="flex items-center justify-between px-3 py-2.5 rounded-xl"
                  style={{ background: 'rgba(168,84,58,.08)' }}
                >
                  <p className="text-sm line-clamp-1" style={{ color: '#F7F4EC' }}>{p.nameEn}</p>
                  <span className="text-sm font-bold" style={{ color: '#A8543A' }}>{p.inventory.availableQuantity}</span>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Quick links */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { href: '/admin/products/new', label: 'Add Product', icon: '+' },
          { href: '/admin/categories', label: 'Categories', icon: '◈' },
          { href: '/admin/orders', label: 'All Orders', icon: '✦' },
          { href: '/admin/settings', label: 'Site Settings', icon: '◐' },
        ].map(q => (
          <Link
            key={q.href}
            href={q.href}
            className="rounded-2xl p-4 flex flex-col items-center gap-2 text-center transition-colors"
            style={{ background: 'rgba(210,181,106,.06)', border: '1px solid rgba(210,181,106,.12)', color: '#D2B56A' }}
          >
            <span style={{ fontSize: '1.3rem' }}>{q.icon}</span>
            <span style={{ fontSize: '.75rem', fontWeight: 600, letterSpacing: '.04em' }}>{q.label}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
