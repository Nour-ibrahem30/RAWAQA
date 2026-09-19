/**
 * cart.service.ts — PostgreSQL/Prisma implementation
 * All business logic preserved exactly from the Mongoose version.
 * Guest carts (sessionId), authenticated carts (userId), merge, validate — all intact.
 */

import { Prisma }          from '../generated/prisma/client';
import { cartRepository }  from '../repositories/cart.repository';
import { prisma }          from '../lib/prisma';
import { env }             from '../config/env';
import { normalisePrismaProduct } from './product.service';

// ─── Cart shape for callers ────────────────────────────────────────────────────
// The controller expects an object shaped like the old ICart Mongoose doc.
// We normalise to that shape here so no controller changes are needed.
const normaliseCart = (cart: any): any => {
  if (!cart) return cart;
  const items = (cart.items ?? []).map((item: any) => ({
    ...item,
    // product may be populated (CartWithDetails) or just an id string
    product: item.product
      ? normalisePrismaProduct(item.product)
      : item.productId,
    price:   Number(item.price ?? 0),
    // mimic Mongoose _id on item
    _id: item.id,
  }));

  return {
    ...cart,
    _id:       cart.id,
    id:        cart.id,
    subtotal:  Number(cart.subtotal ?? 0),
    itemCount: cart.itemCount ?? items.reduce((s: number, i: any) => s + i.quantity, 0),
    items,
  };
};

// ─── Product resolution helper ────────────────────────────────────────────────
// Resolves by UUID → slugAr/slugEn → SKU, mirrors Mongoose findProductSafely.
const findProductSafely = async (identifier: string): Promise<any | null> => {
  // Try UUID
  let prod = await prisma.product.findUnique({
    where: { id: identifier },
    include: { inventory: true },
  }).catch(() => null);

  if (!prod) {
    prod = await prisma.product.findFirst({
      where: {
        OR: [
          { slugAr: identifier },
          { slugEn: identifier },
          { sku:    identifier.toUpperCase() },
        ],
      },
      include: { inventory: true },
    }).catch(() => null);
  }
  return prod;
};

// ─── getOrCreateCart ──────────────────────────────────────────────────────────
export const getOrCreateCart = async (
  userId?:   string,
  sessionId?: string
): Promise<any> => {
  if (!userId && !sessionId) {
    throw new Error('Either userId or sessionId is required');
  }

  // Try to find existing cart
  let cart: any = null;
  if (userId) {
    cart = await cartRepository.findByUserId(userId);
  } else if (sessionId) {
    cart = await cartRepository.findBySessionId(sessionId);
  }

  if (!cart) {
    const expiresAt = sessionId
      ? new Date(Date.now() + (env.CART_GUEST_SESSION_EXPIRY_DAYS ?? 7) * 24 * 60 * 60 * 1000)
      : undefined;

    cart = await cartRepository.create({ userId, sessionId, expiresAt });
  }

  return normaliseCart(cart);
};

// ─── addItemToCart ────────────────────────────────────────────────────────────
export const addItemToCart = async (
  cartId:    string,
  productId: string,
  quantity:  number
): Promise<any> => {
  const cart = await cartRepository.findById(cartId);
  if (!cart) throw new Error('Cart not found');

  const product = await findProductSafely(productId);
  if (!product) throw new Error('Product not found');

  const inv = product.inventory;
  const isInStock = (inv?.availableQuantity ?? 0) > 0 || (inv?.allowBackorder ?? false);
  if (!isInStock) throw new Error('Product is out of stock');

  // Check max quantity — account for already-in-cart quantity
  const existingItem = cart.items.find(
    (i: any) => i.productId === product.id
  );
  const newQty = (existingItem?.quantity ?? 0) + quantity;
  const maxQty = env.CART_ITEM_MAX_QUANTITY ?? 99;
  if (newQty > maxQty) throw new Error(`Maximum quantity is ${maxQty}`);

  await cartRepository.addItem({
    cartId,
    productId: product.id,
    quantity,
    price: Number(product.price),
  });

  const updated = await cartRepository.findById(cartId);
  return normaliseCart(updated);
};

