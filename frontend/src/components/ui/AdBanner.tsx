'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { adsApi, type Ad } from '@/lib/api';

// Static fallback ads using the local images
const FALLBACK_ADS: Ad[] = [
  {
    _id: 'static-1',
    titleAr: 'بين باج رواقة',
    titleEn: 'Rawaqa Bean Bags',
    subtitleAr: 'راحة حقيقية في كل لحظة',
    subtitleEn: 'Real comfort in every moment',
    imageUrl: '/products/ads/ad-1.jpg',
    linkUrl: '/shop',
    placement: 'homepage_banner',
    isActive: true,
    order: 0,
    createdAt: '',
  },
  {
    _id: 'static-2',
    titleAr: 'مجموعة جديدة',
    titleEn: 'New Collection',
    subtitleAr: 'اكتشف أحدث تصاميمنا',
    subtitleEn: 'Discover our latest designs',
    imageUrl: '/products/ads/ad-2.jpg',
    linkUrl: '/shop',
    placement: 'homepage_mid',
    isActive: true,
    order: 1,
    createdAt: '',
  },
];

interface AdBannerProps {
  placement?: 'homepage_banner' | 'homepage_mid' | 'shop_sidebar' | 'product_page';
  locale: string;
  className?: string;
}

export default function AdBanner({ placement = 'homepage_banner', locale, className }: AdBannerProps) {
  const isAr = locale === 'ar';
  const [ads, setAds] = useState<Ad[]>([]);
  const [activeIdx, setActiveIdx] = useState(0);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    adsApi.list(placement)
      .then(r => {
        const data = r.data ?? [];
        setAds(data.length > 0 ? data : FALLBACK_ADS.filter(a => a.placement === placement));
      })
      .catch(() => {
        setAds(FALLBACK_ADS.filter(a => a.placement === placement));
      })
      .finally(() => setLoaded(true));
  }, [placement]);

  // Auto-rotate when multiple ads
  useEffect(() => {
    if (ads.length <= 1) return;
    const id = setInterval(() => {
      setActiveIdx(i => (i + 1) % ads.length);
    }, 5000);
    return () => clearInterval(id);
  }, [ads.length]);

  if (!loaded || ads.length === 0) return null;

  const ad = ads[activeIdx];
  if (!ad) return null;

  const title    = isAr ? ad.titleAr    : ad.titleEn;
  const subtitle = isAr ? ad.subtitleAr : ad.subtitleEn;
  const href     = ad.linkUrl ? `/${locale}${ad.linkUrl.startsWith('/') ? ad.linkUrl : '/' + ad.linkUrl}` : `/${locale}/shop`;

  const inner = (
    <div style={{
      position: 'relative',
      width: '100%',
      overflow: 'hidden',
      borderRadius: 20,
      aspectRatio: placement === 'homepage_mid' ? '21/7' : '21/8',
      background: '#1a1710',
      boxShadow: '0 8px 40px rgba(0,0,0,.4)',
      cursor: ad.linkUrl ? 'pointer' : 'default',
    }}>
      {/* Image */}
      <Image
        key={ad._id}
        src={ad.imageUrl}
        alt={title}
        fill
        style={{
          objectFit: 'cover',
          transition: 'transform 600ms cubic-bezier(.22,.61,.36,1)',
        }}
        sizes="(max-width:768px) 100vw, 1200px"
        priority={activeIdx === 0}
      />

      {/* Gradient overlay */}
      <div style={{
        position: 'absolute', inset: 0,
        background: isAr
          ? 'linear-gradient(to left, rgba(15,14,10,.85) 0%, rgba(15,14,10,.4) 45%, transparent 100%)'
          : 'linear-gradient(to right, rgba(15,14,10,.85) 0%, rgba(15,14,10,.4) 45%, transparent 100%)',
      }} />

      {/* Text */}
      <div style={{
        position: 'absolute',
        inset: 0,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        padding: 'clamp(1.5rem, 4vw, 3rem)',
        [isAr ? 'paddingRight' : 'paddingLeft']: 'clamp(1.5rem, 5vw, 4rem)',
        textAlign: isAr ? 'right' : 'left',
        [isAr ? 'alignItems' : 'alignItems']: 'flex-start',
      }}>
        <p style={{
          fontSize: '.65rem', letterSpacing: '.2em', textTransform: 'uppercase',
          color: 'var(--gold-light)', marginBottom: '.5rem',
          opacity: 0, animation: 'fadeSlideUp 500ms 100ms forwards',
        }}>
          {isAr ? 'عرض خاص' : 'Special Offer'}
        </p>
        <h3 style={{
          fontFamily: 'var(--font-fraunces, serif)',
          fontSize: 'clamp(1.2rem, 3.5vw, 2.2rem)',
          fontWeight: 300,
          color: '#fff',
          lineHeight: 1.2,
          marginBottom: subtitle ? '.6rem' : '1.25rem',
          opacity: 0,
          animation: 'fadeSlideUp 500ms 200ms forwards',
        }}>
          {title}
        </h3>
        {subtitle && (
          <p style={{
            fontSize: 'clamp(.8rem, 1.5vw, 1rem)',
            color: 'rgba(255,255,255,.65)',
            lineHeight: 1.6,
            marginBottom: '1.25rem',
            maxWidth: '36ch',
            opacity: 0,
            animation: 'fadeSlideUp 500ms 300ms forwards',
          }}>
            {subtitle}
          </p>
        )}
        <div style={{ opacity: 0, animation: 'fadeSlideUp 500ms 400ms forwards' }}>
          <span style={{
            display: 'inline-block',
            background: 'var(--gold-light)',
            color: 'var(--charcoal)',
            fontWeight: 700,
            fontSize: '.78rem',
            letterSpacing: '.08em',
            padding: '.55rem 1.4rem',
            borderRadius: 999,
          }}>
            {isAr ? 'تسوق الآن' : 'Shop Now'} {isAr ? '←' : '→'}
          </span>
        </div>
      </div>

      {/* Dot indicators for multiple ads */}
      {ads.length > 1 && (
        <div style={{
          position: 'absolute', bottom: '1rem', left: 0, right: 0,
          display: 'flex', justifyContent: 'center', gap: '.4rem', zIndex: 2,
        }}>
          {ads.map((_, i) => (
            <button
              key={i}
              onClick={e => { e.preventDefault(); e.stopPropagation(); setActiveIdx(i); }}
              aria-label={`Ad ${i + 1}`}
              style={{
                width: i === activeIdx ? 22 : 7,
                height: 7,
                borderRadius: 999,
                border: 'none',
                background: i === activeIdx ? 'var(--gold-light)' : 'rgba(255,255,255,.4)',
                cursor: 'pointer',
                padding: 0,
                transition: 'all 300ms ease',
              }}
            />
          ))}
        </div>
      )}
    </div>
  );

  return (
    <div className={className}>
      {ad.linkUrl ? (
        <Link href={href} style={{ display: 'block', textDecoration: 'none' }}>
          {inner}
        </Link>
      ) : inner}
    </div>
  );
}
