'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useParams, useSearchParams, useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { authApi } from '@/lib/api';

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
      r: Math.random() * 1.4 + 0.3,
      vx: (Math.random() - 0.5) * 0.25, vy: (Math.random() - 0.5) * 0.25,
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

export default function ResetPasswordPage() {
  const t = useTranslations('auth');
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const locale = (params?.locale as string) || 'ar';
  const isAr = locale === 'ar';

  const token = searchParams?.get('token') || '';

  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  const [cardIn, setCardIn] = useState(false);

  useEffect(() => { const id = setTimeout(() => setCardIn(true), 80); return () => clearTimeout(id); }, []);

  const BORDER = 'rgba(210,181,106,.12)';
  const GOLD   = 'var(--gold-light)';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirm) {
      setError(isAr ? 'كلمات المرور غير متطابقة' : 'Passwords do not match');
      return;
    }
    if (!token) {
      setError(t('reset_invalid_token'));
      return;
    }
    setError('');
    setLoading(true);
    try {
      await authApi.resetPassword(token, password);
      setSuccess(true);
      setTimeout(() => router.push(`/${locale}/login`), 2500);
    } catch (err: unknown) {
      setError((err as Error).message || t('reset_invalid_token'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: 'radial-gradient(ellipse 80% 70% at 50% 0%, rgba(173,138,76,.09) 0%, transparent 60%), #0d0b08',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '2rem 1.25rem', position: 'relative', overflow: 'hidden',
    }}>
      <ParticleCanvas />
      <div aria-hidden style={{ position: 'absolute', top: '-10%', left: '50%', transform: 'translateX(-50%)', width: 600, height: 600, borderRadius: '50%', background: 'radial-gradient(circle, rgba(173,138,76,.07) 0%, transparent 65%)', pointerEvents: 'none' }} />

      <div style={{
        width: '100%', maxWidth: 420, position: 'relative', zIndex: 1,
        opacity: cardIn ? 1 : 0,
        transform: cardIn ? 'translateY(0) scale(1)' : 'translateY(28px) scale(.97)',
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
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#4ade80" strokeWidth="2" strokeLinecap="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              </div>
              <h2 style={{ fontFamily: 'var(--font-fraunces,serif)', fontSize: '1.5rem', color: 'var(--ivory)', marginBottom: '.75rem', fontWeight: 300 }}>
                {t('reset_success')}
              </h2>
              <p style={{ color: 'rgba(247,244,236,.4)', fontSize: '.82rem' }}>
                {isAr ? 'جاري تحويلك لتسجيل الدخول...' : 'Redirecting to sign in...'}
              </p>
            </div>
          ) : !token ? (
            <div style={{ textAlign: 'center', padding: '1rem 0' }}>
              <p style={{ color: '#f87171', fontSize: '.9rem', marginBottom: '1.5rem' }}>{t('reset_invalid_token')}</p>
              <Link href={`/${locale}/forgot-password`} style={{ color: GOLD, fontWeight: 600, textDecoration: 'none', fontSize: '.875rem' }}>
                {isAr ? 'طلب رابط جديد' : 'Request a new link'}
              </Link>
            </div>
          ) : (
            <>
              <div style={{ textAlign: 'center', marginBottom: '1.75rem' }}>
                <div style={{ width: 56, height: 56, borderRadius: '50%', margin: '0 auto 1rem', background: 'rgba(210,181,106,.08)', border: '1px solid rgba(210,181,106,.18)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--gold-light)" strokeWidth="1.6">
                    <rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/>
                  </svg>
                </div>
                <p style={{ fontSize: '.62rem', letterSpacing: '.18em', textTransform: 'uppercase', color: 'var(--gold)', marginBottom: '.4rem' }}>
                  {isAr ? 'كلمة مرور جديدة' : 'New Password'}
                </p>
                <h1 style={{ fontFamily: 'var(--font-fraunces,serif)', fontSize: 'clamp(1.5rem, 3vw, 1.9rem)', color: 'var(--ivory)', fontWeight: 300 }}>
                  {t('reset_title')}
                </h1>
              </div>

              <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {[
                  { label: t('reset_new_password'), val: password, setter: setPassword },
                  { label: t('confirm_password'), val: confirm, setter: setConfirm },
                ].map((field, idx) => (
                  <div key={idx}>
                    <label style={{ display: 'block', fontSize: '.65rem', letterSpacing: '.12em', textTransform: 'uppercase', color: 'rgba(247,244,236,.32)', fontWeight: 600, marginBottom: '.45rem' }}>
                      {field.label}
                    </label>
                    <div style={{ position: 'relative' }}>
                      <span style={{ position: 'absolute', top: '50%', left: '1rem', transform: 'translateY(-50%)', color: 'rgba(247,244,236,.22)', pointerEvents: 'none', display: 'flex' }}>
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg>
                      </span>
                      <input
                        type={showPass ? 'text' : 'password'}
                        value={field.val}
                        onChange={e => field.setter(e.target.value)}
                        required minLength={8} dir="ltr" placeholder="••••••••"
                        style={{ width: '100%', background: 'rgba(255,255,255,.03)', border: `1px solid ${BORDER}`, borderRadius: 14, padding: '.85rem 2.8rem .85rem 2.8rem', fontSize: '.88rem', color: 'var(--ivory)', outline: 'none', fontFamily: 'inherit', transition: 'border-color 300ms ease' }}
                        onFocus={e => (e.currentTarget.style.borderColor = 'rgba(210,181,106,.6)')}
                        onBlur={e => (e.currentTarget.style.borderColor = BORDER)}
                      />
                      {idx === 0 && (
                        <button type="button" onClick={() => setShowPass(p => !p)}
                          style={{ position: 'absolute', top: '50%', right: '1rem', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(247,244,236,.3)', display: 'flex', padding: 0 }}>
                          {showPass ? (
                            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
                          ) : (
                            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                          )}
                        </button>
                      )}
                    </div>
                  </div>
                ))}

                {error && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '.6rem', background: 'rgba(248,113,113,.07)', border: '1px solid rgba(248,113,113,.18)', borderRadius: 12, padding: '.65rem .9rem' }}>
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#f87171" strokeWidth="2" style={{ flexShrink: 0 }}><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                    <p style={{ fontSize: '.8rem', color: '#f87171' }}>{error}</p>
                  </div>
                )}

                <button type="submit" disabled={loading} className="btn btn-gold btn-block" style={{ fontSize: '.85rem', marginTop: '.25rem' }}>
                  {loading ? (
                    <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '.5rem' }}>
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ animation: 'rotateSlow 0.9s linear infinite' }}><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/></svg>
                      {t('reset_resetting')}
                    </span>
                  ) : t('reset_btn')}
                </button>
              </form>

              <div style={{ textAlign: 'center', marginTop: '1.5rem' }}>
                <Link href={`/${locale}/login`} style={{ fontSize: '.8rem', color: 'rgba(247,244,236,.35)', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '.35rem', transition: 'color 250ms' }}
                  onMouseEnter={e => (e.currentTarget.style.color = GOLD)}
                  onMouseLeave={e => (e.currentTarget.style.color = 'rgba(247,244,236,.35)')}>
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 12H5M12 5l-7 7 7 7"/></svg>
                  {t('back_to_login')}
                </Link>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
