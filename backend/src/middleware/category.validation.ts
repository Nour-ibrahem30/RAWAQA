import { z } from 'zod';

// Create category schema
export const createCategorySchema = z.object({
  body: z.object({
    nameAr: z.string().min(2).max(100),
    nameEn: z.string().min(2).max(100),
    descriptionAr: z.string().max(500).optional().nullable(),
    descriptionEn: z.string().max(500).optional().nullable(),
    slug: z.string().min(1).toLowerCase().optional().nullable(),
    slugAr: z.string().min(1).toLowerCase().optional().nullable(),
    slugEn: z.string().min(1).toLowerCase().optional().nullable(),
    image: z.union([z.string().url(), z.literal(''), z.null()]).optional(),
    icon: z.string().optional().nullable(),
    order: z.coerce.number().min(0).default(0),
    isActive: z.boolean().default(true),
    status: z.enum(['active', 'inactive']).optional(),
  }),
});

// Update category schema
export const updateCategorySchema = z.object({
  params: z.object({
    id: z.string().min(1),
  }),
  body: z.object({
    nameAr: z.string().min(2).max(100).optional(),
    nameEn: z.string().min(2).max(100).optional(),
    descriptionAr: z.string().max(500).optional().nullable(),
    descriptionEn: z.string().max(500).optional().nullable(),
    slug: z.string().min(1).toLowerCase().optional().nullable(),
    slugAr: z.string().min(1).toLowerCase().optional().nullable(),
    slugEn: z.string().min(1).toLowerCase().optional().nullable(),
    image: z.union([z.string().url(), z.literal(''), z.null()]).optional(),
    icon: z.string().optional().nullable(),
    order: z.coerce.number().min(0).optional(),
    isActive: z.boolean().optional(),
    status: z.enum(['active', 'inactive']).optional(),
  }),
});

// Get category by ID schema
export const getCategoryByIdSchema = z.object({
  params: z.object({
    id: z.string().min(1),
  }),
});
