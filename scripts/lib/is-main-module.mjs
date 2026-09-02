/**
 * is-main-module.mjs — "was this file RUN, or merely imported?"
 * ============================================================================
 *
 * ── WHY THIS EXISTS AT ALL ──────────────────────────────────────────────────
 * Three scripts here act at module scope — they install packages, spawn test runs, delete
 * things. On 2026-09-01 all three were nearly imported by their own tests, and one of them
 * WAS: `deps-restore.mjs` printed "restored 0 package(s)" as a side effect of a test
 * importing a helper from it. A repair tool running itself because someone tested it.
 *
 * The usual guard is `import.meta.url === pathToFileURL(process.argv[1]).href`. On Windows
 * that is a string comparison over a path whose drive letter case is not normalised:
 *
 *     pathToFileURL('C:\\x\\y.mjs').href  ->  file:///C:/x/y.mjs
 *     pathToFileURL('c:\\x\\y.mjs').href  ->  file:///c:/x/y.mjs   // not equal
 *
 * Measured, not assumed. A shell, npm script, or editor that hands over a lower-cased drive
 * makes the guard FALSE, and then the script does nothing at all — silently, exiting 0.
 * For a repair tool that is the worst available failure: the operator runs it, sees no
 * error, and believes the environment is fixed.
 *
 * ── SO THIS COMPARES PATHS, NOT URL STRINGS ─────────────────────────────────
 * Both sides are resolved to real filesystem paths (following symlinks, which matters here
 * because worktrees are full of them) and compared case-insensitively on win32 only —
 * Linux paths ARE case-sensitive and folding them there would make two genuinely different
 * files look like one.
 *
 * ── AND IT FAILS TOWARD "IMPORTED" ──────────────────────────────────────────
 * If anything throws — a deleted argv[1], a permission error on realpath — this answers
 * false. The two failure directions are not symmetric: a false negative means a script does
 * not run when invoked, which is loud and immediate. A false positive means a script that
 * installs or deletes fires during an unrelated import, which is the accident this file
 * exists to prevent.
 */

import { realpathSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';

/**
 * @param {string} importMetaUrl  the calling module's `import.meta.url`
 * @returns {boolean} true only when that module is the entry point Node was given
 */
export function isMainModule(importMetaUrl) {
  try {
    const entry = process.argv[1];
    if (!entry || !importMetaUrl) return false;

    const norm = (p) => {
      // realpath resolves symlinks and normalises separators; it throws on a path that is
      // not there, which is why the whole thing sits in a try.
      let out;
      try { out = realpathSync(p); } catch { out = resolve(p); }
      return process.platform === 'win32' ? out.toLowerCase() : out;
    };

    return norm(fileURLToPath(importMetaUrl)) === norm(entry);
  } catch {
    return false;
  }
}
