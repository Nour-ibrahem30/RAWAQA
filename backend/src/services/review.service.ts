import mongoose from 'mongoose';
import { Review, IReview } from '../models/Review';
import { Product } from '../models/Product';
import { Order } from '../models/Order';

// ─── Create review ────────────────────────────────────────────────────────────
export const createReview = async (params: {
  productId: string;
  userId:    string;
  rating:    number;
  comment:   string;
  titleAr?:  string;
  titleEn?:  string;
}): Promise<IReview> => {
  const { productId, userId, rating, comment, titleAr, titleEn } = params;

  // 1. Check product exists
  const product = await Product.findById(productId);
  if (!product) throw new Error('Product not found');

  // 2. Verify user has purchased this product (delivered order)
  const order = await Order.findOne({
    userId,
    status: 'delivered',
    'items.product': new mongoose.Types.ObjectId(productId),
  });
  if (!order) throw new Error('You can only review products you have purchased and received');

  // 3. One review per product per user (unique index will also catch it)
  const existing = await Review.findOne({ product: productId, user: userId });
  if (existing) throw new Error('You have already reviewed this product');

  const review = await Review.create({
    product: productId,
    user:    userId,
    order:   order._id,
    rating,
    comment,
    titleAr,
    titleEn,
    isVerifiedPurchase: true,
    isApproved: false,   // pending admin approval
  });

  return review;
};

// ─── Get reviews for a product ────────────────────────────────────────────────
export const getProductReviews = async (
  productId: string,
  page: number = 1,
  limit: number = 10,
  approvedOnly: boolean = true
): Promise<{ reviews: any[]; total: number; avgRating: number; distribution: Record<number, number> }> => {
  const query: any = { product: productId };
  if (approvedOnly) query.isApproved = true;

  const skip = (page - 1) * limit;

  const [reviews, total, stats] = await Promise.all([
    Review.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('user', 'firstName lastName')
      .lean(),
    Review.countDocuments(query),
    Review.aggregate([
      { $match: { product: new mongoose.Types.ObjectId(productId), isApproved: true } },
      {
        $group: {
          _id: null,
          avgRating: { $avg: '$rating' },
          dist1: { $sum: { $cond: [{ $eq: ['$rating', 1] }, 1, 0] } },
          dist2: { $sum: { $cond: [{ $eq: ['$rating', 2] }, 1, 0] } },
          dist3: { $sum: { $cond: [{ $eq: ['$rating', 3] }, 1, 0] } },
          dist4: { $sum: { $cond: [{ $eq: ['$rating', 4] }, 1, 0] } },
          dist5: { $sum: { $cond: [{ $eq: ['$rating', 5] }, 1, 0] } },
        },
      },
    ]),
  ]);

  const s = stats[0] || { avgRating: 0, dist1: 0, dist2: 0, dist3: 0, dist4: 0, dist5: 0 };

  return {
    reviews,
    total,
    avgRating: Math.round((s.avgRating || 0) * 10) / 10,
    distribution: { 1: s.dist1, 2: s.dist2, 3: s.dist3, 4: s.dist4, 5: s.dist5 },
  };
};

// ─── Approve / reject review (admin) ─────────────────────────────────────────
export const approveReview = async (reviewId: string, approve: boolean): Promise<IReview> => {
  const review = await Review.findByIdAndUpdate(
    reviewId,
    { isApproved: approve },
    { new: true }
  );
  if (!review) throw new Error('Review not found');

  // Update product rating cache
  await syncProductRating(review.product.toString());

  return review;
};

// ─── Delete review ────────────────────────────────────────────────────────────
export const deleteReview = async (reviewId: string, userId: string, isAdmin: boolean): Promise<void> => {
  const review = await Review.findById(reviewId);
  if (!review) throw new Error('Review not found');
  if (!isAdmin && review.user.toString() !== userId) throw new Error('Access denied');
  await review.deleteOne();
  await syncProductRating(review.product.toString());
};

// ─── Vote helpful ─────────────────────────────────────────────────────────────
export const voteHelpful = async (reviewId: string): Promise<void> => {
  await Review.findByIdAndUpdate(reviewId, { $inc: { helpfulVotes: 1 } });
};

// ─── Sync product avgRating field ─────────────────────────────────────────────
export const syncProductRating = async (productId: string): Promise<void> => {
  const result = await Review.aggregate([
    { $match: { product: new mongoose.Types.ObjectId(productId), isApproved: true } },
    { $group: { _id: null, avg: { $avg: '$rating' }, count: { $sum: 1 } } },
  ]);

  const avg   = result[0]?.avg   ?? 0;
  const count = result[0]?.count ?? 0;

  await Product.findByIdAndUpdate(productId, {
    'ratings.average': Math.round(avg * 10) / 10,
    'ratings.count':   count,
  });
};

// ─── Get pending reviews (admin) ──────────────────────────────────────────────
export const getPendingReviews = async (page = 1, limit = 20): Promise<{ reviews: any[]; total: number }> => {
  const skip = (page - 1) * limit;
  const [reviews, total] = await Promise.all([
    Review.find({ isApproved: false })
      .sort({ createdAt: 1 })
      .skip(skip)
      .limit(limit)
      .populate('user',    'firstName lastName email')
      .populate('product', 'nameEn nameAr')
      .lean(),
    Review.countDocuments({ isApproved: false }),
  ]);
  return { reviews, total };
};
