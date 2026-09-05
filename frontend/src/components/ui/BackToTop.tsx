'use client';

import { useEffect, useState } from 'react';

export default function BackToTop() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const onScroll = () => setVisible(window.scrollY > 400);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const scrollTop = () => window.scrollTo({ top: 0, behavior: 'smooth' });

  return (
    <button
      onClick={scrollTop}
      aria-label="Back to top"
      style={{
        position: 'fixed',
        bottom: '2rem',
        right: '1.75rem',
        zIndex: 900,
        width: 46,
        height: 46,
        borderRadius: '50%',
        background: 'var(--gold-light)',
        color: 'var(--charcoal)',
        border: 'none',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        boxShadow: '0 4px 20px rgba(210,181,106,.45)',
        opacity: visible ? 1 : 0,
        transform: visible ? 'translateY(0) scale(1)' : 'translateY(12px) scale(.85)',
        pointerEvents: visible ? 'auto' : 'none',
        transition: 'opacity 320ms ease, transform 320ms cubic-bezier(.34,1.56,.64,1)',
        willChange: 'transform, opacity',
      }}
      onMouseEnter={e => {
        (e.currentTarget as HTMLButtonElement).style.background = 'var(--gold-pale)';
        (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(-3px) scale(1.08)';
      }}
      onMouseLeave={e => {
        (e.currentTarget as HTMLButtonElement).style.background = 'var(--gold-light)';
        (e.currentTarget as HTMLButtonElement).style.transform = visible ? 'translateY(0) scale(1)' : 'translateY(12px) scale(.85)';
      }}
    >
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
        <path d="M12 19V5M5 12l7-7 7 7" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    </button>
  );
}
