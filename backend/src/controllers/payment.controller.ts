/**
 * payment.controller.ts — Payment Endpoint Handlers
 * 
 * Handles payment session creation and payment status queries.
 * All endpoints require authentication.
 */

import { Request, Response } from 'express';
import {
  createPaymentSessionForOrder,
  getPaymentById,
  getPaymentsByOrderId,
  PaymentError,
} from '../services/payment.service';
import { logError } from '../config/logger';

/**
 * POST /api/payments/create-session
 * 
 * Create a Kashier payment session for an order.
 * Returns the payment URL for redirect.
 * 
 * Body: { orderId: string }
 * Response: { paymentId, paymentUrl, kashierOrderId }
 */
export async function createPaymentSessionHandler(
  req: Request,
  res: Response
): Promise<void> {
  try {
    const userId = (req as any).user?.id;
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized', message: 'Authentication required' });
      return;
    }

    const { orderId } = req.body;
    if (!orderId) {
      res.status(400).json({ error: 'Bad Request', message: 'orderId is required' });
      return;
    }

    const result = await createPaymentSessionForOrder(orderId, userId);

    res.status(200).json({
      success: true,
      data: {
        paymentId: result.paymentId,
        paymentUrl: result.paymentUrl,
        kashierOrderId: result.kashierOrderId,
      },
    });

  } catch (err) {
    if (err instanceof PaymentError) {
      const statusMap: Record<string, number> = {
        NOT_FOUND: 404,
        FORBIDDEN: 403,
        ALREADY_PAID: 409,
        ORDER_CANCELLED: 409,
        MAX_ATTEMPTS_EXCEEDED: 429,
        KASHIER_API_ERROR: 502,
      };
      const status = statusMap[err.code] || 400;
      res.status(status).json({
        error: err.code,
        message: err.message,
      });
      return;
    }

    logError('Create payment session error', err);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to create payment session',
    });
  }
}

/**
 * GET /api/payments/:id
 * 
 * Get payment details by ID.
 * Only returns payments for orders owned by the authenticated user.
 */
export async function getPaymentHandler(
  req: Request,
  res: Response
): Promise<void> {
  try {
    const userId = (req as any).user?.id;
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized', message: 'Authentication required' });
      return;
    }

    const { id } = req.params;
    if (!id) {
      res.status(400).json({ error: 'Bad Request', message: 'Payment ID is required' });
      return;
    }
    
    const payment = await getPaymentById(id, userId);

    if (!payment) {
      res.status(404).json({ error: 'Not Found', message: 'Payment not found' });
      return;
    }

    res.status(200).json({
      success: true,
      data: payment,
    });

  } catch (err) {
    logError('Get payment error', err);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to get payment',
    });
  }
}

/**
 * GET /api/payments/order/:orderId
 * 
 * Get all payments for an order.
 * For admin use or order owner.
 */
export async function getPaymentsByOrderHandler(
  req: Request,
  res: Response
): Promise<void> {
  try {
    const userId = (req as any).user?.id;
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized', message: 'Authentication required' });
      return;
    }

    const { orderId } = req.params;
    if (!orderId) {
      res.status(400).json({ error: 'Bad Request', message: 'Order ID is required' });
      return;
    }
    
    const payments = await getPaymentsByOrderId(orderId);

    res.status(200).json({
      success: true,
      data: payments,
    });

  } catch (err) {
    logError('Get payments by order error', err);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to get payments',
    });
  }
}
