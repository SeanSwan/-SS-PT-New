/**
 * worldRoulette.mjs — the World Engine catalog's own `world-roulette.v1`.
 *
 * THE ALGORITHM IS THE CATALOG'S, NOT OURS. `worlds.md` §"Stable roulette
 * algorithm v1" pins it precisely — NFC-normalise the seed, frame every field with
 * a `uint32_be` length prefix, SHA-256 per step, rejection-sample to avoid modulo
 * bias, sort by raw ASCII byte order, never locale collation. The file is explicit
 * that substituting a platform PRNG, a locale sort, or bare modulo *"creates a
 * different algorithm and is forbidden under v1"*. So this module implements the
 * spec's arithmetic rather than a convenient approximation of it, and a replay
 * with the same receipt produces the same draw.
 *
 * WHAT IS **NOT** EVALUATED, and is reported rather than assumed. The spec's
 * eligibility pass has five stages: license, audience/content fit, capability
 * ceiling, recent-use diversity, then the draw. The catalog carries the licence
 * and the mood words; it does **not** carry a machine-readable audience-mismatch
 * predicate or a capability ceiling. So Astra implements licence + diversity +
 * draw, and marks the other two `NOT_EVALUATED` in the receipt. A draw that
 * claimed to have applied a filter it could not read would be a fabricated
 * verdict — the failure this repo keeps finding.
 *
 * The catalog READER lives in the sibling `worlds.mjs`; this module imports it.
 * The dependency runs one way only — see the note in `worlds.mjs` for why the
 * usual split-and-re-export pattern would close a cycle here.
 */

import { createHash, randomBytes } from 'node:crypto';
import { readWorlds } from './worlds.mjs';

export const ROULETTE_ALGORITHM = 'world-roulette.v1';

/** The catalog's `frame(x) = uint32_be(byteLength(x)) || x`. */
function frame(value) {
  const bytes = Buffer.from(String(value), 'utf8');
  const len = Buffer.alloc(4);
  len.writeUInt32BE(bytes.length, 0);
  return Buffer.concat([len, bytes]);
}

/**
 * A named error whose name is MACHINE-READABLE.
 *
 * `err.code` is what `callTool` and the CLI branch on. A code that appears only in
 * the message arrives at the MCP surface as a generic `E_TOOL_FAILED` — the name is
 * in the prose and lost to every caller that reads it programmatically. Same shape
 * as a check that cannot run reading as a check that found nothing: the information
 * is present and unreadable.
 */
function rouletteError(code, message) {
  const err = new Error(`${code}: ${message}`);
  err.code = code;
  return err;
}

function u32be(n) {
  const b = Buffer.alloc(4);
  b.writeUInt32BE(n >>> 0, 0);
  return b;
}

/** `SHA-256(frame(algorithm) || frame(catalogVersion) || frame(seed) || frame(stepId) || u32be(counter))`. */
function digestFor(catalogVersion, seedNfc, stepId, counter) {
  return createHash('sha256')
    .update(frame(ROULETTE_ALGORITHM))
    .update(frame(catalogVersion))
    .update(frame(seedNfc))
    .update(frame(stepId))
    .update(u32be(counter))
    .digest();
}

const TWO_64 = 1n << 64n;
const MAX_COUNTER = 10_000; // overflow fails closed rather than looping forever

/** Rejection-sampled index: no modulo bias, exactly as the catalog specifies. */
function drawIndex(poolSize, catalogVersion, seedNfc, stepId) {
  if (poolSize <= 0) throw rouletteError('E_ROULETTE_EMPTY', 'cannot draw from an empty pool');
  const m = BigInt(poolSize);
  const limit = (TWO_64 / m) * m;
  for (let counter = 0; counter < MAX_COUNTER; counter += 1) {
    const d = digestFor(catalogVersion, seedNfc, stepId, counter);
    let x = 0n;
    for (let i = 0; i < 8; i += 1) x = (x << 8n) | BigInt(d[i]);
    if (x < limit) return { index: Number(x % m), counter, digest: d.toString('hex').slice(0, 16) };
  }
  throw rouletteError('E_ROULETTE_COUNTER_OVERFLOW', 'rejection sampling exceeded the counter bound');
}

/** Raw ASCII byte order — never locale collation. */
const asciiSort = (arr) => [...arr].sort((a, b) => (a < b ? -1 : (a > b ? 1 : 0)));

/**
 * A deterministic, suitability-filtered draw.
 *
 * @param {object} [opts]
 * @param {string} [opts.seed]        supplied seed; omitted => one is generated and recorded
 * @param {2|3|5}  [opts.n]           directions; 2-3 draws balanced families
 * @param {string[]} [opts.recentUse] most-recent-first stable world ids
 * @param {'swan-brand'|'non-swan-factory'} [opts.surface] licence filter input
 * @param {string} [opts.path]        catalog path override (tests)
 */
