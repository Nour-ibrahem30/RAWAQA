import { Request, Response } from 'express';
import {
  buildFileUrl,
  deleteLocalFile,
  uploadToCloudinary,
  deleteFromCloudinary,
  isCloudinaryEnabled,
} from '../middleware/upload.middleware';
import { Product } from '../models/Product';
import { logError } from '../config/logger';

// ─── Helper: resolve a single file to a URL ──────────────────────────────────

interface ResolvedImage {
  url:      string;
  publicId?: string;
  alt:      string;
  isPrimary: boolean;
  order:    number;
}

async function resolveUploadedFile(
  req: Request,
  file: Express.Multer.File,
  alt: string,
  isPrimary: boolean,
  order: number
): Promise<ResolvedImage> {
  if (isCloudinaryEnabled()) {
    const result = await uploadToCloudinary(file);
    return { url: result.url, publicId: result.publicId, alt, isPrimary, order };
  }
  return { url: buildFileUrl(req, file.filename), alt, isPrimary, order };
}

// ─── Helper: delete an image by URL / publicId ────────────────────────────────

async function deleteImage(image: { url: string; publicId?: string }): Promise<void> {
  if (isCloudinaryEnabled() && image.publicId) {
    await deleteFromCloudinary(image.publicId);
  } else {
    const filename = image.url.split('/').pop();
    if (filename) deleteLocalFile(filename);
  }
}

// ─── Controllers ─────────────────────────────────────────────────────────────

// POST /api/upload/products/:id/images
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
      // Clean up: if local storage, delete the written files
      if (!isCloudinaryEnabled()) {
        files.forEach((f) => deleteLocalFile(f.filename));
      }
      res.status(404).json({ success: false, message: 'Product not found' });
      return;
    }

    if (product.images.length + files.length > 10) {
      if (!isCloudinaryEnabled()) {
        files.forEach((f) => deleteLocalFile(f.filename));
      }
      res.status(400).json({
        success: false,
        message: `Product already has ${product.images.length} images. Max is 10.`,
      });
      return;
    }

    // Resolve each file (upload to Cloudinary or build local URL)
    const newImages: ResolvedImage[] = await Promise.all(
      files.map((file, idx) =>
        resolveUploadedFile(
          req,
          file,
          product.nameEn,
          product.images.length === 0 && idx === 0,
          product.images.length + idx
        )
      )
    );

    product.images.push(...(newImages as any));
    await product.save();

    res.status(201).json({
      success: true,
      message: `${files.length} image(s) uploaded`,
      data: newImages,
      storage: isCloudinaryEnabled() ? 'cloudinary' : 'local',
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

    if (removed?.isPrimary && product.images.length > 0) {
      product.images[0]!.isPrimary = true;
    }

    product.images.forEach((img, i) => { img.order = i; });
    await product.save();

    // Delete from storage (Cloudinary or local)
    if (removed) {
      await deleteImage({ url: removed.url, publicId: (removed as any).publicId });
    }

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
