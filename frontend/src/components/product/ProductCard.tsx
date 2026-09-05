'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useParams, useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useCart } from '@/context/CartContext';
import { useToast } from '@/context/ToastContext';
import { useAuth } from '@/context/AuthContext';
import { loc, formatPrice } from '@/lib/utils';
import type { Product } from '@/lib/types';

/* SVG fallback paths */
const BAG_SVG: Record<string, string> = {
  'bag-1': 'M60 260 C40 160 110 60 210 60 C310 60 360 170 335 260 C315 330 250 350 195 350 C135 350 78 325 60 260Z',
  'bag-2': 'M80 300 C30 220 60 110 165 75 C270 40 360 120 350 220 C342 300 270 355 190 355 C130 355 115 345 80 300Z',
  'bag-3': 'M200 80 C310 80 370 160 360 260 C350 340 280 370 200 370 C120 370 50 340 40 260 C30 160 90 80 200 80Z',
};

function ProductImage({ src, name, product }: { src?: string; name: string; product: Product }) {
  if (src) {
    return (
      <Image
        src={src}
        alt={name}
        fill
        className="object-cover card-img"
        sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
        style={{ transition: 'transform 500ms cubic-bezier(.22,.61,.36,1)' }}
      />
    );
  }
  const ext = product as Product & { _shape?: string; _colors?: string[] };
  const shape = ext._shape || 'bag-2';
  const color = ext._colors?.[0] || 'var(--gold-light)';
  const svgPath = BAG_SVG[shape] || BAG_SVG['bag-2'];
  return (
    <div className="absolute inset-0 flex items-center justify-center card-img" style={{ background: color + '18' }}>
      <svg width="62%" height="62%" viewBox="0 0 400 400" fill={color}
        style={{ filter: `drop-shadow(0 12px 24px ${color}55)`, transition: 'transform 500ms ease' }}>
        <path d={svgPath} />
        <path d="M140 150 Q175 110 230 108" stroke="rgba(255,255,255,.4)" strokeWidth="5" fill="none" strokeLinecap="round" />
      </svg>
    </div>
  );
}

