import { Product } from '../src/types.ts';
import { dbPool } from './dbPool.ts';

export interface SignalEvent {
  id: string;
  productId: string;
  eventType: 'view' | 'add_to_cart' | 'buy_now' | 'purchase';
  timestamp: number;
  ipHash: string;
}

export interface TrendingMetric {
  productId: string;
  product: Product;
  views24h: number;
  adds24h: number;
  purchases24h: number;
  trendingScore: number;
  lastRecalculated: string;
}

class AnalyticsEngine {
  private events: SignalEvent[] = [];
  private readonly maxEvents = 100000;
  private trendingCache: TrendingMetric[] = [];
  private lastCalculationTime = new Date().toISOString();
  private scheduledJobTimer: NodeJS.Timeout | null = null;
  private initialCalculationTimer: NodeJS.Timeout;

  constructor() {
    // Bootstrap initial calculation after db products are loaded
    this.initialCalculationTimer = setTimeout(() => {
      this.recalculateTrendingScores();
    }, 1500);

    // Scheduled hourly trending recalculation job (Runs every 1 hour)
    this.scheduledJobTimer = setInterval(() => {
      console.info('[Scheduled Job] Running hourly Trending Score recalculation from real on-site signals...');
      this.recalculateTrendingScores();
    }, 60 * 60 * 1000);
  }

  public stop(): void {
    clearTimeout(this.initialCalculationTimer);
    if (this.scheduledJobTimer) clearInterval(this.scheduledJobTimer);
  }

  /**
   * Log real user signal event (view, add to cart, buy now, purchase)
   */
  public logSignal(productId: string, eventType: 'view' | 'add_to_cart' | 'buy_now' | 'purchase', ip?: string) {
    if (!productId) return;

    // Simple IP hash to preserve privacy while enabling unique signal evaluation
    const ipHash = ip ? Buffer.from(ip).toString('base64').substring(0, 10) : 'anon';

    const event: SignalEvent = {
      id: `sig-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      productId,
      eventType,
      timestamp: Date.now(),
      ipHash,
    };

    this.events.push(event);
    if (this.events.length > this.maxEvents) {
      this.events.shift();
    }
  }

  /**
   * Recalculates trending scores based strictly on real on-site signals from the last 24-48 hours.
   * Weighting formula:
   * View = 1 pt, Add to Cart = 4 pts, Buy Now Intent = 8 pts, Verified Purchase = 15 pts
   */
  public recalculateTrendingScores(): TrendingMetric[] {
    const now = Date.now();
    const window24h = now - 24 * 60 * 60 * 1000;
    const window48h = now - 48 * 60 * 60 * 1000;

    // Filter events within 48 hours
    const recentEvents = this.events.filter((e) => e.timestamp >= window48h);

    const metricsByProduct = new Map<
      string,
      { views24h: number; adds24h: number; buys24h: number; purchases24h: number; score: number }
    >();

    for (const event of recentEvents) {
      const is24h = event.timestamp >= window24h;
      const rec = metricsByProduct.get(event.productId) || {
        views24h: 0,
        adds24h: 0,
        buys24h: 0,
        purchases24h: 0,
        score: 0,
      };

      if (event.eventType === 'view') {
        if (is24h) rec.views24h++;
        rec.score += 1.0;
      } else if (event.eventType === 'add_to_cart') {
        if (is24h) rec.adds24h++;
        rec.score += 4.0;
      } else if (event.eventType === 'buy_now') {
        if (is24h) rec.buys24h++;
        rec.score += 8.0;
      } else if (event.eventType === 'purchase') {
        if (is24h) rec.purchases24h++;
        rec.score += 15.0;
      }

      metricsByProduct.set(event.productId, rec);
    }

    const allProducts = dbPool.getAllProducts();
    const computed: TrendingMetric[] = [];

    for (const product of allProducts) {
      const stats = metricsByProduct.get(product.id) || {
        views24h: 0,
        adds24h: 0,
        buys24h: 0,
        purchases24h: 0,
        score: 0,
      };

      // Factor in verified historical sold count as a tie-breaker weight
      const baselineWeight = Math.min(10, Math.log10(Math.max(1, product.soldCount || 1)) * 2);
      const totalScore = Number((stats.score + baselineWeight).toFixed(2));

      computed.push({
        productId: product.id,
        product,
        views24h: stats.views24h,
        adds24h: stats.adds24h,
        purchases24h: stats.purchases24h,
        trendingScore: totalScore,
        lastRecalculated: new Date().toISOString(),
      });
    }

    // Sort descending by real trending score
    computed.sort((a, b) => b.trendingScore - a.trendingScore);

    this.trendingCache = computed;
    this.lastCalculationTime = new Date().toISOString();

    console.info(`[Analytics Engine] Recalculated ${computed.length} product trending scores.`);
    return computed;
  }

  public getTrendingProducts(limit = 10): Product[] {
    if (this.trendingCache.length === 0) {
      this.recalculateTrendingScores();
    }
    return this.trendingCache.slice(0, limit).map((t) => t.product);
  }

  public getTrendingMetrics(limit = 20): TrendingMetric[] {
    if (this.trendingCache.length === 0) {
      this.recalculateTrendingScores();
    }
    return this.trendingCache.slice(0, limit);
  }

  public getStatus() {
    return {
      totalSignalEventsLogged: this.events.length,
      lastRecalculation: this.lastCalculationTime,
      scheduledInterval: '1 Hour',
      topTrendingCount: this.trendingCache.length,
    };
  }
}

export const analyticsEngine = new AnalyticsEngine();
