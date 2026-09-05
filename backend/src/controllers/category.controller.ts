import { Request, Response } from 'express';
import {
  getCategories,
  getCategoryById,
  getCategoryBySlug,
  getCategoryWithProducts,
  createCategory,
  updateCategory,
  deleteCategory,
  reorderCategories,
} from '../services/category.service';
import { logError } from '../config/logger';

/**
 * GET /api/categories
 * Get all categories
 */
export const listCategories = async (_req: Request, res: Response): Promise<void> => {
  try {
    const categories = await getCategories();

    res.status(200).json({
      success: true,
      data: categories,
    });
  } catch (error) {
    logError('List categories error', error);
    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: 'Failed to fetch categories',
    });
  }
};

/**
 * GET /api/categories/:id
 * Get single category by ID
 */
export const getCategory = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    
    if (!id) {
      res.status(400).json({
        success: false,
        error: 'Bad Request',
        message: 'Category ID is required',
      });
      return;
    }

    const category = await getCategoryById(id);

    if (!category) {
      res.status(404).json({
        success: false,
        error: 'Not Found',
        message: 'Category not found',
      });
      return;
    }

    res.status(200).json({
      success: true,
      data: category,
    });
  } catch (error) {
    logError('Get category error', error);
    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: 'Failed to fetch category',
    });
  }
};

/**
 * GET /api/categories/slug/:slug
 * Get category by slug
 */
export const getCategoryBySlugHandler = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { slug } = req.params;
    
    if (!slug) {
      res.status(400).json({
        success: false,
        error: 'Bad Request',
        message: 'Category slug is required',
      });
      return;
    }

    const locale = (req.query.locale as 'ar' | 'en') || 'en';
    const category = await getCategoryBySlug(slug, locale);

    if (!category) {
      res.status(404).json({
        success: false,
        error: 'Not Found',
        message: 'Category not found',
      });
      return;
    }

    res.status(200).json({
      success: true,
      data: category,
    });
  } catch (error) {
    logError('Get category by slug error', error);
    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: 'Failed to fetch category',
    });
  }
};

/**
 * GET /api/categories/:id/products
 * Get category with products
 */
export const getCategoryProducts = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;
    
    if (!id) {
      res.status(400).json({
        success: false,
        error: 'Bad Request',
        message: 'Category ID is required',
      });
      return;
    }

    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;

    const result = await getCategoryWithProducts(id, page, limit);

    if (!result.category) {
      res.status(404).json({
        success: false,
        error: 'Not Found',
        message: 'Category not found',
      });
      return;
    }

    res.status(200).json({
      success: true,
      data: {
        category: result.category,
        products: result.products,
        pagination: {
          page,
          limit,
          total: result.total,
          pages: Math.ceil(result.total / limit),
        },
      },
    });
  } catch (error) {
    logError('Get category products error', error);
    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: 'Failed to fetch category products',
    });
  }
};

/**
 * POST /api/categories
 * Create new category (Admin only)
 */
export const createCategoryHandler = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const category = await createCategory(req.body);

    res.status(201).json({
      success: true,
      message: 'Category created successfully',
      data: category,
    });
  } catch (error) {
    logError('Create category error', error);

    if (error instanceof Error && error.message.includes('already exists')) {
      res.status(400).json({
        success: false,
        error: 'Bad Request',
        message: error.message,
      });
      return;
    }

    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: 'Failed to create category',
    });
  }
};

/**
 * PUT /api/categories/:id
 * Update category (Admin only)
 */
export const updateCategoryHandler = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;
    
    if (!id) {
      res.status(400).json({
        success: false,
        error: 'Bad Request',
        message: 'Category ID is required',
      });
      return;
    }

    const category = await updateCategory(id, req.body);

    if (!category) {
      res.status(404).json({
        success: false,
        error: 'Not Found',
        message: 'Category not found',
      });
      return;
    }

    res.status(200).json({
      success: true,
      message: 'Category updated successfully',
      data: category,
    });
  } catch (error) {
    logError('Update category error', error);

    if (
      error instanceof Error &&
      (error.message.includes('not found') || error.message.includes('already exists'))
    ) {
      res.status(400).json({
        success: false,
        error: 'Bad Request',
        message: error.message,
      });
      return;
    }

    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: 'Failed to update category',
    });
  }
};

/**
 * DELETE /api/categories/:id
 * Delete category (Admin only)
 */
export const deleteCategoryHandler = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;
    
    if (!id) {
      res.status(400).json({
        success: false,
        error: 'Bad Request',
        message: 'Category ID is required',
      });
      return;
    }

    const category = await deleteCategory(id);

    if (!category) {
      res.status(404).json({
        success: false,
        error: 'Not Found',
        message: 'Category not found',
      });
      return;
    }

    res.status(200).json({
      success: true,
      message: 'Category deleted successfully',
      data: category,
    });
  } catch (error) {
    logError('Delete category error', error);

    if (error instanceof Error && error.message.includes('Cannot delete')) {
      res.status(400).json({
        success: false,
        error: 'Bad Request',
        message: error.message,
      });
      return;
    }

    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: 'Failed to delete category',
    });
  }
};

/**
 * POST /api/categories/reorder
 * Reorder categories (Admin only)
 */
export const reorderCategoriesHandler = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { categories } = req.body;

    if (!Array.isArray(categories)) {
      res.status(400).json({
        success: false,
        error: 'Bad Request',
        message: 'Categories array is required',
      });
      return;
    }

    await reorderCategories(categories);

    res.status(200).json({
      success: true,
      message: 'Categories reordered successfully',
    });
  } catch (error) {
    logError('Reorder categories error', error);
    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: 'Failed to reorder categories',
    });
  }
};
