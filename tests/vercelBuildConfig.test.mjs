import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm, stat, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { check, resolveConfig } from 'prettier';
import { normalizeVercelConfig } from '../scripts/normalizeVercelConfig.mjs';

const projectConfig = new URL('../vercel.json', import.meta.url);
const fixture = JSON.parse(await readFile(projectConfig, 'utf8'));

async function withConfig(source, run) {
  const directory = await mkdtemp(join(tmpdir(), 'portfolio-vercel-config-'));
  const file = join(directory, 'vercel.json');
  try {
    await writeFile(file, source, 'utf8');
    await run(file);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
}

test('local builds do not autoformat configuration or access missing files', async () => {
  const source = JSON.stringify(fixture);
  await withConfig(source, async (file) => {
    assert.equal(await normalizeVercelConfig(file, false), false);
    assert.equal(await readFile(file, 'utf8'), source);
    assert.equal(await normalizeVercelConfig(join(file, 'missing.json'), false), false);
  });
});

test('Vercel builds normalize serialized config without changing cron, redirects or CSP', async () => {
  await withConfig(JSON.stringify(fixture), async (file) => {
    assert.equal(await normalizeVercelConfig(file, true), true);
    const formatted = await readFile(file, 'utf8');
    assert.deepEqual(JSON.parse(formatted), fixture);
    assert.ok(formatted.endsWith('\n'));
    assert.equal(
      await check(formatted, {
        ...(await resolveConfig(projectConfig)),
        filepath: file,
      }),
      true,
    );
  });
});

test('missing final newline is normalized and repeated invocations do not rewrite the file', async () => {
  const source = (await readFile(projectConfig, 'utf8')).trimEnd();
  await withConfig(source, async (file) => {
    assert.equal(await normalizeVercelConfig(file, true), true);
    const before = await stat(file);
    assert.equal(await normalizeVercelConfig(file, true), false);
    assert.equal((await stat(file)).mtimeMs, before.mtimeMs);
  });
});

test('invalid config fails before writing instead of hiding a deployment error', async () => {
  const source = '{"crons":';
  await withConfig(source, async (file) => {
    await assert.rejects(normalizeVercelConfig(file, true), SyntaxError);
    assert.equal(await readFile(file, 'utf8'), source);
  });
});

test('npm build normalizes the deployment config before running all source checks', async () => {
  const manifest = JSON.parse(await readFile(new URL('../package.json', import.meta.url), 'utf8'));
  assert.equal(manifest.scripts.prebuild, 'node scripts/normalizeVercelConfig.mjs');
  assert.equal(manifest.scripts.build, 'npm run check && astro build');
  assert.match(manifest.scripts.check, /npm run format:check/);
  const ignore = await readFile(new URL('../.prettierignore', import.meta.url), 'utf8');
  assert.ok(!ignore.split(/\r?\n/).includes('vercel.json'));
});
