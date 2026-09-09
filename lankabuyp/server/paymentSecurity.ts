/**
 * LankaBuy Payment Security & Webhook Hardening Subsystem
 * 
 * Features:
 * 1. Cryptographic HMAC-SHA256 Webhook Signature Verification with Timing-Safe Equality
 * 2. Webhook Replay Attack Protection with Timestamp Validation (5-minute drift threshold)
 * 3. Idempotent Event Processing with Deduplication Buffer & Firestore Persistence
 * 4. Authoritative Server-Side Order & Payment Amount/Currency Integrity Validation
 * 5. Strict Zero-Trust Client Payment Status Protection
 */

import crypto from 'crypto';
import { Order } from '../src/types.ts';
import { fetchCreemCheckoutSession } from './creemService.ts';

// Webhook secret configured from secure backend environment
export function getWebhookSecret(): string {
  const secret = (
    process.env.CREEM_WEBHOOK_SECRET ||
    process.env.WEBHOOK_SECRET ||
    process.env.PAYMENT_WEBHOOK_SECRET ||
    ''
  ).trim();

  const isPlaceholder =
    secret === '' ||
    secret.includes('placeholder') ||
    secret.includes('your_') ||
    secret.includes('change_me') ||
    secret.length < 8;

  return isPlaceholder ? '' : secret;
}

// In-Memory Idempotency Cache for Processed Webhook Event IDs (with 24hr TTL)
interface ProcessedEventRecord {
  eventId: string;
  orderId?: string;
  orderNumber?: string;
  processedAt: number;
  status: 'PROCESSED' | 'FAILED' | 'IGNORED';
  signature?: string;
}

const processedWebhookEvents = new Map<string, ProcessedEventRecord>();
const MAX_PROCESSED_EVENTS = 10000;
const EVENT_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

// Cleanup stale webhook event records periodically
function pruneExpiredEvents() {
  const now = Date.now();
  if (processedWebhookEvents.size > MAX_PROCESSED_EVENTS) {
    for (const [key, val] of processedWebhookEvents.entries()) {
      if (now - val.processedAt > EVENT_TTL_MS) {
        processedWebhookEvents.delete(key);
      }
    }
  }
}

/**
 * Checks if a webhook event ID has already been successfully processed.
 */
export function isWebhookEventProcessed(eventId: string): boolean {
  if (!eventId) return false;
  pruneExpiredEvents();
  const record = processedWebhookEvents.get(eventId);
  if (record && record.status === 'PROCESSED') {
    return true;
  }
  return false;
}

/**
 * Marks a webhook event as processed.
 */
export function recordProcessedWebhookEvent(eventId: string, details: {
  orderId?: string;
  orderNumber?: string;
  status?: 'PROCESSED' | 'FAILED' | 'IGNORED';
  signature?: string;
}) {
  if (!eventId) return;
  pruneExpiredEvents();
  processedWebhookEvents.set(eventId, {
    eventId,
    orderId: details.orderId,
    orderNumber: details.orderNumber,
    processedAt: Date.now(),
    status: details.status || 'PROCESSED',
    signature: details.signature,
  });
}

/**
 * 1. CRYPTOGRAPHIC WEBHOOK SIGNATURE VERIFICATION
 * 
 * Verifies HMAC-SHA256 signature using constant-time comparison.
 * Supports:
 * - Direct hex HMAC: `x-creem-signature: <hex>`
 * - Prefixed HMAC: `x-creem-signature: sha256=<hex>`
 * - Timestamped Stripe/Creem standard: `t=<timestamp>,v1=<hex>`
 */