export default function ProductCard({ product }: { product: Product }) {
  const t      = useTranslations('product');
  const params = useParams();
  const router = useRouter();
  const locale = (params?.locale as string) || 'ar';
  const { addToCart } = useCart();
  const { showToast } = useToast();
  const { isLoggedIn } = useAuth();
  const isAr = locale === 'ar';

  const [imgIdx, setImgIdx] = useState(0);
  const images = product.images ?? [];

  const name        = loc(product.nameAr, product.nameEn, locale);
  const description = loc(product.descriptionAr, product.descriptionEn, locale);
  const available   = product.inventory.availableQuantity > 0;
  const isLow       = available && product.inventory.availableQuantity <= product.inventory.lowStockThreshold;

  const handleAdd = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isLoggedIn) {
      router.push(`/${locale}/login`);
      return;
    }
    try {
      await addToCart(product.id, 1);
      showToast(t('added'), 'success');
    } catch {
      showToast(isAr ? 'حدث خطأ' : 'Error', 'error');
    }
  };

  return (
    <Link
      href={`/${locale}/product/${product.id}`}
      className="product-card-3d"
      style={{
        display: 'flex',
        flexDirection: 'column',
        background: 'rgba(30,27,21,.85)',
        border: '1px solid rgba(210,181,106,.12)',
        borderRadius: 20,
        overflow: 'hidden',
        cursor: 'pointer',
        textDecoration: 'none',
        backdropFilter: 'blur(8px)',
      }}
    >
      {/* ── Image ─────────────────────────────────────────── */}
      <div
        className="img-zoom"
        style={{
          position: 'relative',
          aspectRatio: '4/5',
          background: 'var(--sand)',
          overflow: 'hidden',
        }}
        onMouseEnter={() => images.length > 1 && setImgIdx(1)}
        onMouseLeave={() => setImgIdx(0)}
      >
        <ProductImage src={images[imgIdx] ?? images[0]} name={name} product={product} />

        {/* Image dots */}
        {images.length > 1 && (
          <div style={{ position: 'absolute', bottom: '0.6rem', left: 0, right: 0, display: 'flex', justifyContent: 'center', gap: '.35rem', zIndex: 2 }}>
            {images.map((_, i) => (
              <button
                key={i}
                onClick={e => { e.preventDefault(); e.stopPropagation(); setImgIdx(i); }}
                style={{ width: i === imgIdx ? 14 : 6, height: 6, borderRadius: 999, border: 'none', background: i === imgIdx ? 'var(--gold-light)' : 'rgba(255,255,255,.5)', cursor: 'pointer', padding: 0, transition: 'all 300ms ease' }}
              />
            ))}
          </div>
        )}

        {/* Featured badge */}
        {product.featured && (
          <span style={{
            position: 'absolute',
            top: '0.875rem',
            [isAr ? 'right' : 'left']: '0.875rem',
            background: 'var(--gold-light)',
            color: 'var(--charcoal)',
            fontSize: '.62rem',
            fontWeight: 800,
            letterSpacing: '.08em',
            textTransform: 'uppercase',
            padding: '.3rem .8rem',
            borderRadius: 999,
            boxShadow: '0 2px 12px rgba(210,181,106,.4)',
          }}>
            {isAr ? 'مميز' : 'Featured'}
          </span>
        )}

        {/* Out of stock overlay */}
        {!available && (
          <div style={{
            position: 'absolute', inset: 0,
            background: 'rgba(21,19,15,.55)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <span style={{ color: 'rgba(247,244,236,.85)', fontSize: '.875rem', fontWeight: 600, letterSpacing: '.04em' }}>
              {t('out_of_stock')}
            </span>
          </div>
        )}

        {/* Quick add — hover */}
        {available && (
          <button
            onClick={handleAdd}
            style={{
              position: 'absolute',
              bottom: '0.875rem',
              left: '0.875rem',
              right: '0.875rem',
            }}
            className="btn btn-gold btn-sm opacity-0 group-hover:opacity-100 translate-y-2 group-hover:translate-y-0 transition-all duration-300"
          >
            {t('add_to_cart')}
          </button>
        )}
      </div>

      {/* ── Info ──────────────────────────────────────────── */}
      <div style={{
        padding: '1.25rem 1.25rem 1.5rem',
        display: 'flex',
        flexDirection: 'column',
        gap: '0.5rem',
        flexGrow: 1,
      }}>
        {/* Category */}
        <p style={{
          fontSize: '.65rem',
          letterSpacing: '.14em',
          textTransform: 'uppercase',
          color: 'var(--gold)',
          fontWeight: 600,
        }}>
          {loc(product.category?.nameAr, product.category?.nameEn, locale)}
        </p>

        {/* Name */}
        <h3 style={{
          fontWeight: 700,
          fontSize: '.975rem',
          lineHeight: 1.35,
          color: 'var(--ivory)',
          display: '-webkit-box',
          WebkitLineClamp: 2,
          WebkitBoxOrient: 'vertical',
          overflow: 'hidden',
          transition: 'color 300ms ease',
        }}>
          {name}
        </h3>

        {/* Description */}
        <p style={{
          fontSize: '.82rem',
          color: 'rgba(247,244,236,.45)',
          lineHeight: 1.55,
          overflow: 'hidden',
          display: '-webkit-box',
          WebkitLineClamp: 1,
          WebkitBoxOrient: 'vertical',
          marginBottom: '0.25rem',
        }}>
          {description}
        </p>

        {/* Price row */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginTop: 'auto',
          paddingTop: '0.75rem',
          borderTop: '1px solid rgba(210,181,106,.1)',
        }}>
          <div>
            <span className="price-3d" style={{
              fontWeight: 800,
              fontSize: '1.05rem',
              color: 'var(--gold-light)',
              display: 'inline-block',
            }}>
              {formatPrice(product.price, locale)}
            </span>
            {product.compareAtPrice && product.compareAtPrice > product.price && (
              <span style={{
                fontSize: '.72rem',
                color: 'rgba(247,244,236,.3)',
                textDecoration: 'line-through',
                marginInlineStart: '.5rem',
              }}>
                {formatPrice(product.compareAtPrice, locale)}
              </span>
            )}
          </div>

          {isLow && (
            <span style={{
              fontSize: '.62rem',
              color: '#c2410c',
              fontWeight: 700,
              background: '#fff7ed',
              padding: '.2rem .6rem',
              borderRadius: 999,
            }}>
              {t('low_stock')}
            </span>
          )}
        </div>

        {/* Mobile add button */}
        {available && (
          <button
            onClick={handleAdd}
            className="btn btn-gold btn-sm md:hidden"
            style={{ marginTop: '0.75rem', width: '100%' }}
          >
            {t('add_to_cart')}
          </button>
        )}
      </div>
    </Link>
  );
}
