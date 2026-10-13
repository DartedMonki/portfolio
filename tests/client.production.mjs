import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdtemp, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { extname, isAbsolute, join, relative, resolve } from 'node:path';
import { after, before, test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import { locales } from '../src/data/locales.ts';

const root = fileURLToPath(new URL('../', import.meta.url));
const outputRoot = join(root, 'dist/client');
const origin = 'https://portfolio.verification.local';
const contentTypes = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.svg': 'image/svg+xml',
  '.webp': 'image/webp',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
  '.woff': 'font/woff',
};
let browser;
let securityHeaders;
let screenshots;

before(async () => {
  await readFile(join(outputRoot, 'index.html'));
  const vercel = JSON.parse(await readFile(join(root, 'vercel.json'), 'utf8'));
  securityHeaders = Object.fromEntries(
    vercel.headers
      .filter((rule) => rule.source === '/(.*)')
      .flatMap((rule) => rule.headers.map(({ key, value }) => [key, value])),
  );
  assert.ok(securityHeaders['Content-Security-Policy']);
  assert.ok(!securityHeaders['Content-Security-Policy'].includes("'unsafe-eval'"));
  screenshots = await mkdtemp(join(tmpdir(), 'portfolio-browser-'));
  browser = await chromium.launch({
    args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
  });
});

after(async () => {
  await browser?.close();
  if (screenshots) console.log(`Browser screenshots: ${screenshots}`);
});

