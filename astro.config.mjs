// @ts-check
import { createHash } from 'node:crypto';
import react from '@astrojs/react';
import vercel from '@astrojs/vercel';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig, envField, logHandlers } from 'astro/config';
import obfuscatorPackage from 'javascript-obfuscator/package.json' with { type: 'json' };

/** @returns {import('vite').Plugin} */
const obfuscateClientChunks = () => {
  /** @type {import('javascript-obfuscator').ObfuscatorOptions} */
  const options = {
    target: 'browser-no-eval',
    identifierNamesGenerator: 'hexadecimal',
    compact: true,
    // Keep public globals and property names intact; local bindings and labels are renamed.
    renameGlobals: false,
    renameProperties: false,
    stringArray: true,
    stringArrayEncoding: ['base64'],
    stringArrayThreshold: 0.75,
    stringArrayCallsTransform: false,
    controlFlowFlattening: false,
    deadCodeInjection: false,
    debugProtection: false,
    disableConsoleOutput: false,
    selfDefending: false,
    transformObjectKeys: false,
    sourceMap: false,
    advertisement: false,
  };

  /** @type {import('vite').Plugin} */
  const plugin = {
    name: 'portfolio-client-obfuscator',
    apply: 'build',
    augmentChunkHash(chunk) {
      if (!chunk.fileName.startsWith('_astro/') || !chunk.fileName.endsWith('.js')) return;
      return JSON.stringify({
        package: obfuscatorPackage.name,
        version: obfuscatorPackage.version,
        seedStrategy: 'sha256-filename-and-code-v1',
        options,
      });
    },
    async generateBundle(_options, bundle) {
      const { default: obfuscator } = await import('javascript-obfuscator');
      for (const entry of Object.values(bundle)) {
        if (entry.type !== 'chunk' || !entry.fileName.startsWith('_astro/')) continue;
        if (!entry.fileName.endsWith('.js')) continue;

        // Seed final minified code for repeatable builds; isolate generated names per chunk.
        const digest = createHash('sha256')
          .update(entry.fileName)
          .update('\0')
          .update(entry.code)
          .digest();
        const result = obfuscator.obfuscate(entry.code, {
          ...options,
          seed: digest.readUInt32BE(0) || 1,
          identifiersPrefix: `p${digest.toString('hex').slice(0, 12)}_`,
        });
        entry.code = result.getObfuscatedCode();
      }
    },
  };

  return plugin;
};

// https://astro.build/config
export default defineConfig({
  output: 'static',
  compressHTML: true,
  logger: process.env.VERCEL ? logHandlers.json() : logHandlers.node(),
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
      CRON_SECRET: envField.string({ context: 'server', access: 'secret', optional: true }),
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
