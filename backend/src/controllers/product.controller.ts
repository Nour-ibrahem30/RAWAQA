import { Request, Response } from 'express';
import {
  getProducts,
  getProductById,
  getProductBySlug,
  getProductBySku,
  createProduct,
  updateProduct,
  deleteProduct,
  getFeaturedProducts,
  getLowStockProducts,
  getRelatedProducts,
  adjustInventory,
  IProductQuery,
} from '../services/product.service';
import { logError } from '../config/logger';

/**
 * GET /api/products
 * Get all products with filters and pagination
 */
export const listProducts = async (req: Request, res: Response): Promise<void> => {
  try {
    const query: IProductQuery = req.query as any;
    const result = await getProducts(query);

    res.status(200).json({
      success: true,
      data: result.products,
      pagination: result.pagination,
    });
  } catch (error) {
    logError('List products error', error);
    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: 'Failed to fetch products',
    });
  }
};

/**
 * GET /api/products/featured
 * Get featured products
 */
export const listFeaturedProducts = async (
  _req: Request,
  res: Response
): Promise<void> => {
  try {
    const limit = parseInt(_req.query.limit as string) || 10;
    const products = await getFeaturedProducts(limit);

    res.status(200).json({
      success: true,
      data: products,
    });
  } catch (error) {
    logError('List featured products error', error);
    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: 'Failed to fetch featured products',
    });
  }
};

/**
 * GET /api/products/low-stock
 * Get low stock products (Admin only)
 */
export const listLowStockProducts = async (
  _req: Request,
  res: Response
): Promise<void> => {
  try {
    const products = await getLowStockProducts();

    res.status(200).json({
      success: true,
      data: products,
    });
  } catch (error) {
    logError('List low stock products error', error);
    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: 'Failed to fetch low stock products',
    });
  }
};

/**
 * GET /api/products/:id
 * Get single product by ID
 */
export const getProduct = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    
    if (!id) {
      res.status(400).json({
        success: false,
        error: 'Bad Request',
        message: 'Product ID is required',
      });
      return;
    }
    
    const product = await getProductById(id);

    if (!product) {
      res.status(404).json({
        success: false,
        error: 'Not Found',
        message: 'Product not found',
      });
      return;
    }

    res.status(200).json({
      success: true,
      data: product,
    });
  } catch (error) {
    logError('Get product error', error);
    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: 'Failed to fetch product',
    });
  }
};

/**
 * GET /api/products/slug/:slug
 * Get product by slug
 */
export const getProductBySlugHandler = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { slug } = req.params;
    
    if (!slug) {
      res.status(400).json({
        success: false,
        error: 'Bad Request',
        message: 'Product slug is required',
      });
      return;
    }
    
    const locale = (req.query.locale as 'ar' | 'en') || 'en';
    const product = await getProductBySlug(slug, locale);

    if (!product) {
      res.status(404).json({
        success: false,
        error: 'Not Found',
        message: 'Product not found',
      });
      return;
    }

    res.status(200).json({
      success: true,
      data: product,
    });
  } catch (error) {
    logError('Get product by slug error', error);
    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: 'Failed to fetch product',
    });
  }
};

/**
 * GET /api/products/:id/related
 * Get related products
 */
export const getRelatedProductsHandler = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;
    
    if (!id) {
      res.status(400).json({
        success: false,
        error: 'Bad Request',
        message: 'Product ID is required',
      });
      return;
    }
    
    const limit = parseInt(req.query.limit as string) || 6;
    const products = await getRelatedProducts(id, limit);

    res.status(200).json({
      success: true,
      data: products,
    });
  } catch (error) {
    logError('Get related products error', error);
    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: 'Failed to fetch related products',
    });
  }
};

/**
 * POST /api/products
 * Create new product (Admin only)
 */
export const createProductHandler = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const product = await createProduct(req.body);

    res.status(201).json({
      success: true,
      message: 'Product created successfully',
      data: product,
    });
  } catch (error) {
    logError('Create product error', error);

    if (error instanceof Error) {
      if (error.message.includes('already exists') || error.message.includes('not found')) {
        res.status(400).json({
          success: false,
          error: 'Bad Request',
          message: error.message,
        });
        return;
      }
    }

    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: 'Failed to create product',
    });
  }
};

/**
 * PUT /api/products/:id
 * Update product (Admin only)
 */
export const updateProductHandler = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;
    
    if (!id) {
      res.status(400).json({
        success: false,
        error: 'Bad Request',
        message: 'Product ID is required',
      });
      return;
    }
    
    const product = await updateProduct(id, req.body);

    if (!product) {
      res.status(404).json({
        success: false,
        error: 'Not Found',
        message: 'Product not found',
      });
      return;
    }

    res.status(200).json({
      success: true,
      message: 'Product updated successfully',
      data: product,
    });
  } catch (error) {
    logError('Update product error', error);

    if (error instanceof Error) {
      if (error.message.includes('not found') || error.message.includes('already exists')) {
        res.status(400).json({
          success: false,
          error: 'Bad Request',
          message: error.message,
        });
        return;
      }
    }

    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: 'Failed to update product',
    });
  }
};

/**
 * DELETE /api/products/:id
 * Delete product (Admin only) - Soft delete
 */
export const deleteProductHandler = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;
    
    if (!id) {
      res.status(400).json({
        success: false,
        error: 'Bad Request',
        message: 'Product ID is required',
      });
      return;
    }
    
    const product = await deleteProduct(id);

    if (!product) {
      res.status(404).json({
        success: false,
        error: 'Not Found',
        message: 'Product not found',
      });
      return;
    }

    res.status(200).json({
      success: true,
      message: 'Product deleted successfully',
      data: product,
    });
  } catch (error) {
    logError('Delete product error', error);
    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: 'Failed to delete product',
    });
  }
};

// PUT /api/products/:id/inventory  (admin)
export const adjustInventoryHandler = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    if (!id) { res.status(400).json({ success: false, message: 'Product ID required' }); return; }

    const { onHandQuantity, reservedQuantity, lowStockThreshold, reason } = req.body;

    const product = await adjustInventory(id, {
      onHandQuantity:   onHandQuantity   !== undefined ? Number(onHandQuantity)   : undefined,
      reservedQuantity: reservedQuantity !== undefined ? Number(reservedQuantity) : undefined,
      lowStockThreshold:lowStockThreshold!== undefined ? Number(lowStockThreshold): undefined,
      reason,
    });

    res.json({
      success: true,
      message: 'Inventory adjusted',
      data: {
        sku:              product.sku,
        onHandQuantity:   product.inventory.onHandQuantity,
        reservedQuantity: product.inventory.reservedQuantity,
        availableQuantity:product.inventory.availableQuantity,
        lowStockThreshold:product.inventory.lowStockThreshold,
      },
    });
  } catch (err) {
    logError('adjustInventory error', err);
    const msg = err instanceof Error ? err.message : 'Failed to adjust inventory';
    res.status(err instanceof Error && err.message === 'Product not found' ? 404 : 400)
      .json({ success: false, message: msg });
  }
};

// GET /api/products/sku/:sku
export const getProductBySkuHandler = async (req: Request, res: Response): Promise<void> => {
  try {
    const { sku } = req.params;
    if (!sku) {
      res.status(400).json({ success: false, message: 'SKU is required' });
      return;
    }

    const product = await getProductBySku(sku);

    if (!product) {
      res.status(404).json({ success: false, message: 'Product not found' });
      return;
    }

    res.json({ success: true, data: product });
  } catch (err) {
    logError('getProductBySku error', err);
    res.status(500).json({ success: false, message: 'Failed to fetch product' });
  }
};
