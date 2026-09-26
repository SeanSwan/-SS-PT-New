/**
 * tuningPreview.mjs — what a staged knob change WOULD do, scored offline. Slice A4.
 *
 * THE PREVIEW USES THE ENGINE'S OWN SCORER AND THE ENGINE'S OWN GATE. It imports
 * `scorePair`/`bestMatches` from `design-brain/src/similarity.mjs` and applies the AUTO
 * predicate verbatim from `corroborate.mjs:104`:
 *
 *     S >= auto.S && O >= auto.O && margin >= auto.margin && tokens >= auto.minTokens
 *
 * A preview that re-implemented the rule would be a second, drifting description of the
 * engine — and it would be the description the operator trusts, because it is the one with
 * a nice table. So there is exactly one implementation and this file calls it.
 *
 * `margin` IS WHY THE FIXTURE HAD TO BE REBUILT. Margin is `best.S - bestOther.S`, so it
 * depends on the CANDIDATE SET rather than on the pair. A fixture whose pairs all shared
 * one small vocabulary gave every pair a better match than its own partner, which made the
 * recorded bands describe the corpus instead of the pair. See the fixture's own header.
 *
 * THE PREVIEW WRITES NOTHING. It is a pure function of (live config, staged patch,
 * fixture). `T-A2-03` asserts the same property on the MCP side and this is its console
 * twin: a preview that touched the file would make the commit step pointless.
 */

import { readFileSync } from 'node:fs';

import { scorePair, contentTokens, bestMatches } from '../../design-brain/src/similarity.mjs';
import { readTuning, flattenTuning, blastRadius } from './tuning.mjs';
import { PAIRS_12_PATH, DESIGN_BRAIN_CONFIG, TUNING_PATH } from './paths.mjs';
import { join } from 'node:path';

export const BANDS = Object.freeze(['auto', 'merge-band', 'fresh']);

/** Load the fixture. Refuses to invent one — a missing fixture is a named error. */
export function readPairs(path = PAIRS_12_PATH) {
  let text;
  try {
    text = readFileSync(path, 'utf8');
  } catch (e) {
    const err = new Error(`E_FIXTURE_NOT_FOUND: cannot read ${path} — ${e.message}`);
    err.code = 'E_FIXTURE_NOT_FOUND';
    err.path = path;
    throw err;
  }
  return text.split(/\r?\n/).filter(Boolean).map((line, i) => {
    try {
      return JSON.parse(line);
    } catch (e) {
      const err = new Error(`E_FIXTURE_INVALID: ${path} line ${i + 1} is not JSON — ${e.message}`);
      err.code = 'E_FIXTURE_INVALID';
      throw err;
    }
  });
}

/** The stopword set the engine uses, so tokens are counted the same way. */
function stopwords(cfgDir = DESIGN_BRAIN_CONFIG) {
  return new Set(JSON.parse(readFileSync(join(cfgDir, 'stopwords.json'), 'utf8')).words);
}

/**
 * Score every pair under one set of knobs. Pure: no clock, no randomness, no I/O beyond
 * the already-loaded fixture and stopwords.
 *
 * `margin` is measured against the best OTHER candidate, because the question a preview
 * answers is "does THIS pair merge", and a pair that is out-scored by an unrelated
 * candidate cannot merge no matter how similar it is to its own partner.
 */
export function scoreFixture(pairs, { weights, auto, bandLow }, stop) {
  const opts = { stopwords: stop, weights };
  const candidates = pairs.map((p, i) => ({ claimId: p.b.claimId, principle: p.b.principle, index: i }));

  return pairs.map((p, i) => {
    const self = scorePair(p.a.principle, p.b.principle, opts);
    const others = bestMatches(p.a.principle, candidates.filter((c) => c.index !== i), opts);
    const bestOther = others[0] ?? null;
    const margin = self.S - (bestOther ? bestOther.S : 0);
    const tokenN = Math.min(
      contentTokens(p.a.principle, stop).length,
      contentTokens(p.b.principle, stop).length,
    );
    // The engine's gate, verbatim.
    const autoGate = self.S >= auto.S && self.O >= auto.O
      && margin >= auto.margin && tokenN >= auto.minTokens;
    const band = autoGate ? 'auto' : (self.S >= bandLow ? 'merge-band' : 'fresh');
    return {
      pairId: p.pairId,
      domainId: p.domainId ?? null,
      S: Number(self.S.toFixed(4)),
      O: Number(self.O.toFixed(4)),
      J: Number(self.J.toFixed(4)),
      T: Number(self.T.toFixed(4)),
      margin: Number(margin.toFixed(4)),
      minTokens: tokenN,
      autoGate,
      band,
    };
  });
}

/** Apply a staged patch (dotted keys) to a flattened config, returning a new flat config. */
export function applyToFlat(flat, staged = {}) {
  const out = { ...flat };
  for (const [k, v] of Object.entries(staged)) out[k] = v;
  return out;
}

/** Rebuild the nested knob object the scorer needs, from the flattened form. */
function gateFromFlat(flat) {
  return {
    weights: { jaccard: flat['weights.jaccard'], overlap: flat['weights.overlap'], trigram: flat['weights.trigram'] },
    auto: { S: flat['auto.S'], O: flat['auto.O'], margin: flat['auto.margin'], minTokens: flat['auto.minTokens'] },
    bandLow: flat['mergeBand.low'],
  };
}

/**
 * The full preview: current bands, staged bands, and the pairs that MOVED.
 *
 * `moves` is the whole point. A preview that reported only the new counts would hide which
 * specific claims changed verdict, and the operator's real question is "which of my twelve
 * pairs does this knob move, and in which direction".
 */
export function previewStaged({
  staged = {}, tuningPath = TUNING_PATH, pairsPath = PAIRS_12_PATH, cfgDir = DESIGN_BRAIN_CONFIG,
  now = () => Date.now(),
} = {}) {
  const t0 = now();
  const live = readTuning(tuningPath);
  const flat = flattenTuning(live);
  const pairs = readPairs(pairsPath);
  const stop = stopwords(cfgDir);

  const current = scoreFixture(pairs, gateFromFlat(flat), stop);
  const stagedFlat = applyToFlat(flat, staged);
  const next = scoreFixture(pairs, gateFromFlat(stagedFlat), stop);

  const byId = new Map(next.map((r) => [r.pairId, r]));
  const moves = current
    .filter((r) => byId.get(r.pairId).band !== r.band)
    .map((r) => ({
      pairId: r.pairId,
      from: r.band,
      to: byId.get(r.pairId).band,
      SBefore: r.S,
      SAfter: byId.get(r.pairId).S,
      marginBefore: r.margin,
      marginAfter: byId.get(r.pairId).margin,
    }));

  const counts = (rows) => Object.fromEntries(BANDS.map((b) => [b, rows.filter((r) => r.band === b).length]));
  const changedKeys = Object.keys(staged);

  return {
    ok: true,
    wrote: false,
    fixture: { path: pairsPath, pairs: pairs.length },
    changedKeys,
    current: { bands: counts(current), rows: current },
    staged: { bands: counts(next), rows: next },
    moves,
    blastRadius: blastRadius(changedKeys),
    ms: now() - t0,
  };
}
