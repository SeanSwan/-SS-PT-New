/**
 * ============================================================================
 * FILE: quarantine.count.test.mjs
 * PURPOSE: Hold the SWA-231 quarantine set at its created size — quarantines
 *          may shrink (un-skips) but may NEVER silently grow.
 *
 * WHY: EX-0 (blueprint §2.2) triaged the 23 red files on main. 16 were healthy
 * node:test files in the wrong runner (moved to tests/node-runner/), 4 tests
 * were fixed outright, and exactly FIVE markers were placed: two it.skip pins
 * that predate the crop-rescan feature (ce930d9a3) and three load-failure
 * renames (.test.quarantined.mjs). A sixth marker appearing anywhere means
 * someone quarantined a failure instead of fixing it, without the review that
 * created this ceiling.
 * ============================================================================
 */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, it, expect } from 'vitest';

const MARKER = 'QUARANTINED SWA-231';
const ROOTS = ['tests', '__tests__'];
const CEILING = 5; // set at EX-0 creation; lower it when you un-skip, never raise it casually

function markerFiles(dir, out = []) {
  for (const entry of readdirSync(dir)) {
    const p = join(dir, entry);
    if (statSync(p).isDirectory()) {
      if (entry === 'node_modules') continue;
      markerFiles(p, out);
    } else if (/\.(mjs|js)$/.test(entry) && entry !== 'quarantine.count.test.mjs') {
      if (readFileSync(p, 'utf8').includes(MARKER)) out.push(p);
    }
  }
  return out;
}

describe('SWA-231 quarantine ceiling', () => {
  it(`holds the quarantine marker count at <= ${CEILING}`, () => {
    const found = ROOTS.flatMap((r) => markerFiles(r));
    // Failure message carries the list so the offender is named, not hunted.
    expect(found, `files carrying "${MARKER}":\n${found.join('\n')}`).toHaveLength(
      Math.min(found.length, CEILING) === found.length ? found.length : CEILING,
    );
    expect(found.length).toBeLessThanOrEqual(CEILING);
  });
});
