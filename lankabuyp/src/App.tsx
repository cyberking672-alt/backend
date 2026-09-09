import React, { useState, useEffect } from 'react';
import type { User as FirebaseUser } from 'firebase/auth';
import { 
  Flame, 
  Truck, 
  ArrowUpDown, 
  RotateCcw, 
  Search, 
  CheckCircle2, 
  Sparkles, 
  ShieldCheck, 
  Home, 
  Layers, 
  ShoppingBag, 
  Lock,
  Globe,
  RefreshCw,
  AlertCircle,
  CreditCard
} from 'lucide-react';
import { Product, CartItem, Order, FilterState, UserProfile, UserAddress, PendingCheckoutIntent } from './types';
import { Header } from './components/Header';
import { LankaBuyLogo } from './components/LankaBuyLogo';
import { CategoryBar } from './components/CategoryBar';
import { ProductCard } from './components/ProductCard';
import { SkeletonProductCard } from './components/SkeletonProductCard';
import { ProductDetailPage } from './components/ProductDetailPage';
import { CheckoutPage } from './components/CheckoutPage';
import { CartDrawer } from './components/CartDrawer';
import { CheckoutModal } from './components/CheckoutModal';
import { OrderSuccessPage } from './components/OrderSuccessPage';
import { AdminPortal } from './components/AdminPortal';
import { CountriesTab } from './components/CountriesTab';
import { LoginPage } from './components/LoginPage';
import { MyAddressesModal } from './components/MyAddressesModal';
import { MyOrdersPage } from './components/MyOrdersPage';
import { CustomerPolicyModal, PolicyTabType } from './components/CustomerPolicyModal';
import { AuthLoadingScreen } from './components/AuthLoadingScreen';
import { 
  saveOrderToFirestore, 
  auth, 
  onAuthStateChanged, 
  authPersistenceReady,
  getFirebaseIdToken,
  saveUserProfileToFirestore,
  signOutUser,
  getUserAddressesFromFirestore, 
  saveUserAddressToFirestore, 
  deleteUserAddressFromFirestore 
} from './lib/firebase';

