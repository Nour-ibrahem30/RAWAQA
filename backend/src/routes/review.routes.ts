import { Router } from 'express';
import { authenticate, requireAdmin, optionalAuth } from '../middleware/auth.middleware';
import { addReview, listReviews, approve, removeReview, markHelpful, pending } from '../controllers/review.controller';
import { validate, createReviewSchema } from '../middleware/validation';

const router = Router();

// Product-scoped reviews: /api/products/:productId/reviews
// (mounted in product routes)
router.get(  '/:productId/reviews',         optionalAuth, listReviews);
router.post( '/:productId/reviews',         authenticate, validate(createReviewSchema as any), addReview);

// Review actions: /api/reviews
router.delete('/:id',          authenticate, removeReview);
router.post(  '/:id/helpful',  markHelpful);
router.put(   '/:id/approve',  authenticate, requireAdmin, approve);

// Admin pending reviews: /api/admin/reviews/pending
export const adminReviewRoutes = Router();
adminReviewRoutes.get('/pending', authenticate, requireAdmin, pending);

export default router;
