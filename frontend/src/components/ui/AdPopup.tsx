'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { adsApi, type Ad } from '@/lib/api';

// Static fallback
const FALLBACK: Ad = {
  _id: 'popup-1',
  titleAr: 'عرض خاص — رواقة',
  titleEn: 'Special Offer — Rawaqa',
  subtitleAr: 'تسوق الآن واستمتع بأفضل أسعار كراسي البين باج',
  subtitleEn: 'Shop now and enjoy the best prices on bean bag chairs',
  imageUrl: '/products/ads/ad-1.jpg',
  linkUrl: '/shop',
  placement: 'homepage_banner',
  isActive: true,
  order: 0,
  createdAt: '',
};

const SESSION_KEY = 'rawaqa_ad_shown';
// Show popup once per browser session, not every page reload
const DELAY_MS = 5000; // 5 seconds after page load

interface Props {
  locale: string;
}

export default function AdPopup({ locale }: Props) {
  const isAr = locale === 'ar';
  const [ad, setAd] = useState<Ad | null>(null);
  const [visible, setVisible] = useState(false);
  const [closing, setClosing] = useState(false);
  const [imgLoaded, setImgLoaded] = useState(false);

  // Fetch active ads
  useEffect(() => {
    // Don't show if already shown this session
    if (typeof sessionStorage !== 'undefined' && sessionStorage.getItem(SESSION_KEY)) return;

    adsApi.list('homepage_banner')
      .then(r => {
        const active = (r.data ?? []).filter(a => a.isActive);
        setAd(active.length > 0 ? active[0] : FALLBACK);
      })
      .catch(() => setAd(FALLBACK));
  }, []);

  // Show after delay
  useEffect(() => {
    if (!ad) return;
    const id = setTimeout(() => setVisible(true), DELAY_MS);
    return () => clearTimeout(id);
  }, [ad]);

  // Exit-intent: mouse leaves top of viewport
  useEffect(() => {
    if (!ad || visible) return;
    const handler = (e: MouseEvent) => {
      if (e.clientY < 10) setVisible(true);
    };
    document.addEventListener('mouseleave', handler);
    return () => document.removeEventListener('mouseleave', handler);
  }, [ad, visible]);

  const close = useCallback(() => {
    setClosing(true);
    setTimeout(() => {
      setVisible(false);
      setClosing(false);
      if (typeof sessionStorage !== 'undefined') {
        sessionStorage.setItem(SESSION_KEY, '1');
      }
    }, 350);
  }, []);

  // Close on Escape key
  useEffect(() => {
    if (!visible) return;
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') close(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [visible, close]);

  if (!visible || !ad) return null;

  const title    = isAr ? ad.titleAr    : ad.titleEn;
  const subtitle = isAr ? ad.subtitleAr : ad.subtitleEn;
  const href     = ad.linkUrl
    ? `/${locale}${ad.linkUrl.startsWith('/') ? ad.linkUrl : '/' + ad.linkUrl}`
    : `/${locale}/shop`;

  return (
    /* ── Backdrop ── */
    <div
      onClick={close}
      style={{
        position: 'fixed', inset: 0, zIndex: 9999,
        background: 'rgba(0,0,0,.72)',
        backdropFilter: 'blur(4px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '1.25rem',
        opacity: closing ? 0 : 1,
        transition: 'opacity 350ms ease',
        animation: closing ? 'none' : 'fadeIn 350ms ease',
      }}
    >
      {/* ── Card ── */}
      <div
        onClick={e => e.stopPropagation()}
        style={{
          position: 'relative',
          width: '100%',
          maxWidth: 560,
          borderRadius: 24,
          overflow: 'hidden',
          background: '#15130F',
          border: '1px solid rgba(210,181,106,.2)',
          boxShadow: '0 40px 100px rgba(0,0,0,.8), 0 0 0 1px rgba(210,181,106,.08) inset',
          transform: closing ? 'scale(.95) translateY(12px)' : 'scale(1) translateY(0)',
          transition: 'transform 350ms cubic-bezier(.22,.61,.36,1)',
          animation: closing ? 'none' : 'scaleIn 380ms cubic-bezier(.22,.61,.36,1)',
        }}
      >
        {/* Close button */}
        <button
          onClick={close}
          aria-label="Close ad"
          style={{
            position: 'absolute', top: '.875rem',
            [isAr ? 'left' : 'right']: '.875rem',
            zIndex: 10, width: 36, height: 36, borderRadius: '50%',
            background: 'rgba(15,14,10,.8)', backdropFilter: 'blur(8px)',
            border: '1px solid rgba(210,181,106,.2)',
            color: 'rgba(247,244,236,.7)', fontSize: '1rem', lineHeight: 1,
            cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
            transition: 'all 200ms ease',
          }}
          onMouseEnter={e => { e.currentTarget.style.background = 'rgba(210,181,106,.2)'; e.currentTarget.style.color = '#fff'; }}
          onMouseLeave={e => { e.currentTarget.style.background = 'rgba(15,14,10,.8)'; e.currentTarget.style.color = 'rgba(247,244,236,.7)'; }}
        >
          ✕
        </button>

        {/* Image */}
        <div style={{ position: 'relative', aspectRatio: '16/8', overflow: 'hidden', background: '#1a1710' }}>
          <Image
            src={ad.imageUrl}
            alt={title}
            fill
            style={{
              objectFit: 'cover',
              opacity: imgLoaded ? 1 : 0,
              transition: 'opacity 500ms ease, transform 8s ease',
              transform: 'scale(1.04)',
            }}
            sizes="560px"
            onLoad={() => setImgLoaded(true)}
          />
          {/* gradient */}
          <div style={{
            position: 'absolute', inset: 0,
            background: 'linear-gradient(to bottom, transparent 30%, rgba(21,19,15,.9) 100%)',
          }} />
        </div>

        {/* Content */}
        <div style={{ padding: '1.5rem 1.75rem 1.75rem', textAlign: isAr ? 'right' : 'left' }}>
          <p style={{
            fontSize: '.62rem', letterSpacing: '.2em', textTransform: 'uppercase',
            color: 'var(--gold-light)', marginBottom: '.5rem',
          }}>
            {isAr ? '🎉 عرض خاص' : '🎉 Special Offer'}
          </p>
          <h2 style={{
            fontFamily: 'var(--font-fraunces, serif)',
            fontSize: 'clamp(1.2rem, 3vw, 1.6rem)',
            fontWeight: 300, color: '#fff', lineHeight: 1.2, marginBottom: '.6rem',
          }}>
            {title}
          </h2>
          {subtitle && (
            <p style={{
              fontSize: '.875rem', color: 'rgba(247,244,236,.55)',
              lineHeight: 1.65, marginBottom: '1.5rem',
            }}>
              {subtitle}
            </p>
          )}

          <div style={{ display: 'flex', gap: '.875rem', flexWrap: 'wrap', justifyContent: isAr ? 'flex-end' : 'flex-start' }}>
            <Link
              href={href}
              onClick={close}
              style={{
                display: 'inline-block',
                background: 'var(--gold-light)',
                color: 'var(--charcoal)',
                fontWeight: 700, fontSize: '.875rem',
                padding: '.7rem 1.75rem', borderRadius: 999,
                textDecoration: 'none', letterSpacing: '.04em',
                transition: 'transform 200ms ease, box-shadow 200ms ease',
              }}
              onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 8px 24px rgba(210,181,106,.4)'; }}
              onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = 'none'; }}
            >
              {isAr ? 'تسوق الآن ←' : 'Shop Now →'}
            </Link>
            <button
              onClick={close}
              style={{
                background: 'none',
                border: '1px solid rgba(210,181,106,.2)',
                color: 'rgba(247,244,236,.45)',
                fontSize: '.82rem', padding: '.7rem 1.25rem',
                borderRadius: 999, cursor: 'pointer',
                transition: 'all 200ms ease',
              }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(210,181,106,.5)'; e.currentTarget.style.color = 'rgba(247,244,236,.7)'; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(210,181,106,.2)'; e.currentTarget.style.color = 'rgba(247,244,236,.45)'; }}
            >
              {isAr ? 'لاحقاً' : 'Maybe Later'}
            </button>
          </div>
        </div>

        {/* Top shimmer line */}
        <div style={{ position: 'absolute', top: 0, left: '15%', right: '15%', height: 1, background: 'linear-gradient(90deg, transparent, rgba(210,181,106,.5), transparent)' }} />
      </div>
    </div>
  );
}
