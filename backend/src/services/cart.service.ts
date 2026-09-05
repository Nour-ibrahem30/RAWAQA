import { Cart, ICart } from '../models/Cart';
import { Product } from '../models/Product';
import { env } from '../config/env';

// Get or create cart
export const getOrCreateCart = async (
  userId?: string,
  sessionId?: string
): Promise<ICart> => {
  if (!userId && !sessionId) {
    throw new Error('Either userId or sessionId is required');
  }

  const filter = userId ? { userId } : { sessionId };
  let cart = await Cart.findOne(filter).populate('items.product');

  if (!cart) {
    const expiresAt = sessionId
      ? new Date(Date.now() + env.CART_GUEST_SESSION_EXPIRY_DAYS * 24 * 60 * 60 * 1000)
      : undefined;

    cart = await Cart.create({
      userId,
      sessionId,
      items: [],
      expiresAt,
    });
  }

  return cart;
};

// Add item to cart
export const addItemToCart = async (
  cartId: string,
  productId: string,
  quantity: number
): Promise<ICart> => {
  const cart = await Cart.findById(cartId);
  if (!cart) {
    throw new Error('Cart not found');
  }

  // Validate product
  const product = await Product.findById(productId);
  if (!product) {
    throw new Error('Product not found');
  }

  if (!product.isInStock()) {
    throw new Error('Product is out of stock');
  }

  // Check if already in cart
  const existingItem = cart.items.find(
    (item) => item.product.toString() === productId
  );

  if (existingItem) {
    // Update quantity
    existingItem.quantity += quantity;
    
    // Check max quantity
    if (existingItem.quantity > env.CART_ITEM_MAX_QUANTITY) {
      throw new Error(`Maximum quantity is ${env.CART_ITEM_MAX_QUANTITY}`);
    }
  } else {
    // Add new item
    cart.items.push({
      product: product._id,
      quantity,
      price: product.price,
      addedAt: new Date(),
    } as any);
  }

  await cart.save();
  await cart.populate('items.product');

  return cart;
};

// Update item quantity
export const updateCartItem = async (
  cartId: string,
  productId: string,
  quantity: number
): Promise<ICart> => {
  const cart = await Cart.findById(cartId);
  if (!cart) {
    throw new Error('Cart not found');
  }

  const item = cart.items.find((item) => item.product.toString() === productId);
  if (!item) {
    throw new Error('Item not found in cart');
  }

  if (quantity <= 0) {
    // Remove item
    cart.items = cart.items.filter((item) => item.product.toString() !== productId);
  } else {
    // Update quantity
    if (quantity > env.CART_ITEM_MAX_QUANTITY) {
      throw new Error(`Maximum quantity is ${env.CART_ITEM_MAX_QUANTITY}`);
    }
    item.quantity = quantity;
  }

  await cart.save();
  await cart.populate('items.product');

  return cart;
};

// Remove item from cart
export const removeCartItem = async (
  cartId: string,
  productId: string
): Promise<ICart> => {
  const cart = await Cart.findById(cartId);
  if (!cart) {
    throw new Error('Cart not found');
  }

  cart.items = cart.items.filter((item) => item.product.toString() !== productId);

  await cart.save();
  await cart.populate('items.product');

  return cart;
};

// Clear cart
export const clearCart = async (cartId: string): Promise<ICart> => {
  const cart = await Cart.findById(cartId);
  if (!cart) {
    throw new Error('Cart not found');
  }

  cart.items = [];
  await cart.save();

  return cart;
};

// Merge guest cart into authenticated cart
export const mergeGuestCart = async (
  userId: string,
  guestSessionId: string
): Promise<ICart> => {
  // Get guest cart
  const guestCart = await Cart.findOne({ sessionId: guestSessionId });
  
  if (!guestCart || guestCart.items.length === 0) {
    // No guest cart or empty, return or create user cart
    return getOrCreateCart(userId);
  }

  // Get or create user cart
  let userCart = await Cart.findOne({ userId });
  
  if (!userCart) {
    // Convert guest cart to user cart
    guestCart.userId = userId as any;
    guestCart.sessionId = undefined;
    guestCart.expiresAt = undefined;
    await guestCart.save();
    return guestCart;
  }

  // Merge items
  for (const guestItem of guestCart.items) {
    const existingItem = userCart.items.find(
      (item) => item.product.toString() === guestItem.product.toString()
    );

    if (existingItem) {
      // Add quantities
      existingItem.quantity = Math.min(
        existingItem.quantity + guestItem.quantity,
        env.CART_ITEM_MAX_QUANTITY
      );
    } else {
      // Add new item
      userCart.items.push(guestItem);
    }
  }

  await userCart.save();
  await userCart.populate('items.product');

  // Delete guest cart
  await Cart.findByIdAndDelete(guestCart._id);

  return userCart;
};

// Validate cart (check stock availability)
export const validateCart = async (cartId: string): Promise<{
  valid: boolean;
  errors: string[];
}> => {
  const cart = await Cart.findById(cartId).populate('items.product');
  if (!cart) {
    return { valid: false, errors: ['Cart not found'] };
  }

  const errors: string[] = [];

  for (const item of cart.items) {
    const product = item.product as any;
    
    if (!product) {
      errors.push(`Product not found`);
      continue;
    }

    if (!product.isInStock()) {
      errors.push(`${product.nameEn} is out of stock`);
    } else if (product.inventory.availableQuantity < item.quantity) {
      errors.push(
        `Only ${product.inventory.availableQuantity} units of ${product.nameEn} available`
      );
    }

    // Check if price changed
    if (item.price !== product.price) {
      item.price = product.price;
    }
  }

  if (errors.length > 0) {
    return { valid: false, errors };
  }

  await cart.save();
  return { valid: true, errors: [] };
};
