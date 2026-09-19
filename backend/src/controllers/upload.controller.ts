import { Request, Response } from 'express';
import {
  buildFileUrl,
  deleteLocalFile,
  uploadToCloudinary,
  deleteFromCloudinary,
  isCloudinaryEnabled,
} from '../middleware/upload.middleware';
import { productRepository } from '../repositories/product.repository';
import { prisma } from '../lib/prisma';
import { logError } from '../config/logger';

// ─── Types ────────────────────────────────────────────────────────────────────

interface ResolvedImage {
  url:       string;
  publicId?: string;
  altEn:     string;
  isPrimary: boolean;
  order:     number;
}

// ─── Internal helpers ─────────────────────────────────────────────────────────

async function resolveUploadedFile(
  req: Request,
  file: Express.Multer.File,
  altEn: string,
  isPrimary: boolean,
  order: number
): Promise<ResolvedImage> {
  if (isCloudinaryEnabled()) {
    const result = await uploadToCloudinary(file);
    return { url: result.url, publicId: result.publicId, altEn, isPrimary, order };
  }
  return { url: buildFileUrl(req, file.filename), altEn, isPrimary, order };
}

async function removeImageFromStorage(image: { url: string; publicId?: string | null }): Promise<void> {
  if (isCloudinaryEnabled() && image.publicId) {
    await deleteFromCloudinary(image.publicId);
  } else {
    const filename = image.url.split('/').pop();
    if (filename) deleteLocalFile(filename);
  }
}

function cleanupLocalFiles(files: Express.Multer.File[]): void {
  if (!isCloudinaryEnabled()) {
    files.forEach((f) => deleteLocalFile(f.filename));
  }
}

// ─── POST /api/upload/products/:id/images ────────────────────────────────────

export const uploadProductImages = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = req.params['id'];
    const files = req.files as Express.Multer.File[];

    if (!id) {
      res.status(400).json({ success: false, message: 'Product ID is required' });
      return;
    }

    if (!files || files.length === 0) {
      res.status(400).json({ success: false, message: 'No files uploaded' });
      return;
    }

    // Verify product exists (Prisma / PostgreSQL)
    const product = await productRepository.findById(id, {
      includeImages: true,
      includeCategory: false,
      includeInventory: false,
    });

    if (!product) {
      cleanupLocalFiles(files);
      res.status(404).json({ success: false, message: 'Product not found' });
      return;
    }

    const existingCount = product.images?.length ?? 0;
    if (existingCount + files.length > 10) {
      cleanupLocalFiles(files);
      res.status(400).json({
        success: false,
        message: `Product already has ${existingCount} images. Max is 10.`,
      });
      return;
    }

    // Resolve each file (Cloudinary or local URL)
    const newImages = await Promise.all(
      files.map((file, idx) =>
        resolveUploadedFile(
          req,
          file,
          product.nameEn,
          existingCount === 0 && idx === 0, // first image of a product = primary
          existingCount + idx
        )
      )
    );

    // Persist via Prisma (PostgreSQL)
    await prisma.productImage.createMany({
      data: newImages.map((img) => ({
        productId: id,
        url:       img.url,
        publicId:  img.publicId ?? null,
        altEn:     img.altEn,
        isPrimary: img.isPrimary,
        order:     img.order,
      })),
    });

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

// ─── DELETE /api/upload/products/:id/images/:imageIndex ──────────────────────

export const deleteProductImage = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = req.params['id'];
    const imageIndex = req.params['imageIndex'];
    const idx = parseInt(imageIndex ?? '', 10);

    if (!id) {
      res.status(400).json({ success: false, message: 'Product ID is required' });
      return;
    }

    // Load product with images ordered by order ASC (Prisma default in findById)
    const product = await productRepository.findById(id, {
      includeImages: true,
      includeCategory: false,
      includeInventory: false,
    });

    if (!product) {
      res.status(404).json({ success: false, message: 'Product not found' });
      return;
    }

    const images = product.images ?? [];

    if (isNaN(idx) || idx < 0 || idx >= images.length) {
      res.status(400).json({ success: false, message: 'Invalid image index' });
      return;
    }

    const removed = images[idx]!;

    // Delete the image row from Prisma (PostgreSQL)
    await prisma.productImage.delete({ where: { id: removed.id } });

    // Remove from storage (Cloudinary or local)
    await removeImageFromStorage({ url: removed.url, publicId: removed.publicId });

    // Recompute order and primary status for remaining images
    const remaining = images.filter((_, i) => i !== idx);

    if (remaining.length > 0) {
      // If the deleted image was primary, promote the first remaining image
      if (removed.isPrimary) {
        await prisma.productImage.update({
          where: { id: remaining[0]!.id },
          data: { isPrimary: true },
        });
      }

      // Re-index order values to be contiguous (0, 1, 2 …)
      await Promise.all(
        remaining.map((img, i) =>
          prisma.productImage.update({
            where: { id: img.id },
            data:  { order: i },
          })
        )
      );
    }

    // Reload and return the updated image list
    const updated = await prisma.productImage.findMany({
      where:   { productId: id },
      orderBy: { order: 'asc' },
    });

    res.json({ success: true, message: 'Image deleted', data: updated });
  } catch (err) {
    logError('deleteProductImage error', err);
    res.status(500).json({ success: false, message: 'Failed to delete image' });
  }
};

// ─── PUT /api/upload/products/:id/images/:imageIndex/primary ─────────────────

export const setPrimaryImage = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = req.params['id'];
    const imageIndex = req.params['imageIndex'];
    const idx = parseInt(imageIndex ?? '', 10);

    if (!id) {
      res.status(400).json({ success: false, message: 'Product ID is required' });
      return;
    }

    const product = await productRepository.findById(id, {
      includeImages: true,
      includeCategory: false,
      includeInventory: false,
    });

    if (!product) {
      res.status(404).json({ success: false, message: 'Product not found' });
      return;
    }

    const images = product.images ?? [];

    if (isNaN(idx) || idx < 0 || idx >= images.length) {
      res.status(400).json({ success: false, message: 'Invalid image index' });
      return;
    }

    const target = images[idx]!;

    // Clear primary on all images for this product, then set the chosen one
    await prisma.productImage.updateMany({
      where: { productId: id },
      data:  { isPrimary: false },
    });
    await prisma.productImage.update({
      where: { id: target.id },
      data:  { isPrimary: true },
    });

    const updated = await prisma.productImage.findMany({
      where:   { productId: id },
      orderBy: { order: 'asc' },
    });

    res.json({ success: true, message: 'Primary image updated', data: updated });
  } catch (err) {
    logError('setPrimaryImage error', err);
    res.status(500).json({ success: false, message: 'Failed to update primary image' });
  }
};

// ─── POST /api/upload/direct ─────────────────────────────────────────────────
// Uploads images and returns URLs — no product association required.

export const uploadDirect = async (req: Request, res: Response): Promise<void> => {
  try {
    const files = req.files as Express.Multer.File[];

    if (!files || files.length === 0) {
      res.status(400).json({ success: false, message: 'No files uploaded' });
      return;
    }

    const uploaded = await Promise.all(
      files.map((file, idx) =>
        resolveUploadedFile(req, file, 'Product Image', idx === 0, idx)
      )
    );

    res.status(201).json({
      success: true,
      message: `${uploaded.length} image(s) uploaded successfully`,
      data: uploaded,
      urls: uploaded.map((u) => u.url),
    });
  } catch (err) {
    logError('uploadDirect error', err);
    res.status(500).json({ success: false, message: 'Direct upload failed' });
  }
};
