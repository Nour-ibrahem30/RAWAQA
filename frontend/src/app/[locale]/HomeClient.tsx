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
import { categoriesApi, productsApi, reviewsApi } from '@/lib/api';
import { useSiteContent, locContent } from '@/lib/useSiteContent';
import { categoryFilterParam, loc } from '@/lib/utils';
import type { Category, Product } from '@/lib/types';

const TILE_COLORS = ['#A8543A', '#3B5578', '#BE8F2E', '#4B5B45'];

interface HomeReview {
  name: string;
  rating: number;
  text: string;
  verified: boolean;
}

function Particles({ reduced }: { reduced: boolean }) {
  if (reduced) return null;

  const rising = Array.from({ length: 8 }, (_, i) => ({
    left:     `${8 + (i * 11) % 84}%`,
    size:     i % 3 === 0 ? 3 : 2,
    dur:      `${14 + (i * 2) % 10}s`,
    delay:    `${(i * 1.5) % 8}s`,
    dx:       `${-16 + (i * 8) % 32}px`,
    gold:     i % 2 === 0,
    bottom:   `${(i * 9) % 30}%`,
  }));

  const orbs = Array.from({ length: 3 }, (_, i) => ({
    left:  `${12 + i * 28}%`,
    top:   `${20 + i * 18}%`,
    size:  14 + i * 4,
    dur:   `${8 + i * 2}s`,
    delay: `${i * 0.8}s`,
  }));

  return (
    <div aria-hidden style={{ position: 'absolute', inset: 0, pointerEvents: 'none', overflow: 'hidden' }}>
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
      {orbs.map((o, i) => (
        <div
          key={`o${i}`}
          className="particle-v2 gold orbit"
          style={{
            left: o.left,
            top: o.top,
            width: o.size,
            height: o.size,
            opacity: 0.1,
            animationDuration: o.dur,
            animationDelay: o.delay,
          }}
        />
      ))}
    </div>
  );
}

