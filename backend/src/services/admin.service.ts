import { User, IUser, UserRole } from '../models/User';
import { Order } from '../models/Order';
import { Product } from '../models/Product';
import { RefreshSession } from '../models/RefreshSession';

interface UserFilters {
  role?: UserRole;
  isActive?: boolean;
  search?: string;
}

interface PaginationOptions {
  page: number;
  limit: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

// ─── User Management ─────────────────────────────────────────────────────────

export const listUsers = async (
  filters: UserFilters,
  pagination: PaginationOptions
): Promise<{ users: any[]; total: number }> => {
  const { page, limit, sortBy = 'createdAt', sortOrder = 'desc' } = pagination;
  const skip = (page - 1) * limit;
  const query: any = {};

  if (filters.role) query.role = filters.role;
  if (filters.isActive !== undefined) query.isActive = filters.isActive;
  if (filters.search) {
    query.$or = [
      { firstName: { $regex: filters.search, $options: 'i' } },
      { lastName:  { $regex: filters.search, $options: 'i' } },
      { email:     { $regex: filters.search, $options: 'i' } },
      { phone:     { $regex: filters.search, $options: 'i' } },
    ];
  }

  const [users, total] = await Promise.all([
    User.find(query)
      .sort({ [sortBy]: sortOrder === 'asc' ? 1 : -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    User.countDocuments(query),
  ]);

  return { users, total };
};

export const getUserById = async (userId: string): Promise<IUser | null> => {
  return User.findById(userId);
};

export const promoteUser = async (
  userId: string,
  role: UserRole,
  requesterId: string
): Promise<IUser> => {
  if (userId === requesterId) {
    throw new Error('Cannot change your own role');
  }

  const user = await User.findById(userId);
  if (!user) throw new Error('User not found');
  if (user.role === UserRole.SUPER_ADMIN) {
    throw new Error('Cannot change super admin role');
  }

  user.role = role;
  await user.save();
  return user;
};

export const toggleUserStatus = async (
  userId: string,
  requesterId: string
): Promise<IUser> => {
  if (userId === requesterId) {
    throw new Error('Cannot deactivate your own account');
  }

  const user = await User.findById(userId);
  if (!user) throw new Error('User not found');
  if (user.role === UserRole.SUPER_ADMIN) {
    throw new Error('Cannot deactivate super admin account');
  }

  user.isActive = !user.isActive;
  await user.save();

  // If banning, revoke all sessions
  if (!user.isActive) {
    await RefreshSession.deleteMany({ userId: user._id });
  }

  return user;
};

export const deleteUser = async (
  userId: string,
  requesterId: string
): Promise<void> => {
  if (userId === requesterId) {
    throw new Error('Cannot delete your own account');
  }

  const user = await User.findById(userId);
  if (!user) throw new Error('User not found');
  if (user.role === UserRole.SUPER_ADMIN) {
    throw new Error('Cannot delete super admin account');
  }

  // Soft-delete: just deactivate
  user.isActive = false;
  await user.save();

  // Revoke all sessions
  await RefreshSession.deleteMany({ userId: user._id });
};

// ─── Dashboard Stats ─────────────────────────────────────────────────────────

export const getDashboardStats = async (): Promise<any> => {
  const now = new Date();
  const startOfToday   = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfMonth   = new Date(now.getFullYear(), now.getMonth(), 1);
  const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const endOfLastMonth   = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);

  const [
    totalUsers,
    newUsersToday,
    newUsersThisMonth,
    orderStats,
    orderStatsLastMonth,
    topProducts,
    lowStockCount,
    revenueByDay,
  ] = await Promise.all([
    // Users
    User.countDocuments({ isActive: true }),
    User.countDocuments({ createdAt: { $gte: startOfToday } }),
    User.countDocuments({ createdAt: { $gte: startOfMonth } }),

    // Orders this month
    Order.aggregate([
      { $match: { createdAt: { $gte: startOfMonth } } },
      {
        $group: {
          _id: null,
          totalOrders:    { $sum: 1 },
          totalRevenue:   { $sum: '$total' },
          avgOrderValue:  { $avg: '$total' },
          pendingOrders:  { $sum: { $cond: [{ $eq: ['$status', 'pending'] }, 1, 0] } },
          deliveredOrders:{ $sum: { $cond: [{ $eq: ['$status', 'delivered'] }, 1, 0] } },
          cancelledOrders:{ $sum: { $cond: [{ $eq: ['$status', 'cancelled'] }, 1, 0] } },
        },
      },
    ]),

    // Orders last month (for comparison)
    Order.aggregate([
      { $match: { createdAt: { $gte: startOfLastMonth, $lte: endOfLastMonth } } },
      {
        $group: {
          _id: null,
          totalOrders:  { $sum: 1 },
          totalRevenue: { $sum: '$total' },
        },
      },
    ]),

    // Top 5 selling products
    Order.aggregate([
      { $match: { status: { $in: ['delivered', 'shipped', 'processing'] } } },
      { $unwind: '$items' },
      {
        $group: {
          _id:       '$items.product',
          totalSold: { $sum: '$items.quantity' },
          revenue:   { $sum: '$items.total' },
        },
      },
      { $sort: { totalSold: -1 } },
      { $limit: 5 },
      {
        $lookup: {
          from:         'products',
          localField:   '_id',
          foreignField: '_id',
          as:           'product',
        },
      },
      { $unwind: '$product' },
      {
        $project: {
          productId: '$_id',
          nameEn:    '$product.nameEn',
          nameAr:    '$product.nameAr',
          totalSold: 1,
          revenue:   1,
        },
      },
    ]),

    // Low stock count
    Product.countDocuments({
      status: 'active',
      $expr: {
        $lte: [
          { $subtract: ['$inventory.onHandQuantity', '$inventory.reservedQuantity'] },
          '$inventory.lowStockThreshold',
        ],
      },
    }),

    // Revenue last 7 days
    Order.aggregate([
      {
        $match: {
          createdAt: { $gte: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000) },
          status: { $nin: ['cancelled', 'failed'] },
        },
      },
      {
        $group: {
          _id: {
            $dateToString: { format: '%Y-%m-%d', date: '$createdAt' },
          },
          orders:  { $sum: 1 },
          revenue: { $sum: '$total' },
        },
      },
      { $sort: { _id: 1 } },
    ]),
  ]);

  const current  = orderStats[0]       || { totalOrders: 0, totalRevenue: 0, avgOrderValue: 0, pendingOrders: 0, deliveredOrders: 0, cancelledOrders: 0 };
  const lastMonth= orderStatsLastMonth[0] || { totalOrders: 0, totalRevenue: 0 };

  return {
    users: {
      total:        totalUsers,
      newToday:     newUsersToday,
      newThisMonth: newUsersThisMonth,
    },
    orders: {
      thisMonth:      current.totalOrders,
      lastMonth:      lastMonth.totalOrders,
      growthPercent:  lastMonth.totalOrders > 0
        ? Math.round(((current.totalOrders - lastMonth.totalOrders) / lastMonth.totalOrders) * 100)
        : 0,
      pending:    current.pendingOrders,
      delivered:  current.deliveredOrders,
      cancelled:  current.cancelledOrders,
    },
    revenue: {
      thisMonth:     Math.round(current.totalRevenue * 100) / 100,
      lastMonth:     Math.round(lastMonth.totalRevenue * 100) / 100,
      growthPercent: lastMonth.totalRevenue > 0
        ? Math.round(((current.totalRevenue - lastMonth.totalRevenue) / lastMonth.totalRevenue) * 100)
        : 0,
      avgOrderValue: Math.round((current.avgOrderValue || 0) * 100) / 100,
    },
    products: {
      lowStockCount,
      topSelling: topProducts,
    },
    revenueChart: revenueByDay,
  };
};
