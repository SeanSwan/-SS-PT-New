import path from 'node:path';
import { pathToFileURL } from 'node:url';

const EXPECTED_ALGORITHM = 'world-roulette.v1';
const EXPECTED_ELIGIBILITY = 'world-eligibility.2026-07-12.v1';
const EXPECTED_DIGEST = '4d59510226f47a6dd4acd7c1d109376405d68a0c2ee8c4988301b07b897e52ff';
const CATALOG_VERSION = 'world-catalog.2026-07-12.v2';
const SEED = 'swan-world-proof-2026-07-12-v1';
let importNonce = 0;

const CANDIDATES = [
  ['cinematic-reality', 'cinematic-a'], ['cinematic-reality', 'cinematic-b'],
  ['constructed-tech', 'constructed-a'], ['constructed-tech', 'constructed-b'],
  ['cosmic', 'cosmic-a'], ['cosmic', 'cosmic-b'],
  ['miniature-play', 'miniature-a'], ['miniature-play', 'miniature-b'],
  ['natural-sublime', 'natural-a'], ['natural-sublime', 'natural-b'],
].map(([family, id]) => ({
  family,
  id,
  eligible: true,
  restraintRank: id === 'natural-b' ? 0 : id.endsWith('-b') ? 10 : 20,
}));

function record(errors, condition, message) {
  if (!condition) errors.push(message);
}

function same(left, right) {
  return JSON.stringify(left) === JSON.stringify(right);
}

