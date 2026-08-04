/**
 * ============================================================================
 * FILE: lib/diverged-from-main.mjs
 * PURPOSE: Which model files does this tree disagree with origin/main about?
 * ADDED: 2026-07-29 (continuous-cleanup loop; SWA-86 / SWA-87 / SWA-98)
 * ============================================================================
 *
 * WHY THIS EXISTS: the DB audits import models from DISK and query the PRODUCTION schema. Where the
 * two disagree, a verdict describes code that is not deployed — stated with full confidence and no
 * warning. Both audits need the same annotation, so it lives here rather than being cloned.
 *
 * This is not hypothetical. Measured 2026-07-29 while a parallel agent held four model files
 * modified and UNCOMMITTED in this tree (TrainerPermissions, FoodScanHistory, UserAchievement,
 * associations — precisely the SWA-87 broken-column set):
 *
 *   - audit-model-health BROKEN COLUMN fell 5 -> 3 -> 2 within one review pass
 *   - audit-write-paths CANNOT INSERT fell 2 -> 0, reading SWA-98's finding as solved
 *
 * Neither number moved because production improved. `origin/main` still carried the bugs.
 *
 * COMPARES AGAINST THE WORKING TREE, NOT HEAD. The first version of this check diffed
 * `origin/main..HEAD` and was blind to uncommitted edits — which is the exact case above, so it
 * named none of the four offending files. Omitting `HEAD` from the diff is deliberate and
 * load-bearing; do not "tidy" it back in.
 *
 * BEST-EFFORT BY DESIGN: no git, no origin/main ref, or a detached checkout returns an empty set and
 * the caller simply cannot annotate. It must never throw — an audit that dies because it could not
 * compute a caveat is worse than one that reports without the caveat.
 */

import { execFileSync } from 'node:child_process';
import path from 'node:path';

/**
 * @param {string} modelsDir absolute path to backend/models
 * @returns {Set<string>} paths relative to models/ (`Foo.mjs`, `social/Bar.mjs`) that differ from
 *   origin/main, including uncommitted working-tree edits. Empty when it cannot be determined.
 */
export function divergedModelFiles(modelsDir) {
  try {
    const out = execFileSync(
      'git',
      // No `HEAD`: compare origin/main to the WORKING TREE so uncommitted edits count. See above.
      ['diff', '--name-only', 'origin/main', '--', 'models'],
      { cwd: path.join(modelsDir, '..'), encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] },
    );
    return new Set(
      out
        .split('\n')
        .filter(Boolean)
        // git emits REPO-ROOT-relative paths (`backend/models/Foo.mjs`) regardless of cwd, while
        // callers hold names relative to models/. Stripping only `models/` left every entry
        // unmatched and the warning silently never fired.
        .map((p) => p.trim().replace(/^.*?models\//, '')),
    );
  } catch {
    return new Set();
  }
}

/**
 * Build the caveat lines for a set of examined files, or [] when there is nothing to say.
 *
 * Files that FAILED are listed first and never truncated: a diverged failure is the actionable case,
 * and alphabetical truncation once hid the single most important entry (`TrainerPermissions.mjs`)
 * badly enough that an unverified claim about it reached a commit message.
 *
 * @param {Set<string>} diverged from divergedModelFiles()
 * @param {Iterable<string>} examined display names, `file.mjs` or `file.mjs:ExportName`
 * @param {Iterable<string>} failed subset of examined that reported a problem
 */
export function divergenceCaveat(diverged, examined, failed) {
  if (!diverged.size) return [];
  const strip = (f) => String(f).split(':')[0];
  const examinedFiles = new Set([...examined].map(strip));
  const failedFiles = new Set([...failed].map(strip));

  const overlap = [...examinedFiles].filter((f) => diverged.has(f));
  if (!overlap.length) return [];

  const bad = overlap.filter((f) => failedFiles.has(f)).sort();
  const good = overlap.filter((f) => !failedFiles.has(f)).sort();

  const lines = [
    '',
    `  ⚠ ${overlap.length} examined model file(s) DIFFER from origin/main (including UNCOMMITTED`,
    '    edits). For those, this verdict describes the code ON DISK HERE, not deployed code.',
    '    Confirm against main before treating a pass as "fixed in production" or a failure as live.',
  ];
  if (bad.length) {
    lines.push(`    diverged AND failing (${bad.length}) — verdict may not hold on main:`);
    for (const f of bad) lines.push(`      ${f}`);
  }
  if (good.length) {
    lines.push(`    diverged and passing (${good.length}) — the pass may be local only:`);
    for (const f of good.slice(0, 8)) lines.push(`      ${f}`);
    if (good.length > 8) lines.push(`      … and ${good.length - 8} more`);
  }
  return lines;
}
