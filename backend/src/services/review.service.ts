import { reviewRepository } from '../repositories/review.repository';
import { productRepository } from '../repositories/product.repository';
import { prisma } from '../lib/prisma';

// Helper to resolve product ID
const resolveProductId = async (productId: string): Promise<string | null> => {
  const prod = await productRepository.findById(productId, { includeCategory: false, includeImages: false, includeInventory: false });
  if (prod) return prod.id;

  const bySlug = await productRepository.findBySlug(productId);
  if (bySlug) return bySlug.id;

  const bySku = await productRepository.findBySku(productId);
  return bySku ? bySku.id : null;
};

const formatReview = (r: any) => {
  if (!r) return null;
  return {
    ...r,
    _id: r.id,
    user: r.user ? { ...r.user, _id: r.user.id } : r.userId,
    product: r.product ? { ...r.product, _id: r.product.id } : r.productId,
  };
};

// ─── Create review ────────────────────────────────────────────────────────────
export const createReview = async (params: {
  productId: string;
  userId: string;
  rating: number;
  comment: string;
  titleAr?: string;
  titleEn?: string;
}): Promise<any> => {
  const { productId, userId, rating, comment, titleAr, titleEn } = params;

  const resolvedId = await resolveProductId(productId);
  if (!resolvedId) throw new Error('Product not found');

  // Check if user has purchased this product
  const purchasedOrder = await prisma.orderItem.findFirst({
    where: {
      productId: resolvedId,
      order: {
        userId,
      },
    },
    select: { orderId: true },
  });

  const isVerifiedPurchase = !!purchasedOrder;

  // One review per product per user (update if already exists)
  const existing = await reviewRepository.findByProductAndUser(resolvedId, userId);
  if (existing) {
    const updated = await reviewRepository.update(existing.id, {
      rating,
      comment,
      titleAr: titleAr !== undefined ? titleAr : existing.titleAr,
      titleEn: titleEn !== undefined ? titleEn : existing.titleEn,
      isApproved: false,
      isVerifiedPurchase,
    });
    return formatReview(updated);
  }

  const review = await reviewRepository.create({
    productId: resolvedId,
    userId,
    orderId: purchasedOrder?.orderId,
    rating,
    comment,
    titleAr,
    titleEn,
    isVerifiedPurchase,
    isApproved: false,
  });

  return formatReview(review);
};

// ─── Get reviews for a product ────────────────────────────────────────────────
export const getProductReviews = async (
  productId: string,
  page: number = 1,
  limit: number = 10,
  approvedOnly: boolean = true
): Promise<{ reviews: any[]; total: number; avgRating: number; distribution: Record<number, number> }> => {
  const resolvedId = await resolveProductId(productId);
  if (!resolvedId) {
    return {
      reviews: [],
      total: 0,
      avgRating: 0,
      distribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
    };
  }

  const where: any = { productId: resolvedId };
  if (approvedOnly) where.isApproved = true;

  const skip = (page - 1) * limit;

  const [rawReviews, total, stats] = await Promise.all([
    reviewRepository.findMany({
      skip,
      take: limit,
      where,
      orderBy: { createdAt: 'desc' },
    }),
    reviewRepository.count(where),
    reviewRepository.getRatingStats(resolvedId),
  ]);

  return {
    reviews: rawReviews.map(formatReview),
    total,
    avgRating: stats.avgRating,
    distribution: stats.distribution,
  };
};

// ─── Approve / reject review (admin) ─────────────────────────────────────────
export const approveReview = async (reviewId: string, approve: boolean): Promise<any> => {
  const review = await reviewRepository.update(reviewId, { isApproved: approve });
  if (!review) throw new Error('Review not found');

  await syncProductRating(review.productId);
  return formatReview(review);
};

// ─── Delete review ────────────────────────────────────────────────────────────
export const deleteReview = async (reviewId: string, userId: string, isAdmin: boolean): Promise<void> => {
  const review = await reviewRepository.findById(reviewId);
  if (!review) throw new Error('Review not found');
  if (!isAdmin && review.userId !== userId) throw new Error('Access denied');

  await reviewRepository.delete(reviewId);
  await syncProductRating(review.productId);
};

// ─── Vote helpful ─────────────────────────────────────────────────────────────
export const voteHelpful = async (reviewId: string): Promise<void> => {
  await reviewRepository.voteHelpful(reviewId);
};

// ─── Sync product avgRating field ─────────────────────────────────────────────
export const syncProductRating = async (productId: string): Promise<void> => {
  const stats = await reviewRepository.getRatingStats(productId);
  await productRepository.updateRatingStats(productId, stats.avgRating, stats.totalCount);
};

// ─── Get pending reviews (admin) ──────────────────────────────────────────────
export const getPendingReviews = async (page = 1, limit = 20): Promise<{ reviews: any[]; total: number }> => {
  const skip = (page - 1) * limit;
  const where = { isApproved: false };

  const [rawReviews, total] = await Promise.all([
    prisma.review.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: 'asc' },
      include: {
        user: { select: { id: true, firstName: true, lastName: true, email: true } },
        product: { select: { id: true, nameEn: true, nameAr: true, sku: true } },
      },
    }),
    reviewRepository.count(where),
  ]);

  return {
    reviews: rawReviews.map(formatReview),
    total,
  };
};

// ─── Get all reviews with status filter (admin) ──────────────────────────────
export const getAllReviewsAdmin = async (
  filter: 'all' | 'pending' | 'approved' = 'all',
  page = 1,
  limit = 20
): Promise<{ reviews: any[]; total: number; pendingCount: number; approvedCount: number }> => {
  const where: any = {};
  if (filter === 'pending') where.isApproved = false;
  if (filter === 'approved') where.isApproved = true;

  const skip = (page - 1) * limit;

  const [rawReviews, total, pendingCount, approvedCount] = await Promise.all([
    prisma.review.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        user: { select: { id: true, firstName: true, lastName: true, email: true } },
        product: { select: { id: true, nameEn: true, nameAr: true, sku: true } },
      },
    }),
    reviewRepository.count(where),
    reviewRepository.count({ isApproved: false }),
    reviewRepository.count({ isApproved: true }),
  ]);

  return {
    reviews: rawReviews.map(formatReview),
    total,
    pendingCount,
    approvedCount,
  };
};

// ─── Get recent approved reviews across all products (public for home page) ──
export const getRecentApprovedReviews = async (limit = 10): Promise<any[]> => {
  const rawReviews = await prisma.review.findMany({
    where: { isApproved: true },
    take: limit,
    orderBy: { createdAt: 'desc' },
    include: {
      user: { select: { id: true, firstName: true, lastName: true } },
      product: { select: { id: true, nameAr: true, nameEn: true, slugEn: true } },
    },
  });

  return rawReviews.map(formatReview);
};
