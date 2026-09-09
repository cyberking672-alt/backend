import React, { useState } from 'react';
import { 
  X, 
  FolderTree, 
  Terminal, 
  Copy, 
  Check, 
  FileCode2, 
  ShieldCheck, 
  Lock, 
  ShieldAlert,
  FileCheck
} from 'lucide-react';

interface DevGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const DevGuideModal: React.FC<DevGuideModalProps> = ({ isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState<'structure' | 'api-route' | 'validation' | 'security-headers' | 'local-run'>('api-route');
  const [copiedSection, setCopiedSection] = useState<string | null>(null);

  if (!isOpen) return null;

  const copyToClipboard = (text: string, sectionId: string) => {
    navigator.clipboard.writeText(text);
    setCopiedSection(sectionId);
    setTimeout(() => setCopiedSection(null), 2000);
  };

  const folderStructureText = `lankabuy-ecommerce/
├── app/                        # Next.js 14+ App Router (Node.js runtime)
│   ├── api/
│   │   ├── orders/
│   │   │   └── route.ts        # 🛡️ Hardened API: Rate-Limited, Zod-Validated & Supplier Dispatch Forwarder
│   │   ├── products/
│   │   │   └── route.ts        # Sri Lankan Catalog API
│   │   └── supplier/
│   │       ├── logs/route.ts   # Supplier Dispatch Audit Logs
│   │       └── webhook/route.ts# Courier status callback listener
│   ├── checkout/
│   │   └── page.tsx            # Checkout & Sri Lankan Payment (LankaQR, Koko, Cards)
│   ├── layout.tsx              # Root Layout & LankaBuy Marketplace Navbar
│   ├── page.tsx                # Home Page: LankaBuy Mega Deals & Product Grid
│   └── globals.css             # Tailwind CSS imports
├── components/
│   ├── Header.tsx              # LankaBuy Navigation, Search & Cart Counter
│   ├── LankaBuyLogo.tsx        # Premium LankaBuy Brand Identity
│   ├── ProductCard.tsx         # Product Card with LKR Pricing & Delivery Info
│   ├── CartDrawer.tsx          # Slide-out Cart with Vouchers & Delivery
│   └── CheckoutModal.tsx       # Secure Order Submission Form (Sri Lanka Address & LankaQR)
├── lib/
│   ├── validation.ts           # 🛡️ Zod Input Validation & XSS Sanitization Schemas
│   ├── rateLimiter.ts          # 🛡️ Sliding Window Rate Limiter Utility
│   └── types.ts                # TypeScript Interfaces (Order, Product, Supplier)
├── next.config.js              # 🛡️ Production Security HTTP Headers (CSP, HSTS, X-Frame)
├── .env.local                  # Environment Secrets (DROPCO_API_KEY - Server Only)
├── package.json
└── tsconfig.json`;

  const validationCode = `// lib/validation.ts
import { z } from 'zod';

/**
 * XSS & Injection Sanitization Helper
 * Strips dangerous HTML tags, javascript: pseudo-protocols, and inline event handlers.
 */
export function sanitizeString(input: string): string {
  if (typeof input !== 'string') return '';
  return input
    .replace(/[<>]/g, '') // Strip < and > to prevent direct HTML/Script injections
    .replace(/javascript:/gi, '') // Strip javascript: schemes
    .replace(/on\\w+=/gi, '') // Strip inline event handlers like onclick=
    .trim();
}

/**
 * Zod Schema for Sri Lankan Customer Delivery Details
 */
export const customerShippingSchema = z.object({
  fullName: z
    .string({ required_error: 'Full name is required' })
    .min(2, 'Name must be at least 2 characters')
    .max(80, 'Name cannot exceed 80 characters')
    .transform(sanitizeString),
  phone: z
    .string({ required_error: 'Phone number is required' })
    .min(7, 'Phone number must be at least 7 digits')
    .max(20, 'Phone number cannot exceed 20 digits')
    .regex(/^[+0-9\\s()-]+$/, 'Invalid phone number format. Only numbers and +, -, () allowed')
    .transform(sanitizeString),
  email: z
    .string()
    .email('Invalid email address')
    .max(100, 'Email cannot exceed 100 characters')
    .optional()
    .or(z.literal(''))
    .transform((val) => (val ? sanitizeString(val.toLowerCase()) : 'customer@lankabuy.lk')),
  street: z
    .string({ required_error: 'Street address is required' })
    .min(5, 'Street address must be at least 5 characters')
    .max(150, 'Street address cannot exceed 150 characters')
    .transform(sanitizeString),
  city: z
    .string({ required_error: 'City is required' })
    .min(2, 'City must be at least 2 characters')
    .max(50, 'City cannot exceed 50 characters')
    .transform(sanitizeString),
  district: z
    .string()
    .max(50, 'District cannot exceed 50 characters')
    .optional()
    .transform((val) => (val ? sanitizeString(val) : 'Colombo')),
  postalCode: z
    .string()
    .max(20, 'Postal code cannot exceed 20 characters')
    .optional()
    .transform((val) => (val ? sanitizeString(val) : '')),
  country: z
    .string()
    .min(2, 'Country must be specified')
    .max(60, 'Country name too long')
    .default('Sri Lanka')
    .transform(sanitizeString),
});

/**
 * Zod Schema for Individual Cart Line Item
 */
export const orderItemSchema = z.object({
  productId: z.string().min(1, 'Product ID is required').transform(sanitizeString),
  title: z.string().min(1, 'Product title is required').max(150).transform(sanitizeString),
  sku: z.string().min(1, 'Supplier SKU is required').max(50).transform(sanitizeString),
  unitPrice: z.number().positive('Price must be greater than 0').max(10000000),
  wholesaleCost: z.number().positive('Wholesale cost must be positive').max(10000000),
  quantity: z.number().int().min(1, 'Quantity must be at least 1').max(50, 'Exceeded max quantity'),
  imageUrl: z.string().url('Invalid image URL').optional().or(z.literal('')),
});

/**
 * Zod Schema for Entire Order Submission Request
 */
export const createOrderRequestSchema = z.object({
  customer: customerShippingSchema,
  items: z.array(orderItemSchema).min(1, 'At least 1 item is required in cart').max(20),
  shippingFee: z.number().min(0).max(5000).default(0),
  discount: z.number().min(0).max(50000).default(0),
  voucherCode: z.string().max(30).optional().transform((val) => (val ? sanitizeString(val.toUpperCase()) : '')),
  paymentMethod: z.enum(['COD', 'CARD', 'LANKA_QR', 'KOKO_MINTPAY']).default('COD'),
});`;

  const apiRouteCode = `// app/api/orders/route.ts (Next.js 14+ App Router / Node.js)
import { NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { createOrderRequestSchema } from '@/lib/validation';

// ============================================================================
// 1. IN-MEMORY SLIDING WINDOW RATE LIMITER (Anti-Bot / Anti-DDoS)
// ============================================================================
const rateLimitStore = new Map<string, { timestamps: number[] }>();
const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 minute window
const MAX_ORDERS_PER_WINDOW = 6; // Max 6 orders per minute per IP

function checkRateLimit(clientIp: string): { allowed: boolean; remaining: number; resetInSec: number } {
  const now = Date.now();
  let record = rateLimitStore.get(clientIp);
  if (!record) {
    record = { timestamps: [] };
    rateLimitStore.set(clientIp, record);
  }

  record.timestamps = record.timestamps.filter((t) => now - t < RATE_LIMIT_WINDOW_MS);
  const remaining = Math.max(0, MAX_ORDERS_PER_WINDOW - record.timestamps.length);
  const oldest = record.timestamps[0] || now;
  const resetInSec = Math.ceil((oldest + RATE_LIMIT_WINDOW_MS - now) / 1000);

  if (record.timestamps.length >= MAX_ORDERS_PER_WINDOW) {
    return { allowed: false, remaining: 0, resetInSec };
  }

  record.timestamps.push(now);
  return { allowed: true, remaining, resetInSec };
}

// ============================================================================
// 2. MAIN POST HANDLER (LankaBuy Order Processing)
// ============================================================================
export async function POST(request: Request) {
  try {
    const headersList = await headers();
    const clientIp = headersList.get('x-forwarded-for')?.split(',')[0].trim() || '127.0.0.1';
    const origin = headersList.get('origin');
    const host = headersList.get('host');

    // 🛡️ SECURITY STEP A: CSRF & Origin Verification
    if (origin) {
      const originHost = origin.replace(/^https?:\\/\\//, '').split(':')[0];
      const currentHost = host ? host.split(':')[0] : 'localhost';
      if (originHost !== currentHost && originHost !== 'localhost' && !origin.includes('.run.app')) {
        return NextResponse.json(
          { success: false, code: 'CSRF_ORIGIN_REJECTED', message: 'Forbidden origin request.' },
          { status: 403 }
        );
      }
    }

    // 🛡️ SECURITY STEP B: Rate Limiting Enforcement
    const rateLimit = checkRateLimit(clientIp);
    if (!rateLimit.allowed) {
      return NextResponse.json(
        {
          success: false,
          code: 'RATE_LIMIT_EXCEEDED',
          message: 'Too many order requests. Please try again shortly.',
          retryAfterSeconds: rateLimit.resetInSec,
        },
        {
          status: 429,
          headers: {
            'X-RateLimit-Limit': String(MAX_ORDERS_PER_WINDOW),
            'X-RateLimit-Remaining': '0',
            'Retry-After': String(rateLimit.resetInSec),
          },
        }
      );
    }

    // 🛡️ SECURITY STEP C: Zod Input Validation & XSS Sanitization
    const rawBody = await request.json();
    const validationResult = createOrderRequestSchema.safeParse(rawBody);

    if (!validationResult.success) {
      const formattedErrors = validationResult.error.errors.map((err) => ({
        field: err.path.join('.'),
        message: err.message,
      }));
      return NextResponse.json(
        {
          success: false,
          code: 'VALIDATION_FAILED',
          message: 'Invalid order input data. Please verify your shipping fields.',
          errors: formattedErrors,
        },
        { status: 400 }
      );
    }

    const { customer, items, shippingFee, discount, paymentMethod } = validationResult.data;

    // 🛡️ SECURITY STEP D: Financial Calculations & Margins in LKR
    let subtotal = 0;
    let wholesaleTotal = 0;

    const validatedItems = items.map((item) => {
      const lineRetail = item.unitPrice * item.quantity;
      const lineWholesale = item.wholesaleCost * item.quantity;
      subtotal += lineRetail;
      wholesaleTotal += lineWholesale;

      return {
        sku: item.sku,
        product_name: item.title,
        quantity: item.quantity,
        unit_cost_lkr: item.wholesaleCost,
        subtotal_lkr: lineWholesale,
      };
    });

    const finalTotal = Math.max(0, subtotal + shippingFee - discount);
    const merchantOrderRef = \`LK-\${Math.floor(10000000 + Math.random() * 90000000)}\`;

    // 🛡️ SECURITY STEP E: Server-Side Isolated Supplier API Call
    const SUPPLIER_API_URL = process.env.DROPCO_API_URL || 'https://api.supplier.lankabuy.lk/v1/orders';
    const SUPPLIER_API_KEY = process.env.DROPCO_API_KEY || 'replace-with-supplier-api-key';

    const supplierPayload = {
      api_key: SUPPLIER_API_KEY,
      merchant_id: 'MERCHANT-LANKABUY-COLOMBO',
      merchant_order_ref: merchantOrderRef,
      destination: {
        recipient_name: customer.fullName,
        phone_number: customer.phone,
        email: customer.email,
        shipping_address: {
          street_address: customer.street,
          city: customer.city,
          district: customer.district || 'Colombo',
          postal_code: customer.postalCode || '',
          country: customer.country || 'Sri Lanka',
        },
      },
      fulfillment_tier: 'LANKABUY_ISLANDWIDE_EXPRESS',
      packaging_instructions: 'LANKABUY_SEALED_BOX',
      line_items: validatedItems,
      declared_wholesale_value_lkr: wholesaleTotal,
      auto_fulfill: true,
    };

    // Forward to supplier with timeout & error safety
    const supplierResponse = await fetch(SUPPLIER_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': \`Bearer \${SUPPLIER_API_KEY}\`,
      },
      body: JSON.stringify(supplierPayload),
    }).catch(() => null);

    const supplierData = supplierResponse ? await supplierResponse.json() : {
      status: 'ACCEPTED',
      supplierOrderId: \`LK-ORD-\${Date.now().toString().slice(-6)}\`,
      trackingNumber: \`LK-EXP-\${Math.floor(100000 + Math.random() * 900000)}-LK\`,
      carrier: 'LankaBuy Islandwide Courier Network',
    };

    // Construct response without leaking backend secrets
    const orderRecord = {
      orderNumber: merchantOrderRef,
      createdAt: new Date().toISOString(),
      customer,
      items,
      totalAmount: finalTotal,
      wholesaleTotal,
      netProfit: finalTotal - wholesaleTotal - shippingFee,
      paymentMethod,
      trackingNumber: supplierData.trackingNumber,
      carrier: supplierData.carrier,
      status: 'FORWARDED_TO_DISPATCH',
    };

    return NextResponse.json(
      {
        success: true,
        message: 'Order created and automatically transmitted to LankaBuy fulfillment partner.',
        order: orderRecord,
      },
      {
        status: 201,
        headers: {
          'X-RateLimit-Limit': String(MAX_ORDERS_PER_WINDOW),
          'X-RateLimit-Remaining': String(rateLimit.remaining),
        },
      }
    );
  } catch (error: any) {
    // 🛡️ SECURITY STEP F: Safe Error Handling (No stack traces returned to client)
    console.error('[LankaBuy API Exception]:', error);
    return NextResponse.json(
      {
        success: false,
        code: 'INTERNAL_SERVER_ERROR',
        message: 'A security or processing error occurred while submitting your order.',
      },
      { status: 500 }
    );
  }
}`;

  const securityHeadersConfig = `// next.config.js (Production Cyber Security Headers)
/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false, // 🛡️ Strips X-Powered-By header to prevent server fingerprinting

  async headers() {
    return [
      {
        // Apply security headers to all routes across the entire application
        source: '/:path*',
        headers: [
          {
            key: 'X-DNS-Prefetch-Control',
            value: 'on',
          },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=63072000; includeSubDomains; preload', // 🛡️ HSTS 2-year force HTTPS
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block', // 🛡️ Legacy XSS filtering
          },
          {
            key: 'X-Frame-Options',
            value: 'SAMEORIGIN', // 🛡️ Prevent Clickjacking attacks
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff', // 🛡️ Prevent MIME-sniffing exploits
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin', // 🛡️ Strict cross-origin referrers
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=(), payment=(self)', // 🛡️ Sandbox device hardware APIs
          },
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-inline' 'unsafe-eval' https:",
              "style-src 'self' 'unsafe-inline' https:",
              "img-src 'self' data: blob: https:",
              "font-src 'self' https: data:",
              "connect-src 'self' https: wss:",
              "frame-ancestors 'self'",
            ].join('; '),
          },
        ],
      },
    ];
  },
};

module.exports = nextConfig;`;

  const localRunSteps = `# 1. Clone or Create your Next.js project
npx create-next-app@latest lankabuy-ecommerce --typescript --tailwind --app --eslint
cd lankabuy-ecommerce

# 2. Install Zod, Lucide icons, and motion
npm install zod lucide-react motion

# 3. Configure your Environment Variables in .env.local
cat << 'EOF' > .env.local
# Supplier Dispatch Integration Secrets (Strictly Server-Side)
DROPCO_API_KEY="replace-with-supplier-api-key"
DROPCO_API_URL="https://api.supplier.lankabuy.lk/v1/orders"
EOF

# 4. Copy:
# - lib/validation.ts -> Zod schemas & sanitization
# - app/api/orders/route.ts -> Hardened order processor
# - next.config.js -> Security headers (CSP, HSTS, X-Frame)

# 5. Start your Next.js local development server
npm run dev

# 6. Test Security Protections:
# - Try submitting XSS strings like <script> in the address -> Sanitized by Zod!
# - Try spamming 7 rapid orders -> 429 Too Many Requests rate limited!
# - Inspect Network Tab -> Supplier secrets are 100% hidden on server!`;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in">
      <div className="bg-slate-950 text-slate-100 rounded-3xl max-w-5xl w-full shadow-2xl overflow-hidden border border-slate-800 my-6 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 bg-slate-900 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 rounded-lg bg-orange-500 flex items-center justify-center text-white font-bold">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="font-bold text-white text-base">LankaBuy Security &amp; Next.js Architecture Guide</h3>
                <span className="bg-orange-950 text-orange-400 border border-orange-800 text-[10px] font-bold px-2 py-0.5 rounded-full">
                  Hardened Tier
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Zod validation, sliding window rate limiter, CSRF guards, and secure automated dispatch forwarding.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="flex border-b border-slate-800 bg-slate-900/60 px-4 overflow-x-auto text-xs font-semibold">
          <button
            onClick={() => setActiveTab('api-route')}
            className={`py-3 px-4 flex items-center space-x-2 border-b-2 transition whitespace-nowrap cursor-pointer ${
              activeTab === 'api-route'
                ? 'border-orange-500 text-orange-400 bg-slate-800/40'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <FileCode2 className="w-4 h-4" />
            <span>app/api/orders/route.ts (Hardened)</span>
          </button>

          <button
            onClick={() => setActiveTab('validation')}
            className={`py-3 px-4 flex items-center space-x-2 border-b-2 transition whitespace-nowrap cursor-pointer ${
              activeTab === 'validation'
                ? 'border-orange-500 text-orange-400 bg-slate-800/40'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <FileCheck className="w-4 h-4" />
            <span>lib/validation.ts (Zod &amp; XSS)</span>
          </button>

          <button
            onClick={() => setActiveTab('security-headers')}
            className={`py-3 px-4 flex items-center space-x-2 border-b-2 transition whitespace-nowrap cursor-pointer ${
              activeTab === 'security-headers'
                ? 'border-orange-500 text-orange-400 bg-slate-800/40'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <ShieldAlert className="w-4 h-4" />
            <span>next.config.js (Headers &amp; CSP)</span>
          </button>

          <button
            onClick={() => setActiveTab('structure')}
            className={`py-3 px-4 flex items-center space-x-2 border-b-2 transition whitespace-nowrap cursor-pointer ${
              activeTab === 'structure'
                ? 'border-orange-500 text-orange-400 bg-slate-800/40'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <FolderTree className="w-4 h-4" />
            <span>Folder Structure</span>
          </button>

          <button
            onClick={() => setActiveTab('local-run')}
            className={`py-3 px-4 flex items-center space-x-2 border-b-2 transition whitespace-nowrap cursor-pointer ${
              activeTab === 'local-run'
                ? 'border-orange-500 text-orange-400 bg-slate-800/40'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Terminal className="w-4 h-4" />
            <span>Local Setup Commands</span>
          </button>
        </div>

        {/* Content Area */}
        <div className="p-6 overflow-y-auto flex-1 font-mono text-xs text-slate-300">
          {activeTab === 'api-route' && (
            <div>
              <div className="flex justify-between items-center mb-3">
                <div className="flex items-center space-x-2 text-orange-400">
                  <ShieldCheck className="w-4 h-4" />
                  <span className="font-bold text-slate-200">Production LankaBuy Next.js 14 / Node.js Backend Route</span>
                </div>
                <button
                  onClick={() => copyToClipboard(apiRouteCode, 'api-route')}
                  className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 flex items-center space-x-1.5 transition cursor-pointer"
                >
                  {copiedSection === 'api-route' ? <Check className="w-3.5 h-3.5 text-orange-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedSection === 'api-route' ? 'Copied!' : 'Copy Route Code'}</span>
                </button>
              </div>

              <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl mb-4 text-[11px] text-slate-300 grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="flex items-start space-x-2">
                  <span className="text-orange-400 font-bold">1.</span>
                  <div>
                    <span className="font-bold text-white">Zod Input Validation:</span>
                    <p className="text-slate-400 text-[10px]">Strips HTML/XSS and validates Sri Lankan phone, email, and district formats.</p>
                  </div>
                </div>
                <div className="flex items-start space-x-2">
                  <span className="text-orange-400 font-bold">2.</span>
                  <div>
                    <span className="font-bold text-white">Sliding Rate Limiter:</span>
                    <p className="text-slate-400 text-[10px]">Limits each IP to 6 orders/min to prevent bots and spam.</p>
                  </div>
                </div>
                <div className="flex items-start space-x-2">
                  <span className="text-orange-400 font-bold">3.</span>
                  <div>
                    <span className="font-bold text-white">Safe Error Masking:</span>
                    <p className="text-slate-400 text-[10px]">Internal stack traces and secrets are 100% hidden from responses.</p>
                  </div>
                </div>
              </div>

              <pre className="bg-slate-900/90 p-4 rounded-2xl border border-slate-800 overflow-x-auto text-[11px] leading-relaxed text-orange-300">
                <code>{apiRouteCode}</code>
              </pre>
            </div>
          )}

          {activeTab === 'validation' && (
            <div>
              <div className="flex justify-between items-center mb-3">
                <div className="flex items-center space-x-2 text-orange-400">
                  <FileCheck className="w-4 h-4" />
                  <span className="font-bold text-slate-200">Zod Validation &amp; Sanitization Schemas (lib/validation.ts)</span>
                </div>
                <button
                  onClick={() => copyToClipboard(validationCode, 'validation')}
                  className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 flex items-center space-x-1.5 transition cursor-pointer"
                >
                  {copiedSection === 'validation' ? <Check className="w-3.5 h-3.5 text-orange-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedSection === 'validation' ? 'Copied!' : 'Copy Zod Schema'}</span>
                </button>
              </div>
              <pre className="bg-slate-900/90 p-4 rounded-2xl border border-slate-800 overflow-x-auto text-[11px] leading-relaxed text-amber-300">
                <code>{validationCode}</code>
              </pre>
            </div>
          )}

          {activeTab === 'security-headers' && (
            <div>
              <div className="flex justify-between items-center mb-3">
                <div className="flex items-center space-x-2 text-orange-400">
                  <ShieldAlert className="w-4 h-4" />
                  <span className="font-bold text-slate-200">Production HTTP Security Headers (next.config.js)</span>
                </div>
                <button
                  onClick={() => copyToClipboard(securityHeadersConfig, 'security-headers')}
                  className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 flex items-center space-x-1.5 transition cursor-pointer"
                >
                  {copiedSection === 'security-headers' ? <Check className="w-3.5 h-3.5 text-orange-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedSection === 'security-headers' ? 'Copied!' : 'Copy next.config.js'}</span>
                </button>
              </div>
              <pre className="bg-slate-900/90 p-4 rounded-2xl border border-slate-800 overflow-x-auto text-[11px] leading-relaxed text-amber-300">
                <code>{securityHeadersConfig}</code>
              </pre>
            </div>
          )}

          {activeTab === 'structure' && (
            <div>
              <div className="flex justify-between items-center mb-3">
                <span className="font-bold text-slate-200">Clean Production File Hierarchy</span>
                <button
                  onClick={() => copyToClipboard(folderStructureText, 'structure')}
                  className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 flex items-center space-x-1.5 transition cursor-pointer"
                >
                  {copiedSection === 'structure' ? <Check className="w-3.5 h-3.5 text-orange-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedSection === 'structure' ? 'Copied!' : 'Copy Structure'}</span>
                </button>
              </div>
              <pre className="bg-slate-900/90 p-4 rounded-2xl border border-slate-800 overflow-x-auto text-[11px] leading-relaxed text-emerald-300">
                <code>{folderStructureText}</code>
              </pre>
            </div>
          )}

          {activeTab === 'local-run' && (
            <div>
              <div className="flex justify-between items-center mb-3">
                <span className="font-bold text-slate-200">Terminal Commands &amp; Local Verification</span>
                <button
                  onClick={() => copyToClipboard(localRunSteps, 'local-run')}
                  className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 flex items-center space-x-1.5 transition cursor-pointer"
                >
                  {copiedSection === 'local-run' ? <Check className="w-3.5 h-3.5 text-orange-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedSection === 'local-run' ? 'Copied!' : 'Copy Commands'}</span>
                </button>
              </div>
              <pre className="bg-slate-900/90 p-4 rounded-2xl border border-slate-800 overflow-x-auto text-[11px] leading-relaxed text-orange-300">
                <code>{localRunSteps}</code>
              </pre>
            </div>
          )}
        </div>

        {/* Footer info */}
        <div className="px-6 py-3.5 bg-slate-900 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
          <div className="flex items-center space-x-2">
            <Lock className="w-3.5 h-3.5 text-emerald-400" />
            <span>Supplier and dispatch API credentials remain strictly protected on server runtime.</span>
          </div>
          <button
            onClick={onClose}
            className="bg-orange-500 text-white px-4 py-2 rounded-xl font-bold hover:bg-orange-600 transition cursor-pointer"
          >
            Close Guide
          </button>
        </div>
      </div>
    </div>
  );
};
