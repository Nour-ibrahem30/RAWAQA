import { Router } from 'express';
import { authenticate, requireAdmin } from '../middleware/auth.middleware';
import {
  initiatePayment,
  paymobWebhook,
  refundPayment,
} from '../controllers/payment.controller';

const router = Router();

/**
 * @route  POST /api/payments/initiate
 * @desc   Get Paymob iframe URL + payment key for an order
 * @access Private (order owner)
 * @body   { orderId: string }
 */
router.post('/initiate', authenticate, initiatePayment);

/**
 * @route  POST /api/payments/webhook
 * @desc   Paymob server-to-server callback (HMAC-verified)
 * @access Public (verified by HMAC)
 * @query  hmac=<sha512>
 */
router.post('/webhook', paymobWebhook);

/**
 * @route  POST /api/payments/refund
 * @desc   Issue refund for a paid order
 * @access Admin
 * @body   { orderId: string }
 */
router.post('/refund', authenticate, requireAdmin, refundPayment);

export default router;
