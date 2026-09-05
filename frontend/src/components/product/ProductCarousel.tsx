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
  const [visible, setVisible] = useState(3);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const count = products.length;
  const maxIndex = Math.max(0, count - visible);

  useEffect(() => {
    const update = () => setVisible(getVisible(count));
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, [count]);

  const goTo = (idx: number) => setCurrent(Math.max(0, Math.min(idx, maxIndex)));

  // Reset current when maxIndex shrinks (e.g. on resize)
  useEffect(() => {
    if (current > maxIndex) setCurrent(maxIndex);
  }, [maxIndex, current]);

  const startTimer = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setCurrent(prev => (prev >= maxIndex ? 0 : prev + 1));
    }, 3500);
  };

  useEffect(() => {
    startTimer();
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [maxIndex]);

  useEffect(() => {
    if (!trackRef.current) return;
    const cardW = trackRef.current.scrollWidth / count;
    trackRef.current.style.transform = `translateX(${-(current * cardW)}px)`;
  }, [current, count]);

  if (!products.length) return null;

  const GOLD   = 'var(--gold-light)';
  const BORDER = 'rgba(210,181,106,.15)';

  return (
    <div style={{ position: 'relative' }}>
      {/* Track */}
      <div style={{ overflow: 'hidden' }}>
        <div
          ref={trackRef}
          style={{
            display: 'grid',
            gridTemplateColumns: `repeat(${count}, calc(${100 / Math.min(count, 3)}% - 1.2rem))`,
            gap: '1.75rem',
            transition: 'transform 550ms cubic-bezier(.22,.61,.36,1)',
            willChange: 'transform',
          }}
        >
          {products.map(p => <ProductCard key={p.id} product={p} />)}
        </div>
      </div>

      {/* Controls */}
      {count > 1 && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '1rem', marginTop: '2rem' }}>
          <button
            onClick={() => { goTo(current - 1); startTimer(); }}
            disabled={current === 0}
            style={{ width: 36, height: 36, borderRadius: '50%', border: `1px solid ${BORDER}`, background: 'none', color: 'var(--ivory)', fontSize: '1.1rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: current === 0 ? .3 : 1, transition: 'opacity 250ms ease, border-color 250ms ease' }}
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
                style={{ width: i === current ? 20 : 8, height: 8, borderRadius: 999, border: 'none', background: i === current ? GOLD : BORDER, cursor: 'pointer', transition: 'all 350ms ease', padding: 0 }}
              />
            ))}
          </div>

          <button
            onClick={() => { goTo(current + 1); startTimer(); }}
            disabled={current >= maxIndex}
            style={{ width: 36, height: 36, borderRadius: '50%', border: `1px solid ${BORDER}`, background: 'none', color: 'var(--ivory)', fontSize: '1.1rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: current >= maxIndex ? .3 : 1, transition: 'opacity 250ms ease, border-color 250ms ease' }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = GOLD; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = BORDER; }}
          >
            ›
          </button>
        </div>
      )}
    </div>
  );
}
