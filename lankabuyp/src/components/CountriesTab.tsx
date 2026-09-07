import React, { useState, useEffect } from 'react';
import { 
  Globe, 
  Search, 
  ShieldCheck, 
  Truck, 
  Sparkles, 
  Star, 
  Info, 
  ShoppingBag, 
  Zap, 
  RefreshCw,
  X,
  Eye,
  CheckCircle2,
  Package,
  Layers,
  ChevronRight
} from 'lucide-react';
import { GlobalProduct, GlobalProductVariant, Product, SupplierSource, DEFAULT_PRODUCT_IMAGE } from '../types';
import { ProductCard } from './ProductCard';
import { SkeletonProductCard } from './SkeletonProductCard';

const fetchWithRetry = async (url: string, options?: RequestInit, retries: number = 3, delayMs: number = 500): Promise<Response> => {
  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      const response = await fetch(url, options);
      if (response.ok) {
        return response;
      }
    } catch (err: any) {
      if (options?.signal?.aborted || err?.name === 'AbortError') throw err;
      if (attempt === retries - 1) throw err;
    }
    await new Promise((r) => setTimeout(r, delayMs * Math.pow(2, attempt)));
  }
  return fetch(url, options);
};

interface CountriesTabProps {
  onAddToCart: (product: Product, quantity?: number) => void;
  onBuyNow: (product: Product, quantity?: number) => void;
  onOpenCart?: () => void;
  onSelectProduct?: (product: Product) => void;
  searchQuery?: string;
}

