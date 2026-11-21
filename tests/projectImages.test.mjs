import assert from 'node:assert/strict';
import { open, readdir } from 'node:fs/promises';
import { test } from 'node:test';
import { projects } from '../src/data/projects.ts';

const imageDirectory = new URL('../public/images/', import.meta.url);

test('each project slide uses the dimensions in its PNG header', async () => {
  for (const { coverSize, images } of projects) {
    for (const { src, size } of images) {
      const file = await open(new URL(src.replace('/images/', ''), imageDirectory));
      try {
        const header = Buffer.alloc(24);
        const { bytesRead } = await file.read(header, 0, header.length, 0);
        assert.equal(bytesRead, header.length, src);
        assert.equal(header.toString('ascii', 12, 16), 'IHDR', src);
        assert.deepEqual(
          [header.readUInt32BE(16), header.readUInt32BE(20)],
          size ?? coverSize,
          src,
        );
      } finally {
        await file.close();
      }
    }
  }
});

test('portfolio slides have all AVIF and WebP sources', async () => {
  const files = new Set(await readdir(new URL('optimized/', imageDirectory)));
  for (const { src } of projects.flatMap(({ images }) => images)) {
    const imageName = /^\/images\/(.+)\.(?:png|jpe?g|gif|webp)$/i.exec(src)?.[1];
    assert.ok(imageName, src);
    for (const size of ['sm', 'md', 'lg']) {
      for (const format of ['avif', 'webp']) {
        const variant = `${imageName}-${size}.${format}`;
        assert.ok(files.has(variant), variant);
      }
    }
  }
});
