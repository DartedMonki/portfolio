import { timingSafeEqual } from 'node:crypto';
import type { Redis } from '@upstash/redis';
import { getRedisErrorDetails } from './redisError.ts';

const HEARTBEAT_KEY = 'portfolio:maintenance:redis-heartbeat';
const HEARTBEAT_TTL_SECONDS = 7 * 24 * 60 * 60;

const jsonResponse = (body: { ok: boolean; error?: string }, status: number) =>
  Response.json(body, {
    status,
    headers: {
      'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff',
      'X-Robots-Tag': 'noindex',
    },
  });

const isAuthorized = (request: Request, secret: string | undefined) => {
  if (!secret || secret.trim().length < 16) return false;

  const actual = Buffer.from(request.headers.get('authorization') || '');
  const expected = Buffer.from(`Bearer ${secret}`);
  return actual.length === expected.length && timingSafeEqual(actual, expected);
};

export const runRedisHeartbeat = async (
  request: Request,
  secret: string | undefined,
  redis: Pick<Redis, 'set'> | undefined,
  requestId: string,
) => {
  if (request.method !== 'GET') {
    console.warn(
      JSON.stringify({
        event: 'portfolio_redis_heartbeat_rejected',
        requestId,
        status: 405,
        reason: 'method_not_allowed',
      }),
    );
    const response = jsonResponse({ ok: false, error: 'Method not allowed' }, 405);
    response.headers.set('Allow', 'GET');
    return response;
  }

  if (!isAuthorized(request, secret)) {
    console.warn(
      JSON.stringify({
        event: 'portfolio_redis_heartbeat_rejected',
        requestId,
        status: 401,
        reason: secret ? 'unauthorized' : 'missing_cron_secret',
      }),
    );
    return jsonResponse({ ok: false, error: 'Unauthorized' }, 401);
  }

  if (!redis) {
    console.error(JSON.stringify({ event: 'portfolio_redis_heartbeat_not_configured', requestId }));
    return jsonResponse({ ok: false, error: 'Service unavailable' }, 503);
  }

  const startedAt = Date.now();
  try {
    const result = await redis.set(HEARTBEAT_KEY, new Date().toISOString(), {
      ex: HEARTBEAT_TTL_SECONDS,
    });
    if (result !== 'OK') throw new Error('Heartbeat write failed');

    console.info(
      JSON.stringify({
        event: 'portfolio_redis_heartbeat_ok',
        requestId,
        status: 200,
        durationMs: Date.now() - startedAt,
      }),
    );
    return jsonResponse({ ok: true }, 200);
  } catch (error) {
    console.error(
      JSON.stringify({
        event: 'portfolio_redis_heartbeat_failed',
        requestId,
        status: 503,
        durationMs: Date.now() - startedAt,
        ...getRedisErrorDetails(error),
      }),
    );
    return jsonResponse({ ok: false, error: 'Service unavailable' }, 503);
  }
};
