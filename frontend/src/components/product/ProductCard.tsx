'use client';

import { useState, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useParams, useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useCart } from '@/context/CartContext';
import { useToast } from '@/context/ToastContext';
import { useAuth } from '@/context/AuthContext';
import { loc, formatPrice, resolveProductImageUrl } from '@/lib/utils';
import type { Product } from '@/lib/types';
import WishlistButton from './WishlistButton';

/* SVG fallback paths */
const BAG_SVG: Record<string, string> = {
  'bag-1': 'M60 260 C40 160 110 60 210 60 C310 60 360 170 335 260 C315 330 250 350 195 350 C135 350 78 325 60 260Z',
  'bag-2': 'M80 300 C30 220 60 110 165 75 C270 40 360 120 350 220 C342 300 270 355 190 355 C130 355 115 345 80 300Z',
  'bag-3': 'M200 80 C310 80 370 160 360 260 C350 340 280 370 200 370 C120 370 50 340 40 260 C30 160 90 80 200 80Z',
};

function ProductImage({ src, name, product, priority = false }: { src?: string; name: string; product: Product; priority?: boolean }) {
  const [imgError, setImgError] = useState(false);
  const resolved = resolveProductImageUrl(src);

  if (src && !imgError) {
    return (
      <Image
        src={resolved}
        alt={name}
        fill
        quality={72}
        priority={priority}
        loading={priority ? 'eager' : 'lazy'}
        className="object-cover card-img"
        sizes="(max-width: 640px) 92vw, (max-width: 1024px) 45vw, 360px"
        style={{ transition: 'transform 500ms cubic-bezier(.22,.61,.36,1)' }}
        onError={() => setImgError(true)}
      />
    );
  }
  const ext = product as Product & { _shape?: string; _colors?: string[] };
  const shape = ext._shape || 'bag-2';
  const color = ext._colors?.[0] || 'var(--gold-light)';
  const svgPath = BAG_SVG[shape] || BAG_SVG['bag-2'];
  return (
    <div className="absolute inset-0 flex items-center justify-center card-img" style={{ background: color + '18' }} aria-hidden>
      <svg width="62%" height="62%" viewBox="0 0 400 400" fill={color}
        style={{ filter: `drop-shadow(0 12px 24px ${color}55)`, transition: 'transform 500ms ease' }}>
        <path d={svgPath} />
        <path d="M140 150 Q175 110 230 108" stroke="rgba(255,255,255,.4)" strokeWidth="5" fill="none" strokeLinecap="round" />
      </svg>
    </div>
  );
}

