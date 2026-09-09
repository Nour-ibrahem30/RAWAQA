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

/* ──────────────────────────────────────────────────────────── */
function ResendEmailButton({ isAr }: { locale?: string; isAr: boolean }) {
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const { showToast } = useToast();

  const handleResend = async () => {
    setSending(true);
    try {
      await authApi.sendEmailVerification();
      setSent(true);
      showToast(isAr ? 'تم إرسال رسالة التحقق' : 'Verification email sent', 'success');
    } catch (err: unknown) {
      showToast((err as Error).message || (isAr ? 'حدث خطأ' : 'Error'), 'error');
    } finally {
      setSending(false);
    }
  };

  if (sent) {
    return (
      <span style={{ fontSize: '.8rem', color: '#4ade80', fontWeight: 600 }}>
        {isAr ? '✓ تم الإرسال' : '✓ Sent'}
      </span>
    );
  }

  return (
    <button onClick={handleResend} disabled={sending} className="btn btn-gold btn-sm" style={{ fontSize: '.78rem' }}>
      {sending ? '...' : (isAr ? 'إرسال رابط التأكيد' : 'Resend Verification')}
    </button>
  );
}

const DARK   = '#0f0e0a';
const CARD   = 'rgba(30,27,21,.9)';
const BORDER = 'rgba(210,181,106,.1)';
const GOLD   = 'var(--gold-light)';
const IVORY  = 'var(--ivory)';

type Tab = 'orders' | 'profile' | 'addresses' | 'security';

const GOVERNORATES = [
  'cairo','giza','alexandria','qalyubia','dakahlia','sharqia','gharbia',
  'monufia','beheira','kafr_el_sheikh','damietta','port_said','ismailia',
  'suez','north_sinai','south_sinai','fayoum','beni_suef','minya','asyut',
  'sohag','qena','luxor','aswan','red_sea','new_valley','matruh',
];

/* ──────────────────────────────────────────────────────────── */
function InputField({ label, value, onChange, type = 'text', disabled = false, dir }: {
  label: string; value: string; onChange?: (v: string) => void;
  type?: string; disabled?: boolean; dir?: 'ltr' | 'rtl' | 'auto';
}) {
  return (
    <div>
      <label style={{ display: 'block', fontSize: '.65rem', letterSpacing: '.08em', textTransform: 'uppercase', color: 'rgba(247,244,236,.38)', marginBottom: '.4rem' }}>
        {label}
      </label>
      <input type={type} value={value} disabled={disabled}
        onChange={e => onChange?.(e.target.value)}
        dir={(dir || 'auto') as 'ltr' | 'auto'}
        style={{
          width: '100%', background: disabled ? 'rgba(255,255,255,.02)' : 'rgba(255,255,255,.05)',
          border: `1px solid ${disabled ? 'rgba(210,181,106,.06)' : BORDER}`,
          borderRadius: 12, padding: '.75rem 1rem', fontSize: '.875rem',
          color: disabled ? 'rgba(247,244,236,.3)' : IVORY,
          cursor: disabled ? 'not-allowed' : 'text',
          outline: 'none', fontFamily: 'inherit', transition: 'border-color 200ms',
        }}
        onFocus={e => !disabled && (e.currentTarget.style.borderColor = GOLD)}
        onBlur={e => (e.currentTarget.style.borderColor = disabled ? 'rgba(210,181,106,.06)' : BORDER)}
      />
    </div>
  );
}

