import React, { useState, useEffect } from 'react';
import { 
  Flame, 
  Clock, 
  Truck, 
  ShieldCheck, 
  RotateCcw, 
  ArrowRight,
  Ticket,
  CheckCircle2,
  Sparkles
} from 'lucide-react';

interface BannerSliderProps {
  onApplyVoucherPrompt: (code: string) => void;
  onShopNowClick?: () => void;
  onViewDealsClick?: () => void;
}

export const BannerSlider: React.FC<BannerSliderProps> = ({ 
  onApplyVoucherPrompt,
  onShopNowClick,
  onViewDealsClick
}) => {
  // Live Countdown Timer for LankaBuy Mega Flash Deals
  const [timeLeft, setTimeLeft] = useState({
    hours: 6,
    minutes: 38,
    seconds: 45
  });

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev.seconds > 0) {
          return { ...prev, seconds: prev.seconds - 1 };
        } else if (prev.minutes > 0) {
          return { ...prev, minutes: prev.minutes - 1, seconds: 59 };
        } else if (prev.hours > 0) {
          return { hours: prev.hours - 1, minutes: 59, seconds: 59 };
        }
        return { hours: 12, minutes: 0, seconds: 0 };
      });
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const formatDigit = (n: number) => n.toString().padStart(2, '0');

  return (
    <div className="max-w-7xl mx-auto px-2.5 sm:px-4 pt-2.5 sm:pt-4 pb-2 w-full">
      {/* Hero Banner Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 sm:gap-4 w-full">
        {/* Main LankaBuy Hero Section (Orange & White Identity) */}
        <div className="lg:col-span-2 rounded-2xl sm:rounded-3xl overflow-hidden bg-gradient-to-br from-orange-500 via-orange-600 to-amber-600 text-white p-4 sm:p-8 relative shadow-xl shadow-orange-500/10 flex flex-col justify-between min-h-[220px] sm:min-h-[260px] border border-orange-400/40 w-full">
          {/* Subtle background decorative shapes */}
          <div className="absolute right-0 top-0 bottom-0 w-1/2 opacity-10 pointer-events-none bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-white via-transparent to-transparent"></div>
          
          <div>
            {/* Top Badge */}
            <div className="flex items-center space-x-2 mb-2 sm:mb-3 flex-wrap gap-y-1">
              <span className="bg-white text-orange-600 text-[10px] sm:text-[11px] font-black uppercase tracking-wider px-2.5 sm:px-3 py-0.5 sm:py-1 rounded-full shadow-xs flex items-center shrink-0">
                <Sparkles className="w-3 h-3 sm:w-3.5 sm:h-3.5 mr-1 text-orange-500" />
                Direct Marketplace
              </span>
              <span className="text-[11px] sm:text-xs font-semibold text-orange-100 hidden xs:inline">
                Verified Direct Pricing (Rs.)
              </span>
            </div>

            {/* Headline */}
            <h1 className="text-xl sm:text-3xl lg:text-4xl font-black tracking-tight leading-tight max-w-xl text-white">
              Shop Smarter. Buy Better.
            </h1>
            
            {/* Subheadline */}
            <p className="text-xs sm:text-sm text-orange-100 mt-1.5 sm:mt-2 max-w-lg leading-relaxed font-medium">
              Quality products sourced through trusted suppliers and delivered across Sri Lanka with Cash on Delivery &amp; Fast Dispatch.
            </p>
          </div>

          {/* Action CTAs */}
          <div className="mt-4 sm:mt-6 pt-3 sm:pt-4 border-t border-orange-400/40 flex flex-wrap items-center justify-between gap-3 w-full">
            <div className="flex flex-wrap items-center gap-2 sm:gap-3">
              {/* Primary Button (White on Orange Hero for optimal contrast) */}
              <button
                onClick={onShopNowClick}
                className="bg-white hover:bg-orange-50 text-orange-600 font-black px-4 sm:px-6 py-2 sm:py-2.5 rounded-xl text-xs sm:text-sm transition-all shadow-md hover:shadow-lg flex items-center cursor-pointer active:scale-95"
              >
                <span>Shop Now</span>
                <ArrowRight className="w-3.5 h-3.5 sm:w-4 sm:h-4 ml-1.5" />
              </button>

              {/* Secondary CTA */}
              <button
                onClick={onViewDealsClick}
                className="bg-orange-700/60 hover:bg-orange-700 text-white font-bold border border-orange-300/50 px-3.5 sm:px-5 py-2 sm:py-2.5 rounded-xl text-xs sm:text-sm transition-all cursor-pointer flex items-center active:scale-95"
              >
                <Flame className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-1 text-amber-300" />
                <span>View Deals</span>
              </button>
            </div>

            {/* Value Highlights Pill */}
            <div className="flex items-center space-x-1.5 text-[11px] sm:text-xs text-orange-100 bg-orange-700/40 px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-xl border border-orange-400/30">
              <Truck className="w-3.5 h-3.5 text-amber-300 shrink-0" />
              <span className="font-semibold">Islandwide COD</span>
            </div>
          </div>
        </div>

        {/* Side LankaBuy Flash Deal & Promo Card */}
        <div className="bg-white rounded-2xl sm:rounded-3xl p-4 sm:p-6 shadow-md border border-slate-200 flex flex-col justify-between w-full">
          <div>
            {/* Header Badge */}
            <div className="flex items-center justify-between mb-2 sm:mb-3">
              <span className="text-[10px] sm:text-[11px] font-black uppercase tracking-wider text-orange-600 bg-orange-50 px-2.5 sm:px-3 py-0.5 sm:py-1 rounded-full border border-orange-200 flex items-center">
                <Flame className="w-3 h-3 sm:w-3.5 sm:h-3.5 mr-1 text-orange-500 fill-orange-500" />
                Mega Flash Deals
              </span>
              <span className="text-[10px] sm:text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md">
                Up to 45% OFF
              </span>
            </div>

            <h3 className="text-sm sm:text-base font-black text-slate-900 mb-1">
              Limited Time Deals:
            </h3>
            <p className="text-xs text-slate-500 mb-3 sm:mb-4">
              Direct supplier discounted batches available while stocks last today.
            </p>

            {/* Live Countdown Timer */}
            <div className="bg-slate-50 p-3 sm:p-3.5 rounded-2xl border border-slate-200 mb-3 sm:mb-4">
              <div className="flex items-center justify-between text-xs font-bold mb-2">
                <span className="text-slate-700 flex items-center text-[11px] sm:text-xs">
                  <Clock className="w-3 h-3 sm:w-3.5 sm:h-3.5 mr-1.5 text-orange-500" />
                  Flash Deals End In:
                </span>
                <span className="text-[9px] sm:text-[10px] text-orange-600 uppercase font-black">Ending Soon</span>
              </div>
              <div className="flex items-center justify-center space-x-1.5 sm:space-x-2 font-mono">
                <div className="text-center">
                  <span className="bg-slate-900 text-white px-2 sm:px-2.5 py-1 sm:py-1.5 rounded-lg text-xs sm:text-sm font-black shadow-inner block">
                    {formatDigit(timeLeft.hours)}
                  </span>
                  <span className="text-[8px] sm:text-[9px] text-slate-400 uppercase font-sans mt-0.5 block">Hours</span>
                </div>
                <span className="text-slate-400 font-bold text-xs sm:text-base -mt-3">:</span>
                <div className="text-center">
                  <span className="bg-slate-900 text-white px-2 sm:px-2.5 py-1 sm:py-1.5 rounded-lg text-xs sm:text-sm font-black shadow-inner block">
                    {formatDigit(timeLeft.minutes)}
                  </span>
                  <span className="text-[8px] sm:text-[9px] text-slate-400 uppercase font-sans mt-0.5 block">Mins</span>
                </div>
                <span className="text-slate-400 font-bold text-xs sm:text-base -mt-3">:</span>
                <div className="text-center">
                  <span className="bg-orange-500 text-white px-2 sm:px-2.5 py-1 sm:py-1.5 rounded-lg text-xs sm:text-sm font-black shadow-inner block">
                    {formatDigit(timeLeft.seconds)}
                  </span>
                  <span className="text-[8px] sm:text-[9px] text-slate-400 uppercase font-sans mt-0.5 block">Secs</span>
                </div>
              </div>
            </div>
          </div>

          {/* LankaBuy Voucher Promo Box */}
          <div className="bg-orange-50/70 p-3 sm:p-3.5 rounded-2xl border border-orange-200/80">
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0">
                <p className="text-[10px] sm:text-[11px] font-bold text-orange-950 truncate">First Order Voucher</p>
                <p className="text-[9px] sm:text-[10px] text-orange-700 truncate">Save Rs. 500 on checkout</p>
              </div>
              <button
                onClick={() => onApplyVoucherPrompt('LANKABUY10')}
                className="bg-orange-500 hover:bg-orange-600 text-white text-[11px] sm:text-xs font-mono font-bold px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-xl cursor-pointer transition shadow-xs flex items-center shrink-0"
              >
                <Ticket className="w-3 h-3 sm:w-3.5 sm:h-3.5 mr-1" />
                LANKABUY10
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 4 Trust Highlights Strip Below Hero */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3 mt-3 sm:mt-4 w-full">
        <div className="bg-white p-2.5 sm:p-3.5 rounded-xl sm:rounded-2xl border border-slate-200/80 shadow-xs flex items-center space-x-2 sm:space-x-3 min-w-0">
          <div className="w-7 h-7 sm:w-9 sm:h-9 rounded-lg sm:rounded-xl bg-orange-50 text-orange-500 flex items-center justify-center shrink-0">
            <Truck className="w-4 h-4 sm:w-5 sm:h-5" />
          </div>
          <div className="min-w-0">
            <p className="text-[11px] sm:text-xs font-bold text-slate-800 leading-tight truncate">Cash on Delivery</p>
            <p className="text-[9px] sm:text-[11px] text-slate-500 truncate">Pay when courier arrives</p>
          </div>
        </div>

        <div className="bg-white p-2.5 sm:p-3.5 rounded-xl sm:rounded-2xl border border-slate-200/80 shadow-xs flex items-center space-x-2 sm:space-x-3 min-w-0">
          <div className="w-7 h-7 sm:w-9 sm:h-9 rounded-lg sm:rounded-xl bg-orange-50 text-orange-500 flex items-center justify-center shrink-0">
            <Clock className="w-4 h-4 sm:w-5 sm:h-5" />
          </div>
          <div className="min-w-0">
            <p className="text-[11px] sm:text-xs font-bold text-slate-800 leading-tight truncate">1-3 Days Delivery</p>
            <p className="text-[9px] sm:text-[11px] text-slate-500 truncate">Express dispatch</p>
          </div>
        </div>

        <div className="bg-white p-2.5 sm:p-3.5 rounded-xl sm:rounded-2xl border border-slate-200/80 shadow-xs flex items-center space-x-2 sm:space-x-3 min-w-0">
          <div className="w-7 h-7 sm:w-9 sm:h-9 rounded-lg sm:rounded-xl bg-orange-50 text-orange-500 flex items-center justify-center shrink-0">
            <ShieldCheck className="w-4 h-4 sm:w-5 sm:h-5" />
          </div>
          <div className="min-w-0">
            <p className="text-[11px] sm:text-xs font-bold text-slate-800 leading-tight truncate">100% Genuine</p>
            <p className="text-[9px] sm:text-[11px] text-slate-500 truncate">Verified check</p>
          </div>
        </div>

        <div className="bg-white p-2.5 sm:p-3.5 rounded-xl sm:rounded-2xl border border-slate-200/80 shadow-xs flex items-center space-x-2 sm:space-x-3 min-w-0">
          <div className="w-7 h-7 sm:w-9 sm:h-9 rounded-lg sm:rounded-xl bg-orange-50 text-orange-500 flex items-center justify-center shrink-0">
            <RotateCcw className="w-4 h-4 sm:w-5 sm:h-5" />
          </div>
          <div className="min-w-0">
            <p className="text-[11px] sm:text-xs font-bold text-slate-800 leading-tight truncate">7-Day Return</p>
            <p className="text-[9px] sm:text-[11px] text-slate-500 truncate">Hassle-free</p>
          </div>
        </div>
      </div>
    </div>
  );
};
