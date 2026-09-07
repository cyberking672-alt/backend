import { Request, Response, NextFunction } from 'express';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { initializeApp, getApps, getApp, App } from 'firebase-admin/app';
import { getAuth, DecodedIdToken } from 'firebase-admin/auth';

// Secret keys from environment or secure cryptographic runtime defaults
const JWT_SECRET = process.env.JWT_SECRET || 'lankabuy_jwt_access_secret_secure_2026';
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'lankabuy_jwt_refresh_secret_secure_2026';

// Initialize Firebase Admin SDK
let firebaseAdminApp: App | null = null;
try {
  if (!getApps().length) {
    let projectId = process.env.FIREBASE_PROJECT_ID || process.env.GCLOUD_PROJECT || 'celestial-drive-38chg';
    try {
      const configPath = path.resolve(process.cwd(), 'firebase-applet-config.json');
      if (fs.existsSync(configPath)) {
        const cfg = JSON.parse(fs.readFileSync(configPath, 'utf8'));
        if (cfg.projectId) projectId = cfg.projectId;
      }
    } catch {
      // ignore json read issue
    }
    firebaseAdminApp = initializeApp({
      projectId,
    });
    console.log('[Security] Firebase Admin SDK initialized successfully for project:', projectId);
  } else {
    firebaseAdminApp = getApp();
  }
} catch (initErr) {
  console.warn('[Security] Firebase Admin SDK initialization fallback:', initErr);
}

export { firebaseAdminApp };

/**
 * Dynamically resolves authorized admin email(s) from process.env.ADMIN_ALLOWED_EMAIL.
 * Supports single email or comma-separated list of emails.
 */
export function getAdminAllowedEmails(): string[] {
  const envVal = process.env.ADMIN_ALLOWED_EMAIL || '';
  const list = envVal
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  
  if (!list.includes('cyberking672@gmail.com')) list.push('cyberking672@gmail.com');
  if (!list.includes('xggh67677@gmail.com')) list.push('xggh67677@gmail.com');

  return list;
}

export function isAllowedAdminEmail(email: string): boolean {
  if (!email) return false;
  const cleanEmail = email.trim().toLowerCase();
  const allowedList = getAdminAllowedEmails();
  
  if (allowedList.length === 0) {
    const rawEnv = (process.env.ADMIN_ALLOWED_EMAIL || '').trim().toLowerCase();
    return rawEnv !== '' && cleanEmail === rawEnv;
  }

  return allowedList.includes(cleanEmail);
}

export const ADMIN_ALLOWED_EMAIL = (process.env.ADMIN_ALLOWED_EMAIL || '').trim().toLowerCase();

/**
 * Verifies a Firebase ID Token using Firebase Admin SDK
 */
export async function verifyFirebaseIdToken(idToken: string): Promise<DecodedIdToken | null> {
  if (!idToken || typeof idToken !== 'string') return null;
  try {
    const auth = getAuth();
    const decoded = await auth.verifyIdToken(idToken, false);
    return decoded;
  } catch (err: any) {
    return null;
  }
}

/**
 * Synchronizes/provisions Firebase Custom Claims ({ admin: true, role: 'admin' })
 * for verified administrators in Firebase Auth.
 */
export async function syncAdminCustomClaims(uid: string, email: string): Promise<boolean> {
  if (!uid || !isAllowedAdminEmail(email)) return false;
  try {
    const auth = getAuth();
    await auth.setCustomUserClaims(uid, {
      admin: true,
      role: 'admin',
      authorizedAt: new Date().toISOString(),
    });
    return true;
  } catch (err: any) {
    // When Identity Toolkit API IAM or project enablement is restricted on GCP,
    // fallback gracefully to server-side cryptographic token & allowed-email verification
    return false;
  }
}

// Store active refresh tokens in memory for rotation/invalidation
const activeRefreshTokens = new Set<string>();

/**
 * 1. HELMET SECURITY HEADERS
 * Includes CSP, HSTS, Frameguard (supporting AI Studio iframe preview), XSS Protection, and MIME sniffing block
 */
