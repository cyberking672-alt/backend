/**
 * Creem.io (MOR) Automated Product Sync & Payment Gateway Service
 * Handles:
 * 1. Automatic sync of catalog products to Creem (POST /v1/products)
 * 2. Designated "Store Order" product creation for multi-item cart checkouts
 * 3. Strict Creem checkout payload schema compliance
 * 4. Full error body logging and meaningful error responses
 */

import { Product } from '../src/types.ts';
import { dbPool } from './dbPool.ts';

// In-Memory cache for synced Creem product IDs
const productCreemIdCache = new Map<string, string>();
let cachedGenericOrderId: string | null = null;

// Helper to determine active Creem API Base URL
export function getCreemConfig() {
  const apiKey = (
    process.env.CREEM_API_KEY ||
    process.env.CREEM_SECRET_KEY ||
    process.env.CREEM_ACCESS_TOKEN ||
    ''
  ).trim();

  const isTest = apiKey.startsWith('creem_test_') || apiKey.startsWith('test_');
  const baseUrl = isTest ? 'https://test-api.creem.io/v1' : 'https://api.creem.io/v1';

  const isConfigured =
    apiKey.length >= 10 &&
    !apiKey.includes('ඔබගේ') &&
    !apiKey.includes('your_') &&
    !apiKey.includes('placeholder') &&
    !apiKey.includes('change_me');

  return { apiKey, baseUrl, isTest, isConfigured };
}

export function getPublicAppUrl(): URL {
  const configuredUrl = (process.env.PUBLIC_APP_URL || process.env.APP_URL || '').trim();
  const value = configuredUrl || (process.env.NODE_ENV === 'production' ? '' : 'http://localhost:3000');
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new Error('PUBLIC_APP_URL or APP_URL must be an absolute URL, for example https://shop.example.com.');
  }

  if (!['http:', 'https:'].includes(url.protocol) || !url.hostname) {
    throw new Error('PUBLIC_APP_URL or APP_URL must use http:// or https:// with a valid hostname.');
  }
  if (process.env.NODE_ENV === 'production' && url.protocol !== 'https:') {
    throw new Error('PUBLIC_APP_URL or APP_URL must use HTTPS in production.');
  }
  return url;
}

export function getCreemWebhookUrl(): URL {
  const configuredUrl = (process.env.CREEM_WEBHOOK_URL || '').trim();
  const baseUrl = getPublicAppUrl();
  const webhookUrl = new URL(configuredUrl || '/api/webhooks/creem', baseUrl);
  if (process.env.NODE_ENV === 'production' && webhookUrl.protocol !== 'https:') {
    throw new Error('CREEM_WEBHOOK_URL must use HTTPS in production.');
  }
  return webhookUrl;
}

/**
 * 1. AUTO-SYNC PRODUCT TO CREEM (POST /v1/products)
 * Synchronizes an individual product with Creem.io to obtain prod_xxxx
 */
