/**
 * paths.mjs — every path Astra touches, in ONE place.
 *
 * Astra reads several things and writes TWO. Naming them here rather than at each
 * call site is not tidiness: `T-P-02`/`T-P-03` are write-path SCANS, and a scan
 * can only prove something about a surface whose write paths are enumerable.
 * A path assembled inline at a call site is a path no scan can see.
 *
 * ASTRA'S WRITE SURFACE, COMPLETE — **CORRECTED IN A6, AND IT WAS WRONG BEFORE THAT.**
 * This header used to read *"one file: `scripts/design-brain/config/tuning.json`"*. Measured,
 * that was already false when it was written: `tuningStage.mjs` also writes
 * `${TUNING_PATH}.prior.jsonl` — the byte-exact prior of every commit, which is what makes
 * the revert path possible — and a header that undercounts the write surface is exactly the
 * "a count is a claim about completeness" defect, sitting in the file whose whole job is to
 * be the enumerable list. The surface is now stated as what it is:
 *
 *   1. `scripts/design-brain/config/tuning.json`      — via the staged-commit path (A4)
 *   2. `scripts/design-brain/config/tuning.json.prior.jsonl` — the revert record, same path family
 *   3. `.ai-workflow/astra/briefs.jsonl`              — the brief store (A6), operator text
 *
 * `BRIEF_STORE_PATH` IS NAMED HERE RATHER THAN BUILT AT ITS CALL SITE, for the reason this
 * file exists. A6's brief store is the first thing in Astra that persists operator-authored
 * TEXT, and the packet's carry for this slice said so explicitly: a path assembled inline is
 * a path `T-P-02`/`T-P-03` cannot see. There is now a test that enforces it — every mutating
 * call in Astra's shipped source must derive its path from an export of this module.
 *
 * WHY `.ai-workflow/astra/` AND NOT SOMEWHERE IN THE REPO. Two reasons, both load-bearing:
 * `.ai-workflow/*` is gitignored, so operator briefs are not committed; and `forge-prune`'s
 * deletion guard is a HARD allowlist of `.ai-workflow/forge-runs` (`assertInsideArtifactRoot`),
 * so a brief store one level ABOVE it cannot be reached by a prune. Putting operator text
 * inside the deletable root would have made "prune the generated images" able to delete a
 * brief, and the guard would not have stopped it — it would have permitted it.
 *
 * `taste/` belongs to the taste brain (a separate private repo) and is deliberately absent
 * from this file — the single most important constraint in the packet is that taste keeps
 * exactly ONE writer, and it is not Astra.
 */

import { dirname, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url)); // <repo>/scripts/astra/core

export const ASTRA_ROOT = resolve(HERE, '..'); // <repo>/scripts/astra
export const REPO_ROOT = resolve(ASTRA_ROOT, '..', '..'); // <repo>

export const DESIGN_BRAIN_ROOT = join(REPO_ROOT, 'scripts', 'design-brain');
export const DESIGN_BRAIN_SRC = join(DESIGN_BRAIN_ROOT, 'src');
export const DESIGN_BRAIN_CONFIG = join(DESIGN_BRAIN_ROOT, 'config');

/** The tuning config Astra commits to. Read-only until the A4 commit path exists. */
export const TUNING_PATH = join(DESIGN_BRAIN_CONFIG, 'tuning.json');
export const SPEC_MODE_PATH = join(DESIGN_BRAIN_CONFIG, 'spec-mode.json');

/**
 * The brief store — Astra's second write path, and its first persisted OPERATOR TEXT (A6).
 *
 * `.ai-workflow/astra/`, deliberately NOT under `forge-runs`: see this file's header. The
 * `astra` subdirectory is outside `forge-prune`'s allowlist, so the pruner that deletes
 * generated images cannot delete a brief.
 */
export const ASTRA_STATE_DIR = join(REPO_ROOT, '.ai-workflow', 'astra');
export const BRIEF_STORE_PATH = join(ASTRA_STATE_DIR, 'briefs.jsonl');

export const ASTRA_FIXTURES = join(ASTRA_ROOT, 'fixtures');
export const ASTRA_EVIDENCE = join(ASTRA_ROOT, 'evidence');

/**
 * The tuning preview's fixture set (A4) — 12 claim pairs, so a staged knob change can be
 * scored offline and deterministically before anything is written. Named here because
 * this file's own rule is that a path assembled inline is a path no scan can see.
 */
export const PAIRS_12_PATH = join(ASTRA_FIXTURES, 'pairs-12.jsonl');

/**
 * Loopback only — INV9 / `AC8.1`. Port 7411 sits BESIDE, not on, the taste
 * probe's 7331, so the two can run at once without either stealing the other's
 * socket. `bind.mjs` owns the refusal; this constant only names the default.
 */
export const LOOPBACK_HOST = '127.0.0.1';
export const DEFAULT_PORT = 7411;

/**
 * The taste brain's probe origin. A SEPARATE private repo, reached over HTTP,
 * never imported and never written. Named here so `directions()`'s evidence
 * injection has one origin to read and the write-path scan has one origin to
 * exclude.
 */
export const TASTE_PROBE_ORIGIN = 'http://127.0.0.1:7331';

/** An engine lane's module path, by bare name: `lanePath('corroborate')`. */
export function lanePath(name) {
  return join(DESIGN_BRAIN_SRC, `${name}.mjs`);
}

/**
 * A repo-relative, forward-slashed path — for citations in the board and in
 * evidence files. Windows `path.relative` returns backslashes, which makes every
 * citation in a committed artifact platform-dependent; normalising here means a
 * citation written on Windows still matches the same file on CI.
 */
export function repoRelative(absolutePath) {
  return relative(REPO_ROOT, absolutePath).split(sep).join('/');
}
