import type { APIRoute } from 'astro';
import { CRON_SECRET } from 'astro:env/server';
import { redis } from '../../../lib/redis';
import { runRedisHeartbeat } from '../../../lib/redisHeartbeat';
import { getRequestId } from '../../../lib/request';

export const prerender = false;

export const ALL = (async ({ request }) =>
  runRedisHeartbeat(request, CRON_SECRET, redis, getRequestId(request))) satisfies APIRoute;
