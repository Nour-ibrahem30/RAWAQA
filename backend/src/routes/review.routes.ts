import { Router } from 'express';
import { authenticate, requireAdmin, optionalAuth } from '../middleware/auth.middleware';
import { addReview, listReviews, approve, removeReview, markHelpful, pending } from '../controllers/review.controller';
import { validate, createReviewSchema } from '../middleware/validation';
import { featureFlag } from '../middleware/feature-flag.middleware';

const router = Router();

// Product-scoped reviews: /api/products/:productId/reviews
// (mounted in product routes)
router.get(  '/:productId/reviews',         featureFlag('FEATURE_REVIEWS'), optionalAuth, listReviews);
router.post( '/:productId/reviews',         featureFlag('FEATURE_REVIEWS'), authenticate, validate(createReviewSchema as any), addReview);

// Review actions: /api/reviews
router.delete('/:id',          authenticate, removeReview);
router.post(  '/:id/helpful',  featureFlag('FEATURE_REVIEWS'), markHelpful);
router.put(   '/:id/approve',  authenticate, requireAdmin, approve);

// Admin pending reviews: /api/admin/reviews/pending
export const adminReviewRoutes = Router();
adminReviewRoutes.get('/pending', authenticate, requireAdmin, pending);

export default router;
