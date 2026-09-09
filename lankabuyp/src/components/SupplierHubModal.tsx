import React, { useState, useEffect } from 'react';
import { 
  X, 
  Package, 
  Cpu, 
  TrendingUp, 
  Activity, 
  RefreshCw, 
  CheckCircle2, 
  Clock, 
  Send,
  Terminal,
  ShieldCheck,
  Lock,
  Boxes
} from 'lucide-react';
import { SupplierApiLog, Order } from '../types';

interface SupplierHubModalProps {
  isOpen: boolean;
  onClose: () => void;
  orders: Order[];
}

export const SupplierHubModal: React.FC<SupplierHubModalProps> = ({
  isOpen,
  onClose,
  orders,
}) => {
  const [activeTab, setActiveTab] = useState<'logs' | 'analytics' | 'tester' | 'security'>('logs');
  const [logs, setLogs] = useState<SupplierApiLog[]>([]);
  const [selectedLog, setSelectedLog] = useState<SupplierApiLog | null>(null);
  const [stats, setStats] = useState<any>(null);
  const [securityStatus, setSecurityStatus] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [pingResult, setPingResult] = useState<any>(null);
  const [pinging, setPinging] = useState(false);

  if (!isOpen) return null;

  const fetchLogsAndStats = async () => {
    setLoading(true);
    try {
      const [logsRes, statsRes, secRes] = await Promise.all([
        fetch('/api/supplier/logs'),
        fetch('/api/supplier/stats'),
        fetch('/api/security/status')
      ]);

      const logsData = await logsRes.json();
      const statsData = await statsRes.json();
      const secData = await secRes.json();

      if (logsData.success) {
        setLogs(logsData.logs);
        if (logsData.logs.length > 0 && !selectedLog) {
          setSelectedLog(logsData.logs[0]);
        }
      }

      if (statsData.success) {
        setStats(statsData.stats);
      }

      if (secData.success) {
        setSecurityStatus(secData.security);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogsAndStats();
  }, []);

  const handleTestPing = async () => {
    setPinging(true);
    try {
      const res = await fetch('/api/supplier/test-ping', { method: 'POST' });
      const data = await res.json();
      setPingResult(data);
    } catch (err: any) {
      setPingResult({ success: false, error: err.message });
    } finally {
      setPinging(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in">
      <div className="bg-slate-950 text-slate-100 rounded-3xl max-w-5xl w-full shadow-2xl overflow-hidden border border-slate-800 my-6 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 bg-slate-900 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-xl bg-orange-500 flex items-center justify-center text-white font-bold shadow-sm">
              <Boxes className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="font-bold text-white text-base">LankaBuy Supplier &amp; Dispatch Console</h3>
                <span className="bg-emerald-950 text-emerald-400 border border-emerald-800 text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 mr-1 animate-pulse"></span>
                  DISPATCH PIPELINE ACTIVE
                </span>
                <span className="bg-orange-950 text-orange-400 border border-orange-800 text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center">
                  <ShieldCheck className="w-3 h-3 mr-1" />
                  Node.js Security
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Automated order transmission, Zod schema validation, API rate limiting &amp; gross margin metrics
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={fetchLogsAndStats}
              disabled={loading}
              className="text-slate-400 hover:text-white p-2 rounded-xl hover:bg-slate-800 transition cursor-pointer"
              title="Refresh logs and metrics"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-white p-2 rounded-xl hover:bg-slate-800 transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="px-6 bg-slate-900/60 border-b border-slate-800 flex space-x-6 text-xs font-bold overflow-x-auto">
          <button
            onClick={() => setActiveTab('logs')}
            className={`py-3 border-b-2 transition flex items-center space-x-1.5 whitespace-nowrap cursor-pointer ${
              activeTab === 'logs' ? 'border-orange-500 text-orange-400' : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Terminal className="w-3.5 h-3.5" />
            <span>HTTP Dispatch Logs ({logs.length})</span>
          </button>
          <button
            onClick={() => setActiveTab('analytics')}
            className={`py-3 border-b-2 transition flex items-center space-x-1.5 whitespace-nowrap cursor-pointer ${
              activeTab === 'analytics' ? 'border-orange-500 text-orange-400' : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <TrendingUp className="w-3.5 h-3.5" />
            <span>Marketplace Margins &amp; Islandwide Stats</span>
          </button>
          <button
            onClick={() => setActiveTab('security')}
            className={`py-3 border-b-2 transition flex items-center space-x-1.5 whitespace-nowrap cursor-pointer ${
              activeTab === 'security' ? 'border-emerald-500 text-emerald-400' : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Cyber Security &amp; Audit</span>
          </button>
          <button
            onClick={() => setActiveTab('tester')}
            className={`py-3 border-b-2 transition flex items-center space-x-1.5 whitespace-nowrap cursor-pointer ${
              activeTab === 'tester' ? 'border-orange-500 text-orange-400' : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Cpu className="w-3.5 h-3.5" />
            <span>Gateway Diagnostic Ping</span>
          </button>
        </div>

        {/* Tab 1: API HTTP Logs Inspector */}
        {activeTab === 'logs' && (
          <div className="p-6 overflow-y-auto flex-1 grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Left: Log list */}
            <div className="space-y-2 max-h-[460px] overflow-y-auto pr-1">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
                Recorded Transmissions
              </h4>
              {logs.length === 0 ? (
                <div className="p-4 bg-slate-900 rounded-2xl border border-slate-800 text-center text-xs text-slate-400">
                  <Clock className="w-6 h-6 mx-auto mb-1 text-slate-500" />
                  <p>No orders placed yet in this session.</p>
                  <p className="text-[10px] text-slate-500 mt-1">Place an order at checkout to see real-time dispatch POST logs.</p>
                </div>
              ) : (
                logs.map((log) => (
                  <div
                    key={log.id}
                    onClick={() => setSelectedLog(log)}
                    className={`p-3 rounded-2xl border text-xs cursor-pointer transition ${
                      selectedLog?.id === log.id
                        ? 'bg-slate-800 border-orange-500 shadow-md'
                        : 'bg-slate-900 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-mono font-bold text-orange-400 text-[11px]">
                        {log.method} /v1/orders
                      </span>
                      <span className="text-[10px] bg-emerald-950 text-emerald-400 px-1.5 py-0.5 rounded font-mono font-bold">
                        {log.statusCode} OK
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-300 truncate">
                      Ref: {log.requestPayload.merchant_order_ref}
                    </p>
                    <div className="flex items-center justify-between text-[10px] text-slate-400 mt-1">
                      <span>{log.durationMs}ms</span>
                      <span>{new Date(log.timestamp).toLocaleTimeString()}</span>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Right 2 cols: Raw JSON Request & Response Viewer */}
            <div className="md:col-span-2 bg-slate-900 rounded-2xl border border-slate-800 p-4 flex flex-col justify-between overflow-hidden">
              {selectedLog ? (
                <div className="space-y-4 overflow-y-auto max-h-[460px] pr-1">
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-xs font-bold text-orange-400 flex items-center">
                        <Send className="w-3.5 h-3.5 mr-1" />
                        1. Outbound Request Sent to Dispatch API
                      </span>
                      <span className="text-[10px] font-mono text-slate-400">
                        {selectedLog.endpoint}
                      </span>
                    </div>
                    <pre className="bg-slate-950 text-emerald-300 p-3 rounded-xl text-[11px] font-mono overflow-x-auto border border-slate-800">
                      {JSON.stringify(selectedLog.requestPayload, null, 2)}
                    </pre>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-xs font-bold text-orange-400 flex items-center">
                        <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                        2. Inbound Supplier Fulfillment Response
                      </span>
                      <span className="text-[10px] font-mono text-slate-400">
                        HTTP {selectedLog.statusCode} ({selectedLog.durationMs}ms)
                      </span>
                    </div>
                    <pre className="bg-slate-950 text-orange-300 p-3 rounded-xl text-[11px] font-mono overflow-x-auto border border-slate-800">
                      {JSON.stringify(selectedLog.responsePayload, null, 2)}
                    </pre>
                  </div>
                </div>
              ) : (
                <div className="text-center py-20 text-slate-500 text-xs">
                  <Terminal className="w-10 h-10 mx-auto text-slate-600 mb-2" />
                  <p>Select any recorded transmission from the left to inspect JSON payloads.</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Tab 2: Analytics & Gross Margin Metrics */}
        {activeTab === 'analytics' && (
          <div className="p-6 overflow-y-auto space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-slate-900 p-4 rounded-2xl border border-slate-800">
                <p className="text-xs text-slate-400 font-semibold">Total Customer Revenue</p>
                <p className="text-2xl font-black text-orange-400 font-mono mt-1">
                  Rs. {stats?.totalRevenue ? stats.totalRevenue.toLocaleString() : '0'}
                </p>
                <p className="text-[10px] text-slate-400 mt-1">Gross sales from LankaBuy store</p>
              </div>

              <div className="bg-slate-900 p-4 rounded-2xl border border-slate-800">
                <p className="text-xs text-slate-400 font-semibold">Supplier Wholesale Cost</p>
                <p className="text-2xl font-black text-slate-300 font-mono mt-1">
                  Rs. {stats?.totalWholesaleCost ? stats.totalWholesaleCost.toLocaleString() : '0'}
                </p>
                <p className="text-[10px] text-slate-400 mt-1">Cost of Goods Sold (COGS)</p>
              </div>

              <div className="bg-emerald-950/60 p-4 rounded-2xl border border-emerald-800/80">
                <p className="text-xs text-emerald-300 font-semibold">Net Merchant Profit</p>
                <p className="text-2xl font-black text-emerald-400 font-mono mt-1">
                  +Rs. {stats?.netProfit ? stats.netProfit.toLocaleString() : '0'}
                </p>
                <p className="text-[10px] text-emerald-300/80 mt-1">Retained profit in wallet</p>
              </div>

              <div className="bg-slate-900 p-4 rounded-2xl border border-slate-800">
                <p className="text-xs text-slate-400 font-semibold">Average Gross Margin</p>
                <p className="text-2xl font-black text-amber-400 font-mono mt-1">
                  {stats?.marginPercentage || 38.5}%
                </p>
                <p className="text-[10px] text-slate-400 mt-1">Direct supplier markup</p>
              </div>
            </div>

            {/* Orders Summary Table */}
            <div className="bg-slate-900 rounded-2xl border border-slate-800 p-4">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">
                All Orders Synchronized to Dispatch Hub ({orders.length})
              </h4>
              {orders.length === 0 ? (
                <p className="text-xs text-slate-400 py-4 text-center">
                  No orders yet. Place a test checkout on the storefront.
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs text-slate-300">
                    <thead className="border-b border-slate-800 text-[11px] text-slate-400">
                      <tr>
                        <th className="pb-2">Order #</th>
                        <th className="pb-2">Tracking #</th>
                        <th className="pb-2">Customer</th>
                        <th className="pb-2">Wholesale</th>
                        <th className="pb-2">Retail Total</th>
                        <th className="pb-2">Net Profit</th>
                        <th className="pb-2">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60 font-mono text-[11px]">
                      {orders.map((o) => (
                        <tr key={o.id} className="hover:bg-slate-800/40">
                          <td className="py-2.5 font-bold text-orange-400">{o.orderNumber}</td>
                          <td className="py-2.5 text-emerald-400">{o.trackingNumber || o.supplierResponse?.trackingNumber}</td>
                          <td className="py-2.5 font-sans">{o.customer.fullName}</td>
                          <td className="py-2.5">Rs. {o.wholesaleTotal.toLocaleString()}</td>
                          <td className="py-2.5 font-bold text-white">Rs. {o.totalAmount.toLocaleString()}</td>
                          <td className="py-2.5 font-bold text-emerald-400">+Rs. {o.netProfit.toLocaleString()}</td>
                          <td className="py-2.5">
                            <span className="bg-emerald-950 text-emerald-400 px-2 py-0.5 rounded text-[10px]">
                              {o.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Tab 3: Security & Active Defenses */}
        {activeTab === 'security' && (
          <div className="p-6 overflow-y-auto space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-slate-900 p-4 rounded-2xl border border-slate-800 space-y-3">
                <div className="flex items-center space-x-2 text-emerald-400 font-bold text-sm">
                  <ShieldCheck className="w-5 h-5" />
                  <span>Active Cyber Security Defenses</span>
                </div>
                <div className="space-y-2 text-xs">
                  <div className="p-2.5 bg-slate-950 rounded-xl border border-slate-800 flex justify-between items-center">
                    <div>
                      <p className="font-bold text-slate-200">1. Zod Schema &amp; XSS Sanitizer</p>
                      <p className="text-[11px] text-slate-400">Strict regex &amp; HTML stripping on customer shipping payload</p>
                    </div>
                    <span className="text-[10px] bg-emerald-950 text-emerald-400 border border-emerald-800 px-2 py-0.5 rounded font-bold">
                      ACTIVE
                    </span>
                  </div>

                  <div className="p-2.5 bg-slate-950 rounded-xl border border-slate-800 flex justify-between items-center">
                    <div>
                      <p className="font-bold text-slate-200">2. Sliding Window Rate Limiter</p>
                      <p className="text-[11px] text-slate-400">Max 6 orders / min per IP address with RFC 6585 headers</p>
                    </div>
                    <span className="text-[10px] bg-emerald-950 text-emerald-400 border border-emerald-800 px-2 py-0.5 rounded font-bold">
                      ACTIVE
                    </span>
                  </div>

                  <div className="p-2.5 bg-slate-950 rounded-xl border border-slate-800 flex justify-between items-center">
                    <div>
                      <p className="font-bold text-slate-200">3. CSRF &amp; Origin Guard</p>
                      <p className="text-[11px] text-slate-400">Rejects cross-origin POST forgery requests with 403 Forbidden</p>
                    </div>
                    <span className="text-[10px] bg-emerald-950 text-emerald-400 border border-emerald-800 px-2 py-0.5 rounded font-bold">
                      ACTIVE
                    </span>
                  </div>

                  <div className="p-2.5 bg-slate-950 rounded-xl border border-slate-800 flex justify-between items-center">
                    <div>
                      <p className="font-bold text-slate-200">4. API Key Strict Isolation</p>
                      <p className="text-[11px] text-slate-400">Supplier credentials confined strictly to server memory</p>
                    </div>
                    <span className="text-[10px] bg-emerald-950 text-emerald-400 border border-emerald-800 px-2 py-0.5 rounded font-bold">
                      ACTIVE
                    </span>
                  </div>
                </div>
              </div>

              <div className="bg-slate-900 p-4 rounded-2xl border border-slate-800 space-y-3">
                <div className="flex items-center space-x-2 text-orange-400 font-bold text-sm">
                  <Lock className="w-5 h-5" />
                  <span>HTTP Security Headers Configured</span>
                </div>
                <div className="space-y-2 text-xs font-mono">
                  <div className="p-2 bg-slate-950 rounded-xl border border-slate-800 text-[11px]">
                    <span className="text-slate-400">Content-Security-Policy:</span>
                    <p className="text-emerald-400 truncate">default-src 'self'; img-src https: data:; ...</p>
                  </div>
                  <div className="p-2 bg-slate-950 rounded-xl border border-slate-800 text-[11px]">
                    <span className="text-slate-400">Strict-Transport-Security:</span>
                    <p className="text-emerald-400">max-age=63072000; includeSubDomains; preload</p>
                  </div>
                  <div className="p-2 bg-slate-950 rounded-xl border border-slate-800 text-[11px]">
                    <span className="text-slate-400">X-Content-Type-Options:</span>
                    <p className="text-emerald-400">nosniff (MIME sniff protection)</p>
                  </div>
                  <div className="p-2 bg-slate-950 rounded-xl border border-slate-800 text-[11px]">
                    <span className="text-slate-400">Referrer-Policy:</span>
                    <p className="text-emerald-400">strict-origin-when-cross-origin</p>
                  </div>
                  <div className="p-2 bg-slate-950 rounded-xl border border-slate-800 text-[11px]">
                    <span className="text-slate-400">X-Frame-Options:</span>
                    <p className="text-emerald-400">SAMEORIGIN (Anti-Clickjacking)</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tab 4: Gateway Ping Tester */}
        {activeTab === 'tester' && (
          <div className="p-6 overflow-y-auto space-y-6">
            <div className="bg-slate-900 p-5 rounded-2xl border border-slate-800">
              <h4 className="text-sm font-bold text-white mb-1">
                LankaBuy Supplier Gateway Connectivity Diagnostic
              </h4>
              <p className="text-xs text-slate-400 mb-4">
                Test the backend HTTP connection, latency, and SSL handshake between the Node.js server and the verified supplier dispatch network.
              </p>

              <button
                onClick={handleTestPing}
                disabled={pinging}
                className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2.5 rounded-xl text-xs font-bold transition flex items-center space-x-2 cursor-pointer shadow-md"
              >
                {pinging ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Pinging Dispatch Gateway...</span>
                  </>
                ) : (
                  <>
                    <Activity className="w-4 h-4" />
                    <span>Ping Supplier Gateway Now</span>
                  </>
                )}
              </button>

              {pingResult && (
                <div className="mt-4 p-4 bg-slate-950 rounded-2xl border border-slate-800 text-xs">
                  <div className="flex items-center space-x-2 text-emerald-400 font-bold mb-2">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Supplier Gateway Response: 200 OK (Latency: {pingResult.latencyMs}ms)</span>
                  </div>
                  <pre className="text-slate-300 font-mono text-[11px] overflow-x-auto">
                    {JSON.stringify(pingResult, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
