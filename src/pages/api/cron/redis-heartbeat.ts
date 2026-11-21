import type { APIRoute } from 'astro';
import { CRON_SECRET } from 'astro:env/server';
import { redis } from '../../../lib/redis';
import { runRedisHeartbeat } from '../../../lib/redisHeartbeat';

export const prerender = false;

export const ALL = (async ({ request, locals }) =>
  runRedisHeartbeat(request, CRON_SECRET, redis, locals.requestId)) satisfies APIRoute;
