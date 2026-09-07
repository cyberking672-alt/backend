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
  fullName: z
    .string()
    .default('Valued Customer')
    .transform(sanitizeString),
  phone: z
    .string()
    .default('0771234567')
    .transform(sanitizeString),
  email: z
    .string()
    .default('customer@lankabuy.lk')
    .transform((val) => sanitizeString(val.toLowerCase())),
  street: z
    .string()
    .default('Main Street')
    .transform(sanitizeString),
  city: z
    .string()
    .default('Colombo')
    .transform(sanitizeString),
  district: z
    .string()
    .default('Colombo')
    .transform((val) => sanitizeString(val)),
  province: z
    .string()
    .default('Western')
    .transform((val) => sanitizeString(val)),
  postalCode: z
    .string()
    .default('00100')
    .transform((val) => sanitizeString(val)),
  country: z
    .string()
    .default('Sri Lanka')
    .transform(sanitizeString),
});

/**
 * Zod Schema for Individual Cart Line Item
 */
export const orderItemSchema = z.object({
  productId: z.any().transform((val) => sanitizeString(String(val || 'prod-item'))),
  title: z.any().transform((val) => sanitizeString(String(val || 'LankaBuy Product'))),
  sku: z.any().transform((val) => sanitizeString(String(val || 'SKU-DIRECT'))),
  unitPrice: z.any().transform((val) => {
    const num = Number(val);
    return isNaN(num) || num <= 0 ? 3500 : num;
  }),
  wholesaleCost: z.any().transform((val) => {
    const num = Number(val);
    return isNaN(num) || num <= 0 ? 2450 : num;
  }),
  quantity: z.any().transform((val) => {
    const num = Math.floor(Number(val));
    return isNaN(num) || num < 1 ? 1 : num;
  }),
  imageUrl: z.any().transform((val) => (val ? sanitizeString(String(val)) : '')),
});

/**
 * Zod Schema for Entire Order Submission Request
 */
export const createOrderRequestSchema = z.object({
  customer: customerShippingSchema.optional().default({}),
  items: z.array(orderItemSchema).min(1, 'At least 1 item is required in cart'),
  shippingFee: z.any().transform((val) => Math.max(0, Number(val) || 0)),
  discount: z.any().transform((val) => Math.max(0, Number(val) || 0)),
  voucherCode: z.any().transform((val) => (val ? sanitizeString(String(val).toUpperCase()) : '')),
  paymentMethod: z.any().transform((val) => {
    const m = String(val || 'COD').toUpperCase();
    if (m === 'CARD' || m === 'CREEM_MOR') return 'CREDIT_CARD';
    return m;
  }),
});

export type ValidatedOrderInput = z.infer<typeof createOrderRequestSchema>;

/**
 * Zod Schema for Checkout Initiation
 */
export const checkoutRequestSchema = z.object({
  cart: z.array(z.any()).optional(),
  items: z.array(z.any()).optional(),
  customer: customerShippingSchema.optional().default({}),
  customerEmail: z.string().optional().transform((v) => (v ? sanitizeString(v.toLowerCase()) : '')),
  customerName: z.string().optional().transform((v) => (v ? sanitizeString(v) : '')),
  customerPhone: z.string().optional().transform((v) => (v ? sanitizeString(v) : '')),
  paymentMethod: z.string().optional().default('CREDIT_CARD').transform((v) => sanitizeString(v.toUpperCase())),
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


