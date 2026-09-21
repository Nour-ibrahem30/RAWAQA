'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { authApi, ordersApi, addressesApi, type ShippingAddressPayload } from '@/lib/api';
import { formatPrice, orderStatusColor, orderStatusLabel } from '@/lib/utils';
import type { Order } from '@/lib/types';

/* ── helpers ─────────────────────────────────────────────────── */
const GOLD   = 'var(--gold-light)';
const IVORY  = 'var(--ivory)';
const CARD   = 'rgba(128,120,100,.08)';
const BORDER = 'rgba(210,181,106,.1)';
const DIM    = 'var(--text-on-bg-38)';

const GOVERNORATES = [
  'cairo','giza','alexandria','qalyubia','dakahlia','sharqia','gharbia',
  'monufia','beheira','kafr_el_sheikh','damietta','port_said','ismailia',
  'suez','north_sinai','south_sinai','fayoum','beni_suef','minya','asyut',
  'sohag','qena','luxor','aswan','red_sea','new_valley','matruh',
];

type Tab = 'orders' | 'profile' | 'addresses' | 'security';

/* ── InputField ──────────────────────────────────────────────── */
function InputField({ label, value, onChange, type = 'text', disabled = false, dir }: {
  label: string; value: string; onChange?: (v: string) => void;
  type?: string; disabled?: boolean; dir?: 'ltr' | 'rtl' | 'auto';
}) {
  return (
    <div>
      <label style={{ display: 'block', fontSize: '.62rem', letterSpacing: '.1em', textTransform: 'uppercase', color: DIM, marginBottom: '.4rem' }}>
        {label}
      </label>
      <input
        type={type} value={value} disabled={disabled}
        onChange={e => onChange?.(e.target.value)}
        dir={(dir || 'auto') as 'ltr' | 'auto'}
        style={{
          width: '100%',
          background: disabled ? 'rgba(255,255,255,.02)' : 'rgba(255,255,255,.05)',
          border: `1px solid ${disabled ? 'rgba(210,181,106,.06)' : BORDER}`,
          borderRadius: 12, padding: '.75rem 1rem', fontSize: '.875rem',
          color: disabled ? 'rgba(247,244,236,.28)' : IVORY,
          cursor: disabled ? 'not-allowed' : 'text',
          outline: 'none', fontFamily: 'inherit',
          transition: 'border-color 200ms, box-shadow 200ms',
        }}
        onFocus={e => { if (!disabled) { e.currentTarget.style.borderColor = 'rgba(210,181,106,.5)'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(210,181,106,.07)'; } }}
        onBlur={e => { e.currentTarget.style.borderColor = disabled ? 'rgba(210,181,106,.06)' : BORDER; e.currentTarget.style.boxShadow = 'none'; }}
      />
    </div>
  );
}

/* ── ResendEmailButton ───────────────────────────────────────── */
function ResendEmailButton({ isAr }: { isAr: boolean }) {
  const [sending, setSending] = useState(false);
  const [sent, setSent]       = useState(false);
  const { showToast }         = useToast();
  const handle = async () => {
    setSending(true);
    try {
      await authApi.sendEmailVerification();
      setSent(true);
      showToast(isAr ? 'تم إرسال رسالة التحقق' : 'Verification email sent', 'success');
    } catch (err: unknown) {
      showToast((err as Error).message || (isAr ? 'حدث خطأ' : 'Error'), 'error');
    } finally { setSending(false); }
  };
  if (sent) return <span style={{ fontSize: '.8rem', color: '#4ade80', fontWeight: 600 }}>{isAr ? '✓ تم الإرسال' : '✓ Sent'}</span>;
  return (
    <button onClick={handle} disabled={sending} className="btn btn-gold btn-sm" style={{ fontSize: '.78rem' }}>
      {sending ? '...' : (isAr ? 'إرسال رابط التأكيد' : 'Resend Verification')}
    </button>
  );
}

/* ── Main page ───────────────────────────────────────────────── */
export default function AccountPage() {
  const t  = useTranslations('account');
  const tg = useTranslations('governorates');
  const ta = useTranslations('auth');
  const params = useParams();
  const router = useRouter();
  const locale = (params?.locale as string) || 'ar';
  const isAr   = locale === 'ar';

  const { user, isLoggedIn, isLoading, refreshUser } = useAuth();
  const { showToast } = useToast();

  const [tab, setTab]               = useState<Tab>('orders');
  const [orders, setOrders]         = useState<Order[]>([]);
  const [ordersLoading, setOrdLoad] = useState(true);

  const [profileForm, setProfileForm]   = useState({ firstName: '', lastName: '', phone: '' });
  const [savingProfile, setSavingProfile] = useState(false);

  const [addresses, setAddresses]   = useState<(ShippingAddressPayload & { id?: string })[]>([]);
  const [addrLoading, setAddrLoad]  = useState(false);
  const [showAddrForm, setShowAddrForm] = useState(false);
  const [editingAddr, setEditingAddr]   = useState<string | null>(null);
  const [addrForm, setAddrForm]         = useState<ShippingAddressPayload>({
    firstName: '', lastName: '', phone: '', email: '',
    addressLine1: '', addressLine2: '', city: '', governorate: '', postalCode: '', isDefault: false,
  });
  const [savingAddr, setSavingAddr]     = useState(false);
  const [deletingAddr, setDeletingAddr] = useState<string | null>(null);

  const [pwForm, setPwForm]   = useState({ current: '', newPw: '', confirm: '' });
  const [showPw, setShowPw]   = useState(false);
  const [savingPw, setSavingPw] = useState(false);

  useEffect(() => {
    if (!isLoading && !isLoggedIn) router.push(`/${locale}/login`);
  }, [isLoading, isLoggedIn, locale, router]);

  useEffect(() => {
    if (user) setProfileForm({ firstName: user.firstName || '', lastName: user.lastName || '', phone: user.phone });
  }, [user]);

  useEffect(() => {
    if (!isLoggedIn) return;
    ordersApi.myOrders(1, locale)
      .then(r => setOrders(r.data ?? []))
      .catch(() => setOrders([]))
      .finally(() => setOrdLoad(false));
  }, [isLoggedIn, locale]);

  useEffect(() => {
    if (!isLoggedIn || tab !== 'addresses') return;
    setAddrLoad(true);
    addressesApi.list()
      .then(r => setAddresses((r.data as any) ?? []))
      .catch(() => setAddresses([]))
      .finally(() => setAddrLoad(false));
  }, [isLoggedIn, tab]);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault(); setSavingProfile(true);
    try { await authApi.updateProfile(profileForm); await refreshUser(); showToast(t('saved'), 'success'); }
    catch { showToast(isAr ? 'حدث خطأ' : 'Error', 'error'); }
    finally { setSavingProfile(false); }
  };

  const resetAddrForm = () => setAddrForm({ firstName: '', lastName: '', phone: '', email: '', addressLine1: '', addressLine2: '', city: '', governorate: '', postalCode: '', isDefault: false });

  const handleSaveAddress = async (e: React.FormEvent) => {
    e.preventDefault(); setSavingAddr(true);
    try {
      if (editingAddr) await addressesApi.update(editingAddr, addrForm);
      else await addressesApi.create(addrForm);
      showToast(t('address_saved'), 'success');
      const r = await addressesApi.list();
      setAddresses((r.data as any) ?? []);
      setShowAddrForm(false); setEditingAddr(null); resetAddrForm();
    } catch (err: unknown) { showToast((err as Error).message || (isAr ? 'حدث خطأ' : 'Error'), 'error'); }
    finally { setSavingAddr(false); }
  };

  const handleDeleteAddress = async (id: string) => {
    if (!confirm(isAr ? 'هل تريد حذف هذا العنوان؟' : 'Delete this address?')) return;
    setDeletingAddr(id);
    try {
      await addressesApi.remove(id);
      setAddresses(prev => prev.filter((a: any) => a._id !== id && a.id !== id));
      showToast(t('address_deleted'), 'success');
    } catch { showToast(isAr ? 'حدث خطأ' : 'Error', 'error'); }
    finally { setDeletingAddr(null); }
  };

  const handleEditAddress = (addr: any) => {
    setEditingAddr(addr._id || addr.id);
    setAddrForm({ firstName: addr.firstName || '', lastName: addr.lastName || '', phone: addr.phone || '', email: addr.email || '', addressLine1: addr.addressLine1 || '', addressLine2: addr.addressLine2 || '', city: addr.city || '', governorate: addr.governorate || '', postalCode: addr.postalCode || '', isDefault: addr.isDefault || false });
    setShowAddrForm(true);
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (pwForm.newPw !== pwForm.confirm) { showToast(ta('password_mismatch'), 'error'); return; }
    setSavingPw(true);
    try { await authApi.changePassword(pwForm.current, pwForm.newPw); showToast(t('password_changed'), 'success'); setPwForm({ current: '', newPw: '', confirm: '' }); }
    catch (err: unknown) { showToast((err as Error).message || (isAr ? 'كلمة المرور الحالية غير صحيحة' : 'Incorrect current password'), 'error'); }
    finally { setSavingPw(false); }
  };

  if (isLoading || !user) return (
    <div style={{ background: '#0f0e0a', minHeight: '100vh' }} className="wrap pt-32 pb-20">
      {[1,2,3].map(i => <div key={i} className="skeleton" style={{ height: i === 1 ? 60 : 120, borderRadius: 16, background: 'rgba(255,255,255,.04)', marginBottom: '1rem' }} />)}
    </div>
  );

  const initials = [user.firstName?.[0], user.lastName?.[0]].filter(Boolean).join('').toUpperCase() || user.email[0].toUpperCase();
  const displayName = [user.firstName, user.lastName].filter(Boolean).join(' ') || user.email;

  const TABS: { key: Tab; label: string; icon: string }[] = [
    { key: 'orders',    label: t('orders'),    icon: '📦' },
    { key: 'profile',   label: t('profile'),   icon: '👤' },
    { key: 'addresses', label: t('addresses'), icon: '📍' },
    { key: 'security',  label: t('security'),  icon: '🔒' },
  ];

  return (
    <div style={{ background: 'var(--charcoal)', minHeight: '100vh', color: IVORY }}>

      {/* ── Ambient glow ── */}
      <div aria-hidden style={{
        position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0,
        background: 'radial-gradient(ellipse 55% 35% at 50% 0%, rgba(173,138,76,.07) 0%, transparent 70%)',
      }} />

      <div className="wrap relative" style={{ zIndex: 1, paddingTop: 'clamp(5.5rem,10vh,7rem)', paddingBottom: '4rem' }}>

        {/* ══ Hero header ══════════════════════════════════════════ */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: '1.5rem',
          marginBottom: '2.5rem', flexWrap: 'wrap',
        }}>
          {/* Avatar */}
          <div style={{
            width: 72, height: 72, borderRadius: '50%', flexShrink: 0,
            background: 'linear-gradient(135deg, var(--gold-light) 0%, #8a6530 100%)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '1.6rem', fontWeight: 800, color: '#0f0e0a',
            boxShadow: '0 0 0 3px rgba(210,181,106,.18), 0 8px 32px rgba(0,0,0,.4)',
          }}>
            {initials}
          </div>

          {/* Name + email */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <h1 style={{
              fontSize: 'clamp(1.3rem, 3vw, 1.8rem)',
              fontFamily: 'var(--font-fraunces, serif)',
              fontWeight: 700, color: IVORY,
              marginBottom: '.2rem',
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            }}>
              {displayName}
            </h1>
            <p style={{ fontSize: '.82rem', color: DIM }}>{user.email}</p>
          </div>

          {/* Quick actions */}
          <div style={{ display: 'flex', gap: '.5rem', flexShrink: 0 }}>
            <Link
              href={`/${locale}/wishlist`}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: '.45rem',
                padding: '.5rem 1rem', borderRadius: 999,
                fontSize: '.75rem', fontWeight: 600,
                color: 'rgba(247,244,236,.6)',
                background: 'rgba(255,255,255,.04)',
                border: '1px solid rgba(255,255,255,.08)',
                textDecoration: 'none', transition: 'all 180ms',
              }}
              onMouseEnter={e => { (e.currentTarget as HTMLAnchorElement).style.color = GOLD; (e.currentTarget as HTMLAnchorElement).style.borderColor = 'rgba(210,181,106,.3)'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLAnchorElement).style.color = 'rgba(247,244,236,.6)'; (e.currentTarget as HTMLAnchorElement).style.borderColor = 'rgba(255,255,255,.08)'; }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
                <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
              </svg>
              {isAr ? 'المفضلة' : 'Wishlist'}
            </Link>
            <Link
              href={`/${locale}/shop`}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: '.45rem',
                padding: '.5rem 1rem', borderRadius: 999,
                fontSize: '.75rem', fontWeight: 600,
                color: '#0f0e0a', background: GOLD,
                textDecoration: 'none', transition: 'all 180ms',
              }}
              onMouseEnter={e => { (e.currentTarget as HTMLAnchorElement).style.opacity = '.85'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLAnchorElement).style.opacity = '1'; }}
            >
              {isAr ? 'تسوق الآن' : 'Shop Now'}
            </Link>
          </div>
        </div>

        {/* ── Divider ── */}
        <div style={{ height: 1, background: 'linear-gradient(90deg, transparent, rgba(210,181,106,.15), transparent)', marginBottom: '2rem' }} />

        {/* ══ Tabs ═════════════════════════════════════════════════ */}
        <div style={{
          display: 'flex', gap: '.25rem',
          background: 'rgba(255,255,255,.03)',
          border: '1px solid rgba(255,255,255,.06)',
          borderRadius: 16, padding: '.3rem',
          marginBottom: '2rem',
          overflowX: 'auto',
        }}>
          {TABS.map(({ key, label, icon }) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              style={{
                flex: '1 1 auto',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '.4rem',
                padding: '.6rem 1rem', borderRadius: 12,
                fontSize: '.8rem', fontWeight: 600, whiteSpace: 'nowrap',
                cursor: 'pointer', border: 'none',
                background: tab === key
                  ? 'linear-gradient(135deg, rgba(210,181,106,.18), rgba(210,181,106,.08))'
                  : 'transparent',
                color: tab === key ? GOLD : 'rgba(247,244,236,.38)',
                boxShadow: tab === key ? '0 1px 8px rgba(0,0,0,.25), inset 0 1px 0 rgba(210,181,106,.1)' : 'none',
                transition: 'all 220ms ease',
              }}
              onMouseEnter={e => { if (tab !== key) (e.currentTarget as HTMLButtonElement).style.color = 'rgba(247,244,236,.7)'; }}
              onMouseLeave={e => { if (tab !== key) (e.currentTarget as HTMLButtonElement).style.color = 'rgba(247,244,236,.38)'; }}
            >
              <span aria-hidden style={{ fontSize: '.9rem' }}>{icon}</span>
              <span>{label}</span>
            </button>
          ))}
        </div>

        {/* ══ Content ══════════════════════════════════════════════ */}

        {/* ── ORDERS ── */}
        {tab === 'orders' && (
          ordersLoading ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '.75rem' }}>
              {[1,2,3].map(i => <div key={i} className="skeleton" style={{ height: 80, borderRadius: 16, background: 'rgba(255,255,255,.04)' }} />)}
            </div>
          ) : orders.length === 0 ? (
            <div style={{
              textAlign: 'center', padding: '5rem 2rem',
              background: CARD, borderRadius: 24, border: `1px solid ${BORDER}`,
            }}>
              <div style={{ fontSize: '3rem', marginBottom: '1rem', opacity: .5 }}>📦</div>
              <p style={{ fontSize: '1rem', fontWeight: 700, color: 'rgba(247,244,236,.6)', marginBottom: '.5rem' }}>{t('no_orders')}</p>
              <p style={{ fontSize: '.875rem', color: DIM, marginBottom: '1.75rem' }}>{t('no_orders_sub')}</p>
              <Link href={`/${locale}/shop`} className="btn btn-gold btn-sm">{isAr ? 'تسوق الآن' : 'Shop Now'}</Link>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '.75rem' }}>
              {orders.map(order => (
                <Link
                  key={order.id}
                  href={`/${locale}/track?order=${order.orderNumber}`}
                  style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    gap: '1rem', padding: '1.1rem 1.4rem',
                    background: CARD, border: `1px solid ${BORDER}`,
                    borderRadius: 18, textDecoration: 'none',
                    transition: 'border-color 200ms, transform 200ms, box-shadow 200ms',
                  }}
                  onMouseEnter={e => {
                    (e.currentTarget as HTMLAnchorElement).style.borderColor = 'rgba(210,181,106,.28)';
                    (e.currentTarget as HTMLAnchorElement).style.transform = 'translateY(-1px)';
                    (e.currentTarget as HTMLAnchorElement).style.boxShadow = '0 8px 24px rgba(0,0,0,.25)';
                  }}
                  onMouseLeave={e => {
                    (e.currentTarget as HTMLAnchorElement).style.borderColor = BORDER;
                    (e.currentTarget as HTMLAnchorElement).style.transform = 'none';
                    (e.currentTarget as HTMLAnchorElement).style.boxShadow = 'none';
                  }}
                >
                  {/* Order icon */}
                  <div style={{
                    width: 40, height: 40, borderRadius: 12, flexShrink: 0,
                    background: 'rgba(210,181,106,.08)',
                    border: `1px solid rgba(210,181,106,.12)`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '1rem',
                  }}>📦</div>

                  {/* Info */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontFamily: 'monospace', fontWeight: 700, color: GOLD, letterSpacing: '.05em', fontSize: '.88rem' }}>
                      {order.orderNumber}
                    </p>
                    <p style={{ fontSize: '.72rem', color: DIM, marginTop: '.15rem' }}>
                      {new Date(order.createdAt).toLocaleDateString(isAr ? 'ar-EG' : 'en-EG')}
                    </p>
                  </div>

                  {/* Status + total */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '.75rem', flexShrink: 0 }}>
                    <span className={`text-xs font-semibold px-2.5 py-1 rounded-pill ${orderStatusColor(order.status)}`}>
                      {orderStatusLabel(order.status, locale)}
                    </span>
                    <span style={{ fontWeight: 800, color: GOLD, fontSize: '.9rem' }}>
                      {formatPrice(order.total, locale)}
                    </span>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="rgba(247,244,236,.2)" strokeWidth="2" aria-hidden>
                      <path d={isAr ? 'M15 18l-6-6 6-6' : 'M9 18l6-6-6-6'} />
                    </svg>
                  </div>
                </Link>
              ))}
            </div>
          )
        )}

        {/* ── PROFILE ── */}
        {tab === 'profile' && (
          <div style={{ maxWidth: 520 }}>
            <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 24, padding: '1.75rem', marginBottom: '1.25rem' }}>
              <h2 style={{ fontSize: '.9rem', fontWeight: 700, color: IVORY, marginBottom: '1.25rem' }}>
                {isAr ? 'المعلومات الشخصية' : 'Personal Information'}
              </h2>
              <form onSubmit={handleSaveProfile} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <InputField label={isAr ? 'الاسم الأول' : 'First Name'} value={profileForm.firstName} onChange={v => setProfileForm(f => ({ ...f, firstName: v }))} />
                  <InputField label={isAr ? 'الاسم الأخير' : 'Last Name'}  value={profileForm.lastName}  onChange={v => setProfileForm(f => ({ ...f, lastName: v }))} />
                </div>
                <InputField label={isAr ? 'رقم الهاتف' : 'Phone'} value={profileForm.phone} onChange={v => setProfileForm(f => ({ ...f, phone: v }))} dir="ltr" />
                <InputField label={isAr ? 'البريد الإلكتروني' : 'Email'} value={user.email} disabled />
                <div style={{ paddingTop: '.25rem' }}>
                  <button type="submit" disabled={savingProfile} className="btn btn-gold" style={{ minWidth: 120 }}>
                    {savingProfile ? '...' : t('save')}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ── ADDRESSES ── */}
        {tab === 'addresses' && (
          <div style={{ maxWidth: 600 }}>
            {addrLoading ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '.75rem' }}>
                {[1,2].map(i => <div key={i} className="skeleton" style={{ height: 90, borderRadius: 16, background: 'rgba(255,255,255,.04)' }} />)}
              </div>
            ) : (
              <>
                {addresses.length === 0 && !showAddrForm && (
                  <div style={{ textAlign: 'center', padding: '3.5rem 2rem', background: CARD, borderRadius: 20, border: `1px solid ${BORDER}`, marginBottom: '1rem' }}>
                    <div style={{ fontSize: '2.5rem', marginBottom: '.75rem', opacity: .5 }}>📍</div>
                    <p style={{ color: DIM, fontSize: '.9rem' }}>{t('no_addresses')}</p>
                  </div>
                )}

                <div style={{ display: 'flex', flexDirection: 'column', gap: '.75rem', marginBottom: '1rem' }}>
                  {addresses.map((addr: any) => {
                    const addrId = addr._id || addr.id;
                    return (
                      <div key={addrId} style={{
                        background: CARD, border: `1px solid ${BORDER}`,
                        borderRadius: 18, padding: '1.1rem 1.4rem',
                        display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem',
                        transition: 'border-color 200ms',
                      }}
                        onMouseEnter={e => (e.currentTarget.style.borderColor = 'rgba(210,181,106,.22)')}
                        onMouseLeave={e => (e.currentTarget.style.borderColor = BORDER)}
                      >
                        <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start', flex: 1, minWidth: 0 }}>
                          <div style={{ width: 38, height: 38, borderRadius: 10, background: 'rgba(210,181,106,.08)', border: `1px solid rgba(210,181,106,.12)`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '.95rem', flexShrink: 0 }}>📍</div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <p style={{ fontWeight: 700, color: IVORY, fontSize: '.88rem' }}>{addr.firstName} {addr.lastName}</p>
                            <p style={{ fontSize: '.78rem', color: 'rgba(247,244,236,.45)', marginTop: '.2rem', lineHeight: 1.5 }}>
                              {addr.addressLine1}{addr.addressLine2 ? `, ${addr.addressLine2}` : ''}, {addr.city}
                            </p>
                            <p style={{ fontSize: '.75rem', color: DIM, marginTop: '.1rem' }}>
                              {tg(addr.governorate as any)} · {addr.phone}
                            </p>
                            {addr.isDefault && (
                              <span style={{ display: 'inline-block', marginTop: '.45rem', fontSize: '.6rem', background: 'rgba(210,181,106,.1)', border: '1px solid rgba(210,181,106,.22)', color: GOLD, padding: '.15rem .6rem', borderRadius: 999, fontWeight: 700, letterSpacing: '.06em', textTransform: 'uppercase' }}>
                                {t('default_address')}
                              </span>
                            )}
                          </div>
                        </div>
                        <div style={{ display: 'flex', gap: '.4rem', flexShrink: 0 }}>
                          <button onClick={() => handleEditAddress(addr)} style={{ background: 'none', border: `1px solid ${BORDER}`, borderRadius: 8, padding: '.35rem .7rem', cursor: 'pointer', color: 'rgba(247,244,236,.5)', fontSize: '.72rem', transition: 'all 200ms' }} onMouseEnter={e => (e.currentTarget.style.borderColor = 'rgba(210,181,106,.4)')} onMouseLeave={e => (e.currentTarget.style.borderColor = BORDER)}>
                            {isAr ? 'تعديل' : 'Edit'}
                          </button>
                          <button onClick={() => handleDeleteAddress(addrId)} disabled={deletingAddr === addrId} style={{ background: 'none', border: '1px solid rgba(248,113,113,.18)', borderRadius: 8, padding: '.35rem .7rem', cursor: 'pointer', color: 'rgba(248,113,113,.55)', fontSize: '.72rem', transition: 'all 200ms' }} onMouseEnter={e => (e.currentTarget.style.background = 'rgba(248,113,113,.07)')} onMouseLeave={e => (e.currentTarget.style.background = 'none')}>
                            {deletingAddr === addrId ? '...' : (isAr ? 'حذف' : 'Delete')}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {showAddrForm ? (
                  <form onSubmit={handleSaveAddress} style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 20, padding: '1.5rem', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                    <h3 style={{ gridColumn: '1/-1', fontSize: '.9rem', fontWeight: 700, color: IVORY, marginBottom: '.25rem' }}>
                      {editingAddr ? (isAr ? 'تعديل العنوان' : 'Edit Address') : t('add_address')}
                    </h3>
                    <InputField label={t('first_name')} value={addrForm.firstName} onChange={v => setAddrForm(p => ({ ...p, firstName: v }))} />
                    <InputField label={t('last_name')}  value={addrForm.lastName}  onChange={v => setAddrForm(p => ({ ...p, lastName: v }))} />
                    <div style={{ gridColumn: '1/-1' }}>
                      <InputField label={isAr ? 'رقم الهاتف' : 'Phone'} value={addrForm.phone} onChange={v => setAddrForm(p => ({ ...p, phone: v }))} dir="ltr" />
                    </div>
                    <div style={{ gridColumn: '1/-1' }}>
                      <InputField label={t('address_line1')} value={addrForm.addressLine1} onChange={v => setAddrForm(p => ({ ...p, addressLine1: v }))} />
                    </div>
                    <div style={{ gridColumn: '1/-1' }}>
                      <InputField label={t('address_line2')} value={addrForm.addressLine2 || ''} onChange={v => setAddrForm(p => ({ ...p, addressLine2: v }))} />
                    </div>
                    <InputField label={t('city')} value={addrForm.city} onChange={v => setAddrForm(p => ({ ...p, city: v }))} />
                    <div>
                      <label style={{ display: 'block', fontSize: '.62rem', letterSpacing: '.1em', textTransform: 'uppercase', color: DIM, marginBottom: '.4rem' }}>{t('governorate')}</label>
                      <select value={addrForm.governorate} onChange={e => setAddrForm(p => ({ ...p, governorate: e.target.value }))} required
                        style={{ width: '100%', background: 'rgba(255,255,255,.05)', border: `1px solid ${BORDER}`, borderRadius: 12, padding: '.75rem 1rem', fontSize: '.875rem', color: addrForm.governorate ? IVORY : DIM, outline: 'none', fontFamily: 'inherit' }}>
                        <option value="" disabled>{isAr ? 'اختر المحافظة' : 'Select Governorate'}</option>
                        {GOVERNORATES.map(g => <option key={g} value={g}>{tg(g as any)}</option>)}
                      </select>
                    </div>
                    <div style={{ gridColumn: '1/-1', display: 'flex', gap: '.75rem', paddingTop: '.25rem' }}>
                      <button type="submit" disabled={savingAddr} className="btn btn-gold btn-sm">{savingAddr ? '...' : (isAr ? 'حفظ العنوان' : 'Save Address')}</button>
                      <button type="button" onClick={() => { setShowAddrForm(false); setEditingAddr(null); resetAddrForm(); }} className="btn btn-line-dark btn-sm">{isAr ? 'إلغاء' : 'Cancel'}</button>
                    </div>
                  </form>
                ) : (
                  <button onClick={() => { setShowAddrForm(true); setEditingAddr(null); resetAddrForm(); }} className="btn btn-gold btn-sm">
                    + {t('add_address')}
                  </button>
                )}
              </>
            )}
          </div>
        )}

        {/* ── SECURITY ── */}
        {tab === 'security' && (
          <div style={{ maxWidth: 520, display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>

            {/* Verification cards */}
            {[
              {
                title:    isAr ? 'التحقق من البريد الإلكتروني' : 'Email Verification',
                verified: (user as any).isEmailVerified,
                label:    isAr ? 'البريد الإلكتروني' : 'Email',
                action:   !(user as any).isEmailVerified ? <ResendEmailButton isAr={isAr} /> : null,
              },
              {
                title:    isAr ? 'التحقق من رقم الهاتف' : 'Phone Verification',
                verified: (user as any).isPhoneVerified,
                label:    isAr ? 'رقم الهاتف' : 'Phone',
                action:   !(user as any).isPhoneVerified
                  ? <Link href={`/${locale}/verify-phone`} className="btn btn-gold btn-sm">{t('verify_phone')}</Link>
                  : null,
              },
            ].map((item, i) => (
              <div key={i} style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 20, padding: '1.25rem 1.5rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '.85rem' }}>
                    <div style={{
                      width: 36, height: 36, borderRadius: 10, flexShrink: 0,
                      background: item.verified ? 'rgba(74,222,128,.1)' : 'rgba(245,158,11,.1)',
                      border: `1px solid ${item.verified ? 'rgba(74,222,128,.2)' : 'rgba(245,158,11,.2)'}`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: '.9rem',
                    }}>
                      {item.verified ? '✓' : '!'}
                    </div>
                    <div>
                      <p style={{ fontWeight: 700, color: IVORY, fontSize: '.875rem' }}>{item.title}</p>
                      <p style={{ fontSize: '.75rem', color: item.verified ? '#4ade80' : '#f59e0b', marginTop: '.15rem' }}>
                        {item.verified
                          ? (isAr ? 'مؤكد' : 'Verified')
                          : (isAr ? 'غير مؤكد — يرجى التحقق' : 'Not verified — action required')}
                      </p>
                    </div>
                  </div>
                  {item.action}
                </div>
              </div>
            ))}

            {/* Change password */}
            <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 20, padding: '1.5rem' }}>
              <h3 style={{ fontSize: '.9rem', fontWeight: 700, color: IVORY, marginBottom: '1.25rem' }}>{t('change_password')}</h3>
              <form onSubmit={handleChangePassword} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {[
                  { label: t('current_password'),     key: 'current' },
                  { label: t('new_password'),          key: 'newPw'   },
                  { label: t('confirm_new_password'),  key: 'confirm' },
                ].map(f => (
                  <InputField key={f.key} label={f.label} type={showPw ? 'text' : 'password'}
                    value={(pwForm as any)[f.key]}
                    onChange={v => setPwForm(p => ({ ...p, [f.key]: v }))} dir="ltr" />
                ))}
                <label style={{ display: 'flex', alignItems: 'center', gap: '.4rem', cursor: 'pointer', fontSize: '.78rem', color: DIM }}>
                  <input type="checkbox" checked={showPw} onChange={e => setShowPw(e.target.checked)} style={{ accentColor: GOLD }} />
                  {isAr ? 'إظهار كلمة المرور' : 'Show password'}
                </label>
                <div>
                  <button type="submit" disabled={savingPw || !pwForm.current || !pwForm.newPw} className="btn btn-gold" style={{ minWidth: 140 }}>
                    {savingPw ? '...' : t('save')}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
