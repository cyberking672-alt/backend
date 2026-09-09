import { initializeApp, getApps, getApp } from 'firebase/app';
import { 
  getAuth, 
  browserLocalPersistence,
  setPersistence,
  GoogleAuthProvider, 
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  updateProfile,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  User as FirebaseUser
} from 'firebase/auth';
import {
  initializeFirestore,
  getFirestore,
  doc,
  getDocFromServer,
  collection,
  setDoc,
  getDoc,
  getDocs,
  deleteDoc,
  query,
  where,
  limit,
  orderBy,
  onSnapshot,
} from 'firebase/firestore';
import { Order, Product, UserProfile, UserAddress } from '../types';

const viteEnv = (import.meta as ImportMeta & { env?: Record<string, string> }).env || {};
const runtimeEnv = typeof process !== 'undefined' ? process.env : {};
const envConfig = {
  apiKey: viteEnv.VITE_FIREBASE_API_KEY || runtimeEnv.VITE_FIREBASE_API_KEY,
  authDomain: viteEnv.VITE_FIREBASE_AUTH_DOMAIN || runtimeEnv.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: viteEnv.VITE_FIREBASE_PROJECT_ID || runtimeEnv.VITE_FIREBASE_PROJECT_ID,
  storageBucket: viteEnv.VITE_FIREBASE_STORAGE_BUCKET || runtimeEnv.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: viteEnv.VITE_FIREBASE_MESSAGING_SENDER_ID || runtimeEnv.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: viteEnv.VITE_FIREBASE_APP_ID || runtimeEnv.VITE_FIREBASE_APP_ID,
  measurementId: viteEnv.VITE_FIREBASE_MEASUREMENT_ID || runtimeEnv.VITE_FIREBASE_MEASUREMENT_ID,
};

const app = !getApps().length ? initializeApp(envConfig) : getApp();

const FIRESTORE_DATABASE_ID = viteEnv.VITE_FIREBASE_FIRESTORE_DATABASE_ID ||
  runtimeEnv.VITE_FIREBASE_FIRESTORE_DATABASE_ID ||
  'default';

let firestoreInstance;
try {
  firestoreInstance = initializeFirestore(app, {
    experimentalForceLongPolling: true,
  }, FIRESTORE_DATABASE_ID);
} catch {
  firestoreInstance = getFirestore(app, FIRESTORE_DATABASE_ID);
}

export const db = firestoreInstance;
export const auth = getAuth(app);
export const authPersistenceReady = setPersistence(auth, browserLocalPersistence);
export { onAuthStateChanged };

function createGoogleProvider(): GoogleAuthProvider {
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: 'select_account' });
  provider.addScope('email');
  provider.addScope('profile');
  return provider;
}

async function withAuthTimeout<T>(operation: Promise<T>, operationName: string, timeoutMs = 30000): Promise<T> {
  let timeoutId: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => {
      const error = new Error(`${operationName} timed out. Check your network connection and try again.`);
      error.name = 'AuthTimeoutError';
      reject(error);
    }, timeoutMs);
  });

  try {
    return await Promise.race([operation, timeout]);
  } finally {
    if (timeoutId) clearTimeout(timeoutId);
  }
}

export async function signInWithGoogle(): Promise<UserProfile> {
  await authPersistenceReady;
  const provider = createGoogleProvider();

  try {
    const { user } = await signInWithPopup(auth, provider);
    const userProfile: UserProfile = {
      uid: user.uid,
      email: user.email || '',
      displayName: user.displayName || user.email?.split('@')[0] || 'Customer',
      photoURL: user.photoURL || undefined,
      createdAt: new Date().toISOString(),
    };

    console.info('[Auth] Google popup sign-in succeeded', {
      uid: user.uid,
      email: user.email,
      displayName: user.displayName,
    });
    const idToken = await user.getIdToken();
    const sessionResponse = await fetch('/api/auth/session', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ idToken }),
    });
    if (!sessionResponse.ok) {
      throw new Error('The server could not establish a secure session.');
    }
    const sessionData = await sessionResponse.json();
    if (!sessionData.authenticated || !sessionData.user?.uid) {
      throw new Error('The server did not confirm the authenticated session.');
    }
    return {
      ...userProfile,
      uid: sessionData.user.uid,
      email: sessionData.user.email || userProfile.email,
      displayName: sessionData.user.displayName || userProfile.displayName,
    };
  } catch (err: any) {
    console.error('[Firebase Auth] Google popup sign-in failed', {
      code: err?.code || 'auth/unknown',
      message: err?.message || 'Google sign-in failed.',
    });
    throw err;
  }
}

