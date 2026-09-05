import { Router } from 'express';
import {
  listProducts,
  listFeaturedProducts,
  listLowStockProducts,
  getProduct,
  getProductBySlugHandler,
  getProductBySkuHandler,
  getRelatedProductsHandler,
  createProductHandler,
  updateProductHandler,
  deleteProductHandler,
  adjustInventoryHandler,
} from '../controllers/product.controller';
import { authenticate, requireAdmin } from '../middleware/auth.middleware';
import { validate } from '../middleware/validation';
import {
  createProductSchema,
  updateProductSchema,
  getProductByIdSchema,
  queryProductsSchema,
} from '../middleware/product.validation';

const router = Router();

/**
 * @route   GET /api/products
 * @desc    Get all products with filters
 * @access  Public
 */
router.get('/', validate(queryProductsSchema), listProducts);

/**
 * @route   GET /api/products/featured
 * @desc    Get featured products
 * @access  Public
 */
router.get('/featured', listFeaturedProducts);

/**
 * @route   GET /api/products/low-stock
 * @desc    Get low stock products
 * @access  Private (Admin)
 */
router.get('/low-stock', authenticate, requireAdmin, listLowStockProducts);

/**
 * @route   GET /api/products/slug/:slug
 * @desc    Get product by slug
 * @access  Public
 */
router.get('/slug/:slug', getProductBySlugHandler);

/**
 * @route   GET /api/products/sku/:sku
 * @desc    Get product by SKU
 * @access  Public
 */
router.get('/sku/:sku', getProductBySkuHandler);

/**
 * @route   GET /api/products/:id
 * @desc    Get single product by ID
 * @access  Public
 */
router.get('/:id', validate(getProductByIdSchema), getProduct);

/**
 * @route   GET /api/products/:id/related
 * @desc    Get related products
 * @access  Public
 */
router.get('/:id/related', validate(getProductByIdSchema), getRelatedProductsHandler);

/**
 * @route   POST /api/products
 * @desc    Create new product
 * @access  Private (Admin)
 */
router.post(
  '/',
  authenticate,
  requireAdmin,
  validate(createProductSchema),
  createProductHandler
);

/**
 * @route   PUT /api/products/:id
 * @desc    Update product
 * @access  Private (Admin)
 */
router.put(
  '/:id',
  authenticate,
  requireAdmin,
  validate(updateProductSchema),
  updateProductHandler
);

/**
 * @route   DELETE /api/products/:id
 * @desc    Delete product (soft delete)
 * @access  Private (Admin)
 */
router.delete(
  '/:id',
  authenticate,
  requireAdmin,
  validate(getProductByIdSchema),
  deleteProductHandler
);

/**
 * @route   PUT /api/products/:id/inventory
 * @desc    Admin manually adjust product inventory
 * @access  Private (Admin)
 * @body    { onHandQuantity?, reservedQuantity?, lowStockThreshold?, reason? }
 */
router.put('/:id/inventory', authenticate, requireAdmin, adjustInventoryHandler);

export default router;
