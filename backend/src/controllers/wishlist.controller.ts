import { Request, Response } from 'express';
import {
  getWishlist, addToWishlist, removeFromWishlist,
  toggleWishlist, clearWishlist, isInWishlist,
} from '../services/wishlist.service';
import { logError } from '../config/logger';

// Helper to transform populated products for frontend
const transformProduct = (p: any): any => {
  if (!p) return p;
  const doc = typeof p.toObject === 'function' ? p.toObject() : p;
  const images = Array.isArray(doc.images)
    ? doc.images
        .sort((a: any, b: any) => {
          if (a.isPrimary && !b.isPrimary) return -1;
          if (!a.isPrimary && b.isPrimary) return 1;
          return (a.order ?? 0) - (b.order ?? 0);
        })
        .map((img: any) => (typeof img === 'string' ? img : img.url))
        .filter(Boolean)
    : [];

  const cat = doc.category;
  const category = cat && typeof cat === 'object' ? {
    id:     (cat._id ?? cat.id)?.toString() ?? cat.slug,
    nameAr: cat.nameAr,
    nameEn: cat.nameEn,
    slug:   cat.slugEn ?? cat.slug,
  } : cat;

  return {
    ...doc,
    id:       (doc._id ?? doc.id)?.toString(),
    images,
    category,
    inventory: {
      onHandQuantity:   doc.inventory?.onHandQuantity   ?? 0,
      reservedQuantity: doc.inventory?.reservedQuantity ?? 0,
      availableQuantity: doc.inventory?.availableQuantity ?? 0,
      lowStockThreshold: doc.inventory?.lowStockThreshold ?? 5,
    },
    ratings: doc.ratings ?? { average: 0, count: 0 },
  };
};

// GET /api/wishlist
export const get = async (req: Request, res: Response): Promise<void> => {
  try {
    const wishlist = await getWishlist(req.user!.userId);
    const rawProducts = wishlist?.products ?? [];
    const products = Array.isArray(rawProducts) ? rawProducts.map(transformProduct) : [];
    res.json({
      success: true,
      data: {
        ...wishlist,
        products,
      },
    });
  } catch (err) {
    logError('getWishlist error', err);
    res.status(500).json({ success: false, message: 'Failed to fetch wishlist' });
  }
};

// POST /api/wishlist/:productId
export const add = async (req: Request, res: Response): Promise<void> => {
  try {
    const { productId } = req.params;
    if (!productId) { res.status(400).json({ success: false, message: 'productId required' }); return; }
    await addToWishlist(req.user!.userId, productId);
    res.status(201).json({ success: true, message: 'Added to wishlist' });
  } catch (err) {
    logError('addToWishlist error', err);
    res.status(500).json({ success: false, message: 'Failed to update wishlist' });
  }
};

// DELETE /api/wishlist/:productId
export const remove = async (req: Request, res: Response): Promise<void> => {
  try {
    const { productId } = req.params;
    if (!productId) { res.status(400).json({ success: false, message: 'productId required' }); return; }
    await removeFromWishlist(req.user!.userId, productId);
    res.json({ success: true, message: 'Removed from wishlist' });
  } catch (err) {
    logError('removeFromWishlist error', err);
    res.status(500).json({ success: false, message: 'Failed to update wishlist' });
  }
};

// POST /api/wishlist/:productId/toggle
export const toggle = async (req: Request, res: Response): Promise<void> => {
  try {
    const { productId } = req.params;
    if (!productId) { res.status(400).json({ success: false, message: 'productId required' }); return; }
    const result = await toggleWishlist(req.user!.userId, productId);
    res.json({
      success: true,
      message: result.added ? 'Added to wishlist' : 'Removed from wishlist',
      data: {
        added: result.added,
        inWishlist: result.added,
      },
    });
  } catch (err) {
    logError('toggleWishlist error', err);
    res.status(500).json({ success: false, message: 'Failed to update wishlist' });
  }
};

// GET /api/wishlist/:productId/check
export const check = async (req: Request, res: Response): Promise<void> => {
  try {
    const { productId } = req.params;
    if (!productId) { res.status(400).json({ success: false, message: 'productId required' }); return; }
    if (!req.user?.userId) {
      res.json({ success: true, data: { inWishlist: false } });
      return;
    }
    const inWishlist = await isInWishlist(req.user.userId, productId);
    res.json({ success: true, data: { inWishlist } });
  } catch (err) {
    logError('isInWishlist error', err);
    res.json({ success: true, data: { inWishlist: false } });
  }
};

// DELETE /api/wishlist
export const clear = async (req: Request, res: Response): Promise<void> => {
  try {
    await clearWishlist(req.user!.userId);
    res.json({ success: true, message: 'Wishlist cleared' });
  } catch (err) {
    logError('clearWishlist error', err);
    res.status(500).json({ success: false, message: 'Failed to clear wishlist' });
  }
};
