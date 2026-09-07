export const DEFAULT_PRODUCT_IMAGE = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="400" height="400" viewBox="0 0 24 24" fill="none" stroke="%2394a3b8" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path><polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline><line x1="12" y1="22.08" x2="12" y2="12"></line></svg>';

export interface Product {
  id: string;
  title: string;
  slug: string;
  category: string;
  subcategory?: string;
  price: number; // Retail price in LKR (Rs.)
  originalPrice: number;
  discountPercentage: number;
  wholesaleCost: number; // DropX wholesale supplier cost
  sku: string; // DropX SKU code
  supplierName: string;
  supplierOrigin: string;
  rating: number;
  reviewsCount: number;
  soldCount: number;
  stock: number;
  imageUrl: string;
  galleryImages: string[];
  description: string;
  features: string[];
  specs: Record<string, string>;
  isFlashDeal?: boolean;
  freeShipping?: boolean;
  badge?: string; // 'LANKABUY DEAL' | 'BESTSELLER' | 'TRENDING' etc.
  estimatedDeliveryDays: number;
  islandwideExpress?: boolean;
  creemProductId?: string; // Creem.io MOR auto-synced product ID (prod_xxxx)
  source?: string; // 'cj_dropshipping' | 'supplier_sri_lanka' | 'admin_local' | 'aliexpress' etc.
  allowCOD?: boolean; // Cash on Delivery enabled
  allowCard?: boolean; // Card Payment (Creem.io) enabled
  paymentOptions?: 'all' | 'cod_only' | 'card_only' | 'both'; // Payment decision from Admin Panel
  isLocalStore?: boolean; // Domestic Sri Lanka Inventory from Admin Panel
  cjDirectUrl?: string; // Direct CJ Dropshipping product URL
  supplierProductId?: string; // Sourced Supplier Product ID (e.g. CJ PID)
  weightGrams?: number; // Product weight in grams for precise freight calculation
  cjShippingFeeLkr?: number; // Sourced CJ freight estimate in LKR
  cjShippingFeeUsd?: number; // Sourced CJ freight in USD
  fixedShippingCost?: number; // Admin fixed shipping fee in LKR
  shippingFeeLkr?: number; // Shipping fee in LKR
  isTrending?: boolean; // Trending priority flag
  variations?: { name: string; options: string[] }[]; // Product variations / attributes
  updatedAt?: string;
}

export interface UserProfile {
  uid: string;
  email: string;
  displayName?: string;
  photoURL?: string;
  createdAt?: string;
  isAdmin?: boolean;
  isBanned?: boolean;
  bannedAt?: string;
  banReason?: string;
}

export interface UserAddress {
  id: string;
  userId: string;
  label: 'Home' | 'Work' | 'Other' | string;
  fullName: string;
  phone: string;
  street: string;
  city: string;
  district: string;
  isDefault?: boolean;
  createdAt?: string;
}

export interface PendingCheckoutIntent {
  type: 'buy_now' | 'cart_checkout';
  product?: Product;
  quantity?: number;
  appliedDiscount?: number;
  appliedVoucherCode?: string;
}

export interface CartItem {
  product: Product;
  quantity: number;
  selectedColor?: string;
  selectedSize?: string;
}

export interface ShippingAddress {
  fullName: string;
  phone: string;
  email: string;
  street: string;
  city: string;
  district: string;
  province?: string;
  postalCode?: string;
  country: string;
}

export interface OrderItem {
  productId: string;
  title: string;
  sku: string;
  unitPrice: number;
  wholesaleCost: number;
  quantity: number;
  totalPrice: number;
  imageUrl: string;
  selectedColor?: string;
  selectedSize?: string;
  cjDirectUrl?: string;
  supplierOrigin?: string;
}

export interface SupplierFulfillment {
  supplierOrderId: string;
  supplierSku: string;
  status: 'QUEUED' | 'ACCEPTED' | 'PACKAGING' | 'SHIPPED' | 'DELIVERED' | 'FAILED';
  carrier: string;
  trackingNumber: string;
  estimatedFulfillmentHours: number;
  wholesaleTotal: number;
  forwardedAt: string;
}

