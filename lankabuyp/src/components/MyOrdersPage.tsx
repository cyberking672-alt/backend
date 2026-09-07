import React, { useState, useEffect, useMemo } from 'react';
import { 
  Package, 
  Clock, 
  Lock, 
  Unlock, 
  MapPin, 
  Truck, 
  ChevronRight, 
  AlertCircle, 
  CheckCircle2, 
  ShieldCheck, 
  ExternalLink, 
  RefreshCw, 
  ArrowLeft,
  RotateCcw,
  ShoppingBag,
  CreditCard,
  Banknote,
  Calendar,
  Search
} from 'lucide-react';
import { Order, UserProfile } from '../types';

interface MyOrdersPageProps {
  currentUser: UserProfile | null;
  allOrders?: Order[];
  onOpenAuthModal: () => void;
  onNavigateHome: () => void;
  onTrackOrder?: (orderNumber: string) => void;
}

// 7-day return duration in milliseconds: 7 days * 24h * 60m * 60s * 1000ms
const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

interface ReturnCountdown {
  isExpired: boolean;
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  timeString: string;
}

function calculateReturnCountdown(order: Order, now: number): ReturnCountdown {
  const createdAtMs = new Date(order.createdAt).getTime();
  const expiryMs = order.returnExpiryDate ? new Date(order.returnExpiryDate).getTime() : createdAtMs + SEVEN_DAYS_MS;
  const remainingMs = expiryMs - now;

  if (remainingMs <= 0) {
    return {
      isExpired: true,
      days: 0,
      hours: 0,
      minutes: 0,
      seconds: 0,
      timeString: 'Expired (Return window closed)',
    };
  }

  const days = Math.floor(remainingMs / (1000 * 60 * 60 * 24));
  const hours = Math.floor((remainingMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((remainingMs % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((remainingMs % (1000 * 60)) / 1000);

  return {
    isExpired: false,
    days,
    hours,
    minutes,
    seconds,
    timeString: `${days}d ${hours}h ${minutes}m remaining`,
  };
}

export const MyOrdersPage: React.FC<MyOrdersPageProps> = ({
  currentUser,
  allOrders = [],
  onOpenAuthModal,
  onNavigateHome,
  onTrackOrder,
}) => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeFilter, setActiveFilter] = useState<'ALL' | 'ACTIVE' | 'DELIVERED' | 'RETURN'>('ALL');
  const [selectedOrderForReturn, setSelectedOrderForReturn] = useState<Order | null>(null);
  const [returnReason, setReturnReason] = useState('');
  const [returnSubmitted, setReturnSubmitted] = useState<Record<string, boolean>>({});
  const [now, setNow] = useState<number>(Date.now());
  const [selectedOrderDetails, setSelectedOrderDetails] = useState<Order | null>(null);

  // Live 1-second countdown ticker for exact return window accuracy
  useEffect(() => {
    const timer = setInterval(() => {
      setNow(Date.now());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Fetch orders specific to this logged in user
  const fetchUserOrders = async () => {
    if (!currentUser) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    try {
      // 1. Fetch from server API with user identification
      const res = await fetch(`/api/user/orders?email=${encodeURIComponent(currentUser.email)}&userId=${encodeURIComponent(currentUser.uid)}`);
      if (res.ok) {
        const data = await res.json();
        if (data.success && Array.isArray(data.orders)) {
          setOrders(data.orders);
          setIsLoading(false);
          return;
        }
      }

      // 2. Fallback to client-side filtered orders array passed via props
      const userOrders = allOrders.filter((o) => {
        const orderEmail = o.customer?.email?.toLowerCase().trim();
        const userEmail = currentUser.email?.toLowerCase().trim();
        const matchesEmail = orderEmail && userEmail && orderEmail === userEmail;
        const matchesUid = o.userId && o.userId === currentUser.uid;
        return matchesEmail || matchesUid;
      });
      setOrders(userOrders);
    } catch (err) {
      console.warn('[MyOrders] Could not fetch user orders via API, using filtered state:', err);
      const userOrders = allOrders.filter((o) => {
        const orderEmail = o.customer?.email?.toLowerCase().trim();
        const userEmail = currentUser.email?.toLowerCase().trim();
        return (orderEmail && userEmail && orderEmail === userEmail) || (o.userId && o.userId === currentUser.uid);
      });
      setOrders(userOrders);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchUserOrders();
  }, [currentUser?.email, currentUser?.uid, allOrders.length]);

  // Filtered orders list based on search and status
  const filteredOrders = useMemo(() => {
    return orders.filter((order) => {
      const matchesSearch = 
        order.orderNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
        order.items.some((item) => item.title.toLowerCase().includes(searchTerm.toLowerCase()));

      if (!matchesSearch) return false;

      if (activeFilter === 'ACTIVE') {
        return !['DELIVERED', 'CANCELLED', 'FAILED'].includes(order.status);
      }
      if (activeFilter === 'DELIVERED') {
        return order.status === 'DELIVERED';
      }
      if (activeFilter === 'RETURN') {
        const countdown = calculateReturnCountdown(order, now);
        return !countdown.isExpired || order.returnAdminUnlocked;
      }
      return true;
    });
  }, [orders, searchTerm, activeFilter, now]);

  // Request return handler
  const handleRequestReturn = (order: Order) => {
    setSelectedOrderForReturn(order);
    setReturnReason('');
  };

  const submitReturnRequest = async () => {
    if (!selectedOrderForReturn || !returnReason.trim()) return;
    try {
      await fetch(`/api/orders/${selectedOrderForReturn.id}/request-return`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId: selectedOrderForReturn.id,
          reason: returnReason,
          userEmail: currentUser?.email,
        }),
      }).catch(() => {});

      setReturnSubmitted((prev) => ({ ...prev, [selectedOrderForReturn.id]: true }));
      setSelectedOrderForReturn(null);
    } catch {
      setReturnSubmitted((prev) => ({ ...prev, [selectedOrderForReturn.id]: true }));
      setSelectedOrderForReturn(null);
    }
  };

  if (!currentUser) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16 text-center">
        <div className="bg-white rounded-3xl p-8 sm:p-12 border border-slate-200/80 shadow-xl max-w-lg mx-auto">
          <div className="w-16 h-16 bg-orange-100 rounded-2xl flex items-center justify-center mx-auto mb-5 text-orange-600 shadow-inner">
            <Package className="w-8 h-8" />
          </div>
          <h2 className="text-2xl font-black text-slate-900 mb-2">Sign in to View Your Orders</h2>
          <p className="text-slate-600 text-sm mb-6 leading-relaxed">
            Please sign in to view your purchased items, order status, and track your 7-day return guarantee.
          </p>
          <button
            onClick={onOpenAuthModal}
            className="w-full bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-black py-3.5 px-6 rounded-xl shadow-lg shadow-orange-500/25 transition active:scale-95 cursor-pointer text-sm flex items-center justify-center"
          >
            Sign In with Google / Email
          </button>
          <button
            onClick={onNavigateHome}
            className="w-full mt-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-2.5 px-4 rounded-xl text-xs transition cursor-pointer"
          >
            Back to Home
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
      {/* Top Banner Navigation */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8 pb-6 border-b border-slate-200/80">
        <div>
          <button
            onClick={onNavigateHome}
            className="inline-flex items-center text-xs font-bold text-slate-500 hover:text-orange-600 transition mb-2 cursor-pointer group"
          >
            <ArrowLeft className="w-3.5 h-3.5 mr-1 group-hover:-translate-x-0.5 transition-transform" />
            Back to Marketplace
          </button>
          <div className="flex items-center space-x-3">
            <h1 className="text-2xl sm:text-3xl font-black text-slate-950 tracking-tight">
              My Orders &amp; Purchases
            </h1>
            <span className="bg-orange-100 text-orange-700 text-xs font-black px-2.5 py-0.5 rounded-full">
              {orders.length} {orders.length === 1 ? 'Order' : 'Orders'}
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Displaying only your purchased items • 7-Day Return Guarantee Real-time Tracker
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={fetchUserOrders}
            className="bg-white border border-slate-200 hover:border-slate-300 text-slate-700 p-2 rounded-xl text-xs font-bold flex items-center shadow-xs cursor-pointer transition"
            title="Refresh orders"
          >
            <RefreshCw className={`w-4 h-4 mr-1.5 ${isLoading ? 'animate-spin text-orange-500' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div className="bg-white rounded-2xl p-3 sm:p-4 border border-slate-200/90 shadow-sm mb-6 flex flex-col md:flex-row gap-3 items-center justify-between">
        <div className="relative w-full md:w-96">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by Order ID or Product title..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm focus:outline-none focus:border-orange-500 focus:bg-white transition"
          />
        </div>

        <div className="flex items-center space-x-1.5 overflow-x-auto w-full md:w-auto pb-1 md:pb-0">
          {(['ALL', 'ACTIVE', 'DELIVERED', 'RETURN'] as const).map((filter) => (
            <button
              key={filter}
              onClick={() => setActiveFilter(filter)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition cursor-pointer ${
                activeFilter === filter
                  ? 'bg-orange-500 text-white shadow-xs shadow-orange-500/30'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {filter === 'ALL' && 'All Orders'}
              {filter === 'ACTIVE' && 'Active / In Transit'}
              {filter === 'DELIVERED' && 'Delivered'}
              {filter === 'RETURN' && '7-Day Return Eligible'}
            </button>
          ))}
        </div>
      </div>

      {/* Orders List Container */}
      {isLoading ? (
        <div className="bg-white rounded-3xl p-12 text-center border border-slate-200/80 shadow-sm">
          <RefreshCw className="w-8 h-8 text-orange-500 animate-spin mx-auto mb-3" />
          <p className="text-sm font-bold text-slate-700">Loading your purchase history from LankaBuy records...</p>
        </div>
      ) : filteredOrders.length === 0 ? (
        <div className="bg-white rounded-3xl p-12 text-center border border-slate-200/80 shadow-sm">
          <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-4 text-slate-400">
            <ShoppingBag className="w-8 h-8" />
          </div>
          <h3 className="text-lg font-black text-slate-900 mb-1">No Purchases Found</h3>
          <p className="text-xs sm:text-sm text-slate-500 mb-6 max-w-sm mx-auto">
            {searchTerm
              ? 'No orders matched your search criteria.'
              : 'You have not placed any orders yet. Discover trending products in our catalog.'}
          </p>
          <button
            onClick={onNavigateHome}
            className="bg-orange-500 hover:bg-orange-600 text-white font-bold py-2.5 px-6 rounded-xl text-xs shadow-md shadow-orange-500/20 transition cursor-pointer"
          >
            Start Shopping Now
          </button>
        </div>
      ) : (
        <div className="space-y-6">
          {filteredOrders.map((order) => {
            const countdown = calculateReturnCountdown(order, now);
            const isAutoLocked = countdown.isExpired && !order.returnAdminUnlocked;
            const isAdminUnlocked = Boolean(order.returnAdminUnlocked);
            const latestTracking = order.trackingHistory?.[0] || {
              status: order.status,
              location: order.customCurrentLocation || 'Colombo Logistics Hub',
              description: 'Order confirmed and registered in LankaBuy tracking system.',
              timestamp: order.createdAt,
            };

            const currentLocation = order.customCurrentLocation || latestTracking.location || 'Colombo Logistics Hub';

            return (
              <div
                key={order.id}
                className="bg-white rounded-3xl border border-slate-200/90 hover:border-orange-300 transition-all shadow-sm hover:shadow-md overflow-hidden"
              >
                {/* Order Header Summary Bar */}
                <div className="bg-slate-50/80 px-4 sm:px-6 py-3.5 border-b border-slate-200/80 flex flex-wrap items-center justify-between gap-3">
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
                    <div>
                      <span className="text-[10px] text-slate-400 uppercase font-black tracking-wider block">Order ID</span>
                      <span className="font-mono text-xs sm:text-sm font-black text-slate-900">{order.orderNumber}</span>
                    </div>

                    <div className="h-6 w-px bg-slate-200 hidden sm:block" />

                    <div>
                      <span className="text-[10px] text-slate-400 uppercase font-black tracking-wider block">Placed On</span>
                      <span className="text-xs font-semibold text-slate-700">
                        {new Date(order.createdAt).toLocaleDateString('en-US', {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </div>

                    <div className="h-6 w-px bg-slate-200 hidden sm:block" />

                    <div>
                      <span className="text-[10px] text-slate-400 uppercase font-black tracking-wider block">Payment</span>
                      <span className="text-xs font-bold text-slate-800 flex items-center">
                        {order.paymentMethod === 'COD' ? (
                          <>
                            <Banknote className="w-3.5 h-3.5 mr-1 text-emerald-600" />
                            Cash on Delivery ({order.paymentStatus})
                          </>
                        ) : (
                          <>
                            <CreditCard className="w-3.5 h-3.5 mr-1 text-blue-600" />
                            Card via Creem.io (PAID)
                          </>
                        )}
                      </span>
                    </div>
                  </div>

                  {/* Status Badges */}
                  <div className="flex items-center gap-2">
                    <span
                      className={`text-[10px] sm:text-xs font-black uppercase px-2.5 py-1 rounded-full flex items-center ${
                        order.status === 'DELIVERED'
                          ? 'bg-emerald-100 text-emerald-800'
                          : order.status === 'SHIPPED' || order.status === 'IN_TRANSIT'
                          ? 'bg-blue-100 text-blue-800'
                          : 'bg-amber-100 text-amber-800'
                      }`}
                    >
                      <Truck className="w-3 h-3 mr-1" />
                      {order.status}
                    </span>
                  </div>
                </div>

                <div className="p-4 sm:p-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
                  {/* Left Column: Items purchased */}
                  <div className="lg:col-span-7 space-y-3">
                    <h4 className="text-xs font-black uppercase text-slate-400 tracking-wider mb-2">
                      Purchased Products ({order.items.length})
                    </h4>
                    {order.items.map((item, idx) => (
                      <div key={idx} className="flex items-center space-x-3 p-2.5 rounded-2xl bg-slate-50/60 border border-slate-100">
                        <img
                          src={item.imageUrl}
                          alt={item.title}
                          className="w-14 h-14 sm:w-16 sm:h-16 object-cover rounded-xl border border-slate-200 shrink-0 bg-white"
                        />
                        <div className="flex-1 min-w-0">
                          <h5 className="text-xs sm:text-sm font-bold text-slate-900 truncate leading-snug" title={item.title}>
                            {item.title}
                          </h5>
                          <div className="flex flex-wrap items-center gap-2 mt-1 text-[11px] text-slate-500">
                            <span>Qty: <strong className="text-slate-800">{item.quantity}</strong></span>
                            <span>•</span>
                            <span>Unit: <strong className="text-slate-800">Rs. {item.unitPrice.toLocaleString()}</strong></span>
                            {item.selectedColor && (
                              <>
                                <span>•</span>
                                <span className="text-slate-600">Color: {item.selectedColor}</span>
                              </>
                            )}
                            {item.selectedSize && (
                              <>
                                <span>•</span>
                                <span className="text-slate-600">Size: {item.selectedSize}</span>
                              </>
                            )}
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <span className="text-xs sm:text-sm font-black text-slate-950 block">
                            Rs. {item.totalPrice.toLocaleString()}
                          </span>
                        </div>
                      </div>
                    ))}

                    {/* Delivery Destination Address */}
                    <div className="mt-4 pt-4 border-t border-slate-100 text-xs text-slate-600 flex items-start space-x-2">
                      <MapPin className="w-3.5 h-3.5 text-orange-500 shrink-0 mt-0.5" />
                      <div>
                        <strong className="text-slate-900">{order.customer.fullName}</strong> ({order.customer.phone})
                        <p className="text-slate-500 mt-0.5">
                          {order.customer.street}, {order.customer.city}, {order.customer.district} ({order.customer.postalCode || 'Sri Lanka'})
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Right Column: 7-Day Return Logic + Real-time Location */}
                  <div className="lg:col-span-5 flex flex-col justify-between space-y-4 bg-slate-50/50 p-4 sm:p-5 rounded-2xl border border-slate-200/80">
                    {/* 🛡️ 7-DAY RETURN POLICY AUTO-LOCK WIDGET */}
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center space-x-1.5">
                          <RotateCcw className="w-4 h-4 text-orange-600" />
                          <h4 className="text-xs font-black uppercase text-slate-800 tracking-wider">
                            7-Day Return Guarantee
                          </h4>
                        </div>
                        <span className="text-[10px] text-slate-400 font-semibold">
                          (7 Days)
                        </span>
                      </div>

                      {/* State 1: Admin Unlocked Override */}
                      {isAdminUnlocked ? (
                        <div className="bg-blue-50 border border-blue-200/90 rounded-xl p-3 text-xs">
                          <div className="flex items-center space-x-2 text-blue-900 font-bold mb-1">
                            <Unlock className="w-4 h-4 text-blue-600 shrink-0" />
                            <span>Return Unlocked by Admin</span>
                          </div>
                          <p className="text-[11px] text-blue-700 leading-snug">
                            The store administrator has manually authorized a return request exception for this order.
                          </p>
                          <button
                            onClick={() => handleRequestReturn(order)}
                            className="mt-2.5 w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-1.5 px-3 rounded-lg text-xs transition cursor-pointer shadow-xs"
                          >
                            Submit Return Request
                          </button>
                        </div>
                      ) : !isAutoLocked ? (
                        /* State 2: Active countdown (Within 7 Days) */
                        <div className="bg-emerald-50 border border-emerald-200/90 rounded-xl p-3 text-xs">
                          <div className="flex items-center justify-between mb-1">
                            <span className="flex items-center font-bold text-emerald-900">
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 mr-1 shrink-0" />
                              Return Window Active
                            </span>
                            <span className="font-mono font-black text-emerald-700 text-[11px] bg-emerald-100/80 px-2 py-0.5 rounded-md">
                              {countdown.days}d {countdown.hours}h {countdown.minutes}m {countdown.seconds}s
                            </span>
                          </div>
                          <p className="text-[11px] text-emerald-700 leading-snug">
                            You have {countdown.days} days and {countdown.hours} hours left to request a return for this item.
                          </p>
                          <button
                            onClick={() => handleRequestReturn(order)}
                            className="mt-2.5 w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-1.5 px-3 rounded-lg text-xs transition cursor-pointer shadow-xs"
                          >
                            Request 7-Day Return
                          </button>
                        </div>
                      ) : (
                        /* State 3: Auto-Locked after 7 Days */
                        <div className="bg-slate-100 border border-slate-200/90 rounded-xl p-3 text-xs">
                          <div className="flex items-center space-x-1.5 text-slate-700 font-bold mb-1">
                            <Lock className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                            <span>Return Window Expired & Auto-Locked</span>
                          </div>
                          <p className="text-[11px] text-slate-500 leading-snug">
                            The 7-day return period has elapsed and the return window is automatically locked. Contact support if you need assistance.
                          </p>
                          <button
                            disabled
                            className="mt-2.5 w-full bg-slate-200 text-slate-400 font-bold py-1.5 px-3 rounded-lg text-xs cursor-not-allowed flex items-center justify-center space-x-1"
                          >
                            <Lock className="w-3 h-3 mr-1" />
                            Return Window Locked
                          </button>
                        </div>
                      )}
                    </div>

                    {/* 📍 CURRENT LIVE LOCATION (TYPED BY ADMIN) */}
                    <div className="bg-white rounded-xl p-3.5 border border-slate-200/90 shadow-xs">
                      <span className="text-[10px] text-slate-400 font-black uppercase tracking-wider block mb-1 flex items-center">
                        <MapPin className="w-3 h-3 mr-1 text-orange-500" />
                        Current Parcel Location
                      </span>
                      <div className="font-bold text-xs sm:text-sm text-slate-900 bg-orange-50/50 p-2 rounded-lg border border-orange-100 flex items-center justify-between">
                        <span className="truncate">{currentLocation}</span>
                        <span className="text-[10px] text-orange-600 font-black uppercase shrink-0 ml-2">Live</span>
                      </div>
                      <p className="text-[11px] text-slate-500 mt-1.5 leading-snug line-clamp-2">
                        {latestTracking.description}
                      </p>
                    </div>

                    {/* Order Total & Tracking Action */}
                    <div className="pt-3 border-t border-slate-200 flex items-center justify-between">
                      <div>
                        <span className="text-[10px] text-slate-400 font-bold block uppercase">Total Paid</span>
                        <span className="text-base sm:text-lg font-black text-slate-950">
                          Rs. {order.totalAmount.toLocaleString()}
                        </span>
                      </div>

                      <button
                        onClick={() => {
                          if (onTrackOrder) {
                            onTrackOrder(order.orderNumber);
                          } else {
                            setSelectedOrderDetails(order);
                          }
                        }}
                        className="bg-slate-900 hover:bg-slate-800 text-white font-bold py-2 px-3.5 rounded-xl text-xs transition flex items-center cursor-pointer shadow-xs"
                      >
                        Track Status
                        <ChevronRight className="w-3.5 h-3.5 ml-1" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Return Request Modal */}
      {selectedOrderForReturn && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center space-x-2 text-orange-600 mb-2">
              <RotateCcw className="w-5 h-5" />
              <h3 className="text-lg font-black text-slate-900">7-Day Return Request</h3>
            </div>
            <p className="text-xs text-slate-600 mb-4">
              Submit a return request for Order #{selectedOrderForReturn.orderNumber}.
            </p>

            <div className="mb-4">
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Reason for Return *
              </label>
              <textarea
                rows={3}
                value={returnReason}
                onChange={(e) => setReturnReason(e.target.value)}
                placeholder="e.g., Wrong item received, defective product, damaged package, or sizing issue..."
                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm focus:outline-none focus:border-orange-500 focus:bg-white"
              />
            </div>

            <div className="flex items-center justify-end space-x-2">
              <button
                onClick={() => setSelectedOrderForReturn(null)}
                className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-2 px-4 rounded-xl text-xs transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={submitReturnRequest}
                disabled={!returnReason.trim()}
                className="bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white font-bold py-2 px-5 rounded-xl text-xs transition cursor-pointer shadow-md shadow-orange-500/20"
              >
                Submit Return
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Order Tracking History Modal */}
      {selectedOrderDetails && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-lg w-full shadow-2xl border border-slate-200 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-4">
              <div>
                <span className="text-[10px] text-slate-400 uppercase font-black">Tracking Timeline</span>
                <h3 className="text-base font-black text-slate-900">Order #{selectedOrderDetails.orderNumber}</h3>
              </div>
              <button
                onClick={() => setSelectedOrderDetails(null)}
                className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer font-black"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4 relative before:absolute before:left-3 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200 pl-8">
              {selectedOrderDetails.trackingHistory.map((step, idx) => (
                <div key={idx} className="relative">
                  <div className="absolute -left-[27px] top-1 w-4 h-4 rounded-full bg-orange-500 border-2 border-white shadow-xs" />
                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                    <div className="flex items-center justify-between text-xs font-bold text-slate-900 mb-0.5">
                      <span>{step.status}</span>
                      <span className="text-[10px] text-slate-400 font-normal">
                        {new Date(step.timestamp).toLocaleString()}
                      </span>
                    </div>
                    <div className="text-[11px] text-orange-600 font-semibold mb-1 flex items-center">
                      <MapPin className="w-3 h-3 mr-1 shrink-0" />
                      {step.location}
                    </div>
                    <p className="text-xs text-slate-600 leading-snug">{step.description}</p>
                  </div>
                </div>
              ))}
            </div>

            <button
              onClick={() => setSelectedOrderDetails(null)}
              className="mt-6 w-full bg-slate-900 text-white font-bold py-2.5 rounded-xl text-xs cursor-pointer hover:bg-slate-800 transition"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
