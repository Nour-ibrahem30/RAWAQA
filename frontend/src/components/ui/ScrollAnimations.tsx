'use client';

import { useEffect, useRef } from 'react';

/* ─── Intersection Observer — reveal on scroll ─── */
export function ScrollReveal() {
  useEffect(() => {
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add('revealed');
            io.unobserve(e.target);
          }
        });
      },
      { threshold: 0.1, rootMargin: '0px 0px -60px 0px' }
    );

    document.querySelectorAll('[data-reveal], [data-stagger]').forEach((el) =>
      io.observe(el)
    );

    return () => io.disconnect();
  }, []);

  return null;
}

/* ─── Scroll Progress Bar ─── */
export function ScrollProgress() {
  const barRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const update = () => {
      const scrolled = window.scrollY;
      const total = document.documentElement.scrollHeight - window.innerHeight;
      const pct = total > 0 ? (scrolled / total) * 100 : 0;
      if (barRef.current) barRef.current.style.width = `${pct}%`;
    };
    window.addEventListener('scroll', update, { passive: true });
    return () => window.removeEventListener('scroll', update);
  }, []);

  return <div ref={barRef} className="scroll-progress" style={{ width: '0%' }} />;
}

/* ─── 3D Card Tilt on mouse move ─── */
export function Tilt3D({ children, className = '', style }: { children: React.ReactNode; className?: string; style?: React.CSSProperties }) {
  const ref = useRef<HTMLDivElement>(null);

  const handleMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width  - 0.5;
    const y = (e.clientY - rect.top)  / rect.height - 0.5;
    ref.current.style.transform = `
      perspective(800px)
      rotateY(${x * 12}deg)
      rotateX(${-y * 8}deg)
      translateZ(8px)
    `;
    ref.current.style.boxShadow = `
      ${-x * 20}px ${-y * 20}px 40px rgba(21,19,15,.18),
      ${x * 8}px ${y * 8}px 16px rgba(173,138,76,.1)
    `;
  };

  const handleLeave = () => {
    if (!ref.current) return;
    ref.current.style.transform = 'perspective(800px) rotateY(0deg) rotateX(0deg) translateZ(0)';
    ref.current.style.boxShadow = '';
  };

  return (
    <div
      ref={ref}
      className={className}
      style={{ transition: 'transform 200ms ease, box-shadow 200ms ease', willChange: 'transform', ...style }}
      onMouseMove={handleMove}
      onMouseLeave={handleLeave}
    >
      {children}
    </div>
  );
}
