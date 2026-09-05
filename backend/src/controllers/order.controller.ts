import { Request, Response } from 'express';
import {
  getOrders,
  getOrderById,
  getOrderByNumber,
  getUserOrders,
  updateOrderStatus,
  updatePaymentStatus,
  addTrackingInfo,
  getOrderStats,
} from '../services/order.service';
import { logError } from '../config/logger';
import { OrderStatus, PaymentStatus } from '../models/Order';

// Get all orders (admin)
export const listOrders = async (req: Request, res: Response): Promise<void> => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const status = req.query.status as OrderStatus;
    const paymentStatus = req.query.paymentStatus as PaymentStatus;

    const { orders, total } = await getOrders(
      { status, paymentStatus },
      { page, limit }
    );

    res.status(200).json({
      success: true,
      data: orders,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    logError('List orders error', error);
    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: 'Failed to fetch orders',
    });
  }
};

// Get single order
export const getOrder = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    
    if (!id) {
      res.status(400).json({
        success: false,
        error: 'Bad Request',
        message: 'Order ID is required',
      });
      return;
    }
    
    const order = await getOrderById(id);

    if (!order) {
      res.status(404).json({
        success: false,
        error: 'Not Found',
        message: 'Order not found',
      });
      return;
    }

    // Check authorization (user can only see their own orders)
    if (req.user?.role !== 'admin' && order.userId.toString() !== req.user?.userId) {
      res.status(403).json({
        success: false,
        error: 'Forbidden',
        message: 'Access denied',
      });
      return;
    }

    res.status(200).json({
      success: true,
      data: order,
    });
  } catch (error) {
    logError('Get order error', error);
    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: 'Failed to fetch order',
    });
  }
};

// Get order by order number
export const getOrderByNumberHandler = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { orderNumber } = req.params;
    
    if (!orderNumber) {
      res.status(400).json({
        success: false,
        error: 'Bad Request',
        message: 'Order number is required',
      });
      return;
    }
    
    const order = await getOrderByNumber(orderNumber);

    if (!order) {
      res.status(404).json({
        success: false,
        error: 'Not Found',
        message: 'Order not found',
      });
      return;
    }

    // Check authorization
    if (req.user?.role !== 'admin' && order.userId.toString() !== req.user?.userId) {
      res.status(403).json({
        success: false,
        error: 'Forbidden',
        message: 'Access denied',
      });
      return;
    }

    res.status(200).json({
      success: true,
      data: order,
    });
  } catch (error) {
    logError('Get order by number error', error);
    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: 'Failed to fetch order',
    });
  }
};

// Get user's orders
export const getMyOrders = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: 'Unauthorized',
        message: 'Authentication required',
      });
      return;
    }

    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;

    const { orders, total } = await getUserOrders(req.user.userId, page, limit);

    res.status(200).json({
      success: true,
      data: orders,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    logError('Get my orders error', error);
    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: 'Failed to fetch orders',
    });
  }
};

// Update order status (admin)
export const updateStatus = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { status, notes } = req.body;

    if (!id || !status) {
      res.status(400).json({
        success: false,
        error: 'Bad Request',
        message: 'ID and status are required',
      });
      return;
    }

    const order = await updateOrderStatus(id, status, notes);

    res.status(200).json({
      success: true,
      message: 'Order status updated',
      data: order,
    });
  } catch (error) {
    logError('Update order status error', error);

    if (error instanceof Error && error.message.includes('Cannot transition')) {
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
      message: 'Failed to update order status',
    });
  }
};

// Update payment status (admin)
export const updatePayment = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { paymentStatus, paymentDetails } = req.body;

    if (!id) {
      res.status(400).json({
        success: false,
        error: 'Bad Request',
        message: 'Order ID is required',
      });
      return;
    }

    const order = await updatePaymentStatus(id, paymentStatus, paymentDetails);

    res.status(200).json({
      success: true,
      message: 'Payment status updated',
      data: order,
    });
  } catch (error) {
    logError('Update payment status error', error);
    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: 'Failed to update payment status',
    });
  }
};

// Add tracking info (admin)
export const addTracking = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { trackingNumber, carrier } = req.body;

    if (!id || !trackingNumber) {
      res.status(400).json({
        success: false,
        error: 'Bad Request',
        message: 'Order ID and tracking number are required',
      });
      return;
    }

    const order = await addTrackingInfo(id, trackingNumber, carrier ||'');

    res.status(200).json({
      success: true,
      message: 'Tracking info added',
      data: order,
    });
  } catch (error) {
    logError('Add tracking info error', error);
    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: 'Failed to add tracking info',
    });
  }
};

// Get order statistics
export const getStats = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.role === 'admin' ? undefined : req.user?.userId;
    const stats = await getOrderStats(userId);

    res.status(200).json({
      success: true,
      data: stats,
    });
  } catch (error) {
    logError('Get order stats error', error);
    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: 'Failed to fetch statistics',
    });
  }
};

import { exportOrdersCSV } from '../services/order.service';

// GET /api/orders/export  (admin)
export const exportOrders = async (req: Request, res: Response): Promise<void> => {
  try {
    const startDate = req.query.startDate ? new Date(req.query.startDate as string) : undefined;
    const endDate   = req.query.endDate   ? new Date(req.query.endDate   as string) : undefined;
    const status    = req.query.status    as any;
    const paymentStatus = req.query.paymentStatus as any;

    const csv = await exportOrdersCSV({ status, paymentStatus, startDate, endDate });

    const filename = `orders-${new Date().toISOString().split('T')[0]}.csv`;
    res.setHeader('Content-Type',        'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send('\uFEFF' + csv); // BOM for Excel Arabic support
  } catch (err) {
    logError('exportOrders error', err);
    res.status(500).json({ success: false, message: 'Failed to export orders' });
  }
};
