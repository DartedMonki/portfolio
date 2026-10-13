import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createMessageRateLimiters, evaluateRateLimitChecks } from '../src/lib/messageRateLimit.ts';

const requestId = 'test-request';
const response = (overrides = {}) => ({
  success: true,
  limit: 5,
  remaining: 4,
  reset: Date.now() + 120_000,
  pending: Promise.resolve(),
  ...overrides,
});

const makeCheck = (bucket, limit) => ({ bucket, key: `test-${bucket}`, limiter: { limit } });

const captureLogs = (t) => {
  const logs = [];
  for (const level of ['info', 'warn', 'error']) {
    t.mock.method(console, level, (message) => logs.push({ level, ...JSON.parse(message) }));
  }
  return logs;
};

test('missing Redis leaves every limiter unconfigured', () => {
  assert.deepEqual(createMessageRateLimiters(undefined), {
    global: undefined,
    delivery: undefined,
    client: undefined,
    ip: undefined,
    network: undefined,
    message: undefined,
  });
});

const expectedLimits = {
  global: { capacity: 20, intervalMs: 180_000 },
  delivery: { capacity: 20, intervalMs: 1_200_000 },
  client: { capacity: 5, intervalMs: 360_000 },
  ip: { capacity: 5, intervalMs: 120_000 },
  network: { capacity: 20, intervalMs: 180_000 },
  message: { capacity: 3, intervalMs: 1_200_000 },
};

for (const [bucket, { capacity, intervalMs }] of Object.entries(expectedLimits)) {
  test(`${bucket} uses the SDK token bucket with the expected capacity and refill`, async (t) => {
    const now = 1_800_000_000_000;
    t.mock.method(Date, 'now', () => now);
    const calls = [];
    const redis = {
      evalsha: async (hash, keys, args) => {
        calls.push({ hash, keys, args });
        return [capacity - 1, now + intervalMs, capacity];
      },
    };
    const limiter = createMessageRateLimiters(redis)[bucket];
    assert.equal(limiter.analytics, undefined);

    const result = await limiter.limit('identifier');
    await result.pending;

    assert.equal(result.success, true);
    assert.equal(result.remaining, capacity - 1);
    assert.equal(result.reset, now + intervalMs);
    assert.equal(calls.length, 1);
    assert.deepEqual(calls[0].keys, [`portfolio:message:token-bucket:v1:${bucket}:identifier`, '']);
    assert.deepEqual(calls[0].args, [capacity, intervalMs, 1, now, 1]);
  });
}

test('successful checks run sequentially with their original identifiers', async () => {
  const calls = [];
  const checks = ['global', 'ip', 'network'].map((bucket) =>
    makeCheck(bucket, async (key) => {
      calls.push(key);
      return response();
    }),
  );
  assert.deepEqual(await evaluateRateLimitChecks(checks, requestId, false), { ok: true });
  assert.deepEqual(calls, ['test-global', 'test-ip', 'test-network']);
});

test('missing configuration fails closed in production but permits local development', async (t) => {
  const logs = captureLogs(t);
  assert.deepEqual(await evaluateRateLimitChecks(undefined, requestId, false), {
    ok: false,
    status: 503,
    error: 'Message service is temporarily unavailable',
    retryAfterSeconds: 60,
  });
  assert.deepEqual(await evaluateRateLimitChecks(undefined, requestId, true), { ok: true });
  assert.equal(logs.length, 1);
  assert.equal(logs[0].event, 'portfolio_message_rate_limiter_not_configured');
});

test('quota exhaustion returns 429 and the next-refill retry time, stopping later checks', async (t) => {
  const logs = captureLogs(t);
  t.mock.method(Date, 'now', () => 10_000);
  let laterCheckCalled = false;
  const checks = [
    makeCheck('ip', async () => response({ success: false, remaining: 0, reset: 12_100 })),
    makeCheck('network', async () => {
      laterCheckCalled = true;
      return response();
    }),
  ];

  const result = await evaluateRateLimitChecks(checks, requestId, false);
  assert.equal(result.status, 429);
  assert.equal(result.bucket, 'ip');
  assert.equal(result.retryAfterSeconds, 3);
  assert.equal(laterCheckCalled, false);
  assert.equal(logs[0].event, 'portfolio_message_rate_limited');
});

test('retry time never becomes zero or negative', async (t) => {
  captureLogs(t);
  const checks = [makeCheck('client', async () => response({ success: false, reset: 0 }))];
  assert.equal((await evaluateRateLimitChecks(checks, requestId, false)).retryAfterSeconds, 1);
});

test('Redis errors return 503 without logging secrets or falsely logging quota exhaustion', async (t) => {
  const logs = captureLogs(t);
  const checks = [
    makeCheck('global', async () => {
      throw new Error('fetch failed https://private-endpoint.example secret-token');
    }),
  ];
  const result = await evaluateRateLimitChecks(checks, requestId, false);
  assert.equal(result.status, 503);
  assert.equal(result.retryAfterSeconds, 60);
  assert.equal(logs.length, 1);
  assert.equal(logs[0].event, 'portfolio_message_rate_limiter_failed');
  assert.equal(JSON.stringify(logs).includes('secret-token'), false);
  assert.equal(JSON.stringify(logs).includes('private-endpoint'), false);
});

test('the SDK successful timeout response still fails closed', async (t) => {
  const logs = captureLogs(t);
  const checks = [
    makeCheck('global', async () =>
      response({ success: true, reason: 'timeout', limit: 0, remaining: 0, reset: 0 }),
    ),
  ];
  assert.equal((await evaluateRateLimitChecks(checks, requestId, false)).status, 503);
  assert.equal(logs[0].event, 'portfolio_message_rate_limiter_failed');
});

test('an analytics failure does not reject an otherwise protected message', async (t) => {
  const logs = captureLogs(t);
  const checks = [
    makeCheck('message', async () =>
      response({ pending: Promise.reject(new Error('analytics unavailable')) }),
    ),
  ];
  assert.deepEqual(await evaluateRateLimitChecks(checks, requestId, false), { ok: true });
  assert.equal(logs[0].event, 'portfolio_message_rate_limiter_analytics_failed');
});

test('analytics completes before the check returns', async () => {
  let analyticsCompleted = false;
  const checks = [
    makeCheck('client', async () =>
      response({
        pending: Promise.resolve().then(() => {
          analyticsCompleted = true;
        }),
      }),
    ),
  ];
  await evaluateRateLimitChecks(checks, requestId, false);
  assert.equal(analyticsCompleted, true);
});
