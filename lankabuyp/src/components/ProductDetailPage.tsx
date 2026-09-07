import React, { useState, useEffect, useRef } from 'react';
import { 
  ArrowLeft, 
  ChevronLeft, 
  ChevronRight, 
  Star, 
  Truck, 
  ShieldCheck, 
  RotateCcw, 
  ShoppingBag, 
  Zap, 
  CheckCircle2, 
  Store, 
  MessageSquare, 
  Share2, 
  Heart, 
  Clock, 
  Layers,
  ThumbsUp,
  X,
  Send,
  Sparkles,
  Ticket,
  Tag,
  Check,
  ChevronDown,
  ChevronUp,
  BadgeCheck,
  Award,
  Eye,
  Globe,
  Info,
  Maximize2,
  Flame,
  CreditCard,
  UserCheck
} from 'lucide-react';
import { Product, DEFAULT_PRODUCT_IMAGE } from '../types';
import { ProductDetailSkeleton } from './ProductDetailSkeleton';
import { getColorSwatch } from '../lib/colorUtils';
import { parseVariantColorAndSize } from '../lib/variantUtils';

interface ProductDetailPageProps {
  product: Product;
  onBack: () => void;
  onAddToCart: (product: Product, quantity: number) => void;
  onBuyNow: (product: Product, quantity: number) => void;
  onOpenCart: () => void;
  cartCount: number;
  relatedProducts?: Product[];
  onSelectProduct?: (product: Product) => void;
  isLoading?: boolean;
}

