'use client';

import { useEffect, useState } from 'react';

interface Props {
  userName?: string;
  lang?: 'ar' | 'en';
  onDone?: () => void;
  isPersistent?: boolean;
}

const MESSAGES = {
  en: [
    'Securing executive connection…',
    'Synchronizing store operations…',
    'Loading live analytics & catalog…',
    'Finalizing admin interface…',
  ],
  ar: [
    'تأمين الاتصال الإداري المشفر…',
    'مزامنة عمليات المتجر والطلبات…',
    'تحميل التحليلات والبيانات الحية…',
    'اللمسات الأخيرة للوحة التحكم…',
  ],
};

const WELCOME = {
  en: (name: string) => `Welcome back, ${name}`,
  ar: (name: string) => `أهلاً بك مجدداً، ${name}`,
};

const SUBTITLE = {
  en: 'Your store operations & live data are ready.',
  ar: 'جميع أنظمة المتجر والبيانات الحية جاهزة الآن.',
};

export default function AdminLoadingScreen({
  userName = 'Admin',
  lang = 'ar',
  onDone,
  isPersistent = false,
}: Props) {
  const [phase, setPhase] = useState<'loading' | 'welcome' | 'fadeout'>('loading');
  const [msgIdx, setMsgIdx] = useState(0);
  const [progress, setProgress] = useState(15);
  const messages = MESSAGES[lang] || MESSAGES.ar;
  const isAr = lang === 'ar';

  // Progress simulation
  useEffect(() => {
    if (isPersistent) {
      // Infinite gentle breathing progress between 30% and 85%
      const interval = setInterval(() => {
        setProgress(p => (p >= 85 ? 35 : p + 12));
      }, 700);
      return () => clearInterval(interval);
    }

    const steps = [
      { to: 35, delay: 100 },
      { to: 65, delay: 500 },
      { to: 88, delay: 950 },
      { to: 100, delay: 1300 },
    ];
    const timers = steps.map(s => setTimeout(() => setProgress(s.to), s.delay));
    return () => timers.forEach(clearTimeout);
  }, [isPersistent]);

  // Message rotation
  useEffect(() => {
    const interval = setInterval(() => {
      setMsgIdx(i => (i + 1) % messages.length);
    }, 1100);
    return () => clearInterval(interval);
  }, [messages.length]);

  // Sequence if not persistent (e.g. post-login redirect)
  useEffect(() => {
    if (isPersistent) return;

    const t1 = setTimeout(() => setPhase('welcome'), 600);
    const t2 = setTimeout(() => setPhase('fadeout'), 1300);
    const t3 = setTimeout(() => onDone?.(), 1600);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
    };
  }, [isPersistent, onDone]);

  return (
    <div
      dir={isAr ? 'rtl' : 'ltr'}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 99999,
        background: 'radial-gradient(ellipse 90% 70% at 50% 30%, #1a1711 0%, #0d0b08 65%, #050403 100%)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        color: '#F7F4EC',
        fontFamily: 'var(--font-manrope, "Cairo", sans-serif)',
        opacity: phase === 'fadeout' ? 0 : 1,
        transition: 'opacity 450ms cubic-bezier(.4, 0, .2, 1)',
        overflow: 'hidden',
        userSelect: 'none',
      }}
    >
      <style>{`
        @keyframes orbitCW {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes orbitCCW {
          from { transform: rotate(360deg); }
          to { transform: rotate(0deg); }
        }
        @keyframes pulseHalo {
          0%, 100% { opacity: 0.35; transform: scale(1); }
          50% { opacity: 0.75; transform: scale(1.12); }
        }
        @keyframes floatDust {
          0% { transform: translateY(0) scale(0.8); opacity: 0.2; }
          50% { opacity: 0.8; }
          100% { transform: translateY(-70px) scale(1.2); opacity: 0; }
        }
        @keyframes beamScan {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(200%); }
        }
        @keyframes emblemGlow {
          0%, 100% { filter: drop-shadow(0 0 16px rgba(210,181,106,0.35)); }
          50% { filter: drop-shadow(0 0 32px rgba(210,181,106,0.65)); }
        }
      `}</style>

      {/* Atmospheric Ambient Glows */}
      <div
        aria-hidden
        style={{
          position: 'absolute',
          top: '25%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: 550,
          height: 550,
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(210,181,106,0.14) 0%, rgba(173,138,76,0.03) 55%, transparent 75%)',
          pointerEvents: 'none',
          animation: 'pulseHalo 4s ease-in-out infinite',
        }}
      />
      <div
        aria-hidden
        style={{
          position: 'absolute',
          bottom: '10%',
          left: '50%',
          transform: 'translateX(-50%)',
          width: 400,
          height: 150,
          borderRadius: '50%',
          background: 'radial-gradient(ellipse, rgba(168,84,58,0.08) 0%, transparent 70%)',
          pointerEvents: 'none',
        }}
      />

      {/* Floating Gold Dust / Embers */}
      <div aria-hidden style={{ position: 'absolute', inset: 0, pointerEvents: 'none', overflow: 'hidden' }}>
        {[
          { left: '20%', top: '60%', delay: '0s', dur: '4s' },
          { left: '35%', top: '70%', delay: '1.2s', dur: '3.5s' },
          { left: '50%', top: '65%', delay: '0.6s', dur: '4.5s' },
          { left: '65%', top: '75%', delay: '2s', dur: '3.8s' },
          { left: '80%', top: '62%', delay: '1.5s', dur: '4.2s' },
        ].map((p, i) => (
          <span
            key={i}
            style={{
              position: 'absolute',
              left: p.left,
              top: p.top,
              width: 3,
              height: 3,
              borderRadius: '50%',
              background: '#D2B56A',
              boxShadow: '0 0 6px #ECCB7E',
              animation: `floatDust ${p.dur} ${p.delay} infinite linear`,
            }}
          />
        ))}
      </div>

      {/* ── CENTRAL BRAND SEAL ── */}
      <div style={{ position: 'relative', width: 140, height: 140, marginBottom: '2rem' }}>
        {/* Outer orbital celestial ring */}
        <svg
          width="140"
          height="140"
          viewBox="0 0 140 140"
          style={{
            position: 'absolute',
            inset: 0,
            animation: 'orbitCW 20s linear infinite',
          }}
        >
          <circle
            cx="70"
            cy="70"
            r="66"
            stroke="rgba(210,181,106,0.22)"
            strokeWidth="1.2"
            strokeDasharray="6 8"
          />
          <circle cx="70" cy="4" r="2.5" fill="#D2B56A" />
          <circle cx="70" cy="136" r="2.5" fill="#D2B56A" />
        </svg>

        {/* Counter-rotating inner precision ring */}
        <svg
          width="140"
          height="140"
          viewBox="0 0 140 140"
          style={{
            position: 'absolute',
            inset: 0,
            animation: 'orbitCCW 14s linear infinite',
          }}
        >
          <circle
            cx="70"
            cy="70"
            r="54"
            stroke="rgba(210,181,106,0.15)"
            strokeWidth="1"
            strokeDasharray="2 12"
          />
          {/* Subtle diamond markers */}
          <polygon points="70,18 73,21 70,24 67,21" fill="rgba(210,181,106,0.5)" />
          <polygon points="122,70 119,73 116,70 119,67" fill="rgba(210,181,106,0.5)" />
          <polygon points="70,122 67,119 70,116 73,119" fill="rgba(210,181,106,0.5)" />
          <polygon points="18,70 21,67 24,70 21,73" fill="rgba(210,181,106,0.5)" />
        </svg>

        {/* Central Glass Medallion */}
        <div
          style={{
            position: 'absolute',
            inset: 18,
            borderRadius: '50%',
            background: 'radial-gradient(circle at 40% 35%, rgba(45,39,29,0.92) 0%, rgba(17,15,11,0.96) 85%)',
            border: '1px solid rgba(210,181,106,0.45)',
            boxShadow: '0 0 28px rgba(210,181,106,0.22), inset 0 0 18px rgba(210,181,106,0.12)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            animation: 'emblemGlow 3.5s ease-in-out infinite',
            overflow: 'hidden',
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/logo.png"
            alt="RAWAQA"
            width={56}
            height={56}
            style={{ objectFit: 'contain', width: 56, height: 56 }}
          />
        </div>
      </div>

      {/* ── BRAND TITLES ── */}
      <h1
        style={{
          fontFamily: 'var(--font-fraunces, serif)',
          fontSize: 'clamp(1.75rem, 3.5vw, 2.4rem)',
          fontWeight: 400,
          letterSpacing: '.28em',
          textTransform: 'uppercase',
          marginBottom: '.45rem',
          background: 'linear-gradient(135deg, #FFFFFF 0%, #F5E8C7 40%, #D2B56A 80%, #AF8E44 100%)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          filter: 'drop-shadow(0 2px 8px rgba(0,0,0,0.5))',
        }}
      >
        RAWAQA
      </h1>

      {/* Sub-pill badge */}
      <div
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '.45rem',
          padding: '.25rem .85rem',
          borderRadius: 999,
          background: 'rgba(210,181,106,0.08)',
          border: '1px solid rgba(210,181,106,0.25)',
          marginBottom: '2.5rem',
        }}
      >
        <span
          style={{
            width: 6,
            height: 6,
            borderRadius: '50%',
            background: '#D2B56A',
            boxShadow: '0 0 8px #D2B56A',
            display: 'inline-block',
          }}
        />
        <span
          style={{
            fontSize: '.65rem',
            letterSpacing: '.18em',
            textTransform: 'uppercase',
            color: '#D2B56A',
            fontWeight: 600,
          }}
        >
          {isAr ? 'لوحة المشرف والإدارة التنفيذية' : 'Executive Admin Suite'}
        </span>
      </div>

      {/* ── LOADING PHASE (Active / Persistent) ── */}
      {phase === 'loading' && (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '1.25rem',
            width: 'min(340px, 86vw)',
          }}
        >
          {/* Modern Neon Track */}
          <div
            style={{
              position: 'relative',
              width: '100%',
              height: 3,
              background: 'rgba(255,255,255,0.06)',
              borderRadius: 999,
              overflow: 'hidden',
              boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.4)',
            }}
          >
            {/* Animated filling bar */}
            <div
              style={{
                position: 'absolute',
                top: 0,
                bottom: 0,
                left: 0,
                width: `${progress}%`,
                background: 'linear-gradient(90deg, rgba(210,181,106,0.3) 0%, #D2B56A 75%, #FFF0C8 100%)',
                borderRadius: 999,
                boxShadow: '0 0 14px rgba(210,181,106,0.7)',
                transition: 'width 350ms cubic-bezier(.4, 0, .2, 1)',
              }}
            />
            {/* Traveling Light Flare */}
            <div
              style={{
                position: 'absolute',
                top: 0,
                bottom: 0,
                width: '40%',
                background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.6), transparent)',
                animation: 'beamScan 1.8s infinite ease-in-out',
              }}
            />
          </div>

          {/* Dynamic Cycling Status */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '.5rem',
              minHeight: 24,
            }}
          >
            <span
              style={{
                fontSize: '.82rem',
                color: 'rgba(247,244,236,0.65)',
                letterSpacing: '.02em',
                fontWeight: 400,
                transition: 'opacity 300ms ease',
              }}
            >
              {messages[msgIdx]}
            </span>
          </div>

          {/* Three pulsing micro-bars */}
          <div style={{ display: 'flex', gap: '.4rem', marginTop: '.25rem' }}>
            {[0, 1, 2].map(i => (
              <span
                key={i}
                style={{
                  width: 14,
                  height: 2,
                  borderRadius: 2,
                  background: '#D2B56A',
                  opacity: (msgIdx % 3 === i) ? 0.9 : 0.25,
                  transition: 'opacity 300ms ease',
                }}
              />
            ))}
          </div>
        </div>
      )}

      {/* ── WELCOME PHASE (Login Transition) ── */}
      {phase === 'welcome' && (
        <div
          style={{
            textAlign: 'center',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            animation: 'fadeSlideUp 400ms ease forwards',
            width: 'min(360px, 90vw)',
          }}
        >
          {/* Success Checkmark Crest */}
          <div
            style={{
              width: 58,
              height: 58,
              borderRadius: '50%',
              background: 'rgba(74,222,128,0.12)',
              border: '1px solid rgba(74,222,128,0.4)',
              boxShadow: '0 0 20px rgba(74,222,128,0.25)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: '1.25rem',
            }}
          >
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#4ade80" strokeWidth="2.5" strokeLinecap="round">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </div>

          <h2
            style={{
              fontFamily: 'var(--font-fraunces, serif)',
              fontSize: 'clamp(1.35rem, 3vw, 1.8rem)',
              fontWeight: 400,
              color: '#F7F4EC',
              marginBottom: '.5rem',
            }}
          >
            {WELCOME[lang] ? WELCOME[lang](userName) : WELCOME.ar(userName)}
          </h2>

          <p
            style={{
              fontSize: '.85rem',
              color: 'rgba(247,244,236,0.5)',
              lineHeight: 1.5,
              marginBottom: '1.75rem',
            }}
          >
            {SUBTITLE[lang] || SUBTITLE.ar}
          </p>

          {/* Complete Shimmer Bar */}
          <div
            style={{
              width: '100%',
              height: 3,
              background: 'rgba(210,181,106,0.2)',
              borderRadius: 999,
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                width: '100%',
                height: '100%',
                background: 'linear-gradient(90deg, #D2B56A, #FFF5D6, #D2B56A)',
                boxShadow: '0 0 16px rgba(210,181,106,0.8)',
              }}
            />
          </div>
        </div>
      )}

      {/* ── SECURITY GUARANTEE FOOTER ── */}
      <div
        style={{
          position: 'absolute',
          bottom: 28,
          display: 'flex',
          alignItems: 'center',
          gap: '.45rem',
          fontSize: '.62rem',
          letterSpacing: '.12em',
          textTransform: 'uppercase',
          color: 'rgba(247,244,236,0.3)',
        }}
      >
        <span>🔒</span>
        <span>
          {isAr
            ? 'بوابة إدارة رواقة الآمنة • تشفير معتمد 256-بت'
            : 'RAWAQA SECURE GATEWAY • 256-BIT ENCRYPTED'}
        </span>
      </div>
    </div>
  );
}

