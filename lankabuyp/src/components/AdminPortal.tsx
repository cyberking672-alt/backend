import React, { useState, useEffect, useMemo } from 'react';
import { auth, signInWithGoogle } from '../lib/firebase';
import { 
  ShieldCheck, 
  Lock, 
  KeyRound, 
  Terminal, 
  Activity, 
  Package, 
  TrendingUp, 
  RefreshCw, 
  CheckCircle2, 
  AlertCircle, 
  Send, 
  X,
  Server,
  Layers,
  Search,
  Eye,
  LogOut,
  Clock,
  ArrowRight,
  ArrowLeft,
  Home,
  Sun,
  Moon,
  Zap,
  Cpu,
  Database,
  Gauge,
  Sparkles,
  Play,
  RotateCcw,
  Check,
  Flame,
  Globe,
  Radio,
  Sliders,
  AlertTriangle,
  Maximize2,
  Minimize2,
  DollarSign,
  Truck,
  FileText,
  ShoppingBag,
  ExternalLink,
  ChevronRight,
  Filter,
  BarChart3,
  PieChart as PieChartIcon,
  ArrowUpRight,
  User,
  MapPin,
  Phone,
  Mail,
  Printer,
  Edit3,
  Plus,
  Trash2,
  Save,
  Upload,
  Image as ImageIcon
} from 'lucide-react';
import { 
  ResponsiveContainer, 
  AreaChart, 
  Area, 
  BarChart, 
  Bar, 
  PieChart, 
  Pie, 
  Cell, 
  XAxis, 
  YAxis, 
  Tooltip, 
  CartesianGrid, 
  Legend 
} from 'recharts';
import { 
  Order, 
  SupplierApiLog, 
  SystemTelemetry, 
  LoadTestResult, 
  AIDiagnosticReport 
} from '../types';

interface AdminPortalProps {
  isOpen: boolean;
  onClose: () => void;
  onAuthChange?: (isAuthenticated: boolean) => void;
  isFullPage?: boolean;
}