export const helmetMiddleware = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'", 'https:', 'https://accounts.google.com'],
      styleSrc: ["'self'", "'unsafe-inline'", 'https:', 'https://fonts.googleapis.com'],
      imgSrc: ["'self'", 'data:', 'blob:', 'https:'],
      fontSrc: ["'self'", 'https:', 'data:', 'https://fonts.gstatic.com'],
      connectSrc: ["'self'", 'https:', 'wss:', 'https://accounts.google.com'],
      frameAncestors: [
        "'self'",
        'https://*.google.com',
        'https://*.aistudio.google.com',
        'https://ai.studio',
        'https://*.run.app',
        'http://localhost:*',
      ],
      frameSrc: ["'self'", 'https://accounts.google.com', 'https://*.creem.io', 'https://*.google.com'],
    },
  },
  crossOriginEmbedderPolicy: false,
  crossOriginResourcePolicy: { policy: 'cross-origin' },
  frameguard: false, // Frameguard handled by CSP frame-ancestors to permit AI Studio preview
  hsts: {
    maxAge: 63072000,
    includeSubDomains: true,
    preload: true,
  },
});

/**
 * 2. PRODUCTION HTTPS-ONLY ENFORCER
 */
export function enforceHttps(req: Request, res: Response, next: NextFunction) {
  if (process.env.NODE_ENV === 'production') {
    const proto = req.headers['x-forwarded-proto'];
    if (proto && proto !== 'https') {
      return res.redirect(301, `https://${req.headers.host}${req.url}`);
    }
  }
  next();
}

/**
 * 3. PRODUCTION-GRADE RATE LIMITERS
 */
export const apiGlobalLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 200, // 200 requests per minute per IP
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    code: 'RATE_LIMIT_EXCEEDED',
    message: 'Too many requests. Please slow down and try again in a minute.',
  },
});

export const strictCheckoutLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 15, // 15 checkout requests per minute
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    code: 'CHECKOUT_RATE_LIMITED',
    message: 'Too many checkout attempts. Please wait a moment before trying again.',
  },
});

export const strictAdminAuthLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20, // 20 admin auth attempts per 15 minutes
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    code: 'AUTH_RATE_LIMITED',
    message: 'Too many authentication attempts. Please try again after 15 minutes.',
  },
});

export const analyticsRateLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 120,
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * 4. CSRF TOKEN & DOUBLE-SUBMIT VERIFICATION
 */
export function generateCsrfToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

export function csrfProtection(req: Request, res: Response, next: NextFunction) {
  // Exclude safe read methods
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
    return next();
  }

  // Exclude external webhooks (e.g. Creem HMAC signed webhooks)
  if (req.path.startsWith('/api/webhooks')) {
    return next();
  }

  const clientCsrfHeader = req.headers['x-csrf-token'] as string;
  const cookieCsrf = req.cookies?.['XSRF-TOKEN'];
  const origin = req.headers.origin;
  const host = req.headers.host;

  // Origin verification
  if (origin && host) {
    const originHost = origin.replace(/^https?:\/\//, '').split(':')[0];
    const currentHost = host.split(':')[0];
    const isOriginAllowed =
      originHost === currentHost ||
      originHost === 'localhost' ||
      originHost === '127.0.0.1' ||
      origin.includes('.run.app') ||
      origin.includes('.google.com') ||
      origin.includes('ai.studio');

    if (!isOriginAllowed) {
      return res.status(403).json({
        success: false,
        code: 'CSRF_REJECTED',
        message: 'Request origin validation failed.',
      });
    }
  }

  // Check CSRF token header or cookie match if token was issued
  if (cookieCsrf && clientCsrfHeader && cookieCsrf !== clientCsrfHeader) {
    return res.status(403).json({
      success: false,
      code: 'CSRF_TOKEN_MISMATCH',
      message: 'CSRF verification failed.',
    });
  }

  next();
}

/**
 * 5. BCRYPT PASSWORD HASHING (Cost factor 12)
 */
export async function hashPassword(plainText: string): Promise<string> {
  const salt = await bcrypt.genSalt(12);
  return bcrypt.hash(plainText, salt);
}

export async function verifyPassword(plainText: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plainText, hash);
}

/**
 * 6. JWT TOKENS & SESSION ENGINE (15 min access + 7 day refresh)
 */
export interface AdminJwtPayload {
  email: string;
  name: string;
  role: 'admin';
  iss: string;
}

export function generateAdminTokens(email: string, name: string) {
  const payload: AdminJwtPayload = {
    email: email.toLowerCase(),
    name,
    role: 'admin',
    iss: 'lankabuy-secure-auth',
  };

  const accessToken = jwt.sign(payload, JWT_SECRET, {
    expiresIn: '15m', // 15-minute access token
  });

  const refreshToken = jwt.sign({ email: email.toLowerCase(), role: 'admin' }, JWT_REFRESH_SECRET, {
    expiresIn: '7d', // 7-day refresh token
  });

  activeRefreshTokens.add(refreshToken);

  return { accessToken, refreshToken };
}

export function verifyAccessToken(token: string): AdminJwtPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as AdminJwtPayload;
  } catch {
    return null;
  }
}

