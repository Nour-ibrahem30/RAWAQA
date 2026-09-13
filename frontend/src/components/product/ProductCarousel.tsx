'use client';

import { useEffect, useRef, useState } from 'react';
import ProductCard from './ProductCard';
import type { Product } from '@/lib/types';

function getVisible(count: number) {
  if (typeof window === 'undefined') return Math.min(count, 3);
  if (window.innerWidth < 640) return Math.min(count, 1);
  if (window.innerWidth < 1024) return Math.min(count, 2);
  return Math.min(count, 3);
}

export default function ProductCarousel({ products }: { products: Product[]; locale?: string }) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [current, setCurrent] = useState(0);
  const [visible, setVisible] = useState(4);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const count = products.length;

  useEffect(() => {
    const update = () => {
      if (window.innerWidth < 640) setVisible(1);
      else if (window.innerWidth < 880) setVisible(2);
      else if (window.innerWidth < 1200) setVisible(3);
      else setVisible(4);
    };
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);

  const isSlider = count > visible;
  const maxIndex = isSlider ? count - visible : 0;

  const goTo = (idx: number) => setCurrent(Math.max(0, Math.min(idx, maxIndex)));

  useEffect(() => {
    if (current > maxIndex) setCurrent(maxIndex);
  }, [maxIndex, current]);

  const startTimer = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (!isSlider) return;
    timerRef.current = setInterval(() => {
      setCurrent(prev => (prev >= maxIndex ? 0 : prev + 1));
    }, 3500);
  };

  useEffect(() => {
    if (isSlider) {
      startTimer();
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isSlider, maxIndex]);

  useEffect(() => {
    if (!trackRef.current || !isSlider) return;
    const itemWidth = trackRef.current.scrollWidth / count;
    trackRef.current.style.transform = `translateX(${-(current * itemWidth)}px)`;
  }, [current, count, isSlider, visible]);

  if (!products.length) return null;

  const GOLD   = 'var(--gold-light)';
  const BORDER = 'rgba(210,181,106,.15)';

  // Static flex layout for few items: never stretch cards across screen width
  if (!isSlider) {
    return (
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: '1.5rem',
          justifyContent: count <= 2 ? 'center' : 'flex-start',
        }}
      >
        {products.map(p => (
          <div
            key={p.id}
            style={{
              width: '100%',
              maxWidth: '280px',
              flex: '0 1 280px',
            }}
          >
            <ProductCard product={p} />
          </div>
        ))}
      </div>
    );
  }

  // Carousel slider when items exceed visible count
  return (
    <div style={{ position: 'relative' }}>
      <div style={{ overflow: 'hidden', padding: '0.5rem 0' }}>
        <div
          ref={trackRef}
          style={{
            display: 'flex',
            gap: '1.5rem',
            transition: 'transform 550ms cubic-bezier(.22,.61,.36,1)',
            willChange: 'transform',
          }}
        >
          {products.map(p => (
            <div
              key={p.id}
              style={{
                flex: `0 0 calc((100% - ${(visible - 1) * 1.5}rem) / ${visible})`,
                maxWidth: '300px',
              }}
            >
              <ProductCard product={p} />
            </div>
          ))}
        </div>
      </div>

      {/* Controls */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '1rem', marginTop: '2rem' }}>
        <button
          onClick={() => { goTo(current - 1); startTimer(); }}
          disabled={current === 0}
          aria-label="Previous products"
          style={{
            width: 36, height: 36, borderRadius: '50%', border: `1px solid ${BORDER}`,
            background: 'none', color: 'var(--ivory)', fontSize: '1.1rem', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            opacity: current === 0 ? .3 : 1, transition: 'opacity 250ms ease, border-color 250ms ease',
          }}
          onMouseEnter={e => { e.currentTarget.style.borderColor = GOLD; }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = BORDER; }}
        >
          ‹
        </button>

        <div style={{ display: 'flex', gap: '.5rem' }}>
          {Array.from({ length: maxIndex + 1 }).map((_, i) => (
            <button
              key={i}
              onClick={() => { goTo(i); startTimer(); }}
              aria-label={`Slide ${i + 1}`}
              style={{
                width: i === current ? 20 : 8, height: 8, borderRadius: 999, border: 'none',
                background: i === current ? GOLD : BORDER, cursor: 'pointer',
                transition: 'all 350ms ease', padding: 0,
              }}
            />
          ))}
        </div>

        <button
          onClick={() => { goTo(current + 1); startTimer(); }}
          disabled={current >= maxIndex}
          aria-label="Next products"
          style={{
            width: 36, height: 36, borderRadius: '50%', border: `1px solid ${BORDER}`,
            background: 'none', color: 'var(--ivory)', fontSize: '1.1rem', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            opacity: current >= maxIndex ? .3 : 1, transition: 'opacity 250ms ease, border-color 250ms ease',
          }}
          onMouseEnter={e => { e.currentTarget.style.borderColor = GOLD; }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = BORDER; }}
        >
          ›
        </button>
      </div>
    </div>
  );
}
