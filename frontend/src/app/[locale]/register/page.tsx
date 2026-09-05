'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useAuth } from '@/context/AuthContext';
import { authApi } from '@/lib/api';
import { normalizePhone } from '@/lib/utils';

/* ── particle canvas ──────────────────────────────────────── */
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
    const pts = Array.from({ length: 55 }, () => ({
      x: Math.random() * canvas.width, y: Math.random() * canvas.height,
      r: Math.random() * 1.4 + 0.3,
      vx: (Math.random() - 0.5) * 0.28, vy: (Math.random() - 0.5) * 0.28,
      o: Math.random() * 0.45 + 0.08,
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
      for (let i = 0; i < pts.length; i++) {
        for (let j = i + 1; j < pts.length; j++) {
          const dx = pts[i].x - pts[j].x, dy = pts[i].y - pts[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 90) {
            ctx.beginPath(); ctx.moveTo(pts[i].x, pts[i].y); ctx.lineTo(pts[j].x, pts[j].y);
            ctx.strokeStyle = `rgba(210,181,106,${0.07 * (1 - dist / 90)})`; ctx.lineWidth = 0.6; ctx.stroke();
          }
        }
      }
      raf = requestAnimationFrame(draw);
    };
    draw();
    return () => { cancelAnimationFrame(raf); window.removeEventListener('resize', resize); };
  }, []);
  return <canvas ref={ref} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none' }} />;
}

/* ── animated logo ring ───────────────────────────────────── */
function LogoRing({ size = 60 }: { size?: number }) {
  return (
    <div style={{ position: 'relative', width: size, height: size, margin: '0 auto' }}>
      <svg width={size} height={size} viewBox="0 0 64 64" fill="none"
        style={{ position: 'absolute', inset: 0, animation: 'rotateSlow 12s linear infinite' }}>
        <circle cx="32" cy="32" r="30" stroke="rgba(210,181,106,.18)" strokeWidth="1" strokeDasharray="4 6" />
      </svg>
      <svg width={size} height={size} viewBox="0 0 64 64" fill="none"
        style={{ position: 'absolute', inset: 0, animation: 'pulse3d 3s ease-in-out infinite' }}>
        <circle cx="32" cy="32" r="24" stroke="rgba(210,181,106,.28)" strokeWidth="1" />
      </svg>
      <svg width={size} height={size} viewBox="0 0 64 64" fill="none" style={{ position: 'absolute', inset: 0 }}>
        <path d="M20 38c0-9 5-15 12-15s12 6 12 15c0 4-5 6-12 6s-12-2-12-6z" stroke="var(--gold-light)" strokeWidth="1.5" fill="none" />
        <path d="M26 23c1-4 3-6 6-6" stroke="rgba(210,181,106,.5)" strokeWidth="1.2" strokeLinecap="round" />
      </svg>
    </div>
  );
}