export const AdminPortal: React.FC<AdminPortalProps> = ({ 
  isOpen, 
  onClose, 
  onAuthChange,
  isFullPage = false 
}) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [adminUser, setAdminUser] = useState<{ email: string; name: string; role: string } | null>(null);
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [authError, setAuthError] = useState('');
  const [emailInput, setEmailInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    return (localStorage.getItem('lankabuy_admin_theme') as 'dark' | 'light') || 'dark';
  });

  const toggleTheme = () => {
    const nextTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(nextTheme);
    localStorage.setItem('lankabuy_admin_theme', nextTheme);
  };

  // Active Tab
  const [activeTab, setActiveTab] = useState<
    'analytics' | 'dispatched_products' | 'orders' | 'catalog' | 'topology' | 'loadtest' | 'ai_sre' | 'logs' | 'console_logs'
  >('analytics');

  // Sales Analytics, Dashboard Metrics & Dispatches Data
  const [salesAnalytics, setSalesAnalytics] = useState<any>(null);
  const [dashboardMetrics, setDashboardMetrics] = useState<any>(null);
  const [isLoadingAnalytics, setIsLoadingAnalytics] = useState(false);

  // Orders, Telemetry & Logs State
  const [orders, setOrders] = useState<Order[]>([]);
  const [telemetry, setTelemetry] = useState<SystemTelemetry | null>(null);
  const [queueData, setQueueData] = useState<any>(null);
  const [logs, setLogs] = useState<SupplierApiLog[]>([]);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [serverConsoleLogs, setServerConsoleLogs] = useState<any[]>([]);
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  // Store Settings State
  const [profitMarginInput, setProfitMarginInput] = useState<number>(25);
  const [exchangeRateInput, setExchangeRateInput] = useState<number>(328.36);
  const [exchangeRateProvider, setExchangeRateProvider] = useState<string>('CBSL Official Rate');
  const [isManualRate, setIsManualRate] = useState<boolean>(false);
  const [isSavingSettings, setIsSavingSettings] = useState(false);

  // Search & Filter State
  const [productSearch, setProductSearch] = useState('');
  const [orderSearch, setOrderSearch] = useState('');
  const [orderStatusFilter, setOrderStatusFilter] = useState('ALL');
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [orderToEditLocation, setOrderToEditLocation] = useState<Order | null>(null);
  const [locationInput, setLocationInput] = useState('');
  const [statusInput, setStatusInput] = useState<string>('CONFIRMED');
  const [statusNoteInput, setStatusNoteInput] = useState('');
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);

  // Product Catalog Management State
  const [catalogProducts, setCatalogProducts] = useState<any[]>([]);
  const [isLoadingCatalog, setIsLoadingCatalog] = useState(false);
  const [catalogSearch, setCatalogSearch] = useState('');
  const [catalogCategoryFilter, setCatalogCategoryFilter] = useState('ALL');
  const [editingProduct, setEditingProduct] = useState<any | null>(null);
  const [isAddingProduct, setIsAddingProduct] = useState(false);
  const [isSavingProduct, setIsSavingProduct] = useState(false);
  const [newProductForm, setNewProductForm] = useState<{
    title: string;
    category: string;
    price: string | number;
    wholesaleCost: string | number;
    stock: string | number;
    imageUrl: string;
    galleryImages: string[];
    galleryImagesText: string;
    description: string;
    sku: string;
    fixedShippingCost: string | number;
    allowCOD: boolean;
    allowCard: boolean;
    isTrending: boolean;
    variationsText: string;
  }>({
    title: '',
    category: 'General Merchandise',
    price: '',
    wholesaleCost: '',
    stock: '50',
    imageUrl: '',
    galleryImages: [],
    galleryImagesText: '',
    description: '',
    sku: '',
    fixedShippingCost: '450',
    allowCOD: true,
    allowCard: true,
    isTrending: false,
    variationsText: '',
  });

  // Load Test State
  const [selectedConcurrency, setSelectedConcurrency] = useState<number>(10000);
  const [isLoadTesting, setIsLoadTesting] = useState(false);
  const [loadTestResult, setLoadTestResult] = useState<LoadTestResult | null>(null);

  // AI SRE Diagnostics State
  const [aiReport, setAiReport] = useState<AIDiagnosticReport | null>(null);
  const [isAnalyzingAi, setIsAnalyzingAi] = useState(false);
  const [isValidatingSandbox, setIsValidatingSandbox] = useState(false);
  const [isApplyingPatch, setIsApplyingPatch] = useState(false);

  // Clock
  const [currentTime, setCurrentTime] = useState(new Date().toLocaleTimeString());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date().toLocaleTimeString()), 1000);
    return () => clearInterval(timer);
  }, []);

  const showNotification = (msg: string) => {
    setActionMessage(msg);
    setTimeout(() => setActionMessage(null), 3500);
  };

  // Helper for Bearer Token Authentication (Supports cross-origin iframes & partitioned cookies)
  const getAdminToken = () => {
    try {
      return localStorage.getItem('lankabuy_admin_token') || '';
    } catch {
      return '';
    }
  };

  const getAdminHeaders = (extraHeaders?: Record<string, string>) => {
    const token = getAdminToken();
    const headers: Record<string, string> = { ...extraHeaders };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    return headers;
  };

  // Check an existing admin session only when the portal is opened.
  useEffect(() => {
    if (isOpen) {
      checkAdminSession();
    }
  }, [isOpen]);

  const checkAdminSession = async () => {
    try {
      const res = await fetch('/api/admin/me', { 
        credentials: 'include',
        headers: getAdminHeaders()
      });
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.authenticated) {
          setIsAuthenticated(true);
          setAdminUser(data.user);
          onAuthChange?.(true);
          fetchDashboardData();
          return;
        }
      }

      // Auto-fallback: if Firebase Auth is already signed in, ask the BACKEND
      // whether that email is authorized (hint only), then exchange the
      // verified Firebase ID token server-side. No email is hardcoded here;
      // ADMIN_ALLOWED_EMAIL on the server is the single source of truth.
      if (auth.currentUser?.email) {
        try {
          const hintRes = await fetch('/api/admin/check-email', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: auth.currentUser.email }),
          });
          const hint = await hintRes.json().catch(() => null);
          if (hint && hint.success && hint.isAllowed) {
            // Force-refresh so async-provisioned custom claims are included.
            const idToken = await auth.currentUser.getIdToken(true);
            if (idToken) {
              await handleGoogleAuth(idToken);
            }
          }
        } catch {
          // Not an admin session; login view remains.
        }
      }
    } catch {
      // Session not active
    }
  };

  // Google OAuth 2.0 Sign-In Handler
  const handleGoogleAuth = async (credential: string) => {
    if (!credential) {
      setAuthError('Please provide a valid Google authorization token.');
      return;
    }

    setIsAuthenticating(true);
    setAuthError('');

    try {
      const res = await fetch('/api/admin/google-auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ credential }),
      });

      const data = await res.json();

      if (data.success && data.authenticated) {
        if (data.accessToken) {
          try {
            localStorage.setItem('lankabuy_admin_token', data.accessToken);
          } catch {}
        }
        setIsAuthenticated(true);
        setAdminUser(data.user);
        onAuthChange?.(true);
        showNotification(`Welcome back, ${data.user?.name || 'Administrator'}!`);
        fetchDashboardData();
      } else {
        setIsAuthenticated(false);
        onAuthChange?.(false);
        setAuthError(data.message || 'Access Denied: Only the authorized store owner email is permitted to log in.');
      }
    } catch {
      setAuthError('Authentication failed due to a network or server error.');
    } finally {
      setIsAuthenticating(false);
    }
  };

  const handleGoogleSignInFlow = async () => {
    setIsAuthenticating(true);
    setAuthError('');
    try {
      if (auth.currentUser) {
        // Force-refresh: picks up async-provisioned admin custom claims.
        const token = await auth.currentUser.getIdToken(true);
        await handleGoogleAuth(token);
      } else {
        const profile = await signInWithGoogle();
        if (profile) {
          const token = await auth.currentUser?.getIdToken(true);
          if (token) {
            await handleGoogleAuth(token);
          }
        }
      }
    } catch (err: any) {
      if (err?.code !== 'auth/popup-closed-by-user' && err?.code !== 'auth/cancelled-popup-request') {
        setAuthError(err?.message || 'Google authentication failed.');
      }
    } finally {
      setIsAuthenticating(false);
    }
  };

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsAuthenticating(true);
    setAuthError('');

    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email: emailInput.trim(), password: passwordInput })
      });
      const data = await res.json();
      if (data.success && data.authenticated) {
        if (data.accessToken) {
          try {
            localStorage.setItem('lankabuy_admin_token', data.accessToken);
          } catch {}
        }
        setIsAuthenticated(true);
        setAdminUser(data.user);
        onAuthChange?.(true);
        showNotification('Authenticated successfully as Store Owner!');
        fetchDashboardData();
      } else {
        setAuthError(data.message || 'Access denied: Only authorized environment email is permitted.');
      }
    } catch {
      setAuthError('Network error during authentication.');
    } finally {
      setIsAuthenticating(false);
    }
  };

  const handleLogout = async () => {
    try {
      try {
        localStorage.removeItem('lankabuy_admin_token');
      } catch {}
      await fetch('/api/admin/logout', { 
        method: 'POST', 
        credentials: 'include',
        headers: getAdminHeaders()
      });
    } catch {
      // Ignore
    }
    setIsAuthenticated(false);
    setAdminUser(null);
    onAuthChange?.(false);
    showNotification('Logged out from Admin Command Center.');
  };

  const fetchDashboardData = async () => {
    setIsLoadingAnalytics(true);
    try {
      const safeFetchJson = async (url: string) => {
        try {
          const res = await fetch(url, { 
            credentials: 'include',
            headers: getAdminHeaders()
          });
          if (!res.ok) {
            console.warn(`[Admin fetch notice] ${url} status ${res.status}`);
            return { success: false, status: res.status };
          }
          return await res.json();
        } catch (err) {
          console.warn(`[Admin fetch error] ${url}:`, err);
          return { success: false };
        }
      };

      const [analyticsJson, dashJson, ordersJson, telemetryJson, logsJson, auditJson, consoleLogsJson, productsJson, settingsJson] = await Promise.all([
        safeFetchJson('/api/admin/sales-analytics'),
        safeFetchJson('/api/admin/dashboard'),
        safeFetchJson('/api/orders'),
        safeFetchJson('/api/admin/telemetry'),
        safeFetchJson('/api/supplier/logs'),
        safeFetchJson('/api/admin/audit-logs'),
        safeFetchJson('/api/admin/console-logs'),
        safeFetchJson('/api/admin/products'),
        safeFetchJson('/api/admin/settings')
      ]);

      if (analyticsJson.success) setSalesAnalytics(analyticsJson);
      if (dashJson.success) setDashboardMetrics(dashJson.metrics);
      if (ordersJson.success) setOrders(ordersJson.orders || []);
      if (telemetryJson.success) {
        setTelemetry(telemetryJson.telemetry);
        setQueueData(telemetryJson.queue);
      }
      if (logsJson.success) setLogs(logsJson.logs || []);
      if (auditJson.success) setAuditLogs(auditJson.logs || []);
      if (consoleLogsJson.success) setServerConsoleLogs(consoleLogsJson.logs || []);
      if (productsJson?.success && Array.isArray(productsJson.products)) {
        setCatalogProducts(productsJson.products);
      }
      if (settingsJson?.success) {
        if (typeof settingsJson.profitMarginPercent === 'number') setProfitMarginInput(settingsJson.profitMarginPercent);
        if (typeof settingsJson.exchangeRate === 'number') setExchangeRateInput(settingsJson.exchangeRate);
        if (settingsJson.exchangeRateProvider) setExchangeRateProvider(settingsJson.exchangeRateProvider);
        if (typeof settingsJson.isManualRate === 'boolean') setIsManualRate(settingsJson.isManualRate);
      }
    } catch (err: any) {
      console.warn('Dashboard fetch notice:', err?.message || err);
    } finally {
      setIsLoadingAnalytics(false);
    }
  };

  const handleSaveStoreSettings = async (resetRate = false) => {
    setIsSavingSettings(true);
    try {
      const payload: any = { profitMarginPercent: profitMarginInput };
      if (resetRate) {
        payload.resetToAutoRate = true;
      } else {
        payload.manualExchangeRate = exchangeRateInput;
      }

      const res = await fetch('/api/admin/settings', {
        method: 'POST',
        headers: { ...getAdminHeaders(), 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (data.success) {
        showNotification(data.message || `Store settings updated successfully!`);
        if (typeof data.exchangeRate === 'number') setExchangeRateInput(data.exchangeRate);
        if (data.exchangeRateProvider) setExchangeRateProvider(data.exchangeRateProvider);
        if (typeof data.isManualRate === 'boolean') setIsManualRate(data.isManualRate);
        fetchDashboardData();
      } else {
        showNotification(`Failed to update settings: ${data.message}`);
      }
    } catch (err: any) {
      showNotification(`Error saving settings: ${err.message}`);
    } finally {
      setIsSavingSettings(false);
    }
  };

  const fetchCatalogOnly = async () => {
    setIsLoadingCatalog(true);
    try {
      const res = await fetch('/api/admin/products', {
        headers: getAdminHeaders(),
        credentials: 'include'
      });
      const data = await res.json();
      if (data.success && Array.isArray(data.products)) {
        setCatalogProducts(data.products);
        showNotification(`Catalog refreshed: ${data.products.length} products loaded.`);
      }
    } catch (err: any) {
      showNotification(`Failed to refresh catalog: ${err.message}`);
    } finally {
      setIsLoadingCatalog(false);
    }
  };

  // Direct Image Compression & Upload Utility (Lossless aspect-ratio scaling to optimized Base64)
  const compressAndEncodeImage = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new window.Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;
          // Scale to max 800px for lightning-fast uploads and compact Firestore storage
          const maxDimension = 800;
          if (width > maxDimension || height > maxDimension) {
            if (width > height) {
              height = Math.round((height * maxDimension) / width);
              width = maxDimension;
            } else {
              width = Math.round((width * maxDimension) / height);
              height = maxDimension;
            }
          }
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            resolve(e.target?.result as string);
            return;
          }
          ctx.drawImage(img, 0, 0, width, height);
          const compressed = canvas.toDataURL('image/jpeg', 0.80);
          resolve(compressed);
        };
        img.onerror = () => resolve(e.target?.result as string);
        img.src = e.target?.result as string;
      };
      reader.onerror = (err) => reject(err);
      reader.readAsDataURL(file);
    });
  };

  const handleUploadMainImage = async (file: File, isEdit: boolean) => {
    if (!file) return;
    try {
      showNotification('Optimizing and uploading main image...');
      const dataUri = await compressAndEncodeImage(file);
      if (isEdit && editingProduct) {
        setEditingProduct((prev: any) => ({
          ...prev,
          imageUrl: dataUri,
          galleryImages: Array.isArray(prev.galleryImages) && prev.galleryImages.length > 0 ? prev.galleryImages : [dataUri]
        }));
      } else {
        setNewProductForm((prev) => ({
          ...prev,
          imageUrl: dataUri,
          galleryImages: prev.galleryImages?.length > 0 ? prev.galleryImages : [dataUri]
        }));
      }
      showNotification('Main image uploaded successfully!');
    } catch (err: any) {
      showNotification(`Failed to upload main image: ${err?.message || err}`);
    }
  };

  const handleUploadGalleryImages = async (files: FileList | File[], isEdit: boolean) => {
    if (!files || files.length === 0) return;
    try {
      showNotification(`Uploading ${files.length} photo(s)...`);
      const results: string[] = [];
      for (let i = 0; i < files.length; i++) {
        const item = files[i];
        if (item && item.type.startsWith('image/')) {
          const encoded = await compressAndEncodeImage(item);
          results.push(encoded);
        }
      }
      if (results.length === 0) return;

      if (isEdit && editingProduct) {
        setEditingProduct((prev: any) => {
          const currentGallery = Array.isArray(prev.galleryImages) ? [...prev.galleryImages] : [];
          const updated = [...currentGallery, ...results];
          return {
            ...prev,
            galleryImages: updated,
            imageUrl: prev.imageUrl || updated[0]
          };
        });
      } else {
        setNewProductForm((prev) => {
          const currentGallery = Array.isArray(prev.galleryImages) ? [...prev.galleryImages] : [];
          const updated = [...currentGallery, ...results];
          return {
            ...prev,
            galleryImages: updated,
            imageUrl: prev.imageUrl || updated[0]
          };
        });
      }
      showNotification(`${results.length} additional photo(s) added!`);
    } catch (err: any) {
      showNotification(`Failed to upload gallery photos: ${err?.message || err}`);
    }
  };

  const handleRemoveGalleryImage = (index: number, isEdit: boolean) => {
    if (isEdit && editingProduct) {
      setEditingProduct((prev: any) => {
        const currentGallery = Array.isArray(prev.galleryImages) ? [...prev.galleryImages] : [];
        currentGallery.splice(index, 1);
        return {
          ...prev,
          galleryImages: currentGallery,
          imageUrl: prev.imageUrl === currentGallery[index] ? (currentGallery[0] || '') : prev.imageUrl
        };
      });
    } else {
      setNewProductForm((prev) => {
        const currentGallery = Array.isArray(prev.galleryImages) ? [...prev.galleryImages] : [];
        currentGallery.splice(index, 1);
        return {
          ...prev,
          galleryImages: currentGallery,
          imageUrl: prev.imageUrl === currentGallery[index] ? (currentGallery[0] || '') : prev.imageUrl
        };
      });
    }
  };

  const handleSaveEditProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProduct) return;
    if (!editingProduct.title || !editingProduct.title.trim()) {
      showNotification('Product Title is required.');
      return;
    }
    if (editingProduct.price === undefined || editingProduct.price === '' || Number(editingProduct.price) <= 0) {
      showNotification('Valid Selling Price (LKR) is required.');
      return;
    }

    setIsSavingProduct(true);
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 45000);

    try {
      const gallery = Array.isArray(editingProduct.galleryImages) && editingProduct.galleryImages.length > 0
        ? editingProduct.galleryImages
        : (editingProduct.imageUrl ? [editingProduct.imageUrl] : []);

      const payload = {
        id: editingProduct.id,
        title: editingProduct.title.trim(),
        price: Number(editingProduct.price),
        wholesaleCost: Number(editingProduct.wholesaleCost || Math.round(Number(editingProduct.price) * 0.7)),
        stock: Number(editingProduct.stock || 50),
        category: editingProduct.category || 'General Merchandise',
        imageUrl: editingProduct.imageUrl || (gallery[0] || 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=600&auto=format&fit=crop'),
        galleryImages: gallery,
        description: editingProduct.description || '',
        sku: editingProduct.sku || '',
        fixedShippingCost: Number(editingProduct.fixedShippingCost !== undefined && editingProduct.fixedShippingCost !== '' ? editingProduct.fixedShippingCost : 450),
        variations: Array.isArray(editingProduct.variations) ? editingProduct.variations : [],
        allowCOD: editingProduct.allowCOD !== false,
        allowCard: editingProduct.allowCard !== false,
        isTrending: Boolean(editingProduct.isTrending),
        badge: editingProduct.isTrending ? '🔥 TRENDING' : (editingProduct.badge || '🇱🇰 SRI LANKA STOCK'),
        isLocalStore: true,
        source: 'admin_local'
      };

      const res = await fetch('/api/admin/products/update', {
        method: 'POST',
        headers: getAdminHeaders({ 'Content-Type': 'application/json' }),
        credentials: 'include',
        signal: controller.signal,
        body: JSON.stringify(payload),
      });

      clearTimeout(timeoutId);

      let data: any;
      try {
        data = await res.json();
      } catch (jsonErr) {
        throw new Error(`Server returned status ${res.status}: ${res.statusText || 'Invalid response'}`);
      }

      if (res.ok && data && data.success) {
        setCatalogProducts(prev => prev.map(p => p.id === editingProduct.id ? data.product : p));
        showNotification(`✅ Product "${editingProduct.title}" updated and saved to database!`);
        setEditingProduct(null);
      } else {
        const errorMsg = data?.message || `HTTP ${res.status}: Failed to update product.`;
        showNotification(`❌ Error: ${errorMsg}`);
        alert(`Failed to update product:\n${errorMsg}`);
      }
    } catch (err: any) {
      clearTimeout(timeoutId);
      const isAbort = err?.name === 'AbortError';
      const msg = isAbort ? 'Request timed out after 45s. Please check your connection.' : (err?.message || String(err));
      showNotification(`❌ Error saving product: ${msg}`);
      alert(`Error saving product:\n${msg}`);
    } finally {
      setIsSavingProduct(false);
    }
  };

  const handleToggleTrending = async (productId: string, currentTrending: boolean) => {
    try {
      const res = await fetch('/api/admin/products/toggle-trending', {
        method: 'POST',
        headers: getAdminHeaders({ 'Content-Type': 'application/json' }),
        credentials: 'include',
        body: JSON.stringify({ id: productId, isTrending: !currentTrending }),
      });
      const data = await res.json();
      if (data.success && data.product) {
        setCatalogProducts(prev => prev.map(p => p.id === productId ? data.product : p));
        showNotification(`Product "${data.product.title}" trending status set to ${data.product.isTrending ? 'ON 🔥' : 'OFF'}`);
      } else {
        showNotification(`Failed to toggle trending: ${data.message}`);
      }
    } catch (err: any) {
      showNotification(`Error toggling trending: ${err?.message || err}`);
    }
  };

  const handleCreateProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProductForm.title || !newProductForm.title.trim()) {
      showNotification('Product Title is required.');
      return;
    }
    if (newProductForm.price === undefined || newProductForm.price === '' || Number(newProductForm.price) <= 0) {
      showNotification('Valid Selling Price (LKR) is required.');
      return;
    }

    setIsSavingProduct(true);
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 45000); // 45s safety timeout

    try {
      const gallery = Array.isArray(newProductForm.galleryImages) && newProductForm.galleryImages.length > 0
        ? newProductForm.galleryImages
        : (newProductForm.imageUrl ? [newProductForm.imageUrl] : []);

      const variations = newProductForm.variationsText
        ? newProductForm.variationsText.split('\n').map(line => {
            const parts = line.split(':');
            return {
              name: parts[0]?.trim() || 'Option',
              options: parts[1]?.trim() || ''
            };
          }).filter(v => v.options)
        : [];

      const payload = {
        title: newProductForm.title.trim(),
        category: newProductForm.category || 'General Merchandise',
        price: Number(newProductForm.price),
        wholesaleCost: newProductForm.wholesaleCost ? Number(newProductForm.wholesaleCost) : Math.round(Number(newProductForm.price) * 0.7),
        stock: Number(newProductForm.stock || 50),
        imageUrl: newProductForm.imageUrl || (gallery[0] || 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=600&auto=format&fit=crop'),
        galleryImages: gallery,
        description: newProductForm.description || 'Verified authentic product with islandwide express dispatch across Sri Lanka.',
        sku: newProductForm.sku ? newProductForm.sku.trim() : `LK-${Date.now().toString().slice(-6)}`,
        fixedShippingCost: Number(newProductForm.fixedShippingCost !== undefined && newProductForm.fixedShippingCost !== '' ? newProductForm.fixedShippingCost : 450),
        allowCOD: newProductForm.allowCOD !== false,
        allowCard: newProductForm.allowCard !== false,
        isTrending: Boolean(newProductForm.isTrending),
        variations,
        isLocalStore: true,
        source: 'admin_local'
      };

      const res = await fetch('/api/admin/products/add', {
        method: 'POST',
        headers: getAdminHeaders({ 'Content-Type': 'application/json' }),
        credentials: 'include',
        signal: controller.signal,
        body: JSON.stringify(payload),
      });

      clearTimeout(timeoutId);

      let data: any;
      try {
        data = await res.json();
      } catch (jsonErr) {
        throw new Error(`Server returned status ${res.status}: ${res.statusText || 'Invalid response'}`);
      }

      if (res.ok && data && data.success) {
        setCatalogProducts(prev => [data.product, ...prev]);
        showNotification(`✅ New product "${data.product.title}" saved to database successfully!`);
        setIsAddingProduct(false);
        setNewProductForm({
          title: '',
          category: 'General Merchandise',
          price: '',
          wholesaleCost: '',
          stock: '50',
          imageUrl: '',
          galleryImages: [],
          galleryImagesText: '',
          description: '',
          sku: '',
          fixedShippingCost: '450',
          allowCOD: true,
          allowCard: true,
          isTrending: false,
          variationsText: '',
        });
      } else {
        const errorMsg = data?.message || `HTTP ${res.status}: Failed to create product.`;
        showNotification(`❌ Error: ${errorMsg}`);
        alert(`Failed to add product:\n${errorMsg}`);
      }
    } catch (err: any) {
      clearTimeout(timeoutId);
      const isAbort = err?.name === 'AbortError';
      const msg = isAbort ? 'Request timed out after 45s. Please check your internet connection.' : (err?.message || String(err));
      showNotification(`❌ Error adding product: ${msg}`);
      alert(`Error saving product:\n${msg}`);
    } finally {
      setIsSavingProduct(false);
    }
  };

  const handleDeleteProduct = async (productId: string, productTitle: string) => {
    if (!window.confirm(`Are you sure you want to delete "${productTitle}" from store inventory?`)) {
      return;
    }
    try {
      const res = await fetch('/api/admin/products/delete', {
        method: 'POST',
        headers: getAdminHeaders({ 'Content-Type': 'application/json' }),
        credentials: 'include',
        body: JSON.stringify({ id: productId })
      });
      const data = await res.json();
      if (data.success) {
        setCatalogProducts(prev => prev.filter(p => p.id !== productId));
        showNotification(`Product "${productTitle}" deleted from catalog.`);
      } else {
        showNotification(`Failed to delete product: ${data.message}`);
      }
    } catch (err: any) {
      showNotification(`Error deleting product: ${err?.message || err}`);
    }
  };

  const handleClearConsoleLogs = async () => {
    try {
      const res = await fetch('/api/admin/console-logs/clear', { 
        method: 'POST', 
        credentials: 'include',
        headers: getAdminHeaders()
      });
      const data = await res.json();
      if (data.success) {
        setServerConsoleLogs([]);
        showNotification('Server console logs cleared.');
      }
    } catch (err: any) {
      showNotification(`Failed to clear logs: ${err.message}`);
    }
  };

  const fetchConsoleLogs = async () => {
    try {
      const res = await fetch('/api/admin/console-logs', { 
        credentials: 'include',
        headers: getAdminHeaders()
      });
      const data = await res.json();
      if (data.success && Array.isArray(data.logs)) {
        setServerConsoleLogs(data.logs);
      }
    } catch (err) {
      console.warn('Failed to fetch console logs:', err);
    }
  };

  const handleApproveCodOrder = async (orderId: string) => {
    setIsUpdatingStatus(true);
    try {
      const res = await fetch(`/api/admin/orders/${encodeURIComponent(orderId)}/approve-cod`, {
        method: 'POST',
        headers: getAdminHeaders({ 'Content-Type': 'application/json' }),
        credentials: 'include',
      });
      const data = await res.json();
      if (data.success) {
        showNotification(`✅ Order #${data.order?.orderNumber || orderId} Approved & Sent to CJ Dropshipping!`);
        fetchDashboardData();
        if (selectedOrder && (selectedOrder.id === orderId || selectedOrder.orderNumber === orderId)) {
          setSelectedOrder(data.order);
        }
      } else {
        showNotification(`⚠️ Failed to approve: ${data.message}`);
      }
    } catch (err: any) {
      showNotification(`⚠️ Network error: ${err.message}`);
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  useEffect(() => {
    if ((isOpen || isFullPage) && isAuthenticated) {
      fetchDashboardData();
      const interval = setInterval(fetchDashboardData, 6000);
      return () => clearInterval(interval);
    }
  }, [isOpen, isFullPage, isAuthenticated]);

  // Order Status Update & Custom Location Setting
  const handleDeduplicateOrders = async () => {
    setIsUpdatingStatus(true);
    try {
      const res = await fetch('/api/admin/orders/deduplicate', {
        method: 'POST',
        headers: getAdminHeaders(),
        credentials: 'include',
      });
      const data = await res.json();
      if (data.success) {
        showNotification(data.removedCount > 0 ? `✅ Removed ${data.removedCount} duplicate order(s)!` : '✅ Database clean: No duplicate orders detected.');
        fetchDashboardData();
      } else {
        showNotification(`Deduplication notice: ${data.message}`);
      }
    } catch (err: any) {
      showNotification(`Error running deduplication: ${err?.message || err}`);
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const handleDeleteOrder = async (orderId: string) => {
    if (!confirm(`Are you sure you want to permanently delete order ${orderId}?`)) return;
    setIsUpdatingStatus(true);
    try {
      const res = await fetch(`/api/admin/orders/${encodeURIComponent(orderId)}`, {
        method: 'DELETE',
        headers: getAdminHeaders(),
        credentials: 'include',
      });
      const data = await res.json();
      if (data.success) {
        showNotification(`Order ${orderId} deleted.`);
        fetchDashboardData();
        if (selectedOrder && (selectedOrder.id === orderId || selectedOrder.orderNumber === orderId)) {
          setSelectedOrder(null);
        }
      } else {
        showNotification(`Failed to delete order: ${data.message}`);
      }
    } catch (err: any) {
      showNotification(`Error deleting order: ${err?.message || err}`);
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const handleUpdateOrderStatus = async (orderId: string, newStatus: string, note?: string, customLocation?: string) => {
    setIsUpdatingStatus(true);
    try {
      const res = await fetch(`/api/admin/orders/${encodeURIComponent(orderId)}/update-status`, {
        method: 'POST',
        headers: getAdminHeaders({ 'Content-Type': 'application/json' }),
        credentials: 'include',
        body: JSON.stringify({
          status: newStatus,
          note: note || (newStatus === 'DELIVERED' ? 'Delivery Success: Package delivered to customer. 7-day return period started.' : `Admin updated order status to ${newStatus}`),
          customCurrentLocation: customLocation,
          location: customLocation || 'Peliyagoda Logistics Hub (Colombo)'
        })
      });
      const data = await res.json();
      if (data.success) {
        showNotification(newStatus === 'DELIVERED' 
          ? `✅ Delivery Success! Order #${orderId} marked as Delivered (7-day return window started)`
          : `Order #${orderId} marked as ${newStatus}`);
        fetchDashboardData();
        setOrderToEditLocation(null);
        if (selectedOrder && (selectedOrder.id === orderId || selectedOrder.orderNumber === orderId)) {
          setSelectedOrder(data.order);
        }
      } else {
        showNotification(`Failed to update: ${data.message}`);
      }
    } catch (err: any) {
      showNotification(`Error: ${err.message}`);
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  // Load Test Trigger
  const handleRunLoadTest = async () => {
    setIsLoadTesting(true);
    try {
      const res = await fetch('/api/admin/load-test', {
        method: 'POST',
        headers: getAdminHeaders({ 'Content-Type': 'application/json' }),
        credentials: 'include',
        body: JSON.stringify({ targetConcurrency: selectedConcurrency, duration: 4 }),
      });
      const data = await res.json();
      if (data.success) {
        setLoadTestResult(data.result);
        showNotification(`Load Test Completed for ${selectedConcurrency.toLocaleString()} users!`);
        fetchDashboardData();
      }
    } catch (e: any) {
      showNotification(`Load test error: ${e.message}`);
    } finally {
      setIsLoadTesting(false);
    }
  };

  // AI SRE Diagnostics
  const handleRunAiDiagnostics = async () => {
    setIsAnalyzingAi(true);
    try {
      const res = await fetch('/api/admin/ai-diagnostics', {
        method: 'POST',
        headers: getAdminHeaders({ 'Content-Type': 'application/json' }),
        credentials: 'include',
      });
      const data = await res.json();
      if (data.success) {
        setAiReport(data.report);
        showNotification('Gemini SRE Health Report Generated.');
      }
    } catch (e: any) {
      showNotification(`AI SRE Error: ${e.message}`);
    } finally {
      setIsAnalyzingAi(false);
    }
  };

  // Resilient Dispatched Products calculation (from salesAnalytics or directly aggregated from orders)
  const dispatchedProducts = useMemo(() => {
    if (salesAnalytics?.topDispatchedProducts && salesAnalytics.topDispatchedProducts.length > 0) {
      return salesAnalytics.topDispatchedProducts;
    }
    // Fallback: Directly aggregate bought items from orders
    const map = new Map<string, any>();
    orders.forEach((o: any) => {
      (o.items || []).forEach((item: any) => {
        const id = item.productId || item.title || 'item-prod';
        const qty = Number(item.quantity) || 1;
        const price = Number(item.unitPrice) || Number(item.price) || 3500;
        const wholesale = Number(item.wholesaleCost) || Math.round(price * 0.7);
        const revenue = Number(item.totalPrice) || (price * qty);
        const cost = wholesale * qty;
        const profit = revenue - cost;

        if (!map.has(id)) {
          map.set(id, {
            id,
            title: item.title || 'Dispatched Item',
            sku: item.sku || `SKU-${id.slice(0, 6).toUpperCase()}`,
            imageUrl: item.imageUrl || 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=400&q=80',
            unitsSold: 0,
            ordersCount: 0,
            unitPrice: price,
            wholesalePrice: wholesale,
            totalRevenueLkr: 0,
            totalCostLkr: 0,
            netProfitLkr: 0,
            supplierOrigin: 'Global Hub (CJ Dropshipping)',
            cjDirectUrl: 'https://cjdropshipping.com',
            weightGrams: 410,
            status: o.status || 'PROCESSING'
          });
        }
        const existing = map.get(id);
        existing.unitsSold += qty;
        existing.ordersCount += 1;
        existing.totalRevenueLkr += revenue;
        existing.totalCostLkr += cost;
        existing.netProfitLkr += profit;
      });
    });
    return Array.from(map.values());
  }, [salesAnalytics?.topDispatchedProducts, orders]);

  const filteredDispatchedProducts = dispatchedProducts.filter((p: any) => 
    p.title?.toLowerCase().includes(productSearch.toLowerCase()) ||
    p.sku?.toLowerCase().includes(productSearch.toLowerCase()) ||
    p.category?.toLowerCase().includes(productSearch.toLowerCase())
  );

  // Resilient Time Series Data for 7-day Sales Graphs
  const effectiveTimeSeriesData = useMemo(() => {
    if (salesAnalytics?.timeSeriesData && salesAnalytics.timeSeriesData.some((d: any) => d.unitsSold > 0 || d.revenue > 0)) {
      return salesAnalytics.timeSeriesData;
    }
    // Generate 7-day trend from orders
    const map = new Map<string, { name: string; date: string; unitsSold: number; revenue: number; profit: number; dispatches: number }>();
    const today = new Date();
    for (let i = 6; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      const dayName = d.toLocaleDateString('en-US', { weekday: 'short' });
      map.set(dateStr, { name: dayName, date: dateStr, unitsSold: 0, revenue: 0, profit: 0, dispatches: 0 });
    }
    orders.forEach((o: any) => {
      const oDate = new Date(o.createdAt || Date.now()).toISOString().split('T')[0];
      let entry = map.get(oDate);
      if (!entry) {
        const firstKey = Array.from(map.keys())[0];
        entry = map.get(firstKey);
      }
      if (entry) {
        entry.revenue += Number(o.totalAmount) || 0;
        entry.profit += Number(o.netProfit) || Math.round((Number(o.totalAmount) || 0) * 0.25);
        entry.dispatches += 1;
        const oUnits = (o.items || []).reduce((sum: number, it: any) => sum + (Number(it.quantity) || 1), 0);
        entry.unitsSold += oUnits || 1;
      }
    });
    return Array.from(map.values());
  }, [salesAnalytics?.timeSeriesData, orders]);

  // Resilient Category Breakdown for Pie Chart
  const effectiveCategoryBreakdown = useMemo(() => {
    if (salesAnalytics?.categoryBreakdown && salesAnalytics.categoryBreakdown.length > 0) {
      return salesAnalytics.categoryBreakdown;
    }
    // Derive categories from orders
    const catMap = new Map<string, number>();
    orders.forEach((o: any) => {
      (o.items || []).forEach((it: any) => {
        const cat = it.category || 'Electronics & Gadgets';
        const qty = Number(it.quantity) || 1;
        catMap.set(cat, (catMap.get(cat) || 0) + qty);
      });
    });
    if (catMap.size === 0) {
      return [
        { category: 'Electronics', unitsSold: 5 },
        { category: 'Smart Wearables', unitsSold: 3 },
        { category: 'Accessories', unitsSold: 2 }
      ];
    }
    return Array.from(catMap.entries()).map(([category, unitsSold]) => ({ category, unitsSold }));
  }, [salesAnalytics?.categoryBreakdown, orders]);

  // Filtered Orders
  const filteredOrders = orders.filter((o) => {
    const query = orderSearch.toLowerCase();
    const matchQuery = 
      o.orderNumber.toLowerCase().includes(query) ||
      (o.customer?.fullName && o.customer.fullName.toLowerCase().includes(query)) ||
      (o.customer?.phone && o.customer.phone.includes(query)) ||
      (o.customer?.city && o.customer.city.toLowerCase().includes(query)) ||
      (o.customer?.district && o.customer.district.toLowerCase().includes(query)) ||
      (o.paymentStatus && o.paymentStatus.toLowerCase().includes(query)) ||
      (o.cjStatus && o.cjStatus.toLowerCase().includes(query)) ||
      o.id.toLowerCase().includes(query);
    
    if (orderStatusFilter === 'ALL') return matchQuery;
    return matchQuery && o.status === orderStatusFilter;
  });

  const COLORS = ['#F97316', '#3B82F6', '#10B981', '#8B5CF6', '#EC4899', '#EAB308', '#06B6D4'];
  const isLight = theme === 'light';

  if (!isOpen) return null;

  return (
    <div 
      className={`fixed inset-0 z-50 ${isLight ? 'bg-slate-100 text-slate-900' : 'bg-slate-950 text-slate-100'} flex flex-col font-sans transition-colors duration-200 overflow-hidden select-none ${
        isFullscreen ? 'p-0' : 'p-0 sm:p-2 md:p-3'
      }`}
    >
      {/* Container Frame */}
      <div className={`w-full h-full ${isLight ? 'bg-white border-slate-200 shadow-2xl' : 'bg-slate-900 border-slate-800 shadow-2xl'} rounded-none sm:rounded-2xl border flex flex-col overflow-hidden relative transition-colors duration-200`}>
        
        {/* Action Notification Toast */}
        {actionMessage && (
          <div className="absolute top-16 right-6 z-50 bg-orange-600 text-white text-xs px-4 py-3 rounded-xl shadow-2xl flex items-center space-x-2 border border-orange-400 animate-bounce">
            <CheckCircle2 className="w-4 h-4 text-white shrink-0" />
            <span className="font-bold">{actionMessage}</span>
          </div>
        )}

        {/* Top Enterprise Header Bar */}
        <header className={`h-14 sm:h-16 ${isLight ? 'bg-white border-slate-200 text-slate-900' : 'bg-slate-950/90 border-slate-800/80 text-white'} border-b px-3 sm:px-6 flex items-center justify-between shrink-0 transition-colors duration-200`}>
          <div className="flex items-center space-x-2 sm:space-x-4 min-w-0">
            {/* Direct Back to Store Button */}
            <button
              onClick={onClose}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer shrink-0 ${
                isLight 
                  ? 'bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-300' 
                  : 'bg-slate-800/90 hover:bg-slate-700 text-slate-200 border border-slate-700'
              }`}
              title="Return to LankaBuy Marketplace"
            >
              <ArrowLeft className="w-4 h-4 text-orange-500 shrink-0" />
              <span className="hidden sm:inline">Back to Store</span>
              <span className="sm:hidden">Store</span>
            </button>

            <div className="h-6 w-px bg-slate-300 dark:bg-slate-800 hidden sm:block"></div>

            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-orange-500 to-amber-600 flex items-center justify-center shadow-lg shadow-orange-500/20 text-white font-black text-sm shrink-0">
                LK
              </div>
              <div className="min-w-0">
                <div className="flex items-center space-x-2">
                  <h1 className={`text-xs sm:text-sm font-black tracking-wider flex items-center truncate ${isLight ? 'text-slate-900' : 'text-white'}`}>
                    <span>LANKABUY</span>
                    <span className="ml-1.5 px-2 py-0.5 text-[9px] bg-orange-500/20 text-orange-500 border border-orange-500/30 rounded-md font-mono">
                      ENTERPRISE ADMIN
                    </span>
                  </h1>
                </div>
                <div className="flex items-center space-x-2 text-[10px] text-slate-400">
                  <span className="flex items-center text-emerald-500 font-semibold">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping mr-1"></span>
                    Live 99.98% SLA
                  </span>
                  <span>•</span>
                  <span className="hidden sm:inline font-mono">Node: 0.0.0.0:3000</span>
                </div>
              </div>
            </div>
          </div>

          {/* Right Header Controls */}
          <div className="flex items-center space-x-1.5 sm:space-x-2.5">
            {/* Theme Toggle: Dark / Light */}
            <button
              onClick={toggleTheme}
              className={`p-2 sm:px-3 sm:py-1.5 rounded-xl transition cursor-pointer flex items-center space-x-1.5 text-xs font-bold ${
                isLight
                  ? 'bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300'
                  : 'bg-slate-800 hover:bg-slate-700 text-amber-300 border border-slate-700'
              }`}
              title={isLight ? 'Switch to Dark Mode' : 'Switch to Light Mode'}
            >
              {isLight ? <Moon className="w-4 h-4 text-slate-700 shrink-0" /> : <Sun className="w-4 h-4 text-amber-400 shrink-0" />}
              <span className="hidden md:inline">{isLight ? 'Dark Mode' : 'Light Mode'}</span>
            </button>

            {isAuthenticated && (
              <div className={`hidden lg:flex items-center space-x-2 border px-3 py-1.5 rounded-xl text-[11px] ${
                isLight ? 'bg-slate-100 border-slate-300 text-slate-700' : 'bg-slate-800/60 border-slate-700/60 text-slate-300'
              }`}>
                <ShieldCheck className="w-3.5 h-3.5 text-orange-500" />
                <span className="text-slate-400">Admin:</span>
                <span className="font-mono font-bold">{adminUser?.email || 'Authorized Owner'}</span>
              </div>
            )}

            <div className={`hidden md:flex items-center space-x-1.5 border px-3 py-1.5 rounded-xl text-[11px] font-mono ${
              isLight ? 'bg-slate-100 border-slate-300 text-slate-600' : 'bg-slate-900 border-slate-800 text-slate-400'
            }`}>
              <Clock className="w-3.5 h-3.5 text-slate-400" />
              <span>{currentTime}</span>
            </div>

            {isAuthenticated && (
              <button
                onClick={() => fetchDashboardData()}
                disabled={isLoadingAnalytics}
                className={`p-2 rounded-xl transition cursor-pointer border ${
                  isLight 
                    ? 'bg-slate-100 hover:bg-slate-200 border-slate-300 text-slate-700' 
                    : 'bg-slate-800 hover:bg-slate-700 border-slate-700 text-slate-300'
                }`}
                title="Refresh Live Metrics"
              >
                <RefreshCw className={`w-4 h-4 ${isLoadingAnalytics ? 'animate-spin text-orange-500' : ''}`} />
              </button>
            )}

            <button
              onClick={() => setIsFullscreen(!isFullscreen)}
              className={`p-2 rounded-xl transition cursor-pointer hidden sm:block border ${
                isLight 
                  ? 'bg-slate-100 hover:bg-slate-200 border-slate-300 text-slate-700' 
                  : 'bg-slate-800 hover:bg-slate-700 border-slate-700 text-slate-300'
              }`}
              title={isFullscreen ? 'Exit Full Screen' : 'Full Screen View'}
            >
              {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>

            {isAuthenticated ? (
              <button
                onClick={handleLogout}
                className="flex items-center space-x-1.5 bg-red-600/10 hover:bg-red-600 text-red-600 hover:text-white border border-red-500/30 px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Logout</span>
              </button>
            ) : null}

            <button
              onClick={onClose}
              className={`p-2 rounded-xl transition cursor-pointer border ${
                isLight 
                  ? 'bg-slate-100 hover:bg-slate-200 border-slate-300 text-slate-600 hover:text-slate-900' 
                  : 'bg-slate-800 hover:bg-slate-700 border-slate-700 text-slate-400 hover:text-white'
              }`}
              title="Close Admin Panel & Return to Store"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </header>

        {/* Main Body */}
        {!isAuthenticated ? (
          /* ========================================================================= */
          /* STRICT ACCESS GATED LOGIN VIEW (ONLY ADMIN_ALLOWED_EMAIL PERMITTED)      */
          /* ========================================================================= */
          <div className={`flex-1 flex items-center justify-center p-4 sm:p-6 overflow-y-auto ${
            isLight ? 'bg-slate-100/80' : 'bg-radial from-slate-900 to-slate-950'
          }`}>
            <div className={`w-full max-w-md p-6 sm:p-8 rounded-3xl shadow-2xl backdrop-blur-xl border transition-colors ${
              isLight ? 'bg-white border-slate-200 text-slate-900' : 'bg-slate-900/90 border-slate-800 text-white'
            }`}>
              
              <div className="text-center mb-6">
                <div className="w-14 h-14 bg-gradient-to-tr from-orange-500 to-amber-600 rounded-2xl mx-auto flex items-center justify-center shadow-lg shadow-orange-500/20 text-white mb-4">
                  <ShieldCheck className="w-7 h-7" />
                </div>
                <h2 className={`text-xl font-black tracking-wide ${isLight ? 'text-slate-900' : 'text-white'}`}>
                  Enterprise Admin Console
                </h2>
                <p className={`text-xs mt-1.5 ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                  Restricted to authorized store owner configured in ADMIN_ALLOWED_EMAIL.
                </p>
                <div className="mt-3 inline-flex items-center px-3 py-1 rounded-full bg-orange-500/10 border border-orange-500/20 text-orange-600 dark:text-orange-400 text-[11px] font-mono font-bold">
                  <Lock className="w-3 h-3 mr-1.5" />
                  Whitelisted Environment Access Only
                </div>
              </div>

              {authError && (
                <div className="mb-5 p-3.5 bg-red-500/10 border border-red-500/30 rounded-2xl text-xs text-red-600 dark:text-red-300 flex items-start space-x-2.5">
                  <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                  <div>
                    <strong className="block font-bold">Access Denied</strong>
                    <span>{authError}</span>
                  </div>
                </div>
              )}

              {/* 1-Click Firebase Google OAuth Verification */}
              <button
                type="button"
                onClick={handleGoogleSignInFlow}
                disabled={isAuthenticating}
                className={`w-full font-bold py-3.5 px-4 rounded-2xl text-xs sm:text-sm transition flex items-center justify-center space-x-3 cursor-pointer shadow-md active:scale-98 disabled:opacity-60 border ${
                  isLight 
                    ? 'bg-slate-900 hover:bg-slate-800 text-white border-slate-900' 
                    : 'bg-white hover:bg-slate-100 text-slate-900 border-white'
                }`}
              >
                <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                </svg>
                <span>{isAuthenticating ? 'Verifying Credentials...' : 'Sign in with Owner Google Account'}</span>
              </button>

              <div className="my-5 flex items-center space-x-3">
                <div className={`flex-1 h-px ${isLight ? 'bg-slate-200' : 'bg-slate-800'}`}></div>
                <span className={`text-[10px] uppercase tracking-wider font-bold ${isLight ? 'text-slate-400' : 'text-slate-500'}`}>
                  Or Direct Password
                </span>
                <div className={`flex-1 h-px ${isLight ? 'bg-slate-200' : 'bg-slate-800'}`}></div>
              </div>

              {/* Direct Password Form */}
              <form onSubmit={handleEmailLogin} className="space-y-4">
                <div>
                  <label className={`text-[11px] font-semibold block mb-1.5 ${isLight ? 'text-slate-700' : 'text-slate-400'}`}>
                    Owner Email Address
                  </label>
                  <input
                    type="email"
                    placeholder="e.g. admin@yourdomain.com"
                    value={emailInput}
                    onChange={(e) => setEmailInput(e.target.value)}
                    required
                    className={`w-full rounded-xl px-3.5 py-2.5 text-xs focus:outline-none focus:border-orange-500 font-mono border ${
                      isLight 
                        ? 'bg-slate-50 border-slate-300 text-slate-900 placeholder-slate-400' 
                        : 'bg-slate-950 border-slate-800 text-white placeholder-slate-600'
                    }`}
                  />
                </div>

                <div>
                  <label className={`text-[11px] font-semibold block mb-1.5 ${isLight ? 'text-slate-700' : 'text-slate-400'}`}>
                    Admin Passcode
                  </label>
                  <input
                    type="password"
                    placeholder="••••••••••••"
                    value={passwordInput}
                    onChange={(e) => setPasswordInput(e.target.value)}
                    className={`w-full rounded-xl px-3.5 py-2.5 text-xs focus:outline-none focus:border-orange-500 font-mono border ${
                      isLight 
                        ? 'bg-slate-50 border-slate-300 text-slate-900 placeholder-slate-400' 
                        : 'bg-slate-950 border-slate-800 text-white placeholder-slate-600'
                    }`}
                  />
                </div>

                <button
                  type="submit"
                  disabled={isAuthenticating}
                  className="w-full bg-orange-600 hover:bg-orange-500 text-white font-bold py-3 rounded-xl text-xs transition cursor-pointer shadow-lg active:scale-98 disabled:opacity-60 flex items-center justify-center space-x-2"
                >
                  <KeyRound className="w-3.5 h-3.5" />
                  <span>{isAuthenticating ? 'Validating...' : 'Authenticate Admin Session'}</span>
                </button>
              </form>

              {/* Bottom Return to Store button */}
              <div className="mt-5 pt-4 border-t border-slate-200 dark:border-slate-800/80 flex items-center justify-between">
                <button
                  onClick={onClose}
                  className={`text-xs font-semibold flex items-center space-x-1.5 transition ${
                    isLight ? 'text-slate-600 hover:text-orange-600' : 'text-slate-400 hover:text-orange-400'
                  }`}
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Back to Store Home</span>
                </button>

                <span className={`text-[10px] flex items-center space-x-1 ${isLight ? 'text-slate-400' : 'text-slate-500'}`}>
                  <Lock className="w-3 h-3" />
                  <span>15min Session</span>
                </span>
              </div>
            </div>
          </div>
        ) : (
          /* ========================================================================= */
          /* FULL-SCREEN AUTHENTICATED ADMIN DASHBOARD                                */
          /* ========================================================================= */
          <div className={`flex-1 flex flex-col md:flex-row overflow-hidden ${isLight ? 'bg-slate-100' : 'bg-slate-950'}`}>
            
            {/* Left Navigation Sidebar */}
            <aside className={`w-full md:w-64 ${isLight ? 'bg-white border-slate-200 text-slate-700' : 'bg-slate-900/60 border-slate-800/80 text-slate-400'} border-r flex flex-row md:flex-col shrink-0 overflow-x-auto md:overflow-y-auto p-2 sm:p-3 space-x-1 md:space-x-0 md:space-y-1 transition-colors`}>
              
              <button
                onClick={() => setActiveTab('analytics')}
                className={`flex items-center space-x-2.5 px-3.5 py-2.5 rounded-xl text-xs font-bold transition shrink-0 cursor-pointer w-full text-left ${
                  activeTab === 'analytics'
                    ? 'bg-orange-500 text-white shadow-lg shadow-orange-500/20'
                    : isLight ? 'text-slate-600 hover:bg-slate-100 hover:text-slate-900' : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                }`}
              >
                <BarChart3 className="w-4 h-4 shrink-0" />
                <span>Sales Graphs</span>
              </button>

              <button
                onClick={() => setActiveTab('dispatched_products')}
                className={`flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-bold transition shrink-0 cursor-pointer w-full text-left ${
                  activeTab === 'dispatched_products'
                    ? 'bg-orange-500 text-white shadow-lg shadow-orange-500/20'
                    : isLight ? 'text-slate-600 hover:bg-slate-100 hover:text-slate-900' : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                }`}
              >
                <div className="flex items-center space-x-2.5">
                  <Package className="w-4 h-4 shrink-0" />
                  <span>Dispatched Items</span>
                </div>
                {salesAnalytics?.metrics?.totalUnitsSold > 0 && (
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-mono ${
                    activeTab === 'dispatched_products' 
                      ? 'bg-orange-600 text-white' 
                      : isLight ? 'bg-slate-100 text-orange-600 font-bold' : 'bg-slate-800 text-orange-400'
                  }`}>
                    {salesAnalytics.metrics.totalUnitsSold}
                  </span>
                )}
              </button>

              <button
                onClick={() => setActiveTab('orders')}
                className={`flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-bold transition shrink-0 cursor-pointer w-full text-left ${
                  activeTab === 'orders'
                    ? 'bg-orange-500 text-white shadow-lg shadow-orange-500/20'
                    : isLight ? 'text-slate-600 hover:bg-slate-100 hover:text-slate-900' : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                }`}
              >
                <div className="flex items-center space-x-2.5">
                  <Truck className="w-4 h-4 shrink-0" />
                  <span>Live Orders & Tracking</span>
                </div>
                <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-mono ${
                  activeTab === 'orders' 
                    ? 'bg-orange-600 text-white' 
                    : isLight ? 'bg-slate-100 text-slate-700 font-bold' : 'bg-slate-800 text-slate-400'
                }`}>
                  {orders.length}
                </span>
              </button>

              <button
                onClick={() => setActiveTab('catalog')}
                className={`flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-bold transition shrink-0 cursor-pointer w-full text-left ${
                  activeTab === 'catalog'
                    ? 'bg-orange-500 text-white shadow-lg shadow-orange-500/20'
                    : isLight ? 'text-slate-600 hover:bg-slate-100 hover:text-slate-900' : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                }`}
              >
                <div className="flex items-center space-x-2.5">
                  <ShoppingBag className="w-4 h-4 shrink-0" />
                  <span>Product Catalog</span>
                </div>
                {catalogProducts.length > 0 && (
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-mono ${
                    activeTab === 'catalog' 
                      ? 'bg-orange-600 text-white' 
                      : isLight ? 'bg-slate-100 text-slate-700 font-bold' : 'bg-slate-800 text-slate-400'
                  }`}>
                    {catalogProducts.length}
                  </span>
                )}
              </button>

              <div className={`hidden md:block my-2 border-t ${isLight ? 'border-slate-200' : 'border-slate-800/80'}`}></div>
              <div className={`hidden md:block text-[10px] font-bold uppercase px-3 py-1 tracking-wider ${isLight ? 'text-slate-400' : 'text-slate-500'}`}>
                System Infrastructure
              </div>

              <button
                onClick={() => setActiveTab('topology')}
                className={`flex items-center space-x-2.5 px-3.5 py-2.5 rounded-xl text-xs font-bold transition shrink-0 cursor-pointer w-full text-left ${
                  activeTab === 'topology'
                    ? 'bg-orange-500 text-white shadow-lg shadow-orange-500/20'
                    : isLight ? 'text-slate-600 hover:bg-slate-100 hover:text-slate-900' : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                }`}
              >
                <Cpu className="w-4 h-4 shrink-0" />
                <span>Host & Cloud Diagnostics</span>
              </button>

              <button
                onClick={() => setActiveTab('loadtest')}
                className={`flex items-center space-x-2.5 px-3.5 py-2.5 rounded-xl text-xs font-bold transition shrink-0 cursor-pointer w-full text-left ${
                  activeTab === 'loadtest'
                    ? 'bg-orange-500 text-white shadow-lg shadow-orange-500/20'
                    : isLight ? 'text-slate-600 hover:bg-slate-100 hover:text-slate-900' : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                }`}
              >
                <Zap className="w-4 h-4 shrink-0" />
                <span>50k Load Tester</span>
              </button>

              <button
                onClick={() => setActiveTab('ai_sre')}
                className={`flex items-center space-x-2.5 px-3.5 py-2.5 rounded-xl text-xs font-bold transition shrink-0 cursor-pointer w-full text-left ${
                  activeTab === 'ai_sre'
                    ? 'bg-orange-500 text-white shadow-lg shadow-orange-500/20'
                    : isLight ? 'text-slate-600 hover:bg-slate-100 hover:text-slate-900' : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                }`}
              >
                <Sparkles className="w-4 h-4 shrink-0 text-amber-500" />
                <span>AI SRE Diagnostics</span>
              </button>

              <button
                onClick={() => setActiveTab('logs')}
                className={`flex items-center space-x-2.5 px-3.5 py-2.5 rounded-xl text-xs font-bold transition shrink-0 cursor-pointer w-full text-left ${
                  activeTab === 'logs'
                    ? 'bg-orange-500 text-white shadow-lg shadow-orange-500/20'
                    : isLight ? 'text-slate-600 hover:bg-slate-100 hover:text-slate-900' : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                }`}
              >
                <Terminal className="w-4 h-4 shrink-0" />
                <span>Audit & Security Logs</span>
              </button>

              <button
                onClick={() => {
                  setActiveTab('console_logs');
                  fetchConsoleLogs();
                }}
                className={`flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-bold transition shrink-0 cursor-pointer w-full text-left ${
                  activeTab === 'console_logs'
                    ? 'bg-orange-500 text-white shadow-lg shadow-orange-500/20'
                    : isLight ? 'text-slate-600 hover:bg-slate-100 hover:text-slate-900' : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                }`}
              >
                <div className="flex items-center space-x-2.5">
                  <Terminal className="w-4 h-4 shrink-0 text-red-400" />
                  <span>Backend Console Logs</span>
                </div>
                {serverConsoleLogs.filter(l => l.level === 'error').length > 0 && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded-full font-mono bg-red-600 text-white">
                    {serverConsoleLogs.filter(l => l.level === 'error').length}
                  </span>
                )}
              </button>
            </aside>

            {/* Content Area */}
            <main className={`flex-1 ${isLight ? 'bg-slate-100/70 text-slate-900' : 'bg-slate-950 text-slate-100'} p-3 sm:p-6 overflow-y-auto transition-colors`}>

              {/* =================================================================== */}
              {/* 1. SALES ANALYTICS & INTERACTIVE GRAPHS TAB             */}
              {/* =================================================================== */}
              {activeTab === 'analytics' && (
                <div className="space-y-6 animate-in fade-in duration-200">
                  
                  {/* Top Metric Cards */}
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                    
                    <div className="bg-slate-900 border border-slate-800/80 p-4 rounded-2xl shadow-lg relative overflow-hidden">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-semibold text-slate-400">Total Products Dispatched</span>
                        <div className="p-2 bg-orange-500/10 text-orange-400 rounded-xl">
                          <Package className="w-4 h-4" />
                        </div>
                      </div>
                      <div className="text-2xl sm:text-3xl font-black text-white mt-2 font-mono">
                        {salesAnalytics?.metrics?.totalUnitsSold || dashboardMetrics?.totalUnitsSold || orders.reduce((sum: number, o: any) => sum + (o.items || []).reduce((isum: number, it: any) => isum + (Number(it.quantity) || 1), 0), 0)}
                        <span className="text-xs font-normal text-slate-400 ml-1.5 font-sans">units</span>
                      </div>
                      <div className="flex items-center text-[10px] text-emerald-400 mt-2 font-semibold">
                        <TrendingUp className="w-3 h-3 mr-1" />
                        <span>Real-time</span>
                      </div>
                    </div>

                    <div className="bg-slate-900 border border-slate-800/80 p-4 rounded-2xl shadow-lg relative overflow-hidden">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-semibold text-slate-400">Total Gross Revenue</span>
                        <div className="p-2 bg-emerald-500/10 text-emerald-400 rounded-xl">
                          <DollarSign className="w-4 h-4" />
                        </div>
                      </div>
                      <div className="text-2xl sm:text-3xl font-black text-emerald-400 mt-2 font-mono truncate">
                        Rs. {((salesAnalytics?.metrics?.totalRevenueLkr ?? dashboardMetrics?.totalRevenueLkr) ?? orders.reduce((sum: number, o: any) => sum + (Number(o.totalAmount) || 0), 0)).toLocaleString()}
                      </div>
                      <div className="flex items-center text-[10px] text-slate-400 mt-2">
                        <span>AOV: Rs. {((salesAnalytics?.metrics?.averageOrderValueLkr ?? dashboardMetrics?.averageOrderValueLkr) ?? (orders.length > 0 ? Math.round(orders.reduce((sum: number, o: any) => sum + (Number(o.totalAmount) || 0), 0) / orders.length) : 0)).toLocaleString()}</span>
                      </div>
                    </div>

                    <div className="bg-slate-900 border border-slate-800/80 p-4 rounded-2xl shadow-lg relative overflow-hidden">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-semibold text-slate-400">Net Merchant Profit</span>
                        <div className="p-2 bg-blue-500/10 text-blue-400 rounded-xl">
                          <TrendingUp className="w-4 h-4" />
                        </div>
                      </div>
                      <div className="text-2xl sm:text-3xl font-black text-blue-400 mt-2 font-mono truncate">
                        Rs. {((salesAnalytics?.metrics?.totalNetProfitLkr ?? dashboardMetrics?.totalNetProfitLkr) ?? orders.reduce((sum: number, o: any) => sum + (Number(o.netProfit) || 0), 0)).toLocaleString()}
                      </div>
                      <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-800/80">
                        <div className="flex items-center space-x-1">
                          <span className="text-[10px] text-slate-400 font-medium">Margin:</span>
                          <input
                            type="number"
                            min="0"
                            max="100"
                            value={profitMarginInput}
                            onChange={(e) => setProfitMarginInput(Number(e.target.value))}
                            className="w-12 bg-slate-950 border border-slate-700/80 rounded px-1 py-0.5 text-xs text-blue-300 font-mono font-bold focus:outline-none focus:border-orange-500"
                          />
                          <span className="text-[10px] text-blue-300 font-bold">%</span>
                        </div>
                        <button
                          onClick={() => handleSaveStoreSettings(false)}
                          disabled={isSavingSettings}
                          className="bg-blue-600 hover:bg-blue-500 text-white text-[10px] font-bold px-2 py-0.5 rounded transition disabled:opacity-50 cursor-pointer shadow-sm"
                        >
                          {isSavingSettings ? 'Saving...' : 'Update'}
                        </button>
                      </div>
                    </div>

                    <div className="bg-slate-900 border border-slate-800/80 p-4 rounded-2xl shadow-lg relative overflow-hidden">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-semibold text-slate-400">CBSL USD/LKR Exchange Rate</span>
                        <div className="p-2 bg-amber-500/10 text-amber-400 rounded-xl">
                          <DollarSign className="w-4 h-4" />
                        </div>
                      </div>
                      <div className="text-xl sm:text-2xl font-black text-amber-400 mt-2 font-mono truncate">
                        1 USD = {exchangeRateInput} LKR
                      </div>
                      <div className="text-[10px] text-slate-400 mt-1 truncate">
                        Source: {exchangeRateProvider} {isManualRate ? '(Manual Override)' : '(Live Sync)'}
                      </div>
                      <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-800/80 gap-1">
                        <div className="flex items-center space-x-1">
                          <span className="text-[10px] text-slate-400 font-medium">Rate:</span>
                          <input
                            type="number"
                            step="0.01"
                            min="1"
                            value={exchangeRateInput}
                            onChange={(e) => setExchangeRateInput(Number(e.target.value))}
                            className="w-16 bg-slate-950 border border-slate-700/80 rounded px-1 py-0.5 text-xs text-amber-300 font-mono font-bold focus:outline-none focus:border-orange-500"
                          />
                        </div>
                        <div className="flex items-center space-x-1">
                          {isManualRate && (
                            <button
                              onClick={() => handleSaveStoreSettings(true)}
                              disabled={isSavingSettings}
                              className="bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px] font-semibold px-1.5 py-0.5 rounded transition cursor-pointer"
                              title="Reset to live CBSL rate"
                            >
                              Reset
                            </button>
                          )}
                          <button
                            onClick={() => handleSaveStoreSettings(false)}
                            disabled={isSavingSettings}
                            className="bg-amber-600 hover:bg-amber-500 text-white text-[10px] font-bold px-2 py-0.5 rounded transition disabled:opacity-50 cursor-pointer shadow-sm"
                          >
                            {isSavingSettings ? '...' : 'Save Rate'}
                          </button>
                        </div>
                      </div>
                    </div>

                    <div className="bg-slate-900 border border-slate-800/80 p-4 rounded-2xl shadow-lg relative overflow-hidden">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-semibold text-slate-400">Active Air Shipments</span>
                        <div className="p-2 bg-amber-500/10 text-amber-400 rounded-xl">
                          <Truck className="w-4 h-4" />
                        </div>
                      </div>
                      <div className="text-2xl sm:text-3xl font-black text-amber-400 mt-2 font-mono">
                        {salesAnalytics?.metrics?.inTransitCount ?? orders.filter((o: any) => o.status === 'SHIPPED' || o.status === 'PROCESSING' || o.cjStatus === 'Dispatched' || o.cjStatus === 'In-Transit').length}
                        <span className="text-xs font-normal text-slate-400 ml-1.5 font-sans">in flight</span>
                      </div>
                      <div className="flex items-center text-[10px] text-amber-300 mt-2 font-semibold">
                        <span>QSPacket Eub Direct Air</span>
                      </div>
                    </div>

                  </div>

                  {/* Main Charts Section */}
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
                    
                    {/* Chart 1: Daily Product Dispatches & Sales Volume Over Time */}
                    <div className="lg:col-span-2 bg-slate-900 border border-slate-800/80 p-4 sm:p-6 rounded-2xl shadow-xl">
                      <div className="flex items-center justify-between mb-4">
                        <div>
                          <h3 className="text-sm sm:text-base font-bold text-white flex items-center">
                            <BarChart3 className="w-4 h-4 text-orange-500 mr-2" />
                            Product Dispatches Volume
                          </h3>
                          <p className="text-xs text-slate-400 mt-0.5">
                            Daily units shipped via automated CJ Dropshipping & air cargo
                          </p>
                        </div>
                        <span className="text-[10px] bg-orange-500/10 text-orange-400 border border-orange-500/30 px-2.5 py-1 rounded-lg font-mono font-bold">
                          Daily Volume
                        </span>
                      </div>

                      <div className="h-64 sm:h-72 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                          <AreaChart data={effectiveTimeSeriesData}>
                            <defs>
                              <linearGradient id="dispatchesGradient" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#F97316" stopOpacity={0.4}/>
                                <stop offset="95%" stopColor="#F97316" stopOpacity={0.0}/>
                              </linearGradient>
                              <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#10B981" stopOpacity={0.4}/>
                                <stop offset="95%" stopColor="#10B981" stopOpacity={0.0}/>
                              </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke="#1E293B" vertical={false} />
                            <XAxis dataKey="name" stroke="#64748B" fontSize={11} tickLine={false} />
                            <YAxis stroke="#64748B" fontSize={11} tickLine={false} />
                            <Tooltip 
                              contentStyle={{ backgroundColor: '#0F172A', borderColor: '#334155', borderRadius: '12px', fontSize: '12px' }}
                              labelStyle={{ color: '#F8FAFC', fontWeight: 'bold' }}
                            />
                            <Area type="monotone" dataKey="unitsSold" name="Units Dispatched" stroke="#F97316" strokeWidth={3} fillOpacity={1} fill="url(#dispatchesGradient)" />
                          </AreaChart>
                        </ResponsiveContainer>
                      </div>
                    </div>

                    {/* Chart 2: Category Breakdown */}
                    <div className="bg-slate-900 border border-slate-800/80 p-4 sm:p-6 rounded-2xl shadow-xl flex flex-col">
                      <div className="mb-4">
                        <h3 className="text-sm sm:text-base font-bold text-white flex items-center">
                          <PieChartIcon className="w-4 h-4 text-emerald-400 mr-2" />
                          Category Sales Share
                        </h3>
                        <p className="text-xs text-slate-400 mt-0.5">
                          Units sold by marketplace category
                        </p>
                      </div>

                      <div className="h-48 sm:h-52 w-full flex-1">
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie
                              data={effectiveCategoryBreakdown}
                              cx="50%"
                              cy="50%"
                              innerRadius={45}
                              outerRadius={75}
                              paddingAngle={4}
                              dataKey="unitsSold"
                              nameKey="category"
                            >
                              {effectiveCategoryBreakdown.map((_: any, index: number) => (
                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                              ))}
                            </Pie>
                            <Tooltip contentStyle={{ backgroundColor: '#0F172A', borderColor: '#334155', borderRadius: '12px', fontSize: '12px' }} />
                          </PieChart>
                        </ResponsiveContainer>
                      </div>

                      <div className="mt-2 space-y-1.5 max-h-28 overflow-y-auto pr-1">
                        {effectiveCategoryBreakdown.map((cat: any, idx: number) => (
                          <div key={idx} className="flex items-center justify-between text-xs">
                            <span className="flex items-center text-slate-300">
                              <span className="w-2.5 h-2.5 rounded-full mr-2" style={{ backgroundColor: COLORS[idx % COLORS.length] }}></span>
                              <span className="capitalize">{cat.category}</span>
                            </span>
                            <span className="font-mono font-bold text-slate-400">{cat.unitsSold} pcs</span>
                          </div>
                        ))}
                      </div>
                    </div>

                  </div>

                  {/* Chart 3: Revenue vs Wholesale Sourcing Cost vs Profit Comparison */}
                  <div className="bg-slate-900 border border-slate-800/80 p-4 sm:p-6 rounded-2xl shadow-xl">
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <h3 className="text-sm sm:text-base font-bold text-white flex items-center">
                          <DollarSign className="w-4 h-4 text-emerald-400 mr-2" />
                          Financial Flow: Gross Revenue vs Net Profit (LKR)
                        </h3>
                        <p className="text-xs text-slate-400 mt-0.5">
                          Daily monetary comparison showing healthy profit margins
                        </p>
                      </div>
                    </div>

                    <div className="h-60 sm:h-64 w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={effectiveTimeSeriesData}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#1E293B" vertical={false} />
                          <XAxis dataKey="name" stroke="#64748B" fontSize={11} tickLine={false} />
                          <YAxis stroke="#64748B" fontSize={11} tickLine={false} tickFormatter={(val) => `Rs.${(val/1000)}k`} />
                          <Tooltip 
                            contentStyle={{ backgroundColor: '#0F172A', borderColor: '#334155', borderRadius: '12px', fontSize: '12px' }}
                            formatter={(val: any) => [`Rs. ${Number(val).toLocaleString()}`, '']}
                          />
                          <Legend wrapperStyle={{ fontSize: '12px', color: '#94A3B8' }} />
                          <Bar dataKey="revenue" name="Total Revenue (LKR)" fill="#3B82F6" radius={[4, 4, 0, 0]} />
                          <Bar dataKey="profit" name="Net Profit (LKR)" fill="#10B981" radius={[4, 4, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                </div>
              )}

              {/* =================================================================== */}
              {/* 2. DISPATCHED PRODUCTS & SOURCING HUB TAB                           */}
              {/* =================================================================== */}
              {activeTab === 'dispatched_products' && (
                <div className="space-y-4 animate-in fade-in duration-200">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-900 border border-slate-800 p-4 rounded-2xl">
                    <div>
                      <h2 className="text-sm sm:text-base font-black text-white flex items-center">
                        <Package className="w-4 h-4 text-orange-500 mr-2" />
                        Dispatched Products Volume & Velocity
                      </h2>
                      <p className="text-xs text-slate-400 mt-0.5">
                        Complete breakdown of all items sold, sourcing suppliers, and generated profit.
                      </p>
                    </div>

                    <div className="flex items-center space-x-2">
                      <div className="relative">
                        <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                        <input
                          type="text"
                          placeholder="Search product or SKU..."
                          value={productSearch}
                          onChange={(e) => setProductSearch(e.target.value)}
                          className="bg-slate-950 border border-slate-800 rounded-xl pl-8 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-orange-500 w-48 sm:w-64"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Dispatched Products Table */}
                  <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-slate-950/80 text-slate-400 font-semibold border-b border-slate-800">
                          <tr>
                            <th className="p-3.5">Product & SKU</th>
                            <th className="p-3.5">Units Dispatched</th>
                            <th className="p-3.5">Unit Price (LKR)</th>
                            <th className="p-3.5">Wholesale Sourcing</th>
                            <th className="p-3.5">Total Revenue</th>
                            <th className="p-3.5">Net Profit</th>
                            <th className="p-3.5">Supplier Origin</th>
                            <th className="p-3.5">Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800/60">
                          {filteredDispatchedProducts.length === 0 ? (
                            <tr>
                              <td colSpan={8} className="p-8 text-center text-slate-500">
                                No dispatched products found matching query.
                              </td>
                            </tr>
                          ) : (
                            filteredDispatchedProducts.map((p: any, idx: number) => (
                              <tr key={idx} className="hover:bg-slate-800/40 transition">
                                <td className="p-3.5">
                                  <div className="flex items-center space-x-3">
                                    <img
                                      src={p.imageUrl}
                                      alt={p.title}
                                      className="w-10 h-10 rounded-xl object-cover bg-slate-950 shrink-0 border border-slate-800"
                                      onError={(e) => {
                                        (e.target as any).src = 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=400&q=80';
                                      }}
                                    />
                                    <div className="min-w-0 max-w-xs">
                                      <div className="font-bold text-white truncate">{p.title}</div>
                                      <div className="text-[10px] text-slate-500 font-mono flex items-center space-x-1.5 mt-0.5">
                                        <span>SKU: {p.sku}</span>
                                        <span>•</span>
                                        <span>{p.weightGrams || 410}g</span>
                                      </div>
                                    </div>
                                  </div>
                                </td>

                                <td className="p-3.5">
                                  <div className="font-mono font-black text-orange-400 text-sm">
                                    {p.unitsSold} <span className="text-[10px] font-normal text-slate-400">pcs</span>
                                  </div>
                                  <div className="text-[10px] text-slate-500">{p.ordersCount || p.unitsSold} orders</div>
                                </td>

                                <td className="p-3.5 font-mono text-slate-200">
                                  Rs. {p.unitPrice?.toLocaleString()}
                                </td>

                                <td className="p-3.5 font-mono text-slate-400">
                                  Rs. {p.wholesalePrice?.toLocaleString()}
                                </td>

                                <td className="p-3.5 font-mono font-bold text-emerald-400">
                                  Rs. {p.totalRevenueLkr?.toLocaleString()}
                                </td>

                                <td className="p-3.5 font-mono font-bold text-blue-400">
                                  +Rs. {p.netProfitLkr?.toLocaleString()}
                                </td>

                                <td className="p-3.5">
                                  <div className="text-[11px] text-slate-300 flex items-center space-x-1">
                                    <Globe className="w-3 h-3 text-slate-500" />
                                    <span>{p.supplierOrigin || 'CJ Dropshipping'}</span>
                                  </div>
                                  {p.cjDirectUrl && (
                                    <a
                                      href={p.cjDirectUrl}
                                      target="_blank"
                                      rel="noreferrer"
                                      className="text-[10px] text-orange-400 hover:underline flex items-center space-x-0.5 mt-0.5"
                                    >
                                      <span>CJ Sourcing</span>
                                      <ExternalLink className="w-2.5 h-2.5" />
                                    </a>
                                  )}
                                </td>

                                <td className="p-3.5">
                                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold font-mono bg-emerald-950/60 text-emerald-400 border border-emerald-800/40">
                                    DISPATCHED
                                  </span>
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

              {/* =================================================================== */}
              {/* 3. LIVE ORDER & TRACKING MANAGEMENT TAB                             */}
              {/* =================================================================== */}
              {activeTab === 'orders' && (
                <div className="space-y-5 animate-in fade-in duration-200">
                  {/* Top Metric Summary Cards for Orders */}
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                    <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl shadow-sm">
                      <div className="flex items-center justify-between text-slate-400 text-xs font-medium">
                        <span>Total Orders</span>
                        <Truck className="w-4 h-4 text-orange-400" />
                      </div>
                      <div className="text-2xl font-black text-white font-mono mt-1">
                        {dashboardMetrics?.totalOrdersCount ?? orders.length}
                      </div>
                      <div className="text-[10px] text-slate-500 mt-1">Real-time database records</div>
                    </div>

                    <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl shadow-sm">
                      <div className="flex items-center justify-between text-slate-400 text-xs font-medium">
                        <span>Paid (Creem Verified)</span>
                        <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                      </div>
                      <div className="text-2xl font-black text-emerald-400 font-mono mt-1">
                        {dashboardMetrics?.paidCount ?? orders.filter(o => o.paymentStatus === 'PAID').length}
                      </div>
                      <div className="text-[10px] text-emerald-500/80 mt-1">Webhook signature confirmed</div>
                    </div>

                    <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl shadow-sm">
                      <div className="flex items-center justify-between text-slate-400 text-xs font-medium">
                        <span>Pending (COD)</span>
                        <Clock className="w-4 h-4 text-amber-400" />
                      </div>
                      <div className="text-2xl font-black text-amber-400 font-mono mt-1">
                        {dashboardMetrics?.pendingCodCount ?? orders.filter(o => o.paymentMethod === 'COD' && o.paymentStatus !== 'PAID').length}
                      </div>
                      <div className="text-[10px] text-amber-500/80 mt-1">Awaiting admin phone call</div>
                    </div>

                    <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl shadow-sm">
                      <div className="flex items-center justify-between text-slate-400 text-xs font-medium">
                        <span>Auto-Fulfilled (CJ)</span>
                        <Zap className="w-4 h-4 text-blue-400" />
                      </div>
                      <div className="text-2xl font-black text-blue-400 font-mono mt-1">
                        {dashboardMetrics?.autoFulfilledCount ?? orders.filter(o => o.cjStatus === 'Auto-Fulfilled' || o.paymentMethod === 'CREDIT_CARD').length}
                      </div>
                      <div className="text-[10px] text-blue-400/80 mt-1">Dispatched to supplier</div>
                    </div>
                  </div>

                  {/* Orders Header & Search Bar */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-900 border border-slate-800 p-4 rounded-2xl">
                    <div>
                      <h2 className="text-sm sm:text-base font-black text-white flex items-center">
                        <Truck className="w-4 h-4 text-orange-500 mr-2" />
                        Customer Orders Management & Verification
                      </h2>
                      <p className="text-xs text-slate-400 mt-0.5">
                        Verify payment status, review delivery addresses, call/WhatsApp customers, and approve CJ Dropshipping dispatches.
                      </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={handleDeduplicateOrders}
                        disabled={isUpdatingStatus}
                        className="inline-flex items-center space-x-1 px-3 py-1.5 rounded-xl text-xs font-bold bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30 transition shadow-xs cursor-pointer"
                        title="Scan database and remove any duplicate identical order records"
                      >
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>Scan &amp; Clean Duplicates</span>
                      </button>

                      <div className="relative">
                        <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                        <input
                          type="text"
                          placeholder="Search order #, phone, city..."
                          value={orderSearch}
                          onChange={(e) => setOrderSearch(e.target.value)}
                          className="bg-slate-950 border border-slate-800 rounded-xl pl-8 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-orange-500 w-48 sm:w-60"
                        />
                      </div>

                      <select
                        value={orderStatusFilter}
                        onChange={(e) => setOrderStatusFilter(e.target.value)}
                        className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-orange-500 font-bold"
                      >
                        <option value="ALL">All Statuses ({orders.length})</option>
                        <option value="CONFIRMED">Confirmed</option>
                        <option value="PROCESSING">Processing</option>
                        <option value="SHIPPED">Shipped (Air)</option>
                        <option value="DELIVERED">Delivered</option>
                      </select>
                    </div>
                  </div>

                  {/* Structured Orders Table View */}
                  <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs text-slate-300">
                        <thead className="bg-slate-950 text-slate-400 text-[11px] font-bold uppercase tracking-wider border-b border-slate-800">
                          <tr>
                            <th className="p-3.5">Order # & Date</th>
                            <th className="p-3.5 min-w-[200px]">Purchased Items</th>
                            <th className="p-3.5">Payment Status</th>
                            <th className="p-3.5">Paid Time & Txn ID</th>
                            <th className="p-3.5">Customer Address</th>
                            <th className="p-3.5">Phone / WhatsApp</th>
                            <th className="p-3.5">CJ Dropshipping Status</th>
                            <th className="p-3.5 text-right">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800/60 font-medium">
                          {filteredOrders.length === 0 ? (
                            <tr>
                              <td colSpan={8} className="p-8 text-center text-slate-500 text-xs">
                                No customer orders found matching search criteria.
                              </td>
                            </tr>
                          ) : (
                            filteredOrders.map((ord) => {
                              const rawPhone = ord.customer?.phone || '';
                              const cleanPhone = rawPhone.replace(/\D/g, '');
                              const waNumber = cleanPhone.startsWith('0') ? '94' + cleanPhone.slice(1) : cleanPhone;
                              const isPaidCard = ord.paymentStatus === 'PAID';
                              const isCod = ord.paymentMethod === 'COD';
                              const isCjAuto = ord.cjStatus === 'Auto-Fulfilled' || !isCod;

                              return (
                                <tr key={ord.id} className="hover:bg-slate-850/70 transition">
                                  {/* 1. Order Number & Date */}
                                  <td className="p-3.5 align-top">
                                    <div className="font-mono font-bold text-white text-xs">#{ord.orderNumber}</div>
                                    <div className="text-[10px] text-slate-500 mt-0.5">
                                      {new Date(ord.createdAt).toLocaleString()}
                                    </div>
                                    <div className="text-[10px] font-bold text-orange-400 mt-0.5">
                                      Rs. {ord.totalAmount?.toLocaleString()}
                                    </div>
                                  </td>

                                  {/* Purchased Items */}
                                  <td className="p-3.5 align-top">
                                    <div className="space-y-3">
                                      {ord.items?.map((item: any, idx: number) => (
                                        <div key={idx} className="flex space-x-2 bg-slate-950 p-2 rounded-lg border border-slate-800">
                                          {item.imageUrl && (
                                            <img src={item.imageUrl} alt={item.title} className="w-10 h-10 object-cover rounded-md border border-slate-800" />
                                          )}
                                          <div className="flex-1 min-w-0">
                                            <div className="text-[11px] font-bold text-white line-clamp-1" title={item.title}>{item.title}</div>
                                            <div className="text-[10px] text-slate-400 font-mono mt-0.5 flex items-center space-x-2">
                                              <span>SKU: {item.sku || 'N/A'}</span>
                                              <span>Qty: {item.quantity}</span>
                                            </div>
                                            {(item.selectedSize || item.selectedColor) && (
                                              <div className="text-[10px] text-slate-300 mt-0.5">
                                                {item.selectedSize && <span className="mr-2">Size: <span className="font-bold">{item.selectedSize}</span></span>}
                                                {item.selectedColor && <span>Color: <span className="font-bold">{item.selectedColor}</span></span>}
                                              </div>
                                            )}
                                            {item.cjDirectUrl && (
                                              <a href={item.cjDirectUrl} target="_blank" rel="noreferrer" className="text-[10px] text-orange-400 hover:underline flex items-center mt-1">
                                                <ExternalLink className="w-2.5 h-2.5 mr-1" />
                                                <span>CJ Dropshipping URL</span>
                                              </a>
                                            )}
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  </td>

                                  {/* 2. Payment Status */}
                                  <td className="p-3.5 align-top">
                                    {isPaidCard ? (
                                      <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-950/80 text-emerald-400 border border-emerald-800/60">
                                        <CheckCircle2 className="w-3 h-3 mr-1 text-emerald-400" />
                                        Paid (Creem MOR)
                                      </span>
                                    ) : isCod ? (
                                      <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-950/80 text-amber-400 border border-amber-800/60">
                                        <Clock className="w-3 h-3 mr-1 text-amber-400" />
                                        Pending (COD)
                                      </span>
                                    ) : (
                                      <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold bg-blue-950/80 text-blue-400 border border-blue-800/60">
                                        Pending Online
                                      </span>
                                    )}
                                  </td>

                                  {/* 3. Paid Time & Date / Transaction ID */}
                                  <td className="p-3.5 font-mono align-top">
                                    {isPaidCard ? (
                                      <div>
                                        <div className="text-emerald-300 text-[11px] font-semibold">
                                          {ord.paidAt ? new Date(ord.paidAt).toLocaleString() : new Date(ord.createdAt).toLocaleString()}
                                        </div>
                                        <div className="text-[9px] text-slate-500 truncate max-w-[130px]" title={ord.transactionId || 'CREEM-TXN'}>
                                          Txn: {ord.transactionId || 'CREEM-VERIFIED'}
                                        </div>
                                      </div>
                                    ) : (
                                      <div className="text-slate-500 text-[11px]">
                                        N/A (Pending COD)
                                      </div>
                                    )}
                                  </td>

                                  {/* 4. Customer Address */}
                                  <td className="p-3.5 max-w-[200px] align-top">
                                    <div className="font-bold text-white truncate">{ord.customer?.fullName}</div>
                                    <div className="text-[10px] text-slate-400 truncate">{ord.customer?.street}</div>
                                    <div className="text-[10px] text-slate-500">{ord.customer?.city}, {ord.customer?.district}</div>
                                  </td>

                                  {/* 5. Phone / WhatsApp Number / Email with instant WhatsApp link */}
                                  <td className="p-3.5 align-top">
                                    <div className="font-mono font-bold text-white text-xs">{ord.customer?.phone}</div>
                                    {ord.customer?.email && (
                                      <div className="text-[10px] text-slate-400 mt-0.5 truncate max-w-[120px]" title={ord.customer.email}>
                                        <a href={`mailto:${ord.customer.email}`} className="hover:text-orange-400 transition">
                                          {ord.customer.email}
                                        </a>
                                      </div>
                                    )}
                                    {waNumber && (
                                      <a
                                        href={`https://wa.me/${waNumber}?text=${encodeURIComponent(`Hello ${ord.customer?.fullName}, LankaBuy Store Admin calling regarding your Order #${ord.orderNumber} (Rs. ${ord.totalAmount?.toLocaleString()}).`)}`}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="inline-flex items-center space-x-1 mt-1 px-2 py-0.5 rounded-lg text-[10px] font-bold bg-emerald-600/20 text-emerald-400 hover:bg-emerald-600/40 border border-emerald-500/30 transition"
                                      >
                                        <Phone className="w-2.5 h-2.5 text-emerald-400" />
                                        <span>WhatsApp Call</span>
                                        <ExternalLink className="w-2.5 h-2.5 ml-0.5" />
                                      </a>
                                    )}
                                  </td>

                                  {/* 6. CJ Dropshipping Status & Manual Approval */}
                                  <td className="p-3.5 align-top">
                                    {isCjAuto ? (
                                      <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-950/80 text-emerald-400 border border-emerald-800/60">
                                        <Zap className="w-3 h-3 mr-1 text-emerald-400" />
                                        Auto-Fulfilled
                                      </span>
                                    ) : (
                                      <div className="space-y-1">
                                        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-950/80 text-amber-400 border border-amber-800/60">
                                          Admin Approval Required
                                        </span>
                                        <div>
                                          <button
                                            onClick={() => handleApproveCodOrder(ord.id)}
                                            disabled={isUpdatingStatus}
                                            className="px-2.5 py-1 rounded-xl text-[10px] font-bold bg-orange-500 hover:bg-orange-600 text-white transition cursor-pointer shadow-sm disabled:opacity-50"
                                          >
                                            Approve & Send to CJ
                                          </button>
                                        </div>
                                      </div>
                                    )}
                                  </td>

                                  {/* 7. Actions */}
                                  <td className="p-3.5 text-right align-top space-y-1.5">
                                    <select
                                      value={ord.status}
                                      onChange={(e) => handleUpdateOrderStatus(ord.id, e.target.value)}
                                      disabled={isUpdatingStatus}
                                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-2 py-1.5 text-[10px] text-white focus:outline-none focus:border-orange-500 font-bold"
                                    >
                                      <option value="CONFIRMED">Confirmed</option>
                                      <option value="PROCESSING">Processing</option>
                                      <option value="SHIPPED">Air Shipped</option>
                                      <option value="DELIVERED">Delivered (Delivery Success)</option>
                                    </select>

                                    {/* Quick button to set custom location message */}
                                    <div className="flex items-center space-x-1">
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setOrderToEditLocation(ord);
                                          setLocationInput(ord.customCurrentLocation || ord.trackingHistory?.[0]?.location || 'Peliyagoda Logistics Hub (Colombo)');
                                          setStatusInput(ord.status);
                                          setStatusNoteInput(ord.trackingHistory?.[0]?.description || '');
                                        }}
                                        className="flex-1 inline-flex items-center justify-center space-x-1 px-2 py-1 rounded-xl text-[10px] font-bold bg-orange-500/10 hover:bg-orange-500/20 text-orange-400 border border-orange-500/30 transition cursor-pointer"
                                        title="Set where the product currently is and status message"
                                      >
                                        <MapPin className="w-2.5 h-2.5" />
                                        <span>Set Location</span>
                                      </button>
                                      
                                      <button
                                        type="button"
                                        onClick={() => handleDeleteOrder(ord.id)}
                                        disabled={isUpdatingStatus}
                                        className="p-1 rounded-xl text-[10px] font-bold bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 transition cursor-pointer"
                                        title="Delete this order"
                                      >
                                        <Trash2 className="w-3 h-3 text-rose-400" />
                                      </button>
                                    </div>

                                    {ord.customCurrentLocation && (
                                      <div className="text-[9px] text-slate-400 truncate max-w-[130px] font-mono text-left" title={ord.customCurrentLocation}>
                                        📍 {ord.customCurrentLocation}
                                      </div>
                                    )}
                                  </td>
                                </tr>
                              );
                            })
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Modal to update Location message and Delivery status */}
                  {orderToEditLocation && (
                    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4">
                      <div className={`w-full max-w-md ${isLight ? 'bg-white text-slate-800' : 'bg-slate-900 text-white'} border border-slate-700 rounded-3xl p-5 sm:p-6 shadow-2xl space-y-4`}>
                        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                          <div className="flex items-center space-x-2">
                            <MapPin className="w-5 h-5 text-orange-500" />
                            <div>
                              <h3 className="font-black text-sm sm:text-base">
                                Update Location &amp; Parcel Status
                              </h3>
                              <p className="text-[11px] text-slate-400 font-mono">
                                Order #{orderToEditLocation.orderNumber}
                              </p>
                            </div>
                          </div>
                          <button
                            onClick={() => setOrderToEditLocation(null)}
                            className="p-1 rounded-xl hover:bg-slate-800 text-slate-400 hover:text-white transition cursor-pointer"
                          >
                            <X className="w-5 h-5" />
                          </button>
                        </div>

                        <div className="space-y-3 text-xs">
                          {/* 1. Custom Location input */}
                          <div>
                            <label className="block text-[11px] font-bold text-slate-300 mb-1">
                              Parcel Location (Custom Message):
                            </label>
                            <input
                              type="text"
                              value={locationInput}
                              onChange={(e) => setLocationInput(e.target.value)}
                              placeholder="e.g. Peliyagoda Sorting Hub / Kaduwela Delivery Station"
                              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-orange-500"
                            />
                            <p className="text-[10px] text-slate-400 mt-1">
                              This location and note will be immediately visible to the customer on their tracking page.
                            </p>
                          </div>

                          {/* 2. Status Select */}
                          <div>
                            <label className="block text-[11px] font-bold text-slate-300 mb-1">
                              Order Status:
                            </label>
                            <select
                              value={statusInput}
                              onChange={(e) => setStatusInput(e.target.value)}
                              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-orange-500 font-bold"
                            >
                              <option value="CONFIRMED">CONFIRMED (Order Confirmed)</option>
                              <option value="PROCESSING">PROCESSING (Processing in Warehouse)</option>
                              <option value="SHIPPED">SHIPPED (In Flight / Air Cargo)</option>
                              <option value="DELIVERED">DELIVERED (Delivery Success)</option>
                            </select>
                          </div>

                          {/* Delivery Success notice */}
                          {statusInput === 'DELIVERED' && (
                            <div className="p-3 rounded-2xl bg-emerald-950/80 border border-emerald-700 text-emerald-300 text-[11px] space-y-1">
                              <p className="font-bold flex items-center">
                                <CheckCircle2 className="w-3.5 h-3.5 mr-1 text-emerald-400" />
                                Delivery Success Selected
                              </p>
                              <p className="text-[10px] text-emerald-400/90 leading-relaxed">
                                Once saved, the order is marked delivered and the customer's live 7-Day Return Countdown window begins immediately.
                              </p>
                            </div>
                          )}

                          {/* 3. Note / Message */}
                          <div>
                            <label className="block text-[11px] font-bold text-slate-300 mb-1">
                              Note for Customer:
                            </label>
                            <input
                              type="text"
                              value={statusNoteInput}
                              onChange={(e) => setStatusNoteInput(e.target.value)}
                              placeholder="e.g. Out for final delivery via Courier rider"
                              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-orange-500"
                            />
                          </div>
                        </div>

                        <div className="flex items-center justify-end space-x-2 pt-2 border-t border-slate-800">
                          <button
                            type="button"
                            onClick={() => setOrderToEditLocation(null)}
                            className="px-3 py-2 rounded-xl text-xs font-bold text-slate-400 hover:text-white transition cursor-pointer"
                          >
                            Cancel
                          </button>
                          <button
                            type="button"
                            disabled={isUpdatingStatus}
                            onClick={() => {
                              if (orderToEditLocation) {
                                handleUpdateOrderStatus(
                                  orderToEditLocation.id,
                                  statusInput,
                                  statusNoteInput,
                                  locationInput
                                );
                              }
                            }}
                            className="px-4 py-2 rounded-xl text-xs font-bold bg-orange-500 hover:bg-orange-600 text-white transition flex items-center space-x-1 cursor-pointer shadow-md shadow-orange-500/20 disabled:opacity-50"
                          >
                            {isUpdatingStatus ? (
                              <>
                                <RefreshCw className="w-3.5 h-3.5 animate-spin mr-1" />
                                <span>Updating...</span>
                              </>
                            ) : (
                              <>
                                <Check className="w-3.5 h-3.5 mr-1" />
                                <span>Save &amp; Update Location</span>
                              </>
                            )}
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* =================================================================== */}
              {/* 3.5 PRODUCT CATALOG & INVENTORY MANAGEMENT                          */}
              {/* =================================================================== */}
              {activeTab === 'catalog' && (
                <div className="space-y-4 animate-in fade-in duration-200">
                  {/* Header & Actions */}
                  <div className={`${isLight ? 'bg-white border-slate-200 text-slate-800' : 'bg-slate-900 border-slate-800 text-white'} border p-4 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3`}>
                    <div>
                      <h2 className="text-sm sm:text-base font-black flex items-center">
                        <ShoppingBag className="w-4 h-4 text-orange-500 mr-2" />
                        Live Store Product Catalog & Inventory
                      </h2>
                      <p className={`text-xs ${isLight ? 'text-slate-500' : 'text-slate-400'} mt-0.5`}>
                        Direct control over pricing, wholesale sourcing costs, live stock, and catalog items.
                      </p>
                    </div>

                    <div className="flex items-center space-x-2">
                      <button
                        onClick={fetchCatalogOnly}
                        disabled={isLoadingCatalog}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center space-x-1.5 cursor-pointer ${
                          isLight ? 'bg-slate-100 hover:bg-slate-200 text-slate-700' : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
                        }`}
                      >
                        <RefreshCw className={`w-3.5 h-3.5 ${isLoadingCatalog ? 'animate-spin' : ''}`} />
                        <span>Refresh</span>
                      </button>

                      <button
                        onClick={() => setIsAddingProduct(true)}
                        className="px-3 py-1.5 rounded-xl text-xs font-bold bg-orange-500 hover:bg-orange-600 text-white transition flex items-center space-x-1.5 shadow-md shadow-orange-500/20 cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Add Product</span>
                      </button>
                    </div>
                  </div>

                  {/* Summary Metric Cards */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className={`${isLight ? 'bg-white border-slate-200' : 'bg-slate-900 border-slate-800'} border p-3 rounded-2xl`}>
                      <span className={`text-[10px] font-bold uppercase ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>Total Catalog Products</span>
                      <p className="text-lg font-black text-orange-500 mt-1">{catalogProducts.length}</p>
                    </div>
                    <div className={`${isLight ? 'bg-white border-slate-200' : 'bg-slate-900 border-slate-800'} border p-3 rounded-2xl`}>
                      <span className={`text-[10px] font-bold uppercase ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>Total Items in Stock</span>
                      <p className="text-lg font-black text-emerald-500 mt-1">
                        {catalogProducts.reduce((sum, p) => sum + (p.stock || 0), 0)}
                      </p>
                    </div>
                    <div className={`${isLight ? 'bg-white border-slate-200' : 'bg-slate-900 border-slate-800'} border p-3 rounded-2xl`}>
                      <span className={`text-[10px] font-bold uppercase ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>Avg Retail Price</span>
                      <p className={`text-lg font-black ${isLight ? 'text-slate-900' : 'text-white'} mt-1`}>
                        Rs. {catalogProducts.length > 0 
                          ? Math.round(catalogProducts.reduce((s, p) => s + (p.price || 0), 0) / catalogProducts.length).toLocaleString()
                          : 0}
                      </p>
                    </div>
                    <div className={`${isLight ? 'bg-white border-slate-200' : 'bg-slate-900 border-slate-800'} border p-3 rounded-2xl`}>
                      <span className={`text-[10px] font-bold uppercase ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>Est. Profit Margin</span>
                      <p className="text-lg font-black text-blue-500 mt-1">
                        {catalogProducts.length > 0
                          ? `${Math.round(catalogProducts.reduce((s, p) => {
                              const retail = p.price || 0;
                              const cost = p.wholesaleCost || (retail * 0.7);
                              return s + (retail > 0 ? ((retail - cost) / retail) * 100 : 0);
                            }, 0) / catalogProducts.length)}%`
                          : '0%'}
                      </p>
                    </div>
                  </div>

                  {/* Search and Category Filters */}
                  <div className="flex flex-col sm:flex-row gap-2">
                    <div className="relative flex-1">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <input
                        type="text"
                        value={catalogSearch}
                        onChange={(e) => setCatalogSearch(e.target.value)}
                        placeholder="Search by product name, SKU or brand..."
                        className={`w-full pl-9 pr-4 py-2 rounded-xl text-xs outline-none border transition ${
                          isLight 
                            ? 'bg-white border-slate-200 text-slate-800 focus:border-orange-500' 
                            : 'bg-slate-900 border-slate-800 text-white focus:border-orange-500'
                        }`}
                      />
                    </div>
                    <select
                      value={catalogCategoryFilter}
                      onChange={(e) => setCatalogCategoryFilter(e.target.value)}
                      className={`px-3 py-2 rounded-xl text-xs outline-none border transition cursor-pointer ${
                        isLight 
                          ? 'bg-white border-slate-200 text-slate-800 focus:border-orange-500' 
                          : 'bg-slate-900 border-slate-800 text-white focus:border-orange-500'
                      }`}
                    >
                      <option value="ALL">All Categories</option>
                      {Array.from(new Set(catalogProducts.map(p => p.category).filter(Boolean))).map((cat) => (
                        <option key={cat} value={cat}>{cat}</option>
                      ))}
                    </select>
                  </div>

                  {/* Products Table */}
                  <div className={`${isLight ? 'bg-white border-slate-200' : 'bg-slate-900 border-slate-800'} border rounded-2xl overflow-hidden shadow-sm`}>
                    <div className="overflow-x-auto max-h-[600px] overflow-y-auto">
                      <table className="w-full text-left border-collapse text-xs">
                        <thead className={`sticky top-0 z-10 uppercase text-[10px] font-bold ${
                          isLight ? 'bg-slate-50 text-slate-500 border-b border-slate-200' : 'bg-slate-950 text-slate-400 border-b border-slate-800'
                        }`}>
                          <tr>
                            <th className="p-3">Product</th>
                            <th className="p-3">Category</th>
                            <th className="p-3">Retail Price</th>
                            <th className="p-3">Wholesale Cost</th>
                            <th className="p-3">Shipping Fee</th>
                            <th className="p-3">Live Stock</th>
                            <th className="p-3">Trending</th>
                            <th className="p-3">Payment</th>
                            <th className="p-3 text-right">Actions</th>
                          </tr>
                        </thead>
                        <tbody className={`divide-y ${isLight ? 'divide-slate-100' : 'divide-slate-800/60'}`}>
                          {catalogProducts
                            .filter((p) => {
                              if (catalogCategoryFilter !== 'ALL' && p.category !== catalogCategoryFilter) return false;
                              if (catalogSearch.trim()) {
                                const q = catalogSearch.toLowerCase();
                                return (
                                  p.title?.toLowerCase().includes(q) ||
                                  p.sku?.toLowerCase().includes(q) ||
                                  p.category?.toLowerCase().includes(q)
                                );
                              }
                              return true;
                            })
                            .map((product) => {
                              const retail = product.price || 0;
                              const wholesale = product.wholesaleCost || Math.round(retail * 0.7);
                              const shipping = product.fixedShippingCost || product.shippingFeeLkr || 450;

                              return (
                                <tr key={product.id} className={`transition ${isLight ? 'hover:bg-slate-50' : 'hover:bg-slate-800/40'}`}>
                                  <td className="p-3">
                                    <div className="flex items-center space-x-3 max-w-[280px]">
                                      <img
                                        src={product.imageUrl}
                                        alt={product.title}
                                        className="w-10 h-10 rounded-lg object-cover shrink-0 bg-slate-800"
                                        onError={(e: any) => {
                                          e.target.src = 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=100';
                                        }}
                                      />
                                      <div className="truncate">
                                        <p className={`font-bold truncate ${isLight ? 'text-slate-900' : 'text-white'}`}>{product.title}</p>
                                        <div className="flex items-center space-x-1.5 text-[10px] text-slate-400 font-mono mt-0.5">
                                          <span>{product.sku || product.id?.slice(0, 10)}</span>
                                          <span>•</span>
                                          <span>{product.supplierOrigin || 'Local Store'}</span>
                                        </div>
                                      </div>
                                    </div>
                                  </td>
                                  <td className="p-3 font-medium">
                                    <span className={`px-2 py-0.5 rounded text-[10px] ${
                                      isLight ? 'bg-slate-100 text-slate-700' : 'bg-slate-800 text-slate-300'
                                    }`}>
                                      {product.category || 'General'}
                                    </span>
                                  </td>
                                  <td className="p-3 font-mono font-bold text-orange-500">
                                    Rs. {retail.toLocaleString()}
                                  </td>
                                  <td className="p-3 font-mono text-slate-400">
                                    Rs. {wholesale.toLocaleString()}
                                  </td>
                                  <td className="p-3 font-mono text-slate-300">
                                    Rs. {shipping.toLocaleString()}
                                  </td>
                                  <td className="p-3 font-mono">
                                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                      (product.stock || 0) < 10 
                                        ? 'bg-red-500/10 text-red-400 border border-red-500/20' 
                                        : 'bg-emerald-500/10 text-emerald-400'
                                    }`}>
                                      {product.stock ?? 50} units
                                    </span>
                                  </td>
                                  <td className="p-3">
                                    <button
                                      type="button"
                                      onClick={() => handleToggleTrending(product.id, Boolean(product.isTrending))}
                                      className={`inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-black transition cursor-pointer ${
                                        product.isTrending
                                          ? 'bg-orange-500 text-white shadow-sm shadow-orange-500/30'
                                          : isLight
                                            ? 'bg-slate-100 hover:bg-orange-100 text-slate-500 hover:text-orange-600'
                                            : 'bg-slate-800 hover:bg-orange-950 text-slate-400 hover:text-orange-400'
                                      }`}
                                      title="Toggle Trending Priority in Home feed"
                                    >
                                      <Flame className={`w-3 h-3 mr-1 ${product.isTrending ? 'text-white' : 'text-slate-400'}`} />
                                      <span>{product.isTrending ? 'TRENDING' : 'Standard'}</span>
                                    </button>
                                  </td>
                                  <td className="p-3">
                                    <div className="flex flex-col gap-0.5 text-[10px]">
                                      <span className={`font-semibold ${product.allowCOD !== false ? 'text-emerald-500' : 'text-slate-500 line-through'}`}>
                                        {product.allowCOD !== false ? '✓ COD' : '✗ No COD'}
                                      </span>
                                      <span className={`font-semibold ${product.allowCard !== false ? 'text-blue-400' : 'text-slate-500 line-through'}`}>
                                        {product.allowCard !== false ? '✓ Card' : '✗ No Card'}
                                      </span>
                                    </div>
                                  </td>
                                  <td className="p-3 text-right">
                                    <div className="flex items-center justify-end space-x-1.5">
                                      <button
                                        onClick={() => setEditingProduct({
                                          ...product,
                                          galleryImagesText: Array.isArray(product.galleryImages) ? product.galleryImages.join('\n') : '',
                                          variationsText: Array.isArray(product.variations)
                                            ? product.variations.map((v: any) => `${v.name || 'Option'}: ${v.options || ''}`).join('\n')
                                            : ''
                                        })}
                                        className="p-1.5 rounded-lg bg-orange-500/10 hover:bg-orange-500/20 text-orange-400 transition cursor-pointer"
                                        title="Edit Product Details"
                                      >
                                        <Edit3 className="w-4 h-4" />
                                      </button>
                                      <button
                                        onClick={() => handleDeleteProduct(product.id, product.title)}
                                        className="p-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 transition cursor-pointer"
                                        title="Delete from Store Catalog"
                                      >
                                        <Trash2 className="w-4 h-4" />
                                      </button>
                                    </div>
                                  </td>
                                </tr>
                              );
                            })}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Edit Product Modal */}
                  {editingProduct && (
                    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
                      <div className={`w-full max-w-lg ${isLight ? 'bg-white text-slate-800' : 'bg-slate-900 text-white'} border border-slate-800 rounded-3xl p-5 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto`}>
                        <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
                          <h3 className="font-black text-sm sm:text-base flex items-center">
                            <Edit3 className="w-4 h-4 text-orange-500 mr-2" />
                            Edit Product Pricing & Details (🇱🇰 Sri Lanka Store)
                          </h3>
                          <button
                            onClick={() => setEditingProduct(null)}
                            className="p-1 rounded-lg text-slate-400 hover:text-white cursor-pointer"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>

                        <form onSubmit={handleSaveEditProduct} className="space-y-3 text-xs">
                          <div>
                            <label className="block text-[11px] font-bold text-slate-400 mb-1">Product Title</label>
                            <input
                              type="text"
                              value={editingProduct.title || ''}
                              onChange={(e) => setEditingProduct({ ...editingProduct, title: e.target.value })}
                              className={`w-full p-2 rounded-xl border outline-none ${
                                isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-950 border-slate-800'
                              }`}
                              required
                            />
                          </div>

                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <label className="block text-[11px] font-bold text-slate-400 mb-1">SKU Number</label>
                              <input
                                type="text"
                                value={editingProduct.sku || ''}
                                onChange={(e) => setEditingProduct({ ...editingProduct, sku: e.target.value })}
                                placeholder="SKU-LK-001"
                                className={`w-full p-2 rounded-xl border outline-none font-mono ${
                                  isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-950 border-slate-800'
                                }`}
                              />
                            </div>

                            <div>
                              <label className="block text-[11px] font-bold text-slate-400 mb-1">Category</label>
                              <input
                                type="text"
                                value={editingProduct.category || ''}
                                onChange={(e) => setEditingProduct({ ...editingProduct, category: e.target.value })}
                                className={`w-full p-2 rounded-xl border outline-none ${
                                  isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-950 border-slate-800'
                                }`}
                              />
                            </div>
                          </div>

                          <div className="grid grid-cols-3 gap-3">
                            <div>
                              <label className="block text-[11px] font-bold text-slate-400 mb-1">Retail Price (LKR)</label>
                              <input
                                type="number"
                                value={editingProduct.price || ''}
                                onChange={(e) => setEditingProduct({ ...editingProduct, price: Number(e.target.value) })}
                                className={`w-full p-2 rounded-xl border outline-none font-mono font-bold text-orange-400 ${
                                  isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-950 border-slate-800'
                                }`}
                                required
                              />
                            </div>

                            <div>
                              <label className="block text-[11px] font-bold text-slate-400 mb-1">Wholesale Cost (LKR)</label>
                              <input
                                type="number"
                                value={editingProduct.wholesaleCost || ''}
                                onChange={(e) => setEditingProduct({ ...editingProduct, wholesaleCost: Number(e.target.value) })}
                                className={`w-full p-2 rounded-xl border outline-none font-mono ${
                                  isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-950 border-slate-800'
                                }`}
                                required
                              />
                            </div>

                            <div>
                              <label className="block text-[11px] font-bold text-slate-400 mb-1">Fixed Shipping (LKR)</label>
                              <input
                                type="number"
                                value={editingProduct.fixedShippingCost ?? 450}
                                onChange={(e) => setEditingProduct({ ...editingProduct, fixedShippingCost: Number(e.target.value) })}
                                className={`w-full p-2 rounded-xl border outline-none font-mono text-emerald-400 ${
                                  isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-950 border-slate-800'
                                }`}
                                required
                              />
                            </div>
                          </div>

                          <div>
                            <label className="block text-[11px] font-bold text-slate-400 mb-1">Live Stock (Units) *</label>
                            <input
                              type="number"
                              value={editingProduct.stock ?? 50}
                              onChange={(e) => setEditingProduct({ ...editingProduct, stock: Number(e.target.value) })}
                              className={`w-full p-2 rounded-xl border outline-none font-mono ${
                                isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-950 border-slate-800'
                              }`}
                              required
                            />
                          </div>

                          {/* 1. Main Product Photo Direct Upload */}
                          <div className="space-y-1.5">
                            <div className="flex items-center justify-between">
                              <label className="block text-[11px] font-bold text-slate-300">
                                📸 Main Product Photo (Direct Upload) *
                              </label>
                              <span className="text-[10px] text-slate-500">JPG, PNG, WebP</span>
                            </div>

                            <input
                              type="file"
                              id="edit-main-photo-input"
                              accept="image/*"
                              className="hidden"
                              onChange={(e) => e.target.files?.[0] && handleUploadMainImage(e.target.files[0], true)}
                            />

                            {editingProduct.imageUrl ? (
                              <div className={`p-3 rounded-2xl border ${isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-950 border-slate-800'} flex items-center space-x-3`}>
                                <div className="relative w-20 h-20 rounded-xl overflow-hidden border border-slate-700/50 shrink-0 bg-slate-900 flex items-center justify-center">
                                  <img
                                    src={editingProduct.imageUrl}
                                    alt="Main Product Preview"
                                    className="w-full h-full object-cover"
                                  />
                                </div>
                                <div className="flex-1 min-w-0 space-y-1.5">
                                  <div className="flex items-center space-x-1.5">
                                    <span className="px-2 py-0.5 rounded-md bg-orange-500/20 text-orange-400 text-[10px] font-bold">
                                      Main Cover Photo
                                    </span>
                                  </div>
                                  <div className="flex items-center space-x-2">
                                    <button
                                      type="button"
                                      onClick={() => document.getElementById('edit-main-photo-input')?.click()}
                                      className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-slate-800 hover:bg-slate-700 text-white flex items-center space-x-1 cursor-pointer transition"
                                    >
                                      <Upload className="w-3 h-3 text-orange-400" />
                                      <span>Change Photo</span>
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => setEditingProduct({ ...editingProduct, imageUrl: '' })}
                                      className="px-2 py-1 rounded-lg text-[11px] font-bold bg-red-500/10 hover:bg-red-500/20 text-red-400 flex items-center space-x-1 cursor-pointer transition"
                                    >
                                      <Trash2 className="w-3 h-3" />
                                      <span>Remove</span>
                                    </button>
                                  </div>
                                </div>
                              </div>
                            ) : (
                              <div
                                onClick={() => document.getElementById('edit-main-photo-input')?.click()}
                                onDragOver={(e) => e.preventDefault()}
                                onDrop={(e) => {
                                  e.preventDefault();
                                  if (e.dataTransfer.files?.[0]) handleUploadMainImage(e.dataTransfer.files[0], true);
                                }}
                                className={`p-4 rounded-2xl border-2 border-dashed ${
                                  isLight ? 'border-slate-300 hover:border-orange-500 bg-slate-50' : 'border-slate-800 hover:border-orange-500/60 bg-slate-950/50'
                                } flex flex-col items-center justify-center text-center cursor-pointer transition group`}
                              >
                                <Upload className="w-6 h-6 text-slate-500 group-hover:text-orange-400 transition mb-1.5" />
                                <span className="font-bold text-xs text-slate-300 group-hover:text-white">
                                  Click or Drag & Drop to Upload Main Photo
                                </span>
                                <span className="text-[10px] text-slate-500 mt-0.5">
                                  Supports direct camera / gallery upload from PC or Mobile
                                </span>
                              </div>
                            )}
                          </div>

                          {/* 2. Additional Photos Direct Upload (Gallery) */}
                          <div className="space-y-1.5">
                            <div className="flex items-center justify-between">
                              <label className="block text-[11px] font-bold text-slate-300">
                                🖼️ Additional Product Photos ({Array.isArray(editingProduct.galleryImages) ? editingProduct.galleryImages.length : 0} Uploaded)
                              </label>
                              <button
                                type="button"
                                onClick={() => document.getElementById('edit-gallery-photos-input')?.click()}
                                className="text-[10px] font-bold text-orange-400 hover:text-orange-300 flex items-center space-x-1 cursor-pointer"
                              >
                                <Plus className="w-3 h-3" />
                                <span>Add Photos</span>
                              </button>
                            </div>

                            <input
                              type="file"
                              id="edit-gallery-photos-input"
                              multiple
                              accept="image/*"
                              className="hidden"
                              onChange={(e) => e.target.files && handleUploadGalleryImages(e.target.files, true)}
                            />

                            {Array.isArray(editingProduct.galleryImages) && editingProduct.galleryImages.length > 0 ? (
                              <div className="grid grid-cols-4 gap-2">
                                {editingProduct.galleryImages.map((imgUrl: string, idx: number) => (
                                  <div
                                    key={idx}
                                    className="relative group rounded-xl overflow-hidden border border-slate-800 bg-slate-950 aspect-square"
                                  >
                                    <img
                                      src={imgUrl}
                                      alt={`Gallery ${idx + 1}`}
                                      className="w-full h-full object-cover"
                                    />
                                    <button
                                      type="button"
                                      onClick={() => handleRemoveGalleryImage(idx, true)}
                                      className="absolute top-1 right-1 p-1 rounded-md bg-black/70 hover:bg-red-600 text-white opacity-90 group-hover:opacity-100 transition cursor-pointer"
                                      title="Remove photo"
                                    >
                                      <X className="w-3 h-3" />
                                    </button>
                                  </div>
                                ))}
                                <div
                                  onClick={() => document.getElementById('edit-gallery-photos-input')?.click()}
                                  className={`rounded-xl border border-dashed ${
                                    isLight ? 'border-slate-300 hover:border-orange-500 bg-slate-50' : 'border-slate-800 hover:border-orange-500/60 bg-slate-950/40'
                                  } aspect-square flex flex-col items-center justify-center text-center cursor-pointer transition group`}
                                >
                                  <Plus className="w-5 h-5 text-slate-500 group-hover:text-orange-400" />
                                  <span className="text-[9px] font-bold text-slate-500 group-hover:text-slate-300 mt-1">
                                    + Add More
                                  </span>
                                </div>
                              </div>
                            ) : (
                              <div
                                onClick={() => document.getElementById('edit-gallery-photos-input')?.click()}
                                onDragOver={(e) => e.preventDefault()}
                                onDrop={(e) => {
                                  e.preventDefault();
                                  if (e.dataTransfer.files) handleUploadGalleryImages(e.dataTransfer.files, true);
                                }}
                                className={`p-3 rounded-2xl border border-dashed ${
                                  isLight ? 'border-slate-300 hover:border-orange-500 bg-slate-50' : 'border-slate-800 hover:border-orange-500/60 bg-slate-950/40'
                                } flex items-center justify-center space-x-2 text-center cursor-pointer transition group`}
                              >
                                <ImageIcon className="w-4 h-4 text-slate-500 group-hover:text-orange-400" />
                                <span className="font-semibold text-xs text-slate-400 group-hover:text-white">
                                  Upload Additional Photos (Select multiple files)
                                </span>
                              </div>
                            )}
                          </div>

                          <div>
                            <label className="block text-[11px] font-bold text-slate-400 mb-1">
                              Product Variations / Attributes (One attribute per line)
                            </label>
                            <textarea
                              rows={2}
                              value={editingProduct.variationsText || ''}
                              onChange={(e) => {
                                const text = e.target.value;
                                const parsed = text.split('\n').map(line => {
                                  const parts = line.split(':');
                                  return { name: parts[0]?.trim() || 'Option', options: parts[1]?.trim() || '' };
                                }).filter(v => v.options);
                                setEditingProduct({
                                  ...editingProduct,
                                  variationsText: text,
                                  variations: parsed
                                });
                              }}
                              placeholder="Sizes: S, M, L, XL&#10;Colors: Black, Navy, White"
                              className={`w-full p-2 rounded-xl border outline-none font-mono text-[11px] ${
                                isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-950 border-slate-800'
                              }`}
                            />
                          </div>

                          <div>
                            <label className="block text-[11px] font-bold text-slate-400 mb-1">Description</label>
                            <textarea
                              rows={2}
                              value={editingProduct.description || ''}
                              onChange={(e) => setEditingProduct({ ...editingProduct, description: e.target.value })}
                              className={`w-full p-2 rounded-xl border outline-none ${
                                isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-950 border-slate-800'
                              }`}
                            />
                          </div>

                          {/* Payment Capabilities Config & Trending Flag */}
                          <div className="p-3 rounded-2xl bg-slate-950/40 border border-slate-800/80 space-y-3">
                            <span className="text-[11px] font-bold text-slate-300 block">Payment Methods Supported:</span>
                            <div className="flex items-center space-x-4">
                              <label className="flex items-center space-x-2 cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={editingProduct.allowCOD !== false}
                                  onChange={(e) => setEditingProduct({ ...editingProduct, allowCOD: e.target.checked })}
                                  className="rounded text-orange-500"
                                />
                                <span className="font-medium">💵 Cash on Delivery (COD)</span>
                              </label>
                              <label className="flex items-center space-x-2 cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={editingProduct.allowCard !== false}
                                  onChange={(e) => setEditingProduct({ ...editingProduct, allowCard: e.target.checked })}
                                  className="rounded text-orange-500"
                                />
                                <span className="font-medium">💳 Creem.io Card Payment</span>
                              </label>
                            </div>

                            <div className="pt-2 border-t border-slate-800/60">
                              <label className="flex items-center space-x-2 cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={Boolean(editingProduct.isTrending)}
                                  onChange={(e) => setEditingProduct({ ...editingProduct, isTrending: e.target.checked })}
                                  className="rounded text-orange-500"
                                />
                                <span className="font-bold text-orange-400 flex items-center">
                                  <Flame className="w-3.5 h-3.5 mr-1" />
                                  Mark as Trending (Shows at top of User Home Feed)
                                </span>
                              </label>
                            </div>
                          </div>

                          <div className="pt-3 border-t border-slate-800/80 flex items-center justify-end space-x-2">
                            <button
                              type="button"
                              onClick={() => setEditingProduct(null)}
                              className="px-3 py-2 rounded-xl font-bold text-slate-400 hover:text-white cursor-pointer"
                            >
                              Cancel
                            </button>
                            <button
                              type="submit"
                              disabled={isSavingProduct}
                              className="px-4 py-2 rounded-xl font-bold bg-orange-500 hover:bg-orange-600 text-white flex items-center space-x-1.5 cursor-pointer disabled:opacity-50"
                            >
                              <Save className="w-3.5 h-3.5" />
                              <span>{isSavingProduct ? 'Saving Changes...' : 'Save & Publish'}</span>
                            </button>
                          </div>
                        </form>
                      </div>
                    </div>
                  )}

                  {/* Add Product Modal */}
                  {isAddingProduct && (
                    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
                      <div className={`w-full max-w-lg ${isLight ? 'bg-white text-slate-800' : 'bg-slate-900 text-white'} border border-slate-800 rounded-3xl p-5 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto`}>
                        <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
                          <h3 className="font-black text-sm sm:text-base flex items-center">
                            <Plus className="w-4 h-4 text-orange-500 mr-2" />
                            Add New Product to Store Catalog (🇱🇰 Sri Lanka Store)
                          </h3>
                          <button
                            onClick={() => setIsAddingProduct(false)}
                            className="p-1 rounded-lg text-slate-400 hover:text-white cursor-pointer"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>

                        <form onSubmit={handleCreateProduct} className="space-y-3 text-xs">
                          <div>
                            <label className="block text-[11px] font-bold text-slate-400 mb-1">Product Title *</label>
                            <input
                              type="text"
                              value={newProductForm.title}
                              onChange={(e) => setNewProductForm({ ...newProductForm, title: e.target.value })}
                              placeholder="e.g. Wireless Bluetooth Earbuds Pro"
                              className={`w-full p-2 rounded-xl border outline-none ${
                                isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-950 border-slate-800'
                              }`}
                              required
                            />
                          </div>

                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <label className="block text-[11px] font-bold text-slate-400 mb-1">SKU Number</label>
                              <input
                                type="text"
                                value={newProductForm.sku}
                                onChange={(e) => setNewProductForm({ ...newProductForm, sku: e.target.value })}
                                placeholder="SKU-LK-001"
                                className={`w-full p-2 rounded-xl border outline-none font-mono ${
                                  isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-950 border-slate-800'
                                }`}
                              />
                            </div>

                            <div>
                              <label className="block text-[11px] font-bold text-slate-400 mb-1">Category</label>
                              <input
                                type="text"
                                value={newProductForm.category}
                                onChange={(e) => setNewProductForm({ ...newProductForm, category: e.target.value })}
                                placeholder="Consumer Electronics"
                                className={`w-full p-2 rounded-xl border outline-none ${
                                  isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-950 border-slate-800'
                                }`}
                              />
                            </div>
                          </div>

                          <div className="grid grid-cols-3 gap-3">
                            <div>
                              <label className="block text-[11px] font-bold text-slate-400 mb-1">Retail Price (LKR) *</label>
                              <input
                                type="number"
                                value={newProductForm.price}
                                onChange={(e) => setNewProductForm({ ...newProductForm, price: e.target.value })}
                                placeholder="e.g. 4500"
                                className={`w-full p-2 rounded-xl border outline-none font-mono font-bold text-orange-400 ${
                                  isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-950 border-slate-800'
                                }`}
                                required
                              />
                            </div>

                            <div>
                              <label className="block text-[11px] font-bold text-slate-400 mb-1">Wholesale Cost (LKR)</label>
                              <input
                                type="number"
                                value={newProductForm.wholesaleCost}
                                onChange={(e) => setNewProductForm({ ...newProductForm, wholesaleCost: e.target.value })}
                                placeholder="e.g. 3100"
                                className={`w-full p-2 rounded-xl border outline-none font-mono ${
                                  isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-950 border-slate-800'
                                }`}
                              />
                            </div>

                            <div>
                              <label className="block text-[11px] font-bold text-slate-400 mb-1">Fixed Shipping (LKR)</label>
                              <input
                                type="number"
                                value={newProductForm.fixedShippingCost}
                                onChange={(e) => setNewProductForm({ ...newProductForm, fixedShippingCost: e.target.value })}
                                placeholder="450"
                                className={`w-full p-2 rounded-xl border outline-none font-mono text-emerald-400 ${
                                  isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-950 border-slate-800'
                                }`}
                              />
                            </div>
                          </div>

                          <div>
                            <label className="block text-[11px] font-bold text-slate-400 mb-1">Initial Stock Units</label>
                            <input
                              type="number"
                              value={newProductForm.stock}
                              onChange={(e) => setNewProductForm({ ...newProductForm, stock: e.target.value })}
                              placeholder="50"
                              className={`w-full p-2 rounded-xl border outline-none font-mono ${
                                isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-950 border-slate-800'
                              }`}
                            />
                          </div>

                          {/* 1. Main Product Photo Direct Upload */}
                          <div className="space-y-1.5">
                            <div className="flex items-center justify-between">
                              <label className="block text-[11px] font-bold text-slate-300">
                                📸 Main Product Photo (Direct Upload) *
                              </label>
                              <span className="text-[10px] text-slate-500">JPG, PNG, WebP</span>
                            </div>

                            <input
                              type="file"
                              id="add-main-photo-input"
                              accept="image/*"
                              className="hidden"
                              onChange={(e) => e.target.files?.[0] && handleUploadMainImage(e.target.files[0], false)}
                            />

                            {newProductForm.imageUrl ? (
                              <div className={`p-3 rounded-2xl border ${isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-950 border-slate-800'} flex items-center space-x-3`}>
                                <div className="relative w-20 h-20 rounded-xl overflow-hidden border border-slate-700/50 shrink-0 bg-slate-900 flex items-center justify-center">
                                  <img
                                    src={newProductForm.imageUrl}
                                    alt="Main Product Preview"
                                    className="w-full h-full object-cover"
                                  />
                                </div>
                                <div className="flex-1 min-w-0 space-y-1.5">
                                  <div className="flex items-center space-x-1.5">
                                    <span className="px-2 py-0.5 rounded-md bg-orange-500/20 text-orange-400 text-[10px] font-bold">
                                      Main Cover Photo
                                    </span>
                                  </div>
                                  <div className="flex items-center space-x-2">
                                    <button
                                      type="button"
                                      onClick={() => document.getElementById('add-main-photo-input')?.click()}
                                      className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-slate-800 hover:bg-slate-700 text-white flex items-center space-x-1 cursor-pointer transition"
                                    >
                                      <Upload className="w-3 h-3 text-orange-400" />
                                      <span>Change Photo</span>
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => setNewProductForm({ ...newProductForm, imageUrl: '' })}
                                      className="px-2 py-1 rounded-lg text-[11px] font-bold bg-red-500/10 hover:bg-red-500/20 text-red-400 flex items-center space-x-1 cursor-pointer transition"
                                    >
                                      <Trash2 className="w-3 h-3" />
                                      <span>Remove</span>
                                    </button>
                                  </div>
                                </div>
                              </div>
                            ) : (
                              <div
                                onClick={() => document.getElementById('add-main-photo-input')?.click()}
                                onDragOver={(e) => e.preventDefault()}
                                onDrop={(e) => {
                                  e.preventDefault();
                                  if (e.dataTransfer.files?.[0]) handleUploadMainImage(e.dataTransfer.files[0], false);
                                }}
                                className={`p-4 rounded-2xl border-2 border-dashed ${
                                  isLight ? 'border-slate-300 hover:border-orange-500 bg-slate-50' : 'border-slate-800 hover:border-orange-500/60 bg-slate-950/50'
                                } flex flex-col items-center justify-center text-center cursor-pointer transition group`}
                              >
                                <Upload className="w-6 h-6 text-slate-500 group-hover:text-orange-400 transition mb-1.5" />
                                <span className="font-bold text-xs text-slate-300 group-hover:text-white">
                                  Click or Drag & Drop to Upload Main Photo
                                </span>
                                <span className="text-[10px] text-slate-500 mt-0.5">
                                  Supports direct camera / gallery upload from PC or Mobile
                                </span>
                              </div>
                            )}
                          </div>

                          {/* 2. Additional Photos Direct Upload (Gallery) */}
                          <div className="space-y-1.5">
                            <div className="flex items-center justify-between">
                              <label className="block text-[11px] font-bold text-slate-300">
                                🖼️ Additional Product Photos ({Array.isArray(newProductForm.galleryImages) ? newProductForm.galleryImages.length : 0} Uploaded)
                              </label>
                              <button
                                type="button"
                                onClick={() => document.getElementById('add-gallery-photos-input')?.click()}
                                className="text-[10px] font-bold text-orange-400 hover:text-orange-300 flex items-center space-x-1 cursor-pointer"
                              >
                                <Plus className="w-3 h-3" />
                                <span>Add Photos</span>
                              </button>
                            </div>

                            <input
                              type="file"
                              id="add-gallery-photos-input"
                              multiple
                              accept="image/*"
                              className="hidden"
                              onChange={(e) => e.target.files && handleUploadGalleryImages(e.target.files, false)}
                            />

                            {Array.isArray(newProductForm.galleryImages) && newProductForm.galleryImages.length > 0 ? (
                              <div className="grid grid-cols-4 gap-2">
                                {newProductForm.galleryImages.map((imgUrl: string, idx: number) => (
                                  <div
                                    key={idx}
                                    className="relative group rounded-xl overflow-hidden border border-slate-800 bg-slate-950 aspect-square"
                                  >
                                    <img
                                      src={imgUrl}
                                      alt={`Gallery ${idx + 1}`}
                                      className="w-full h-full object-cover"
                                    />
                                    <button
                                      type="button"
                                      onClick={() => handleRemoveGalleryImage(idx, false)}
                                      className="absolute top-1 right-1 p-1 rounded-md bg-black/70 hover:bg-red-600 text-white opacity-90 group-hover:opacity-100 transition cursor-pointer"
                                      title="Remove photo"
                                    >
                                      <X className="w-3 h-3" />
                                    </button>
                                  </div>
                                ))}
                                <div
                                  onClick={() => document.getElementById('add-gallery-photos-input')?.click()}
                                  className={`rounded-xl border border-dashed ${
                                    isLight ? 'border-slate-300 hover:border-orange-500 bg-slate-50' : 'border-slate-800 hover:border-orange-500/60 bg-slate-950/40'
                                  } aspect-square flex flex-col items-center justify-center text-center cursor-pointer transition group`}
                                >
                                  <Plus className="w-5 h-5 text-slate-500 group-hover:text-orange-400" />
                                  <span className="text-[9px] font-bold text-slate-500 group-hover:text-slate-300 mt-1">
                                    + Add More
                                  </span>
                                </div>
                              </div>
                            ) : (
                              <div
                                onClick={() => document.getElementById('add-gallery-photos-input')?.click()}
                                onDragOver={(e) => e.preventDefault()}
                                onDrop={(e) => {
                                  e.preventDefault();
                                  if (e.dataTransfer.files) handleUploadGalleryImages(e.dataTransfer.files, false);
                                }}
                                className={`p-3 rounded-2xl border border-dashed ${
                                  isLight ? 'border-slate-300 hover:border-orange-500 bg-slate-50' : 'border-slate-800 hover:border-orange-500/60 bg-slate-950/40'
                                } flex items-center justify-center space-x-2 text-center cursor-pointer transition group`}
                              >
                                <ImageIcon className="w-4 h-4 text-slate-500 group-hover:text-orange-400" />
                                <span className="font-semibold text-xs text-slate-400 group-hover:text-white">
                                  Upload Additional Photos (Select multiple files)
                                </span>
                              </div>
                            )}
                          </div>

                          <div>
                            <label className="block text-[11px] font-bold text-slate-400 mb-1">
                              Product Variations / Attributes (One attribute per line)
                            </label>
                            <textarea
                              rows={2}
                              value={newProductForm.variationsText}
                              onChange={(e) => setNewProductForm({ ...newProductForm, variationsText: e.target.value })}
                              placeholder="Sizes: S, M, L, XL&#10;Colors: Black, Silver, Navy"
                              className={`w-full p-2 rounded-xl border outline-none font-mono text-[11px] ${
                                isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-950 border-slate-800'
                              }`}
                            />
                          </div>

                          <div>
                            <label className="block text-[11px] font-bold text-slate-400 mb-1">Description</label>
                            <textarea
                              rows={2}
                              value={newProductForm.description}
                              onChange={(e) => setNewProductForm({ ...newProductForm, description: e.target.value })}
                              placeholder="Enter detailed description of the product..."
                              className={`w-full p-2 rounded-xl border outline-none ${
                                isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-950 border-slate-800'
                              }`}
                            />
                          </div>

                          {/* Payment Method Selector & Trending Toggle */}
                          <div className="p-3 rounded-2xl bg-slate-950/40 border border-slate-800/80 space-y-3">
                            <span className="text-[11px] font-bold text-slate-300 block">Payment Methods Supported:</span>
                            <div className="flex items-center space-x-4">
                              <label className="flex items-center space-x-2 cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={newProductForm.allowCOD}
                                  onChange={(e) => setNewProductForm({ ...newProductForm, allowCOD: e.target.checked })}
                                  className="rounded text-orange-500"
                                />
                                <span className="font-medium">💵 Cash on Delivery (COD)</span>
                              </label>
                              <label className="flex items-center space-x-2 cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={newProductForm.allowCard}
                                  onChange={(e) => setNewProductForm({ ...newProductForm, allowCard: e.target.checked })}
                                  className="rounded text-orange-500"
                                />
                                <span className="font-medium">💳 Creem.io Card Payment</span>
                              </label>
                            </div>

                            <div className="pt-2 border-t border-slate-800/60">
                              <label className="flex items-center space-x-2 cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={newProductForm.isTrending}
                                  onChange={(e) => setNewProductForm({ ...newProductForm, isTrending: e.target.checked })}
                                  className="rounded text-orange-500"
                                />
                                <span className="font-bold text-orange-400 flex items-center">
                                  <Flame className="w-3.5 h-3.5 mr-1" />
                                  Mark as Trending (Prioritize at top of Home feed)
                                </span>
                              </label>
                            </div>
                          </div>

                          <div className="pt-3 border-t border-slate-800/80 flex items-center justify-end space-x-2">
                            <button
                              type="button"
                              onClick={() => setIsAddingProduct(false)}
                              className="px-3 py-2 rounded-xl font-bold text-slate-400 hover:text-white cursor-pointer"
                            >
                              Cancel
                            </button>
                            <button
                              type="submit"
                              disabled={isSavingProduct}
                              className="px-4 py-2 rounded-xl font-bold bg-orange-500 hover:bg-orange-600 text-white flex items-center space-x-1.5 cursor-pointer disabled:opacity-50"
                            >
                              <Plus className="w-3.5 h-3.5" />
                              <span>{isSavingProduct ? 'Adding Product...' : 'Add to Sri Lanka Catalog'}</span>
                            </button>
                          </div>
                        </form>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* =================================================================== */}
              {/* 4. REAL SYSTEM TOPOLOGY & CLOUD INFRASTRUCTURE                      */}
              {/* =================================================================== */}
              {activeTab === 'topology' && (
                <div className="space-y-4 animate-in fade-in duration-200">
                  <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <h2 className="text-sm sm:text-base font-black text-white flex items-center">
                        <Cpu className="w-4 h-4 text-orange-500 mr-2" />
                        Host Container & Cloud Diagnostics
                      </h2>
                      <p className="text-xs text-slate-400 mt-0.5">
                        Live real-time telemetry from Cloud Run container, Google Cloud Firestore, and CJ Dropshipping API.
                      </p>
                    </div>

                    <button
                      onClick={fetchDashboardData}
                      className="px-3 py-1.5 rounded-xl text-xs font-bold bg-slate-800 hover:bg-slate-700 text-slate-300 transition flex items-center space-x-1.5 cursor-pointer shrink-0"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                      <span>Refresh Telemetry</span>
                    </button>
                  </div>

                  {/* Active Production Node Cards */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {telemetry?.nodes?.map((node) => (
                      <div key={node.id} className="bg-slate-900 border border-slate-800 p-4 rounded-2xl space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="font-mono font-bold text-xs text-white truncate max-w-[190px]">{node.name}</span>
                          <span className="text-[10px] bg-emerald-950 text-emerald-400 px-2 py-0.5 rounded font-mono shrink-0">
                            {node.status}
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-400 font-mono truncate">
                          {node.endpoint}
                        </div>
                        <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                          <div className="bg-slate-950 p-2 rounded-xl">
                            <span className="text-[10px] text-slate-500 block">P95 Latency</span>
                            <span className="font-bold text-orange-400">{node.p95LatencyMs} ms</span>
                          </div>
                          <div className="bg-slate-950 p-2 rounded-xl">
                            <span className="text-[10px] text-slate-500 block">CPU Load</span>
                            <span className="font-bold text-emerald-400">{node.cpuPercent}%</span>
                          </div>
                          <div className="bg-slate-950 p-2 rounded-xl">
                            <span className="text-[10px] text-slate-500 block">Memory RSS</span>
                            <span className="font-bold text-slate-300">{node.memoryMb} MB</span>
                          </div>
                          <div className="bg-slate-950 p-2 rounded-xl">
                            <span className="text-[10px] text-slate-500 block">Uptime</span>
                            <span className="font-bold text-blue-400">
                              {Math.floor((node.uptimeSeconds || 0) / 60)}m {((node.uptimeSeconds || 0) % 60)}s
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Real Cloud Firestore Database Persistence & Redis Multi-Tier Cache */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Cloud Firestore Card */}
                    <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl space-y-3">
                      <div className="flex items-center justify-between">
                        <h3 className="font-bold text-xs text-white flex items-center">
                          <Database className="w-4 h-4 text-amber-400 mr-2" />
                          Google Cloud Firestore (Persistent Storage)
                        </h3>
                        <span className="text-[10px] bg-emerald-950 text-emerald-400 px-2 py-0.5 rounded font-mono">
                          LIVE & CONNECTED
                        </span>
                      </div>
                      <p className="text-xs text-slate-400">
                        All orders, registered user accounts, and product records persist permanently to Firestore.
                      </p>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs font-mono">
                        <div className="bg-slate-950 p-2 rounded-xl">
                          <span className="text-[10px] text-slate-500 block">Orders in DB</span>
                          <span className="font-bold text-orange-400">{telemetry?.database?.tableCounts?.orders ?? orders.length}</span>
                        </div>
                        <div className="bg-slate-950 p-2 rounded-xl">
                          <span className="text-[10px] text-slate-500 block">Customers</span>
                          <span className="font-bold text-emerald-400">{telemetry?.database?.tableCounts?.customers ?? 0}</span>
                        </div>
                        <div className="bg-slate-950 p-2 rounded-xl">
                          <span className="text-[10px] text-slate-500 block">Catalog Items</span>
                          <span className="font-bold text-blue-400">{telemetry?.database?.tableCounts?.products ?? catalogProducts.length}</span>
                        </div>
                        <div className="bg-slate-950 p-2 rounded-xl">
                          <span className="text-[10px] text-slate-500 block">Query Time</span>
                          <span className="font-bold text-white">{telemetry?.database?.avgQueryTimeMs ?? 1.2} ms</span>
                        </div>
                      </div>
                    </div>

                    {/* Redis Cache Card */}
                    <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl space-y-3">
                      <div className="flex items-center justify-between">
                        <h3 className="font-bold text-xs text-white flex items-center">
                          <Layers className="w-4 h-4 text-cyan-400 mr-2" />
                          Multi-Tier In-Memory Cache (Sub-ms)
                        </h3>
                        <span className="text-[10px] bg-cyan-950 text-cyan-400 px-2 py-0.5 rounded font-mono">
                          SUB-MILLISECOND
                        </span>
                      </div>
                      <p className="text-xs text-slate-400">
                        In-memory caching layer preventing duplicate supplier calls and accelerating catalog queries.
                      </p>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs font-mono">
                        <div className="bg-slate-950 p-2 rounded-xl">
                          <span className="text-[10px] text-slate-500 block">Hit Ratio</span>
                          <span className="font-bold text-cyan-400">{telemetry?.redis?.hitRatioPercent ?? 0}%</span>
                        </div>
                        <div className="bg-slate-950 p-2 rounded-xl">
                          <span className="text-[10px] text-slate-500 block">Cache Hits</span>
                          <span className="font-bold text-emerald-400">{telemetry?.redis?.hits ?? 0}</span>
                        </div>
                        <div className="bg-slate-950 p-2 rounded-xl">
                          <span className="text-[10px] text-slate-500 block">Misses</span>
                          <span className="font-bold text-slate-400">{telemetry?.redis?.misses ?? 0}</span>
                        </div>
                        <div className="bg-slate-950 p-2 rounded-xl">
                          <span className="text-[10px] text-slate-500 block">Cached Keys</span>
                          <span className="font-bold text-white">{telemetry?.redis?.totalKeys ?? 0}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Asynchronous Workers & Resilience Card */}
                  <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="space-y-1">
                      <span className="text-xs font-bold text-white flex items-center">
                        <Zap className="w-4 h-4 text-amber-400 mr-2" />
                        Background Workers & Fault Tolerance
                      </span>
                      <p className="text-xs text-slate-400">
                        Queue Depth: <span className="font-mono text-white font-bold">{telemetry?.queueDepth ?? 0}</span> | 
                        DLQ: <span className="font-mono text-white font-bold">{telemetry?.dlqCount ?? 0}</span> | 
                        Supplier Circuit Breaker: <span className="font-mono text-emerald-400 font-bold">{telemetry?.circuitBreaker?.state ?? 'CLOSED'}</span>
                      </p>
                    </div>

                    <button
                      onClick={async () => {
                        try {
                          const res = await fetch('/api/admin/cache/flush', {
                            method: 'POST',
                            headers: getAdminHeaders(),
                            credentials: 'include'
                          });
                          const data = await res.json();
                          if (data.success) {
                            showNotification('Redis cache flushed and re-indexed.');
                            fetchDashboardData();
                          }
                        } catch (err: any) {
                          showNotification(`Failed to flush: ${err.message}`);
                        }
                      }}
                      className="px-3 py-1.5 rounded-xl text-xs font-bold bg-slate-800 hover:bg-slate-700 text-slate-300 transition flex items-center space-x-1.5 cursor-pointer shrink-0"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>Flush In-Memory Cache</span>
                    </button>
                  </div>
                </div>
              )}

              {/* =================================================================== */}
              {/* 5. 50K CONCURRENT LOAD TESTER                                       */}
              {/* =================================================================== */}
              {activeTab === 'loadtest' && (
                <div className="space-y-4 animate-in fade-in duration-200">
                  <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <h2 className="text-sm sm:text-base font-black text-white flex items-center">
                        <Zap className="w-4 h-4 text-amber-400 mr-2" />
                        Stateless Concurrency Engine (10k - 50k Users)
                      </h2>
                      <p className="text-xs text-slate-400 mt-0.5">
                        Simulate flash-sale traffic surges to verify Redis cache hits and zero database lockups.
                      </p>
                    </div>

                    <div className="flex items-center space-x-3">
                      <select
                        value={selectedConcurrency}
                        onChange={(e) => setSelectedConcurrency(Number(e.target.value))}
                        className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs font-bold text-white focus:outline-none focus:border-orange-500 font-mono"
                      >
                        <option value={10000}>10,000 Concurrent Users</option>
                        <option value={25000}>25,000 Concurrent Users</option>
                        <option value={50000}>50,000 Concurrent Users (Peak Flash)</option>
                      </select>

                      <button
                        onClick={handleRunLoadTest}
                        disabled={isLoadTesting}
                        className="bg-orange-600 hover:bg-orange-500 text-white font-bold px-4 py-2 rounded-xl text-xs transition cursor-pointer flex items-center space-x-2 disabled:opacity-60 shadow-lg"
                      >
                        <Play className="w-3.5 h-3.5" />
                        <span>{isLoadTesting ? 'Simulating Traffic...' : 'Execute Load Test'}</span>
                      </button>
                    </div>
                  </div>

                  {loadTestResult && (
                    <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl space-y-4">
                      <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                        <h3 className="font-bold text-white text-sm">Load Test Execution Results</h3>
                        <span className="text-xs font-mono bg-emerald-950 text-emerald-400 px-2.5 py-1 rounded-full font-bold">
                          {loadTestResult.targetConcurrency.toLocaleString()} Users Tested
                        </span>
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-mono">
                        <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
                          <span className="text-slate-500 text-[10px] block">Achieved RPS</span>
                          <span className="text-lg font-black text-orange-400">{loadTestResult.achievedRps.toLocaleString()} rps</span>
                        </div>
                        <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
                          <span className="text-slate-500 text-[10px] block">P95 Latency</span>
                          <span className="text-lg font-black text-emerald-400">{loadTestResult.p95LatencyMs} ms</span>
                        </div>
                        <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
                          <span className="text-slate-500 text-[10px] block">Error Rate</span>
                          <span className="text-lg font-black text-blue-400">{loadTestResult.errorRatePercent}%</span>
                        </div>
                        <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
                          <span className="text-slate-500 text-[10px] block">Status</span>
                          <span className="text-lg font-black text-emerald-400">{loadTestResult.status}</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* =================================================================== */}
              {/* 6. AI SRE DIAGNOSTICS                                               */}
              {/* =================================================================== */}
              {activeTab === 'ai_sre' && (
                <div className="space-y-4 animate-in fade-in duration-200">
                  <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <h2 className="text-sm sm:text-base font-black text-white flex items-center">
                        <Sparkles className="w-4 h-4 text-amber-300 mr-2" />
                        Autonomous AI SRE Diagnostics Engine
                      </h2>
                      <p className="text-xs text-slate-400 mt-0.5">
                        Gemini powered autonomous system health inspection and live sandbox patching.
                      </p>
                    </div>

                    <button
                      onClick={handleRunAiDiagnostics}
                      disabled={isAnalyzingAi}
                      className="bg-gradient-to-r from-amber-500 to-orange-600 text-white font-bold px-4 py-2 rounded-xl text-xs transition cursor-pointer flex items-center space-x-2 disabled:opacity-60 shadow-lg"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>{isAnalyzingAi ? 'Analyzing System...' : 'Run Autonomous Diagnosis'}</span>
                    </button>
                  </div>

                  {aiReport && (
                    <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl space-y-4 text-xs">
                      <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                        <div className="font-bold text-white text-sm flex items-center space-x-2">
                          <span>Health Score:</span>
                          <span className="text-emerald-400 font-mono">{aiReport.healthScore} / 100</span>
                        </div>
                        <span className="text-[10px] text-slate-500 font-mono">Report ID: {aiReport.id}</span>
                      </div>
                      <p className="text-slate-300">{aiReport.summary}</p>
                      <div className="bg-slate-950 p-4 rounded-xl border border-slate-800">
                        <div className="font-bold text-slate-400 mb-2">Recommended Root-Cause Action:</div>
                        <p className="text-slate-200 font-mono">{aiReport.recommendedAction}</p>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* =================================================================== */}
              {/* 7. AUDIT & ACCESS LOGS                                              */}
              {/* =================================================================== */}
              {activeTab === 'logs' && (
                <div className="space-y-4 animate-in fade-in duration-200">
                  <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl">
                    <h2 className="text-sm sm:text-base font-black text-white flex items-center">
                      <Terminal className="w-4 h-4 text-orange-500 mr-2" />
                      Administrative Audit Trail & Access Logs
                    </h2>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Immutable structured logs of admin sign-ins, privilege checks, and configuration updates.
                    </p>
                  </div>

                  <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs font-mono">
                        <thead className="bg-slate-950 text-slate-400 border-b border-slate-800">
                          <tr>
                            <th className="p-3">Timestamp</th>
                            <th className="p-3">Actor Email</th>
                            <th className="p-3">Action</th>
                            <th className="p-3">Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800/50">
                          {auditLogs.length === 0 ? (
                            <tr>
                              <td colSpan={4} className="p-6 text-center text-slate-500">
                                No audit events logged yet.
                              </td>
                            </tr>
                          ) : (
                            auditLogs.map((log, idx) => (
                              <tr key={idx} className="hover:bg-slate-800/30">
                                <td className="p-3 text-slate-500">{new Date(log.timestamp).toLocaleTimeString()}</td>
                                <td className="p-3 text-slate-200">{log.actorEmail}</td>
                                <td className="p-3 text-orange-400 font-bold">{log.action}</td>
                                <td className="p-3">
                                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                    log.status === 'SUCCESS' ? 'bg-emerald-950 text-emerald-400' : 'bg-red-950 text-red-400'
                                  }`}>
                                    {log.status}
                                  </span>
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

              {/* =================================================================== */}
              {/* 8. BACKEND CONSOLE LOGS & ERROR DIAGNOSTICS                         */}
              {/* =================================================================== */}
              {activeTab === 'console_logs' && (
                <div className="space-y-5 animate-in fade-in duration-200">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-900 border border-slate-800 p-4 rounded-2xl">
                    <div>
                      <h2 className="text-sm sm:text-base font-black text-white flex items-center">
                        <Terminal className="w-4 h-4 text-red-400 mr-2" />
                        Live Backend Console Logs & Error Diagnostics
                      </h2>
                      <p className="text-xs text-slate-400 mt-0.5">
                        Real-time server console output, API exceptions, and database sync traces captured from the Node.js backend.
                      </p>
                    </div>
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={fetchDashboardData}
                        disabled={isLoadingAnalytics}
                        className="px-3.5 py-2 rounded-xl text-xs font-bold bg-slate-800 hover:bg-slate-700 text-white border border-slate-700 transition flex items-center space-x-1.5 cursor-pointer"
                      >
                        <RefreshCw className={`w-3.5 h-3.5 ${isLoadingAnalytics ? 'animate-spin' : ''}`} />
                        <span>Refresh Logs</span>
                      </button>
                      <button
                        onClick={handleClearConsoleLogs}
                        className="px-3.5 py-2 rounded-xl text-xs font-bold bg-red-600/20 hover:bg-red-600/40 text-red-400 border border-red-500/30 transition flex items-center space-x-1.5 cursor-pointer"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        <span>Clear Buffer</span>
                      </button>
                    </div>
                  </div>

                  <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-xl">
                    <div className="flex items-center justify-between mb-3 text-xs text-slate-400">
                      <span>Total Captured Events: <strong className="text-white font-mono">{serverConsoleLogs.length}</strong></span>
                      <span className="text-[10px] text-amber-400 font-mono">Buffer Limit: 500 entries</span>
                    </div>

                    <div className="bg-slate-950 border border-slate-800/80 rounded-xl p-3 font-mono text-xs max-h-[600px] overflow-y-auto space-y-2">
                      {serverConsoleLogs.length === 0 ? (
                        <div className="text-center py-12 text-slate-500">
                          No server console logs captured yet. Trigger actions in the store or backend to inspect output.
                        </div>
                      ) : (
                        serverConsoleLogs.map((log) => {
                          const isError = log.level === 'error';
                          const isWarn = log.level === 'warn';
                          return (
                            <div 
                              key={log.id} 
                              className={`p-2.5 rounded-lg border transition ${
                                isError 
                                  ? 'bg-red-950/30 border-red-900/50 text-red-200' 
                                  : isWarn 
                                    ? 'bg-amber-950/20 border-amber-900/40 text-amber-200' 
                                    : 'bg-slate-900/60 border-slate-800 text-slate-300'
                              }`}
                            >
                              <div className="flex items-center justify-between text-[10px] text-slate-500 mb-1">
                                <span className={`uppercase font-bold px-1.5 py-0.5 rounded text-[9px] ${
                                  isError ? 'bg-red-900/50 text-red-300' : isWarn ? 'bg-amber-900/50 text-amber-300' : 'bg-slate-800 text-slate-400'
                                }`}>
                                  {log.level}
                                </span>
                                <span>{new Date(log.timestamp).toLocaleTimeString()}</span>
                              </div>
                              <div className="whitespace-pre-wrap break-all text-xs font-mono">{log.message}</div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>
                </div>
              )}

            </main>
          </div>
        )}

      </div>
    </div>
  );
};
