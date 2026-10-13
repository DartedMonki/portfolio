import { defineMiddleware } from 'astro:middleware';
import { getRequestId } from './lib/request';

export const onRequest = defineMiddleware(async (context, next) => {
  const startedAt = Date.now();
  const route = context.routePattern;
  const isApiRequest = !context.isPrerendered && route.startsWith('/api/');
  const requestId = isApiRequest ? getRequestId(context.request) : undefined;
  if (requestId) context.request.headers.set('x-request-id', requestId);

  const response = await next();
  if (isApiRequest && requestId) {
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
  }

  return response;
});
