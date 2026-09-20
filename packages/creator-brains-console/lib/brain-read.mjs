/**
 * ============================================================================
 * FILE: packages/creator-brains-console/lib/brain-read.mjs
 * PURPOSE: The ONE contained reader for a published LANE C generation.
 * PART OF: Creator Brains Console (blueprint 05 §1, §3)
 * SLICE: S0H
 * ============================================================================
 *
 * WHY THIS FILE EXISTS (A1-11, then R2-02 / R2-03).
 *
 * The engine's store has three lanes:
 *   LANE A  durable   registry.json / state.json — roster and video states
 *   LANE B  private   docs/<channelId>/<videoId>.json — RAW TRANSCRIPT TEXT
 *   LANE C  derived   brains/<slug>/<generation>/ — published claims
 *
 * LANE B is the creator's own spoken content and MUST NOT be served by any
 * surface. LANE C is the product. This module is the only place in the console
 * that turns a caller-supplied name into a filesystem path, and the only place
 * that reads LANE C.
 *
 * The containment rules live here ONCE because they were previously inline in
 * the drawer and absent from the query path. A boundary implemented twice is a
 * boundary implemented once and a half.
 *
 * MEASURED 2026-09-20 against the pre-fix code, with a directory of the same
 * three filenames placed beside the store:
 *
 *   a pointer naming generation `../../../outside/gen-0001`  → 200, served it
 *   `brains/<ns>/gen-0001` as a junction to that directory   → 200, served it
 *   `brains/<ns>` itself as a junction to it                 → 200, served it
 *   an encoded traversal in the SLUG (`..%2F..%2Foutside`)   → 404, no leak
 *
 * So the generation component and any filesystem LINK are live, and the slug
 * text is not — the router does not decode `%2F`, and `fetch`/`undici` strip a
 * raw `..` before the wire. The slug alphabet check below is still required, and
 * NOT because it fixes a live hole: the slug is safe TODAY only because another
 * module declines to decode, which is an assumption owned elsewhere. A guard
 * that holds only while another guard holds is the defect class this module
 * exists to remove.
 *
 * ONE POINTER, ONE GENERATION (R2-03). The pointer is read ONCE. Every file —
 * the three markdown documents AND `rules.jsonl` — is read from the directory
 * that one read named. An earlier version read the markdown from the validated
 * generation but re-resolved the pointer for claims, and compared generations
 * only INSIDE the loop over hits; an empty generation therefore skipped the
 * comparison entirely and served generation 1's markdown beside generation 2's
 * (empty) claims. A guard inside a loop over possibly-empty results is a guard
 * that does not run.
 *
 * @module creator-brains-console/lib/brain-read
 */

import { existsSync, readFileSync, realpathSync } from 'node:fs';
import { isAbsolute, join, relative, resolve } from 'node:path';
import { readPointer } from '../../../scripts/creator-brains/lib/render.mjs';
import { paths, readJsonl } from '../../../scripts/creator-brains/lib/paths.mjs';
import { ApiError, CODE } from './errors.mjs';

/** The three MARKDOWN files a brain page exposes verbatim. */
export const BRAIN_FILES = Object.freeze(['index.md', 'topics.md', 'timeline.md']);

/**
 * A namespace that cannot be a path.
 *
 * The engine produces two shapes and only two: `slugify` yields `[a-z0-9-]`
 * (≤60 chars, no leading or trailing hyphen) and a YouTube channel id is
 * `UC[A-Za-z0-9_-]+`. This allowlist covers both and admits no `.`, no
 * separator and no empty name — so `..`, `/`, `\` and a NUL byte are all
 * unrepresentable.
 */
const NAMESPACE = /^[A-Za-z0-9][A-Za-z0-9_-]{0,63}$/;

/**
 * The generation directory shape the engine writes.
 *
 * R2-09: this was `/^gen-\d{4}$/`, which rejects `gen-10000` — and the engine
 * emits exactly that once a creator passes 9999 generations, because
 * `render.mjs` uses `padStart(4)`, a FLOOR and not a fixed width. A pattern that
 * refuses a name the writer can produce turns a legitimate brain into reported
 * store damage.
 *
 * The fix is a TWO-SHAPE rule, not a looser bound. `padStart(4)` means the
 * engine writes the CANONICAL decimal of N, left-padded only up to four:
 *
 *   N ≤ 9999   → exactly four digits, leading zeros included   gen-0001, gen-9999
 *   N ≥ 10000  → the plain decimal, five or more digits        gen-10000, gen-100000
 *
 * So a five-digit form may NOT start with `0` — `gen-00001` is the decimal 1
 * padded to five, which `padStart(4)` never produces. Writing `\d{4,}` here
 * accepted it, and `T-B25b2` caught that: it is the difference between "at least
 * four digits" and "canonical at four digits, canonical above".
 *
 * The engine's own four-digit ENUMERATION at `render.mjs` is a separate defect
 * and is NOT fixed here: the console may not modify engine files. Recorded
 * rather than patched.
 */
const GENERATION = /^gen-(?:\d{4}|[1-9]\d{4,})$/;

/**
 * Required fields on a rule row — a row missing any of these is not a claim.
 *
 * This MIRRORS `REQUIRED_FIELDS` in the engine's `lib/query.mjs`, which is not
 * exported. A behavioural cross-check test (`bridge.brains.test.mjs`, the A1-04
 * series) asserts this list against the engine's source literal, so an engine
 * change fails loudly here instead of silently widening what counts as a claim.
 */
const REQUIRED_FIELDS = Object.freeze(['claim_id', 'creator_id', 'video_id', 't_start_ms', 'key_phrase']);

