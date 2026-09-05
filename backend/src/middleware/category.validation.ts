import { z } from 'zod';

// Create category schema
export const createCategorySchema = z.object({
  body: z.object({
    nameAr: z.string().min(2).max(100),
    nameEn: z.string().min(2).max(100),
    descriptionAr: z.string().max(500).optional(),
    descriptionEn: z.string().max(500).optional(),
    slugAr: z.string().min(1).toLowerCase(),
    slugEn: z.string().min(1).toLowerCase(),
    image: z.string().url().optional(),
    icon: z.string().optional(),
    order: z.number().min(0).default(0),
    isActive: z.boolean().default(true),
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
    descriptionAr: z.string().max(500).optional(),
    descriptionEn: z.string().max(500).optional(),
    slugAr: z.string().min(1).toLowerCase().optional(),
    slugEn: z.string().min(1).toLowerCase().optional(),
    image: z.string().url().optional(),
    icon: z.string().optional(),
    order: z.number().min(0).optional(),
    isActive: z.boolean().optional(),
  }),
});

// Get category by ID schema
export const getCategoryByIdSchema = z.object({
  params: z.object({
    id: z.string().min(1),
  }),
});
