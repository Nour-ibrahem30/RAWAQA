'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { authApi } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';

function ParticleCanvas() {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    let raf: number;
    const resize = () => { canvas.width = canvas.offsetWidth; canvas.height = canvas.offsetHeight; };
    resize();
    window.addEventListener('resize', resize);
    const pts = Array.from({ length: 40 }, () => ({
      x: Math.random() * canvas.width, y: Math.random() * canvas.height,
      r: Math.random() * 1.2 + 0.3, vx: (Math.random() - 0.5) * 0.25, vy: (Math.random() - 0.5) * 0.25,
      o: Math.random() * 0.4 + 0.06,
    }));
    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      pts.forEach(p => {
        p.x += p.vx; p.y += p.vy;
        if (p.x < 0) p.x = canvas.width; if (p.x > canvas.width) p.x = 0;
        if (p.y < 0) p.y = canvas.height; if (p.y > canvas.height) p.y = 0;
        ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(210,181,106,${p.o})`; ctx.fill();
      });
      raf = requestAnimationFrame(draw);
    };
    draw();
    return () => { cancelAnimationFrame(raf); window.removeEventListener('resize', resize); };
  }, []);
  return <canvas ref={ref} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none' }} />;
}

export default function VerifyPhonePage() {
  const t = useTranslations('auth');
  const params = useParams();
  const router = useRouter();
  const locale = (params?.locale as string) || 'ar';
  const isAr = locale === 'ar';
  const { user, isLoggedIn, isLoading, refreshUser } = useAuth();
  const { showToast } = useToast();

  const [code, setCode] = useState('');
  const [sending, setSending] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [sent, setSent] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  const [cooldown, setCooldown] = useState(0);
  const [cardIn, setCardIn] = useState(false);

  // Redirect if not logged in
  useEffect(() => {
    if (!isLoading && !isLoggedIn) router.push(`/${locale}/login`);
  }, [isLoading, isLoggedIn, locale, router]);

  useEffect(() => { const id = setTimeout(() => setCardIn(true), 80); return () => clearTimeout(id); }, []);

  // Cooldown timer
  useEffect(() => {
    if (cooldown <= 0) return;
    const id = setInterval(() => setCooldown(c => c - 1), 1000);
    return () => clearInterval(id);
  }, [cooldown]);

  const handleSendOtp = async () => {
    setSending(true);
    setError('');
    try {
      await authApi.sendPhoneOtp();
      setSent(true);
      setCooldown(60);
    } catch (err: unknown) {
      setError((err as Error).message || (isAr ? 'فشل إرسال الرمز' : 'Failed to send code'));
    } finally {
      setSending(false);
    }
  };

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim()) return;
    setVerifying(true);
    setError('');
    try {
      await authApi.verifyPhone(code);
      await refreshUser();
      setSuccess(true);
      showToast(t('otp_success'), 'success');
      setTimeout(() => router.push(`/${locale}/account`), 1800);
    } catch (err: unknown) {
      setError(t('otp_invalid'));
    } finally {
      setVerifying(false);
    }
  };

  const BORDER = 'rgba(210,181,106,.12)';
  const GOLD   = 'var(--gold-light)';

  if (isLoading || !user) return null;

  return (
    <div style={{
      minHeight: '100vh',
      background: 'radial-gradient(ellipse 80% 70% at 50% 0%, rgba(173,138,76,.09) 0%, transparent 60%), #0d0b08',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '2rem 1.25rem', position: 'relative', overflow: 'hidden',
    }}>
      <ParticleCanvas />

      <div style={{
        width: '100%', maxWidth: 420, position: 'relative', zIndex: 1,
        opacity: cardIn ? 1 : 0,
        transform: cardIn ? 'translateY(0) scale(1)' : 'translateY(24px) scale(.97)',
        transition: 'opacity 600ms cubic-bezier(.22,.61,.36,1), transform 600ms cubic-bezier(.22,.61,.36,1)',
      }}>
        <div style={{
          background: 'rgba(22,19,14,.88)', backdropFilter: 'blur(24px)',
          border: '1px solid rgba(210,181,106,.13)', borderRadius: 28,
          padding: 'clamp(2rem, 5vw, 2.75rem)',
          boxShadow: '0 32px 80px rgba(0,0,0,.55), 0 0 0 1px rgba(210,181,106,.06) inset',
          position: 'relative', overflow: 'hidden',
        }}>
          <div style={{ position: 'absolute', top: 0, left: '15%', right: '15%', height: 1, background: 'linear-gradient(90deg, transparent, rgba(210,181,106,.35), transparent)' }} />

          {success ? (
            <div style={{ textAlign: 'center', padding: '1rem 0' }}>
              <div style={{ width: 64, height: 64, borderRadius: '50%', margin: '0 auto 1.5rem', background: 'rgba(74,222,128,.1)', border: '1px solid rgba(74,222,128,.25)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#4ade80" strokeWidth="2" strokeLinecap="round"><polyline points="20 6 9 17 4 12"/></svg>
              </div>
              <h2 style={{ fontFamily: 'var(--font-fraunces,serif)', fontSize: '1.5rem', color: 'var(--ivory)', marginBottom: '.75rem', fontWeight: 300 }}>
                {t('otp_success')}
              </h2>
            </div>
          ) : (
            <>
              {/* Header */}
              <div style={{ textAlign: 'center', marginBottom: '1.75rem' }}>
                <div style={{ width: 56, height: 56, borderRadius: '50%', margin: '0 auto 1rem', background: 'rgba(210,181,106,.08)', border: '1px solid rgba(210,181,106,.18)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--gold-light)" strokeWidth="1.6">
                    <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 9.81a19.79 19.79 0 01-3.07-8.64A2 2 0 012 0h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L6.09 7.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 14.92z"/>
                  </svg>
                </div>
                <p style={{ fontSize: '.62rem', letterSpacing: '.18em', textTransform: 'uppercase', color: 'var(--gold)', marginBottom: '.4rem' }}>
                  {isAr ? 'تحقق من هاتفك' : 'Phone Verification'}
                </p>
                <h1 style={{ fontFamily: 'var(--font-fraunces,serif)', fontSize: 'clamp(1.4rem, 3vw, 1.8rem)', color: 'var(--ivory)', fontWeight: 300 }}>
                  {t('otp_title')}
                </h1>
                {user.phone && (
                  <p style={{ color: 'rgba(247,244,236,.4)', fontSize: '.82rem', marginTop: '.5rem' }}>
                    {t('otp_sub')} <span style={{ color: GOLD, direction: 'ltr', display: 'inline-block' }}>{user.phone}</span>
                  </p>
                )}
              </div>

              {/* Send OTP button (if not sent yet) */}
              {!sent ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  <p style={{ color: 'rgba(247,244,236,.45)', fontSize: '.85rem', textAlign: 'center', lineHeight: 1.65 }}>
                    {isAr
                      ? 'سنرسل رمز تحقق لرقم هاتفك المسجل'
                      : 'We\'ll send a verification code to your registered phone number'}
                  </p>
                  <button onClick={handleSendOtp} disabled={sending} className="btn btn-gold btn-block">
                    {sending ? (
                      <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '.5rem' }}>
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ animation: 'rotateSlow 0.9s linear infinite' }}><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/></svg>
                        {t('otp_resending')}
                      </span>
                    ) : (isAr ? 'إرسال رمز التحقق' : 'Send Verification Code')}
                  </button>
                </div>
              ) : (
                /* Code entry form */
                <form onSubmit={handleVerify} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '.65rem', letterSpacing: '.12em', textTransform: 'uppercase', color: 'rgba(247,244,236,.32)', fontWeight: 600, marginBottom: '.45rem' }}>
                      {t('otp_code')}
                    </label>
                    <input
                      type="text" value={code}
                      onChange={e => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                      placeholder="• • • • • •"
                      required maxLength={6} dir="ltr"
                      style={{
                        width: '100%', textAlign: 'center', letterSpacing: '.5em',
                        fontFamily: 'monospace', fontSize: '1.5rem', fontWeight: 700,
                        background: 'rgba(255,255,255,.03)', border: `1px solid ${BORDER}`, borderRadius: 14,
                        padding: '1rem', color: GOLD, outline: 'none',
                        transition: 'border-color 300ms ease',
                      }}
                      onFocus={e => (e.currentTarget.style.borderColor = 'rgba(210,181,106,.6)')}
                      onBlur={e => (e.currentTarget.style.borderColor = BORDER)}
                    />
                  </div>

                  {error && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '.6rem', background: 'rgba(248,113,113,.07)', border: '1px solid rgba(248,113,113,.18)', borderRadius: 12, padding: '.65rem .9rem' }}>
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#f87171" strokeWidth="2" style={{ flexShrink: 0 }}><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                      <p style={{ fontSize: '.8rem', color: '#f87171' }}>{error}</p>
                    </div>
                  )}

                  <button type="submit" disabled={verifying || code.length < 4} className="btn btn-gold btn-block">
                    {verifying ? (
                      <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '.5rem' }}>
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ animation: 'rotateSlow 0.9s linear infinite' }}><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/></svg>
                        {t('otp_verifying')}
                      </span>
                    ) : t('otp_verify_btn')}
                  </button>

                  {/* Resend */}
                  <p style={{ textAlign: 'center', fontSize: '.8rem', color: 'rgba(247,244,236,.35)' }}>
                    {cooldown > 0 ? (
                      <span>{isAr ? `إعادة الإرسال بعد ${cooldown}ث` : `Resend in ${cooldown}s`}</span>
                    ) : (
                      <button type="button" onClick={handleSendOtp} disabled={sending}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: GOLD, fontWeight: 600, fontSize: '.8rem', padding: 0 }}>
                        {sending ? t('otp_resending') : t('otp_resend')}
                      </button>
                    )}
                  </p>
                </form>
              )}

              <div style={{ textAlign: 'center', marginTop: '1.5rem' }}>
                <Link href={`/${locale}/account`} style={{ fontSize: '.8rem', color: 'rgba(247,244,236,.3)', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '.35rem', transition: 'color 250ms' }}
                  onMouseEnter={e => (e.currentTarget.style.color = 'rgba(247,244,236,.6)')}
                  onMouseLeave={e => (e.currentTarget.style.color = 'rgba(247,244,236,.3)')}>
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 12H5M12 5l-7 7 7 7"/></svg>
                  {isAr ? 'العودة للحساب' : 'Back to Account'}
                </Link>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
