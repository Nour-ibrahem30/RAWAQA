import mongoose, { Document, Schema, Types } from 'mongoose';

// Order status
export enum OrderStatus {
  PENDING = 'pending',                 // Order created, not yet sent to Odoo
  PENDING_ODOO = 'pending_odoo',       // Sent to Odoo, awaiting confirmation
  CONFIRMED = 'confirmed',             // Odoo confirmed
  PROCESSING = 'processing',           // Being prepared
  SHIPPED = 'shipped',                 // On the way
  DELIVERED = 'delivered',             // Delivered to customer
  CANCELLED = 'cancelled',             // Cancelled
  REFUNDED = 'refunded',               // Refunded
  FAILED = 'failed',                   // Failed (payment or other)
}

// Payment status
export enum PaymentStatus {
  PENDING = 'pending',
  PAID = 'paid',
  FAILED = 'failed',
  REFUNDED = 'refunded',
}

// Payment method
export enum PaymentMethod {
  CASH_ON_DELIVERY = 'cash_on_delivery',
  CREDIT_CARD = 'credit_card',
  BANK_TRANSFER = 'bank_transfer',
}

// Odoo sync status
export enum OdooSyncStatus {
  NOT_SYNCED = 'not_synced',
  PENDING = 'pending',
  SYNCED = 'synced',
  FAILED = 'failed',
}

// Order item with inventory reservation
export interface IOrderItem {
  product: Types.ObjectId;
  productSnapshot: {
    sku: string;
    nameAr: string;
    nameEn: string;
    price: number;
    image?: string;
  };
  quantity: number;
  price: number;                    // Price at time of order
  subtotal: number;                 // quantity * price
  inventoryReserved: boolean;       // Inventory reservation status
  reservedAt?: Date;                // When inventory was reserved
}

// Shipping address
export interface IShippingAddress {
  firstName: string;
  lastName: string;
  phone: string;
  email: string;
  addressLine1: string;
  addressLine2?: string;
  city: string;
  governorate: string;
  postalCode?: string;
  country: string;
}

// Odoo integration
export interface IOdooIntegration {
  odooOrderId?: string;             // Odoo order reference
  syncStatus: OdooSyncStatus;
  lastSyncAt?: Date;
  syncAttempts: number;
  lastSyncError?: string;
}

// Order interface
export interface IOrder extends Document {
  orderNumber: string;              // Human-readable order number
  userId: Types.ObjectId;
  items: IOrderItem[];
  
  // Pricing
  subtotal: number;
  shippingCost: number;
  tax: number;
  discount: number;
  total: number;
  
  // Status
  status: OrderStatus;
  paymentStatus: PaymentStatus;
  paymentMethod: PaymentMethod;
  
  // Shipping
  shippingAddress: IShippingAddress;
  trackingNumber?: string;
  
  // Odoo integration
  odoo: IOdooIntegration;
  
  // Timestamps
  createdAt: Date;
  updatedAt: Date;
  confirmedAt?: Date;
  shippedAt?: Date;
  deliveredAt?: Date;
  cancelledAt?: Date;
  
  // Notes
  customerNotes?: string;
  internalNotes?: string;

  // Coupon
  couponCode?:    string;
  couponDiscount: number;   // actual EGP discount applied
  
  // Methods
  calculateTotal(): number;
  releaseInventoryReservations(): Promise<void>;
  canBeCancelled(): boolean;
}

// Order item subdocument schema
const orderItemSchema = new Schema<IOrderItem>(
  {
    product: {
      type: Schema.Types.ObjectId,
      ref: 'Product',
      required: true,
    },
    productSnapshot: {
      sku: { type: String, required: true },
      nameAr: { type: String, required: true },
      nameEn: { type: String, required: true },
      price: { type: Number, required: true },
      image: String,
    },
    quantity: {
      type: Number,
      required: true,
      min: 1,
    },
    price: {
      type: Number,
      required: true,
      min: 0,
    },
    subtotal: {
      type: Number,
      required: true,
      min: 0,
    },
    inventoryReserved: {
      type: Boolean,
      default: false,
    },
    reservedAt: {
      type: Date,
    },
  },
  { _id: false }
);

