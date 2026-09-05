import { Wishlist } from '../models/Wishlist';
import mongoose from 'mongoose';

// ─── Get wishlist ─────────────────────────────────────────────────────────────
export const getWishlist = async (userId: string): Promise<any> => {
  const wishlist = await Wishlist.findOne({ user: userId })
    .populate('products', 'nameAr nameEn price compareAtPrice images ratings inventory.availableQuantity status');

  return wishlist ?? { user: userId, products: [] };
};

// ─── Add product ──────────────────────────────────────────────────────────────
export const addToWishlist = async (userId: string, productId: string): Promise<void> => {
  await Wishlist.findOneAndUpdate(
    { user: userId },
    { $addToSet: { products: new mongoose.Types.ObjectId(productId) } },
    { upsert: true, new: true }
  );
};

// ─── Remove product ───────────────────────────────────────────────────────────
export const removeFromWishlist = async (userId: string, productId: string): Promise<void> => {
  await Wishlist.findOneAndUpdate(
    { user: userId },
    { $pull: { products: new mongoose.Types.ObjectId(productId) } }
  );
};

// ─── Toggle (add if not there, remove if already there) ──────────────────────
export const toggleWishlist = async (
  userId:    string,
  productId: string
): Promise<{ added: boolean }> => {
  const wishlist = await Wishlist.findOne({ user: userId });
  const pid      = new mongoose.Types.ObjectId(productId);
  const exists   = wishlist?.products.some((p) => p.equals(pid));

  if (exists) {
    await removeFromWishlist(userId, productId);
    return { added: false };
  } else {
    await addToWishlist(userId, productId);
    return { added: true };
  }
};

// ─── Check if product is in wishlist ─────────────────────────────────────────
export const isInWishlist = async (userId: string, productId: string): Promise<boolean> => {
  const wishlist = await Wishlist.findOne({
    user:     userId,
    products: new mongoose.Types.ObjectId(productId),
  });
  return !!wishlist;
};

// ─── Clear wishlist ───────────────────────────────────────────────────────────
export const clearWishlist = async (userId: string): Promise<void> => {
  await Wishlist.findOneAndUpdate({ user: userId }, { products: [] });
};
