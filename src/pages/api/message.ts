import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';
import type { APIRoute } from 'astro';
import {
  CONTACT_ALLOWED_ORIGIN,
  CONTACT_EMAIL_FROM,
  CONTACT_EMAIL_TO,
  CONTACT_MAX_MESSAGE_LENGTH,
  DISCORD_WEBHOOK_URL,
  RESEND_API_KEY,
  TELEGRAM_BOT_TOKEN,
  TELEGRAM_CHAT_ID,
  TURNSTILE_SECRET_KEY,
  UPSTASH_REDIS_REST_TOKEN,
  UPSTASH_REDIS_REST_URL,
} from 'astro:env/server';

import { CONTACT_TURNSTILE_ACTION } from '../../lib/contactSecurity';
import { getRequestId, getRequestIpAddress } from '../../lib/request';

export const prerender = false;

const MAX_REQUEST_BYTES = 8192;
const DISCORD_FIELD_LIMIT = 1024;
const CLIENT_COOKIE_NAME = '__Host-dm_contact_client_id';
const CLIENT_COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 365;
const TURNSTILE_VERIFY_URL = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';
const TURNSTILE_TOKEN_MAX_LENGTH = 4096;
const CORS_MAX_AGE_SECONDS = 600;
const SERVICE_UNAVAILABLE_RETRY_AFTER_SECONDS = 60;

const PRODUCTION_ALLOWED_ORIGINS = ['https://dartedmonki.com', 'https://www.dartedmonki.com'];
const DEVELOPMENT_ALLOWED_ORIGINS = [
  'http://localhost:4321',
  'http://127.0.0.1:4321',
  'http://localhost:3000',
  'http://127.0.0.1:3000',
];
const ALLOWED_CORS_REQUEST_HEADERS = new Set(['content-type']);

type DeliveryChannel = 'resend' | 'telegram' | 'discord';
type RateLimitBucket = 'global' | 'client' | 'ip' | 'network' | 'message';

interface MessagePayload {
  message: string;
  ipAddress: string;
  userAgent: string;
  referer: string;
  origin: string;
  timestamp: string;
  requestId: string;
}

interface ParsedMessageRequest {
  message: string;
  turnstileToken?: string;
}

interface ClientIdentity {
  id: string;
  setCookie: boolean;
}

interface DeliveryResult {
  channel: DeliveryChannel;
  ok: boolean;
  error?: string;
}

interface AccessValidationResult {
  ok: boolean;
  error?: string;
  status?: number;
}

interface TurnstileVerificationResponse {
  success?: boolean;
  hostname?: string;
  action?: string;
  challenge_ts?: string;
  'error-codes'?: string[];
}

interface RateLimitCheck {
  bucket: RateLimitBucket;
  key: string;
  limiter: Ratelimit;
}

interface RateLimitDecision {
  ok: boolean;
  status?: number;
  error?: string;
  retryAfterSeconds?: number;
  bucket?: RateLimitBucket;
}

const trimSecret = (value: string | undefined) => {
  const trimmedValue = value?.trim();
  return trimmedValue && trimmedValue.length > 0 ? trimmedValue : undefined;
};

const createRedisClient = () => {
  const url = trimSecret(UPSTASH_REDIS_REST_URL);
  const token = trimSecret(UPSTASH_REDIS_REST_TOKEN);
  if (!url || !token) return undefined;

  return new Redis({ url, token });
};

const redis = createRedisClient();

const createRateLimiter = (
  bucket: RateLimitBucket,
  requests: number,
  window: Parameters<typeof Ratelimit.slidingWindow>[1],
) => {
  if (!redis) return undefined;

  return new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(requests, window),
    analytics: true,
    prefix: `portfolio:message:${bucket}`,
  });
};

const rateLimiters = {
  global: createRateLimiter('global', 100, '1 h'),
  client: createRateLimiter('client', 5, '30 m'),
  ip: createRateLimiter('ip', 5, '10 m'),
  network: createRateLimiter('network', 20, '1 h'),
  message: createRateLimiter('message', 3, '1 h'),
};

