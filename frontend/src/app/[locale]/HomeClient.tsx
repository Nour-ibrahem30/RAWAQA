'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useTranslations } from 'next-intl';
import ProductCard from '@/components/product/ProductCard';
import { SkeletonGrid } from '@/components/ui/SkeletonCard';
import { Tilt3D } from '@/components/ui/ScrollAnimations';
import LoadingScreen from '@/components/ui/LoadingScreen';
import HeroSlideshow from '@/components/ui/HeroSlideshow';
import AdPopup from '@/components/ui/AdPopup';
import { productsApi } from '@/lib/api';
import { useSiteContent, locContent } from '@/lib/useSiteContent';
import { STATIC_PRODUCTS } from '@/lib/staticProducts';
import type { Product } from '@/lib/types';

/* ─── Category config ─────────────────────────────────────── */
const CATS = [
  { key: 'relax',   color: '#A8543A', icon: '🛋️', image: 'https://res.cloudinary.com/dr5welrvq/image/upload/v1788812671/rawaqa/products/chair-lounge-new/img-1.jpg' },
  { key: 'game',    color: '#3B5578', icon: '🎮', image: 'https://res.cloudinary.com/dr5welrvq/image/upload/v1788812686/rawaqa/products/8ball-new/img-1.jpg' },
  { key: 'kids',    color: '#BE8F2E', icon: '🧸', image: 'https://res.cloudinary.com/dr5welrvq/image/upload/v1788812750/rawaqa/products/football-new/img-1.jpg' },
  { key: 'outdoor', color: '#4B5B45', icon: '🌿', image: 'https://res.cloudinary.com/dr5welrvq/image/upload/v1788812766/rawaqa/products/football-new/img-5.jpg' },
];

/* ─── Reviews ─────────────────────────────────────────────── */
const REVIEWS = [
  { name: 'أحمد محمد', nameEn: 'Ahmed Mohamed', rating: 5,
    textAr: 'جودة رائعة وراحة لا تُصدق. أنصح به بشدة!',
    textEn: 'Amazing quality and incredible comfort. Highly recommended!' },
  { name: 'سارة علي', nameEn: 'Sara Ali', rating: 5,
    textAr: 'وصل بسرعة والتغليف ممتاز. الكرسي جميل جداً في غرفتي.',
    textEn: 'Arrived fast with excellent packaging. The chair looks beautiful in my room.' },
  { name: 'محمود حسن', nameEn: 'Mahmoud Hassan', rating: 5,
    textAr: 'اشتريت واحد لابني وأصبح لا يفارقه. مواد عالية الجودة.',
    textEn: 'Bought one for my son and he never leaves it. High quality materials.' },
];

/* ─── Floating Particles (rich golden system) ────────────────── */
function Particles() {
  // Rising particles — varied sizes, gold + white
  const rising = Array.from({ length: 22 }, (_, i) => ({
    left:     `${5 + (i * 4.3) % 91}%`,
    size:     i % 5 === 0 ? 4 : i % 3 === 0 ? 3 : i % 2 === 0 ? 2 : 1.5,
    dur:      `${11 + (i * 2.7) % 16}s`,
    delay:    `${(i * 1.8) % 12}s`,
    dx:       `${-30 + (i * 11) % 60}px`,
    gold:     i % 3 !== 0,
    bottom:   `${(i * 7) % 40}%`,
  }));

  // Floating ambient orbs
  const orbs = Array.from({ length: 8 }, (_, i) => ({
    left:  `${8 + (i * 11.5) % 82}%`,
    top:   `${15 + (i * 13) % 65}%`,
    size:  12 + (i * 5) % 20,
    dur:   `${7 + (i * 1.3) % 8}s`,
    delay: `${i * 0.9}s`,
  }));

  // Golden streaks
  const streaks = Array.from({ length: 5 }, (_, i) => ({
    top:    `${15 + i * 16}%`,
    width:  `${80 + i * 40}px`,
    dur:    `${14 + i * 3}s`,
    delay:  `${i * 4.5}s`,
    angle:  `${18 + i * 4}deg`,
  }));

  return (
    <div aria-hidden style={{ position: 'absolute', inset: 0, pointerEvents: 'none', overflow: 'hidden' }}>
      {/* Rising particles */}
      {rising.map((p, i) => (
        <div
          key={`r${i}`}
          className={`particle-v2 ${p.gold ? 'gold' : 'white'} rise`}
          style={{
            left: p.left,
            bottom: p.bottom,
            width: p.size,
            height: p.size,
            animationDuration: p.dur,
            animationDelay: p.delay,
            '--dx': p.dx,
          } as React.CSSProperties}
        />
      ))}

      {/* Ambient floating orbs */}
      {orbs.map((o, i) => (
        <div
          key={`o${i}`}
          className="particle-v2 gold orbit"
          style={{
            left: o.left,
            top: o.top,
            width: o.size,
            height: o.size,
            opacity: 0.12 + (i % 4) * 0.04,
            animationDuration: o.dur,
            animationDelay: o.delay,
          }}
        />
      ))}

      {/* Golden streaks */}
      {streaks.map((s, i) => (
        <div
          key={`s${i}`}
          className="streak"
          style={{
            top: s.top,
            left: '-100px',
            width: s.width,
            animationDuration: s.dur,
            animationDelay: s.delay,
            '--angle': s.angle,
          } as React.CSSProperties}
        />
      ))}
    </div>
  );
}

