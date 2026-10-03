/**
 * webhook.controller.ts — Webhook Endpoint Handlers
 * 
 * Handles incoming webhooks from payment providers.
 * SECURITY: Verifies signatures before processing any webhook data.
 */

import { Request, Response } from 'express';
import { verifyWebhookSignature, KashierWebhookPayload } from '../services/kashier.service';
import { processWebhook } from '../services/payment.service';
import { logInfo, logError, logWarn } from '../config/logger';

/**
 * Handle Kashier webhook events.
 * 
 * IMPORTANT: Raw body must be preserved for signature verification.
 * This endpoint must be mounted BEFORE express.json() middleware
 * or use express.raw() middleware.
 * 
 * Security:
 * - Verifies HMAC-SHA256 signature
 * - Rejects requests with invalid/missing signature
 * - Never logs sensitive data (secrets, signatures)
 */
export async function handleKashierWebhook(
  req: Request,
  res: Response
): Promise<void> {
  // 1. Get raw body for signature verification
  let rawBody: string;
  if (typeof req.body === 'string') {
    rawBody = req.body;
  } else if (Buffer.isBuffer(req.body)) {
    rawBody = req.body.toString('utf8');
  } else {
    // Body already parsed as JSON - need raw body from middleware
    rawBody = (req as any).rawBody;
  }

  if (!rawBody) {
    logWarn('Kashier webhook: missing raw body for signature verification');
    res.status(400).json({ error: 'Bad Request', message: 'Missing request body' });
    return;
  }

  // 2. Get signature from header
  const signature = req.headers['x-kashier-signature'] as string;
  if (!signature) {
    logWarn('Kashier webhook: missing signature header');
    res.status(401).json({ error: 'Unauthorized', message: 'Missing signature' });
    return;
  }

  // 3. Verify signature
  const isValid = verifyWebhookSignature(rawBody, signature);
  if (!isValid) {
    logWarn('Kashier webhook: invalid signature');
    res.status(401).json({ error: 'Unauthorized', message: 'Invalid signature' });
    return;
  }

  // 4. Parse payload
  let payload: KashierWebhookPayload;
  try {
    payload = typeof req.body === 'string' || Buffer.isBuffer(req.body)
      ? JSON.parse(rawBody)
      : req.body;
  } catch (err) {
    logError('Kashier webhook: malformed JSON', err);
    res.status(400).json({ error: 'Bad Request', message: 'Invalid JSON payload' });
    return;
  }

  // 5. Validate required fields
  if (!payload.merchantOrderId || !payload.transactionId || !payload.paymentStatus) {
    logWarn('Kashier webhook: missing required fields', {
      hasMerchantOrderId: !!payload.merchantOrderId,
      hasTransactionId: !!payload.transactionId,
      hasPaymentStatus: !!payload.paymentStatus,
    });
    res.status(400).json({ error: 'Bad Request', message: 'Missing required fields' });
    return;
  }

  // 6. Log webhook receipt (without sensitive data)
  logInfo('Kashier webhook received', {
    merchantOrderId: payload.merchantOrderId,
    paymentStatus: payload.paymentStatus,
    transactionId: payload.transactionId,
    amount: payload.amount,
  });

  // 7. Process webhook
  try {
    const result = await processWebhook(payload);

    res.status(result.httpCode).json({
      status: result.status,
      message: result.message || 'OK',
    });

  } catch (err) {
    logError('Kashier webhook processing error', err, {
      merchantOrderId: payload.merchantOrderId,
    });

    // Return 500 to trigger Kashier retry
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to process webhook',
    });
  }
}
