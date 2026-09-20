/*
 * T-W2 (R12) — static discipline.
 *
 * 05-contracts.md §1: "the UI imports ONLY this [adapter]". If any file under
 * web/src reaches into the engine directly, the S7 transfer artifact is a lie —
 * SwanGuard would inherit a component that only works inside this repo.
 *
 * This is a grep test on purpose: it fails on the *text* of an import, so it
 * cannot be satisfied by a module that merely happens to be mocked in tests.
 *
 * S1-H6 strengthened three things the first draft got wrong:
 *   1. `export … from` re-exports were only caught by accident, and dynamic
 *      imports built from concatenated or split literals were not caught at all;
 *   2. the relative-escape rule only matched `from '…'`, never `import('…')`;
 *   3. the palette rule scanned tokens.css alone — a component could hard-code a
 *      banned colour and the test would still pass.
 * A self-check now runs synthetic offenders through the same matcher, so a
 * future edit cannot silently neuter a pattern without failing the suite.
 */

import { readFileSync, readdirSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join, relative, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const HERE = dirname(fileURLToPath(import.meta.url));
const SRC = resolve(HERE, '..');
const SELF = fileURLToPath(import.meta.url);

function walk(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) out.push(...walk(full));
    else out.push(full);
  }
  return out;
}

const SOURCE_FILES = walk(SRC).filter((f) => /\.(ts|tsx|css)$/.test(f) && f !== SELF);
const PRODUCTION_FILES = SOURCE_FILES.filter((f) => !/\.test\.(ts|tsx)$/.test(f));

/** Comments cannot import a module or set a colour, so they are stripped first. */
function stripComments(text: string): string {
  // `//` is only a comment when not preceded by `:` — that keeps `https://` intact.
  return text.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/[^\n]*/g, '$1');
}

/**
 * Import-ish statements that name the engine, plus relative escapes out of src.
 * A quoted literal naming the engine is a violation wherever it appears, which is
 * what makes concatenated (`'../../' + 'creator-brains/x'`) forms fail too.
 */
const ENGINE_IMPORT_PATTERNS: ReadonlyArray<readonly [string, RegExp]> = [
  ['a string literal names the engine', /['"][^'"\n]*creator-brains/],
  ['the engine name is split across concatenated literals', /['"][^'"\n]*creator['"]\s*\+\s*['"]-?brains/],
  ['a static import escapes web/src', /from\s+['"]\.\.[\\/]\.\.[\\/]\.\.[\\/]/],
  ['a dynamic import/require escapes web/src', /(?:import|require)\s*\(\s*['"]\.\.[\\/]\.\.[\\/]\.\.[\\/]/],
];

function scanEngineImports(text: string): string[] {
  const clean = stripComments(text);
  return ENGINE_IMPORT_PATTERNS.filter(([, pattern]) => pattern.test(clean)).map(([label]) => label);
}

/** Synthetic offenders — each must trip at least one pattern (the self-check). */
const BAD_SAMPLES: ReadonlyArray<readonly [string, string]> = [
  ['static import', "import { x } from '../../creator-brains/lib/schema.mjs';"],
  ['re-export', "export { x } from '../creator-brains/lib/schema.mjs';"],
  ['export-star', "export * from '../../creator-brains/lib/schema.mjs';"],
  ['dynamic import', "const m = await import('../../creator-brains/engine.mjs');"],
  ['require', "const m = require('creator-brains/engine');"],
  ['concatenated literal', "const p = '../../' + 'creator-brains/lib/x.mjs';"],
  ['split engine name', "const p = 'creator' + '-brains/x.mjs';"],
  ['relative escape (static)', "import x from '../../../backend/core/routes.mjs';"],
  ['relative escape (dynamic)', "const m = await import('../../../backend/core/routes.mjs');"],
];

/** Crystalline Swan bans these outright (design.md §4). Hex and rgb forms both. */
const BANNED_COLORS: ReadonlyArray<readonly [string, RegExp]> = [
  ['#0a0a1a', /#0a0a1a\b/i],
  ['#00ffff', /#00ffff\b/i],
  ['#7851a9', /#7851a9\b/i],
  ['rgb form of #0a0a1a', /rgba?\(\s*10\s*,\s*10\s*,\s*26\s*[,)]/i],
  ['rgb form of #00ffff', /rgba?\(\s*0\s*,\s*255\s*,\s*255\s*[,)]/i],
  ['rgb form of #7851a9', /rgba?\(\s*120\s*,\s*81\s*,\s*169\s*[,)]/i],
];

describe('T-W2 static discipline', () => {
  it('finds source files to check (guards against a silently empty scan)', () => {
    expect(SOURCE_FILES.length).toBeGreaterThan(8);
    expect(PRODUCTION_FILES.length).toBeGreaterThan(5);
  });

  it('every pattern still fires on a known-bad sample (guards against a dead regex)', () => {
    const missed = BAD_SAMPLES.filter(([, sample]) => scanEngineImports(sample).length === 0).map(([label]) => label);
    expect(missed).toEqual([]);
  });

  it('no file under web/src imports the engine — the adapter is the only seam', () => {
    const violations: string[] = [];
    for (const file of SOURCE_FILES) {
      const text = readFileSync(file, 'utf8');
      for (const label of scanEngineImports(text)) {
        violations.push(`${relative(SRC, file)} — ${label}`);
      }
    }
    expect(violations).toEqual([]);
  });

  it('every production data-access import goes through the adapters barrel', () => {
    const offenders: string[] = [];
    for (const file of PRODUCTION_FILES) {
      if (file.includes(`${join('src', 'adapters')}`)) continue;
      const text = stripComments(readFileSync(file, 'utf8'));
      if (/from\s+['"][^'"\n]*adapters\/(?!index)[A-Za-z]/i.test(text)) {
        offenders.push(relative(SRC, file));
      }
    }
    expect(offenders).toEqual([]);
  });

  it('tokens.css defines the Crystalline Swan palette', () => {
    const css = stripComments(readFileSync(join(SRC, 'styles', 'tokens.css'), 'utf8'));
    const required = [
      '--midnight-sapphire',
      '--royal-depth',
      '--ice-wing',
      '--arctic-cyan',
      '--gilded-fern',
      '--frost-white',
      '--swan-lavender',
      '--wing-purple',
      '--obsidian-black',
      '--carbon',
      '--graphite',
    ];
    for (const token of required) {
      expect(css, `tokens.css is missing ${token}`).toContain(token);
    }
  });

  it('no production file — not just tokens.css — declares a banned color (S1-H6)', () => {
    const offenders: string[] = [];
    for (const file of PRODUCTION_FILES) {
      const text = stripComments(readFileSync(file, 'utf8'));
      for (const [name, pattern] of BANNED_COLORS) {
        if (pattern.test(text)) offenders.push(`${relative(SRC, file)} — ${name}`);
      }
    }
    expect(offenders).toEqual([]);
  });
});