export type OrderStatus = 
  | 'PENDING'
  | 'CONFIRMED'
  | 'PROCESSING'
  | 'SUBMITTED_TO_SUPPLIER'
  | 'FULFILLING'
  | 'SHIPPED'
  | 'DELIVERED'
  | 'FAILED'
  | 'CANCELLED';

export interface Order {
  id: string;
  orderNumber: string;
  idempotencyKey?: string;
  createdAt: string;
  customer: ShippingAddress;
  items: OrderItem[];
  subtotal: number;
  shippingFee: number;
  discount: number;
  totalAmount: number;
  wholesaleTotal: number;
  netProfit: number;
  paymentMethod: 'COD' | 'CREDIT_CARD' | 'LANKA_QR' | 'KOKO_MINTPAY';
  paymentStatus: 'PAID' | 'PENDING_COD' | 'PENDING_ONLINE';
  paidAt?: string;
  transactionId?: string;
  cjStatus?: 'Auto-Fulfilled' | 'Admin Approval Required' | 'DISPATCHED' | 'DELIVERED';
  status: OrderStatus;
  supplierResponse?: SupplierFulfillment;
  carrier?: string;
  trackingNumber?: string;
  userId?: string;
  trackingHistory: {
    status: string;
    description: string;
    timestamp: string;
    location: string;
  }[];
  customCurrentLocation?: string;
  deliveredAt?: string;
  returnExpiryDate?: string;
  returnAdminUnlocked?: boolean;
  returnStatus?: 'ACTIVE' | 'LOCKED' | 'ADMIN_UNLOCKED' | 'RETURN_REQUESTED' | 'RETURNED';
  retryCount?: number;
  lastError?: string;
}

export interface SupplierApiLog {
  id: string;
  timestamp: string;
  endpoint: string;
  method: 'POST' | 'GET';
  requestPayload: any;
  responsePayload: any;
  statusCode: number;
  durationMs: number;
  status: 'SUCCESS' | 'ERROR';
  correlationId?: string;
}

export type DropXApiLog = SupplierApiLog;

export interface FilterState {
  category: string;
  searchQuery: string;
  minPrice: number;
  maxPrice: number;
  minRating: number;
  onlyFreeShipping: boolean;
  onlyFlashDeals: boolean;
  sortBy: 'popular' | 'price-low' | 'price-high' | 'rating' | 'discount';
  paymentMethodFilter?: 'cod_available' | 'card_only' | 'both' | 'all';
  cursor?: string;
  limit?: number;
}

// ============================================================================
// PRODUCTION SCALABLE INFRASTRUCTURE TYPES
// ============================================================================

export interface QueueJob<T = any> {
  id: string;
  type: 'PROCESS_ORDER' | 'SYNC_CATALOG' | 'STOCK_VERIFY' | 'WEBHOOK_DISPATCH';
  payload: T;
  status: 'QUEUED' | 'PROCESSING' | 'COMPLETED' | 'RETRYING' | 'DEAD_LETTER';
  attempts: number;
  maxRetries: number;
  idempotencyKey: string;
  createdAt: string;
  updatedAt: string;
  nextRetryAt?: string;
  lastError?: string;
  executionTimeMs?: number;
}

export interface CircuitBreakerStatus {
  service: string;
  state: 'CLOSED' | 'OPEN' | 'HALF_OPEN';
  failureCount: number;
  failureThreshold: number;
  successCount: number;
  successThreshold: number;
  lastFailureTime: number | null;
  recoveryTimeoutMs: number;
  fallbackActive: boolean;
}

export interface ClusterNode {
  id: string;
  name: string;
  role: 'API_INSTANCE' | 'WORKER_NODE' | 'READ_REPLICA';
  status: 'HEALTHY' | 'DEGRADED' | 'DRAINING';
  endpoint: string;
  activeConnections: number;
  rps: number;
  p95LatencyMs: number;
  cpuPercent: number;
  memoryMb: number;
  uptimeSeconds: number;
}

export interface RedisMetrics {
  connected: boolean;
  hitRatio: number;
  totalKeys: number;
  hits: number;
  misses: number;
  memoryUsedMb: number;
  opsPerSec: number;
  connectedClients: number;
  cachedCatalogCount: number;
}

