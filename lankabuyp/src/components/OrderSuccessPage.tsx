import React, { useState, useEffect } from 'react';
import { 
  Package, 
  Clock, 
  MapPin, 
  Truck, 
  CheckCircle2, 
  ShieldCheck, 
  RotateCcw, 
  ArrowLeft, 
  ShoppingBag, 
  CreditCard, 
  Calendar, 
  ChevronRight, 
  RefreshCw, 
  AlertCircle,
  LogIn,
  Check,
  Phone,
  Navigation
} from 'lucide-react';
import { Order, UserProfile, DEFAULT_PRODUCT_IMAGE, OrderItem } from '../types';

interface OrderSuccessPageProps {
  order: Order | null;
  orderIdParam?: string;
  currentUser?: UserProfile | null;
  onBackToHome: () => void;
  onExploreProducts: () => void;
  onOpenAuthModal?: () => void;
  onOpenMyOrders?: () => void;
}

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

interface ReturnCountdown {
  hasStarted: boolean;
  isExpired: boolean;
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  message: string;
}

function calculateReturnCountdown(order: Order, now: number): ReturnCountdown {
  // Return countdown starts ONLY when status is DELIVERED
  const isDelivered = order.status === 'DELIVERED';

  if (!isDelivered) {
    return {
      hasStarted: false,
      isExpired: false,
      days: 7,
      hours: 0,
      minutes: 0,
      seconds: 0,
      message: '7-day return window starts upon successful delivery',
    };
  }

  // Delivery timestamp
  const deliveredTimeMs = order.deliveredAt
    ? new Date(order.deliveredAt).getTime()
    : (order.returnExpiryDate
        ? new Date(order.returnExpiryDate).getTime() - SEVEN_DAYS_MS
        : new Date(order.createdAt).getTime());

  const expiryMs = order.returnExpiryDate
    ? new Date(order.returnExpiryDate).getTime()
    : deliveredTimeMs + SEVEN_DAYS_MS;

  const diffMs = expiryMs - now;

  if (diffMs <= 0) {
    return {
      hasStarted: true,
      isExpired: true,
      days: 0,
      hours: 0,
      minutes: 0,
      seconds: 0,
      message: '7-day return window has closed',
    };
  }

  const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((diffMs % (1000 * 60)) / 1000);

  return {
    hasStarted: true,
    isExpired: false,
    days,
    hours,
    minutes,
    seconds,
    message: `${days}d ${hours}h ${minutes}m ${seconds}s remaining to request return`,
  };
}

