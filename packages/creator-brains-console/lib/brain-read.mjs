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

import { join } from 'node:path';
import { readJsonl } from '../../../scripts/creator-brains/lib/paths.mjs';
import {
  brainsStore, containedPath, inside, readContainedText,
} from './containment.mjs';
import { resolvePointer } from './pointer.mjs';

/*
 * THE POINTER IS NO LONGER READ HERE (R4-01). This module and
 * `read-surface.mjs` each read `current.json` their own way, and round 4
 * measured them disagreeing: the enumeration accepted a generation this module
 * refuses. Both now call `resolvePointer`, which is the single statement of
 * "what is a published generation". `containedDir` and the generation alphabet
 * moved there with it, and are re-exported so existing callers and tests keep
 * one implementation rather than a copy.
 */
export { containedDir, GENERATION } from './pointer.mjs';

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
 * Is `name` a namespace this module can turn into a path?
 *
 * EXPORTED SO THE ENUMERATION GUARD APPLIES THIS SAME RULE AND NOT A COPY
 * (R3-01). `lib/read-surface.mjs` must decide "the engine will traverse this
 * entry, and the console cannot name it" using the identical alphabet — a second
 * regex there would be a second statement of the rule, and the two would drift
 * exactly as the R2-01 contract did.
 */
export function isNamespace(name) {
  return typeof name === 'string' && NAMESPACE.test(name);
}

/*
 * `GENERATION` — the two-shape generation rule (R2-09) — MOVED to
 * `lib/pointer.mjs` (R4-01), so the enumeration and the drawer apply ONE regex
 * rather than two copies of it, and is re-exported at the top of this file.
 *
 * The rule is unchanged: `render.mjs` uses `padStart(4)`, a FLOOR and not a
 * fixed width, so N ≤ 9999 is exactly four digits and N ≥ 10000 is the plain
 * decimal — which is why a five-digit form may not start with `0`. The engine's
 * own four-digit ENUMERATION at `render.mjs` remains a separate, unfixed engine
 * defect: the console may not modify engine files. Recorded, not patched.
 */

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
export { inside };

/*
 * `containedDir(r, slug, generation)` — `brains/<slug>/<generation>`, proven to
 * resolve inside the store — MOVED to `lib/pointer.mjs` (R4-01) and re-exported
 * above. Both checks still run, for the reason stated there: a guard that holds
 * only while another guard holds is the defect class this subsystem exists to
 * remove, and containment of a PATH is not containment of a FILE.
 */

/**
 * Read the claims for a generation that has ALREADY been validated.
 *
 * `readJsonl` drops an unparseable line at parse time, so the parsed count is
 * compared against the real line count and the difference is REPORTED — a
 * damaged generation must not read as "this creator never said that" (HR24).
 *
 * THE LEAF IS CONTAINED BEFORE IT IS READ (R2-02). Containing the DIRECTORY is
 * not enough: `rules.jsonl` inside a contained generation can itself be a
 * junction pointing out, and the probe read exactly that. And a read that FAILS
 * is damage rather than absence (A2-R2-01) — `readContainedText` draws that line.
 */
function readClaims(dir, skipped, root, realRoot) {
  const claims = [];
  const rulesPath = containedPath(root, realRoot, join(dir, 'rules.jsonl'), 'the rules for this generation', 'rules.jsonl');
  const text = readContainedText(rulesPath, 'rules.jsonl', 'rules.jsonl');
  if (text === null) {
    skipped.push({ file: 'rules.jsonl', reason: 'missing from the published generation' });
    return claims;
  }
  const rows = readJsonl(rulesPath);
  const lineCount = text.split('\n').filter((l) => l.trim()).length;
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
  if (!isNamespace(name)) return null;

  const { root, realRoot } = brainsStore(r);

  // ONE POINTER, ONE GENERATION (R2-03) — AND NOW ONE READER (R4-01). The pointer
  // is resolved by `resolvePointer`, the SAME function the enumeration preflight
  // uses, so the drawer and the published count cannot disagree about what is
  // published. That function contains the pointer path before following it
  // (R2-02), distinguishes absence from a failed read, validates the generation's
  // type and spelling, and proves the generation directory resolves inside the
  // store. Everything it cannot resolve it either reports absent — the engine
  // drops those too — or throws.
  const resolved = resolvePointer(r, name);
  // `absent` is "there is no publication here". `no-generation` is the different
  // fact `T-B22c` requires this function to report as a page rather than a 404.
  if (!resolved.present && resolved.reason === 'absent') return null;

  const pointer = resolved.present ? resolved.pointer : null;
  const generation = resolved.present ? resolved.generation : null;

  // ONE directory, computed once by the resolver, used for every read below.
  // This is the R2-03 fix: there is no second pointer resolution anywhere here.
  const dir = resolved.present ? resolved.dir : null;

  const skipped = [];
  const docs = {};
  for (const file of BRAIN_FILES) {
    if (!dir) {
      skipped.push({ file, reason: 'the published pointer names no generation' });
      docs[file] = '';
      continue;
    }
    // EACH LEAF IS CONTAINED TOO (R2-02) — a contained directory can still hold
    // a linked file — and a read that FAILS is damage, not absence (A2-R2-01).
    const leaf = containedPath(root, realRoot, join(dir, file), `'${file}' for '${name}'`, file);
    const text = readContainedText(leaf, file, file);
    if (text === null) {
      skipped.push({ file, reason: 'missing from the published generation' });
      docs[file] = '';
      continue;
    }
    docs[file] = text;
  }

  return {
    generation,
    // A pointer that names no generation has no title to offer — the name is the
    // honest fallback, and `pointer` is genuinely null on that path.
    title: pointer && pointer.title ? pointer.title : name,
    docs,
    claims: dir ? readClaims(dir, skipped, root, realRoot) : [],
    skipped,
  };
}

/*
 * ---------------------------------------------------------------------------
 * `assertReadSurfaceContained` — the whole-surface preflight — lives in
 * `lib/read-surface.mjs` (R3-01), beside the enumeration it serves.
 *
 * IT NO LONGER CALLS `readPointer` EITHER (R4-01). Both this module and the walk
 * used to read `current.json` their own way, and round 4 measured them
 * disagreeing — the walk counted a traversal generation as healthy while this
 * module refused it. There is now exactly ONE pointer read in the console, in
 * `lib/pointer.mjs`, and `R2-03b` pins that fact across the whole `lib/`
 * directory rather than in this file alone.
 * ---------------------------------------------------------------------------
 */
