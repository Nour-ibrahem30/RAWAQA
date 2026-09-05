import { z } from 'zod';

// Create product schema
export const createProductSchema = z.object({
  body: z.object({
    nameAr: z.string().min(2).max(200),
    nameEn: z.string().min(2).max(200),
    descriptionAr: z.string().min(1),
    descriptionEn: z.string().min(1),
    shortDescriptionAr: z.string().max(500).optional(),
    shortDescriptionEn: z.string().max(500).optional(),
    slugAr: z.string().min(1).toLowerCase(),
    slugEn: z.string().min(1).toLowerCase(),
    sku: z.string().min(1).toUpperCase(),
    price: z.number().min(0),
    compareAtPrice: z.number().min(0).optional(),
    cost: z.number().min(0).optional(),
    category: z.string().min(1),
    inventory: z.object({
      onHandQuantity: z.number().min(0).default(0),
      lowStockThreshold: z.number().min(0).default(5),
      allowBackorder: z.boolean().default(false),
    }).optional(),
    images: z.array(
      z.object({
        url: z.string().url(),
        alt: z.string(),
        isPrimary: z.boolean().default(false),
        order: z.number().default(0),
      })
    ).optional(),
    dimensions: z.object({
      length: z.number().min(0).optional(),
      width: z.number().min(0).optional(),
      height: z.number().min(0).optional(),
      weight: z.number().min(0).optional(),
    }).optional(),
    color: z.string().optional(),
    material: z.string().optional(),
    status: z.enum(['active', 'draft', 'archived', 'out_of_stock']).default('draft'),
    featured: z.boolean().default(false),
    tags: z.array(z.string()).optional(),
    metaTitleAr: z.string().optional(),
    metaTitleEn: z.string().optional(),
    metaDescriptionAr: z.string().optional(),
    metaDescriptionEn: z.string().optional(),
  }),
});

// Update product schema (all fields optional)
export const updateProductSchema = z.object({
  params: z.object({
    id: z.string().min(1),
  }),
  body: z.object({
    nameAr: z.string().min(2).max(200).optional(),
    nameEn: z.string().min(2).max(200).optional(),
    descriptionAr: z.string().min(1).optional(),
    descriptionEn: z.string().min(1).optional(),
    shortDescriptionAr: z.string().max(500).optional(),
    shortDescriptionEn: z.string().max(500).optional(),
    slugAr: z.string().min(1).toLowerCase().optional(),
    slugEn: z.string().min(1).toLowerCase().optional(),
    sku: z.string().min(1).toUpperCase().optional(),
    price: z.number().min(0).optional(),
    compareAtPrice: z.number().min(0).optional(),
    cost: z.number().min(0).optional(),
    category: z.string().min(1).optional(),
    inventory: z.object({
      onHandQuantity: z.number().min(0).optional(),
      lowStockThreshold: z.number().min(0).optional(),
      allowBackorder: z.boolean().optional(),
    }).optional(),
    images: z.array(
      z.object({
        url: z.string().url(),
        alt: z.string(),
        isPrimary: z.boolean().default(false),
        order: z.number().default(0),
      })
    ).optional(),
    dimensions: z.object({
      length: z.number().min(0).optional(),
      width: z.number().min(0).optional(),
      height: z.number().min(0).optional(),
      weight: z.number().min(0).optional(),
    }).optional(),
    color: z.string().optional(),
    material: z.string().optional(),
    status: z.enum(['active', 'draft', 'archived', 'out_of_stock']).optional(),
    featured: z.boolean().optional(),
    tags: z.array(z.string()).optional(),
    metaTitleAr: z.string().optional(),
    metaTitleEn: z.string().optional(),
    metaDescriptionAr: z.string().optional(),
    metaDescriptionEn: z.string().optional(),
  }),
});

// Get product by ID schema
export const getProductByIdSchema = z.object({
  params: z.object({
    id: z.string().min(1),
  }),
});

// Query products schema
export const queryProductsSchema = z.object({
  query: z.object({
    page: z.string().regex(/^\d+$/).transform(Number).default('1'),
    limit: z.string().regex(/^\d+$/).transform(Number).default('20'),
    category: z.string().optional(),
    status: z.enum(['active', 'draft', 'archived', 'out_of_stock']).optional(),
    featured: z.string().transform((val) => val === 'true').optional(),
    search: z.string().optional(),
    minPrice: z.string().regex(/^\d+(\.\d+)?$/).transform(Number).optional(),
    maxPrice: z.string().regex(/^\d+(\.\d+)?$/).transform(Number).optional(),
    inStock: z.string().transform((val) => val === 'true').optional(),
    sortBy: z.enum(['createdAt', 'price', 'nameAr', 'nameEn', 'orderCount', 'viewCount']).default('createdAt'),
    sortOrder: z.enum(['asc', 'desc']).default('desc'),
  }),
});
