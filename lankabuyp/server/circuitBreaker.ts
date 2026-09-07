/**
 * Production-Grade Circuit Breaker Pattern Implementation
 * Protects LankaBuy platform against downstream supplier (DropX) outages,
 * high latencies, and connection starvation.
 */

export interface CircuitBreakerConfig {
  service: string;
  failureThreshold: number; // e.g. 5 consecutive failures before opening
  recoveryTimeoutMs: number; // e.g. 15000ms cooldown before testing half-open
  successThreshold: number; // e.g. 3 consecutive successes to fully close
  timeoutMs: number; // Max request execution timeout
}

export class CircuitBreaker {
  private state: 'CLOSED' | 'OPEN' | 'HALF_OPEN' = 'CLOSED';
  private failureCount = 0;
  private successCount = 0;
  private lastFailureTime: number | null = null;
  private config: CircuitBreakerConfig;
  private fallbackActive = false;

  constructor(config: Partial<CircuitBreakerConfig> = {}) {
    this.config = {
      service: 'DropX Fulfillment Gateway',
      failureThreshold: 5,
      recoveryTimeoutMs: 20000,
      successThreshold: 3,
      timeoutMs: 4000,
      ...config,
    };
  }

  /**
   * Execute protected external call with circuit breaker guards and timeout
   */
  public async execute<T>(
    action: () => Promise<T>,
    fallback: () => Promise<T>
  ): Promise<{ result: T; fallbackUsed: boolean }> {
    const now = Date.now();

    // Check if OPEN state should transition to HALF_OPEN
    if (this.state === 'OPEN') {
      if (this.lastFailureTime && now - this.lastFailureTime > this.config.recoveryTimeoutMs) {
        console.info(`[Circuit Breaker] Transitioning ${this.config.service} to HALF_OPEN (Probing service health)...`);
        this.state = 'HALF_OPEN';
        this.successCount = 0;
      } else {
        // Circuit is still OPEN -> use graceful fallback immediately without network hit
        this.fallbackActive = true;
        const result = await fallback();
        return { result, fallbackUsed: true };
      }
    }

    try {
      // Enforce strict execution timeout
      const result = await Promise.race([
        action(),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error(`Timeout after ${this.config.timeoutMs}ms on ${this.config.service}`)), this.config.timeoutMs)
        ),
      ]);

      this.onSuccess();
      this.fallbackActive = false;
      return { result, fallbackUsed: false };
    } catch (error: any) {
      this.onFailure(error);
      this.fallbackActive = true;
      const result = await fallback();
      return { result, fallbackUsed: true };
    }
  }

  private onSuccess(): void {
    if (this.state === 'HALF_OPEN') {
      this.successCount++;
      if (this.successCount >= this.config.successThreshold) {
        console.info(`[Circuit Breaker] ${this.config.service} recovered! Transitioning to CLOSED.`);
        this.state = 'CLOSED';
        this.failureCount = 0;
        this.successCount = 0;
      }
    } else {
      this.failureCount = 0;
    }
  }

  private onFailure(error: any): void {
    this.failureCount++;
    this.lastFailureTime = Date.now();
    console.warn(`[Circuit Breaker] Failure on ${this.config.service} (${this.failureCount}/${this.config.failureThreshold}):`, error.message);

    if (this.state === 'HALF_OPEN' || this.failureCount >= this.config.failureThreshold) {
      console.error(`[Circuit Breaker] TRIP ALERT: ${this.config.service} has transitioned to OPEN state. Active fallbacks engaged.`);
      this.state = 'OPEN';
    }
  }

  /**
   * Manually trip or reset circuit breaker (useful for admin testing/maintenance)
   */
  public setState(newState: 'CLOSED' | 'OPEN' | 'HALF_OPEN'): void {
    this.state = newState;
    if (newState === 'CLOSED') {
      this.failureCount = 0;
      this.successCount = 0;
    }
  }

  /**
   * Get operational state and diagnostics
   */
  public getStatus() {
    return {
      service: this.config.service,
      state: this.state,
      failureCount: this.failureCount,
      failureThreshold: this.config.failureThreshold,
      successCount: this.successCount,
      successThreshold: this.config.successThreshold,
      lastFailureTime: this.lastFailureTime,
      recoveryTimeoutMs: this.config.recoveryTimeoutMs,
      fallbackActive: this.state === 'OPEN' || this.fallbackActive,
    };
  }
}

export const supplierCircuitBreaker = new CircuitBreaker();
