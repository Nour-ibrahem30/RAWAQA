/**
 * kashier.service.ts — Kashier Payment Gateway Integration
 * 
 * Handles:
 * - Payment session creation via Kashier API
 * - Webhook signature verification (HMAC-SHA256)
 * - Fingerprint computation for webhook idempotency
 * 
 * Uses node:crypto (supported by nodejs_compat flag in Cloudflare Workers)
 */

import { createHmac, createHash, timingSafeEqual } from 'node:crypto';
import { env } from '../config/env';
import { logInfo, logError, logWarn } from '../config/logger';

// ─── Kashier Configuration ─────────────────────────────────────────────────────

interface KashierConfig {
  secretKey: string;
  paymentApiKey: string;
  merchantId: string;
  mode: 'test' | 'live';
  apiBaseUrl: string;
}

function getKashierConfig(): KashierConfig {
  // Read directly from process.env to avoid issues with env validation fallback
  const processEnvSecret = process.env.KASHIER_SECRET_KEY;
  const envModuleSecret = env.KASHIER_SECRET_KEY;
  
  const secretKey = processEnvSecret || envModuleSecret || '';
  const paymentApiKey = process.env.KASHIER_PAYMENT_API_KEY || env.KASHIER_PAYMENT_API_KEY || '';
  const merchantId = process.env.KASHIER_MERCHANT_ID || env.KASHIER_MERCHANT_ID || '';
  const mode = (process.env.KASHIER_MODE || env.KASHIER_MODE || 'test') as 'test' | 'live';
  
  const apiBaseUrl = mode === 'live'
    ? 'https://api.kashier.io'
    : 'https://test-api.kashier.io';

  return {
    secretKey,
    paymentApiKey,
    merchantId,
    mode,
    apiBaseUrl,
  };
}

// ─── Types ─────────────────────────────────────────────────────────────────────

export interface CreateSessionParams {
  merchantOrderId: string;  // Format: {orderNumber}-{attemptNumber}
  amount: number;           // In EGP (e.g., 150.00)
  currency?: string;        // Default: 'EGP'
  customerEmail?: string;
  customerPhone?: string;
  customerName?: string;
  successUrl: string;
  failureUrl: string;
  webhookUrl?: string;
  description?: string;
}

export interface CreateSessionResponse {
  sessionId: string;
  paymentUrl: string;
}

export interface KashierWebhookPayload {
  merchantOrderId: string;      // Our kashierOrderId
  transactionId: string;        // Kashier's unique transaction ID
  paymentStatus: string;        // SUCCESS, FAILURE, PENDING, etc.
  amount: number;
  currency: string;
  cardBrand?: string;
  cardNumber?: string;          // Masked
  paymentMethod?: string;
  signature?: string;           // May be in header instead
  [key: string]: unknown;       // Additional fields
}

// ─── Fingerprint Computation ───────────────────────────────────────────────────

/**
 * Compute idempotency fingerprint for webhook events.
 * Format: SHA256(merchantOrderId + transactionId + paymentStatus + amount)
 * 
 * This allows detecting exact duplicate webhook deliveries without a DB lookup.
 */
export function computeWebhookFingerprint(
  merchantOrderId: string,
  transactionId: string,
  paymentStatus: string,
  amount: number | string
): string {
  const data = `${merchantOrderId}${transactionId}${paymentStatus}${amount}`;
  return createHash('sha256').update(data).digest('hex');
}

// ─── Signature Verification ────────────────────────────────────────────────────

/**
 * Verify Kashier webhook signature using HMAC-SHA256.
 * Uses timing-safe comparison to prevent timing attacks.
 * 
 * @param payload - Raw request body as string (must be exact bytes received)
 * @param signature - x-kashier-signature header value
 * @param secretKey - KASHIER_SECRET_KEY from environment
 * @returns true if signature is valid, false otherwise
 */
export function verifyWebhookSignature(
  payload: string,
  signature: string,
  secretKey?: string
): boolean {
  const config = getKashierConfig();
  const key = secretKey || config.secretKey;

  if (!key) {
    logError('KASHIER_SECRET_KEY not configured', new Error('Missing configuration'));
    return false;
  }

  if (!signature) {
    logWarn('Missing webhook signature');
    return false;
  }

  try {
    const expectedSignature = createHmac('sha256', key)
      .update(payload)
      .digest('hex');

    // Convert to buffers for timing-safe comparison
    const sigBuffer = Buffer.from(signature.toLowerCase(), 'utf8');
    const expectedBuffer = Buffer.from(expectedSignature.toLowerCase(), 'utf8');

    // timingSafeEqual requires same-length buffers
    // Expected signature is always 64 hex chars; if received differs, it's invalid
    if (sigBuffer.length !== expectedBuffer.length) {
      return false;
    }

    return timingSafeEqual(sigBuffer, expectedBuffer);
  } catch (err) {
    logError('Signature verification error', err);
    return false;
  }
}

