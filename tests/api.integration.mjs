import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { createServer } from 'node:http';
import { setTimeout as delay } from 'node:timers/promises';
import { fileURLToPath } from 'node:url';
import { after, before, test } from 'node:test';

const root = fileURLToPath(new URL('../', import.meta.url));
const cronSecret = 'integration-test-secret-at-least-16-characters';
const redisCommands = [];
let redisMode = 'healthy';
let baseUrl;
let astroProcess;
let astroOutput = '';
let mockRedis;

const executeRedisCommand = (command) => {
  redisCommands.push(command);
  const name = String(command[0]).toUpperCase();
  if (name === 'EVALSHA' || name === 'EVAL') {
    if (redisMode === 'unavailable') return { error: 'Test Redis unavailable' };
    const args = command.slice(3 + Number(command[2]));
    const [capacity, intervalMs, , now] = args.map(Number);
    const exhausted =
      redisMode === 'exhausted' ||
      (redisMode === 'delivery-exhausted' &&
        String(command[3]).startsWith('portfolio:message:token-bucket:v1:delivery:'));
    const remaining = exhausted ? -1 : capacity - 1;
    return { result: [remaining, now + intervalMs, capacity] };
  }
  return { result: name === 'SET' ? 'OK' : 1 };
};

before(async () => {
  mockRedis = createServer(async (request, response) => {
    const chunks = [];
    for await (const chunk of request) chunks.push(chunk);
    const command = JSON.parse(Buffer.concat(chunks).toString());
    const isBatch = request.url === '/pipeline' || request.url === '/multi-exec';
    const result = isBatch ? command.map(executeRedisCommand) : executeRedisCommand(command);
    response.writeHead(200, { 'Content-Type': 'application/json' });
    response.end(JSON.stringify(result));
  });
  mockRedis.listen(0, '127.0.0.1');
  await once(mockRedis, 'listening');

  const reservation = createServer();
  reservation.listen(0, '127.0.0.1');
  await once(reservation, 'listening');
  const port = reservation.address().port;
  await new Promise((resolve) => reservation.close(resolve));
  baseUrl = `http://127.0.0.1:${port}`;

  astroProcess = spawn(
    process.execPath,
    [
      '--import',
      fileURLToPath(new URL('./helpers/mockContactProviders.mjs', import.meta.url)),
      fileURLToPath(new URL('../node_modules/astro/bin/astro.mjs', import.meta.url)),
      'dev',
      '--ignore-lock',
      '--host',
      '127.0.0.1',
      '--port',
      String(port),
    ],
    {
      cwd: root,
      env: {
        ...process.env,
        ASTRO_TELEMETRY_DISABLED: '1',
        VERCEL: '',
        CONTACT_ALLOWED_ORIGIN: baseUrl,
        CONTACT_EMAIL_FROM: 'test@example.com',
        CONTACT_EMAIL_TO: 'test@example.com',
        CONTACT_MAX_MESSAGE_LENGTH: '1000',
        CRON_SECRET: cronSecret,
        DISCORD_WEBHOOK_URL: '',
        PUBLIC_TURNSTILE_SITE_KEY: '',
        RESEND_API_KEY: 'test-only-api-key',
        TELEGRAM_BOT_TOKEN: '',
        TELEGRAM_CHAT_ID: '',
        TURNSTILE_SECRET_KEY: 'test-only-turnstile-secret',
        UPSTASH_REDIS_REST_URL: `http://127.0.0.1:${mockRedis.address().port}`,
        UPSTASH_REDIS_REST_TOKEN: 'test-only-redis-token',
      },
      stdio: ['ignore', 'pipe', 'pipe'],
    },
  );
  for (const stream of [astroProcess.stdout, astroProcess.stderr]) {
    stream.on('data', (chunk) => {
      astroOutput += chunk.toString();
    });
  }

  const deadline = Date.now() + 30_000;
  while (Date.now() < deadline) {
    if (astroProcess.exitCode !== null) throw new Error(`Astro exited:\n${astroOutput}`);
    try {
      const response = await fetch(`${baseUrl}/api/ip`);
      if (response.status === 200) return;
    } catch {
      // The dev server may not have bound its port yet.
    }
    await delay(100);
  }
  throw new Error(`Astro failed to start:\n${astroOutput}`);
});

