/**
 * Server-Side Firebase Admin Firestore Helpers
 *
 * The Express server is a trusted backend that manages the orders, users, and
 * products collections. Reading/writing these collections MUST go through the
 * Firebase Admin SDK (which bypasses client security rules), NOT the client SDK
 * `db` (which requires an authenticated end-user and is rejected by rules).
 *
 * These helpers mirror the client helpers in `src/lib/firebase.ts` but use the
 * Admin Firestore instance so server operations never fail with
 * "Missing or insufficient permissions."
 */

import {
  Product,
  Order,
  UserProfile,
} from '../src/types.ts';
import { firebaseAdminApp } from './security.ts';
import { getFirestore } from 'firebase-admin/firestore';

const firestoreDatabaseId = process.env.FIREBASE_FIRESTORE_DATABASE_ID?.trim() || 'default';

function getAdminDb() {
  if (!firebaseAdminApp) {
    throw new Error('Firebase Admin SDK is not initialized.');
  }
  return getFirestore(firebaseAdminApp, firestoreDatabaseId);
}

// ---------------------------------------------------------------------------
// ORDERS
// ---------------------------------------------------------------------------
export async function getAllOrdersFromFirestoreAdmin(): Promise<Order[]> {
  if (!firebaseAdminApp) return [];
  try {
    const snapshot = await getAdminDb().collection('orders').get();
    return snapshot.docs.map((d) => {
      const data = d.data() as Order;
      if (!data.id && d.id) data.id = d.id;
      return data;
    });
  } catch (err: any) {
    console.warn('[Orders Sync Warning] Failed to fetch orders from Firestore:', err?.message || err);
    return [];
  }
}

export async function saveOrderToFirestoreAdmin(order: Order): Promise<void> {
  if (!firebaseAdminApp) {
    throw new Error('Firebase Admin Firestore is unavailable.');
  }
  await getAdminDb()
    .collection('orders')
    .doc(order.id)
    .set(order, { merge: true });
  console.info(`[Firebase Admin] Saved order ${order.orderNumber} to Firestore`);
}

export async function getOrderFromFirestoreAdmin(
  orderNumberOrId: string,
): Promise<Order | null> {
  if (!firebaseAdminApp) return null;
  try {
    const docRef = getAdminDb().collection('orders').doc(orderNumberOrId);
    const snap = await docRef.get();
    if (snap.exists) {
      return snap.data() as Order;
    }
    const matches = await getAdminDb()
      .collection('orders')
      .where('orderNumber', '==', orderNumberOrId)
      .limit(1)
      .get();
    if (!matches.empty) {
      return matches.docs[0].data() as Order;
    }
    return null;
  } catch (err: any) {
    console.warn('[Firebase Admin] Order lookup error:', err?.message || err);
    return null;
  }
}

export async function deleteOrderFromFirestoreAdmin(orderId: string): Promise<void> {
  if (!firebaseAdminApp) return;
  await getAdminDb().collection('orders').doc(orderId).delete();
}

// ---------------------------------------------------------------------------
// USERS
// ---------------------------------------------------------------------------
export async function getAllUsersFromFirestoreAdmin(): Promise<UserProfile[]> {
  if (!firebaseAdminApp) return [];
  try {
    const snapshot = await getAdminDb().collection('users').get();
    return snapshot.docs.map((d) => d.data() as UserProfile);
  } catch (err: any) {
    console.warn('[Users Sync Notice] Failed to count users from Firestore:', err?.message || err);
    return [];
  }
}

export async function getUserProfileFromFirestoreAdmin(
  uid: string,
): Promise<Record<string, unknown> | null> {
  if (!firebaseAdminApp) return null;
  try {
    const snap = await getAdminDb().collection('users').doc(uid).get();
    return snap.exists ? (snap.data() as Record<string, unknown>) : null;
  } catch (err: any) {
    console.warn('[Firebase Admin] User profile lookup deferred:', err?.message || err);
    return null;
  }
}

// ---------------------------------------------------------------------------
// PRODUCTS
// ---------------------------------------------------------------------------
export async function getAllProductsFromFirestoreAdmin(): Promise<Product[]> {
  if (!firebaseAdminApp) return [];
  try {
    const snapshot = await getAdminDb().collection('products').get();
    return snapshot.docs.map((d) => d.data() as Product);
  } catch (err: any) {
    console.warn('[Firebase Admin] Product query notice:', err?.message || err);
    return [];
  }
}

export async function saveProductToFirestoreAdmin(product: Product): Promise<void> {
  if (!firebaseAdminApp) {
    throw new Error('Firebase Admin Firestore is unavailable.');
  }
  await getAdminDb()
    .collection('products')
    .doc(product.id)
    .set(product, { merge: true });
  console.info(`[Firebase Admin] Saved product ${product.id} (${product.title}) to Firestore`);
}

export async function deleteProductFromFirestoreAdmin(productId: string): Promise<void> {
  if (!firebaseAdminApp) return;
  await getAdminDb().collection('products').doc(productId).delete();
  console.info(`[Firebase Admin] Deleted product ${productId} from Firestore`);
}
