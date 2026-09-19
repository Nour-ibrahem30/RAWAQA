import { wishlistRepository } from '../repositories/wishlist.repository';
import { productRepository } from '../repositories/product.repository';

// Helper to resolve product ID from UUID or slug/sku
const resolveProductId = async (productId: string): Promise<string | null> => {
  const prod = await productRepository.findById(productId, { includeCategory: false, includeImages: false, includeInventory: false });
  if (prod) return prod.id;

  const bySlug = await productRepository.findBySlug(productId);
  if (bySlug) return bySlug.id;

  const bySku = await productRepository.findBySku(productId);
  return bySku ? bySku.id : null;
};

const formatProduct = (p: any) => ({
  ...p,
  _id: p.id,
  price: Number(p.price),
  compareAtPrice: p.compareAtPrice ? Number(p.compareAtPrice) : null,
  category: p.category ? { ...p.category, _id: p.category.id } : null,
});

// ─── Get wishlist ─────────────────────────────────────────────────────────────
export const getWishlist = async (userId: string): Promise<any> => {
  const wishlist = await wishlistRepository.findByUserId(userId);
  if (!wishlist) {
    return { id: '', _id: '', user: userId, products: [] };
  }

  return {
    ...wishlist,
    _id: wishlist.id,
    user: wishlist.userId,
    products: wishlist.products.map(formatProduct),
  };
};

// ─── Add product ──────────────────────────────────────────────────────────────
export const addToWishlist = async (userId: string, productId: string): Promise<void> => {
  const pid = await resolveProductId(productId);
  if (!pid) return;

  await wishlistRepository.addProduct(userId, pid);
};

// ─── Remove product ───────────────────────────────────────────────────────────
export const removeFromWishlist = async (userId: string, productId: string): Promise<void> => {
  const pid = await resolveProductId(productId);
  if (!pid) return;

  await wishlistRepository.removeProduct(userId, pid);
};

// ─── Toggle (add if not there, remove if already there) ──────────────────────
export const toggleWishlist = async (
  userId: string,
  productId: string
): Promise<{ added: boolean }> => {
  const pid = await resolveProductId(productId);
  if (!pid) return { added: false };

  const wishlist = await wishlistRepository.findByUserId(userId);
  const exists = wishlist?.products.some((p) => p.id === pid);

  if (exists) {
    await wishlistRepository.removeProduct(userId, pid);
    return { added: false };
  } else {
    await wishlistRepository.addProduct(userId, pid);
    return { added: true };
  }
};

// ─── Check if product is in wishlist ─────────────────────────────────────────
export const isInWishlist = async (userId: string, productId: string): Promise<boolean> => {
  const pid = await resolveProductId(productId);
  if (!pid) return false;

  const wishlist = await wishlistRepository.findByUserId(userId);
  return !!wishlist?.products.some((p) => p.id === pid);
};

// ─── Clear wishlist ───────────────────────────────────────────────────────────
export const clearWishlist = async (userId: string): Promise<void> => {
  await wishlistRepository.clear(userId);
};
