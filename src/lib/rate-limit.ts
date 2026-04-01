/**
 * Simple in-memory rate limiter for API routes.
 * Uses a sliding window counter per key (typically user ID).
 *
 * Note: This is per-process only. For multi-instance deployments,
 * replace with Redis-backed rate limiting (e.g. @upstash/ratelimit).
 */

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const store = new Map<string, RateLimitEntry>();

// Clean up expired entries periodically to prevent memory leaks
const CLEANUP_INTERVAL = 5 * 60 * 1000; // 5 minutes
let lastCleanup = Date.now();

function cleanup() {
  const now = Date.now();
  if (now - lastCleanup < CLEANUP_INTERVAL) return;
  lastCleanup = now;
  for (const [key, entry] of store) {
    if (now > entry.resetAt) store.delete(key);
  }
}

export interface RateLimitConfig {
  /** Maximum number of requests allowed within the window */
  maxRequests: number;
  /** Time window in milliseconds */
  windowMs: number;
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: number;
}

export function checkRateLimit(key: string, config: RateLimitConfig): RateLimitResult {
  cleanup();
  const now = Date.now();
  const entry = store.get(key);

  if (!entry || now > entry.resetAt) {
    store.set(key, { count: 1, resetAt: now + config.windowMs });
    return { allowed: true, remaining: config.maxRequests - 1, resetAt: now + config.windowMs };
  }

  if (entry.count >= config.maxRequests) {
    return { allowed: false, remaining: 0, resetAt: entry.resetAt };
  }

  entry.count++;
  return { allowed: true, remaining: config.maxRequests - entry.count, resetAt: entry.resetAt };
}

/** Pre-configured limits for common endpoints */
export const RATE_LIMITS = {
  /** AI-powered endpoints (expensive) — 5 requests per 10 minutes */
  ai: { maxRequests: 5, windowMs: 10 * 60 * 1000 } as RateLimitConfig,
  /** File upload endpoints — 10 requests per hour */
  upload: { maxRequests: 10, windowMs: 60 * 60 * 1000 } as RateLimitConfig,
  /** Email sending — 10 per hour */
  email: { maxRequests: 10, windowMs: 60 * 60 * 1000 } as RateLimitConfig,
};