// Email & Password Sign In
export async function signInWithEmail(email: string, pass: string): Promise<UserProfile> {
  try {
    await authPersistenceReady;
    const res = await withAuthTimeout(
      signInWithEmailAndPassword(auth, email.trim(), pass),
      'Email sign-in',
    );
    const u = res.user;
    const userProfile: UserProfile = {
      uid: u.uid,
      email: u.email || email.trim(),
      displayName: u.displayName || email.split('@')[0] || 'Customer',
      photoURL: u.photoURL || undefined,
      createdAt: new Date().toISOString(),
    };
    return userProfile;
  } catch (err: any) {
    console.error('[Firebase Auth Error] Email sign in failed:', err);
    throw err;
  }
}

// Email & Password Sign Up / Registration
export async function signUpWithEmail(email: string, pass: string, fullName?: string): Promise<UserProfile> {
  try {
    await authPersistenceReady;
    const res = await withAuthTimeout(
      createUserWithEmailAndPassword(auth, email.trim(), pass),
      'Account registration',
    );
    const u = res.user;
    if (fullName && fullName.trim()) {
      try {
        await updateProfile(u, { displayName: fullName.trim() });
      } catch {}
    }
    const userProfile: UserProfile = {
      uid: u.uid,
      email: u.email || email.trim(),
      displayName: fullName?.trim() || u.displayName || email.split('@')[0] || 'Customer',
      photoURL: u.photoURL || undefined,
      createdAt: new Date().toISOString(),
    };
    void saveUserProfileToFirestore(userProfile);
    return userProfile;
  } catch (err: any) {
    console.error('[Firebase Auth Error] Email registration failed:', err);
    throw err;
  }
}

// Sign Out
export async function signOutUser(): Promise<void> {
  await authPersistenceReady;
  await withAuthTimeout(firebaseSignOut(auth), 'Sign out');
}

// User Profile Sync to Cloud Firestore: users/{uid}
export async function syncUserToFirestore(user: FirebaseUser | UserProfile): Promise<UserProfile> {
  const uid = user.uid;
  const email = ('email' in user && user.email) ? user.email : '';
  const displayName = ('displayName' in user && user.displayName) ? user.displayName : email.split('@')[0] || 'Customer';
  const photoURL = ('photoURL' in user && user.photoURL) ? user.photoURL : undefined;

  const userProfile: UserProfile = {
    uid,
    email,
    displayName,
    photoURL,
    createdAt: ('createdAt' in user && (user as any).createdAt) ? (user as any).createdAt : new Date().toISOString(),
  };

  try {
    const userRef = doc(db, 'users', uid);
    const snap = await getDoc(userRef);

    if (!snap.exists()) {
      await setDoc(userRef, {
        uid: userProfile.uid,
        email: userProfile.email,
        displayName: userProfile.displayName,
        photoURL: userProfile.photoURL || '',
        createdAt: userProfile.createdAt,
        lastLogin: new Date().toISOString(),
      }, { merge: true });
    } else {
      const data = snap.data();
      if (data?.createdAt) {
        userProfile.createdAt = data.createdAt;
      }
      await setDoc(userRef, {
        displayName: userProfile.displayName,
        photoURL: userProfile.photoURL || '',
        lastLogin: new Date().toISOString(),
      }, { merge: true });
    }
  } catch (err) {
    console.warn('[Firebase] Firestore user sync notice:', err);
  }

  return userProfile;
}

export const saveUserProfileToFirestore = syncUserToFirestore;
export const loginWithGoogle = signInWithGoogle;

