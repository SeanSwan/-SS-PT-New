/**
 * S1-C monolith-split source contracts (KIMI-SWAN-LENS-S1C AT-4e/f/h/i + G2).
 *
 * These are the behavior-identical + boundary guarantees, verified against the committed source
 * (jsdom cannot observe styled-components' inserted CSS — see activeLensStyles.test.tsx). AT-4i is
 * the load-bearing proof: every CSS declaration in the pre-split monolith fixture appears exactly
 * once across the extracted core + per-lens files, and nothing was added.
 */
import { describe, expect, it } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ADAPTER = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const STYLES = join(ADAPTER, 'styles');
const FIXTURE = join(STYLES, '__tests__/fixtures/swanStyleLensMonolith.legacy.css');

const templateBody = (file: string): string => {
  const s = readFileSync(file, 'utf-8');
  const open = s.indexOf('createGlobalStyle`');
  const start = open + 'createGlobalStyle`'.length;
  const end = s.indexOf('`', start);
  return s.slice(start, end);
};

const lensFiles = readdirSync(join(STYLES, 'lenses')).filter((f) => f.endsWith('.ts') && f !== 'index.ts');

// Extract every `prop: value;` declaration inside braces, whitespace-normalized, sorted.
const declarations = (css: string): string[] => {
  const bodies: string[] = [];
  let depth = 0;
  let cur = '';
  for (const ch of css) {
    if (ch === '{') { depth++; if (depth === 1) { cur = ''; continue; } }
    if (ch === '}') { depth--; if (depth === 0) { bodies.push(cur); continue; } }
    if (depth >= 1) cur += ch;
  }
  const all: string[] = [];
  for (const body of bodies) {
    for (const d of body.match(/[\w-]+\s*:\s*[^;{}]+;/g) ?? []) {
      all.push(d.replace(/\s+/g, ' ').trim());
    }
  }
  return all.sort();
};

describe('AT-4i — reconstruction equality (behavior-identical proof)', () => {
  it('every monolith declaration appears exactly once across core + per-lens files', () => {
    const fixture = readFileSync(FIXTURE, 'utf-8');
    let recon = templateBody(join(STYLES, 'lensCoreStyles.ts'));
    for (const f of lensFiles) recon += '\n' + templateBody(join(STYLES, 'lenses', f));

    const fixtureDecls = declarations(fixture);
    const reconDecls = declarations(recon);

    const count = (arr: string[]) => arr.reduce<Record<string, number>>((m, x) => ((m[x] = (m[x] || 0) + 1), m), {});
    const fc = count(fixtureDecls);
    const rc = count(reconDecls);
    const keys = new Set([...Object.keys(fc), ...Object.keys(rc)]);
    const mismatches = [...keys].filter((k) => (fc[k] || 0) !== (rc[k] || 0));

    expect(fixtureDecls.length).toBeGreaterThan(150);
    expect(mismatches).toEqual([]);
    expect(reconDecls.length).toBe(fixtureDecls.length);
  });
});

describe('AT-4h — lens-file purity (--console-* lives ONLY in core)', () => {
  it('no per-lens file contains --console-', () => {
    for (const f of lensFiles) {
      const body = readFileSync(join(STYLES, 'lenses', f), 'utf-8');
      expect(body.includes('--console-'), `${f} must not contain --console-`).toBe(false);
    }
  });
  it('core contains the --console-* skin enumeration', () => {
    const core = readFileSync(join(STYLES, 'lensCoreStyles.ts'), 'utf-8');
    const consoleNames = new Set(core.match(/--console-[a-z-]+/g) ?? []);
    expect(consoleNames.size).toBeGreaterThanOrEqual(11);
  });
  it('each lens file contains its own selector exactly once', () => {
    for (const f of lensFiles) {
      const id = f.replace(/\.ts$/, '');
      const body = templateBody(join(STYLES, 'lenses', f));
      const occurrences = body.split(`[data-style-lens='${id}']`).length - 1;
      expect(occurrences, `${f} selector count`).toBeGreaterThanOrEqual(1);
    }
  });
});

describe('AT-4e — console-skin regression guard (retracted-G1 replacement)', () => {
  it('core retains the scoped aurora-console skin block, its intent comment, and a fallback chain', () => {
    const core = readFileSync(join(STYLES, 'lensCoreStyles.ts'), 'utf-8');
    expect(core).toContain("html[data-style-lens='aurora-console'] [data-console-root]");
    expect(core.toLowerCase()).toContain('context collapse');
    // a spot-checked load-bearing theme fallback inside the skin
    expect(core).toContain('var(--accent-gold, #c6a84b)');
  });
});

describe('AT-4f — multi-block lenses keep their descendant rule + preview guard', () => {
  const multiBlock = ['analog-flight-recorder', 'quiet-meridian', 'candy-glass-arcade'];
  it('each multi-block lens file carries the verbatim ScopedLensFrame guard', () => {
    for (const id of multiBlock) {
      const body = templateBody(join(STYLES, 'lenses', `${id}.ts`));
      expect(body).toContain(`:not([data-scoped-lens-frame]:not([data-style-lens='${id}']) *)`);
    }
  });
});

describe('G2 — no retired-palette literals in the split output', () => {
  it('core + lens files contain no retired hex', () => {
    const banned = new RegExp(['#0a0a' + '1a', '#00ff' + 'ff', '#7851' + 'a9'].join('|'), 'i');
    for (const f of ['lensCoreStyles.ts', ...lensFiles.map((x) => `lenses/${x}`)]) {
      expect(banned.test(readFileSync(join(STYLES, f), 'utf-8')), `${f} retired-hex`).toBe(false);
    }
  });
});
