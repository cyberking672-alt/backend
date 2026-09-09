import React from 'react';
import { 
  CheckCircle2, 
  X, 
  Truck, 
  Package, 
  Copy, 
  ShieldCheck, 
  ShoppingBag 
} from 'lucide-react';
import { Order } from '../types';

interface OrderSuccessModalProps {
  order: Order | null;
  onClose: () => void;
  onOpenTrack: (orderNumber: string) => void;
}

export const OrderSuccessModal: React.FC<OrderSuccessModalProps> = ({
  order,
  onClose,
  onOpenTrack,
}) => {
  const [copied, setCopied] = React.useState(false);

  if (!order) return null;

  const handleCopyTracking = () => {
    const trackNum = order.trackingNumber || order.supplierResponse?.trackingNumber;
    if (trackNum) {
      navigator.clipboard.writeText(trackNum);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const trackingNumber = order.trackingNumber || order.supplierResponse?.trackingNumber || 'LK-EXP-PENDING';
  const carrierName = order.carrier || order.supplierResponse?.carrier || 'LankaBuy Express Courier';

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in">
      <div className="bg-white rounded-3xl max-w-2xl w-full shadow-2xl overflow-hidden border border-slate-200 my-6">
        {/* Success Header (Vibrant Orange) */}
        <div className="bg-orange-500 text-white p-6 text-center relative shadow-sm">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-orange-200 hover:text-white p-1 rounded-full hover:bg-white/10 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="w-14 h-14 bg-white text-orange-500 rounded-full flex items-center justify-center mx-auto mb-3 shadow-md">
            <CheckCircle2 className="w-8 h-8 text-emerald-600" />
          </div>

          <h2 className="text-xl sm:text-2xl font-black">
            Thank You! Your Order is Placed
          </h2>
          <p className="text-xs sm:text-sm text-orange-100 mt-1 max-w-md mx-auto">
            Your LankaBuy order has been confirmed. You will receive SMS &amp; courier tracking updates shortly.
          </p>
        </div>

        {/* Order Details Body */}
        <div className="p-6 space-y-5">
          {/* Reference Numbers Card */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-slate-50 p-4 rounded-2xl border border-slate-200 text-xs">
            <div>
              <p className="text-slate-500 font-semibold">LankaBuy Order Number:</p>
              <p className="text-sm font-black text-slate-800 font-mono mt-0.5">
                {order.orderNumber}
              </p>
              <p className="text-[10px] text-slate-400 mt-0.5">Keep this for tracking &amp; support</p>
            </div>

            <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-orange-600 flex items-center">
                  <Package className="w-3.5 h-3.5 mr-1" />
                  Islandwide Tracking:
                </span>
                <button
                  onClick={handleCopyTracking}
                  className="text-[10px] text-slate-500 hover:text-orange-600 font-semibold flex items-center cursor-pointer"
                >
                  <Copy className="w-3 h-3 mr-1" />
                  {copied ? 'Copied!' : 'Copy'}
                </button>
              </div>
              <p className="text-xs font-black text-slate-900 font-mono mt-1">
                {trackingNumber}
              </p>
              <p className="text-[10px] text-emerald-600 font-semibold mt-0.5">
                Carrier: {carrierName}
              </p>
            </div>
          </div>

          {/* Delivery & Protection Confirmation */}
          <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-2xl text-xs space-y-1">
            <div className="flex items-center text-emerald-900 font-bold">
              <ShieldCheck className="w-4 h-4 text-emerald-600 mr-1.5" />
              <span>LankaBuy Safe Delivery Verified</span>
            </div>
            <p className="text-[11px] text-emerald-800">
              Estimated Delivery: <strong>1 - 3 business days</strong> to {order.customer.city}, {order.customer.district || 'Sri Lanka'}.
            </p>
          </div>

          {/* Purchased Items List */}
          <div>
            <h4 className="text-xs font-black uppercase tracking-wider text-slate-500 mb-2">
              Purchased Items ({order.items.length})
            </h4>
            <div className="space-y-2 border border-slate-200 rounded-2xl p-3.5 bg-slate-50/60 text-xs">
              {order.items.map((item, idx) => (
                <div key={idx} className="flex justify-between items-center py-1 border-b border-slate-200/60 last:border-0">
                  <div className="flex items-center space-x-2 truncate">
                    <span className="font-bold text-slate-800">{item.quantity}x</span>
                    <span className="truncate text-slate-700">{item.title}</span>
                  </div>
                  <span className="font-bold text-slate-900 shrink-0">
                    Rs. {item.totalPrice.toLocaleString()}
                  </span>
                </div>
              ))}

              <div className="pt-2.5 flex justify-between font-bold text-slate-900 border-t border-slate-200">
                <span>Total Payable:</span>
                <span className="text-orange-600 text-sm font-black">Rs. {order.totalAmount.toLocaleString()}</span>
              </div>
            </div>
          </div>

          {/* Delivery Destination */}
          <div className="text-xs text-slate-600 bg-slate-50 p-3.5 rounded-2xl border border-slate-200">
            <p className="font-bold text-slate-800">
              Recipient: {order.customer.fullName} ({order.customer.phone})
            </p>
            <p className="text-slate-500 mt-0.5">
              {order.customer.street}, {order.customer.city}, {order.customer.district || order.customer.state}, Sri Lanka
            </p>
            <p className="text-[11px] text-slate-500 mt-1">
              Payment Method: <strong className="text-slate-800">{order.paymentMethod.replace('_', ' ')}</strong> | Status: <strong className="text-emerald-600">{order.paymentStatus}</strong>
            </p>
          </div>

          {/* Action Buttons */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
            <button
              onClick={() => {
                onOpenTrack(order.orderNumber);
                onClose();
              }}
              className="bg-orange-500 hover:bg-orange-600 text-white text-xs font-bold py-3 px-4 rounded-xl transition flex items-center justify-center space-x-2 cursor-pointer shadow-md shadow-orange-500/20 active:scale-98"
            >
              <Truck className="w-4 h-4" />
              <span>Track Islandwide Delivery</span>
            </button>

            <button
              onClick={onClose}
              className="bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold py-3 px-4 rounded-xl transition flex items-center justify-center space-x-2 cursor-pointer active:scale-98"
            >
              <ShoppingBag className="w-4 h-4" />
              <span>Continue Shopping</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