/** Is `target` strictly inside `root`, after both have been normalised? */
function inside(root, target) {
  const rel = relative(root, target);
  return rel !== '' && !rel.startsWith('..') && !isAbsolute(rel);
}

/**
 * `brains/<slug>/<generation>`, proven to resolve inside the store.
 *
 * WHY BOTH CHECKS WHEN THE ALPHABET ALREADY FORBIDS TRAVERSAL. Because a check
 * that holds only while another check happens to hold is precisely the defect
 * class this module exists to remove. Containment is asserted directly, so
 * loosening `NAMESPACE` later cannot silently reopen the hole.
 *
 * AND WHY CONTAINMENT OF THE PATH IS NOT CONTAINMENT OF THE FILE. `readFileSync`
 * follows junctions and symlinks, so `brains/<slug>` — or the generation
 * directory itself — may be a link to anywhere while remaining lexically inside.
 * `realpathSync` resolves the whole chain, which is the only thing that can see
 * that. All three measured vectors above are refused by this function.
 *
 * Exported because the query path must use the SAME check, not a copy (R2-02).
 */
export function containedDir(r, slug, generation) {
  const root = resolve(paths(r).brainsDir);
  const dir = resolve(root, slug, generation);
  if (!inside(root, dir)) {
    throw new ApiError(
      CODE.STORE_DAMAGED,
      `'${slug}/${generation}' does not resolve inside the brains store`,
      { file: 'current.json' },
    );
  }

  let realRoot = null;
  let real = null;
  try { realRoot = realpathSync(root); } catch { /* no store yet — nothing to escape */ }
  try { real = realpathSync(dir); } catch { /* absent generation, reported per file below */ }

  // An ABSENT generation directory is not a fault — it is reported file by file.
  // Only one that EXISTS and escapes is a store fault.
  if (real !== null && realRoot !== null && !inside(realRoot, real)) {
    throw new ApiError(
      CODE.STORE_DAMAGED,
      `the published generation for '${slug}' resolves outside the brains store`,
      { file: 'current.json' },
    );
  }
  return dir;
}

/**
 * Read the claims for a generation that has ALREADY been validated.
 *
 * `readJsonl` drops an unparseable line at parse time, so the parsed count is
 * compared against the real line count and the difference is REPORTED — a
 * damaged generation must not read as "this creator never said that" (HR24).
 */
function readClaims(dir, skipped) {
  const claims = [];
  const rulesPath = join(dir, 'rules.jsonl');
  if (!existsSync(rulesPath)) {
    skipped.push({ file: 'rules.jsonl', reason: 'missing from the published generation' });
    return claims;
  }
  const rows = readJsonl(rulesPath);
  let lineCount = 0;
  try {
    lineCount = readFileSync(rulesPath, 'utf-8').split('\n').filter((l) => l.trim()).length;
  } catch {
    skipped.push({ file: 'rules.jsonl', reason: 'unreadable' });
    return claims;
  }
  if (lineCount !== rows.length) {
    skipped.push({ file: 'rules.jsonl', reason: `${lineCount - rows.length} unparseable line(s)` });
  }
  for (const row of rows) {
    const missing = REQUIRED_FIELDS.filter((f) => row[f] === undefined || row[f] === null);
    if (missing.length) {
      skipped.push({ file: 'rules.jsonl', claim: row.claim_id || '(no id)', reason: `missing ${missing.join(', ')}` });
      continue;
    }
    claims.push(row);
  }
  return claims;
}

/**
 * Read one published brain, from exactly one pointer read.
 *
 * Returns `null` when there is no published brain for `name` — an absent brain
 * and an unnameable one are the same answer from a caller's side. THROWS only
 * on store DAMAGE, because damage and absence want opposite responses and
 * collapsing them is how a corrupt store comes to look like an empty one.
 *
 * @returns {{generation: string|null, title: string, docs: object, claims: object[], skipped: object[]}|null}
 */
export function readPublishedBrain(r, name) {
  // Refuse before the pointer read. `pointerPath` joins this string unsanitised,
  // so a name that cannot be a namespace must not reach it at all.
  if (typeof name !== 'string' || !NAMESPACE.test(name)) return null;

  let pointer;
  try {
    pointer = readPointer(r, name);
  } catch {
    pointer = null;
  }
  if (!pointer) return null;

  const generation = typeof pointer.generation === 'string' && pointer.generation
    ? pointer.generation
    : null;

  // An ABSENT generation is incomplete; an IMPOSSIBLE one is damage. Reporting an
  // impossible generation as three empty documents is the S1-H15 shape again: a
  // store fault dressed as a legitimate brain with nothing in it.
  if (generation !== null && !GENERATION.test(generation)) {
    throw new ApiError(
      CODE.STORE_DAMAGED,
      `the published pointer for '${name}' names generation '${String(generation).slice(0, 80)}', `
        + 'which the engine never writes',
      { file: 'current.json' },
    );
  }

  // ONE directory, computed once, used for every read below. This is the R2-03
  // fix: there is no second pointer resolution anywhere in this function.
  const dir = generation ? containedDir(r, name, generation) : null;

  const skipped = [];
  const docs = {};
  for (const file of BRAIN_FILES) {
    if (!dir) {
      skipped.push({ file, reason: 'the published pointer names no generation' });
      docs[file] = '';
      continue;
    }
    try {
      docs[file] = readFileSync(join(dir, file), 'utf8');
    } catch {
      skipped.push({ file, reason: 'missing from the published generation' });
      docs[file] = '';
    }
  }

  return {
    generation,
    title: pointer.title ?? name,
    docs,
    claims: dir ? readClaims(dir, skipped) : [],
    skipped,
  };
}
