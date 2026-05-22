// @ts-check
import react from '@astrojs/react';
import vercel from '@astrojs/vercel';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig, envField } from 'astro/config';

/** @returns {import('vite').Plugin} */
const obfuscateClientChunks = () => {
  /** @type {import('vite').Plugin} */
  const plugin = {
    name: 'portfolio-js-confuser',
    apply: 'build',
    async generateBundle(_options, bundle) {
      const { obfuscate } = await import('js-confuser');
      await Promise.all(
        Object.values(bundle).map(async (entry) => {
          if (entry.type !== 'chunk' || !entry.fileName.startsWith('_astro/')) return;
          if (!entry.fileName.endsWith('.js')) return;

          const result = await obfuscate(entry.code, {
            target: 'browser',
            identifierGenerator: 'randomized',
            compact: true,
            hexadecimalNumbers: true,
            renameVariables: true,
            renameGlobals: false,
            stringConcealing: true,
            stringEncoding: true,
            duplicateLiteralsRemoval: true,
          });

          entry.code = result.code;
        }),
      );
    },
  };

  return plugin;
};

// https://astro.build/config
export default defineConfig({
  output: 'static',
  adapter: vercel(),
  integrations: [react()],
  env: {
    schema: {
      CONTACT_ALLOWED_ORIGIN: envField.string({
        context: 'server',
        access: 'secret',
        optional: true,
      }),
      CONTACT_EMAIL_FROM: envField.string({ context: 'server', access: 'secret', optional: true }),
      CONTACT_EMAIL_TO: envField.string({ context: 'server', access: 'secret', optional: true }),
      CONTACT_MAX_MESSAGE_LENGTH: envField.number({
        context: 'server',
        access: 'public',
        default: 1000,
      }),
      DISCORD_WEBHOOK_URL: envField.string({ context: 'server', access: 'secret', optional: true }),
      PUBLIC_TURNSTILE_SITE_KEY: envField.string({
        context: 'client',
        access: 'public',
        optional: true,
      }),
      RESEND_API_KEY: envField.string({ context: 'server', access: 'secret', optional: true }),
      TELEGRAM_BOT_TOKEN: envField.string({ context: 'server', access: 'secret', optional: true }),
      TELEGRAM_CHAT_ID: envField.string({ context: 'server', access: 'secret', optional: true }),
      TURNSTILE_SECRET_KEY: envField.string({
        context: 'server',
        access: 'secret',
        optional: true,
      }),
      UPSTASH_REDIS_REST_TOKEN: envField.string({
        context: 'server',
        access: 'secret',
        optional: true,
      }),
      UPSTASH_REDIS_REST_URL: envField.string({
        context: 'server',
        access: 'secret',
        optional: true,
      }),
    },
  },
  vite: {
    plugins: [tailwindcss(), obfuscateClientChunks()],
  },
});