/* ──────────────────────────────────────────────────────────── */
export default function AccountPage() {
  const t  = useTranslations('account');
  const tg = useTranslations('governorates');
  const ta = useTranslations('auth');
  const params = useParams();
  const router = useRouter();
  const locale = (params?.locale as string) || 'ar';
  const isAr = locale === 'ar';
  const { user, isLoggedIn, isLoading, refreshUser } = useAuth();
  const { showToast } = useToast();

  // State
  const [tab, setTab] = useState<Tab>('orders');
  const [orders, setOrders] = useState<Order[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(true);

  // Profile
  const [profileForm, setProfileForm] = useState({ name: '', phone: '' });
  const [savingProfile, setSavingProfile] = useState(false);

  // Addresses
  const [addresses, setAddresses] = useState<(ShippingAddressPayload & { id?: string })[]>([]);
  const [addrLoading, setAddrLoading] = useState(false);
  const [showAddrForm, setShowAddrForm] = useState(false);
  const [editingAddr, setEditingAddr] = useState<string | null>(null);
  const [addrForm, setAddrForm] = useState<ShippingAddressPayload>({
    firstName: '', lastName: '', phone: '', email: '', addressLine1: '', addressLine2: '', city: '', governorate: '', postalCode: '', isDefault: false,
  });
  const [savingAddr, setSavingAddr] = useState(false);
  const [deletingAddr, setDeletingAddr] = useState<string | null>(null);

  // Security
  const [pwForm, setPwForm] = useState({ current: '', newPw: '', confirm: '' });
  const [showPw, setShowPw] = useState(false);
  const [savingPw, setSavingPw] = useState(false);

  // Redirects
  useEffect(() => {
    if (!isLoading && !isLoggedIn) router.push(`/${locale}/login`);
  }, [isLoading, isLoggedIn, locale, router]);

  useEffect(() => {
    if (user) setProfileForm({ name: user.name, phone: user.phone });
  }, [user]);

  useEffect(() => {
    if (!isLoggedIn) return;
    ordersApi.myOrders(1, locale)
      .then(r => setOrders(r.data ?? []))
      .catch(() => setOrders([]))
      .finally(() => setOrdersLoading(false));
  }, [isLoggedIn, locale]);

  useEffect(() => {
    if (!isLoggedIn || tab !== 'addresses') return;
    setAddrLoading(true);
    addressesApi.list()
      .then(r => setAddresses((r.data as any) ?? []))
      .catch(() => setAddresses([]))
      .finally(() => setAddrLoading(false));
  }, [isLoggedIn, tab]);

  // ── Profile save
  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingProfile(true);
    try {
      await authApi.updateProfile(profileForm);
      await refreshUser();
      showToast(t('saved'), 'success');
    } catch {
      showToast(isAr ? 'حدث خطأ' : 'Error', 'error');
    } finally {
      setSavingProfile(false);
    }
  };

  // ── Address helpers
  const resetAddrForm = () => setAddrForm({ firstName: '', lastName: '', phone: '', email: '', addressLine1: '', addressLine2: '', city: '', governorate: '', postalCode: '', isDefault: false });

  const handleSaveAddress = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingAddr(true);
    try {
      if (editingAddr) {
        await addressesApi.update(editingAddr, addrForm);
      } else {
        await addressesApi.create(addrForm);
      }
      showToast(t('address_saved'), 'success');
      const r = await addressesApi.list();
      setAddresses((r.data as any) ?? []);
      setShowAddrForm(false);
      setEditingAddr(null);
      resetAddrForm();
    } catch (err: unknown) {
      showToast((err as Error).message || (isAr ? 'حدث خطأ' : 'Error'), 'error');
    } finally {
      setSavingAddr(false);
    }
  };

  const handleDeleteAddress = async (id: string) => {
    if (!confirm(isAr ? 'هل تريد حذف هذا العنوان؟' : 'Delete this address?')) return;
    setDeletingAddr(id);
    try {
      await addressesApi.remove(id);
      setAddresses(prev => prev.filter((a: any) => a._id !== id && a.id !== id));
      showToast(t('address_deleted'), 'success');
    } catch {
      showToast(isAr ? 'حدث خطأ' : 'Error', 'error');
    } finally {
      setDeletingAddr(null);
    }
  };

  const handleEditAddress = (addr: any) => {
    setEditingAddr(addr._id || addr.id);
    setAddrForm({
      firstName: addr.firstName || '', lastName: addr.lastName || '',
      phone: addr.phone || '', email: addr.email || '',
      addressLine1: addr.addressLine1 || '', addressLine2: addr.addressLine2 || '',
      city: addr.city || '', governorate: addr.governorate || '',
      postalCode: addr.postalCode || '', isDefault: addr.isDefault || false,
    });
    setShowAddrForm(true);
  };

  // ── Password change
  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (pwForm.newPw !== pwForm.confirm) {
      showToast(ta('password_mismatch'), 'error'); return;
    }
    setSavingPw(true);
    try {
      await authApi.changePassword(pwForm.current, pwForm.newPw);
      showToast(t('password_changed'), 'success');
      setPwForm({ current: '', newPw: '', confirm: '' });
    } catch (err: unknown) {
      showToast((err as Error).message || (isAr ? 'كلمة المرور الحالية غير صحيحة' : 'Incorrect current password'), 'error');
    } finally {
      setSavingPw(false);
    }
  };

  if (isLoading || !user) return (
    <div className="wrap pt-32 pb-20">
      <div className="skeleton h-8 w-48 rounded mb-8" style={{ background: 'rgba(255,255,255,.04)' }} />
      <div className="skeleton h-64 rounded-2xl" style={{ background: 'rgba(255,255,255,.04)' }} />
    </div>
  );

  const TABS: { key: Tab; label: string }[] = [
    { key: 'orders',    label: t('orders') },
    { key: 'profile',   label: t('profile') },
    { key: 'addresses', label: t('addresses') },
    { key: 'security',  label: t('security') },
  ];

  return (
    <div style={{ background: DARK, minHeight: '100vh', color: IVORY }}>
      <div className="wrap pt-24 sm:pt-28 pb-12 sm:pb-20">

        {/* Header */}
        <h1 className="display-3" style={{ color: IVORY, marginBottom: '.5rem' }}>{t('title')}</h1>
        <p style={{ color: 'rgba(247,244,236,.4)', marginBottom: '2rem' }}>{user.email}</p>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: 0, borderBottom: `1px solid ${BORDER}`, marginBottom: '2rem', overflowX: 'auto' }}>
          {TABS.map(({ key, label }) => (
            <button key={key} onClick={() => setTab(key)}
              style={{
                padding: '.65rem 1.25rem', fontSize: '.85rem', fontWeight: 600,
                cursor: 'pointer', background: 'none', border: 'none', whiteSpace: 'nowrap',
                color: tab === key ? GOLD : 'rgba(247,244,236,.38)',
                borderBottom: `2px solid ${tab === key ? GOLD : 'transparent'}`,
                marginBottom: -1, transition: 'all 250ms ease',
              }}>
              {label}
            </button>
          ))}
        </div>

        {/* ── ORDERS ─────────────────────────────────────────────── */}
        {tab === 'orders' && (
          ordersLoading ? (
            <div className="flex flex-col gap-3">
              {[1,2,3].map(i => <div key={i} className="skeleton h-16 rounded-xl" style={{ background: 'rgba(255,255,255,.04)' }} />)}
            </div>
          ) : orders.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '4rem 0' }}>
              <p style={{ fontSize: '1rem', fontWeight: 600, color: 'rgba(247,244,236,.5)', marginBottom: '.5rem' }}>{t('no_orders')}</p>
              <p style={{ fontSize: '.875rem', color: 'rgba(247,244,236,.3)', marginBottom: '1.5rem' }}>{t('no_orders_sub')}</p>
              <Link href={`/${locale}/shop`} className="btn btn-gold btn-sm">{isAr ? 'تسوق الآن' : 'Shop Now'}</Link>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {orders.map(order => (
                <Link key={order.id} href={`/${locale}/track?order=${order.orderNumber}`}
                  className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-4 sm:p-5 rounded-2xl transition-all"
                  style={{ border: `1px solid ${BORDER}`, background: CARD, textDecoration: 'none' }}
                  onMouseEnter={e => (e.currentTarget.style.borderColor = 'rgba(210,181,106,.3)')}
                  onMouseLeave={e => (e.currentTarget.style.borderColor = BORDER)}>
                  <div>
                    <p style={{ fontFamily: 'monospace', fontWeight: 700, color: GOLD, letterSpacing: '.06em' }}>{order.orderNumber}</p>
                    <p style={{ fontSize: '.72rem', color: 'rgba(247,244,236,.35)', marginTop: '.2rem' }}>
                      {new Date(order.createdAt).toLocaleDateString(isAr ? 'ar-EG' : 'en-EG')}
                    </p>
                  </div>
                  <div className="flex items-center justify-between sm:justify-end w-full sm:w-auto gap-3 pt-2 sm:pt-0 border-t sm:border-t-0 border-white/5">
                    <span className={`text-xs font-semibold px-2.5 py-1 rounded-pill ${orderStatusColor(order.status)}`}>
                      {orderStatusLabel(order.status, locale)}
                    </span>
                    <span style={{ fontWeight: 800, color: GOLD }}>{formatPrice(order.total, locale)}</span>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="rgba(247,244,236,.25)" strokeWidth="2">
                      <path d={isAr ? 'M15 18l-6-6 6-6' : 'M9 18l6-6-6-6'}/>
                    </svg>
                  </div>
                </Link>
              ))}
            </div>
          )
        )}

        {/* ── PROFILE ─────────────────────────────────────────────── */}
        {tab === 'profile' && (
          <form onSubmit={handleSaveProfile} style={{ maxWidth: 480, display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <InputField label={isAr ? 'الاسم' : 'Name'} value={profileForm.name} onChange={v => setProfileForm(f => ({ ...f, name: v }))} />
            <InputField label={isAr ? 'الهاتف' : 'Phone'} value={profileForm.phone} onChange={v => setProfileForm(f => ({ ...f, phone: v }))} dir="ltr" />
            <InputField label={isAr ? 'البريد الإلكتروني' : 'Email'} value={user.email} disabled />
            <button type="submit" disabled={savingProfile} className="btn btn-gold" style={{ alignSelf: 'flex-start' }}>
              {savingProfile ? '...' : t('save')}
            </button>
          </form>
        )}

        {/* ── ADDRESSES ─────────────────────────────────────────────── */}
        {tab === 'addresses' && (
          <div style={{ maxWidth: 600 }}>
            {addrLoading ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '.75rem' }}>
                {[1,2].map(i => <div key={i} className="skeleton" style={{ height: 80, borderRadius: 16, background: 'rgba(255,255,255,.04)' }} />)}
              </div>
            ) : (
              <>
                {addresses.length === 0 && !showAddrForm && (
                  <p style={{ color: 'rgba(247,244,236,.4)', fontSize: '.9rem', marginBottom: '1.5rem' }}>{t('no_addresses')}</p>
                )}
                {addresses.map((addr: any) => {
                  const addrId = addr._id || addr.id;
                  return (
                    <div key={addrId} style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 16, padding: '1rem 1.25rem', marginBottom: '.75rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem' }}>
                      <div style={{ flex: 1 }}>
                        <p style={{ fontWeight: 700, color: IVORY, fontSize: '.9rem' }}>{addr.firstName} {addr.lastName}</p>
                        <p style={{ fontSize: '.82rem', color: 'rgba(247,244,236,.5)', marginTop: '.25rem' }}>
                          {addr.addressLine1}{addr.addressLine2 ? `, ${addr.addressLine2}` : ''}, {addr.city}
                        </p>
                        <p style={{ fontSize: '.78rem', color: 'rgba(247,244,236,.35)', marginTop: '.15rem' }}>
                          {tg(addr.governorate as any)} · {addr.phone}
                        </p>
                        {addr.isDefault && (
                          <span style={{ display: 'inline-block', marginTop: '.5rem', fontSize: '.62rem', background: 'rgba(210,181,106,.12)', border: `1px solid rgba(210,181,106,.25)`, color: GOLD, padding: '.15rem .55rem', borderRadius: 999, fontWeight: 600 }}>
                            {t('default_address')}
                          </span>
                        )}
                      </div>
                      <div style={{ display: 'flex', gap: '.5rem', flexShrink: 0 }}>
                        <button onClick={() => handleEditAddress(addr)}
                          style={{ background: 'none', border: `1px solid ${BORDER}`, borderRadius: 8, padding: '.35rem .7rem', cursor: 'pointer', color: 'rgba(247,244,236,.5)', fontSize: '.72rem', transition: 'all 200ms' }}
                          onMouseEnter={e => (e.currentTarget.style.borderColor = 'rgba(210,181,106,.4)')}
                          onMouseLeave={e => (e.currentTarget.style.borderColor = BORDER)}>
                          {isAr ? 'تعديل' : 'Edit'}
                        </button>
                        <button onClick={() => handleDeleteAddress(addrId)} disabled={deletingAddr === addrId}
                          style={{ background: 'none', border: '1px solid rgba(248,113,113,.2)', borderRadius: 8, padding: '.35rem .7rem', cursor: 'pointer', color: 'rgba(248,113,113,.6)', fontSize: '.72rem', transition: 'all 200ms' }}
                          onMouseEnter={e => (e.currentTarget.style.background = 'rgba(248,113,113,.08)')}
                          onMouseLeave={e => (e.currentTarget.style.background = 'none')}>
                          {deletingAddr === addrId ? '...' : (isAr ? 'حذف' : 'Delete')}
                        </button>
                      </div>
                    </div>
                  );
                })}

                {/* Add/Edit form */}
                {showAddrForm ? (
                  <form onSubmit={handleSaveAddress} className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-5 sm:p-6 rounded-2xl mt-4" style={{ background: CARD, border: `1px solid ${BORDER}` }}>
                    <h3 style={{ gridColumn: '1/-1', fontSize: '.9rem', fontWeight: 700, color: IVORY }}>
                      {editingAddr ? (isAr ? 'تعديل العنوان' : 'Edit Address') : t('add_address')}
                    </h3>
                    {[
                      { label: t('first_name'), key: 'firstName' },
                      { label: t('last_name'), key: 'lastName' },
                    ].map(f => (
                      <InputField key={f.key} label={f.label} value={(addrForm as any)[f.key]}
                        onChange={v => setAddrForm(prev => ({ ...prev, [f.key]: v }))} />
                    ))}
                    <div style={{ gridColumn: '1/-1' }}>
                      <InputField label={isAr ? 'رقم الهاتف' : 'Phone'} value={addrForm.phone}
                        onChange={v => setAddrForm(prev => ({ ...prev, phone: v }))} dir="ltr" />
                    </div>
                    <div style={{ gridColumn: '1/-1' }}>
                      <InputField label={t('address_line1')} value={addrForm.addressLine1}
                        onChange={v => setAddrForm(prev => ({ ...prev, addressLine1: v }))} />
                    </div>
                    <div style={{ gridColumn: '1/-1' }}>
                      <InputField label={t('address_line2')} value={addrForm.addressLine2 || ''}
                        onChange={v => setAddrForm(prev => ({ ...prev, addressLine2: v }))} />
                    </div>
                    <InputField label={t('city')} value={addrForm.city}
                      onChange={v => setAddrForm(prev => ({ ...prev, city: v }))} />
                    <div>
                      <label style={{ display: 'block', fontSize: '.65rem', letterSpacing: '.08em', textTransform: 'uppercase', color: 'rgba(247,244,236,.38)', marginBottom: '.4rem' }}>
                        {t('governorate')}
                      </label>
                      <select value={addrForm.governorate} onChange={e => setAddrForm(prev => ({ ...prev, governorate: e.target.value }))} required
                        style={{ width: '100%', background: 'rgba(255,255,255,.05)', border: `1px solid ${BORDER}`, borderRadius: 12, padding: '.75rem 1rem', fontSize: '.875rem', color: addrForm.governorate ? IVORY : 'rgba(247,244,236,.3)', outline: 'none', fontFamily: 'inherit' }}>
                        <option value="" disabled>{isAr ? 'اختر المحافظة' : 'Select Governorate'}</option>
                        {GOVERNORATES.map(g => <option key={g} value={g}>{tg(g as any)}</option>)}
                      </select>
                    </div>
                    <div style={{ gridColumn: '1/-1', display: 'flex', gap: '.75rem', marginTop: '.25rem' }}>
                      <button type="submit" disabled={savingAddr} className="btn btn-gold btn-sm">
                        {savingAddr ? '...' : (isAr ? 'حفظ العنوان' : 'Save Address')}
                      </button>
                      <button type="button" onClick={() => { setShowAddrForm(false); setEditingAddr(null); resetAddrForm(); }} className="btn btn-line-dark btn-sm">
                        {isAr ? 'إلغاء' : 'Cancel'}
                      </button>
                    </div>
                  </form>
                ) : (
                  <button onClick={() => { setShowAddrForm(true); setEditingAddr(null); resetAddrForm(); }} className="btn btn-gold btn-sm" style={{ marginTop: '1rem' }}>
                    + {t('add_address')}
                  </button>
                )}
              </>
            )}
          </div>
        )}

        {/* ── SECURITY ─────────────────────────────────────────────── */}
        {tab === 'security' && (
          <div style={{ maxWidth: 480, display: 'flex', flexDirection: 'column', gap: '2.5rem' }}>
            {/* Email verification status */}
            <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 20, padding: '1.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
                <div>
                  <p style={{ fontWeight: 700, color: IVORY, marginBottom: '.35rem' }}>
                    {isAr ? 'التحقق من البريد الإلكتروني' : 'Email Verification'}
                  </p>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '.5rem' }}>
                    <span style={{ width: 7, height: 7, borderRadius: '50%', background: (user as any).isEmailVerified ? '#4ade80' : '#f59e0b', flexShrink: 0 }} />
                    <p style={{ fontSize: '.82rem', color: 'rgba(247,244,236,.45)' }}>
                      {(user as any).isEmailVerified
                        ? (isAr ? 'البريد الإلكتروني مؤكد' : 'Email verified')
                        : (isAr ? 'البريد الإلكتروني غير مؤكد' : 'Email not verified')}
                    </p>
                  </div>
                </div>
                {!(user as any).isEmailVerified && (
                  <ResendEmailButton locale={locale} isAr={isAr} />
                )}
              </div>
            </div>

            {/* Phone verification status */}
            <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 20, padding: '1.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
                <div>
                  <p style={{ fontWeight: 700, color: IVORY, marginBottom: '.35rem' }}>
                    {isAr ? 'التحقق من رقم الهاتف' : 'Phone Verification'}
                  </p>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '.5rem' }}>
                    <span style={{ width: 7, height: 7, borderRadius: '50%', background: (user as any).isPhoneVerified ? '#4ade80' : '#f59e0b', flexShrink: 0 }} />
                    <p style={{ fontSize: '.82rem', color: 'rgba(247,244,236,.45)' }}>
                      {(user as any).isPhoneVerified ? t('phone_verified') : t('phone_not_verified')}
                    </p>
                  </div>
                </div>
                {!(user as any).isPhoneVerified && (
                  <Link href={`/${locale}/verify-phone`} className="btn btn-gold btn-sm">
                    {t('verify_phone')}
                  </Link>
                )}
              </div>
            </div>

            {/* Change password */}
            <form onSubmit={handleChangePassword} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <h3 style={{ fontSize: '.95rem', fontWeight: 700, color: IVORY, marginBottom: '.25rem' }}>{t('change_password')}</h3>
              {[
                { label: t('current_password'), key: 'current' },
                { label: t('new_password'), key: 'newPw' },
                { label: t('confirm_new_password'), key: 'confirm' },
              ].map(f => (
                <InputField key={f.key} label={f.label} type={showPw ? 'text' : 'password'} value={(pwForm as any)[f.key]}
                  onChange={v => setPwForm(prev => ({ ...prev, [f.key]: v }))} dir="ltr" />
              ))}
              <div style={{ display: 'flex', alignItems: 'center', gap: '.75rem' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '.4rem', cursor: 'pointer', fontSize: '.78rem', color: 'rgba(247,244,236,.4)' }}>
                  <input type="checkbox" checked={showPw} onChange={e => setShowPw(e.target.checked)}
                    style={{ accentColor: 'var(--gold-light)' }} />
                  {isAr ? 'إظهار كلمة المرور' : 'Show password'}
                </label>
              </div>
              <button type="submit" disabled={savingPw || !pwForm.current || !pwForm.newPw} className="btn btn-gold" style={{ alignSelf: 'flex-start' }}>
                {savingPw ? '...' : t('save')}
              </button>
            </form>
          </div>
        )}

      </div>
    </div>
  );
}
