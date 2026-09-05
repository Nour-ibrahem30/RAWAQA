import { Coupon, ICoupon, CouponType } from '../models/Coupon';
import { CouponUsage } from '../models/CouponUsage';
import mongoose from 'mongoose';

// ─── Validate & calculate discount ───────────────────────────────────────────
export const applyCoupon = async (params: {
  code:       string;
  userId:     string;
  cartTotal:  number;
  productIds?: string[];
}): Promise<{ coupon: ICoupon; discountAmount: number; finalTotal: number }> => {
  const { code, userId, cartTotal, productIds = [] } = params;

  // 1. Find coupon
  const coupon = await Coupon.findOne({ code: code.toUpperCase().trim() });
  if (!coupon)          throw new Error('Coupon not found');
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
  if (coupon.perUserLimit > 0) {
    const userUsage = await CouponUsage.countDocuments({
      coupon: coupon._id,
      user:   new mongoose.Types.ObjectId(userId),
    });
    if (userUsage >= coupon.perUserLimit) {
      throw new Error('You have already used this coupon');
    }
  }

  // 5. Check minimum order value
  if (cartTotal < coupon.minOrderValue) {
    throw new Error(
      `Minimum order value for this coupon is ${coupon.minOrderValue} EGP`
    );
  }

  // 6. Check product/category restrictions (if any)
  if (coupon.applicableProducts.length > 0 && productIds.length > 0) {
    const allowed = coupon.applicableProducts.map((id) => id.toString());
    const valid   = productIds.some((id) => allowed.includes(id));
    if (!valid) throw new Error('Coupon is not applicable to items in your cart');
  }

  // 7. Calculate discount
  let discountAmount: number;
  if (coupon.type === CouponType.PERCENTAGE) {
    discountAmount = (cartTotal * coupon.value) / 100;
    // Apply cap if set
    if (coupon.maxDiscount > 0) {
      discountAmount = Math.min(discountAmount, coupon.maxDiscount);
    }
  } else {
    discountAmount = coupon.value;
  }

  // Discount can't exceed cart total
  discountAmount = Math.min(discountAmount, cartTotal);
  discountAmount = Math.round(discountAmount * 100) / 100;

  return {
    coupon,
    discountAmount,
    finalTotal: Math.round((cartTotal - discountAmount) * 100) / 100,
  };
};

// ─── Record coupon usage (called after order is created) ─────────────────────
export const recordCouponUsage = async (params: {
  couponId:  string;
  userId:    string;
  orderId:   string;
  discount:  number;
}): Promise<void> => {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    await CouponUsage.create(
      [{ coupon: params.couponId, user: params.userId, order: params.orderId, discount: params.discount }],
      { session }
    );
    await Coupon.findByIdAndUpdate(params.couponId, { $inc: { usedCount: 1 } }, { session });
    await session.commitTransaction();
  } catch (err) {
    await session.abortTransaction();
    throw err;
  } finally {
    session.endSession();
  }
};

// ─── Admin CRUD ───────────────────────────────────────────────────────────────
export const createCoupon = async (data: any, adminId: string): Promise<ICoupon> => {
  return Coupon.create({ ...data, createdBy: adminId });
};

export const listCoupons = async (
  page = 1, limit = 20, isActive?: boolean
): Promise<{ coupons: any[]; total: number }> => {
  const query: any = {};
  if (isActive !== undefined) query.isActive = isActive;
  const skip = (page - 1) * limit;
  const [coupons, total] = await Promise.all([
    Coupon.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
    Coupon.countDocuments(query),
  ]);
  return { coupons, total };
};

export const getCouponByCode = async (code: string): Promise<ICoupon | null> => {
  return Coupon.findOne({ code: code.toUpperCase() });
};

export const updateCoupon = async (id: string, data: Partial<ICoupon>): Promise<ICoupon> => {
  const coupon = await Coupon.findByIdAndUpdate(id, data, { new: true, runValidators: true });
  if (!coupon) throw new Error('Coupon not found');
  return coupon;
};

export const deleteCoupon = async (id: string): Promise<void> => {
  const coupon = await Coupon.findByIdAndUpdate(id, { isActive: false });
  if (!coupon) throw new Error('Coupon not found');
};