const isRecord = (value: unknown): value is Record<string, unknown> => {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
};

const sanitizeMessage = (value: string) => value.replaceAll('\u0000', '').trim();

const escapeHtml = (value: string) =>
  value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');

const truncateText = (value: string, maxLength: number) => {
  if (value.length <= maxLength) return value;
  return `${value.slice(0, maxLength - 3)}...`;
};

const summarizeError = (error: unknown) => {
  if (
    error instanceof Error &&
    /^(resend|telegram|discord) responded with HTTP \d+$/.test(error.message)
  ) {
    return error.message;
  }

  return 'Delivery request failed';
};

const normalizeOrigin = (origin: string | undefined) => {
  const trimmedOrigin = origin?.trim();
  if (!trimmedOrigin) return undefined;

  try {
    return new URL(trimmedOrigin).origin;
  } catch {
    return undefined;
  }
};

const getConfiguredOrigins = () => {
  return (
    trimSecret(CONTACT_ALLOWED_ORIGIN)
      ?.split(',')
      .map((origin) => normalizeOrigin(origin))
      .filter((origin): origin is string => Boolean(origin)) ?? []
  );
};

const getAllowedOrigins = () => {
  const configuredOrigins = getConfiguredOrigins();
  const productionOrigins =
    configuredOrigins.length > 0 ? configuredOrigins : PRODUCTION_ALLOWED_ORIGINS;
  const origins = import.meta.env.DEV
    ? [...productionOrigins, ...DEVELOPMENT_ALLOWED_ORIGINS]
    : productionOrigins;

  return [...new Set(origins)];
};

const getAllowedHosts = () => {
  return new Set(getAllowedOrigins().map((origin) => new URL(origin).hostname));
};

const isAllowedRequestHost = (request: Request) => {
  try {
    return getAllowedHosts().has(new URL(request.url).hostname);
  } catch {
    return false;
  }
};

const isAllowedOrigin = (origin: string | undefined) => {
  const normalizedOrigin = normalizeOrigin(origin);
  return Boolean(normalizedOrigin && getAllowedOrigins().includes(normalizedOrigin));
};

const validateRequestAccess = (request: Request): AccessValidationResult => {
  if (!isAllowedRequestHost(request)) {
    return { ok: false, status: 403, error: 'Forbidden host' };
  }

  const origin = request.headers.get('origin') || undefined;
  if (!origin) {
    if (import.meta.env.DEV) return { ok: true };
    return { ok: false, status: 403, error: 'Forbidden origin' };
  }

  if (!isAllowedOrigin(origin)) {
    return { ok: false, status: 403, error: 'Forbidden origin' };
  }

  if (request.headers.get('sec-fetch-site')?.toLowerCase() === 'cross-site') {
    return { ok: false, status: 403, error: 'Forbidden request context' };
  }

  return { ok: true };
};

const getCorsHeaders = (request: Request) => {
  const headers = new Headers({ Vary: 'Origin' });
  const origin = normalizeOrigin(request.headers.get('origin') || undefined);

  if (origin && getAllowedOrigins().includes(origin)) {
    headers.set('Access-Control-Allow-Origin', origin);
  }

  return headers;
};

const createResponseHeaders = (request: Request, headers?: HeadersInit) => {
  const responseHeaders = new Headers({
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff',
    'X-Robots-Tag': 'noindex',
  });

  getCorsHeaders(request).forEach((value, key) => responseHeaders.set(key, value));

  if (headers) {
    new Headers(headers).forEach((value, key) => responseHeaders.set(key, value));
  }

  return responseHeaders;
};

const jsonResponse = (
  request: Request,
  body: Record<string, unknown>,
  status = 200,
  headers?: HeadersInit,
) => Response.json(body, { status, headers: createResponseHeaders(request, headers) });

const emptyResponse = (request: Request, status = 204, headers?: HeadersInit) => {
  return new Response(null, { status, headers: createResponseHeaders(request, headers) });
};

