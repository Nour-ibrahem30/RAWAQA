import { Router } from 'express';
import { authenticate, optionalAuth, requireAdmin } from '../middleware/auth.middleware';
import { apply, list, getByCode, create, update, remove } from '../controllers/coupon.controller';
import { validate, applyCouponSchema, createCouponSchema } from '../middleware/validation';

const router = Router();

// POST /api/coupons/apply  - validate a coupon before checkout (logged in or guest)
router.post('/apply', optionalAuth, validate(applyCouponSchema as any), apply);

// Admin routes
router.get( '/',     authenticate, requireAdmin, list);
router.get( '/:code',authenticate, requireAdmin, getByCode);
router.post('/',     authenticate, requireAdmin, validate(createCouponSchema as any), create);
router.put( '/:id',  authenticate, requireAdmin, update);
router.delete('/:id',authenticate, requireAdmin, remove);

export default router;