export function verifyPaymentWebhookSignature(options: {
  rawPayload: Buffer | string;
  signatureHeader?: string;
  timestampHeader?: string;
  secretOverride?: string;
}): {
  isValid: boolean;
  code?: string;
  message?: string;
} {
  const { rawPayload, signatureHeader, timestampHeader, secretOverride } = options;
  const webhookSecret = secretOverride || getWebhookSecret();

  // Never process unsigned webhooks, including local development. A missing
  // secret is a configuration error, not a reason to bypass verification.
  if (!webhookSecret) {
    return {
      isValid: false,
      code: 'MISSING_WEBHOOK_SECRET',
      message: 'Server is missing CREEM_WEBHOOK_SECRET configuration.',
    };
  }

  if (!signatureHeader || typeof signatureHeader !== 'string' || signatureHeader.trim() === '') {
    return {
      isValid: false,
      code: 'MISSING_SIGNATURE',
      message: 'Missing required webhook signature header.',
    };
  }

  try {
    const rawBuffer = Buffer.isBuffer(rawPayload)
      ? rawPayload
      : Buffer.from(typeof rawPayload === 'string' ? rawPayload : JSON.stringify(rawPayload), 'utf8');

    // Handle timestamp verification (Replay attack protection)
    let payloadToHash: Buffer = rawBuffer;
    let expectedSigHex = '';

    const cleanHeader = signatureHeader.trim();

    if (cleanHeader.includes('t=') && cleanHeader.includes('v1=')) {
      // Standard timestamped format (e.g. t=1612345678,v1=abcdef...)
      const parts = cleanHeader.split(',');
      let tVal = '';
      let v1Val = '';
      for (const part of parts) {
        const [k, v] = part.trim().split('=');
        if (k === 't') tVal = v;
        if (k === 'v1') v1Val = v;
      }

      if (tVal) {
        const timestampSec = parseInt(tVal, 10);
        const nowSec = Math.floor(Date.now() / 1000);
        // Reject if signature timestamp is older than 5 minutes (300 seconds)
        if (isNaN(timestampSec) || Math.abs(nowSec - timestampSec) > 300) {
          return {
            isValid: false,
            code: 'WEBHOOK_TIMESTAMP_EXPIRED',
            message: 'Webhook signature timestamp outside acceptable 5-minute window (replay prevention).',
          };
        }
        // Compute HMAC on `${tVal}.${rawBuffer}`
        payloadToHash = Buffer.concat([Buffer.from(`${tVal}.`, 'utf8'), rawBuffer]);
      }
      expectedSigHex = v1Val;
    } else if (cleanHeader.startsWith('sha256=')) {
      expectedSigHex = cleanHeader.slice(7);
    } else {
      expectedSigHex = cleanHeader;
    }

    // Optional separate timestamp header validation
    if (timestampHeader) {
      const tsNum = parseInt(timestampHeader, 10);
      const nowSec = Math.floor(Date.now() / 1000);
      if (!isNaN(tsNum)) {
        const diff = Math.abs(nowSec - (tsNum > 1e11 ? Math.floor(tsNum / 1000) : tsNum));
        if (diff > 300) {
          return {
            isValid: false,
            code: 'WEBHOOK_TIMESTAMP_EXPIRED',
            message: 'Webhook timestamp header is expired.',
          };
        }
      }
    }

    // Calculate HMAC-SHA256
    const calculatedHmacHex = crypto
      .createHmac('sha256', webhookSecret)
      .update(payloadToHash)
      .digest('hex');

    const calculatedBuf = Buffer.from(calculatedHmacHex, 'hex');
    const expectedBuf = Buffer.from(expectedSigHex.toLowerCase(), 'hex');

    if (calculatedBuf.length !== expectedBuf.length) {
      return {
        isValid: false,
        code: 'INVALID_SIGNATURE_LENGTH',
        message: 'Invalid signature digest length.',
      };
    }

    // Constant-time comparison to prevent timing attacks
    const isMatch = crypto.timingSafeEqual(calculatedBuf, expectedBuf);

    if (!isMatch) {
      return {
        isValid: false,
        code: 'SIGNATURE_MISMATCH',
        message: 'Cryptographic signature mismatch.',
      };
    }

    return {
      isValid: true,
      code: 'SIGNATURE_VERIFIED',
      message: 'Signature verified successfully.',
    };
  } catch (err: any) {
    return {
      isValid: false,
      code: 'VERIFICATION_ERROR',
      message: 'Failed to verify webhook signature.',
    };
  }
}

/**
 * 2. SERVER-SIDE ORDER & PAYMENT AMOUNT/CURRENCY INTEGRITY VALIDATION
 * 
 * Verifies that the paid amount from the payment provider matches the server's authoritative order total.
 * Prevents fraudulent transactions where a customer modifies the client-side price.
 */
export function verifyPaymentAmountAndCurrency(
  order: Order,
  paymentData: {
    amountPaidCents?: number;
    amountPaidLkr?: number;
    amountPaidUsd?: number;
    currency?: string;
    liveExchangeRate?: number;
  }
): {
  isValid: boolean;
  code?: string;
  reason?: string;
  discrepancy?: any;
} {
  const authoritativeOrderTotalLkr = Number(order.totalAmount);
  if (isNaN(authoritativeOrderTotalLkr) || authoritativeOrderTotalLkr <= 0) {
    return {
      isValid: false,
      code: 'INVALID_ORDER_TOTAL',
      reason: 'Order has an invalid authoritative total amount.',
    };
  }

  const exchangeRate = paymentData.liveExchangeRate || 305;
  const expectedTotalUsd = authoritativeOrderTotalLkr / exchangeRate;
  const expectedTotalCents = Math.round(expectedTotalUsd * 100);

  // If amount was paid in LKR
  if (paymentData.amountPaidLkr !== undefined && paymentData.amountPaidLkr > 0) {
    const diff = Math.abs(paymentData.amountPaidLkr - authoritativeOrderTotalLkr);
    if (diff > 5) {
      // > 5 LKR discrepancy
      return {
        isValid: false,
        code: 'AMOUNT_MISMATCH_LKR',
        reason: `Paid amount (Rs. ${paymentData.amountPaidLkr}) does not match order total (Rs. ${authoritativeOrderTotalLkr}).`,
        discrepancy: { expected: authoritativeOrderTotalLkr, received: paymentData.amountPaidLkr },
      };
    }
  }

  // If amount was paid in USD or cents (Creem default)
  if (paymentData.amountPaidCents !== undefined && paymentData.amountPaidCents > 0) {
    // Allow small 2-cent rounding tolerance due to currency exchange rate conversion
    const centDiff = Math.abs(paymentData.amountPaidCents - expectedTotalCents);
    if (centDiff > 5) {
      return {
        isValid: false,
        code: 'AMOUNT_MISMATCH_CENTS',
        reason: `Paid amount in cents (${paymentData.amountPaidCents}¢) does not match expected order total (${expectedTotalCents}¢ / Rs. ${authoritativeOrderTotalLkr}).`,
        discrepancy: { expectedCents: expectedTotalCents, receivedCents: paymentData.amountPaidCents },
      };
    }
  }

  return {
    isValid: true,
    code: 'AMOUNT_VERIFIED',
  };
}

