const originalFetch = globalThis.fetch;

globalThis.fetch = async (input, init) => {
  const url = new URL(input instanceof Request ? input.url : String(input));
  if (url.origin === 'https://challenges.cloudflare.com') {
    const body = new URLSearchParams(init?.body);
    if (body.get('response') === 'test-network-error') throw new TypeError('fetch failed');
    if (body.get('response') === 'test-invalid-json') return new Response('invalid json');
    return Response.json({
      success: body.get('response') === 'test-valid-token',
      hostname: '127.0.0.1',
      action: 'portfolio_message',
    });
  }
  if (url.origin === 'https://api.resend.com') {
    const body = JSON.parse(init.body);
    if (body.text.includes('test-provider-failure')) {
      return Response.json({ error: 'mock delivery failed' }, { status: 500 });
    }
    return Response.json({ id: 'mock-email-id' });
  }
  if (url.hostname !== '127.0.0.1' && url.hostname !== 'localhost') {
    throw new Error('External network requests are disabled in integration tests');
  }
  return originalFetch(input, init);
};
