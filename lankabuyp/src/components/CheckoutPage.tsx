import React, { useState, useEffect, useRef } from 'react';
import { 
  ArrowLeft, 
  ShieldCheck, 
  Truck, 
  CreditCard, 
  Banknote, 
  Loader2, 
  PackageCheck, 
  AlertCircle, 
  QrCode, 
  Sparkles, 
  MapPin, 
  Phone, 
  Mail, 
  User, 
  Tag, 
  Check, 
  Plus, 
  Minus, 
  Lock, 
  HelpCircle,
  Clock,
  CheckCircle2,
  ChevronRight,
  ExternalLink,
  Zap,
  Globe,
  Building2,
  Home,
  Briefcase
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Product, CartItem, ShippingAddress, Order, DEFAULT_PRODUCT_IMAGE, UserAddress, UserProfile } from '../types';
import { SRI_LANKA_PROVINCES, getProvinceForDistrict } from '../lib/sriLankaAddressData';
import { getColorSwatch } from '../lib/colorUtils';
import { getFirebaseIdToken } from '../lib/firebase';

interface CheckoutPageProps {
  cartItems: CartItem[];
  directProduct?: Product | null;
  directQuantity?: number;
  initialDiscount?: number;
  initialVoucherCode?: string;
  onBack: () => void;
  onOrderSuccess: (order: Order) => void;
  allProducts?: Product[];
  userAddresses?: UserAddress[];
  currentUser?: UserProfile | null;
  onOpenAddAddress?: () => void;
}

const SRI_LANKA_DISTRICTS = [
  'Colombo', 'Gampaha', 'Kalutara', 'Kandy', 'Matale', 'Nuwara Eliya',
  'Galle', 'Matara', 'Hambantota', 'Jaffna', 'Kilinochchi', 'Mannar',
  'Vavuniya', 'Mullaitivu', 'Batticaloa', 'Ampara', 'Trincomalee',
  'Kurunegala', 'Puttalam', 'Anuradhapura', 'Polonnaruwa', 'Badulla',
  'Monaragala', 'Ratnapura', 'Kegalle'
];

// Helper to obtain the authentic CJ Dropshipping source URL for a product
const getCjProductUrl = (product: Product): string => {
  if (product.cjDirectUrl && !product.cjDirectUrl.includes('undefined')) return product.cjDirectUrl;
  
  let rawPid = '';
  if (product.supplierProductId) {
    rawPid = product.supplierProductId;
  } else {
    const idStr = String(product.id || '');
    if (idStr.startsWith('global-cj-')) {
      rawPid = idStr.replace('global-cj-', '');
    } else if (idStr.includes('cj-')) {
      rawPid = idStr.split('cj-')[1];
    } else if (product.specs && product.specs['CJ Product ID']) {
      rawPid = product.specs['CJ Product ID'];
    } else if (product.sku && product.sku.length > 5) {
      rawPid = product.sku;
    } else {
      rawPid = product.id || '';
    }
  }

  if (rawPid && rawPid.length > 3 && !rawPid.includes(' ')) {
    return `https://cjdropshipping.com/product-detail.html?id=${encodeURIComponent(rawPid)}`;
  }

  return `https://cjdropshipping.com/search/${encodeURIComponent(product.title || 'product')}.html`;
};