for (const viewport of [
  { name: 'desktop', width: 1440, height: 900 },
  { name: 'mobile', width: 390, height: 844 },
]) {
  for (const [path, language] of [
    ['/', 'en'],
    ['/id/', 'id'],
  ]) {
    test(
      `${viewport.name} ${language}: production hydration, CSP, WebGL and messages`,
      {
        timeout: 60_000,
      },
      async () => {
        const context = await browser.newContext({ viewport, serviceWorkers: 'block' });
        const errors = [];
        const consoleErrors = [];
        const submissions = [];
        let messageStatus = 200;
        try {
          await context.addInitScript(() => {
            globalThis.__portfolioCspViolations = [];
            addEventListener('securitypolicyviolation', (event) => {
              globalThis.__portfolioCspViolations.push(
                `${event.violatedDirective}: ${event.blockedURI}`,
              );
            });
          });
          // No requests reach external providers or a live application backend.
          await context.route('**/*', async (route) => {
            const request = route.request();
            const url = new URL(request.url());
            if (url.hostname === 'challenges.cloudflare.com') {
              await route.fulfill({
                contentType: 'text/javascript',
                body: `
                const widgets = new Map();
                window.turnstile = {
                  render(container, options) {
                    const id = String(widgets.size);
                    widgets.set(id, options);
                    return id;
                  },
                  execute(id) { widgets.get(id).callback("test-only-turnstile-token"); },
                  remove(id) { widgets.delete(id); }
                };
              `,
              });
              return;
            }
            if (url.hostname === 'avatars.githubusercontent.com') {
              await route.fulfill({
                contentType: 'image/png',
                body: await readFile(join(outputRoot, 'images/android-chrome-192x192.png')),
              });
              return;
            }
            if (url.origin !== origin) {
              errors.push(`Unexpected external request: ${url.origin}`);
              await route.abort();
              return;
            }
            if (url.pathname === '/api/ip') {
              await route.fulfill({ json: { ipAddress: '127.0.0.1' } });
              return;
            }
            if (url.pathname === '/api/message') {
              submissions.push({ method: request.method(), body: request.postDataJSON() });
              await route.fulfill({
                status: messageStatus,
                json: messageStatus === 200 ? { deliveryStatus: 'delivered' } : { error: 'test' },
              });
              return;
            }
            const pathname = decodeURIComponent(url.pathname);
            const servedPath = pathname.endsWith('/') ? `${pathname}index.html` : pathname;
            const file = resolve(outputRoot, `.${servedPath}`);
            const relativePath = relative(outputRoot, file);
            assert.ok(!relativePath.startsWith('..') && !isAbsolute(relativePath));
            try {
              await route.fulfill({
                body: await readFile(file),
                contentType: contentTypes[extname(file)] || 'application/octet-stream',
                headers: extname(file) === '.html' ? securityHeaders : {},
              });
            } catch (error) {
              errors.push(`Asset failed: ${url.pathname} (${error.code || error.name})`);
              await route.fulfill({ status: 404, body: 'Not found' });
            }
          });

          const page = await context.newPage();
          page.on('pageerror', (error) => errors.push(error.message));
          page.on('console', (message) => {
            if (message.type() === 'error') {
              consoleErrors.push({ message: message.text(), url: message.location().url });
            }
          });
          await page.goto(`${origin}${path}`, { waitUntil: 'domcontentloaded' });
          const canvas = page.locator('canvas').first();
          await canvas.waitFor({ timeout: 30_000 });
          await page.waitForTimeout(1200);
          assert.equal(await page.locator('html').getAttribute('lang'), language);
          assert.ok((await page.locator('h1').innerText()).length > 0);
          assert.equal(
            await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
            true,
          );
          const pixels = await canvas.evaluate(
            (canvas) =>
              new Promise((resolve) => {
                requestAnimationFrame(() => {
                  const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
                  if (!gl) return resolve(0);
                  const buffer = new Uint8Array(gl.drawingBufferWidth * gl.drawingBufferHeight * 4);
                  gl.readPixels(
                    0,
                    0,
                    gl.drawingBufferWidth,
                    gl.drawingBufferHeight,
                    gl.RGBA,
                    gl.UNSIGNED_BYTE,
                    buffer,
                  );
                  let colored = 0;
                  for (let index = 0; index < buffer.length; index += 64) {
                    if (buffer[index] + buffer[index + 1] + buffer[index + 2] > 0) colored++;
                  }
                  resolve(colored);
                });
              }),
          );
          assert.ok(pixels > 10, 'WebGL terrain is blank');
          const digest = (buffer) => createHash('sha256').update(buffer).digest('hex');
          const firstFrame = digest(await canvas.screenshot());
          await page.waitForTimeout(600);
          assert.notEqual(firstFrame, digest(await canvas.screenshot()), 'Terrain is not moving');
          await page.screenshot({ path: join(screenshots, `${viewport.name}-${language}.png`) });

          await page.locator('#terrain-settings-button').click();
          await page.locator('#terrain-settings-panel[open]').waitFor();
          await page.keyboard.press('Escape');
          await page.locator('#terrain-settings-panel').waitFor({ state: 'detached' });
          await page.locator('h1 button').click();
          await page.locator('#about-dialog[open]').waitFor();
          await page.keyboard.press('Escape');
          await page.locator('#about-dialog').waitFor({ state: 'detached' });

          const input = page.locator('input[name="message"]');
          const submit = page.locator('footer button[type="submit"]');
          assert.equal(await submit.isDisabled(), true);
          const outcomes = [
            [200, locales[language].alert.messageSent],
            [429, locales[language].alert.messageRateLimited],
            [503, locales[language].alert.messageTemporarilyUnavailable],
          ];
          for (const [status, expected] of outcomes) {
            messageStatus = status;
            const message = `browser fixture ${status}`;
            await input.fill(message);
            await submit.click();
            await page.getByRole('status').filter({ hasText: expected }).waitFor();
            assert.equal(await input.inputValue(), '');
            assert.equal(submissions.at(-1).method, 'POST');
            assert.equal(submissions.at(-1).body.message, message);
            if (submissions.at(-1).body.turnstileToken !== undefined) {
              assert.equal(submissions.at(-1).body.turnstileToken, 'test-only-turnstile-token');
            }
          }
          assert.equal(submissions.length, outcomes.length);
          const brokenImages = await page
            .locator('img')
            .evaluateAll((images) =>
              images
                .filter((image) => image.complete && image.naturalWidth === 0)
                .map((image) => image.src),
            );
          assert.deepEqual(brokenImages, []);
          assert.deepEqual(await page.evaluate(() => globalThis.__portfolioCspViolations), []);
          assert.deepEqual(errors, []);
          assert.deepEqual(consoleErrors, [
            {
              message:
                'Failed to load resource: the server responded with a status of 429 (Too Many Requests)',
              url: `${origin}/api/message`,
            },
            {
              message:
                'Failed to load resource: the server responded with a status of 503 (Service Unavailable)',
              url: `${origin}/api/message`,
            },
          ]);
        } finally {
          await context.close();
        }
      },
    );
  }
}
