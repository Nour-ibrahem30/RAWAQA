'use client';

import { useEffect, useState } from 'react';
import { useParams, useSearchParams, useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { ordersApi } from '@/lib/api';
import { useCart } from '@/context/CartContext';
import { formatPrice } from '@/lib/utils';

const DARK   = '#0f0e0a';
const CARD   = 'rgba(30,27,21,.95)';
const BORDER = 'rgba(210,181,106,.1)';
const IVORY  = 'var(--ivory)';
const GOLD   = 'var(--gold-light)';

export default function CheckoutSuccessPage() {
  const t = useTranslations('checkout');
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const locale = (params?.locale as string) || 'ar';
  const isAr = locale === 'ar';

  const orderId = searchParams.get('orderId');
  const { clearCart } = useCart();

  const [order, setOrder] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchOrder = async () => {
      if (!orderId) {
        setError(isAr ? 'معرف الطلب مفقود' : 'Order ID is missing');
        setLoading(false);
        return;
      }

      try {
        const res = await ordersApi.get(orderId, locale);
        setOrder(res.data);
        
        // Clear cart after successful payment
        await clearCart();
      } catch (err) {
        console.error('Failed to fetch order:', err);
        setError(isAr ? 'فشل في جلب تفاصيل الطلب' : 'Failed to fetch order details');
      } finally {
        setLoading(false);
      }
    };

    fetchOrder();
  }, [orderId, locale, isAr, clearCart]);

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

  if (error) {
    return (
      <div style={{ background: DARK, minHeight: '100vh', color: IVORY }}>
        <div className="wrap" style={{ paddingTop: '10rem', paddingBottom: '5rem', textAlign: 'center' }}>
          <div style={{ fontSize: '4rem', marginBottom: '1.5rem' }}>⚠️</div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '1rem' }}>
            {isAr ? 'حدث خطأ' : 'Something went wrong'}
          </h1>
          <p style={{ color: 'rgba(247,244,236,.6)', marginBottom: '2rem' }}>{error}</p>
          <a href={`/${locale}`} className="btn btn-gold">
            {isAr ? 'العودة للرئيسية' : 'Go Home'}
          </a>
        </div>
      </div>
    );
  }

  return (
    <div style={{ background: DARK, minHeight: '100vh', color: IVORY }}>
      <div aria-hidden style={{ position:'fixed',inset:0,pointerEvents:'none', background:'radial-gradient(ellipse 50% 35% at 50% 10%, rgba(74,222,128,.05) 0%, transparent 70%)' }} />

      <div className="wrap" style={{ paddingTop: '10rem', paddingBottom: '5rem', position: 'relative' }}>
        <div style={{ maxWidth: 600, margin: '0 auto', textAlign: 'center' }}>
          {/* Success Icon */}
          <div style={{
            width: 100, height: 100, borderRadius: '50%',
            background: 'rgba(74,222,128,.1)', border: '2px solid rgba(74,222,128,.3)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 2rem', fontSize: '3rem',
          }}>
            ✅
          </div>

          <h1 className="display-4" style={{ color: '#4ade80', marginBottom: '1rem' }}>
            {isAr ? 'تم الدفع بنجاح!' : 'Payment Successful!'}
          </h1>
          
          <p style={{ fontSize: '1.1rem', color: 'rgba(247,244,236,.7)', marginBottom: '2.5rem' }}>
            {isAr 
              ? 'شكراً لك. تم استلام طلبك وجاري تجهيزه.'
              : 'Thank you. Your order has been received and is being processed.'}
          </p>

          {order && (
            <div style={{ background: CARD, borderRadius: 20, padding: '2rem', border: `1px solid ${BORDER}`, textAlign: isAr ? 'right' : 'left' }}>
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
                  background: 'rgba(74,222,128,.15)',
                  color: '#4ade80',
                  padding: '.35rem .75rem',
                  borderRadius: 8,
                  fontSize: '.8rem',
                  fontWeight: 600,
                }}>
                  {isAr ? 'تم الدفع' : 'Paid'}
                </span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <span style={{ color: 'rgba(247,244,236,.5)', fontSize: '.85rem' }}>
                  {isAr ? 'طريقة الدفع' : 'Payment Method'}
                </span>
                <span style={{ color: IVORY, fontSize: '.9rem' }}>
                  {order.paymentMethod === 'kashier' 
                    ? (isAr ? 'الدفع الإلكتروني' : 'Online Payment')
                    : (isAr ? 'الدفع عند الاستلام' : 'Cash on Delivery')}
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

          <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', marginTop: '2rem', flexWrap: 'wrap' }}>
            {order && (
              <a href={`/${locale}/order-confirmation/${order.orderNumber}`} className="btn btn-gold">
                {isAr ? 'تفاصيل الطلب' : 'Order Details'}
              </a>
            )}
            <a href={`/${locale}/shop`} className="btn btn-line-dark">
              {isAr ? 'تابع التسوق' : 'Continue Shopping'}
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
