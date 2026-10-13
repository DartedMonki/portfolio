# Portfolio

Astro static site configured for Vercel's free deployment flow.

## Node Version

This project targets Node 24.16 or newer within Node 24. The Astro lint parser requires that patch level. If you use `nvm`, run:

```sh
nvm install
nvm use
```

## Commands

| Command                    | Action                                                       |
| :------------------------- | :----------------------------------------------------------- |
| `npm install`              | Install dependencies                                         |
| `npm run dev`              | Start the local dev server at `localhost:4321`               |
| `npm run check`            | Run Astro, lint, format, unit/API tests and npm audit        |
| `npm run build`            | Run source checks and build the site into `dist/`            |
| `npm run preview`          | Preview the production build locally                         |
| `npm run lint`             | Run ESLint                                                   |
| `npm test`                 | Run obfuscation, rate-limiter and Redis regression tests     |
| `npm run test:integration` | Test real Astro HTTP routes with mocked Redis and providers  |
| `npm run test:browser`     | Test the production client in Chromium with the deployed CSP |
| `npm audit`                | Check dependencies using the public npm audit service        |
| `npm run format:check`     | Check Prettier formatting                                    |

## Vercel Deployment

Astro builds the portfolio pages as static output and uses `@astrojs/vercel` for Vercel deployment. The site also exposes `/api/ip` as a small serverless endpoint for visitor IP detection, so deployments can use Vercel Functions runtime and quota even though the main pages are static.

When importing the repository in Vercel, keep the auto-detected Astro settings:

| Setting          | Value                           |
| :--------------- | :------------------------------ |
| Framework Preset | Astro                           |
| Install Command  | `npm install` or Vercel default |
| Build Command    | `npm run build`                 |
| Output Directory | `dist`                          |

The production build runs `npm run check` before `astro build`. Astro diagnostics, lint, formatting, unit tests, API integration tests and npm audit must all pass. A reported vulnerability or an unavailable audit service fails the check, including on Vercel. Browser verification is a separate `npm run test:browser` command and is not part of the deployment pipeline.

On Vercel (`VERCEL=1`), npm's `prebuild` hook normalizes `vercel.json` with the project's Prettier settings before running checks. It verifies that the parsed configuration remains identical, including cron schedules, redirects and security headers. Invalid JSON fails the build. Local builds never autoformat configuration, and `vercel.json` remains covered by the format check.

### Astro 7 Integration

The project keeps Astro's built-in request pipeline and uses `src/middleware.ts` with the matched `routePattern` and `isPrerendered` context to add consistent request IDs plus no-store and security headers to dynamic API endpoints. API responses expose `X-Request-Id` for correlation with runtime logs. Endpoint authorization remains in the handlers, not in raw-path matching.

Middleware preserves Astro's request and rendering context, including dev routing and HMR. Request headers are accessed only for dynamic API endpoints, never for prerendered pages. Page GET/HEAD behavior and both locale routes are covered by integration tests.

Astro's stable logger API uses JSON logs on Vercel and readable Node logs locally. The build uses Astro 7's Rust compiler, Vite 8 bundler, default queued rendering and HTML compression.