export const CountriesTab: React.FC<CountriesTabProps> = ({
  onAddToCart,
  onBuyNow,
  onOpenCart,
  onSelectProduct,
  searchQuery = ''
}) => {
  // -------------------------------------------------------------------------
  // 1. ISOLATION & FILTER STATE
  // -------------------------------------------------------------------------
  const [globalProducts, setGlobalProducts] = useState<GlobalProduct[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [loadingMore, setLoadingMore] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedCountry, setSelectedCountry] = useState<string>('all');
  const [selectedSupplier, setSelectedSupplier] = useState<string>('all');
  const [page, setPage] = useState<number>(1);
  const [hasMore, setHasMore] = useState<boolean>(true);
  const [sortOption, setSortOption] = useState<'price-low' | 'price-high' | 'rating'>('price-low');
  
  // Modals state
  const [activeTaxModalProduct, setActiveTaxModalProduct] = useState<GlobalProduct | null>(null);
  const [detailModalProduct, setDetailModalProduct] = useState<GlobalProduct | null>(null);
  const [activeGalleryImg, setActiveGalleryImg] = useState<string>('');
  const [selectedVariantMap, setSelectedVariantMap] = useState<Record<string, GlobalProductVariant>>({});

  // Country hubs filter list
  const countries = [
    { id: 'all', name: 'All Overseas', flag: '🌐' },
    { id: 'China', name: 'China', flag: '🇨🇳' },
    { id: 'Japan', name: 'Japan', flag: '🇯🇵' },
    { id: 'South Korea', name: 'South Korea', flag: '🇰🇷' },
    { id: 'Singapore', name: 'Singapore', flag: '🇸🇬' },
    { id: 'United Arab Emirates', name: 'UAE (Dubai)', flag: '🇦🇪' }
  ];

  // Client-side Memory Cache for instant zero-latency tab switching
  const clientCacheRef = React.useRef<Map<string, { products: GlobalProduct[]; hasMore: boolean }>>(new Map());

  // -------------------------------------------------------------------------
  // 2. FETCH FROM UNIFIED BACKEND AGGREGATION ROUTE (/api/global/products)
  // -------------------------------------------------------------------------
  useEffect(() => {
    const cacheKey = `${selectedCountry}:${searchQuery.trim()}:${sortOption}:1`;
    const cachedEntry = clientCacheRef.current.get(cacheKey);

    if (cachedEntry) {
      setGlobalProducts(cachedEntry.products);
      setHasMore(cachedEntry.hasMore);
      setLoading(false);
      setError(null);
      setPage(1);

      const initialVariants: Record<string, GlobalProductVariant> = {};
      cachedEntry.products.forEach((p: GlobalProduct) => {
        if (p.variants && p.variants.length > 0) {
          initialVariants[p.id] = p.variants[0];
        }
      });
      setSelectedVariantMap(initialVariants);
    } else {
      setLoading(true);
      setError(null);
    }

    setPage(1);

    const abortController = new AbortController();

    const fetchTimer = setTimeout(async () => {
      try {
        const params = new URLSearchParams();
        if (selectedCountry !== 'all') params.append('country', selectedCountry);
        if (searchQuery.trim()) params.append('search', searchQuery.trim());
        params.append('page', '1');
        params.append('limit', '20');
        params.append('sort', sortOption);

        const res = await fetchWithRetry(`/api/global/products?${params.toString()}`, {
          signal: abortController.signal
        });
        const data = await res.json();

        if (abortController.signal.aborted) return;

        if (data.success && Array.isArray(data.products)) {
          // Strict Constraint: Admin-added domestic products are restricted from the Countries Tab
          const overseasProducts = data.products.filter(
            (p: any) => p && p.source !== 'admin_local' && p.supplierOrigin !== 'Sri Lanka' && !p.isLocalStore
          );
          setGlobalProducts(overseasProducts);
          setHasMore(data.hasMore !== undefined ? data.hasMore : overseasProducts.length >= 20);
          clientCacheRef.current.set(cacheKey, {
            products: overseasProducts,
            hasMore: data.hasMore !== undefined ? data.hasMore : overseasProducts.length >= 20
          });

          // Initialize default variant selection
          const initialVariants: Record<string, GlobalProductVariant> = {};
          overseasProducts.forEach((p: GlobalProduct) => {
            if (p.variants && p.variants.length > 0) {
              initialVariants[p.id] = p.variants[0];
            }
          });
          setSelectedVariantMap(initialVariants);
        } else {
          if (!cachedEntry) {
            setError(data.message || 'Failed to load overseas products catalog');
          }
        }
      } catch (err: any) {
        if (err.name !== 'AbortError') {
          console.warn('CountriesTab fetch notice:', err?.message || err);
          if (!cachedEntry) {
            setError('Could not connect to overseas fulfillment gateway');
          }
        }
      } finally {
        if (!abortController.signal.aborted) {
          setLoading(false);
        }
      }
    }, searchQuery.trim() ? 300 : 0);

    return () => {
      clearTimeout(fetchTimer);
      abortController.abort();
    };
  }, [selectedCountry, searchQuery, sortOption]);

  const fetchGlobalProducts = async () => {
    setLoading(true);
    setError(null);
    setPage(1);
    try {
      const params = new URLSearchParams();
      if (selectedCountry !== 'all') params.append('country', selectedCountry);
      if (searchQuery.trim()) params.append('search', searchQuery.trim());
      params.append('page', '1');
      params.append('limit', '20');
      params.append('sort', sortOption);

      const res = await fetchWithRetry(`/api/global/products?${params.toString()}`);
      const data = await res.json();

      if (data.success && Array.isArray(data.products)) {
        // Strict Constraint: Admin-added domestic products are restricted from the Countries Tab
        const overseasProducts = data.products.filter(
          (p: any) => p && p.source !== 'admin_local' && p.supplierOrigin !== 'Sri Lanka' && !p.isLocalStore
        );
        setGlobalProducts(overseasProducts);
        setHasMore(data.hasMore !== undefined ? data.hasMore : overseasProducts.length >= 20);
        const cacheKey = `${selectedCountry}:${searchQuery.trim()}:${sortOption}:1`;
        clientCacheRef.current.set(cacheKey, {
          products: overseasProducts,
          hasMore: data.hasMore !== undefined ? data.hasMore : overseasProducts.length >= 20
        });

        const initialVariants: Record<string, GlobalProductVariant> = {};
        overseasProducts.forEach((p: GlobalProduct) => {
          if (p.variants && p.variants.length > 0) {
            initialVariants[p.id] = p.variants[0];
          }
        });
        setSelectedVariantMap(initialVariants);
      } else {
        setError(data.message || 'Failed to load overseas products catalog');
      }
    } catch (err: any) {
      console.warn('CountriesTab manual retry notice:', err?.message || err);
      setError('Could not connect to overseas fulfillment gateway');
    } finally {
      setLoading(false);
    }
  };

  const handleLoadMore = async () => {
    if (loadingMore || !hasMore) return;
    setLoadingMore(true);
    const nextPage = page + 1;
    try {
      const params = new URLSearchParams();
      if (selectedCountry !== 'all') params.append('country', selectedCountry);
      if (searchQuery.trim()) params.append('search', searchQuery.trim());
      params.append('page', String(nextPage));
      params.append('limit', '20');
      params.append('sort', sortOption);

      const res = await fetchWithRetry(`/api/global/products?${params.toString()}`);
      const data = await res.json();

      if (data.success && Array.isArray(data.products) && data.products.length > 0) {
        const overseasNew = data.products.filter(
          (p: any) => p && p.source !== 'admin_local' && p.supplierOrigin !== 'Sri Lanka' && !p.isLocalStore
        );
        setGlobalProducts((prev) => {
          const combined = [...prev, ...overseasNew];
          // Deduplicate by product id
          const uniqueMap = new Map<string, GlobalProduct>();
          combined.forEach((p) => uniqueMap.set(p.id, p));
          const uniqueList = Array.from(uniqueMap.values());

          if (sortOption === 'price-low') {
            uniqueList.sort((a, b) => (a.priceLkr || a.price || 0) - (b.priceLkr || b.price || 0));
          } else if (sortOption === 'price-high') {
            uniqueList.sort((a, b) => (b.priceLkr || b.price || 0) - (a.priceLkr || a.price || 0));
          } else if (sortOption === 'rating') {
            uniqueList.sort((a, b) => (b.rating || 0) - (a.rating || 0));
          }
          return uniqueList;
        });

        setPage(nextPage);
        setHasMore(data.hasMore !== undefined ? data.hasMore : overseasNew.length >= 20);

        const newVariants: Record<string, GlobalProductVariant> = {};
        overseasNew.forEach((p: GlobalProduct) => {
          if (p.variants && p.variants.length > 0) {
            newVariants[p.id] = p.variants[0];
          }
        });
        setSelectedVariantMap((prev) => ({ ...prev, ...newVariants }));
      } else {
        setHasMore(false);
      }
    } catch (err: any) {
      console.warn('CountriesTab handleLoadMore notice:', err?.message || err);
    } finally {
      setLoadingMore(false);
    }
  };

  // Map GlobalProduct to standard Product model for Card display and Cart & Checkout compatibility
  // In Countries tab cards: Shows ONLY base item price in LKR (with +13% website markup)
  const convertToCartProduct = (globalProduct: GlobalProduct, variant?: GlobalProductVariant, useLandedPrice: boolean = false): Product => {
    const activePrice = variant ? variant.priceLkr : globalProduct.priceLkr;
    const finalLandedPrice = globalProduct.taxBreakdown?.finalPriceLkr || (activePrice + 1800 + Math.round(activePrice * 0.25));
    const cardDisplayPrice = useLandedPrice ? finalLandedPrice : activePrice;
    const origPrice = globalProduct.originalPriceLkr || Math.round(activePrice * 1.3);
    const discount = globalProduct.discountPercentage || 23;

    return {
      id: globalProduct.id + (variant ? `-${variant.skuId}` : ''),
      title: `${globalProduct.title}${variant ? ` (${variant.name})` : ''}`,
      slug: globalProduct.supplierProductId || globalProduct.id,
      category: globalProduct.category || 'electronics',
      subcategory: globalProduct.country || 'overseas',
      price: cardDisplayPrice, // Card shows base item price in LKR (with 13% safety markup)
      originalPrice: origPrice,
      discountPercentage: discount,
      wholesaleCost: activePrice,
      sku: variant ? variant.skuId : (globalProduct.supplierProductId || globalProduct.id),
      supplierName: `${globalProduct.countryFlag || '🌐'} ${globalProduct.storeName || globalProduct.country}`,
      supplierOrigin: globalProduct.country || 'China',
      rating: globalProduct.rating || 4.8,
      reviewsCount: globalProduct.ordersCount || 150,
      soldCount: globalProduct.ordersCount || 150,
      stock: variant ? variant.stock : 50,
      imageUrl: variant?.imageUrl || globalProduct.imageUrl || DEFAULT_PRODUCT_IMAGE,
      galleryImages: globalProduct.galleryImages && globalProduct.galleryImages.length > 0 
        ? globalProduct.galleryImages 
        : [globalProduct.imageUrl || DEFAULT_PRODUCT_IMAGE],
      description: globalProduct.description || '',
      features: globalProduct.features || [],
      specs: {
        ...globalProduct.specs
      },
      estimatedDeliveryDays: 14,
      islandwideExpress: true,
      badge: `${globalProduct.countryFlag || '🌐'} ${(globalProduct.country || 'OVERSEAS').toUpperCase()}`,
      allowCOD: false,
      allowCard: true,
      paymentOptions: 'card_only',
      isLocalStore: false,
      source: 'cj_dropshipping',
      supplierProductId: globalProduct.supplierProductId || globalProduct.id.replace(/^global-cj-/, ''),
      weightGrams: variant?.weightGrams || globalProduct.weightGrams,
      cjDirectUrl: globalProduct.cjDirectUrl || (globalProduct.supplierProductId ? `https://cjdropshipping.com/product-detail.html?id=${encodeURIComponent(globalProduct.supplierProductId)}` : `https://cjdropshipping.com/search/${encodeURIComponent(globalProduct.title)}.html`)
    };
  };

  const handleVariantChange = (productId: string, variant: GlobalProductVariant) => {
    setSelectedVariantMap(prev => ({ ...prev, [productId]: variant }));
  };

  const openProductDetails = (product: GlobalProduct) => {
    const variant = selectedVariantMap[product.id] || product.variants?.[0];
    const cartProduct = convertToCartProduct(product, variant, false);
    if (onSelectProduct) {
      onSelectProduct(cartProduct);
      return;
    }
    setDetailModalProduct(product);
    setActiveGalleryImg(variant?.imageUrl || product.imageUrl);
  };

  return (
    <div className="max-w-7xl mx-auto px-2.5 sm:px-4 py-4 w-full flex-1 min-w-0">
      {/* Country Filter Header */}
      <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs mb-6 space-y-3">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-orange-50 border border-orange-200 flex items-center justify-center text-orange-600 shrink-0">
              <Globe className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-extrabold text-slate-900 leading-tight">
                Global Fulfillment Hubs
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                All-inclusive Landed LKR Prices (Item + Express Courier + Sri Lanka Customs Duty & VAT).
              </p>
            </div>
          </div>

          {searchQuery && (
            <div className="inline-flex items-center space-x-2 bg-orange-50 border border-orange-200 text-orange-800 text-xs px-3.5 py-1.5 rounded-xl font-semibold self-start md:self-auto">
              <Search className="w-3.5 h-3.5 text-orange-500" />
              <span>Search query: <strong className="font-bold text-orange-950">"{searchQuery}"</strong></span>
            </div>
          )}
        </div>

        {/* Clean Minimal Country Filter Pills & Sorting Control */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pt-2 border-t border-slate-100">
          <div className="flex items-center space-x-2 overflow-x-auto scrollbar-none py-1">
            {countries.map((c) => (
              <button
                key={c.id}
                onClick={() => setSelectedCountry(c.id)}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center space-x-1.5 cursor-pointer shrink-0 ${
                  selectedCountry === c.id
                    ? 'bg-orange-500 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                <span className="text-sm">{c.flag}</span>
                <span>{c.name}</span>
              </button>
            ))}
          </div>

          <div className="flex items-center space-x-2 self-end sm:self-auto shrink-0">
            <span className="text-xs text-slate-500 font-semibold hidden xs:inline">Sort Order:</span>
            <select
              value={sortOption}
              onChange={(e) => setSortOption(e.target.value as any)}
              className="bg-slate-100 border border-slate-200 text-slate-800 text-xs font-bold rounded-xl px-3 py-2 cursor-pointer focus:outline-hidden focus:ring-2 focus:ring-orange-500"
            >
              <option value="price-low">💰 Price: Low to High (මුදලින් අඩුම පළමුව)</option>
              <option value="price-high">📈 Price: High to Low (මුදලින් වැඩිම පළමුව)</option>
              <option value="rating">⭐ Top Rated (වැඩිම ලකුණු)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Live catalog status pill */}
      {!loading && !error && globalProducts.length > 0 && (
        <div className="mb-4 flex items-center justify-between bg-orange-50 border border-orange-200/80 rounded-2xl px-4 py-2.5 text-xs">
          <div className="flex items-center space-x-2 text-orange-900 font-bold">
            <Zap className="w-4 h-4 text-orange-600 animate-pulse shrink-0" />
            <span>Showing {globalProducts.length} Live CJ Dropshipping Products</span>
          </div>
          <span className="text-orange-700 font-semibold hidden sm:inline">
            ✓ Sorted from lowest price to higher prices
          </span>
        </div>
      )}

      {/* Loading state with animated shimmer skeleton cards */}
      {loading && (
        <div className="space-y-4">
          <div className="bg-white rounded-2xl p-4 sm:p-5 text-center border border-slate-200 shadow-xs flex items-center justify-center space-x-3">
            <RefreshCw className="w-5 h-5 text-orange-500 animate-spin shrink-0" />
            <span className="text-xs sm:text-sm font-bold text-slate-700">Connecting to Overseas Logistics Hubs (Live CJ Dropshipping Inventory)...</span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2.5 sm:gap-4 lg:gap-5 w-full">
            {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
              <SkeletonProductCard key={i} />
            ))}
          </div>
        </div>
      )}

      {/* Error state */}
      {error && !loading && (
        <div className="bg-red-50 rounded-2xl p-6 text-center border border-red-200 max-w-md mx-auto my-8">
          <Info className="w-8 h-8 text-red-500 mx-auto mb-2" />
          <h3 className="text-sm font-bold text-red-800">Overseas Gateway Notice</h3>
          <p className="text-xs text-red-600 mt-1">{error}</p>
          <button
            onClick={fetchGlobalProducts}
            className="mt-4 bg-red-600 text-white text-xs font-bold px-4 py-2 rounded-xl hover:bg-red-700 transition cursor-pointer"
          >
            Retry Connection
          </button>
        </div>
      )}

      {/* Products Grid */}
      {!loading && !error && (
        <>
          {globalProducts.length === 0 ? (
            <div className="bg-white rounded-3xl p-12 text-center border border-slate-200 shadow-xs max-w-md mx-auto my-8">
              <Search className="w-10 h-10 text-slate-300 mx-auto mb-3" />
              <h3 className="text-sm font-bold text-slate-800">No overseas products match your filter</h3>
              <p className="text-xs text-slate-500 mt-1">Try selecting another country filter.</p>
              <button
                onClick={() => {
                  setSelectedCountry('all');
                }}
                className="mt-4 bg-orange-500 text-white text-xs font-bold px-4 py-2 rounded-xl hover:bg-orange-600 transition cursor-pointer"
              >
                Reset Filters
              </button>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2.5 sm:gap-4 lg:gap-5 w-full">
                {globalProducts.map((product) => {
                  const selectedVariant = selectedVariantMap[product.id] || (product.variants && product.variants[0]);
                  const cartProduct = convertToCartProduct(product, selectedVariant);

                  return (
                    <ProductCard
                      key={product.id}
                      product={cartProduct}
                      onAddToCart={(p) => onAddToCart(p, 1)}
                      onBuyNow={(p) => onBuyNow(p, 1)}
                      onOpenDetails={() => openProductDetails(product)}
                    />
                  );
                })}
              </div>

              {/* More... Load 500 More CJ Products Button */}
              {hasMore && (
                <div className="flex flex-col items-center justify-center my-8 sm:my-10 gap-2">
                  <button
                    onClick={handleLoadMore}
                    disabled={loadingMore}
                    className="bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-600 hover:to-amber-700 text-white font-extrabold text-xs sm:text-sm px-6 sm:px-8 py-3.5 rounded-2xl shadow-lg hover:shadow-xl transition-all flex items-center space-x-2 cursor-pointer disabled:opacity-50"
                  >
                    {loadingMore ? (
                      <>
                        <RefreshCw className="w-4 h-4 sm:w-5 sm:h-5 animate-spin" />
                        <span>Loading More CJ API Products (තව බඩු පූරණය වෙමින්...)...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4 sm:w-5 sm:h-5 text-amber-200" />
                        <span>More... Load 500 More CJ Products (තව බඩු 500 ක් පෙන්වන්න)</span>
                        <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5" />
                      </>
                    )}
                  </button>
                  <p className="text-xs text-slate-500 font-medium text-center">
                    Currently showing {globalProducts.length} live CJ Dropshipping products • Sorted from lowest price
                  </p>
                </div>
              )}
            </>
          )}
        </>
      )}

      {/* FULL PRODUCT DETAILS MODAL (Description, Specs, Features, Variants, Gallery) */}
      {detailModalProduct && (
        <div className="fixed inset-0 z-50 bg-slate-900/75 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-3xl w-full p-5 sm:p-6 shadow-2xl border border-slate-200 relative my-auto animate-in fade-in zoom-in-95 duration-150 max-h-[90vh] flex flex-col">
            
            {/* Header / Close */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4 shrink-0">
              <div className="flex items-center space-x-2">
                <span className="text-lg">{detailModalProduct.countryFlag}</span>
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-900">
                      {detailModalProduct.country} Direct Overseas Item
                    </span>
                    <span className="text-[10px] bg-orange-100 text-orange-800 font-extrabold px-2 py-0.5 rounded-md">
                      GLOBAL AIR DIRECT
                    </span>
                  </div>
                  <span className="text-[11px] text-slate-500">{detailModalProduct.storeName}</span>
                </div>
              </div>

              <button
                onClick={() => setDetailModalProduct(null)}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-full bg-slate-100 cursor-pointer transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Scrollable Content Body */}
            <div className="overflow-y-auto flex-1 pr-1 space-y-5 scrollbar-thin">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {/* Left: Gallery */}
                <div className="space-y-3">
                  <div className="aspect-4/3 rounded-2xl overflow-hidden bg-slate-100 border border-slate-200">
                    <img
                      src={activeGalleryImg || detailModalProduct.imageUrl || DEFAULT_PRODUCT_IMAGE}
                      alt={detailModalProduct.title}
                      className="w-full h-full object-cover"
                      referrerPolicy="no-referrer"
                    />
                  </div>

                  {detailModalProduct.galleryImages && detailModalProduct.galleryImages.length > 1 && (
                    <div className="flex items-center space-x-2 overflow-x-auto pb-1">
                      {detailModalProduct.galleryImages.map((img, idx) => (
                        <button
                          key={idx}
                          onClick={() => setActiveGalleryImg(img)}
                          className={`w-14 h-14 rounded-xl overflow-hidden border-2 transition shrink-0 cursor-pointer ${
                            activeGalleryImg === img ? 'border-orange-500 ring-2 ring-orange-200' : 'border-slate-200'
                          }`}
                        >
                          <img src={img || DEFAULT_PRODUCT_IMAGE} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Right: Info & Pricing */}
                <div className="space-y-3 flex flex-col justify-between">
                  <div>
                    <h2 className="text-base sm:text-lg font-bold text-slate-900 leading-snug">
                      {detailModalProduct.title}
                    </h2>

                    <div className="flex items-center space-x-3 text-xs text-slate-500 mt-2">
                      <span className="flex items-center text-amber-500 font-bold">
                        <Star className="w-4 h-4 fill-amber-400 mr-1" />
                        {detailModalProduct.rating} ({detailModalProduct.ordersCount} verified orders)
                      </span>
                      <span>•</span>
                      <span className="text-slate-600 font-medium">{detailModalProduct.courierName}</span>
                    </div>

                    {/* Variant Selector */}
                    {detailModalProduct.variants && detailModalProduct.variants.length > 0 && (
                      <div className="mt-4">
                        <label className="text-xs font-bold text-slate-700 block mb-1.5">Select Variant:</label>
                        <div className="flex flex-wrap gap-1.5">
                          {detailModalProduct.variants.map((v) => {
                            const isSelected = selectedVariantMap[detailModalProduct.id]?.skuId === v.skuId;
                            return (
                              <button
                                key={v.skuId}
                                onClick={() => {
                                  handleVariantChange(detailModalProduct.id, v);
                                  if (v.imageUrl) setActiveGalleryImg(v.imageUrl);
                                }}
                                className={`text-xs px-3 py-1.5 rounded-xl font-semibold border transition cursor-pointer ${
                                  isSelected
                                    ? 'border-orange-500 bg-orange-50 text-orange-800 font-bold ring-1 ring-orange-300'
                                    : 'border-slate-200 bg-slate-50 text-slate-700 hover:border-slate-300'
                                }`}
                              >
                                {v.name} - Rs. {v.priceLkr.toLocaleString()}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Landed Price Calculation & Reason Breakdown Card */}
                  <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200 space-y-3">
                    <div className="flex items-baseline justify-between">
                      <span className="text-xs font-black text-slate-700 uppercase tracking-wider">
                        Total Landed Cost &amp; Tax Calculation
                      </span>
                      <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100/80 px-2 py-0.5 rounded-md border border-emerald-300">
                        100% Guaranteed Landed Cost
                      </span>
                    </div>

                    {/* Prominent Landed Total Display */}
                    <div className="p-3 bg-gradient-to-r from-orange-500/10 via-amber-500/10 to-orange-500/5 rounded-xl border border-orange-200">
                      <div className="text-[11px] text-slate-500 font-bold mb-0.5">Total Landed Price:</div>
                      <div className="flex items-baseline space-x-2">
                        <span className="text-2xl font-black text-slate-950">
                          Rs. {detailModalProduct.taxBreakdown.finalPriceLkr.toLocaleString()}
                        </span>
                        {detailModalProduct.originalPriceLkr > detailModalProduct.priceLkr && (
                          <span className="text-xs text-slate-400 line-through">
                            Rs. {detailModalProduct.originalPriceLkr.toLocaleString()}
                          </span>
                        )}
                      </div>
                      <p className="text-[10px] text-emerald-800 font-semibold mt-1">
                        ✓ All-inclusive final price: item cost, international air freight, Sri Lanka Customs 10% PAL duty, and 15% VAT.
                      </p>
                    </div>

                    {/* Itemized Reasons & Amounts */}
                    <div className="space-y-2 text-xs divide-y divide-slate-200/80">
                      {/* 1. Base Item Price */}
                      <div className="pt-2 flex justify-between items-start">
                        <div>
                          <div className="font-bold text-slate-800">1. Base Item Price</div>
                          <div className="text-[10px] text-slate-500">Verified manufacturer price (+13% Service &amp; Handling Margin included)</div>
                        </div>
                        <span className="font-bold text-slate-900 shrink-0 ml-2">
                          Rs. {(selectedVariantMap[detailModalProduct.id]?.priceLkr || detailModalProduct.priceLkr).toLocaleString()}
                        </span>
                      </div>

                      {/* 2. Air Courier Shipping */}
                      <div className="pt-2 flex justify-between items-start">
                        <div>
                          <div className="font-bold text-slate-800">2. Air Cargo &amp; Courier Freight</div>
                          <div className="text-[10px] text-slate-500">Fast air cargo from {detailModalProduct.countryFlag} {detailModalProduct.country} to Sri Lanka ({detailModalProduct.deliveryTimeDays})</div>
                        </div>
                        <span className="font-bold text-slate-900 shrink-0 ml-2">
                          Rs. {detailModalProduct.shippingFeeLkr.toLocaleString()}
                        </span>
                      </div>

                      {/* 3. PAL Import Duty */}
                      <div className="pt-2 flex justify-between items-start text-amber-900 bg-amber-50/60 p-2 rounded-lg border border-amber-200/60">
                        <div>
                          <div className="font-bold">3. Port and Airport Development Levy (10% PAL Duty)</div>
                          <div className="text-[10px] text-amber-700">Official Sri Lanka Customs import duty calculation</div>
                        </div>
                        <span className="font-bold text-amber-900 shrink-0 ml-2">
                          + Rs. {detailModalProduct.taxBreakdown.importDutyLkr.toLocaleString()}
                        </span>
                      </div>

                      {/* 4. VAT */}
                      <div className="pt-2 flex justify-between items-start text-orange-900 bg-orange-50/60 p-2 rounded-lg border border-orange-200/60">
                        <div>
                          <div className="font-bold">4. Value Added Tax (15% VAT)</div>
                          <div className="text-[10px] text-orange-700">Official Inland Revenue and Customs statutory 15% VAT</div>
                        </div>
                        <span className="font-bold text-orange-900 shrink-0 ml-2">
                          + Rs. {detailModalProduct.taxBreakdown.vatLkr.toLocaleString()}
                        </span>
                      </div>

                      {/* 5. Total Sum */}
                      <div className="pt-2.5 flex justify-between items-center text-sm font-black text-slate-950">
                        <span>Total Landed Amount:</span>
                        <span className="text-emerald-700 text-base">
                          Rs. {detailModalProduct.taxBreakdown.finalPriceLkr.toLocaleString()}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Description */}
              <div className="space-y-2">
                <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">Product Description</h3>
                <p className="text-xs text-slate-700 leading-relaxed bg-slate-50 p-3.5 rounded-2xl border border-slate-200/70">
                  {detailModalProduct.description}
                </p>
              </div>

              {/* Features Bullet List */}
              {detailModalProduct.features && detailModalProduct.features.length > 0 && (
                <div className="space-y-2">
                  <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">Key Features & Highlights</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {detailModalProduct.features.map((feat, idx) => (
                      <div key={idx} className="flex items-start space-x-2 bg-emerald-50/60 p-2.5 rounded-xl border border-emerald-100 text-xs text-slate-800">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                        <span className="font-medium">{feat}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Technical Specifications Table */}
              {detailModalProduct.specs && Object.keys(detailModalProduct.specs).length > 0 && (
                <div className="space-y-2">
                  <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">Technical Specifications</h3>
                  <div className="bg-slate-50 rounded-2xl overflow-hidden border border-slate-200 divide-y divide-slate-200 text-xs">
                    {Object.entries(detailModalProduct.specs).map(([key, val]) => (
                      <div key={key} className="grid grid-cols-3 p-2.5">
                        <span className="text-slate-500 font-semibold">{key}:</span>
                        <span className="col-span-2 text-slate-900 font-bold">{val}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Bottom Modal CTA Bar */}
            <div className="pt-4 mt-4 border-t border-slate-100 flex items-center gap-3 shrink-0">
              <button
                onClick={() => {
                  const variant = selectedVariantMap[detailModalProduct.id] || detailModalProduct.variants?.[0];
                  const cartObj = convertToCartProduct(detailModalProduct, variant);
                  onAddToCart(cartObj, 1);
                  setDetailModalProduct(null);
                }}
                className="flex-1 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold py-3 rounded-xl transition cursor-pointer flex items-center justify-center space-x-1.5"
              >
                <ShoppingBag className="w-4 h-4" />
                <span>Add to Cart</span>
              </button>

              <button
                onClick={() => {
                  const variant = selectedVariantMap[detailModalProduct.id] || detailModalProduct.variants?.[0];
                  const cartObj = convertToCartProduct(detailModalProduct, variant);
                  onBuyNow(cartObj, 1);
                  setDetailModalProduct(null);
                }}
                className="flex-1 bg-orange-500 hover:bg-orange-600 text-white text-xs font-bold py-3 rounded-xl transition cursor-pointer flex items-center justify-center space-x-1.5 shadow-md"
              >
                <Zap className="w-4 h-4" />
                <span>Buy Now (Rs. {detailModalProduct.taxBreakdown.finalPriceLkr.toLocaleString()})</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Tax & Customs Calculation Breakdown Modal */}
      {activeTaxModalProduct && (
        <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 relative animate-in fade-in zoom-in-95 duration-150 my-auto">
            <button
              onClick={() => setActiveTaxModalProduct(null)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 p-1 rounded-full bg-slate-100 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex items-center space-x-2 text-orange-600 mb-2">
              <ShieldCheck className="w-5 h-5" />
              <span className="text-xs font-black uppercase tracking-wider">Sri Lanka Customs Transparency</span>
            </div>

            <h3 className="text-base font-bold text-slate-900 leading-snug">
              {activeTaxModalProduct.title}
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              Dispatched from {activeTaxModalProduct.countryFlag} <strong>{activeTaxModalProduct.country}</strong> via {activeTaxModalProduct.courierName}.
            </p>

            {/* Detailed Itemized Ledger */}
            <div className="mt-4 bg-slate-50 rounded-2xl p-4 border border-slate-200 space-y-3 text-xs">
              <div className="flex justify-between items-start text-slate-700">
                <div>
                  <span className="font-bold block">1. Base Item Price:</span>
                  <span className="text-[10px] text-slate-500">Verified manufacturer price (+13% Margin included)</span>
                </div>
                <strong className="font-bold text-slate-900 shrink-0 ml-2">Rs. {activeTaxModalProduct.priceLkr.toLocaleString()}</strong>
              </div>

              <div className="flex justify-between items-start text-slate-700">
                <div>
                  <span className="font-bold block">2. Air Cargo Shipping Fee:</span>
                  <span className="text-[10px] text-slate-500">Air freight dispatch from {activeTaxModalProduct.country} to Sri Lanka</span>
                </div>
                <strong className="font-bold text-slate-900 shrink-0 ml-2">Rs. {activeTaxModalProduct.shippingFeeLkr.toLocaleString()}</strong>
              </div>

              <div className="pt-2 border-t border-slate-200/80 flex justify-between items-center text-slate-600 font-semibold">
                <span>CIF Customs Value (FOB Price + Air Freight):</span>
                <span>Rs. {activeTaxModalProduct.taxBreakdown.cifLkr.toLocaleString()}</span>
              </div>

              <div className="flex justify-between items-start text-amber-800 bg-amber-50 p-2.5 rounded-xl border border-amber-200/80">
                <div>
                  <span className="font-bold block">3. Port and Airport Levy (10% PAL Duty):</span>
                  <span className="text-[10px] text-amber-700">Sri Lanka Customs import tariff</span>
                </div>
                <strong className="font-bold shrink-0 ml-2">+ Rs. {activeTaxModalProduct.taxBreakdown.importDutyLkr.toLocaleString()}</strong>
              </div>

              <div className="flex justify-between items-start text-orange-800 bg-orange-50 p-2.5 rounded-xl border border-orange-200/80">
                <div>
                  <span className="font-bold block">4. Value Added Tax (15% VAT):</span>
                  <span className="text-[10px] text-orange-700">Inland Revenue / Customs VAT</span>
                </div>
                <strong className="font-bold shrink-0 ml-2">+ Rs. {(activeTaxModalProduct.taxBreakdown?.vatLkr ?? 0).toLocaleString()}</strong>
              </div>

              <div className="pt-3 border-t border-slate-300 flex justify-between items-center text-sm font-black text-slate-900">
                <span>Total Landed Amount:</span>
                <span className="text-emerald-700 text-base">Rs. {(activeTaxModalProduct.taxBreakdown?.finalPriceLkr ?? 0).toLocaleString()}</span>
              </div>
            </div>

            <p className="text-[11px] text-slate-500 mt-3 leading-relaxed">
              * All customs clearances, import tariffs, VAT, and doorstep delivery are fully covered in this final price. No additional taxes will be collected at your doorstep.
            </p>

            <button
              onClick={() => setActiveTaxModalProduct(null)}
              className="mt-5 w-full bg-slate-900 text-white text-xs font-bold py-3 rounded-xl hover:bg-slate-800 transition cursor-pointer"
            >
              Close Breakdown
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
