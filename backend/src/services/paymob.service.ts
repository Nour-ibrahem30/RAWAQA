/**
 * Paymob Payment Gateway Service
 * https://developers.paymob.com/
 *
 * Flow:
 *  1. authenticate()          → get auth_token
 *  2. createOrder()           → get paymob order_id
 *  3. getPaymentKey()         → get payment_key (token for iframe)
 *  4. Client opens iframe with payment_key
 *  5. Paymob sends webhook → verifyHmac() → processCallback()
 */

import axios from 'axios';
import crypto from 'crypto';
import { env } from '../config/env';
import { logInfo, logError } from '../config/logger';
import { Order, PaymentStatus } from '../models/Order';
import { OutboxEvent } from '../models/OutboxEvent';
import mongoose from 'mongoose';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface PaymobOrderItem {
  name:        string;
  amount_cents: number;
  description: string;
  quantity:    number;
}

export interface PaymobBillingData {
  first_name:   string;
  last_name:    string;
  email:        string;
  phone_number: string;
  apartment:    string;
  floor:        string;
  street:       string;
  building:     string;
  city:         string;
  country:      string;
  state:        string;
  postal_code:  string;
}

export interface InitiatePaymentResult {
  paymentKey:   string;
  paymobOrderId: string;
  iframeUrl:    string;
}

// ─── Paymob Service ───────────────────────────────────────────────────────────

class PaymobService {
  private readonly baseUrl = 'https://accept.paymob.com/api';
  private authToken: string | null  = null;
  private tokenExpiry: Date | null  = null;

  // ── Auth token (cached, re-fetched if expired) ───────────────────────────
  private async getAuthToken(): Promise<string> {
    if (this.authToken && this.tokenExpiry && new Date() < this.tokenExpiry) {
      return this.authToken;
    }

    const { data } = await axios.post(`${this.baseUrl}/auth/tokens`, {
      api_key: env.PAYMOB_API_KEY,
    });

    this.authToken  = data.token;
    // Paymob tokens last 1 hour; refresh at 55 min to be safe
    this.tokenExpiry = new Date(Date.now() + 55 * 60 * 1000);
    return this.authToken!;
  }

  // ── Step 1 + 2 + 3 combined: initiate payment ───────────────────────────
  async initiatePayment(params: {
    orderId:      string;          // Our internal order _id
    amountCents:  number;          // Total in Egyptian piastres (EGP * 100)
    items:        PaymobOrderItem[];
    billingData:  PaymobBillingData;
    integrationId?: number;        // Card integration id (from env)
  }): Promise<InitiatePaymentResult> {
    const authToken = await this.getAuthToken();

    // ── Step 2: Create Paymob order ──────────────────────────────────────
    const { data: paymobOrder } = await axios.post(
      `${this.baseUrl}/ecommerce/orders`,
      {
        auth_token:      authToken,
        delivery_needed: false,
        amount_cents:    params.amountCents,
        currency:        'EGP',
        merchant_order_id: params.orderId,
        items:           params.items,
      }
    );

    // ── Step 3: Get payment key ──────────────────────────────────────────
    const integrationId =
      params.integrationId || env.PAYMOB_INTEGRATION_ID_CARD;

    const { data: keyData } = await axios.post(
      `${this.baseUrl}/acceptance/payment_keys`,
      {
        auth_token:    authToken,
        amount_cents:  params.amountCents,
        expiration:    3600,
        order_id:      paymobOrder.id,
        billing_data:  params.billingData,
        currency:      'EGP',
        integration_id: integrationId,
        lock_order_when_paid: true,
      }
    );

    const iframeId  = env.PAYMOB_IFRAME_ID;
    const iframeUrl = `https://accept.paymob.com/api/acceptance/iframes/${iframeId}?payment_token=${keyData.token}`;

    logInfo(`Paymob payment initiated for order ${params.orderId}`);

    return {
      paymentKey:    keyData.token,
      paymobOrderId: paymobOrder.id.toString(),
      iframeUrl,
    };
  }