export async function verifyRouletteImplementation({ root = process.cwd() } = {}) {
  const errors = [];
  const modulePath = path.join(root, 'scripts', 'ai-workflow', 'world-roulette.mjs');
  let selector;

  try {
    const moduleUrl = pathToFileURL(modulePath);
    moduleUrl.searchParams.set('world-engine-verify', String(importNonce += 1));
    selector = await import(moduleUrl.href);
  } catch (error) {
    return [`roulette module could not execute: ${error.code ?? error.message}`];
  }

  record(errors, selector.ALGORITHM_ID === EXPECTED_ALGORITHM, 'roulette behavior: algorithm ID mismatch');
  record(errors, selector.ELIGIBILITY_RULES_VERSION === EXPECTED_ELIGIBILITY, 'roulette receipt: eligibility rules version mismatch');
  record(errors, typeof selector.drawDigestHex === 'function', 'roulette behavior: drawDigestHex export missing');
  record(errors, typeof selector.selectWorlds === 'function', 'roulette behavior: selectWorlds export missing');
  if (errors.length) return errors;

  try {
    const decomposed = selector.drawDigestHex({
      catalogVersion: CATALOG_VERSION,
      seed: 'Cafe\u0301',
      stepId: 'family:0',
      counter: 0,
    });
    const composed = selector.drawDigestHex({
      catalogVersion: CATALOG_VERSION,
      seed: 'Caf\u00e9',
      stepId: 'family:0',
      counter: 0,
    });
    record(errors, decomposed === EXPECTED_DIGEST && composed === decomposed, 'roulette behavior: framed SHA-256/NFC vector mismatch');

    const proof = selector.selectWorlds({
      candidates: CANDIDATES,
      catalogVersion: CATALOG_VERSION,
      seed: SEED,
      count: 5,
      recentUse: [],
    });
    const replay = selector.selectWorlds({
      candidates: [...CANDIDATES].reverse(),
      catalogVersion: CATALOG_VERSION,
      seed: SEED,
      count: 5,
      recentUse: [],
    });
    const expectedProof = ['cinematic-a', 'constructed-a', 'cosmic-b', 'miniature-b', 'natural-a'];
    record(errors, same(proof.selectedIds, expectedProof), 'roulette behavior: five-family proof snapshot mismatch');
    record(errors, same(replay.selectedIds, proof.selectedIds), 'roulette replay differs when input order changes');
    record(errors, proof.receipt?.eligibilityRulesVersion === EXPECTED_ELIGIBILITY, 'roulette receipt omits eligibilityRulesVersion');
    record(errors, proof.receipt?.restrainedAlternate?.id === 'natural-b', 'roulette receipt omits deterministic restrained alternate');
    record(errors, proof.receipt?.seedGenerated === false, 'roulette receipt: supplied seed must set seedGenerated=false');

    let generatedProof = null;
    try {
      generatedProof = selector.selectWorlds({
        candidates: CANDIDATES,
        catalogVersion: CATALOG_VERSION,
        count: 5,
        recentUse: [],
      });
    } catch {
      errors.push('roulette behavior: generated 128-bit seed is unsupported');
    }
    if (generatedProof) {
      const generatedSeed = generatedProof.receipt?.seedOriginal;
      record(
        errors,
        /^[0-9a-f]{32}$/.test(generatedSeed ?? ''),
        'roulette receipt: generated 128-bit seed is missing or malformed',
      );
      record(errors, generatedProof.receipt?.seedNormalized === generatedSeed, 'roulette receipt: generated seed normalization mismatch');
      record(errors, generatedProof.receipt?.seedGenerated === true, 'roulette receipt: generated seed must set seedGenerated=true');
      const generatedReplay = selector.selectWorlds({
        candidates: [...CANDIDATES].reverse(),
        catalogVersion: CATALOG_VERSION,
        seed: generatedSeed,
        count: 5,
        recentUse: [],
      });
      record(errors, same(generatedReplay.selectedIds, generatedProof.selectedIds), 'roulette behavior: generated seed is not replayable');
    }

    const malformedCandidateSets = [
      CANDIDATES.map((candidate, index) => (index === 0 ? { id: candidate.id, family: candidate.family } : candidate)),
      [{ ...CANDIDATES[0], rejectionCode: 'surface.product' }, ...CANDIDATES.slice(1)],
      [...CANDIDATES, {
        id: 'rejected-world',
        family: 'cosmic',
        eligible: false,
        rejectionCode: { unstable: true },
      }],
    ];
    let malformedRejected = 0;
    for (const malformedCandidates of malformedCandidateSets) {
      try {
        selector.selectWorlds({
          candidates: malformedCandidates,
          catalogVersion: CATALOG_VERSION,
          seed: SEED,
          count: 5,
          recentUse: [],
        });
      } catch {
        malformedRejected += 1;
      }
    }
    record(
      errors,
      malformedRejected === malformedCandidateSets.length,
      'roulette behavior: malformed eligibility or rejection codes did not fail closed',
    );

    const grammarCases = [
      { candidates: [{ ...CANDIDATES[0], id: '-bad' }, ...CANDIDATES.slice(1)], recentUse: [] },
      { candidates: [{ ...CANDIDATES[0], family: '-bad' }, ...CANDIDATES.slice(1)], recentUse: [] },
      { candidates: [...CANDIDATES, {
        id: 'rejected-world',
        family: 'cosmic',
        eligible: false,
        rejectionCode: 'surface.',
      }], recentUse: [] },
      { candidates: CANDIDATES, recentUse: [1] },
      { candidates: CANDIDATES, recentUse: [{}] },
    ];
    let grammarRejected = 0;
    for (const grammarCase of grammarCases) {
      try {
        selector.selectWorlds({
          candidates: grammarCase.candidates,
          catalogVersion: CATALOG_VERSION,
          seed: SEED,
          count: 5,
          recentUse: grammarCase.recentUse,
        });
      } catch {
        grammarRejected += 1;
      }
    }
    record(
      errors,
      grammarRejected === grammarCases.length,
      'roulette behavior: stable ID or recent-use grammar did not fail closed',
    );

    const batch = selector.selectWorlds({
      candidates: CANDIDATES,
      catalogVersion: CATALOG_VERSION,
      seed: SEED,
      count: 7,
      recentUse: [],
    });
    const batchReplay = selector.selectWorlds({
      candidates: [...CANDIDATES].reverse(),
      catalogVersion: CATALOG_VERSION,
      seed: SEED,
      count: 7,
      recentUse: [],
    });
    const firstCycle = ['cinematic-reality', 'constructed-tech', 'cosmic', 'miniature-play', 'natural-sublime'];
    record(errors, same(batch.selectedIds, batchReplay.selectedIds), 'roulette replay differs for a multi-cycle batch');
    record(errors, new Set(batch.selectedIds).size === 7, 'roulette cycle repeated a world while candidates remained');
    record(errors, same(batch.receipt?.selectedFamilies?.slice(0, 5), firstCycle), 'roulette cycle did not complete the canonical first family cycle');
    record(
      errors,
      batch.receipt?.draws?.filter((draw) => draw.stepId?.startsWith('family-cycle:1:')).length === 2,
      'roulette cycle receipt omits second-cycle family draws',
    );

    let exhausted = false;
    try {
      selector.selectWorlds({
        candidates: CANDIDATES,
        catalogVersion: CATALOG_VERSION,
        seed: SEED,
        count: CANDIDATES.length + 1,
      });
    } catch (error) {
      exhausted = /direction count exceeds available eligible worlds/.test(error.message);
    }
    record(errors, exhausted, 'roulette behavior did not fail closed after eligible worlds were exhausted');
  } catch (error) {
    errors.push(`roulette behavior raised an unexpected error: ${error.stack ?? error.message}`);
  }

  return errors;
}
