/**
 * Every PRODUCTION mint declares the M3 verdict.
 * ==============================================
 * F2-02 (GLM 5.3-flash round 2): `requiresPhysicalConfirm = false` is a
 * defaulted parameter on both mints — the same permissive-default anti-pattern
 * I had just removed from `inputMode` one door down. A security field whose
 * absence means "no protection" should not be silently absent.
 *
 * WHY A GUARD AND NOT A THROW, since the obvious fix is to make the parameter
 * required. The analogy to `inputMode` is imperfect in the way that decides it:
 * `inputMode` was ALWAYS absent in production, so its default WAS the live
 * behaviour and the rule was inert. This field is always supplied by both
 * production callers, so the default is never exercised — it guards only against
 * a future third caller. Making it throw would force 22 test call sites across 9
 * files to declare a field their tests are not about, which buys churn rather
 * than safety and pushes people toward passing `false` to shut it up. That is
 * how a security field becomes noise.
 *
 * The invariant worth enforcing is the one the sweep actually established: every
 * production mint declares. This checks that mechanically, so a third call site
 * added later fails here instead of quietly inheriting `false`.
 *
 * WHEN THIS FAILS: you added a mint call. Pass `requiresPhysicalConfirm` from
 * the tier verdict — do NOT add your call site to an exclusion list, and do not
 * pass a literal `false` to move on. If your caller genuinely cannot resolve a
 * tier, that is the finding, not the test.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const SERVICES = join(HERE, '..', '..', 'services', 'ai');

/** Files that may legitimately mint. Adding one here is a deliberate act. */
const MINT_CALLERS = ['commandExecutor.mjs'];
const MINTS = ['prepareDestructiveOperation', 'preparePendingConfirmation'];

/** Slice the argument object of `fn({ ... })`, brace-balanced. */
function callArgumentBlocks(src, fn) {
  const blocks = [];
  const needle = `${fn}({`;
  let i = src.indexOf(needle);
  while (i !== -1) {
    let depth = 0;
    let j = i + needle.length - 1;
    for (; j < src.length; j += 1) {
      if (src[j] === '{') depth += 1;
      else if (src[j] === '}') { depth -= 1; if (depth === 0) break; }
    }
    blocks.push(src.slice(i, j + 1));
    i = src.indexOf(needle, j);
  }
  return blocks;
}

describe('every production mint declares requiresPhysicalConfirm', () => {
  const src = readFileSync(join(SERVICES, 'commandExecutor.mjs'), 'utf8');

  it('the guard found the call sites it is guarding — if this fails, the parse broke', () => {
    const found = MINTS.flatMap((m) => callArgumentBlocks(src, m));
    expect(found.length).toBe(2);
  });

  for (const mint of MINTS) {
    it(`${mint} passes the tier's verdict`, () => {
      const blocks = callArgumentBlocks(src, mint);
      expect(blocks.length).toBeGreaterThan(0);
      for (const block of blocks) {
        expect(block).toMatch(/requiresPhysicalConfirm\s*:/);
        // And from the VERDICT, not a literal. `requiresPhysicalConfirm: false`
        // hardcoded would satisfy the line above while restoring the inert rule
        // this whole thread is about.
        expect(block).toMatch(/requiresPhysicalConfirm\s*:\s*Boolean\(\s*verdict\.physical\s*\)/);
      }
    });
  }

  it('no OTHER service file mints without going through the executor', () => {
    // A second minting file would inherit none of the executor's tier
    // resolution — the "second code path inherits nothing" failure this lane has
    // already hit twice (the confirm caller, the audit writer).
    const offenders = [];
    for (const mint of MINTS) {
      const re = new RegExp(`\\b${mint}\\s*\\(`, 'g');
      for (const file of ['commandDispatcher.mjs', 'pendingConfirmations.mjs', 'destructiveOperations.mjs']) {
        const body = readFileSync(join(SERVICES, file), 'utf8');
        // The defining files export these; only a CALL outside the allowed
        // caller matters, and definitions read `export async function <name>(`.
        const calls = body.match(re) || [];
        const defs = body.match(new RegExp(`function\\s+${mint}\\s*\\(`, 'g')) || [];
        if (calls.length > defs.length && !MINT_CALLERS.includes(file)) {
          offenders.push(`${file}:${mint}`);
        }
      }
    }
    expect(offenders).toEqual([]);
  });
});
