import { Router } from 'express';
import {
  getCart,
  addItem,
  updateItem,
  removeItem,
  clear,
  merge,
  validate,
} from '../controllers/cart.controller';
import { optionalAuth, authenticate } from '../middleware/auth.middleware';

const router = Router();

/**
 * @route   GET /api/cart
 * @desc    Get cart (guest or authenticated)
 * @access  Public (optional auth)
 */
router.get('/', optionalAuth, getCart);

/**
 * @route   POST /api/cart/items
 * @desc    Add item to cart
 * @access  Public (optional auth)
 */
router.post('/items', optionalAuth, addItem);

/**
 * @route   PUT /api/cart/items/:productId
 * @desc    Update cart item quantity
 * @access  Public (optional auth)
 */
router.put('/items/:productId', optionalAuth, updateItem);

/**
 * @route   DELETE /api/cart/items/:productId
 * @desc    Remove item from cart
 * @access  Public (optional auth)
 */
router.delete('/items/:productId', optionalAuth, removeItem);

/**
 * @route   DELETE /api/cart
 * @desc    Clear cart
 * @access  Public (optional auth)
 */
router.delete('/', optionalAuth, clear);

/**
 * @route   POST /api/cart/merge
 * @desc    Merge guest cart into authenticated cart
 * @access  Private
 */
router.post('/merge', authenticate, merge);

/**
 * @route   GET /api/cart/validate
 * @desc    Validate cart (stock availability)
 * @access  Public (optional auth)
 */
router.get('/validate', optionalAuth, validate);

export default router;
