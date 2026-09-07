'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { reviewsApi, type Review } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';

interface Props {
  productId: string;
  locale: string;
  productRatings?: { average: number; count: number };
}

const BORDER = 'rgba(210,181,106,.1)';
const GOLD   = 'var(--gold-light)';
const IVORY  = 'var(--ivory)';

function StarRating({ value, onChange, readonly = false, size = 20 }: {
  value: number; onChange?: (v: number) => void; readonly?: boolean; size?: number;
}) {
  const [hover, setHover] = useState(0);
  return (
    <div style={{ display: 'flex', gap: '.2rem' }}>
      {[1, 2, 3, 4, 5].map(star => (
        <button
          key={star}
          type="button"
          onClick={() => !readonly && onChange?.(star)}
          onMouseEnter={() => !readonly && setHover(star)}
          onMouseLeave={() => !readonly && setHover(0)}
          disabled={readonly}
          style={{
            background: 'none', border: 'none', padding: 0,
            cursor: readonly ? 'default' : 'pointer',
            color: star <= (hover || value) ? '#f59e0b' : 'rgba(247,244,236,.18)',
            transition: 'color 150ms ease',
            display: 'flex',
          }}
          aria-label={`${star} star${star > 1 ? 's' : ''}`}
        >
          <svg width={size} height={size} viewBox="0 0 24 24"
            fill={star <= (hover || value) ? 'currentColor' : 'none'}
            stroke="currentColor" strokeWidth="1.5">
            <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
          </svg>
        </button>
      ))}
    </div>
  );
}

