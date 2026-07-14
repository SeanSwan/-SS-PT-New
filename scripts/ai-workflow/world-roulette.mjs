import crypto from 'node:crypto';

export const ALGORITHM_ID = 'world-roulette.v1';
export const ELIGIBILITY_RULES_VERSION = 'world-eligibility.2026-07-12.v1';

function asciiCompare(left, right) {
  return left < right ? -1 : left > right ? 1 : 0;
}

const STABLE_ID_PATTERN = /^[a-z0-9]+(?:[._-][a-z0-9]+)*$/;
const STABLE_FAMILY_ID_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

function assertStableId(value, label, pattern = STABLE_ID_PATTERN) {
  if (typeof value !== 'string' || !pattern.test(value)) {
    throw new Error(`${label} must use stable lowercase ASCII segments`);
  }
}

function frame(value) {
  const bytes = Buffer.from(value, 'utf8');
  const length = Buffer.alloc(4);
  length.writeUInt32BE(bytes.length);
  return Buffer.concat([length, bytes]);
}

function normalizedSeed(seed) {
  if (typeof seed !== 'string' || seed.length === 0) throw new Error('seed must be a non-empty string');
  return seed.normalize('NFC');
}

function validateRecentUse(recentUse) {
  if (!Array.isArray(recentUse)) throw new Error('recentUse must be an array');
  const seen = new Set();
  for (const id of recentUse) {
    if (typeof id !== 'string' || !STABLE_ID_PATTERN.test(id)) {
      throw new Error(`recent-use ID must be a stable lowercase ASCII ID: ${String(id)}`);
    }
    if (seen.has(id)) throw new Error(`duplicate recent-use ID: ${id}`);
    seen.add(id);
  }
  return recentUse;
}

export function drawDigestHex({ catalogVersion, seed, stepId, counter = 0 }) {
  if (typeof catalogVersion !== 'string' || catalogVersion.length === 0) throw new Error('catalogVersion is required');
  if (typeof stepId !== 'string' || stepId.length === 0) throw new Error('stepId is required');
  if (!Number.isInteger(counter) || counter < 0 || counter > 0xffffffff) throw new Error('counter must be uint32');

  const counterBytes = Buffer.alloc(4);
  counterBytes.writeUInt32BE(counter);
  return crypto.createHash('sha256').update(Buffer.concat([
    frame(ALGORITHM_ID),
    frame(catalogVersion),
    frame(normalizedSeed(seed)),
    frame(stepId),
    counterBytes,
  ])).digest('hex');
}

function drawIndex({ catalogVersion, seed, stepId, poolSize }) {
  if (!Number.isInteger(poolSize) || poolSize <= 0) throw new Error('poolSize must be a positive integer');
  const modulus = BigInt(poolSize);
  const two64 = 1n << 64n;
  const limit = (two64 / modulus) * modulus;

  for (let counter = 0; counter <= 0xffffffff; counter += 1) {
    const digest = drawDigestHex({ catalogVersion, seed, stepId, counter });
    const value = Buffer.from(digest, 'hex').readBigUInt64BE(0);
    if (value < limit) {
      return {
        index: Number(value % modulus),
        counter,
        digest,
        poolSize,
        stepId,
      };
    }
  }
  throw new Error('world-roulette.v1 counter overflow');
}

