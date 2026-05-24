import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const PACKAGE_JSON = JSON.parse(
  readFileSync(resolve(process.cwd(), 'package.json'), 'utf8'),
);
const PRELOAD_SRC = readFileSync(resolve(process.cwd(), 'preload-env.cjs'), 'utf8');

describe('local dev env preload contract', () => {
  it('preloads env before server.mjs static imports in local dev', () => {
    expect(PACKAGE_JSON.scripts.dev).toContain('node -r ./preload-env.cjs');
    expect(PACKAGE_JSON.scripts.dev).toContain('server.mjs');
  });

  it('loads the repo root .env before falling back to backend/.env', () => {
    const rootIdx = PRELOAD_SRC.indexOf("path.resolve(__dirname, '..', '.env')");
    const backendIdx = PRELOAD_SRC.indexOf("path.resolve(__dirname, '.env')");

    expect(rootIdx).toBeGreaterThan(-1);
    expect(backendIdx).toBeGreaterThan(rootIdx);
  });
});