const validateCorsPreflight = (request: Request): AccessValidationResult => {
  const access = validateRequestAccess(request);
  if (!access.ok) return access;

  const requestedMethod = request.headers.get('access-control-request-method');
  if (requestedMethod && requestedMethod.toUpperCase() !== 'POST') {
    return { ok: false, status: 405, error: 'Method not allowed' };
  }

  const requestedHeaders = request.headers.get('access-control-request-headers');
  const hasForbiddenHeader = requestedHeaders
    ?.split(',')
    .map((header) => header.trim().toLowerCase())
    .filter(Boolean)
    .some((header) => !ALLOWED_CORS_REQUEST_HEADERS.has(header));

  if (hasForbiddenHeader) {
    return { ok: false, status: 403, error: 'Forbidden request headers' };
  }

  return { ok: true };
};

const parseCookieHeader = (value: string | null) => {
  const cookies = new Map<string, string>();
  if (!value) return cookies;

  for (const cookie of value.split(';')) {
    const separatorIndex = cookie.indexOf('=');
    if (separatorIndex === -1) continue;

    const name = cookie.slice(0, separatorIndex).trim();
    const rawCookieValue = cookie.slice(separatorIndex + 1).trim();
    if (!name || cookies.has(name)) continue;

    try {
      cookies.set(name, decodeURIComponent(rawCookieValue));
    } catch {
      cookies.set(name, rawCookieValue);
    }
  }

  return cookies;
};

const getClientIdentity = (request: Request): ClientIdentity => {
  const clientId = parseCookieHeader(request.headers.get('cookie')).get(CLIENT_COOKIE_NAME);
  if (clientId && /^[0-9a-f-]{36}$/i.test(clientId)) {
    return { id: clientId, setCookie: false };
  }

  return { id: globalThis.crypto.randomUUID(), setCookie: true };
};

const getClientCookieHeader = (clientId: string) => {
  return [
    `${CLIENT_COOKIE_NAME}=${encodeURIComponent(clientId)}`,
    `Max-Age=${CLIENT_COOKIE_MAX_AGE_SECONDS}`,
    'Path=/',
    'HttpOnly',
    'Secure',
    'SameSite=Strict',
  ].join('; ');
};

const hashIdentifier = async (value: string) => {
  const hashBuffer = await globalThis.crypto.subtle.digest(
    'SHA-256',
    new TextEncoder().encode(value),
  );

  return [...new Uint8Array(hashBuffer)].map((byte) => byte.toString(16).padStart(2, '0')).join('');
};

const normalizeMessageFingerprint = (message: string) => {
  return message.toLowerCase().replaceAll(/\s+/g, ' ').slice(0, 512);
};

const expandIpv6Address = (value: string) => {
  const lowerCaseValue = value.toLowerCase();
  const sections = lowerCaseValue.split('::');
  if (sections.length > 2) return undefined;

  const head = sections[0] ? sections[0].split(':') : [];
  const tail = sections[1] ? sections[1].split(':') : [];
  const missingGroups = 8 - head.length - tail.length;
  if (missingGroups < 0) return undefined;

  const groups =
    sections.length === 1 ? head : [...head, ...new Array(missingGroups).fill('0'), ...tail];
  if (groups.length !== 8) return undefined;

  return groups.map((group) => group.padStart(4, '0'));
};

const getNetworkIdentity = (ipAddress: string) => {
  const ipv4Parts = ipAddress.split('.');
  if (ipv4Parts.length === 4) return `ipv4:${ipv4Parts.slice(0, 3).join('.')}.0/24`;

  const ipv6Groups = expandIpv6Address(ipAddress);
  if (ipv6Groups) return `ipv6:${ipv6Groups.slice(0, 4).join(':')}::/64`;

  return `unknown:${ipAddress}`;
};

const getRetryAfterSeconds = (reset: number) => {
  return Math.max(1, Math.ceil((reset - Date.now()) / 1000));
};

