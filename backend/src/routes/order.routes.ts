import { Router } from 'express';
import { rateLimit } from 'express-rate-limit';
import {
  listOrders, getOrder, getOrderByNumberHandler, getMyOrders,
  updateStatus, updatePayment, addTracking, getStats, exportOrders,
} from '../controllers/order.controller';
import { authenticate, requireAdmin, optionalAuth } from '../middleware/auth.middleware';
import {
  validate,
  updateOrderStatusSchema,
  updatePaymentStatusSchema,
  addTrackingSchema,
} from '../middleware/validation';
import { getRuntimeRateLimitStore, getWorkerRateLimitKeyGenerator } from '../lib/worker-runtime';

const router = Router();

/**
 * SECURITY FIX (HIGH-03): Rate limiter for public order tracking
 * 
 * Limits order tracking lookups to 10 per 15 minutes per IP to prevent:
 * - Order number enumeration attacks
 * - Phone number brute-forcing
 * 
 * Note: This is MORE restrictive than the global limiter because the endpoint
 * exposes a guessable identifier (order number) and we want to prevent enumeration.
 */
const orderTrackingLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // 10 attempts per window per IP
  message: {
    success: false,
    error: 'Too Many Requests',
    message: 'Too many tracking requests. Please try again later.',
  },
  standardHeaders: true,
  legacyHeaders: false,
  store: getRuntimeRateLimitStore(),
  ...(getWorkerRateLimitKeyGenerator() ? { keyGenerator: getWorkerRateLimitKeyGenerator()! } : {}),
});

/**
 * @route   GET /api/orders/my
 * @desc    Get current user's orders
 * @access  Private
 */
router.get('/my', authenticate, getMyOrders);

/**
 * @route   GET /api/orders/stats
 * @desc    Get order statistics
 * @access  Private
 */
router.get('/stats',  authenticate, getStats);

/**
 * @route  GET /api/orders/export
 * @desc   Export orders as CSV (admin)
 * @access Admin
 * @query  startDate, endDate, status, paymentStatus
 */
router.get('/export', authenticate, requireAdmin, exportOrders);

/**
 * @route   GET /api/orders
 * @desc    Get all orders (admin)
 * @access  Private (Admin)
 */
router.get('/', authenticate, requireAdmin, listOrders);

/**
 * @route   GET /api/orders/number/:orderNumber
 * @desc    Get order by order number (authenticated or public tracking)
 * @access  Public / Authenticated
 * @query   phone - Required for unauthenticated tracking (SECURITY FIX HIGH-03)
 */
router.get('/number/:orderNumber', orderTrackingLimiter, optionalAuth, getOrderByNumberHandler);

/**
 * @route   GET /api/orders/:id
 * @desc    Get single order by ID
 * @access  Private
 */
router.get('/:id', authenticate, getOrder);

/**
 * @route   PUT /api/orders/:id/status
 * @desc    Update order status
 * @access  Private (Admin)
 */
router.put('/:id/status',   authenticate, requireAdmin, validate(updateOrderStatusSchema  as any), updateStatus);
router.put('/:id/payment',  authenticate, requireAdmin, validate(updatePaymentStatusSchema as any), updatePayment);
router.put('/:id/tracking', authenticate, requireAdmin, validate(addTrackingSchema          as any), addTracking);

export default router;