export async function syncProductToCreem(item: {
  id: string;
  title?: string;
  name?: string;
  price?: number;
  description?: string;
  creemProductId?: string;
  wholesaleCost?: number;
}): Promise<string | null> {
  const { apiKey, baseUrl, isConfigured } = getCreemConfig();

  // 1. Check if product already has a valid creemProductId
  if (item.creemProductId && item.creemProductId.startsWith('prod_')) {
    productCreemIdCache.set(item.id, item.creemProductId);
    return item.creemProductId;
  }

  // 2. Check local memory cache
  if (productCreemIdCache.has(item.id)) {
    return productCreemIdCache.get(item.id)!;
  }

  // If Creem API key is not configured or in sandbox fallback mode
  if (!isConfigured) {
    const fallbackId = `prod_sbx_${item.id.replace(/[^a-zA-Z0-9_]/g, '_')}`;
    productCreemIdCache.set(item.id, fallbackId);
    return fallbackId;
  }

  try {
    const itemName = (item.title || item.name || `LankaBuy Item ${item.id}`).substring(0, 100);
    const itemDesc = (item.description || 'LankaBuy Verified Dropshipping Item').substring(0, 255);
    
    // Convert LKR to USD cents (approx 305 LKR / USD)
    const priceLkr = item.price || 3500;
    const priceUsd = Math.max(1.0, Number((priceLkr / 305).toFixed(2)));
    const priceInCents = Math.max(100, Math.round(priceUsd * 100));

    const payload = {
      name: itemName,
      price: priceInCents,
      currency: 'USD',
      billing_type: 'onetime',
      description: itemDesc,
    };

    console.info(`[Creem Auto-Sync] Syncing product "${itemName}" to Creem (${baseUrl}/products)...`);

    const response = await fetch(`${baseUrl}/products`, {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const responseData = await response.json().catch(() => ({}));

    if (!response.ok) {
      // 5. ERROR HANDLING: Log full response body from Creem
      console.error(
        `[Creem Auto-Sync Failed]: HTTP ${response.status} for product "${itemName}". Full Creem Response Body:`,
        JSON.stringify(responseData, null, 2)
      );
      return null;
    }

    const creemId = responseData.id || responseData.product_id;
    if (creemId) {
      console.info(`[Creem Auto-Sync Success]: Synced product "${itemName}" -> Creem ID: ${creemId}`);
      productCreemIdCache.set(item.id, creemId);

      // Save creemProductId in DB pool
      const existingProduct = await dbPool.getProductById(item.id);
      if (existingProduct) {
        existingProduct.creemProductId = creemId;
        dbPool.updateProduct(existingProduct);
      }

      return creemId;
    }

    return null;
  } catch (error: any) {
    console.error(`[Creem Auto-Sync Network Exception for ${item.id}]:`, error);
    return null;
  }
}

/**
 * 2. GET OR CREATE DESIGNATED "Store Order" PRODUCT IN CREEM
 * Ensures a single generic product exists for multi-item cart checkouts
 */
export async function getOrCreateGenericStoreOrderProduct(): Promise<string> {
  const envGeneric = (process.env.CREEM_GENERIC_PRODUCT_ID || process.env.CREEM_PRODUCT_ID || '').trim();
  if (envGeneric && envGeneric.startsWith('prod_') && !envGeneric.includes('generic_order')) {
    return envGeneric;
  }

  if (cachedGenericOrderId) {
    return cachedGenericOrderId;
  }

  const { apiKey, baseUrl, isConfigured } = getCreemConfig();
  if (!isConfigured) {
    cachedGenericOrderId = 'prod_generic_store_order';
    return cachedGenericOrderId;
  }

  try {
    const payload = {
      name: 'LankaBuy Store Order',
      price: 100, // $1.00 base unit (overridden by custom_price on checkout)
      currency: 'USD',
      billing_type: 'onetime',
      description: 'LankaBuy E-Commerce Multi-Item Store Order',
    };

    console.info(`[Creem Init] Creating designated "Store Order" product in Creem...`);
    const res = await fetch(`${baseUrl}/products`, {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const data = await res.json().catch(() => ({}));
    if (res.ok && (data.id || data.product_id)) {
      cachedGenericOrderId = data.id || data.product_id;
      console.info(`[Creem Init] Successfully created "Store Order" product: ${cachedGenericOrderId}`);
      return cachedGenericOrderId!;
    } else {
      console.warn('[Creem Init Product Note]: Response from Creem:', JSON.stringify(data));
      cachedGenericOrderId = envGeneric || 'prod_generic_store_order';
      return cachedGenericOrderId;
    }
  } catch (err: any) {
    console.error('[Creem Init Product Network Error]:', err);
    cachedGenericOrderId = 'prod_generic_store_order';
    return cachedGenericOrderId;
  }
}

export interface CreemCheckoutParams {
  cart: any[];
  customer: {
    fullName?: string;
    name?: string;
    email?: string;
    phone?: string;
    id?: string;
  };
  totalLkr: number;
  totalUsd: number;
  orderNumber: string;
  orderId: string;
  idempotencyKey?: string;
  successUrl?: string;
}

/**
 * 3. CART CHECKOUT (Multi-item & Single-item)
 * Uses ONE product_id, sets custom_price, sends cart in metadata, strictly adheres to Creem schema
 */
export async function createCreemCheckoutSession(params: {
  cart: any[];
  customer: {
    fullName?: string;
    name?: string;
    email?: string;
    phone?: string;
    id?: string;
  };
  totalLkr: number;
  totalUsd: number;
  orderNumber: string;
  orderId: string;
  idempotencyKey?: string;
  successUrl?: string;
}): Promise<{
  success: boolean;
  checkout_url?: string;
  sessionId?: string;
  orderId?: string;
  orderNumber?: string;
  error?: string;
  details?: any;
}> {
  const { cart, customer, totalLkr, totalUsd, orderNumber, orderId, idempotencyKey, successUrl } = params;
  const { apiKey, baseUrl, isConfigured } = getCreemConfig();

  const totalCents = Math.max(100, Math.round(totalUsd * 100));

  // Determine single product_id for checkout:
  // If cart has exactly 1 item and it has a synced Creem product, we can use it; otherwise use generic "Store Order"
  let productId: string | null = null;
  if (cart.length === 1 && cart[0].creemProductId) {
    productId = cart[0].creemProductId;
  } else if (cart.length === 1 && cart[0].productId) {
    productId = await syncProductToCreem({
      id: cart[0].productId,
      title: cart[0].title || cart[0].name,
      price: cart[0].price || cart[0].unitPrice,
    });
  }

  if (!productId || !productId.startsWith('prod_')) {
    productId = await getOrCreateGenericStoreOrderProduct();
  }

  const customerName = (customer.fullName || customer.name || 'Valued Customer').trim();
  const customerEmail = (customer.email || 'customer@lankabuy.lk').trim();
  const customerPhone = (customer.phone || '').trim();

  // 3. CHECKOUT REQUEST — only send fields Creem's schema actually supports:
  // product_id (required), custom_price, units, customer: { id, email, name } ONLY (no street/city/phone in customer object)
  const creemPayload: any = {
    product_id: productId,
    custom_price: totalCents,
    customer: customerEmail
      ? {
          email: customerEmail,
          name: customerName,
          ...(customer.id ? { id: customer.id } : {}),
        }
      : undefined,
    success_url: successUrl || new URL(`/order/${encodeURIComponent(orderNumber)}`, getPublicAppUrl()).toString(),
    metadata: {
      orderId,
      orderNumber,
      customerPhone,
      totalLkr: String(totalLkr),
      totalUsd: String(totalUsd),
      cart_json: JSON.stringify(
        cart.map((item) => ({
          id: item.productId || item.id,
          name: item.title || item.name || 'Item',
          qty: item.quantity || item.qty || 1,
          price: item.unitPrice || item.price || 0,
        }))
      ),
    },
  };

  if (!isConfigured) {
    console.info(`[Creem Sandbox Checkout] Created local checkout session for order #${orderNumber} ($${totalUsd})`);
    return {
      success: true,
      checkout_url: `/order/${orderNumber}`,
      sessionId: `creem_sbx_${orderId}`,
      orderId,
      orderNumber,
    };
  }

  console.info(`[Creem Checkout Request] Calling ${baseUrl}/checkouts with product_id: ${productId}, custom_price: ${totalCents} cents...`);

  try {
    const headers: Record<string, string> = {
      'x-api-key': apiKey,
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    };
    if (idempotencyKey) {
      headers['Idempotency-Key'] = idempotencyKey;
    }

    const res = await fetch(`${baseUrl}/checkouts`, {
      method: 'POST',
      headers,
      body: JSON.stringify(creemPayload),
    });

    const resBody = await res.json().catch(() => ({}));

    if (!res.ok) {
      // 5. ERROR HANDLING: Log the full response body from Creem so actual validation error is visible
      console.error(
        `[Creem Checkout API Error]: HTTP ${res.status}. Full Creem Response Body:`,
        JSON.stringify(resBody, null, 2)
      );

      const errorMessage =
        resBody.message ||
        resBody.error ||
        resBody.detail ||
        (Array.isArray(resBody.errors) ? resBody.errors.join(', ') : null) ||
        `Creem API Error (HTTP ${res.status}): ${JSON.stringify(resBody)}`;

      return {
        success: false,
        error: errorMessage,
        details: resBody,
      };
    }

    const checkoutUrl = resBody.checkout_url || resBody.url;
    const sessionId = resBody.id || resBody.session_id;

    console.info(`[Creem Checkout Success]: Hosted URL created: ${checkoutUrl}`);

    return {
      success: true,
      checkout_url: checkoutUrl,
      sessionId,
      orderId,
      orderNumber,
      details: resBody,
    };
  } catch (err: any) {
    console.error('[Creem Checkout Network Error]:', err);
    return {
      success: false,
      error: `Network error connecting to Creem payment gateway: ${err.message}`,
    };
  }
}

/**
 * 4. AUTHORITATIVE SERVER-SIDE SESSION VERIFICATION (GET /v1/checkouts/:id)
 * Queries Creem API directly to verify the real payment status, amount, and currency.
 */
export async function fetchCreemCheckoutSession(sessionId: string): Promise<{
  success: boolean;
  session?: any;
  isPaid?: boolean;
  status?: string;
  amountCents?: number;
  currency?: string;
  orderId?: string;
  orderNumber?: string;
  error?: string;
}> {
  if (!sessionId) {
    return { success: false, error: 'Session ID is required' };
  }

  const { apiKey, baseUrl, isConfigured } = getCreemConfig();

  if (!isConfigured) {
    return {
      success: true,
      isPaid: false,
      status: 'UNCONFIGURED_GATEWAY',
      session: null,
    };
  }

  try {
    const cleanSessionId = sessionId.trim();
    const res = await fetch(`${baseUrl}/checkouts/${encodeURIComponent(cleanSessionId)}`, {
      method: 'GET',
      headers: {
        'x-api-key': apiKey,
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
    });

    const resBody = await res.json().catch(() => ({}));

    if (!res.ok) {
      return {
        success: false,
        error: resBody.message || resBody.error || `Creem API error (${res.status})`,
      };
    }

    const status = (resBody.status || resBody.payment_status || '').toLowerCase();
    const isPaid = status === 'completed' || status === 'paid' || status === 'succeeded';
    const amountCents = Number(resBody.custom_price || resBody.amount || resBody.total_amount || 0);
    const currency = String(resBody.currency || 'USD').toUpperCase();
    const metadata = resBody.metadata || {};

    return {
      success: true,
      session: resBody,
      isPaid,
      status,
      amountCents,
      currency,
      orderId: metadata.orderId,
      orderNumber: metadata.orderNumber,
    };
  } catch (err: any) {
    return {
      success: false,
      error: `Network error verifying checkout session with Creem: ${err.message}`,
    };
  }
}
