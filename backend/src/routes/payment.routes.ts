/**
 * payment.routes.ts — Payment Management Routes
 * 
 * All routes require authentication.
 */

import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import {
  createPaymentSessionHandler,
  getPaymentHandler,
  getPaymentsByOrderHandler,
} from '../controllers/payment.controller';

const router = Router();

// All payment routes require authentication
router.use(authenticate);

/**
 * POST /api/payments/create-session
 * Create a Kashier payment session for an order
 */
router.post('/create-session', createPaymentSessionHandler);

/**
 * GET /api/payments/order/:orderId
 * Get all payments for an order
 */
router.get('/order/:orderId', getPaymentsByOrderHandler);

/**
 * GET /api/payments/:id
 * Get payment by ID
 */
router.get('/:id', getPaymentHandler);

export default router;
