import { Router } from 'express';
import {
  listOrders, getOrder, getOrderByNumberHandler, getMyOrders,
  updateStatus, updatePayment, addTracking, getStats, exportOrders,
} from '../controllers/order.controller';
import { authenticate, requireAdmin } from '../middleware/auth.middleware';
import {
  validate,
  updateOrderStatusSchema,
  updatePaymentStatusSchema,
  addTrackingSchema,
} from '../middleware/validation';

const router = Router();

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
 * @route   GET /api/orders/:id
 * @desc    Get single order by ID
 * @access  Private
 */
router.get('/:id', authenticate, getOrder);

/**
 * @route   GET /api/orders/number/:orderNumber
 * @desc    Get order by order number
 * @access  Private
 */
router.get('/number/:orderNumber', authenticate, getOrderByNumberHandler);

/**
 * @route   PUT /api/orders/:id/status
 * @desc    Update order status
 * @access  Private (Admin)
 */
router.put('/:id/status',   authenticate, requireAdmin, validate(updateOrderStatusSchema  as any), updateStatus);
router.put('/:id/payment',  authenticate, requireAdmin, validate(updatePaymentStatusSchema as any), updatePayment);
router.put('/:id/tracking', authenticate, requireAdmin, validate(addTrackingSchema          as any), addTracking);

export default router;
