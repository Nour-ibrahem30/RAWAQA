'use client';

import { useEffect, useState } from 'react';

interface Props {
  userName?: string;
  lang?: 'ar' | 'en';
  onDone?: () => void;
}

const MESSAGES = {
  en: [
    'Preparing your dashboard…',
    'Loading analytics…',
    'Almost ready…',
  ],
  ar: [
    'جاري تحضير لوحة التحكم…',
    'تحميل التحليلات…',
    'اللمسات الأخيرة…',
  ],
};

const WELCOME = {
  en: (name: string) => `Welcome back, ${name}! 👋`,
  ar: (name: string) => `أهلاً بعودتك، ${name}! 👋`,
};

const SUBTITLE = {
  en: 'Your store is running smoothly.',
  ar: 'متجرك يعمل بشكل مثالي.',
};

export default function AdminLoadingScreen({ userName = 'Admin', lang = 'en', onDone }: Props) {
  const [phase, setPhase]       = useState<'loading' | 'welcome' | 'fadeout'>('loading');
  const [msgIdx, setMsgIdx]     = useState(0);
  const [progress, setProgress] = useState(0);
  const messages = MESSAGES[lang];

  // Progress bar
  useEffect(() => {
    const steps = [
      { to: 35,  delay: 0,    dur: 400  },
      { to: 65,  delay: 420,  dur: 350  },
      { to: 90,  delay: 800,  dur: 300  },
      { to: 100, delay: 1100, dur: 200  },
    ];
    const ids = steps.map(s =>
      setTimeout(() => setProgress(s.to), s.delay)
    );
    return () => ids.forEach(clearTimeout);
  }, []);

  // Message cycling
  useEffect(() => {
    const id1 = setTimeout(() => setMsgIdx(1), 420);
    const id2 = setTimeout(() => setMsgIdx(2), 850);
    return () => { clearTimeout(id1); clearTimeout(id2); };
  }, []);

  // Phase transitions
  useEffect(() => {
    // After 1.4s show welcome screen
    const t1 = setTimeout(() => setPhase('welcome'), 1400);
    // After 3.2s fade out & call onDone
    const t2 = setTimeout(() => setPhase('fadeout'), 3200);
    const t3 = setTimeout(() => onDone?.(), 3700);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, [onDone]);

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 9999,
        background: '#0d0b08',
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        opacity: phase === 'fadeout' ? 0 : 1,
        transition: 'opacity 500ms cubic-bezier(.4,0,.2,1)',
        overflow: 'hidden',
      }}
      dir={lang === 'ar' ? 'rtl' : 'ltr'}
    >
      {/* Ambient glow */}
      <div aria-hidden style={{
        position: 'absolute', top: '20%', left: '50%', transform: 'translateX(-50%)',
        width: 600, height: 600, borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(173,138,76,.12) 0%, transparent 65%)',
        pointerEvents: 'none',
        animation: 'pulse3d 3s ease-in-out infinite',
      }} />

      {/* ── LOGO ── */}
      <div style={{ position: 'relative', marginBottom: '2.5rem' }}>
        {/* Outer ring */}
        <svg width="90" height="90" viewBox="0 0 90 90" fill="none"
          style={{ position: 'absolute', inset: 0, animation: 'rotateSlow 8s linear infinite' }}>
          <circle cx="45" cy="45" r="42" stroke="rgba(210,181,106,.2)" strokeWidth="1" strokeDasharray="6 8" />
        </svg>
        {/* Middle ring */}
        <svg width="90" height="90" viewBox="0 0 90 90" fill="none"
          style={{ position: 'absolute', inset: 0, animation: 'rotateSlow 12s linear infinite reverse' }}>
          <circle cx="45" cy="45" r="34" stroke="rgba(210,181,106,.12)" strokeWidth="1" />
        </svg>
        {/* Icon */}
        <svg width="90" height="90" viewBox="0 0 90 90" fill="none">
          <circle cx="45" cy="45" r="42" stroke="rgba(210,181,106,.08)" strokeWidth="1" />
          <path d="M27 55c0-13 7.5-22 18-22s18 9 18 22c0 6-7.5 9-18 9s-18-3-18-9z"
            stroke="#D2B56A" strokeWidth="2" fill="none" />
          <path d="M39 33c1.5-6 4.5-9 9-9" stroke="rgba(210,181,106,.5)" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      </div>

      {/* Brand name */}
      <h1 style={{
        fontFamily: 'var(--font-fraunces, serif)',
        fontSize: 'clamp(1.6rem, 3vw, 2.2rem)',
        fontWeight: 300,
        color: '#F7F4EC',
        letterSpacing: '.2em',
        textTransform: 'uppercase',
        marginBottom: '.4rem',
      }}>
        RAWAQA
      </h1>
      <p style={{
        fontSize: '.62rem', letterSpacing: '.25em', textTransform: 'uppercase',
        color: '#D2B56A', marginBottom: '3rem',
      }}>
        {lang === 'ar' ? 'لوحة التحكم' : 'Admin Dashboard'}
      </p>

      {/* ── LOADING PHASE ── */}
      {phase === 'loading' && (
        <div style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1.25rem',
          width: 'min(320px, 80vw)',
        }}>
          {/* Progress bar */}
          <div style={{
            width: '100%', height: 2,
            background: 'rgba(210,181,106,.12)',
            borderRadius: 999, overflow: 'hidden',
          }}>
            <div style={{
              height: '100%',
              width: `${progress}%`,
              background: 'linear-gradient(90deg, rgba(210,181,106,.4), #D2B56A)',
              borderRadius: 999,
              transition: 'width 400ms cubic-bezier(.4,0,.2,1)',
              boxShadow: '0 0 12px rgba(210,181,106,.5)',
            }} />
          </div>

          {/* Status message */}
          <p style={{
            fontSize: '.78rem', color: 'rgba(247,244,236,.45)',
            letterSpacing: '.04em', minHeight: 20,
            transition: 'opacity 300ms ease',
          }}>
            {messages[msgIdx]}
          </p>

          {/* Spinner dots */}
          <div style={{ display: 'flex', gap: '.5rem' }}>
            {[0,1,2].map(i => (
              <div key={i} style={{
                width: 5, height: 5, borderRadius: '50%',
                background: '#D2B56A',
                animation: `pulse3d 1.2s ${i * 0.2}s ease-in-out infinite`,
              }} />
            ))}
          </div>
        </div>
      )}

      {/* ── WELCOME PHASE ── */}
      {phase === 'welcome' && (
        <div style={{
          textAlign: 'center',
          animation: 'fadeSlideUp 500ms ease forwards',
        }}>
          {/* Success checkmark */}
          <div style={{
            width: 64, height: 64, borderRadius: '50%', margin: '0 auto 1.5rem',
            background: 'rgba(74,222,128,.1)',
            border: '1px solid rgba(74,222,128,.25)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            animation: 'scaleIn 400ms cubic-bezier(.34,1.56,.64,1)',
          }}>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#4ade80" strokeWidth="2.5" strokeLinecap="round">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </div>

          {/* Welcome text */}
          <h2 style={{
            fontFamily: 'var(--font-fraunces, serif)',
            fontSize: 'clamp(1.4rem, 3vw, 1.9rem)',
            fontWeight: 300,
            color: '#F7F4EC',
            marginBottom: '.6rem',
            letterSpacing: '.02em',
          }}>
            {WELCOME[lang](userName)}
          </h2>
          <p style={{
            fontSize: '.875rem',
            color: 'rgba(247,244,236,.45)',
            letterSpacing: '.04em',
          }}>
            {SUBTITLE[lang]}
          </p>

          {/* Progress bar — full */}
          <div style={{
            width: 'min(280px, 70vw)', height: 2,
            background: 'rgba(210,181,106,.12)',
            borderRadius: 999, overflow: 'hidden',
            margin: '2rem auto 0',
          }}>
            <div style={{
              height: '100%', width: '100%',
              background: 'linear-gradient(90deg, rgba(210,181,106,.4), #D2B56A)',
              borderRadius: 999,
              boxShadow: '0 0 12px rgba(210,181,106,.5)',
              animation: 'shimmerGold 2s linear infinite',
            }} />
          </div>
        </div>
      )}
    </div>
  );
}
