import mongoose, { Document, Schema } from 'mongoose';

export type AdPlacement = 'homepage_banner' | 'homepage_mid' | 'shop_sidebar' | 'product_page';

export interface IAd extends Document {
  titleAr:     string;
  titleEn:     string;
  subtitleAr?: string;
  subtitleEn?: string;
  imageUrl:    string;
  publicId?:   string;      // Cloudinary public_id
  linkUrl?:    string;      // Where to navigate on click
  placement:   AdPlacement;
  isActive:    boolean;
  order:       number;      // display order (lower = first)
  startDate?:  Date;
  endDate?:    Date;
  createdAt:   Date;
  updatedAt:   Date;
}

const adSchema = new Schema<IAd>(
  {
    titleAr:    { type: String, required: true, trim: true, maxlength: 120 },
    titleEn:    { type: String, required: true, trim: true, maxlength: 120 },
    subtitleAr: { type: String, trim: true, maxlength: 200 },
    subtitleEn: { type: String, trim: true, maxlength: 200 },
    imageUrl:   { type: String, required: true },
    publicId:   { type: String },
    linkUrl:    { type: String, trim: true },
    placement:  {
      type:    String,
      enum:    ['homepage_banner', 'homepage_mid', 'shop_sidebar', 'product_page'],
      default: 'homepage_banner',
      index:   true,
    },
    isActive: { type: Boolean, default: true, index: true },
    order:    { type: Number, default: 0 },
    startDate: { type: Date },
    endDate:   { type: Date },
  },
  { timestamps: true }
);

adSchema.index({ placement: 1, isActive: 1, order: 1 });

export const Ad = mongoose.model<IAd>('Ad', adSchema);