export default function ProductReviews({ productId, locale, productRatings }: Props) {
  const t = useTranslations('product');
  const isAr = locale === 'ar';
  const { isLoggedIn } = useAuth();
  const { showToast } = useToast();

  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({ rating: 0, comment: '', titleAr: '', titleEn: '' });
  const [markingHelpful, setMarkingHelpful] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    reviewsApi.list(productId, 1, locale)
      .then(r => {
        setReviews(r.data ?? []);
        setHasMore((r.pagination?.pages ?? 1) > 1);
      })
      .catch(() => setReviews([]))
      .finally(() => setLoading(false));
  }, [productId, locale]);

  const loadMore = async () => {
    const next = page + 1;
    const r = await reviewsApi.list(productId, next, locale);
    setReviews(prev => [...prev, ...(r.data ?? [])]);
    setPage(next);
    setHasMore(next < (r.pagination?.pages ?? 1));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (form.rating === 0) {
      showToast(isAr ? 'اختر تقييمك أولاً' : 'Please select a rating', 'error');
      return;
    }
    setSubmitting(true);
    try {
      await reviewsApi.add(productId, {
        rating: form.rating,
        comment: form.comment,
        ...(form.titleAr ? { titleAr: form.titleAr } : {}),
        ...(form.titleEn ? { titleEn: form.titleEn } : {}),
      });
      showToast(t('review_submitted'), 'success');
      setShowForm(false);
      setForm({ rating: 0, comment: '', titleAr: '', titleEn: '' });
    } catch (err: unknown) {
      showToast((err as Error).message || (isAr ? 'حدث خطأ' : 'Error'), 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleHelpful = async (reviewId: string) => {
    setMarkingHelpful(reviewId);
    try {
      await reviewsApi.markHelpful(reviewId);
      setReviews(prev => prev.map(r => r.id === reviewId ? { ...r, helpfulVotes: r.helpfulVotes + 1 } : r));
    } catch { /* ignore */ } finally {
      setMarkingHelpful(null);
    }
  };

  const avgRating = productRatings?.average ?? (reviews.length > 0 ? reviews.reduce((s, r) => s + r.rating, 0) / reviews.length : 0);
  const totalCount = productRatings?.count ?? reviews.length;

  return (
    <section style={{ marginTop: '5rem', paddingTop: '4rem', borderTop: `1px solid ${BORDER}` }}>
      {/* Section header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem', marginBottom: '2rem' }}>
        <div>
          <p style={{ fontSize: '.65rem', letterSpacing: '.18em', textTransform: 'uppercase', color: GOLD, marginBottom: '.5rem' }}>
            {isAr ? 'آراء العملاء' : 'Customer Reviews'}
          </p>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
            <h2 className="display-3" style={{ color: IVORY }}>{t('reviews')}</h2>
            {totalCount > 0 && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '.5rem' }}>
                <StarRating value={Math.round(avgRating)} readonly size={16} />
                <span style={{ fontSize: '.82rem', color: 'rgba(247,244,236,.5)' }}>
                  {avgRating.toFixed(1)} ({totalCount} {t('reviews_count')})
                </span>
              </div>
            )}
          </div>
        </div>

        {isLoggedIn && !showForm && (
          <button onClick={() => setShowForm(true)} className="btn btn-gold btn-sm">
            {t('write_review')}
          </button>
        )}
        {!isLoggedIn && (
          <p style={{ fontSize: '.82rem', color: 'rgba(247,244,236,.35)' }}>{t('review_login_required')}</p>
        )}
      </div>

      {/* Write review form */}
      {showForm && (
        <form onSubmit={handleSubmit} style={{ background: 'rgba(30,27,21,.8)', border: `1px solid ${BORDER}`, borderRadius: 20, padding: '1.5rem', marginBottom: '2rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <h3 style={{ fontSize: '.9rem', fontWeight: 700, color: IVORY }}>{t('write_review')}</h3>
            <button type="button" onClick={() => setShowForm(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(247,244,236,.35)', fontSize: '1.2rem', lineHeight: 1 }}>✕</button>
          </div>

          {/* Rating */}
          <div>
            <label style={{ display: 'block', fontSize: '.65rem', letterSpacing: '.1em', textTransform: 'uppercase', color: 'rgba(247,244,236,.38)', marginBottom: '.6rem' }}>
              {t('your_rating')} *
            </label>
            <StarRating value={form.rating} onChange={v => setForm(f => ({ ...f, rating: v }))} size={28} />
          </div>

          {/* Title (bilingual) */}
          <div>
            <label style={{ display: 'block', fontSize: '.65rem', letterSpacing: '.1em', textTransform: 'uppercase', color: 'rgba(247,244,236,.38)', marginBottom: '.5rem' }}>
              {t('review_title')}
            </label>
            <input
              type="text" value={isAr ? form.titleAr : form.titleEn}
              onChange={e => isAr ? setForm(f => ({ ...f, titleAr: e.target.value })) : setForm(f => ({ ...f, titleEn: e.target.value }))}
              placeholder={isAr ? 'ملخص تجربتك...' : 'Summarize your experience...'}
              dir={isAr ? 'rtl' : 'ltr'}
              style={{ width: '100%', background: 'rgba(255,255,255,.04)', border: `1px solid ${BORDER}`, borderRadius: 12, padding: '.7rem 1rem', fontSize: '.875rem', color: IVORY, outline: 'none', fontFamily: 'inherit', transition: 'border-color 250ms' }}
              onFocus={e => (e.currentTarget.style.borderColor = 'rgba(210,181,106,.5)')}
              onBlur={e => (e.currentTarget.style.borderColor = BORDER)}
            />
          </div>

          {/* Comment */}
          <div>
            <label style={{ display: 'block', fontSize: '.65rem', letterSpacing: '.1em', textTransform: 'uppercase', color: 'rgba(247,244,236,.38)', marginBottom: '.5rem' }}>
              {t('your_comment')} *
            </label>
            <textarea
              value={form.comment}
              onChange={e => setForm(f => ({ ...f, comment: e.target.value }))}
              required rows={4} dir={isAr ? 'rtl' : 'ltr'}
              placeholder={isAr ? 'شارك تجربتك مع المنتج...' : 'Share your experience with this product...'}
              style={{ width: '100%', background: 'rgba(255,255,255,.04)', border: `1px solid ${BORDER}`, borderRadius: 12, padding: '.7rem 1rem', fontSize: '.875rem', color: IVORY, outline: 'none', fontFamily: 'inherit', resize: 'vertical', minHeight: 100, transition: 'border-color 250ms' }}
              onFocus={e => (e.currentTarget.style.borderColor = 'rgba(210,181,106,.5)')}
              onBlur={e => (e.currentTarget.style.borderColor = BORDER)}
            />
          </div>

          <div style={{ display: 'flex', gap: '.75rem' }}>
            <button type="submit" disabled={submitting} className="btn btn-gold btn-sm">
              {submitting ? t('submitting') : t('submit_review')}
            </button>
            <button type="button" onClick={() => setShowForm(false)} className="btn btn-line-dark btn-sm">
              {isAr ? 'إلغاء' : 'Cancel'}
            </button>
          </div>
        </form>
      )}

      {/* Reviews list */}
      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {[1, 2, 3].map(i => (
            <div key={i} style={{ background: 'rgba(30,27,21,.6)', borderRadius: 16, padding: '1.25rem', border: `1px solid ${BORDER}` }}>
              <div className="skeleton" style={{ height: 12, width: '30%', borderRadius: 6, background: 'rgba(255,255,255,.04)', marginBottom: '.75rem' }} />
              <div className="skeleton" style={{ height: 12, width: '80%', borderRadius: 6, background: 'rgba(255,255,255,.04)' }} />
            </div>
          ))}
        </div>
      ) : reviews.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '3rem 0', color: 'rgba(247,244,236,.3)', fontSize: '.9rem' }}>
          {t('no_reviews')}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {reviews.map(review => (
            <div key={review.id} style={{ background: 'rgba(30,27,21,.6)', border: `1px solid ${BORDER}`, borderRadius: 16, padding: '1.25rem' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '1rem', marginBottom: '.75rem' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '.75rem', flexWrap: 'wrap' }}>
                    <span style={{ fontWeight: 700, fontSize: '.875rem', color: IVORY }}>{review.user?.name || (isAr ? 'عميل' : 'Customer')}</span>
                    {review.isVerifiedPurchase && (
                      <span style={{ fontSize: '.62rem', background: 'rgba(74,222,128,.1)', border: '1px solid rgba(74,222,128,.25)', color: '#4ade80', padding: '.15rem .55rem', borderRadius: 999, fontWeight: 600, letterSpacing: '.06em' }}>
                        ✓ {t('verified_purchase')}
                      </span>
                    )}
                  </div>
                  <div style={{ marginTop: '.35rem', display: 'flex', alignItems: 'center', gap: '.5rem' }}>
                    <StarRating value={review.rating} readonly size={13} />
                    <span style={{ fontSize: '.72rem', color: 'rgba(247,244,236,.3)' }}>
                      {new Date(review.createdAt).toLocaleDateString(locale === 'ar' ? 'ar-EG' : 'en-EG')}
                    </span>
                  </div>
                </div>
              </div>

              {(review.titleAr || review.titleEn) && (
                <p style={{ fontWeight: 600, fontSize: '.9rem', color: 'rgba(247,244,236,.75)', marginBottom: '.5rem' }}>
                  {locale === 'ar' ? (review.titleAr || review.titleEn) : (review.titleEn || review.titleAr)}
                </p>
              )}

              <p style={{ fontSize: '.875rem', color: 'rgba(247,244,236,.55)', lineHeight: 1.7 }}>
                {review.comment}
              </p>

              <div style={{ marginTop: '.875rem', display: 'flex', alignItems: 'center', gap: '.5rem' }}>
                <button onClick={() => handleHelpful(review.id)} disabled={markingHelpful === review.id}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '.35rem', background: 'none', border: `1px solid ${BORDER}`, borderRadius: 8, padding: '.3rem .7rem', cursor: 'pointer', color: 'rgba(247,244,236,.35)', fontSize: '.72rem', transition: 'all 200ms ease' }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(210,181,106,.35)'; e.currentTarget.style.color = GOLD; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = BORDER; e.currentTarget.style.color = 'rgba(247,244,236,.35)'; }}>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M14 9V5a3 3 0 00-3-3l-4 9v11h11.28a2 2 0 002-1.7l1.38-9a2 2 0 00-2-2.3H14zM7 22H4a2 2 0 01-2-2v-7a2 2 0 012-2h3"/>
                  </svg>
                  {t('helpful')} {review.helpfulVotes > 0 && `(${review.helpfulVotes})`}
                </button>
              </div>
            </div>
          ))}

          {hasMore && (
            <div style={{ textAlign: 'center', paddingTop: '.5rem' }}>
              <button onClick={loadMore} className="btn btn-line-dark btn-sm">
                {isAr ? 'عرض المزيد' : 'Load More'}
              </button>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
