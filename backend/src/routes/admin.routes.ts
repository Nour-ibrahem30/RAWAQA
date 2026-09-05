import { Router } from 'express';
import { authenticate, requireAdmin, requireSuperAdmin } from '../middleware/auth.middleware';
import {
  getUsers,
  getUser,
  changeRole,
  toggleStatus,
  removeUser,
  dashboardStats,
} from '../controllers/admin.controller';

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
 * @route  GET /api/admin/users
 * @desc   List all users with filters & pagination
 * @access Admin
 * @query  page, limit, role, isActive, search
 */
router.get('/users', getUsers);

/**
 * @route  GET /api/admin/users/:id
 * @desc   Get single user by ID
 * @access Admin
 */
router.get('/users/:id', getUser);

/**
 * @route  PUT /api/admin/users/:id/role
 * @desc   Change user role (promote/demote)
 * @access Super Admin
 * @body   { role: 'customer' | 'admin' | 'super_admin' }
 */
router.put('/users/:id/role', requireSuperAdmin, changeRole);

/**
 * @route  PUT /api/admin/users/:id/toggle-status
 * @desc   Ban / Unban a user
 * @access Admin
 */
router.put('/users/:id/toggle-status', toggleStatus);

/**
 * @route  DELETE /api/admin/users/:id
 * @desc   Soft-delete (deactivate) a user
 * @access Super Admin
 */
router.delete('/users/:id', requireSuperAdmin, removeUser);

export default router;
