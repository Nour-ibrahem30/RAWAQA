import { Wishlist } from '../models/Wishlist';
import { Product } from '../models/Product';
import mongoose from 'mongoose';

// Helper to resolve product ObjectId from id or slug/sku
const resolveProductId = async (productId: string): Promise<mongoose.Types.ObjectId | null> => {
  if (mongoose.Types.ObjectId.isValid(productId)) {
    return new mongoose.Types.ObjectId(productId);
  }
  const prod = await Product.findOne({
    $or: [{ slugEn: productId }, { slugAr: productId }, { sku: productId }],
  }).select('_id');
  return prod ? (prod._id as mongoose.Types.ObjectId) : null;
};

// ─── Get wishlist ─────────────────────────────────────────────────────────────
export const getWishlist = async (userId: string): Promise<any> => {
  const wishlist = await Wishlist.findOne({ user: userId })
    .populate('products', 'nameAr nameEn price compareAtPrice images ratings inventory.availableQuantity status');

  return wishlist ?? { user: userId, products: [] };
};

// ─── Add product ──────────────────────────────────────────────────────────────
export const addToWishlist = async (userId: string, productId: string): Promise<void> => {
  const pid = await resolveProductId(productId);
  if (!pid) return;

  await Wishlist.findOneAndUpdate(
    { user: userId },
    { $addToSet: { products: pid } },
    { upsert: true, new: true }
  );
};

// ─── Remove product ───────────────────────────────────────────────────────────
export const removeFromWishlist = async (userId: string, productId: string): Promise<void> => {
  const pid = await resolveProductId(productId);
  if (!pid) return;

  await Wishlist.findOneAndUpdate(
    { user: userId },
    { $pull: { products: pid } }
  );
};

// ─── Toggle (add if not there, remove if already there) ──────────────────────
export const toggleWishlist = async (
  userId:    string,
  productId: string
): Promise<{ added: boolean }> => {
  const pid = await resolveProductId(productId);
  if (!pid) return { added: false };

  const wishlist = await Wishlist.findOne({ user: userId });
  const exists   = wishlist?.products.some((p) => p.equals(pid));

  if (exists) {
    await removeFromWishlist(userId, pid.toString());
    return { added: false };
  } else {
    await addToWishlist(userId, pid.toString());
    return { added: true };
  }
};

// ─── Check if product is in wishlist ─────────────────────────────────────────
export const isInWishlist = async (userId: string, productId: string): Promise<boolean> => {
  const pid = await resolveProductId(productId);
  if (!pid) return false;

  const wishlist = await Wishlist.findOne({
    user:     userId,
    products: pid,
  });
  return !!wishlist;
};

// ─── Clear wishlist ───────────────────────────────────────────────────────────
export const clearWishlist = async (userId: string): Promise<void> => {
  await Wishlist.findOneAndUpdate({ user: userId }, { products: [] });
};
