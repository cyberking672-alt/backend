# LankaBuy E-Commerce Project Rules & Directives

## 1. No Fake / Mock Implementations
- All authentication, data persistence, and database interactions MUST be 100% real Firebase (Firebase Auth and Cloud Firestore).
- Do NOT generate fake demo login buttons, simulated accounts, or client-side fake auth bypasses.
- All users must authenticate via real Firebase Google Sign-In (`signInWithPopup`) or real Firebase Email & Password (`signInWithEmailAndPassword` / `createUserWithEmailAndPassword`).
- All orders, user addresses, products, and customer profiles must persist to real Cloud Firestore collections (`users/{uid}`, `users/{uid}/addresses`, `orders/{orderId}`, `products/{id}`).

## 2. Authentication Diagnostics
- Keep comprehensive diagnostics and error logging available for Firebase Auth states, popup interactions, and Firestore sync operations.
- Handle Firebase error codes cleanly (`auth/popup-closed-by-user`, `auth/unauthorized-domain`, `auth/popup-blocked`, `auth/user-not-found`, etc.) with clear diagnostic messages.

## 3. UI Preservation
- Preserve the premium 3D geometric design, orange/amber visual identity, responsive navigation, and user-friendly interface.