const getConfiguredRateLimitChecks = async (
  buckets: RateLimitBucket[],
  payload: Pick<MessagePayload, 'message' | 'ipAddress'>,
  clientId: string,
) => {
  const checks: RateLimitCheck[] = [];
  for (const bucket of buckets) {
    const limiter = rateLimiters[bucket];
    if (!limiter) return undefined;

    let key: string;
    switch (bucket) {
      case 'global':
        key = 'all';
        break;
      case 'client':
        key = await hashIdentifier(clientId);
        break;
      case 'ip':
        key = await hashIdentifier(payload.ipAddress);
        break;
      case 'network':
        key = await hashIdentifier(getNetworkIdentity(payload.ipAddress));
        break;
      case 'message':
        key = await hashIdentifier(normalizeMessageFingerprint(payload.message));
        break;
    }

    checks.push({ bucket, key, limiter });
  }

  return checks;
};

const checkRateLimits = async (
  requestId: string,
  buckets: RateLimitBucket[],
  payload: Pick<MessagePayload, 'message' | 'ipAddress'>,
  clientId: string,
): Promise<RateLimitDecision> => {
  const checks = await getConfiguredRateLimitChecks(buckets, payload, clientId);

  if (!checks) {
    if (import.meta.env.DEV) return { ok: true };

    console.error(
      JSON.stringify({ event: 'portfolio_message_rate_limiter_not_configured', requestId }),
    );
    return {
      ok: false,
      status: 503,
      error: 'Message service is temporarily unavailable',
      retryAfterSeconds: SERVICE_UNAVAILABLE_RETRY_AFTER_SECONDS,
    };
  }

  for (const check of checks) {
    try {
      const result = await check.limiter.limit(check.key);
      if (!result.success) {
        return {
          ok: false,
          status: 429,
          error: 'Too many messages. Please try again later.',
          retryAfterSeconds: getRetryAfterSeconds(result.reset),
          bucket: check.bucket,
        };
      }
    } catch (error) {
      console.error(
        JSON.stringify({
          event: 'portfolio_message_rate_limiter_failed',
          requestId,
          bucket: check.bucket,
          error: error instanceof Error ? error.message : 'Unknown rate limiter error',
        }),
      );
      return {
        ok: false,
        status: 503,
        error: 'Message service is temporarily unavailable',
        retryAfterSeconds: SERVICE_UNAVAILABLE_RETRY_AFTER_SECONDS,
      };
    }
  }

  return { ok: true };
};

const parseRequestBody = async (
  request: Request,
): Promise<ParsedMessageRequest | { error: string }> => {
  const contentType = request.headers.get('content-type') || '';
  if (!contentType.toLowerCase().includes('application/json')) {
    return { error: 'Expected application/json request body' };
  }

  const contentLength = Number(request.headers.get('content-length') || '0');
  if (contentLength > MAX_REQUEST_BYTES) {
    return { error: 'Request body is too large' };
  }

  const rawBody = await request.text();
  if (new TextEncoder().encode(rawBody).length > MAX_REQUEST_BYTES) {
    return { error: 'Request body is too large' };
  }

  try {
    const body: unknown = JSON.parse(rawBody);
    if (!isRecord(body) || typeof body.message !== 'string') {
      return { error: 'Message is required' };
    }

    if (body.turnstileToken !== undefined && typeof body.turnstileToken !== 'string') {
      return { error: 'Invalid verification token' };
    }

    if (
      typeof body.turnstileToken === 'string' &&
      body.turnstileToken.length > TURNSTILE_TOKEN_MAX_LENGTH
    ) {
      return { error: 'Invalid verification token' };
    }

    return { message: sanitizeMessage(body.message), turnstileToken: body.turnstileToken };
  } catch {
    return { error: 'Invalid JSON request body' };
  }
};

const isTurnstileVerificationResponse = (
  value: unknown,
): value is TurnstileVerificationResponse => {
  return isRecord(value);
};