after(async () => {
  if (astroProcess && astroProcess.exitCode === null) {
    const exited = once(astroProcess, 'exit');
    astroProcess.kill('SIGTERM');
    const timer = setTimeout(() => astroProcess.kill('SIGKILL'), 5000);
    timer.unref();
    await exited;
    clearTimeout(timer);
  }
  if (mockRedis) {
    mockRedis.closeAllConnections();
    await new Promise((resolve) => mockRedis.close(resolve));
  }
});

const postMessage = (body, headers = {}) =>
  fetch(`${baseUrl}/api/message`, {
    method: 'POST',
    headers: { Origin: baseUrl, 'Content-Type': 'application/json', ...headers },
    body: JSON.stringify(body),
  });

for (const [path, language] of [
  ['/', 'en'],
  ['/id/', 'id'],
]) {
  test(`request middleware preserves prerendered page ${path}`, async () => {
    const response = await fetch(`${baseUrl}${path}`);
    assert.equal(response.status, 200, astroOutput);
    assert.match(await response.text(), new RegExp(`lang="${language}"`));
    assert.notEqual(response.headers.get('Cache-Control'), 'no-store');
    assert.equal(response.headers.get('X-Request-Id'), null);
  });
}

test('HEAD requests to the home page retain their normal 200 response', async () => {
  const response = await fetch(`${baseUrl}/`, { method: 'HEAD' });
  assert.equal(response.status, 200, astroOutput);
  assert.equal(await response.text(), '');
});

test('request middleware preserves IP responses and consistent request IDs', async () => {
  const response = await fetch(`${baseUrl}/api/ip`, {
    headers: { 'X-Request-Id': 'integration-ip-request' },
  });
  assert.equal(response.status, 200);
  assert.equal(response.headers.get('X-Request-Id'), 'integration-ip-request');
  assert.equal(response.headers.get('Cache-Control'), 'no-store');
  assert.equal(response.headers.get('X-Content-Type-Options'), 'nosniff');
  assert.equal(typeof (await response.json()).ipAddress, 'string');
});

test('unsupported message methods retain the 405 and Allow contract', async () => {
  const response = await fetch(`${baseUrl}/api/message`);
  assert.equal(response.status, 405);
  assert.equal(response.headers.get('Allow'), 'POST, OPTIONS');
});

test('valid CORS preflights still succeed without contacting Redis', async () => {
  const before = redisCommands.length;
  const response = await fetch(`${baseUrl}/api/message`, {
    method: 'OPTIONS',
    headers: {
      Origin: baseUrl,
      'Access-Control-Request-Method': 'POST',
      'Access-Control-Request-Headers': 'content-type',
    },
  });
  assert.equal(response.status, 204);
  assert.equal(response.headers.get('Access-Control-Allow-Origin'), baseUrl);
  assert.equal(redisCommands.length, before);
});

test('forbidden origins are rejected before contacting Redis', async () => {
  const before = redisCommands.length;
  const response = await postMessage({ message: 'test' }, { Origin: 'https://unapproved.example' });
  assert.equal(response.status, 403);
  assert.equal(redisCommands.length, before);
});

test('verified messages pass all six token buckets and deliver through the mock provider', async () => {
  redisCommands.length = 0;
  const response = await postMessage(
    { message: 'Integration test message', turnstileToken: 'test-valid-token' },
    { 'X-Request-Id': 'integration-message-request' },
  );
  assert.equal(response.status, 200, astroOutput);
  assert.deepEqual(await response.json(), { ok: true, deliveryStatus: 'delivered' });
  assert.equal(response.headers.get('X-Request-Id'), 'integration-message-request');
  assert.match(response.headers.get('Set-Cookie'), /HttpOnly; Secure; SameSite=Strict/);
  const calls = redisCommands.filter((command) => String(command[0]).toUpperCase() === 'EVALSHA');
  assert.deepEqual(
    calls.map((command) => String(command[3]).split(':')[4]),
    ['global', 'ip', 'network', 'client', 'message', 'delivery'],
  );
});

test('body validation still runs before verified-client and message checks', async () => {
  const response = await postMessage({ message: 'x'.repeat(1001) });
  assert.equal(response.status, 400);
});

test('invalid Turnstile tokens are rejected before post-verification buckets', async () => {
  redisCommands.length = 0;
  const response = await postMessage({ message: 'test', turnstileToken: 'test-invalid-token' });
  assert.equal(response.status, 403);
  const calls = redisCommands.filter((command) => String(command[0]).toUpperCase() === 'EVALSHA');
  assert.equal(calls.length, 3);
});

