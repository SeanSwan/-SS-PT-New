/**
 * Every `ctx.<prop>` in the pipeline must be a property the context HAS.
 * ======================================================================
 * On 2026-09-03 `resolveTierForCommand` read `ctx.routeContext`. There is no
 * such property — `createContext` stores caller options under `ctx.options`,
 * and every other reader goes through `ctx.options.routeContext`. The read
 * yielded `undefined`, the `??` default took over, and `inputMode` was 'text'
 * on every request. The M3 voice rule could never fire.
 *
 * Nothing caught it, and nothing would have:
 *   - it is valid JavaScript, so `node --check` and the build are happy;
 *   - the property is optional-chained, so there is no crash to notice;
 *   - the `?? 'text'` default makes the wrong answer look like a normal one;
 *   - and the unit tests all called the tier function DIRECTLY, which never
 *     executes the broken read.
 *
 * A typo'd property on a plain object is invisible in every direction. This is
 * the cheap structural check that makes it visible: parse the file, collect
 * every property accessed on `ctx`, and require each one to be either a field
 * `createContext` returns or a field the pipeline deliberately attaches later.
 *
 * WHEN THIS FAILS ON YOU: you either (a) typo'd — check whether the field lives
 * under `ctx.options`, which is where all caller-supplied data lives, or
 * (b) added a genuine new context field, in which case add it to
 * ASSIGNED_DURING_PIPELINE below with a note saying which step sets it. Do not
 * widen the list to make a red test green without knowing which of those two
 * you are doing; that is how the guard becomes decoration.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const SRC = readFileSync(join(HERE, '..', '..', 'services', 'ai', 'commandExecutor.mjs'), 'utf8');

/** Read the shape straight from createContext — never hand-maintain a copy. */
function contextFieldsFromSource(src) {
  const body = src.match(/function createContext\([^)]*\)\s*\{\s*return\s*\{([\s\S]*?)\n\s*\};\s*\n\}/);
  if (!body) throw new Error('createContext not found — this guard is reading the wrong file');
  const fields = new Set();
  for (const line of body[1].split('\n')) {
    const m = line.match(/^\s*([A-Za-z_$][\w$]*)\s*[:,]/);
    if (m) fields.add(m[1]);
  }
  return fields;
}

/**
 * Fields no literal creates because a pipeline step attaches them. Each needs a
 * reason, so that "add it to the list" stays a decision rather than a reflex.
 */
const ASSIGNED_DURING_PIPELINE = new Map([
  ['clientIdentity', 'stepResolveClient — the F-05a selection/spoken-name pair'],
  ['confirmationTier', 'stepConfirmation — the resolved voice tier verdict'],
  ['skipRemainingSteps', 'any step that short-circuits the pipeline'],
]);

describe('command pipeline context shape', () => {
  it('the guard can see the context it is guarding — if this fails, the parse broke', () => {
    const fields = contextFieldsFromSource(SRC);
    expect(fields.has('options')).toBe(true);
    expect(fields.has('intent')).toBe(true);
    expect(fields.size).toBeGreaterThan(8);
  });

  it('reads no property the context does not have', () => {
    const known = new Set([...contextFieldsFromSource(SRC), ...ASSIGNED_DURING_PIPELINE.keys()]);
    const unknown = new Map();

    for (const m of SRC.matchAll(/\bctx\??\.\s*([A-Za-z_$][\w$]*)/g)) {
      const prop = m[1];
      if (known.has(prop)) continue;
      // Ignore mentions inside comments — the fix for this very bug documents
      // the bad property by name, and a guard that cannot tell prose from code
      // would force us to stop naming our own mistakes.
      const lineStart = SRC.lastIndexOf('\n', m.index) + 1;
      const line = SRC.slice(lineStart, SRC.indexOf('\n', m.index));
      if (/^\s*(\*|\/\/|\/\*)/.test(line)) continue;
      unknown.set(prop, line.trim());
    }

    expect(
      Object.fromEntries(unknown),
      'ctx.<prop> reads that createContext never produces — caller data lives under ctx.options',
    ).toEqual({});
  });

  it('caller-supplied data is reached through ctx.options, not off ctx directly', () => {
    // The specific pairing that broke. `routeContext` is an OPTION; reading it
    // off ctx returns undefined forever, and optional chaining hides that.
    expect(SRC).toMatch(/ctx\.options\??\.\s*routeContext\?\.\s*inputMode/);
  });
});
