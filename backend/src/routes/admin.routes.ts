import { Router } from 'express';
import { authenticate, requireAdmin, requireSuperAdmin } from '../middleware/auth.middleware';
import {
  getUsers,
  getUser,
  changeRole,
  toggleStatus,
  removeUser,
  dashboardStats,
  getSettings,
  updateSettings,
  getReconciliationReports,
} from '../controllers/admin.controller';
import { exportOrders } from '../controllers/order.controller';

const router = Router();

// All admin routes require authentication + admin role
router.use(authenticate, requireAdmin);

/**
 * @route  GET /api/admin/stats
 * @desc   Dashboard statistics (revenue, orders, users, top products)
 * @access Admin
 */
router.get('/stats', dashboardStats);

/**
 * @route  GET /api/admin/users & /api/admin/customers
 * @desc   List all users/customers with filters & pagination
 * @access Admin
 */
router.get('/users', getUsers);
router.get('/customers', getUsers);

/**
 * @route  GET /api/admin/users/:id & /api/admin/customers/:id
 * @desc   Get single user/customer by ID
 * @access Admin
 */
router.get('/users/:id', getUser);
router.get('/customers/:id', getUser);

/**
 * @route  PUT /api/admin/users/:id/role & /api/admin/customers/:id/role
 * @desc   Change user role (promote/demote)
 * @access Super Admin
 */
router.put('/users/:id/role', requireSuperAdmin, changeRole);
router.put('/customers/:id/role', requireSuperAdmin, changeRole);

/**
 * @route  PUT /api/admin/users/:id/toggle-status & /api/admin/customers/:id/toggle-status
 * @desc   Ban / Unban a user
 * @access Admin
 */
router.put('/users/:id/toggle-status', toggleStatus);
router.put('/customers/:id/toggle-status', toggleStatus);
router.put('/customers/:id/ban', toggleStatus);

/**
 * @route  DELETE /api/admin/users/:id & /api/admin/customers/:id
 * @desc   Soft-delete (deactivate) a user
 * @access Super Admin
 */
router.delete('/users/:id', requireSuperAdmin, removeUser);
router.delete('/customers/:id', requireSuperAdmin, removeUser);

/**
 * @route  GET /api/admin/settings
 * @desc   Get site settings (colors, etc.)
 * @access Admin
 */
router.get('/settings', getSettings);

/**
 * @route  PUT /api/admin/settings
 * @desc   Update site settings
 * @access Admin
 */
router.put('/settings', updateSettings);

/**
 * @route  GET /api/admin/reconciliation-reports
 * @desc   List inventory reconciliation reports
 * @access Admin
 */
router.get('/reconciliation-reports', getReconciliationReports);

/**
 * @route  GET /api/admin/export/orders
 * @desc   Export orders CSV
 * @access Admin
 */
router.get('/export/orders', exportOrders);

export default router;

