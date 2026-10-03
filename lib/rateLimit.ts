import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

// In-memory sliding window rate limiter fallback
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

function createSafeLimiter(
  primary: { limit: (id: string) => Promise<{ success: boolean }> } | null,
  fallback: MemoryRatelimit
) {
  return {
    async limit(id: string): Promise<{ success: boolean }> {
      if (primary) {
        try {
          return await primary.limit(id);
        } catch (err) {
          console.warn('Redis rate limiter encountered error, falling back to memory limiter:', err);
          return await fallback.limit(id);
        }
      }
      return await fallback.limit(id);
    },
  };
}

let authLimiter: { limit: (id: string) => Promise<{ success: boolean }> };
let publicOrderLimiter: { limit: (id: string) => Promise<{ success: boolean }> };
let apiLimiter: { limit: (id: string) => Promise<{ success: boolean }> };

const memoryAuth = new MemoryRatelimit(10, 60);
const memoryOrder = new MemoryRatelimit(20, 60);
const memoryApi = new MemoryRatelimit(100, 60);

if (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
  try {
    const redis = new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL,
      token: process.env.UPSTASH_REDIS_REST_TOKEN,
    });

    const upstashAuth = new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(10, '1 m'),
    });

    const upstashOrder = new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(20, '1 m'),
    });

    const upstashApi = new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(100, '1 m'),
    });

    authLimiter = createSafeLimiter(upstashAuth, memoryAuth);
    publicOrderLimiter = createSafeLimiter(upstashOrder, memoryOrder);
    apiLimiter = createSafeLimiter(upstashApi, memoryApi);
  } catch {
    authLimiter = createSafeLimiter(null, memoryAuth);
    publicOrderLimiter = createSafeLimiter(null, memoryOrder);
    apiLimiter = createSafeLimiter(null, memoryApi);
  }
} else {
  authLimiter = createSafeLimiter(null, memoryAuth);
  publicOrderLimiter = createSafeLimiter(null, memoryOrder);
  apiLimiter = createSafeLimiter(null, memoryApi);
}

export function getClientIp(req: Request): string {
  const realIp = req.headers.get('x-real-ip') || req.headers.get('cf-connecting-ip');
  if (realIp) return realIp.trim();

  const forwarded = req.headers.get('x-forwarded-for');
  if (forwarded) {
    const first = forwarded.split(',')[0].trim();
    if (first) return first;
  }

  return '127.0.0.1';
}

export { authLimiter, publicOrderLimiter, apiLimiter };