Client JavaScript chunks use pinned `javascript-obfuscator@5.9.0`. Local identifiers and labels are obfuscated alongside base64-encoded string arrays. Public globals, property names and module interfaces stay intact. The offline `obfuscate()` API needs no account, API token or paid plan. Check the [upstream releases](https://github.com/javascript-obfuscator/javascript-obfuscator/releases) and run npm audit when upgrading.

The `browser-no-eval` target preserves the existing CSP without adding `unsafe-eval`. Control-flow flattening, dead-code injection, object-key transformation, self-defending code and extra anti-debugging are intentionally off to limit runtime overhead and behavioral risk. Only `_astro/*.js` client chunks are transformed, after bundler minification; server chunks and assets are untouched, and errors fail the build rather than bypassing obfuscation.

Each chunk gets a deterministic source-derived seed and isolated generated names. The package identity, version, options and seed strategy contribute to chunk hashes so compatibility changes invalidate cached assets. Regression tests check active renaming, chained break/continue labels, captured and shadowed bindings, ESM hydration, repeatable output and CSP-safe execution. Obfuscation is a reverse-engineering deterrent, not a security boundary; credentials and authorization remain server-side.

For production browser verification, install Chromium with `npx playwright install chromium`, build with `npm run build`, then run `npm run test:browser`. The test serves only built static files, applies `vercel.json` security headers, and checks both languages on desktop and mobile. It checks hydration, local image loading, dialogs, WebGL rendering and animation, and message submission responses. APIs and third-party requests, including Turnstile and the remote avatar, are mocked, so no real messages are sent or Redis quotas consumed.

The public pages remain prerendered and the React experience keeps its existing hydration. Route caching is intentionally not enabled: the pages are already static, while visitor IPs, authenticated maintenance requests, messages, and quota decisions must never be shared between users. Sessions, Astro DB replacements, Markdown pipelines, and Hono are not needed for the current application.

### Generated Environment Types

`astro:env/server` exports come from the schema in `astro.config.mjs`, not from whether a secret is already configured in Vercel. After adding a schema field such as `CRON_SECRET`, run `npm run astro -- sync` to regenerate `.astro/env.d.ts`. If the IDE still reports a missing export after `npm run check` succeeds, restart its TypeScript server or reload the project. Generated `.astro/` files stay untracked.

## Portfolio Message Security And Delivery

The typing shortcut posts messages to `/api/message`. The endpoint runs on the server and fans out each message to the configured Resend, Telegram, and Discord providers. Vercel runtime logs record outcomes and diagnostic metadata, not production message text. Provider tokens are only read from server-side environment variables and are never sent to the browser.

Production protection is layered because CORS is not enough by itself. Browsers enforce CORS, but scripts and bots can spoof or omit request headers. The endpoint therefore also requires Cloudflare Turnstile verification and Upstash Redis-backed rate limits before delivery.

Configure these values in Vercel Project Settings -> Environment Variables:

| Variable                     | Required In Production | Example                                               |
| :--------------------------- | :--------------------- | :---------------------------------------------------- |
| `PUBLIC_TURNSTILE_SITE_KEY`  | Yes                    | `0x4AAAA...`                                          |
| `TURNSTILE_SECRET_KEY`       | Yes                    | `0x4AAAA...`                                          |
| `UPSTASH_REDIS_REST_URL`     | Yes                    | `https://...upstash.io`                               |
| `UPSTASH_REDIS_REST_TOKEN`   | Yes                    | `AX...`                                               |
| `CRON_SECRET`                | Yes, for the heartbeat | A random secret of at least 16 characters             |
| `CONTACT_ALLOWED_ORIGIN`     | Optional               | `https://dartedmonki.com,https://www.dartedmonki.com` |
| `CONTACT_MAX_MESSAGE_LENGTH` | Optional               | `1000`                                                |
| `RESEND_API_KEY`             | Optional               | `re_...`                                              |
| `CONTACT_EMAIL_FROM`         | Optional               | `Portfolio <message@notify.dartedmonki.com>`          |
| `CONTACT_EMAIL_TO`           | Optional               | `you@example.com`                                     |
| `TELEGRAM_BOT_TOKEN`         | Optional               | `123456:ABC...`                                       |
| `TELEGRAM_CHAT_ID`           | Optional               | `123456789`                                           |
| `DISCORD_WEBHOOK_URL`        | Optional               | `https://discord.com/api/webhooks/...`                |

At least one external provider must be configured for production delivery. If none is configured or all configured providers fail, the endpoint returns `503` instead of falsely acknowledging receipt. If any provider accepts the message, it returns `200`. Logs are not an inbox or durable message storage. Local development without configured providers retains a `202` fallback and writes message text only to the local development log.

Security behavior in production:

| Control              | Behavior                                                                                             |
| :------------------- | :--------------------------------------------------------------------------------------------------- |
| Allowed origins      | Defaults to `https://dartedmonki.com` and `https://www.dartedmonki.com`                              |
| CORS                 | Only allowed origins receive `Access-Control-Allow-Origin`; preflight allows only `POST`             |
| Missing origin       | Rejected outside local development                                                                   |
| Host validation      | Requests to non-portfolio hosts, including unapproved preview URLs, are rejected                     |
| Bot verification     | Cloudflare Turnstile token, hostname, and action are verified server-side                            |
| Distributed limiting | Upstash limits request traffic, verified deliveries, IP, IP network, client cookie, and message hash |
| Limiter outage       | Fails closed with HTTP `503` and `Retry-After: 60` instead of accepting unprotected mail             |

Create the Turnstile widget in Cloudflare with these hostnames:

```txt
dartedmonki.com
www.dartedmonki.com
```

Use `Managed (Recommended)` widget mode. The client renders it with `appearance: interaction-only`, so most visitors do not see anything, but Cloudflare can still show a fallback challenge when a browser cannot complete the silent private-token path.

The repository defines the production CSP in `vercel.json`. Turnstile can load fallback assets from `https://challenges.cloudflare.com`, `https://fonts.googleapis.com`, and `https://fonts.gstatic.com`; keep those origins in CSP if you move security headers to Vercel or Cloudflare dashboard settings. If another CSP header is configured outside this repo, update or remove it too because browsers enforce all CSP headers they receive.

Use Upstash Redis in the same Vercel region when possible to keep the contact endpoint fast. If Upstash or Turnstile environment variables are missing in production, `/api/message` fails closed instead of accepting unprotected traffic.

### Token Bucket Limits

Each request consumes one token in each applicable bucket. Buckets start full and refill one token per interval, up to their capacity. Global, IP, and network checks run before Turnstile; browser client, message, and delivery checks run after successful verification. The shared delivery budget runs last, so requests that fail verification or identity limits do not consume it.

| Bucket                              | Burst Capacity | Refill                   |
| :---------------------------------- | :------------- | :----------------------- |
| Global request guard                | 20             | 1 token every 3 minutes  |
| Verified delivery budget            | 20             | 1 token every 20 minutes |
| Browser client cookie               | 5              | 1 token every 6 minutes  |
| IP address                          | 5              | 1 token every 2 minutes  |
| IP network (`/24` IPv4, `/64` IPv6) | 20             | 1 token every 3 minutes  |
| Normalized message hash             | 3              | 1 token every 20 minutes |

The identity buckets limit bursts and average request rates. The request guard and delivery budget constrain traffic for a low-volume portfolio on free plans. A depleted bucket returns `429` with `Retry-After` pointing to the next refill. Redis errors and SDK timeouts return `503` with `Retry-After: 60`; only genuine quota exhaustion is logged as `portfolio_message_rate_limited`.

The delivery bucket permits at most approximately 92 attempts over 24 hours without a database reset: 20 initial tokens plus 72 refills. With one email recipient, this leaves headroom below [Resend's free limits](https://resend.com/docs/knowledge-base/account-quotas-and-limits) of 100 emails per UTC day and 3,000 per month. Multiple recipients, inbound emails, and other apps on the same Resend account also consume that account quota; this limiter does not track their usage.

SDK analytics are disabled to avoid an extra Redis command for every check, including cached denials. A normal verified submission checks six token buckets, roughly 24 Redis commands according to [Upstash's SDK cost model](https://upstash.com/docs/redis/sdks/ratelimit-ts/costs), plus one heartbeat write per day. Upstash's [free Redis plan](https://upstash.com/pricing/redis) allows 500,000 commands per month. Ordinary portfolio traffic fits comfortably, but attacks, cold-start denials, other Redis consumers, and visitor-IP Function invocations are not globally capped by these message buckets. Monitor account usage; these settings are not an absolute guarantee against every free-tier limit.

Token-bucket state uses the `portfolio:message:token-bucket:v1:` namespace. Keep the namespace stable across deployments to preserve quota state.

Deployments configured with the same Redis database and namespace share the request and delivery budgets. Separate databases do not share counters. Do not reset the database or change the prefix to bypass quotas; doing so replenishes every bucket.

### Message And Redis Logs

| Event                                                               | Meaning                                                                                          |
| :------------------------------------------------------------------ | :----------------------------------------------------------------------------------------------- |
| `portfolio_message_submission_completed`                            | Final HTTP status and duration for each POST, correlated by request ID                           |
| `portfolio_message_received`                                        | Verification and all quotas passed; message length only, not proof of delivery                   |
| `portfolio_message_delivery_results`                                | Per-provider outcomes, durations, sanitized errors and HTTP failures; error severity if all fail |
| `portfolio_message_rate_limited`                                    | Genuine quota exhaustion, bucket, and retry delay                                                |
| `portfolio_message_rate_limiter_failed`                             | Redis failure or SDK timeout, bucket, duration, and safe network cause code                      |
| `portfolio_message_turnstile_failed`                                | Verification rejection, provider/network failure, or invalid provider response                   |
| `portfolio_redis_heartbeat_ok` / `portfolio_redis_heartbeat_failed` | Authorized heartbeat write outcome, status, duration, and request ID                             |
| `portfolio_redis_heartbeat_rejected`                                | Unauthorized or unsupported heartbeat request without accessing Redis                            |

Missing Redis configuration has a separate `*_not_configured` event. Production logs never include message bodies, provider tokens, the Redis URL/token, `CRON_SECRET`, or Turnstile tokens. Delivery and Turnstile requests have eight-second timeouts; Redis requests have five-second timeouts. Use `X-Request-Id` from the response to correlate terminal status with verification, quota, and delivery events. Logs do not automatically send alerts; inspect Vercel runtime/Cron logs and retain provider inboxes as the source of message content.

### Redis Heartbeat

Upstash's [inactivity policy](https://upstash.com/docs/redis/help/faq) archives free databases after at least 30 days of inactivity. `vercel.json` schedules `/api/cron/redis-heartbeat` once a day at `0 0 * * *` (UTC), a Hobby-compatible schedule. On Hobby, the invocation may occur anywhere within that hour, approximately 07:00-08:00 WIB.

Before deploying, add `CRON_SECRET` to Vercel's **Production** environment. Generate a random value locally, for example:

```sh
openssl rand -hex 32
```

Keep the value secret and server-only. Vercel automatically sends it as `Authorization: Bearer <CRON_SECRET>`. Missing or incorrect authorization returns `401` without accessing Redis; non-GET methods return `405`. The endpoint does not require browser origin headers or Turnstile.

Each authorized run writes a timestamp to the single `portfolio:maintenance:redis-heartbeat` key with a seven-day TTL. It never consumes message quota, alters rate-limit counters, or sends messages. Successful writes log `portfolio_redis_heartbeat_ok`; failed writes log `portfolio_redis_heartbeat_failed` and return `503`.

After a production deployment, check **Vercel Project Settings -> Cron Jobs** and run the job once to confirm a `200` response and the success log. Cron scheduling is production-only, not active in local development or preview deployments. Vercel does not retry failed runs, so monitor failures and Upstash inactivity-warning emails. This heartbeat is best effort, not a guarantee against archival or other database removal; Upstash recommends a paid plan when the endpoint must remain active through extended inactivity.

### Dependency Audits

This repository's `.npmrc` selects `https://registry.npmjs.org/` because all its dependencies are public and the corporate registry does not implement npm's audit endpoint. This setting applies only to this project and does not modify your global npm configuration or other repositories.

Use Node 24 and run `npm ci`, `npm audit`, `npm test`, `npm run lint`, and `npm run build` when changing dependencies. Avoid `npm audit fix --force`: major framework and adapter updates must be reviewed and verified together.

For Resend, use the verified subdomain sender:

```txt
Portfolio <message@notify.dartedmonki.com>
```

Keep local `.env` files untracked. Use placeholder values only in docs or examples.
