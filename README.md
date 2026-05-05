# Portfolio

Astro static site configured for Vercel's free deployment flow.

## Node Version

This project targets Node 24. If you use `nvm`, run:

```sh
nvm install
nvm use
```

## Commands

| Command                | Action                                         |
| :--------------------- | :--------------------------------------------- |
| `npm install`          | Install dependencies                           |
| `npm run dev`          | Start the local dev server at `localhost:4321` |
| `npm run check`        | Run Astro type and diagnostics checks          |
| `npm run build`        | Run checks and build the site into `dist/`     |
| `npm run preview`      | Preview the production build locally           |
| `npm run lint`         | Run ESLint                                     |
| `npm run format:check` | Check Prettier formatting                      |

## Vercel Deployment

Astro builds the portfolio pages as static output and uses `@astrojs/vercel` for Vercel deployment. The site also exposes `/api/ip` as a small serverless endpoint for visitor IP detection, so deployments can use Vercel Functions runtime and quota even though the main pages are static.

When importing the repository in Vercel, keep the auto-detected Astro settings:

| Setting          | Value                           |
| :--------------- | :------------------------------ |
| Framework Preset | Astro                           |
| Install Command  | `npm install` or Vercel default |
| Build Command    | `npm run build`                 |
| Output Directory | `dist`                          |

The production build runs `astro check` before `astro build`, so Vercel fails early on Astro or TypeScript issues instead of deploying a broken site.

## Portfolio Message Delivery

The typing shortcut posts messages to `/api/message`. The endpoint runs on the server and fans out each message to Resend, Telegram, Discord, and Vercel runtime logs. Provider tokens are only read from server-side environment variables and are never sent to the browser.

Configure these values in Vercel Project Settings -> Environment Variables:

| Variable                     | Required | Example                                               |
| :--------------------------- | :------- | :---------------------------------------------------- |
| `RESEND_API_KEY`             | Optional | `re_...`                                              |
| `CONTACT_EMAIL_FROM`         | Optional | `Portfolio <message@notify.dartedmonki.com>`          |
| `CONTACT_EMAIL_TO`           | Optional | `you@example.com`                                     |
| `TELEGRAM_BOT_TOKEN`         | Optional | `123456:ABC...`                                       |
| `TELEGRAM_CHAT_ID`           | Optional | `123456789`                                           |
| `DISCORD_WEBHOOK_URL`        | Optional | `https://discord.com/api/webhooks/...`                |
| `CONTACT_ALLOWED_ORIGIN`     | Optional | `https://dartedmonki.com,https://www.dartedmonki.com` |
| `CONTACT_MAX_MESSAGE_LENGTH` | Optional | `1000`                                                |

At least one external provider should be configured for durable delivery. Vercel runtime logs are always written as a fallback, but Hobby logs have short retention and should not be treated as the primary inbox.

For Resend, use the verified subdomain sender:

```txt
Portfolio <message@notify.dartedmonki.com>
```

Keep local `.env` files untracked. Use placeholder values only in docs or examples.
