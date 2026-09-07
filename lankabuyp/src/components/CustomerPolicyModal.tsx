import React, { useState, useEffect } from 'react';
import { 
  X, 
  HelpCircle, 
  RotateCcw, 
  FileText, 
  ShieldCheck, 
  Truck, 
  CreditCard, 
  Phone, 
  Mail, 
  MapPin, 
  CheckCircle2,
  Clock,
  ChevronRight
} from 'lucide-react';

export type PolicyTabType = 'faq' | 'returns' | 'terms' | 'privacy';

interface CustomerPolicyModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialTab?: PolicyTabType;
}

export const CustomerPolicyModal: React.FC<CustomerPolicyModalProps> = ({
  isOpen,
  onClose,
  initialTab = 'faq',
}) => {
  const [activeTab, setActiveTab] = useState<PolicyTabType>(initialTab);

  useEffect(() => {
    if (isOpen) {
      setActiveTab(initialTab);
    }
  }, [isOpen, initialTab]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/70 backdrop-blur-xs animate-in fade-in duration-200">
      <div 
        className="bg-white text-slate-900 w-full max-w-3xl max-h-[90vh] rounded-3xl shadow-2xl flex flex-col overflow-hidden border border-slate-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/80">
          <div className="flex items-center space-x-2.5">
            <div className="w-9 h-9 rounded-xl bg-orange-500/10 text-orange-600 flex items-center justify-center font-bold">
              {activeTab === 'faq' && <HelpCircle className="w-5 h-5" />}
              {activeTab === 'returns' && <RotateCcw className="w-5 h-5" />}
              {activeTab === 'terms' && <FileText className="w-5 h-5" />}
              {activeTab === 'privacy' && <ShieldCheck className="w-5 h-5" />}
            </div>
            <div>
              <h3 className="font-extrabold text-base sm:text-lg text-slate-900 leading-tight">
                {activeTab === 'faq' && 'Help & Frequently Asked Questions (FAQs)'}
                {activeTab === 'returns' && 'Return & Refund Policy (7-Day Guarantee)'}
                {activeTab === 'terms' && 'Terms & Conditions of Service'}
                {activeTab === 'privacy' && 'Privacy Policy & Data Protection'}
              </h3>
              <p className="text-xs text-slate-500">LankaBuy Customer Support & Transparency</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-slate-200/60 hover:bg-slate-200 text-slate-600 transition cursor-pointer"
            title="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-200 bg-slate-100/60 px-4 pt-2 gap-2 overflow-x-auto no-scrollbar text-xs font-bold">
          <button
            onClick={() => setActiveTab('faq')}
            className={`px-4 py-2.5 rounded-t-xl transition-all cursor-pointer whitespace-nowrap flex items-center space-x-1.5 ${
              activeTab === 'faq'
                ? 'bg-white text-orange-600 border-t-2 border-orange-500 shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
            }`}
          >
            <HelpCircle className="w-4 h-4" />
            <span>Help &amp; FAQs</span>
          </button>

          <button
            onClick={() => setActiveTab('returns')}
            className={`px-4 py-2.5 rounded-t-xl transition-all cursor-pointer whitespace-nowrap flex items-center space-x-1.5 ${
              activeTab === 'returns'
                ? 'bg-white text-orange-600 border-t-2 border-orange-500 shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
            }`}
          >
            <RotateCcw className="w-4 h-4" />
            <span>Return &amp; Refund</span>
          </button>

          <button
            onClick={() => setActiveTab('terms')}
            className={`px-4 py-2.5 rounded-t-xl transition-all cursor-pointer whitespace-nowrap flex items-center space-x-1.5 ${
              activeTab === 'terms'
                ? 'bg-white text-orange-600 border-t-2 border-orange-500 shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
            }`}
          >
            <FileText className="w-4 h-4" />
            <span>Terms of Service</span>
          </button>

          <button
            onClick={() => setActiveTab('privacy')}
            className={`px-4 py-2.5 rounded-t-xl transition-all cursor-pointer whitespace-nowrap flex items-center space-x-1.5 ${
              activeTab === 'privacy'
                ? 'bg-white text-orange-600 border-t-2 border-orange-500 shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
            }`}
          >
            <ShieldCheck className="w-4 h-4" />
            <span>Privacy Policy</span>
          </button>
        </div>

        {/* Modal Body Content */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-6 text-sm text-slate-700 leading-relaxed">
          
          {/* TAB 1: HELP & FAQS */}
          {activeTab === 'faq' && (
            <div className="space-y-4">
              <div className="bg-orange-50/70 border border-orange-200/80 rounded-2xl p-4 flex items-start space-x-3">
                <Truck className="w-5 h-5 text-orange-600 shrink-0 mt-0.5" />
                <div className="text-xs text-orange-950">
                  <span className="font-bold block text-orange-900 text-sm mb-0.5">Islandwide Express Courier Service</span>
                  Colombo and suburbs: 1 - 2 business days. Outstation districts across Sri Lanka: 2 - 4 business days.
                </div>
              </div>

              <div className="space-y-3">
                <div className="p-4 rounded-2xl border border-slate-200 bg-slate-50/50">
                  <h4 className="font-bold text-slate-900 flex items-center text-sm mb-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 mr-2 shrink-0" />
                    How do I pay using Cash on Delivery (COD)?
                  </h4>
                  <p className="text-xs text-slate-600">
                    Select "Cash on Delivery" at checkout. Our courier partner will deliver the package directly to your doorstep, and you can pay in cash upon receiving and inspecting the package.
                  </p>
                </div>

                <div className="p-4 rounded-2xl border border-slate-200 bg-slate-50/50">
                  <h4 className="font-bold text-slate-900 flex items-center text-sm mb-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 mr-2 shrink-0" />
                    Can I pay in 3 interest-free installments via Koko?
                  </h4>
                  <p className="text-xs text-slate-600">
                    Yes! Choose Koko Pay at checkout. You only pay 1/3 of the total bill today with any Debit or Credit Card, and the remaining 2 installments are automatically split over the next 60 days with 0% interest.
                  </p>
                </div>

                <div className="p-4 rounded-2xl border border-slate-200 bg-slate-50/50">
                  <h4 className="font-bold text-slate-900 flex items-center text-sm mb-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 mr-2 shrink-0" />
                    How do I track my delivery status?
                  </h4>
                  <p className="text-xs text-slate-600">
                    Click the "Track Your Order" link in our navigation or footer, enter your Order ID or phone number, and you will see live real-time dispatch updates.
                  </p>
                </div>

                <div className="p-4 rounded-2xl border border-slate-200 bg-slate-50/50">
                  <h4 className="font-bold text-slate-900 flex items-center text-sm mb-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 mr-2 shrink-0" />
                    Are all products authentic and genuine?
                  </h4>
                  <p className="text-xs text-slate-600">
                    All products on LankaBuy undergo rigorous physical quality inspections and seller verification before dispatch to ensure 100% authenticity.
                  </p>
                </div>
              </div>

              {/* Customer Care Box */}
              <div className="p-4 rounded-2xl bg-slate-900 text-white flex flex-col sm:flex-row items-center justify-between gap-3">
                <div>
                  <h5 className="font-bold text-sm text-white">Need personal assistance?</h5>
                  <p className="text-xs text-slate-400">Our Colombo customer support desk is active 7 days a week (8:30 AM - 8:30 PM).</p>
                </div>
                <a
                  href="https://wa.me/94771234567"
                  target="_blank"
                  rel="noreferrer"
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 font-bold text-xs text-white flex items-center space-x-1.5 shrink-0 transition"
                >
                  <Phone className="w-3.5 h-3.5" />
                  <span>WhatsApp Support</span>
                </a>
              </div>
            </div>
          )}

          {/* TAB 2: RETURN & REFUND POLICY */}
          {activeTab === 'returns' && (
            <div className="space-y-4">
              <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 flex items-start space-x-3">
                <RotateCcw className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                <div className="text-xs text-emerald-950">
                  <span className="font-bold block text-emerald-900 text-sm mb-0.5">7-Day Easy Return &amp; Replacement Guarantee</span>
                  If your item arrives damaged, defective, or incorrect, you are eligible for an immediate replacement or full refund within 7 days of delivery.
                </div>
              </div>

              <div className="space-y-3 text-xs">
                <h4 className="font-bold text-sm text-slate-900">Return Eligibility Criteria:</h4>
                <ul className="list-disc list-inside space-y-1.5 text-slate-600 pl-2">
                  <li>Item must be in its original packaging with all accessories, manuals, and tags intact.</li>
                  <li>Proof of purchase (Order ID or invoice SMS) must be provided.</li>
                  <li>Defective electronic items must be reported within 7 days of parcel reception.</li>
                  <li>Intimate apparel, cosmetics, and perishable items are non-returnable once seal is broken for hygiene safety.</li>
                </ul>

                <h4 className="font-bold text-sm text-slate-900 pt-2">How to Request a Return:</h4>
                <ol className="list-decimal list-inside space-y-1.5 text-slate-600 pl-2">
                  <li>Contact our customer support team via WhatsApp or email with your Order ID and photo/video of the defect.</li>
                  <li>Our courier will arrange a free doorstep pickup from your address within 48 hours.</li>
                  <li>Once inspected at our fulfillment center, refunds are credited directly to your bank account or card within 3 - 5 business days.</li>
                </ol>
              </div>
            </div>
          )}

          {/* TAB 3: TERMS & CONDITIONS */}
          {activeTab === 'terms' && (
            <div className="space-y-4 text-xs">
              <div>
                <h4 className="font-bold text-sm text-slate-900 mb-1">1. Agreement to Terms</h4>
                <p className="text-slate-600">
                  By accessing and shopping on LankaBuy (lankabuy.lk), you agree to be bound by these Terms and Conditions and all applicable laws and regulations of the Democratic Socialist Republic of Sri Lanka.
                </p>
              </div>

              <div>
                <h4 className="font-bold text-sm text-slate-900 mb-1">2. Pricing and Availability</h4>
                <p className="text-slate-600">
                  All prices are listed in Sri Lankan Rupees (LKR) and include standard taxes. We strive to maintain accurate inventory levels; in the rare event an item is out of stock after ordering, you will be notified immediately and provided a full refund.
                </p>
              </div>

              <div>
                <h4 className="font-bold text-sm text-slate-900 mb-1">3. Orders and Delivery</h4>
                <p className="text-slate-600">
                  Orders are dispatched via licensed express courier networks across Sri Lanka. Customers must provide an accurate phone number and delivery address to facilitate courier verification.
                </p>
              </div>

              <div>
                <h4 className="font-bold text-sm text-slate-900 mb-1">4. Payment Security</h4>
                <p className="text-slate-600">
                  Card transactions and LankaQR payments are processed securely via PCI-DSS certified payment gateways. LankaBuy does not store card CVV or sensitive banking passwords.
                </p>
              </div>
            </div>
          )}

          {/* TAB 4: PRIVACY POLICY */}
          {activeTab === 'privacy' && (
            <div className="space-y-4 text-xs">
              <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 flex items-start space-x-3">
                <ShieldCheck className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
                <div className="text-xs text-blue-950">
                  <span className="font-bold block text-blue-900 text-sm mb-0.5">Your Privacy is 100% Protected</span>
                  We treat your personal data with utmost confidentiality in accordance with Sri Lankan Data Protection principles.
                </div>
              </div>

              <div>
                <h4 className="font-bold text-sm text-slate-900 mb-1">1. Information We Collect</h4>
                <p className="text-slate-600">
                  We collect only necessary information needed to process and deliver your orders: your name, contact phone number, delivery address, and order transaction history.
                </p>
              </div>

              <div>
                <h4 className="font-bold text-sm text-slate-900 mb-1">2. How We Use Your Information</h4>
                <p className="text-slate-600">
                  Your details are used exclusively to process orders, communicate tracking updates, and provide after-sales customer support. We NEVER sell or rent your personal information to third parties.
                </p>
              </div>

              <div>
                <h4 className="font-bold text-sm text-slate-900 mb-1">3. Data Security</h4>
                <p className="text-slate-600">
                  All customer communications and database records are safeguarded with industry-standard 256-bit SSL encryption on cloud infrastructure.
                </p>
              </div>
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-slate-100 bg-slate-50 flex items-center justify-between text-xs text-slate-500">
          <span>LankaBuy • Colombo, Sri Lanka</span>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-bold transition cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