// ─── updateCartItem ───────────────────────────────────────────────────────────
export const updateCartItem = async (
  cartId:    string,
  productId: string,
  quantity:  number
): Promise<any> => {
  const cart = await cartRepository.findById(cartId);
  if (!cart) throw new Error('Cart not found');

  // Resolve to canonical product UUID (handles slug/SKU lookup)
  const product    = await findProductSafely(productId);
  const targetId   = product?.id ?? productId;

  // Verify item is in cart
  const item = cart.items.find(
    (i: any) => i.productId === targetId || i.productId === productId
  );
  if (!item) throw new Error('Item not found in cart');

  if (quantity <= 0) {
    // Remove the item (mirrors Mongoose behaviour)
    await cartRepository.removeItem(cartId, targetId);
  } else {
    const maxQty = env.CART_ITEM_MAX_QUANTITY ?? 99;
    if (quantity > maxQty) throw new Error(`Maximum quantity is ${maxQty}`);

    // Enforce stock availability
    if (product?.inventory) {
      const avail = product.inventory.availableQuantity ?? 0;
      const allowBackorder = product.inventory.allowBackorder ?? false;
      if (!allowBackorder && quantity > avail) {
        throw new Error(`Only ${avail} units of ${product.nameEn} available`);
      }
    }

    await cartRepository.updateItemQuantity(cartId, targetId, quantity);
  }

  const updated = await cartRepository.findById(cartId);
  return normaliseCart(updated);
};

// ─── removeCartItem ───────────────────────────────────────────────────────────
export const removeCartItem = async (
  cartId:    string,
  productId: string
): Promise<any> => {
  const cart = await cartRepository.findById(cartId);
  if (!cart) throw new Error('Cart not found');

  const product  = await findProductSafely(productId);
  const targetId = product?.id ?? productId;

  await cartRepository.removeItem(cartId, targetId);

  const updated = await cartRepository.findById(cartId);
  return normaliseCart(updated);
};

// ─── clearCart ────────────────────────────────────────────────────────────────
export const clearCart = async (cartId: string): Promise<any> => {
  const cart = await cartRepository.findById(cartId);
  if (!cart) throw new Error('Cart not found');

  await cartRepository.clearCart(cartId);

  const updated = await cartRepository.findById(cartId);
  return normaliseCart(updated);
};

// ─── mergeGuestCart ───────────────────────────────────────────────────────────
export const mergeGuestCart = async (
  userId:         string,
  guestSessionId: string
): Promise<any> => {
  const guestCart = await cartRepository.findBySessionId(guestSessionId);

  // No guest cart or empty → return/create user cart
  if (!guestCart || guestCart.items.length === 0) {
    return getOrCreateCart(userId);
  }

  let userCart = await cartRepository.findByUserId(userId);

  if (!userCart) {
    // Reassign guest cart to authenticated user
    await prisma.cart.update({
      where: { id: guestCart.id },
      data:  {
        userId,
        sessionId: null,
        expiresAt: null,
      },
    });
    const converted = await cartRepository.findByUserId(userId);
    return normaliseCart(converted);
  }

  // Merge items from guest into user cart
  const maxQty = env.CART_ITEM_MAX_QUANTITY ?? 99;
  for (const guestItem of guestCart.items) {
    const existingItem = userCart.items.find(
      (i: any) => i.productId === guestItem.productId
    );
    if (existingItem) {
      const merged = Math.min(existingItem.quantity + guestItem.quantity, maxQty);
      await cartRepository.updateItemQuantity(userCart.id, guestItem.productId, merged);
    } else {
      await cartRepository.addItem({
        cartId:    userCart.id,
        productId: guestItem.productId,
        quantity:  guestItem.quantity,
        price:     Number(guestItem.price),
      });
    }
  }

  // Delete guest cart
  await prisma.cart.delete({ where: { id: guestCart.id } }).catch(() => {});

  const merged = await cartRepository.findByUserId(userId);
  return normaliseCart(merged);
};

// ─── validateCart ─────────────────────────────────────────────────────────────
// Checks stock for every item. Updates price if it has changed. Returns error list.
export const validateCart = async (
  cartId: string
): Promise<{ valid: boolean; errors: string[] }> => {
  const cart = await cartRepository.findById(cartId);
  if (!cart) return { valid: false, errors: ['Cart not found'] };

  const errors: string[] = [];

  for (const item of cart.items) {
    const prod = item.product as any;
    if (!prod) {
      errors.push('Product not found');
      continue;
    }

    const inv   = prod.inventory;
    const avail = inv?.availableQuantity ?? 0;
    const allow = inv?.allowBackorder    ?? false;

    if (avail <= 0 && !allow) {
      errors.push(`${prod.nameEn} is out of stock`);
    } else if (!allow && item.quantity > avail) {
      errors.push(`Only ${avail} units of ${prod.nameEn} available`);
    }

    // Sync price if it changed
    const currentPrice = Number(prod.price ?? 0);
    if (Number(item.price) !== currentPrice) {
      await prisma.cartItem.update({
        where: { id: item.id },
        data:  { price: new Prisma.Decimal(currentPrice.toFixed(2)) },
      }).catch(() => {});
    }
  }

  if (errors.length === 0) {
    await cartRepository.recalculateTotals(cartId);
  }

  return { valid: errors.length === 0, errors };
};
