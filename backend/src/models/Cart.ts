import mongoose, { Document, Schema, Types } from 'mongoose';
import { env } from '../config/env';

// Cart item interface
export interface ICartItem {
  product: Types.ObjectId;
  quantity: number;
  price: number;              // Price at time of adding (snapshot)
  addedAt: Date;
}

// Cart interface
export interface ICart extends Document {
  userId?: Types.ObjectId;    // Authenticated user (optional for guest carts)
  sessionId?: string;         // Guest session identifier
  items: ICartItem[];
  subtotal: number;           // Computed field
  itemCount: number;          // Computed field
  expiresAt?: Date;           // For guest carts
  createdAt: Date;
  updatedAt: Date;
  
  // Methods
  calculateSubtotal(): number;
  calculateItemCount(): number;
  updateTotals(): void;
  isExpired(): boolean;
  isEmpty(): boolean;
}

// Cart item subdocument schema
const cartItemSchema = new Schema<ICartItem>(
  {
    product: {
      type: Schema.Types.ObjectId,
      ref: 'Product',
      required: true,
    },
    quantity: {
      type: Number,
      required: true,
      min: [1, 'Quantity must be at least 1'],
      max: [
        env.CART_ITEM_MAX_QUANTITY,
        `Quantity cannot exceed ${env.CART_ITEM_MAX_QUANTITY}`,
      ],
    },
    price: {
      type: Number,
      required: true,
      min: [0, 'Price cannot be negative'],
    },
    addedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: false }
);

// Cart schema
const cartSchema = new Schema<ICart>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      sparse: true,
    },
    sessionId: {
      type: String,
      sparse: true,
    },
    items: {
      type: [cartItemSchema],
      default: [],
    },
    subtotal: {
      type: Number,
      default: 0,
      min: 0,
    },
    itemCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    expiresAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes
cartSchema.index({ userId: 1 }, { unique: true, sparse: true });
cartSchema.index({ sessionId: 1 }, { unique: true, sparse: true });
cartSchema.index({ updatedAt: 1 });

// TTL index for guest carts
cartSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// Calculate subtotal
cartSchema.methods.calculateSubtotal = function (): number {
  return this.items.reduce((total: number, item: ICartItem) => {
    return total + item.price * item.quantity;
  }, 0);
};

// Calculate item count
cartSchema.methods.calculateItemCount = function (): number {
  return this.items.reduce((count: number, item: ICartItem) => {
    return count + item.quantity;
  }, 0);
};

// Update computed totals
cartSchema.methods.updateTotals = function (): void {
  this.subtotal = this.calculateSubtotal();
  this.itemCount = this.calculateItemCount();
};

// Check if cart is expired
cartSchema.methods.isExpired = function (): boolean {
  if (!this.expiresAt) return false;
  return new Date() > this.expiresAt;
};

// Check if cart is empty
cartSchema.methods.isEmpty = function (): boolean {
  return this.items.length === 0;
};

// Pre-save hook: update totals
cartSchema.pre('save', function (next) {
  this.updateTotals();
  next();
});

// Validation: cart must have either userId or sessionId
cartSchema.pre('validate', function (next) {
  if (!this.userId && !this.sessionId) {
    next(new Error('Cart must have either userId or sessionId'));
  } else {
    next();
  }
});

// Export model
export const Cart = mongoose.model<ICart>('Cart', cartSchema);
