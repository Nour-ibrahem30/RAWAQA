'use client';

import { useEffect, useState, useMemo } from 'react';
import { reviewsApi, type Review } from '@/lib/api';
import { useToast } from '@/context/ToastContext';

const CARD  = { background: '#15130F', border: '1px solid rgba(210,181,106,.12)', borderRadius: 16 };
const GOLD  = '#D2B56A';
const IVORY = '#F7F4EC';
const DIM   = 'rgba(247,244,236,.45)';

export default function AdminReviewsPage() {
  const { showToast } = useToast();
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved'>('pending');
  const [search, setSearch] = useState('');
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const fetchReviews = async () => {
    try {
      setLoading(true);
      const res = await reviewsApi.adminAll('all');
      setReviews(res.data || []);
    } catch (err: unknown) {
      showToast((err as Error).message || 'Failed to fetch reviews', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReviews();
  }, []);

  const stats = useMemo(() => {
    const total = reviews.length;
    const pending = reviews.filter(r => !r.isApproved).length;
    const approved = reviews.filter(r => r.isApproved).length;
    return { total, pending, approved };
  }, [reviews]);

  const filteredReviews = useMemo(() => {
    return reviews.filter(r => {
      if (filter === 'pending' && r.isApproved) return false;
      if (filter === 'approved' && !r.isApproved) return false;

      if (!search.trim()) return true;
      const q = search.toLowerCase();
      const userName = (r.user?.name || '').toLowerCase();
      const userEmail = ((r.user as any)?.email || '').toLowerCase();
      const comment = (r.comment || '').toLowerCase();
      const prodName = typeof r.product === 'object' && r.product
        ? `${r.product.nameEn || ''} ${r.product.nameAr || ''}`.toLowerCase()
        : '';

      return userName.includes(q) || userEmail.includes(q) || comment.includes(q) || prodName.includes(q);
    });
  }, [reviews, filter, search]);

  const handleApprove = async (id: string) => {
    setActionLoading(id);
    try {
      await reviewsApi.adminApprove(id);
      showToast('Review approved successfully / تم قبول التقييم بنجاح', 'success');
      setReviews(prev => prev.map(r => ((r.id || (r as any)._id) === id) ? { ...r, isApproved: true } : r));
    } catch (err: unknown) {
      showToast((err as Error).message || 'Failed to approve review', 'error');
    } finally {
      setActionLoading(null);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this review? / هل أنت متأكد من حذف هذا التقييم؟')) {
      return;
    }
    setActionLoading(id);
    try {
      await reviewsApi.adminDelete(id);
      showToast('Review deleted / تم حذف التقييم', 'success');
      setReviews(prev => prev.filter(r => (r.id || (r as any)._id) !== id));
    } catch (err: unknown) {
      showToast((err as Error).message || 'Failed to delete review', 'error');
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <div className="flex flex-col gap-6 max-w-6xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: IVORY, fontFamily: 'var(--font-fraunces, serif)' }}>
            Reviews Management / إدارة التقييمات
          </h1>
          <p className="text-sm mt-1" style={{ color: DIM }}>
            Moderate customer product reviews and ratings
          </p>
        </div>
        <button
          onClick={fetchReviews}
          disabled={loading}
          className="text-xs px-4 py-2 rounded-pill self-start sm:self-auto transition-opacity"
          style={{ border: '1px solid rgba(210,181,106,.25)', color: GOLD }}
        >
          {loading ? 'Refreshing...' : '↻ Refresh / تحديث'}
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div style={CARD} className="p-4 flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: DIM }}>Pending Approval / بانتظار الموافقة</p>
            <p className="text-2xl font-bold mt-1" style={{ color: '#f59e0b' }}>{stats.pending}</p>
          </div>
          <span className="text-2xl">⏳</span>
        </div>
        <div style={CARD} className="p-4 flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: DIM }}>Approved / معتمدة</p>
            <p className="text-2xl font-bold mt-1" style={{ color: '#10b981' }}>{stats.approved}</p>
          </div>
          <span className="text-2xl">✓</span>
        </div>
        <div style={CARD} className="p-4 flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: DIM }}>Total Reviews / الإجمالي</p>
            <p className="text-2xl font-bold mt-1" style={{ color: GOLD }}>{stats.total}</p>
          </div>
          <span className="text-2xl">★</span>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div style={CARD} className="p-4 flex flex-col sm:flex-row gap-4 justify-between items-stretch sm:items-center">
        {/* Tabs */}
        <div className="flex gap-2">
          {(['pending', 'approved', 'all'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setFilter(tab)}
              className="text-xs font-semibold px-4 py-2 rounded-pill transition-all capitalize"
              style={{
                background: filter === tab ? GOLD : 'rgba(255,255,255,.05)',
                color: filter === tab ? '#15130F' : IVORY,
                border: filter === tab ? `1px solid ${GOLD}` : '1px solid rgba(255,255,255,.08)',
              }}
            >
              {tab === 'pending' && `Pending (${stats.pending})`}
              {tab === 'approved' && `Approved (${stats.approved})`}
              {tab === 'all' && `All (${stats.total})`}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative">
          <input
            type="text"
            placeholder="Search review, customer, product..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full sm:w-64 text-xs px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white placeholder-white/30 focus:outline-none focus:border-amber-400/50"
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-white/40 hover:text-white"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* Reviews List */}
      {loading ? (
        <div style={{ ...CARD, color: DIM }} className="p-12 text-center text-sm">
          Loading reviews...
        </div>
      ) : filteredReviews.length === 0 ? (
        <div style={{ ...CARD, color: DIM }} className="p-12 text-center">
          <p className="text-3xl mb-2">★</p>
          <p className="text-sm">No reviews found in this category.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {filteredReviews.map(r => {
            const revId = (r.id || (r as any)._id || '').toString();
            const product = typeof r.product === 'object' && r.product ? r.product : null;
            const productName = product ? (product.nameEn || product.nameAr || 'Product') : 'Product';
            const user = r.user;

            return (
              <div key={revId} style={CARD} className="p-5 flex flex-col gap-3">
                {/* Header row: Product & Status */}
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/5 pb-3">
                  <div className="flex items-center gap-3">
                    <span className="text-xs px-2.5 py-1 rounded-full font-medium" style={{
                      background: r.isApproved ? 'rgba(16,185,129,.15)' : 'rgba(245,158,11,.15)',
                      color: r.isApproved ? '#34d399' : '#fbbf24',
                      border: r.isApproved ? '1px solid rgba(16,185,129,.3)' : '1px solid rgba(245,158,11,.3)',
                    }}>
                      {r.isApproved ? '✓ Approved' : '⏳ Pending Approval'}
                    </span>
                    <span className="text-xs font-semibold" style={{ color: IVORY }}>
                      {productName}
                    </span>
                  </div>
                  <span className="text-xs" style={{ color: DIM }}>
                    {new Date(r.createdAt).toLocaleString()}
                  </span>
                </div>

                {/* Rating & Author */}
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <div className="flex text-amber-400 text-sm">
                      {[1, 2, 3, 4, 5].map(star => (
                        <span key={star}>
                          {star <= r.rating ? '★' : '☆'}
                        </span>
                      ))}
                    </div>
                    <span className="text-xs font-bold" style={{ color: IVORY }}>
                      {r.rating} / 5
                    </span>
                  </div>

                  <div className="flex items-center gap-2 text-xs" style={{ color: DIM }}>
                    <span className="font-semibold" style={{ color: IVORY }}>{user?.name || 'Customer'}</span>
                    {(user as any)?.email && <span>({(user as any).email})</span>}
                    {r.isVerifiedPurchase && (
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-medium">
                        Verified Purchase
                      </span>
                    )}
                  </div>
                </div>

                {/* Comment Content */}
                <div className="bg-black/30 rounded-xl p-3 border border-white/5">
                  {(r.titleEn || r.titleAr) && (
                    <p className="text-xs font-semibold mb-1" style={{ color: IVORY }}>
                      {r.titleEn || r.titleAr}
                    </p>
                  )}
                  <p className="text-xs leading-relaxed" style={{ color: 'rgba(247,244,236,.85)' }}>
                    {r.comment}
                  </p>
                </div>

                {/* Action buttons */}
                <div className="flex items-center justify-end gap-2 pt-1">
                  {!r.isApproved && (
                    <button
                      onClick={() => handleApprove(revId)}
                      disabled={actionLoading === revId}
                      className="text-xs font-semibold px-4 py-1.5 rounded-pill transition-opacity bg-emerald-600 hover:bg-emerald-500 text-white disabled:opacity-50"
                    >
                      {actionLoading === revId ? 'Approving...' : '✓ Approve Review'}
                    </button>
                  )}
                  <button
                    onClick={() => handleDelete(revId)}
                    disabled={actionLoading === revId}
                    className="text-xs font-semibold px-3 py-1.5 rounded-pill transition-opacity text-red-400 hover:text-red-300 hover:bg-red-500/10 disabled:opacity-50"
                    style={{ border: '1px solid rgba(239,68,68,.3)' }}
                  >
                    {actionLoading === revId ? 'Deleting...' : '🗑 Delete'}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
