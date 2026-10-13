import assert from 'node:assert/strict';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { pathToFileURL } from 'node:url';
import { runInNewContext } from 'node:vm';
import obfuscatorPackage from 'javascript-obfuscator/package.json' with { type: 'json' };
import config from '../astro.config.mjs';

const plugin = config.vite.plugins.find((plugin) => plugin.name === 'portfolio-client-obfuscator');

test('client chunk hashes include the obfuscator identity, version, options and seed strategy', () => {
  const hash = JSON.parse(plugin.augmentChunkHash({ fileName: '_astro/client.js' }));
  assert.equal(hash.package, obfuscatorPackage.name);
  assert.equal(hash.version, obfuscatorPackage.version);
  assert.equal(hash.seedStrategy, 'sha256-filename-and-code-v1');
  assert.equal(hash.options.target, 'browser-no-eval');
  assert.equal(hash.options.stringArray, true);
  assert.equal(hash.options.renameGlobals, false);
  assert.equal(hash.options.renameProperties, false);
  assert.equal(hash.options.disableConsoleOutput, false);
  assert.equal(hash.options.selfDefending, false);
  assert.equal(plugin.augmentChunkHash({ fileName: 'server/entry.js' }), undefined);
  assert.equal(plugin.augmentChunkHash({ fileName: '_astro/style.css' }), undefined);
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
  runInNewContext(chunk.code, sandbox, {
    timeout: 1000,
    contextCodeGeneration: { strings: false, wasm: false },
  });
  assert.equal(sandbox.labelResult, 3);
});

