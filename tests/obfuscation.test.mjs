import assert from 'node:assert/strict';
import { test } from 'node:test';
import { runInNewContext } from 'node:vm';
import jsConfuserPackage from 'js-confuser/package.json' with { type: 'json' };
import config from '../astro.config.mjs';

const plugin = config.vite.plugins.find((plugin) => plugin.name === 'portfolio-js-confuser');

test('client chunk hashes include the obfuscator version and binding-safe settings', () => {
  const hash = JSON.parse(plugin.augmentChunkHash({ fileName: '_astro/client.js' }));
  assert.equal(hash.version, jsConfuserPackage.version);
  assert.equal(hash.options.renameVariables, false);
  assert.equal(hash.options.renameLabels, false);
  assert.equal(hash.options.stringConcealing, true);
  assert.equal(plugin.augmentChunkHash({ fileName: 'server/entry.js' }), undefined);
});

test('Vite 8 nested loop labels retain their behavior after client obfuscation', async () => {
  const source = `
    function verifyLabels() {
      let total = 0;
      outer: inner: for (let index = 0; index < 5; index++) {
        if (index === 3) break outer;
        total += index;
      }
      return total;
    }
    globalThis.labelResult = verifyLabels();
  `;
  const chunk = { type: 'chunk', fileName: '_astro/labels.js', code: source };
  await plugin.generateBundle({}, { 'labels.js': chunk });
  assert.notEqual(chunk.code, source);
  const sandbox = {};
  // eslint-disable-next-line sonarjs/code-eval -- Runs only a fixed fixture in an isolated VM.
  runInNewContext(chunk.code, sandbox, { timeout: 1000 });
  assert.equal(sandbox.labelResult, 3);
});

test('server chunks and non-JavaScript assets are not obfuscated', async () => {
  const source = 'globalThis.result = 1;';
  const chunk = { type: 'chunk', fileName: 'server/entry.js', code: source };
  const asset = { type: 'asset', fileName: '_astro/image.png', source: 'image-data' };
  await plugin.generateBundle({}, { 'entry.js': chunk, 'image.png': asset });
  assert.equal(chunk.code, source);
  assert.equal(asset.source, 'image-data');
});

test('captured variables survive nested async arrows and destructured hydration arguments', async () => {
  const source = `
    const hydrate = (element) => async (
      component,
      props,
      { default: children, ...slots },
      { client }
    ) => {
      if (!element.hasAttribute('ssr')) return;
      element.setAttribute('client', client);
      return element.getAttribute('data-value') + children + slots.extra + props.value + component;
    };
    const element = {
      hasAttribute() { return true; },
      setAttribute() {},
      getAttribute() { return 'captured'; }
    };
    globalThis.hydrationResult = hydrate(element)(
      'component',
      { value: 'prop' },
      { default: 'child', extra: 'slot' },
      { client: 'idle' }
    );
  `;
  const chunk = { type: 'chunk', fileName: '_astro/hydration.js', code: source };
  await plugin.generateBundle({}, { 'hydration.js': chunk });
  const sandbox = {};
  // eslint-disable-next-line sonarjs/code-eval -- Runs only a fixed fixture in an isolated VM.
  runInNewContext(chunk.code, sandbox, { timeout: 1000 });
  assert.equal(await sandbox.hydrationResult, 'capturedchildslotpropcomponent');
});

test('minified ESM exports retain their captured hydration bindings', async () => {
  const source = `
    const h = t => async (n, r, { default: o, ...s }, { client: a }) => {
      if (!t.hasAttribute('ssr')) return;
      return t.getAttribute('value') + r.value + o + s.extra + a + n;
    };
    export { h as hydrate };
  `;
  const chunk = { type: 'chunk', fileName: '_astro/client.js', code: source };
  await plugin.generateBundle({}, { 'client.js': chunk });
  const moduleUrl = `data:text/javascript;base64,${Buffer.from(chunk.code).toString('base64')}`;
  const { hydrate } = await import(moduleUrl);
  const result = await hydrate({
    hasAttribute: () => true,
    getAttribute: () => 'captured',
  })('component', { value: 'props' }, { default: 'child', extra: 'slot' }, { client: 'idle' });
  assert.equal(result, 'capturedpropschildslotidlecomponent');
});