const verifyTurnstileToken = async (
  requestId: string,
  token: string | undefined,
  ipAddress: string,
) => {
  const secret = trimSecret(TURNSTILE_SECRET_KEY);
  if (!secret) {
    if (import.meta.env.DEV) return { ok: true };

    console.error(
      JSON.stringify({ event: 'portfolio_message_turnstile_not_configured', requestId }),
    );
    return {
      ok: false,
      status: 503,
      error: 'Message verification is unavailable',
      retryAfterSeconds: SERVICE_UNAVAILABLE_RETRY_AFTER_SECONDS,
    };
  }

  if (!token) return { ok: false, error: 'Message verification is required' };

  const body = new URLSearchParams({ secret, response: token, idempotency_key: requestId });
  if (ipAddress !== 'unknown' && ipAddress !== 'localhost') body.set('remoteip', ipAddress);

  const response = await fetch(TURNSTILE_VERIFY_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  });

  if (!response.ok) {
    return {
      ok: false,
      status: 503,
      error: 'Message verification failed',
      retryAfterSeconds: SERVICE_UNAVAILABLE_RETRY_AFTER_SECONDS,
    };
  }

  const result: unknown = await response.json();
  if (!isTurnstileVerificationResponse(result) || !result.success) {
    console.info(
      JSON.stringify({
        event: 'portfolio_message_turnstile_rejected',
        requestId,
        errorCodes: isTurnstileVerificationResponse(result) ? result['error-codes'] : undefined,
      }),
    );
    return { ok: false, error: 'Message verification failed' };
  }

  const allowedHosts = getAllowedHosts();
  if (!result.hostname || !allowedHosts.has(result.hostname)) {
    console.info(
      JSON.stringify({
        event: 'portfolio_message_turnstile_hostname_rejected',
        requestId,
        hostname: result.hostname || 'unknown',
      }),
    );
    return { ok: false, error: 'Message verification failed' };
  }

  if (result.action !== CONTACT_TURNSTILE_ACTION) {
    console.info(
      JSON.stringify({
        event: 'portfolio_message_turnstile_action_rejected',
        requestId,
        action: result.action || 'unknown',
      }),
    );
    return { ok: false, error: 'Message verification failed' };
  }

  return { ok: true };
};

const parseEmailRecipients = (value: string | undefined) => {
  return (
    trimSecret(value)
      ?.split(',')
      .map((email) => email.trim())
      .filter(Boolean) ?? []
  );
};

const buildPlainTextMessage = (payload: MessagePayload) => {
  return [
    'New portfolio message',
    '',
    'Message:',
    payload.message,
    '',
    `IP address: ${payload.ipAddress}`,
    `Timestamp: ${payload.timestamp}`,
    `Request ID: ${payload.requestId}`,
    `User agent: ${payload.userAgent}`,
    `Referer: ${payload.referer}`,
    `Origin: ${payload.origin}`,
  ].join('\n');
};

const buildHtmlMessage = (payload: MessagePayload) => {
  const rows = [
    ['IP address', payload.ipAddress],
    ['Timestamp', payload.timestamp],
    ['Request ID', payload.requestId],
    ['User agent', payload.userAgent],
    ['Referer', payload.referer],
    ['Origin', payload.origin],
  ];

  return `
    <h1>New portfolio message</h1>
    <h2>Message</h2>
    <pre style="white-space:pre-wrap;font-family:ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,monospace;">${escapeHtml(payload.message)}</pre>
    <h2>Metadata</h2>
    <table>${rows
      .map(
        ([label, value]) =>
          `<tr><th align="left" style="padding-right:16px;vertical-align:top;">${escapeHtml(label)}</th><td>${escapeHtml(value)}</td></tr>`,
      )
      .join('')}</table>
  `;
};

const assertOkResponse = async (response: Response, provider: DeliveryChannel) => {
  if (response.ok) return;
  throw new Error(`${provider} responded with HTTP ${response.status}`);
};

const sendResendEmail = async (payload: MessagePayload) => {
  const apiKey = trimSecret(RESEND_API_KEY);
  const from = trimSecret(CONTACT_EMAIL_FROM);
  const to = parseEmailRecipients(CONTACT_EMAIL_TO);

  if (!apiKey || !from || to.length === 0) return undefined;

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'Idempotency-Key': payload.requestId,
    },
    body: JSON.stringify({
      from,
      to,
      subject: 'New portfolio message',
      text: buildPlainTextMessage(payload),
      html: buildHtmlMessage(payload),
      tags: [{ name: 'source', value: 'portfolio' }],
    }),
  });

  await assertOkResponse(response, 'resend');
  return true;
};