export function worldRoulette(opts = {}) {
  const catalog = readWorlds(opts.path);
  const n = opts.n === 2 ? 2 : (opts.n === 5 ? 5 : 3);

  // --- step 1: eligibility (licence only; see the module header) -------------
  // Three outcomes, not two. A world whose licence could not be READ is not a
  // world whose licence FAILED, and collapsing the two is how a parser defect
  // becomes a plausible-looking "every world is unlicensed" verdict. Unreadable
  // worlds are held out of the pool (fail-closed) and named in the receipt.
  const licenceRequested = opts.surface === 'swan-brand';
  const rejected = [];
  const licenceUnreadable = [];
  const eligible = [];
  for (const w of catalog.worlds) {
    if (!licenceRequested || w.lawA === true) { eligible.push(w); continue; }
    if (w.lawA === false) {
      rejected.push({ id: w.stableId, code: 'license-law-b-under-swan-chrome' });
      continue;
    }
    licenceUnreadable.push({ id: w.stableId, code: 'E_LICENCE_UNREADABLE' });
  }

  // --- step 4: recent-use exclusion, with least-recently-used restoration ----
  const recent = Array.isArray(opts.recentUse) ? opts.recentUse : [];
  const excluded = [];
  const pool = eligible.filter((w) => {
    if (recent.includes(w.stableId)) { excluded.push(w.stableId); return false; }
    return true;
  });
  const restorations = [];
  for (const f of catalog.families) {
    const inFamily = eligible.filter((w) => w.family === f.name);
    if (inFamily.length === 0) continue;                        // nothing to protect
    if (pool.some((w) => w.family === f.name)) continue;         // not emptied
    // Least-recently-used eligible member: highest index in `recent` wins; an
    // equal-recency tie resolves by raw ASCII id (the catalog's tie-break law).
    // `Array.prototype.sort` is stable, so sorting ASCII first and then by
    // recency leaves ASCII order intact among equals.
    const restored = asciiSort(inFamily.map((w) => w.stableId))
      .sort((a, b) => recent.indexOf(b) - recent.indexOf(a))[0];
    const w = inFamily.find((x) => x.stableId === restored);
    pool.push(w);
    restorations.push(w.stableId);
  }

  // --- step 2: seed ----------------------------------------------------------
  // The catalog requires a 128-bit CRYPTOGRAPHIC seed when none is supplied, and
  // records `seedGenerated` either way. Not `Math.random`: the catalog forbids a
  // platform PRNG, and a seed that is not reproducible is a receipt that cannot
  // be replayed.
  const seedGenerated = !opts.seed;
  const seed = opts.seed
    ? String(opts.seed).normalize('NFC')
    : randomBytes(16).toString('hex');

  // --- step 5: balance families before worlds --------------------------------
  const familyIds = asciiSort([...new Set(pool.map((w) => w.family))]);
  const draws = [];
  const steps = [];

  if (familyIds.length === 0) {
    throw rouletteError(
      'E_ROULETTE_NO_ELIGIBLE',
      'no world survived the filters — '
      + `eligible=${eligible.length}, pool=${pool.length}, `
      + `licenceRejected=${rejected.length}, licenceUnreadable=${licenceUnreadable.length}`,
    );
  }

  // Draw families without replacement, then one world per family. This is what
  // stops the six-world Natural family from dominating a three-direction draw.
  const familyPool = [...familyIds];
  const chosenFamilies = [];
  for (let slot = 0; slot < Math.min(n, familyIds.length); slot += 1) {
    const { index, counter, digest } = drawIndex(
      familyPool.length, catalog.catalogVersion, seed, `family:${slot}`,
    );
    const picked = familyPool.splice(index, 1)[0];
    chosenFamilies.push(picked);
    steps.push({ stepId: `family:${slot}`, counter, digest, pool: familyPool.length + 1, index });
  }

  chosenFamilies.forEach((familyName, slot) => {
    const worldsInFamily = asciiSort(
      pool.filter((w) => w.family === familyName).map((w) => w.stableId),
    );
    const { index, counter, digest } = drawIndex(
      worldsInFamily.length, catalog.catalogVersion, seed, `world:${familyName}:${slot}`,
    );
    const id = worldsInFamily[index];
    draws.push(pool.find((w) => w.stableId === id));
    steps.push({
      stepId: `world:${familyName}:${slot}`, counter, digest, pool: worldsInFamily.length, index,
    });
  });

  // --- restrained alternate: lowest rank, different family, ASCII tie-break ---
  // `restraintRank` defaults to 100 per the catalog, and worlds.md carries no
  // per-world rank, so every candidate is 100 and the tie-break decides. Named
  // here rather than hidden, because "all ranks equal" is a real limitation.
  const firstFamily = draws[0]?.family;
  const alternate = asciiSort(pool.filter((w) => w.family !== firstFamily).map((w) => w.stableId))
    .find((id) => !draws.some((d) => d.stableId === id)) ?? null;

  return {
    algorithm: ROULETTE_ALGORITHM,
    catalogVersion: catalog.catalogVersion,
    seed: seed,
    seedGenerated,
    eligibility: {
      // The licence stage only RAN if a surface was supplied. Reporting it as
      // evaluated when no surface was given would be a fabricated verdict.
      evaluated: licenceRequested
        ? ['license', 'recent-use-diversity']
        : ['recent-use-diversity'],
      notEvaluated: [
        ...(licenceRequested ? [] : ['license']),
        'audience-content-fit',
        'capability-ceiling',
      ],
      notEvaluatedReason: 'worlds.md carries no machine-readable predicate or capability ceiling for '
        + 'these two stages, so they are REPORTED as unevaluated rather than assumed to have passed.',
    },
    eligible: asciiSort(eligible.map((w) => w.stableId)),
    rejected: rejected.sort((a, b) => (a.id < b.id ? -1 : 1)),
    // Distinct from `rejected`: these worlds were held out because their licence
    // could not be read, not because it was read and failed.
    licenceUnreadable: asciiSort(licenceUnreadable.map((r) => r.id)),
    recentUseExcluded: asciiSort(excluded),
    recentUseRestored: asciiSort(restorations),
    steps,
    selected: draws.map((w) => ({
      stableId: w.stableId, name: w.name, family: w.family, paletteLaw: w.paletteLaw,
      moodWords: w.moodWords,
    })),
    restrainedAlternate: alternate,
    counts: catalog.counts,
  };
}
