import { Router } from 'express';
import { authenticate, requireAdmin } from '../middleware/auth.middleware';
import { apply, list, getByCode, create, update, remove } from '../controllers/coupon.controller';
import { validate, applyCouponSchema, createCouponSchema } from '../middleware/validation';

const router = Router();

// POST /api/coupons/apply  - authenticated user validates a coupon before checkout
router.post('/apply', authenticate, validate(applyCouponSchema as any), apply);

// Admin routes
router.get( '/',     authenticate, requireAdmin, list);
router.get( '/:code',authenticate, requireAdmin, getByCode);
router.post('/',     authenticate, requireAdmin, validate(createCouponSchema as any), create);
router.put( '/:id',  authenticate, requireAdmin, update);
router.delete('/:id',authenticate, requireAdmin, remove);

export default router;
