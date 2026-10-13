import { Redis } from '@upstash/redis';
import { UPSTASH_REDIS_REST_TOKEN, UPSTASH_REDIS_REST_URL } from 'astro:env/server';

const url = UPSTASH_REDIS_REST_URL?.trim();
const token = UPSTASH_REDIS_REST_TOKEN?.trim();

export const redis =
  url && token
    ? new Redis({
        url,
        token,
        signal: () => AbortSignal.timeout(5000),
      })
    : undefined;
