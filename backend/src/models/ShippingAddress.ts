import mongoose, { Document, Schema, Types } from 'mongoose';

export interface IShippingAddress extends Document {
  user:          Types.ObjectId;
  label:         string;        // 'Home', 'Work', 'البيت', etc.
  recipientName: string;
  phone:         string;
  streetAddress: string;
  city:          string;
  governorate:   string;
  postalCode?:   string;
  isDefault:     boolean;
  createdAt:     Date;
  updatedAt:     Date;
}

const shippingAddressSchema = new Schema<IShippingAddress>(
  {
    user:          { type: Schema.Types.ObjectId, ref: 'User', required: true },
    label:         { type: String, default: 'Home', maxlength: 50, trim: true },
    recipientName: { type: String, required: true, maxlength: 100, trim: true },
    phone:         { type: String, required: true, trim: true },
    streetAddress: { type: String, required: true, maxlength: 200, trim: true },
    city:          { type: String, required: true, maxlength: 100, trim: true },
    governorate:   { type: String, required: true, maxlength: 100, trim: true },
    postalCode:    { type: String, maxlength: 10, trim: true },
    isDefault:     { type: Boolean, default: false },
  },
  { timestamps: true }
);

shippingAddressSchema.index({ user: 1, createdAt: -1 });
shippingAddressSchema.index({ user: 1, isDefault: 1 });

export const ShippingAddress = mongoose.model<IShippingAddress>(
  'ShippingAddress',
  shippingAddressSchema
);
