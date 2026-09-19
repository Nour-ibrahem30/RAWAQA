/**
 * admin.service.ts — PostgreSQL/Prisma implementation
 * All business logic preserved exactly from the Mongoose version.
 */

import { Prisma } from '../generated/prisma/client';
import { userRepository }  from '../repositories/user.repository';
import { orderRepository } from '../repositories/order.repository';
import { prisma }          from '../lib/prisma';

// ─── Interfaces ───────────────────────────────────────────────────────────────
export interface UserFilters {
  role?:       string;
  isActive?:   boolean;
  search?:     string;
}

export interface PaginationOptions {
  page:       number;
  limit:      number;
  sortBy?:    string;
  sortOrder?: 'asc' | 'desc';
}

// ─── listUsers ────────────────────────────────────────────────────────────────
export const listUsers = async (
  filters:    UserFilters,
  pagination: PaginationOptions
): Promise<{ users: any[]; total: number }> => {
  const { page, limit, sortBy = 'createdAt', sortOrder = 'desc' } = pagination;
  const skip = (page - 1) * limit;

  const where: Prisma.UserWhereInput = {};
  if (filters.role)              where.role     = filters.role as any;
  if (filters.isActive !== undefined) where.isActive = filters.isActive;
  if (filters.search) {
    where.OR = [
      { firstName: { contains: filters.search, mode: 'insensitive' } },
      { lastName:  { contains: filters.search, mode: 'insensitive' } },
      { email:     { contains: filters.search, mode: 'insensitive' } },
      { phone:     { contains: filters.search, mode: 'insensitive' } },
    ];
  }

  const validSortFields: Record<string, boolean> = {
    createdAt: true, email: true, firstName: true, lastName: true, role: true,
  };
  const safeSortBy  = validSortFields[sortBy ?? ''] ? sortBy : 'createdAt';
  const safeSortOrd = sortOrder === 'asc' ? 'asc' : 'desc';

  const [users, total] = await Promise.all([
    userRepository.findMany({
      skip,
      take:    limit,
      where,
      orderBy: { [safeSortBy!]: safeSortOrd },
    }),
    userRepository.count(where),
  ]);

  // Normalise to match frontend shape (_id alias + numeric fields)
  const normUsers = users.map((u: any) => ({ ...u, _id: u.id }));

  // Fallback phone: if missing, look it up from the latest order's shipping phone
  const missingPhoneIds = normUsers.filter((u: any) => !u.phone).map((u: any) => u.id);
  if (missingPhoneIds.length > 0) {
    const ordersWithPhone = await prisma.order.findMany({
      where: {
        userId:       { in: missingPhoneIds },
        shippingPhone: { not: '' },
      },
      orderBy: { createdAt: 'desc' },
      select:  { userId: true, shippingPhone: true },
    });

    const phoneMap = new Map<string, string>();
    for (const o of ordersWithPhone) {
      if (!phoneMap.has(o.userId) && o.shippingPhone) {
        phoneMap.set(o.userId, o.shippingPhone);
      }
    }

    for (const u of normUsers) {
      if (!u.phone) {
        const fallback = phoneMap.get(u.id);
        if (fallback) u.phone = fallback;
      }
    }
  }

  return { users: normUsers, total };
};

// ─── getUserById ──────────────────────────────────────────────────────────────
export const getUserById = async (userId: string): Promise<any | null> => {
  const user = await userRepository.findById(userId);
  return user ? { ...user, _id: user.id } : null;
};

// ─── promoteUser ──────────────────────────────────────────────────────────────
export const promoteUser = async (
  userId:      string,
  role:        string,
  requesterId: string
): Promise<any> => {
  if (userId === requesterId) throw new Error('Cannot change your own role');

  const user = await userRepository.findById(userId);
  if (!user) throw new Error('User not found');
  if (user.role === 'super_admin') throw new Error('Cannot change super admin role');

  const updated = await userRepository.update(userId, { role: role as any });
  return { ...updated, _id: updated.id };
};

// ─── toggleUserStatus ─────────────────────────────────────────────────────────
export const toggleUserStatus = async (
  userId:      string,
  requesterId: string
): Promise<any> => {
  if (userId === requesterId) throw new Error('Cannot deactivate your own account');

  const user = await userRepository.findById(userId);
  if (!user) throw new Error('User not found');
  if (user.role === 'super_admin') throw new Error('Cannot deactivate super admin account');

  const updated = await userRepository.update(userId, { isActive: !user.isActive });

  // If banning, revoke all sessions
  if (!updated.isActive) {
    await userRepository.revokeAllUserSessions(userId);
  }

  return { ...updated, _id: updated.id };
};

