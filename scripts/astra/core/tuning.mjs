/**
 * tuning.mjs — the knobs, READ-ONLY, and what each one actually controls.
 *
 * `config/tuning.json` says of itself: *"ALL knobs live here — the engine hardcodes
 * none, so a cold-client install retunes without touching code."* So this module is
 * the console's whole view of the engine's behaviour: if a value is not in that
 * file, no dial controls it, and the Tune pane must not imply otherwise.
 *
 * READ-ONLY IN THIS SLICE. The commit path (stage → preview → atomic write →
 * byte-exact revert) is slice A4. Nothing here writes, and that is load-bearing
 * rather than merely unfinished: `T-M-01` requires that a CORRUPT `tuning.json`
 * produces a named error and **no write**, which is only provable while this
 * module has no write path to accidentally reach.
 *
 * THE BLAST RADIUS IS THE POINT. `auto.S` is not "a number that makes matching
 * stricter". It feeds the auto-corroboration gate, which is the one automated
 * write to canon-adjacent state — so moving it changes whether a claim is
 * appended to an ACCEPTED claim WITHOUT SEAN EVER SEEING IT. A Tune pane that
 * showed the number and not that consequence would be the most dangerous surface
 * in the product, and it would look like a slider.
 */

import { readFileSync } from 'node:fs';
import { TUNING_PATH } from './paths.mjs';

/**
 * What each knob family feeds. Written from the engine's own prose, not invented:
 * `tuning.json`'s `$comment` and `corroborate.mjs`'s module docstring (which
 * spells out AUTO / MERGE QUEUE / DEDUP / CONTRADICTION / FRESH).
 *
 * `gate` marks the families that can move state WITHOUT human review. The Tune
 * pane must render those differently — a knob that needs a letter afterwards is a
 * different object from a knob that doesn't.
 */
export const BLAST_RADIUS = Object.freeze({
  'auto.': {
    gate: true,
    affects: 'the AUTO-CORROBORATION GATE (corroborate.mjs) — the one automated write to '
      + 'canon-adjacent state. A claim clearing it is appended to an ACCEPTED claim and never '
      + 'shown to Sean. It only ever ADDS EVIDENCE and never edits principle text, but it moves '
      + 'confidence without review.',
  },
  'mergeBand.': {
    gate: false,
    affects: 'the merge-queue floor (corroborate.mjs). Below it a claim is FRESH and needs a '
      + 'letter; at or above it the claim is queued with a pre-filled suggestion for Sean.',
  },
  'weights.': {
    gate: true,
    affects: 'the similarity score every threshold above is a threshold ON (similarity.mjs) — '
      + 'S/O/J. Changing a weight moves every gate at once, in a direction that is not obvious '
      + 'from the number.',
  },
  'novelty.': {
    gate: false,
    affects: 'the novelty report (novelty.mjs) — window, productive, tappedOut, and the two '
      + 'minimums that stop a cold corpus reporting a false signal.',
  },
});

/** Read the knobs. Read-only; never writes, and refuses to guess at a parse failure. */
export function readTuning(path = TUNING_PATH) {
  let raw;
  try {
    raw = readFileSync(path, 'utf8');
  } catch (e) {
    const err = new Error(`E_TUNING_UNREADABLE: cannot read ${path} — ${e.message}`);
    err.code = 'E_TUNING_UNREADABLE';
    err.path = path;
    throw err;
  }
  try {
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      throw new Error('root is not an object');
    }
    return parsed;
  } catch (e) {
    // NAMED, and it does NOT fall back to defaults. Silently substituting a
    // default would make a corrupted file look like a configured one and hide the
    // damage until someone wondered why the engine retuned itself.
    const err = new Error(
      `E_TUNING_INVALID: ${path} is not valid JSON (${e.message}). Refusing to substitute `
      + 'defaults — a corrupted config must look corrupted.',
    );
    err.code = 'E_TUNING_INVALID';
    err.path = path;
    throw err;
  }
}

/**
 * Flatten the nested config to dotted keys: `{ 'auto.S': 0.82, ... }`.
 *
 * The `$comment` is skipped: it is documentation living inside the data, and
 * surfacing it as a knob would put a paragraph in the middle of a numeric table.
 */
export function flattenTuning(obj = {}, prefix = '', out = {}) {
  for (const [k, v] of Object.entries(obj)) {
    if (k === '$comment') continue;
    const key = prefix ? `${prefix}.${k}` : k;
    if (v && typeof v === 'object' && !Array.isArray(v)) flattenTuning(v, key, out);
    else out[key] = v;
  }
  return out;
}

/**
 * The blast radius for a set of changed keys.
 *
 * Returns one entry per affected FAMILY, not per key, so the note reads as a
 * consequence rather than as a list of names. `T-I-05` requires that changing
 * `auto.S` names the auto-corroboration gate; a family with no entry in
 * `BLAST_RADIUS` is reported as UNKNOWN rather than silently dropped, because an
 * unlisted knob is exactly the case where the operator most needs to be told.
 */
export function blastRadius(changedKeys = []) {
  const hits = [];
  const seen = new Set();
  for (const key of changedKeys) {
    const family = Object.keys(BLAST_RADIUS).find((p) => key.startsWith(p));
    if (!family) {
      hits.push({ family: key, gate: null, affects: 'UNKNOWN — no blast-radius entry for this key. '
        + 'Treat as review-required until one is written.' });
      continue;
    }
    if (seen.has(family)) continue;
    seen.add(family);
    hits.push({ family, ...BLAST_RADIUS[family] });
  }
  return hits;
}

/** The TuningView, read-only half. `staged`/`preview`/`priorValuesPath` arrive in A4. */
export function tuningView(path = TUNING_PATH) {
  const current = flattenTuning(readTuning(path));
  return {
    state: 'live',
    current,
    staged: {},
    changedKeys: [],
    blastRadius: [],
    priorValuesPath: null,
  };
}