// Shipping address subdocument schema
const shippingAddressSchema = new Schema<IShippingAddress>(
  {
    firstName: { type: String, required: true, trim: true },
    lastName: { type: String, required: true, trim: true },
    phone: { type: String, required: true, trim: true },
    email: { type: String, required: true, trim: true, lowercase: true },
    addressLine1: { type: String, required: true, trim: true },
    addressLine2: { type: String, trim: true },
    city: { type: String, required: true, trim: true },
    governorate: { type: String, required: true, trim: true },
    postalCode: { type: String, trim: true },
    country: { type: String, required: true, default: 'Egypt', trim: true },
  },
  { _id: false }
);

// Odoo integration subdocument schema
const odooIntegrationSchema = new Schema<IOdooIntegration>(
  {
    odooOrderId: { type: String, sparse: true },
    syncStatus: {
      type: String,
      enum: Object.values(OdooSyncStatus),
      default: OdooSyncStatus.NOT_SYNCED,
      required: true,
    },
    lastSyncAt: Date,
    syncAttempts: { type: Number, default: 0, min: 0 },
    lastSyncError: String,
  },
  { _id: false }
);

// Order schema
const orderSchema = new Schema<IOrder>(
  {
    orderNumber: {
      type: String,
      required: true,
      unique: true,  // unique already creates an index
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    items: {
      type: [orderItemSchema],
      required: true,
      validate: {
        validator: (items: IOrderItem[]) => items.length > 0,
        message: 'Order must have at least one item',
      },
    },
    
    // Pricing
    subtotal: {
      type: Number,
      required: true,
      min: 0,
    },
    shippingCost: {
      type: Number,
      required: true,
      min: 0,
      default: 0,
    },
    tax: {
      type: Number,
      required: true,
      min: 0,
      default: 0,
    },
    discount: {
      type: Number,
      required: true,
      min: 0,
      default: 0,
    },
    total: {
      type: Number,
      required: true,
      min: 0,
    },
    
    // Status
    status: {
      type: String,
      enum: Object.values(OrderStatus),
      default: OrderStatus.PENDING,
      required: true,
    },
    paymentStatus: {
      type: String,
      enum: Object.values(PaymentStatus),
      default: PaymentStatus.PENDING,
      required: true,
    },
    paymentMethod: {
      type: String,
      enum: Object.values(PaymentMethod),
      required: true,
    },
    
    // Shipping
    shippingAddress: {
      type: shippingAddressSchema,
      required: true,
    },
    trackingNumber: String,
    
    // Odoo
    odoo: {
      type: odooIntegrationSchema,
      default: () => ({
        syncStatus: OdooSyncStatus.NOT_SYNCED,
        syncAttempts: 0,
      }),
    },
    
    // Timestamps
    confirmedAt: Date,
    shippedAt: Date,
    deliveredAt: Date,
    cancelledAt: Date,
    
    // Notes
    customerNotes: {
      type: String,
      maxlength: 500,
    },
    internalNotes: {
      type: String,
      maxlength: 1000,
    },

    // Coupon
    couponCode: {
      type: String,
      uppercase: true,
      trim: true,
    },
    couponDiscount: {
      type: Number,
      default: 0,
      min: 0,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes - compound only (single-field indexes defined above via unique:true)
orderSchema.index({ userId: 1, status: 1 });
orderSchema.index({ userId: 1, createdAt: -1 });
orderSchema.index({ status: 1, createdAt: -1 });
orderSchema.index({ 'odoo.odooOrderId': 1 }, { sparse: true });
orderSchema.index({ 'odoo.syncStatus': 1 });
orderSchema.index({ createdAt: -1 });

// Calculate total (subtotal + shipping + tax - discount - couponDiscount)
orderSchema.methods.calculateTotal = function (): number {
  return this.subtotal + this.shippingCost + this.tax - this.discount - (this.couponDiscount || 0);
};

// Release inventory reservations (on cancellation)
orderSchema.methods.releaseInventoryReservations = async function (): Promise<void> {
  const Product = mongoose.model('Product');
  
  for (const item of this.items) {
    if (item.inventoryReserved) {
      await Product.findByIdAndUpdate(item.product, {
        $inc: { 'inventory.reservedQuantity': -item.quantity },
      });
    }
  }
};

// Check if order can be cancelled
orderSchema.methods.canBeCancelled = function (): boolean {
  const cancellableStatuses = [
    OrderStatus.PENDING,
    OrderStatus.PENDING_ODOO,
    OrderStatus.CONFIRMED,
  ];
  return cancellableStatuses.includes(this.status);
};

// Pre-save hook: calculate total
orderSchema.pre('save', function (next) {
  this.total = this.calculateTotal();
  next();
});

// Export model
export const Order = mongoose.model<IOrder>('Order', orderSchema);