export const CheckoutPage: React.FC<CheckoutPageProps> = ({
  cartItems,
  directProduct,
  directQuantity = 1,
  initialDiscount = 0,
  initialVoucherCode = '',
  onBack,
  onOrderSuccess,
  allProducts = [],
  userAddresses = [],
  currentUser,
  onOpenAddAddress,
}) => {
  // Determine active checkout items: either direct buy item or cart items, or fallback parsed from URL query
  const [checkoutItems, setCheckoutItems] = useState<CartItem[]>(() => {
    if (directProduct) {
      return [{ product: directProduct, quantity: directQuantity }];
    }
    if (cartItems && cartItems.length > 0) {
      return cartItems;
    }

    // Fallback: Attempt to reconstruct from URL parameters if refreshed or opened directly
    try {
      const searchParams = new URLSearchParams(window.location.search);
      const paramId = searchParams.get('productId');
      const paramPrice = Number(searchParams.get('price')) || 0;
      const paramQty = Math.max(1, Number(searchParams.get('quantity') || searchParams.get('qty')) || 1);
      const paramTitle = searchParams.get('title') || 'Selected Product';
      const paramImage = searchParams.get('image') || DEFAULT_PRODUCT_IMAGE;
      const paramSku = searchParams.get('sku') || 'LKB-DIRECT';

      if (paramId) {
        // Try matching with existing catalog
        const matched = allProducts.find(p => p.id === paramId);
        if (matched) {
          return [{ product: matched, quantity: paramQty }];
        }

        // Otherwise construct synthetic product from preserved URL metadata
        const fallbackProduct: Product = {
          id: paramId,
          title: paramTitle,
          slug: paramId.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
          category: searchParams.get('category') || 'general',
          price: paramPrice > 0 ? paramPrice : 3500,
          originalPrice: paramPrice > 0 ? Math.round(paramPrice * 1.3) : 4500,
          discountPercentage: 23,
          wholesaleCost: Number(searchParams.get('wholesaleCost')) || Math.round(paramPrice * 0.7),
          sku: paramSku,
          supplierName: 'LankaBuy Verified Merchant',
          supplierOrigin: 'Overseas Logistics Hub',
          rating: 4.8,
          reviewsCount: 142,
          soldCount: 890,
          stock: 50,
          imageUrl: paramImage,
          galleryImages: [paramImage],
          description: paramTitle,
          features: ['Genuine LankaBuy product', 'Verified QC Check', 'Islandwide Express Delivery'],
          specs: { 'Origin': 'Overseas Direct', 'Warranty': '7 Days Replacement' },
          freeShipping: searchParams.get('shipping') === '0' || paramPrice >= 5000,
          estimatedDeliveryDays: 3,
        };
        return [{ product: fallbackProduct, quantity: paramQty }];
      }
    } catch {
      // ignore
    }

    return [];
  });

  // Selected address state
  const defaultAddress = userAddresses.find(a => a.isDefault) || userAddresses[0];
  const [selectedAddressId, setSelectedAddressId] = useState<string | null>(defaultAddress ? defaultAddress.id : null);

  // Shipping form data prefilled from user profile / default address
  const [formData, setFormData] = useState<ShippingAddress>(() => {
    if (defaultAddress) {
      return {
        fullName: defaultAddress.fullName,
        phone: defaultAddress.phone,
        email: currentUser?.email || 'customer@lankabuy.lk',
        street: defaultAddress.street,
        city: defaultAddress.city,
        district: defaultAddress.district,
        province: defaultAddress.province || getProvinceForDistrict(defaultAddress.district),
        postalCode: '00400',
        country: 'Sri Lanka',
      };
    }
    try {
      const saved = localStorage.getItem('lankabuy_user_address');
      if (saved) return JSON.parse(saved);
    } catch {}
    return {
      fullName: currentUser?.displayName || '',
      phone: '',
      email: currentUser?.email || '',
      street: '',
      city: '',
      district: 'Colombo',
      province: 'Western Province',
      postalCode: '',
      country: 'Sri Lanka',
    };
  });

  // Address validation check (must have street address & city entered)
  const hasValidAddress = Boolean(
    formData.street && formData.street.trim().length >= 3 &&
    formData.city && formData.city.trim().length >= 2
  );

  // Selected Province state
  const [selectedProvince, setSelectedProvince] = useState<string>(() => 
    getProvinceForDistrict(formData.district)
  );

  const handleProvinceChange = (provinceName: string) => {
    setSelectedProvince(provinceName);
    const prov = SRI_LANKA_PROVINCES.find(p => p.nameEn === provinceName);
    const defaultDistrict = prov ? prov.districts[0] : 'Colombo';
    setFormData(prev => ({
      ...prev,
      district: defaultDistrict
    }));
  };

  const handleSelectSavedAddress = (addr: UserAddress) => {
    setSelectedAddressId(addr.id);
    const prov = getProvinceForDistrict(addr.district);
    setSelectedProvince(prov);
    setFormData({
      fullName: addr.fullName,
      phone: addr.phone,
      email: currentUser?.email || formData.email || 'customer@lankabuy.lk',
      street: addr.street,
      city: addr.city,
      district: addr.district,
      province: addr.province || prov,
      postalCode: '00400',
      country: 'Sri Lanka',
    });
  };

  // Keep selected address and form data in sync when userAddresses list changes
  useEffect(() => {
    if (userAddresses && userAddresses.length > 0) {
      const active = userAddresses.find(a => a.id === selectedAddressId) || userAddresses.find(a => a.isDefault) || userAddresses[0];
      if (active) {
        setSelectedAddressId(active.id);
        const prov = getProvinceForDistrict(active.district);
        setSelectedProvince(prov);
        setFormData(prev => ({
          ...prev,
          fullName: active.fullName,
          phone: active.phone,
          email: currentUser?.email || prev.email || 'customer@lankabuy.lk',
          street: active.street,
          city: active.city,
          district: active.district,
          province: active.province || prov,
          postalCode: '00400',
          country: 'Sri Lanka',
        }));
      }
    } else {
      setSelectedAddressId(null);
      setFormData(prev => ({
        ...prev,
        fullName: currentUser?.displayName || '',
        phone: '',
        email: currentUser?.email || '',
        street: '',
        city: '',
        district: 'Colombo',
        province: 'Western Province',
        postalCode: '',
        country: 'Sri Lanka',
      }));
    }
  }, [userAddresses, currentUser]);

  const [deliveryNote, setDeliveryNote] = useState('');
  const [deliverySpeed, setDeliverySpeed] = useState<'standard' | 'express'>('standard');
  const [paymentMethod, setPaymentMethod] = useState<'CREDIT_CARD'>('CREDIT_CARD');
  
  // Voucher management
  const [voucherCodeInput, setVoucherCodeInput] = useState(initialVoucherCode);
  const [appliedVoucher, setAppliedVoucher] = useState<{ code: string; discount: number } | null>(
    initialDiscount > 0 ? { code: initialVoucherCode || 'APPLIED', discount: initialDiscount } : null
  );
  const [voucherError, setVoucherError] = useState('');
  const [voucherSuccess, setVoucherSuccess] = useState(initialDiscount > 0 ? 'Voucher applied!' : '');

  // Submission states
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isSubmittingRef = useRef(false);
  const [submissionStep, setSubmissionStep] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  // Keep checkout items reactive if directProduct prop updates
  useEffect(() => {
    if (directProduct) {
      setCheckoutItems([{ product: directProduct, quantity: directQuantity }]);
    }
  }, [directProduct?.id, directQuantity]);

  // Scroll to top on mount
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  // Update quantity for a product in the checkout
  const handleUpdateQty = (productId: string, delta: number) => {
    setCheckoutItems(prev => prev.map(item => {
      if (item.product.id === productId) {
        const newQty = Math.max(1, item.quantity + delta);
        return { ...item, quantity: newQty };
      }
      return item;
    }));
  };

  // Form input handler
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  // Real-Time Dynamic CJ Dropshipping Freight Calculation State
  const [freightData, setFreightData] = useState<{
    shippable: boolean;
    errorMessage: string;
    shippingFeeLkr: number;
    shippingFeeUsd: number;
    carrierName: string;
    deliveryAging: string;
    totalWeightGrams: number;
    itemsWeightBreakdown: Array<{
      productId: string;
      title: string;
      sku: string;
      quantity: number;
      weightGrams: number;
      totalWeightGrams: number;
    }>;
    isCalculating: boolean;
    exchangeRate: number;
  }>({
    shippable: true,
    errorMessage: '',
    shippingFeeLkr: 0,
    shippingFeeUsd: 0,
    carrierName: '',
    deliveryAging: '',
    totalWeightGrams: 0,
    itemsWeightBreakdown: [],
    isCalculating: true,
    exchangeRate: 315,
  });

  // Dynamic Trigger: Call CJ Freight API whenever destination address or cart items change
  useEffect(() => {
    let isMounted = true;

    // RULE: Do NOT calculate or show shipping fee until user enters a valid street address & city
    if (!hasValidAddress) {
      setFreightData(prev => ({
        ...prev,
        isCalculating: false,
        shippable: true,
        shippingFeeLkr: 0,
        shippingFeeUsd: 0,
        errorMessage: 'ADDRESS_REQUIRED'
      }));
      return;
    }

    const timer = setTimeout(async () => {
      if (checkoutItems.length === 0) return;
      setFreightData(prev => ({ ...prev, isCalculating: true }));

      try {
        const response = await fetch('/api/logistic/freightCalculate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            startCountryCode: 'CN',
            endCountryCode: 'LK',
            country: formData.country || 'Sri Lanka',
            city: formData.city || 'Kegalle',
            district: formData.district || 'Sabaragamuwa',
            zipCode: formData.postalCode || '71000',
            items: checkoutItems.map(ci => ({
              productId: ci.product.id,
              sku: ci.product.sku,
              quantity: ci.quantity,
              weightGrams: ci.product.weightGrams,
              title: ci.product.title
            }))
          })
        });

        const resData = await response.json();
        if (isMounted && resData) {
          if (resData.success) {
            setFreightData({
              shippable: resData.shippable !== false,
              errorMessage: resData.errorMessage || '',
              shippingFeeLkr: resData.shippable !== false ? (resData.shippingFeeLkr || 1024) : 0,
              shippingFeeUsd: resData.shippable !== false ? (resData.shippingFeeUsd || 3.25) : 0,
              carrierName: resData.carrierName || 'QSPacket Eub (CJ Direct Air Express)',
              deliveryAging: resData.deliveryAging || '12-25 Days',
              totalWeightGrams: resData.totalWeightGrams || 80,
              itemsWeightBreakdown: resData.itemsWeightBreakdown || [],
              isCalculating: false,
              exchangeRate: resData.exchangeRate || 315,
            });
          } else {
            setFreightData({
              shippable: false,
              errorMessage: resData.errorMessage || 'Unable to calculate shipping fee. Checkout blocked.',
              shippingFeeLkr: 0,
              shippingFeeUsd: 0,
              carrierName: 'Unavailable',
              deliveryAging: 'N/A',
              totalWeightGrams: 0,
              itemsWeightBreakdown: [],
              isCalculating: false,
              exchangeRate: resData.usdToLkrRate || 315,
            });
          }
        }
      } catch (err) {
        console.warn('Dynamic freight calculation error:', err);
        if (isMounted) {
          setFreightData(prev => ({ ...prev, isCalculating: false }));
        }
      }
    }, 350);

    return () => {
      isMounted = false;
      clearTimeout(timer);
    };
  }, [hasValidAddress, formData.city, formData.postalCode, formData.district, formData.country, checkoutItems]);

  // Financial calculations
  const subtotal = checkoutItems.reduce(
    (acc, item) => acc + item.product.price * item.quantity,
    0
  );
  const wholesaleTotal = checkoutItems.reduce(
    (acc, item) => acc + item.product.wholesaleCost * item.quantity,
    0
  );

  // International dynamic shipping fee based on live CJ Dropshipping weight & distance
  const baseShippingFee = (hasValidAddress && freightData.shippable) ? freightData.shippingFeeLkr : 0;
  const expressFee = (hasValidAddress && deliverySpeed === 'express') ? 450 : 0;
  const totalShippingFee = baseShippingFee + expressFee;

  const currentDiscount = appliedVoucher ? appliedVoucher.discount : 0;
  const totalAmount = Math.max(0, subtotal + totalShippingFee - currentDiscount);

  // Apply Voucher
  const handleApplyVoucher = (codeToApply?: string) => {
    const code = (codeToApply || voucherCodeInput).trim().toUpperCase();
    setVoucherError('');
    setVoucherSuccess('');

    if (!code) {
      setVoucherError('Please enter a voucher code.');
      return;
    }

    if (code === 'LANKA500') {
      if (subtotal < 2500) {
        setVoucherError('LANKA500 requires minimum order of Rs. 2,500');
        return;
      }
      setAppliedVoucher({ code, discount: 500 });
      setVoucherSuccess('Rs. 500 discount successfully applied!');
    } else if (code === 'FIRST10') {
      const disc = Math.round(subtotal * 0.1);
      setAppliedVoucher({ code, discount: disc });
      setVoucherSuccess(`10% discount (-Rs. ${disc.toLocaleString()}) applied!`);
    } else if (code === 'FLASH20') {
      const disc = Math.min(1000, Math.round(subtotal * 0.2));
      setAppliedVoucher({ code, discount: disc });
      setVoucherSuccess(`Flash deal discount (-Rs. ${disc.toLocaleString()}) applied!`);
    } else {
      setVoucherError('Invalid promo code. Try LANKA500 or FIRST10');
    }
  };

  // Handle order submission strictly through backend API with Creem.io
  const handlePlaceOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (isSubmittingRef.current || isSubmitting) {
      return;
    }

    if (!freightData.shippable) {
      setErrorMsg('This item cannot be shipped to your location.');
      return;
    }

    if (checkoutItems.length === 0) {
      setErrorMsg('No items in checkout. Please select a product first.');
      return;
    }

    if (!formData.fullName.trim() || !formData.phone.trim() || !formData.street.trim() || !formData.city.trim()) {
      setErrorMsg('Please fill in all required delivery address fields (Name, Phone number, Street address, City).');
      return;
    }

    const cleanPhone = formData.phone.replace(/\D/g, '');
    const isValidPhone = (cleanPhone.length === 10 && cleanPhone.startsWith('0')) || (cleanPhone.length === 11 && cleanPhone.startsWith('94'));
    if (!isValidPhone) {
      setErrorMsg('Please enter a valid 10-digit Sri Lankan mobile/WhatsApp number starting with 0 (e.g., 0771234567).');
      return;
    }

    try {
      // 1. PREVENT IMMEDIATE REDIRECT: Set loading state and change button text to "Processing..."
      isSubmittingRef.current = true;
      setIsSubmitting(true);
      setSubmissionStep('Verifying card details with 3D Secure Banking Gateway...');

      // Save user address to localStorage for future convenience
      try {
        localStorage.setItem('lankabuy_user_address', JSON.stringify(formData));
      } catch {}

      const idempotencyKey = `idem-${formData.phone.replace(/[^0-9]/g, '')}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
      
      // 2. CALL BACKEND API: Send payment details and order payload to /api/checkout
      const idToken = await getFirebaseIdToken();
      if (!idToken) {
        throw new Error('Please sign in before placing an order.');
      }
      const response = await fetch('/api/checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Idempotency-Key': idempotencyKey,
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({
          userId: currentUser?.uid || '',
          customer: {
            ...formData,
            province: formData.province || selectedProvince,
            postalCode: formData.postalCode || '00400',
            userId: currentUser?.uid || '',
            street: formData.street,
            landmark: formData.landmark || deliveryNote || '',
            deliveryNote: deliveryNote || '',
          },
          items: checkoutItems.map(ci => ({
            productId: ci.product.id,
            title: ci.product.title,
            sku: ci.product.sku,
            quantity: ci.quantity,
            unitPrice: ci.product.price,
            wholesaleCost: ci.product.wholesaleCost,
            imageUrl: ci.product.imageUrl,
            cjDirectUrl: ci.product.cjDirectUrl,
            supplierOrigin: ci.product.supplierOrigin,
            selectedColor: (ci as any).selectedColor || (ci.product as any).selectedColor || '',
            selectedSize: (ci as any).selectedSize || (ci.product as any).selectedSize || '',
            selectedVariantKey: (ci as any).selectedVariantKey || (ci.product as any).selectedVariantKey || '',
          })),
          paymentMethod,
          voucherCode: appliedVoucher?.code || '',
          deliverySpeed,
          shippingFee: totalShippingFee,
          freightDetails: {
            carrierName: freightData.carrierName,
            freightUsd: freightData.shippingFeeUsd,
            totalWeightGrams: freightData.totalWeightGrams,
            exchangeRate: freightData.exchangeRate
          },
        }),
      });

      const data = await response.json().catch(() => ({}));

      // 3. CONDITIONAL SUCCESS: If online card payment, redirect to official Creem.io payment gateway URL; if COD, show confirmed order
      if (response.ok && data.success) {
        if (paymentMethod === 'CREDIT_CARD' || paymentMethod === 'CARD') {
          if (data.checkout_url && (data.checkout_url.startsWith('http://') || data.checkout_url.startsWith('https://') || data.checkout_url.startsWith('/'))) {
            setSubmissionStep('Redirecting to Creem Payment Gateway...');
            window.location.href = data.checkout_url;
            return;
          }
          if (data.order) {
            onOrderSuccess(data.order);
            return;
          }
        }
        if (data.order) {
          onOrderSuccess(data.order);
        }
      } else {
        // 4. ERROR HANDLING: Keep user on checkout page, set isLoading = false, and show error
        isSubmittingRef.current = false;
        setIsSubmitting(false);
        setErrorMsg(data.message || 'Payment processing failed. Please verify your details and try again.');
      }
    } catch (err: any) {
      console.error('Checkout API error:', err);
      // 4. ERROR HANDLING: Network error occurs -> keep user on page, set isLoading = false, show red error
      isSubmittingRef.current = false;
      setIsSubmitting(false);
      setErrorMsg(err.message || 'Network error while contacting payment gateway. Please check your connection and try again.');
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col font-sans selection:bg-orange-500 selection:text-white pb-16">
      
      {/* 1. TOP CHECKOUT HEADER */}
      <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-slate-200 shadow-xs">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <button
              onClick={onBack}
              className="flex items-center text-xs font-bold text-slate-600 hover:text-orange-600 bg-slate-100 hover:bg-orange-50 px-3 py-2 rounded-xl transition cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4 mr-1.5" />
              <span>Back</span>
            </button>
            <div className="h-4 w-px bg-slate-200 hidden sm:block"></div>
            <div>
              <h1 className="text-sm sm:text-base font-black text-slate-900 flex items-center">
                <span>Secure Checkout</span>
                <span className="ml-2 text-[10px] bg-orange-50 text-orange-600 font-bold px-2 py-0.5 rounded-full border border-orange-200">
                  Instant Buy
                </span>
              </h1>
            </div>
          </div>

          <div className="flex items-center space-x-2 text-xs text-emerald-600 font-semibold bg-emerald-50 px-3 py-1.5 rounded-xl border border-emerald-200">
            <Lock className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">256-Bit SSL Encrypted</span>
            <span className="sm:hidden">SSL Secure</span>
          </div>
        </div>
      </header>

      {/* 2. MAIN CHECKOUT CONTAINER */}
      <main className="max-w-6xl mx-auto px-3 sm:px-4 py-4 sm:py-6 flex-1 w-full">
        {checkoutItems.length === 0 ? (
          <div className="bg-white rounded-3xl p-8 sm:p-12 text-center border border-slate-200 shadow-xs max-w-md mx-auto my-12">
            <AlertCircle className="w-12 h-12 text-orange-500 mx-auto mb-3" />
            <h3 className="text-base font-bold text-slate-800">No Product Selected for Checkout</h3>
            <p className="text-xs text-slate-500 mt-1 mb-6">
              Please choose a product from the marketplace to proceed with your order.
            </p>
            <button
              onClick={onBack}
              className="w-full bg-orange-500 hover:bg-orange-600 text-white font-bold py-3 rounded-xl text-xs transition cursor-pointer shadow-md shadow-orange-500/20"
            >
              Explore Products
            </button>
          </div>
        ) : (
          <form onSubmit={handlePlaceOrder} className="grid grid-cols-1 lg:grid-cols-12 gap-5 sm:gap-6">
            
            {/* LEFT COLUMN: Shipping Address, Delivery Speed, & Payment (7 cols) */}
            <div className="lg:col-span-7 space-y-5">
              
              {/* Card 1: Delivery Address */}
              <div className="bg-white rounded-2xl sm:rounded-3xl p-4 sm:p-6 border border-slate-200 shadow-xs">
                <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-100">
                  <div className="flex items-center space-x-2">
                    <div className="w-7 h-7 rounded-xl bg-orange-50 text-orange-600 flex items-center justify-center font-black text-xs">
                      1
                    </div>
                    <h3 className="text-sm sm:text-base font-bold text-slate-900 flex items-center">
                      <MapPin className="w-4 h-4 text-orange-500 mr-1.5" />
                      Delivery Address (Sri Lanka)
                    </h3>
                  </div>
                  {onOpenAddAddress && (
                    <button
                      type="button"
                      onClick={onOpenAddAddress}
                      className="text-xs font-bold text-orange-600 hover:text-orange-700 bg-orange-50 hover:bg-orange-100 border border-orange-200 px-3 py-1.5 rounded-xl flex items-center space-x-1 transition cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>{userAddresses && userAddresses.length > 0 ? 'Add / Manage' : '+ Add Address'}</span>
                    </button>
                  )}
                </div>

                {/* Saved Address Selection or Add Address Prompt */}
                {userAddresses && userAddresses.length > 0 ? (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                        Select Delivery Address ({userAddresses.length} Saved)
                      </label>
                      <span className="text-[11px] text-slate-400 font-medium hidden sm:inline">
                        Click an address to deliver
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      {userAddresses.map((addr) => {
                        const isSelected = selectedAddressId === addr.id;
                        const provinceName = getProvinceForDistrict(addr.district);
                        return (
                          <div
                            key={addr.id}
                            onClick={() => handleSelectSavedAddress(addr)}
                            className={`p-3.5 rounded-2xl border text-left transition cursor-pointer relative flex flex-col justify-between group ${
                              isSelected
                                ? 'bg-orange-50/70 border-orange-500 ring-2 ring-orange-500/20 shadow-xs'
                                : 'bg-slate-50 border-slate-200 hover:bg-white hover:border-slate-300'
                            }`}
                          >
                            <div>
                              <div className="flex items-center justify-between mb-2">
                                <div className="flex items-center space-x-1.5">
                                  <div className={`w-4 h-4 rounded-full flex items-center justify-center border transition ${
                                    isSelected ? 'border-orange-500 bg-orange-500 text-white' : 'border-slate-300 bg-white'
                                  }`}>
                                    {isSelected && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                                  </div>
                                  <span className="font-bold text-slate-800 text-xs flex items-center">
                                    {addr.label === 'Home' && <Home className="w-3 h-3 mr-1 text-slate-500" />}
                                    {addr.label === 'Work' && <Briefcase className="w-3 h-3 mr-1 text-slate-500" />}
                                    {addr.label !== 'Home' && addr.label !== 'Work' && <Tag className="w-3 h-3 mr-1 text-slate-500" />}
                                    {addr.label || 'Home'}
                                  </span>
                                </div>

                                <div className="flex items-center space-x-1.5">
                                  {addr.isDefault && (
                                    <span className="text-[9px] font-bold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full border border-emerald-200">
                                      Default
                                    </span>
                                  )}
                                  {isSelected && (
                                    <span className="text-[9px] font-black bg-orange-500 text-white px-2 py-0.5 rounded-full">
                                      Selected
                                    </span>
                                  )}
                                </div>
                              </div>

                              <p className="text-xs text-slate-900 font-bold flex items-center">
                                <User className="w-3 h-3 mr-1 text-slate-400 inline" />
                                {addr.fullName}
                              </p>
                              <p className="text-[11px] text-slate-600 font-mono mt-0.5 flex items-center">
                                <Phone className="w-3 h-3 mr-1 text-slate-400 inline" />
                                {addr.phone}
                              </p>
                              <p className="text-xs text-slate-700 font-medium mt-1.5 leading-snug">
                                {addr.street}, {addr.city}
                              </p>
                              <p className="text-[11px] text-slate-500 mt-0.5">
                                {addr.district}, {provinceName} (🇱🇰 Sri Lanka)
                              </p>
                            </div>

                            {onOpenAddAddress && (
                              <div className="mt-3 pt-2 border-t border-slate-200/60 flex items-center justify-between text-[11px]">
                                <span className="text-slate-400 text-[10px]">
                                  {isSelected ? '✓ Deliver to this address' : 'Click to choose'}
                                </span>
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onOpenAddAddress();
                                  }}
                                  className="text-orange-600 hover:text-orange-700 font-semibold underline cursor-pointer text-[10px]"
                                >
                                  Edit
                                </button>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>

                    {/* Add Another Address Button */}
                    {onOpenAddAddress && (
                      <div className="pt-1">
                        <button
                          type="button"
                          onClick={onOpenAddAddress}
                          className="w-full py-2.5 px-4 bg-slate-50 hover:bg-orange-50/50 border border-dashed border-slate-300 hover:border-orange-400 rounded-xl text-xs font-bold text-slate-700 hover:text-orange-600 transition flex items-center justify-center space-x-1.5 cursor-pointer"
                        >
                          <Plus className="w-4 h-4 text-orange-500" />
                          <span>+ Add Another Delivery Address</span>
                        </button>
                      </div>
                    )}

                    {/* Optional Landmark / Rider Instructions */}
                    <div className="pt-2">
                      <label className="text-[11px] font-bold text-slate-600 block mb-1">
                        Delivery Landmark / Rider Notes (Optional)
                      </label>
                      <input
                        type="text"
                        value={deliveryNote}
                        onChange={(e) => setDeliveryNote(e.target.value)}
                        placeholder="e.g. Near Majestic City / Call before delivery"
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-hidden focus:border-orange-500 focus:bg-white transition"
                      />
                    </div>
                  </div>
                ) : (
                  /* Empty State: No Address Saved */
                  <div className="p-6 sm:p-8 rounded-2xl bg-orange-50/40 border border-orange-200/80 text-center space-y-4">
                    <div className="w-14 h-14 mx-auto rounded-2xl bg-orange-100 text-orange-600 flex items-center justify-center shadow-xs">
                      <MapPin className="w-7 h-7" />
                    </div>
                    <div className="max-w-md mx-auto space-y-1">
                      <h4 className="text-sm sm:text-base font-bold text-slate-900">
                        No Delivery Address Found
                      </h4>
                      <p className="text-xs text-slate-600 leading-relaxed">
                        Please add your delivery address in Sri Lanka to calculate real shipping fees and place your order.
                      </p>
                    </div>

                    {onOpenAddAddress && (
                      <button
                        type="button"
                        onClick={onOpenAddAddress}
                        className="bg-orange-500 hover:bg-orange-600 text-white text-xs sm:text-sm font-bold px-6 py-3 rounded-xl shadow-md shadow-orange-500/25 transition cursor-pointer flex items-center justify-center space-x-2 mx-auto active:scale-98"
                      >
                        <Plus className="w-4 h-4" />
                        <span>+ Add Delivery Address</span>
                      </button>
                    )}

                    <div className="text-[11px] text-slate-500 flex items-center justify-center space-x-1 pt-1">
                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Islandwide direct courier delivery across all 9 Provinces &amp; 25 Districts</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Card 2: Payment Method */}
              <div className="bg-white rounded-2xl sm:rounded-3xl p-4 sm:p-6 border border-slate-200 shadow-xs">
                <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-100">
                  <div className="flex items-center space-x-2">
                    <div className="w-7 h-7 rounded-xl bg-orange-50 text-orange-600 flex items-center justify-center font-black text-xs">
                      2
                    </div>
                    <h3 className="text-sm sm:text-base font-bold text-slate-900 flex items-center">
                      <CreditCard className="w-4 h-4 text-orange-500 mr-1.5" />
                      Payment Method
                    </h3>
                  </div>

                  <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded-full border border-emerald-200 shrink-0 flex items-center">
                    <ShieldCheck className="w-3 h-3 mr-1 text-emerald-600" />
                    3D Secure OTP
                  </span>
                </div>

                {/* Selectable Card Payment Box (Compact & Clean) */}
                <div
                  onClick={() => setPaymentMethod('CREDIT_CARD')}
                  className={`rounded-2xl border-2 transition cursor-pointer p-3.5 sm:p-4 flex items-center justify-between gap-3 ${
                    paymentMethod === 'CREDIT_CARD'
                      ? 'border-orange-500 bg-orange-50/40 shadow-xs'
                      : 'border-slate-200 bg-white hover:border-orange-300'
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    <div className={`w-5 h-5 rounded-full flex items-center justify-center border-2 transition shrink-0 ${
                      paymentMethod === 'CREDIT_CARD'
                        ? 'border-orange-500 bg-orange-500 text-white'
                        : 'border-slate-300 bg-white'
                    }`}>
                      {paymentMethod === 'CREDIT_CARD' && <Check className="w-3 h-3 stroke-[3]" />}
                    </div>

                    <span className="font-bold text-slate-900 text-sm sm:text-base">
                      Card Payment
                    </span>
                  </div>

                  {/* Payment Badges (VISA, Mastercard, Google Pay) */}
                  <div className="flex items-center space-x-1.5 shrink-0">
                    {/* Visa */}
                    <div className="h-6 px-2 bg-[#00579F] rounded-md flex items-center justify-center text-white font-black italic text-[11px] tracking-wider shadow-2xs select-none">
                      VISA
                    </div>
                    {/* Mastercard */}
                    <div className="h-6 px-2 bg-slate-900 rounded-md flex items-center justify-center space-x-1 shadow-2xs select-none">
                      <div className="w-2.5 h-2.5 rounded-full bg-[#EB001B] inline-block opacity-95"></div>
                      <div className="w-2.5 h-2.5 rounded-full bg-[#F79E1B] inline-block -ml-1.5 opacity-95"></div>
                      <span className="text-[9px] font-bold text-white font-sans hidden xs:inline">Mastercard</span>
                    </div>
                    {/* Google Pay */}
                    <div className="h-6 px-2 bg-white border border-slate-300 rounded-md flex items-center justify-center space-x-0.5 shadow-2xs select-none">
                      <span className="text-[11px] font-black text-[#4285F4]">G</span>
                      <span className="text-[10px] font-bold text-slate-700">Pay</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* RIGHT COLUMN: Order Summary & Confirmation (5 cols) */}
            <div className="lg:col-span-5 space-y-5">
              
              {/* Order Items Card */}
              <div className="bg-white rounded-2xl sm:rounded-3xl p-4 sm:p-6 border border-slate-200 shadow-xs">
                <h3 className="text-sm sm:text-base font-bold text-slate-900 pb-3 mb-4 border-b border-slate-100 flex items-center justify-between">
                  <span>Order Items ({checkoutItems.reduce((a, b) => a + b.quantity, 0)})</span>
                  <span className="text-xs text-slate-500">LankaBuy Direct</span>
                </h3>

                {/* Preserved Products List */}
                <div className="space-y-3 mb-5 max-h-80 overflow-y-auto pr-1">
                  {checkoutItems.map((item) => {
                    const cjUrl = getCjProductUrl(item.product);
                    return (
                      <div
                        key={item.product.id}
                        className="p-3 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-2"
                      >
                        <div className="flex items-start space-x-3">
                          <img
                            src={item.product.imageUrl || DEFAULT_PRODUCT_IMAGE}
                            alt={item.product.title}
                            referrerPolicy="no-referrer"
                            className="w-14 h-14 sm:w-16 sm:h-16 rounded-xl object-cover border border-slate-200 shrink-0 bg-white"
                          />
                          <div className="min-w-0 flex-1">
                            <h4 className="text-xs font-bold text-slate-800 line-clamp-2 leading-snug">
                              {item.product.title}
                            </h4>
                            <div className="text-[10px] text-slate-500 mt-0.5 flex items-center justify-between">
                              <span>SKU: <span className="font-mono">{item.product.sku}</span></span>
                            </div>

                            {/* Variant Specs Pills (Color Swatch & Boxed Size) */}
                            <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                              {(item.selectedColor || item.product.selectedColor) && (
                                <div className="flex items-center space-x-1 text-[10px] font-bold text-slate-700 bg-white px-2 py-0.5 rounded-md border border-slate-200 shadow-2xs">
                                  <span
                                    className="w-2.5 h-2.5 rounded-full shrink-0 border border-slate-300"
                                    style={{ backgroundColor: getColorSwatch(item.selectedColor || item.product.selectedColor || '').hex }}
                                  ></span>
                                  <span>{item.selectedColor || item.product.selectedColor}</span>
                                </div>
                              )}
                              {(item.selectedSize || item.product.selectedSize) && (
                                <div className="text-[10px] font-bold text-cyan-950 bg-cyan-50 px-2 py-0.5 rounded-md border border-cyan-300 shadow-2xs">
                                  Size: {item.selectedSize || item.product.selectedSize}
                                </div>
                              )}
                            </div>
                            
                            <div className="flex items-center justify-between mt-2">
                              {/* Unit price */}
                              <div className="text-xs font-black text-slate-900">
                                Rs. {((item.product?.price ?? 0) * item.quantity).toLocaleString()}
                                {item.quantity > 1 && (
                                  <span className="text-[10px] text-slate-400 font-normal ml-1">
                                    (Rs. {(item.product?.price ?? 0).toLocaleString()} ea)
                                  </span>
                                )}
                              </div>

                              {/* Quantity control */}
                              <div className="flex items-center space-x-1.5 bg-white border border-slate-200 rounded-lg p-0.5 shadow-2xs">
                                <button
                                  type="button"
                                  onClick={() => handleUpdateQty(item.product.id, -1)}
                                  disabled={item.quantity <= 1}
                                  className="w-5 h-5 flex items-center justify-center text-slate-600 hover:text-orange-600 disabled:opacity-30 cursor-pointer"
                                >
                                  <Minus className="w-3 h-3" />
                                </button>
                                <span className="text-xs font-bold w-5 text-center">{item.quantity}</span>
                                <button
                                  type="button"
                                  onClick={() => handleUpdateQty(item.product.id, 1)}
                                  className="w-5 h-5 flex items-center justify-center text-slate-600 hover:text-orange-600 cursor-pointer"
                                >
                                  <Plus className="w-3 h-3" />
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Direct CJ Dropshipping Product URL Print */}
                        <div className="pt-2 border-t border-slate-200/70">
                          <div className="flex items-center justify-between text-[10px] mb-1">
                            <span className="font-bold text-slate-600 flex items-center">
                              <span className="w-1.5 h-1.5 rounded-full bg-orange-500 mr-1"></span>
                              CJ Dropshipping Sourced URL:
                            </span>
                            <a
                              href={cjUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-orange-600 hover:text-orange-800 font-bold flex items-center space-x-0.5"
                            >
                              <span>Open Source</span>
                              <ExternalLink className="w-2.5 h-2.5 ml-0.5" />
                            </a>
                          </div>
                          <a
                            href={cjUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="block text-[10px] text-blue-600 hover:text-blue-800 bg-white hover:bg-blue-50/50 p-2 rounded-lg border border-slate-200 font-mono break-all leading-tight transition"
                            title="Direct CJ Dropshipping Product URL"
                          >
                            {cjUrl}
                          </a>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Item Weight Breakdown Box */}
                {freightData.itemsWeightBreakdown && freightData.itemsWeightBreakdown.length > 0 && (
                  <div className="mb-4 p-3 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-2">
                    <div className="flex items-center justify-between text-[10px] font-bold text-slate-700 uppercase tracking-wider">
                      <span className="flex items-center text-orange-600">
                        <Zap className="w-3.5 h-3.5 mr-1" />
                        Real Item Weight (Fetched per SKU)
                      </span>
                      <span className="font-mono bg-orange-100 text-orange-800 px-2 py-0.5 rounded-full font-black">
                        Total: {freightData.totalWeightGrams}g
                      </span>
                    </div>
                    <div className="space-y-1">
                      {freightData.itemsWeightBreakdown.map((wb, idx) => (
                        <div key={idx} className="flex justify-between items-center text-[11px] bg-white p-2 rounded-xl border border-slate-200 font-mono">
                          <span className="truncate max-w-[170px] font-semibold text-slate-800" title={wb.title}>
                            {wb.title} (x{wb.quantity})
                          </span>
                          <span className="font-bold text-orange-600 shrink-0 ml-2">
                            {wb.weightGrams}g / item ({wb.totalWeightGrams}g)
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Voucher Input */}
                <div className="mb-5 pt-3 border-t border-slate-100">
                  <label className="text-xs font-bold text-slate-700 mb-1.5 block flex items-center">
                    <Tag className="w-3.5 h-3.5 text-orange-500 mr-1" />
                    Have a Voucher or Promo Code?
                  </label>
                  <div className="flex space-x-2">
                    <input
                      type="text"
                      value={voucherCodeInput}
                      onChange={(e) => setVoucherCodeInput(e.target.value.toUpperCase())}
                      placeholder="e.g. LANKA500"
                      className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-mono text-slate-800 uppercase focus:outline-hidden focus:border-orange-500 focus:bg-white"
                    />
                    <button
                      type="button"
                      onClick={() => handleApplyVoucher()}
                      className="bg-slate-900 hover:bg-slate-800 text-white font-bold px-4 py-2 rounded-xl text-xs transition cursor-pointer active:scale-95"
                    >
                      Apply
                    </button>
                  </div>

                  {voucherSuccess && (
                    <p className="text-[11px] text-emerald-600 font-semibold mt-1.5 flex items-center">
                      <Check className="w-3.5 h-3.5 mr-1" />
                      {voucherSuccess}
                    </p>
                  )}
                  {voucherError && (
                    <p className="text-[11px] text-red-500 font-medium mt-1.5">
                      {voucherError}
                    </p>
                  )}

                  {/* Quick voucher pills */}
                  <div className="flex flex-wrap gap-1.5 mt-2.5">
                    <button
                      type="button"
                      onClick={() => handleApplyVoucher('LANKA500')}
                      className="text-[10px] font-bold bg-orange-50 hover:bg-orange-100 text-orange-700 px-2 py-1 rounded-lg border border-orange-200 transition cursor-pointer"
                    >
                      🎁 LANKA500 (-Rs. 500)
                    </button>
                    <button
                      type="button"
                      onClick={() => handleApplyVoucher('FIRST10')}
                      className="text-[10px] font-bold bg-orange-50 hover:bg-orange-100 text-orange-700 px-2 py-1 rounded-lg border border-orange-200 transition cursor-pointer"
                    >
                      ⚡ FIRST10 (10% Off)
                    </button>
                  </div>
                </div>

                {/* Price Breakdown */}
                <div className="space-y-2.5 text-xs text-slate-600 pt-3 border-t border-slate-100">
                  <div className="flex justify-between items-center">
                    <span className="font-semibold text-slate-700">Product Cost (Item Subtotal):</span>
                    <span className="font-black text-slate-900">Rs. {subtotal.toLocaleString()}</span>
                  </div>
                  <div className="text-[10px] text-slate-400 font-mono -mt-1 pl-0.5">
                    Formula: (QKsource Price × Ex. Rate) + 20% Profit
                  </div>

                  {/* Dynamic CJ Air Freight Fee */}
                  <div className={`p-3 rounded-2xl border transition ${
                    !hasValidAddress
                      ? 'bg-amber-50/90 border-amber-300'
                      : !freightData.shippable 
                      ? 'bg-red-50 border-red-300'
                      : 'bg-orange-50/70 border-orange-200/80'
                  }`}>
                    <div className="flex justify-between items-center text-xs">
                      <span className="font-bold text-slate-800 flex items-center">
                        <Truck className="w-3.5 h-3.5 text-orange-500 mr-1.5 shrink-0" />
                        <span>Dynamic Shipping Cost</span>
                        {freightData.isCalculating && hasValidAddress && (
                          <Loader2 className="w-3 h-3 ml-1.5 animate-spin text-orange-500" />
                        )}
                      </span>
                      <span className={`font-black text-xs ${
                        !hasValidAddress
                          ? 'text-amber-800 bg-amber-100 px-2 py-0.5 rounded-full text-[11px]'
                          : !freightData.shippable
                          ? 'text-red-600 line-through'
                          : 'text-orange-700'
                      }`}>
                        {!hasValidAddress
                          ? 'Address Required'
                          : freightData.shippable
                          ? `Rs. ${baseShippingFee.toLocaleString()}`
                          : 'Unavailable'}
                      </span>
                    </div>

                    {!hasValidAddress ? (
                      <div className="mt-2 text-[11px] text-amber-900 bg-amber-100/60 p-2 rounded-xl border border-amber-200/60 font-medium leading-relaxed">
                        ⚠️ Address Required: Please select or enter your delivery address (Province, District, City, and Street) to calculate real-time shipping fees.
                      </div>
                    ) : freightData.shippable ? (
                      <>
                        <div className="flex items-center justify-between text-[10px] text-slate-500 mt-1">
                          <span>{freightData.carrierName} ({freightData.totalWeightGrams}g Weight)</span>
                          <span className="font-mono font-bold text-slate-700">${freightData.shippingFeeUsd.toFixed(2)} USD</span>
                        </div>

                        <div className="text-[9px] text-slate-500 font-mono flex items-center justify-between mt-1 pt-1 border-t border-orange-200/50">
                          <span>Formula: ${freightData.shippingFeeUsd.toFixed(2)} USD × {freightData.exchangeRate} LKR</span>
                          <span className="text-emerald-700 font-bold">100% Weight Sourced</span>
                        </div>
                      </>
                    ) : (
                      <p className="text-[10px] text-red-600 font-bold mt-1">
                        No shipping method found for this address.
                      </p>
                    )}
                  </div>

                  {deliverySpeed === 'express' && freightData.shippable && hasValidAddress && (
                    <div className="flex justify-between text-orange-600">
                      <span>Priority Flight &amp; Fast Clearance:</span>
                      <span className="font-semibold">+Rs. {expressFee.toLocaleString()}</span>
                    </div>
                  )}

                  {currentDiscount > 0 && (
                    <div className="flex justify-between text-emerald-600 font-bold">
                      <span>Voucher Discount ({appliedVoucher?.code}):</span>
                      <span>-Rs. {currentDiscount.toLocaleString()}</span>
                    </div>
                  )}

                  {/* Grand Total */}
                  <div className="flex justify-between text-sm sm:text-base font-black text-slate-900 pt-3 border-t border-slate-200">
                    <span>Final Total Payable:</span>
                    <span className="text-orange-600 text-lg font-black">
                      {!hasValidAddress
                        ? `Rs. ${subtotal.toLocaleString()} (+Shipping)`
                        : freightData.shippable
                        ? `Rs. ${totalAmount.toLocaleString()}`
                        : 'Shipping Unavailable'}
                    </span>
                  </div>
                  <div className="text-[10px] text-slate-400 font-mono text-right -mt-1">
                    Product Cost + Dynamic Shipping Cost
                  </div>
                </div>

                {/* RED ALERT CARD: Shipping Unavailable Validation Banner */}
                {!freightData.shippable && !freightData.isCalculating && hasValidAddress && (
                  <div className="mt-4 p-4 bg-red-950/90 border-2 border-red-500 rounded-2xl text-red-100 space-y-1.5 shadow-lg animate-fade-in">
                    <div className="flex items-center space-x-2 text-red-300 font-black text-xs sm:text-sm">
                      <AlertCircle className="w-5 h-5 text-red-400 shrink-0" />
                      <span>This item cannot be shipped to your location</span>
                    </div>
                    <p className="text-xs font-bold text-red-200">
                      We cannot deliver this item to your chosen delivery address.
                    </p>
                    <p className="text-[11px] text-red-300 leading-relaxed">
                      CJ Freight API response: {freightData.errorMessage || "No shipping method found for this item or address."} Please check your delivery address or try another product.
                    </p>
                  </div>
                )}

                {/* Error message */}
                {errorMsg && (
                  <div className="mt-4 p-3.5 bg-red-50 border border-red-200 rounded-2xl text-xs text-red-700 flex items-start space-x-2.5 shadow-xs">
                    <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <p className="font-bold text-red-800">Payment / Order Failed</p>
                      <p className="mt-0.5 text-red-600 leading-relaxed">{errorMsg}</p>
                    </div>
                  </div>
                )}

                {/* Submission Progress / Place Order Button */}
                <div className="mt-5">
                  {isSubmitting ? (
                    <button
                      type="button"
                      disabled
                      className="w-full bg-slate-900 text-white font-bold py-4 px-6 rounded-2xl text-sm sm:text-base flex items-center justify-center space-x-2 cursor-not-allowed opacity-90 transition shadow-md"
                    >
                      <Loader2 className="w-5 h-5 animate-spin text-orange-400" />
                      <span>Processing...</span>
                    </button>
                  ) : (
                    <button
                      type="submit"
                      disabled={isSubmitting || !hasValidAddress || !freightData.shippable || freightData.isCalculating}
                      className={`w-full font-black py-4 px-6 rounded-2xl text-sm sm:text-base transition flex items-center justify-center space-x-2 shadow-lg ${
                        !hasValidAddress
                          ? 'bg-slate-200 text-slate-600 cursor-not-allowed border border-slate-300 shadow-none'
                          : !freightData.shippable
                          ? 'bg-slate-300 text-slate-500 cursor-not-allowed border border-slate-300 shadow-none opacity-80'
                          : freightData.isCalculating
                          ? 'bg-orange-400 text-white cursor-wait'
                          : 'bg-orange-500 hover:bg-orange-600 text-white shadow-orange-500/25 cursor-pointer active:scale-98'
                      }`}
                    >
                      {!hasValidAddress ? (
                        <span>⚠️ Please Select Delivery Address</span>
                      ) : !freightData.shippable ? (
                        <span>This Item Cannot Be Shipped (Order Blocked)</span>
                      ) : freightData.isCalculating ? (
                        <>
                          <Loader2 className="w-5 h-5 animate-spin" />
                          <span>Calculating Real Freight...</span>
                        </>
                      ) : paymentMethod === 'CREDIT_CARD' ? (
                        <>
                          <CreditCard className="w-5 h-5 mr-1" />
                          <span>PAY NOW • Rs. {totalAmount.toLocaleString()}</span>
                        </>
                      ) : (
                        <>
                          <PackageCheck className="w-5 h-5 mr-1" />
                          <span>Place Order • Rs. {totalAmount.toLocaleString()}</span>
                        </>
                      )}
                    </button>
                  )}
                </div>

                {/* Trust guarantee footer */}
                <div className="mt-4 pt-3 border-t border-slate-100 grid grid-cols-2 gap-2 text-[10px] text-slate-500">
                  <div className="flex items-center">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 mr-1 shrink-0" />
                    <span>7 Days Free Return</span>
                  </div>
                  <div className="flex items-center">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 mr-1 shrink-0" />
                    <span>100% Genuine Guaranteed</span>
                  </div>
                </div>
              </div>

            </div>

          </form>
        )}
      </main>
    </div>
  );
};
