import { Router } from 'express';
import { authenticate, optionalAuth } from '../middleware/auth.middleware';
import { featureFlag } from '../middleware/feature-flag.middleware';
import { get, add, remove, toggle, check, clear } from '../controllers/wishlist.controller';

const router = Router();

router.use(featureFlag('FEATURE_WISHLIST'));

// Check is accessible for guests (returns inWishlist: false) and authenticated users
router.get('/:productId/check', optionalAuth, check);

// The following routes require authentication
router.use(authenticate);

router.get(   '/',                    get);     // GET    /api/wishlist
router.delete('/',                    clear);   // DELETE /api/wishlist
router.post(  '/:productId',          add);     // POST   /api/wishlist/:id
router.delete('/:productId',          remove);  // DELETE /api/wishlist/:id
router.post(  '/:productId/toggle',   toggle);  // POST   /api/wishlist/:id/toggle

export default router;
