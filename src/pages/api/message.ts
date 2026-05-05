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
} from 'astro:env/server';

import { getRequestId, getRequestIpAddress } from '../../lib/request';

export const prerender = false;

const MAX_REQUEST_BYTES = 4096;
const RATE_LIMIT_MAX_REQUESTS = 5;
const RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000;
const DISCORD_FIELD_LIMIT = 1024;

type DeliveryChannel = 'resend' | 'telegram' | 'discord';

interface MessagePayload {
  message: string;
  ipAddress: string;
  userAgent: string;
  referer: string;
  origin: string;
  timestamp: string;
  requestId: string;
}

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

interface DeliveryResult {
  channel: DeliveryChannel;
  ok: boolean;
  error?: string;
}

const rateLimitStore = new Map<string, RateLimitEntry>();

const jsonResponse = (body: Record<string, unknown>, status = 200, headers?: HeadersInit) =>
  Response.json(body, {
    status,
    headers: {
      'Cache-Control': 'no-store',
      ...headers,
    },
  });

const trimSecret = (value: string | undefined) => {
  const trimmedValue = value?.trim();
  return trimmedValue && trimmedValue.length > 0 ? trimmedValue : undefined;
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

const assertOkResponse = async (response: Response, provider: DeliveryChannel) => {
  if (response.ok) return;
  throw new Error(`${provider} responded with HTTP ${response.status}`);
};

const getAllowedOrigins = (request: Request) => {
  const configuredOrigins = trimSecret(CONTACT_ALLOWED_ORIGIN);
  if (configuredOrigins) {
    return configuredOrigins
      .split(',')
      .map((origin) => origin.trim())
      .filter(Boolean);
  }

  return [new URL(request.url).origin];
};

const isAllowedOrigin = (request: Request) => {
  const origin = request.headers.get('origin');
  if (!origin) return true;

  return getAllowedOrigins(request).includes(origin);
};

const checkRateLimit = (key: string) => {
  const now = Date.now();
  const existingEntry = rateLimitStore.get(key);

  if (!existingEntry || existingEntry.resetAt <= now) {
    rateLimitStore.set(key, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return { limited: false, retryAfterSeconds: 0 };
  }

  if (existingEntry.count >= RATE_LIMIT_MAX_REQUESTS) {
    return {
      limited: true,
      retryAfterSeconds: Math.ceil((existingEntry.resetAt - now) / 1000),
    };
  }

  existingEntry.count += 1;
  return { limited: false, retryAfterSeconds: 0 };
};

const parseRequestBody = async (request: Request) => {
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

    return { message: sanitizeMessage(body.message) };
  } catch {
    return { error: 'Invalid JSON request body' };
  }
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

export const POST = (async ({ request }) => {
  if (!isAllowedOrigin(request)) {
    return jsonResponse({ ok: false, error: 'Forbidden origin' }, 403);
  }

  const ipAddress = getRequestIpAddress(request);
  const rateLimit = checkRateLimit(ipAddress);
  if (rateLimit.limited) {
    return jsonResponse({ ok: false, error: 'Too many messages. Please try again later.' }, 429, {
      'Retry-After': String(rateLimit.retryAfterSeconds),
    });
  }

  const parsedBody = await parseRequestBody(request);
  if ('error' in parsedBody) {
    return jsonResponse({ ok: false, error: parsedBody.error }, 400);
  }

  const maxMessageLength = CONTACT_MAX_MESSAGE_LENGTH;
  if (parsedBody.message.length === 0) {
    return jsonResponse({ ok: false, error: 'Message is required' }, 400);
  }

  if (parsedBody.message.length > maxMessageLength) {
    return jsonResponse(
      { ok: false, error: `Message must be ${maxMessageLength} characters or less` },
      400,
    );
  }

  const payload: MessagePayload = {
    message: parsedBody.message,
    ipAddress,
    userAgent: request.headers.get('user-agent') || 'unknown',
    referer: request.headers.get('referer') || 'unknown',
    origin: request.headers.get('origin') || 'unknown',
    timestamp: new Date().toISOString(),
    requestId: getRequestId(request),
  };

  console.info(JSON.stringify({ event: 'portfolio_message_received', ...payload }));

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
    return jsonResponse({ ok: true, deliveryStatus: 'delivered' });
  }

  return jsonResponse({ ok: true, deliveryStatus: 'logged' }, 202);
}) satisfies APIRoute;

export const ALL = (() => {
  return jsonResponse({ ok: false, error: 'Method not allowed' }, 405, { Allow: 'POST' });
}) satisfies APIRoute;
