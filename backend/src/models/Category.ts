import mongoose, { Document, Schema } from 'mongoose';

// Category interface
export interface ICategory extends Document {
  nameAr: string;
  nameEn: string;
  descriptionAr?: string;
  descriptionEn?: string;
  slugAr: string;
  slugEn: string;
  image?: string;
  icon?: string;
  order: number;
  isActive: boolean;
  productCount: number;
  createdAt: Date;
  updatedAt: Date;
}

// Category schema
const categorySchema = new Schema<ICategory>(
  {
    nameAr: {
      type: String,
      required: [true, 'Arabic name is required'],
      trim: true,
      minlength: [2, 'Arabic name must be at least 2 characters'],
      maxlength: [100, 'Arabic name cannot exceed 100 characters'],
    },
    nameEn: {
      type: String,
      required: [true, 'English name is required'],
      trim: true,
      minlength: [2, 'English name must be at least 2 characters'],
      maxlength: [100, 'English name cannot exceed 100 characters'],
    },
    descriptionAr: {
      type: String,
      trim: true,
      maxlength: [500, 'Description cannot exceed 500 characters'],
    },
    descriptionEn: {
      type: String,
      trim: true,
      maxlength: [500, 'Description cannot exceed 500 characters'],
    },
    slugAr: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    slugEn: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    image: {
      type: String,
      trim: true,
    },
    icon: {
      type: String,
      trim: true,
    },
    order: {
      type: Number,
      default: 0,
      min: 0,
      index: true,
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
    productCount: {
      type: Number,
      default: 0,
      min: 0,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Indexes
categorySchema.index({ isActive: 1, order: 1 });
categorySchema.index({ slugAr: 1, isActive: 1 });
categorySchema.index({ slugEn: 1, isActive: 1 });

// Virtual populate for products
categorySchema.virtual('products', {
  ref: 'Product',
  localField: '_id',
  foreignField: 'category',
  match: { status: 'active' },
});

// Export model
export const Category = mongoose.model<ICategory>('Category', categorySchema);
