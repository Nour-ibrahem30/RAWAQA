import { Request, Response } from 'express';
import {
  getOrCreateCart,
  addItemToCart,
  updateCartItem,
  removeCartItem,
  clearCart,
  mergeGuestCart,
  validateCart,
} from '../services/cart.service';
import { logError } from '../config/logger';

// Get cart
export const getCart = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId    = req.user?.userId;
    let sessionId   = req.cookies?.cartSessionId || req.headers['x-cart-session-id'] as string;

    // Guest cart: generate a new session ID if none provided
    if (!userId && !sessionId) {
      const { v4: uuidv4 } = await import('uuid');
      sessionId = uuidv4();
      res.cookie('cartSessionId', sessionId, {
        httpOnly: true,
        maxAge:   7 * 24 * 60 * 60 * 1000, // 7 days
        sameSite: 'lax',
      });
    }

    const cart = await getOrCreateCart(userId, sessionId);

    res.status(200).json({
      success: true,
      data: cart,
    });
  } catch (error) {
    logError('Get cart error', error);
    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: 'Failed to get cart',
    });
  }
};

// Add item to cart
export const addItem = async (req: Request, res: Response): Promise<void> => {
  try {
    const { productId, quantity = 1 } = req.body;
    const userId = req.user?.userId;
    const sessionId = req.cookies.cartSessionId || req.headers['x-cart-session-id'];

    const cart = await getOrCreateCart(userId, sessionId as string);
    const updatedCart = await addItemToCart(cart._id.toString(), productId, quantity);

    res.status(200).json({
      success: true,
      message: 'Item added to cart',
      data: updatedCart,
    });
  } catch (error) {
    logError('Add item to cart error', error);
    
    if (error instanceof Error) {
      res.status(400).json({
        success: false,
        error: 'Bad Request',
        message: error.message,
      });
      return;
    }

    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: 'Failed to add item to cart',
    });
  }
};

// Update cart item
export const updateItem = async (req: Request, res: Response): Promise<void> => {
  try {
    const { productId } = req.params;
    const { quantity } = req.body;
    
    if (!productId) {
      res.status(400).json({
        success: false,
        error: 'Bad Request',
        message: 'Product ID is required',
      });
      return;
    }
    
    const userId = req.user?.userId;
    const sessionId = req.cookies.cartSessionId || req.headers['x-cart-session-id'];

    const cart = await getOrCreateCart(userId, sessionId as string);
    const updatedCart = await updateCartItem(cart._id.toString(), productId, quantity);

    res.status(200).json({
      success: true,
      message: 'Cart updated',
      data: updatedCart,
    });
  } catch (error) {
    logError('Update cart item error', error);
    
    if (error instanceof Error) {
      res.status(400).json({
        success: false,
        error: 'Bad Request',
        message: error.message,
      });
      return;
    }

    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: 'Failed to update cart',
    });
  }
};

// Remove item from cart
export const removeItem = async (req: Request, res: Response): Promise<void> => {
  try {
    const { productId } = req.params;
    
    if (!productId) {
      res.status(400).json({
        success: false,
        error: 'Bad Request',
        message: 'Product ID is required',
      });
      return;
    }
    
    const userId = req.user?.userId;
    const sessionId = req.cookies.cartSessionId || req.headers['x-cart-session-id'];

    const cart = await getOrCreateCart(userId, sessionId as string);
    const updatedCart = await removeCartItem(cart._id.toString(), productId);

    res.status(200).json({
      success: true,
      message: 'Item removed from cart',
      data: updatedCart,
    });
  } catch (error) {
    logError('Remove cart item error', error);
    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: 'Failed to remove item',
    });
  }
};

// Clear cart
export const clear = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.userId;
    const sessionId = req.cookies.cartSessionId || req.headers['x-cart-session-id'];

    const cart = await getOrCreateCart(userId, sessionId as string);
    const clearedCart = await clearCart(cart._id.toString());

    res.status(200).json({
      success: true,
      message: 'Cart cleared',
      data: clearedCart,
    });
  } catch (error) {
    logError('Clear cart error', error);
    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: 'Failed to clear cart',
    });
  }
};

// Merge guest cart (called after login)
export const merge = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: 'Unauthorized',
        message: 'Authentication required',
      });
      return;
    }

    const guestSessionId = req.body.guestSessionId || req.cookies.cartSessionId;

    if (!guestSessionId) {
      res.status(400).json({
        success: false,
        error: 'Bad Request',
        message: 'Guest session ID required',
      });
      return;
    }

    const cart = await mergeGuestCart(req.user.userId, guestSessionId);

    res.status(200).json({
      success: true,
      message: 'Carts merged successfully',
      data: cart,
    });
  } catch (error) {
    logError('Merge cart error', error);
    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: 'Failed to merge carts',
    });
  }
};

// Validate cart
export const validate = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.userId;
    const sessionId = req.cookies.cartSessionId || req.headers['x-cart-session-id'];

    const cart = await getOrCreateCart(userId, sessionId as string);
    const validation = await validateCart(cart._id.toString());

    res.status(200).json({
      success: true,
      data: validation,
    });
  } catch (error) {
    logError('Validate cart error', error);
    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: 'Failed to validate cart',
    });
  }
};