/* ── field component ──────────────────────────────────────── */
function Field({
  label, type, value, onChange, placeholder, delay, icon, extra,
}: {
  label: string; type: string; value: string; onChange: (v: string) => void;
  placeholder?: string; delay: number; icon: React.ReactNode; extra?: React.ReactNode;
}) {
  const [focused, setFocused] = useState(false);
  const [mounted, setMounted] = useState(false);
  useEffect(() => { const t = setTimeout(() => setMounted(true), delay); return () => clearTimeout(t); }, [delay]);

  return (
    <div style={{ opacity: mounted ? 1 : 0, transform: mounted ? 'translateY(0)' : 'translateY(18px)', transition: 'opacity 500ms ease, transform 500ms ease' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '.45rem' }}>
        <label style={{ fontSize: '.65rem', letterSpacing: '.12em', textTransform: 'uppercase', color: 'rgba(247,244,236,.32)', fontWeight: 600 }}>
          {label}
        </label>
        {extra}
      </div>
      <div style={{ position: 'relative' }}>
        <span style={{ position: 'absolute', top: '50%', left: '1rem', transform: 'translateY(-50%)', color: focused ? 'var(--gold-light)' : 'rgba(247,244,236,.22)', transition: 'color 300ms ease', pointerEvents: 'none', display: 'flex' }}>
          {icon}
        </span>
        <input
          type={type} value={value} onChange={e => onChange(e.target.value)}
          required dir="ltr" placeholder={placeholder}
          onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}
          style={{
            width: '100%',
            background: focused ? 'rgba(210,181,106,.05)' : 'rgba(255,255,255,.03)',
            border: `1px solid ${focused ? 'rgba(210,181,106,.6)' : 'rgba(210,181,106,.12)'}`,
            borderRadius: 14, padding: '.85rem 1rem .85rem 2.8rem',
            fontSize: '.88rem', color: 'var(--ivory)', outline: 'none', fontFamily: 'inherit',
            transition: 'border-color 300ms ease, background 300ms ease, box-shadow 300ms ease',
            boxShadow: focused ? '0 0 0 3px rgba(210,181,106,.08)' : 'none',
          }}
        />
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════ */
export default function RegisterPage() {
  const t      = useTranslations('auth');
  const params = useParams();
  const router = useRouter();
  const locale = (params?.locale as string) || 'ar';
  const { login } = useAuth();
  const isAr = locale === 'ar';

  const [form, setForm] = useState({ name: '', email: '', phone: '', password: '', confirm: '' });
  const [showPass, setShowPass]       = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [error, setError]   = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [cardIn, setCardIn]   = useState(false);

  const set = (k: keyof typeof form) => (v: string) => setForm(f => ({ ...f, [k]: v }));

  useEffect(() => { const t = setTimeout(() => setCardIn(true), 80); return () => clearTimeout(t); }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (form.password !== form.confirm) { setError(t('password_mismatch')); return; }
    setLoading(true);
    try {
      const res = await authApi.register({
        name: form.name, email: form.email,
        phone: normalizePhone(form.phone), password: form.password,
      });
      setSuccess(true);
      setTimeout(() => {
        login(res.data.accessToken, res.data.refreshToken, res.data.user);
        router.push(`/${locale}`);
      }, 700);
    } catch (err: unknown) {
      setError((err as Error).message || t('error_invalid'));
      setLoading(false);
    }
  };

  const EyeIcon = ({ open }: { open: boolean }) => open ? (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94"/>
      <path d="M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19"/>
      <line x1="1" y1="1" x2="23" y2="23"/>
    </svg>
  ) : (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
      <circle cx="12" cy="12" r="3"/>
    </svg>
  );

  const fields = [
    {
      key: 'name', label: t('name'), type: 'text', placeholder: isAr ? 'الاسم الكامل' : 'Full name', delay: 300,
      icon: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/></svg>,
    },
    {
      key: 'email', label: t('email'), type: 'email', placeholder: 'you@example.com', delay: 380,
      icon: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="2" y="4" width="20" height="16" rx="3"/><path d="M2 7l10 7 10-7"/></svg>,
    },
    {
      key: 'phone', label: t('phone'), type: 'tel', placeholder: '+20 1XX XXX XXXX', delay: 460,
      icon: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 9.81 19.79 19.79 0 01.01 1.18 2 2 0 012 0h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L6.09 7.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 14.92z"/></svg>,
    },
  ] as const;

  return (
    <div style={{
      minHeight: '100vh',
      background: 'radial-gradient(ellipse 80% 70% at 50% 0%, rgba(173,138,76,.09) 0%, transparent 60%), #0d0b08',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '2rem 1.25rem', position: 'relative', overflow: 'hidden',
    }}>
      <ParticleCanvas />

      <div aria-hidden style={{
        position: 'absolute', top: '-10%', left: '50%', transform: 'translateX(-50%)',
        width: 700, height: 700, borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(173,138,76,.07) 0%, transparent 65%)',
        pointerEvents: 'none',
      }} />

      {/* Card */}
      <div style={{
        width: '100%', maxWidth: 440, position: 'relative', zIndex: 1,
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

          {/* Top shimmer */}
          <div style={{ position: 'absolute', top: 0, left: '15%', right: '15%', height: 1, background: 'linear-gradient(90deg, transparent, rgba(210,181,106,.35), transparent)' }} />

          {/* Success overlay */}
          {success && (
            <div style={{
              position: 'absolute', inset: 0, borderRadius: 28, zIndex: 10,
              background: 'rgba(22,19,14,.96)',
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '1rem',
              animation: 'fadeIn 400ms ease',
            }}>
              <div style={{
                width: 56, height: 56, borderRadius: '50%',
                background: 'rgba(74,222,128,.12)', border: '1px solid rgba(74,222,128,.3)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                animation: 'scaleIn 400ms var(--ease-bounce)',
              }}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#4ade80" strokeWidth="2.5" strokeLinecap="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              </div>
              <p style={{ color: 'var(--ivory)', fontSize: '.9rem', fontWeight: 600 }}>
                {isAr ? 'تم إنشاء الحساب!' : 'Account created!'}
              </p>
            </div>
          )}

          {/* Logo */}
          <div style={{ marginBottom: '2rem', opacity: cardIn ? 1 : 0, transform: cardIn ? 'translateY(0)' : 'translateY(-12px)', transition: 'opacity 500ms 150ms ease, transform 500ms 150ms ease' }}>
            <LogoRing size={60} />
          </div>

          {/* Heading */}
          <div style={{ textAlign: 'center', marginBottom: '2rem', opacity: cardIn ? 1 : 0, transform: cardIn ? 'translateY(0)' : 'translateY(12px)', transition: 'opacity 500ms 250ms ease, transform 500ms 250ms ease' }}>
            <p style={{ fontSize: '.62rem', letterSpacing: '.2em', textTransform: 'uppercase', color: 'var(--gold)', marginBottom: '.5rem' }}>
              {isAr ? 'انضم إلى رواقة' : 'Join RAWAQA'}
            </p>
            <h1 style={{ fontFamily: 'var(--font-fraunces,serif)', fontSize: 'clamp(1.6rem, 3vw, 2rem)', color: 'var(--ivory)', fontWeight: 300, lineHeight: 1.2 }}>
              {t('register_title')}
            </h1>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>

            {fields.map(f => (
              <Field
                key={f.key}
                label={f.label}
                type={f.type}
                value={form[f.key]}
                onChange={set(f.key)}
                placeholder={f.placeholder}
                delay={f.delay}
                icon={f.icon}
              />
            ))}

            {/* Password */}
            <Field
              label={t('password')}
              type={showPass ? 'text' : 'password'}
              value={form.password}
              onChange={set('password')}
              placeholder="••••••••"
              delay={540}
              icon={<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg>}
              extra={
                <button type="button" onClick={() => setShowPass(p => !p)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(247,244,236,.3)', display: 'flex', padding: 0, transition: 'color 250ms ease' }}
                  onMouseEnter={e => (e.currentTarget.style.color = 'var(--gold-light)')}
                  onMouseLeave={e => (e.currentTarget.style.color = 'rgba(247,244,236,.3)')}>
                  <EyeIcon open={showPass} />
                </button>
              }
            />

            {/* Confirm password */}
            <Field
              label={t('confirm_password')}
              type={showConfirm ? 'text' : 'password'}
              value={form.confirm}
              onChange={set('confirm')}
              placeholder="••••••••"
              delay={620}
              icon={<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>}
              extra={
                <button type="button" onClick={() => setShowConfirm(p => !p)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(247,244,236,.3)', display: 'flex', padding: 0, transition: 'color 250ms ease' }}
                  onMouseEnter={e => (e.currentTarget.style.color = 'var(--gold-light)')}
                  onMouseLeave={e => (e.currentTarget.style.color = 'rgba(247,244,236,.3)')}>
                  <EyeIcon open={showConfirm} />
                </button>
              }
            />

            {/* Error */}
            {error && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '.6rem', background: 'rgba(248,113,113,.07)', border: '1px solid rgba(248,113,113,.18)', borderRadius: 12, padding: '.65rem .9rem', animation: 'fadeSlideUp 300ms ease' }}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#f87171" strokeWidth="2" style={{ flexShrink: 0 }}>
                  <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
                </svg>
                <p style={{ fontSize: '.8rem', color: '#f87171' }}>{error}</p>
              </div>
            )}

            {/* Submit */}
            <div style={{ marginTop: '.4rem', opacity: cardIn ? 1 : 0, transform: cardIn ? 'translateY(0)' : 'translateY(12px)', transition: 'opacity 500ms 700ms ease, transform 500ms 700ms ease' }}>
              <button type="submit" disabled={loading || success} className="btn btn-gold btn-block" style={{ fontSize: '.85rem', letterSpacing: '.06em' }}>
                {loading ? (
                  <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '.5rem' }}>
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ animation: 'rotateSlow 0.9s linear infinite' }}>
                      <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/>
                    </svg>
                    {t('registering')}
                  </span>
                ) : t('register_btn')}
              </button>
            </div>
          </form>

          {/* Divider */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '.875rem', margin: '1.6rem 0', opacity: cardIn ? 1 : 0, transition: 'opacity 500ms 750ms ease' }}>
            <div style={{ flex: 1, height: 1, background: 'rgba(210,181,106,.1)' }} />
            <span style={{ fontSize: '.65rem', color: 'rgba(247,244,236,.2)', letterSpacing: '.1em', textTransform: 'uppercase' }}>{isAr ? 'أو' : 'or'}</span>
            <div style={{ flex: 1, height: 1, background: 'rgba(210,181,106,.1)' }} />
          </div>

          {/* Login link + back */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '.75rem', opacity: cardIn ? 1 : 0, transition: 'opacity 500ms 800ms ease' }}>
            <p style={{ fontSize: '.83rem', color: 'rgba(247,244,236,.38)' }}>
              {t('has_account')}{' '}
              <Link href={`/${locale}/login`} style={{ color: 'var(--gold-light)', fontWeight: 700, textDecoration: 'none' }}>
                {t('login_link')}
              </Link>
            </p>
            <Link href={`/${locale}/shop`}
              style={{ fontSize: '.75rem', color: 'rgba(247,244,236,.2)', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '.35rem', transition: 'color 250ms ease' }}
              onMouseEnter={e => (e.currentTarget.style.color = 'rgba(247,244,236,.5)')}
              onMouseLeave={e => (e.currentTarget.style.color = 'rgba(247,244,236,.2)')}>
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M19 12H5M12 5l-7 7 7 7"/>
              </svg>
              {isAr ? 'العودة للمتجر' : 'Back to shop'}
            </Link>
          </div>

        </div>
      </div>
    </div>
  );
}