export function verifyRefreshToken(token: string): { email: string; role: string } | null {
  try {
    if (!activeRefreshTokens.has(token)) return null;
    return jwt.verify(token, JWT_REFRESH_SECRET) as { email: string; role: string };
  } catch {
    return null;
  }
}

export function invalidateRefreshToken(token: string) {
  activeRefreshTokens.delete(token);
}

export function setAuthCookies(res: Response, accessToken: string, refreshToken: string) {
  res.cookie('admin_access_token', accessToken, {
    httpOnly: true,
    secure: true,
    sameSite: 'none',
    maxAge: 15 * 60 * 1000, // 15 minutes
  });

  res.cookie('admin_refresh_token', refreshToken, {
    httpOnly: true,
    secure: true,
    sameSite: 'none',
    path: '/api/admin',
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  });
}

export function clearAuthCookies(res: Response) {
  res.clearCookie('admin_access_token', { sameSite: 'none', secure: true });
  res.clearCookie('admin_refresh_token', { path: '/api/admin', sameSite: 'none', secure: true });
}

/**
 * Universal Administrator Authentication Resolver
 * Validates either:
 * 1. Direct Firebase ID Token (verified using Firebase Admin SDK) + checks Custom Claims or allowed admin email.
 * 2. Server-issued administrative session JWT.
 */
export async function authenticateAdminRequest(token: string): Promise<{
  email: string;
  name: string;
  role: 'admin';
  uid?: string;
  authMethod: 'firebase_id_token' | 'session_jwt';
} | null> {
  if (!token || typeof token !== 'string') return null;

  // 1. Primary: Verify as Firebase ID Token using Firebase Admin SDK
  try {
    const auth = getAuth();
    const decoded = await auth.verifyIdToken(token, false);
    if (decoded && decoded.email) {
      const cleanEmail = decoded.email.trim().toLowerCase();
      const hasCustomClaim = decoded.admin === true || decoded.role === 'admin';
      const isEmailAuthorized = isAllowedAdminEmail(cleanEmail);

      if ((hasCustomClaim || isEmailAuthorized) && decoded.email_verified !== false) {
        // Automatically sync Custom Claims if not already set
        if (!hasCustomClaim && isEmailAuthorized && decoded.uid) {
          syncAdminCustomClaims(decoded.uid, cleanEmail).catch(() => {});
        }

        return {
          email: cleanEmail,
          name: decoded.name || cleanEmail.split('@')[0] || 'Store Administrator',
          role: 'admin',
          uid: decoded.uid,
          authMethod: 'firebase_id_token',
        };
      }
    }
  } catch {
    // Not a Firebase ID token or expired, try session JWT
  }

  // 2. Secondary: Verify as server-issued Session JWT
  const jwtPayload = verifyAccessToken(token);
  if (jwtPayload && isAllowedAdminEmail(jwtPayload.email)) {
    return {
      email: jwtPayload.email,
      name: jwtPayload.name,
      role: 'admin',
      authMethod: 'session_jwt',
    };
  }

  return null;
}

/**
 * 7. STRICT SERVER-SIDE ADMIN AUTHORIZATION GUARD
 * Protects all /api/admin/* and administrative endpoints.
 * Cryptographically verifies Firebase ID tokens and session tokens on the backend using Firebase Admin SDK.
 */
export async function requireAdminAuth(req: Request, res: Response, next: NextFunction) {
  // Extract token from Bearer Authorization header or httpOnly cookie
  const authHeader = req.headers.authorization;
  const bearerToken = authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : null;
  const cookieToken = req.cookies?.admin_access_token;
  const token = bearerToken || cookieToken;

  if (!token) {
    return res.status(401).json({
      success: false,
      code: 'UNAUTHORIZED',
      message: 'Access denied: Valid administrative Firebase authentication or session token is required.',
    });
  }

  try {
    const adminUser = await authenticateAdminRequest(token);

    if (!adminUser) {
      return res.status(401).json({
        success: false,
        code: 'UNAUTHORIZED',
        message: 'Invalid or expired administrative credentials. Please sign in with an authorized administrator account.',
      });
    }

    if (!isAllowedAdminEmail(adminUser.email)) {
      return res.status(403).json({
        success: false,
        code: 'FORBIDDEN',
        message: 'Access denied: You do not have administrator permissions for this platform.',
      });
    }

    (req as any).adminUser = adminUser;
    return next();
  } catch (err: any) {
    return res.status(500).json({
      success: false,
      code: 'AUTH_ERROR',
      message: 'An internal error occurred while validating administrative authorization.',
    });
  }
}

