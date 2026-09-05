import { Request, Response } from 'express';
import { processCheckout, cancelOrder, confirmDelivery } from '../services/checkout.service';
import { logError } from '../config/logger';
import { v4 as uuidv4 } from 'uuid';

/**
 * POST /api/checkout
 * Process checkout and create order
 */
export const checkout = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: 'Unauthorized',
        message: 'Authentication required',
      });
      return;
    }

    const { cartId, shippingAddress, paymentMethod, notes, couponCode } = req.body;

    if (!cartId || !shippingAddress || !paymentMethod) {
      res.status(400).json({
        success: false,
        error: 'Bad Request',
        message: 'cartId, shippingAddress, and paymentMethod are required',
      });
      return;
    }

    const idempotencyKey =
      req.headers['idempotency-key'] as string || `checkout-${req.user.userId}-${uuidv4()}`;

    const result = await processCheckout({
      userId: req.user.userId,
      cartId,
      shippingAddress,
      paymentMethod,
      couponCode,
      notes,
      idempotencyKey,
    });

    res.status(result.fromCache ? 200 : 201).json({
      success: true,
      message: result.fromCache ? 'Order retrieved from cache' : 'Order created successfully',
      data: result.order,
      fromCache: result.fromCache,
    });
  } catch (error) {
    logError('Checkout error', error);

    if (error instanceof Error) {
      // Handle specific errors
      if (
        error.message.includes('empty') ||
        error.message.includes('not found') ||
        error.message.includes('Insufficient') ||
        error.message.includes('does not belong')
      ) {
        res.status(400).json({
          success: false,
          error: 'Bad Request',
          message: error.message,
        });
        return;
      }

      if (error.message.includes('Idempotency key reused')) {
        res.status(409).json({
          success: false,
          error: 'Conflict',
          message: error.message,
        });
        return;
      }
    }

    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: 'Failed to process checkout',
    });
  }
};

/**
 * POST /api/checkout/cancel/:orderId
 * Cancel order and release inventory
 */
export const cancel = async (req: Request, res: Response): Promise<void> => {
  try {
    const { orderId } = req.params;
    const { reason } = req.body;

    if (!orderId) {
      res.status(400).json({
        success: false,
        error: 'Bad Request',
        message: 'Order ID is required',
      });
      return;
    }

    if (!reason) {
      res.status(400).json({
        success: false,
        error: 'Bad Request',
        message: 'Cancellation reason is required',
      });
      return;
    }

    const order = await cancelOrder(orderId, reason);

    res.status(200).json({
      success: true,
      message: 'Order cancelled successfully',
      data: order,
    });
  } catch (error) {
    logError('Cancel order error', error);

    if (error instanceof Error && error.message.includes('Cannot cancel')) {
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
      message: 'Failed to cancel order',
    });
  }
};

/**
 * POST /api/checkout/confirm-delivery/:orderId
 * Confirm delivery and deduct inventory
 */
export const confirmDeliveryHandler = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { orderId } = req.params;

    if (!orderId) {
      res.status(400).json({
        success: false,
        error: 'Bad Request',
        message: 'Order ID is required',
      });
      return;
    }

    const order = await confirmDelivery(orderId);

    res.status(200).json({
      success: true,
      message: 'Order delivery confirmed',
      data: order,
    });
  } catch (error) {
    logError('Confirm delivery error', error);

    if (
      error instanceof Error &&
      (error.message.includes('not found') || error.message.includes('Only shipped'))
    ) {
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
      message: 'Failed to confirm delivery',
    });
  }
};
