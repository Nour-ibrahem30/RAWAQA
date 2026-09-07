'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useSearchParams } from 'next/navigation';
import { authApi } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';

export default function VerifyEmailPage() {
  const params       = useParams();
  const searchParams = useSearchParams();
  const locale       = (params?.locale as string) || 'ar';
  const isAr         = locale === 'ar';
  const token        = searchParams?.get('token') || '';
  const { refreshUser } = useAuth();

  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!token) {
      setStatus('error');
      setMessage(isAr ? 'رابط التحقق غير صالح.' : 'Invalid verification link.');
      return;
    }

    authApi.verifyEmail(token)
      .then(async () => {
        await refreshUser().catch(() => {});
        setStatus('success');
      })
      .catch((err: Error) => {
        setStatus('error');
        setMessage(err.message || (isAr ? 'فشل التحقق.' : 'Verification failed.'));
      });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const GOLD = 'var(--gold-light)';

  return (
    <div style={{
      minHeight: '100vh',
      background: 'radial-gradient(ellipse 80% 70% at 50% 0%, rgba(173,138,76,.09) 0%, transparent 60%), #0d0b08',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '2rem',
    }}>
      <div style={{
        background: 'rgba(22,19,14,.9)', backdropFilter: 'blur(24px)',
        border: '1px solid rgba(210,181,106,.13)', borderRadius: 28,
        padding: 'clamp(2rem, 5vw, 3rem)', maxWidth: 420, width: '100%',
        boxShadow: '0 32px 80px rgba(0,0,0,.55)',
        textAlign: 'center',
        position: 'relative', overflow: 'hidden',
      }}>
        <div style={{ position: 'absolute', top: 0, left: '15%', right: '15%', height: 1, background: 'linear-gradient(90deg, transparent, rgba(210,181,106,.35), transparent)' }} />

        {status === 'loading' && (
          <>
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke={GOLD} strokeWidth="1.5"
              style={{ margin: '0 auto 1.5rem', animation: 'rotateSlow 1s linear infinite', display: 'block' }}>
              <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/>
            </svg>
            <p style={{ color: 'rgba(247,244,236,.55)', fontSize: '.9rem' }}>
              {isAr ? 'جاري التحقق من بريدك الإلكتروني...' : 'Verifying your email...'}
            </p>
          </>
        )}

        {status === 'success' && (
          <>
            <div style={{
              width: 72, height: 72, borderRadius: '50%', margin: '0 auto 1.5rem',
              background: 'rgba(74,222,128,.1)', border: '1px solid rgba(74,222,128,.25)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#4ade80" strokeWidth="2.5" strokeLinecap="round">
                <polyline points="20 6 9 17 4 12"/>
              </svg>
            </div>
            <p style={{ fontSize: '.62rem', letterSpacing: '.18em', textTransform: 'uppercase', color: GOLD, marginBottom: '.5rem' }}>
              {isAr ? 'تم التحقق' : 'Verified'}
            </p>
            <h1 style={{ fontFamily: 'var(--font-fraunces,serif)', fontSize: '1.6rem', color: 'var(--ivory)', fontWeight: 300, marginBottom: '.75rem' }}>
              {isAr ? 'تم تأكيد بريدك الإلكتروني!' : 'Email confirmed!'}
            </h1>
            <p style={{ color: 'rgba(247,244,236,.45)', fontSize: '.875rem', lineHeight: 1.7, marginBottom: '2rem' }}>
              {isAr
                ? 'حسابك مفعّل الآن. يمكنك الاستمتاع بتجربة التسوق الكاملة.'
                : 'Your account is now fully active. Enjoy the full shopping experience.'}
            </p>
            <Link href={`/${locale}/shop`} style={{
              display: 'inline-block', background: '#D2B56A', color: '#15130F',
              borderRadius: 999, padding: '.65rem 1.75rem', fontWeight: 700,
              fontSize: '.875rem', textDecoration: 'none',
            }}>
              {isAr ? 'تسوق الآن' : 'Shop Now'}
            </Link>
          </>
        )}

        {status === 'error' && (
          <>
            <div style={{
              width: 72, height: 72, borderRadius: '50%', margin: '0 auto 1.5rem',
              background: 'rgba(248,113,113,.08)', border: '1px solid rgba(248,113,113,.2)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#f87171" strokeWidth="2" strokeLinecap="round">
                <circle cx="12" cy="12" r="10"/>
                <line x1="15" y1="9" x2="9" y2="15"/>
                <line x1="9" y1="9" x2="15" y2="15"/>
              </svg>
            </div>
            <h1 style={{ fontFamily: 'var(--font-fraunces,serif)', fontSize: '1.5rem', color: 'var(--ivory)', fontWeight: 300, marginBottom: '.75rem' }}>
              {isAr ? 'فشل التحقق' : 'Verification Failed'}
            </h1>
            <p style={{ color: 'rgba(248,113,113,.8)', fontSize: '.875rem', marginBottom: '2rem', lineHeight: 1.6 }}>
              {message}
            </p>
            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
              <Link href={`/${locale}/account`} style={{
                display: 'inline-block', background: '#D2B56A', color: '#15130F',
                borderRadius: 999, padding: '.65rem 1.5rem', fontWeight: 700,
                fontSize: '.875rem', textDecoration: 'none',
              }}>
                {isAr ? 'إعادة الإرسال' : 'Resend Email'}
              </Link>
              <Link href={`/${locale}`} style={{
                display: 'inline-block', border: '1px solid rgba(210,181,106,.2)',
                color: 'rgba(247,244,236,.5)', borderRadius: 999, padding: '.65rem 1.5rem',
                fontSize: '.875rem', textDecoration: 'none',
              }}>
                {isAr ? 'الرئيسية' : 'Home'}
              </Link>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
