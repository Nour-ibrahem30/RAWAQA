'use client';

import { useEffect, useState } from 'react';
import { useParams, useSearchParams, useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { ordersApi, paymentsApi } from '@/lib/api';
import { useToast } from '@/context/ToastContext';
import { formatPrice } from '@/lib/utils';

const DARK   = '#0f0e0a';
const CARD   = 'rgba(30,27,21,.95)';
const BORDER = 'rgba(210,181,106,.1)';
const IVORY  = 'var(--ivory)';
const GOLD   = 'var(--gold-light)';

export default function CheckoutFailurePage() {
  const t = useTranslations('checkout');
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const locale = (params?.locale as string) || 'ar';
  const isAr = locale === 'ar';
  const { showToast } = useToast();

  const orderId = searchParams.get('orderId');

  const [order, setOrder] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [retrying, setRetrying] = useState(false);

  useEffect(() => {
    const fetchOrder = async () => {
      if (!orderId) {
        setLoading(false);
        return;
      }

      try {
        const res = await ordersApi.get(orderId, locale);
        setOrder(res.data);
      } catch (err) {
        console.error('Failed to fetch order:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchOrder();
  }, [orderId, locale]);

  const handleRetryPayment = async () => {
    if (!orderId || !order) return;

    setRetrying(true);
    try {
      const res = await paymentsApi.createSession(orderId);
      // Redirect to Kashier
      window.location.href = res.data.paymentUrl;
    } catch (err: unknown) {
      showToast(
        (err as Error).message || (isAr ? 'فشل في إنشاء جلسة دفع جديدة' : 'Failed to create new payment session'),
        'error'
      );
      setRetrying(false);
    }
  };

  if (loading) {
    return (
      <div style={{ background: DARK, minHeight: '100vh', color: IVORY, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>⏳</div>
          <p style={{ color: 'rgba(247,244,236,.6)' }}>
            {isAr ? 'جاري التحميل...' : 'Loading...'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ background: DARK, minHeight: '100vh', color: IVORY }}>
      <div aria-hidden style={{ position:'fixed',inset:0,pointerEvents:'none', background:'radial-gradient(ellipse 50% 35% at 50% 10%, rgba(248,113,113,.05) 0%, transparent 70%)' }} />

      <div className="wrap" style={{ paddingTop: '10rem', paddingBottom: '5rem', position: 'relative' }}>
        <div style={{ maxWidth: 600, margin: '0 auto', textAlign: 'center' }}>
          {/* Failure Icon */}
          <div style={{
            width: 100, height: 100, borderRadius: '50%',
            background: 'rgba(248,113,113,.1)', border: '2px solid rgba(248,113,113,.3)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 2rem', fontSize: '3rem',
          }}>
            ❌
          </div>

          <h1 className="display-4" style={{ color: '#f87171', marginBottom: '1rem' }}>
            {isAr ? 'فشل الدفع' : 'Payment Failed'}
          </h1>
          
          <p style={{ fontSize: '1.1rem', color: 'rgba(247,244,236,.7)', marginBottom: '2.5rem' }}>
            {isAr 
              ? 'للأسف، لم تتم عملية الدفع. يمكنك المحاولة مرة أخرى.'
              : 'Unfortunately, the payment was not completed. You can try again.'}
          </p>

          {order && (
            <div style={{ background: CARD, borderRadius: 20, padding: '2rem', border: `1px solid ${BORDER}`, textAlign: isAr ? 'right' : 'left', marginBottom: '2rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', paddingBottom: '1rem', borderBottom: `1px solid ${BORDER}` }}>
                <span style={{ color: 'rgba(247,244,236,.5)', fontSize: '.85rem' }}>
                  {isAr ? 'رقم الطلب' : 'Order Number'}
                </span>
                <span style={{ fontWeight: 700, color: GOLD, fontSize: '1.1rem', fontFamily: 'monospace' }}>
                  {order.orderNumber}
                </span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <span style={{ color: 'rgba(247,244,236,.5)', fontSize: '.85rem' }}>
                  {isAr ? 'الحالة' : 'Status'}
                </span>
                <span style={{
                  background: 'rgba(248,113,113,.15)',
                  color: '#f87171',
                  padding: '.35rem .75rem',
                  borderRadius: 8,
                  fontSize: '.8rem',
                  fontWeight: 600,
                }}>
                  {isAr ? 'في انتظار الدفع' : 'Pending Payment'}
                </span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '1rem', borderTop: `1px solid ${BORDER}` }}>
                <span style={{ fontWeight: 600, color: IVORY }}>
                  {isAr ? 'الإجمالي' : 'Total'}
                </span>
                <span style={{ fontWeight: 800, fontSize: '1.25rem', color: GOLD }}>
                  {formatPrice(order.total, locale)}
                </span>
              </div>
            </div>
          )}

          <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
            {order && order.status !== 'cancelled' && (
              <button
                onClick={handleRetryPayment}
                disabled={retrying}
                className="btn btn-gold"
                style={{ opacity: retrying ? 0.6 : 1 }}
              >
                {retrying ? (isAr ? 'جاري المعالجة...' : 'Processing...') : (isAr ? 'إعادة محاولة الدفع' : 'Retry Payment')}
              </button>
            )}
            <a href={`/${locale}/shop`} className="btn btn-line-dark">
              {isAr ? 'تابع التسوق' : 'Continue Shopping'}
            </a>
          </div>

          {/* Help section */}
          <div style={{
            marginTop: '3rem', padding: '1.5rem', borderRadius: 16,
            background: 'rgba(255,255,255,.02)', border: `1px solid ${BORDER}`,
          }}>
            <h3 style={{ fontSize: '.9rem', fontWeight: 600, marginBottom: '.75rem', color: IVORY }}>
              {isAr ? 'هل تحتاج مساعدة؟' : 'Need Help?'}
            </h3>
            <p style={{ fontSize: '.8rem', color: 'rgba(247,244,236,.5)', marginBottom: '1rem' }}>
              {isAr 
                ? 'إذا استمرت المشكلة، يمكنك التواصل معنا'
                : 'If the problem persists, please contact us'}
            </p>
            <a 
              href="mailto:support@rawaqa.com" 
              style={{ color: GOLD, fontSize: '.85rem', textDecoration: 'underline' }}
            >
              support@rawaqa.com
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
