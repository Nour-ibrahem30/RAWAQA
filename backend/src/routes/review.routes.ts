import { Router } from 'express';
import { rateLimit } from 'express-rate-limit';
import { authenticate, requireAdmin, optionalAuth } from '../middleware/auth.middleware';
import {
  addReview, listReviews, approve, removeReview, markHelpful, pending, listAllAdminReviews
} from '../controllers/review.controller';
import { validate, createReviewSchema } from '../middleware/validation';
import { featureFlag } from '../middleware/feature-flag.middleware';
import { getRuntimeRateLimitStore, getWorkerRateLimitKeyGenerator } from '../lib/worker-runtime';

const router = Router();

// =============================================================================
// HELPFUL VOTE RATE LIMITER (Abuse Prevention)
// =============================================================================
// Limits helpful votes to 10 per IP per 15 minutes to prevent vote manipulation.
// This is a targeted rate limiter for the unauthenticated helpful vote endpoint.
const helpfulVoteLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // 10 votes per window per IP
  message: {
    success: false,
    error: 'Too Many Requests',
    message: 'Too many helpful votes from this IP. Please try again later.',
  },
  standardHeaders: true,
  legacyHeaders: false,
  store: getRuntimeRateLimitStore(),
  ...(getWorkerRateLimitKeyGenerator() ? { keyGenerator: getWorkerRateLimitKeyGenerator()! } : {}),
});

// Product-scoped reviews: /api/products/:productId/reviews
// (mounted in product routes)
router.get(  '/:productId/reviews',         featureFlag('FEATURE_REVIEWS'), optionalAuth, listReviews);
router.post( '/:productId/reviews',         featureFlag('FEATURE_REVIEWS'), authenticate, validate(createReviewSchema as any), addReview);

// Review actions: /api/reviews
router.delete('/:id',          authenticate, removeReview);
router.post(  '/:id/helpful',  featureFlag('FEATURE_REVIEWS'), helpfulVoteLimiter, markHelpful);
router.put(   '/:id/approve',  authenticate, requireAdmin, approve);

// Admin review routes: /api/admin/reviews
export const adminReviewRoutes = Router();
adminReviewRoutes.get('/',        authenticate, requireAdmin, listAllAdminReviews);
adminReviewRoutes.get('/pending', authenticate, requireAdmin, pending);

export default router;
