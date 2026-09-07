import { Router } from 'express';
import { authenticate, requireAdmin } from '../middleware/auth.middleware';
import { exportOrders, exportAnalytics } from '../controllers/export.controller';

const router = Router();

// All export routes require authentication + admin role
router.use(authenticate, requireAdmin);

/**
 * GET /api/admin/export/orders
 * Download orders as Excel (.xlsx)
 * Query: ?status=pending&from=2026-01-01&to=2026-12-31&limit=5000
 */
router.get('/orders', exportOrders);

/**
 * GET /api/admin/export/analytics
 * Download full analytics report as Excel (.xlsx)
 * Includes: summary KPIs, top products, revenue chart, recent orders
 */
router.get('/analytics', exportAnalytics);

export default router;