for (const turnstileToken of ['test-network-error', 'test-invalid-json']) {
  test(`Turnstile ${turnstileToken} fails closed with a logged 503`, async () => {
    const requestId = `integration-${turnstileToken}`;
    const response = await postMessage(
      { message: 'test', turnstileToken },
      { 'X-Request-Id': requestId },
    );
    assert.equal(response.status, 503);
    assert.equal(response.headers.get('Retry-After'), '60');
    assert.equal(response.headers.get('X-Request-Id'), requestId);
  });
}

test('failed delivery is not falsely acknowledged as logged or delivered', async () => {
  const response = await postMessage({
    message: 'test-provider-failure',
    turnstileToken: 'test-valid-token',
  });
  assert.equal(response.status, 503);
  const body = await response.json();
  assert.equal(body.ok, false);
  assert.equal(body.deliveryStatus, undefined);
});

test('verified delivery quota is enforced after verification without invoking providers', async () => {
  redisMode = 'delivery-exhausted';
  const requestId = 'integration-delivery-budget-request';
  const response = await postMessage(
    { message: 'test', turnstileToken: 'test-valid-token' },
    { 'X-Request-Id': requestId },
  );
  assert.equal(response.status, 429);
  assert.ok(Number(response.headers.get('Retry-After')) <= 1200);
  assert.equal(
    astroOutput.includes(`"event":"portfolio_message_delivery_results","requestId":"${requestId}"`),
    false,
  );
  redisMode = 'healthy';
});

test('unauthenticated heartbeat does not issue any Redis command', async () => {
  const before = redisCommands.length;
  const response = await fetch(`${baseUrl}/api/cron/redis-heartbeat`);
  assert.equal(response.status, 401);
  assert.equal(redisCommands.length, before);
});

test('authenticated heartbeat writes one maintenance key without consuming message quota', async () => {
  redisCommands.length = 0;
  const response = await fetch(`${baseUrl}/api/cron/redis-heartbeat`, {
    headers: { Authorization: `Bearer ${cronSecret}` },
  });
  assert.equal(response.status, 200, astroOutput);
  assert.deepEqual(await response.json(), { ok: true });
  assert.equal(redisCommands.length, 1);
  assert.equal(String(redisCommands[0][0]).toUpperCase(), 'SET');
  assert.equal(redisCommands[0][1], 'portfolio:maintenance:redis-heartbeat');
});

test('heartbeat rejects non-GET requests with 405', async () => {
  const response = await fetch(`${baseUrl}/api/cron/redis-heartbeat`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${cronSecret}` },
  });
  assert.equal(response.status, 405);
});

test('Redis outages return 503 and do not masquerade as quota exhaustion', async () => {
  redisMode = 'unavailable';
  const response = await postMessage(
    { message: 'test', turnstileToken: 'test-valid-token' },
    { 'X-Request-Id': 'integration-outage-request' },
  );
  assert.equal(response.status, 503);
  assert.equal(response.headers.get('Retry-After'), '60');
  assert.equal(
    astroOutput.includes(
      '"event":"portfolio_message_rate_limited","requestId":"integration-outage-request"',
    ),
    false,
  );
});

test('exhausted buckets return 429 and a next-refill Retry-After header', async () => {
  redisMode = 'exhausted';
  const response = await postMessage({ message: 'test', turnstileToken: 'test-valid-token' });
  assert.equal(response.status, 429);
  const retryAfter = Number(response.headers.get('Retry-After'));
  assert.ok(retryAfter >= 1 && retryAfter <= 180);
});

test('submission outcomes are correlated, structured, and exclude tokens and production message text', () => {
  const records = astroOutput
    .split('\n')
    .filter((line) => line.startsWith('{'))
    .map((line) => JSON.parse(line));
  const outcomes = records.filter(
    (record) => record.event === 'portfolio_message_submission_completed',
  );
  assert.ok(outcomes.length >= 8, astroOutput);
  for (const status of [200, 400, 403, 429, 503]) {
    assert.ok(outcomes.some((record) => record.status === status));
  }
  assert.ok(outcomes.every((record) => typeof record.durationMs === 'number' && record.requestId));
  assert.equal(astroOutput.includes('test-only-api-key'), false);
  assert.equal(astroOutput.includes('test-only-redis-token'), false);
  assert.equal(astroOutput.includes('test-valid-token'), false);
  assert.equal(astroOutput.includes('Integration test message'), false);
});
