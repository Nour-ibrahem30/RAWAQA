import { Router } from 'express';
import { authenticate, requireAdmin } from '../middleware/auth.middleware';
import { upload, handleMulterError } from '../middleware/upload.middleware';
import {
  uploadProductImages,
  deleteProductImage,
  setPrimaryImage,
} from '../controllers/upload.controller';

const router = Router();

// All upload routes require admin
router.use(authenticate, requireAdmin);

/**
 * POST /api/upload/products/:id/images
 * Upload up to 5 images for a product
 */
router.post(
  '/products/:id/images',
  upload.array('images', 5),
  uploadProductImages,
  handleMulterError
);

/**
 * DELETE /api/upload/products/:id/images/:imageIndex
 * Remove a product image by index
 */
router.delete('/products/:id/images/:imageIndex', deleteProductImage);

/**
 * PUT /api/upload/products/:id/images/:imageIndex/primary
 * Set an image as the primary product image
 */
router.put('/products/:id/images/:imageIndex/primary', setPrimaryImage);

export default router;