// ─── deleteUser (soft delete) ─────────────────────────────────────────────────
export const deleteUser = async (
  userId:      string,
  requesterId: string
): Promise<void> => {
  if (userId === requesterId) throw new Error('Cannot delete your own account');

  const user = await userRepository.findById(userId);
  if (!user) throw new Error('User not found');
  if (user.role === 'super_admin') throw new Error('Cannot delete super admin account');

  await userRepository.update(userId, { isActive: false });
  await userRepository.revokeAllUserSessions(userId);
};

// ─── getDashboardStats ────────────────────────────────────────────────────────
// Uses efficient parallel queries — no full-table scans beyond what is needed.
export const getDashboardStats = async (): Promise<any> => {
  const now              = new Date();
  const startOfToday     = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfMonth     = new Date(now.getFullYear(), now.getMonth(), 1);
  const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const endOfLastMonth   = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);
  const last7Days        = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  const [
    totalUsers, newUsersToday, newUsersThisMonth,
    orderStatsThisMonth, orderStatsLastMonth,
    topProducts,
    lowStockCount,
    revenueByDay,
  ] = await Promise.all([
    // User counts
    userRepository.count({ isActive: true }),
    userRepository.count({ createdAt: { gte: startOfToday } }),
    userRepository.count({ createdAt: { gte: startOfMonth } }),

    // Orders this month — aggregate via Prisma groupBy
    prisma.order.aggregate({
      where: { createdAt: { gte: startOfMonth } },
      _count: { id: true },
      _sum:   { total: true },
      _avg:   { total: true },
    }).then(async (agg) => {
      const [pending, delivered, cancelled] = await Promise.all([
        prisma.order.count({ where: { createdAt: { gte: startOfMonth }, status: 'pending' } }),
        prisma.order.count({ where: { createdAt: { gte: startOfMonth }, status: 'delivered' } }),
        prisma.order.count({ where: { createdAt: { gte: startOfMonth }, status: 'cancelled' } }),
      ]);
      return {
        totalOrders:     agg._count.id,
        totalRevenue:    Number(agg._sum.total ?? 0),
        avgOrderValue:   Number(agg._avg.total ?? 0),
        pendingOrders:   pending,
        deliveredOrders: delivered,
        cancelledOrders: cancelled,
      };
    }),

    // Orders last month
    prisma.order.aggregate({
      where: { createdAt: { gte: startOfLastMonth, lte: endOfLastMonth } },
      _count: { id: true },
      _sum:   { total: true },
    }).then(agg => ({
      totalOrders:  agg._count.id,
      totalRevenue: Number(agg._sum.total ?? 0),
    })),

    // Top 5 selling products (uses existing orderRepository method)
    orderRepository.getTopSellingProducts(5),

    // Low stock count via raw SQL (compare availableQty <= lowStockThreshold)
    prisma.$queryRaw<[{ count: bigint }]>`
      SELECT COUNT(*)::int AS count
      FROM inventories i
      JOIN products p ON p.id = i."productId"
      WHERE p.status = 'active'
        AND i."availableQuantity" <= i."lowStockThreshold"
    `.then(rows => Number((rows as any[])[0]?.count ?? 0)),
    // Revenue last 7 days via orderRepository
    orderRepository.getDailyRevenue(last7Days),
  ]);

  return {
    users: {
      total:        totalUsers,
      newToday:     newUsersToday,
      newThisMonth: newUsersThisMonth,
    },
    orders: {
      thisMonth:      orderStatsThisMonth.totalOrders,
      lastMonth:      orderStatsLastMonth.totalOrders,
      growthPercent:  orderStatsLastMonth.totalOrders > 0
        ? Math.round(((orderStatsThisMonth.totalOrders - orderStatsLastMonth.totalOrders) / orderStatsLastMonth.totalOrders) * 100)
        : 0,
      pending:    orderStatsThisMonth.pendingOrders,
      delivered:  orderStatsThisMonth.deliveredOrders,
      cancelled:  orderStatsThisMonth.cancelledOrders,
    },
    revenue: {
      thisMonth:     Math.round(orderStatsThisMonth.totalRevenue * 100) / 100,
      lastMonth:     Math.round(orderStatsLastMonth.totalRevenue * 100) / 100,
      growthPercent: orderStatsLastMonth.totalRevenue > 0
        ? Math.round(((orderStatsThisMonth.totalRevenue - orderStatsLastMonth.totalRevenue) / orderStatsLastMonth.totalRevenue) * 100)
        : 0,
      avgOrderValue: Math.round(orderStatsThisMonth.avgOrderValue * 100) / 100,
    },
    products: {
      lowStockCount,
      topSelling: topProducts,
    },
    revenueChart: revenueByDay,
  };
};
