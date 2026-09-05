'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { authApi, ordersApi } from '@/lib/api';
import { formatPrice, orderStatusColor, orderStatusLabel } from '@/lib/utils';
import type { Order } from '@/lib/types';

export default function AccountPage() {
  const t = useTranslations('account');
  const params = useParams();
  const router = useRouter();
  const locale = (params?.locale as string) || 'ar';
  const { user, isLoggedIn, isLoading, refreshUser } = useAuth();
  const { showToast } = useToast();

  const [orders, setOrders] = useState<Order[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(true);
  const [tab, setTab] = useState<'orders' | 'profile'>('orders');
  const [profileForm, setProfileForm] = useState({ name: '', phone: '' });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!isLoading && !isLoggedIn) router.push(`/${locale}/login`);
  }, [isLoading, isLoggedIn, locale, router]);

  useEffect(() => {
    if (user) setProfileForm({ name: user.name, phone: user.phone });
  }, [user]);

  useEffect(() => {
    if (isLoggedIn) {
      ordersApi.myOrders(1, locale)
        .then(r => setOrders(r.data ?? []))
        .catch(() => setOrders([]))
        .finally(() => setOrdersLoading(false));
    }
  }, [isLoggedIn, locale]);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await authApi.updateProfile(profileForm);
      await refreshUser();
      showToast(t('saved'), 'success');
    } catch {
      showToast(locale === 'ar' ? 'حدث خطأ' : 'Error', 'error');
    } finally {
      setSaving(false);
    }
  };

  if (isLoading || !user) return (
    <div className="wrap pt-32 pb-20">
      <div className="skeleton h-8 w-48 rounded mb-8" />
      <div className="skeleton h-64 rounded-soft" />
    </div>
  );

  const isAr = locale === 'ar';

  return (
    <div style={{ background: '#0f0e0a', minHeight: '100vh', color: 'var(--ivory)' }}>
      <div className="wrap pt-28 pb-20">
        <h1 className="display-3" style={{ color:'var(--ivory)', marginBottom:'.5rem' }}>{t('title')}</h1>
        <p style={{ color:'rgba(247,244,236,.4)', marginBottom:'2rem' }}>{user.name}</p>

        {/* Tabs */}
        <div style={{ display:'flex',gap:0,borderBottom:'1px solid rgba(210,181,106,.1)',marginBottom:'2rem' }}>
          {(['orders', 'profile'] as const).map(tab_ => (
            <button key={tab_} onClick={() => setTab(tab_)}
              style={{ padding:'.65rem 1.25rem',fontSize:'.85rem',fontWeight:600,cursor:'pointer',background:'none',border:'none',
                color: tab===tab_ ? 'var(--gold-light)' : 'rgba(247,244,236,.38)',
                borderBottom: tab===tab_ ? '2px solid var(--gold-light)' : '2px solid transparent',
                marginBottom: -1, transition:'all 250ms ease',
              }}>
              {t(tab_)}
            </button>
          ))}
        </div>

        {/* Orders tab */}
        {tab === 'orders' && (
          ordersLoading ? (
            <div className="flex flex-col gap-3">
              {[1,2,3].map(i => <div key={i} className="skeleton h-16 rounded-xl" />)}
            </div>
          ) : orders.length === 0 ? (
            <div className="text-center py-16">
              <p className="text-xl font-medium text-ink mb-2">{t('no_orders')}</p>
              <p className="text-ink-soft mb-6">{t('no_orders_sub')}</p>
              <Link href={`/${locale}/shop`} className="btn btn-gold">{isAr ? 'تسوق الآن' : 'Shop Now'}</Link>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {orders.map(order => (
                <Link key={order.id} href={`/${locale}/account/orders/${order.id}`}
                  style={{ display:'flex',alignItems:'center',justifyContent:'space-between',padding:'1rem 1.25rem',borderRadius:16,border:'1px solid rgba(210,181,106,.1)',background:'rgba(30,27,21,.8)',transition:'border-color 250ms ease' }}
                  onMouseEnter={e=>(e.currentTarget.style.borderColor='rgba(210,181,106,.3)')}
                  onMouseLeave={e=>(e.currentTarget.style.borderColor='rgba(210,181,106,.1)')}>
                  <div>
                    <p style={{ fontFamily:'monospace',fontWeight:700,color:'var(--gold-light)',letterSpacing:'.06em' }}>{order.orderNumber}</p>
                    <p style={{ fontSize:'.72rem',color:'rgba(247,244,236,.35)',marginTop:'.2rem' }}>
                      {new Date(order.createdAt).toLocaleDateString(locale==='ar'?'ar-EG':'en-EG')}
                    </p>
                  </div>
                  <div style={{ display:'flex',alignItems:'center',gap:'.875rem' }}>
                    <span className={`text-xs font-semibold px-2.5 py-1 rounded-pill ${orderStatusColor(order.status)}`}>
                      {orderStatusLabel(order.status, locale)}
                    </span>
                    <span style={{ fontWeight:800,color:'var(--gold-light)' }}>{formatPrice(order.total, locale)}</span>
                  </div>
                </Link>
              ))}
            </div>
          )
        )}

        {/* Profile tab */}
        {tab === 'profile' && (
          <form onSubmit={handleSaveProfile} className="max-w-md flex flex-col gap-4">
            {[
              { label: isAr?'الاسم':'Name', val: profileForm.name, setter: (v:string) => setProfileForm(f=>({...f,name:v})) },
              { label: isAr?'الهاتف':'Phone', val: profileForm.phone, setter: (v:string) => setProfileForm(f=>({...f,phone:v})), dir:'ltr' },
            ].map(f => (
              <div key={f.label}>
                <label style={{ fontSize:'.72rem',letterSpacing:'.08em',textTransform:'uppercase',color:'rgba(247,244,236,.38)',marginBottom:'.4rem',display:'block' }}>{f.label}</label>
                <input value={f.val} onChange={e=>f.setter(e.target.value)} dir={(f.dir||'auto') as 'ltr'|'auto'}
                  style={{ width:'100%',background:'rgba(255,255,255,.05)',border:'1px solid rgba(210,181,106,.12)',borderRadius:12,padding:'.75rem 1rem',fontSize:'.875rem',color:'var(--ivory)',outline:'none',fontFamily:'inherit' }}
                  onFocus={e=>(e.currentTarget.style.borderColor='var(--gold-light)')}
                  onBlur={e=>(e.currentTarget.style.borderColor='rgba(210,181,106,.12)')}
                />
              </div>
            ))}
            <div>
              <label style={{ fontSize:'.72rem',letterSpacing:'.08em',textTransform:'uppercase',color:'rgba(247,244,236,.38)',marginBottom:'.4rem',display:'block' }}>
                {isAr?'البريد الإلكتروني':'Email'}
              </label>
              <input value={user.email} disabled dir="ltr"
                style={{ width:'100%',background:'rgba(255,255,255,.03)',border:'1px solid rgba(210,181,106,.08)',borderRadius:12,padding:'.75rem 1rem',fontSize:'.875rem',color:'rgba(247,244,236,.3)',cursor:'not-allowed',fontFamily:'inherit' }}
              />
            </div>
            <button type="submit" disabled={saving} className="btn btn-gold self-start">
              {saving ? '...' : t('save')}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
