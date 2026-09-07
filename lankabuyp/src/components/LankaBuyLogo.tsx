import React from 'react';

interface LankaBuyLogoProps {
  variant?: 'light' | 'dark' | 'white';
  size?: 'sm' | 'md' | 'lg';
  showTagline?: boolean;
}

export const LankaBuyLogo: React.FC<LankaBuyLogoProps> = ({
  variant = 'dark',
  size = 'md',
  showTagline = false,
}) => {
  const sizeClasses = {
    sm: {
      icon: 'w-7 h-7',
      text: 'text-lg',
      tagline: 'text-[9px]',
    },
    md: {
      icon: 'w-9 h-9',
      text: 'text-xl sm:text-2xl',
      tagline: 'text-[10px]',
    },
    lg: {
      icon: 'w-11 h-11',
      text: 'text-2xl sm:text-3xl',
      tagline: 'text-xs',
    },
  }[size];

  const textColor = variant === 'white' 
    ? 'text-white' 
    : 'text-slate-900';

  const secondaryColor = 'text-orange-500';

  return (
    <div className="flex items-center space-x-2.5 select-none group cursor-pointer">
      {/* Modern Vibrant Orange Shopping Bag Emblem */}
      <div
        className={`${sizeClasses.icon} relative rounded-xl bg-gradient-to-tr from-orange-600 via-orange-500 to-amber-400 p-0.5 shadow-md shadow-orange-500/20 group-hover:shadow-orange-500/35 group-hover:scale-105 transition-all duration-300 flex items-center justify-center shrink-0`}
      >
        <div className="w-full h-full bg-slate-950/10 backdrop-blur-xs rounded-[10px] flex items-center justify-center relative overflow-hidden">
          <svg
            viewBox="0 0 32 32"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className="w-5 h-5 text-white"
          >
            {/* Bag Handle */}
            <path
              d="M11 11V9C11 6.23858 13.2386 4 16 4C18.7614 4 21 6.23858 21 9V11"
              stroke="white"
              strokeWidth="2.2"
              strokeLinecap="round"
            />
            {/* Bag Body */}
            <path
              d="M7 11H25L23.4 25.5C23.2 27.2 21.8 28.5 20.1 28.5H11.9C10.2 28.5 8.8 27.2 8.6 25.5L7 11Z"
              fill="white"
              fillOpacity="0.25"
              stroke="white"
              strokeWidth="2.2"
              strokeLinejoin="round"
            />
            {/* Dynamic Check / Swift Forward Arrow inside bag */}
            <path
              d="M13 19L15.5 21.5L20 16"
              stroke="white"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>
      </div>

      {/* Typography */}
      <div className="flex flex-col min-w-0">
        <div className={`font-extrabold tracking-tight leading-none ${sizeClasses.text} ${textColor} flex items-center`}>
          <span>Lanka</span>
          <span className={`${secondaryColor} ml-0.5 font-black`}>Buy</span>
          <span className="inline-block w-1.5 h-1.5 rounded-full bg-orange-500 ml-1 mb-0.5 shrink-0"></span>
        </div>
        {showTagline && (
          <span className={`${sizeClasses.tagline} font-semibold tracking-wide uppercase ${variant === 'white' ? 'text-orange-200' : 'text-slate-500'} mt-0.5 hidden xs:inline sm:inline truncate`}>
            Direct Marketplace • Sri Lanka
          </span>
        )}
      </div>
    </div>
  );
};
