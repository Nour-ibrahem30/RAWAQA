import { couponRepository } from '../repositories/coupon.repository';
import { CouponType } from '../generated/prisma/client';

const formatCoupon = (c: any) => {
  if (!c) return null;
  return {
    ...c,
    _id: c.id,
    value: Number(c.value),
    minOrderValue: Number(c.minOrderValue),
    maxDiscount: Number(c.maxDiscount),
  };
};

// ─── Validate & calculate discount ───────────────────────────────────────────
export const applyCoupon = async (params: {
  code: string;
  userId?: string;
  cartTotal: number;
  productIds?: string[];
}): Promise<{ coupon: any; discountAmount: number; finalTotal: number }> => {
  const { code, userId, cartTotal, productIds = [] } = params;

  // 1. Find coupon
  const coupon = await couponRepository.findByCode(code);
  if (!coupon) throw new Error('Coupon not found');
  if (!coupon.isActive) throw new Error('Coupon is not active');

  // 2. Check expiry
  if (coupon.expiresAt && new Date() > coupon.expiresAt) {
    throw new Error('Coupon has expired');
  }

  // 3. Check global usage limit
  if (coupon.usageLimit > 0 && coupon.usedCount >= coupon.usageLimit) {
    throw new Error('Coupon usage limit reached');
  }

  // 4. Check per-user limit
  if (coupon.perUserLimit > 0 && userId) {
    const userUsage = await couponRepository.getUserUsageCount(coupon.id, userId);
    if (userUsage >= coupon.perUserLimit) {
      throw new Error('You have already used this coupon');
    }
  }

  const minOrderValue = Number(coupon.minOrderValue);
  // 5. Check minimum order value
  if (cartTotal < minOrderValue) {
    throw new Error(
      `Minimum order value for this coupon is ${minOrderValue} EGP`
    );
  }

  // 6. Check product restrictions (if any)
  if (coupon.applicableProducts && coupon.applicableProducts.length > 0 && productIds.length > 0) {
    const allowed = coupon.applicableProducts.map((p) => p.id);
    const valid = productIds.some((id) => allowed.includes(id));
    if (!valid) throw new Error('Coupon is not applicable to items in your cart');
  }

  // 7. Calculate discount
  const val = Number(coupon.value);
  const maxDisc = Number(coupon.maxDiscount);
  let discountAmount: number;

  if (coupon.type === CouponType.percentage) {
    discountAmount = (cartTotal * val) / 100;
    if (maxDisc > 0) {
      discountAmount = Math.min(discountAmount, maxDisc);
    }
  } else {
    discountAmount = val;
  }

  discountAmount = Math.min(discountAmount, cartTotal);
  discountAmount = Math.round(discountAmount * 100) / 100;

  return {
    coupon: formatCoupon(coupon),
    discountAmount,
    finalTotal: Math.round((cartTotal - discountAmount) * 100) / 100,
  };
};

// ─── Record coupon usage (called after order is created) ─────────────────────
export const recordCouponUsage = async (params: {
  couponId: string;
  userId: string;
  orderId: string;
  discount: number;
}): Promise<void> => {
  await couponRepository.recordUsage({
    couponId: params.couponId,
    userId: params.userId,
    orderId: params.orderId,
    discount: params.discount,
  });
};

// ─── Admin CRUD ───────────────────────────────────────────────────────────────
export const createCoupon = async (data: any, adminId: string): Promise<any> => {
  const created = await couponRepository.create({
    code: data.code,
    type: data.type === 'percentage' ? CouponType.percentage : CouponType.fixed,
    value: data.value,
    minOrderValue: data.minOrderValue || 0,
    maxDiscount: data.maxDiscount || 0,
    usageLimit: data.usageLimit || 0,
    perUserLimit: data.perUserLimit !== undefined ? data.perUserLimit : 1,
    isActive: data.isActive !== undefined ? data.isActive : true,
    expiresAt: data.expiresAt ? new Date(data.expiresAt) : undefined,
    createdById: adminId,
    applicableProductIds: data.applicableProducts,
    applicableCategoryIds: data.applicableCategories,
  });
  return formatCoupon(created);
};

export const listCoupons = async (
  page = 1,
  limit = 20,
  isActive?: boolean
): Promise<{ coupons: any[]; total: number }> => {
  const where: any = {};
  if (isActive !== undefined) where.isActive = isActive;
  const skip = (page - 1) * limit;

  const [coupons, total] = await Promise.all([
    couponRepository.findMany({
      skip,
      take: limit,
      where,
      orderBy: { createdAt: 'desc' },
    }),
    couponRepository.count(where),
  ]);

  return {
    coupons: coupons.map(formatCoupon),
    total,
  };
};

export const getCouponByCode = async (code: string): Promise<any | null> => {
  const coupon = await couponRepository.findByCode(code);
  return formatCoupon(coupon);
};

export const updateCoupon = async (id: string, data: any): Promise<any> => {
  const updated = await couponRepository.update(id, data);
  return formatCoupon(updated);
};

export const deleteCoupon = async (id: string): Promise<void> => {
  await couponRepository.update(id, { isActive: false });
};
