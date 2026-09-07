import React, { useState } from 'react';
import { 
  X, 
  Trash2, 
  ShoppingBag, 
  ArrowRight, 
  Ticket, 
  Truck, 
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { CartItem, DEFAULT_PRODUCT_IMAGE } from '../types';

interface CartDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  cartItems: CartItem[];
  onUpdateQuantity: (productId: string, quantity: number) => void;
  onRemoveItem: (productId: string) => void;
  onProceedToCheckout: (appliedDiscount: number, voucherCode: string) => void;
}

export const CartDrawer: React.FC<CartDrawerProps> = ({
  isOpen,
  onClose,
  cartItems,
  onUpdateQuantity,
  onRemoveItem,
  onProceedToCheckout,
}) => {
  if (!isOpen) return null;

  const [voucherInput, setVoucherInput] = useState('');
  const [appliedVoucher, setAppliedVoucher] = useState<{ code: string; discount: number } | null>(null);
  const [voucherError, setVoucherError] = useState('');

  const subtotal = cartItems.reduce(
    (acc, item) => acc + item.product.price * item.quantity,
    0
  );

  const freeShippingThreshold = 5000;
  const isFreeShipping = subtotal >= freeShippingThreshold;
  const shippingFee = isFreeShipping ? 0 : 350;
  const progressToFreeShipping = Math.min(100, Math.round((subtotal / freeShippingThreshold) * 100));

  const handleApplyVoucher = () => {
    setVoucherError('');
    const code = voucherInput.trim().toUpperCase();
    if (!code) return;

    if (code === 'LANKABUY10' || code === 'LANKA10') {
      const discountAmount = Number((subtotal * 0.10).toFixed(0));
      setAppliedVoucher({ code: 'LANKABUY10', discount: discountAmount });
    } else if (code === 'WELCOME500' || code === 'LK500') {
      if (subtotal < 3000) {
        setVoucherError('Voucher WELCOME500 requires minimum order of Rs. 3,000');
        return;
      }
      setAppliedVoucher({ code: 'WELCOME500', discount: 500 });
    } else {
      setVoucherError('Invalid voucher code. Try "LANKABUY10"');
    }
  };

  const discountAmount = appliedVoucher ? appliedVoucher.discount : 0;
  const grandTotal = Math.max(0, subtotal + shippingFee - discountAmount);

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-slate-900/60 backdrop-blur-xs flex justify-end animate-fade-in">
      <div className="w-full max-w-md bg-white h-full shadow-2xl flex flex-col justify-between overflow-hidden border-l border-slate-200">
        {/* Header */}
        <div className="px-5 py-4 bg-white border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 rounded-lg bg-orange-50 text-orange-500 flex items-center justify-center">
              <ShoppingBag className="w-4 h-4" />
            </div>
            <h3 className="font-bold text-slate-800 text-base">
              My Shopping Cart ({cartItems.reduce((a, b) => a + b.quantity, 0)})
            </h3>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 p-1.5 rounded-full hover:bg-slate-100 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Free Shipping Progress Indicator */}
        <div className="bg-orange-50/70 px-5 py-2.5 border-b border-orange-200/60 text-xs">
          <div className="flex justify-between items-center text-slate-700 font-semibold mb-1">
            <span className="flex items-center">
              <Truck className="w-3.5 h-3.5 text-orange-500 mr-1.5" />
              {isFreeShipping ? (
                <span className="text-emerald-700 font-bold">You unlocked Free Islandwide Delivery!</span>
              ) : (
                <span>
                  Add <strong>Rs. {(freeShippingThreshold - subtotal).toLocaleString()}</strong> more for Free Delivery
                </span>
              )}
            </span>
            <span className="font-bold text-orange-600">{progressToFreeShipping}%</span>
          </div>
          <div className="w-full h-1.5 bg-orange-200/80 rounded-full overflow-hidden">
            <div
              className="h-full bg-orange-500 rounded-full transition-all duration-300"
              style={{ width: `${progressToFreeShipping}%` }}
            ></div>
          </div>
        </div>

        {/* Cart Item List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {cartItems.length === 0 ? (
            <div className="text-center py-16 px-4">
              <div className="w-16 h-16 rounded-2xl bg-orange-50 text-orange-500 flex items-center justify-center mx-auto mb-3">
                <ShoppingBag className="w-8 h-8" />
              </div>
              <h4 className="font-bold text-slate-800 text-sm">Your LankaBuy Cart is Empty</h4>
              <p className="text-xs text-slate-500 mt-1 max-w-xs mx-auto">
                Explore thousands of products with verified islandwide delivery in Sri Lanka.
              </p>
              <button
                onClick={onClose}
                className="mt-4 bg-orange-500 text-white text-xs font-bold px-5 py-2.5 rounded-xl hover:bg-orange-600 transition cursor-pointer shadow-md shadow-orange-500/20"
              >
                Browse Products
              </button>
            </div>
          ) : (
            cartItems.map((item) => (
              <div
                key={item.product.id}
                className="flex items-center space-x-3 p-3 bg-slate-50 rounded-2xl border border-slate-200 relative group"
              >
                <img
                  src={item.product.imageUrl || DEFAULT_PRODUCT_IMAGE}
                  alt={item.product.title}
                  referrerPolicy="no-referrer"
                  className="w-16 h-16 object-cover rounded-xl bg-white border border-slate-200 shrink-0"
                />

                <div className="flex-1 min-w-0">
                  <h4 className="text-xs font-bold text-slate-900 truncate" title={item.product.title}>
                    {item.product.title}
                  </h4>
                  <p className="text-[10px] text-slate-400 font-mono mt-0.5">
                    SKU: {item.product.sku}
                  </p>

                  <div className="flex items-center justify-between mt-2">
                    <div className="text-xs font-black text-slate-900">
                      Rs. {((item.product?.price ?? 0) * item.quantity).toLocaleString()}
                      {item.quantity > 1 && (
                        <span className="text-[10px] text-slate-400 font-normal ml-1">
                          (Rs. {(item.product?.price ?? 0).toLocaleString()} ea)
                        </span>
                      )}
                    </div>

                    {/* Quantity Selector */}
                    <div className="flex items-center border border-slate-300 rounded-lg bg-white overflow-hidden">
                      <button
                        onClick={() => onUpdateQuantity(item.product.id, item.quantity - 1)}
                        className="px-2 py-0.5 text-xs text-slate-600 hover:bg-slate-100 transition cursor-pointer font-bold"
                      >
                        -
                      </button>
                      <span className="px-2.5 py-0.5 text-xs font-bold text-slate-800 font-mono">
                        {item.quantity}
                      </span>
                      <button
                        onClick={() => onUpdateQuantity(item.product.id, item.quantity + 1)}
                        className="px-2 py-0.5 text-xs text-slate-600 hover:bg-slate-100 transition cursor-pointer font-bold"
                      >
                        +
                      </button>
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => onRemoveItem(item.product.id)}
                  className="text-slate-400 hover:text-red-500 p-1.5 transition cursor-pointer"
                  title="Remove item"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))
          )}
        </div>

        {/* Footer: Voucher, Summary & Checkout */}
        {cartItems.length > 0 && (
          <div className="p-4 bg-slate-50 border-t border-slate-200 space-y-3">
            {/* Voucher code box */}
            <div>
              <div className="flex space-x-2">
                <div className="relative flex-1">
                  <Ticket className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    value={voucherInput}
                    onChange={(e) => setVoucherInput(e.target.value)}
                    placeholder="Enter Voucher (e.g. LANKABUY10)"
                    className="w-full bg-white border border-slate-300 rounded-xl pl-8 pr-3 py-1.5 text-xs font-mono uppercase focus:ring-1 focus:ring-orange-500 focus:border-orange-500 focus:outline-hidden"
                  />
                </div>
                <button
                  onClick={handleApplyVoucher}
                  className="bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold px-3.5 py-1.5 rounded-xl transition cursor-pointer"
                >
                  Apply
                </button>
              </div>
              {appliedVoucher && (
                <div className="flex items-center justify-between text-[11px] text-emerald-700 bg-emerald-50 p-2 rounded-lg mt-1.5 border border-emerald-200">
                  <span className="flex items-center">
                    <CheckCircle2 className="w-3 h-3 mr-1" />
                    Voucher <strong>{appliedVoucher.code}</strong> Applied (-Rs. {appliedVoucher.discount.toLocaleString()})
                  </span>
                  <button
                    onClick={() => setAppliedVoucher(null)}
                    className="text-slate-400 hover:text-slate-700 underline text-[10px] cursor-pointer"
                  >
                    Remove
                  </button>
                </div>
              )}
              {voucherError && (
                <p className="text-[10px] text-red-600 flex items-center mt-1">
                  <AlertCircle className="w-3 h-3 mr-1" />
                  {voucherError}
                </p>
              )}
            </div>

            {/* Financial Summary */}
            <div className="space-y-1.5 text-xs pt-2 border-t border-slate-200 text-slate-600">
              <div className="flex justify-between">
                <span>Items Subtotal:</span>
                <span className="font-semibold text-slate-900">Rs. {subtotal.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span>Islandwide Delivery:</span>
                <span className={shippingFee === 0 ? 'text-emerald-600 font-bold' : 'font-semibold text-slate-900'}>
                  {shippingFee === 0 ? 'FREE' : `Rs. ${shippingFee.toLocaleString()}`}
                </span>
              </div>
              {discountAmount > 0 && (
                <div className="flex justify-between text-emerald-600 font-semibold">
                  <span>Voucher Discount:</span>
                  <span>-Rs. {discountAmount.toLocaleString()}</span>
                </div>
              )}

              <div className="flex justify-between text-sm font-black text-slate-900 pt-2 border-t border-slate-300">
                <span>Total Amount:</span>
                <span className="text-orange-600 text-base font-black">Rs. {grandTotal.toLocaleString()}</span>
              </div>
            </div>

            {/* Checkout Button (Vibrant Orange) */}
            <button
              onClick={() => {
                onProceedToCheckout(discountAmount, appliedVoucher?.code || '');
                onClose();
              }}
              className="w-full bg-orange-500 hover:bg-orange-600 text-white font-black py-3 px-4 rounded-xl text-xs sm:text-sm transition flex items-center justify-center space-x-2 shadow-md shadow-orange-500/25 cursor-pointer active:scale-98"
            >
              <span>Proceed to Checkout</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
