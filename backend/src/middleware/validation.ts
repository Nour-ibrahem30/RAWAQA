import { Request, Response, NextFunction } from 'express';
import { z, ZodError } from 'zod';

// Generic validation middleware
export const validate = (schema: z.ZodObject<any, any>) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      schema.parse({
        body: req.body,
        query: req.query,
        params: req.params,
      });
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        res.status(400).json({
          error: 'Validation Error',
          message: 'Invalid request data',
          details: error.errors.map((err) => ({
            field: err.path.join('.'),
            message: err.message,
          })),
        });
        return;
      }
      next(error);
    }
  };
};

// Auth validation schemas
export const registerSchema = z.object({
  body: z.object({
    email: z
      .string()
      .min(1, 'Email is required')
      .email('Invalid email format')
      .toLowerCase(),
    password: z
      .string()
      .min(8, 'Password must be at least 8 characters')
      .regex(
        /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
        'Password must contain at least one uppercase letter, one lowercase letter, and one number'
      ),
    firstName: z
      .string()
      .min(2, 'First name must be at least 2 characters')
      .max(50, 'First name cannot exceed 50 characters')
      .trim(),
    lastName: z
      .string()
      .min(2, 'Last name must be at least 2 characters')
      .max(50, 'Last name cannot exceed 50 characters')
      .trim(),
    phone: z
      .string()
      .regex(/^[\d\s+()-]+$/, 'Invalid phone number format')
      .optional(),
  }),
});

export const loginSchema = z.object({
  body: z.object({
    email: z
      .string()
      .min(1, 'Email is required')
      .email('Invalid email format')
      .toLowerCase(),
    password: z.string().min(1, 'Password is required'),
  }),
});

export const refreshTokenSchema = z.object({
  body: z.object({
    refreshToken: z.string().min(1, 'Refresh token is required'),
  }),
});

// ─── Checkout Validation ──────────────────────────────────────────────────────

const shippingAddressSchema = z.object({
  recipientName: z.string().min(2, 'Recipient name is required').max(100).trim(),
  phone: z
    .string()
    .min(1, 'Phone is required')
    .regex(/^[\d\s+()-]+$/, 'Invalid phone number'),
  streetAddress: z.string().min(5, 'Street address is required').max(200).trim(),
  city:          z.string().min(2, 'City is required').max(100).trim(),
  governorate:   z.string().min(2, 'Governorate is required').max(100).trim(),
  postalCode:    z.string().max(10).optional(),
});

export const checkoutSchema = z.object({
  body: z.object({
    cartId:          z.string().min(1, 'Cart ID is required'),
    shippingAddress: shippingAddressSchema,
    paymentMethod: z.enum(
      ['cash_on_delivery', 'credit_card', 'bank_transfer'],
      { errorMap: () => ({ message: 'Invalid payment method' }) }
    ),
    couponCode: z.string().min(3).max(30).toUpperCase().trim().optional(),
    notes: z.string().max(500).optional(),
  }),
});

export const cancelOrderSchema = z.object({
  params: z.object({
    orderId: z.string().min(1, 'Order ID is required'),
  }),
  body: z.object({
    reason: z
      .string()
      .min(5, 'Cancellation reason is required (min 5 chars)')
      .max(500),
  }),
});

// ─── Order Validation ─────────────────────────────────────────────────────────

export const updateOrderStatusSchema = z.object({
  params: z.object({ id: z.string().min(1) }),
  body: z.object({
    status: z.enum(
      ['pending', 'pending_odoo', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled', 'refunded', 'failed'],
      { errorMap: () => ({ message: 'Invalid order status' }) }
    ),
    notes: z.string().max(500).optional(),
  }),
});

export const updatePaymentStatusSchema = z.object({
  params: z.object({ id: z.string().min(1) }),
  body: z.object({
    paymentStatus: z.enum(['pending', 'paid', 'failed', 'refunded'], {
      errorMap: () => ({ message: 'Invalid payment status' }),
    }),
  }),
});

export const addTrackingSchema = z.object({
  params: z.object({ id: z.string().min(1) }),
  body: z.object({
    trackingNumber: z.string().min(3, 'Tracking number is required').max(100),
    carrier:        z.string().min(2, 'Carrier is required').max(100),
  }),
});

// ─── Admin User Validation ────────────────────────────────────────────────────

export const changeRoleSchema = z.object({
  params: z.object({ id: z.string().min(1) }),
  body: z.object({
    role: z.enum(['customer', 'admin', 'super_admin'], {
      errorMap: () => ({ message: 'Invalid role' }),
    }),
  }),
});

// ─── Coupon Validation ────────────────────────────────────────────────────────

export const createCouponSchema = z.object({
  body: z.object({
    code:          z.string().min(3).max(30).toUpperCase().trim(),
    type:          z.enum(['percentage', 'fixed'], { errorMap: () => ({ message: 'Type must be percentage or fixed' }) }),
    value:         z.number().positive('Value must be positive'),
    minOrderValue: z.number().min(0).optional(),
    maxDiscount:   z.number().positive().optional(),
    usageLimit:    z.number().int().positive().optional(),
    expiresAt:     z.string().datetime({ message: 'Invalid date format' }).optional(),
    isActive:      z.boolean().optional(),
  }),
});

export const applyCouponSchema = z.object({
  body: z.object({
    code:       z.string().min(1, 'Coupon code is required').toUpperCase().trim(),
    cartTotal:  z.number().positive('Cart total must be positive'),
  }),
});

// ─── Review Validation ────────────────────────────────────────────────────────

export const createReviewSchema = z.object({
  params: z.object({ productId: z.string().min(1) }),
  body: z.object({
    rating:  z.number().int().min(1, 'Rating min 1').max(5, 'Rating max 5'),
    comment: z.string().min(10, 'Comment must be at least 10 characters').max(1000),
    titleAr: z.string().max(100).optional(),
    titleEn: z.string().max(100).optional(),
  }),
});

// ─── Shipping Address Validation ──────────────────────────────────────────────

export const addShippingAddressSchema = z.object({
  body: z.object({
    label:         z.string().max(50).optional(),       // e.g. "Home", "Work"
    recipientName: z.string().min(2).max(100).trim(),
    phone:         z.string().regex(/^[\d\s+()-]+$/, 'Invalid phone'),
    streetAddress: z.string().min(5).max(200).trim(),
    city:          z.string().min(2).max(100).trim(),
    governorate:   z.string().min(2).max(100).trim(),
    postalCode:    z.string().max(10).optional(),
    isDefault:     z.boolean().optional(),
  }),
});
