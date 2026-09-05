import mongoose, { Document, Schema, Types } from 'mongoose';

// Product status
export enum ProductStatus {
  ACTIVE = 'active',
  DRAFT = 'draft',
  ARCHIVED = 'archived',
  OUT_OF_STOCK = 'out_of_stock',
}

// Inventory tracking (CRITICAL for correctness)
export interface IInventory {
  onHandQuantity: number;           // From Odoo (business authority)
  reservedQuantity: number;         // Sum of active order reservations
  availableQuantity: number;        // Computed: onHand - reserved
  lastSyncedAt: Date;               // Last Odoo sync timestamp
  odooProductId?: string;           // Odoo product reference
  lowStockThreshold: number;        // Alert threshold
  allowBackorder: boolean;          // Allow orders when out of stock
}

// Product dimensions
export interface IDimensions {
  length?: number;  // cm
  width?: number;   // cm
  height?: number;  // cm
  weight?: number;  // kg
}

// Product images
export interface IProductImage {
  url: string;
  alt: string;
  isPrimary: boolean;
  order: number;
}

// Product interface
export interface IProduct extends Document {
  // Bilingual fields
  nameAr: string;
  nameEn: string;
  descriptionAr: string;
  descriptionEn: string;
  shortDescriptionAr?: string;
  shortDescriptionEn?: string;
  
  // Slug for URLs
  slugAr: string;
  slugEn: string;
  
  // SKU and references
  sku: string;
  odooProductId?: string;
  
  // Pricing
  price: number;
  compareAtPrice?: number;  // Original price for discounts
  cost?: number;            // Cost price (admin only)
  
  // Inventory (CRITICAL MODEL)
  inventory: IInventory;
  
  // Category
  category: Types.ObjectId;
  
  // Product details
  images: IProductImage[];
  dimensions?: IDimensions;
  color?: string;
  material?: string;
  
  // Metadata
  status: ProductStatus;
  featured: boolean;
  tags: string[];
  
  // SEO
  metaTitleAr?: string;
  metaTitleEn?: string;
  metaDescriptionAr?: string;
  metaDescriptionEn?: string;
  
  // Stats
  viewCount: number;
  orderCount: number;
  ratings: {
    average: number;  // 1-5, updated after each approved review
    count:   number;  // total approved reviews
  };
  
  // Timestamps
  createdAt: Date;
  updatedAt: Date;
  
  // Methods
  updateAvailableQuantity(): void;
  isInStock(): boolean;
  isLowStock(): boolean;
}

// Inventory subdocument schema
const inventorySchema = new Schema<IInventory>(
  {
    onHandQuantity: {
      type: Number,
      required: true,
      min: [0, 'On-hand quantity cannot be negative'],
      default: 0,
    },
    reservedQuantity: {
      type: Number,
      required: true,
      min: [0, 'Reserved quantity cannot be negative'],
      default: 0,
    },
    availableQuantity: {
      type: Number,
      required: true,
      min: [0, 'Available quantity cannot be negative'],
      default: 0,
    },
    lastSyncedAt: {
      type: Date,
      default: Date.now,
    },
    odooProductId: {
      type: String,
      sparse: true,
      index: true,
    },
    lowStockThreshold: {
      type: Number,
      default: 5,
      min: [0, 'Low stock threshold cannot be negative'],
    },
    allowBackorder: {
      type: Boolean,
      default: false,
    },
  },
  { _id: false }
);

// Image subdocument schema
const imageSchema = new Schema<IProductImage>(
  {
    url: {
      type: String,
      required: true,
    },
    alt: {
      type: String,
      required: true,
    },
    isPrimary: {
      type: Boolean,
      default: false,
    },
    order: {
      type: Number,
      default: 0,
    },
  },
  { _id: false }
);

// Dimensions subdocument schema
const dimensionsSchema = new Schema<IDimensions>(
  {
    length: { type: Number, min: 0 },
    width: { type: Number, min: 0 },
    height: { type: Number, min: 0 },
    weight: { type: Number, min: 0 },
  },
  { _id: false }
);

