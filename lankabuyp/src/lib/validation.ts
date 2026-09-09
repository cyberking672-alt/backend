import { z } from 'zod';
import { ShippingAddress, OrderItem } from '../types';

/**
 * XSS & Injection Sanitization Helper
 * Strips dangerous HTML tags, javascript: pseudo-protocols, and inline event handlers.
 */
export function sanitizeString(input: string): string {
  if (typeof input !== 'string') return '';
  return input
    .replace(/[<>]/g, '') // Strip < and > to prevent direct HTML/Script injections
    .replace(/javascript:/gi, '') // Strip javascript: schemes
    .replace(/on\w+=/gi, '') // Strip inline event handlers like onclick=
    .trim();
}

/**
 * Zod Schema for Customer Delivery Details (Sri Lankan Address)
 */
export const customerShippingSchema = z.object({
  fullName: z.string().trim().min(2).max(100).transform(sanitizeString),
  phone: z.string().trim().min(9).max(15).transform(sanitizeString),
  email: z.string().trim().email().max(254).transform((val) => sanitizeString(val.toLowerCase())),
  street: z.string().trim().min(3).max(200).transform(sanitizeString),
  city: z.string().trim().min(2).max(80).transform(sanitizeString),
  district: z.string().trim().min(2).max(80).transform(sanitizeString),
  province: z.string().trim().min(2).max(80).transform(sanitizeString),
  postalCode: z.string().trim().min(3).max(20).transform(sanitizeString),
  country: z.literal('Sri Lanka'),
  // Optional additive fields for fulfillment (WhatsApp + calling code).
  whatsapp: z.string().trim().max(15).optional().transform((val) => (val ? sanitizeString(val) : undefined)),
  countryCallingCode: z.string().trim().max(8).optional().transform((val) => (val ? sanitizeString(val) : undefined)),
});

/**
 * Zod Schema for Individual Cart Line Item
 */
export const orderItemSchema = z.object({
  productId: z.string().trim().min(1).max(200).transform(sanitizeString),
  quantity: z.coerce.number().int().min(1).max(99),
  selectedColor: z.string().max(100).optional().transform((val) => val ? sanitizeString(val) : ''),
  selectedSize: z.string().max(100).optional().transform((val) => val ? sanitizeString(val) : ''),
});

/**
 * Zod Schema for Entire Order Submission Request
 */
export const createOrderRequestSchema = z.object({
  customer: customerShippingSchema,
  items: z.array(orderItemSchema).min(1, 'At least 1 item is required in cart'),
  voucherCode: z.string().max(50).optional().transform((val) => (val ? sanitizeString(val.toUpperCase()) : '')),
  paymentMethod: z.string().transform((val) => {
    const m = String(val || 'COD').toUpperCase();
    if (m === 'CARD' || m === 'CREEM_MOR') return 'CREDIT_CARD';
    return m;
  }).pipe(z.enum(['COD', 'CREDIT_CARD', 'LANKA_QR', 'KOKO_MINTPAY'])),
});

export type ValidatedOrderInput = z.infer<typeof createOrderRequestSchema>;

/**
 * Zod Schema for Checkout Initiation
 */
export const checkoutRequestSchema = z.object({
  cart: z.array(z.any()).optional(),
  items: z.array(orderItemSchema).optional(),
  customer: customerShippingSchema,
  customerEmail: z.string().optional().transform((v) => (v ? sanitizeString(v.toLowerCase()) : '')),
  customerName: z.string().optional().transform((v) => (v ? sanitizeString(v) : '')),
  customerPhone: z.string().optional().transform((v) => (v ? sanitizeString(v) : '')),
  paymentMethod: z.string().optional().default('CREDIT_CARD')
    .transform((v) => sanitizeString(v.toUpperCase()))
    .pipe(z.enum(['COD', 'CREDIT_CARD', 'LANKA_QR', 'KOKO_MINTPAY', 'CARD', 'CREEM_MOR'])),
  successUrl: z.string().optional().transform((v) => (v ? sanitizeString(v) : '')),
  discount: z.number().optional().default(0),
  voucherCode: z.string().optional().default(''),
});

/**
 * Zod Schema for Google OAuth Token Submission
 */
export const googleAuthRequestSchema = z.object({
  credential: z.string().min(1, 'Google credential token is required'),
  client_id: z.string().optional(),
});

/**
 * Zod Schema for Real-Signal Analytics Event Tracking
 */
export const analyticsEventSchema = z.object({
  productId: z.string().min(1, 'Product ID is required').transform(sanitizeString),
  eventType: z.enum(['view', 'add_to_cart', 'buy_now', 'purchase']),
  metadata: z.record(z.string(), z.any()).optional().default({}),
});

/**
 * Zod Schema for Admin Actions
 */
export const adminActionSchema = z.object({
  action: z.string().min(1).transform(sanitizeString),
  payload: z.record(z.string(), z.any()).optional().default({}),
});
