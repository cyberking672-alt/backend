/**
 * Admin Order Fulfillment Detail Modal
 *
 * Read-mostly detail view over the authoritative order record:
 * product / customer / shipping / server-verified payment / status.
 * - Supplier URLs are rendered EXACTLY as stored (cjDirectUrl, qksourceUrl).
 *   The QKSource row appears ONLY when a stored URL exists — never invented.
 * - PDF is generated server-side (GET /api/admin/orders/:id/pdf).
 * - All data calls carry the caller's admin auth headers (prop).
 */
import React, { useState } from 'react';
import {
  X, Copy, Check, ExternalLink, FileDown, Phone, MessageCircle, Package,
} from 'lucide-react';
import type { Order } from '../types';
import {
  buildShippingCopyText, copyTextToClipboard, fulfillmentStage,
} from '../lib/fulfillment';

interface AdminOrderDetailProps {
  order: Order | null;
  isLight?: boolean;
  authHeaders: () => Record<string, string>;
  onClose: () => void;
  notify?: (msg: string) => void;
}

function Row({ label, value, mono }: { label: string; value: React.ReactNode; mono?: boolean }) {
  return (
    <div className="flex items-start justify-between gap-3 py-1 text-xs">
      <span className="text-slate-400 font-semibold shrink-0">{label}</span>
      <span className={`text-right font-bold text-slate-100 ${mono ? 'font-mono break-all' : 'break-words'}`}>{value ?? '-'}</span>
    </div>
  );
}

