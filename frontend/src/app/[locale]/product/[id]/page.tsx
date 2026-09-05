'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { useTranslations } from 'next-intl';
import ProductCarousel from '@/components/product/ProductCarousel';
import { productsApi } from '@/lib/api';
import { STATIC_PRODUCTS } from '@/lib/staticProducts';
import { useCart } from '@/context/CartContext';
import { useToast } from '@/context/ToastContext';
import { useAuth } from '@/context/AuthContext';
import { loc, formatPrice } from '@/lib/utils';
import type { Product } from '@/lib/types';

const DARK   = '#12100c';
const CARD   = 'rgba(30,27,21,.9)';
const BORDER = 'rgba(210,181,106,.1)';
const IVORY  = 'var(--ivory)';
const GOLD   = 'var(--gold-light)';

export default function ProductDetailPage() {
  const t      = useTranslations('product');
  const params = useParams();
  const router = useRouter();
  const locale = (params?.locale as string) || 'ar';
  const id     = params?.id as string;
  const isAr   = locale === 'ar';

  const [product, setProduct]     = useState<Product | null>(
    () => STATIC_PRODUCTS.find(p => p.id === id) ?? null
  );
  const [related, setRelated]     = useState<Product[]>([]);
  const [loading, setLoading]     = useState(!product);
  const [activeImage, setActiveImage] = useState(0);
  const [quantity, setQuantity]   = useState(1);
  const [adding, setAdding]       = useState(false);
  const [openAccordion, setOpenAccordion] = useState<string | null>('description');

  const { addToCart } = useCart();
  const { showToast } = useToast();
  const { isLoggedIn } = useAuth();

  useEffect(() => {
    setLoading(true);
    setActiveImage(0);
    Promise.all([
      productsApi.get(id, locale),
      productsApi.related(id, locale).catch(() => ({ data: [] })),
    ]).then(([pRes, rRes]) => {
      setProduct(pRes.data);
      setRelated(rRes.data ?? []);
    }).catch(() => {
      const sp = STATIC_PRODUCTS.find(p => p.id === id);
      if (sp) {
        setProduct(sp);
        setRelated(
          STATIC_PRODUCTS.filter(p => p.id !== id && p.category.slug === sp.category.slug).slice(0, 4)
        );
      } else {
        router.push(`/${locale}/shop`);
      }
    }).finally(() => setLoading(false));
  }, [id, locale, router]);

  const variantLabel = product?.images?.[activeImage]
    ? `${isAr ? 'الصورة' : 'View'} ${activeImage + 1}`
    : '';

  const handleAdd = useCallback(async () => {
    if (!product) return;
    if (!isLoggedIn) {
      router.push(`/${locale}/login`);
      return;
    }
    setAdding(true);
    try {
      await addToCart(product.id, quantity, activeImage);
      showToast(
        `${isAr ? 'تمت الإضافة' : 'Added'} — ${loc(product.nameAr, product.nameEn, locale)}`,
        'success'
      );
    } catch (e: unknown) {
      showToast((e as Error).message || (isAr ? 'حدث خطأ' : 'Error'), 'error');
    } finally {
      setAdding(false);
    }
  }, [product, quantity, activeImage, addToCart, showToast, isAr, locale, isLoggedIn, router]);

  const handleBuyNow = async () => {
    if (!isLoggedIn) {
      router.push(`/${locale}/login`);
      return;
    }
    await handleAdd();
    router.push(`/${locale}/cart`);
  };

  if (loading && !product) {
    return (
      <div style={{ background: DARK, minHeight: '100vh', paddingTop: '7rem' }}>
        <div className="wrap" style={{ paddingBottom: '5rem' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '3rem' }}>
            <div className="skeleton" style={{ aspectRatio: '1', borderRadius: 20, background: 'rgba(255,255,255,.04)' }} />
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div className="skeleton" style={{ height: 32, width: '60%', borderRadius: 8, background: 'rgba(255,255,255,.04)' }} />
              <div className="skeleton" style={{ height: 80, borderRadius: 8, background: 'rgba(255,255,255,.04)' }} />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!product) return null;

  const name        = loc(product.nameAr, product.nameEn, locale);
  const description = loc(product.descriptionAr, product.descriptionEn, locale);
  const longDesc    = loc(product.longDescriptionAr, product.longDescriptionEn, locale);
  const available   = product.inventory.availableQuantity > 0;
  const isLow       = available && product.inventory.availableQuantity <= product.inventory.lowStockThreshold;
  const images      = product.images ?? [];

  const accordions = [
    { key: 'description', label: t('description'), content: longDesc || description },
    { key: 'materials',   label: t('materials'),
      content: isAr ? 'غطاء خارجي من الجلد الصناعي عالي الجودة، حشو من الإسفنج عالي الكثافة.'
                    : 'High-quality faux leather outer cover, high-density foam filling.' },
    { key: 'dimensions', label: t('dimensions'),
      content: isAr ? 'مقاسات مريحة متعددة — راجع وصف المنتج.'
                    : 'Available in multiple comfortable sizes — see product description.' },
    { key: 'care', label: t('care'),
      content: isAr ? 'امسح بقطعة قماش مبللة. لا تعرضه لأشعة الشمس المباشرة.'
                    : 'Wipe with a damp cloth. Avoid prolonged direct sunlight.' },
  ];

  return (
    <div style={{ background: DARK, minHeight: '100vh', color: IVORY }}>
      <div className="wrap" style={{ paddingTop: '7rem', paddingBottom: '5rem' }}>

        {/* Breadcrumb */}
        <nav style={{ display: 'flex', alignItems: 'center', gap: '.5rem', fontSize: '.78rem', color: 'rgba(247,244,236,.38)', marginBottom: '2.5rem' }}>
          {[
            { label: isAr ? 'الرئيسية' : 'Home', href: `/${locale}` },
            { label: isAr ? 'المتجر' : 'Shop', href: `/${locale}/shop` },
          ].map(b => (
            <span key={b.href} style={{ display: 'flex', alignItems: 'center', gap: '.5rem' }}>
              <Link href={b.href} style={{ color: 'rgba(247,244,236,.38)', transition: 'color 250ms ease' }}
                onMouseEnter={e => (e.currentTarget.style.color = GOLD)}
                onMouseLeave={e => (e.currentTarget.style.color = 'rgba(247,244,236,.38)')}>
                {b.label}
              </Link>
              <span>/</span>
            </span>
          ))}
          <span style={{ color: 'rgba(247,244,236,.65)' }}>{name}</span>
        </nav>

        {/* Main grid */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
          gap: 'clamp(2rem, 4vw, 4rem)',
          alignItems: 'start',
        }}>

          {/* ── Gallery ── */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{
              position: 'relative', aspectRatio: '1',
              borderRadius: 24, overflow: 'hidden',
              background: CARD, border: `1px solid ${BORDER}`,
              boxShadow: '0 20px 60px rgba(0,0,0,.4)',
            }}>
              {images[activeImage] ? (
                <Image
                  key={activeImage}
                  src={images[activeImage]}
                  alt={`${name} — ${isAr ? 'صورة' : 'image'} ${activeImage + 1}`}
                  fill
                  style={{ objectFit: 'cover', transition: 'opacity 350ms ease' }}
                  priority={activeImage === 0}
                  sizes="(max-width: 1024px) 100vw, 50vw"
                />
              ) : (
                <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <svg width="65%" height="65%" viewBox="0 0 400 400" fill={GOLD} style={{ filter: `drop-shadow(0 20px 40px ${GOLD}55)` }}>
                    <path d="M80 300 C30 220 60 110 165 75 C270 40 360 120 350 220 C342 300 270 355 190 355 C130 355 115 345 80 300Z" />
                  </svg>
                </div>
              )}

              {images.length > 1 && (
                <div style={{
                  position: 'absolute', top: '1rem', [isAr ? 'left' : 'right']: '1rem',
                  background: 'rgba(15,14,10,.7)', backdropFilter: 'blur(8px)',
                  borderRadius: 999, padding: '.3rem .75rem', fontSize: '.7rem',
                  color: 'rgba(247,244,236,.6)', border: `1px solid ${BORDER}`,
                }}>
                  {activeImage + 1} / {images.length}
                </div>
              )}

              {images.length > 1 && (
                <>
                  <button onClick={() => setActiveImage(i => Math.max(0, i - 1))}
                    disabled={activeImage === 0}
                    style={{ position:'absolute',top:'50%',left:'1rem',transform:'translateY(-50%)',width:36,height:36,borderRadius:'50%',background:'rgba(15,14,10,.7)',border:`1px solid ${BORDER}`,color:IVORY,fontSize:'1.1rem',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',opacity:activeImage===0?.3:1,transition:'opacity 250ms ease' }}>
                    {isAr ? '›' : '‹'}
                  </button>
                  <button onClick={() => setActiveImage(i => Math.min(images.length - 1, i + 1))}
                    disabled={activeImage === images.length - 1}
                    style={{ position:'absolute',top:'50%',right:'1rem',transform:'translateY(-50%)',width:36,height:36,borderRadius:'50%',background:'rgba(15,14,10,.7)',border:`1px solid ${BORDER}`,color:IVORY,fontSize:'1.1rem',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',opacity:activeImage===images.length-1?.3:1,transition:'opacity 250ms ease' }}>
                    {isAr ? '‹' : '›'}
                  </button>
                </>
              )}
            </div>

            {images.length > 1 && (
              <div style={{ display: 'flex', gap: '.6rem', flexWrap: 'wrap' }}>
                {images.map((img, i) => (
                  <button
                    key={i}
                    onClick={() => setActiveImage(i)}
                    style={{
                      position: 'relative', width: 60, height: 60,
                      borderRadius: 10, overflow: 'hidden', flexShrink: 0,
                      border: `2px solid ${i === activeImage ? GOLD : 'rgba(210,181,106,.15)'}`,
                      cursor: 'pointer', background: 'none', padding: 0,
                      transition: 'border-color 250ms ease, transform 200ms ease',
                      transform: i === activeImage ? 'scale(1.05)' : 'scale(1)',
                      boxShadow: i === activeImage ? `0 0 12px rgba(210,181,106,.4)` : 'none',
                    }}
                  >
                    <Image src={img} alt={`${name} ${i + 1}`} fill style={{ objectFit: 'cover' }} sizes="60px" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* ── Info panel ── */}
          <div style={{ position: 'sticky', top: '6.5rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

            <div>
              <p style={{ fontSize: '.62rem', letterSpacing: '.18em', textTransform: 'uppercase', color: GOLD, marginBottom: '.6rem' }}>
                {loc(product.category?.nameAr, product.category?.nameEn, locale)}
              </p>
              <h1 className="display-3" style={{ color: IVORY, marginBottom: '1rem', lineHeight: 1.2 }}>
                {name}
              </h1>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '.75rem' }}>
                <span style={{ fontSize: '1.75rem', fontWeight: 800, color: GOLD }}>
                  {formatPrice(product.price, locale)}
                </span>
                {product.compareAtPrice && product.compareAtPrice > product.price && (
                  <span style={{ fontSize: '1rem', color: 'rgba(247,244,236,.3)', textDecoration: 'line-through' }}>
                    {formatPrice(product.compareAtPrice, locale)}
                  </span>
                )}
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '.5rem' }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: available ? '#4ade80' : '#f87171', boxShadow: `0 0 6px ${available ? '#4ade80' : '#f87171'}`, flexShrink: 0 }} />
              <span style={{ fontSize: '.82rem', color: 'rgba(247,244,236,.55)' }}>
                {available ? (isLow ? t('low_stock') : t('in_stock')) : t('out_of_stock')}
              </span>
            </div>

            <p style={{ fontSize: '.925rem', lineHeight: 1.75, color: 'rgba(247,244,236,.58)' }}>
              {description}
            </p>

            {images.length > 1 && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '.5rem', fontSize: '.8rem', color: 'rgba(247,244,236,.45)' }}>
                <span>{isAr ? 'العرض المختار:' : 'Selected view:'}</span>
                <span style={{ color: GOLD, fontWeight: 600 }}>{variantLabel}</span>
              </div>
            )}

            <div style={{ height: 1, background: BORDER }} />

            <div>
              <p style={{ fontSize: '.72rem', fontWeight: 600, letterSpacing: '.08em', textTransform: 'uppercase', color: 'rgba(247,244,236,.38)', marginBottom: '.875rem' }}>
                {t('quantity')}
              </p>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <button onClick={() => setQuantity(q => Math.max(1, q - 1))}
                  style={{ width:38,height:38,borderRadius:'50%',border:`1px solid ${BORDER}`,background:'none',color:IVORY,fontSize:'1.1rem',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',transition:'border-color 250ms ease,background 250ms ease' }}
                  onMouseEnter={e=>{e.currentTarget.style.borderColor=GOLD;e.currentTarget.style.background='rgba(210,181,106,.1)'}}
                  onMouseLeave={e=>{e.currentTarget.style.borderColor=BORDER;e.currentTarget.style.background='none'}}>
                  −
                </button>
                <span style={{ minWidth: 32, textAlign: 'center', fontWeight: 800, fontSize: '1.1rem', color: IVORY }}>{quantity}</span>
                <button onClick={() => setQuantity(q => Math.min(product.inventory.availableQuantity, q + 1))}
                  style={{ width:38,height:38,borderRadius:'50%',border:`1px solid ${BORDER}`,background:'none',color:IVORY,fontSize:'1.1rem',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',transition:'border-color 250ms ease,background 250ms ease' }}
                  onMouseEnter={e=>{e.currentTarget.style.borderColor=GOLD;e.currentTarget.style.background='rgba(210,181,106,.1)'}}
                  onMouseLeave={e=>{e.currentTarget.style.borderColor=BORDER;e.currentTarget.style.background='none'}}>
                  +
                </button>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '.75rem' }}>
              <button onClick={handleAdd} disabled={!available || adding} className="btn btn-gold btn-block">
                {adding ? '...' : (isLoggedIn ? t('add_to_cart') : (isAr ? 'سجّل دخولك للشراء' : 'Login to Purchase'))}
              </button>
              <button onClick={handleBuyNow} disabled={!available} className="btn btn-line-dark btn-block">
                {isLoggedIn ? t('buy_now') : (isAr ? 'اشتري الآن' : 'Buy Now')}
              </button>
            </div>

            <p style={{ fontSize: '.78rem', color: 'rgba(247,244,236,.3)', paddingTop: '1rem', borderTop: `1px solid ${BORDER}` }}>
              🚚 {t('ships')} &nbsp;·&nbsp; {t('free_shipping')}
            </p>

            <div style={{ borderTop: `1px solid ${BORDER}` }}>
              {accordions.map(acc => (
                <div key={acc.key} style={{ borderBottom: `1px solid ${BORDER}` }}>
                  <button
                    onClick={() => setOpenAccordion(openAccordion === acc.key ? null : acc.key)}
                    style={{ width:'100%',display:'flex',alignItems:'center',justifyContent:'space-between',padding:'1rem 0',fontSize:'.875rem',fontWeight:600,color:'rgba(247,244,236,.72)',background:'none',border:'none',cursor:'pointer',transition:'color 250ms ease' }}
                    onMouseEnter={e => (e.currentTarget.style.color = GOLD)}
                    onMouseLeave={e => (e.currentTarget.style.color = 'rgba(247,244,236,.72)')}>
                    {acc.label}
                    <span style={{ fontSize: '1.1rem', color: 'rgba(247,244,236,.3)', transition: 'transform 300ms ease', transform: openAccordion === acc.key ? 'rotate(45deg)' : 'none', display: 'inline-block' }}>
                      +
                    </span>
                  </button>
                  {openAccordion === acc.key && (
                    <p style={{ fontSize: '.875rem', color: 'rgba(247,244,236,.48)', lineHeight: 1.75, paddingBottom: '1rem' }}>
                      {acc.content}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── Related products carousel ── */}
        {related.length > 0 && (
          <section style={{ marginTop: '5rem', paddingTop: '4rem', borderTop: `1px solid ${BORDER}` }}>
            <div style={{ marginBottom: '2.5rem' }}>
              <p style={{ fontSize: '.65rem', letterSpacing: '.18em', textTransform: 'uppercase', color: GOLD, marginBottom: '.5rem' }}>
                {isAr ? 'قد يعجبك أيضاً' : 'You May Also Like'}
              </p>
              <h2 className="display-3" style={{ color: IVORY }}>{t('related')}</h2>
            </div>
            <ProductCarousel products={related} locale={locale} />
          </section>
        )}
      </div>
    </div>
  );
}
