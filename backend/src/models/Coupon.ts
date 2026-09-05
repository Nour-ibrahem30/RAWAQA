import mongoose, { Document, Schema, Types } from 'mongoose';

export enum CouponType {
  PERCENTAGE = 'percentage',   // e.g. 20% off
  FIXED      = 'fixed',        // e.g. 50 EGP off
}

export interface ICoupon extends Document {
  code:          string;       // e.g. "SAVE20"
  type:          CouponType;
  value:         number;       // 20 (%) or 50 (EGP)
  minOrderValue: number;       // minimum cart total to apply
  maxDiscount:   number;       // cap for percentage coupons (0 = no cap)
  usageLimit:    number;       // 0 = unlimited
  usedCount:     number;
  perUserLimit:  number;       // 0 = unlimited per user
  isActive:      boolean;
  expiresAt?:    Date;
  applicableProducts: Types.ObjectId[];   // empty = all products
  applicableCategories: Types.ObjectId[]; // empty = all categories
  createdBy:     Types.ObjectId;
  createdAt:     Date;
  updatedAt:     Date;
}

const couponSchema = new Schema<ICoupon>(
  {
    code:          { type: String, required: true, unique: true, uppercase: true, trim: true },
    type:          { type: String, enum: Object.values(CouponType), required: true },
    value:         { type: Number, required: true, min: 0 },
    minOrderValue: { type: Number, default: 0, min: 0 },
    maxDiscount:   { type: Number, default: 0, min: 0 },   // 0 = no cap
    usageLimit:    { type: Number, default: 0, min: 0 },   // 0 = unlimited
    usedCount:     { type: Number, default: 0, min: 0 },
    perUserLimit:  { type: Number, default: 1, min: 0 },
    isActive:      { type: Boolean, default: true },
    expiresAt:     { type: Date },
    applicableProducts:   [{ type: Schema.Types.ObjectId, ref: 'Product' }],
    applicableCategories: [{ type: Schema.Types.ObjectId, ref: 'Category' }],
    createdBy:     { type: Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true }
);

couponSchema.index({ isActive: 1, expiresAt: 1 });

export const Coupon = mongoose.model<ICoupon>('Coupon', couponSchema);
