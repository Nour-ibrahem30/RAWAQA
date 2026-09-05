import mongoose, { Document, Schema, Types } from 'mongoose';

export interface IReview extends Document {
  product:   Types.ObjectId;
  user:      Types.ObjectId;
  order:     Types.ObjectId;   // must have purchased the product
  rating:    number;           // 1-5
  titleAr?:  string;
  titleEn?:  string;
  comment:   string;
  isVerifiedPurchase: boolean;
  isApproved: boolean;
  helpfulVotes: number;
  createdAt: Date;
  updatedAt: Date;
}

const reviewSchema = new Schema<IReview>(
  {
    product: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
    user:    { type: Schema.Types.ObjectId, ref: 'User',    required: true },
    order:   { type: Schema.Types.ObjectId, ref: 'Order',   required: true },
    rating:  { type: Number, required: true, min: 1, max: 5 },
    titleAr: { type: String, maxlength: 100, trim: true },
    titleEn: { type: String, maxlength: 100, trim: true },
    comment: { type: String, required: true, minlength: 10, maxlength: 1000, trim: true },
    isVerifiedPurchase: { type: Boolean, default: true },
    isApproved:         { type: Boolean, default: false },  // admin must approve
    helpfulVotes:       { type: Number, default: 0, min: 0 },
  },
  { timestamps: true }
);

// One review per user per product
reviewSchema.index({ product: 1, user: 1 }, { unique: true });
reviewSchema.index({ product: 1, isApproved: 1, createdAt: -1 });
reviewSchema.index({ user: 1, createdAt: -1 });

export const Review = mongoose.model<IReview>('Review', reviewSchema);
