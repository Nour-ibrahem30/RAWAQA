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
  const [catsVisible,     setCatsVisible]     = useState(false);
  const [featuredVisible, setFeaturedVisible] = useState(false);
  const [aboutVisible,    setAboutVisible]    = useState(false);
  const [whyVisible,      setWhyVisible]      = useState(false);
  const [reviewsVisible,  setReviewsVisible]  = useState(false);

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
    if (reduceMotion) {
      // Immediately mark everything visible — no animation
      setCatsVisible(true); setFeaturedVisible(true);
      setAboutVisible(true); setWhyVisible(true); setReviewsVisible(true);
      [categoriesRef, featuredRef, aboutRef, whyRef, reviewsRef].forEach(ref => {
        if (ref.current) ref.current.classList.add('visible', 'revealed');
      });
      return;
    }
    const sections: React.RefObject<HTMLElement | null>[] = [
      categoriesRef, featuredRef, aboutRef, whyRef, reviewsRef,
    ];
    const setters: ((v: boolean) => void)[] = [
      setCatsVisible, setFeaturedVisible, setAboutVisible, setWhyVisible, setReviewsVisible,
    ];
    const observers = sections.map((ref, idx) => {
      if (!ref.current) return null;
      const io = new IntersectionObserver(([e]) => {
        if (e.isIntersecting) {
          setters[idx](true);
          ref.current?.classList.add('visible', 'revealed');
          io.disconnect();
        }
      }, { threshold: 0.06, rootMargin: '0px 0px 0px 0px' });
      io.observe(ref.current);
      return io;
    });
    return () => observers.forEach(io => io?.disconnect());
  }, [reduceMotion]);

  return (
    <>
      <LoadingScreen />
      <AdPopup locale={locale} />
      {/* ═══════════════════════════════════════════════════════
          HERO — Side-by-side: slideshow left, content right
          ═══════════════════════════════════════════════════════ */}
      <section style={{
        position:   'relative',
        minHeight:  'clamp(560px, 88vh, 900px)',
        background: 'var(--charcoal)',
        color:      'var(--ivory)',
        overflow:   'hidden',
        display:    'flex',
        alignItems: 'center',
      }}>
        {/* ── Ambient gold glow — bottom-left ── */}
        <div aria-hidden style={{
          position: 'absolute',
          bottom: '-15%', insetInlineStart: '-5%',
          width: '55%', height: '70%',
          background: 'radial-gradient(ellipse at center, color-mix(in srgb, var(--gold) 16%, transparent) 0%, transparent 65%)',
          pointerEvents: 'none',
          filter: 'blur(60px)',
          animation: reduceMotion ? undefined : 'glowPulse 5s ease-in-out infinite',
        }} />

        <Particles reduced={reduceMotion} />

        <div className="wrap relative" style={{ zIndex: 3, width: '100%', paddingTop: '7rem', paddingBottom: '4rem' }}>
          <div style={{
            display: 'grid',
            gridTemplateColumns: isAr ? '1fr minmax(280px,480px)' : 'minmax(280px,480px) 1fr',
            gap: 'clamp(2rem, 5vw, 5rem)',
            alignItems: 'center',
          }}>

            {/* ── LEFT col: Slideshow (or RIGHT for LTR) ── */}
            <div
              style={{
                order: isAr ? 1 : 0,
                borderRadius: 24,
                overflow: 'hidden',
                aspectRatio: '4/5',
                position: 'relative',
                boxShadow: '0 32px 80px rgba(0,0,0,.55), 0 0 0 1px rgba(210,181,106,.1)',
                opacity:   reduceMotion ? 1 : 0,
                animation: reduceMotion ? undefined
                  : `${isAr ? 'heroImageInRtl' : 'heroImageIn'} 900ms 80ms cubic-bezier(.4,0,.2,1) forwards`,
              }}
            >
              <HeroSlideshow />
            </div>

            {/* ── RIGHT col: Content ── */}
            <div style={{ order: isAr ? 0 : 1 }}>

              {/* Eyebrow — slides in from side */}
              <div style={{
                display: 'inline-flex', alignItems: 'center', gap: '.55rem',
                marginBottom: '1.4rem',
                opacity:   reduceMotion ? 1 : 0,
                animation: reduceMotion ? undefined
                  : `${isAr ? 'heroEyebrowInRtl' : 'heroEyebrowInLtr'} 650ms 200ms cubic-bezier(.4,0,.2,1) forwards`,
              }}>
                <span style={{
                  width: 28, height: 1.5,
                  background: 'linear-gradient(90deg, var(--gold-light), rgba(210,181,106,.3))',
                  flexShrink: 0, display: 'block',
                  transformOrigin: isAr ? 'right' : 'left',
                  animation: reduceMotion ? undefined : 'heroAccentGrow 500ms 400ms cubic-bezier(.4,0,.2,1) both',
                }} />
                <span style={{
                  fontSize: '.6rem', letterSpacing: '.26em', textTransform: 'uppercase',
                  color: 'var(--gold-light)', fontWeight: 600,
                }}>
                  {locContent(heroContent, 'eyebrow', locale) || t('hero.eyebrow')}
                </span>
              </div>

              {/* Headline — word-by-word stagger */}
              <h1 style={{
                fontSize:     'clamp(2.4rem, 4.5vw, 4.2rem)',
                lineHeight:   1.08,
                fontFamily:   'var(--font-fraunces, serif)',
                fontWeight:   700,
                marginBottom: '1.35rem',
                textShadow:   '0 4px 32px rgba(0,0,0,.4)',
                perspective:  '600px',
              }}>
                <span style={{ display: 'block', overflow: 'hidden', paddingBottom: '.06em' }}>
                  {(locContent(heroContent, 'headline', locale) || t('hero.headline'))
                    .split('\n')[0]
                    .split(' ')
                    .map((word: string, wi: number) => (
                      <span
                        key={wi}
                        style={{
                          display: 'inline-block',
                          marginInlineEnd: '.22em',
                          ...(reduceMotion
                            ? { color: 'var(--gold-light)' }
                            : {
                                background: 'linear-gradient(130deg, #f5df88 0%, var(--dune) 45%, var(--gold-light) 100%)',
                                backgroundSize: '200% auto',
                                WebkitBackgroundClip: 'text',
                                WebkitTextFillColor: 'transparent',
                                backgroundClip: 'text',
                                animation: `heroWordDrop 700ms ${380 + wi * 90}ms cubic-bezier(.4,0,.2,1) both, shimmerGold 4s ${1400 + wi * 90}ms linear infinite`,
                                opacity: 0,
                              }),
                        }}
                      >
                        {word}
                      </span>
                    ))}
                </span>

                {(() => {
                  const headline = locContent(heroContent, 'headline', locale) || t('hero.headline');
                  const line2 = headline.split('\n')[1];
                  if (!line2) return null;
                  const line1Words = headline.split('\n')[0].split(' ').length;
                  return (
                    <span style={{ display: 'block', overflow: 'hidden', marginTop: '.1rem', paddingBottom: '.06em' }}>
                      {line2.split(' ').map((word: string, wi: number) => (
                        <span
                          key={wi}
                          style={{
                            display: 'inline-block',
                            marginInlineEnd: '.22em',
                            color: 'rgba(247,244,236,.94)',
                            ...(reduceMotion ? {} : {
                              animation: `heroWordDrop 700ms ${380 + (line1Words + wi) * 90}ms cubic-bezier(.4,0,.2,1) both`,
                              opacity: 0,
                            }),
                          }}
                        >
                          {word}
                        </span>
                      ))}
                    </span>
                  );
                })()}
              </h1>

              {/* Separator line */}
              <div style={{
                height: 1, width: 'clamp(40px,8%,64px)',
                background: 'linear-gradient(90deg, var(--gold-light), transparent)',
                marginBottom: '1.25rem',
                transformOrigin: isAr ? 'right' : 'left',
                opacity:   reduceMotion ? 0.4 : 0,
                animation: reduceMotion ? undefined : 'heroAccentGrow 600ms 900ms cubic-bezier(.4,0,.2,1) forwards',
              }} />

              {/* Sub */}
              <p style={{
                fontSize:     'clamp(.9rem, 1.2vw, 1rem)',
                lineHeight:   1.8,
                color:        'rgba(247,244,236,.58)',
                maxWidth:     '36ch',
                marginBottom: '2rem',
                opacity:      reduceMotion ? 1 : 0,
                animation:    reduceMotion ? undefined : 'heroSubIn 650ms 1000ms cubic-bezier(.4,0,.2,1) forwards',
              }}>
                {locContent(heroContent, 'sub', locale) || t('hero.sub')}
              </p>

              {/* CTAs */}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '.7rem', marginBottom: '2.5rem' }}>
                {[
                  { href: `/${locale}/shop`, label: locContent(heroContent, 'ctaShop', locale) || t('hero.cta_shop'), cls: 'btn btn-gold' },
                  { href: '#collections',    label: locContent(heroContent, 'ctaDiscover', locale) || t('hero.cta_discover'), cls: 'btn btn-line-dark' },
                ].map((cta, ci) => (
                  <Link
                    key={ci}
                    href={cta.href}
                    className={cta.cls}
                    style={reduceMotion ? {} : {
                      opacity: 0,
                      animation: `heroCTAIn 550ms ${1100 + ci * 120}ms cubic-bezier(.34,1.56,.64,1) forwards`,
                    }}
                  >
                    {cta.label}
                  </Link>
                ))}
              </div>

              {/* Stats */}
              <div ref={statsRef} style={{ display: 'flex', gap: '.6rem' }}>
                {(cmsStats.length > 0 ? cmsStats : [
                  { num: '+500',  labelAr: 'عميل سعيد',    labelEn: 'Happy Clients'   },
                  { num: '★4.9', labelAr: 'تقييم العملاء', labelEn: 'Customer Rating' },
                  { num: '100%', labelAr: 'صنع في مصر',    labelEn: 'Made in Egypt'   },
                ]).map((s: any, i: number) => (
                  <div key={i} style={{
                    flex: '0 0 auto',
                    opacity: reduceMotion ? 1 : (statsVisible ? 1 : 0),
                    animation: (!reduceMotion && statsVisible)
                      ? `heroStatIn 480ms ${i * 100}ms cubic-bezier(.4,0,.2,1) both`
                      : undefined,
                  }}>
                    <p style={{
                      fontSize:     'clamp(1.3rem, 2vw, 1.65rem)',
                      fontWeight:   800,
                      color:        'var(--gold-light)',
                      lineHeight:   1,
                      fontFamily:   isAr ? 'var(--font-cairo, Cairo, sans-serif)' : 'var(--font-fraunces, serif)',
                      marginBottom: '.3rem',
                      textShadow:   '0 2px 16px rgba(0,0,0,.4)',
                      padding:      '9px',
                      borderRadius: '5px',
                      background:   'rgba(210,181,106,.07)',
                      animation:    (!reduceMotion && statsVisible)
                        ? `heroGoldLinePulse 2.5s ${i * 200}ms ease-in-out infinite`
                        : undefined,
                    }}>
                      {s.num}
                    </p>
                    <p style={{ fontSize: '.6rem', color: 'rgba(247,244,236,.4)', letterSpacing: '.04em', textAlign: 'center' }}>
                      {isAr ? (s.labelAr || s.ar) : (s.labelEn || s.en)}
                    </p>
                  </div>
                ))}
              </div>

            </div>{/* end content col */}
          </div>{/* end grid */}
        </div>
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
            {(Array.isArray(whyContent?.points) && whyContent.points.some((p: any) =>
                p.titleAr || p.titleEn || p.titleArEn || p.bodyAr || p.bodyEn
              )
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
        style={{ padding:'5rem 0 5.5rem', background:'var(--charcoal)', position: 'relative', overflow:'hidden' }}
        className={`section-reveal${reviewsVisible ? ' visible' : ''}`}
      >
        {/* Background glow */}
        <div aria-hidden style={{
          position: 'absolute', top: '50%', left: '50%',
          transform: 'translate(-50%,-50%)',
          width: '60vw', height: '60vw', maxWidth: 600,
          background: 'radial-gradient(ellipse at center, color-mix(in srgb, var(--gold-light) 8%, transparent) 0%, transparent 65%)',
          pointerEvents: 'none',
        }} />

        <div className="wrap relative z-10" style={{ maxWidth: 680, margin: '0 auto' }}>

          {/* Header */}
          <div data-reveal="up" style={{ textAlign: 'center', marginBottom: '3rem' }}>
            <div className="inline-flex items-center gap-2 px-4 py-1 rounded-full mb-3" style={{
              background: 'rgba(210,181,106,.06)',
              border: '1px solid rgba(210,181,106,.2)',
            }}>
              <span style={{ fontSize: '.6rem', letterSpacing: '.18em', textTransform: 'uppercase', color: 'var(--gold-light)', fontWeight: 700 }}>
                {isAr ? 'آراء العملاء' : 'CUSTOMER REVIEWS'}
              </span>
            </div>
            <h2 className="display-3" style={{ color: 'var(--ivory)', fontSize: 'clamp(1.6rem,3vw,2.2rem)' }}>
              {t('reviews.title')}
            </h2>
          </div>

          {/* Card */}
          <div data-reveal="scale">
            {reviews.length > 0 ? (
              <div style={{
                background: 'linear-gradient(150deg, rgba(35,30,22,.98) 0%, rgba(25,22,16,.98) 100%)',
                border: '1px solid rgba(210,181,106,.18)',
                borderRadius: 24,
                padding: 'clamp(1.5rem, 4vw, 2.25rem)',
                boxShadow: '0 24px 60px rgba(0,0,0,.5), 0 0 0 1px rgba(255,255,255,.03)',
                position: 'relative',
                overflow: 'hidden',
              }}>

                {/* Decorative quote mark */}
                <div aria-hidden style={{
                  position: 'absolute', top: '1rem', insetInlineStart: '1.5rem',
                  fontSize: '5rem', lineHeight: 1, color: 'rgba(210,181,106,.06)',
                  fontFamily: 'Georgia, serif', fontWeight: 900, pointerEvents: 'none',
                  userSelect: 'none',
                }}>
                  &ldquo;
                </div>

                {/* Stars + verified row */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '.5rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '.25rem' }}>
                    {[1,2,3,4,5].map(s => (
                      <svg key={s} width="15" height="15" viewBox="0 0 24 24" aria-hidden
                        fill={s <= Math.round(reviews[activeReview]?.rating ?? 0) ? 'var(--gold-light)' : 'rgba(255,255,255,.12)'}
                      >
                        <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                      </svg>
                    ))}
                    <span style={{ fontSize: '.75rem', fontWeight: 700, color: 'rgba(247,244,236,.45)', marginInlineStart: '.5rem' }}>
                      {(reviews[activeReview]?.rating ?? 0).toFixed(1)}
                    </span>
                  </div>
                  {reviews[activeReview]?.verified && (
                    <span style={{
                      display: 'inline-flex', alignItems: 'center', gap: '.35rem',
                      fontSize: '.65rem', fontWeight: 700, color: '#4ade80',
                      background: 'rgba(74,222,128,.08)', border: '1px solid rgba(74,222,128,.2)',
                      borderRadius: 999, padding: '.25rem .75rem',
                    }}>
                      <svg width="9" height="9" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                        <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z"/>
                      </svg>
                      {isAr ? 'تجربة موثّقة' : 'Verified'}
                    </span>
                  )}
                </div>

                {/* Review text — animated on change */}
                <p
                  key={activeReview}
                  style={{
                    fontSize: 'clamp(.95rem, 1.8vw, 1.1rem)',
                    lineHeight: 1.8,
                    color: 'rgba(247,244,236,.82)',
                    marginBottom: '1.75rem',
                    fontStyle: 'italic',
                    animation: 'fadeSlideUp 350ms ease both',
                    minHeight: '3.6rem',
                  }}
                >
                  &ldquo;{reviews[activeReview]?.text}&rdquo;
                </p>

                {/* Divider */}
                <div style={{ height: 1, background: 'linear-gradient(90deg, transparent, rgba(210,181,106,.15), transparent)', marginBottom: '1.25rem' }} />

                {/* Author + navigation */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}>

                  {/* Author */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '.85rem' }}
                    key={`author-${activeReview}`}
                    className="review-author-enter"
                  >
                    <div style={{
                      width: 42, height: 42, borderRadius: '50%', flexShrink: 0,
                      background: 'linear-gradient(135deg, var(--gold-light) 0%, #a07840 100%)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontWeight: 800, color: 'var(--charcoal)', fontSize: '.95rem',
                      boxShadow: '0 4px 12px rgba(210,181,106,.2)',
                    }}>
                      {reviews[activeReview]?.name?.[0]?.toUpperCase() ?? '?'}
                    </div>
                    <div>
                      <p style={{ fontWeight: 700, color: 'var(--ivory)', fontSize: '.9rem', lineHeight: 1.3 }}>
                        {reviews[activeReview]?.name}
                      </p>
                      <p style={{ fontSize: '.68rem', color: 'rgba(247,244,236,.35)', marginTop: '.15rem' }}>
                        {isAr ? 'عميل رواقة' : 'RAWAQA Customer'}
                      </p>
                    </div>
                  </div>

                  {/* Navigation */}
                  {reviews.length > 1 && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '.75rem' }}>

                      {/* Dot indicators */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '.4rem' }}>
                        {reviews.map((_, i) => (
                          <button
                            key={i}
                            type="button"
                            onClick={() => setActiveReview(i)}
                            aria-label={t('reviews.go_to', { n: i + 1 })}
                            aria-current={i === activeReview ? 'true' : undefined}
                            style={{
                              padding: '6px 2px', background: 'none', border: 'none', cursor: 'pointer',
                              display: 'flex', alignItems: 'center',
                            }}
                          >
                            <span style={{
                              display: 'block',
                              width: i === activeReview ? 20 : 6,
                              height: 6,
                              borderRadius: 999,
                              background: i === activeReview ? 'var(--gold-light)' : 'rgba(255,255,255,.2)',
                              transition: 'all 350ms cubic-bezier(.4,0,.2,1)',
                            }} />
                          </button>
                        ))}
                      </div>

                      {/* Prev / Next */}
                      <div style={{ display: 'flex', gap: '.35rem' }}>
                        {[
                          {
                            label: t('reviews.prev'),
                            onClick: () => setActiveReview(p => (p - 1 + reviews.length) % reviews.length),
                            icon: isAr ? '→' : '←',
                          },
                          {
                            label: t('reviews.next'),
                            onClick: () => setActiveReview(p => (p + 1) % reviews.length),
                            icon: isAr ? '←' : '→',
                          },
                        ].map(btn => (
                          <button
                            key={btn.label}
                            type="button"
                            onClick={btn.onClick}
                            aria-label={btn.label}
                            style={{
                              width: 38, height: 38, borderRadius: '50%', flexShrink: 0,
                              border: '1px solid rgba(210,181,106,.25)',
                              background: 'rgba(210,181,106,.04)',
                              color: 'rgba(247,244,236,.6)',
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              cursor: 'pointer', fontSize: '.85rem', fontWeight: 700,
                              transition: 'all 200ms ease',
                            }}
                            onMouseEnter={e => {
                              e.currentTarget.style.borderColor = 'var(--gold-light)';
                              e.currentTarget.style.color = 'var(--gold-light)';
                              e.currentTarget.style.background = 'rgba(210,181,106,.1)';
                            }}
                            onMouseLeave={e => {
                              e.currentTarget.style.borderColor = 'rgba(210,181,106,.25)';
                              e.currentTarget.style.color = 'rgba(247,244,236,.6)';
                              e.currentTarget.style.background = 'rgba(210,181,106,.04)';
                            }}
                          >
                            {btn.icon}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>

            ) : (
              /* Empty state */
              <div style={{
                textAlign: 'center',
                padding: '3.5rem 2rem',
                background: 'rgba(25,22,16,.95)',
                border: '1px solid rgba(210,181,106,.12)',
                borderRadius: 24,
              }}>
                <div style={{ fontSize: '2.5rem', marginBottom: '.75rem', opacity: .6 }}>★★★★★</div>
                <p style={{ fontSize: '.95rem', color: 'rgba(247,244,236,.55)', lineHeight: 1.7, marginBottom: '1.5rem' }}>
                  {isAr
                    ? 'لا توجد آراء بعد — كن أول من يشارك تجربته مع منتجات رواقة.'
                    : 'No reviews yet — be the first to share your experience with RAWAQA.'}
                </p>
                <Link href={`/${locale}/shop`} className="btn btn-line-dark btn-sm inline-flex items-center gap-2">
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
        <div className="wrap" style={{ position:'relative',zIndex:1 }}>
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
