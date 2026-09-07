import React from 'react';

export const SkeletonProductCard: React.FC = () => {
  return (
    <div className="bg-white rounded-2xl overflow-hidden border border-slate-200/90 flex flex-col w-full min-w-0 animate-pulse">
      {/* Product Image Skeleton */}
      <div className="relative aspect-square w-full bg-slate-200/80">
        <div className="absolute top-2 left-2 w-16 h-4 bg-slate-300/80 rounded-md" />
        <div className="absolute top-2 right-2 w-10 h-4 bg-slate-300/80 rounded-md" />
      </div>

      {/* Product Content Details Skeleton */}
      <div className="p-2.5 sm:p-4 flex-1 flex flex-col justify-between min-w-0">
        <div className="min-w-0 space-y-2">
          {/* Category Placeholder */}
          <div className="flex items-center space-x-2">
            <div className="h-2.5 bg-slate-200 rounded-md w-1/3" />
            <div className="h-2.5 bg-slate-200 rounded-md w-1/4" />
          </div>

          {/* Title Placeholder (2 lines) */}
          <div className="space-y-1.5 pt-1">
            <div className="h-3.5 bg-slate-200 rounded-md w-full" />
            <div className="h-3.5 bg-slate-200 rounded-md w-3/4" />
          </div>

          {/* Rating & Sold count Placeholder */}
          <div className="flex items-center space-x-2 pt-1">
            <div className="h-3 bg-slate-200 rounded-md w-12" />
            <div className="h-3 bg-slate-200 rounded-md w-16" />
          </div>

          {/* Pricing Placeholder */}
          <div className="flex items-baseline space-x-2 pt-1">
            <div className="h-5 bg-slate-300/90 rounded-md w-24" />
            <div className="h-3.5 bg-slate-200 rounded-md w-14" />
          </div>
        </div>

        {/* Action Buttons Placeholder */}
        <div className="mt-3 pt-2.5 border-t border-slate-100 grid grid-cols-2 gap-1.5 sm:gap-2">
          <div className="h-8 bg-slate-200 rounded-lg sm:rounded-xl w-full" />
          <div className="h-8 bg-orange-200/80 rounded-lg sm:rounded-xl w-full" />
        </div>
      </div>
    </div>
  );
};
