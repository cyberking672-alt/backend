import React, { useState } from 'react';
import { 
  X, 
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
  ExternalLink
} from 'lucide-react';
import { CartItem, ShippingAddress, Order } from '../types';
import { InteractivePaymentForm } from './InteractivePaymentForm';
import { getFirebaseIdToken } from '../lib/firebase';

interface CheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  cartItems: CartItem[];
  discount: number;
  voucherCode: string;
  onOrderSuccess: (order: Order) => void;
}

export const CheckoutModal: React.FC<CheckoutModalProps> = ({
  isOpen,
  onClose,
  cartItems,
  discount,
  voucherCode,
  onOrderSuccess,
}) => {
  const hasCjProducts = cartItems.some(item => 
    item.product.source === 'cj_dropshipping' || 
    item.product.allowCOD === false || 
    item.product.paymentOptions === 'card_only' ||
    item.product.isLocalStore === false ||
    item.product.id?.startsWith('global-cj')
  );

  const [paymentMethod, setPaymentMethod] = useState<'COD' | 'CREDIT_CARD' | 'LANKA_QR' | 'KOKO_MINTPAY'>('COD');

  React.useEffect(() => {
    if (hasCjProducts && paymentMethod === 'COD') {
      setPaymentMethod('CREDIT_CARD');
    }
  }, [hasCjProducts, paymentMethod]);

  const [formData, setFormData] = useState<ShippingAddress>({
    fullName: '',
    phone: '',
    email: '',
    street: '',
    city: '',
    district: 'Colombo',
    postalCode: '',
    country: 'Sri Lanka',
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submissionStep, setSubmissionStep] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [embeddedCheckoutUrl, setEmbeddedCheckoutUrl] = useState<string | null>(null);
  const [activeSession, setActiveSession] = useState<any>(null);

  // Listen for real-time payment success postMessage from embedded frame
  React.useEffect(() => {
    const handleMessage = (e: MessageEvent) => {
      if (e.data) {
        if (e.data.type === 'CREEM_PAYMENT_SUCCESS') {
          if (e.data.order) {
            onOrderSuccess(e.data.order);
            onClose();
          }
        } else if (e.data.type === 'CREEM_PAYMENT_ERROR') {
          setErrorMsg(e.data.message || 'Transaction was declined. Please try again.');
          setIsSubmitting(false);
        }
      }
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [onOrderSuccess, onClose]);

  const [freightData, setFreightData] = useState<{
    shippable: boolean;
    errorMessage: string;
    shippingFeeLkr: number;
    shippingFeeUsd: number;
    carrierName: string;
    totalWeightGrams: number;
    itemsWeightBreakdown: any[];
    isCalculating: boolean;
    exchangeRate: number;
  }>({
    shippable: true,
    errorMessage: '',
    shippingFeeLkr: 0,
    shippingFeeUsd: 0,
    carrierName: '',
    totalWeightGrams: 0,
    itemsWeightBreakdown: [],
    isCalculating: true,
    exchangeRate: 315,
  });

  React.useEffect(() => {
    let isMounted = true;
    const timer = setTimeout(async () => {
      if (cartItems.length === 0) return;
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
            items: cartItems.map(ci => ({
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
              carrierName: resData.carrierName || 'QSPacket Eub (CJ Direct Air)',
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
              totalWeightGrams: 0,
              itemsWeightBreakdown: [],
              isCalculating: false,
              exchangeRate: resData.usdToLkrRate || 315,
            });
          }
        }
      } catch {
        if (isMounted) setFreightData(prev => ({ ...prev, isCalculating: false }));
      }
    }, 350);

    return () => {
      isMounted = false;
      clearTimeout(timer);
    };
  }, [formData.city, formData.postalCode, formData.district, formData.country, cartItems]);

  const subtotal = cartItems.reduce(
    (acc, item) => acc + item.product.price * item.quantity,
    0
  );

  const shippingFee = freightData.shippingFeeLkr;
  const totalAmount = Math.max(0, subtotal + shippingFee - discount);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handlePlaceOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!freightData.shippable) {
      setErrorMsg('This item cannot be shipped to your location.');
      return;
    }

    if (!formData.fullName || !formData.phone || !formData.street || !formData.city) {
      setErrorMsg('Please fill in all required shipping address fields.');
      return;
    }

    const cleanPhone = formData.phone.replace(/\D/g, '');
    const isValidPhone = (cleanPhone.length === 10 && cleanPhone.startsWith('0')) || (cleanPhone.length === 11 && cleanPhone.startsWith('94'));
    if (!isValidPhone) {
      setErrorMsg('Please enter a valid 10-digit Sri Lankan mobile/WhatsApp number (e.g., 0771234567).');
      return;
    }

    try {
      setIsSubmitting(true);
      setSubmissionStep('Initializing secure backend checkout & recalculating prices...');

      // 🛡️ STRICT BACKEND PRICE CALCULATION & IDEMPOTENCY
      const idempotencyKey = `idem-${formData.phone.replace(/[^0-9]/g, '')}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
      const idToken = await getFirebaseIdToken();
      if (!idToken) {
        throw new Error('Please sign in before placing an order.');
      }
      const response = await fetch('/api/checkout/init', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Idempotency-Key': idempotencyKey,
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({
          customer: formData,
          items: cartItems.map((ci) => ({
            productId: ci.product.id,
            quantity: ci.quantity,
            unitPrice: ci.product.price,
            selectedColor: ci.product.selectedColor,
            selectedSize: ci.product.selectedSize,
            selectedVariantKey: ci.product.selectedVariantKey,
          })),
          paymentMethod,
          voucherCode,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        if (data.code === 'VALIDATION_FAILED' && data.errors && data.errors.length > 0) {
          const firstErr = data.errors[0];
          throw new Error(`${firstErr.field}: ${firstErr.message}`);
        }
        if (data.code === 'RATE_LIMIT_EXCEEDED') {
          throw new Error(`⚠️ Security Notice: ${data.message} Please wait ${data.retryAfterSeconds || 30}s.`);
        }
        throw new Error(data.message || 'Failed to initialize secure checkout.');
      }

      if (paymentMethod === 'CREDIT_CARD' && data.embeddedCheckoutUrl) {
        setActiveSession(data);
        setEmbeddedCheckoutUrl(data.embeddedCheckoutUrl);
        setIsSubmitting(false);
        return;
      }

      setSubmissionStep('Order Confirmed! Generating LankaBuy Express Tracking...');
      await new Promise((r) => setTimeout(r, 300));

      onOrderSuccess(data.order);
      onClose();
    } catch (err: any) {
      console.error('Order submission error:', err);
      setErrorMsg(err.message || 'Network error communicating with order server.');
    } finally {
      setIsSubmitting(false);
      setSubmissionStep('');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in">
      <div className="bg-white rounded-3xl max-w-3xl w-full shadow-2xl overflow-hidden border border-slate-200 my-6">
        {/* Header */}
        <div className="px-6 py-4 bg-white border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="w-7 h-7 rounded-lg bg-orange-50 text-orange-500 flex items-center justify-center">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <h3 className="font-bold text-slate-800 text-base">
              LankaBuy Secure Checkout
            </h3>
          </div>
          <button
            onClick={onClose}
            disabled={isSubmitting}
            className="text-slate-400 hover:text-slate-700 p-1.5 rounded-full hover:bg-slate-100 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form/Payment Body */}
        {embeddedCheckoutUrl ? (
          <div className="p-6">
            <InteractivePaymentForm
              sessionId={activeSession?.sessionId || ''}
              orderId={activeSession?.orderId || ''}
              amountLkr={activeSession?.summary?.totalAmount || 0}
              onSuccess={(order) => {
                onOrderSuccess(order);
                onClose();
              }}
              onCancel={() => {
                setEmbeddedCheckoutUrl(null);
                setActiveSession(null);
                setErrorMsg('');
              }}
            />
          </div>
        ) : (
          <form onSubmit={handlePlaceOrder} className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Left 2 Cols: Shipping & Payment Details */}
            <div className="md:col-span-2 space-y-5">
              {/* Shipping Address Section */}
              <div>
                <h4 className="text-xs font-black uppercase tracking-wider text-slate-700 mb-3 flex items-center">
                  <Truck className="w-4 h-4 mr-1.5 text-orange-500" />
                  1. Sri Lanka Delivery Address
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div>
                    <label className="block text-slate-600 font-semibold mb-1">Full Name *</label>
                    <input
                      type="text"
                      name="fullName"
                      value={formData.fullName}
                      onChange={handleInputChange}
                      required
                      placeholder="e.g. Kasun Perera"
                      className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-800 focus:bg-white focus:ring-1 focus:ring-orange-500 focus:border-orange-500 focus:outline-hidden"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-600 font-semibold mb-1">Phone Number (Sri Lanka) *</label>
                    <input
                      type="tel"
                      name="phone"
                      value={formData.phone}
                      onChange={handleInputChange}
                      required
                      placeholder="e.g. 077 123 4567"
                      className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-800 focus:bg-white focus:ring-1 focus:ring-orange-500 focus:border-orange-500 focus:outline-hidden"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-slate-600 font-semibold mb-1">Email (Order Confirmation) *</label>
                    <input
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleInputChange}
                      required
                      placeholder="e.g. kasun@example.lk"
                      className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-800 focus:bg-white focus:ring-1 focus:ring-orange-500 focus:border-orange-500 focus:outline-hidden"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-slate-600 font-semibold mb-1">Street Address / House No / Road *</label>
                    <input
                      type="text"
                      name="street"
                      value={formData.street}
                      onChange={handleInputChange}
                      required
                      placeholder="e.g. No. 45, Galle Road, Bambalapitiya"
                      className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-800 focus:bg-white focus:ring-1 focus:ring-orange-500 focus:border-orange-500 focus:outline-hidden"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-600 font-semibold mb-1">City / Town *</label>
                    <input
                      type="text"
                      name="city"
                      value={formData.city}
                      onChange={handleInputChange}
                      required
                      placeholder="e.g. Colombo / Kandy / Galle"
                      className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-800 focus:bg-white focus:ring-1 focus:ring-orange-500 focus:border-orange-500 focus:outline-hidden"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-600 font-semibold mb-1">District</label>
                    <select
                      name="district"
                      value={formData.district || 'Colombo'}
                      onChange={handleInputChange}
                      className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-800 focus:bg-white focus:ring-1 focus:ring-orange-500 focus:border-orange-500 focus:outline-hidden cursor-pointer"
                    >
                      <option value="Colombo">Colombo</option>
                      <option value="Gampaha">Gampaha</option>
                      <option value="Kalutara">Kalutara</option>
                      <option value="Kandy">Kandy</option>
                      <option value="Matale">Matale</option>
                      <option value="Nuwara Eliya">Nuwara Eliya</option>
                      <option value="Galle">Galle</option>
                      <option value="Matara">Matara</option>
                      <option value="Hambantota">Hambantota</option>
                      <option value="Jaffna">Jaffna</option>
                      <option value="Kilinochchi">Kilinochchi</option>
                      <option value="Mannar">Mannar</option>
                      <option value="Vavuniya">Vavuniya</option>
                      <option value="Mullaitivu">Mullaitivu</option>
                      <option value="Batticaloa">Batticaloa</option>
                      <option value="Ampara">Ampara</option>
                      <option value="Trincomalee">Trincomalee</option>
                      <option value="Kurunegala">Kurunegala</option>
                      <option value="Puttalam">Puttalam</option>
                      <option value="Anuradhapura">Anuradhapura</option>
                      <option value="Polonnaruwa">Polonnaruwa</option>
                      <option value="Badulla">Badulla</option>
                      <option value="Monaragala">Monaragala</option>
                      <option value="Ratnapura">Ratnapura</option>
                      <option value="Kegalle">Kegalle</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-slate-600 font-semibold mb-1">Postal Code</label>
                    <input
                      type="text"
                      name="postalCode"
                      value={formData.postalCode}
                      onChange={handleInputChange}
                      placeholder="e.g. 00400"
                      className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-800 focus:bg-white focus:ring-1 focus:ring-orange-500 focus:border-orange-500 focus:outline-hidden"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-600 font-semibold mb-1">Country</label>
                    <input
                      type="text"
                      name="country"
                      value={formData.country}
                      readOnly
                      className="w-full bg-slate-100 border border-slate-200 rounded-xl px-3 py-2 text-slate-600 cursor-not-allowed"
                    />
                  </div>
                </div>
              </div>

              {/* Payment Method Section (Orange Focused) */}
              <div className="pt-4 border-t border-slate-200">
                <h4 className="text-xs font-black uppercase tracking-wider text-slate-700 mb-3 flex items-center">
                  <CreditCard className="w-4 h-4 mr-1.5 text-orange-500" />
                  2. Select Payment Method
                </h4>

                {hasCjProducts && (
                  <div className="mb-3 p-2.5 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 font-bold flex items-center space-x-2">
                    <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                    <span>CJ Dropshipping overseas items require Online Card Payment (COD is available only for Sri Lanka Local Stock).</span>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <label
                    className={`flex items-center p-3 rounded-2xl border-2 transition ${
                      hasCjProducts
                        ? 'border-slate-200 bg-slate-100 text-slate-400 cursor-not-allowed opacity-60'
                        : paymentMethod === 'COD'
                        ? 'border-orange-500 bg-orange-50/70 text-orange-950 shadow-xs cursor-pointer'
                        : 'border-slate-200 hover:border-slate-300 bg-white text-slate-700 cursor-pointer'
                    }`}
                  >
                    <input
                      type="radio"
                      name="paymentMethod"
                      value="COD"
                      disabled={hasCjProducts}
                      checked={paymentMethod === 'COD'}
                      onChange={() => !hasCjProducts && setPaymentMethod('COD')}
                      className="sr-only"
                    />
                    <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center mr-2.5 shrink-0">
                      <Banknote className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="flex items-center space-x-1.5">
                        <p className="text-xs font-black">Cash on Delivery (COD)</p>
                        {hasCjProducts ? (
                          <span className="text-[9px] bg-slate-200 text-slate-600 font-bold px-1.5 py-0.2 rounded">DISABLED FOR CJ</span>
                        ) : (
                          <span className="text-[9px] bg-emerald-100 text-emerald-800 font-bold px-1.5 py-0.2 rounded">POPULAR</span>
                        )}
                      </div>
                      <p className="text-[10px] text-slate-500">
                        {hasCjProducts ? 'Not available for CJ Dropshipping items' : 'Pay cash upon parcel delivery'}
                      </p>
                    </div>
                  </label>

                  <label
                    className={`flex items-center p-3 rounded-2xl border-2 cursor-pointer transition ${
                      paymentMethod === 'CREDIT_CARD'
                        ? 'border-orange-500 bg-orange-50/70 text-orange-950 shadow-xs'
                        : 'border-slate-200 hover:border-slate-300 bg-white text-slate-700'
                    }`}
                  >
                    <input
                      type="radio"
                      name="paymentMethod"
                      value="CREDIT_CARD"
                      checked={paymentMethod === 'CREDIT_CARD'}
                      onChange={() => setPaymentMethod('CREDIT_CARD')}
                      className="sr-only"
                    />
                    <div className="w-8 h-8 rounded-xl bg-orange-50 text-orange-600 flex items-center justify-center mr-2.5 shrink-0">
                      <CreditCard className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-xs font-bold">Visa / Mastercard / LankaPay</p>
                      <p className="text-[10px] text-slate-500">Secure 3D-Authenticated gateway</p>
                    </div>
                  </label>

                  <label
                    className={`flex items-center p-3 rounded-2xl border-2 cursor-pointer transition ${
                      paymentMethod === 'LANKA_QR'
                        ? 'border-orange-500 bg-orange-50/70 text-orange-950 shadow-xs'
                        : 'border-slate-200 hover:border-slate-300 bg-white text-slate-700'
                    }`}
                  >
                    <input
                      type="radio"
                      name="paymentMethod"
                      value="LANKA_QR"
                      checked={paymentMethod === 'LANKA_QR'}
                      onChange={() => setPaymentMethod('LANKA_QR')}
                      className="sr-only"
                    />
                    <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center mr-2.5 shrink-0">
                      <QrCode className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-xs font-bold">LankaQR / Genie / FriMi</p>
                      <p className="text-[10px] text-slate-500">Instant scan &amp; pay with any bank app</p>
                    </div>
                  </label>

                  <label
                    className={`flex items-center p-3 rounded-2xl border-2 cursor-pointer transition ${
                      paymentMethod === 'KOKO_MINTPAY'
                        ? 'border-orange-500 bg-orange-50/70 text-orange-950 shadow-xs'
                        : 'border-slate-200 hover:border-slate-300 bg-white text-slate-700'
                    }`}
                  >
                    <input
                      type="radio"
                      name="paymentMethod"
                      value="KOKO_MINTPAY"
                      checked={paymentMethod === 'KOKO_MINTPAY'}
                      onChange={() => setPaymentMethod('KOKO_MINTPAY')}
                      className="sr-only"
                    />
                    <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center mr-2.5 shrink-0">
                      <Sparkles className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-xs font-bold">Koko / Mintpay (3x BNPL)</p>
                      <p className="text-[10px] text-slate-500">Split into 3 interest-free payments</p>
                    </div>
                  </label>
                </div>
              </div>
            </div>

            {/* Right Col: Order Summary */}
            <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200 flex flex-col justify-between">
              <div>
                <h4 className="text-xs font-black uppercase tracking-wider text-slate-700 mb-3 pb-2 border-b border-slate-200">
                  Order Summary ({cartItems.length} items)
                </h4>

                {/* Items List */}
                <div className="space-y-2.5 max-h-48 overflow-y-auto pr-1">
                  {cartItems.map((item) => {
                    const rawPid = item.product.supplierProductId || 
                      (item.product.id?.startsWith('global-cj-') ? item.product.id.replace('global-cj-', '') :
                      (item.product.id?.includes('cj-') ? item.product.id.split('cj-')[1] :
                      (item.product.sku || item.product.id || '')));

                    const cleanSlug = (item.product.title || 'product')
                      .toLowerCase()
                      .replace(/[^a-z0-9]+/g, '-')
                      .replace(/^-+|-+$/g, '')
                      .slice(0, 80) || 'product';

                    const cjUrl = item.product.cjDirectUrl && !item.product.cjDirectUrl.includes('undefined') && !item.product.cjDirectUrl.includes('-p-.html')
                      ? (item.product.cjDirectUrl.includes('/product-detail.html') || item.product.cjDirectUrl.includes('/search/') 
                          ? item.product.cjDirectUrl 
                          : `https://cjdropshipping.com/product-detail.html?id=${encodeURIComponent(rawPid)}`)
                      : (rawPid && rawPid.length > 3
                          ? `https://cjdropshipping.com/product-detail.html?id=${encodeURIComponent(rawPid)}`
                          : `https://cjdropshipping.com/search/${encodeURIComponent(item.product.title)}.html`);

                    return (
                      <div key={item.product.id} className="p-2 bg-white rounded-xl border border-slate-200/80 space-y-1 text-xs">
                        <div className="flex justify-between items-center">
                          <div className="flex items-center space-x-2 truncate pr-2">
                            <span className="font-bold text-slate-800">{item.quantity}x</span>
                            <span className="truncate text-slate-700 font-medium" title={item.product.title}>
                              {item.product.title}
                            </span>
                          </div>
                          <span className="font-semibold text-slate-900 shrink-0">
                            Rs. {(item.product.price * item.quantity).toLocaleString()}
                          </span>
                        </div>

                        {/* Real CJ Dropshipping URL */}
                        <div className="pt-1 border-t border-slate-100 flex items-center justify-between text-[10px]">
                          <span className="text-slate-500 font-semibold truncate mr-1">CJ Source:</span>
                          <a
                            href={cjUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:text-blue-800 underline truncate font-mono flex items-center"
                            title={cjUrl}
                          >
                            <span className="truncate">{cjUrl}</span>
                            <ExternalLink className="w-2.5 h-2.5 ml-1 shrink-0" />
                          </a>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Pricing Calculation */}
                <div className="mt-4 pt-3 border-t border-slate-200 space-y-2 text-xs text-slate-600">
                  <div className="flex justify-between items-center">
                    <span className="font-semibold text-slate-700">Product Cost (Subtotal):</span>
                    <span className="font-black text-slate-900">Rs. {subtotal.toLocaleString()}</span>
                  </div>
                  <div className="text-[10px] text-slate-400 font-mono -mt-1 pl-0.5">
                    Formula: (QKsource Price × Ex. Rate) + 20% Profit
                  </div>

                  <div className={`p-2.5 rounded-xl border transition ${
                    !freightData.shippable ? 'bg-red-50 border-red-200' : 'bg-orange-50/70 border-orange-200/80'
                  }`}>
                    <div className="flex justify-between items-center">
                      <span className="flex items-center font-bold text-slate-800">
                        <Truck className="w-3.5 h-3.5 mr-1 text-orange-500" />
                        <span>Dynamic Shipping Fee:</span>
                        {freightData.isCalculating && <Loader2 className="w-3 h-3 ml-1 animate-spin text-orange-500" />}
                      </span>
                      <span className={`font-black ${!freightData.shippable ? 'text-red-600 line-through' : 'text-orange-700'}`}>
                        {freightData.shippable ? `Rs. ${shippingFee.toLocaleString()}` : 'Unavailable'}
                      </span>
                    </div>
                    {freightData.shippable ? (
                      <div className="flex justify-between items-center text-[10px] text-slate-500 mt-1 font-mono">
                        <span>{freightData.carrierName} ({freightData.totalWeightGrams}g)</span>
                        <span>${freightData.shippingFeeUsd.toFixed(2)} USD × {freightData.exchangeRate} LKR</span>
                      </div>
                    ) : (
                      <p className="text-[10px] text-red-600 font-bold mt-1">
                        No shipping route available for this location.
                      </p>
                    )}
                  </div>

                  {discount > 0 && (
                    <div className="flex justify-between text-emerald-600 font-semibold">
                      <span>Voucher ({voucherCode}):</span>
                      <span>-Rs. {discount.toLocaleString()}</span>
                    </div>
                  )}

                  <div className="flex justify-between text-sm font-black text-slate-900 pt-2 border-t border-slate-300">
                    <span>Final Total Payable:</span>
                    <span className="text-orange-600 text-base font-black">
                      {freightData.shippable ? `Rs. ${totalAmount.toLocaleString()}` : 'Shipping Unavailable'}
                    </span>
                  </div>
                </div>

                {/* RED ALERT CARD: Shipping Unavailable Warning */}
                {!freightData.shippable && !freightData.isCalculating && (
                  <div className="mt-3 p-3 bg-red-950/90 border-2 border-red-500 rounded-xl text-red-100 space-y-1">
                    <div className="flex items-center space-x-1.5 text-red-300 font-bold text-xs">
                      <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
                      <span>This item cannot be shipped to your location</span>
                    </div>
                    <p className="text-[11px] font-semibold text-red-200">
                      We cannot dispatch this product to the selected district.
                    </p>
                  </div>
                )}

                {/* Buyer Protection Guarantee */}
                <div className="mt-4 p-3 bg-white border border-slate-200 rounded-xl text-[11px] text-slate-700 space-y-1">
                  <p className="font-bold flex items-center text-slate-900">
                    <ShieldCheck className="w-3.5 h-3.5 mr-1 text-orange-500" />
                    LankaBuy Buyer Protection
                  </p>
                  <p className="text-[10px] text-slate-500 leading-normal">
                    Real-time islandwide parcel tracking and 7-day inspection return guarantee included on all orders.
                  </p>
                </div>
              </div>

              {/* Error Message if any */}
              {errorMsg && (
                <div className="my-2 p-2.5 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-center">
                  <AlertCircle className="w-4 h-4 mr-1.5 shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}

              {/* Submit Button (Vibrant Orange / Blocked if unshippable) */}
              <div className="mt-4">
                <button
                  type="submit"
                  disabled={isSubmitting || !freightData.shippable || freightData.isCalculating}
                  className={`w-full py-3 px-4 rounded-xl text-xs sm:text-sm font-black text-white transition flex items-center justify-center space-x-2 shadow-md shadow-orange-500/20 cursor-pointer ${
                    !freightData.shippable
                      ? 'bg-slate-300 text-slate-500 cursor-not-allowed shadow-none opacity-80'
                      : isSubmitting || freightData.isCalculating
                      ? 'bg-slate-700 cursor-wait'
                      : 'bg-orange-500 hover:bg-orange-600 active:scale-98'
                  }`}
                >
                  {!freightData.shippable ? (
                    <span>This Item Cannot Be Shipped</span>
                  ) : freightData.isCalculating ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin mr-2" />
                      <span>Calculating Shipping...</span>
                    </>
                  ) : isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin mr-2" />
                      <span>{submissionStep || 'Confirming Order...'}</span>
                    </>
                  ) : (
                    <>
                      <PackageCheck className="w-4 h-4 mr-1.5" />
                      <span>{paymentMethod === 'COD' ? 'Place Order (Cash on Delivery)' : 'Confirm & Complete Order'}</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </form>
        )}
      </div>
    </div>
  );
};
