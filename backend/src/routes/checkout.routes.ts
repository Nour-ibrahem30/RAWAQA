import { Router } from 'express';
import { checkout, cancel, confirmDeliveryHandler } from '../controllers/checkout.controller';
import { authenticate, requireAdmin } from '../middleware/auth.middleware';
import { validate, checkoutSchema, cancelOrderSchema } from '../middleware/validation';

const router = Router();

/**
 * @route   POST /api/checkout
 * @desc    Process checkout and create order
 * @access  Private
 */
router.post('/', authenticate, validate(checkoutSchema as any), checkout);

/**
 * @route   POST /api/checkout/cancel/:orderId
 * @desc    Cancel order and release inventory
 * @access  Private (Admin or Order Owner)
 */
router.post('/cancel/:orderId', authenticate, validate(cancelOrderSchema as any), cancel);

/**
 * @route   POST /api/checkout/confirm-delivery/:orderId
 * @desc    Confirm delivery and deduct inventory
 * @access  Private (Admin)
 */
router.post('/confirm-delivery/:orderId', authenticate, requireAdmin, confirmDeliveryHandler);

export default router;
