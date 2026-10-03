/**
 * webhook.routes.ts — Webhook Endpoints
 * 
 * These routes receive callbacks from external payment providers.
 * 
 * SECURITY:
 * - No authentication required (webhooks come from external services)
 * - Signature verification handled in controller
 * - Raw body preserved for signature verification
 * 
 * MOUNTING:
 * These routes use express.raw() middleware to preserve the raw body
 * for signature verification. They should be mounted BEFORE the global
 * express.json() middleware in app.ts.
 */

import { Router } from 'express';
import express from 'express';
import { handleKashierWebhook } from '../controllers/webhook.controller';

const router = Router();

/**
 * POST /api/webhooks/kashier
 * 
 * Kashier payment webhook endpoint.
 * Receives payment status updates (SUCCESS, FAILURE, PENDING, etc.)
 * 
 * Headers:
 * - x-kashier-signature: HMAC-SHA256 signature of request body
 * 
 * Body: Kashier webhook payload (JSON)
 */
router.post(
  '/kashier',
  // Parse body as raw text to preserve for signature verification
  express.raw({ type: 'application/json' }),
  // Store raw body for signature verification
  (req, _res, next) => {
    if (Buffer.isBuffer(req.body)) {
      (req as any).rawBody = req.body.toString('utf8');
      req.body = JSON.parse((req as any).rawBody);
    }
    next();
  },
  handleKashierWebhook
);

export default router;
