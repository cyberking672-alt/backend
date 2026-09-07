import React from 'react';
import { Star, Truck, ShoppingBag, Zap, ShieldCheck } from 'lucide-react';
import { Product, DEFAULT_PRODUCT_IMAGE } from '../types';

interface ProductCardProps {
  product: Product;
  onAddToCart: (product: Product) => void;
  onBuyNow: (product: Product) => void;
  onOpenDetails: (product: Product) => void;
}

export const ProductCard: React.FC<ProductCardProps> = ({
  product,
  onAddToCart,
  onBuyNow,
  onOpenDetails,
}) => {
  const isCj = product.source === 'cj_dropshipping' || product.isLocalStore === false || product.id?.startsWith('global-cj');
  const isLocal = (product.isLocalStore || product.source === 'admin_local' || product.supplierOrigin?.includes('Sri Lanka')) && !isCj;

  const getBadgeStyle = (badge?: string) => {
    switch (badge) {
      case 'LANKABUY DEAL':
        return 'bg-orange-500 text-white';
      case 'BESTSELLER':
      case 'TOP SELLER':
        return 'bg-slate-900 text-white';
      case 'MEGA DEAL':
      case 'VIRAL HIT':
        return 'bg-red-600 text-white';
      case 'HOT DEAL':
        return 'bg-amber-500 text-white';
      default:
        return 'bg-orange-600 text-white';
    }
  };

  return (
    <div 
      onClick={() => onOpenDetails(product)}
      className="bg-white rounded-2xl overflow-hidden border border-slate-200/90 hover:border-orange-300 hover:shadow-xl hover:shadow-orange-500/10 transition-all duration-300 flex flex-col group relative w-full min-w-0 cursor-pointer"
    >
      {/* Product Image & Badges */}
      <div 
        className="relative aspect-square w-full overflow-hidden bg-slate-50"
      >
        <img
          src={product.imageUrl || DEFAULT_PRODUCT_IMAGE}
          alt={product.title}
          referrerPolicy="no-referrer"
          className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-500"
          loading="lazy"
          decoding="async"
        />

        {/* Top Left Badges */}
        <div className="absolute top-1.5 sm:top-2 left-1.5 sm:left-2 flex flex-col gap-1 z-10 max-w-[75%]">
          {/* Sri Lanka Flag & Origin Badge for Local Store ONLY */}
          {isLocal && (
            <span className="bg-amber-600/95 text-white text-[8px] sm:text-[10px] font-black px-1.5 sm:px-2 py-0.5 rounded-md flex items-center shadow-xs truncate tracking-wider">
              <span className="mr-1 text-[11px] sm:text-xs">🇱🇰</span>
              <span className="truncate uppercase font-extrabold">Sri Lanka</span>
            </span>
          )}

          {product.badge && !product.badge.includes('🇱🇰') && (
            <span className={`text-[8px] sm:text-[10px] font-black uppercase px-1.5 sm:px-2 py-0.5 rounded-md shadow-xs tracking-wider truncate ${getBadgeStyle(product.badge)}`}>
              {product.badge}
            </span>
          )}

          {product.freeShipping && (
            <span className="bg-emerald-600 text-white text-[7px] sm:text-[9px] font-bold px-1.5 sm:px-2 py-0.5 rounded-md flex items-center shadow-xs truncate">
              <Truck className="w-2 sm:w-2.5 h-2 sm:h-2.5 mr-0.5 sm:mr-1 shrink-0" />
              <span className="truncate">Free Delivery</span>
            </span>
          )}
        </div>

        {/* Top Right Discount Tag (Vibrant Orange Tag) */}
        {product.discountPercentage > 0 && (
          <div className="absolute top-1.5 sm:top-2 right-1.5 sm:right-2 bg-orange-500 text-white text-[9px] sm:text-xs font-black px-1.5 sm:px-2 py-0.5 rounded-md shadow-sm">
            -{product.discountPercentage}%
          </div>
        )}
      </div>

      {/* Product Content Details */}
      <div className="p-2.5 sm:p-4 flex-1 flex flex-col justify-between min-w-0">
        <div className="min-w-0">
          {/* Category / Subcategory */}
          <div className="flex items-center text-[9px] sm:text-[11px] text-slate-400 mb-1 font-medium capitalize truncate">
            <span className="truncate">{product.subcategory || product.category.replace('-', ' ')}</span>
            <span className="mx-1 shrink-0">•</span>
            <span className="text-emerald-600 font-semibold flex items-center shrink-0">
              <ShieldCheck className="w-2.5 h-2.5 sm:w-3 sm:h-3 mr-0.5" />
              Verified
            </span>
          </div>

          {/* Title */}
          <h4
            className="text-xs sm:text-sm font-bold text-slate-900 line-clamp-2 group-hover:text-orange-600 transition-colors min-h-[32px] sm:min-h-[40px] leading-snug break-words"
            title={product.title}
          >
            {product.title}
          </h4>

          {/* Ratings & Sold counter */}
          <div className="flex items-center space-x-1 sm:space-x-1.5 my-1.5 sm:my-2 text-[10px] sm:text-xs min-w-0">
            <div className="flex items-center text-amber-500 shrink-0">
              <Star className="w-2.5 sm:w-3.5 h-2.5 sm:h-3.5 fill-current" />
              <span className="font-bold ml-0.5 sm:ml-1 text-slate-800 text-[10px] sm:text-[11px]">{product.rating ?? 4.8}</span>
            </div>
            <span className="text-slate-300 shrink-0">|</span>
            <span className="text-slate-500 text-[9px] sm:text-[11px] font-medium truncate">{(product.soldCount ?? 0).toLocaleString()} sold</span>
          </div>

          {/* Pricing in LKR */}
          <div className="mt-1 min-w-0">
            <div className="flex items-baseline space-x-1 sm:space-x-2 flex-wrap">
              <span className="text-xs sm:text-base md:text-lg font-black text-slate-950 truncate">
                Rs. {(product.price || product.priceLkr || 0).toLocaleString()}
              </span>
              <span className="text-[9px] sm:text-xs text-slate-400 line-through truncate">
                Rs. {(product.originalPrice || product.originalPriceLkr || product.price || product.priceLkr || 0).toLocaleString()}
              </span>
            </div>

            {/* Payment Method Tags (COD / Creem.io Card) */}
            <div className="flex items-center gap-1 mt-1.5 flex-wrap">
              {!isCj && product.allowCOD !== false && product.paymentOptions !== 'card_only' && (
                <span className="bg-emerald-50 text-emerald-700 border border-emerald-200/60 text-[8px] sm:text-[9px] font-bold px-1.5 py-0.5 rounded flex items-center">
                  💵 COD Available
                </span>
              )}
              {isCj && (
                <span className="bg-amber-50 text-amber-800 border border-amber-200/60 text-[8px] sm:text-[9px] font-bold px-1.5 py-0.5 rounded flex items-center">
                  💳 Card / Online Only
                </span>
              )}
              {product.allowCard !== false && product.paymentOptions !== 'cod_only' && !isCj && (
                <span className="bg-blue-50 text-blue-700 border border-blue-200/60 text-[8px] sm:text-[9px] font-bold px-1.5 py-0.5 rounded flex items-center">
                  💳 Creem.io Card
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Action Buttons (Orange & White Identity) */}
        <div className="mt-2.5 sm:mt-3 pt-2 sm:pt-2.5 border-t border-slate-100 grid grid-cols-2 gap-1.5 sm:gap-2">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onAddToCart(product);
            }}
            className="w-full bg-orange-50 hover:bg-orange-100 text-orange-600 border border-orange-200/90 py-1.5 sm:py-2 px-1 rounded-lg sm:rounded-xl text-[10px] sm:text-xs font-bold transition flex items-center justify-center cursor-pointer active:scale-95 min-w-0"
          >
            <ShoppingBag className="w-3 h-3 sm:w-3.5 sm:h-3.5 mr-0.5 sm:mr-1 shrink-0" />
            <span className="truncate">Add</span>
          </button>

          <button
            onClick={(e) => {
              e.stopPropagation();
              onBuyNow(product);
            }}
            className="w-full bg-orange-500 hover:bg-orange-600 text-white py-1.5 sm:py-2 px-1 rounded-lg sm:rounded-xl text-[10px] sm:text-xs font-bold transition flex items-center justify-center cursor-pointer shadow-xs shadow-orange-500/20 active:scale-95 min-w-0"
          >
            <Zap className="w-3 h-3 sm:w-3.5 sm:h-3.5 mr-0.5 sm:mr-1 fill-current shrink-0" />
            <span className="truncate">Buy</span>
          </button>
        </div>
      </div>
    </div>
  );
};
