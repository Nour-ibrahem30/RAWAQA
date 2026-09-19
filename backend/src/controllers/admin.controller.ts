import { Request, Response } from 'express';
import {
  listUsers,
  getUserById,
  promoteUser,
  toggleUserStatus,
  deleteUser,
  getDashboardStats,
} from '../services/admin.service';
import { logError }          from '../config/logger';
import { UserRole }          from '../generated/prisma/client';
import { contentRepository } from '../repositories/content.repository';
import { outboxRepository }  from '../repositories/outbox.repository';

// GET /api/admin/users
export const getUsers = async (req: Request, res: Response): Promise<void> => {
  try {
    const page   = parseInt(req.query.page  as string) || 1;
    const limit  = parseInt(req.query.limit as string) || 20;
    const role   = req.query.role   as UserRole | undefined;
    const search = req.query.search as string | undefined;
    const isActive =
      req.query.isActive !== undefined
        ? req.query.isActive === 'true'
        : undefined;

    const { users, total } = await listUsers(
      { role, isActive, search },
      { page, limit }
    );

    res.json({
      success: true,
      data: users,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    });
  } catch (err) {
    logError('getUsers error', err);
    res.status(500).json({ success: false, message: 'Failed to fetch users' });
  }
};

// GET /api/admin/users/:id
export const getUser = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    if (!id) { res.status(400).json({ success: false, message: 'ID required' }); return; }
    const user = await getUserById(id);
    if (!user) {
      res.status(404).json({ success: false, message: 'User not found' });
      return;
    }
    res.json({ success: true, data: user });
  } catch (err) {
    logError('getUser error', err);
    res.status(500).json({ success: false, message: 'Failed to fetch user' });
  }
};

// PUT /api/admin/users/:id/role
export const changeRole = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    if (!id) { res.status(400).json({ success: false, message: 'ID required' }); return; }
    const { role } = req.body;
    if (!role || !Object.values(UserRole).includes(role)) {
      res.status(400).json({ success: false, message: 'Valid role is required' });
      return;
    }
    // Only super_admin can grant super_admin
    if (role === UserRole.super_admin && req.user?.role !== UserRole.super_admin) {
      res.status(403).json({ success: false, message: 'Only super admin can grant super admin role' });
      return;
    }
    const user = await promoteUser(id, role, req.user!.userId);
    res.json({ success: true, message: `User role updated to ${role}`, data: user });
  } catch (err) {
    logError('changeRole error', err);
    const msg = err instanceof Error ? err.message : 'Failed to update role';
    res.status(400).json({ success: false, message: msg });
  }
};

// PUT /api/admin/users/:id/toggle-status
export const toggleStatus = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    if (!id) { res.status(400).json({ success: false, message: 'ID required' }); return; }
    const user = await toggleUserStatus(id, req.user!.userId);
    res.json({
      success: true,
      message: user.isActive ? 'User activated' : 'User banned',
      data: { id: (user as any).id ?? (user as any)._id, isActive: user.isActive },
    });
  } catch (err) {
    logError('toggleStatus error', err);
    const msg = err instanceof Error ? err.message : 'Failed to toggle status';
    res.status(400).json({ success: false, message: msg });
  }
};

// DELETE /api/admin/users/:id
export const removeUser = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    if (!id) { res.status(400).json({ success: false, message: 'ID required' }); return; }
    await deleteUser(id, req.user!.userId);
    res.json({ success: true, message: 'User deactivated successfully' });
  } catch (err) {
    logError('removeUser error', err);
    const msg = err instanceof Error ? err.message : 'Failed to delete user';
    res.status(400).json({ success: false, message: msg });
  }
};

// GET /api/admin/stats
export const dashboardStats = async (_req: Request, res: Response): Promise<void> => {
  try {
    const stats = await getDashboardStats();
    res.json({ success: true, data: stats });
  } catch (err) {
    logError('dashboardStats error', err);
    res.status(500).json({ success: false, message: 'Failed to fetch stats' });
  }
};

// GET /api/admin/settings
export const getSettings = async (_req: Request, res: Response): Promise<void> => {
  try {
    const settings = await contentRepository.getSiteSettings();
    res.json({ success: true, data: settings.colors ?? {} });
  } catch (err) {
    logError('getSettings error', err);
    res.status(500).json({ success: false, message: 'Failed to fetch settings' });
  }
};

// PUT /api/admin/settings
export const updateSettings = async (req: Request, res: Response): Promise<void> => {
  try {
    const { colors } = req.body;
    if (!colors || typeof colors !== 'object') {
      res.status(400).json({ success: false, message: 'colors object is required' });
      return;
    }
    const settings = await contentRepository.updateSiteSettings({
      colors,
      updatedBy: req.user?.userId,
    });
    res.json({ success: true, data: settings.colors });
  } catch (err) {
    logError('updateSettings error', err);
    res.status(500).json({ success: false, message: 'Failed to update settings' });
  }
};

// GET /api/admin/reconciliation-reports
export const getReconciliationReports = async (req: Request, res: Response): Promise<void> => {
  try {
    const page  = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;

    const reports = await outboxRepository.findRecentReports(limit);
    res.json({
      success: true,
      data:       reports,
      pagination: { page, limit, total: reports.length, pages: 1 },
    });
  } catch (err) {
    logError('getReconciliationReports error', err);
    res.status(500).json({ success: false, message: 'Failed to fetch reports' });
  }
};
