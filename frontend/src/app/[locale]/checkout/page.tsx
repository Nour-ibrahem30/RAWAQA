'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useCart } from '@/context/CartContext';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { formatPrice } from '@/lib/utils';

const DARK   = '#0f0e0a';
const CARD   = 'rgba(30,27,21,.95)';
const BORDER = 'rgba(210,181,106,.1)';
const IVORY  = 'var(--ivory)';
const GOLD   = 'var(--gold-light)';
const FREE   = 3000;

const GOVERNORATES = [
  'cairo','giza','alexandria','qalyubia','dakahlia','sharqia','gharbia',
  'monufia','beheira','kafr_el_sheikh','damietta','port_said','ismailia',
  'suez','fayoum','beni_suef','minya','asyut','sohag','qena','luxor',
  'aswan','red_sea','north_sinai','south_sinai','new_valley','matruh',
];

const GOV_AR: Record<string, string> = {
  cairo:'القاهرة',giza:'الجيزة',alexandria:'الإسكندرية',qalyubia:'القليوبية',
  dakahlia:'الدقهلية',sharqia:'الشرقية',gharbia:'الغربية',monufia:'المنوفية',
  beheira:'البحيرة',kafr_el_sheikh:'كفر الشيخ',damietta:'دمياط',
  port_said:'بورسعيد',ismailia:'الإسماعيلية',suez:'السويس',
  fayoum:'الفيوم',beni_suef:'بني سويف',minya:'المنيا',asyut:'أسيوط',
  sohag:'سوهاج',qena:'قنا',luxor:'الأقصر',aswan:'أسوان',red_sea:'البحر الأحمر',
  north_sinai:'شمال سيناء',south_sinai:'جنوب سيناء',new_valley:'الوادي الجديد',matruh:'مطروح',
};

