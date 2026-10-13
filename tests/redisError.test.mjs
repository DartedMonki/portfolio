import assert from 'node:assert/strict';
import { test } from 'node:test';
import { getRedisErrorDetails } from '../src/lib/redisError.ts';

test('retains a safe network error code for diagnosis', () => {
  assert.deepEqual(
    getRedisErrorDetails(new Error('fetch failed', { cause: { code: 'ENOTFOUND' } })),
    { error: 'fetch failed', causeCode: 'ENOTFOUND' },
  );
});

test('retains the known limiter timeout message', () => {
  assert.deepEqual(getRedisErrorDetails(new Error('Rate limiter timed out')), {
    error: 'Rate limiter timed out',
  });
});

test('redacts arbitrary error messages and malformed cause codes', () => {
  assert.deepEqual(
    getRedisErrorDetails(
      new Error('secret-token https://private-endpoint.example', {
        cause: { code: 'secret-token' },
      }),
    ),
    { error: 'Redis request failed' },
  );
  assert.deepEqual(getRedisErrorDetails('secret-token'), { error: 'Redis request failed' });
});
