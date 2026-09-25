import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

// Simple in-memory sliding window rate limiter fallback for local dev/testing
class MemoryRatelimit {
  private requests: Map<string, number[]> = new Map();
  private max: number;
  private windowMs: number;

  constructor(max: number, windowSeconds: number) {
    this.max = max;
    this.windowMs = windowSeconds * 1000;
  }

  async limit(identifier: string): Promise<{ success: boolean; remaining: number }> {
    const now = Date.now();
    const timestamps = (this.requests.get(identifier) || []).filter(t => now - t < this.windowMs);
    if (timestamps.length >= this.max) {
      return { success: false, remaining: 0 };
    }
    timestamps.push(now);
    this.requests.set(identifier, timestamps);
    return { success: true, remaining: this.max - timestamps.length };
  }
}

let authLimiter: { limit: (id: string) => Promise<{ success: boolean }> };
let publicOrderLimiter: { limit: (id: string) => Promise<{ success: boolean }> };
let apiLimiter: { limit: (id: string) => Promise<{ success: boolean }> };

if (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
  const redis = new Redis({
    url: process.env.UPSTASH_REDIS_REST_URL,
    token: process.env.UPSTASH_REDIS_REST_TOKEN,
  });

  authLimiter = new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(10, '1 m'),
  });

  publicOrderLimiter = new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(5, '1 m'),
  });

  apiLimiter = new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(100, '1 m'),
  });
} else {
  // In-memory fallback
  authLimiter = new MemoryRatelimit(10, 60);
  publicOrderLimiter = new MemoryRatelimit(5, 60);
  apiLimiter = new MemoryRatelimit(100, 60);
}

export { authLimiter, publicOrderLimiter, apiLimiter };