// Product schema
const productSchema = new Schema<IProduct>(
  {
    // Bilingual names
    nameAr: {
      type: String,
      required: [true, 'Arabic name is required'],
      trim: true,
      minlength: [2, 'Arabic name must be at least 2 characters'],
      maxlength: [200, 'Arabic name cannot exceed 200 characters'],
    },
    nameEn: {
      type: String,
      required: [true, 'English name is required'],
      trim: true,
      minlength: [2, 'English name must be at least 2 characters'],
      maxlength: [200, 'English name cannot exceed 200 characters'],
    },
    
    // Bilingual descriptions
    descriptionAr: {
      type: String,
      required: [true, 'Arabic description is required'],
      trim: true,
    },
    descriptionEn: {
      type: String,
      required: [true, 'English description is required'],
      trim: true,
    },
    shortDescriptionAr: {
      type: String,
      trim: true,
      maxlength: [500, 'Short description cannot exceed 500 characters'],
    },
    shortDescriptionEn: {
      type: String,
      trim: true,
      maxlength: [500, 'Short description cannot exceed 500 characters'],
    },
    
    // Slugs for URLs
    slugAr: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    slugEn: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    
    // SKU
    sku: {
      type: String,
      required: [true, 'SKU is required'],
      unique: true,
      uppercase: true,
      trim: true,
      index: true,
    },
    odooProductId: {
      type: String,
      sparse: true,
      index: true,
    },
    
    // Pricing
    price: {
      type: Number,
      required: [true, 'Price is required'],
      min: [0, 'Price cannot be negative'],
    },
    compareAtPrice: {
      type: Number,
      min: [0, 'Compare at price cannot be negative'],
    },
    cost: {
      type: Number,
      min: [0, 'Cost cannot be negative'],
      select: false, // Admin only
    },
    
    // CRITICAL: Inventory model
    inventory: {
      type: inventorySchema,
      required: true,
      default: () => ({
        onHandQuantity: 0,
        reservedQuantity: 0,
        availableQuantity: 0,
        lastSyncedAt: new Date(),
        lowStockThreshold: 5,
        allowBackorder: false,
      }),
    },
    
    // Category reference
    category: {
      type: Schema.Types.ObjectId,
      ref: 'Category',
      required: [true, 'Category is required'],
      index: true,
    },
    
    // Images
    images: {
      type: [imageSchema],
      default: [],
    },
    
    // Dimensions
    dimensions: dimensionsSchema,
    
    // Product attributes
    color: String,
    material: String,
    
    // Status
    status: {
      type: String,
      enum: Object.values(ProductStatus),
      default: ProductStatus.DRAFT,
      index: true,
    },
    featured: {
      type: Boolean,
      default: false,
      index: true,
    },
    tags: {
      type: [String],
      default: [],
      index: true,
    },
    
    // SEO metadata
    metaTitleAr: String,
    metaTitleEn: String,
    metaDescriptionAr: String,
    metaDescriptionEn: String,
    
    // Stats
    viewCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    orderCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    ratings: {
      average: { type: Number, default: 0, min: 0, max: 5 },
      count:   { type: Number, default: 0, min: 0 },
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Compound indexes for common queries
productSchema.index({ status: 1, featured: 1 });
productSchema.index({ category: 1, status: 1 });
productSchema.index({ slugAr: 1, status: 1 });
productSchema.index({ slugEn: 1, status: 1 });
productSchema.index({ 'inventory.availableQuantity': 1, status: 1 });
productSchema.index({ price: 1, status: 1 });
productSchema.index({ tags: 1, status: 1 });

// Text search index for bilingual search
productSchema.index({ nameAr: 'text', nameEn: 'text', descriptionAr: 'text', descriptionEn: 'text' });

// CRITICAL: Update available quantity (onHand - reserved)
productSchema.methods.updateAvailableQuantity = function (): void {
  this.inventory.availableQuantity = 
    this.inventory.onHandQuantity - this.inventory.reservedQuantity;
  
  // Ensure it doesn't go negative
  if (this.inventory.availableQuantity < 0) {
    this.inventory.availableQuantity = 0;
  }
};

// Check if product is in stock
productSchema.methods.isInStock = function (): boolean {
  return this.inventory.availableQuantity > 0 || this.inventory.allowBackorder;
};

// Check if product is low on stock
productSchema.methods.isLowStock = function (): boolean {
  return (
    this.inventory.availableQuantity > 0 &&
    this.inventory.availableQuantity <= this.inventory.lowStockThreshold
  );
};

// Pre-save hook: update available quantity
productSchema.pre('save', function (next) {
  this.updateAvailableQuantity();
  next();
});

// Virtual: discount percentage
productSchema.virtual('discountPercentage').get(function () {
  if (this.compareAtPrice && this.compareAtPrice > this.price) {
    return Math.round(((this.compareAtPrice - this.price) / this.compareAtPrice) * 100);
  }
  return 0;
});

// Export model
export const Product = mongoose.model<IProduct>('Product', productSchema);
