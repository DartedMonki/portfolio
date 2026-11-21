import { defineMiddleware } from 'astro:middleware';

export const onRequest = defineMiddleware(async (context, next) => {
  const route = context.routePattern;
  if (context.isPrerendered || !route.startsWith('/api/')) return next();

  const startedAt = Date.now();
  const requestId = globalThis.crypto.randomUUID();
  context.locals.requestId = requestId;
  const response = await next();
  response.headers.set('Cache-Control', 'no-store');
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-Robots-Tag', 'noindex');
  response.headers.set('X-Request-Id', requestId);

  if (route === '/api/message' && context.request.method === 'POST') {
    const log = response.status >= 500 ? console.error : console.info;
    log(
      JSON.stringify({
        event: 'portfolio_message_submission_completed',
        requestId,
        status: response.status,
        durationMs: Date.now() - startedAt,
      }),
    );
  }

  return response;
});
