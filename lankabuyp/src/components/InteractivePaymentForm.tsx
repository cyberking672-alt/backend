import React, { useState, useEffect } from 'react';
import { ArrowLeft, Lock, ShieldCheck, ExternalLink, Loader2, RefreshCw } from 'lucide-react';

interface InteractivePaymentFormProps {
  sessionId: string;
  orderId: string | number;
  amountLkr: number;
  checkoutUrl?: string;
  onSuccess: (order: any) => void;
  onCancel: () => void;
}

export const InteractivePaymentForm: React.FC<InteractivePaymentFormProps> = ({
  sessionId,
  orderId,
  amountLkr,
  checkoutUrl,
  onSuccess,
  onCancel,
}) => {
  const [iframeLoading, setIframeLoading] = useState(true);
  const [isVerifying, setIsVerifying] = useState(false);

  const finalGatewayUrl =
    checkoutUrl ||
    `/api/checkout/embed-frame?sessionId=${encodeURIComponent(sessionId)}`;

  // 1. Real-time postMessage listener for Creem payment gateway completion events
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      try {
        const data = event.data;
        if (!data) return;

        if (
          data.type === 'CREEM_PAYMENT_SUCCESS' ||
          data.status === 'success' ||
          data.event === 'checkout.completed' ||
          data.event === 'payment.succeeded'
        ) {
          if (data.order) {
            onSuccess(data.order);
          } else {
            verifyPaymentStatus();
          }
        }
      } catch (err) {
        console.warn('[Creem Gateway Frame Event Warning]:', err);
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [sessionId, orderId, onSuccess]);

  // 2. Periodic status polling while iframe is open to detect completed payments seamlessly
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;

    interval = setInterval(() => {
      if (sessionId) {
        fetch(`/api/checkout/session-status?sessionId=${encodeURIComponent(sessionId)}`)
          .then((res) => (res.ok ? res.json() : null))
          .then((data) => {
            if (data && (data.status === 'PAID' || data.status === 'COMPLETED') && data.order) {
              if (interval) clearInterval(interval);
              onSuccess(data.order);
            }
          })
          .catch(() => {});
      }
    }, 4000);

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [sessionId, onSuccess]);

  const verifyPaymentStatus = async () => {
    setIsVerifying(true);
    try {
      const res = await fetch(`/api/checkout/confirm-payment`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Idempotency-Key': `verify-${sessionId}-${Date.now()}`,
        },
        body: JSON.stringify({ sessionId, orderId }),
      });
      const data = await res.json();
      if (data.success && data.order) {
        onSuccess(data.order);
      }
    } catch (e) {
      console.error('Status verification check:', e);
    } finally {
      setIsVerifying(false);
    }
  };

  return (
    <div className="w-full max-w-2xl mx-auto space-y-4">
      {/* Top Controls & Back Link */}
      <div className="flex items-center justify-between px-1">
        <button
          type="button"
          onClick={onCancel}
          className="text-xs font-bold text-slate-600 hover:text-orange-600 flex items-center space-x-1.5 transition cursor-pointer bg-white px-3 py-1.5 rounded-xl border border-slate-200 shadow-2xs"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Cancel &amp; Edit Order Address</span>
        </button>

        <div className="flex items-center space-x-2">
          <button
            type="button"
            onClick={verifyPaymentStatus}
            disabled={isVerifying}
            className="text-[11px] font-bold text-slate-600 hover:text-slate-900 flex items-center space-x-1 bg-white px-2.5 py-1.5 rounded-xl border border-slate-200 shadow-2xs transition cursor-pointer disabled:opacity-50"
            title="Check payment verification status"
          >
            <RefreshCw className={`w-3 h-3 ${isVerifying ? 'animate-spin text-orange-500' : ''}`} />
            <span className="hidden sm:inline">Refresh Status</span>
          </button>

          <a
            href={finalGatewayUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[11px] font-bold text-orange-600 hover:text-orange-700 flex items-center space-x-1 bg-orange-50 px-2.5 py-1.5 rounded-xl border border-orange-200 transition"
            title="Open in new window if preferred"
          >
            <span className="hidden sm:inline">Open in New Tab</span>
            <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      </div>

      {/* Embedded Creem.io Payment Gateway Card */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-xl overflow-hidden">
        {/* Gateway Security Header */}
        <div className="bg-slate-900 text-white px-4 sm:px-6 py-3.5 flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center space-x-2.5">
            <div className="w-7 h-7 rounded-xl bg-orange-500 flex items-center justify-center text-white font-black text-xs shadow-xs">
              C
            </div>
            <div>
              <div className="flex items-center space-x-1.5">
                <span className="font-bold text-xs sm:text-sm text-white tracking-wide">Creem.io</span>
                <span className="text-[10px] bg-slate-800 text-orange-400 px-1.5 py-0.5 rounded font-mono font-bold">
                  MOR Gateway
                </span>
              </div>
              <p className="text-[10px] text-slate-400">100% Embedded Bank-Level 3D Secure</p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <div className="text-right hidden sm:block">
              <span className="text-[9px] text-slate-400 uppercase font-bold tracking-wider block">Payable</span>
              <span className="text-xs font-black text-orange-400 font-mono">Rs. {amountLkr.toLocaleString()}</span>
            </div>
            <div className="w-7 h-7 rounded-xl bg-emerald-950/80 border border-emerald-500/30 text-emerald-400 flex items-center justify-center">
              <ShieldCheck className="w-4 h-4" />
            </div>
          </div>
        </div>

        {/* Iframe Viewport */}
        <div className="relative w-full bg-slate-50 min-h-[640px] sm:min-h-[700px] flex flex-col">
          {iframeLoading && (
            <div className="absolute inset-0 bg-white/90 backdrop-blur-xs flex flex-col items-center justify-center z-10 space-y-3">
              <div className="w-10 h-10 rounded-2xl bg-orange-50 text-orange-500 flex items-center justify-center shadow-inner">
                <Loader2 className="w-5 h-5 animate-spin" />
              </div>
              <p className="text-xs font-bold text-slate-700">Connecting to Creem 3D Secure Gateway...</p>
              <p className="text-[10px] text-slate-400">Pre-populating your delivery and billing address</p>
            </div>
          )}

          <iframe
            src={finalGatewayUrl}
            title="Creem.io Secure Payment Gateway"
            className="w-full flex-1 border-0 min-h-[640px] sm:min-h-[700px]"
            allow="payment; camera; clipboard-write; geolocation"
            onLoad={() => setIframeLoading(false)}
          />
        </div>

        {/* Gateway Trust Footer */}
        <div className="bg-slate-50 border-t border-slate-100 px-4 sm:px-6 py-3 flex flex-wrap items-center justify-between gap-2 text-[10px] text-slate-500">
          <div className="flex items-center space-x-2">
            <Lock className="w-3.5 h-3.5 text-emerald-600" />
            <span>End-to-End 256-Bit SSL Encrypted by Creem Merchant of Record.</span>
          </div>

          <div className="flex items-center space-x-2">
            <span className="font-bold text-[9px] bg-white border border-slate-200 px-1.5 py-0.5 rounded text-blue-700">VISA</span>
            <span className="font-bold text-[9px] bg-white border border-slate-200 px-1.5 py-0.5 rounded text-red-600">Mastercard</span>
            <span className="font-bold text-[9px] bg-white border border-slate-200 px-1.5 py-0.5 rounded text-slate-700">G Pay</span>
          </div>
        </div>
      </div>
    </div>
  );
};
