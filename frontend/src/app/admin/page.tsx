'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { adminApi, ordersApi, productsApi } from '@/lib/api';
import { formatPrice, orderStatusColor, orderStatusLabel } from '@/lib/utils';
import { useAdminLang } from '@/lib/useAdminLang';
import type { Order, Product } from '@/lib/types';

// ─── Types ──────────────────────────────────────────────────────────────────
interface FullStats {
  users:    { total: number; newToday: number; newThisMonth: number };
  orders:   { thisMonth: number; lastMonth: number; growthPercent: number; pending: number; delivered: number; cancelled: number };
  revenue:  { thisMonth: number; lastMonth: number; growthPercent: number; avgOrderValue: number };
  products: { lowStockCount: number; topSelling: { nameEn: string; totalSold: number; revenue: number }[] };
  revenueChart: { _id: string; orders: number; revenue: number }[];
}

// ─── Helpers ─────────────────────────────────────────────────────────────────
const CARD = { background: '#15130F', border: '1px solid rgba(210,181,106,.1)', borderRadius: 16 };
const GOLD  = '#D2B56A';
const IVORY = '#F7F4EC';
const DIM   = 'rgba(247,244,236,.4)';

function SkeletonBox({ h = 32, w = '100%' }: { h?: number; w?: string }) {
  return <div style={{ height: h, width: w, borderRadius: 8, background: 'rgba(255,255,255,.05)', animation: 'pulse 1.5s infinite' }} />;
}

function GrowthBadge({ pct }: { pct: number }) {
  const up = pct >= 0;
  return (
    <span style={{
      fontSize: '.68rem', fontWeight: 700, padding: '.2rem .5rem', borderRadius: 999,
      background: up ? 'rgba(74,222,128,.12)' : 'rgba(248,113,113,.12)',
      color: up ? '#4ade80' : '#f87171',
    }}>
      {up ? '▲' : '▼'} {Math.abs(pct)}%
    </span>
  );
}

// Simple SVG bar chart (no external library)
function BarChart({ data }: { data: { label: string; value: number }[] }) {
  if (!data.length) return <p style={{ color: DIM, fontSize: '.8rem', textAlign: 'center', padding: '2rem 0' }}>No data yet</p>;
  const max = Math.max(...data.map(d => d.value), 1);
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6, height: 100, padding: '0 4px' }}>
      {data.map((d, i) => (
        <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
          <div
            title={`${d.label}: ${formatPrice(d.value, 'en')}`}
            style={{
              width: '100%',
              height: `${Math.max(4, (d.value / max) * 80)}px`,
              background: `linear-gradient(to top, ${GOLD}, rgba(210,181,106,.4))`,
              borderRadius: '4px 4px 0 0',
              transition: 'height 600ms ease',
              cursor: 'default',
            }}
          />
          <span style={{ fontSize: '.55rem', color: DIM, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '100%' }}>
            {d.label.slice(5)} {/* show MM-DD */}
          </span>
        </div>
      ))}
    </div>
  );
}

