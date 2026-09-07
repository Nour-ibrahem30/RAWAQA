'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { wishlistApi } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';

interface WishlistButtonProps {
  productId: string;
  /** 'icon' shows a small heart icon only; 'text' shows icon + label */
  variant?: 'icon' | 'text';
  size?: number;
}

export default function WishlistButton({ productId, variant = 'icon', size = 18 }: WishlistButtonProps) {
  const params = useParams();
  const router = useRouter();
  const locale = (params?.locale as string) || 'ar';
  const isAr = locale === 'ar';
  const { isLoggedIn } = useAuth();
  const { showToast } = useToast();

  const [inWishlist, setInWishlist] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isLoggedIn) return;
    wishlistApi.check(productId)
      .then(r => setInWishlist(r.data?.inWishlist ?? false))
      .catch(() => { /* ignore */ });
  }, [productId, isLoggedIn]);

  const handleToggle = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!isLoggedIn) {
      router.push(`/${locale}/login`);
      return;
    }

    setLoading(true);
    try {
      const res = await wishlistApi.toggle(productId);
      const nowIn = res.data?.inWishlist ?? !inWishlist;
      setInWishlist(nowIn);
      showToast(
        nowIn
          ? (isAr ? 'تمت الإضافة للمفضلة' : 'Added to wishlist')
          : (isAr ? 'تمت الإزالة من المفضلة' : 'Removed from wishlist'),
        'success'
      );
    } catch {
      showToast(isAr ? 'حدث خطأ' : 'Error', 'error');
    } finally {
      setLoading(false);
    }
  };

  const GOLD = 'var(--gold-light)';
  const BORDER = 'rgba(210,181,106,.18)';

  return (
    <button
      onClick={handleToggle}
      disabled={loading}
      aria-label={inWishlist ? (isAr ? 'إزالة من المفضلة' : 'Remove from wishlist') : (isAr ? 'إضافة للمفضلة' : 'Add to wishlist')}
      title={inWishlist ? (isAr ? 'إزالة من المفضلة' : 'Remove from wishlist') : (isAr ? 'أضف للمفضلة' : 'Add to wishlist')}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '.35rem',
        background: inWishlist ? 'rgba(210,181,106,.12)' : 'rgba(255,255,255,.04)',
        border: `1px solid ${inWishlist ? 'rgba(210,181,106,.35)' : BORDER}`,
        borderRadius: variant === 'text' ? 12 : '50%',
        width: variant === 'icon' ? size + 14 : 'auto',
        height: variant === 'icon' ? size + 14 : 'auto',
        padding: variant === 'text' ? '.55rem .9rem' : undefined,
        cursor: loading ? 'default' : 'pointer',
        transition: 'all 250ms ease',
        color: inWishlist ? GOLD : 'rgba(247,244,236,.45)',
        flexShrink: 0,
      }}
      onMouseEnter={e => {
        if (!loading) {
          e.currentTarget.style.borderColor = 'rgba(210,181,106,.5)';
          e.currentTarget.style.background = 'rgba(210,181,106,.1)';
        }
      }}
      onMouseLeave={e => {
        e.currentTarget.style.borderColor = inWishlist ? 'rgba(210,181,106,.35)' : BORDER;
        e.currentTarget.style.background = inWishlist ? 'rgba(210,181,106,.12)' : 'rgba(255,255,255,.04)';
      }}
    >
      {loading ? (
        <svg width={size - 2} height={size - 2} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
          style={{ animation: 'rotateSlow .8s linear infinite', display: 'block' }}>
          <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/>
        </svg>
      ) : (
        <svg width={size} height={size} viewBox="0 0 24 24"
          fill={inWishlist ? 'currentColor' : 'none'}
          stroke="currentColor" strokeWidth="1.8"
          style={{ display: 'block', transition: 'fill 200ms ease' }}>
          <path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"/>
        </svg>
      )}
      {variant === 'text' && (
        <span style={{ fontSize: '.78rem', fontWeight: 600, lineHeight: 1 }}>
          {inWishlist ? (isAr ? 'في المفضلة' : 'Saved') : (isAr ? 'المفضلة' : 'Wishlist')}
        </span>
      )}
    </button>
  );
}
