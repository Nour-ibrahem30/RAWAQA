import { Request, Response } from 'express';
import { paymobService } from '../services/paymob.service';
import { Order } from '../models/Order';
import { logError } from '../config/logger';

// ─── POST /api/payments/initiate ──────────────────────────────────────────────
export const initiatePayment = async (req: Request, res: Response): Promise<void> => {
  try {
    const { orderId } = req.body;

    if (!orderId) {
      res.status(400).json({ success: false, message: 'orderId is required' });
      return;
    }

    const order = await Order.findById(orderId).populate('userId', 'firstName lastName email phone');
    if (!order) {
      res.status(404).json({ success: false, message: 'Order not found' });
      return;
    }

    // Only the order owner can initiate payment
    if (order.userId.toString() !== req.user?.userId) {
      res.status(403).json({ success: false, message: 'Access denied' });
      return;
    }

    if (order.paymentStatus === 'paid') {
      res.status(400).json({ success: false, message: 'Order is already paid' });
      return;
    }

    const user    = order.userId as any;
    const address = order.shippingAddress;

    const result = await paymobService.initiatePayment({
      orderId:     order._id.toString(),
      amountCents: Math.round(order.total * 100),
      items: order.items.map((item: any) => ({
        name:         item.productSnapshot?.nameEn || 'Product',
        amount_cents: Math.round(item.price * 100),
        description:  item.productSnapshot?.nameAr || '',
        quantity:     item.quantity,
      })),
      billingData: {
        first_name:   user.firstName || address.firstName,
        last_name:    user.lastName  || address.lastName,
        email:        user.email     || 'N/A',
        phone_number: address.phone,
        apartment:    'N/A',
        floor:        'N/A',
        street:       address.addressLine1,
        building:     'N/A',
        city:         address.city,
        country:      'Egypt',
        state:        address.governorate,
        postal_code:  address.postalCode || 'N/A',
      },
    });

    res.status(200).json({
      success: true,
      data: {
        paymentKey:    result.paymentKey,
        paymobOrderId: result.paymobOrderId,
        iframeUrl:     result.iframeUrl,
        amountCents:   Math.round(order.total * 100),
      },
    });
  } catch (err) {
    logError('initiatePayment error', err);
    res.status(500).json({ success: false, message: 'Failed to initiate payment' });
  }
};

// ─── POST /api/payments/webhook  (called by Paymob server) ───────────────────
export const paymobWebhook = async (req: Request, res: Response): Promise<void> => {
  try {
    // Paymob sends HMAC in query param `hmac`
    const receivedHmac = req.query.hmac as string;
    const transaction  = req.body?.obj ?? req.body;

    if (!receivedHmac) {
      logError('Paymob webhook missing HMAC', new Error('Missing HMAC'));
      res.status(400).json({ success: false, message: 'Missing HMAC' });
      return;
    }

    // Verify HMAC signature
    const valid = paymobService.verifyHmac(transaction, receivedHmac);
    if (!valid) {
      logError('Paymob webhook HMAC mismatch', new Error('Invalid HMAC'));
      res.status(401).json({ success: false, message: 'Invalid HMAC' });
      return;
    }

    // Respond 200 immediately so Paymob doesn't retry
    res.status(200).json({ success: true });

    // Process asynchronously (don't block response)
    paymobService.processCallback(transaction).catch((err) => {
      logError('Paymob callback processing error', err);
    });
  } catch (err) {
    logError('paymobWebhook error', err);
    // Always return 200 to Paymob to prevent retries
    res.status(200).json({ success: true });
  }
};

// ─── POST /api/payments/refund ────────────────────────────────────────────────
export const refundPayment = async (req: Request, res: Response): Promise<void> => {
  try {
    const { orderId } = req.body;

    const order = await Order.findById(orderId);
    if (!order) {
      res.status(404).json({ success: false, message: 'Order not found' });
      return;
    }

    const paymobTxId = (order as any).paymobTransactionId;
    if (!paymobTxId) {
      res.status(400).json({ success: false, message: 'No Paymob transaction found for this order' });
      return;
    }

    const success = await paymobService.refundTransaction(
      paymobTxId,
      Math.round(order.total * 100)
    );

    if (success) {
      order.paymentStatus = 'refunded' as any;
      order.status        = 'refunded' as any;
      await order.save();
    }

    res.status(200).json({
      success,
      message: success ? 'Refund issued successfully' : 'Refund failed',
    });
  } catch (err) {
    logError('refundPayment error', err);
    res.status(500).json({ success: false, message: 'Failed to process refund' });
  }
};
