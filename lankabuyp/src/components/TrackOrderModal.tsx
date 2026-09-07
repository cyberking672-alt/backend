import React, { useState, useEffect } from 'react';
import { 
  X, 
  Search, 
  Truck, 
  Package, 
  MapPin, 
  AlertCircle,
  RefreshCw
} from 'lucide-react';
import { Order } from '../types';

interface TrackOrderModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialQuery?: string;
}

export const TrackOrderModal: React.FC<TrackOrderModalProps> = ({
  isOpen,
  onClose,
  initialQuery = '',
}) => {
  if (!isOpen) return null;

  const [query, setQuery] = useState(initialQuery);
  const [loading, setLoading] = useState(false);
  const [order, setOrder] = useState<Order | null>(null);
  const [error, setError] = useState('');
  const [isAdvancing, setIsAdvancing] = useState(false);

  const handleSearch = async (searchTarget?: string) => {
    const q = (searchTarget !== undefined ? searchTarget : query).trim();
    if (!q) return;

    setLoading(true);
    setError('');

    try {
      const res = await fetch(`/api/orders/track/${encodeURIComponent(q)}`);
      const data = await res.json();

      if (!res.ok || !data.success) {
        setError(data.message || 'No order found with the provided identifier.');
        setOrder(null);
      } else {
        setOrder(data.order);
      }
    } catch (err: any) {
      setError('Failed to fetch tracking details from LankaBuy server.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (initialQuery) {
      setQuery(initialQuery);
      handleSearch(initialQuery);
    }
  }, [initialQuery]);

  // Simulate advancing carrier progress via mock webhook
  const handleAdvanceStatus = async () => {
    if (!order) return;
    setIsAdvancing(true);

    try {
      const nextStatuses: Record<string, { next: string; note: string; location: string }> = {
        ORDER_PLACED: {
          next: 'PACKAGING',
          note: 'LankaBuy automated fulfillment center verified and packed the parcel',
          location: 'Colombo Central Logistics Facility, Peliyagoda',
        },
        DROPCO_SYNCED: {
          next: 'IN_TRANSIT',
          note: 'Parcel dispatched onto express delivery shuttle',
          location: 'Western Province Sorting & Distribution Depot',
        },
        SUPPLIER_ACCEPTED: {
          next: 'IN_TRANSIT',
          note: 'Quality inspection verified. In transit to destination regional hub',
          location: 'Colombo Express Logistics Center',
        },
        IN_TRANSIT: {
          next: 'OUT_FOR_DELIVERY',
          note: 'Dispatched with islandwide courier on route to customer address',
          location: `${order.customer.city} Delivery Hub`,
        },
        OUT_FOR_DELIVERY: {
          next: 'DELIVERED',
          note: 'Parcel successfully handed over and signed by recipient',
          location: `${order.customer.street}, ${order.customer.city}`,
        },
      };

      const currentStatus = order.trackingHistory[order.trackingHistory.length - 1]?.status || 'ORDER_PLACED';
      const transition = nextStatuses[currentStatus] || {
        next: 'IN_TRANSIT',
        note: 'Package scanned at islandwide transit checkpoint',
        location: 'LankaBuy Central Transit Hub',
      };

      const res = await fetch('/api/supplier/mock-webhook', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId: order.id,
          newStatus: transition.next,
          note: transition.note,
          location: transition.location,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setOrder(data.order);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsAdvancing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in">
      <div className="bg-white rounded-3xl max-w-2xl w-full shadow-2xl overflow-hidden border border-slate-200 my-6">
        {/* Header */}
        <div className="px-6 py-4 bg-white border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-lg bg-orange-50 text-orange-500 flex items-center justify-center">
              <Truck className="w-4 h-4" />
            </div>
            <h3 className="font-bold text-slate-800 text-base">
              LankaBuy Islandwide Order Tracking
            </h3>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 p-1.5 rounded-full hover:bg-slate-100 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tracking Search Input */}
        <div className="p-6">
          <div className="flex space-x-2">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                placeholder="Enter LankaBuy Order Number (e.g. LK-...) or Tracking Code..."
                className="w-full bg-slate-50 border border-slate-300 rounded-xl pl-9.5 pr-3 py-2.5 text-xs sm:text-sm text-slate-800 focus:bg-white focus:ring-2 focus:ring-orange-500 focus:border-orange-500 focus:outline-hidden"
              />
            </div>
            <button
              onClick={() => handleSearch()}
              disabled={loading}
              className="bg-orange-500 hover:bg-orange-600 text-white px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition flex items-center cursor-pointer shadow-sm active:scale-95"
            >
              {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : 'Track Order'}
            </button>
          </div>

          {/* Error Notice */}
          {error && (
            <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-center">
              <AlertCircle className="w-4 h-4 mr-2 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Order Details & Timeline */}
          {order && (
            <div className="mt-6 space-y-6">
              {/* Top Stats Box */}
              <div className="bg-slate-900 text-white rounded-2xl p-4 grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
                <div>
                  <p className="text-slate-400 text-[10px] uppercase font-bold">LankaBuy Order #</p>
                  <p className="font-mono font-bold text-orange-400 text-sm mt-0.5">{order.orderNumber}</p>
                </div>
                <div>
                  <p className="text-slate-400 text-[10px] uppercase font-bold">Courier Tracking #</p>
                  <p className="font-mono font-bold text-emerald-400 text-sm mt-0.5">
                    {order.trackingNumber || order.supplierResponse?.trackingNumber || 'Pending'}
                  </p>
                </div>
                <div className="col-span-2 sm:col-span-1">
                  <p className="text-slate-400 text-[10px] uppercase font-bold">Delivery Status</p>
                  <p className="font-bold text-white text-sm mt-0.5 flex items-center">
                    <span className="w-2 h-2 rounded-full bg-orange-400 mr-1.5 animate-pulse"></span>
                    {order.status.replace(/_/g, ' ')}
                  </p>
                </div>
              </div>

              {/* Step-by-Step Logistics Timeline */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-xs font-black uppercase tracking-wider text-slate-700">
                    Islandwide Delivery Timeline
                  </h4>

                  {/* Advance Checkpoint */}
                  <button
                    onClick={handleAdvanceStatus}
                    disabled={isAdvancing}
                    className="text-[11px] bg-orange-50 hover:bg-orange-100 text-orange-600 font-bold px-3 py-1.5 rounded-lg border border-orange-200 transition flex items-center cursor-pointer"
                    title="Simulate dispatch checkpoint event"
                  >
                    <RefreshCw className={`w-3 h-3 mr-1 ${isAdvancing ? 'animate-spin' : ''}`} />
                    Simulate Next Checkpoint
                  </button>
                </div>

                <div className="relative pl-6 border-l-2 border-orange-200 space-y-6 ml-3 py-1">
                  {order.trackingHistory.map((item, index) => {
                    const isLatest = index === order.trackingHistory.length - 1;
                    return (
                      <div key={index} className="relative">
                        {/* Timeline Node Icon */}
                        <div
                          className={`absolute -left-[31px] top-0.5 w-4 h-4 rounded-full border-2 border-white flex items-center justify-center ${
                            isLatest ? 'bg-orange-500 ring-4 ring-orange-100' : 'bg-emerald-600'
                          }`}
                        ></div>

                        <div>
                          <div className="flex items-center justify-between">
                            <span className={`text-xs font-bold ${isLatest ? 'text-orange-600' : 'text-slate-800'}`}>
                              {item.status.replace(/_/g, ' ')}
                            </span>
                            <span className="text-[10px] text-slate-400 font-mono">
                              {new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>

                          <p className="text-xs text-slate-600 mt-0.5">
                            {item.description}
                          </p>

                          <p className="text-[10px] text-slate-400 flex items-center mt-1">
                            <MapPin className="w-3 h-3 mr-1 text-slate-400" />
                            {item.location}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Destination & Recipient */}
              <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200 text-xs">
                <p className="text-slate-500">
                  Delivering to: <strong className="text-slate-800">{order.customer.fullName}</strong> ({order.customer.phone})
                </p>
                <p className="text-slate-500 mt-0.5">
                  {order.customer.street}, {order.customer.city}, {order.customer.district || order.customer.state}, Sri Lanka
                </p>
              </div>
            </div>
          )}

          {!order && !loading && !error && (
            <div className="text-center py-10 text-slate-400 text-xs">
              <Package className="w-10 h-10 mx-auto text-slate-300 mb-2" />
              <p>Enter any LankaBuy order number or tracking code above to inspect the live status.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