export interface DatabaseMetrics {
  connected: boolean;
  poolSize: number;
  activeConnections: number;
  idleConnections: number;
  queuedQueries: number;
  avgQueryTimeMs: number;
  readReplicasCount: number;
  tableCounts: {
    products: number;
    orders: number;
    customers: number;
    idempotencyKeys: number;
  };
}

export interface SystemTelemetry {
  timestamp: string;
  totalRps: number;
  p50LatencyMs: number;
  p95LatencyMs: number;
  p99LatencyMs: number;
  http5xxRate: number;
  queueDepth: number;
  dlqCount: number;
  circuitBreaker: CircuitBreakerStatus;
  redis: RedisMetrics;
  database: DatabaseMetrics;
  nodes: ClusterNode[];
  autoScaleTarget: number;
  autoScaleCurrent: number;
}

export interface LoadTestResult {
  id: string;
  timestamp: string;
  concurrencyTarget: number;
  actualConcurrentUsers: number;
  durationSeconds: number;
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  achievedRps: number;
  p50LatencyMs: number;
  p95LatencyMs: number;
  p99LatencyMs: number;
  errorRatePercent: number;
  cpuPeakPercent: number;
  memoryPeakMb: number;
  bottleneckDetected: string;
  recommendations: string[];
  passed: boolean;
}

export interface AIDiagnosticReport {
  id: string;
  timestamp: string;
  severity: 'HEALTHY' | 'INFO' | 'WARNING' | 'CRITICAL';
  issueTitle: string;
  rootCause: string;
  telemetrySummary: string;
  suggestedPatch: string;
  sandboxValidationResult?: {
    success: boolean;
    testsPassed: number;
    testsFailed: number;
    regressionRisk: 'LOW' | 'MEDIUM' | 'HIGH';
    notes: string;
  };
  patchStatus: 'PROPOSED' | 'TESTED_IN_SANDBOX' | 'APPLIED' | 'ROLLED_BACK';
}

export type SupplierSource = 'ALIEXPRESS' | 'CJ_DROPSHIPPING';

export interface GlobalProductVariant {
  skuId: string;
  name: string;
  priceLkr: number;
  price?: number;
  stock: number;
  imageUrl?: string;
  skuAttr?: string;
  weightGrams?: number;
}

export interface GlobalTaxBreakdown {
  itemPriceLkr: number;
  shippingFeeLkr: number;
  cifLkr: number;             // Cost, Insurance & Freight
  importDutyLkr: number;      // 10% PAL / Customs Levy
  vatLkr: number;             // 15% VAT
  totalTaxLkr: number;
  finalPriceLkr: number;      // Item + Shipping + Tax
  taxRatePercent: number;     // Effective combined tax rate
}

export interface GlobalProduct {
  id: string;                 // e.g. 'global-ali-cn-01' or 'global-cj-cn-07'
  supplierSource: SupplierSource; // Hidden metadata tracking for checkout fulfillment (Never exposed on frontend UI)
  supplierProductId: string;  // Internal supplier item ID
  sku?: string;
  title: string;
  country: string;            // 'China' | 'Japan' | 'South Korea' | 'Singapore' | 'United Arab Emirates'
  countryFlag: string;
  storeName: string;          // White-labeled warehouse or hub name
  storeRating: number;
  rating: number;
  ordersCount: number;
  imageUrl: string;
  galleryImages: string[];
  variants: GlobalProductVariant[];
  shippingFeeLkr: number;
  deliveryTimeDays: string;   // e.g. '7-12 Days Air Cargo'
  courierName: string;        // White-labeled courier name
  priceLkr: number;           // FOB item price in LKR
  price?: number;
  originalPriceLkr: number;
  originalPrice?: number;
  discountPercentage: number;
  taxBreakdown: GlobalTaxBreakdown;
  weightGrams?: number;
  cjDirectUrl?: string;
  category: string;
  features: string[];
  description: string;
  specs: Record<string, string>;
  creemProductId?: string;
  allowCOD?: boolean;
  allowCard?: boolean;
  paymentOptions?: 'all' | 'cod_only' | 'card_only';
  isGlobalProduct: true;
}

// Backward Compatibility Aliases
export type AliExpressVariant = GlobalProductVariant;
export type AliExpressTaxBreakdown = GlobalTaxBreakdown;
export type AliExpressProduct = GlobalProduct;


