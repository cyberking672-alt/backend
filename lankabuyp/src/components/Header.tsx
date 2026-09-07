import React, { useState, useEffect, useRef } from 'react';
import { 
  ShoppingBag, 
  Search, 
  Truck, 
  ChevronDown,
  User,
  Globe,
  Sparkles,
  Loader2,
  X,
  ArrowUpRight,
  MapPin,
  LogOut,
  ShieldCheck,
  LogIn
} from 'lucide-react';
import { CartItem, Product, UserProfile } from '../types';
import { LankaBuyLogo } from './LankaBuyLogo';

interface HeaderProps {
  cartItems: CartItem[];
  onOpenCart: () => void;
  onOpenTrack: () => void;
  onOpenOrders?: () => void;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  selectedCategory: string;
  onCategoryChange: (cat: string) => void;
  activeNavTab?: 'home' | 'products' | 'categories' | 'deals' | 'orders';
  onNavTabChange?: (tab: 'home' | 'products' | 'categories' | 'deals' | 'orders') => void;
  products?: Product[];
  onSelectProduct?: (product: Product) => void;
  currentUser?: UserProfile | null;
  onOpenAuthModal?: () => void;
  onOpenMyAddresses?: () => void;
  onSignOut?: () => void;
  isAdmin?: boolean;
  onOpenAdmin?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  cartItems,
  onOpenCart,
  onOpenTrack,
  onOpenOrders,
  searchQuery,
  onSearchChange,
  selectedCategory,
  onCategoryChange,
  activeNavTab = 'home',
  onNavTabChange,
  currentUser,
  onOpenAuthModal,
  onOpenMyAddresses,
  onSignOut,
  isAdmin,
  onOpenAdmin,
}) => {
  const totalCartCount = cartItems.reduce((acc, item) => acc + item.quantity, 0);
  const [isCategoryOpen, setIsCategoryOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);

  // Close user dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setIsUserMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Local Input Query (controlled input)
  const [inputValue, setInputValue] = useState(searchQuery);

  // Text-Only Keyword Suggestions State
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [isSearchingSuggestions, setIsSearchingSuggestions] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  
  const searchContainerRef = useRef<HTMLDivElement>(null);
  const mobileSearchContainerRef = useRef<HTMLDivElement>(null);

  // Sync internal inputValue if external searchQuery changes (e.g. from filter reset)
  useEffect(() => {
    setInputValue(searchQuery);
  }, [searchQuery]);

  // Fetch Text-Only keyword suggestions when typing
  useEffect(() => {
    const q = inputValue.trim();
    if (q.length === 0) {
      setSuggestions([]);
      setShowDropdown(false);
      setIsSearchingSuggestions(false);
      return;
    }

    setShowDropdown(true);
    setIsSearchingSuggestions(true);

    const abortController = new AbortController();

    const fetchTimer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/search/suggestions?q=${encodeURIComponent(q)}`, {
          signal: abortController.signal
        });
        const data = await res.json();

        if (abortController.signal.aborted) return;

        if (data.success && Array.isArray(data.suggestions)) {
          setSuggestions(data.suggestions);
        } else {
          setSuggestions([]);
        }
      } catch (err: any) {
        if (err.name !== 'AbortError') {
          console.error('Suggestions fetch error:', err);
        }
      } finally {
        if (!abortController.signal.aborted) {
          setIsSearchingSuggestions(false);
        }
      }
    }, 150);

    return () => {
      clearTimeout(fetchTimer);
      abortController.abort();
    };
  }, [inputValue]);

  // Click outside to close auto-suggest dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        searchContainerRef.current && 
        !searchContainerRef.current.contains(event.target as Node) &&
        mobileSearchContainerRef.current &&
        !mobileSearchContainerRef.current.contains(event.target as Node)
      ) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Execute full search on Enter, Click Search Button, or Suggestion Item
  const executeSearch = (targetQuery: string) => {
    const cleanQuery = targetQuery.trim();
    setShowDropdown(false);
    setInputValue(cleanQuery);
    onSearchChange(cleanQuery);

    if (activeNavTab !== 'home' && activeNavTab !== 'products' && activeNavTab !== 'deals') {
      if (onNavTabChange) onNavTabChange('products');
    }
  };

  const handleFormSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    executeSearch(inputValue);
  };

  const handleClearInput = () => {
    setInputValue('');
    setSuggestions([]);
    setShowDropdown(false);
    onSearchChange('');
  };

  return (
    <header className="sticky top-0 z-40 bg-white shadow-xs border-b border-slate-200 w-full max-w-full">
      {/* Main Header Bar: Logo, Search, Account & Cart */}
      <div className="max-w-7xl mx-auto px-2.5 sm:px-4 py-2.5 sm:py-3 flex items-center justify-between gap-2 sm:gap-4 w-full">
        {/* LankaBuy Brand Logo */}
        <div 
          onClick={() => { 
            onCategoryChange('all'); 
            handleClearInput();
            if (onNavTabChange) onNavTabChange('home'); 
          }} 
          className="cursor-pointer shrink-0 min-w-0"
        >
          <LankaBuyLogo size="md" showTagline={true} />
        </div>

        {/* Global Search Bar (Desktop) */}
        <div ref={searchContainerRef} className="flex-1 max-w-xl relative hidden md:block">
          <form onSubmit={handleFormSubmit} className="flex items-center border-2 border-orange-500 hover:border-orange-600 focus-within:border-orange-600 rounded-xl overflow-hidden bg-white shadow-xs focus-within:ring-2 focus-within:ring-orange-100 transition-all">
            {/* Category / Context Filter Dropdown */}
            {activeNavTab === 'deals' ? (
              <div className="px-3 py-2.5 text-xs font-bold text-orange-600 bg-orange-50 border-r border-slate-200 shrink-0 flex items-center space-x-1 whitespace-nowrap">
                <Globe className="w-3.5 h-3.5 text-orange-500" />
                <span>Global Hub</span>
              </div>
            ) : (
              <div className="relative border-r border-slate-200 bg-slate-50 shrink-0">
                <button
                  type="button"
                  onClick={() => setIsCategoryOpen(!isCategoryOpen)}
                  className="px-3 py-2.5 text-xs font-semibold text-slate-700 flex items-center hover:bg-slate-100 h-full cursor-pointer whitespace-nowrap"
                >
                  <span className="capitalize">{selectedCategory === 'all' ? 'All Categories' : selectedCategory.replace('-', ' ')}</span>
                  <ChevronDown className="w-3.5 h-3.5 ml-1 text-slate-400" />
                </button>

                {isCategoryOpen && (
                  <div className="absolute left-0 top-full mt-1.5 w-52 bg-white border border-slate-200 rounded-xl shadow-xl py-1.5 z-50 text-xs max-h-64 overflow-y-auto">
                    {[
                      'all',
                      'electronics',
                      'mobile-accessories',
                      'smart-gadgets',
                      'fashion',
                      'beauty',
                      'home-living',
                      'kitchen',
                      'fitness',
                      'watches',
                      'accessories'
                    ].map((cat) => (
                      <button
                        key={cat}
                        type="button"
                        onClick={() => {
                          onCategoryChange(cat);
                          setIsCategoryOpen(false);
                        }}
                        className={`w-full text-left px-3.5 py-2 hover:bg-orange-50 capitalize transition cursor-pointer ${
                          selectedCategory === cat ? 'font-bold text-orange-600 bg-orange-50/80' : 'text-slate-700'
                        }`}
                      >
                        {cat === 'all' ? 'All Categories' : cat.replace('-', ' ')}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Search Input */}
            <div className="flex-1 flex items-center relative min-w-0">
              <input
                type="text"
                value={inputValue}
                onFocus={() => {
                  if (inputValue.trim().length > 0) setShowDropdown(true);
                }}
                onChange={(e) => setInputValue(e.target.value)}
                placeholder={
                  activeNavTab === 'deals'
                    ? "Search overseas products (e.g. Drone, Earbuds, Watch)..."
                    : "Search 1,000+ products (e.g. Drone, Earbuds, Watch)..."
                }
                className="w-full px-3 py-2.5 text-xs sm:text-sm text-slate-800 placeholder-slate-400 bg-white focus:outline-hidden pr-8"
              />
              {inputValue.trim().length > 0 && (
                <button
                  type="button"
                  onClick={handleClearInput}
                  className="absolute right-2 text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Search Submit Button */}
            <button 
              type="submit"
              className="bg-orange-500 hover:bg-orange-600 text-white px-5 py-2.5 transition flex items-center justify-center shrink-0 cursor-pointer font-bold gap-1.5"
            >
              <Search className="w-4 h-4" />
              <span className="text-xs hidden lg:inline">Search</span>
            </button>
          </form>

          {/* Desktop Text-Only Keyword Suggestions Dropdown */}
          {showDropdown && inputValue.trim().length > 0 && (
            <div className="absolute left-0 right-0 top-full mt-1.5 bg-white border border-slate-200 rounded-2xl shadow-2xl z-50 overflow-hidden max-h-96 overflow-y-auto animate-in fade-in zoom-in-95 duration-100">
              <div className="p-2.5 border-b border-slate-100 bg-slate-50 flex items-center justify-between text-[11px] text-slate-500 px-3.5">
                <span className="font-bold flex items-center text-slate-700">
                  <Sparkles className="w-3.5 h-3.5 text-orange-500 mr-1.5" />
                  Suggestions for "{inputValue}"
                </span>
                {isSearchingSuggestions ? (
                  <div className="flex items-center text-orange-600 font-semibold space-x-1">
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Looking up...</span>
                  </div>
                ) : (
                  <span className="text-[10px] text-slate-400">Press Enter ↵ to search</span>
                )}
              </div>

              {suggestions.length === 0 && !isSearchingSuggestions ? (
                <div 
                  onClick={() => executeSearch(inputValue)}
                  className="p-3.5 hover:bg-orange-50 cursor-pointer flex items-center justify-between text-xs text-slate-700 group transition"
                >
                  <div className="flex items-center space-x-2.5">
                    <Search className="w-4 h-4 text-orange-500 shrink-0" />
                    <span>Search for "<strong className="text-orange-600 font-bold">{inputValue}</strong>" in catalog</span>
                  </div>
                  <ArrowUpRight className="w-4 h-4 text-slate-400 group-hover:text-orange-500 transition" />
                </div>
              ) : (
                <div className="divide-y divide-slate-50 py-1">
                  {/* Option 1: Direct exact query */}
                  <div
                    onClick={() => executeSearch(inputValue)}
                    className="px-4 py-2.5 flex items-center justify-between hover:bg-orange-50/80 cursor-pointer text-slate-800 transition group"
                  >
                    <div className="flex items-center space-x-3 min-w-0">
                      <Search className="w-4 h-4 text-orange-500 shrink-0" />
                      <span className="text-xs sm:text-sm font-bold text-orange-600 truncate">
                        {inputValue}
                      </span>
                    </div>
                    <span className="text-[10px] bg-orange-100 text-orange-700 px-2 py-0.5 rounded font-bold uppercase tracking-wider shrink-0">
                      Search
                    </span>
                  </div>

                  {/* Dynamic clean text suggestions */}
                  {suggestions
                    .filter((item) => item.toLowerCase() !== inputValue.toLowerCase())
                    .map((item, idx) => (
                      <div
                        key={idx}
                        onClick={() => executeSearch(item)}
                        className="px-4 py-2.5 flex items-center justify-between hover:bg-orange-50 cursor-pointer text-slate-700 hover:text-orange-600 transition group"
                      >
                        <div className="flex items-center space-x-3 min-w-0">
                          <Search className="w-4 h-4 text-slate-400 group-hover:text-orange-500 shrink-0" />
                          <span className="text-xs sm:text-sm font-medium truncate capitalize">
                            {item}
                          </span>
                        </div>
                        <ArrowUpRight className="w-3.5 h-3.5 text-slate-300 group-hover:text-orange-500 transition shrink-0" />
                      </div>
                    ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right Actions: User Account / Sign In, Orders & Cart */}
        <div className="flex items-center space-x-1.5 sm:space-x-3 shrink-0">
          <button
            onClick={() => (onOpenOrders ? onOpenOrders() : onOpenTrack())}
            className="hidden sm:flex items-center space-x-1.5 px-2.5 sm:px-3 py-2 rounded-xl text-slate-700 hover:text-orange-600 hover:bg-orange-50/60 transition text-xs font-bold cursor-pointer"
          >
            <Truck className="w-4 h-4 text-slate-500" />
            <span>Orders</span>
          </button>

          {/* User Sign In / Profile Dropdown */}
          {!currentUser ? (
            <button
              onClick={onOpenAuthModal}
              id="header-sign-in-button"
              className="flex items-center space-x-1.5 px-3 py-2 rounded-xl bg-slate-100 hover:bg-orange-50 hover:text-orange-600 border border-slate-200 text-slate-800 transition text-xs font-bold cursor-pointer"
            >
              <LogIn className="w-4 h-4 text-orange-500" />
              <span>Sign In</span>
            </button>
          ) : (
            <div ref={userMenuRef} className="relative">
              <button
                onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                id="user-profile-menu-button"
                className="flex items-center space-x-2 p-1.5 pr-2.5 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 transition cursor-pointer"
              >
                {currentUser.photoURL ? (
                  <img
                    src={currentUser.photoURL}
                    alt={currentUser.displayName || 'User'}
                    className="w-6 h-6 rounded-full object-cover border border-slate-300 shrink-0"
                  />
                ) : (
                  <div className="w-6 h-6 rounded-full bg-orange-500 text-white font-bold text-[11px] flex items-center justify-center shrink-0">
                    {(currentUser.displayName || currentUser.email || 'U').charAt(0).toUpperCase()}
                  </div>
                )}
                <span className="text-xs font-bold text-slate-800 max-w-[90px] truncate hidden md:inline">
                  {currentUser.displayName || currentUser.email.split('@')[0]}
                </span>
                <ChevronDown className="w-3.5 h-3.5 text-slate-500" />
              </button>

              {/* Account Dropdown Menu */}
              {isUserMenuOpen && (
                <div className="absolute right-0 mt-2 w-56 bg-white rounded-2xl shadow-xl border border-slate-200 py-2 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
                  <div className="px-4 py-2 border-b border-slate-100 bg-slate-50/50">
                    <p className="text-xs font-bold text-slate-900 truncate">
                      {currentUser.displayName || 'Customer'}
                    </p>
                    <p className="text-[10px] text-slate-500 truncate font-mono">{currentUser.email}</p>
                  </div>

                  <div className="py-1">
                    <button
                      onClick={() => {
                        setIsUserMenuOpen(false);
                        if (onOpenOrders) onOpenOrders();
                        else onOpenTrack();
                      }}
                      className="w-full text-left px-4 py-2 text-xs font-medium text-slate-700 hover:bg-orange-50 hover:text-orange-600 flex items-center space-x-2 transition cursor-pointer"
                    >
                      <Truck className="w-4 h-4 text-slate-400" />
                      <span>My Orders</span>
                    </button>

                    <button
                      onClick={() => {
                        setIsUserMenuOpen(false);
                        if (onOpenMyAddresses) onOpenMyAddresses();
                      }}
                      className="w-full text-left px-4 py-2 text-xs font-medium text-slate-700 hover:bg-orange-50 hover:text-orange-600 flex items-center space-x-2 transition cursor-pointer"
                    >
                      <MapPin className="w-4 h-4 text-slate-400" />
                      <span>My Saved Addresses</span>
                    </button>

                    {isAdmin && (
                      <button
                        onClick={() => {
                          setIsUserMenuOpen(false);
                          if (onOpenAdmin) onOpenAdmin();
                        }}
                        className="w-full text-left px-4 py-2 text-xs font-semibold text-orange-600 hover:bg-orange-50 flex items-center space-x-2 transition cursor-pointer"
                      >
                        <ShieldCheck className="w-4 h-4 text-orange-500" />
                        <span>SRE Admin Portal</span>
                      </button>
                    )}
                  </div>

                  <div className="border-t border-slate-100 pt-1">
                    <button
                      onClick={() => {
                        setIsUserMenuOpen(false);
                        if (onSignOut) onSignOut();
                      }}
                      className="w-full text-left px-4 py-2 text-xs font-medium text-red-600 hover:bg-red-50 flex items-center space-x-2 transition cursor-pointer"
                    >
                      <LogOut className="w-4 h-4 text-red-500" />
                      <span>Sign Out</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Cart Trigger Button */}
          <button
            onClick={onOpenCart}
            id="cart-trigger-button"
            className="relative flex items-center space-x-1.5 sm:space-x-2 bg-orange-500 hover:bg-orange-600 text-white px-3 sm:px-4 py-2 rounded-xl font-bold transition shadow-md shadow-orange-500/20 cursor-pointer group"
          >
            <div className="relative">
              <ShoppingBag className="w-4.5 h-4.5 sm:w-5 sm:h-5 group-hover:scale-105 transition-transform" />
              {totalCartCount > 0 && (
                <span className="absolute -top-2.5 -right-2.5 bg-white text-orange-600 text-[10px] font-black w-4.5 h-4.5 rounded-full flex items-center justify-center border-2 border-orange-500 shadow-xs">
                  {totalCartCount}
                </span>
              )}
            </div>
            <span className="text-[11px] sm:text-xs font-black tracking-wide">
              Cart {totalCartCount > 0 && `(${totalCartCount})`}
            </span>
          </button>
        </div>
      </div>

      {/* Mobile Search Bar */}
      <div ref={mobileSearchContainerRef} className="p-2.5 sm:p-3 border-t border-slate-100 md:hidden bg-slate-50 w-full relative">
        <form onSubmit={handleFormSubmit} className="flex items-center border-2 border-orange-500 rounded-xl overflow-hidden bg-white shadow-xs w-full">
          <div className="flex-1 flex items-center relative min-w-0">
            <input
              type="text"
              value={inputValue}
              onFocus={() => {
                if (inputValue.trim().length > 0) setShowDropdown(true);
              }}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder={
                activeNavTab === 'deals'
                  ? "Search overseas products..."
                  : "Search products (e.g. Drone, Earbuds)..."
              }
              className="w-full px-3 py-2 text-xs text-slate-800 placeholder-slate-400 focus:outline-hidden min-w-0 pr-7"
            />
            {inputValue.trim().length > 0 && (
              <button
                type="button"
                onClick={handleClearInput}
                className="absolute right-1 text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
          <button type="submit" className="bg-orange-500 text-white px-3.5 py-2 shrink-0 cursor-pointer">
            <Search className="w-4 h-4" />
          </button>
        </form>

        {/* Mobile Text-Only Suggestions Dropdown */}
        {showDropdown && inputValue.trim().length > 0 && (
          <div className="absolute left-2.5 right-2.5 top-full mt-1 bg-white border border-slate-200 rounded-2xl shadow-2xl z-50 overflow-hidden max-h-80 overflow-y-auto">
            <div className="p-2 border-b border-slate-100 bg-slate-50 flex items-center justify-between text-[11px] text-slate-500 px-3">
              <span className="font-bold flex items-center text-slate-700">
                <Sparkles className="w-3.5 h-3.5 text-orange-500 mr-1" />
                Suggestions
              </span>
              {isSearchingSuggestions && <Loader2 className="w-3 h-3 animate-spin text-orange-500" />}
            </div>

            <div className="divide-y divide-slate-50 py-1">
              {/* Direct query search */}
              <div
                onClick={() => executeSearch(inputValue)}
                className="px-3.5 py-2.5 flex items-center justify-between hover:bg-orange-50 cursor-pointer"
              >
                <div className="flex items-center space-x-2.5 min-w-0">
                  <Search className="w-4 h-4 text-orange-500 shrink-0" />
                  <span className="text-xs font-bold text-orange-600 truncate">{inputValue}</span>
                </div>
                <span className="text-[10px] bg-orange-100 text-orange-700 px-2 py-0.5 rounded font-bold">Search</span>
              </div>

              {suggestions
                .filter((item) => item.toLowerCase() !== inputValue.toLowerCase())
                .map((item, idx) => (
                  <div
                    key={idx}
                    onClick={() => executeSearch(item)}
                    className="px-3.5 py-2 flex items-center justify-between hover:bg-orange-50 cursor-pointer text-slate-700"
                  >
                    <div className="flex items-center space-x-2.5 min-w-0">
                      <Search className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span className="text-xs font-medium truncate capitalize">{item}</span>
                    </div>
                    <ArrowUpRight className="w-3 h-3 text-slate-300 shrink-0" />
                  </div>
                ))}
            </div>
          </div>
        )}
      </div>
    </header>
  );
};

