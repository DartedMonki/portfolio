import { Ratelimit } from '@upstash/ratelimit';
import type { Redis } from '@upstash/redis';
import { getRedisErrorDetails } from './redisError.ts';

export const SERVICE_UNAVAILABLE_RETRY_AFTER_SECONDS = 60;

export const MESSAGE_RATE_LIMITS = {
  global: { capacity: 20, refillInterval: '3 m' },
  delivery: { capacity: 20, refillInterval: '20 m' },
  client: { capacity: 5, refillInterval: '6 m' },
  ip: { capacity: 5, refillInterval: '2 m' },
  network: { capacity: 20, refillInterval: '3 m' },
  message: { capacity: 3, refillInterval: '20 m' },
} as const;

export type RateLimitBucket = keyof typeof MESSAGE_RATE_LIMITS;

export interface RateLimitCheck {
  bucket: RateLimitBucket;
  key: string;
  limiter: Pick<Ratelimit, 'limit'>;
}

export interface RateLimitDecision {
  ok: boolean;
  status?: number;
  error?: string;
  retryAfterSeconds?: number;
  bucket?: RateLimitBucket;
}

export const createMessageRateLimiters = (redis: Redis | undefined) => {
  const createLimiter = (bucket: RateLimitBucket) => {
    if (!redis) return undefined;

    const { capacity, refillInterval } = MESSAGE_RATE_LIMITS[bucket];
    return new Ratelimit({
      redis,
      limiter: Ratelimit.tokenBucket(1, refillInterval, capacity),
      analytics: false,
      // Token buckets use Redis hashes; keep them separate from old window counters.
      prefix: `portfolio:message:token-bucket:v1:${bucket}`,
    });
  };

  return {
    global: createLimiter('global'),
    delivery: createLimiter('delivery'),
    client: createLimiter('client'),
    ip: createLimiter('ip'),
    network: createLimiter('network'),
    message: createLimiter('message'),
  };
};

const serviceUnavailable = (): RateLimitDecision => ({
  ok: false,
  status: 503,
  error: 'Message service is temporarily unavailable',
  retryAfterSeconds: SERVICE_UNAVAILABLE_RETRY_AFTER_SECONDS,
});

export const evaluateRateLimitChecks = async (
  checks: RateLimitCheck[] | undefined,
  requestId: string,
  isDevelopment: boolean,
): Promise<RateLimitDecision> => {
  if (!checks) {
    if (isDevelopment) return { ok: true };

    console.error(
      JSON.stringify({ event: 'portfolio_message_rate_limiter_not_configured', requestId }),
    );
    return serviceUnavailable();
  }

  for (const check of checks) {
    const startedAt = Date.now();
    try {
      const result = await check.limiter.limit(check.key);
      // Upstash's default timeout response is successful, but our endpoint must fail closed.
      if (result.reason === 'timeout') throw new Error('Rate limiter timed out');

      await result.pending.catch(() => {
        console.warn(
          JSON.stringify({
            event: 'portfolio_message_rate_limiter_analytics_failed',
            requestId,
            bucket: check.bucket,
          }),
        );
      });

      if (!result.success) {
        const retryAfterSeconds = Math.max(1, Math.ceil((result.reset - Date.now()) / 1000));
        console.info(
          JSON.stringify({
            event: 'portfolio_message_rate_limited',
            requestId,
            bucket: check.bucket,
            retryAfterSeconds,
          }),
        );
        return {
          ok: false,
          status: 429,
          error: 'Too many messages. Please try again later.',
          retryAfterSeconds,
          bucket: check.bucket,
        };
      }
    } catch (error) {
      console.error(
        JSON.stringify({
          event: 'portfolio_message_rate_limiter_failed',
          requestId,
          bucket: check.bucket,
          durationMs: Date.now() - startedAt,
          ...getRedisErrorDetails(error),
        }),
      );
      return serviceUnavailable();
    }
  }

  return { ok: true };
};
