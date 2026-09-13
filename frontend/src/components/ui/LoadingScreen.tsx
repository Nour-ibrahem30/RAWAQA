'use client';

import { useEffect, useState, useMemo } from 'react';
import Image from 'next/image';
import { useParams } from 'next/navigation';

/* Shows once per browser session on the home page, or always if forceShow */
const SESSION_KEY = 'rawaqa_intro_done';

const CRAFT_MESSAGES = {
  ar: [
    { title: 'ننسج أبعاد الراحة والفخامة', sub: 'تصاميم استثنائية صُنعت لتلائم ذوقك الرفيع' },
    { title: 'ننتقي خامات مختارة بعناية فائقة', sub: 'أجود الأقمشة والجلود المبتكرة لحياة يومية مريحة' },
    { title: 'نصمم مساحتك الاستثنائية', sub: 'حيث تلتقي الحرفية المصرية بأعلى معايير الإتقان' },
    { title: 'أهلاً بك في رَوْقَـة', sub: 'راحة حرفية — صُنعت لتدوم' },
  ],
  en: [
    { title: 'Weaving Dimensions of Pure Comfort', sub: 'Bespoke designs crafted for refined lifestyles' },
    { title: 'Curating Artisanal Textures & Materials', sub: 'Premium fabrics tailored for everyday tranquility' },
    { title: 'Sculpting Your Sanctuary', sub: 'Where Egyptian heritage meets modern ergonomics' },
    { title: 'Welcome to RAWAQA', sub: 'Crafted Comfort — Designed for Life' },
  ],
};

interface LoadingScreenProps {
  isPersistent?: boolean;
  onFinished?: () => void;
  minDuration?: number;
}