const sendTelegramMessage = async (payload: MessagePayload) => {
  const token = trimSecret(TELEGRAM_BOT_TOKEN);
  const chatId = trimSecret(TELEGRAM_CHAT_ID);

  if (!token || !chatId) return undefined;

  const response = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: chatId,
      text: buildPlainTextMessage(payload),
      disable_web_page_preview: true,
    }),
  });

  await assertOkResponse(response, 'telegram');
  return true;
};

const sendDiscordMessage = async (payload: MessagePayload) => {
  const webhookUrl = trimSecret(DISCORD_WEBHOOK_URL);
  if (!webhookUrl) return undefined;

  const response = await fetch(`${webhookUrl}?wait=true`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      username: 'Portfolio Message',
      content: 'New portfolio message',
      allowed_mentions: { parse: [] },
      embeds: [
        {
          title: 'New portfolio message',
          color: 0x304ffe,
          timestamp: payload.timestamp,
          fields: [
            {
              name: 'Message',
              value: truncateText(payload.message, DISCORD_FIELD_LIMIT),
            },
            { name: 'IP address', value: payload.ipAddress, inline: true },
            { name: 'Request ID', value: payload.requestId, inline: true },
            { name: 'User agent', value: truncateText(payload.userAgent, DISCORD_FIELD_LIMIT) },
            { name: 'Referer', value: truncateText(payload.referer, DISCORD_FIELD_LIMIT) },
          ],
        },
      ],
    }),
  });

  await assertOkResponse(response, 'discord');
  return true;
};

const runDelivery = async (
  channel: DeliveryChannel,
  deliver: (payload: MessagePayload) => Promise<boolean | undefined>,
  payload: MessagePayload,
): Promise<DeliveryResult | undefined> => {
  try {
    const delivered = await deliver(payload);
    if (!delivered) return undefined;
    return { channel, ok: true };
  } catch (error) {
    return { channel, ok: false, error: summarizeError(error) };
  }
};

const getClientHeaders = (clientIdentity: ClientIdentity) => {
  return clientIdentity.setCookie
    ? { 'Set-Cookie': getClientCookieHeader(clientIdentity.id) }
    : undefined;
};

export const OPTIONS = (({ request }) => {
  const preflight = validateCorsPreflight(request);
  if (!preflight.ok) {
    return jsonResponse(
      request,
      { ok: false, error: preflight.error || 'Forbidden' },
      preflight.status,
    );
  }

  return emptyResponse(request, 204, {
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Max-Age': String(CORS_MAX_AGE_SECONDS),
  });
}) satisfies APIRoute;

