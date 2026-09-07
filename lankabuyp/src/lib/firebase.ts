import { initializeApp, getApps, getApp } from 'firebase/app';
import { 
  getAuth, 
  GoogleAuthProvider, 
  signInWithCredential,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
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
import firebaseConfig from '../../firebase-applet-config.json';
import { Order, Product, UserProfile, UserAddress } from '../types';

const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

const FIRESTORE_DATABASE_ID = 'ai-studio-darazdropecommer-c173a869-89f3-4585-bf4e-157daf451339';

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
export const googleProvider = new GoogleAuthProvider();
export { onAuthStateChanged, getRedirectResult };

// Google Sign-In with GoogleAuthProvider (Supports Popup and Redirect fallback)
export async function signInWithGoogle(): Promise<UserProfile | null> {
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: 'select_account' });
  provider.addScope('email');
  provider.addScope('profile');

  try {
    const result = await signInWithPopup(auth, provider);
    if (!result?.user) return null;
    const u = result.user;
    const userProfile: UserProfile = {
      uid: u.uid,
      email: u.email || '',
      displayName: u.displayName || u.email?.split('@')[0] || 'Customer',
      photoURL: u.photoURL || undefined,
      createdAt: new Date().toISOString(),
    };

    await saveUserProfileToFirestore(userProfile);
    return userProfile;
  } catch (err: any) {
    console.error('[Firebase Auth Detailed Raw Error]:', err);
    // Do not swallow any internal error, always pass with complete code and stack/customData
    throw err;
  }
}

// Real Google Sign-In with ID Token (Google Identity Services GSI -> Firebase Auth)
export async function signInWithGoogleIdToken(idToken: string): Promise<UserProfile> {
  try {
    const credential = GoogleAuthProvider.credential(idToken);
    const result = await signInWithCredential(auth, credential);
    const u = result.user;
    const userProfile: UserProfile = {
      uid: u.uid,
      email: u.email || '',
      displayName: u.displayName || u.email?.split('@')[0] || 'Customer',
      photoURL: u.photoURL || undefined,
      createdAt: new Date().toISOString(),
    };
    await saveUserProfileToFirestore(userProfile);
    return userProfile;
  } catch (err: any) {
    console.error('[Firebase Auth GSI Raw Error]:', err);
    throw err;
  }
}

// Alternative Full-Page Redirect Sign-In for environments with strict popup restrictions
export async function signInWithGoogleRedirect(): Promise<void> {
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: 'select_account' });
  provider.addScope('email');
  provider.addScope('profile');
  await signInWithRedirect(auth, provider);
}

// Check if user is returning from a redirect auth flow
export async function checkRedirectAuthResult(): Promise<UserProfile | null> {
  try {
    const result = await getRedirectResult(auth);
    if (result?.user) {
      const u = result.user;
      const userProfile: UserProfile = {
        uid: u.uid,
        email: u.email || '',
        displayName: u.displayName || u.email?.split('@')[0] || 'Customer',
        photoURL: u.photoURL || undefined,
        createdAt: new Date().toISOString(),
      };
      await saveUserProfileToFirestore(userProfile);
      return userProfile;
    }
  } catch (err: any) {
    console.warn('[Firebase Auth Redirect Check]:', err);
  }
  return null;
}

// Email & Password Sign In
export async function signInWithEmail(email: string, pass: string): Promise<UserProfile> {
  try {
    const res = await signInWithEmailAndPassword(auth, email.trim(), pass);
    const u = res.user;
    const userProfile: UserProfile = {
      uid: u.uid,
      email: u.email || email.trim(),
      displayName: u.displayName || email.split('@')[0] || 'Customer',
      photoURL: u.photoURL || undefined,
      createdAt: new Date().toISOString(),
    };
    await saveUserProfileToFirestore(userProfile);
    return userProfile;
  } catch (err: any) {
    console.error('[Firebase Auth Error] Email sign in failed:', err);
    throw err;
  }
}

// Email & Password Sign Up / Registration
export async function signUpWithEmail(email: string, pass: string, fullName?: string): Promise<UserProfile> {
  try {
    const res = await createUserWithEmailAndPassword(auth, email.trim(), pass);
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
    await saveUserProfileToFirestore(userProfile);
    return userProfile;
  } catch (err: any) {
    console.error('[Firebase Auth Error] Email registration failed:', err);
    throw err;
  }
}

// Sign Out
export async function signOutUser(): Promise<void> {
  await firebaseSignOut(auth);
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

  // Backup in local storage
  localStorage.setItem(`lankabuy_user_${uid}`, JSON.stringify(userProfile));
  return userProfile;
}

export const saveUserProfileToFirestore = syncUserToFirestore;
export const loginWithGoogle = signInWithGoogle;

// Saved Address Management
export async function getUserAddressesFromFirestore(userId: string): Promise<UserAddress[]> {
  try {
    const q = query(collection(db, `users/${userId}/addresses`));
    const snap = await getDocs(q);
    if (!snap.empty) {
      return snap.docs.map(d => d.data() as UserAddress);
    }
  } catch (err) {
    console.warn('[Firebase] Error loading user addresses from Firestore:', err);
  }

  // Fallback to local storage
  try {
    const local = localStorage.getItem(`lankabuy_addresses_${userId}`);
    if (local) return JSON.parse(local);
  } catch {
    // ignore
  }
  return [];
}

export async function saveUserAddressToFirestore(userId: string, address: UserAddress): Promise<void> {
  const path = `users/${userId}/addresses/${address.id}`;
  try {
    await setDoc(doc(db, `users/${userId}/addresses`, address.id), address, { merge: true });
  } catch (err) {
    console.warn('[Firebase] Error saving address to Firestore:', err);
  }

  // Also update local storage cache
  try {
    const existing = await getUserAddressesFromFirestore(userId);
    const updated = existing.filter(a => a.id !== address.id);
    if (address.isDefault) {
      updated.forEach(a => a.isDefault = false);
    }
    updated.unshift(address);
    localStorage.setItem(`lankabuy_addresses_${userId}`, JSON.stringify(updated));
  } catch (err) {
    console.warn('Local storage address cache update error:', err);
  }
}

export async function deleteUserAddressFromFirestore(userId: string, addressId: string): Promise<void> {
  try {
    await deleteDoc(doc(db, `users/${userId}/addresses`, addressId));
  } catch (err) {
    console.warn('[Firebase] Error deleting address from Firestore:', err);
  }

  try {
    const existing = await getUserAddressesFromFirestore(userId);
    const updated = existing.filter(a => a.id !== addressId);
    localStorage.setItem(`lankabuy_addresses_${userId}`, JSON.stringify(updated));
  } catch (err) {
    // ignore
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
