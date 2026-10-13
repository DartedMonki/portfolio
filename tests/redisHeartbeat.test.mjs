import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';
import { runRedisHeartbeat } from '../src/lib/redisHeartbeat.ts';

const secret = 'test-only-cron-secret-at-least-16-characters';
const requestId = 'test-cron-request';
const makeRequest = (authorization = `Bearer ${secret}`, method = 'GET') =>
  new Request('https://portfolio.example/api/cron/redis-heartbeat', {
    method,
    headers: authorization ? { Authorization: authorization } : undefined,
  });

const captureLogs = (t) => {
  const logs = [];
  for (const level of ['info', 'warn', 'error']) {
    t.mock.method(console, level, (message) => logs.push({ level, ...JSON.parse(message) }));
  }
  return logs;
};

for (const authorization of [
  undefined,
  'Bearer wrong-secret',
  'Basic invalid',
  `Bearer ${secret}x`,
]) {
  test(`rejects unauthorized header ${authorization || '(missing)'}`, async (t) => {
    const logs = captureLogs(t);
    let wroteToRedis = false;
    const redis = {
      set: async () => {
        wroteToRedis = true;
        return 'OK';
      },
    };
    const request = authorization ? makeRequest(authorization) : makeRequest('');
    const result = await runRedisHeartbeat(request, secret, redis, requestId);
    assert.equal(result.status, 401);
    assert.equal(wroteToRedis, false);
    assert.equal(result.headers.get('Cache-Control'), 'no-store');
    assert.equal(logs[0].event, 'portfolio_redis_heartbeat_rejected');
    assert.equal(logs[0].status, 401);
  });
}

for (const configuredSecret of [undefined, '', 'short', '                ']) {
  test(`fails closed for invalid configured secret ${JSON.stringify(configuredSecret)}`, async (t) => {
    captureLogs(t);
    const result = await runRedisHeartbeat(makeRequest(), configuredSecret, undefined, requestId);
    assert.equal(result.status, 401);
  });
}

test('rejects non-GET methods before accessing Redis', async (t) => {
  captureLogs(t);
  const result = await runRedisHeartbeat(
    makeRequest(undefined, 'POST'),
    secret,
    undefined,
    requestId,
  );
  assert.equal(result.status, 405);
  assert.equal(result.headers.get('Allow'), 'GET');
});

test('authenticated request with missing Redis reports service unavailable', async (t) => {
  const logs = captureLogs(t);
  const result = await runRedisHeartbeat(makeRequest(), secret, undefined, requestId);
  assert.equal(result.status, 503);
  assert.equal(logs[0].event, 'portfolio_redis_heartbeat_not_configured');
});

test('writes only one expiring maintenance key and tolerates repeated invocations', async (t) => {
  const logs = captureLogs(t);
  const calls = [];
  const redis = {
    set: async (...args) => {
      calls.push(args);
      return 'OK';
    },
  };
  for (let run = 0; run < 2; run++) {
    const result = await runRedisHeartbeat(makeRequest(), secret, redis, requestId);
    assert.equal(result.status, 200);
    assert.deepEqual(await result.json(), { ok: true });
    assert.equal(result.headers.get('Cache-Control'), 'no-store');
    assert.equal(result.headers.get('X-Robots-Tag'), 'noindex');
  }
  assert.equal(calls.length, 2);
  for (const [key, value, options] of calls) {
    assert.equal(key, 'portfolio:maintenance:redis-heartbeat');
    assert.equal(new Date(value).toISOString(), value);
    assert.deepEqual(options, { ex: 604_800 });
    assert.equal(key.includes('portfolio:message:'), false);
  }
  assert.equal(
    logs.every((log) => log.event === 'portfolio_redis_heartbeat_ok'),
    true,
  );
});

test('Redis errors are logged without secrets and returned as 503', async (t) => {
  const logs = captureLogs(t);
  const redis = {
    set: async () => {
      throw new Error('redis failure with secret-token');
    },
  };
  const result = await runRedisHeartbeat(makeRequest(), secret, redis, requestId);
  assert.equal(result.status, 503);
  assert.deepEqual(await result.json(), { ok: false, error: 'Service unavailable' });
  assert.equal(logs[0].event, 'portfolio_redis_heartbeat_failed');
  assert.equal(JSON.stringify(logs).includes('secret-token'), false);
});

test('does not report success when Redis does not acknowledge the write', async (t) => {
  captureLogs(t);
  const result = await runRedisHeartbeat(
    makeRequest(),
    secret,
    { set: async () => null },
    requestId,
  );
  assert.equal(result.status, 503);
});

test('Vercel schedules the heartbeat daily at a Hobby-compatible frequency', async () => {
  const config = JSON.parse(await readFile(new URL('../vercel.json', import.meta.url), 'utf8'));
  assert.deepEqual(config.crons, [{ path: '/api/cron/redis-heartbeat', schedule: '0 0 * * *' }]);
});