export const POST = (async ({ request }) => {
  const access = validateRequestAccess(request);
  if (!access.ok) {
    console.info(
      JSON.stringify({
        event: 'portfolio_message_access_rejected',
        error: access.error,
        requestId: getRequestId(request),
        origin: request.headers.get('origin') || 'missing',
        host: request.headers.get('host') || 'unknown',
      }),
    );
    return jsonResponse(request, { ok: false, error: access.error || 'Forbidden' }, access.status);
  }

  const clientIdentity = getClientIdentity(request);
  const clientHeaders = getClientHeaders(clientIdentity);
  const ipAddress = getRequestIpAddress(request);
  const requestId = getRequestId(request);
  const preVerificationRateLimit = await checkRateLimits(
    requestId,
    ['global', 'ip', 'network'],
    { message: '', ipAddress },
    clientIdentity.id,
  );
  if (!preVerificationRateLimit.ok) {
    console.info(
      JSON.stringify({
        event: 'portfolio_message_rate_limited',
        requestId,
        bucket: preVerificationRateLimit.bucket,
        retryAfterSeconds: preVerificationRateLimit.retryAfterSeconds,
      }),
    );

    return jsonResponse(
      request,
      {
        ok: false,
        error: preVerificationRateLimit.error || 'Too many messages. Please try again later.',
      },
      preVerificationRateLimit.status || 429,
      {
        ...clientHeaders,
        ...(preVerificationRateLimit.retryAfterSeconds
          ? { 'Retry-After': String(preVerificationRateLimit.retryAfterSeconds) }
          : undefined),
      },
    );
  }

  const parsedBody = await parseRequestBody(request);
  if ('error' in parsedBody) {
    return jsonResponse(request, { ok: false, error: parsedBody.error }, 400, clientHeaders);
  }

  const maxMessageLength = CONTACT_MAX_MESSAGE_LENGTH;
  if (parsedBody.message.length === 0) {
    return jsonResponse(request, { ok: false, error: 'Message is required' }, 400, clientHeaders);
  }

  if (parsedBody.message.length > maxMessageLength) {
    return jsonResponse(
      request,
      { ok: false, error: `Message must be ${maxMessageLength} characters or less` },
      400,
      clientHeaders,
    );
  }

  const basePayload = { message: parsedBody.message, ipAddress };

  const turnstile = await verifyTurnstileToken(requestId, parsedBody.turnstileToken, ipAddress);
  if (!turnstile.ok) {
    return jsonResponse(
      request,
      { ok: false, error: turnstile.error || 'Message verification failed' },
      turnstile.status || 403,
      {
        ...clientHeaders,
        ...(turnstile.retryAfterSeconds
          ? { 'Retry-After': String(turnstile.retryAfterSeconds) }
          : undefined),
      },
    );
  }

  const verifiedRateLimit = await checkRateLimits(
    requestId,
    ['client', 'message'],
    basePayload,
    clientIdentity.id,
  );
  if (!verifiedRateLimit.ok) {
    console.info(
      JSON.stringify({
        event: 'portfolio_message_rate_limited',
        requestId,
        bucket: verifiedRateLimit.bucket,
        retryAfterSeconds: verifiedRateLimit.retryAfterSeconds,
      }),
    );

    return jsonResponse(
      request,
      { ok: false, error: verifiedRateLimit.error || 'Too many messages. Please try again later.' },
      verifiedRateLimit.status || 429,
      {
        ...clientHeaders,
        ...(verifiedRateLimit.retryAfterSeconds
          ? { 'Retry-After': String(verifiedRateLimit.retryAfterSeconds) }
          : undefined),
      },
    );
  }

  const payload: MessagePayload = {
    message: parsedBody.message,
    ipAddress,
    userAgent: request.headers.get('user-agent') || 'unknown',
    referer: request.headers.get('referer') || 'unknown',
    origin: request.headers.get('origin') || 'unknown',
    timestamp: new Date().toISOString(),
    requestId,
  };

  console.info(
    JSON.stringify({
      event: 'portfolio_message_received',
      ipAddress: payload.ipAddress,
      requestId: payload.requestId,
      userAgent: payload.userAgent,
      referer: payload.referer,
      origin: payload.origin,
      messageLength: payload.message.length,
    }),
  );

  const deliveryResults = (
    await Promise.all([
      runDelivery('resend', sendResendEmail, payload),
      runDelivery('telegram', sendTelegramMessage, payload),
      runDelivery('discord', sendDiscordMessage, payload),
    ])
  ).filter((result): result is DeliveryResult => Boolean(result));

  const successfulChannels = deliveryResults
    .filter((result) => result.ok)
    .map((result) => result.channel);
  const failedResults = deliveryResults.filter((result) => !result.ok);

  console.info(
    JSON.stringify({
      event: 'portfolio_message_delivery_results',
      requestId: payload.requestId,
      successfulChannels,
      failedResults,
      externalChannelsConfigured: deliveryResults.length,
    }),
  );

  if (successfulChannels.length > 0) {
    return jsonResponse(request, { ok: true, deliveryStatus: 'delivered' }, 200, clientHeaders);
  }

  return jsonResponse(request, { ok: true, deliveryStatus: 'logged' }, 202, clientHeaders);
}) satisfies APIRoute;

export const ALL = (({ request }) => {
  return jsonResponse(request, { ok: false, error: 'Method not allowed' }, 405, {
    Allow: 'POST, OPTIONS',
  });
}) satisfies APIRoute;