/* ════════════════════════════════════════════════════════════
   HOME PAGE
════════════════════════════════════════════════════════════ */
export default function HomeClient({ locale }: { locale: string }) {
  const t    = useTranslations('home');
  const isAr = locale === 'ar';
  const { data: heroContent }  = useSiteContent('hero');
  const { data: aboutContent } = useSiteContent('about');
  const { data: whyContent }   = useSiteContent('why');
  const { data: ctaContent }   = useSiteContent('cta');
  const { data: statsContent } = useSiteContent('stats');
  const [featured, setFeatured] = useState<Product[]>(
    STATIC_PRODUCTS.filter(p => p.featured).slice(0, 4)
  );
  const [loading, setLoading]   = useState(false); // eslint-disable-line @typescript-eslint/no-unused-vars
  const [statsVisible, setStats] = useState(false);
  const statsRef = useRef<HTMLDivElement>(null);
  const [activeReview, setActiveReview] = useState(0);

  // Section reveal refs
  const categoriesRef = useRef<HTMLElement>(null);
  const featuredRef   = useRef<HTMLElement>(null);
  const aboutRef      = useRef<HTMLElement>(null);
  const whyRef        = useRef<HTMLElement>(null);
  const reviewsRef    = useRef<HTMLElement>(null);
  const [catsVisible,     setCatsVisible]     = useState(false);
  const [featuredVisible, setFeaturedVisible] = useState(false);
  const [aboutVisible,    setAboutVisible]    = useState(false);
  const [whyVisible,      setWhyVisible]      = useState(false);
  const [reviewsVisible,  setReviewsVisible]  = useState(false);

  useEffect(() => {
    productsApi.featured(locale)
      .then(r => { if (r.data?.length) setFeatured(r.data.slice(0, 4)); })
      .catch(() => {/* keep static fallback */});
  }, [locale]);

  useEffect(() => {
    const timer = setInterval(() => {
      setActiveReview(prev => (prev + 1) % REVIEWS.length);
    }, 5000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!statsRef.current) return;
    const io = new IntersectionObserver(([e]) => {
      if (e.isIntersecting) { setStats(true); io.disconnect(); }
    }, { threshold: 0.3 });
    io.observe(statsRef.current);
    return () => io.disconnect();
  }, []);

  // Section reveal observers
  useEffect(() => {
    const sections: [React.RefObject<HTMLElement>, (v: boolean) => void][] = [
      [categoriesRef, setCatsVisible],
      [featuredRef,   setFeaturedVisible],
      [aboutRef,      setAboutVisible],
      [whyRef,        setWhyVisible],
      [reviewsRef,    setReviewsVisible],
    ];
    const observers = sections.map(([ref, setter]) => {
      if (!ref.current) return null;
      const io = new IntersectionObserver(([e]) => {
        if (e.isIntersecting) { setter(true); io.disconnect(); }
      }, { threshold: 0.08 });
      io.observe(ref.current);
      return io;
    });
    return () => observers.forEach(io => io?.disconnect());
  }, []);

  return (
    <>
      <LoadingScreen />
      <AdPopup locale={locale} />
      {/* ═══════════════════════════════════════════════
          HERO
          Layout: Text (left/right) + 3D Bag (right/left)
          Best for Arabic: text on RIGHT, bag on LEFT
          Best for English: text on LEFT, bag on RIGHT
      ═══════════════════════════════════════════════ */}
      <section style={{
        position: 'relative',
        minHeight: '100vh',
        background: 'var(--charcoal)',
        color: 'var(--ivory)',
        overflow: 'hidden',
        display: 'flex',
        alignItems: 'center',
      }}>
        {/* Background glows */}
        <div aria-hidden style={{
          position: 'absolute', inset: 0, pointerEvents: 'none',
          background: 'radial-gradient(ellipse 55% 65% at 30% 50%, rgba(173,138,76,.16) 0%, transparent 70%)',
        }} />
        <div aria-hidden style={{
          position: 'absolute', inset: 0, pointerEvents: 'none',
          background: 'radial-gradient(ellipse 40% 40% at 80% 70%, rgba(168,84,58,.1) 0%, transparent 65%)',
        }} />
        <Particles />

        <div className="wrap relative z-10 pt-24 pb-12 sm:pt-32 sm:pb-20 md:pt-40 md:pb-24 grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
          {/* ── Text block ── */}
          <div className="lg:col-span-7">
            {/* Eyebrow */}
            <p style={{
              fontSize: '.7rem',
              letterSpacing: '.22em',
              textTransform: 'uppercase',
              color: 'var(--gold-light)',
              marginBottom: '1.25rem',
              opacity: 0,
              animation: 'fadeSlideUp 600ms 100ms forwards',
            }}>
              {locContent(heroContent, 'eyebrow', locale) || t('hero.eyebrow')}
            </p>

            {/* Headline */}
            <h1 className="display-1" style={{
              color: 'var(--ivory)',
              marginBottom: '1.5rem',
              opacity: 0,
              animation: 'fadeSlideUp 700ms 220ms forwards',
            }}>
              <span style={{
                background: 'linear-gradient(135deg, var(--gold-light) 0%, var(--dune) 50%, var(--gold) 100%)',
                backgroundSize: '200% auto',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
                animation: 'shimmerGold 4s linear infinite',
                display: 'block',
              }}>
                {(locContent(heroContent, 'headline', locale) || t('hero.headline')).split('\n')[0]}
              </span>
              <span style={{ color: 'var(--ivory)', display: 'block' }}>
                {(locContent(heroContent, 'headline', locale) || t('hero.headline')).split('\n')[1] || ''}
              </span>
            </h1>

            {/* Sub */}
            <p style={{
              fontSize: 'clamp(1rem, 1.3vw, 1.15rem)',
              lineHeight: 1.7,
              color: 'rgba(247,244,236,.68)',
              maxWidth: '42ch',
              marginBottom: '2.25rem',
              opacity: 0,
              animation: 'fadeSlideUp 700ms 340ms forwards',
            }}>
              {locContent(heroContent, 'sub', locale) || t('hero.sub')}
            </p>

            {/* CTAs */}
            <div style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: '.875rem',
              opacity: 0,
              animation: 'fadeSlideUp 700ms 460ms forwards',
            }}>
              <Link href={`/${locale}/shop`} className="btn btn-gold">
                {locContent(heroContent, 'ctaShop', locale) || t('hero.cta_shop')}
              </Link>
              <Link href={`/${locale}/shop`} className="btn btn-line-dark">
                {locContent(heroContent, 'ctaDiscover', locale) || t('hero.cta_discover')}
              </Link>
            </div>

            {/* Stats */}
            <div ref={statsRef} style={{
              display: 'flex',
              gap: '2.5rem',
              marginTop: '3rem',
              paddingTop: '2rem',
              borderTop: '1px solid rgba(210,181,106,.15)',
              flexWrap: 'wrap',
              opacity: 0,
              animation: 'fadeSlideUp 700ms 600ms forwards',
            }}>
              {(statsContent?.items || [
                { num: '500+', labelAr: 'عميل سعيد',    labelEn: 'Happy Clients' },
                { num: '4.9★', labelAr: 'تقييم العملاء', labelEn: 'Customer Rating' },
                { num: '100%', labelAr: 'صنع في مصر',   labelEn: 'Made in Egypt' },
              ] as any[]).map((s: any, i: number) => (
                <div key={i}>
                  <p style={{
                    fontSize: 'clamp(1.4rem, 2.5vw, 1.9rem)',
                    fontWeight: 800,
                    color: 'var(--gold-light)',
                    lineHeight: 1,
                    fontFamily: isAr ? 'var(--font-cairo, Cairo, sans-serif)' : 'var(--font-fraunces, serif)',
                    transform: statsVisible ? 'none' : 'translateY(12px)',
                    opacity: statsVisible ? 1 : 0,
                    transition: `all 500ms ${i * 120}ms ease`,
                  }}>
                    {s.num}
                  </p>
                  <p style={{ fontSize: '.72rem', color: 'rgba(247,244,236,.42)', marginTop: '.2rem' }}>
                    {isAr ? (s.labelAr || s.ar) : (s.labelEn || s.en)}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* ── Slideshow ── */}
          <div
            className="hero-slideshow-wrap lg:col-span-5 relative w-full aspect-[4/5] sm:aspect-square max-w-sm sm:max-w-md mx-auto lg:max-w-none rounded-[28px] overflow-hidden shadow-2xl"
            style={{
              opacity: 0,
              animation: 'fadeIn 900ms 300ms forwards',
              boxShadow: '0 40px 100px rgba(0,0,0,.6), 0 0 0 1px rgba(210,181,106,.1)',
            }}>
            <HeroSlideshow style={{ borderRadius: 28 }} />
          </div>
        </div>

        {/* Bottom fade */}
        <div aria-hidden style={{
          position: 'absolute', bottom: 0, insetInline: 0, height: 80, pointerEvents: 'none',
          background: 'linear-gradient(to bottom, transparent, rgba(21,19,15,.6))',
        }} />
      </section>

      {/* ═══════════════════════════════════════════════
          CATEGORIES — 3D tilt
      ═══════════════════════════════════════════════ */}
      <section
        ref={categoriesRef}
        style={{
          padding: '5.5rem 0',
          background: '#1a1710',
          overflow: 'hidden',
        }}
        className={`section-reveal${catsVisible ? ' visible' : ''}`}
      >
        <div className="wrap">
          <div data-reveal="up" style={{ textAlign: 'center', marginBottom: '3rem' }}>
            <p style={{ fontSize: '.7rem', letterSpacing: '.2em', textTransform: 'uppercase', color: 'var(--gold-light)', marginBottom: '.6rem' }}>
              {isAr ? 'اكتشف' : 'Explore'}
            </p>
            <h2 className="display-3" style={{ color: 'var(--ivory)' }}>
              {t('discover.title')}
            </h2>
          </div>

          <div data-stagger style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '1rem',
          }}>
            {CATS.map((cat) => (
              <Tilt3D key={cat.key} className="category-tile" style={{
                borderRadius: 20,
                overflow: 'hidden',
                aspectRatio: '1',
              }}>
                <Link href={`/${locale}/shop?category=${cat.key}`} style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'flex-start',
                  justifyContent: 'flex-end',
                  height: '100%',
                  padding: '1.25rem',
                  position: 'relative',
                  overflow: 'hidden',
                  borderRadius: 20,
                }}>
                  {/* Real product photo background */}
                  <Image
                    src={cat.image}
                    alt={cat.key}
                    fill
                    style={{ objectFit: 'cover', transition: 'transform 500ms ease' }}
                    sizes="(max-width: 640px) 100vw, 25vw"
                    className="cat-img"
                  />
                  {/* Dark gradient overlay */}
                  <div aria-hidden style={{
                    position: 'absolute', inset: 0,
                    background: `linear-gradient(160deg, ${cat.color}88 0%, ${cat.color}cc 100%)`,
                    mixBlendMode: 'multiply',
                  }} />
                  <div aria-hidden style={{
                    position: 'absolute', inset: 0,
                    background: 'linear-gradient(to top, rgba(0,0,0,.6) 0%, transparent 55%)',
                  }} />
                  <span style={{
                    color: 'white', fontWeight: 700, fontSize: '.95rem',
                    letterSpacing: isAr ? '.02em' : '.08em',
                    textTransform: 'uppercase',
                    position: 'relative', zIndex: 1,
                    textShadow: '0 2px 8px rgba(0,0,0,.5)',
                  }}>
                    {t(`discover.${cat.key}` as 'discover.relax')}
                  </span>
                  <span aria-hidden style={{
                    position: 'absolute', top: '.85rem',
                    [isAr ? 'left' : 'right']: '.85rem',
                    color: 'rgba(255,255,255,.8)', fontSize: '1rem',
                    zIndex: 1,
                  }}>{isAr ? '←' : '→'}</span>
                </Link>
              </Tilt3D>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════
          FEATURED PRODUCTS
      ═══════════════════════════════════════════════ */}
      <section
        ref={featuredRef}
        style={{ padding: '6.5rem 0', background: '#12100c', position: 'relative', overflow: 'hidden' }}
        className={`section-reveal${featuredVisible ? ' visible' : ''}`}
      >
        {/* Ambient background glow */}
        <div aria-hidden style={{
          position: 'absolute', top: '20%', [isAr ? 'right' : 'left']: '5%',
          width: '35vw', height: '35vw', minWidth: 280,
          background: 'radial-gradient(circle, rgba(210,181,106,.07) 0%, transparent 70%)',
          pointerEvents: 'none',
        }} />

        <div className="wrap relative z-10">
          {/* Header */}
          <div data-reveal="up" className="flex flex-col sm:flex-row sm:items-end justify-between mb-10 sm:mb-14 gap-5">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full mb-3" style={{ background: 'rgba(210,181,106,.1)', border: '1px solid rgba(210,181,106,.2)' }}>
                <span style={{ fontSize: '.68rem', letterSpacing: '.16em', textTransform: 'uppercase', color: 'var(--gold-light)', fontWeight: 700 }}>
                  ✨ {isAr ? 'اختيارات الموسم' : 'CURATED COLLECTION'}
                </span>
              </div>
              <h2 className="display-3" style={{ color: 'var(--ivory)' }}>{t('featured.title')}</h2>
            </div>
            <Link
              href={`/${locale}/shop`}
              className="btn btn-line-dark btn-sm inline-flex items-center gap-2 self-start sm:self-auto hover:shadow-lg transition-all"
            >
              <span>{t('featured.view_all')}</span>
              <span>{isAr ? '←' : '→'}</span>
            </Link>
          </div>

          {/* Grid */}
          {loading ? (
            <SkeletonGrid count={3} />
          ) : (
            <div data-stagger className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8 max-w-5xl mx-auto">
              {featured.slice(0, 3).map(p => (
                <div key={p.id} className="product-card-stagger max-w-[310px] sm:max-w-none mx-auto w-full transition-transform duration-300 hover:-translate-y-1">
                  <ProductCard product={p} />
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* ═══════════════════════════════════════════════
          BRAND STORY — real hero image
      ═══════════════════════════════════════════════ */}
      <section
        ref={aboutRef}
        id="moment"
        style={{ padding:'5.5rem 0', background:'var(--charcoal)', color:'var(--ivory)', overflow:'hidden' }}
        className={`section-reveal${aboutVisible ? ' visible' : ''}`}
      >
        <div className="wrap" style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(280px, 1fr))', gap:'4rem', alignItems:'center' }}>
          <div data-reveal={isAr?'right':'left'}>
            <p style={{ fontSize:'.7rem',letterSpacing:'.2em',textTransform:'uppercase',color:'var(--gold-light)',marginBottom:'1rem' }}>
              {isAr ? 'القصة' : 'The Story'}
            </p>
            <h2 className="display-2" style={{ color:'var(--ivory)',marginBottom:'1.5rem' }}>
              {locContent(aboutContent, 'title', locale) || (isAr ? 'مصنوع لحظات الحياة الحقيقية' : 'Made for Real Life Moments')}
            </h2>
            <p style={{ fontSize:'1.05rem',lineHeight:1.75,color:'rgba(247,244,236,.62)',maxWidth:'42ch',marginBottom:'2rem' }}>
              {locContent(aboutContent, 'body', locale) || (isAr
                ? 'كل كرسي رواقة يُصنع بعناية باستخدام مواد مختارة لتحمل الاستخدام اليومي مع الحفاظ على جماله وراحته لسنوات.'
                : 'Every Rawaqa chair is handcrafted using selected materials built for daily use while maintaining its beauty and comfort for years.')}
            </p>
            <Link href={`/${locale}/shop`} className="btn btn-gold">
              {locContent(aboutContent, 'cta', locale) || (isAr ? 'اكتشف المجموعة' : 'Explore Collection')}
            </Link>
          </div>

          {/* Real product image */}
          <div data-reveal={isAr?'left':'right'}>
            <Tilt3D>
              <div style={{
                aspectRatio:'1', borderRadius:28, overflow:'hidden',
                border:'1px solid rgba(210,181,106,.12)',
                position:'relative',
                boxShadow:'0 40px 80px rgba(0,0,0,.5), 0 0 0 1px rgba(210,181,106,.08)',
              }}>
                <Image
                  src="/hero/hero-1.jpg"
                  alt="RAWAQA bean bag in warm home setting"
                  fill
                  style={{ objectFit:'cover', objectPosition:'center' }}
                  sizes="(max-width:768px) 100vw, 45vw"
                />
                {/* Overlay */}
                <div aria-hidden style={{
                  position:'absolute',inset:0,
                  background:'linear-gradient(135deg, rgba(210,181,106,.1) 0%, transparent 60%)',
                }} />
                <span style={{
                  position:'absolute',bottom:'1.25rem',right:'1.25rem',
                  background:'rgba(21,19,15,.7)',backdropFilter:'blur(8px)',
                  borderRadius:999,padding:'.35rem .85rem',
                  fontSize:'.68rem',fontWeight:800,color:'var(--gold-light)',
                  letterSpacing:'.05em',border:'1px solid rgba(210,181,106,.2)',
                }}>
                  {isAr ? 'صنع في مصر 🇪🇬' : 'Made in Egypt 🇪🇬'}
                </span>
              </div>
            </Tilt3D>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════
          WHY RAWAQA
      ═══════════════════════════════════════════════ */}
      <section
        ref={whyRef}
        id="why"
        style={{ padding:'5.5rem 0', background:'#1a1710', overflow:'hidden' }}
        className={`section-reveal${whyVisible ? ' visible' : ''}`}
      >
        <div className="wrap">
          <div data-reveal="up" style={{ textAlign:'center',marginBottom:'3.5rem' }}>
            <p style={{ fontSize:'.7rem',letterSpacing:'.2em',textTransform:'uppercase',color:'var(--gold)',marginBottom:'.6rem' }}>
              {isAr ? 'لماذا نحن' : 'Why Us'}
            </p>
            <h2 className="display-3" style={{ color:'var(--ivory)' }}>{t('why.title')}</h2>
          </div>

          {/* First 4 in a 4-col grid */}
          <div data-stagger style={{ display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(240px,1fr))',gap:'1.5rem',marginBottom:'1.5rem' }}>
            {([1,2,3,4] as const).map(n => (
              <div key={n} className="why-card" style={{ padding:'1.75rem',background:'rgba(255,255,255,.04)',borderRadius:18,border:'1px solid rgba(210,181,106,.1)' }}>
                <div style={{ width:40,height:40,borderRadius:'50%',background:'var(--gold-pale)',color:'var(--gold)',display:'flex',alignItems:'center',justifyContent:'center',fontWeight:800,fontSize:'.88rem',marginBottom:'1rem',boxShadow:'0 3px 12px rgba(173,138,76,.18)' }}>{n}</div>
                <h3 style={{ fontWeight:700,color:'var(--ivory)',marginBottom:'.5rem',fontSize:'.975rem' }}>{t(`why.q${n}` as 'why.q1')}</h3>
                <p style={{ fontSize:'.85rem',color:'rgba(247,244,236,.55)',lineHeight:1.7 }}>{t(`why.d${n}` as 'why.d1')}</p>
              </div>
            ))}
          </div>

          {/* Last 2 centered */}
          <div style={{ display:'flex',justifyContent:'center',gap:'1.5rem',flexWrap:'wrap' }}>
            {([5,'6extra'] as const).map((n, idx) => {
              const num = idx + 5;
              const isReal = idx === 0;
              return (
                <div key={n} className="why-card" style={{ padding:'1.75rem',background:'rgba(255,255,255,.04)',borderRadius:18,border:'1px solid rgba(210,181,106,.1)',width:'calc(50% - .75rem)',maxWidth:360,minWidth:240 }}>
                  <div style={{ width:40,height:40,borderRadius:'50%',background:'var(--gold-pale)',color:'var(--gold)',display:'flex',alignItems:'center',justifyContent:'center',fontWeight:800,fontSize:'.88rem',marginBottom:'1rem',boxShadow:'0 3px 12px rgba(173,138,76,.18)' }}>{num}</div>
                  <h3 style={{ fontWeight:700,color:'var(--ivory)',marginBottom:'.5rem',fontSize:'.975rem' }}>
                    {isReal ? t('why.q5') : (isAr ? 'توصيل سريع' : 'Fast Delivery')}
                  </h3>
                  <p style={{ fontSize:'.85rem',color:'rgba(247,244,236,.55)',lineHeight:1.7 }}>
                    {isReal ? t('why.d5') : (isAr ? 'توصيل خلال ٣-٥ أيام عمل لجميع محافظات مصر.' : 'Delivery in 3–5 business days to all Egyptian governorates.')}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════
          REVIEWS — Single Row Luxury Slider
      ═══════════════════════════════════════════════ */}
      <section
        ref={reviewsRef}
        style={{ padding:'6.5rem 0', background:'#0d0b08', position: 'relative', overflow:'hidden' }}
        className={`section-reveal${reviewsVisible ? ' visible' : ''}`}
      >
        {/* Glow */}
        <div aria-hidden style={{
          position: 'absolute', top: '30%', left: '50%', transform: 'translateX(-50%)',
          width: '60vw', height: '400px', minWidth: 320,
          background: 'radial-gradient(ellipse at center, rgba(210,181,106,.07) 0%, transparent 70%)',
          pointerEvents: 'none',
        }} />

        <div className="wrap relative z-10 max-w-4xl mx-auto">
          <div data-reveal="up" className="text-center mb-10 sm:mb-12">
            <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full mb-3" style={{ background: 'rgba(210,181,106,.1)', border: '1px solid rgba(210,181,106,.2)' }}>
              <span style={{ fontSize: '.68rem', letterSpacing: '.16em', textTransform: 'uppercase', color: 'var(--gold-light)', fontWeight: 700 }}>
                ⭐ {isAr ? 'آراء العملاء وتجاربهم' : 'VERIFIED REVIEWS'}
              </span>
            </div>
            <h2 className="display-3 mb-2" style={{ color:'var(--ivory)' }}>{t('reviews.title')}</h2>
            <p style={{ color: 'rgba(247,244,236,.5)', fontSize: '.9rem' }}>
              {isAr ? 'أكثر من ٥٠٠+ عميل يثقون في راحة وجودة منتجات رواقة' : 'Over 500+ happy customers trust RAWAQA quality and comfort'}
            </p>
          </div>

          {/* Testimonial Row Slider Card */}
          <div data-reveal="scale" className="relative">
            <div
              className="relative p-6 sm:p-10 md:p-12 rounded-3xl transition-all duration-500"
              style={{
                background: 'linear-gradient(165deg, rgba(30,27,21,.95) 0%, rgba(18,16,12,.98) 100%)',
                border: '1px solid rgba(210,181,106,.2)',
                boxShadow: '0 20px 50px rgba(0,0,0,.5), 0 0 40px rgba(210,181,106,.05)',
              }}
            >
              {/* Giant quote watermark */}
              <div
                aria-hidden
                style={{
                  position: 'absolute', top: '1rem',
                  [isAr ? 'left' : 'right']: '2rem',
                  fontSize: '7rem', lineHeight: 1,
                  color: 'rgba(210,181,106,.08)',
                  fontFamily: 'Georgia, serif',
                  pointerEvents: 'none',
                }}
              >
                &ldquo;
              </div>

              {/* Rating */}
              <div className="flex items-center gap-1.5 mb-6">
                {Array.from({ length: REVIEWS[activeReview].rating }).map((_, j) => (
                  <span key={j} style={{ color: 'var(--gold-light)', fontSize: '1.25rem', filter: 'drop-shadow(0 0 8px rgba(210,181,106,.45))' }}>★</span>
                ))}
                <span className="text-sm font-bold text-ivory/70 ms-2">5.0 / 5.0</span>
              </div>

              {/* Quote Text */}
              <p
                key={activeReview}
                className="text-base sm:text-xl md:text-2xl text-ivory/90 leading-relaxed sm:leading-relaxed mb-8 font-medium animate-fadeIn"
                style={{ minHeight: '4.5rem' }}
              >
                &ldquo;{isAr ? REVIEWS[activeReview].textAr : REVIEWS[activeReview].textEn}&rdquo;
              </p>

              {/* Author Row & Slider Controls */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 pt-6 border-t border-white/10">
                {/* Author Info */}
                <div className="flex items-center gap-3.5">
                  <div
                    style={{
                      width: 48, height: 48, borderRadius: '50%', flexShrink: 0,
                      background: 'linear-gradient(135deg, var(--gold-light), var(--dune))',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontWeight: 800, color: '#15130F', fontSize: '1.1rem',
                      boxShadow: '0 4px 16px rgba(210,181,106,.3)',
                    }}
                  >
                    {(isAr ? REVIEWS[activeReview].name : REVIEWS[activeReview].nameEn)[0]}
                  </div>
                  <div>
                    <p className="text-sm sm:text-base font-bold text-ivory">
                      {isAr ? REVIEWS[activeReview].name : REVIEWS[activeReview].nameEn}
                    </p>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="#4ade80">
                        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
                      </svg>
                      <span className="text-xs text-[#4ade80] font-semibold">
                        {isAr ? 'مشترٍ موثّق' : 'Verified Buyer'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Slider Nav Buttons & Dots */}
                <div className="flex items-center gap-4 self-end sm:self-center">
                  {/* Dots */}
                  <div className="flex items-center gap-1.5">
                    {REVIEWS.map((_, i) => (
                      <button
                        key={i}
                        onClick={() => setActiveReview(i)}
                        className="transition-all duration-300 rounded-full"
                        style={{
                          width: i === activeReview ? 24 : 8,
                          height: 8,
                          background: i === activeReview ? 'var(--gold-light)' : 'rgba(255,255,255,.2)',
                        }}
                        aria-label={`Go to slide ${i + 1}`}
                      />
                    ))}
                  </div>

                  {/* Arrows */}
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setActiveReview(prev => (prev - 1 + REVIEWS.length) % REVIEWS.length)}
                      className="w-10 h-10 rounded-full flex items-center justify-center text-ivory/70 border border-white/15 hover:border-[var(--gold-light)] hover:text-[var(--gold-light)] hover:bg-white/5 transition-all"
                      aria-label="Previous review"
                    >
                      {isAr ? '→' : '←'}
                    </button>
                    <button
                      onClick={() => setActiveReview(prev => (prev + 1) % REVIEWS.length)}
                      className="w-10 h-10 rounded-full flex items-center justify-center text-ivory/70 border border-white/15 hover:border-[var(--gold-light)] hover:text-[var(--gold-light)] hover:bg-white/5 transition-all"
                      aria-label="Next review"
                    >
                      {isAr ? '←' : '→'}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════
          CTA FINAL — compact
      ═══════════════════════════════════════════════ */}
      <section style={{
        padding:'4rem 0',
        background:'linear-gradient(160deg, var(--charcoal) 0%, #0d0b08 100%)',
        color:'var(--ivory)',textAlign:'center',
        position:'relative',overflow:'hidden',
      }}>
        <div aria-hidden style={{
          position:'absolute',inset:0,
          background:'radial-gradient(ellipse 55% 55% at 50% 50%, rgba(173,138,76,.14) 0%, transparent 70%)',
        }} />
        <Particles />
        <div className="wrap" style={{ position:'relative',zIndex:1 }} data-reveal="scale">
          <h2 className="display-3" style={{ color:'var(--ivory)',marginBottom:'1rem' }}>
            {locContent(ctaContent, 'title', locale) || t('cta.title')}
          </h2>
          <p style={{ fontSize:'1rem',lineHeight:1.65,color:'rgba(247,244,236,.52)',maxWidth:'42ch',margin:'0 auto 2rem' }}>
            {locContent(ctaContent, 'sub', locale) || t('cta.sub')}
          </p>
          <Link href={`/${locale}/shop`} className="btn btn-gold" style={{ fontSize:'.85rem',padding:'.9rem 2.4rem' }}>
            {locContent(ctaContent, 'btn', locale) || t('cta.btn')}
          </Link>
        </div>
      </section>
    </>
  );
}
