import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { isDeepStrictEqual } from 'node:util';
import { format, resolveConfig } from 'prettier';

const projectConfig = fileURLToPath(new URL('../vercel.json', import.meta.url));

export async function normalizeVercelConfig(
  configPath = projectConfig,
  isVercelBuild = process.env.VERCEL === '1',
) {
  if (!isVercelBuild) return false;

  const source = await readFile(configPath, 'utf8');
  const value = JSON.parse(source);
  const options = await resolveConfig(projectConfig);
  const formatted = await format(source, { ...options, filepath: configPath });
  if (!isDeepStrictEqual(value, JSON.parse(formatted))) {
    throw new Error('Formatting must not change Vercel configuration values');
  }
  if (source === formatted) return false;

  await writeFile(configPath, formatted, 'utf8');
  return true;
}

if (import.meta.main && (await normalizeVercelConfig())) {
  console.log('Normalized Vercel build config formatting.');
}
