import mongoose, { Document, Schema, Types } from 'mongoose';

/**
 * Tracks which user used which coupon on which order.
 * Enables per-user usage limit enforcement.
 */
export interface ICouponUsage extends Document {
  coupon:  Types.ObjectId;
  user:    Types.ObjectId;
  order:   Types.ObjectId;
  discount: number;   // actual discount amount applied
  createdAt: Date;
}

const couponUsageSchema = new Schema<ICouponUsage>(
  {
    coupon:   { type: Schema.Types.ObjectId, ref: 'Coupon', required: true },
    user:     { type: Schema.Types.ObjectId, ref: 'User',   required: true },
    order:    { type: Schema.Types.ObjectId, ref: 'Order',  required: true },
    discount: { type: Number, required: true, min: 0 },
  },
  { timestamps: true }
);

couponUsageSchema.index({ coupon: 1, user: 1 });
couponUsageSchema.index({ order: 1 }, { unique: true }); // one coupon per order

export const CouponUsage = mongoose.model<ICouponUsage>('CouponUsage', couponUsageSchema);
