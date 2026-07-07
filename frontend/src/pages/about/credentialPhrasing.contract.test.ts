import { describe, expect, it } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * Launch audit P0-2 lock (2026-07-06): Sean is NCEP-certified and NASM
 * workshop-trained ("NASM-protocol"). The phrase "NASM-certified" /
 * "NASM Certified" is a false credential claim and must never ship in
 * source again — user-facing copy OR LLM prompt personas (Coach output
 * echoes its persona).
 */

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const FRONTEND_SRC = resolve(__dirname, '../..');
const BACKEND_DIRS = ['services', 'routes', 'controllers'].map((d) =>
  resolve(__dirname, '../../../../backend', d),
);

const SOURCE_EXT = /\.(ts|tsx|js|jsx|mjs|cjs|py)$/;
// Built via concat so this lock file never matches its own pattern.
const FORBIDDEN = new RegExp('NASM' + '[-\\s]' + '[Cc]ertified');

const walk = (dir: string, hits: string[]): void => {
  for (const entry of readdirSync(dir)) {
    if (entry === 'node_modules' || entry === 'dist' || entry.startsWith('.')) continue;
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      walk(full, hits);
      continue;
    }
    if (!SOURCE_EXT.test(entry) || full === __filename) continue;
    if (FORBIDDEN.test(readFileSync(full, 'utf8'))) hits.push(full);
  }
};

describe('credential phrasing lock', () => {
  it('no source file claims "NASM-certified" (frontend src + backend services/routes/controllers)', () => {
    const hits: string[] = [];
    walk(FRONTEND_SRC, hits);
    for (const dir of BACKEND_DIRS) walk(dir, hits);
    expect(hits).toEqual([]);
  });
});
