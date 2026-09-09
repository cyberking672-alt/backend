/**
 * CJ Turbo — High-Speed Layer for CJ Dropshipping
 *
 * Goal: maximum speed WITHOUT changing any business logic / system behaviour.
 * Same API endpoints, same JSON shapes, same price + freight formulas.
 * Only the transport + scheduling underneath gets faster:
 *
 * 1. Keep-Alive: reuse TLS sockets to developers.cjdropshipping.com
 *    (saves ~300-700ms handshake per call from Sri Lanka).
 * 2. Precise 1-QPS throttle: CJ allows 1 query/sec. Old code waited 1600ms
 *    per call (600ms wasted). Turbo waits exactly 1050ms (1000 + 50 safety).
 * 3. Priority queue: checkout-critical calls (weight/details + freight)
 *    jump ahead of bulk catalog list calls, so checkout never waits
 *    behind a 15-call prewarm burst.
 * 4. Timeout + metrics: every live CJ call is capped so UI never hangs;
 *    stats exposed via /api/cj/speed-stats.
 */

import http from 'http';
import https from 'https';

// ---------------------------------------------------------------------------
// 1. Keep-Alive agents (Node http/https global agents). Note: Node's built-in
// fetch (undici) pools/reuses connections by default, so no custom headers
// are needed — and Connection/Keep-Alive headers must NOT be set manually
// (undici throws "invalid keep-alive header").
// ---------------------------------------------------------------------------
let keepAliveEnabled = false;

export function enableCjKeepAlive(): void {
  if (keepAliveEnabled) return;
  keepAliveEnabled = true;
  try {
    (http.globalAgent as any).keepAlive = true;
    (http.globalAgent as any).keepAliveMsecs = 30_000;
    (http.globalAgent as any).maxSockets = 20;
    (http.globalAgent as any).maxFreeSockets = 10;
    (https.globalAgent as any).keepAlive = true;
    (https.globalAgent as any).keepAliveMsecs = 30_000;
    (https.globalAgent as any).maxSockets = 20;
    (https.globalAgent as any).maxFreeSockets = 10;
  } catch {
    /* non-fatal */
  }
}

// Priority lanes (single 1-QPS serial lane, ordered by urgency):
//   high       — checkout-critical: weight/details + freight + quote
//   normal     — user-initiated: product list pages, product detail
//   background — prewarm + cache warmers (run only when no user work waits)
export type CjPriority = 'high' | 'normal' | 'background';

export function cjPriorityRank(p: CjPriority): number {
  if (p === 'high') return 0;
  if (p === 'normal') return 1;
  return 2;
}
export const CJ_TURBO_GAP_MS = 1050;
// User-facing caps: answer instantly from verified formula + warm cache
// in background instead of blocking the UI on slow CJ.
export const CJ_TURBO_FREIGHT_LIVE_CAP_MS = 1500;
export const CJ_TURBO_DETAILS_LIVE_CAP_MS = 5000;
export const CJ_TURBO_LIST_LIVE_CAP_MS = 9000;

// ---------------------------------------------------------------------------
// 2. Telemetry (for /api/cj/speed-stats diagnostics)
// ---------------------------------------------------------------------------
interface TurboStats {
  liveCalls: number;
  liveErrors: number;
  throttledWaits: number;
  totalWaitMs: number;
  totalLiveMs: number;
  highPriority: number;
  lowPriority: number;
  startedAt: number;
}

const stats: TurboStats = {
  liveCalls: 0,
  liveErrors: 0,
  throttledWaits: 0,
  totalWaitMs: 0,
  totalLiveMs: 0,
  highPriority: 0,
  lowPriority: 0,
  startedAt: Date.now(),
};

export function recordTurboWait(waitMs: number): void {
  if (waitMs > 0) {
    stats.throttledWaits++;
    stats.totalWaitMs += waitMs;
  }
}

export function recordTurboLive(ms: number, ok: boolean, high: boolean): void {
  stats.liveCalls++;
  stats.totalLiveMs += ms;
  if (!ok) stats.liveErrors++;
  if (high) stats.highPriority++;
  else stats.lowPriority++;
}

export function getTurboStats() {
  const avgLive = stats.liveCalls > 0 ? Math.round(stats.totalLiveMs / stats.liveCalls) : 0;
  const avgWait = stats.throttledWaits > 0 ? Math.round(stats.totalWaitMs / stats.throttledWaits) : 0;
  return {
    gapMs: CJ_TURBO_GAP_MS,
    freightLiveCapMs: CJ_TURBO_FREIGHT_LIVE_CAP_MS,
    liveCalls: stats.liveCalls,
    liveErrors: stats.liveErrors,
    avgLiveMs: avgLive,
    avgThrottleWaitMs: avgWait,
    highPriorityCalls: stats.highPriority,
    lowPriorityCalls: stats.lowPriority,
    uptimeSec: Math.round((Date.now() - stats.startedAt) / 1000),
    keepAlive: keepAliveEnabled,
  };
}

// ---------------------------------------------------------------------------
// 3. fetch with timeout + keep-alive headers (shared by all CJ calls)
// ---------------------------------------------------------------------------
export async function cjFetchJson(
  url: string,
  init: RequestInit = {},
  timeoutMs = 9000,
  high = true
): Promise<any> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  const t0 = Date.now();
  let ok = true;
  try {
    const res = await fetch(url, {
      ...init,
      signal: ctrl.signal,
      // NOTE: do NOT set Connection/Keep-Alive headers — undici forbids
      // them (throws "invalid keep-alive header"). Undici already reuses
      // TCP/TLS connections from its pool by default (keep-alive on).
      headers: {
        ...(init.headers || {}),
      },
    });
    return await res.json();
  } catch (err) {
    ok = false;
    throw err;
  } finally {
    clearTimeout(timer);
    recordTurboLive(Date.now() - t0, ok, high);
  }
}

/**
 * Race a promise against a timeout. Returns null on timeout instead of
 * throwing, so callers can fall back to the instant verified formula.
 */
export function turboTimeout<T>(p: Promise<T>, ms: number): Promise<T | null> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<null>((resolve) => {
    timer = setTimeout(() => resolve(null), ms);
  });
  return Promise.race([p, timeout]).finally(() => {
    if (timer) clearTimeout(timer);
  });
}
