import { Request, Response } from 'express';
import {
  createReview, getProductReviews, approveReview,
  deleteReview, voteHelpful, getPendingReviews,
} from '../services/review.service';
import { logError } from '../config/logger';

// POST /api/products/:productId/reviews
export const addReview = async (req: Request, res: Response): Promise<void> => {
  try {
    const productId = req.params.productId ?? '';
    const review = await createReview({
      productId,
      userId:    req.user!.userId,
      rating:    req.body.rating,
      comment:   req.body.comment,
      titleAr:   req.body.titleAr,
      titleEn:   req.body.titleEn,
    });
    res.status(201).json({ success: true, message: 'Review submitted, pending approval', data: review });
  } catch (err) {
    logError('addReview error', err);
    const msg = err instanceof Error ? err.message : 'Failed to submit review';
    const status = msg.includes('already reviewed') || msg.includes('purchased') ? 400 : 500;
    res.status(status).json({ success: false, message: msg });
  }
};

// GET /api/products/:productId/reviews
export const listReviews = async (req: Request, res: Response): Promise<void> => {
  try {
    const productId = req.params.productId ?? '';
    const page  = parseInt(req.query.page  as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const isAdmin = req.user?.role === 'admin' || req.user?.role === 'super_admin';
    const result = await getProductReviews(productId, page, limit, !isAdmin);
    res.json({
      success: true,
      data: result.reviews,
      meta: { avgRating: result.avgRating, distribution: result.distribution },
      pagination: { page, limit, total: result.total, pages: Math.ceil(result.total / limit) },
    });
  } catch (err) {
    logError('listReviews error', err);
    res.status(500).json({ success: false, message: 'Failed to fetch reviews' });
  }
};

// PUT /api/reviews/:id/approve  (admin)
export const approve = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    if (!id) { res.status(400).json({ success: false, message: 'ID required' }); return; }
    const review = await approveReview(id, req.body.approve !== false);
    res.json({ success: true, message: 'Review updated', data: review });
  } catch (err) {
    logError('approveReview error', err);
    res.status(500).json({ success: false, message: 'Failed to update review' });
  }
};

// DELETE /api/reviews/:id
export const removeReview = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    if (!id) { res.status(400).json({ success: false, message: 'ID required' }); return; }
    const isAdmin = req.user?.role === 'admin' || req.user?.role === 'super_admin';
    await deleteReview(id, req.user!.userId, isAdmin);
    res.json({ success: true, message: 'Review deleted' });
  } catch (err) {
    logError('removeReview error', err);
    const msg = err instanceof Error ? err.message : 'Failed to delete review';
    res.status(msg === 'Access denied' ? 403 : 500).json({ success: false, message: msg });
  }
};

// POST /api/reviews/:id/helpful
export const markHelpful = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    if (!id) { res.status(400).json({ success: false, message: 'ID required' }); return; }
    await voteHelpful(id);
    res.json({ success: true, message: 'Marked as helpful' });
  } catch (err) {
    logError('markHelpful error', err);
    res.status(500).json({ success: false, message: 'Failed to update' });
  }
};

// GET /api/admin/reviews/pending
export const pending = async (req: Request, res: Response): Promise<void> => {
  try {
    const page  = parseInt(req.query.page  as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const result = await getPendingReviews(page, limit);
    res.json({
      success: true,
      data: result.reviews,
      pagination: { page, limit, total: result.total, pages: Math.ceil(result.total / limit) },
    });
  } catch (err) {
    logError('pending reviews error', err);
    res.status(500).json({ success: false, message: 'Failed to fetch pending reviews' });
  }
};
