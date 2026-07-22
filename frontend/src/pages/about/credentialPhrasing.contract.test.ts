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
// P0-2 (SWA-29): a hardcoded fallback that INVENTS a credential when none is on file
// (`trainer.certifications || 'Certified Personal Trainer'`). A cert is a verifiable claim —
// a trainer with none must show none, never a fabricated default. Matches the `||`-default
// pattern only, so a real trainer whose actual stored cert is that string is unaffected.
const FABRICATED_CRED = new RegExp('\\|\\|\\s*[\'"]Certified Personal Trainer[\'"]');

const walk = (dir: string, hits: string[], pattern: RegExp = FORBIDDEN): void => {
  for (const entry of readdirSync(dir)) {
    if (entry === 'node_modules' || entry === 'dist' || entry.startsWith('.')) continue;
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      walk(full, hits, pattern);
      continue;
    }
    if (!SOURCE_EXT.test(entry) || full === __filename) continue;
    if (pattern.test(readFileSync(full, 'utf8'))) hits.push(full);
  }
};

describe('credential phrasing lock', () => {
  // The full-tree fs walk takes 3.5-6s on Windows depending on disk cache;
  // the 5s default timeout false-reds under parallel suite load.
  it('no source file claims "NASM-certified" (frontend src + backend services/routes/controllers)', () => {
    const hits: string[] = [];
    walk(FRONTEND_SRC, hits);
    for (const dir of BACKEND_DIRS) walk(dir, hits);
    expect(hits).toEqual([]);
  }, 30000);

  it('no source file fabricates a "Certified Personal Trainer" credential default (P0-2)', () => {
    const hits: string[] = [];
    walk(FRONTEND_SRC, hits, FABRICATED_CRED);
    for (const dir of BACKEND_DIRS) walk(dir, hits, FABRICATED_CRED);
    expect(hits).toEqual([]);
  }, 30000);
});