function validateCandidates(candidates) {
  if (!Array.isArray(candidates) || candidates.length === 0) throw new Error('candidates must be a non-empty array');
  const ids = new Set();
  return candidates.map((candidate) => {
    const normalized = {
      ...candidate,
      restraintRank: candidate.restraintRank ?? 100,
    };
    if (typeof normalized.eligible !== 'boolean') {
      throw new Error(`candidate eligible must be boolean: ${normalized.id ?? 'unknown'}`);
    }
    const hasRejectionCode = Object.prototype.hasOwnProperty.call(normalized, 'rejectionCode');
    if (normalized.eligible && hasRejectionCode) {
      throw new Error(`eligible candidate cannot carry rejectionCode: ${normalized.id}`);
    }
    if (!normalized.eligible && (typeof normalized.rejectionCode !== 'string' || !STABLE_ID_PATTERN.test(normalized.rejectionCode))) {
      throw new Error(`candidate rejectionCode must be a stable lowercase ASCII code: ${normalized.id}`);
    }
    assertStableId(normalized.id, 'candidate id');
    assertStableId(normalized.family, 'candidate family', STABLE_FAMILY_ID_PATTERN);
    if (!Number.isInteger(normalized.restraintRank) || normalized.restraintRank < 0) {
      throw new Error(`candidate restraintRank must be a non-negative integer: ${normalized.id}`);
    }
    if (ids.has(normalized.id)) throw new Error(`duplicate candidate ID: ${normalized.id}`);
    ids.add(normalized.id);
    return normalized;
  });
}

export function applyRecentUse(candidates, recentUse = []) {
  const recentUseIds = validateRecentUse(recentUse);
  const ordered = [...candidates].sort((a, b) => asciiCompare(a.id, b.id));

  const candidateIds = new Set(ordered.map((candidate) => candidate.id));
  const excluded = recentUseIds.filter((id) => candidateIds.has(id));
  const excludedSet = new Set(excluded);
  let pool = ordered.filter((candidate) => !excludedSet.has(candidate.id));
  const restored = [];

  if (pool.length === 0 && ordered.length > 0) {
    const rank = new Map(recentUseIds.map((id, index) => [id, index]));
    const leastRecent = [...ordered].sort((left, right) => {
      const leftRank = rank.get(left.id) ?? -1;
      const rightRank = rank.get(right.id) ?? -1;
      return rightRank - leftRank || asciiCompare(left.id, right.id);
    })[0];
    pool = [leastRecent];
    restored.push(leastRecent.id);
  }

  return { pool, excluded, restored };
}

function selectPartialFamilyCycle({ families, take, cycle, catalogVersion, seed, draws }) {
  const available = [...families];
  const selected = [];
  for (let slot = 0; slot < take; slot += 1) {
    const draw = drawIndex({
      catalogVersion,
      seed,
      stepId: cycle === 0 ? `family:${slot}` : `family-cycle:${cycle}:${slot}`,
      poolSize: available.length,
    });
    const drawPool = [...available];
    const [family] = available.splice(draw.index, 1);
    draws.push({ ...draw, pool: drawPool, selected: family });
    selected.push(family);
  }
  return selected;
}

function selectFamilySequence({ byFamily, count, catalogVersion, seed, draws }) {
  const families = [...byFamily.keys()].sort(asciiCompare);
  if (count === 5 && families.length !== 5) {
    throw new Error('five-family proof requires exactly five eligible families');
  }

  const remainingByFamily = new Map(families.map((family) => [family, byFamily.get(family).length]));
  const availableWorlds = [...remainingByFamily.values()].reduce((sum, size) => sum + size, 0);
  if (count > availableWorlds) {
    throw new Error('direction count exceeds available eligible worlds');
  }

  const selected = [];
  let remaining = count;
  let cycle = 0;

  while (remaining > 0) {
    const active = families.filter((family) => remainingByFamily.get(family) > 0);
    if (active.length === 0) throw new Error('world-roulette.v1 exhausted all eligible families');

    const take = Math.min(remaining, active.length);
    const isCanonicalProofCycle = cycle === 0 && count >= families.length;
    let cycleFamilies;

    if (isCanonicalProofCycle) {
      cycleFamilies = active.slice(0, take);
    } else {
      cycleFamilies = selectPartialFamilyCycle({
        families: active,
        take,
        cycle,
        catalogVersion,
        seed,
        draws,
      });
    }

    for (const family of cycleFamilies) {
      selected.push(family);
      remainingByFamily.set(family, remainingByFamily.get(family) - 1);
    }
    remaining -= cycleFamilies.length;
    cycle += 1;
  }

  return selected;
}