test('server chunks and non-JavaScript assets are not obfuscated', async () => {
  const source = 'globalThis.result = 1;';
  const chunk = { type: 'chunk', fileName: 'server/entry.js', code: source };
  const otherChunk = { type: 'chunk', fileName: 'scripts/client.js', code: source };
  const nonJsChunk = { type: 'chunk', fileName: '_astro/client.txt', code: source };
  const asset = { type: 'asset', fileName: '_astro/image.png', source: 'image-data' };
  await plugin.generateBundle({}, { chunk, otherChunk, nonJsChunk, asset });
  assert.equal(chunk.code, source);
  assert.equal(otherChunk.code, source);
  assert.equal(nonJsChunk.code, source);
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

test('local identifier and required label renaming is active, not bypassed', async () => {
  const source = `
    globalThis.result = (function computeTotal(localInput) {
      let localTotal = 0;
      requiredOuter: for (let localIndex = 0; localIndex < localInput; localIndex++) {
        for (let innerIndex = 0; innerIndex < 3; innerIndex++) {
          if (localIndex === 2) break requiredOuter;
          localTotal += innerIndex;
        }
      }
      return localTotal;
    })(5);
  `;
  const chunk = { type: 'chunk', fileName: '_astro/renaming.js', code: source };
  await plugin.generateBundle({}, { chunk });
  assert.doesNotMatch(chunk.code, /\b(localInput|localTotal|localIndex|requiredOuter)\b/);
  const sandbox = {};
  // eslint-disable-next-line sonarjs/code-eval -- Runs only a fixed fixture in an isolated VM.
  runInNewContext(chunk.code, sandbox, {
    timeout: 1000,
    contextCodeGeneration: { strings: false, wasm: false },
  });
  assert.equal(sandbox.result, 6);
});

test('chained continue labels, labeled blocks and switch breaks preserve their targets', async () => {
  const source = `
    globalThis.result = (() => {
      let total = 0;
      first: second: for (let i = 0; i < 4; i++) {
        for (let j = 0; j < 3; j++) {
          switch (j) {
            case 0: total++; break;
            case 1: continue first;
          }
          total += 100;
        }
      }
      exit: {
        total += 10;
        break exit;
        total += 1000;
      }
      return total;
    })();
  `;
  const chunk = { type: 'chunk', fileName: '_astro/continue.js', code: source };
  await plugin.generateBundle({}, { chunk });
  const sandbox = {};
  // eslint-disable-next-line sonarjs/code-eval -- Runs only a fixed fixture in an isolated VM.
  runInNewContext(chunk.code, sandbox, { timeout: 1000 });
  assert.equal(sandbox.result, 414);
});

test('shadowed block, catch and default-parameter bindings remain distinct from captures', async () => {
  const source = `
    globalThis.result = (() => {
      const value = 7;
      const readOuter = () => value;
      const readDefault = (argument = value) => {
        const value = 9;
        return [argument, value, readOuter()];
      };
      const readers = [];
      for (let value = 0; value < 3; value++) readers.push(() => value);
      try {
        throw 4;
      } catch (value) {
        readers.push(() => value);
      }
      return [...readDefault(), ...readers.map(read => read())];
    })();
  `;
  const chunk = { type: 'chunk', fileName: '_astro/scopes.js', code: source };
  await plugin.generateBundle({}, { chunk });
  const sandbox = {};
  // eslint-disable-next-line sonarjs/code-eval -- Runs only a fixed fixture in an isolated VM.
  runInNewContext(chunk.code, sandbox, { timeout: 1000 });
  assert.equal(JSON.stringify(sandbox.result), '[7,9,7,0,1,2,4]');
});

test('obfuscation is deterministic for the same filename and source', async () => {
  const source = 'globalThis.result = (() => { const value = "repeatable"; return value; })();';
  const first = { type: 'chunk', fileName: '_astro/repeatable.js', code: source };
  const second = { ...first };
  const differentFile = { ...first, fileName: '_astro/different.js' };
  await plugin.generateBundle({}, { first, second, differentFile });
  assert.equal(first.code, second.code);
  assert.notEqual(first.code, differentFile.code);
});

test('invalid JavaScript fails the build instead of silently publishing unobfuscated code', async () => {
  const chunk = { type: 'chunk', fileName: '_astro/invalid.js', code: 'const broken = ;' };
  await assert.rejects(plugin.generateBundle({}, { chunk }));
});

test('static imports, re-exports, dynamic imports and default hydration exports stay connected', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'portfolio-obfuscation-'));
  const shared = {
    type: 'chunk',
    fileName: '_astro/shared.mjs.js',
    code: 'const value = "captured"; export { value }; export default () => "dynamic";',
  };
  const bridge = {
    type: 'chunk',
    fileName: '_astro/bridge.mjs.js',
    code: 'export { value as sharedValue } from "./shared.mjs";',
  };
  const client = {
    type: 'chunk',
    fileName: '_astro/client.mjs.js',
    code: `
      import { sharedValue } from "./bridge.mjs";
      export const clientName = "public-interface";
      export default element => async (component, props, { default: children }) => {
        const { default: readDynamic } = await import("./shared.mjs");
        return element.getAttribute("value") + sharedValue + readDynamic() +
          component + props.value + children;
      };
    `,
  };
  try {
    await plugin.generateBundle({}, { shared, bridge, client });
    await Promise.all([
      writeFile(join(directory, 'shared.mjs'), shared.code),
      writeFile(join(directory, 'bridge.mjs'), bridge.code),
      writeFile(join(directory, 'client.mjs'), client.code),
    ]);
    const { default: hydrate, clientName } = await import(
      pathToFileURL(join(directory, 'client.mjs')).href
    );
    assert.equal(clientName, 'public-interface');
    const result = await hydrate({ getAttribute: () => 'element' })(
      'component',
      { value: 'props' },
      { default: 'child' },
    );
    assert.equal(result, 'elementcaptureddynamiccomponentpropschild');
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test('Unicode strings, surrogate code units and modern class syntax preserve values without eval', async () => {
  const strings = ['caf\u00e9', '\ud83d\ude80', '[^\ud800-\udfff]'];
  const source = `
    globalThis.result = (() => {
      class Reader {
        #value;
        constructor(value) { this.#value = value; }
        read = () => this.#value?.text ?? "fallback";
      }
      return [new Reader({ text: "captured" }).read(), new Reader(null).read(),
        ...${JSON.stringify(strings)}];
    })();
  `;
  const chunk = { type: 'chunk', fileName: '_astro/modern.js', code: source };
  await plugin.generateBundle({}, { chunk });
  const sandbox = {};
  // eslint-disable-next-line sonarjs/code-eval -- Runs only a fixed fixture in an isolated VM.
  runInNewContext(chunk.code, sandbox, {
    timeout: 1000,
    contextCodeGeneration: { strings: false, wasm: false },
  });
  assert.equal(
    JSON.stringify(sandbox.result),
    JSON.stringify(['captured', 'fallback', ...strings]),
  );
});
