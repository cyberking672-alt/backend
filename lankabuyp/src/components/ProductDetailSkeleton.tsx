import React from 'react';
import { ArrowLeft, Share2, Heart, ShoppingBag, ShieldCheck } from 'lucide-react';

export const ProductDetailSkeleton: React.FC<{ onBack?: () => void }> = ({ onBack }) => {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 pb-28 md:pb-24 animate-pulse w-full max-w-full overflow-x-hidden">
      {/* Top Floating Skeleton Bar */}
      <div className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-slate-200 shadow-xs px-3 sm:px-6 py-2.5 sm:py-3 w-full">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-2">
          <div className="flex items-center space-x-2 sm:space-x-3">
            <button
              onClick={onBack}
              className="flex items-center space-x-1.5 bg-slate-100 text-slate-500 font-bold px-3 py-1.5 sm:py-2 rounded-xl text-xs sm:text-sm shrink-0"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back</span>
            </button>
            <div className="h-4 w-32 sm:w-48 bg-slate-200 rounded-md"></div>
          </div>
          <div className="flex items-center space-x-1.5 sm:space-x-2">
            <div className="w-9 h-9 bg-slate-200 rounded-xl"></div>
            <div className="w-9 h-9 bg-slate-200 rounded-xl"></div>
            <div className="w-9 h-9 bg-slate-200 rounded-xl"></div>
          </div>
        </div>
      </div>

      {/* Main Content Skeleton */}
      <main className="max-w-7xl mx-auto px-3 sm:px-4 py-4 sm:py-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8">
          {/* Left Column: Image Skeleton */}
          <div className="lg:col-span-6 xl:col-span-6 flex flex-col">
            <div className="bg-white rounded-3xl p-3 sm:p-4 border border-slate-200 shadow-xs relative overflow-hidden">
              {/* Image Box */}
              <div className="aspect-square w-full rounded-2xl bg-gradient-to-br from-slate-200 via-slate-100 to-slate-200 relative overflow-hidden">
                <div className="absolute top-3 left-3 flex flex-col gap-1.5">
                  <div className="h-6 w-24 bg-slate-300 rounded-lg"></div>
                  <div className="h-5 w-32 bg-slate-300 rounded-lg"></div>
                </div>
                <div className="absolute top-3 right-3 h-7 w-16 bg-slate-300 rounded-xl"></div>
                <div className="absolute bottom-3 right-3 h-6 w-12 bg-slate-300 rounded-full"></div>
              </div>

              {/* Thumbnails */}
              <div className="flex items-center space-x-2.5 mt-3 sm:mt-4 overflow-x-auto pb-1">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="w-16 h-16 sm:w-20 sm:h-20 rounded-xl bg-slate-200 shrink-0"></div>
                ))}
              </div>

              {/* Trust badges */}
              <div className="mt-4 pt-4 border-t border-slate-100 grid grid-cols-3 gap-2">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="p-2 rounded-xl bg-slate-100 h-16 flex flex-col justify-center items-center gap-1">
                    <div className="h-4 w-4 bg-slate-200 rounded-full"></div>
                    <div className="h-3 w-16 bg-slate-200 rounded"></div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right Column: Info & Pricing Skeleton */}
          <div className="lg:col-span-6 xl:col-span-6 space-y-4">
            {/* Header Box */}
            <div className="bg-white rounded-3xl p-4 sm:p-6 border border-slate-200 shadow-xs space-y-3.5">
              <div className="flex justify-between items-center">
                <div className="h-4 w-28 bg-slate-200 rounded-md"></div>
                <div className="h-4 w-32 bg-slate-200 rounded-md"></div>
              </div>

              {/* Title Placeholder */}
              <div className="space-y-2">
                <div className="h-6 w-11/12 bg-slate-200 rounded-lg"></div>
                <div className="h-6 w-3/4 bg-slate-200 rounded-lg"></div>
              </div>

              {/* Ratings */}
              <div className="flex items-center space-x-3 pt-1 border-b border-slate-100 pb-3">
                <div className="h-5 w-14 bg-slate-200 rounded-md"></div>
                <div className="h-4 w-24 bg-slate-200 rounded-md"></div>
                <div className="h-4 w-20 bg-slate-200 rounded-md"></div>
              </div>

              {/* Pricing Display */}
              <div className="p-4 sm:p-5 bg-slate-100 rounded-2xl space-y-2">
                <div className="flex items-baseline space-x-3">
                  <div className="h-9 w-36 bg-slate-300 rounded-xl"></div>
                  <div className="h-5 w-24 bg-slate-200 rounded-md"></div>
                  <div className="h-6 w-28 bg-slate-300 rounded-lg"></div>
                </div>
                <div className="h-4 w-48 bg-slate-200 rounded"></div>
              </div>

              {/* Voucher Banner Placeholder */}
              <div className="p-3.5 bg-amber-50/70 border border-amber-200/60 rounded-2xl flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <div className="h-6 w-6 bg-amber-200 rounded-lg"></div>
                  <div className="h-4 w-44 bg-amber-200 rounded"></div>
                </div>
                <div className="h-7 w-20 bg-amber-300 rounded-xl"></div>
              </div>

              {/* Quantity */}
              <div className="pt-2 flex items-center space-x-4">
                <div className="h-4 w-16 bg-slate-200 rounded"></div>
                <div className="h-9 w-28 bg-slate-200 rounded-xl"></div>
              </div>
            </div>

            {/* Seller Trust Card Placeholder */}
            <div className="bg-white rounded-3xl p-4 sm:p-5 border border-slate-200 shadow-xs flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-12 h-12 rounded-2xl bg-slate-200"></div>
                <div className="space-y-1.5">
                  <div className="h-4 w-36 bg-slate-200 rounded"></div>
                  <div className="h-3 w-48 bg-slate-100 rounded"></div>
                </div>
              </div>
              <div className="h-8 w-24 bg-slate-200 rounded-xl"></div>
            </div>

            {/* Tabs Placeholder */}
            <div className="bg-white rounded-3xl border border-slate-200 p-5 space-y-4">
              <div className="flex space-x-4 border-b border-slate-100 pb-3">
                <div className="h-6 w-24 bg-slate-200 rounded-md"></div>
                <div className="h-6 w-24 bg-slate-200 rounded-md"></div>
                <div className="h-6 w-24 bg-slate-200 rounded-md"></div>
              </div>
              <div className="space-y-2">
                <div className="h-4 w-full bg-slate-100 rounded"></div>
                <div className="h-4 w-11/12 bg-slate-100 rounded"></div>
                <div className="h-4 w-4/5 bg-slate-100 rounded"></div>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Sticky Bottom Bar Skeleton */}
      <div className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200 py-2.5 px-3 sm:px-6">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-3">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-slate-200 rounded-xl"></div>
            <div className="w-10 h-10 bg-slate-200 rounded-xl"></div>
          </div>
          <div className="flex items-center space-x-2 flex-1 justify-end max-w-md">
            <div className="flex-1 h-11 bg-slate-300 rounded-xl"></div>
            <div className="flex-1 h-11 bg-orange-300 rounded-xl"></div>
          </div>
        </div>
      </div>
    </div>
  );
};
