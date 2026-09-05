import { Request, Response } from 'express';
import {
  getWishlist, addToWishlist, removeFromWishlist,
  toggleWishlist, clearWishlist, isInWishlist,
} from '../services/wishlist.service';
import { logError } from '../config/logger';

// GET /api/wishlist
export const get = async (req: Request, res: Response): Promise<void> => {
  try {
    const wishlist = await getWishlist(req.user!.userId);
    res.json({ success: true, data: wishlist });
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
      data:    result,
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
    const inWishlist = await isInWishlist(req.user!.userId, productId);
    res.json({ success: true, data: { inWishlist } });
  } catch (err) {
    logError('isInWishlist error', err);
    res.status(500).json({ success: false, message: 'Failed to check wishlist' });
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
