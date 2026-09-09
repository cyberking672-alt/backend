/**
 * LankaBuy Server-Side Atomic Inventory Guard
 *
 * Prevents overselling when two customers click BUY at nearly the same time.
 *
 * Design (fits the existing Firestore architecture):
 * - Firestore `products/{id}` documents are the single source of truth for
 *   local (`admin_local` / domestic) product stock.
 * - Reservation + release run inside Firestore `runTransaction` blocks, so
 *   concurrent checkouts serialize: the loser sees the decremented stock and
 *   fails with INSUFFICIENT_STOCK instead of overselling.
 * - Stock can NEVER go negative: the guard `stock >= requested` is evaluated
 *   inside the transaction, and writes use atomic `FieldValue.increment`.
 * - Virtual supplier products (`global-cj-*`, fulfilled on-demand by CJ
 *   Dropshipping) carry no local inventory and are intentionally skipped —
 *   availability for those is supplier-side, exactly as before.
 * - Payment state and inventory state stay separate (`paymentStatus` vs
 *   `inventoryStatus` on the order). Reservations are restored (RELEASED)
 *   when payment fails/is cancelled — stock is only permanently consumed
 *   (DEDUCTED) on verified PAID / COD-confirmed orders.
 */

import { FieldValue, getFirestore } from 'firebase-admin/firestore';
import { firebaseAdminApp } from './security.ts';
import { dbPool } from './dbPool.ts';

const firestoreDatabaseId = process.env.FIRESTORE_DATABASE_ID?.trim()
  || process.env.FIREBASE_FIRESTORE_DATABASE_ID?.trim()
  || 'default';

export interface StockLineItem {
  productId: string;
  quantity: number;
}

export type StockReservationCode =
  | 'RESERVED'
  | 'INSUFFICIENT_STOCK'
  | 'INVENTORY_UNAVAILABLE';

export interface StockReservationResult {
  success: boolean;
  code: StockReservationCode;
  message?: string;
  shortages?: { productId: string; requested: number; available: number }[];
}

/** Virtual supplier products hold no local inventory (fulfilled on demand). */
export function isVirtualSupplierProduct(productId: string): boolean {
  return String(productId || '').startsWith('global-cj-');
}

function getInventoryDb() {
  if (!firebaseAdminApp) {
    throw new Error('Firebase Admin Firestore is unavailable.');
  }
  return getFirestore(firebaseAdminApp, firestoreDatabaseId);
}

function aggregateByProduct(items: StockLineItem[]): Map<string, number> {
  const map = new Map<string, number>();
  for (const item of items || []) {
    const pid = String(item?.productId || '').trim();
    const qty = Math.max(0, Math.floor(Number(item?.quantity) || 0));
    if (!pid || qty <= 0) continue;
    if (isVirtualSupplierProduct(pid)) continue;
    map.set(pid, (map.get(pid) || 0) + qty);
  }
  return map;
}

/**
 * Atomically reserve stock for an order. All-or-nothing: either every
 * Firestore-backed line item is decremented, or none is (transaction).
 */
export async function reserveStockForOrder(items: StockLineItem[]): Promise<StockReservationResult> {
  const needs = aggregateByProduct(items);
  if (needs.size === 0) {
    return { success: true, code: 'RESERVED' };
  }

  let db;
  try {
    db = getInventoryDb();
  } catch {
    return {
      success: false,
      code: 'INVENTORY_UNAVAILABLE',
      message: 'Inventory service is unavailable; checkout was blocked to prevent overselling.',
    };
  }

  const entries = Array.from(needs.entries());

  try {
    await db.runTransaction(async (tx) => {
      // All reads first (Firestore requires reads before writes in a txn).
      const snaps = await Promise.all(
        entries.map(([pid]) => tx.get(db.collection('products').doc(pid)))
      );

      const shortages: { productId: string; requested: number; available: number }[] = [];
      for (let i = 0; i < entries.length; i++) {
        const [pid, need] = entries[i];
        const snap = snaps[i];
        // Seed/virtual docs absent from Firestore carry no enforceable
        // inventory — skip (preserves legacy behaviour for those items).
        if (!snap.exists) continue;
        const stock = (snap.data() as any)?.stock;
        if (typeof stock !== 'number' || !Number.isFinite(stock)) continue;
        if (stock < need) {
          shortages.push({ productId: pid, requested: need, available: stock });
        }
      }

      if (shortages.length > 0) {
        const err: any = new Error(
          shortages.map((s) => `Product ${s.productId} has only ${s.available} item(s) available`).join('; ')
        );
        err.code = 'INSUFFICIENT_STOCK';
        err.shortages = shortages;
        throw err;
      }

      for (let i = 0; i < entries.length; i++) {
        const [pid, need] = entries[i];
        if (!snaps[i].exists) continue;
        tx.update(db.collection('products').doc(pid), {
          stock: FieldValue.increment(-need),
          updatedAt: new Date().toISOString(),
        });
      }
    });
  } catch (err: any) {
    if (err?.code === 'INSUFFICIENT_STOCK') {
      return {
        success: false,
        code: 'INSUFFICIENT_STOCK',
        message: err.message,
        shortages: err.shortages || [],
      };
    }
    console.error('[Inventory] Stock reservation transaction failed:', err?.message || err);
    return {
      success: false,
      code: 'INVENTORY_UNAVAILABLE',
      message: 'Inventory service is unavailable; checkout was blocked to prevent overselling.',
    };
  }

  // Keep the in-memory catalog mirror consistent (no second Firestore write).
  for (const [pid, need] of entries) {
    try {
      const cached = await dbPool.getProductById(pid);
      if (cached && typeof cached.stock === 'number' && Number.isFinite(cached.stock)) {
        dbPool.updateProduct({ ...cached, stock: cached.stock - need }, false);
      }
    } catch {
      // Non-fatal: Firestore remains the source of truth.
    }
  }

  return { success: true, code: 'RESERVED' };
}

/**
 * Restore previously reserved stock (payment failed / cancelled / expired).
 * Best-effort: never throws, so release paths can't break order flows.
 */
export async function releaseStockForOrder(items: StockLineItem[], reason = 'released'): Promise<void> {
  const needs = aggregateByProduct(items);
  if (needs.size === 0) return;

  let db;
  try {
    db = getInventoryDb();
  } catch {
    console.warn(`[Inventory] Stock release skipped (${reason}): Firestore unavailable.`);
    return;
  }

  const entries = Array.from(needs.entries());
  try {
    await db.runTransaction(async (tx) => {
      const snaps = await Promise.all(
        entries.map(([pid]) => tx.get(db.collection('products').doc(pid)))
      );
      for (let i = 0; i < entries.length; i++) {
        const [pid, need] = entries[i];
        if (!snaps[i].exists) continue;
        tx.update(db.collection('products').doc(pid), {
          stock: FieldValue.increment(need),
          updatedAt: new Date().toISOString(),
        });
      }
    });

    for (const [pid, need] of entries) {
      try {
        const cached = await dbPool.getProductById(pid);
        if (cached && typeof cached.stock === 'number' && Number.isFinite(cached.stock)) {
          dbPool.updateProduct({ ...cached, stock: cached.stock + need }, false);
        }
      } catch {
        // Non-fatal.
      }
    }
    console.info(`[Inventory] Stock released (${reason}) for ${entries.length} product(s).`);
  } catch (err: any) {
    console.warn(`[Inventory] Stock release failed (${reason}):`, err?.message || err);
  }
}