// ─── Payment Session Creation ──────────────────────────────────────────────────

/**
 * Create a Kashier hosted checkout payment session.
 * 
 * @throws Error if Kashier API returns an error or is unreachable
 */
export async function createPaymentSession(
  params: CreateSessionParams
): Promise<CreateSessionResponse> {
  const config = getKashierConfig();

  if (!config.paymentApiKey || !config.merchantId) {
    throw new Error('Kashier credentials not configured');
  }

  const requestBody = {
    merchantId: config.merchantId,
    order: params.merchantOrderId,  // Kashier uses 'order' not 'orderId'
    amount: params.amount.toFixed(2),
    currency: params.currency || 'EGP',
    display: 'en',  // English by default, can be 'ar'
    merchantRedirect: params.successUrl,  // Kashier uses 'merchantRedirect' for success URL
    failureRedirect: false,  // Use merchantRedirect for both success and failure
    serverWebhook: params.webhookUrl,  // Kashier uses 'serverWebhook' for webhook URL
    description: params.description || `Order ${params.merchantOrderId}`,
    paymentType: 'credit',  // Required field
    type: 'one-time',  // One-time payment
    allowedMethods: 'card,wallet',  // Card and wallet payments
    // customer is REQUIRED by Kashier API
    customer: {
      email: params.customerEmail || 'customer@rawaqa.com',
      reference: params.merchantOrderId,  // Use order ID as customer reference
    },
  };

  const url = `${config.apiBaseUrl}/v3/payment/sessions`;

  logInfo('Creating Kashier payment session', {
    merchantOrderId: params.merchantOrderId,
    amount: params.amount,
    mode: config.mode,
  });

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': config.secretKey,
        'api-key': config.paymentApiKey,
      },
      body: JSON.stringify(requestBody),
    });

    const data = await response.json() as any;

    if (!response.ok) {
      // Kashier API error
      const errorCode = data?.error?.code || data?.code || 'UNKNOWN';
      const errorMessage = data?.error?.message || data?.message || 'Unknown Kashier error';
      
      logError('Kashier API error', {
        status: response.status,
        errorCode,
        errorMessage,
        merchantOrderId: params.merchantOrderId,
      });

      throw new KashierApiError(errorMessage, errorCode, response.status);
    }

    // Extract session info from response
    // Kashier returns different structures - handle both formats
    const sessionData = data.data || data;
    const sessionId = sessionData.sessionId || sessionData._id;
    const paymentUrl = sessionData.sessionUrl || sessionData.paymentUrl;

    if (!sessionId || !paymentUrl) {
      logError('Invalid Kashier response - missing sessionId or sessionUrl', { data });
      throw new Error('Invalid Kashier response: missing session data');
    }

    logInfo('Kashier session created successfully', {
      merchantOrderId: params.merchantOrderId,
      sessionId,
    });

    return { sessionId, paymentUrl };

  } catch (err) {
    if (err instanceof KashierApiError) {
      throw err;
    }

    // Network or other error
    logError('Kashier session creation failed', err);
    throw new Error(`Failed to create Kashier payment session: ${(err as Error).message}`);
  }
}

// ─── Error Classes ─────────────────────────────────────────────────────────────

export class KashierApiError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly httpStatus: number
  ) {
    super(message);
    this.name = 'KashierApiError';
  }
}

// ─── Utility Functions ─────────────────────────────────────────────────────────

/**
 * Build the Kashier payment URL for a session.
 * (Fallback if paymentUrl is not returned directly)
 */
export function buildPaymentUrl(sessionId: string): string {
  const config = getKashierConfig();
  const baseUrl = config.mode === 'live'
    ? 'https://checkout.kashier.io'
    : 'https://test-checkout.kashier.io';
  return `${baseUrl}/?sessionId=${sessionId}`;
}

/**
 * Extract order number from kashierOrderId.
 * Format: {orderNumber}-{attemptNumber} → orderNumber
 */
export function extractOrderNumberFromKashierId(kashierOrderId: string): string {
  const parts = kashierOrderId.split('-');
  // Remove the last part (attempt number) and rejoin
  return parts.slice(0, -1).join('-');
}

/**
 * Check if Kashier is properly configured
 */
export function isKashierConfigured(): boolean {
  const config = getKashierConfig();
  return !!(config.secretKey && config.paymentApiKey && config.merchantId);
}
