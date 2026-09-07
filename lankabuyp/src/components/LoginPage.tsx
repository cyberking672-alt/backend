import React, { useState, useEffect, useRef } from 'react';
import { 
  ShoppingBag, 
  Mail, 
  Lock, 
  Eye, 
  EyeOff, 
  ArrowLeft, 
  Sparkles, 
  ShieldCheck, 
  CheckCircle2, 
  ArrowRight,
  User,
  AlertCircle
} from 'lucide-react';
import { 
  signInWithGoogleIdToken,
  signInWithEmail, 
  signUpWithEmail, 
  checkRedirectAuthResult, 
  auth, 
  onAuthStateChanged 
} from '../lib/firebase';
import { UserProfile, PendingCheckoutIntent } from '../types';
import { LankaBuyLogo } from './LankaBuyLogo';
import firebaseConfig from '../../firebase-applet-config.json';

interface LoginPageProps {
  onLoginSuccess: (user: UserProfile) => void;
  onBackToHome: () => void;
  pendingCheckoutIntent?: PendingCheckoutIntent | null;
}

export const LoginPage: React.FC<LoginPageProps> = ({
  onLoginSuccess,
  onBackToHome,
  pendingCheckoutIntent,
}) => {
  const [isRegisterMode, setIsRegisterMode] = useState(false);
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const authProcessedRef = useRef(false);
  const gsiContainerRef = useRef<HTMLDivElement>(null);

  // Google Identity Services (GSI) One-Click Sign-In Setup
  useEffect(() => {
    const initGsi = () => {
      if (typeof window !== 'undefined' && (window as any).google?.accounts?.id) {
        try {
          const clientId = (firebaseConfig as any).oAuthClientId || (firebaseConfig as any).client_id;
          if (clientId) {
            (window as any).google.accounts.id.initialize({
              client_id: clientId,
              callback: async (response: any) => {
                if (response?.credential) {
                  setGoogleLoading(true);
                  setError(null);
                  try {
                    const user = await signInWithGoogleIdToken(response.credential);
                    authProcessedRef.current = true;
                    setGoogleLoading(false);
                    onLoginSuccess(user);
                  } catch (err: any) {
                    setGoogleLoading(false);
                    const code = err?.code || 'GSI_AUTH_ERROR';
                    const msg = err?.message || String(err);
                    setError(`[${code}] ${msg.replace(/^Firebase:\s*/, '')}`);
                  }
                }
              },
              auto_select: false,
              cancel_on_tap_outside: true,
            });

            if (gsiContainerRef.current) {
              (window as any).google.accounts.id.renderButton(gsiContainerRef.current, {
                theme: 'outline',
                size: 'large',
                type: 'standard',
                shape: 'rectangular',
                text: 'signin_with',
                logo_alignment: 'left',
                width: 320,
              });
            }
          }
        } catch (e: any) {
          console.warn('[GSI Init Notice]:', e);
        }
      }
    };

    initGsi();
    const t1 = setTimeout(initGsi, 500);
    const t2 = setTimeout(initGsi, 1500);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [onLoginSuccess]);

  // Check for redirect result on return
  useEffect(() => {
    let isMounted = true;

    checkRedirectAuthResult()
      .then((user) => {
        if (user && isMounted && !authProcessedRef.current) {
          authProcessedRef.current = true;
          setGoogleLoading(false);
          onLoginSuccess(user);
        }
      })
      .catch((err) => {
        if (isMounted) {
          setGoogleLoading(false);
          setError(err?.message || 'Authentication failed on redirect.');
        }
      });

    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      if (firebaseUser && isMounted && !authProcessedRef.current) {
        authProcessedRef.current = true;
        const profile: UserProfile = {
          uid: firebaseUser.uid,
          email: firebaseUser.email || '',
          displayName: firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'Customer',
          photoURL: firebaseUser.photoURL || undefined,
          createdAt: new Date().toISOString(),
        };
        setGoogleLoading(false);
        setLoading(false);
        onLoginSuccess(profile);
      }
    });

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, [onLoginSuccess]);

  // Real Email & Password Auth Handler
  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password) {
      setError('Please enter your email and password.');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      let user: UserProfile;
      if (isRegisterMode) {
        user = await signUpWithEmail(email.trim(), password, fullName.trim());
      } else {
        user = await signInWithEmail(email.trim(), password);
      }
      authProcessedRef.current = true;
      setLoading(false);
      onLoginSuccess(user);
    } catch (err: any) {
      console.error('[Auth Error]:', err);
      const code = err?.code || 'UNKNOWN_ERROR';
      const msg = err?.message || 'Authentication error';

      if (code === 'auth/user-not-found' || code === 'auth/wrong-password' || code === 'auth/invalid-credential') {
        setError('Incorrect email or password. Please verify your credentials or register a new account.');
      } else if (code === 'auth/email-already-in-use') {
        setError('This email is already registered. Please switch to Login or sign in with your password.');
      } else if (code === 'auth/invalid-email') {
        setError('Please enter a valid email address.');
      } else {
        setError(msg.replace(/^Firebase:\s*/, ''));
      }
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full relative overflow-hidden bg-gradient-to-br from-orange-500 via-amber-500 to-orange-600 flex flex-col justify-between select-none">
      {/* 3D Geometric Background Canvas Elements */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {/* Isometric 3D Grid Floor Accent */}
        <div 
          className="absolute -bottom-24 -left-24 -right-24 h-96 opacity-25"
          style={{
            backgroundImage: `radial-gradient(circle at center, rgba(255,255,255,0.8) 0, transparent 70%), linear-gradient(0deg, transparent 24%, rgba(255, 255, 255, .3) 25%, rgba(255, 255, 255, .3) 26%, transparent 27%, transparent 74%, rgba(255, 255, 255, .3) 75%, rgba(255, 255, 255, .3) 76%, transparent 77%, transparent), linear-gradient(90deg, transparent 24%, rgba(255, 255, 255, .3) 25%, rgba(255, 255, 255, .3) 26%, transparent 27%, transparent 74%, rgba(255, 255, 255, .3) 75%, rgba(255, 255, 255, .3) 76%, transparent 77%, transparent)`,
            backgroundSize: '60px 60px',
            transform: 'perspective(600px) rotateX(60deg)'
          }}
        />

        {/* Ambient Radial Soft Glows */}
        <div className="absolute -top-32 -left-32 w-96 h-96 bg-white/20 rounded-full blur-3xl" />
        <div className="absolute top-1/4 -right-24 w-80 h-80 bg-amber-300/30 rounded-full blur-3xl" />
        <div className="absolute -bottom-20 right-1/4 w-96 h-96 bg-orange-700/30 rounded-full blur-3xl" />

        {/* 3D Geometric Cube 1 - Top Left */}
        <div className="absolute top-12 left-6 lg:left-24 opacity-85 hidden sm:block animate-bounce duration-[6000ms]">
          <div className="relative w-20 h-20 transform -rotate-12 hover:rotate-0 transition-transform duration-700">
            <div className="absolute inset-0 bg-white/30 backdrop-blur-md rounded-2xl border border-white/60 shadow-[0_12px_24px_rgba(0,0,0,0.12)] flex items-center justify-center">
              <ShoppingBag className="w-9 h-9 text-white drop-shadow-md" />
            </div>
            <div className="absolute -bottom-2 -right-2 w-7 h-7 bg-amber-400 rounded-lg shadow-sm border border-white/50 flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
          </div>
        </div>

        {/* 3D Geometric Shield - Top Right */}
        <div className="absolute top-16 right-6 lg:right-28 opacity-85 hidden sm:block animate-pulse duration-[4000ms]">
          <div className="relative w-18 h-18 transform rotate-12 hover:rotate-0 transition-transform duration-700">
            <div className="absolute inset-0 bg-white/30 backdrop-blur-md rounded-2xl border border-white/60 shadow-[0_12px_24px_rgba(0,0,0,0.12)] flex items-center justify-center">
              <ShieldCheck className="w-9 h-9 text-white drop-shadow-md" />
            </div>
            <div className="absolute -top-2 -left-2 w-6 h-6 bg-emerald-400 rounded-full border border-white/60 flex items-center justify-center shadow-xs">
              <CheckCircle2 className="w-3.5 h-3.5 text-white" />
            </div>
          </div>
        </div>
      </div>

      {/* Top Header Navigation */}
      <header className="relative z-20 pt-4 px-4 sm:px-8 max-w-6xl w-full mx-auto flex items-center justify-between">
        <button
          onClick={onBackToHome}
          id="login-back-to-store-btn"
          className="inline-flex items-center space-x-2 px-4 py-2 bg-white/90 hover:bg-white text-slate-800 font-bold text-xs sm:text-sm rounded-2xl shadow-[0_4px_0_#cbd5e1,0_8px_16px_rgba(0,0,0,0.08)] active:shadow-[0_1px_0_#cbd5e1] active:translate-y-[3px] transition-all cursor-pointer border border-white/80"
        >
          <ArrowLeft className="w-4 h-4 text-orange-600" />
          <span>Back to Store</span>
        </button>

        <div className="bg-white/20 backdrop-blur-md px-3.5 py-1.5 rounded-full border border-white/30 text-white text-xs font-semibold flex items-center space-x-2">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
          <span>Firebase Protected</span>
        </div>
      </header>

      {/* Main Authentication Card Container */}
      <main className="relative z-20 max-w-md w-full mx-auto px-4 py-6 my-auto">
        <div className="bg-white/95 backdrop-blur-xl rounded-3xl p-6 sm:p-8 shadow-[0_20px_50px_rgba(0,0,0,0.2),0_8px_0_#ea580c] border border-white/80 transition-all">
          
          {/* Brand Logo & Header */}
          <div className="text-center mb-6">
            <div className="inline-flex justify-center items-center mb-2">
              <LankaBuyLogo size="lg" />
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-800 tracking-tight">
              {isRegisterMode ? 'Create Real Account' : 'Welcome to LankaBuy'}
            </h1>
            <p className="text-xs text-slate-500 font-medium mt-1">
              {isRegisterMode 
                ? 'Sign up with your credentials to sync orders & cart' 
                : 'Sign in to access your orders, wishlist, and fast checkout'}
            </p>

            {/* Pending Checkout Intent Alert */}
            {pendingCheckoutIntent && (
              <div className="mt-3 p-2.5 bg-orange-50 rounded-2xl border border-orange-200/80 text-left flex items-center space-x-2.5 shadow-xs">
                <div className="w-7 h-7 rounded-xl bg-orange-500 text-white flex items-center justify-center shrink-0 shadow-xs">
                  <ShoppingBag className="w-4 h-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[10px] font-bold text-orange-900 uppercase tracking-wider">Ready for Checkout</p>
                  <p className="text-xs text-orange-800 font-semibold truncate">
                    {pendingCheckoutIntent.type === 'buy_now' && pendingCheckoutIntent.product?.title
                      ? pendingCheckoutIntent.product.title
                      : 'Cart items saved & awaiting completion'}
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Error Message Box */}
          {error && (
            <div className="mb-4 p-3.5 bg-red-50 text-red-700 text-xs rounded-2xl border border-red-200 shadow-xs flex items-start space-x-2">
              <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
              <span className="font-medium leading-relaxed flex-1">{error}</span>
            </div>
          )}

          {/* Google Sign-In Section - Native Google Official Button */}
          <div className="mb-5">
            <div 
              ref={gsiContainerRef} 
              className="flex justify-center min-h-[44px] w-full [&>div]:!w-full [&_iframe]:!w-full overflow-hidden rounded-2xl shadow-xs" 
            />
          </div>

          {/* Divider */}
          <div className="relative mb-5 text-center">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-200" />
            </div>
            <span className="relative bg-white px-3 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              Or continue with email
            </span>
          </div>

          {/* Real Firebase Email & Password 3D Form */}
          <form onSubmit={handleEmailSubmit} className="space-y-3.5">
            {isRegisterMode && (
              <div>
                <label className="block text-[11px] font-black text-slate-700 uppercase tracking-wider mb-1">
                  Full Name
                </label>
                <div className="relative rounded-2xl border-2 border-slate-200 bg-slate-50/70 shadow-[inset_0_2px_4px_rgba(0,0,0,0.06),0_3px_0_#e2e8f0] focus-within:border-orange-500 focus-within:bg-white focus-within:shadow-[inset_0_2px_4px_rgba(0,0,0,0.03),0_4px_0_#f97316] transition-all">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <User className="w-4 h-4" />
                  </div>
                  <input
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="e.g. Kasun Perera"
                    className="w-full pl-10 pr-4 py-2.5 text-xs sm:text-sm font-semibold text-slate-800 placeholder-slate-400 bg-transparent focus:outline-hidden"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block text-[11px] font-black text-slate-700 uppercase tracking-wider mb-1">
                Email Address
              </label>
              <div className="relative rounded-2xl border-2 border-slate-200 bg-slate-50/70 shadow-[inset_0_2px_4px_rgba(0,0,0,0.06),0_3px_0_#e2e8f0] focus-within:border-orange-500 focus-within:bg-white focus-within:shadow-[inset_0_2px_4px_rgba(0,0,0,0.03),0_4px_0_#f97316] transition-all">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Mail className="w-4 h-4" />
                </div>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="customer@example.com"
                  required
                  className="w-full pl-10 pr-4 py-2.5 text-xs sm:text-sm font-semibold text-slate-800 placeholder-slate-400 bg-transparent focus:outline-hidden"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-[11px] font-black text-slate-700 uppercase tracking-wider">
                  Password
                </label>
                {!isRegisterMode && (
                  <span className="text-[10px] font-semibold text-orange-600 hover:text-orange-700 cursor-pointer">
                    Forgot?
                  </span>
                )}
              </div>
              <div className="relative rounded-2xl border-2 border-slate-200 bg-slate-50/70 shadow-[inset_0_2px_4px_rgba(0,0,0,0.06),0_3px_0_#e2e8f0] focus-within:border-orange-500 focus-within:bg-white focus-within:shadow-[inset_0_2px_4px_rgba(0,0,0,0.03),0_4px_0_#f97316] transition-all">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="At least 6 characters"
                  required
                  className="w-full pl-10 pr-11 py-2.5 text-xs sm:text-sm font-semibold text-slate-800 placeholder-slate-400 bg-transparent focus:outline-hidden"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Prominent Orange 3D 'Login' Button */}
            <div className="pt-2">
              <button
                type="submit"
                disabled={loading || googleLoading}
                id="login-submit-3d-btn"
                className="w-full bg-gradient-to-r from-orange-500 via-orange-600 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-black text-sm tracking-wide py-3.5 px-6 rounded-2xl shadow-[0_6px_0_#c2410c,0_12px_24px_rgba(249,115,22,0.35)] active:shadow-[0_2px_0_#c2410c,0_4px_8px_rgba(249,115,22,0.25)] active:translate-y-[4px] transition-all cursor-pointer flex items-center justify-center space-x-2 disabled:opacity-60"
              >
                <span>
                  {loading
                    ? isRegisterMode ? 'Creating Real Account...' : 'Authenticating...'
                    : isRegisterMode ? 'Create Real Account' : 'Login with Email'}
                </span>
                {!loading && <ArrowRight className="w-4 h-4" />}
              </button>
            </div>
          </form>

          {/* Toggle between Login and Register Mode */}
          <div className="mt-5 text-center text-xs text-slate-500 font-medium">
            {isRegisterMode ? (
              <p>
                Already have an account?{' '}
                <button
                  type="button"
                  onClick={() => { setIsRegisterMode(false); setError(null); }}
                  className="text-orange-600 hover:text-orange-700 font-bold underline cursor-pointer"
                >
                  Login here
                </button>
              </p>
            ) : (
              <p>
                Don't have an account?{' '}
                <button
                  type="button"
                  onClick={() => { setIsRegisterMode(true); setError(null); }}
                  className="text-orange-600 hover:text-orange-700 font-bold underline cursor-pointer"
                >
                  Create one for free
                </button>
              </p>
            )}
          </div>

          {/* Security Assurance Footer */}
          <div className="mt-5 pt-3.5 border-t border-slate-100 flex items-center justify-center space-x-1.5 text-[11px] text-slate-400 font-medium">
            <ShieldCheck className="w-4 h-4 text-emerald-500" />
            <span>256-Bit SSL Encrypted &amp; Secured by Firebase</span>
          </div>
        </div>
      </main>

      {/* Page Bottom Footer Info */}
      <footer className="relative z-20 py-3 px-4 text-center text-[11px] text-white/80 font-medium">
        <p>© 2026 LankaBuy Marketplace Sri Lanka. Islandwide Delivery &amp; Customer Protection.</p>
      </footer>
    </div>
  );
};
