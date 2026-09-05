'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';

/* Shows once per browser session on the home page */
const SESSION_KEY = 'rawaqa_intro_done';

export default function LoadingScreen() {
  const [phase, setPhase]     = useState<'in' | 'hold' | 'out' | 'done'>('in');
  const [skip, setSkip]       = useState(true); // start hidden; check session
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    // Only show once per browser session
    if (typeof window !== 'undefined' && sessionStorage.getItem(SESSION_KEY)) {
      setSkip(true);
      return;
    }
    setSkip(false);

    // Progress bar
    let p = 0;
    const prog = setInterval(() => {
      p += Math.random() * 18 + 4;
      if (p >= 100) { p = 100; clearInterval(prog); }
      setProgress(p);
    }, 120);

    // Phase timeline
    const t1 = setTimeout(() => setPhase('hold'), 400);
    const t2 = setTimeout(() => setPhase('out'),  2200);
    const t3 = setTimeout(() => {
      setPhase('done');
      if (typeof window !== 'undefined') sessionStorage.setItem(SESSION_KEY, '1');
    }, 2900);

    return () => { clearInterval(prog); clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, []);

  if (skip || phase === 'done') return null;

  const isOut = phase === 'out';

  return (
    <div
      aria-hidden
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        background: 'var(--charcoal)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '2rem',
        opacity:   isOut ? 0 : 1,
        transform: isOut ? 'scale(1.04)' : 'scale(1)',
        transition: 'opacity 700ms cubic-bezier(.4,0,.2,1), transform 700ms cubic-bezier(.4,0,.2,1)',
        pointerEvents: isOut ? 'none' : 'all',
        overflow: 'hidden',
      }}
    >
      {/* ── Radial glow ── */}
      <div style={{
        position: 'absolute', inset: 0, pointerEvents: 'none',
        background: 'radial-gradient(ellipse 60% 55% at 50% 50%, rgba(173,138,76,.18) 0%, transparent 68%)',
        animation: 'glowPulse 3s ease-in-out infinite',
      }} />

      {/* ── Orbiting ring ── */}
      <div style={{
        position: 'absolute',
        width: 260, height: 260,
        borderRadius: '50%',
        border: '1px solid rgba(210,181,106,.12)',
        animation: 'rotateSlow 8s linear infinite',
      }}>
        <div style={{
          position: 'absolute', top: -3, left: '50%', marginLeft: -3,
          width: 6, height: 6, borderRadius: '50%',
          background: 'var(--gold-light)',
          boxShadow: '0 0 12px var(--gold-light)',
        }} />
      </div>
      <div style={{
        position: 'absolute',
        width: 340, height: 340,
        borderRadius: '50%',
        border: '1px solid rgba(210,181,106,.07)',
        animation: 'rotateSlow 13s linear infinite reverse',
      }} />

      {/* ── Logo ── */}
      <div style={{
        position: 'relative',
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem',
        opacity:   phase === 'in' ? 0 : 1,
        transform: phase === 'in' ? 'translateY(20px) scale(.9)' : 'translateY(0) scale(1)',
        transition: 'opacity 600ms 150ms ease, transform 600ms 150ms cubic-bezier(.34,1.56,.64,1)',
      }}>
        {/* Logo image */}
        <div style={{
          width: 90, height: 90,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          filter: 'drop-shadow(0 0 24px rgba(210,181,106,.5))',
          borderRadius: 20,
          overflow: 'hidden',
          background: 'rgba(255,255,255,.06)',
          border: '1px solid rgba(210,181,106,.2)',
        }}>
          <Image
            src="/logo.png"
            alt="RAWAQA"
            width={72}
            height={72}
            style={{ objectFit: 'contain', borderRadius: 14 }}
            priority
          />
        </div>

        {/* Brand name */}
        <p style={{
          fontFamily: 'var(--font-fraunces, serif)',
          fontSize: '1.6rem',
          letterSpacing: '.24em',
          color: 'var(--ivory)',
          fontWeight: 300,
        }}>
          RAWAQA
        </p>

        {/* Tagline — bilingual */}
        <p style={{
          fontSize: '.72rem',
          letterSpacing: '.18em',
          textTransform: 'uppercase',
          color: 'var(--gold-light)',
          opacity: .8,
        }}>
          راحة حرفية — Crafted Comfort
        </p>
      </div>

      {/* ── Progress bar ── */}
      <div style={{
        position: 'absolute',
        bottom: '3rem',
        left: '50%',
        transform: 'translateX(-50%)',
        width: 180,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '.75rem',
        opacity: phase === 'in' ? 0 : 1,
        transition: 'opacity 400ms 300ms ease',
      }}>
        {/* Track */}
        <div style={{
          width: '100%', height: 1,
          background: 'rgba(247,244,236,.1)',
          borderRadius: 999, overflow: 'hidden',
        }}>
          <div style={{
            height: '100%',
            width: `${progress}%`,
            background: 'linear-gradient(90deg, var(--gold), var(--gold-light))',
            borderRadius: 999,
            transition: 'width 120ms ease',
            boxShadow: '0 0 8px rgba(210,181,106,.5)',
          }} />
        </div>
        <span style={{ fontSize: '.65rem', letterSpacing: '.12em', color: 'rgba(247,244,236,.3)' }}>
          {Math.round(progress)}%
        </span>
      </div>
    </div>
  );
}