export default function CheckoutPage() {
  const t    = useTranslations('checkout');
  const params = useParams();
  const router = useRouter();
  const locale = (params?.locale as string) || 'ar';
  const isAr   = locale === 'ar';

  const { cart, clearCart } = useCart();
  const { user } = useAuth();
  const { showToast } = useToast();

  const [form, setForm] = useState({
    recipientName: user?.name || '',
    phone:         user?.phone || '',
    email:         user?.email || '',
    streetAddress: '',
    city:          '',
    governorate:   '',
    notes:         '',
  });
  const [errors, setErrors] = useState<Partial<typeof form>>({});
  const [placing, setPlacing] = useState(false);

  const sub      = cart?.subtotal ?? 0;
  const shipping = sub >= FREE ? 0 : sub > 0 ? 50 : 0;
  const total    = sub + shipping;

  const set = (k: keyof typeof form) => (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    setForm(f => ({ ...f, [k]: e.target.value }));
    if (errors[k]) setErrors(er => ({ ...er, [k]: undefined }));
  };

  const validate = () => {
    const e: Partial<typeof form> = {};
    if (!form.recipientName.trim()) e.recipientName = t('required');
    if (!form.phone.trim()) e.phone = t('required');
    else if (!/^(\+20|0)[0-9]{9,10}$/.test(form.phone.replace(/\s/g, ''))) e.phone = t('invalid_phone');
    if (!form.streetAddress.trim()) e.streetAddress = t('required');
    if (!form.city.trim()) e.city = t('required');
    if (!form.governorate) e.governorate = t('required');
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    // ─── Auth guard — must be logged in to checkout ───────────────────────
    if (!user) {
      showToast(
        isAr ? 'يجب تسجيل الدخول أولاً للمتابعة' : 'Please sign in to complete your order',
        'error'
      );
      router.push(`/${locale}/login`);
      return;
    }
    // ─────────────────────────────────────────────────────────────────────
    if (!cart || cart.items.length === 0) {
      showToast(isAr ? 'السلة فارغة' : 'Cart is empty', 'error');
      return;
    }
    setPlacing(true);
    try {
      // Simulate order creation (replace with real API when backend is ready)
      await new Promise(r => setTimeout(r, 800));
      const orderNumber = `RWQ${Date.now().toString().slice(-8)}`;
      await clearCart();
      router.push(`/${locale}/order-confirmation/${orderNumber}`);
    } catch (err: unknown) {
      showToast((err as Error).message || t('error'), 'error');
    } finally {
      setPlacing(false);
    }
  };

  const inputStyle = (k?: keyof typeof form): React.CSSProperties => ({
    width: '100%',
    background: 'rgba(255,255,255,.05)',
    border: `1px solid ${k && errors[k] ? '#f87171' : BORDER}`,
    borderRadius: 12,
    padding: '.75rem 1rem',
    fontSize: '.875rem',
    color: IVORY,
    outline: 'none',
    transition: 'border-color 250ms ease',
    fontFamily: 'inherit',
  });

  const labelStyle: React.CSSProperties = {
    fontSize: '.72rem', letterSpacing: '.08em', textTransform: 'uppercase',
    color: 'rgba(247,244,236,.38)', marginBottom: '.4rem', display: 'block',
  };

  return (
    <div style={{ background: DARK, minHeight: '100vh', color: IVORY }}>
      <div aria-hidden style={{ position:'fixed',inset:0,pointerEvents:'none', background:'radial-gradient(ellipse 50% 35% at 50% 10%, rgba(173,138,76,.07) 0%, transparent 70%)' }} />

      <div className="wrap" style={{ paddingTop: '7.5rem', paddingBottom: '5rem', position: 'relative' }}>
        <h1 className="display-3" style={{ color: IVORY, marginBottom: '2.5rem' }}>{t('title')}</h1>

        {/* Auth warning banner */}
        {!user && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: '1rem',
            background: 'rgba(248,113,113,.08)', border: '1px solid rgba(248,113,113,.25)',
            borderRadius: 14, padding: '1rem 1.25rem', marginBottom: '2rem',
          }}>
            <span style={{ fontSize: '1.25rem' }}>🔒</span>
            <div style={{ flex: 1 }}>
              <p style={{ fontWeight: 700, color: '#fca5a5', fontSize: '.9rem', marginBottom: '.2rem' }}>
                {isAr ? 'يجب تسجيل الدخول للمتابعة' : 'Sign in required to place an order'}
              </p>
              <p style={{ fontSize: '.78rem', color: 'rgba(252,165,165,.65)' }}>
                {isAr ? 'سجّل دخولك أو أنشئ حساباً جديداً' : 'Please sign in or create a new account'}
              </p>
            </div>
            <div style={{ display: 'flex', gap: '.5rem', flexShrink: 0 }}>
              <a href={`/${locale}/login`} className="btn btn-gold btn-sm" style={{ fontSize: '.75rem', padding: '.55rem 1.1rem' }}>
                {isAr ? 'تسجيل الدخول' : 'Sign In'}
              </a>
              <a href={`/${locale}/register`} className="btn btn-line-dark btn-sm" style={{ fontSize: '.75rem', padding: '.55rem 1.1rem' }}>
                {isAr ? 'حساب جديد' : 'Register'}
              </a>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} noValidate>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '2rem', alignItems: 'start' }}>

            {/* ── Left: Form ── */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

              {/* Customer info */}
              <section style={{ background: CARD, borderRadius: 20, padding: '1.75rem', border: `1px solid ${BORDER}` }}>
                <h2 style={{ fontWeight: 700, color: IVORY, marginBottom: '1.25rem', fontSize: '.95rem', letterSpacing: '.04em' }}>
                  {t('customer_info')}
                </h2>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div style={{ gridColumn: 'span 1' }}>
                    <label style={labelStyle}>{t('full_name')} *</label>
                    <input value={form.recipientName} onChange={set('recipientName')} style={inputStyle('recipientName')}
                      onFocus={e=>(e.currentTarget.style.borderColor=GOLD)} onBlur={e=>(e.currentTarget.style.borderColor=errors.recipientName?'#f87171':BORDER)} />
                    {errors.recipientName && <p style={{ fontSize:'.72rem',color:'#f87171',marginTop:'.25rem' }}>{errors.recipientName}</p>}
                  </div>
                  <div>
                    <label style={labelStyle}>{t('phone')} *</label>
                    <input value={form.phone} onChange={set('phone')} dir="ltr" placeholder="01xxxxxxxxx" style={inputStyle('phone')}
                      onFocus={e=>(e.currentTarget.style.borderColor=GOLD)} onBlur={e=>(e.currentTarget.style.borderColor=errors.phone?'#f87171':BORDER)} />
                    {errors.phone && <p style={{ fontSize:'.72rem',color:'#f87171',marginTop:'.25rem' }}>{errors.phone}</p>}
                  </div>
                  <div style={{ gridColumn: 'span 2' }}>
                    <label style={labelStyle}>{t('email')}</label>
                    <input value={form.email} onChange={set('email')} type="email" dir="ltr" style={inputStyle()}
                      onFocus={e=>(e.currentTarget.style.borderColor=GOLD)} onBlur={e=>(e.currentTarget.style.borderColor=BORDER)} />
                  </div>
                </div>
              </section>

              {/* Delivery address */}
              <section style={{ background: CARD, borderRadius: 20, padding: '1.75rem', border: `1px solid ${BORDER}` }}>
                <h2 style={{ fontWeight: 700, color: IVORY, marginBottom: '1.25rem', fontSize: '.95rem', letterSpacing: '.04em' }}>
                  {t('delivery')}
                </h2>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div>
                    <label style={labelStyle}>{t('governorate')} *</label>
                    <select value={form.governorate} onChange={set('governorate')}
                      style={{ ...inputStyle('governorate'), appearance: 'none', cursor: 'pointer' }}
                      onFocus={e=>(e.currentTarget.style.borderColor=GOLD)} onBlur={e=>(e.currentTarget.style.borderColor=errors.governorate?'#f87171':BORDER)}>
                      <option value="" style={{ background:'#1a1710' }}>{t('select_governorate')}</option>
                      {GOVERNORATES.map(g => (
                        <option key={g} value={g} style={{ background:'#1a1710', color: IVORY }}>
                          {isAr ? GOV_AR[g] || g : g.replace(/_/g,' ').replace(/\b\w/g,c=>c.toUpperCase())}
                        </option>
                      ))}
                    </select>
                    {errors.governorate && <p style={{ fontSize:'.72rem',color:'#f87171',marginTop:'.25rem' }}>{errors.governorate}</p>}
                  </div>
                  <div>
                    <label style={labelStyle}>{t('city')} *</label>
                    <input value={form.city} onChange={set('city')} style={inputStyle('city')}
                      onFocus={e=>(e.currentTarget.style.borderColor=GOLD)} onBlur={e=>(e.currentTarget.style.borderColor=errors.city?'#f87171':BORDER)} />
                    {errors.city && <p style={{ fontSize:'.72rem',color:'#f87171',marginTop:'.25rem' }}>{errors.city}</p>}
                  </div>
                  <div style={{ gridColumn: 'span 2' }}>
                    <label style={labelStyle}>{t('street')} *</label>
                    <input value={form.streetAddress} onChange={set('streetAddress')} style={inputStyle('streetAddress')}
                      onFocus={e=>(e.currentTarget.style.borderColor=GOLD)} onBlur={e=>(e.currentTarget.style.borderColor=errors.streetAddress?'#f87171':BORDER)} />
                    {errors.streetAddress && <p style={{ fontSize:'.72rem',color:'#f87171',marginTop:'.25rem' }}>{errors.streetAddress}</p>}
                  </div>
                  <div style={{ gridColumn: 'span 2' }}>
                    <label style={labelStyle}>{t('notes')}</label>
                    <textarea value={form.notes} onChange={set('notes')} rows={2}
                      style={{ ...inputStyle(), resize: 'none' as const }}
                      onFocus={e=>(e.currentTarget.style.borderColor=GOLD)} onBlur={e=>(e.currentTarget.style.borderColor=BORDER)} />
                  </div>
                </div>
              </section>

              {/* Payment */}
              <section style={{ background: CARD, borderRadius: 20, padding: '1.75rem', border: `1px solid ${BORDER}` }}>
                <h2 style={{ fontWeight: 700, color: IVORY, marginBottom: '1.25rem', fontSize: '.95rem', letterSpacing: '.04em' }}>
                  {t('payment')}
                </h2>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '1rem', borderRadius: 12, border: `1.5px solid rgba(210,181,106,.3)`, background: 'rgba(210,181,106,.06)' }}>
                  <div style={{ width: 10, height: 10, borderRadius: '50%', background: GOLD, boxShadow: `0 0 8px ${GOLD}` }} />
                  <div>
                    <p style={{ fontWeight: 600, color: IVORY, fontSize: '.9rem' }}>{t('cod')}</p>
                    <p style={{ fontSize: '.75rem', color: 'rgba(247,244,236,.4)' }}>
                      {isAr ? 'ادفع عند استلام الطلب' : 'Pay when you receive your order'}
                    </p>
                  </div>
                </div>
              </section>
            </div>

            {/* ── Right: Summary ── */}
            <div style={{ position: 'sticky', top: '6.5rem' }}>
              <div style={{ background: CARD, borderRadius: 20, padding: '1.75rem', border: `1px solid ${BORDER}` }}>
                <h2 style={{ fontWeight: 700, color: IVORY, fontSize: '.95rem', letterSpacing: '.04em', marginBottom: '1.5rem' }}>
                  {t('order_summary')}
                </h2>

                {/* Items */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '.75rem', marginBottom: '1.25rem' }}>
                  {cart?.items.map(item => (
                    <div key={item.product.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '.82rem' }}>
                      <span style={{ color: 'rgba(247,244,236,.6)', flex: 1 }}>
                        {locale === 'ar' ? item.product.nameAr : item.product.nameEn} × {item.quantity}
                      </span>
                      <span style={{ fontWeight: 600, color: IVORY, marginInlineStart: '.75rem', flexShrink: 0 }}>
                        {formatPrice(item.total, locale)}
                      </span>
                    </div>
                  ))}
                </div>

                {/* Totals */}
                <div style={{ borderTop: `1px solid ${BORDER}`, paddingTop: '1rem', display: 'flex', flexDirection: 'column', gap: '.75rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '.85rem' }}>
                    <span style={{ color: 'rgba(247,244,236,.5)' }}>{isAr?'المجموع الفرعي':'Subtotal'}</span>
                    <span style={{ color: IVORY, fontWeight: 600 }}>{formatPrice(sub, locale)}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '.85rem' }}>
                    <span style={{ color: 'rgba(247,244,236,.5)' }}>{isAr?'الشحن':'Shipping'}</span>
                    <span style={{ color: shipping===0?'#4ade80':IVORY, fontWeight: 600 }}>
                      {shipping===0 ? (isAr?'مجاني':'Free') : formatPrice(shipping, locale)}
                    </span>
                  </div>
                  <div style={{ borderTop:`1px solid ${BORDER}`,paddingTop:'.875rem',display:'flex',justifyContent:'space-between',alignItems:'center' }}>
                    <span style={{ fontWeight: 700, color: IVORY }}>{isAr?'الإجمالي':'Total'}</span>
                    <span style={{ fontWeight: 800, fontSize: '1.25rem', color: GOLD }}>{formatPrice(total, locale)}</span>
                  </div>
                </div>

                <button type="submit" disabled={placing} className="btn btn-gold btn-block" style={{ marginTop: '1.25rem', fontSize: '.875rem' }}>
                  {placing ? t('placing') : t('place_order')}
                </button>

                <p style={{ textAlign: 'center', fontSize: '.68rem', color: 'rgba(247,244,236,.25)', marginTop: '.875rem' }}>
                  🔒 {isAr ? 'بياناتك آمنة ومحمية' : 'Your data is safe and secure'}
                </p>
              </div>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
