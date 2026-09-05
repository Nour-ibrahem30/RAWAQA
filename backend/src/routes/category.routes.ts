import { Router } from 'express';
import {
  listCategories,
  getCategory,
  getCategoryBySlugHandler,
  getCategoryProducts,
  createCategoryHandler,
  updateCategoryHandler,
  deleteCategoryHandler,
  reorderCategoriesHandler,
} from '../controllers/category.controller';
import { authenticate, requireAdmin } from '../middleware/auth.middleware';
import { validate } from '../middleware/validation';
import {
  createCategorySchema,
  updateCategorySchema,
  getCategoryByIdSchema,
} from '../middleware/category.validation';

const router = Router();

/**
 * @route   GET /api/categories
 * @desc    Get all categories
 * @access  Public
 */
router.get('/', listCategories);

/**
 * @route   GET /api/categories/slug/:slug
 * @desc    Get category by slug
 * @access  Public
 */
router.get('/slug/:slug', getCategoryBySlugHandler);

/**
 * @route   GET /api/categories/:id
 * @desc    Get single category by ID
 * @access  Public
 */
router.get('/:id', validate(getCategoryByIdSchema), getCategory);

/**
 * @route   GET /api/categories/:id/products
 * @desc    Get category with products
 * @access  Public
 */
router.get('/:id/products', validate(getCategoryByIdSchema), getCategoryProducts);

/**
 * @route   POST /api/categories
 * @desc    Create new category
 * @access  Private (Admin)
 */
router.post(
  '/',
  authenticate,
  requireAdmin,
  validate(createCategorySchema),
  createCategoryHandler
);

/**
 * @route   POST /api/categories/reorder
 * @desc    Reorder categories
 * @access  Private (Admin)
 */
router.post('/reorder', authenticate, requireAdmin, reorderCategoriesHandler);

/**
 * @route   PUT /api/categories/:id
 * @desc    Update category
 * @access  Private (Admin)
 */
router.put(
  '/:id',
  authenticate,
  requireAdmin,
  validate(updateCategorySchema),
  updateCategoryHandler
);

/**
 * @route   DELETE /api/categories/:id
 * @desc    Delete category
 * @access  Private (Admin)
 */
router.delete(
  '/:id',
  authenticate,
  requireAdmin,
  validate(getCategoryByIdSchema),
  deleteCategoryHandler
);

export default router;