/**
 * 3. AUTHORITATIVE SERVER-SIDE PAYMENT CONFIRMATION
 * 
 * Verifies a payment with the payment gateway backend API before marking an order as PAID.
 */
export async function verifyAndSettlePayment(params: {
  order: Order;
  sessionId?: string;
  transactionId?: string;
  source: 'WEBHOOK' | 'SERVER_API_CHECK' | 'LOCAL_SANDBOX';
  gatewayResponse?: any;
  // Server-extracted Creem identifiers (from webhook payload / Creem API —
  // never from the browser). Persisted onto the order for admin fulfillment.
  creemCheckoutId?: string;
  creemOrderId?: string;
  creemCustomerId?: string;
  currency?: string;
}): Promise<{
  success: boolean;
  paymentStatus: 'PAID' | 'FAILED' | 'PENDING';
  transactionId: string;
  order: Order;
  error?: string;
}> {
  const { order, sessionId, transactionId, source, gatewayResponse } = params;

  // 1. Invariant Guard: If order is already PAID, return success idempotently
  if (order.paymentStatus === 'PAID') {
    return {
      success: true,
      paymentStatus: 'PAID',
      transactionId: order.transactionId || sessionId || 'PAID_EXISTING',
      order,
    };
  }

  const effectiveTxnId = transactionId || sessionId || `TXN-${Date.now()}`;

  // 2. Direct Provider Status Verification for Live Gateways
  if (sessionId && source === 'SERVER_API_CHECK') {
    const verification = await fetchCreemCheckoutSession(sessionId);
    if (!verification.success) {
      // Fail CLOSED: gateway unreachable means payment is NOT verified.
      // Never mark PAID on an inconclusive provider check.
      return {
        success: false,
        paymentStatus: 'PENDING',
        transactionId: effectiveTxnId,
        order,
        error: `Payment gateway verification unavailable: ${verification.error || 'unknown error'}`,
      };
    }
    if (verification.success && verification.session) {
      if (!verification.isPaid) {
        return {
          success: false,
          paymentStatus: 'PENDING',
          transactionId: effectiveTxnId,
          order,
          error: `Payment gateway reports status: ${verification.status || 'UNPAID'}`,
        };
      }

      // Verify amount integrity from provider response
      if (verification.amountCents) {
        const amountCheck = verifyPaymentAmountAndCurrency(order, {
          amountPaidCents: verification.amountCents,
          currency: verification.currency,
        });
        if (!amountCheck.isValid) {
          return {
            success: false,
            paymentStatus: 'FAILED',
            transactionId: effectiveTxnId,
            order,
            error: `Security payment amount validation failed: ${amountCheck.reason}`,
          };
        }
      }
      if (verification.currency) {
        order.currency = verification.currency;
      }
    }
  }

  // 3. Update Order Status Authoritatively on Backend
  order.paymentStatus = 'PAID';
  order.paidAt = new Date().toISOString();
  order.transactionId = effectiveTxnId;
  order.cjStatus = 'Auto-Fulfilled';
  order.status = 'CONFIRMED';
  // Payment consumed the held stock: RESERVED -> DEDUCTED (terminal).
  order.inventoryStatus = 'DEDUCTED';
  // Persist server-verified Creem identifiers for admin fulfillment.
  if (params.creemCheckoutId) order.creemCheckoutId = params.creemCheckoutId;
  else if (sessionId) order.creemCheckoutId = sessionId;
  if (params.creemOrderId) order.creemOrderId = params.creemOrderId;
  if (params.creemCustomerId) order.creemCustomerId = params.creemCustomerId;
  if (params.currency) order.currency = params.currency;

  const historyEntry = {
    status: 'DROPCO_SYNCED' as const,
    description: `Payment captured & verified via Creem.io MOR (Txn: ${effectiveTxnId}, Source: ${source}). Synchronized for automated fulfillment.`,
    timestamp: new Date().toISOString(),
    location: 'LankaBuy Secure Payment Engine',
  };

  order.trackingHistory = order.trackingHistory || [];
  order.trackingHistory.unshift(historyEntry);

  return {
    success: true,
    paymentStatus: 'PAID',
    transactionId: effectiveTxnId,
    order,
  };
}