export default function HomeClient({ locale, initialContent }: { locale: string; initialContent?: Record<string, any> }) {
  const t    = useTranslations('home');
  const isAr = locale === 'ar';
  const { data: heroContent }  = useSiteContent('hero', initialContent?.hero);
  const { data: aboutContent } = useSiteContent('about', initialContent?.about);
  const { data: whyContent }   = useSiteContent('why', initialContent?.why);
  const { data: ctaContent }   = useSiteContent('cta', initialContent?.cta);
  const { data: statsContent } = useSiteContent('stats', initialContent?.stats);

  const [featured, setFeatured] = useState<Product[]>([]);
  const [loading, setLoading]   = useState(true);
  const [homeCats, setHomeCats] = useState<Category[]>([]);
  const [reduceMotion, setReduceMotion] = useState(false);
  const [statsVisible, setStats] = useState(false);
  const statsRef = useRef<HTMLDivElement>(null);
  const [activeReview, setActiveReview] = useState(0);
  const [reviews, setReviews] = useState<HomeReview[]>([]);

  const categoriesRef = useRef<HTMLElement>(null);
  const featuredRef   = useRef<HTMLElement>(null);
  const aboutRef      = useRef<HTMLElement>(null);
  const whyRef        = useRef<HTMLElement>(null);
  const reviewsRef    = useRef<HTMLElement>(null);
  const [catsVisible,     setCatsVisible]     = useState(true);
  const [featuredVisible, setFeaturedVisible] = useState(true);
  const [aboutVisible,    setAboutVisible]    = useState(true);
  const [whyVisible,      setWhyVisible]      = useState(true);
  const [reviewsVisible,  setReviewsVisible]  = useState(true);

  const cmsStats = Array.isArray(statsContent?.items) ? statsContent.items : [];

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const apply = () => setReduceMotion(mq.matches);
    apply();
    mq.addEventListener('change', apply);
    return () => mq.removeEventListener('change', apply);
  }, []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    productsApi.featured(locale)
      .then(r => {
        if (!cancelled && r.data?.length) setFeatured(r.data.slice(0, 4));
      })
      .catch(() => {
        if (!cancelled) setFeatured([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [locale]);

  useEffect(() => {
    let cancelled = false;
    categoriesApi.list(locale)
      .then(r => {
        if (!cancelled) setHomeCats(Array.isArray(r.data) ? r.data : []);
      })
      .catch(() => {
        if (!cancelled) setHomeCats([]);
      });
    return () => { cancelled = true; };
  }, [locale]);

  useEffect(() => {
    let cancelled = false;
    reviewsApi.recent(6)
      .then(r => {
        const apiReviews = r.data ?? [];
        if (cancelled) return;
        setReviews(
          apiReviews
            .map((rv: any) => {
              const userName = rv.user?.name ||
                (rv.user?.firstName ? `${rv.user.firstName} ${rv.user.lastName || ''}`.trim() : '') ||
                (locale === 'ar' ? 'عميل راوقة' : 'Customer');
              return {
                name: userName,
                rating: typeof rv.rating === 'number' ? rv.rating : 0,
                text: rv.comment || '',
                verified: Boolean(rv.isVerifiedPurchase),
              };
            })
            .filter((rv: HomeReview) => rv.text)
        );
        setActiveReview(0);
      })
      .catch(() => {
        if (!cancelled) setReviews([]);
      });
    return () => { cancelled = true; };
  }, [locale]);

  useEffect(() => {
    if (reduceMotion || reviews.length < 2) return;
    const timer = setInterval(() => {
      setActiveReview(prev => (prev + 1) % reviews.length);
    }, 5000);
    return () => clearInterval(timer);
  }, [reviews.length, reduceMotion]);

  useEffect(() => {
    if (!statsRef.current || reduceMotion) {
      setStats(true);
      return;
    }
    const io = new IntersectionObserver(([e]) => {
      if (e.isIntersecting) { setStats(true); io.disconnect(); }
    }, { threshold: 0.3 });
    io.observe(statsRef.current);
    return () => io.disconnect();
  }, [reduceMotion, cmsStats.length]);

  useEffect(() => {
    if (reduceMotion) return;
    const sections: [React.RefObject<HTMLElement | null>, (v: boolean) => void][] = [
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
  }, [reduceMotion]);

  return (
    <>
      <LoadingScreen />
      <AdPopup locale={locale} />
      <section style={{
        position: 'relative',
        minHeight: '100vh',
        background: 'var(--charcoal)',
        color: 'var(--ivory)',
        overflow: 'hidden',
        display: 'flex',
        alignItems: 'center',
      }}>
        <div aria-hidden style={{
          position: 'absolute', inset: 0, pointerEvents: 'none',
          background: 'radial-gradient(ellipse 55% 65% at 30% 50%, color-mix(in srgb, var(--gold) 20%, transparent) 0%, transparent 70%)',
        }} />
        <div aria-hidden style={{
          position: 'absolute', inset: 0, pointerEvents: 'none',
          background: 'radial-gradient(ellipse 40% 40% at 80% 70%, color-mix(in srgb, var(--clay) 18%, transparent) 0%, transparent 65%)',
        }} />
        <Particles reduced={reduceMotion} />

        <div className="wrap relative z-10 pt-24 pb-12 sm:pt-32 sm:pb-20 md:pt-40 md:pb-24 grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
          <div className="lg:col-span-7">
            <p style={{
              fontSize: '.7rem',
              letterSpacing: '.22em',
              textTransform: 'uppercase',
              color: 'var(--gold-light)',
              marginBottom: '1.25rem',
              opacity: reduceMotion ? 1 : 0,
              animation: reduceMotion ? undefined : 'fadeSlideUp 600ms 100ms forwards',
            }}>
              {locContent(heroContent, 'eyebrow', locale) || t('hero.eyebrow')}
            </p>

            <h1 className="display-1" style={{
              color: 'var(--ivory)',
              marginBottom: '1.5rem',
              opacity: reduceMotion ? 1 : 0,
              animation: reduceMotion ? undefined : 'fadeSlideUp 700ms 220ms forwards',
            }}>
              <span style={reduceMotion ? {
                color: 'var(--gold-light)',
                display: 'block',
              } : {
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

            <p style={{
              fontSize: 'clamp(1rem, 1.3vw, 1.15rem)',
              lineHeight: 1.7,
              color: 'rgba(247,244,236,.68)',
              maxWidth: '42ch',
              marginBottom: '2.25rem',
              opacity: reduceMotion ? 1 : 0,
              animation: reduceMotion ? undefined : 'fadeSlideUp 700ms 340ms forwards',
            }}>
              {locContent(heroContent, 'sub', locale) || t('hero.sub')}
            </p>

            <div style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: '.875rem',
              opacity: reduceMotion ? 1 : 0,
              animation: reduceMotion ? undefined : 'fadeSlideUp 700ms 460ms forwards',
            }}>
              <Link href={`/${locale}/shop`} className="btn btn-gold">
                {locContent(heroContent, 'ctaShop', locale) || t('hero.cta_shop')}
              </Link>
              <Link href={`#collections`} className="btn btn-line-dark">
                {locContent(heroContent, 'ctaDiscover', locale) || t('hero.cta_discover')}
              </Link>
            </div>

            {cmsStats.length > 0 && (
              <div ref={statsRef} style={{
                display: 'flex',
                gap: '2.5rem',
                marginTop: '3rem',
                paddingTop: '2rem',
                borderTop: '1px solid rgba(210,181,106,.15)',
                flexWrap: 'wrap',
                opacity: reduceMotion ? 1 : 0,
                animation: reduceMotion ? undefined : 'fadeSlideUp 700ms 600ms forwards',
              }}>
                {cmsStats.map((s: any, i: number) => (
                  <div key={i}>
                    <p style={{
                      fontSize: 'clamp(1.4rem, 2.5vw, 1.9rem)',
                      fontWeight: 800,
                      color: 'var(--gold-light)',
                      lineHeight: 1,
                      fontFamily: isAr ? 'var(--font-cairo, Cairo, sans-serif)' : 'var(--font-fraunces, serif)',
                      transform: statsVisible ? 'none' : 'translateY(12px)',
                      opacity: statsVisible ? 1 : 0,
                      transition: reduceMotion ? 'none' : `all 500ms ${i * 120}ms ease`,
                    }}>
                      {s.num}
                    </p>
                    <p style={{ fontSize: '.72rem', color: 'rgba(247,244,236,.42)', marginTop: '.2rem' }}>
                      {isAr ? (s.labelAr || s.ar) : (s.labelEn || s.en)}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div
            className="hero-slideshow-wrap lg:col-span-5 relative w-full aspect-[4/5] sm:aspect-square max-w-sm sm:max-w-md mx-auto lg:max-w-none rounded-[28px] overflow-hidden shadow-2xl"
            style={{
              opacity: reduceMotion ? 1 : 0,
              animation: reduceMotion ? undefined : 'fadeIn 900ms 300ms forwards',
              boxShadow: '0 40px 100px rgba(0,0,0,.6), 0 0 0 1px rgba(210,181,106,.1)',
            }}>
            <HeroSlideshow style={{ borderRadius: 28 }} />
          </div>
        </div>

        <div aria-hidden style={{
          position: 'absolute', bottom: 0, insetInline: 0, height: 80, pointerEvents: 'none',
          background: 'linear-gradient(to bottom, transparent, rgba(21,19,15,.6))',
        }} />
      </section>

      <section
        id="collections"
        ref={categoriesRef}
        style={{
          padding: '5.5rem 0',
          background: 'var(--charcoal-soft)',
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

          {homeCats.length > 0 ? (
            <div data-stagger style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: '1rem',
            }}>
              {homeCats.map((cat, idx) => {
                const filter = categoryFilterParam(cat);
                const href = filter
                  ? `/${locale}/shop?category=${encodeURIComponent(filter)}`
                  : `/${locale}/shop`;
                const label = loc(cat.nameAr, cat.nameEn, locale);
                const color = TILE_COLORS[idx % TILE_COLORS.length];
                const img = cat.image;
                return (
                  <Tilt3D key={cat.id || filter || idx} className="category-tile" style={{
                    borderRadius: 20,
                    overflow: 'hidden',
                    aspectRatio: '1',
                  }}>
                    <Link href={href} style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'flex-start',
                      justifyContent: 'flex-end',
                      height: '100%',
                      padding: '1.25rem',
                      position: 'relative',
                      overflow: 'hidden',
                      borderRadius: 20,
                      background: color,
                    }}>
                      {img && (
                        <Image
                          src={img}
                          alt=""
                          fill
                          quality={70}
                          style={{ objectFit: 'cover', transition: reduceMotion ? 'none' : 'transform 500ms ease' }}
                          sizes="(max-width: 640px) 46vw, (max-width: 1024px) 240px, 260px"
                          className="cat-img"
                        />
                      )}
                      <div aria-hidden style={{
                        position: 'absolute', inset: 0,
                        background: img
                          ? `linear-gradient(160deg, ${color}88 0%, ${color}cc 100%)`
                          : `linear-gradient(160deg, ${color} 0%, rgba(21,19,15,.55) 100%)`,
                        mixBlendMode: img ? 'multiply' : 'normal',
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
                        {label}
                      </span>
                      <span aria-hidden style={{
                        position: 'absolute', top: '.85rem',
                        insetInlineEnd: '.85rem',
                        color: 'rgba(255,255,255,.8)', fontSize: '1rem',
                        zIndex: 1,
                      }}>{isAr ? '←' : '→'}</span>
                    </Link>
                  </Tilt3D>
                );
              })}
            </div>
          ) : (
            <div style={{ textAlign: 'center' }}>
              <Link href={`/${locale}/shop`} className="btn btn-line-dark">
                {t('hero.cta_shop')}
              </Link>
            </div>
          )}
        </div>
      </section>

      <section
        ref={featuredRef}
        style={{ padding: '6.5rem 0', background: 'var(--charcoal)', position: 'relative', overflow: 'hidden' }}
        className={`section-reveal${featuredVisible ? ' visible' : ''}`}
      >
        <div aria-hidden style={{
          position: 'absolute', top: '20%', insetInlineStart: '5%',
          width: '35vw', height: '35vw', minWidth: 280,
          background: 'radial-gradient(circle, color-mix(in srgb, var(--gold-light) 12%, transparent) 0%, transparent 70%)',
          pointerEvents: 'none',
        }} />

        <div className="wrap relative z-10">
          <div data-reveal="up" className="flex flex-col sm:flex-row sm:items-end justify-between mb-10 sm:mb-14 gap-5">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full mb-3" style={{ background: 'rgba(210,181,106,.1)', border: '1px solid rgba(210,181,106,.2)' }}>
                <span style={{ fontSize: '.68rem', letterSpacing: '.16em', textTransform: 'uppercase', color: 'var(--gold-light)', fontWeight: 700 }}>
                  {isAr ? 'اختيارات الموسم' : 'CURATED COLLECTION'}
                </span>
              </div>
              <h2 className="display-3" style={{ color: 'var(--ivory)' }}>{t('featured.title')}</h2>
            </div>
            <Link
              href={`/${locale}/shop`}
              className="btn btn-line-dark btn-sm inline-flex items-center gap-2 self-start sm:self-auto hover:shadow-lg transition-all"
            >
              <span>{t('featured.view_all')}</span>
              <span aria-hidden>{isAr ? '←' : '→'}</span>
            </Link>
          </div>

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
                  loading="lazy"
                  quality={70}
                  style={{ objectFit:'cover', objectPosition:'center' }}
                  sizes="(max-width:768px) 100vw, 45vw"
                />
                <div aria-hidden style={{
                  position:'absolute',inset:0,
                  background:'linear-gradient(135deg, rgba(210,181,106,.1) 0%, transparent 60%)',
                }} />
                <span style={{
                  position:'absolute',bottom:'1.25rem',insetInlineEnd:'1.25rem',
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

      <section
        ref={whyRef}
        id="why"
        style={{ padding:'5.5rem 0', background:'var(--charcoal-soft)', overflow:'hidden' }}
        className={`section-reveal${whyVisible ? ' visible' : ''}`}
      >
        <div className="wrap">
          <div data-reveal="up" style={{ textAlign:'center',marginBottom:'3.5rem' }}>
            <p style={{ fontSize:'.7rem',letterSpacing:'.2em',textTransform:'uppercase',color:'var(--gold-light)',marginBottom:'.6rem' }}>
              {isAr ? 'لماذا نحن' : 'Why Us'}
            </p>
            <h2 className="display-3" style={{ color:'var(--ivory)' }}>
              {locContent(whyContent, 'title', locale) || t('why.title')}
            </h2>
          </div>

          <div className="why-grid" data-reveal="up">
            {(Array.isArray(whyContent?.points) && whyContent.points.length > 0
              ? whyContent.points
              : [1, 2, 3, 4, 5, 6].map(n => ({
                  titleAr: n <= 5 ? t(`why.q${n}` as any) : 'توصيل سريع',
                  titleEn: n <= 5 ? t(`why.q${n}` as any) : 'Fast Delivery',
                  bodyAr: n <= 5 ? t(`why.d${n}` as any) : 'توصيل خلال ٣-٥ أيام عمل لجميع محافظات مصر.',
                  bodyEn: n <= 5 ? t(`why.d${n}` as any) : 'Delivery in 3–5 business days to all Egyptian governorates.',
                }))
            ).map((point: any, idx: number) => {
              const n = idx + 1;
              const title = locContent(point, 'title', locale) || point.titleAr || point.titleEn || '';
              const desc = locContent(point, 'body', locale) || point.bodyAr || point.bodyEn || '';
              return (
                <div
                  key={idx}
                  className="why-card flex flex-col items-start p-5 sm:p-7 rounded-2xl transition-all duration-300"
                  style={{
                    background: 'rgba(255,255,255,.04)',
                    border: '1px solid rgba(210,181,106,.12)',
                  }}
                >
                  <div
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: '50%',
                      background: 'var(--gold-pale)',
                      color: 'var(--gold)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: 800,
                      fontSize: '.85rem',
                      marginBottom: '.85rem',
                      boxShadow: '0 3px 12px rgba(173,138,76,.18)',
                    }}
                  >
                    {n}
                  </div>
                  <h3 style={{ fontWeight: 700, color: 'var(--ivory)', marginBottom: '.45rem', fontSize: '1rem' }}>
                    {title}
                  </h3>
                  <p style={{ fontSize: '.85rem', color: 'rgba(247,244,236,.6)', lineHeight: 1.65 }}>
                    {desc}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <section
        ref={reviewsRef}
        style={{ padding:'4.5rem 0', background:'var(--charcoal)', position: 'relative', overflow:'hidden' }}
        className={`section-reveal${reviewsVisible ? ' visible' : ''}`}
      >
        <div aria-hidden style={{
          position: 'absolute', top: '30%', left: '50%', transform: 'translateX(-50%)',
          width: '50vw', height: '300px', minWidth: 260,
          background: 'radial-gradient(ellipse at center, color-mix(in srgb, var(--gold-light) 12%, transparent) 0%, transparent 70%)',
          pointerEvents: 'none',
        }} />

        <div className="wrap relative z-10 max-w-2xl mx-auto">
          <div data-reveal="up" className="text-center mb-8">
            <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full mb-2.5" style={{ background: 'rgba(210,181,106,.08)', border: '1px solid rgba(210,181,106,.18)' }}>
              <span style={{ fontSize: '.62rem', letterSpacing: '.14em', textTransform: 'uppercase', color: 'var(--gold-light)', fontWeight: 700 }}>
                {isAr ? 'آراء العملاء' : 'CUSTOMER REVIEWS'}
              </span>
            </div>
            <h2 className="display-3 text-xl sm:text-2xl font-bold mb-1.5" style={{ color:'var(--ivory)' }}>{t('reviews.title')}</h2>
          </div>

          <div data-reveal="scale" className="relative">
            {reviews.length > 0 ? (
            <div
              className="relative p-5 sm:p-7 rounded-2xl"
              style={{
                background: 'linear-gradient(165deg, color-mix(in srgb, var(--charcoal-soft) 92%, var(--gold-light) 8%) 0%, var(--charcoal-soft) 100%)',
                border: '1px solid rgba(210,181,106,.15)',
                boxShadow: '0 15px 35px rgba(0,0,0,.4)',
              }}
            >
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-1">
                  {Array.from({ length: Math.max(0, Math.round(reviews[activeReview]?.rating ?? 0)) }).map((_, j) => (
                    <span key={j} style={{ color: 'var(--gold-light)', fontSize: '.95rem' }}>★</span>
                  ))}
                  <span className="text-xs font-bold text-ivory/60 ms-1.5">
                    {(reviews[activeReview]?.rating ?? 0).toFixed(1)}
                  </span>
                </div>
                {reviews[activeReview]?.verified && (
                  <span className="text-[.68rem] text-[#4ade80] font-semibold flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#4ade80]/10 border border-[#4ade80]/20">
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
                    </svg>
                    <span>{isAr ? 'تجربة موثّقة' : 'Verified Review'}</span>
                  </span>
                )}
              </div>

              <p
                key={activeReview}
                className="text-sm sm:text-base text-ivory/85 leading-relaxed mb-6 font-normal"
              >
                &ldquo;{reviews[activeReview]?.text}&rdquo;
              </p>

              <div className="flex items-center justify-between pt-4 border-t border-white/5">
                <div className="flex items-center gap-2.5">
                  <div
                    style={{
                      width: 36, height: 36, borderRadius: '50%', flexShrink: 0,
                      background: 'linear-gradient(135deg, var(--gold-light), var(--dune))',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontWeight: 800, color: 'var(--charcoal)', fontSize: '.85rem',
                    }}
                    aria-hidden
                  >
                    {reviews[activeReview]?.name?.[0] ?? '?'}
                  </div>
                  <div>
                    <p className="text-xs sm:text-sm font-bold text-ivory leading-tight">
                      {reviews[activeReview]?.name}
                    </p>
                  </div>
                </div>

                {reviews.length > 1 && (
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1.5">
                    {reviews.map((_, i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => setActiveReview(i)}
                        className="flex items-center justify-center p-0 m-0 border-0 bg-transparent cursor-pointer"
                        style={{ minHeight: 44, lineHeight: 0 }}
                        aria-label={t('reviews.go_to', { n: i + 1 })}
                        aria-current={i === activeReview ? 'true' : undefined}
                      >
                        <span
                          className="transition-all duration-300 rounded-full block"
                          style={{
                            width: i === activeReview ? 16 : 6,
                            height: 6,
                            background: i === activeReview ? 'var(--gold-light)' : 'rgba(255,255,255,.25)',
                          }}
                        />
                      </button>
                    ))}
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => setActiveReview(prev => (prev - 1 + reviews.length) % reviews.length)}
                      className="w-11 h-11 rounded-full flex items-center justify-center text-ivory/70 border border-white/15 hover:border-[var(--gold-light)] hover:text-[var(--gold-light)] hover:bg-white/5 transition-all text-xs"
                      aria-label={t('reviews.prev')}
                    >
                      {isAr ? '→' : '←'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveReview(prev => (prev + 1) % reviews.length)}
                      className="w-11 h-11 rounded-full flex items-center justify-center text-ivory/70 border border-white/15 hover:border-[var(--gold-light)] hover:text-[var(--gold-light)] hover:bg-white/5 transition-all text-xs"
                      aria-label={t('reviews.next')}
                    >
                      {isAr ? '←' : '→' }
                    </button>
                  </div>
                </div>
                )}
              </div>
            </div>
            ) : (
            <div
              className="relative p-6 sm:p-8 rounded-2xl text-center"
              style={{
                background: 'linear-gradient(165deg, color-mix(in srgb, var(--charcoal-soft) 92%, var(--gold-light) 8%) 0%, var(--charcoal-soft) 100%)',
                border: '1px solid rgba(210,181,106,.15)',
                boxShadow: '0 15px 35px rgba(0,0,0,.4)',
              }}
            >
              <div className="flex items-center justify-center gap-1 mb-3" aria-hidden>
                {Array.from({ length: 5 }).map((_, j) => (
                  <span key={j} style={{ color: 'var(--gold-light)', fontSize: '1.05rem' }}>★</span>
                ))}
              </div>
              <p className="text-sm sm:text-base text-ivory/70 leading-relaxed">
                {isAr
                  ? 'لا توجد آراء بعد — كن أول من يشارك تجربته مع منتجات رواقة.'
                  : 'No reviews yet — be the first to share your experience with RAWAQA.'}
              </p>
              <Link
                href={`/${locale}/shop`}
                className="btn btn-line-dark btn-sm inline-flex items-center gap-2 mt-5"
              >
                {isAr ? 'تسوّق الآن' : 'Shop Now'}
              </Link>
            </div>
            )}
          </div>
        </div>
      </section>

      <section style={{
        padding:'3.5rem 0',
        background:'linear-gradient(160deg, var(--charcoal-soft) 0%, var(--charcoal) 100%)',
        color:'var(--ivory)',textAlign:'center',
        position:'relative',overflow:'hidden',
      }}>
        <div aria-hidden style={{
          position:'absolute',inset:0,
          background:'radial-gradient(ellipse 55% 55% at 50% 50%, color-mix(in srgb, var(--gold) 20%, transparent) 0%, transparent 70%)',
        }} />
        <Particles reduced={reduceMotion} />
        <div className="wrap" style={{ position:'relative',zIndex:1 }} data-reveal="scale">
          <h2 className="display-3" style={{ color:'var(--ivory)',marginBottom:'0.75rem' }}>
            {locContent(ctaContent, 'title', locale) || t('cta.title')}
          </h2>
          <p style={{ fontSize:'.9rem',lineHeight:1.6,color:'rgba(247,244,236,.52)',maxWidth:'40ch',margin:'0 auto 1.5rem' }}>
            {locContent(ctaContent, 'sub', locale) || t('cta.sub')}
          </p>
          <Link href={`/${locale}/shop`} className="btn btn-gold" style={{ fontSize:'.8rem', padding:'.45rem 1.6rem', height:'38px', minHeight:'auto', display:'inline-flex', alignItems:'center' }}>
            {locContent(ctaContent, 'btn', locale) || t('cta.btn')}
          </Link>
        </div>
      </section>
    </>
  );
}
