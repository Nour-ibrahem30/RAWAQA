import { Request, Response } from 'express';
import { buildFileUrl, deleteLocalFile } from '../middleware/upload.middleware';
import { Product } from '../models/Product';
import { logError } from '../config/logger';

// POST /api/upload/products/:id/images
// Upload 1-5 images for a product
export const uploadProductImages = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const files  = req.files as Express.Multer.File[];

    if (!files || files.length === 0) {
      res.status(400).json({ success: false, message: 'No files uploaded' });
      return;
    }

    const product = await Product.findById(id);
    if (!product) {
      // Clean up uploaded files if product not found
      files.forEach((f) => deleteLocalFile(f.filename));
      res.status(404).json({ success: false, message: 'Product not found' });
      return;
    }

    // Max 10 images per product
    if (product.images.length + files.length > 10) {
      files.forEach((f) => deleteLocalFile(f.filename));
      res.status(400).json({
        success: false,
        message: `Product already has ${product.images.length} images. Max is 10.`,
      });
      return;
    }

    const newImages = files.map((file, idx) => ({
      url:       buildFileUrl(req, file.filename),
      alt:       product.nameEn,
      isPrimary: product.images.length === 0 && idx === 0,  // first image = primary
      order:     product.images.length + idx,
    }));

    product.images.push(...newImages);
    await product.save();

    res.status(201).json({
      success: true,
      message: `${files.length} image(s) uploaded`,
      data:    newImages,
    });
  } catch (err) {
    logError('uploadProductImages error', err);
    res.status(500).json({ success: false, message: 'Upload failed' });
  }
};

// DELETE /api/upload/products/:id/images/:imageIndex
export const deleteProductImage = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id, imageIndex } = req.params;
    const idx = parseInt(imageIndex ?? '');

    const product = await Product.findById(id);
    if (!product) {
      res.status(404).json({ success: false, message: 'Product not found' });
      return;
    }

    if (isNaN(idx) || idx < 0 || idx >= product.images.length) {
      res.status(400).json({ success: false, message: 'Invalid image index' });
      return;
    }

    const removed = product.images[idx];
    product.images.splice(idx, 1);

    // If deleted image was primary, promote first remaining image
    if (removed?.isPrimary && product.images.length > 0) {
      product.images[0]!.isPrimary = true;
    }

    // Re-index order
    product.images.forEach((img, i) => { img.order = i; });

    await product.save();

    // Delete local file
    const filename = removed?.url.split('/').pop();
    if (filename) deleteLocalFile(filename);

    res.json({ success: true, message: 'Image deleted', data: product.images });
  } catch (err) {
    logError('deleteProductImage error', err);
    res.status(500).json({ success: false, message: 'Failed to delete image' });
  }
};

// PUT /api/upload/products/:id/images/:imageIndex/primary
export const setPrimaryImage = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id, imageIndex } = req.params;
    const idx = parseInt(imageIndex ?? '');

    const product = await Product.findById(id);
    if (!product) {
      res.status(404).json({ success: false, message: 'Product not found' });
      return;
    }

    if (isNaN(idx) || idx < 0 || idx >= product.images.length) {
      res.status(400).json({ success: false, message: 'Invalid image index' });
      return;
    }

    product.images.forEach((img, i) => { img.isPrimary = i === idx; });
    await product.save();

    res.json({ success: true, message: 'Primary image updated', data: product.images });
  } catch (err) {
    logError('setPrimaryImage error', err);
    res.status(500).json({ success: false, message: 'Failed to update primary image' });
  }
};