function restrainedAlternate({ eligible, selectedIds }) {
  const selected = new Set(selectedIds);
  const primary = eligible.find((candidate) => candidate.id === selectedIds[0]);
  if (!primary) return null;
  const differentFamily = eligible.filter((candidate) => candidate.family !== primary.family);
  const unselected = differentFamily.filter((candidate) => !selected.has(candidate.id));
  const pool = unselected.length ? unselected : differentFamily;
  const [alternate] = [...pool].sort((left, right) => (
    left.restraintRank - right.restraintRank || asciiCompare(left.id, right.id)
  ));
  return alternate ? {
    id: alternate.id,
    family: alternate.family,
    restraintRank: alternate.restraintRank,
    source: unselected.length ? 'unselected' : 'selected-fallback',
  } : null;
}

export function selectWorlds({
  candidates,
  catalogVersion,
  seed,
  count,
  recentUse = [],
}) {
  if (!Number.isInteger(count) || count <= 0) throw new Error('count must be a positive integer');
  const normalized = validateCandidates(candidates);
  const recentUseIds = validateRecentUse(recentUse);
  const seedOriginal = seed === undefined ? crypto.randomBytes(16).toString('hex') : seed;
  const seedGenerated = seed === undefined;
  const seedNfc = normalizedSeed(seedOriginal);
  const rejected = normalized
    .filter((candidate) => !candidate.eligible)
    .map(({ id, rejectionCode }) => ({ id, rejectionCode }))
    .sort((a, b) => asciiCompare(a.id, b.id));
  const eligible = normalized.filter((candidate) => candidate.eligible);
  const familyIds = [...new Set(eligible.map((candidate) => candidate.family))].sort(asciiCompare);
  const byFamily = new Map();
  const recentUseReceipt = [];

  for (const family of familyIds) {
    const result = applyRecentUse(
      eligible.filter((candidate) => candidate.family === family),
      recentUseIds,
    );
    if (result.pool.length > 0) byFamily.set(family, result.pool);
    recentUseReceipt.push({ family, excluded: result.excluded, restored: result.restored });
  }

  const selectionEligible = [...byFamily.values()].flat();
  const draws = [];
  const selectedFamilies = selectFamilySequence({
    byFamily,
    count,
    catalogVersion,
    seed: seedNfc,
    draws,
  });
  const familySlots = new Map();
  const selectedIds = [];

  for (const family of selectedFamilies) {
    const pool = byFamily.get(family);
    const slot = familySlots.get(family) ?? 0;
    const draw = drawIndex({
      catalogVersion,
      seed: seedNfc,
      stepId: `world:${family}:${slot}`,
      poolSize: pool.length,
    });
    const selected = pool[draw.index];
    draws.push({ ...draw, pool: pool.map((candidate) => candidate.id), selected: selected.id });
    selectedIds.push(selected.id);
    pool.splice(draw.index, 1);
    familySlots.set(family, slot + 1);
  }

  return {
    selectedIds,
    receipt: {
      algorithmId: ALGORITHM_ID,
      eligibilityRulesVersion: ELIGIBILITY_RULES_VERSION,
      catalogVersion,
      seedOriginal,
      seedGenerated,
      seedNormalized: seedNfc,
      seedSha256: crypto.createHash('sha256').update(Buffer.from(seedNfc, 'utf8')).digest('hex'),
      eligibleIds: eligible.map((candidate) => candidate.id).sort(asciiCompare),
      rejected,
      recentUseInput: [...recentUseIds],
      recentUse: recentUseReceipt,
      selectedFamilies,
      selectedIds,
      draws,
      restrainedAlternate: restrainedAlternate({ eligible: selectionEligible, selectedIds }),
    },
  };
}