export default function App() {
  const [products, setProducts] = useState<Product[]>([]);
  const [trendingProducts, setTrendingProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [wishlist, setWishlist] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('lankabuy_wishlist');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // User Authentication & Addresses State
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(() => {
    return null;
  });
  const [authState, setAuthState] = useState<'AUTH_LOADING' | 'AUTHENTICATED' | 'UNAUTHENTICATED'>('AUTH_LOADING');
  const [authError, setAuthError] = useState<string | null>(null);
  const [userAddresses, setUserAddresses] = useState<UserAddress[]>([]);
  const [isAddressesModalOpen, setIsAddressesModalOpen] = useState(false);
  const [pendingCheckoutIntent, setPendingCheckoutIntent] = useState<PendingCheckoutIntent | null>(null);

  // Admin OAuth Verified Session State
  const [isAdminSessionActive, setIsAdminSessionActive] = useState(false);
  const handledAuthUidRef = React.useRef<string | null>(null);
  const adminCheckedUidRef = React.useRef<string | null>(null);

  // Authoritative admin check: asks the BACKEND (/api/admin/me, server-side
  // Firebase verification + ADMIN_ALLOWED_EMAIL) whether this Firebase user
  // is an administrator. The frontend never decides adminship by email.
  // On a positive answer we force-refresh the ID token once so the freshly
  // provisioned custom claims (admin:true, synced async server-side) are
  // present in all subsequent getIdTokenResult() reads (Firebase pattern).
  const refreshAdminSession = async (fbUser: FirebaseUser) => {
    try {
      if (adminCheckedUidRef.current === fbUser.uid) return;
      adminCheckedUidRef.current = fbUser.uid;
      const token = await fbUser.getIdToken();
      if (!token) return;
      const res = await fetch('/api/admin/me', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        // Definitive non-admin (401/403) -> hide admin UI. Network throws
        // below leave existing state untouched (never clobber on error).
        if (res.status === 401 || res.status === 403) {
          setIsAdminSessionActive(false);
        }
        return;
      }
      const data = await res.json().catch(() => null);
      if (data && data.success && data.authenticated) {
        setIsAdminSessionActive(true);
        try {
          await fbUser.getIdToken(true);
        } catch {
          // Non-fatal: UI gating already resolved authoritatively above.
        }
      } else {
        setIsAdminSessionActive(false);
      }
    } catch {
      // Network/server unavailable: keep current admin UI state unchanged.
    }
  };

  // Active navigation tab
  const [activeNavTab, setActiveNavTab] = useState<'home' | 'products' | 'categories' | 'deals' | 'orders' | 'admin'>('home');

  // Pagination State (Stability & Performance Under Load)
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 12;

  // URL Path Routing & Direct Buy Product preservation
  const [currentPath, setCurrentPath] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      const p = window.location.pathname;
      // NOTE: /admin is intentionally preserved (not stripped). The AdminPortal
      // shell only opens for a verified admin session (see effect below) and
      // every /api/admin/* endpoint re-authorizes server-side, so keeping the
      // path never leaks admin data to unauthorized visitors.
      return p;
    }
    return '/';
  });
  const [directBuyProduct, setDirectBuyProduct] = useState<{ product: Product; quantity: number } | null>(null);

  // Modals state
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [lastPlacedOrder, setLastPlacedOrder] = useState<Order | null>(null);
  const [isAdminPortalOpen, setIsAdminPortalOpen] = useState(false);
  const [policyModalState, setPolicyModalState] = useState<{
    isOpen: boolean;
    tab: PolicyTabType;
  }>({ isOpen: false, tab: 'faq' });

  const handleOpenPolicy = (tab: PolicyTabType) => {
    setPolicyModalState({ isOpen: true, tab });
  };

  const handleOpenAdmin = () => {
    setIsAdminPortalOpen(true);
    if (typeof window !== 'undefined') {
      window.history.pushState({}, '', '/admin');
      setCurrentPath('/admin');
    }
  };

  const handleCloseAdmin = () => {
    setIsAdminPortalOpen(false);
    if (typeof window !== 'undefined' && (currentPath === '/admin' || currentPath.startsWith('/admin'))) {
      window.history.pushState({}, '', '/');
      setCurrentPath('/');
    }
  };

  const verifyCustomerSession = async (): Promise<void> => {
    console.info('[Auth] /api/me request started');
    try {
      const token = await getFirebaseIdToken();
      const response = await fetch('/api/me', {
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      });
      console.info('[Auth] /api/me response', { status: response.status });
      if (!response.ok) {
        console.warn('[Auth] Backend session check deferred', { status: response.status });
      }
    } catch (error) {
      console.warn('[Auth] Backend session check unavailable', {
        message: error instanceof Error ? error.message : 'Request failed',
      });
    }
  };

  // Sync Firebase Auth State
  useEffect(() => {
    let isMounted = true;
    const applyAuthUser = async (user: FirebaseUser | null) => {
      if (!isMounted) return;
      console.info('[Auth] onAuthStateChanged fired', {
        authenticated: Boolean(user),
        hasUid: Boolean(user?.uid),
        hasEmail: Boolean(user?.email),
        currentUserExists: Boolean(auth.currentUser),
      });
      if (user) {
        if (handledAuthUidRef.current === user.uid) return;
        setAuthError(null);
        setAuthState('AUTHENTICATED');
        handledAuthUidRef.current = user.uid;
        console.info('[Auth] Firebase state changed: authenticated user present', {
          provider: user.providerData.map((provider) => provider.providerId).join(',') || 'unknown',
          hasUid: Boolean(user.uid),
          hasEmail: Boolean(user.email),
        });
        const profile: UserProfile = {
          uid: user.uid,
          email: user.email || '',
          displayName: user.displayName || user.email?.split('@')[0] || 'Customer',
          photoURL: user.photoURL || undefined,
          createdAt: new Date().toISOString(),
        };
        setCurrentUser(profile);
        void saveUserProfileToFirestore(user)
          .catch((error) => console.warn('[Auth] User profile sync deferred:', error));
        void getUserAddressesFromFirestore(user.uid)
          .then(setUserAddresses)
          .catch((error) => console.warn('[Auth] Address restore deferred:', error));
        handleLoginSuccess(profile);
        void verifyCustomerSession();
        // Bind Firebase login -> authoritative backend admin check so the
        // Admin navigation appears for the authorized admin email.
        void refreshAdminSession(user);
      } else {
        setAuthState('UNAUTHENTICATED');
        console.info('[Auth] Firebase state changed: signed out');
        handledAuthUidRef.current = null;
        adminCheckedUidRef.current = null;
        setCurrentUser(null);
        setUserAddresses([]);
        // NOTE: admin session intentionally NOT cleared here — a portal
        // password/JWT session is independent of Firebase state and is
        // terminated explicitly by handleSignOut / AdminPortal logout.
      }
    };

    let unsubscribe: (() => void) | undefined;
    void authPersistenceReady
      .then(() => {
        if (!isMounted) return;
        unsubscribe = onAuthStateChanged(auth, applyAuthUser);
      })
      .catch((error) => {
        if (!isMounted) return;
        console.error('[Auth] Persistence initialization failed:', error);
        setAuthError('Authentication could not be initialized.');
        setAuthState('UNAUTHENTICATED');
      });

    return () => {
      isMounted = false;
      unsubscribe?.();
    };
  }, []);

  // Helper to determine if current URL is an order success / tracking page
  const isOrderOrTrackPath = currentPath.startsWith('/order') || currentPath.startsWith('/track') || currentPath === '/success' || currentPath === '/order-success';

  const getOrderIdParam = () => {
    if (currentPath.startsWith('/order/')) return decodeURIComponent(currentPath.replace('/order/', ''));
    if (currentPath.startsWith('/track/')) return decodeURIComponent(currentPath.replace('/track/', ''));
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      return urlParams.get('orderId') || urlParams.get('orderNumber') || urlParams.get('query') || '';
    }
    return '';
  };

  // Real-Signal Analytics Dispatcher (Non-Blocking)
  const logAnalyticsSignal = (productId: string, eventType: 'view' | 'add_to_cart' | 'buy_now' | 'purchase') => {
    try {
      fetch('/api/analytics/event', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productId, eventType }),
      }).catch(() => {
        // silent fail on analytics ping
      });
    } catch {
      // ignore
    }
  };

  // Check Admin OAuth Session from Server on mount
  useEffect(() => {
    // Check for ?admin=open query param or keyboard shortcut
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      if (urlParams.get('admin') === 'open' || urlParams.get('admin') === 'portal') {
        setIsAdminPortalOpen(true);
      }
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 'a') {
        e.preventDefault();
        setIsAdminPortalOpen(true);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Deep-link: when the URL is /admin and a verified admin session becomes
  // active, open the portal shell. Unauthorized visitors keep seeing the
  // normal storefront (portal requires the session; all admin APIs 401).
  useEffect(() => {
    if (isAdminSessionActive && (currentPath === '/admin' || currentPath.startsWith('/admin'))) {
      setIsAdminPortalOpen(true);
    }
  }, [isAdminSessionActive, currentPath]);

  // Fetch Trending Products from Real-Signal Analytics Engine
  useEffect(() => {
    const fetchTrending = async () => {
      try {
        const res = await fetch('/api/products/trending?limit=6');
        const data = await res.json();
        if (data.success && Array.isArray(data.products)) {
          setTrendingProducts(data.products);
        }
      } catch (err) {
        console.warn('Notice: Trending products retrieval error:', err);
      }
    };
    fetchTrending();
  }, []);

  // Synchronize browser history / back / forward navigation
  useEffect(() => {
    const handlePopState = () => {
      const path = window.location.pathname;
      setCurrentPath(path);
      if (path !== '/checkout' && path !== '/buy-now') {
        setDirectBuyProduct(null);
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);


  // Voucher discount passed from Cart to Checkout
  const [appliedDiscount, setAppliedDiscount] = useState(0);
  const [appliedVoucherCode, setAppliedVoucherCode] = useState('');

  // Toast Notification
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Filters State
  const [filters, setFilters] = useState<FilterState>({
    category: 'all',
    searchQuery: '',
    minPrice: 0,
    maxPrice: 200000,
    minRating: 0,
    onlyFreeShipping: false,
    onlyFlashDeals: false,
    sortBy: 'popular',
    paymentMethodFilter: 'all',
  });

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Save wishlist
  useEffect(() => {
    try {
      localStorage.setItem('lankabuy_wishlist', JSON.stringify(wishlist));
    } catch {
      // ignore
    }
  }, [wishlist]);

  const toggleWishlist = (productId: string) => {
    setWishlist((prev) => {
      const exists = prev.includes(productId);
      if (exists) {
        showToast('Removed from Wishlist');
        return prev.filter((id) => id !== productId);
      } else {
        showToast('Saved to Wishlist ❤️');
        return [...prev, productId];
      }
    });
  };

  // Navigation to Dedicated Full-Screen Login Page (/login)
  const handleNavigateToLogin = (intent?: PendingCheckoutIntent) => {
    if (intent) {
      setPendingCheckoutIntent(intent);
      localStorage.setItem('lankabuy_pending_checkout_intent', JSON.stringify(intent));
    }
    if (currentPath && currentPath !== '/login') {
      localStorage.setItem('lankabuy_pre_auth_path', currentPath);
    }
    window.history.pushState({}, '', '/login');
    setCurrentPath('/login');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // User Authentication Handlers
  const handleLoginSuccess = async (user: UserProfile) => {
    setCurrentUser(user);
    void getUserAddressesFromFirestore(user.uid)
      .then(setUserAddresses)
      .catch((error) => console.warn('[Auth] Address restore deferred:', error));
    showToast(`Welcome, ${user.displayName || 'Customer'}! 👋`);

    // Process pending checkout intent from state or localStorage
    let intent = pendingCheckoutIntent;
    const storedIntentStr = localStorage.getItem('lankabuy_pending_checkout_intent');
    const storedPreAuthPath = localStorage.getItem('lankabuy_pre_auth_path');

    if (!intent && storedIntentStr) {
      try {
        intent = JSON.parse(storedIntentStr);
      } catch (e) {
        console.error('[Intent Parse Error]:', e);
      }
    }

    if (intent) {
      setPendingCheckoutIntent(null);
      localStorage.removeItem('lankabuy_pending_checkout_intent');
      localStorage.removeItem('lankabuy_pre_auth_path');

      if (intent.type === 'buy_now' && intent.product) {
        handleBuyNow(intent.product, intent.quantity || 1, user);
      } else if (intent.type === 'cart_checkout') {
        const params = new URLSearchParams();
        if (intent.appliedDiscount) params.append('discount', intent.appliedDiscount.toString());
        if (intent.appliedVoucherCode) params.append('voucher', intent.appliedVoucherCode);
        const newUrl = `/checkout${params.toString() ? '?' + params.toString() : ''}`;
        window.history.pushState({}, '', newUrl);
        setCurrentPath('/checkout');
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
      return;
    }

    // Restore pre-auth path if stored and not login page
    if (storedPreAuthPath && storedPreAuthPath !== '/' && storedPreAuthPath !== '/login') {
      localStorage.removeItem('lankabuy_pre_auth_path');
      window.history.pushState({}, '', storedPreAuthPath);
      setCurrentPath(storedPreAuthPath);
    } else if (typeof window !== 'undefined' && window.location.pathname.startsWith('/admin')) {
      // Preserve /admin deep link: the portal opens automatically once the
      // authoritative admin session verifies; others just see the store.
      setCurrentPath(window.location.pathname);
    } else {
      window.history.pushState({}, '', '/');
      setCurrentPath('/');
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSignOut = async () => {
    await signOutUser();
    try {
      await fetch('/api/admin/logout', { method: 'POST', credentials: 'include' });
    } catch {}
    setIsAdminSessionActive(false);
    setCurrentUser(null);
    setUserAddresses([]);
    showToast('Signed out successfully.');
  };

  const handleSaveAddress = async (address: UserAddress) => {
    const userId = currentUser?.uid;
    if (!userId) {
      showToast('Please sign in before saving a shipping address.');
      throw new Error('Authenticated user is required.');
    }
    try {
      await saveUserAddressToFirestore(userId, address);
      const updated = await getUserAddressesFromFirestore(userId);
      setUserAddresses(updated);
      showToast('Shipping address saved!');
    } catch (error) {
      console.error('[Addresses] Save request failed:', error);
      showToast(error instanceof Error ? error.message : 'Unable to save shipping address.');
      throw error;
    }
  };

  const handleDeleteAddress = async (addressId: string) => {
    const userId = currentUser?.uid || 'guest-user';
    await deleteUserAddressFromFirestore(userId, addressId);
    const updated = await getUserAddressesFromFirestore(userId);
    setUserAddresses(updated);
    showToast('Address removed.');
  };

  const appProductsCacheRef = React.useRef<Map<string, Product[]>>(new Map());

  // Fetch products from backend API with Debounce & AbortController & Client Memory Caching
  useEffect(() => {
    const cacheKey = `${filters.category}:${filters.searchQuery}:${filters.sortBy}:${filters.paymentMethodFilter || 'all'}`;
    const cachedProducts = appProductsCacheRef.current.get(cacheKey);

    if (cachedProducts) {
      setProducts(cachedProducts);
      setLoading(false);
      setFetchError(null);
    } else {
      setLoading(true);
      setFetchError(null);
    }

    const abortController = new AbortController();

    const fetchTimer = setTimeout(async () => {
      try {
        const params = new URLSearchParams();
        if (filters.category !== 'all') params.append('category', filters.category);
        if (filters.searchQuery) params.append('search', filters.searchQuery);
        if (filters.sortBy) params.append('sort', filters.sortBy);
        if (filters.paymentMethodFilter && filters.paymentMethodFilter !== 'all') {
          params.append('paymentFilter', filters.paymentMethodFilter);
        }

        const res = await fetch(`/api/products?${params.toString()}`, {
          signal: abortController.signal
        });
        const data = await res.json();

        if (abortController.signal.aborted) return;

        if (data.success && Array.isArray(data.products)) {
          setProducts(data.products);
          appProductsCacheRef.current.set(cacheKey, data.products);
        } else {
          if (!cachedProducts) setProducts([]);
        }
      } catch (e: any) {
        if (e.name !== 'AbortError') {
          console.warn('Error fetching products from API:', e);
          if (!cachedProducts) {
            setFetchError('Unable to connect to product server. Click below to retry.');
            setProducts([]);
          }
        }
      } finally {
        if (!abortController.signal.aborted) {
          setLoading(false);
        }
      }
    }, filters.searchQuery ? 300 : 0);

    return () => {
      clearTimeout(fetchTimer);
      abortController.abort();
    };
  }, [filters.category, filters.searchQuery, filters.sortBy, filters.paymentMethodFilter]);

  if (authState === 'AUTH_LOADING') {
    return <AuthLoadingScreen error={authError} />;
  }

  const fetchProducts = async () => {
    setLoading(true);
    setFetchError(null);
    try {
      const params = new URLSearchParams();
      if (filters.category !== 'all') params.append('category', filters.category);
      if (filters.searchQuery) params.append('search', filters.searchQuery);
      if (filters.sortBy) params.append('sort', filters.sortBy);
      if (filters.paymentMethodFilter && filters.paymentMethodFilter !== 'all') {
        params.append('paymentFilter', filters.paymentMethodFilter);
      }

      const res = await fetch(`/api/products?${params.toString()}`);
      const data = await res.json();
      if (data.success && Array.isArray(data.products)) {
        setProducts(data.products);
      } else {
        setProducts([]);
      }
    } catch (e) {
      console.warn('Error fetching products from API:', e);
      setFetchError('Unable to connect to product server. Click below to retry.');
      setProducts([]);
    } finally {
      setLoading(false);
    }
  };

  // Tab change handler
  const handleNavTabChange = (tab: 'home' | 'products' | 'categories' | 'deals' | 'orders') => {
    setSelectedProduct(null);
    setActiveNavTab(tab);
    setCurrentPage(1);
    if (tab === 'deals') {
      setFilters((prev) => ({ ...prev, onlyFlashDeals: true, category: 'all' }));
    } else if (tab === 'home' || tab === 'products') {
      setFilters((prev) => ({ ...prev, onlyFlashDeals: false }));
    } else if (tab === 'orders') {
      handleOpenMyOrders();
    }
  };

  // Filter local attributes + CJ Dropshipping requirement + Payment Method filter
  const filteredProducts = products.filter((p) => {
    if (filters.onlyFreeShipping && !p.freeShipping) return false;
    // Requirement 4: Deals section tag filter for CJ dropshipping inventory
    if (filters.onlyFlashDeals) {
      if (!p.isFlashDeal) return false;
      if (p.source && p.source !== 'cj_dropshipping' && p.supplierOrigin === 'Sri Lanka') return false;
    }
    if (filters.minRating > 0 && p.rating < filters.minRating) return false;
    if (p.price < filters.minPrice || p.price > filters.maxPrice) return false;
    if (filters.paymentMethodFilter === 'cod_available' && p.allowCOD === false) return false;
    if (filters.paymentMethodFilter === 'card_only' && (p.allowCard === false || p.allowCOD !== false)) return false;
    return true;
  });

  // Paginated View Slice (Performance & Load Stability)
  const paginatedProducts = filteredProducts.slice(0, currentPage * itemsPerPage);

  // Cart Handlers
  const handleAddToCart = (product: Product, quantity = 1) => {
    logAnalyticsSignal(product.id, 'add_to_cart');
    setCartItems((prev) => {
      const existing = prev.find((item) => item.product.id === product.id);
      if (existing) {
        return prev.map((item) =>
          item.product.id === product.id
            ? { ...item, quantity: item.quantity + quantity }
            : item
        );
      }
      return [...prev, { product, quantity }];
    });
    showToast(`Added "${product.title.slice(0, 24)}..." to Cart!`);
  };

  // AUTH-GATED CHECKOUT: Requires user authentication before checkout
  const handleBuyNow = (product: Product, quantity = 1, overrideUser?: UserProfile | null) => {
    logAnalyticsSignal(product.id, 'buy_now');
    const userToVerify = overrideUser !== undefined ? overrideUser : currentUser;

    if (!userToVerify) {
      handleNavigateToLogin({
        type: 'buy_now',
        product,
        quantity,
      });
      return;
    }

    // Preserve product data for the checkout page
    setDirectBuyProduct({ product, quantity });

    // Navigate to dedicated URL path (/checkout)
    const params = new URLSearchParams({
      productId: product.id,
      price: product.price.toString(),
      quantity: quantity.toString(),
      title: product.title,
      image: product.imageUrl || '',
      sku: product.sku || '',
      shipping: product.freeShipping ? '0' : '350',
      wholesaleCost: (product.wholesaleCost || 0).toString(),
      category: product.category || ''
    });

    const newUrl = `/checkout?${params.toString()}`;
    window.history.pushState({ productId: product.id, price: product.price, quantity }, '', newUrl);
    setCurrentPath('/checkout');
    setIsCheckoutOpen(false);
  };

  const handleProceedToCheckoutFromCart = (discount: number, voucherCode: string) => {
    if (!currentUser) {
      setIsCartOpen(false);
      handleNavigateToLogin({
        type: 'cart_checkout',
        appliedDiscount: discount,
        appliedVoucherCode: voucherCode,
      });
      return;
    }

    setDirectBuyProduct(null);
    setIsCartOpen(false);
    setAppliedDiscount(discount);
    setAppliedVoucherCode(voucherCode);
    const params = new URLSearchParams();
    if (discount > 0) params.append('discount', discount.toString());
    if (voucherCode) params.append('voucher', voucherCode);
    const newUrl = `/checkout${params.toString() ? '?' + params.toString() : ''}`;
    window.history.pushState({}, '', newUrl);
    setCurrentPath('/checkout');
  };

  const handleOpenMyOrders = () => {
    setSelectedProduct(null);
    setIsCartOpen(false);
    setIsCheckoutOpen(false);
    window.history.pushState({}, '', '/orders');
    setCurrentPath('/orders');
    setActiveNavTab('orders');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleUpdateQuantity = (productId: string, quantity: number) => {
    if (quantity <= 0) {
      handleRemoveItem(productId);
      return;
    }
    setCartItems((prev) =>
      prev.map((item) =>
        item.product.id === productId ? { ...item, quantity } : item
      )
    );
  };

  const handleRemoveItem = (productId: string) => {
    setCartItems((prev) => prev.filter((item) => item.product.id !== productId));
    showToast('Item removed from cart');
  };

  const handleProceedToCheckout = (discount: number, voucherCode: string) => {
    setAppliedDiscount(discount);
    setAppliedVoucherCode(voucherCode);
    setDirectBuyProduct(null);
    setIsCartOpen(false);
    setIsCheckoutOpen(false); // Modal popup is disabled
    window.history.pushState({}, '', '/checkout');
    setCurrentPath('/checkout');
  };

  const handleCheckoutBack = () => {
    window.history.pushState({}, '', '/');
    setCurrentPath('/');
    setDirectBuyProduct(null);
  };

  const handleOrderSuccess = (newOrder: Order) => {
    // Log purchase signals for real trending engine
    newOrder.items.forEach((item) => {
      logAnalyticsSignal(item.productId, 'purchase');
    });

    setOrders((prev) => [newOrder, ...prev]);
    setLastPlacedOrder(newOrder);
    setCartItems([]);
    setDirectBuyProduct(null);
    setAppliedDiscount(0);
    setAppliedVoucherCode('');
    setIsCheckoutOpen(false);
    setIsCartOpen(false);
    setSelectedProduct(null);

    // Save order persistently to Firestore
    saveOrderToFirestore(newOrder).catch((err) => {
      console.warn('[Firebase] Order auto-sync notice:', err);
    });

    // Smoothly redirect to dedicated order confirmation page
    const orderUrl = `/order/${encodeURIComponent(newOrder.orderNumber)}`;
    window.history.pushState({ orderId: newOrder.orderNumber }, '', orderUrl);
    setCurrentPath(orderUrl);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };


  const handleOpenTrack = (query?: string) => {
    setSelectedProduct(null);
    setIsCartOpen(false);
    setIsCheckoutOpen(false);
    const targetUrl = query ? `/order/${encodeURIComponent(query)}` : '/track';
    window.history.pushState({}, '', targetUrl);
    setCurrentPath(targetUrl);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Dedicated Full-Screen Login Page View (/login)
  if (currentPath === '/login' && !currentUser) {
    return (
      <div className="min-h-screen w-full font-sans selection:bg-orange-500 selection:text-white">
        {toastMessage && (
          <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white text-xs px-4 py-3 rounded-2xl shadow-2xl flex items-center space-x-2 border border-slate-700 animate-bounce">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{toastMessage}</span>
          </div>
        )}
        <LoginPage
          onLoginSuccess={handleLoginSuccess}
          onBackToHome={() => {
            const preAuth = localStorage.getItem('lankabuy_pre_auth_path');
            const target = preAuth && preAuth !== '/login' ? preAuth : '/';
            window.history.pushState({}, '', target);
            setCurrentPath(target);
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }}
          pendingCheckoutIntent={pendingCheckoutIntent}
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col font-sans selection:bg-orange-500 selection:text-white pb-16 md:pb-0 w-full max-w-full overflow-x-hidden">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-20 md:bottom-6 right-4 sm:right-6 z-50 bg-slate-900 text-white text-xs px-3.5 sm:px-4 py-2.5 sm:py-3 rounded-2xl shadow-2xl flex items-center space-x-2 border border-slate-700 animate-bounce">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* LankaBuy Header */}
      <Header
        cartItems={cartItems}
        onOpenCart={() => setIsCartOpen(true)}
        onOpenTrack={() => handleOpenTrack()}
        onOpenOrders={handleOpenMyOrders}
        searchQuery={filters.searchQuery}
        onSearchChange={(q) => {
          setSelectedProduct(null);
          setFilters((prev) => ({ ...prev, searchQuery: q }));
          if (q.trim().length > 0 && activeNavTab !== 'deals' && activeNavTab !== 'products') {
            setActiveNavTab('products');
          }
        }}
        selectedCategory={filters.category}
        onCategoryChange={(cat) => {
          setSelectedProduct(null);
          setFilters((prev) => ({ ...prev, category: cat }));
        }}
        activeNavTab={activeNavTab}
        onNavTabChange={handleNavTabChange}
        currentUser={currentUser}
        onOpenAuthModal={() => handleNavigateToLogin()}
        onOpenMyAddresses={() => setIsAddressesModalOpen(true)}
        onSignOut={handleSignOut}
        isAdmin={isAdminSessionActive}
        onOpenAdmin={handleOpenAdmin}
      />

      {/* Main View: Dedicated Checkout Page, Dedicated Order Success & Tracking Page, Product Details Page, Isolated Countries Tab, or Domestic Catalog View */}
      {currentPath === '/checkout' || currentPath === '/buy-now' ? (
        <CheckoutPage
          cartItems={cartItems}
          directProduct={directBuyProduct?.product || null}
          directQuantity={directBuyProduct?.quantity || 1}
          initialDiscount={appliedDiscount}
          initialVoucherCode={appliedVoucherCode}
          onBack={handleCheckoutBack}
          onOrderSuccess={handleOrderSuccess}
          allProducts={products}
          userAddresses={userAddresses}
          currentUser={currentUser}
          onOpenAddAddress={() => setIsAddressesModalOpen(true)}
        />
      ) : currentPath === '/orders' || activeNavTab === 'orders' ? (
        <MyOrdersPage
          currentUser={currentUser}
          allOrders={orders}
          onOpenAuthModal={() => handleNavigateToLogin()}
          onNavigateHome={() => {
            window.history.pushState({}, '', '/');
            setCurrentPath('/');
            setActiveNavTab('home');
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }}
          onTrackOrder={(orderNumber) => handleOpenTrack(orderNumber)}
        />
      ) : isOrderOrTrackPath ? (
        <OrderSuccessPage
          order={lastPlacedOrder}
          orderIdParam={getOrderIdParam()}
          currentUser={currentUser}
          onOpenAuthModal={() => handleNavigateToLogin()}
          onOpenMyOrders={handleOpenMyOrders}
          onBackToHome={() => {
            window.history.pushState({}, '', '/');
            setCurrentPath('/');
            setLastPlacedOrder(null);
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }}
          onExploreProducts={() => {
            window.history.pushState({}, '', '/');
            setCurrentPath('/');
            setActiveNavTab('products');
            setLastPlacedOrder(null);
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }}
        />
      ) : selectedProduct ? (
        <ProductDetailPage
          product={selectedProduct}
          onBack={() => setSelectedProduct(null)}
          onAddToCart={(p, q) => handleAddToCart(p, q)}
          onBuyNow={(p, q) => handleBuyNow(p, q)}
          onOpenCart={() => setIsCartOpen(true)}
          cartCount={cartItems.reduce((acc, i) => acc + i.quantity, 0)}
          relatedProducts={products.filter(
            (p) => p.id !== selectedProduct.id && (p.category === selectedProduct.category || p.subcategory === selectedProduct.subcategory)
          )}
          onSelectProduct={(p) => setSelectedProduct(p)}
        />
      ) : activeNavTab === 'deals' ? (
        <CountriesTab
          searchQuery={filters.searchQuery}
          onAddToCart={(p, q) => handleAddToCart(p, q)}
          onBuyNow={(p, q) => handleBuyNow(p, q)}
          onOpenCart={() => setIsCartOpen(true)}
          onSelectProduct={(p) => setSelectedProduct(p)}
        />
      ) : (
        <>
          {/* Category Bar */}
          <CategoryBar
            selectedCategory={filters.category}
            onSelectCategory={(catId) => {
              setFilters((prev) => ({ ...prev, category: catId }));
              if (activeNavTab !== 'home' && activeNavTab !== 'products') {
                setActiveNavTab('products');
              }
            }}
          />

          {/* Main Content Area */}
          <main className="max-w-7xl mx-auto px-2.5 sm:px-4 py-3 sm:py-4 w-full flex-1 min-w-0">
            {/* Controls & Filter Bar */}
            <div className="bg-white p-3 sm:p-4 rounded-2xl border border-slate-200 shadow-xs mb-4 sm:mb-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-3 sm:gap-4 w-full">
              {/* Left: Active collection title */}
              <div className="min-w-0 w-full md:w-auto">
                <div className="flex items-center space-x-2 flex-wrap gap-y-1">
                  <Sparkles className="w-4 h-4 text-orange-500 shrink-0" />
                  <h2 className="text-sm sm:text-base font-black text-slate-800 capitalize truncate">
                    {filters.onlyFlashDeals
                      ? '⚡ CJ Dropshipping & Mega Flash Deals'
                      : filters.category === 'all'
                      ? 'All Verified Marketplace Products'
                      : `${filters.category.replace('-', ' ')} Catalog`}
                  </h2>
                  <span className="text-[10px] sm:text-xs bg-orange-50 text-orange-600 font-bold px-2 py-0.5 rounded-full border border-orange-200 shrink-0">
                    {filteredProducts.length} items
                  </span>
                </div>
                <p className="text-[11px] sm:text-xs text-slate-500 mt-0.5 sm:mt-1">
                  Direct verified merchant pricing in LKR (Rs.) with automated islandwide delivery dispatch.
                </p>
              </div>

              {/* Right: Quick Filters & Sorting */}
              <div className="flex flex-wrap items-center gap-2 text-xs w-full md:w-auto justify-start md:justify-end">
                {/* Flash Deals Toggle */}
                <button
                  onClick={() => setFilters((prev) => ({ ...prev, onlyFlashDeals: !prev.onlyFlashDeals }))}
                  className={`px-3 py-1.5 sm:py-2 rounded-xl font-bold transition flex items-center cursor-pointer text-xs ${
                    filters.onlyFlashDeals
                      ? 'bg-orange-500 text-white shadow-xs'
                      : 'bg-slate-100 text-slate-700 hover:bg-orange-50 hover:text-orange-600'
                  }`}
                >
                  <Flame className="w-3.5 h-3.5 mr-1" />
                  <span>Deals</span>
                </button>

                {/* Free Shipping Toggle */}
                <button
                  onClick={() => setFilters((prev) => ({ ...prev, onlyFreeShipping: !prev.onlyFreeShipping }))}
                  className={`px-3 py-1.5 sm:py-2 rounded-xl font-bold transition flex items-center cursor-pointer text-xs ${
                    filters.onlyFreeShipping
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'bg-slate-100 text-slate-700 hover:bg-emerald-50 hover:text-emerald-700'
                  }`}
                >
                  <Truck className="w-3.5 h-3.5 mr-1" />
                  <span>Free Delivery</span>
                </button>

                {/* Payment Method Filter Dropdown */}
                <div className="flex items-center bg-slate-100 rounded-xl px-2.5 sm:px-3 py-1.5 sm:py-2 border border-slate-200 text-xs font-semibold text-slate-700">
                  <CreditCard className="w-3.5 h-3.5 mr-1 text-slate-500 shrink-0" />
                  <span className="mr-1 text-slate-400 hidden xs:inline">Payment:</span>
                  <select
                    value={filters.paymentMethodFilter || 'all'}
                    onChange={(e) => setFilters((prev) => ({ ...prev, paymentMethodFilter: e.target.value as any }))}
                    className="bg-transparent font-bold text-slate-800 focus:outline-hidden cursor-pointer text-xs"
                  >
                    <option value="cod_available">💵 COD (Cash on Delivery)</option>
                    <option value="card_only">💳 Card Only</option>
                    <option value="all">🔄 Card or COD</option>
                  </select>
                </div>

                {/* Sort Dropdown */}
                <div className="flex items-center bg-slate-100 rounded-xl px-2.5 sm:px-3 py-1.5 sm:py-2 border border-slate-200 text-xs font-semibold text-slate-700">
                  <ArrowUpDown className="w-3.5 h-3.5 mr-1 text-slate-500 shrink-0" />
                  <span className="mr-1 text-slate-400 hidden xs:inline">Sort:</span>
                  <select
                    value={filters.sortBy}
                    onChange={(e) => setFilters((prev) => ({ ...prev, sortBy: e.target.value as any }))}
                    className="bg-transparent font-bold text-slate-800 focus:outline-hidden cursor-pointer text-xs"
                  >
                    <option value="popular">Popularity / Trending</option>
                    <option value="price-low">Price: Low to High</option>
                    <option value="price-high">Price: High to Low</option>
                    <option value="rating">Top Rating</option>
                    <option value="discount">Biggest % Discount</option>
                  </select>
                </div>

                {/* Reset Filters */}
                {(filters.category !== 'all' || filters.searchQuery || filters.onlyFreeShipping || filters.onlyFlashDeals || (filters.paymentMethodFilter && filters.paymentMethodFilter !== 'all')) && (
                  <button
                    onClick={() =>
                      setFilters({
                        category: 'all',
                        searchQuery: '',
                        minPrice: 0,
                        maxPrice: 200000,
                        minRating: 0,
                        onlyFreeShipping: false,
                        onlyFlashDeals: false,
                        sortBy: 'popular',
                        paymentMethodFilter: 'all',
                      })
                    }
                    className="text-slate-500 hover:text-orange-600 px-2 py-1 flex items-center cursor-pointer font-medium text-xs"
                    title="Reset all filters"
                  >
                    <RotateCcw className="w-3.5 h-3.5 mr-1" />
                    <span>Reset</span>
                  </button>
                )}
              </div>
            </div>

            {/* Error Retry Card */}
            {fetchError ? (
              <div className="bg-red-50 border border-red-200 rounded-2xl p-6 text-center max-w-md mx-auto my-6">
                <AlertCircle className="w-10 h-10 text-red-500 mx-auto mb-2" />
                <h3 className="font-bold text-red-900 text-sm">{fetchError}</h3>
                <button
                  onClick={fetchProducts}
                  className="mt-3 bg-red-600 text-white font-bold text-xs px-4 py-2 rounded-xl flex items-center space-x-1.5 mx-auto hover:bg-red-700 transition cursor-pointer"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Retry Connection</span>
                </button>
              </div>
            ) : null}

            {/* Product Grid */}
            {loading ? (
              <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2.5 sm:gap-4 lg:gap-5 w-full">
                {Array.from({ length: 8 }).map((_, i) => (
                  <SkeletonProductCard key={i} />
                ))}
              </div>
            ) : filteredProducts.length === 0 ? (
              <div className="bg-white rounded-2xl sm:rounded-3xl p-8 sm:p-12 text-center border border-slate-200 shadow-xs max-w-lg mx-auto w-full">
                <Search className="w-10 h-10 sm:w-12 sm:h-12 text-slate-300 mx-auto mb-3" />
                <h3 className="text-sm sm:text-base font-bold text-slate-800">No matching products found</h3>
                <p className="text-xs text-slate-500 mt-1">
                  Try adjusting your search query or reset category filters to view all LankaBuy collections.
                </p>
                <button
                  onClick={() =>
                    setFilters({
                      category: 'all',
                      searchQuery: '',
                      minPrice: 0,
                      maxPrice: 200000,
                      minRating: 0,
                      onlyFreeShipping: false,
                      onlyFlashDeals: false,
                      sortBy: 'popular',
                    })
                  }
                  className="mt-4 bg-orange-500 text-white text-xs font-bold px-5 py-2.5 rounded-xl hover:bg-orange-600 transition cursor-pointer shadow-xs"
                >
                  Show All Products
                </button>
              </div>
            ) : (
              <div className="space-y-6">
                <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2.5 sm:gap-4 lg:gap-5 w-full">
                  {paginatedProducts.map((product) => (
                    <ProductCard
                      key={product.id}
                      product={product}
                      onAddToCart={(p) => handleAddToCart(p)}
                      onBuyNow={(p) => handleBuyNow(p)}
                      onOpenDetails={(p) => setSelectedProduct(p)}
                    />
                  ))}
                </div>

                {/* Pagination Control / Load More */}
                {filteredProducts.length > currentPage * itemsPerPage && (
                  <div className="text-center pt-4">
                    <button
                      onClick={() => setCurrentPage((prev) => prev + 1)}
                      className="bg-white hover:bg-slate-50 text-slate-800 font-bold text-xs px-6 py-3 rounded-xl border border-slate-300 shadow-xs transition cursor-pointer"
                    >
                      Load More Products ({filteredProducts.length - currentPage * itemsPerPage} remaining)
                    </button>
                  </div>
                )}
              </div>
            )}
          </main>
        </>
      )}

      {/* Professional LankaBuy E-Commerce Footer */}
      <footer className="bg-slate-900 text-slate-400 text-xs mt-8 sm:mt-12 border-t border-slate-800 w-full">
        <div className="max-w-7xl mx-auto px-4 py-8 sm:py-12 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 sm:gap-8 w-full">
          {/* Column 1: Company Bio */}
          <div className="min-w-0 space-y-3">
            <div>
              <LankaBuyLogo size="md" variant="white" />
            </div>
            <p className="text-xs text-slate-300 leading-relaxed break-words font-medium">
              Sri Lanka's trusted and fastest online shopping destination. Providing genuine high-quality products, verified seller inventories, and reliable express delivery across all 25 districts.
            </p>
            <div className="pt-2 space-y-1.5 border-t border-slate-800/80 text-[11px] text-slate-400">
              <div className="flex items-center space-x-2">
                <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>100% Genuine Products &amp; Buyer Protection</span>
              </div>
              <div className="flex items-center space-x-2">
                <Truck className="w-4 h-4 text-orange-400 shrink-0" />
                <span>Express Doorstep Delivery Across Sri Lanka</span>
              </div>
            </div>
          </div>

          {/* Column 2: Customer Service / Quick Links */}
          <div className="min-w-0">
            <h4 className="text-white font-bold mb-3 uppercase tracking-wider text-[11px] flex items-center">
              <span className="w-1.5 h-1.5 rounded-full bg-orange-500 mr-2"></span>
              Customer Service
            </h4>
            <ul className="space-y-2.5 text-xs">
              <li>
                <button 
                  onClick={() => handleOpenTrack()} 
                  className="hover:text-orange-400 text-slate-300 transition cursor-pointer flex items-center space-x-1.5"
                >
                  <Truck className="w-3.5 h-3.5 text-orange-500" />
                  <span>Track Your Order</span>
                </button>
              </li>
              <li>
                <button 
                  onClick={() => handleOpenPolicy('faq')} 
                  className="hover:text-orange-400 text-slate-300 transition cursor-pointer"
                >
                  Help &amp; FAQs
                </button>
              </li>
              <li>
                <button 
                  onClick={() => handleOpenPolicy('returns')} 
                  className="hover:text-orange-400 text-slate-300 transition cursor-pointer"
                >
                  Return &amp; Refund Policy
                </button>
              </li>
              <li>
                <button 
                  onClick={() => handleOpenPolicy('terms')} 
                  className="hover:text-orange-400 text-slate-300 transition cursor-pointer"
                >
                  Terms &amp; Conditions
                </button>
              </li>
              <li>
                <button 
                  onClick={() => handleOpenPolicy('privacy')} 
                  className="hover:text-orange-400 text-slate-300 transition cursor-pointer"
                >
                  Privacy Policy
                </button>
              </li>
            </ul>
          </div>

          {/* Column 3: Islandwide Express Delivery & Guarantees */}
          <div className="min-w-0">
            <h4 className="text-white font-bold mb-3 uppercase tracking-wider text-[11px] flex items-center">
              <span className="w-1.5 h-1.5 rounded-full bg-orange-500 mr-2"></span>
              Delivery &amp; Guarantees
            </h4>
            <div className="space-y-2.5 text-xs">
              <div className="p-3 bg-slate-950/60 rounded-2xl border border-slate-800/80 space-y-2">
                <div className="flex justify-between items-center text-slate-300">
                  <span className="text-slate-400">Colombo &amp; Suburbs:</span>
                  <span className="font-bold text-orange-400">1 - 2 Business Days</span>
                </div>
                <div className="flex justify-between items-center text-slate-300">
                  <span className="text-slate-400">Islandwide Outstation:</span>
                  <span className="font-bold text-slate-200">2 - 4 Business Days</span>
                </div>
                <div className="flex justify-between items-center text-slate-300">
                  <span className="text-slate-400">Return Window:</span>
                  <span className="font-bold text-emerald-400">7 Days Easy Return</span>
                </div>
              </div>
              <p className="text-[11px] text-slate-400 leading-normal">
                Direct doorstep dispatch via licensed courier networks with tracking updates across Sri Lanka.
              </p>
            </div>
          </div>

          {/* Column 4: Payment & Security */}
          <div className="min-w-0">
            <h4 className="text-white font-bold mb-3 uppercase tracking-wider text-[11px] flex items-center">
              <span className="w-1.5 h-1.5 rounded-full bg-orange-500 mr-2"></span>
              Payment &amp; Security
            </h4>
            <div className="p-3.5 bg-slate-950 rounded-2xl border border-slate-800 text-[11px] space-y-3">
              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-bold tracking-wider mb-1.5">
                  Accepted Payment Methods:
                </span>
                <div className="flex flex-wrap gap-1.5">
                  <span className="px-2 py-1 rounded-md bg-slate-800 text-orange-400 font-black text-[10px]">
                    KOKO (Pay in 3)
                  </span>
                  <span className="px-2 py-1 rounded-md bg-slate-800 text-emerald-400 font-bold text-[10px]">
                    LankaQR
                  </span>
                  <span className="px-2 py-1 rounded-md bg-slate-800 text-blue-400 font-bold text-[10px]">
                    VISA / Master
                  </span>
                  <span className="px-2 py-1 rounded-md bg-slate-800 text-amber-300 font-bold text-[10px]">
                    💵 Cash on Delivery
                  </span>
                </div>
              </div>

              <div className="pt-2 border-t border-slate-800 flex justify-between items-center text-slate-300">
                <span className="text-slate-400">Security Encryption:</span>
                <span className="font-mono text-emerald-400 font-bold text-right flex items-center space-x-1">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>256-Bit SSL Protected</span>
                </span>
              </div>
              <div className="flex justify-between items-center text-slate-300">
                <span className="text-slate-400">Store Currency:</span>
                <span className="font-bold text-slate-200 text-right">Sri Lankan Rupee (LKR / Rs.)</span>
              </div>
            </div>
          </div>
        </div>

        {/* Copyright Bar */}
        <div className="bg-slate-950 py-4 px-4 border-t border-slate-800/80 text-center text-[11px] text-slate-500">
          <p>© 2026 LankaBuy. All rights reserved. Sri Lanka's Trusted E-Commerce Marketplace.</p>
        </div>
      </footer>

      {/* Mobile Bottom Navigation Bar (Hidden when on Product Details, Checkout, or Order Success Page to prevent overlapping) */}
      {!selectedProduct && currentPath !== '/checkout' && currentPath !== '/buy-now' && !isOrderOrTrackPath && (
        <div className="fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-slate-200 md:hidden flex items-center justify-around py-2 px-1 shadow-lg w-full max-w-full">
          <button
            onClick={() => { setFilters((prev) => ({ ...prev, category: 'all', onlyFlashDeals: false })); handleNavTabChange('home'); }}
            className={`flex flex-col items-center justify-center p-1 text-[10px] font-bold cursor-pointer min-w-0 flex-1 ${
              activeNavTab === 'home' ? 'text-orange-500' : 'text-slate-500'
            }`}
          >
            <Home className="w-5 h-5" />
            <span>Home</span>
          </button>

          <button
            onClick={() => { handleNavTabChange('categories'); }}
            className={`flex flex-col items-center justify-center p-1 text-[10px] font-bold cursor-pointer min-w-0 flex-1 ${
              activeNavTab === 'categories' ? 'text-orange-500' : 'text-slate-500'
            }`}
          >
            <Layers className="w-5 h-5" />
            <span>Categories</span>
          </button>

          <button
            onClick={() => { handleNavTabChange('deals'); }}
            className={`flex flex-col items-center justify-center p-1 text-[10px] font-bold cursor-pointer min-w-0 flex-1 ${
              activeNavTab === 'deals' ? 'text-orange-500' : 'text-slate-500'
            }`}
          >
            <Globe className="w-5 h-5" />
            <span>Countries</span>
          </button>

          <button
            onClick={() => handleOpenTrack()}
            className="flex flex-col items-center justify-center p-1 text-[10px] font-bold text-slate-500 cursor-pointer min-w-0 flex-1"
          >
            <Truck className="w-5 h-5" />
            <span>Track</span>
          </button>

          <button
            onClick={() => setIsCartOpen(true)}
            className="flex flex-col items-center justify-center p-1 text-[10px] font-bold text-orange-500 relative cursor-pointer min-w-0 flex-1"
          >
            <div className="relative">
              <ShoppingBag className="w-5 h-5" />
              {cartItems.length > 0 && (
                <span className="absolute -top-1.5 -right-2 bg-orange-500 text-white text-[9px] font-black w-4 h-4 rounded-full flex items-center justify-center">
                  {cartItems.reduce((acc, i) => acc + i.quantity, 0)}
                </span>
              )}
            </div>
            <span>Cart</span>
          </button>
        </div>
      )}

      {/* Modals */}
      <CartDrawer
        isOpen={isCartOpen}
        onClose={() => setIsCartOpen(false)}
        cartItems={cartItems}
        onUpdateQuantity={handleUpdateQuantity}
        onRemoveItem={handleRemoveItem}
        onProceedToCheckout={handleProceedToCheckoutFromCart}
      />

      <CheckoutModal
        isOpen={isCheckoutOpen}
        onClose={() => setIsCheckoutOpen(false)}
        cartItems={cartItems}
        discount={appliedDiscount}
        voucherCode={appliedVoucherCode}
        onOrderSuccess={handleOrderSuccess}
      />

      {/* User Addresses Modal */}
      <MyAddressesModal
        isOpen={isAddressesModalOpen}
        onClose={() => setIsAddressesModalOpen(false)}
        addresses={userAddresses}
        onSaveAddress={handleSaveAddress}
        onDeleteAddress={handleDeleteAddress}
      />

      {/* Customer Support & Policies Modal */}
      <CustomerPolicyModal
        isOpen={policyModalState.isOpen}
        onClose={() => setPolicyModalState(prev => ({ ...prev, isOpen: false }))}
        initialTab={policyModalState.tab}
      />

      {/* Protected Full-Screen Admin Portal (Only renders if authenticated admin session is active) */}
      <AdminPortal
        isOpen={isAdminPortalOpen && isAdminSessionActive}
        onClose={handleCloseAdmin}
        isFullPage={true}
        onAuthChange={(isAuth) => setIsAdminSessionActive(isAuth)}
      />
    </div>
  );
}