export default function ProductCard({ product, priority = false }: { product: Product; priority?: boolean }) {
  const t      = useTranslations('product');
  const params = useParams();
  const router = useRouter();
  const locale = (params?.locale as string) || 'ar';
  const { addToCart } = useCart();
  const { showToast } = useToast();
  const { isLoggedIn } = useAuth();
  const isAr = locale === 'ar';

  const [imgIdx, setImgIdx] = useState(0);
  const [prevIdx, setPrevIdx] = useState<number | null>(null);
  const [fading, setFading] = useState(false);
  const [isAdding, setIsAdding] = useState(false);

  // Drag/swipe state
  const dragStart = useRef<{ x: number; y: number } | null>(null);
  const isDragging = useRef(false);

  const images = (product.images ?? [])
    .map((img: any) => (typeof img === 'string' ? img : img?.url))
    .filter(Boolean);

  const name        = loc(product.nameAr, product.nameEn, locale);
  const available   = product.inventory.availableQuantity > 0;
  const isLow       = available && product.inventory.availableQuantity <= product.inventory.lowStockThreshold;

  const goTo = (i: number) => {
    if (i === imgIdx || fading) return;
    setPrevIdx(imgIdx);
    setFading(true);
    setImgIdx(i);
    setTimeout(() => { setFading(false); setPrevIdx(null); }, 280);
  };

  const next = () => goTo((imgIdx + 1) % images.length);
  const prev = () => goTo((imgIdx - 1 + images.length) % images.length);

  // Mouse drag handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    dragStart.current = { x: e.clientX, y: e.clientY };
    isDragging.current = false;
  };
  const handleMouseMove = (e: React.MouseEvent) => {
    if (!dragStart.current) return;
    if (Math.abs(e.clientX - dragStart.current.x) > 5) isDragging.current = true;
  };
  const handleMouseUp = (e: React.MouseEvent) => {
    if (!dragStart.current || images.length < 2) { dragStart.current = null; return; }
    const dx = e.clientX - dragStart.current.x;
    dragStart.current = null;
    if (Math.abs(dx) < 30) { isDragging.current = false; return; }
    // RTL aware: right drag = prev for LTR, next for RTL
    if (dx < 0) isAr ? prev() : next();
    else isAr ? next() : prev();
    isDragging.current = false;
  };
  const handleMouseLeave = () => { dragStart.current = null; isDragging.current = false; };

  // Touch handlers
  const touchStart = useRef<number | null>(null);
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStart.current = e.touches[0]?.clientX ?? null;
  };
  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStart.current === null || images.length < 2) return;
    const dx = (e.changedTouches[0]?.clientX ?? 0) - touchStart.current;
    touchStart.current = null;
    if (Math.abs(dx) < 30) return;
    if (dx < 0) isAr ? prev() : next();
    else isAr ? next() : prev();
  };

  const handleAdd = async (e: React.MouseEvent | React.KeyboardEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (isAdding) return;                     // prevent double-click
    if (!isLoggedIn) {
      router.push(`/${locale}/login`);
      return;
    }
    setIsAdding(true);
    try {
      await addToCart(product.id, 1);
      showToast(t('added'), 'success');
    } catch {
      showToast(isAr ? 'حدث خطأ' : 'Error', 'error');
    } finally {
      setIsAdding(false);
    }
  };

  const handleLinkClick = (e: React.MouseEvent) => {
    if (isDragging.current) e.preventDefault();
  };

  const prodId = product.id || (product as any)._id;
  const href = `/${locale}/product/${prodId}`;

  return (
    <article
      className="product-card-3d group"
      style={{
        display: 'flex',
        flexDirection: 'column',
        background: 'color-mix(in srgb, var(--charcoal-soft) 90%, transparent)',
        border: '1px solid rgba(210,181,106,.15)',
        borderRadius: 20,
        overflow: 'hidden',
      }}
    >
      {/* ── Image ─────────────────────────────────────────── */}
      <div
        className="img-zoom"
        style={{
          position: 'relative',
          aspectRatio: '1/1',
          background: 'color-mix(in srgb, var(--charcoal) 80%, transparent)',
          overflow: 'hidden',
          cursor: images.length > 1 ? 'grab' : 'pointer',
          userSelect: 'none',
        }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseLeave}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        {/* Previous image (fading out) */}
        {prevIdx !== null && (
          <div style={{
            position: 'absolute', inset: 0, zIndex: 1,
            opacity: fading ? 0 : 1,
            transition: 'opacity 220ms ease',
            pointerEvents: 'none',
          }}>
            <ProductImage src={images[prevIdx] ?? images[0]} name={name} product={product} />
          </div>
        )}

        {/* Current image (fading in) */}
        <div style={{
          position: 'absolute', inset: 0, zIndex: 2,
          opacity: fading ? 0 : 1,
          transition: 'opacity 220ms ease',
          pointerEvents: 'none',
        }}>
          <ProductImage src={images[imgIdx] ?? images[0]} name={name} product={product} priority={priority} />
        </div>

        {/* Invisible link overlay for navigation */}
        <Link
          href={href}
          aria-label={name}
          onClick={handleLinkClick}
          style={{ position: 'absolute', inset: 0, display: 'block', zIndex: 3 }}
        />

        {/* Image dots */}
        {images.length > 1 && (
          <div
            className="absolute z-[30]"
            style={{
              bottom: '0.6rem',
              left: '50%',
              transform: 'translateX(-50%)',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '5px',
              padding: '5px 10px',
              borderRadius: 999,
              background: 'rgba(0,0,0,.45)',
              backdropFilter: 'blur(6px)',
              WebkitBackdropFilter: 'blur(6px)',
              border: '1px solid rgba(255,255,255,.1)',
              pointerEvents: 'auto',
            }}
          >
            {images.map((_, i) => (
              <button
                key={i}
                type="button"
                onClick={e => { e.preventDefault(); e.stopPropagation(); goTo(i); }}
                style={{
                  padding: 0,
                  margin: 0,
                  border: 'none',
                  background: 'none',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  minHeight: 20,
                  minWidth: i === imgIdx ? 18 : 8,
                }}
                aria-label={t('show_image', { n: i + 1, name })}
                aria-current={i === imgIdx ? 'true' : undefined}
              >
                <span
                  style={{
                    display: 'block',
                    height: 5,
                    width: i === imgIdx ? 18 : 5,
                    borderRadius: 999,
                    background: i === imgIdx
                      ? 'var(--gold-light)'
                      : 'rgba(255,255,255,.5)',
                    transition: 'all 280ms cubic-bezier(.4,0,.2,1)',
                    boxShadow: i === imgIdx ? '0 0 8px rgba(210,181,106,.5)' : 'none',
                  }}
                />
              </button>
            ))}
          </div>
        )}

        {/* Featured badge */}
        {product.featured && (
          <span style={{
            position: 'absolute',
            top: '0.65rem',
            insetInlineStart: '0.65rem',
            background: 'var(--gold-light)',
            color: 'var(--charcoal)',
            fontSize: '.58rem',
            fontWeight: 800,
            letterSpacing: '.06em',
            textTransform: 'uppercase',
            padding: '.25rem .65rem',
            borderRadius: 999,
            boxShadow: '0 2px 10px rgba(210,181,106,.35)',
            zIndex: 2,
            pointerEvents: 'none',
          }}>
            {isAr ? 'مميز' : 'Featured'}
          </span>
        )}

        {/* Wishlist button */}
        <div style={{ position: 'absolute', top: '0.65rem', insetInlineEnd: '0.65rem', zIndex: 2 }}>
          <WishlistButton productId={product.id || (product as any)._id || (product as any).slugEn || product.sku || ''} variant="icon" size={15} />
        </div>

        {/* Out of stock overlay */}
        {!available && (
          <div style={{
            position: 'absolute', inset: 0,
            background: 'rgba(21,19,15,.6)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            pointerEvents: 'none',
            zIndex: 1,
          }}>
            <span style={{ color: 'var(--ivory)', fontSize: '.78rem', fontWeight: 600, letterSpacing: '.04em' }}>
              {t('out_of_stock')}
            </span>
          </div>
        )}
      </div>

      {/* ── Info ──────────────────────────────────────────── */}
      <div style={{
        padding: '0.875rem 1rem 1.1rem',
        display: 'flex',
        flexDirection: 'column',
        gap: '0.35rem',
        flexGrow: 1,
      }}>
        <p style={{
          fontSize: '.6rem',
          letterSpacing: '.12em',
          textTransform: 'uppercase',
          color: 'var(--gold)',
          fontWeight: 600,
        }}>
          {loc(product.category?.nameAr, product.category?.nameEn, locale)}
        </p>

        <h3 style={{
          fontWeight: 700,
          fontSize: '.875rem',
          lineHeight: 1.3,
          color: 'var(--ivory)',
          display: '-webkit-box',
          WebkitLineClamp: 2,
          WebkitBoxOrient: 'vertical',
          overflow: 'hidden',
        }}>
          <Link href={href} style={{ color: 'inherit' }}>
            {name}
          </Link>
        </h3>

        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginTop: 'auto',
          paddingTop: '0.5rem',
          borderTop: '1px solid rgba(210,181,106,.08)',
        }}>
          <div>
            <span className="price-3d" style={{
              fontWeight: 800,
              fontSize: '.95rem',
              color: 'var(--gold-light)',
              display: 'inline-block',
            }}>
              {formatPrice(product.price, locale)}
            </span>
            {product.compareAtPrice && product.compareAtPrice > product.price && (
              <span style={{
                fontSize: '.68rem',
                color: 'var(--text-on-bg-35)',
                textDecoration: 'line-through',
                marginInlineStart: '.4rem',
              }}>
                {formatPrice(product.compareAtPrice, locale)}
              </span>
            )}
          </div>

          {isLow && (
            <span style={{
              fontSize: '.58rem',
              color: '#c2410c',
              fontWeight: 700,
              background: '#fff7ed',
              padding: '.15rem .5rem',
              borderRadius: 999,
            }}>
              {t('low_stock')}
            </span>
          )}
        </div>

        {available && (
          <button
            type="button"
            onClick={handleAdd}
            disabled={isAdding}
            className="btn btn-gold btn-sm product-card-add text-xs py-1.5 mt-1"
            style={{ width: '100%', minHeight: 44, opacity: isAdding ? 0.7 : 1, transition: 'opacity 200ms' }}
            aria-label={`${t('add_to_cart')}: ${name}`}
          >
            {isAdding ? (
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
                style={{ animation: 'rotateSlow 0.8s linear infinite', display: 'inline-block' }}>
                <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/>
              </svg>
            ) : t('add_to_cart')}
          </button>
        )}
      </div>
    </article>
  );
}