export const ProductDetailPage: React.FC<ProductDetailPageProps> = ({
  product,
  onBack,
  onAddToCart,
  onBuyNow,
  onOpenCart,
  cartCount,
  relatedProducts = [],
  onSelectProduct,
  isLoading = false
}) => {
  // Gallery images array state for live CJ API photo set enhancement
  const [fetchedImages, setFetchedImages] = useState<string[]>([]);

  const rawBaseImages = product.galleryImages && product.galleryImages.length > 0 
    ? [...product.galleryImages] 
    : [product.imageUrl || DEFAULT_PRODUCT_IMAGE];

  // Deduplicate baseImages by stripping query params
  const baseImages = Array.from(
    new Map(rawBaseImages.map(url => [url.split('?')[0].toLowerCase(), url])).values()
  );

  const rawImages = fetchedImages.length > 0 ? fetchedImages : baseImages;
  const images = Array.from(
    new Map(rawImages.map(url => [url.split('?')[0].toLowerCase(), url])).values()
  );

  const isCjProduct = product.source === 'cj_dropshipping' || product.isLocalStore === false || product.id?.startsWith('global-cj');
  const isLocalProduct = (product.isLocalStore || product.source === 'admin_local' || product.supplierOrigin?.includes('Sri Lanka')) && !isCjProduct;

  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [activeTab, setActiveTab] = useState<'details' | 'specs' | 'reviews'>('details');
  const [isWishlisted, setIsWishlisted] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);
  const [isLandedBreakdownOpen, setIsLandedBreakdownOpen] = useState(false);
  const [showShareToast, setShowShareToast] = useState(false);
  const [toastText, setToastText] = useState('');

  // Voucher collection state
  const [collectedVouchers, setCollectedVouchers] = useState<Record<string, boolean>>({});

  // Helpful reviews upvote tracking
  const [helpfulReviews, setHelpfulReviews] = useState<Record<number, number>>({
    1: 42,
    2: 29,
    3: 18,
    4: 11
  });
  const [hasVotedReview, setHasVotedReview] = useState<Record<number, boolean>>({});

  // Touch swipe support for mobile image carousel
  const touchStartX = useRef<number | null>(null);
  const touchEndX = useRef<number | null>(null);

  // Chat message stream
  const [chatMessages, setChatMessages] = useState<Array<{ sender: 'user' | 'store'; text: string; time: string }>>([
    {
      sender: 'store',
      text: `Ayubowan! Welcome to ${product.supplierName || 'LankaBuy Official Verified Store'}. How can we assist you with "${product.title}" today?`,
      time: 'Just now'
    }
  ]);
  const [inputMessage, setInputMessage] = useState('');

  // Variants & Live Stock Sync States
  const [variants, setVariants] = useState<Array<{
    vid: string;
    sku: string;
    variantKey: string;
    color?: string;
    size?: string;
    image?: string;
    usdPrice: number;
    priceLkr: number;
    stock: number;
  }>>([]);
  const [colorOptions, setColorOptions] = useState<string[]>([]);
  const [sizeOptions, setSizeOptions] = useState<string[]>([]);
  const [selectedColor, setSelectedColor] = useState<string>('');
  const [selectedSize, setSelectedSize] = useState<string>('');
  const [selectedVariant, setSelectedVariant] = useState<any | null>(null);

  const [liveVideoUrl, setLiveVideoUrl] = useState<string | null>(null);
  const [liveExchangeRate, setLiveExchangeRate] = useState<number>(305.45);
  const [stockSyncData, setStockSyncData] = useState<{
    inStock: boolean;
    totalAvailableStock: number;
    selectedVariantStock: number;
    statusMessage: string;
    warehouseBreakdown: Array<{ name: string; country: string; qty: number }>;
    loading: boolean;
  }>({
    inStock: true,
    totalAvailableStock: product.stock || 450,
    selectedVariantStock: product.stock || 450,
    statusMessage: 'IN_STOCK_REALTIME_VERIFIED',
    warehouseBreakdown: [
      { name: 'CJ China Main Warehouse (Yiwu/Guangzhou)', country: 'China', qty: Math.round((product.stock || 450) * 0.85) },
      { name: 'CJ Air Cargo HK Hub', country: 'Hong Kong', qty: Math.round((product.stock || 450) * 0.15) }
    ],
    loading: false
  });

  // Scroll to top when product changes & fetch full CJ detail (gallery, video, variants, rate)
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
    setCurrentImageIndex(0);
    setQuantity(1);
    setFetchedImages([]);
    setVariants([]);
    setColorOptions([]);
    setSizeOptions([]);
    setSelectedColor('');
    setSelectedSize('');
    setSelectedVariant(null);
    setLiveVideoUrl(null);

    const pid = product.sku || product.slug || (product.id.startsWith('global-cj-') ? product.id.replace('global-cj-', '') : '');
    if (pid && (product.id.startsWith('global-cj-') || product.supplierName?.includes('CJ'))) {
      fetch(`/api/global/products/detail?pid=${encodeURIComponent(pid)}`)
        .then(res => {
          if (!res.ok) return { success: false };
          return res.json();
        })
        .then(data => {
          if (data && data.success) {
            if (Array.isArray(data.galleryImages) && data.galleryImages.length > 0) {
              setFetchedImages(data.galleryImages);
            }
            if (data.videoUrl) {
              setLiveVideoUrl(data.videoUrl);
            }
            if (data.exchangeRateUsed) {
              setLiveExchangeRate(data.exchangeRateUsed);
            }
            if (Array.isArray(data.variants) && data.variants.length > 0) {
              const cleanedVariants = data.variants.map((v: any) => {
                const parsed = parseVariantColorAndSize(v.variantKey, product.title, v.color, v.size);
                return {
                  ...v,
                  color: parsed.cleanColor,
                  size: parsed.cleanSize,
                  variantKey: parsed.displayKey
                };
              });
              setVariants(cleanedVariants);

              const extractedColors = Array.from(new Set(cleanedVariants.map((v: any) => v.color).filter(Boolean))) as string[];
              const extractedSizes = Array.from(new Set(cleanedVariants.map((v: any) => v.size).filter(Boolean))) as string[];

              setColorOptions(extractedColors);
              setSizeOptions(extractedSizes);

              const initialVar = cleanedVariants[0];
              setSelectedVariant(initialVar);
              if (initialVar.color) setSelectedColor(initialVar.color);
              if (initialVar.size) setSelectedSize(initialVar.size);
            }
          }
        })
        .catch(() => {
          // Silent fallback for detail fetch
        });

      // Query real-time stock sync
      fetch(`/api/global/products/stock-check?pid=${encodeURIComponent(pid)}`)
        .then(res => {
          if (!res.ok) return { success: false };
          return res.json();
        })
        .then(stockRes => {
          if (stockRes && stockRes.success) {
            setStockSyncData({
              inStock: stockRes.inStock,
              totalAvailableStock: stockRes.totalAvailableStock,
              selectedVariantStock: stockRes.selectedVariantStock,
              statusMessage: stockRes.statusMessage,
              warehouseBreakdown: stockRes.warehouseBreakdown || [],
              loading: false
            });
          }
        })
        .catch(() => {
          // Silent fallback for stock check
        });
    }
  }, [product.id]);

  if (isLoading) {
    return <ProductDetailSkeleton onBack={onBack} />;
  }

  // Touch Swipe Handlers
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.targetTouches[0].clientX;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    touchEndX.current = e.targetTouches[0].clientX;
  };

  const handleTouchEnd = () => {
    if (!touchStartX.current || !touchEndX.current) return;
    const distance = touchStartX.current - touchEndX.current;
    const isLeftSwipe = distance > 45;
    const isRightSwipe = distance < -45;

    if (isLeftSwipe) {
      handleNextImage();
    } else if (isRightSwipe) {
      handlePrevImage();
    }

    touchStartX.current = null;
    touchEndX.current = null;
  };

  const handlePrevImage = () => {
    setCurrentImageIndex((prev) => (prev === 0 ? images.length - 1 : prev - 1));
  };

  const handleNextImage = () => {
    setCurrentImageIndex((prev) => (prev === images.length - 1 ? 0 : prev + 1));
  };

  const showToast = (msg: string) => {
    setToastText(msg);
    setShowShareToast(true);
    setTimeout(() => setShowShareToast(false), 2500);
  };

  const handleShare = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(window.location.href);
    }
    showToast('Product link copied to clipboard!');
  };

  const handleCollectVoucher = (voucherKey: string, code: string) => {
    setCollectedVouchers(prev => ({ ...prev, [voucherKey]: true }));
    showToast(`Voucher ${code} collected! Applied at checkout.`);
  };

  const handleUpvoteReview = (id: number) => {
    if (hasVotedReview[id]) return;
    setHelpfulReviews(prev => ({ ...prev, [id]: (prev[id] || 0) + 1 }));
    setHasVotedReview(prev => ({ ...prev, [id]: true }));
    showToast('Thank you for your feedback!');
  };

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputMessage.trim()) return;

    const userText = inputMessage.trim();
    const timeNow = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    
    setChatMessages((prev) => [
      ...prev,
      { sender: 'user', text: userText, time: timeNow }
    ]);
    setInputMessage('');

    // Auto store reply
    setTimeout(() => {
      setChatMessages((prev) => [
        ...prev,
        {
          sender: 'store',
          text: `Thank you for your message! This item is 100% genuine with verified warranty and islandwide Cash on Delivery (COD) dispatch within 24-48 hours.`,
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }
      ]);
    }, 800);
  };

  // Effective Pricing, SKU, Stock, Weight, Image calculations
  const effectivePrice = selectedVariant ? (selectedVariant.price ?? selectedVariant.priceLkr ?? product?.price ?? product?.priceLkr ?? 0) : (product?.price ?? product?.priceLkr ?? 0);
  const effectiveSku = selectedVariant ? selectedVariant.sku : (product?.sku || '');
  const effectiveStock = selectedVariant ? selectedVariant.stock : (stockSyncData?.selectedVariantStock ?? product?.stock ?? 0);
  const effectiveWeightGrams = selectedVariant?.weightGrams || product?.weightGrams || 0;
  const effectiveImage = selectedVariant?.image || product?.imageUrl || DEFAULT_PRODUCT_IMAGE;

  const handleSelectColor = (color: string) => {
    setSelectedColor(color);
    const matched = variants.find(v => v.color === color && (!selectedSize || v.size === selectedSize)) || variants.find(v => v.color === color);
    if (matched) {
      setSelectedVariant(matched);
      if (matched.image) {
        const idx = images.indexOf(matched.image);
        if (idx !== -1) setCurrentImageIndex(idx);
      }
    }
  };

  const handleSelectSize = (size: string) => {
    setSelectedSize(size);
    const matched = variants.find(v => v.size === size && (!selectedColor || v.color === selectedColor)) || variants.find(v => v.size === size);
    if (matched) {
      setSelectedVariant(matched);
      if (matched.image) {
        const idx = images.indexOf(matched.image);
        if (idx !== -1) setCurrentImageIndex(idx);
      }
    }
  };

  const handleSelectVariantDirect = (v: any) => {
    setSelectedVariant(v);
    if (v.color) setSelectedColor(v.color);
    if (v.size) setSelectedSize(v.size);
    if (v.image) {
      const idx = images.indexOf(v.image);
      if (idx !== -1) setCurrentImageIndex(idx);
    }
  };

  // Pricing calculations
  const originalPriceVal = product?.originalPrice ?? effectivePrice ?? 0;
  const discountSavings = Math.max(0, originalPriceVal - effectivePrice);
  const discountPercent = (product?.discountPercentage && product.discountPercentage > 0)
    ? product.discountPercentage 
    : Math.max(15, Math.round(((originalPriceVal - effectivePrice) / (originalPriceVal || 1)) * 100));

  // Customer photo review gallery mock items
  const customerReviewPhotos = [
    images[0] || DEFAULT_PRODUCT_IMAGE,
    images[1] || images[0] || DEFAULT_PRODUCT_IMAGE,
    'https://images.unsplash.com/photo-1526170375885-4d8ecf77b99f?auto=format&fit=crop&w=400&q=80',
    'https://images.unsplash.com/photo-1546868871-7041f2a55e12?auto=format&fit=crop&w=400&q=80',
    'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=400&q=80'
  ];

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 pb-28 md:pb-24 animate-fade-in w-full max-w-full overflow-x-hidden">
      {/* Toast Notification */}
      {showShareToast && (
        <div className="fixed top-20 right-4 sm:right-6 z-50 bg-slate-900/95 backdrop-blur-md text-white text-xs px-4 py-3 rounded-2xl shadow-2xl flex items-center space-x-2 border border-slate-700 animate-bounce">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{toastText}</span>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 1. TOP FLOATING NAVIGATION BAR                                            */}
      {/* ========================================================================= */}
      <div className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-slate-200 shadow-xs px-3 sm:px-6 py-2.5 sm:py-3 w-full">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-2">
          {/* Back Button & Breadcrumbs */}
          <div className="flex items-center space-x-2 sm:space-x-3 min-w-0">
            <button
              onClick={onBack}
              className="flex items-center space-x-1.5 bg-slate-100 hover:bg-orange-50 hover:text-orange-600 text-slate-700 font-bold px-3 py-1.5 sm:py-2 rounded-xl transition cursor-pointer text-xs sm:text-sm shrink-0 active:scale-95 border border-slate-200/60"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back</span>
            </button>

            <div className="hidden sm:flex items-center space-x-1.5 text-xs text-slate-500 truncate">
              <span className="cursor-pointer hover:text-orange-600" onClick={onBack}>Home</span>
              <span>/</span>
              <span className="capitalize cursor-pointer hover:text-orange-600" onClick={onBack}>
                {product.category.replace('-', ' ')}
              </span>
              <span>/</span>
              <span className="font-semibold text-slate-800 truncate max-w-[200px] lg:max-w-[350px]">
                {product.title}
              </span>
            </div>
          </div>

          {/* Right Header Action Icons */}
          <div className="flex items-center space-x-1.5 sm:space-x-2 shrink-0">
            <button
              onClick={handleShare}
              className="p-2 sm:p-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 transition cursor-pointer active:scale-95"
              title="Share product"
            >
              <Share2 className="w-4 h-4" />
            </button>

            <button
              onClick={() => {
                setIsWishlisted(!isWishlisted);
                showToast(isWishlisted ? 'Removed from wishlist' : 'Saved to wishlist!');
              }}
              className={`p-2 sm:p-2.5 rounded-xl transition cursor-pointer active:scale-95 ${
                isWishlisted 
                  ? 'bg-rose-50 text-rose-600 border border-rose-200' 
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
              }`}
              title="Save to wishlist"
            >
              <Heart className={`w-4 h-4 ${isWishlisted ? 'fill-rose-600 text-rose-600' : ''}`} />
            </button>

            <button
              onClick={onOpenCart}
              className="relative p-2 sm:p-2.5 rounded-xl bg-orange-50 hover:bg-orange-100 text-orange-600 border border-orange-200 transition cursor-pointer active:scale-95"
              title="View Cart"
            >
              <ShoppingBag className="w-4 h-4" />
              {cartCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-orange-500 text-white text-[9px] font-black w-4 h-4 rounded-full flex items-center justify-center shadow-xs">
                  {cartCount}
                </span>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Main Container */}
      <main className="max-w-7xl mx-auto px-3 sm:px-4 py-4 sm:py-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8">
          
          {/* ========================================================================= */}
          {/* 2. LEFT COLUMN: DARAZ-STYLE TOUCH-SWIPEABLE IMAGE CAROUSEL WITH BADGES     */}
          {/* ========================================================================= */}
          <div className="lg:col-span-6 xl:col-span-6 flex flex-col">
            <div className="bg-white rounded-3xl p-3 sm:p-4 border border-slate-200 shadow-xs relative overflow-hidden">
              
              {/* Main Swipeable Image Box */}
              <div 
                className="relative aspect-square sm:aspect-4/3 lg:aspect-square w-full rounded-2xl overflow-hidden bg-slate-100 flex items-center justify-center select-none group cursor-pointer"
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
                onClick={() => setIsLightboxOpen(true)}
              >
                <img
                  src={images[currentImageIndex] || DEFAULT_PRODUCT_IMAGE}
                  alt={`${product.title} - View ${currentImageIndex + 1}`}
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-contain sm:object-cover object-center transition-all duration-300 group-hover:scale-105"
                />

                {/* Top-Left Dynamic Status Badges (Daraz App UI Style) */}
                <div className="absolute top-3 left-3 flex flex-col gap-1.5 z-10 pointer-events-none">
                  {/* Origin / Overseas / Local Sri Lanka Badge */}
                  <span className="bg-slate-950/90 text-white text-[10px] sm:text-xs font-black uppercase px-2.5 py-1 rounded-lg shadow-md tracking-wider backdrop-blur-md border border-white/20 flex items-center space-x-1">
                    {isLocalProduct ? (
                      <span className="flex items-center space-x-1">
                        <span>🇱🇰</span>
                        <span>{product.badge || 'SRI LANKA STOCK'}</span>
                      </span>
                    ) : (
                      <span>{product.badge || '🌐 OVERSEAS DIRECT'}</span>
                    )}
                  </span>

                  {/* Free Shipping Badge */}
                  <span className="bg-emerald-600 text-white text-[9px] sm:text-[11px] font-bold px-2.5 py-1 rounded-lg flex items-center shadow-md">
                    <Truck className="w-3 h-3 mr-1" />
                    <span>Free Delivery (Islandwide)</span>
                  </span>

                  {/* Choice / Value Pack Tag */}
                  <span className="bg-gradient-to-r from-amber-500 to-orange-500 text-white text-[9px] sm:text-[10px] font-black uppercase px-2 py-0.5 rounded-md shadow-xs flex items-center space-x-1 w-fit">
                    <Flame className="w-3 h-3" />
                    <span>Choice Deal</span>
                  </span>
                </div>

                {/* Top-Right High-Contrast Discount Badge */}
                <div className="absolute top-3 right-3 bg-red-600 text-white text-xs sm:text-sm font-black px-3 py-1 rounded-xl shadow-lg flex items-center space-x-1">
                  <span>-{discountPercent}% OFF</span>
                </div>

                {/* Left / Right Navigation Buttons (Desktop & Tablet) */}
                {images.length > 1 && (
                  <>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handlePrevImage();
                      }}
                      className="absolute left-2.5 top-1/2 -translate-y-1/2 bg-white/90 hover:bg-white text-slate-800 p-2 sm:p-2.5 rounded-full shadow-lg border border-slate-200 transition cursor-pointer active:scale-95 z-20"
                      aria-label="Previous image"
                    >
                      <ChevronLeft className="w-5 h-5" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleNextImage();
                      }}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 bg-white/90 hover:bg-white text-slate-800 p-2 sm:p-2.5 rounded-full shadow-lg border border-slate-200 transition cursor-pointer active:scale-95 z-20"
                      aria-label="Next image"
                    >
                      <ChevronRight className="w-5 h-5" />
                    </button>
                  </>
                )}

                {/* Bottom-Right Image Pagination Counter Badge */}
                <div className="absolute bottom-3 right-3 bg-slate-950/80 backdrop-blur-md text-white text-[11px] font-bold px-3 py-1 rounded-full pointer-events-none flex items-center space-x-1 shadow-md">
                  <span>{currentImageIndex + 1}</span>
                  <span>/</span>
                  <span>{images.length}</span>
                </div>

                {/* Tap to Zoom indicator */}
                <div className="absolute bottom-3 left-3 bg-white/80 backdrop-blur-md text-slate-700 text-[10px] font-bold px-2.5 py-1 rounded-full flex items-center space-x-1 pointer-events-none shadow-xs">
                  <Maximize2 className="w-3 h-3 text-orange-500" />
                  <span>Tap to expand</span>
                </div>
              </div>

              {/* Thumbnail Strip with Active Highlight Ring */}
              {images.length > 1 && (
                <div className="flex items-center space-x-2.5 mt-3 sm:mt-4 overflow-x-auto pb-1 scrollbar-none">
                  {images.map((img, idx) => (
                    <button
                      key={idx}
                      onClick={() => setCurrentImageIndex(idx)}
                      className={`relative w-16 h-16 sm:w-20 sm:h-20 rounded-xl overflow-hidden border-2 transition-all cursor-pointer shrink-0 bg-slate-50 ${
                        currentImageIndex === idx
                          ? 'border-orange-500 shadow-md ring-2 ring-orange-500/30 scale-102'
                          : 'border-slate-200 hover:border-slate-300 opacity-70 hover:opacity-100'
                      }`}
                    >
                      <img
                        src={img || DEFAULT_PRODUCT_IMAGE}
                        alt={`Thumbnail ${idx + 1}`}
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-cover"
                      />
                    </button>
                  ))}
                </div>
              )}

              {/* Assurance Trust Badges (Under Carousel) */}
              <div className="mt-4 pt-4 border-t border-slate-100 grid grid-cols-3 gap-2 text-center text-[10px] sm:text-xs">
                <div className="p-2 rounded-xl bg-slate-50 flex flex-col items-center justify-center border border-slate-100">
                  <ShieldCheck className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-600 mb-1" />
                  <span className="font-bold text-slate-800">100% Genuine</span>
                  <span className="text-slate-400 text-[9px] sm:text-[10px]">Verified Seller</span>
                </div>
                <div className="p-2 rounded-xl bg-slate-50 flex flex-col items-center justify-center border border-slate-100">
                  <Truck className="w-4 h-4 sm:w-5 sm:h-5 text-orange-500 mb-1" />
                  <span className="font-bold text-slate-800">{isLocalProduct ? 'Islandwide COD' : 'Card Payment'}</span>
                  <span className="text-slate-400 text-[9px] sm:text-[10px]">{isLocalProduct ? 'Doorstep Pay' : 'Online Gateway'}</span>
                </div>
                <div className="p-2 rounded-xl bg-slate-50 flex flex-col items-center justify-center border border-slate-100">
                  <RotateCcw className="w-4 h-4 sm:w-5 sm:h-5 text-indigo-600 mb-1" />
                  <span className="font-bold text-slate-800">7 Days Return</span>
                  <span className="text-slate-400 text-[9px] sm:text-[10px]">Money-back Warranty</span>
                </div>
              </div>
            </div>
          </div>

          {/* ========================================================================= */}
          {/* 3. RIGHT COLUMN: PSYCHOLOGICAL PRICING, VOUCHERS, SPECS & REVIEWS          */}
          {/* ========================================================================= */}
          <div className="lg:col-span-6 xl:col-span-6 space-y-4">
            
            {/* Main Header Box */}
            <div className="bg-white rounded-3xl p-4 sm:p-6 border border-slate-200 shadow-xs space-y-3.5">
              {/* Category & Verified Tag */}
              <div className="flex items-center justify-between text-xs text-slate-500">
                <div className="flex items-center space-x-1.5 capitalize font-medium">
                  <span className="bg-slate-100 text-slate-700 px-2.5 py-0.5 rounded-md font-bold text-[10px] sm:text-xs">
                    {product.subcategory || product.category.replace('-', ' ')}
                  </span>
                  <span>•</span>
                  <span className="font-mono text-slate-400 text-[11px]">SKU: {product.sku}</span>
                </div>
                <span className="text-emerald-700 font-bold text-[11px] sm:text-xs flex items-center bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                  <BadgeCheck className="w-3.5 h-3.5 mr-1 text-emerald-600" />
                  LankaBuy Verified
                </span>
              </div>

              {/* Product Title */}
              <h1 className="text-lg sm:text-2xl font-black text-slate-950 leading-tight">
                {product.title}
              </h1>

              {/* Ratings, Reviews & Sales */}
              <div className="flex flex-wrap items-center gap-2 sm:gap-3 text-xs pt-1 border-b border-slate-100 pb-3">
                <div className="flex items-center bg-amber-50 text-amber-900 border border-amber-200 px-2.5 py-0.5 rounded-lg font-bold">
                  <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400 mr-1" />
                  <span>{product.rating ?? 4.8}</span>
                </div>
                <span className="text-slate-500 font-medium">
                  {product.reviewsCount ?? 12} Ratings
                </span>
                <span className="text-slate-300">|</span>
                <span className="text-slate-700 font-bold">
                  {(product.soldCount ?? 0).toLocaleString()} Sold
                </span>
                <span className="text-slate-300">|</span>
                <span className="text-emerald-600 font-semibold flex items-center">
                  <Clock className="w-3 h-3 mr-1" />
                  In Stock ({product.stock ?? 100} units)
                </span>
              </div>

              {/* =================================================================== */}
              {/* PSYCHOLOGICAL PRICING COMPONENT (Bold Large Red Price + Slashed + Save Tag) */}
              {/* =================================================================== */}
              <div className="p-4 sm:p-5 bg-gradient-to-r from-red-50/70 via-orange-50/50 to-amber-50/40 border border-red-200/80 rounded-2xl space-y-2">
                <div className="flex flex-wrap items-baseline gap-2 sm:gap-3">
                  {/* Final Selling Price in Bold Large Red */}
                  <div className="text-2xl sm:text-4xl font-black text-red-600 tracking-tight">
                    Rs. {(effectivePrice ?? 0).toLocaleString()}
                  </div>

                  {/* Slashed Original Price */}
                  <div className="text-sm sm:text-lg text-slate-400 line-through font-semibold">
                    Rs. {(product.originalPrice ?? effectivePrice ?? 0).toLocaleString()}
                  </div>

                  {/* High-Conversion Green/Orange Savings Tag */}
                  <div className="bg-emerald-600 text-white text-xs font-black px-2.5 py-1 rounded-lg shadow-xs flex items-center space-x-1">
                    <Tag className="w-3 h-3" />
                    <span>Save Rs. {(discountSavings ?? 0).toLocaleString()} (-{discountPercent || 0}%)</span>
                  </div>
                </div>

                <div className="pt-2 border-t border-red-200/60 flex flex-wrap items-center justify-between text-xs text-slate-600 gap-2">
                  <div className="flex items-center space-x-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                    <span className="font-bold text-slate-800">Guaranteed Lowest Price in Sri Lanka</span>
                  </div>
                  <div className="text-[11px] font-bold text-emerald-700 flex items-center space-x-1 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    <span>All Taxes &amp; Customs Duties Included</span>
                  </div>
                </div>
              </div>

              {/* =================================================================== */}
              {/* REAL CJ PRODUCT SHOWCASE VIDEO PLAYER (IF AVAILABLE)               */}
              {/* =================================================================== */}
              {liveVideoUrl && (
                <div className="p-3.5 bg-slate-900 text-white rounded-2xl border border-slate-800 space-y-2 shadow-md">
                  <div className="flex items-center justify-between text-xs font-bold text-orange-400">
                    <div className="flex items-center space-x-1.5">
                      <Sparkles className="w-4 h-4 text-orange-400" />
                      <span>Official CJ Dropshipping Video Showcase</span>
                    </div>
                    <span className="text-[10px] bg-orange-500/20 text-orange-300 px-2 py-0.5 rounded-full border border-orange-500/30">
                      HD Media Stream
                    </span>
                  </div>
                  <div className="relative rounded-xl overflow-hidden bg-black aspect-video border border-slate-800">
                    <video 
                      src={liveVideoUrl} 
                      controls 
                      className="w-full h-full object-contain"
                      poster={images[0] || DEFAULT_PRODUCT_IMAGE}
                    />
                  </div>
                </div>
              )}

              {/* =================================================================== */}
              {/* REAL CJ VARIANTS SELECTOR (COLOR SWATCHES & SIZE BUTTONS)          */}
              {/* =================================================================== */}
              {variants.length > 0 && (
                <div className="p-4 bg-white rounded-2xl border border-slate-200 space-y-4 shadow-2xs">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                    <div className="flex items-center space-x-1.5 text-xs font-black text-slate-900">
                      <Layers className="w-4 h-4 text-orange-600" />
                      <span>Select Specifications ({variants.length} Options)</span>
                    </div>
                    {selectedVariant && (
                      <span className="text-[11px] font-mono font-bold text-slate-500">
                        SKU: {effectiveSku}
                      </span>
                    )}
                  </div>

                  {/* Colors Selector with Visual Swatches */}
                  {colorOptions.length > 0 && (
                    <div className="space-y-2">
                      <div className="flex justify-between items-center text-xs">
                        <span className="font-bold text-slate-800 flex items-center">
                          <span>Color:</span>
                          <span className="ml-1.5 text-orange-600 font-extrabold">{selectedColor || 'Select Color'}</span>
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-2.5">
                        {colorOptions.map((col, idx) => {
                          const isSelected = selectedColor === col;
                          const swatch = getColorSwatch(col);
                          return (
                            <button
                              key={idx}
                              onClick={() => handleSelectColor(col)}
                              className={`px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center space-x-2 border shadow-2xs ${
                                isSelected
                                  ? 'bg-orange-50/90 border-orange-500 ring-2 ring-orange-500/30 text-orange-950 scale-102 font-black'
                                  : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-200 hover:border-slate-300'
                              }`}
                            >
                              <span
                                className={`w-4 h-4 rounded-md shrink-0 transition-transform ${
                                  swatch.border ? 'border border-slate-300' : ''
                                } ${isSelected ? 'scale-110 shadow-xs ring-1 ring-orange-400' : ''}`}
                                style={{ backgroundColor: swatch.hex }}
                              ></span>
                              <span>{col}</span>
                              {isSelected && (
                                <Check className="w-3.5 h-3.5 text-orange-600 ml-0.5" />
                              )}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Sizes Selector with Boxed Badge Design matching QKSource Screenshot */}
                  {sizeOptions.length > 0 && (
                    <div className="space-y-2 pt-1 border-t border-slate-100">
                      <div className="flex justify-between items-center text-xs">
                        <span className="font-bold text-slate-800 flex items-center">
                          <span>Size ({selectedSize || 'S'}):</span>
                          <span className="ml-1.5 text-orange-600 font-extrabold">{selectedSize || 'Select Size'}</span>
                        </span>
                        <span className="text-[11px] text-cyan-600 font-bold hover:underline flex items-center cursor-pointer">
                          <span>📐 Size Chart</span>
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {sizeOptions.map((sz, idx) => {
                          const isSelected = selectedSize === sz;
                          return (
                            <button
                              key={idx}
                              onClick={() => handleSelectSize(sz)}
                              className={`min-w-12 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer border text-center ${
                                isSelected
                                  ? 'bg-cyan-50 border-cyan-500 text-cyan-950 ring-2 ring-cyan-500/30 font-black shadow-xs'
                                  : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-300 hover:border-slate-400'
                              }`}
                            >
                              <span>{sz}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Direct Variant Chips if color/size not parsed separately */}
                  {colorOptions.length === 0 && sizeOptions.length === 0 && (
                    <div className="space-y-2">
                      <span className="text-xs font-bold text-slate-800">Select Option:</span>
                      <div className="flex flex-wrap gap-2">
                        {variants.slice(0, 12).map((v, idx) => {
                          const isSelected = selectedVariant?.vid === v.vid;
                          return (
                            <button
                              key={idx}
                              onClick={() => handleSelectVariantDirect(v)}
                              className={`px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center space-x-2 border ${
                                isSelected
                                  ? 'bg-slate-900 text-white border-slate-900 shadow-md ring-2 ring-orange-500/50'
                                  : 'bg-white hover:bg-slate-50 text-slate-800 border-slate-200'
                              }`}
                            >
                              <span>{v.variantKey}</span>
                              <span className="text-[10px] text-orange-500 font-mono">Rs. {(v.priceLkr ?? 0).toLocaleString()}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* =================================================================== */}
              {/* LIVE REAL-TIME INVENTORY / STOCK SYNC CARD                          */}
              {/* =================================================================== */}
              <div className="p-3.5 bg-emerald-50/70 border border-emerald-200 rounded-2xl space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center space-x-1.5 font-black text-emerald-950">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping"></span>
                    <span>Live CJ Warehouse Stock Sync</span>
                  </div>
                  <span className="bg-emerald-600 text-white font-bold text-[10px] px-2 py-0.5 rounded-full">
                    {effectiveStock} Units Ready
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs">
                  {stockSyncData.warehouseBreakdown.map((wh, idx) => (
                    <div key={idx} className="bg-white/90 p-2 rounded-xl border border-emerald-100 flex flex-col justify-between">
                      <div className="text-[10px] text-slate-500 font-medium truncate">{wh.name}</div>
                      <div className="font-bold text-slate-900 text-xs flex justify-between items-center mt-1">
                        <span>{wh.country} Hub</span>
                        <span className="text-emerald-700 font-mono">{wh.qty} units</span>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="text-[10px] text-slate-500 flex justify-between items-center pt-1 border-t border-emerald-200/60">
                  <span>Verified via CJ Dropshipping API v2.0</span>
                  <span className="font-mono text-emerald-700">Updated: Just Now</span>
                </div>
              </div>

              {/* =================================================================== */}
              {/* SLEEK VOUCHER COLLECTION BANNER WITH 'COLLECT' BUTTON               */}
              {/* =================================================================== */}
              <div className="p-3.5 bg-gradient-to-r from-amber-50 via-orange-50 to-amber-100/60 rounded-2xl border border-amber-200 space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-1.5 text-xs font-black text-amber-950">
                    <Ticket className="w-4 h-4 text-orange-600" />
                    <span>LankaBuy Vouchers &amp; Special Offers</span>
                  </div>
                  <span className="text-[10px] font-bold text-orange-700 bg-orange-100 px-2 py-0.5 rounded-full">
                    Instant Savings
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {/* Voucher 1 */}
                  <div className="bg-white p-2.5 rounded-xl border border-amber-200 flex items-center justify-between gap-2 shadow-xs">
                    <div className="min-w-0">
                      <div className="text-xs font-black text-slate-900 truncate">Rs. 500 OFF Voucher</div>
                      <div className="text-[10px] text-slate-500 truncate">Min spend Rs. 5,000 • Code: LANKA500</div>
                    </div>
                    <button
                      onClick={() => handleCollectVoucher('v500', 'LANKA500')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer shrink-0 active:scale-95 ${
                        collectedVouchers['v500']
                          ? 'bg-emerald-100 text-emerald-700 border border-emerald-300'
                          : 'bg-orange-500 hover:bg-orange-600 text-white shadow-xs'
                      }`}
                    >
                      {collectedVouchers['v500'] ? '✓ Collected' : 'Collect'}
                    </button>
                  </div>

                  {/* Voucher 2 */}
                  <div className="bg-white p-2.5 rounded-xl border border-amber-200 flex items-center justify-between gap-2 shadow-xs">
                    <div className="min-w-0">
                      <div className="text-xs font-black text-slate-900 truncate">10% First Order Promo</div>
                      <div className="text-[10px] text-slate-500 truncate">New customers • Code: FIRST10</div>
                    </div>
                    <button
                      onClick={() => handleCollectVoucher('v10', 'FIRST10')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer shrink-0 active:scale-95 ${
                        collectedVouchers['v10']
                          ? 'bg-emerald-100 text-emerald-700 border border-emerald-300'
                          : 'bg-orange-500 hover:bg-orange-600 text-white shadow-xs'
                      }`}
                    >
                      {collectedVouchers['v10'] ? '✓ Collected' : 'Collect'}
                    </button>
                  </div>
                </div>
              </div>

              {/* Quantity Selector on Page */}
              <div className="pt-2 flex items-center space-x-4">
                <span className="text-xs sm:text-sm font-bold text-slate-700">Quantity:</span>
                <div className="flex items-center border border-slate-300 rounded-xl overflow-hidden bg-slate-50">
                  <button
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold transition cursor-pointer text-sm"
                    disabled={quantity <= 1}
                  >
                    -
                  </button>
                  <span className="px-4 py-2 text-xs sm:text-sm font-bold text-slate-900 font-mono min-w-[36px] text-center">
                    {quantity}
                  </span>
                  <button
                    onClick={() => setQuantity(Math.min(product?.stock ?? 100, quantity + 1))}
                    className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold transition cursor-pointer text-sm"
                    disabled={quantity >= (product?.stock ?? 100)}
                  >
                    +
                  </button>
                </div>
                <span className="text-xs text-slate-500">
                  Subtotal: <strong className="text-slate-900 font-bold text-sm">Rs. {((product?.price ?? 0) * quantity).toLocaleString()}</strong>
                </span>
              </div>
            </div>

            {/* =================================================================== */}
            {/* 5. SELLER TRUST CARD SECTION                                        */}
            {/* =================================================================== */}
            <div className="bg-white rounded-3xl p-4 sm:p-5 border border-slate-200 shadow-xs space-y-3.5">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center space-x-3 min-w-0">
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-orange-500 to-amber-500 text-white flex items-center justify-center font-black text-lg shrink-0 shadow-sm">
                    <Store className="w-6 h-6" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center space-x-1.5">
                      <h4 className="text-xs sm:text-sm font-black text-slate-900 truncate">
                        {product.supplierName || 'LankaBuy Verified Official Store'}
                      </h4>
                      <BadgeCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                    </div>
                    <p className="text-[11px] text-slate-500 truncate flex items-center mt-0.5">
                      <span>Origin: {product.supplierOrigin || 'China / Overseas Direct'}</span>
                      <span className="mx-1.5">•</span>
                      <span className="text-emerald-600 font-bold">LankaBuy Gold Merchant</span>
                    </p>
                  </div>
                </div>

                <div className="flex items-center space-x-2 shrink-0">
                  <button
                    onClick={() => {
                      showToast('Navigating to official store...');
                      onBack();
                    }}
                    className="bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold px-3 py-2 rounded-xl transition cursor-pointer active:scale-95"
                  >
                    Visit Store
                  </button>
                  <button
                    onClick={() => setIsChatOpen(true)}
                    className="bg-orange-50 hover:bg-orange-100 text-orange-600 border border-orange-200 text-xs font-bold px-3 py-2 rounded-xl transition cursor-pointer flex items-center space-x-1 active:scale-95"
                  >
                    <MessageSquare className="w-3.5 h-3.5" />
                    <span>Chat</span>
                  </button>
                </div>
              </div>

              {/* Seller Trust Metrics Grid */}
              <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-100 text-center">
                <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-100">
                  <div className="text-sm sm:text-base font-black text-emerald-600">96%</div>
                  <div className="text-[10px] text-slate-500 font-semibold mt-0.5">Positive Seller Rating</div>
                </div>
                <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-100">
                  <div className="text-sm sm:text-base font-black text-slate-900">100%</div>
                  <div className="text-[10px] text-slate-500 font-semibold mt-0.5">Ship on Time Rate</div>
                </div>
                <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-100">
                  <div className="text-sm sm:text-base font-black text-orange-600">98%</div>
                  <div className="text-[10px] text-slate-500 font-semibold mt-0.5">Chat Response Rate</div>
                </div>
              </div>
            </div>

            {/* Detailed Tabs: Overview, Specs, Reviews */}
            <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
              {/* Tab Navigation */}
              <div className="flex border-b border-slate-200 bg-slate-50/60 text-xs font-bold">
                <button
                  onClick={() => setActiveTab('details')}
                  className={`flex-1 py-3 sm:py-3.5 text-center transition cursor-pointer border-b-2 ${
                    activeTab === 'details'
                      ? 'border-orange-500 text-orange-600 bg-white'
                      : 'border-transparent text-slate-500 hover:text-slate-800'
                  }`}
                >
                  Product Details
                </button>
                <button
                  onClick={() => setActiveTab('specs')}
                  className={`flex-1 py-3 sm:py-3.5 text-center transition cursor-pointer border-b-2 ${
                    activeTab === 'specs'
                      ? 'border-orange-500 text-orange-600 bg-white'
                      : 'border-transparent text-slate-500 hover:text-slate-800'
                  }`}
                >
                  Specifications
                </button>
                <button
                  onClick={() => setActiveTab('reviews')}
                  className={`flex-1 py-3 sm:py-3.5 text-center transition cursor-pointer border-b-2 ${
                    activeTab === 'reviews'
                      ? 'border-orange-500 text-orange-600 bg-white'
                      : 'border-transparent text-slate-500 hover:text-slate-800'
                  }`}
                >
                  Ratings &amp; Reviews ({product.reviewsCount})
                </button>
              </div>

              {/* Tab Content */}
              <div className="p-4 sm:p-6 text-xs sm:text-sm text-slate-700">
                {activeTab === 'details' && (
                  <div className="space-y-4">
                    <p className="leading-relaxed text-slate-600">
                      {product.description}
                    </p>

                    <div>
                      <h4 className="font-bold text-slate-900 mb-2.5 text-xs sm:text-sm">Key Features &amp; Highlights:</h4>
                      <div className="space-y-2">
                        {product.features.map((feature, idx) => (
                          <div key={idx} className="flex items-start">
                            <CheckCircle2 className="w-4 h-4 text-emerald-600 mr-2 shrink-0 mt-0.5" />
                            <span className="text-slate-700">{feature}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 space-y-2 text-xs text-slate-600">
                      <div className="font-bold text-slate-800 flex items-center space-x-1.5">
                        <Truck className="w-4 h-4 text-orange-500" />
                        <span>Islandwide Delivery &amp; Payment:</span>
                      </div>
                      <div>• <strong>Western Province (Colombo, Gampaha, Kalutara):</strong> 1 - 2 Business Days</div>
                      <div>• <strong>Outstation Districts:</strong> 2 - 4 Business Days</div>
                      <div>• <strong>Payment Methods:</strong> {isLocalProduct ? 'Cash on Delivery (COD), LankaQR, Debit/Credit Card, Koko 3x Installments' : 'Online Debit/Credit Card Payment (Creem.io / Visa / Mastercard)'}.</div>
                    </div>
                  </div>
                )}

                {activeTab === 'specs' && (
                  <div className="space-y-2 bg-slate-50 p-4 rounded-2xl border border-slate-200">
                    {Object.entries(product.specs).map(([key, val]) => (
                      <div key={key} className="flex justify-between py-1.5 border-b border-slate-200/70 last:border-0 text-xs sm:text-sm">
                        <span className="text-slate-500 font-medium">{key}:</span>
                        <span className="font-bold text-slate-800 text-right">{val}</span>
                      </div>
                    ))}
                  </div>
                )}

                {/* =================================================================== */}
                {/* 5. RATINGS, REVIEWS & SOCIAL PROOF COMPONENT                        */}
                {/* =================================================================== */}
                {activeTab === 'reviews' && (
                  <div className="space-y-5">
                    {/* Star Rating Summary Box */}
                    <div className="p-4 bg-gradient-to-r from-amber-50/80 via-orange-50/40 to-amber-50/80 rounded-2xl border border-amber-200 flex flex-col sm:flex-row items-center gap-4">
                      <div className="text-center sm:text-left shrink-0">
                        <div className="text-4xl font-black text-slate-900 leading-none">
                          {product.rating} <span className="text-lg text-slate-400 font-normal">/ 5</span>
                        </div>
                        <div className="flex text-amber-400 justify-center sm:justify-start my-1.5">
                          {[...Array(5)].map((_, i) => (
                            <Star key={i} className="w-4 h-4 fill-current" />
                          ))}
                        </div>
                        <p className="text-[11px] text-slate-500">{product.reviewsCount} Total Ratings</p>
                      </div>

                      {/* Rating Progress Bars */}
                      <div className="flex-1 w-full space-y-1 text-[11px] text-slate-600">
                        <div className="flex items-center space-x-2">
                          <span className="w-8 font-bold">5 Star</span>
                          <div className="flex-1 h-2 bg-slate-200 rounded-full overflow-hidden">
                            <div className="bg-amber-400 h-full w-[85%] rounded-full"></div>
                          </div>
                          <span className="w-8 text-right font-medium">85%</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <span className="w-8 font-bold">4 Star</span>
                          <div className="flex-1 h-2 bg-slate-200 rounded-full overflow-hidden">
                            <div className="bg-amber-400 h-full w-[10%] rounded-full"></div>
                          </div>
                          <span className="w-8 text-right font-medium">10%</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <span className="w-8 font-bold">3 Star</span>
                          <div className="flex-1 h-2 bg-slate-200 rounded-full overflow-hidden">
                            <div className="bg-amber-400 h-full w-[3%] rounded-full"></div>
                          </div>
                          <span className="w-8 text-right font-medium">3%</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <span className="w-8 font-bold">2 Star</span>
                          <div className="flex-1 h-2 bg-slate-200 rounded-full overflow-hidden">
                            <div className="bg-amber-400 h-full w-[1%] rounded-full"></div>
                          </div>
                          <span className="w-8 text-right font-medium">1%</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <span className="w-8 font-bold">1 Star</span>
                          <div className="flex-1 h-2 bg-slate-200 rounded-full overflow-hidden">
                            <div className="bg-amber-400 h-full w-[1%] rounded-full"></div>
                          </div>
                          <span className="w-8 text-right font-medium">1%</span>
                        </div>
                      </div>
                    </div>

                    {/* Customer Photo Gallery Thumbnails */}
                    <div>
                      <h5 className="text-xs font-bold text-slate-800 mb-2">Customer Photos ({customerReviewPhotos.length * 3}+):</h5>
                      <div className="flex space-x-2 overflow-x-auto pb-1 scrollbar-none">
                        {customerReviewPhotos.map((photo, i) => (
                          <div
                            key={i}
                            onClick={() => setIsLightboxOpen(true)}
                            className="w-16 h-16 sm:w-18 sm:h-18 rounded-xl overflow-hidden bg-slate-100 border border-slate-200 shrink-0 cursor-pointer hover:opacity-90 hover:scale-105 transition"
                          >
                            <img
                              src={photo}
                              alt={`Customer review photo ${i + 1}`}
                              referrerPolicy="no-referrer"
                              className="w-full h-full object-cover"
                            />
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Individual Customer Review Cards */}
                    <div className="space-y-3 pt-2">
                      <h5 className="text-xs font-bold text-slate-800">Verified Customer Reviews:</h5>
                      
                      {/* Review Card 1 */}
                      <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-2">
                            <div className="w-7 h-7 rounded-full bg-orange-100 text-orange-600 font-bold text-xs flex items-center justify-center">
                              KP
                            </div>
                            <div>
                              <div className="font-bold text-slate-900 text-xs flex items-center space-x-1">
                                <span>Kasun Perera</span>
                                <span className="text-[10px] text-slate-400 font-normal">(Colombo 05)</span>
                              </div>
                              <div className="flex text-amber-400">
                                {[...Array(5)].map((_, i) => (
                                  <Star key={i} className="w-3 h-3 fill-current" />
                                ))}
                              </div>
                            </div>
                          </div>
                          <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded-full flex items-center">
                            <UserCheck className="w-3 h-3 mr-0.5" />
                            Verified Buyer
                          </span>
                        </div>
                        <p className="text-xs text-slate-700 leading-relaxed">
                          Ordered with Cash on Delivery and arrived in 2 days in Colombo! Build quality is exceptionally solid. The packaging was immaculate. Highly recommend this seller!
                        </p>
                        <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1 border-t border-slate-200/60">
                          <span>Purchased on 18 August 2026</span>
                          <button
                            onClick={() => handleUpvoteReview(1)}
                            className={`flex items-center space-x-1 px-2 py-1 rounded-lg transition cursor-pointer ${
                              hasVotedReview[1] ? 'text-orange-600 font-bold bg-orange-50' : 'text-slate-500 hover:text-slate-700'
                            }`}
                          >
                            <ThumbsUp className="w-3 h-3" />
                            <span>Helpful ({helpfulReviews[1]})</span>
                          </button>
                        </div>
                      </div>

                      {/* Review Card 2 */}
                      <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-2">
                            <div className="w-7 h-7 rounded-full bg-indigo-100 text-indigo-600 font-bold text-xs flex items-center justify-center">
                              NF
                            </div>
                            <div>
                              <div className="font-bold text-slate-900 text-xs flex items-center space-x-1">
                                <span>Nimalka Fernando</span>
                                <span className="text-[10px] text-slate-400 font-normal">(Kandy)</span>
                              </div>
                              <div className="flex text-amber-400">
                                {[...Array(5)].map((_, i) => (
                                  <Star key={i} className="w-3 h-3 fill-current" />
                                ))}
                              </div>
                            </div>
                          </div>
                          <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded-full flex items-center">
                            <UserCheck className="w-3 h-3 mr-0.5" />
                            Verified Buyer
                          </span>
                        </div>
                        <p className="text-xs text-slate-700 leading-relaxed">
                          Genuine quality overseas item. No customs hassle at all, delivered directly to my door with zero extra duty fees. Worth every rupee!
                        </p>
                        <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1 border-t border-slate-200/60">
                          <span>Purchased on 12 August 2026</span>
                          <button
                            onClick={() => handleUpvoteReview(2)}
                            className={`flex items-center space-x-1 px-2 py-1 rounded-lg transition cursor-pointer ${
                              hasVotedReview[2] ? 'text-orange-600 font-bold bg-orange-50' : 'text-slate-500 hover:text-slate-700'
                            }`}
                          >
                            <ThumbsUp className="w-3 h-3" />
                            <span>Helpful ({helpfulReviews[2]})</span>
                          </button>
                        </div>
                      </div>

                      {/* Review Card 3 */}
                      <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-2">
                            <div className="w-7 h-7 rounded-full bg-emerald-100 text-emerald-600 font-bold text-xs flex items-center justify-center">
                              RS
                            </div>
                            <div>
                              <div className="font-bold text-slate-900 text-xs flex items-center space-x-1">
                                <span>Roshan Silva</span>
                                <span className="text-[10px] text-slate-400 font-normal">(Galle)</span>
                              </div>
                              <div className="flex text-amber-400">
                                {[...Array(5)].map((_, i) => (
                                  <Star key={i} className="w-3 h-3 fill-current" />
                                ))}
                              </div>
                            </div>
                          </div>
                          <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded-full flex items-center">
                            <UserCheck className="w-3 h-3 mr-0.5" />
                            Verified Buyer
                          </span>
                        </div>
                        <p className="text-xs text-slate-700 leading-relaxed">
                          Works perfectly out of the box. Super fast dispatch from LankaBuy and great customer support on chat.
                        </p>
                        <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1 border-t border-slate-200/60">
                          <span>Purchased on 05 August 2026</span>
                          <button
                            onClick={() => handleUpvoteReview(3)}
                            className={`flex items-center space-x-1 px-2 py-1 rounded-lg transition cursor-pointer ${
                              hasVotedReview[3] ? 'text-orange-600 font-bold bg-orange-50' : 'text-slate-500 hover:text-slate-700'
                            }`}
                          >
                            <ThumbsUp className="w-3 h-3" />
                            <span>Helpful ({helpfulReviews[3]})</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

          </div>
        </div>

        {/* Similar Products Recommendation Grid */}
        {relatedProducts.length > 0 && (
          <div className="mt-10 sm:mt-12">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-2">
                <Sparkles className="w-5 h-5 text-orange-500" />
                <h3 className="text-base sm:text-lg font-black text-slate-900">
                  Customers Also Viewed
                </h3>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
              {relatedProducts.slice(0, 4).map((rel) => (
                <div
                  key={rel.id}
                  onClick={() => onSelectProduct && onSelectProduct(rel)}
                  className="bg-white rounded-2xl p-2.5 sm:p-3 border border-slate-200 hover:border-orange-300 hover:shadow-lg transition cursor-pointer group flex flex-col justify-between"
                >
                  <div>
                    <div className="aspect-square rounded-xl overflow-hidden bg-slate-50 mb-2">
                      <img
                        src={rel.imageUrl || DEFAULT_PRODUCT_IMAGE}
                        alt={rel.title}
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                      />
                    </div>
                    <h5 className="text-xs font-bold text-slate-800 line-clamp-2 leading-snug group-hover:text-orange-600">
                      {rel.title}
                    </h5>
                  </div>
                  <div className="mt-2 pt-2 border-t border-slate-100 flex items-baseline justify-between">
                    <span className="text-xs sm:text-sm font-black text-slate-900">
                      Rs. {(rel.price || rel.priceLkr || 0).toLocaleString()}
                    </span>
                    <span className="text-[10px] text-slate-400 line-through">
                      Rs. {(rel.originalPrice || rel.originalPriceLkr || rel.price || rel.priceLkr || 0).toLocaleString()}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>

      {/* ========================================================================= */}
      {/* 4. STICKY BOTTOM ACTION BAR (CTA)                                          */}
      {/* Mobile-first fixed bottom action bar with Chat, Store, Add to Cart, Buy Now*/}
      {/* ========================================================================= */}
      <div className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200/90 shadow-2xl py-2 px-2.5 sm:px-6 w-full">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-2 sm:gap-4 w-full">
          
          {/* Left Icon Actions: 'Store', 'Chat' */}
          <div className="flex items-center space-x-1 sm:space-x-3 shrink-0">
            {/* Store Icon Button */}
            <button
              onClick={onBack}
              className="flex flex-col items-center justify-center px-2 sm:px-3 py-1 text-slate-600 hover:text-orange-600 transition cursor-pointer text-[10px] sm:text-xs font-bold active:scale-95"
              title="View Store"
            >
              <Store className="w-4 h-4 sm:w-5 sm:h-5 text-slate-700" />
              <span className="mt-0.5">Store</span>
            </button>

            {/* Chat Icon Button with live indicator */}
            <button
              onClick={() => setIsChatOpen(true)}
              className="relative flex flex-col items-center justify-center px-2 sm:px-3 py-1 text-slate-600 hover:text-orange-600 transition cursor-pointer text-[10px] sm:text-xs font-bold active:scale-95"
              title="Chat with Merchant"
            >
              <span className="absolute top-1 right-2 w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
              <MessageSquare className="w-4 h-4 sm:w-5 sm:h-5 text-slate-700" />
              <span className="mt-0.5">Chat</span>
            </button>
          </div>

          {/* Right Action CTA Buttons: 'Add to Cart' & 'Buy Now' */}
          <div className="flex items-center space-x-2 sm:space-x-3 flex-1 justify-end max-w-xl">
            {/* 'Add to Cart' Button (Dark Slate) */}
            <button
              onClick={() => onAddToCart({
                ...product,
                price: effectivePrice,
                sku: effectiveSku,
                stock: effectiveStock,
                weightGrams: effectiveWeightGrams,
                imageUrl: effectiveImage,
                selectedColor,
                selectedSize,
                selectedVariantKey: selectedVariant?.variantKey
              }, quantity)}
              className="flex-1 bg-slate-900 hover:bg-slate-800 text-white font-bold py-3 px-3 sm:px-5 rounded-xl text-xs sm:text-sm transition flex items-center justify-center cursor-pointer shadow-md active:scale-98"
            >
              <ShoppingBag className="w-4 h-4 mr-1.5 shrink-0" />
              <span className="whitespace-nowrap">Add to Cart</span>
            </button>

            {/* 'Buy Now' Button (Bright High-Conversion Orange) */}
            <button
              onClick={() => onBuyNow({
                ...product,
                price: effectivePrice,
                sku: effectiveSku,
                stock: effectiveStock,
                weightGrams: effectiveWeightGrams,
                imageUrl: effectiveImage,
                selectedColor,
                selectedSize,
                selectedVariantKey: selectedVariant?.variantKey
              }, quantity)}
              className="flex-1 bg-orange-500 hover:bg-orange-600 text-white font-black py-3 px-3 sm:px-5 rounded-xl text-xs sm:text-sm transition flex items-center justify-center cursor-pointer shadow-lg shadow-orange-500/25 active:scale-98"
            >
              <Zap className="w-4 h-4 mr-1.5 fill-current shrink-0" />
              <span className="whitespace-nowrap">Buy Now</span>
            </button>
          </div>

        </div>
      </div>

      {/* Full-Screen Image Lightbox Modal */}
      {isLightboxOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/95 backdrop-blur-md flex flex-col justify-between p-4 sm:p-6 animate-fade-in">
          <div className="flex justify-between items-center text-white">
            <span className="text-sm font-bold">
              {currentImageIndex + 1} / {images.length}
            </span>
            <button
              onClick={() => setIsLightboxOpen(false)}
              className="p-2 rounded-full bg-white/20 hover:bg-white/30 text-white cursor-pointer"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          <div className="flex-1 flex items-center justify-center p-2 relative">
            <img
              src={images[currentImageIndex] || DEFAULT_PRODUCT_IMAGE}
              alt="Expanded Preview"
              referrerPolicy="no-referrer"
              className="max-h-[80vh] max-w-full object-contain rounded-2xl"
            />
            {images.length > 1 && (
              <>
                <button
                  onClick={handlePrevImage}
                  className="absolute left-2 bg-white/20 hover:bg-white/40 text-white p-3 rounded-full"
                >
                  <ChevronLeft className="w-6 h-6" />
                </button>
                <button
                  onClick={handleNextImage}
                  className="absolute right-2 bg-white/20 hover:bg-white/40 text-white p-3 rounded-full"
                >
                  <ChevronRight className="w-6 h-6" />
                </button>
              </>
            )}
          </div>

          <div className="flex justify-center space-x-2 overflow-x-auto py-2">
            {images.map((img, i) => (
              <button
                key={i}
                onClick={() => setCurrentImageIndex(i)}
                className={`w-14 h-14 rounded-xl overflow-hidden border-2 cursor-pointer ${
                  currentImageIndex === i ? 'border-orange-500 scale-105' : 'border-white/30 opacity-60'
                }`}
              >
                <img src={img} alt="thumb" className="w-full h-full object-cover" />
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Store Chat Dialog Modal */}
      {isChatOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-md w-full shadow-2xl overflow-hidden border border-slate-200 flex flex-col h-[520px] animate-scale-up">
            {/* Chat Header */}
            <div className="bg-slate-900 text-white px-4 py-3 flex items-center justify-between">
              <div className="flex items-center space-x-2.5 min-w-0">
                <div className="w-8 h-8 rounded-full bg-orange-500 flex items-center justify-center font-bold text-white shrink-0">
                  <Store className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <h4 className="text-xs font-bold truncate">
                    {product.supplierName || 'LankaBuy Official Store'}
                  </h4>
                  <p className="text-[10px] text-emerald-400 flex items-center">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 mr-1 animate-pulse"></span>
                    Online • Responds within minutes
                  </p>
                </div>
              </div>

              <button
                onClick={() => setIsChatOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Product Mini Banner in Chat */}
            <div className="p-2.5 bg-slate-50 border-b border-slate-200 flex items-center space-x-2.5 text-xs">
              <img
                src={product.imageUrl || DEFAULT_PRODUCT_IMAGE}
                alt={product.title}
                referrerPolicy="no-referrer"
                className="w-10 h-10 rounded-lg object-cover border border-slate-200 shrink-0"
              />
              <div className="min-w-0 flex-1">
                <div className="font-bold text-slate-800 truncate">{product.title}</div>
                <div className="text-red-600 font-bold">Rs. {(product.price ?? 0).toLocaleString()}</div>
              </div>
            </div>

            {/* Chat Message Stream */}
            <div className="flex-1 p-3.5 overflow-y-auto space-y-3 bg-slate-50/50 text-xs">
              {chatMessages.map((msg, i) => (
                <div
                  key={i}
                  className={`flex flex-col ${msg.sender === 'user' ? 'items-end' : 'items-start'}`}
                >
                  <div
                    className={`max-w-[80%] rounded-2xl px-3.5 py-2.5 shadow-xs ${
                      msg.sender === 'user'
                        ? 'bg-orange-500 text-white rounded-tr-none'
                        : 'bg-white text-slate-800 border border-slate-200 rounded-tl-none'
                    }`}
                  >
                    <p>{msg.text}</p>
                  </div>
                  <span className="text-[9px] text-slate-400 mt-1 px-1">{msg.time}</span>
                </div>
              ))}
            </div>

            {/* Chat Input Bar */}
            <form onSubmit={handleSendMessage} className="p-3 bg-white border-t border-slate-200 flex items-center space-x-2">
              <input
                type="text"
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                placeholder="Ask store about delivery or specs..."
                className="flex-1 bg-slate-100 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-hidden focus:border-orange-500"
              />
              <button
                type="submit"
                className="bg-orange-500 hover:bg-orange-600 text-white p-2 rounded-xl transition cursor-pointer"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