// Donut chart with SVG
function DonutChart({ slices, emptyLabel = 'No data' }: { slices: { label: string; value: number; color: string }[]; emptyLabel?: string }) {
  const total = slices.reduce((s, x) => s + x.value, 0);
  if (total === 0) return <p style={{ color: DIM, fontSize: '.8rem', textAlign: 'center' }}>{emptyLabel}</p>;

  let offset = 0;
  const r = 40, cx = 50, cy = 50, strokeW = 16;
  const circ = 2 * Math.PI * r;

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
      <svg width="100" height="100" viewBox="0 0 100 100" style={{ flexShrink: 0 }}>
        {slices.map((s, i) => {
          const pct   = s.value / total;
          const dash  = pct * circ;
          const gap   = circ - dash;
          const rot   = offset * 360 - 90;
          offset += pct;
          return (
            <circle key={i} cx={cx} cy={cy} r={r}
              fill="none" stroke={s.color} strokeWidth={strokeW}
              strokeDasharray={`${dash} ${gap}`}
              strokeDashoffset="0"
              style={{ transformOrigin: '50px 50px', transform: `rotate(${rot}deg)` }}
            />
          );
        })}
        <text x="50" y="54" textAnchor="middle" style={{ fontSize: 11, fill: IVORY, fontWeight: 700 }}>
          {total}
        </text>
      </svg>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '.5rem' }}>
        {slices.map((s, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '.5rem' }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: s.color, flexShrink: 0 }} />
            <span style={{ fontSize: '.72rem', color: DIM }}>{s.label}</span>
            <span style={{ fontSize: '.72rem', color: IVORY, fontWeight: 700, marginLeft: 'auto' }}>{s.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Main component ──────────────────────────────────────────────────────────
export default function AdminDashboard() {
  const { lang, isAr, t } = useAdminLang();
  const [stats, setStats]               = useState<FullStats | null>(null);
  const [recentOrders, setRecentOrders] = useState<Order[]>([]);
  const [lowStock, setLowStock]         = useState<Product[]>([]);
  const [users, setUsers]               = useState<any[]>([]);
  const [loading, setLoading]           = useState(true);
  const [now]                           = useState(new Date());
  const [showWelcome, setShowWelcome]   = useState(false);

  // Show welcome banner on first visit after login (once per session)
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const key = 'rawaqa_admin_welcomed';
    if (!sessionStorage.getItem(key)) {
      setShowWelcome(true);
      sessionStorage.setItem(key, '1');
      const id = setTimeout(() => setShowWelcome(false), 5000);
      return () => clearTimeout(id);
    }
  }, []);

  useEffect(() => {
    Promise.all([
      adminApi.dashboardStats().catch(() => null),
      ordersApi.adminList(1).catch(() => ({ data: [] })),
      productsApi.lowStock().catch(() => ({ data: [] })),
      adminApi.customers(1).catch(() => ({ data: { users: [] } })),
    ]).then(([statsRes, ordersRes, stockRes, usersRes]) => {
      if (statsRes?.data) setStats(statsRes.data as any);
      const orders = (ordersRes as any)?.data ?? [];
      setRecentOrders(orders.slice(0, 8));
      setLowStock(((stockRes as any)?.data ?? []).slice(0, 5));
      const usersData = (usersRes as any)?.data?.users ?? (usersRes as any)?.data ?? [];
      setUsers(Array.isArray(usersData) ? usersData.slice(0, 10) : []);
    }).finally(() => setLoading(false));
  }, []);

  const greeting = (() => {
    const h = now.getHours();
    if (h < 12) return t.greeting_morning;
    if (h < 17) return t.greeting_afternoon;
    return t.greeting_evening;
  })();

  const chartData = (stats?.revenueChart ?? []).map(d => ({
    label: d._id,
    value: d.revenue,
  }));

  const orderDonut = stats ? [
    { label: t.orders_pending,   value: stats.orders?.pending   ?? 0, color: '#BE8F2E' },
    { label: t.orders_delivered, value: stats.orders?.delivered ?? 0, color: '#4ade80' },
    { label: t.cancelled,        value: stats.orders?.cancelled ?? 0, color: '#f87171' },
  ] : [];

  const kpiCards = [
    {
      label: t.revenue_month,
      value: stats ? formatPrice(stats.revenue?.thisMonth ?? 0, lang === 'ar' ? 'ar' : 'en') : '—',
      sub: stats ? `${t.vs_last} ${formatPrice(stats.revenue?.lastMonth ?? 0, lang === 'ar' ? 'ar' : 'en')} ${t.last_month}` : '',
      growth: stats?.revenue?.growthPercent,
      icon: '💰', color: GOLD,
    },
    {
      label: t.orders_month,
      value: stats?.orders?.thisMonth ?? '—',
      sub: stats ? `${t.vs_last} ${stats.orders?.lastMonth ?? 0} ${t.last_month}` : '',
      growth: stats?.orders?.growthPercent,
      icon: '📦', color: '#4ade80',
    },
    {
      label: t.avg_order,
      value: stats ? formatPrice(stats.revenue?.avgOrderValue ?? 0, lang === 'ar' ? 'ar' : 'en') : '—',
      sub: t.per_order,
      icon: '📊', color: '#7aaee8',
    },
    {
      label: t.total_customers,
      value: stats?.users?.total ?? '—',
      sub: stats ? `+${stats.users?.newThisMonth ?? 0} ${t.this_month}` : '',
      icon: '👥', color: '#c084fc',
    },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }} dir={isAr ? 'rtl' : 'ltr'}>

      {/* ── Welcome Banner ─────────────────────────────────────────────── */}
      {showWelcome && (
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '1rem 1.25rem',
          background: 'linear-gradient(135deg, rgba(210,181,106,.15) 0%, rgba(210,181,106,.06) 100%)',
          border: '1px solid rgba(210,181,106,.3)',
          borderRadius: 16,
          animation: 'fadeSlideUp 500ms ease',
          gap: '1rem',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div style={{
              width: 40, height: 40, borderRadius: '50%', flexShrink: 0,
              background: 'rgba(210,181,106,.15)',
              border: '1px solid rgba(210,181,106,.3)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '1.2rem',
            }}>
              👋
            </div>
            <div>
              <p style={{ fontWeight: 700, color: IVORY, fontSize: '.9rem' }}>
                {isAr ? 'أهلاً بك في لوحة تحكم رواقة' : 'Welcome to RAWAQA Admin Panel'}
              </p>
              <p style={{ fontSize: '.75rem', color: 'rgba(247,244,236,.5)', marginTop: '.15rem' }}>
                {isAr
                  ? `اليوم ${now.toLocaleDateString('ar-EG', { weekday: 'long', day: 'numeric', month: 'long' })}`
                  : `Today is ${now.toLocaleDateString('en-EG', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}`}
              </p>
            </div>
          </div>
          <button
            onClick={() => setShowWelcome(false)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(247,244,236,.35)', fontSize: '1.1rem', lineHeight: 1, flexShrink: 0, padding: '0 .25rem' }}
            onMouseEnter={e => (e.currentTarget.style.color = IVORY)}
            onMouseLeave={e => (e.currentTarget.style.color = 'rgba(247,244,236,.35)')}
          >
            ✕
          </button>
        </div>
      )}

      {/* ── Header ────────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontFamily: 'var(--font-fraunces, serif)', fontSize: '1.5rem', color: IVORY, marginBottom: '.25rem' }}>
            {greeting} 👋
          </h1>
          <p style={{ color: DIM, fontSize: '.82rem' }}>
            {now.toLocaleDateString(isAr ? 'ar-EG' : 'en-EG', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
        </div>
        <div style={{ display: 'flex', gap: '.75rem', flexWrap: 'wrap' }}>
          <Link href="/admin/products/new" className="btn btn-gold btn-sm">{t.new_product}</Link>
          <Link href="/admin/orders" style={{ fontSize: '.78rem', color: DIM, padding: '.5rem .9rem', border: '1px solid rgba(210,181,106,.15)', borderRadius: 999, textDecoration: 'none' }}>{t.view_orders}</Link>
        </div>
      </div>

      {/* ── KPI Cards ─────────────────────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
        {kpiCards.map((c, i) => (
          <div key={i} style={{ ...CARD, padding: '1.25rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '.75rem' }}>
              <span style={{ fontSize: '1.4rem' }}>{c.icon}</span>
              {c.growth !== undefined && <GrowthBadge pct={c.growth} />}
            </div>
            {loading ? <SkeletonBox h={28} w="60%" /> : (
              <p style={{ fontSize: '1.4rem', fontWeight: 800, color: c.color, lineHeight: 1 }}>{c.value}</p>
            )}
            <p style={{ fontSize: '.72rem', color: IVORY, fontWeight: 600, marginTop: '.35rem' }}>{c.label}</p>
            {c.sub && <p style={{ fontSize: '.65rem', color: DIM, marginTop: '.15rem' }}>{c.sub}</p>}
          </div>
        ))}
      </div>

      {/* ── Charts row ────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

        {/* Revenue last 7 days */}
        <div style={{ ...CARD, padding: '1.25rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
            <p style={{ fontWeight: 700, color: IVORY, fontSize: '.9rem' }}>{t.revenue_7d}</p>
            {stats && <span style={{ fontSize: '.68rem', color: DIM }}>{t.egp}</span>}
          </div>
          {loading ? <SkeletonBox h={100} /> : <BarChart data={chartData} />}
        </div>

        {/* Orders breakdown */}
        <div style={{ ...CARD, padding: '1.25rem' }}>
          <p style={{ fontWeight: 700, color: IVORY, fontSize: '.9rem', marginBottom: '1rem' }}>{t.orders_breakdown}</p>
          {loading ? <SkeletonBox h={100} /> : <DonutChart slices={orderDonut} emptyLabel={t.no_orders} />}
        </div>
      </div>

      {/* ── Top Products + Low Stock ───────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

        {/* Top selling products */}
        <div style={{ ...CARD, padding: '1.25rem' }}>
          <p style={{ fontWeight: 700, color: IVORY, fontSize: '.9rem', marginBottom: '1rem' }}>{t.top_selling}</p>
          {loading ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '.5rem' }}>
              {[1,2,3].map(i => <SkeletonBox key={i} h={36} />)}
            </div>
          ) : !stats?.products?.topSelling?.length ? (
            <p style={{ color: DIM, fontSize: '.82rem' }}>{t.no_top_products}</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '.5rem' }}>
              {(stats?.products?.topSelling ?? []).map((p, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '.75rem', padding: '.6rem .75rem', borderRadius: 10, background: 'rgba(255,255,255,.03)' }}>
                  <span style={{ fontSize: '.72rem', fontWeight: 800, color: [GOLD,'#c084fc','#7aaee8'][i] || DIM, minWidth: 16 }}>#{i+1}</span>
                  <p style={{ flex: 1, fontSize: '.8rem', color: IVORY, lineHeight: 1.3 }}>{p.nameEn}</p>
                  <div style={{ textAlign: isAr ? 'left' : 'right' }}>
                    <p style={{ fontSize: '.75rem', fontWeight: 700, color: GOLD }}>{p.totalSold} {t.sold}</p>
                    <p style={{ fontSize: '.65rem', color: DIM }}>{formatPrice(p.revenue, lang === 'ar' ? 'ar' : 'en')}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Low stock alert */}
        <div style={{ ...CARD, padding: '1.25rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
            <p style={{ fontWeight: 700, color: IVORY, fontSize: '.9rem' }}>{t.low_stock}</p>
            <Link href="/admin/products" style={{ fontSize: '.68rem', color: GOLD, textDecoration: 'none' }}>{t.manage}</Link>
          </div>
          {loading ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '.5rem' }}>
              {[1,2,3].map(i => <SkeletonBox key={i} h={36} />)}
            </div>
          ) : lowStock.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '1.5rem 0' }}>
              <p style={{ fontSize: '1.5rem', marginBottom: '.5rem' }}>✅</p>
              <p style={{ color: DIM, fontSize: '.82rem' }}>{t.all_stocked}</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '.5rem' }}>
              {lowStock.map(p => {
                const prodId = p.id || (p as any)._id;
                return (
                  <Link key={prodId} href={`/admin/products/${prodId}`}
                    style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '.6rem .75rem', borderRadius: 10, background: 'rgba(168,84,58,.08)', textDecoration: 'none' }}>
                    <p style={{ fontSize: '.8rem', color: IVORY }}>{p.nameEn}</p>
                    <span style={{
                      fontSize: '.72rem', fontWeight: 800, padding: '.2rem .6rem', borderRadius: 999,
                      background: p.inventory?.availableQuantity === 0 ? 'rgba(248,113,113,.15)' : 'rgba(251,191,36,.1)',
                      color: p.inventory?.availableQuantity === 0 ? '#f87171' : '#fbbf24',
                    }}>
                      {p.inventory?.availableQuantity === 0 ? t.out_of_stock : `${p.inventory?.availableQuantity ?? 0} ${t.left}`}
                    </span>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* ── Recent Orders ─────────────────────────────────────────────── */}
      <div style={{ ...CARD, padding: '1.25rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
          <p style={{ fontWeight: 700, color: IVORY, fontSize: '.9rem' }}>{t.recent_orders}</p>
          <Link href="/admin/orders" style={{ fontSize: '.68rem', color: GOLD, textDecoration: 'none' }}>{t.view_all}</Link>
        </div>
        {loading ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '.5rem' }}>
            {[1,2,3,4].map(i => <SkeletonBox key={i} h={48} />)}
          </div>
        ) : recentOrders.length === 0 ? (
          <p style={{ color: DIM, fontSize: '.82rem', textAlign: 'center', padding: '2rem 0' }}>{t.no_orders}</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '.35rem' }}>
            {recentOrders.map(order => (
              <Link key={order.id} href={`/admin/orders/${order.id}`}
                style={{ display: 'flex', alignItems: 'center', padding: '.65rem .75rem', borderRadius: 10, textDecoration: 'none', transition: 'background 200ms ease' }}
                onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,.04)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                <div style={{ flex: '0 0 140px' }}>
                  <p style={{ fontFamily: 'monospace', fontSize: '.78rem', color: GOLD, letterSpacing: '.04em' }}>{order.orderNumber}</p>
                  <p style={{ fontSize: '.65rem', color: DIM, marginTop: '.1rem' }}>
                    {new Date(order.createdAt).toLocaleString(isAr ? 'ar-EG' : 'en-EG', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
                <p style={{ flex: 1, fontSize: '.75rem', color: DIM }}>
                  {order.items?.length ?? 0} {(order.items?.length ?? 0) !== 1 ? t.items_plural : t.items}
                </p>
                <span className={`text-[.62rem] font-semibold px-2 py-0.5 rounded-pill ${orderStatusColor(order.status)}`} style={{ marginInlineEnd: '1rem' }}>
                  {orderStatusLabel(order.status, lang === 'ar' ? 'ar' : 'en')}
                </span>
                <span style={{ fontSize: '.82rem', fontWeight: 800, color: IVORY, minWidth: 80, textAlign: isAr ? 'left' : 'right' }}>
                  {formatPrice(order.total, lang === 'ar' ? 'ar' : 'en')}
                </span>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* ── Registered Users ──────────────────────────────────────────── */}
      <div style={{ ...CARD, padding: '1.25rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
          <p style={{ fontWeight: 700, color: IVORY, fontSize: '.9rem' }}>
            👥 {isAr ? 'المستخدمون المسجلون' : 'Registered Users'}
          </p>
          <Link href="/admin/customers" style={{ fontSize: '.68rem', color: GOLD, textDecoration: 'none' }}>
            {t.view_all}
          </Link>
        </div>
        {loading ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '.5rem' }}>
            {[1,2,3,4,5].map(i => <SkeletonBox key={i} h={44} />)}
          </div>
        ) : users.length === 0 ? (
          <p style={{ color: DIM, fontSize: '.82rem', textAlign: 'center', padding: '2rem 0' }}>
            {isAr ? 'لا توجد مستخدمون بعد' : 'No users yet'}
          </p>
        ) : (
          <>
            {/* Table header */}
            <div style={{
              display: 'grid', gridTemplateColumns: '1fr 1.4fr .7fr .7fr .5fr',
              padding: '.5rem .75rem', marginBottom: '.25rem',
            }}>
              {[
                isAr ? 'الاسم'  : 'Name',
                isAr ? 'البريد' : 'Email',
                isAr ? 'الهاتف' : 'Phone',
                isAr ? 'الدور'  : 'Role',
                isAr ? 'الحالة' : 'Status',
              ].map((h, i) => (
                <p key={i} style={{ fontSize: '.58rem', letterSpacing: '.1em', textTransform: 'uppercase', color: DIM, fontWeight: 700 }}>{h}</p>
              ))}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '.25rem' }}>
              {users.map((u: any, idx: number) => {
                const fullName = u.firstName && u.lastName
                  ? `${u.firstName} ${u.lastName}`
                  : u.name || u.email?.split('@')[0] || '—';
                const role = u.role || 'customer';
                const roleStyle: Record<string, { bg: string; color: string; label: string }> = {
                  super_admin: { bg: 'rgba(168,84,58,.2)',    color: '#e09070', label: isAr ? 'مدير عام'  : 'Super Admin' },
                  admin:       { bg: 'rgba(210,181,106,.15)', color: GOLD,      label: isAr ? 'مشرف'      : 'Admin' },
                  customer:    { bg: 'rgba(74,222,128,.08)',  color: '#4ade80', label: isAr ? 'عميل'      : 'Customer' },
                };
                const rs = roleStyle[role] ?? roleStyle.customer;
                return (
                  <div key={u._id || idx}
                    style={{
                      display: 'grid', gridTemplateColumns: '1fr 1.4fr .7fr .7fr .5fr',
                      alignItems: 'center', padding: '.6rem .75rem', borderRadius: 10,
                      background: idx % 2 === 0 ? 'rgba(255,255,255,.02)' : 'transparent',
                      transition: 'background 200ms ease',
                    }}
                    onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,.05)')}
                    onMouseLeave={e => (e.currentTarget.style.background = idx % 2 === 0 ? 'rgba(255,255,255,.02)' : 'transparent')}
                  >
                    {/* Name */}
                    <p style={{ fontSize: '.8rem', fontWeight: 600, color: IVORY, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {fullName}
                    </p>
                    {/* Email */}
                    <p style={{ fontSize: '.75rem', color: DIM, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {u.email}
                    </p>
                    {/* Phone */}
                    <p style={{ fontSize: '.72rem', color: DIM, direction: 'ltr', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {u.phone || '—'}
                    </p>
                    {/* Role badge */}
                    <div>
                      <span style={{
                        fontSize: '.62rem', fontWeight: 700, padding: '.2rem .55rem', borderRadius: 999,
                        background: rs.bg, color: rs.color, whiteSpace: 'nowrap',
                      }}>
                        {rs.label}
                      </span>
                    </div>
                    {/* Active status */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '.35rem' }}>
                      <span style={{
                        width: 6, height: 6, borderRadius: '50%', flexShrink: 0,
                        background: u.isActive !== false ? '#4ade80' : '#f87171',
                        boxShadow: `0 0 5px ${u.isActive !== false ? '#4ade80' : '#f87171'}`,
                      }} />
                      <span style={{ fontSize: '.68rem', color: DIM }}>
                        {u.isActive !== false ? (isAr ? 'نشط' : 'Active') : (isAr ? 'موقوف' : 'Banned')}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Footer note */}
            <p style={{ fontSize: '.65rem', color: DIM, marginTop: '.75rem', textAlign: 'center' }}>
              {isAr
                ? `عرض أول ${users.length} مستخدم — `
                : `Showing first ${users.length} users — `}
              <Link href="/admin/customers" style={{ color: GOLD, textDecoration: 'none' }}>
                {isAr ? 'عرض الكل' : 'View all'}
              </Link>
            </p>
          </>
        )}
      </div>

      {/* ── Activity Summary ──────────────────────────────────────────── */}      {stats && (
        <div style={{ ...CARD, padding: '1.25rem' }}>
          <p style={{ fontWeight: 700, color: IVORY, fontSize: '.9rem', marginBottom: '1rem' }}>{t.activity}</p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '1rem' }}>
            {[
              { label: t.new_customers,    current: stats.users?.newThisMonth     ?? 0, unit: t.users,    color: '#c084fc' },
              { label: t.orders_placed,    current: stats.orders?.thisMonth       ?? 0, unit: t.orders,   color: '#7aaee8' },
              { label: t.orders_pending,   current: stats.orders?.pending         ?? 0, unit: t.pending,  color: '#fbbf24' },
              { label: t.orders_delivered, current: stats.orders?.delivered       ?? 0, unit: t.delivered,color: '#4ade80' },
              { label: t.cancelled,        current: stats.orders?.cancelled       ?? 0, unit: t.orders,   color: '#f87171' },
              { label: t.low_stock_skus,   current: stats.products?.lowStockCount ?? 0, unit: t.products, color: '#fb923c' },
            ].map((item, i) => (
              <div key={i} style={{ padding: '.875rem', borderRadius: 12, background: 'rgba(255,255,255,.03)', border: '1px solid rgba(255,255,255,.06)' }}>
                <p style={{ fontSize: '1.6rem', fontWeight: 800, color: item.color, lineHeight: 1 }}>{item.current}</p>
                <p style={{ fontSize: '.72rem', color: IVORY, marginTop: '.35rem', fontWeight: 600 }}>{item.label}</p>
                <p style={{ fontSize: '.62rem', color: DIM, marginTop: '.1rem' }}>{item.unit}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Quick actions ─────────────────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '.75rem' }}>
        {[
          { href: '/admin/products/new', label: t.add_product,   icon: '➕' },
          { href: '/admin/categories',   label: t.categories,    icon: '◈' },
          { href: '/admin/ads',          label: t.manage_ads,    icon: '📢' },
          { href: '/admin/content',      label: t.edit_content,  icon: '✏️' },
          { href: '/admin/orders',       label: t.all_orders,    icon: '📋' },
          { href: '/admin/settings',     label: t.site_settings, icon: '⚙️' },
        ].map(q => (
          <Link key={q.href} href={q.href}
            style={{ background: 'rgba(210,181,106,.06)', border: '1px solid rgba(210,181,106,.12)', borderRadius: 16, padding: '1rem', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '.5rem', textAlign: 'center', textDecoration: 'none', color: GOLD, transition: 'all 200ms ease' }}
            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(210,181,106,.12)'; e.currentTarget.style.borderColor = 'rgba(210,181,106,.3)'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'rgba(210,181,106,.06)'; e.currentTarget.style.borderColor = 'rgba(210,181,106,.12)'; }}>
            <span style={{ fontSize: '1.4rem' }}>{q.icon}</span>
            <span style={{ fontSize: '.72rem', fontWeight: 600, letterSpacing: '.03em' }}>{q.label}</span>
          </Link>
        ))}
      </div>

    </div>
  );
}
