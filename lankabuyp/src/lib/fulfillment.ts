/**
 * Admin fulfillment helpers (frontend-safe, no secrets).
 *
 * - buildShippingCopyText(): exact paste-ready block for CJ/QKSource forms.
 * - fulfillmentStage(): display-only mapping from the EXISTING order schema
 *   (status + paymentStatus) onto the 7 fulfillment stages. No new enum.
 */
import type { Order } from '../types';

export type FulfillmentStage =
  | 'pending_payment'
  | 'paid'
  | 'processing'
  | 'shipped'
  | 'delivered'
  | 'cancelled'
  | 'refunded';

export function fulfillmentStage(order: Order): FulfillmentStage {
  const status = String(order?.status || '').toUpperCase();
  const pay = String(order?.paymentStatus || '').toUpperCase();
  if (status === 'CANCELLED') return 'cancelled';
  if (status === 'REFUNDED') return 'refunded';
  if (status === 'DELIVERED') return 'delivered';
  if (status === 'SHIPPED' || status === 'SUBMITTED_TO_SUPPLIER') return 'shipped';
  if (pay === 'PAID') {
    if (status === 'PROCESSING' || status === 'FULFILLING' || status === 'CONFIRMED') return 'processing';
    return 'paid';
  }
  if (pay === 'PENDING_ONLINE' || pay === 'PENDING_COD') return 'pending_payment';
  if (status === 'PROCESSING' || status === 'FULFILLING' || status === 'CONFIRMED') return 'processing';
  return 'pending_payment';
}

export function buildShippingCopyText(order: Order): string {
  const c: any = order?.customer || {};
  const fullAddress = [c.street, c.city, c.district, c.province, c.postalCode]
    .filter((p) => p && String(p).trim())
    .join(', ');
  return [
    `Recipient Name: ${c.fullName || '-'}`,
    `Phone: ${c.phone || '-'}`,
    `WhatsApp: ${c.whatsapp || c.phone || '-'}`,
    `Country: ${c.country || '-'}`,
    `Province: ${c.province || '-'}`,
    `District: ${c.district || '-'}`,
    `City: ${c.city || '-'}`,
    `Full Address: ${fullAddress || '-'}`,
  ].join('\n');
}

export async function copyTextToClipboard(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return true;
    }
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    const ok = document.execCommand('copy');
    document.body.removeChild(ta);
    return ok;
  } catch {
    return false;
  }
}
