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
import { productsApi } from '@/lib/api';
import { STATIC_PRODUCTS } from '@/lib/staticProducts';
import type { Product } from '@/lib/types';

/* ─── Category config ─────────────────────────────────────── */
const CATS = [
  { key: 'relax',   color: '#A8543A', icon: '🛋️' },
  { key: 'game',    color: '#3B5578', icon: '🎮' },
  { key: 'kids',    color: '#BE8F2E', icon: '🧸' },
  { key: 'outdoor', color: '#4B5B45', icon: '🌿' },
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

/* ─── Floating Particles (subtle) ────────────────────────── */
function Particles() {
  return (
    <div aria-hidden style={{ position: 'absolute', inset: 0, pointerEvents: 'none', overflow: 'hidden' }}>
      {[14, 22, 35, 48, 60, 72, 82].map((left, i) => (
        <div
          key={i}
          style={{
            position: 'absolute',
            bottom: -8,
            left: `${left}%`,
            width: i % 2 === 0 ? 3 : 2,
            height: i % 2 === 0 ? 3 : 2,
            borderRadius: '50%',
            background: 'var(--gold-light)',
            animation: `particleDrift ${9 + i * 2.5}s ${i * 1.3}s linear infinite`,
            opacity: 0.35,
          }}
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
  const [featured, setFeatured] = useState<Product[]>(
    STATIC_PRODUCTS.filter(p => p.featured).slice(0, 3)
  );
  const [loading, setLoading]   = useState(false); // eslint-disable-line @typescript-eslint/no-unused-vars
  const [statsVisible, setStats] = useState(false);
  const statsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    productsApi.featured(locale)
      .then(r => { if (r.data?.length) setFeatured(r.data.slice(0, 3)); })
      .catch(() => {/* keep static fallback */});
  }, [locale]);

  useEffect(() => {
    if (!statsRef.current) return;
    const io = new IntersectionObserver(([e]) => {
      if (e.isIntersecting) { setStats(true); io.disconnect(); }
    }, { threshold: 0.3 });
    io.observe(statsRef.current);
    return () => io.disconnect();
  }, []);

  return (
    <>
      <LoadingScreen />
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

        <div className="wrap" style={{
          position: 'relative',
          zIndex: 1,
          paddingTop: '7.5rem',
          paddingBottom: '6rem',
          display: 'grid',
          /* Arabic: bag left, text right | English: text left, bag right */
          gridTemplateColumns: '1fr 1fr',
          gap: '3rem',
          alignItems: 'center',
        }}>
          {/* ── Text block ── */}
          <div style={{ order: isAr ? 2 : 1 }}>
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
              {t('hero.eyebrow')}
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
                {t('hero.headline').split('\n')[0]}
              </span>
              <span style={{ color: 'var(--ivory)', display: 'block' }}>
                {t('hero.headline').split('\n')[1] || ''}
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
              {t('hero.sub')}
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
                {t('hero.cta_shop')}
              </Link>
              <Link href={`/${locale}/shop`} className="btn btn-line-dark">
                {t('hero.cta_discover')}
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
              {[
                { num: '500+', ar: 'عميل سعيد',    en: 'Happy Clients' },
                { num: '4.9★', ar: 'تقييم العملاء', en: 'Customer Rating' },
                { num: '100%', ar: 'صنع في مصر',   en: 'Made in Egypt' },
              ].map((s, i) => (
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
                    {isAr ? s.ar : s.en}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* ── Slideshow ── */}
          <div style={{
            order: isAr ? 1 : 2,
            position: 'relative',
            borderRadius: 28,
            overflow: 'hidden',
            aspectRatio: '4/5',
            minHeight: 360,
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
      <section style={{
        padding: '5.5rem 0',
        background: '#1a1710',
        overflow: 'hidden',
      }}>
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
                  background: `linear-gradient(145deg, ${cat.color}bb, ${cat.color})`,
                  position: 'relative',
                  overflow: 'hidden',
                  borderRadius: 20,
                }}>
                  <div aria-hidden style={{ position:'absolute',inset:0,background:'radial-gradient(circle at 28% 28%, rgba(255,255,255,.14) 0%, transparent 55%)' }} />
                  <div aria-hidden style={{ position:'absolute',top:'50%',left:'50%',transform:'translate(-50%,-62%) scale(2.2)',fontSize:'3rem',opacity:.12,filter:'blur(1px)' }}>{cat.icon}</div>
                  <div style={{ fontSize:'1.8rem',marginBottom:'.6rem',position:'relative',zIndex:1 }}>{cat.icon}</div>
                  <span style={{
                    color:'white',fontWeight:700,fontSize:'.95rem',
                    letterSpacing: isAr ? '.02em' : '.05em',
                    textTransform: isAr ? 'none' : 'uppercase',
                    position:'relative',zIndex:1,
                  }}>
                    {t(`discover.${cat.key}` as 'discover.relax')}
                  </span>
                  <span aria-hidden style={{
                    position:'absolute',top:'.85rem',
                    [isAr?'left':'right']: '.85rem',
                    color:'rgba(255,255,255,.55)',fontSize:'1rem',
                  }}>{isAr?'←':'→'}</span>
                </Link>
              </Tilt3D>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════
          FEATURED PRODUCTS
      ═══════════════════════════════════════════════ */}
      <section style={{ padding: '6rem 0', background: '#12100c', overflow: 'hidden' }}>
        <div className="wrap">
          {/* Header */}
          <div data-reveal="up" style={{
            display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between',
            marginBottom: '3rem', flexWrap: 'wrap', gap: '1rem',
          }}>
            <div>
              <p style={{ fontSize: '.68rem', letterSpacing: '.2em', textTransform: 'uppercase', color: 'var(--gold)', marginBottom: '.5rem' }}>
                {isAr ? 'اختيارات مميزة' : 'Top Picks'}
              </p>
              <h2 className="display-3" style={{ color: 'var(--ivory)' }}>{t('featured.title')}</h2>
            </div>
            <Link href={`/${locale}/shop`} className="btn btn-line-dark btn-sm">{t('featured.view_all')}</Link>
          </div>

          {/* Grid */}
          {loading ? (
            <SkeletonGrid count={3} />
          ) : (
            <div data-stagger style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(290px, 1fr))',
              gap: '1.75rem',
            }}>
              {featured.map(p => <ProductCard key={p.id} product={p} />)}
            </div>
          )}
        </div>
      </section>

      {/* ═══════════════════════════════════════════════
          BRAND STORY — real hero image
      ═══════════════════════════════════════════════ */}
      <section id="moment" style={{ padding:'5.5rem 0', background:'var(--charcoal)', color:'var(--ivory)', overflow:'hidden' }}>
        <div className="wrap" style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(280px, 1fr))', gap:'4rem', alignItems:'center' }}>
          <div data-reveal={isAr?'right':'left'}>
            <p style={{ fontSize:'.7rem',letterSpacing:'.2em',textTransform:'uppercase',color:'var(--gold-light)',marginBottom:'1rem' }}>
              {isAr ? 'القصة' : 'The Story'}
            </p>
            <h2 className="display-2" style={{ color:'var(--ivory)',marginBottom:'1.5rem' }}>
              {isAr ? 'مصنوع لحظات الحياة الحقيقية' : 'Made for Real Life Moments'}
            </h2>
            <p style={{ fontSize:'1.05rem',lineHeight:1.75,color:'rgba(247,244,236,.62)',maxWidth:'42ch',marginBottom:'2rem' }}>
              {isAr
                ? 'كل كرسي رواقة يُصنع بعناية باستخدام مواد مختارة لتحمل الاستخدام اليومي مع الحفاظ على جماله وراحته لسنوات.'
                : 'Every Rawaqa chair is handcrafted using selected materials built for daily use while maintaining its beauty and comfort for years.'}
            </p>
            <Link href={`/${locale}/shop`} className="btn btn-gold">
              {isAr ? 'اكتشف المجموعة' : 'Explore Collection'}
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
                  background:'linear-gradient(135deg, rgba(21,19,15,.3) 0%, transparent 60%)',
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
      <section id="why" style={{ padding:'5.5rem 0', background:'#1a1710', overflow:'hidden' }}>
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
          REVIEWS
      ═══════════════════════════════════════════════ */}
      <section style={{ padding:'5.5rem 0', background:'#0f0e0a', overflow:'hidden' }}>
        <div className="wrap">
          <div data-reveal="up" style={{ textAlign:'center',marginBottom:'3rem' }}>
            <p style={{ fontSize:'.7rem',letterSpacing:'.2em',textTransform:'uppercase',color:'var(--gold)',marginBottom:'.6rem' }}>
              {isAr ? 'آراء العملاء' : 'Testimonials'}
            </p>
            <h2 className="display-3" style={{ color:'var(--ivory)' }}>{t('reviews.title')}</h2>
          </div>

          <div data-stagger style={{ display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(260px,1fr))',gap:'1.5rem', maxWidth: 960, margin: '0 auto' }}>
            {REVIEWS.map((r) => (
              <Tilt3D key={r.name}>
                <div className="review-card" style={{
                  background:'rgba(255,255,255,.04)',
                  borderRadius:18,
                  padding:'1.75rem',
                  border:'1px solid rgba(210,181,106,.1)',
                  position:'relative',overflow:'hidden',
                }}>
                  <div aria-hidden style={{
                    position:'absolute',top:'.75rem',
                    [isAr?'left':'right']:'1rem',
                    fontSize:'3.5rem',lineHeight:1,
                    color:'var(--gold-pale)',fontFamily:'Georgia,serif',pointerEvents:'none',
                  }}>
                    &ldquo;
                  </div>
                  <div style={{ display:'flex',gap:'.2rem',marginBottom:'.875rem' }}>
                    {Array.from({length:r.rating}).map((_,j)=>(
                      <span key={j} style={{ color:'var(--gold-light)',fontSize:'.95rem' }}>★</span>
                    ))}
                  </div>
                  <p style={{ fontSize:'.875rem',color:'rgba(247,244,236,.75)',lineHeight:1.75,marginBottom:'1.25rem',fontStyle:'italic' }}>
                    &ldquo;{isAr ? r.textAr : r.textEn}&rdquo;
                  </p>
                  <div style={{ display:'flex',alignItems:'center',gap:'.75rem' }}>
                    <div style={{
                      width:36,height:36,borderRadius:'50%',flexShrink:0,
                      background:'linear-gradient(135deg, var(--gold-light), var(--dune))',
                      display:'flex',alignItems:'center',justifyContent:'center',
                      fontWeight:800,color:'var(--charcoal)',fontSize:'.85rem',
                    }}>
                      {(isAr?r.name:r.nameEn)[0]}
                    </div>
                    <div>
                      <p style={{ fontSize:'.82rem',fontWeight:700,color:'var(--ivory)' }}>{isAr?r.name:r.nameEn}</p>
                      <p style={{ fontSize:'.7rem',color:'rgba(247,244,236,.4)' }}>{isAr?'عميل موثّق':'Verified Customer'}</p>
                    </div>
                  </div>
                </div>
              </Tilt3D>
            ))}
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
          <h2 className="display-3" style={{ color:'var(--ivory)',marginBottom:'1rem' }}>{t('cta.title')}</h2>
          <p style={{ fontSize:'1rem',lineHeight:1.65,color:'rgba(247,244,236,.52)',maxWidth:'42ch',margin:'0 auto 2rem' }}>
            {t('cta.sub')}
          </p>
          <Link href={`/${locale}/shop`} className="btn btn-gold" style={{ fontSize:'.85rem',padding:'.9rem 2.4rem' }}>
            {t('cta.btn')}
          </Link>
        </div>
      </section>
    </>
  );
}