export default function LoadingScreen({
  isPersistent = false,
  onFinished,
  minDuration = 1100,
}: LoadingScreenProps) {
  const params = useParams();
  const locale = ((params?.locale as string) || 'ar') === 'en' ? 'en' : 'ar';
  const isAr = locale === 'ar';

  const [phase, setPhase] = useState<'in' | 'active' | 'out' | 'done'>('in');
  const [skip, setSkip] = useState(!isPersistent); // start hidden if checked in session
  const [progress, setProgress] = useState(12);
  const [msgIdx, setMsgIdx] = useState(0);

  const messages = CRAFT_MESSAGES[locale];

  // Floating ambient embers
  const embers = useMemo(() => {
    return Array.from({ length: 18 }, (_, i) => ({
      id: i,
      left: `${6 + ((i * 17) % 88)}%`,
      top: `${15 + ((i * 19) % 75)}%`,
      size: i % 4 === 0 ? 4 : i % 2 === 0 ? 2.5 : 1.5,
      delay: `${(i * 0.4).toFixed(1)}s`,
      duration: `${(5 + (i % 5) * 1.5).toFixed(1)}s`,
      opacity: 0.25 + (i % 3) * 0.25,
    }));
  }, []);

  useEffect(() => {
    // If not persistent, check session storage (only display once per session unless reloaded)
    if (!isPersistent && typeof window !== 'undefined') {
      const alreadySeen = sessionStorage.getItem(SESSION_KEY);
      if (alreadySeen) {
        setSkip(true);
        return;
      }
    }
    setSkip(false);

    // Initial enter phase
    const tEnter = setTimeout(() => setPhase('active'), 150);

    // Dynamic progress bar
    const startTime = Date.now();
    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const target = Math.min(99, Math.round((elapsed / minDuration) * 100));

      setProgress((prev) => {
        if (isPersistent) {
          return prev >= 90 ? 30 : prev + 6;
        }
        if (prev < target) {
          return Math.min(target, prev + Math.floor(Math.random() * 8 + 3));
        }
        return prev;
      });
    }, 70);

    // Message cycler
    const msgInterval = setInterval(() => {
      setMsgIdx((curr) => (curr + 1) % messages.length);
    }, 1100);

    // Completion timeout (only when not persistent)
    let tOut: NodeJS.Timeout | null = null;
    let tDone: NodeJS.Timeout | null = null;

    if (!isPersistent) {
      tOut = setTimeout(() => {
        setProgress(100);
        setPhase('out');
      }, minDuration);

      tDone = setTimeout(() => {
        setPhase('done');
        if (typeof window !== 'undefined') {
          sessionStorage.setItem(SESSION_KEY, '1');
        }
        onFinished?.();
      }, minDuration + 650);
    }

    return () => {
      clearTimeout(tEnter);
      clearInterval(interval);
      clearInterval(msgInterval);
      if (tOut) clearTimeout(tOut);
      if (tDone) clearTimeout(tDone);
    };
  }, [isPersistent, minDuration, onFinished, messages.length]);

  const handleSkipNow = () => {
    setProgress(100);
    setPhase('out');
    setTimeout(() => {
      setPhase('done');
      if (typeof window !== 'undefined') {
        sessionStorage.setItem(SESSION_KEY, '1');
      }
      onFinished?.();
    }, 400);
  };

  if (skip || phase === 'done') return null;

  const isOut = phase === 'out';
  const currentMsg = messages[msgIdx] || messages[0];

  return (
    <div
      role="status"
      aria-live="polite"
      aria-label="Loading RAWAQA"
      dir={isAr ? 'rtl' : 'ltr'}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 999999,
        background: 'radial-gradient(ellipse 90% 75% at 50% 40%, #17140e 0%, #0c0a07 65%, #050403 100%)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
        pointerEvents: isOut ? 'none' : 'all',
        opacity: isOut ? 0 : 1,
        transform: isOut ? 'scale(1.03) translateZ(0)' : 'scale(1) translateZ(0)',
        filter: isOut ? 'blur(8px)' : 'none',
        transition: 'opacity 650ms cubic-bezier(.16, 1, .3, 1), transform 650ms cubic-bezier(.16, 1, .3, 1), filter 650ms ease',
      }}
    >
      {/* ── Keyframe styles injected inline for 100% self-containment ── */}
      <style>{`
        @keyframes rwPulseGlow {
          0%, 100% { opacity: 0.35; transform: scale(1); }
          50% { opacity: 0.65; transform: scale(1.15); }
        }
        @keyframes rwSpin3D {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        @keyframes rwSpin3DReverse {
          0% { transform: rotate(360deg); }
          100% { transform: rotate(0deg); }
        }
        @keyframes rwConicSpin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        @keyframes rwFloatSoft {
          0%, 100% { transform: translateY(0px) rotate(0deg); }
          50% { transform: translateY(-7px) rotate(0.5deg); }
        }
        @keyframes rwGoldShimmer {
          0% { background-position: -200% 0; }
          100% { background-position: 200% 0; }
        }
        @keyframes rwEmberDrift {
          0% { transform: translateY(0px) scale(1); opacity: 0.2; }
          50% { opacity: 0.7; transform: translateY(-25px) scale(1.2); }
          100% { transform: translateY(-55px) scale(0.6); opacity: 0; }
        }
        @keyframes rwBeamSweep {
          0%, 100% { opacity: 0.2; transform: rotate(-25deg) scale(0.9); }
          50% { opacity: 0.45; transform: rotate(25deg) scale(1.1); }
        }
      `}</style>

      {/* ── Background Architectural Arch & Ambient Light Beam ── */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          pointerEvents: 'none',
          background: 'radial-gradient(ellipse 65% 50% at 50% 45%, rgba(210,181,106,0.14) 0%, rgba(173,138,76,0.04) 50%, transparent 80%)',
          animation: 'rwPulseGlow 5s ease-in-out infinite',
        }}
      />

      {/* Diagonal Ambient Light Ray */}
      <div
        style={{
          position: 'absolute',
          width: '180vw',
          height: '250px',
          background: 'linear-gradient(90deg, transparent, rgba(210,181,106,0.06), rgba(255,245,225,0.08), rgba(210,181,106,0.06), transparent)',
          transformOrigin: 'center center',
          animation: 'rwBeamSweep 12s ease-in-out infinite',
          pointerEvents: 'none',
        }}
      />

      {/* Floating Gold Embers */}
      <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
        {embers.map((em) => (
          <div
            key={em.id}
            style={{
              position: 'absolute',
              left: em.left,
              top: em.top,
              width: em.size,
              height: em.size,
              borderRadius: '50%',
              backgroundColor: '#D2B56A',
              boxShadow: '0 0 8px #E6CA85',
              animation: `rwEmberDrift ${em.duration} infinite ease-in-out ${em.delay}`,
            }}
          />
        ))}
      </div>

      {/* ── Architectural Portico Outline (رواق رَوْقَة) ── */}
      <svg
        width="420"
        height="500"
        viewBox="0 0 420 500"
        fill="none"
        style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          pointerEvents: 'none',
          opacity: 0.18,
        }}
      >
        {/* Outer Arch */}
        <path
          d="M 60,480 L 60,200 A 150,150 0 0,1 360,200 L 360,480"
          stroke="url(#archGold)"
          strokeWidth="1.5"
          strokeDasharray="4 6"
        />
        {/* Inner Arch */}
        <path
          d="M 90,480 L 90,200 A 120,120 0 0,1 330,200 L 330,480"
          stroke="url(#archGold)"
          strokeWidth="0.8"
        />
        <defs>
          <linearGradient id="archGold" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#E6CA85" stopOpacity="0.9" />
            <stop offset="60%" stopColor="#AD8A4C" stopOpacity="0.4" />
            <stop offset="100%" stopColor="#AD8A4C" stopOpacity="0.0" />
          </linearGradient>
        </defs>
      </svg>

      {/* ── Central Celestial Kinetic Rings (Concentric & 3D) ── */}
      <div
        style={{
          position: 'relative',
          width: 320,
          height: 320,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: '1.25rem',
        }}
      >
        {/* Outer Orbit with Diamond Node */}
        <div
          style={{
            position: 'absolute',
            width: 290,
            height: 290,
            borderRadius: '50%',
            border: '1px solid rgba(210,181,106,0.16)',
            animation: 'rwSpin3D 16s linear infinite',
          }}
        >
          <div
            style={{
              position: 'absolute',
              top: -5,
              left: '50%',
              transform: 'translateX(-50%) rotate(45deg)',
              width: 8,
              height: 8,
              background: '#F5E6C4',
              boxShadow: '0 0 12px 2px #D2B56A',
            }}
          />
          <div
            style={{
              position: 'absolute',
              bottom: -4,
              left: '50%',
              transform: 'translateX(-50%) rotate(45deg)',
              width: 6,
              height: 6,
              background: '#AD8A4C',
              boxShadow: '0 0 8px #AD8A4C',
            }}
          />
        </div>

        {/* Counter-rotating Middle Ring */}
        <div
          style={{
            position: 'absolute',
            width: 220,
            height: 220,
            borderRadius: '50%',
            border: '1px dashed rgba(210,181,106,0.22)',
            animation: 'rwSpin3DReverse 11s linear infinite',
          }}
        >
          <div
            style={{
              position: 'absolute',
              left: -4,
              top: '50%',
              transform: 'translateY(-50%)',
              width: 6,
              height: 6,
              borderRadius: '50%',
              background: '#D2B56A',
              boxShadow: '0 0 10px #D2B56A',
            }}
          />
        </div>

        {/* ── Luxury Crest / Emblem Container ── */}
        <div
          style={{
            position: 'relative',
            width: 128,
            height: 128,
            borderRadius: '34px',
            padding: '2px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'linear-gradient(145deg, rgba(210,181,106,0.6), rgba(60,45,20,0.4), rgba(210,181,106,0.2))',
            boxShadow: '0 12px 36px -8px rgba(0,0,0,0.85), 0 0 35px rgba(210,181,106,0.28)',
            animation: 'rwFloatSoft 4s ease-in-out infinite',
          }}
        >
          {/* Inner frosted chamber */}
          <div
            style={{
              width: '100%',
              height: '100%',
              borderRadius: '32px',
              background: 'radial-gradient(circle at 40% 30%, #2a2217 0%, #15110c 70%, #0c0906 100%)',
              border: '1px solid rgba(255,255,255,0.1)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              position: 'relative',
              overflow: 'hidden',
              backdropFilter: 'blur(12px)',
            }}
          >
            {/* Shimmer light sweep inside badge */}
            <div
              style={{
                position: 'absolute',
                inset: 0,
                background: 'linear-gradient(135deg, transparent 35%, rgba(255,245,225,0.2) 50%, transparent 65%)',
                backgroundSize: '200% 200%',
                animation: 'rwGoldShimmer 4s infinite linear',
                pointerEvents: 'none',
              }}
            />

            {/* Glowing Backdrop behind logo */}
            <div
              style={{
                position: 'absolute',
                width: 70,
                height: 70,
                borderRadius: '50%',
                background: 'radial-gradient(circle, rgba(210,181,106,0.4) 0%, transparent 70%)',
                filter: 'blur(10px)',
              }}
            />

            {/* Brand Logo */}
            <Image
              src="/logo.png"
              alt="RAWAQA"
              width={82}
              height={82}
              priority
              style={{
                objectFit: 'contain',
                position: 'relative',
                zIndex: 2,
                filter: 'drop-shadow(0 4px 12px rgba(0,0,0,0.6))',
              }}
            />
          </div>
        </div>
      </div>

      {/* ── Brand Typography with Shimmering Gold Foliage ── */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '0.45rem',
          textAlign: 'center',
          zIndex: 10,
          padding: '0 1.5rem',
        }}
      >
        {/* Arabic Brand Masterpiece */}
        <h1
          style={{
            fontFamily: 'var(--font-cairo), Cairo, serif',
            fontSize: '2.4rem',
            fontWeight: 800,
            lineHeight: 1.15,
            margin: 0,
            letterSpacing: isAr ? '0.04em' : '0.12em',
            background: 'linear-gradient(135deg, #FFFFFF 0%, #F5E6C4 25%, #D2B56A 50%, #FAF6EE 75%, #C29B38 100%)',
            backgroundSize: '250% 100%',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            animation: 'rwGoldShimmer 6s infinite linear',
            textShadow: '0 0 30px rgba(210,181,106,0.3)',
          }}
        >
          {isAr ? 'رَوْقَـة' : 'RAWAQA'}
        </h1>

        {/* Sub-label with luxury diamond divider */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
            color: 'rgba(230,202,133,0.75)',
            fontSize: '0.75rem',
            fontWeight: 500,
            letterSpacing: isAr ? '0.15em' : '0.28em',
            textTransform: 'uppercase',
          }}
        >
          <span style={{ width: 24, height: 1, background: 'linear-gradient(90deg, transparent, rgba(210,181,106,0.5))' }} />
          <span>{isAr ? 'فخامة الراحة الحرفية' : 'CRAFTED COMFORT'}</span>
          <span style={{ transform: 'rotate(45deg)', display: 'inline-block', width: 4, height: 4, background: '#D2B56A' }} />
          <span>{isAr ? 'CRAFTED COMFORT' : 'REFINED LIVING'}</span>
          <span style={{ width: 24, height: 1, background: 'linear-gradient(90deg, rgba(210,181,106,0.5), transparent)' }} />
        </div>
      </div>

      {/* ── Poetic Dynamic Story Message ── */}
      <div
        style={{
          marginTop: '2rem',
          minHeight: '4rem',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          textAlign: 'center',
          padding: '0 2rem',
          maxWidth: 480,
          zIndex: 10,
        }}
      >
        <p
          key={`msg-title-${msgIdx}`}
          style={{
            margin: 0,
            fontSize: '0.96rem',
            fontWeight: 600,
            color: '#F7F4EC',
            letterSpacing: isAr ? '0.02em' : '0.06em',
            transition: 'opacity 350ms ease, transform 350ms ease',
            textShadow: '0 2px 10px rgba(0,0,0,0.7)',
          }}
        >
          {currentMsg.title}
        </p>
        <p
          key={`msg-sub-${msgIdx}`}
          style={{
            margin: '0.35rem 0 0 0',
            fontSize: '0.76rem',
            fontWeight: 400,
            color: 'rgba(210,181,106,0.85)',
            letterSpacing: '0.02em',
            lineHeight: 1.4,
          }}
        >
          {currentMsg.sub}
        </p>
      </div>

      {/* ── Refined Liquid Gold Progress Thread ── */}
      <div
        style={{
          marginTop: '1.75rem',
          width: 240,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '0.75rem',
          zIndex: 10,
        }}
      >
        {/* Track */}
        <div
          style={{
            position: 'relative',
            width: '100%',
            height: 2,
            background: 'rgba(255,255,255,0.08)',
            borderRadius: 999,
            overflow: 'visible',
          }}
        >
          {/* Progress Bar Fill */}
          <div
            style={{
              position: 'absolute',
              top: 0,
              left: isAr ? 'auto' : 0,
              right: isAr ? 0 : 'auto',
              height: '100%',
              width: `${progress}%`,
              background: 'linear-gradient(90deg, #AD8A4C 0%, #D2B56A 50%, #FFF5DD 100%)',
              borderRadius: 999,
              boxShadow: '0 0 12px 1px rgba(210,181,106,0.7)',
              transition: 'width 140ms ease-out',
            }}
          >
            {/* Glowing Needle Flare at leading tip */}
            <div
              style={{
                position: 'absolute',
                top: '50%',
                [isAr ? 'left' : 'right']: -3,
                transform: 'translateY(-50%)',
                width: 7,
                height: 7,
                borderRadius: '50%',
                backgroundColor: '#FFFFFF',
                boxShadow: '0 0 10px 3px #D2B56A, 0 0 18px 6px rgba(210,181,106,0.5)',
              }}
            />
          </div>
        </div>

        {/* Counter Percentage & Skip Button */}
        <div
          style={{
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            fontSize: '0.72rem',
            color: 'rgba(230,202,133,0.7)',
            fontFamily: 'var(--font-manrope), sans-serif',
          }}
        >
          <span style={{ fontVariantNumeric: 'tabular-nums', letterSpacing: '0.1em' }}>
            {Math.round(progress)}%
          </span>

          {!isPersistent && (
            <button
              onClick={handleSkipNow}
              type="button"
              style={{
                background: 'transparent',
                border: 'none',
                color: 'rgba(247,244,236,0.4)',
                fontSize: '0.68rem',
                cursor: 'pointer',
                letterSpacing: '0.08em',
                transition: 'color 200ms ease',
                padding: '2px 6px',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.color = '#D2B56A')}
              onMouseLeave={(e) => (e.currentTarget.style.color = 'rgba(247,244,236,0.4)')}
            >
              {isAr ? 'دخول سريع ↵' : 'Skip intro ↵'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