  // ── Verify HMAC signature from Paymob webhook ────────────────────────────
  verifyHmac(data: Record<string, any>, receivedHmac: string): boolean {
    /**
     * Paymob HMAC fields (in exact order):
     * amount_cents, created_at, currency, error_occured, has_parent_transaction,
     * id, integration_id, is_3d_secure, is_auth, is_capture, is_refunded,
     * is_standalone_payment, is_voided, order.id, owner, pending,
     * source_data.pan, source_data.sub_type, source_data.type, success
     */
    const hmacFields = [
      data.amount_cents,
      data.created_at,
      data.currency,
      data.error_occured,
      data.has_parent_transaction,
      data.id,
      data.integration_id,
      data.is_3d_secure,
      data.is_auth,
      data.is_capture,
      data.is_refunded,
      data.is_standalone_payment,
      data.is_voided,
      data.order?.id,
      data.owner,
      data.pending,
      data['source_data.pan'],
      data['source_data.sub_type'],
      data['source_data.type'],
      data.success,
    ]
      .map((v) => (v === undefined || v === null ? '' : String(v)))
      .join('');

    const computedHmac = crypto
      .createHmac('sha512', env.PAYMOB_HMAC_SECRET ?? '')
      .update(hmacFields)
      .digest('hex');

    return computedHmac === receivedHmac;
  }

  // ── Process webhook callback ─────────────────────────────────────────────
  async processCallback(transaction: Record<string, any>): Promise<void> {
    const merchantOrderId = transaction.order?.merchant_order_id;
    const success         = transaction.success === true || transaction.success === 'true';
    const pending         = transaction.pending === true || transaction.pending === 'true';
    const paymobTxId      = String(transaction.id);

    if (!merchantOrderId) {
      logError('Paymob callback missing merchant_order_id', new Error('missing merchant_order_id'));
      return;
    }

    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      const order = await Order.findById(merchantOrderId).session(session);
      if (!order) {
        logError(`Order not found: ${merchantOrderId}`, new Error('Order not found'));
        await session.abortTransaction();
        return;
      }

      // Update payment status
      if (success && !pending) {
        order.paymentStatus = PaymentStatus.PAID;
        order.status        = 'processing' as any;   // auto-advance on payment
      } else if (
        transaction.error_occured === true ||
        transaction.error_occured === 'true'
      ) {
        order.paymentStatus = PaymentStatus.FAILED;
        order.status        = 'failed' as any;
      }

      // Store Paymob transaction reference
      (order as any).paymobTransactionId = paymobTxId;
      await order.save({ session });

      // Emit outbox event
      await OutboxEvent.create(
        [
          {
            aggregateType: 'Order',
            aggregateId:   order._id,
            eventType:     'PaymentStatusChanged',
            payload: {
              orderId:       order._id,
              orderNumber:   order.orderNumber,
              paymentStatus: order.paymentStatus,
              paymobTxId,
              success,
            },
          },
        ],
        { session }
      );

      await session.commitTransaction();
      logInfo(`Paymob callback processed for order ${order.orderNumber} — success: ${success}`);
    } catch (err) {
      await session.abortTransaction();
      logError('Failed to process Paymob callback', err);
      throw err;
    } finally {
      session.endSession();
    }
  }

  // ── Refund ────────────────────────────────────────────────────────────────
  async refundTransaction(
    paymobTransactionId: string,
    amountCents: number
  ): Promise<boolean> {
    try {
      const authToken = await this.getAuthToken();
      await axios.post(`${this.baseUrl}/acceptance/void_refund/refund`, {
        auth_token:     authToken,
        transaction_id: paymobTransactionId,
        amount_cents:   amountCents,
      });
      logInfo(`Refund issued for transaction ${paymobTransactionId}`);
      return true;
    } catch (err) {
      logError(`Refund failed for ${paymobTransactionId}`, err);
      return false;
    }
  }
}

export const paymobService = new PaymobService();
