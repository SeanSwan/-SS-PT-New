/**
 * copyPack — read-only view of the fleet's copy for the console.
 * @module scripts/swan-brain-console/copyPack
 *
 * WHY THIS PARSES INSTEAD OF IMPORTS
 * `copy/pack.ts` imports `marketingStats` through an extensionless specifier, which
 * Vite resolves and bare Node does not. Rather than change app source to suit a
 * tool, the console reads the canonical values and re-derives each variant's
 * resolved headline/sub exactly the way `copyFor()` does in the app:
 * `OVERRIDES[id] ?? SHARED`.
 *
 * The anti-slop gate itself is NOT re-implemented here. It lives in `antiSlop.ts`
 * and is exercised by the app's test suite, so there is one implementation of the
 * rule and the console only reports it.
 *
 * BOUNDS: reads two files. No network, no writes, no cache.
 */
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const COPY_DIR = 'frontend/src/pages/HomePage/three-worlds/copy';

function tryRead(path) {
  try {
    return existsSync(path) ? readFileSync(path, 'utf8') : null;
  } catch {
    return null;
  }
}

/** Extract simple string fields from a nested record literal by variant id. */
function readOverrides(src) {
  const start = src.indexOf('export const OVERRIDES');
  if (start === -1) return {};
  const open = src.indexOf('{', start);
  const close = src.indexOf('\n};', open);
  const body = src.slice(open, close === -1 ? undefined : close);
  const out = {};
  // Each entry spans one line in the pack: `vNN: { headline: '…', sub: '…', note: '…' },`
  const re = /(v\d{2}):\s*\{([^}]*)\}/g;
  let m;
  while ((m = re.exec(body)) !== null) {
    const id = m[1];
    const fields = m[2];
    const pick = (key) => {
      const km = fields.match(new RegExp(`${key}:\\s*'((?:[^'\\\\]|\\\\.)*)'`));
      return km ? km[1].replace(/\\'/g, "'") : null;
    };
    out[id] = { headline: pick('headline'), sub: pick('sub'), note: pick('note') };
  }
  return out;
}

/** Extract the shared headline/sub. Both are plain literals in the pack. */
function readShared(src) {
  const start = src.indexOf('export const SHARED');
  const body = start === -1 ? '' : src.slice(start, start + 1200);
  const pick = (key) => {
    const m = body.match(new RegExp(`${key}:\\s*'((?:[^'\\\\]|\\\\.)*)'`));
    return m ? m[1].replace(/\\'/g, "'") : null;
  };
  return { headline: pick('headline'), sub: pick('sub') };
}

/**
 * Resolve the copy each variant actually renders.
 * @param {string} repo
 * @param {string[]} ids canonical variant ids, in registry order
 */
export function readCopyPack(repo, ids) {
  const src = tryRead(join(repo, COPY_DIR, 'pack.ts'));
  if (!src) return { present: false, shared: null, variants: [] };
  const shared = readShared(src);
  const overrides = readOverrides(src);
  const antiSlop = tryRead(join(repo, COPY_DIR, 'antiSlop.ts'));
  const bannedCount = antiSlop
    ? (antiSlop.match(/^\s*'[^']+',?\s*$/gm) ?? []).length
    : 0;

  return {
    present: true,
    shared,
    /** Mirrors copyFor(): an override wins, otherwise the shared control copy. */
    variants: ids.map((id) => {
      const o = overrides[id] ?? {};
      return {
        id,
        headline: o.headline ?? shared.headline,
        sub: o.sub ?? shared.sub,
        note: o.note ?? 'inherits the fleet control copy (judged on structure)',
        overridden: Boolean(o.headline),
      };
    }),
    statsModule: src.includes('marketingStats') ? 'marketingStats' : 'unknown',
    bannedPhraseLines: bannedCount,
  };
}
