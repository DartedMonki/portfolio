import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readJsonRequest } from '../src/lib/readJsonRequest.ts';

const jsonRequest = (body) =>
  new Request('https://example.test/api/message', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
    body,
    duplex: 'half',
  });

test('accepts a UTF-8 character split across chunks at the byte limit', async () => {
  const json = { message: 'é' };
  const bytes = new TextEncoder().encode(JSON.stringify(json));
  const split = bytes.indexOf(0xc3) + 1;
  const body = new ReadableStream({
    start(controller) {
      controller.enqueue(bytes.subarray(0, split));
      controller.enqueue(bytes.subarray(split));
      controller.close();
    },
  });

  assert.deepEqual(await readJsonRequest(jsonRequest(body), bytes.length), { json });
});

test('cancels the request body after crossing the limit without a Content-Length header', async () => {
  let cancelled = false;
  const body = new ReadableStream({
    pull(controller) {
      controller.enqueue(new Uint8Array(6).fill(0x20));
    },
    cancel() {
      cancelled = true;
    },
  });

  assert.deepEqual(await readJsonRequest(jsonRequest(body), 10), {
    error: 'Request body is too large',
    status: 413,
  });
  assert.equal(cancelled, true);
});

test('rejects malformed UTF-8 in a JSON body', async () => {
  const body = new Uint8Array([0x22, 0xff, 0x22]);
  assert.deepEqual(await readJsonRequest(jsonRequest(body), 10), {
    error: 'Invalid JSON request body',
    status: 400,
  });
});