export async function getFirebaseIdToken(): Promise<string | null> {
  return auth.currentUser ? auth.currentUser.getIdToken() : null;
}

// Saved Address Management
export async function getUserAddressesFromFirestore(userId: string): Promise<UserAddress[]> {
  if (!userId || userId === 'guest-user') throw new Error('Authentication is required to load addresses.');
  const token = await getFirebaseIdToken();
  if (!token) throw new Error('Authentication is required to load addresses.');
  const response = await fetch('/api/user/addresses', {
    credentials: 'include',
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await response.json().catch(() => null);
  if (!response.ok || !data?.success) throw new Error(data?.message || 'Unable to load saved addresses.');
  return Array.isArray(data.addresses) ? data.addresses as UserAddress[] : [];
}

export async function saveUserAddressToFirestore(userId: string, address: UserAddress): Promise<void> {
  if (!userId || userId === 'guest-user') throw new Error('Please sign in before saving an address.');
  const token = await getFirebaseIdToken();
  if (!token) throw new Error('Authentication is required to save addresses.');
  const response = await fetch('/api/user/addresses', {
    method: 'POST',
    credentials: 'include',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(address.id ? address : { ...address, id: undefined }),
  });
  const data = await response.json().catch(() => null);
  if (!response.ok || !data?.success) {
    const error = new Error(data?.message || 'Unable to save address.') as Error & { invalidFields?: string[] };
    error.invalidFields = Array.isArray(data?.invalidFields) ? data.invalidFields : undefined;
    throw error;
  }
}

export async function deleteUserAddressFromFirestore(userId: string, addressId: string): Promise<void> {
  try {
    await deleteDoc(doc(db, `users/${userId}/addresses`, addressId));
  } catch (err) {
    console.warn('[Firebase] Error deleting address from Firestore:', err);
  }

}

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
  };
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
    },
    operationType,
    path,
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// Mandatory connection test
export async function testFirebaseConnection() {
  try {
    await getDoc(doc(db, 'test', 'connection'));
    console.info('[Firebase] Firestore connected successfully');
  } catch (error: any) {
    if (error instanceof Error) {
      if (error.message.includes('the client is offline')) {
        console.warn('[Firebase] Client is offline or database initializing.');
      } else {
        console.warn('[Firebase] Connection check notice:', error.message);
      }
    }
  }
}

// Firestore Database Sync helpers
export async function saveOrderToFirestore(order: Order): Promise<void> {
  const path = `orders/${order.id}`;
  try {
    await setDoc(doc(db, 'orders', order.id), order, { merge: true });
    console.info(`[Firebase] Saved order ${order.orderNumber} to Firestore`);
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, path);
  }
}

export async function getOrderFromFirestore(orderNumberOrId: string): Promise<Order | null> {
  try {
    // 1. Direct ID lookup
    const docRef = doc(db, 'orders', orderNumberOrId);
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      return snap.data() as Order;
    }

    // 2. Query by orderNumber
    const q = query(collection(db, 'orders'), where('orderNumber', '==', orderNumberOrId), limit(1));
    const querySnap = await getDocs(q);
    if (!querySnap.empty) {
      return querySnap.docs[0].data() as Order;
    }
    return null;
  } catch (err) {
    console.warn('[Firebase] Order lookup error:', err);
    return null;
  }
}

export async function saveProductToFirestore(product: Product): Promise<void> {
  const path = `products/${product.id}`;
  try {
    await setDoc(doc(db, 'products', product.id), product, { merge: true });
    console.info(`[Firebase] Saved product ${product.id} (${product.title}) to Firestore`);
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, path);
  }
}

export async function deleteProductFromFirestore(productId: string): Promise<void> {
  const path = `products/${productId}`;
  try {
    await deleteDoc(doc(db, 'products', productId));
    console.info(`[Firebase] Deleted product ${productId} from Firestore`);
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, path);
  }
}

export async function getAllProductsFromFirestore(): Promise<Product[]> {
  try {
    const snap = await getDocs(collection(db, 'products'));
    return snap.docs.map(d => d.data() as Product);
  } catch (err) {
    console.warn('[Firebase] Product query notice:', err);
    return [];
  }
}
