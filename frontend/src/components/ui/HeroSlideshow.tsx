'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Image from 'next/image';

const SLIDES = [
  { src: '/hero/hero-1.jpg', alt: 'RAWAQA — Brown Leather Bean Bag' },
  { src: '/hero/hero-2.jpg', alt: 'RAWAQA — Black Leather Bean Bag' },
  { src: '/hero/hero-3.jpg', alt: 'RAWAQA — Fabric Bean Bag' },
  { src: '/hero/hero-4.jpg', alt: 'RAWAQA — Velvet Bean Bag' },
];

// Pre-load hint (browser handles caching automatically)
const INTERVAL  = 5000;  // ms between slides
const TRANS_DUR = 1200;  // cross-fade duration ms

interface Props {
  className?: string;
  style?: React.CSSProperties;
}

export default function HeroSlideshow({ className = '', style }: Props) {
  // We keep TWO permanent layers: A and B.
  // We alternate which is "top" (opacity 1) and which is "bottom" (opacity 0).
  const [layerA, setLayerA] = useState(0); // slide index shown on layer A
  const [layerB, setLayerB] = useState(1); // slide index shown on layer B
  const [topLayer, setTopLayer] = useState<'A' | 'B'>('A'); // which is visible
  const [transitioning, setTransitioning] = useState(false);
  const currentIdx = topLayer === 'A' ? layerA : layerB;
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const advance = useCallback(() => {
    if (transitioning) return;
    setTransitioning(true);

    const next = (currentIdx + 1) % SLIDES.length;

    if (topLayer === 'A') {
      // Load next slide into layer B (bottom), then fade A out
      setLayerB(next);
      // Small delay so the image is rendered before we start fading
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          setTopLayer('B');
          setTimeout(() => setTransitioning(false), TRANS_DUR + 50);
        });
      });
    } else {
      setLayerA(next);
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          setTopLayer('A');
          setTimeout(() => setTransitioning(false), TRANS_DUR + 50);
        });
      });
    }
  }, [currentIdx, topLayer, transitioning]);

  useEffect(() => {
    timerRef.current = setInterval(advance, INTERVAL);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [advance]);

  const goTo = (idx: number) => {
    if (idx === currentIdx || transitioning) return;
    if (timerRef.current) clearInterval(timerRef.current);
    if (topLayer === 'A') {
      setLayerB(idx);
      requestAnimationFrame(() => requestAnimationFrame(() => {
        setTopLayer('B');
        setTimeout(() => setTransitioning(false), TRANS_DUR + 50);
      }));
    } else {
      setLayerA(idx);
      requestAnimationFrame(() => requestAnimationFrame(() => {
        setTopLayer('A');
        setTimeout(() => setTransitioning(false), TRANS_DUR + 50);
      }));
    }
    setTransitioning(true);
    timerRef.current = setInterval(advance, INTERVAL);
  };

  const opacityA = topLayer === 'A' ? 1 : 0;
  const opacityB = topLayer === 'B' ? 1 : 0;

  return (
    <div
      className={className}
      style={{
        position: 'relative',
        width: '100%',
        height: '100%',
        overflow: 'hidden',
        borderRadius: 'inherit',
        ...style,
      }}
    >
      {/* ── Layer A ── */}
      <div style={{
        position: 'absolute', inset: 0,
        opacity: opacityA,
        transition: `opacity ${TRANS_DUR}ms cubic-bezier(.4,0,.2,1)`,
        zIndex: topLayer === 'A' ? 2 : 1,
      }}>
        <SlideImage src={SLIDES[layerA].src} alt={SLIDES[layerA].alt} active={topLayer === 'A'} />
      </div>

      {/* ── Layer B ── */}
      <div style={{
        position: 'absolute', inset: 0,
        opacity: opacityB,
        transition: `opacity ${TRANS_DUR}ms cubic-bezier(.4,0,.2,1)`,
        zIndex: topLayer === 'B' ? 2 : 1,
      }}>
        <SlideImage src={SLIDES[layerB].src} alt={SLIDES[layerB].alt} active={topLayer === 'B'} />
      </div>

      {/* ── Dot indicators ── */}
      <div style={{
        position: 'absolute', bottom: '1.25rem', left: '50%',
        transform: 'translateX(-50%)', display: 'flex', gap: '.45rem', zIndex: 10,
      }}>
        {SLIDES.map((_, i) => (
          <button
            key={i}
            aria-label={`Slide ${i + 1}`}
            onClick={() => goTo(i)}
            style={{
              width: i === currentIdx ? 24 : 7,
              height: 7,
              borderRadius: 999,
              background: i === currentIdx ? 'var(--gold-light)' : 'rgba(247,244,236,.3)',
              border: 'none', cursor: 'pointer', padding: 0,
              transition: 'width 380ms cubic-bezier(.34,1.56,.64,1), background 300ms ease',
              boxShadow: i === currentIdx ? '0 0 10px rgba(210,181,106,.55)' : 'none',
            }}
          />
        ))}
      </div>

      {/* ── Vignette: bottom + right edge blend ── */}
      <div aria-hidden style={{
        position: 'absolute', inset: 0, zIndex: 5, pointerEvents: 'none',
        background: `
          linear-gradient(to bottom, rgba(21,19,15,.18) 0%, transparent 28%, transparent 55%, rgba(21,19,15,.6) 100%),
          linear-gradient(to left, var(--charcoal) 0%, transparent 28%)
        `,
      }} />
    </div>
  );
}

/* ── Single slide image with Ken Burns zoom ── */
function SlideImage({ src, alt, active }: { src: string; alt: string; active: boolean }) {
  return (
    <Image
      src={src}
      alt={alt}
      fill
      style={{
        objectFit: 'cover',
        objectPosition: 'center',
        transform: active ? 'scale(1.0)' : 'scale(1.06)',
        transition: active
          ? `transform ${INTERVAL + TRANS_DUR}ms cubic-bezier(.25,.46,.45,.94)`
          : 'none',
      }}
      sizes="(max-width: 768px) 100vw, 55vw"
      priority={src === '/hero/hero-1.jpg'}
    />
  );
}
