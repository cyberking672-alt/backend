import crypto from 'crypto';

export interface AuditLogEntry {
  id: string;
  timestamp: string;
  category: 'ADMIN_ACTION' | 'PAYMENT_EVENT' | 'SECURITY_EVENT';
  actor: string;
  action: string;
  target?: string;
  ipAddress?: string;
  correlationId?: string;
  status: 'SUCCESS' | 'FAILURE' | 'REJECTED';
  details: Record<string, any>;
}

class AuditLogger {
  private logs: AuditLogEntry[] = [];
  private readonly maxEntries = 1000;

  /**
   * Masks email address to prevent logging raw PII / admin credentials in backend
   */
  private maskEmail(email?: string): string {
    if (!email || typeof email !== 'string') return '[ANONYMIZED_ADMIN]';
    const parts = email.split('@');
    if (parts.length !== 2) return '[PROTECTED_EMAIL]';
    const user = parts[0];
    const domain = parts[1];
    const maskedUser = user.length > 2 ? `${user[0]}***${user[user.length - 1]}` : `${user[0]}***`;
    return `${maskedUser}@${domain}`;
  }

  /**
   * Sanitizes objects to prevent logging passwords, card numbers, secret tokens, or raw emails
   */
  private sanitizeData(obj: any): any {
    if (!obj || typeof obj !== 'object') return obj;

    const sanitized: Record<string, any> = Array.isArray(obj) ? [] : {};
    const sensitiveKeys = [
      'password',
      'passkey',
      'token',
      'secret',
      'cardNumber',
      'cvv',
      'cvc',
      'authorization',
      'cookie',
      'key',
      'email',
      'adminEmail',
      'actorEmail',
    ];

    for (const [key, value] of Object.entries(obj)) {
      const lowerKey = key.toLowerCase();
      const isSensitive = sensitiveKeys.some((s) => lowerKey.includes(s));

      if (isSensitive) {
        if (typeof value === 'string' && value.includes('@')) {
          sanitized[key] = this.maskEmail(value);
        } else {
          sanitized[key] = '[REDACTED_FOR_SECURITY]';
        }
      } else if (typeof value === 'object' && value !== null) {
        sanitized[key] = this.sanitizeData(value);
      } else {
        sanitized[key] = value;
      }
    }

    return sanitized;
  }

  public logAdminAction(params: {
    actorEmail: string;
    action: string;
    target?: string;
    details?: Record<string, any>;
    ipAddress?: string;
    correlationId?: string;
    status?: 'SUCCESS' | 'FAILURE' | 'REJECTED';
  }): AuditLogEntry {
    const maskedActor = this.maskEmail(params.actorEmail);
    const entry: AuditLogEntry = {
      id: `audit-adm-${Date.now()}-${crypto.randomBytes(3).toString('hex')}`,
      timestamp: new Date().toISOString(),
      category: 'ADMIN_ACTION',
      actor: maskedActor,
      action: params.action,
      target: params.target,
      ipAddress: params.ipAddress,
      correlationId: params.correlationId,
      status: params.status || 'SUCCESS',
      details: this.sanitizeData(params.details || {}),
    };

    this.logs.unshift(entry);
    if (this.logs.length > this.maxEntries) this.logs.pop();

    console.info(`[AUDIT::ADMIN] [${entry.status}] [PROTECTED_ACTOR] -> ${entry.action} (${entry.target || 'system'})`);
    return entry;
  }

  public logPaymentEvent(params: {
    orderId: string;
    orderNumber?: string;
    amount?: number;
    currency?: string;
    paymentMethod: string;
    provider: string;
    action: string;
    details?: Record<string, any>;
    ipAddress?: string;
    correlationId?: string;
    status: 'SUCCESS' | 'FAILURE' | 'REJECTED';
  }): AuditLogEntry {
    const entry: AuditLogEntry = {
      id: `audit-pay-${Date.now()}-${crypto.randomBytes(3).toString('hex')}`,
      timestamp: new Date().toISOString(),
      category: 'PAYMENT_EVENT',
      actor: `customer_order:${params.orderNumber || params.orderId}`,
      action: params.action,
      target: params.orderId,
      ipAddress: params.ipAddress,
      correlationId: params.correlationId,
      status: params.status,
      details: this.sanitizeData({
        amount: params.amount,
        currency: params.currency || 'LKR',
        paymentMethod: params.paymentMethod,
        provider: params.provider,
        ...params.details,
      }),
    };

    this.logs.unshift(entry);
    if (this.logs.length > this.maxEntries) this.logs.pop();

    console.info(`[AUDIT::PAYMENT] [${entry.status}] Order #${params.orderNumber || params.orderId} - ${params.action} via ${params.provider}`);
    return entry;
  }

  public getLogs(limit = 100, category?: string): AuditLogEntry[] {
    if (category) {
      return this.logs.filter((l) => l.category === category).slice(0, limit);
    }
    return this.logs.slice(0, limit);
  }
}

export const auditLogger = new AuditLogger();