export const OrderSuccessPage: React.FC<OrderSuccessPageProps> = ({
  order: initialOrder,
  orderIdParam,
  currentUser,
  onBackToHome,
  onExploreProducts,
  onOpenAuthModal,
  onOpenMyOrders,
}) => {
  const [userOrders, setUserOrders] = useState<Order[]>(initialOrder ? [initialOrder] : []);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(initialOrder);
  const [selectedItem, setSelectedItem] = useState<OrderItem | null>(
    initialOrder?.items?.[0] || null
  );
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [now, setNow] = useState<number>(Date.now());
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);

  // Return request form state
  const [showReturnModal, setShowReturnModal] = useState(false);
  const [returnReason, setReturnReason] = useState('');
  const [isSubmittingReturn, setIsSubmittingReturn] = useState(false);
  const [returnSuccess, setReturnSuccess] = useState(false);
  const [returnError, setReturnError] = useState('');

  // 1-second live countdown ticker
  useEffect(() => {
    const timer = setInterval(() => {
      setNow(Date.now());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Fetch logged in user's orders
  const loadUserOrders = async () => {
    if (!currentUser) return;
    setIsLoading(true);
    try {
      const q = new URLSearchParams();
      if (currentUser.email) q.append('email', currentUser.email);
      if (currentUser.uid) q.append('userId', currentUser.uid);

      const res = await fetch(`/api/user/orders?${q.toString()}`);
      const data = await res.json();
      if (res.ok && data.success && Array.isArray(data.orders)) {
        setUserOrders(data.orders);
        // If orderIdParam was specified in URL, find and select it
        if (orderIdParam) {
          const match = data.orders.find(
            (o: Order) => o.orderNumber === orderIdParam || o.id === orderIdParam
          );
          if (match) {
            setSelectedOrder(match);
            setSelectedItem(match.items?.[0] || null);
          }
        }
      }
    } catch (e) {
      console.error('Failed to load user orders:', e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (currentUser) {
      loadUserOrders();
    } else if (orderIdParam) {
      // If anonymous direct tracking link with specific order number
      fetchDirectOrder(orderIdParam);
    }
  }, [currentUser, orderIdParam]);

  const fetchDirectOrder = async (queryStr: string) => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/orders/track/${encodeURIComponent(queryStr.trim())}`);
      const data = await res.json();
      if (res.ok && data.success && data.order) {
        setSelectedOrder(data.order);
        setSelectedItem(data.order.items?.[0] || null);
        setUserOrders([data.order]);
      }
    } catch (e) {
      console.error('Failed to load direct order:', e);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    if (currentUser) {
      await loadUserOrders();
    } else if (selectedOrder) {
      await fetchDirectOrder(selectedOrder.orderNumber || selectedOrder.id);
    }
    setIsRefreshing(false);
  };

  const handleSelectItem = (order: Order, item: OrderItem) => {
    setSelectedOrder(order);
    setSelectedItem(item);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleBackToList = () => {
    setSelectedOrder(null);
    setSelectedItem(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleOpenReturnModal = () => {
    setReturnReason('');
    setReturnError('');
    setReturnSuccess(false);
    setShowReturnModal(true);
  };

  const handleSubmitReturn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOrder) return;
    if (!returnReason.trim()) {
      setReturnError('Please enter the reason for your return.');
      return;
    }

    setIsSubmittingReturn(true);
    setReturnError('');
    try {
      const res = await fetch(`/api/orders/${encodeURIComponent(selectedOrder.id)}/request-return`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reason: returnReason.trim(),
          userEmail: currentUser?.email || selectedOrder.customer.email,
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setReturnSuccess(true);
        setSelectedOrder(data.order);
        // update in userOrders list
        setUserOrders((prev) =>
          prev.map((o) => (o.id === data.order.id ? data.order : o))
        );
        setTimeout(() => {
          setShowReturnModal(false);
        }, 2000);
      } else {
        setReturnError(data.message || 'Return request submission failed.');
      }
    } catch (err: any) {
      setReturnError('Unable to connect to server. Please try again.');
    } finally {
      setIsSubmittingReturn(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'DELIVERED':
        return (
          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
            <CheckCircle2 className="w-3.5 h-3.5 mr-1 text-emerald-600" />
            Delivered
          </span>
        );
      case 'SHIPPED':
        return (
          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-blue-100 text-blue-800 border border-blue-300">
            <Truck className="w-3.5 h-3.5 mr-1 text-blue-600" />
            Air Shipped / In Transit
          </span>
        );
      case 'PROCESSING':
        return (
          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-300">
            <Clock className="w-3.5 h-3.5 mr-1 text-amber-600" />
            Processing
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-800 border border-slate-300">
            <Package className="w-3.5 h-3.5 mr-1 text-slate-600" />
            Order Confirmed
          </span>
        );
    }
  };

  return (
    <div className="w-full min-h-screen bg-slate-50 text-slate-800 pb-20 pt-4">
      <div className="max-w-4xl mx-auto px-4 sm:px-6">
        
        {/* Top Navigation Bar */}
        <div className="flex items-center justify-between py-3 mb-4 border-b border-slate-200/80 text-xs text-slate-500">
          <button 
            onClick={onBackToHome} 
            className="hover:text-orange-600 transition flex items-center font-bold cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4 mr-1" />
            <span>Back to Store</span>
          </button>

          <div className="flex items-center space-x-2">
            <button
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="flex items-center space-x-1 text-slate-600 hover:text-orange-600 bg-white border border-slate-200 hover:border-orange-300 px-3 py-1.5 rounded-xl transition cursor-pointer font-bold shadow-2xs disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-orange-500 ${isRefreshing ? 'animate-spin' : ''}`} />
              <span>Refresh</span>
            </button>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* CASE 1: USER NOT SIGNED IN                                                */}
        {/* ========================================================================= */}
        {!currentUser && !selectedOrder && (
          <div className="bg-white rounded-3xl p-8 sm:p-12 border border-slate-200 shadow-sm text-center max-w-md mx-auto my-10 space-y-5">
            <div className="w-16 h-16 rounded-2xl bg-orange-50 text-orange-600 flex items-center justify-center mx-auto shadow-inner">
              <Package className="w-8 h-8" />
            </div>
            <div>
              <h1 className="text-xl font-black text-slate-900">
                My Orders &amp; Tracking
              </h1>
              <p className="text-xs text-slate-500 mt-2 leading-relaxed">
                Please sign in to view your ordered items, track current parcel locations, and check the 7-day return guarantee.
              </p>
            </div>

            {onOpenAuthModal && (
              <button
                onClick={onOpenAuthModal}
                className="w-full bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-600 hover:to-amber-700 text-white font-bold py-3.5 px-6 rounded-2xl text-xs sm:text-sm transition flex items-center justify-center space-x-2 cursor-pointer shadow-md shadow-orange-500/20 active:scale-98"
              >
                <LogIn className="w-4 h-4" />
                <span>Sign In to View Orders</span>
              </button>
            )}

            <button
              onClick={onExploreProducts}
              className="w-full bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-3 px-4 rounded-2xl text-xs transition cursor-pointer"
            >
              Explore Products
            </button>
          </div>
        )}

        {/* ========================================================================= */}
        {/* CASE 2: LOADING ORDERS                                                    */}
        {/* ========================================================================= */}
        {isLoading && (
          <div className="py-20 text-center space-y-3">
            <div className="w-8 h-8 border-3 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
            <p className="text-xs font-bold text-slate-600">
              Loading your order details...
            </p>
          </div>
        )}

        {/* ========================================================================= */}
        {/* CASE 3: NO ORDERS FOUND FOR USER                                          */}
        {/* ========================================================================= */}
        {!isLoading && currentUser && userOrders.length === 0 && !selectedOrder && (
          <div className="bg-white rounded-3xl p-8 sm:p-12 border border-slate-200 shadow-sm text-center max-w-md mx-auto my-10 space-y-4">
            <div className="w-16 h-16 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
              <ShoppingBag className="w-8 h-8" />
            </div>
            <div>
              <h2 className="text-lg font-black text-slate-900">
                You haven't placed any orders yet
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                You haven't placed any orders yet on LankaBuy.
              </p>
            </div>
            <button
              onClick={onExploreProducts}
              className="w-full bg-orange-500 hover:bg-orange-600 text-white font-bold py-3.5 px-6 rounded-2xl text-xs transition cursor-pointer shadow-md shadow-orange-500/20"
            >
              Start Shopping Now
            </button>
          </div>
        )}

        {/* ========================================================================= */}
        {/* VIEW A: LIST OF ALL ORDERED ITEMS (User sees their ordered items)          */}
        {/* ========================================================================= */}
        {!isLoading && userOrders.length > 0 && !selectedOrder && (
          <div className="space-y-6">
            
            {/* Heading */}
            <div className="bg-gradient-to-r from-orange-500 to-amber-600 text-white rounded-3xl p-6 sm:p-8 shadow-sm">
              <div className="flex items-center space-x-3">
                <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-xs flex items-center justify-center">
                  <Package className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h1 className="text-xl sm:text-2xl font-black">
                    Your Ordered Items ({userOrders.reduce((acc, o) => acc + (o.items?.length || 0), 0)})
                  </h1>
                  <p className="text-xs text-orange-100 mt-0.5">
                    Click any item to view its details, parcel location, and remaining return days.
                  </p>
                </div>
              </div>
            </div>

            {/* List of ordered products */}
            <div className="space-y-4">
              {userOrders.map((order) => {
                const countdown = calculateReturnCountdown(order, now);
                const currentLocation =
                  order.customCurrentLocation ||
                  order.trackingHistory?.[0]?.location ||
                  'Peliyagoda Logistics Hub';

                return (
                  <div
                    key={order.id}
                    className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-xs hover:border-orange-300 transition"
                  >
                    {/* Order Meta Bar */}
                    <div className="px-5 py-3 bg-slate-50 border-b border-slate-100 flex flex-wrap items-center justify-between gap-2 text-xs">
                      <div className="flex items-center space-x-2">
                        <span className="font-bold text-slate-700">Order:</span>
                        <span className="font-mono font-bold text-orange-600">{order.orderNumber}</span>
                        <span className="text-slate-400">•</span>
                        <span className="text-slate-500">
                          {new Date(order.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                      <div>{getStatusBadge(order.status)}</div>
                    </div>

                    {/* Order Items */}
                    <div className="divide-y divide-slate-100">
                      {order.items.map((item, idx) => (
                        <div
                          key={idx}
                          onClick={() => handleSelectItem(order, item)}
                          className="p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 hover:bg-orange-50/50 cursor-pointer transition group"
                        >
                          <div className="flex items-center space-x-3.5 min-w-0">
                            <img
                              src={item.imageUrl || DEFAULT_PRODUCT_IMAGE}
                              alt={item.title}
                              className="w-16 h-16 object-cover rounded-2xl border border-slate-200 bg-white shrink-0 group-hover:border-orange-300"
                              onError={(e) => {
                                (e.target as HTMLImageElement).src = DEFAULT_PRODUCT_IMAGE;
                              }}
                            />
                            <div className="min-w-0">
                              <h3 className="text-sm font-bold text-slate-900 group-hover:text-orange-600 transition line-clamp-2">
                                {item.title}
                              </h3>
                              <p className="text-xs text-slate-500 mt-1">
                                Qty: <strong className="text-slate-800">{item.quantity}</strong> • Rs.{' '}
                                {item.totalPrice.toLocaleString()}
                              </p>
                              
                              {/* Current Location Message */}
                              <div className="flex items-center space-x-1 text-[11px] text-emerald-700 mt-1">
                                <Navigation className="w-3 h-3 shrink-0" />
                                <span className="font-medium truncate">Location: {currentLocation}</span>
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center justify-between w-full sm:w-auto space-x-3 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100">
                            {/* Return window preview badge */}
                            <div className="text-left sm:text-right">
                              {order.status === 'DELIVERED' ? (
                                <span className={`text-[11px] font-bold px-2.5 py-1 rounded-lg ${
                                  countdown.isExpired 
                                    ? 'bg-slate-100 text-slate-600' 
                                    : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                }`}>
                                  {countdown.isExpired ? 'Return Window Closed' : `Return left: ${countdown.days}d ${countdown.hours}h`}
                                </span>
                              ) : (
                                <span className="text-[10px] text-amber-700 bg-amber-50 border border-amber-200 font-bold px-2 py-0.5 rounded-lg">
                                  7-day return starts upon delivery
                                </span>
                              )}
                            </div>

                            <button className="flex items-center space-x-1 text-xs font-bold text-orange-600 group-hover:text-orange-700">
                              <span>View Details</span>
                              <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>

          </div>
        )}

        {/* ========================================================================= */}
        {/* VIEW B: CLICKED PRODUCT DETAILS & RETURN DAYS ONLY                         */}
        {/* ========================================================================= */}
        {selectedOrder && (
          <div className="space-y-6">
            
            {/* Back Button */}
            {userOrders.length > 1 && (
              <button
                onClick={handleBackToList}
                className="inline-flex items-center space-x-1 text-xs font-bold text-slate-600 hover:text-orange-600 transition cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>← Back to All Ordered Items</span>
              </button>
            )}

            {/* 1. PRODUCT DETAILS CARD (Product Details) */}
            <div className="bg-white rounded-3xl p-5 sm:p-7 border border-slate-200 shadow-xs space-y-5">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center space-x-2">
                  <Package className="w-5 h-5 text-orange-500" />
                  <h2 className="text-sm sm:text-base font-black text-slate-900">
                    Product Details
                  </h2>
                </div>
                <div>{getStatusBadge(selectedOrder.status)}</div>
              </div>

              {/* Items List */}
              <div className="space-y-4">
                {(selectedItem ? [selectedItem] : selectedOrder.items).map((item, idx) => (
                  <div key={idx} className="flex flex-col sm:flex-row items-start sm:items-center space-y-3 sm:space-y-0 sm:space-x-5 p-4 rounded-2xl bg-slate-50 border border-slate-200/80">
                    <img
                      src={item.imageUrl || DEFAULT_PRODUCT_IMAGE}
                      alt={item.title}
                      className="w-20 h-20 object-cover rounded-2xl border border-slate-200 bg-white shrink-0"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = DEFAULT_PRODUCT_IMAGE;
                      }}
                    />
                    <div className="flex-1 min-w-0">
                      <h3 className="text-sm sm:text-base font-bold text-slate-900 leading-snug">
                        {item.title}
                      </h3>
                      <p className="text-xs text-slate-400 font-mono mt-1">
                        SKU: {item.sku || 'DropX-LK'} • Quantity: <strong className="text-slate-800">{item.quantity}</strong>
                      </p>
                      <p className="text-xs sm:text-sm font-black text-orange-600 mt-1">
                        Rs. {item.totalPrice.toLocaleString()}{' '}
                        <span className="text-xs text-slate-400 font-normal">
                          (Rs. {item.unitPrice.toLocaleString()} each)
                        </span>
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Order Meta details */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-3 border-t border-slate-100 text-xs">
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">Order Number</span>
                  <span className="font-mono font-bold text-slate-800">{selectedOrder.orderNumber}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">Order Date</span>
                  <span className="font-bold text-slate-800">{new Date(selectedOrder.createdAt).toLocaleDateString()}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">Payment Method</span>
                  <span className="font-bold text-slate-800">{selectedOrder.paymentMethod.replace(/_/g, ' ')}</span>
                </div>
              </div>
            </div>

            {/* 2. PRODUCT LOCATION & ADMIN MESSAGE (Parcel Location & Admin Logistics Note) */}
            <div className="bg-white rounded-3xl p-5 sm:p-7 border border-slate-200 shadow-xs space-y-4">
              <div className="flex items-center space-x-2.5 pb-3 border-b border-slate-100">
                <div className="w-8 h-8 rounded-xl bg-orange-50 text-orange-600 flex items-center justify-center font-bold">
                  <Navigation className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-sm sm:text-base font-black text-slate-900">
                    Product Location
                  </h2>
                  <p className="text-[11px] text-slate-500">Real-time logistics update from LankaBuy operations</p>
                </div>
              </div>

              {/* Highlight Box for Location */}
              <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-slate-900 to-slate-800 text-white space-y-3">
                <div className="flex items-start space-x-3">
                  <MapPin className="w-5 h-5 text-orange-400 shrink-0 mt-0.5" />
                  <div>
                    <span className="text-slate-400 text-[10px] uppercase font-bold tracking-wider block">
                      Current Parcel Location:
                    </span>
                    <p className="text-base sm:text-lg font-black text-emerald-400 mt-0.5">
                      {selectedOrder.customCurrentLocation ||
                        selectedOrder.trackingHistory?.[0]?.location ||
                        'Peliyagoda Central Logistics Hub (Colombo)'}
                    </p>
                  </div>
                </div>

                {/* Latest message note from Admin */}
                <div className="pt-2 border-t border-slate-700/60 text-xs">
                  <span className="text-slate-400 text-[10px] uppercase font-bold block">
                    Latest Logistics Note:
                  </span>
                  <p className="text-slate-200 mt-0.5 leading-relaxed font-medium">
                    {selectedOrder.trackingHistory?.[0]?.description ||
                      (selectedOrder.status === 'DELIVERED'
                        ? 'Package successfully delivered to customer destination.'
                        : 'Order registered and processing in dispatch warehouse.')}
                  </p>
                  {selectedOrder.trackingHistory?.[0]?.timestamp && (
                    <p className="text-[10px] text-slate-400 font-mono mt-1">
                      Updated at:{' '}
                      {new Date(selectedOrder.trackingHistory[0].timestamp).toLocaleString()}
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* 3. RETURN DAYS LEFT */}
            {(() => {
              const countdown = calculateReturnCountdown(selectedOrder, now);

              return (
                <div className="bg-white rounded-3xl p-5 sm:p-7 border border-slate-200 shadow-xs space-y-4">
                  <div className="flex items-center space-x-2.5 pb-3 border-b border-slate-100">
                    <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
                      <RotateCcw className="w-4 h-4" />
                    </div>
                    <div>
                      <h2 className="text-sm sm:text-base font-black text-slate-900">
                        7-Day Return Guarantee
                      </h2>
                      <p className="text-[11px] text-slate-500">
                        Valid for 7 days after delivery confirmation (Delivery Success)
                      </p>
                    </div>
                  </div>

                  {/* If status is NOT DELIVERED yet */}
                  {selectedOrder.status !== 'DELIVERED' ? (
                    <div className="p-4 sm:p-5 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 space-y-2">
                      <div className="flex items-center space-x-2">
                        <Clock className="w-5 h-5 text-amber-600 shrink-0" />
                        <h4 className="text-xs sm:text-sm font-black">
                          Return window has not started yet
                        </h4>
                      </div>
                      <p className="text-xs text-amber-800 leading-relaxed font-medium">
                        Once your item is delivered (marked as Delivery Success), your 7-day return guarantee timer will begin live tracking.
                      </p>
                      <div className="pt-2 text-[11px] font-bold text-amber-900">
                        Current Status: <span className="underline">{selectedOrder.status.replace(/_/g, ' ')}</span>
                      </div>
                    </div>
                  ) : (
                    /* If status IS DELIVERED -> Live Countdown active */
                    <div className="space-y-4">
                      {/* Active Countdown Box */}
                      <div className={`p-4 sm:p-6 rounded-2xl border text-center space-y-3 ${
                        countdown.isExpired
                          ? 'bg-slate-50 border-slate-200 text-slate-600'
                          : 'bg-emerald-50/80 border-emerald-200 text-emerald-950'
                      }`}>
                        <div className="flex items-center justify-center space-x-1.5 text-xs font-bold">
                          <Clock className={`w-4 h-4 ${countdown.isExpired ? 'text-slate-400' : 'text-emerald-600 animate-pulse'}`} />
                          <span>
                            {countdown.isExpired 
                              ? 'Return period has expired' 
                              : 'Time remaining to request return:'}
                          </span>
                        </div>

                        {!countdown.isExpired ? (
                          <>
                            {/* Digital Clock Grid */}
                            <div className="grid grid-cols-4 gap-2 sm:gap-3 max-w-sm mx-auto">
                              <div className="bg-white p-2.5 sm:p-3 rounded-xl border border-emerald-200 shadow-2xs">
                                <span className="text-xl sm:text-2xl font-black text-emerald-700 block">
                                  {countdown.days}
                                </span>
                                <span className="text-[10px] font-bold uppercase text-slate-500">Days</span>
                              </div>
                              <div className="bg-white p-2.5 sm:p-3 rounded-xl border border-emerald-200 shadow-2xs">
                                <span className="text-xl sm:text-2xl font-black text-emerald-700 block">
                                  {countdown.hours}
                                </span>
                                <span className="text-[10px] font-bold uppercase text-slate-500">Hours</span>
                              </div>
                              <div className="bg-white p-2.5 sm:p-3 rounded-xl border border-emerald-200 shadow-2xs">
                                <span className="text-xl sm:text-2xl font-black text-emerald-700 block">
                                  {countdown.minutes}
                                </span>
                                <span className="text-[10px] font-bold uppercase text-slate-500">Mins</span>
                              </div>
                              <div className="bg-white p-2.5 sm:p-3 rounded-xl border border-emerald-200 shadow-2xs">
                                <span className="text-xl sm:text-2xl font-black text-emerald-700 block">
                                  {countdown.seconds}
                                </span>
                                <span className="text-[10px] font-bold uppercase text-slate-500">Secs</span>
                              </div>
                            </div>

                            <p className="text-xs font-bold text-emerald-800">
                              {countdown.message}
                            </p>
                          </>
                        ) : (
                          <p className="text-xs font-bold text-slate-500">
                            7-day return period has expired.
                          </p>
                        )}
                      </div>

                      {/* Return Action Button / Status */}
                      {selectedOrder.returnStatus === 'RETURN_REQUESTED' ? (
                        <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-center space-x-2">
                          <RotateCcw className="w-4 h-4 text-amber-600 shrink-0" />
                          <span className="font-bold">
                            Return request submitted (LankaBuy operations team is reviewing your request).
                          </span>
                        </div>
                      ) : !countdown.isExpired ? (
                        <button
                          onClick={handleOpenReturnModal}
                          className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold py-3 px-4 rounded-2xl text-xs transition flex items-center justify-center space-x-2 cursor-pointer shadow-sm active:scale-98"
                        >
                          <RotateCcw className="w-4 h-4 text-orange-400" />
                          <span>Request 7-Day Return</span>
                        </button>
                      ) : null}
                    </div>
                  )}

                  {/* Buyer Protection Guarantee footer */}
                  <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-100 flex items-center space-x-2.5 text-xs text-slate-600">
                    <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>LankaBuy 100% Genuine Guarantee &amp; Safe Islandwide Delivery</span>
                  </div>
                </div>
              );
            })()}

            {/* Back Button */}
            <div className="pt-2">
              <button
                onClick={userOrders.length > 1 ? handleBackToList : onExploreProducts}
                className="w-full bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs sm:text-sm font-bold py-3 px-4 rounded-2xl transition flex items-center justify-center space-x-2 cursor-pointer active:scale-98"
              >
                <span>{userOrders.length > 1 ? '← Back to Ordered Items' : 'Continue Shopping'}</span>
              </button>
            </div>

          </div>
        )}

        {/* ========================================================================= */}
        {/* RETURN REQUEST MODAL                                                      */}
        {/* ========================================================================= */}
        {showReturnModal && selectedOrder && (
          <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl p-6 sm:p-7 max-w-md w-full border border-slate-200 shadow-2xl space-y-4">
              <div className="flex items-center space-x-2 border-b border-slate-100 pb-3">
                <RotateCcw className="w-5 h-5 text-orange-600" />
                <h3 className="text-sm sm:text-base font-black text-slate-900">
                  Request 7-Day Return
                </h3>
              </div>

              {returnSuccess ? (
                <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl text-center space-y-2">
                  <CheckCircle2 className="w-10 h-10 text-emerald-600 mx-auto" />
                  <p className="text-xs font-bold text-emerald-900">
                    Return request submitted successfully!
                  </p>
                  <p className="text-[11px] text-emerald-700">
                    Our customer support team will contact you shortly with the return label instructions.
                  </p>
                </div>
              ) : (
                <form onSubmit={handleSubmitReturn} className="space-y-3 text-xs">
                  <p className="text-slate-600">
                    Please describe the reason for returning Order #{selectedOrder.orderNumber}:
                  </p>

                  <textarea
                    rows={3}
                    value={returnReason}
                    onChange={(e) => setReturnReason(e.target.value)}
                    placeholder="e.g. Item defective, wrong item received, or sizing issue..."
                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-3 text-xs text-slate-900 focus:bg-white focus:border-orange-500 focus:outline-hidden"
                  />

                  {returnError && (
                    <p className="text-[11px] text-red-600 font-bold">{returnError}</p>
                  )}

                  <div className="flex items-center justify-end space-x-2 pt-2">
                    <button
                      type="button"
                      onClick={() => setShowReturnModal(false)}
                      className="px-4 py-2 text-xs font-bold text-slate-500 hover:text-slate-800 transition cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={isSubmittingReturn}
                      className="bg-orange-500 hover:bg-orange-600 text-white font-bold px-4 py-2 rounded-xl text-xs transition cursor-pointer shadow-sm disabled:opacity-50"
                    >
                      {isSubmittingReturn ? 'Submitting...' : 'Submit Request'}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        )}

      </div>
    </div>
  );
};