export function AdminOrderDetail({ order, isLight, authHeaders, onClose, notify }: AdminOrderDetailProps) {
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [isDownloadingPdf, setIsDownloadingPdf] = useState(false);

  if (!order) return null;

  const c: any = order.customer || {};
  const stage = fulfillmentStage(order);
  const frame = isLight ? 'bg-white text-slate-800 border-slate-200' : 'bg-slate-900 text-white border-slate-800';

  const doCopy = async (key: string, text: string, label: string) => {
    const ok = await copyTextToClipboard(text);
    if (ok) {
      setCopiedKey(key);
      setTimeout(() => setCopiedKey(null), 1800);
      notify?.(`${label} copied to clipboard.`);
    } else {
      notify?.(`Copy failed — please copy manually.`);
    }
  };

  const copyBtn = (key: string, text: string, label: string) => (
    <button
      type="button"
      onClick={() => doCopy(key, text, label)}
      className="inline-flex items-center space-x-1 px-2 py-1 rounded-lg text-[10px] font-bold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition cursor-pointer"
      title={`Copy ${label}`}
    >
      {copiedKey === key ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
      <span>{copiedKey === key ? 'Copied!' : 'Copy'}</span>
    </button>
  );

  const downloadPdf = async () => {
    setIsDownloadingPdf(true);
    try {
      const res = await fetch(`/api/admin/orders/${encodeURIComponent(order.id)}/pdf`, {
        credentials: 'include',
        headers: authHeaders(),
      });
      if (!res.ok) {
        notify?.(`PDF download failed (HTTP ${res.status}).`);
        return;
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `LankaBuy-Order-${order.orderNumber || order.id}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 5000);
      notify?.('Order PDF downloaded.');
    } catch {
      notify?.('PDF download failed due to a network error.');
    } finally {
      setIsDownloadingPdf(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] bg-black/75 backdrop-blur-xs flex items-center justify-center p-4">
      <div className={`w-full max-w-2xl ${frame} border rounded-3xl shadow-2xl max-h-[92vh] overflow-y-auto`}>
        <div className="flex items-center justify-between p-5 border-b border-slate-800 sticky top-0 bg-inherit rounded-t-3xl z-10">
          <div>
            <h3 className="font-black text-base">Order #{order.orderNumber}</h3>
            <p className="text-[11px] text-slate-400 font-mono">
              {order.id} • {order.createdAt ? new Date(order.createdAt).toLocaleString() : '-'}
            </p>
          </div>
          <div className="flex items-center space-x-2">
            <span className="px-2.5 py-1 rounded-full text-[10px] font-black bg-orange-500/15 text-orange-400 border border-orange-500/30 uppercase">
              {stage.replace('_', ' ')}
            </span>
            <button onClick={onClose} className="p-1.5 rounded-xl hover:bg-slate-800 text-slate-400 hover:text-white transition cursor-pointer" title="Close">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="p-5 space-y-5">
          {/* PRODUCT */}
          <section>
            <h4 className="text-xs font-black tracking-wider text-orange-500 mb-2 flex items-center"><Package className="w-3.5 h-3.5 mr-1.5" /> PRODUCT</h4>
            {(order.items || []).map((item: any, idx: number) => (
              <div key={idx} className="rounded-2xl border border-slate-800 p-3 mb-2 space-y-1 bg-slate-950/60">
                <Row label="Name" value={item.title} />
                <Row label="Product ID" value={item.productId} mono />
                <Row label="SKU" value={item.sku} mono />
                <Row label="Quantity" value={item.quantity} />
                <Row label="Unit / Total" value={`Rs. ${Number(item.unitPrice || 0).toLocaleString()} / Rs. ${Number(item.totalPrice || 0).toLocaleString()}`} />
                <Row label="Supplier" value={item.supplierOrigin || item.supplierName || '-'} />
                <div className="flex flex-wrap gap-2 pt-1">
                  {item.cjDirectUrl ? (
                    <a href={item.cjDirectUrl} target="_blank" rel="noreferrer" className="inline-flex items-center space-x-1 px-2.5 py-1.5 rounded-xl text-[11px] font-bold bg-orange-500 hover:bg-orange-600 text-white transition">
                      <ExternalLink className="w-3 h-3" /><span>Open Supplier Product (CJ)</span>
                    </a>
                  ) : null}
                  {item.qksourceUrl ? (
                    <a href={item.qksourceUrl} target="_blank" rel="noreferrer" className="inline-flex items-center space-x-1 px-2.5 py-1.5 rounded-xl text-[11px] font-bold bg-sky-600 hover:bg-sky-500 text-white transition">
                      <ExternalLink className="w-3 h-3" /><span>Open Supplier Product (QKSource)</span>
                    </a>
                  ) : null}
                </div>
              </div>
            ))}
          </section>

          {/* CUSTOMER */}
          <section>
            <h4 className="text-xs font-black tracking-wider text-orange-500 mb-2">CUSTOMER</h4>
            <div className="rounded-2xl border border-slate-800 p-3 bg-slate-950/60 space-y-1">
              <Row label="Name" value={c.fullName} />
              <Row label="Email" value={c.email} mono />
              <div className="flex items-center justify-between gap-3 py-1 text-xs">
                <span className="text-slate-400 font-semibold">Phone</span>
                <span className="flex items-center gap-2 font-bold">
                  <span className="font-mono">{c.phone || '-'}</span>
                  {copyBtn('phone', String(c.phone || ''), 'Phone')}
                </span>
              </div>
              <div className="flex items-center justify-between gap-3 py-1 text-xs">
                <span className="text-slate-400 font-semibold">WhatsApp</span>
                <span className="flex items-center gap-2 font-bold">
                  <span className="font-mono">{c.whatsapp || '-'}</span>
                  {c.whatsapp ? copyBtn('wa', String(c.whatsapp), 'WhatsApp') : null}
                </span>
              </div>
              <Row label="Country" value={c.country} />
              {c.countryCallingCode ? <Row label="Calling code" value={c.countryCallingCode} mono /> : null}
            </div>
          </section>

          {/* SHIPPING */}
          <section>
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-xs font-black tracking-wider text-orange-500">SHIPPING</h4>
              {copyBtn('ship', buildShippingCopyText(order), 'Shipping address')}
            </div>
            <div className="rounded-2xl border border-slate-800 p-3 bg-slate-950/60 space-y-1">
              <Row label="Recipient" value={c.fullName} />
              <Row label="Street" value={c.street} />
              <Row label="City" value={c.city} />
              <Row label="District" value={c.district} />
              <Row label="Province" value={c.province || '-'} />
              <Row label="Postal" value={c.postalCode || '-'} mono />
              <Row label="Country" value={c.country} />
              <Row label="Phone" value={c.phone} mono />
              <Row label="WhatsApp" value={c.whatsapp || '-'} mono />
            </div>
            <pre className="mt-2 text-[11px] font-mono whitespace-pre-wrap rounded-2xl border border-slate-800 bg-black/40 p-3 text-slate-300">{buildShippingCopyText(order)}</pre>
          </section>

          {/* PAYMENT (server-verified) */}
          <section>
            <h4 className="text-xs font-black tracking-wider text-orange-500 mb-2">PAYMENT (SERVER-VERIFIED)</h4>
            <div className="rounded-2xl border border-slate-800 p-3 bg-slate-950/60 space-y-1">
              <Row label="Status" value={order.paymentStatus} />
              <Row label="Method" value={String(order.paymentMethod || '').replace(/_/g, ' ')} />
              <Row label="Creem Checkout ID" value={(order as any).creemCheckoutId || order.transactionId || '-'} mono />
              <Row label="Creem Order ID" value={(order as any).creemOrderId || '-'} mono />
              <Row label="Creem Customer ID" value={(order as any).creemCustomerId || '-'} mono />
              <Row label="Amount" value={`Rs. ${Number(order.totalAmount || 0).toLocaleString()}`} />
              <Row label="Currency" value={(order as any).currency || 'LKR'} />
              <Row label="Paid at" value={(order as any).paidAt || '-'} />
              <Row label="Internal ID" value={order.id} mono />
              <Row label="Inventory" value={(order as any).inventoryStatus || '-'} />
            </div>
          </section>

          {/* ACTIONS */}
          <section className="flex flex-wrap gap-2">
            <button onClick={downloadPdf} disabled={isDownloadingPdf} className="inline-flex items-center space-x-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-orange-500 hover:bg-orange-600 text-white transition cursor-pointer disabled:opacity-50">
              <FileDown className="w-4 h-4" /><span>{isDownloadingPdf ? 'Generating PDF…' : 'Download Order PDF'}</span>
            </button>
            {c.phone ? (
              <a href={`tel:${encodeURIComponent(String(c.phone))}`} className="inline-flex items-center space-x-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition">
                <Phone className="w-4 h-4" /><span>Call</span>
              </a>
            ) : null}
            {(c.whatsapp || c.phone) ? (
              <a href={`https://wa.me/${encodeURIComponent(String(c.whatsapp || c.phone).replace(/[^0-9]/g, ''))}`} target="_blank" rel="noreferrer" className="inline-flex items-center space-x-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-emerald-600/20 hover:bg-emerald-600/40 text-emerald-300 border border-emerald-500/30 transition">
                <MessageCircle className="w-4 h-4" /><span>WhatsApp</span>
              </a>
            ) : null}
          </section>
        </div>
      </div>
    </div>
  );
}
