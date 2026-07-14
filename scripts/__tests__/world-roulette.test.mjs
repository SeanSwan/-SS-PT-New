import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  ALGORITHM_ID,
  ELIGIBILITY_RULES_VERSION,
  applyRecentUse,
  drawDigestHex,
  selectWorlds,
} from '../ai-workflow/world-roulette.mjs';

const catalogVersion = 'world-catalog.2026-07-12.v2';
const seed = 'swan-world-proof-2026-07-12-v1';
const candidates = [
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

describe('world-roulette.v1', () => {
  it('locks the framed SHA-256 test vector and NFC normalization', () => {
    const decomposed = drawDigestHex({ catalogVersion, seed: 'Cafe\u0301', stepId: 'family:0', counter: 0 });
    const composed = drawDigestHex({ catalogVersion, seed: 'Café', stepId: 'family:0', counter: 0 });

    assert.equal(ALGORITHM_ID, 'world-roulette.v1');
    assert.equal(decomposed, '4d59510226f47a6dd4acd7c1d109376405d68a0c2ee8c4988301b07b897e52ff');
    assert.equal(composed, decomposed);
  });

  it('generates and records a replayable 128-bit seed when one is omitted', () => {
    const generated = selectWorlds({ candidates, catalogVersion, count: 5, recentUse: [] });

    assert.match(generated.receipt.seedOriginal, /^[0-9a-f]{32}$/);
    assert.equal(generated.receipt.seedNormalized, generated.receipt.seedOriginal);
    assert.equal(generated.receipt.seedGenerated, true);
    assert.deepEqual(
      selectWorlds({
        candidates,
        catalogVersion,
        seed: generated.receipt.seedOriginal,
        count: 5,
        recentUse: [],
      }).selectedIds,
      generated.selectedIds,
    );
  });

  it('selects the same one-per-family proof snapshot on every replay', () => {
    const first = selectWorlds({ candidates, catalogVersion, seed, count: 5, recentUse: [] });
    const second = selectWorlds({ candidates: [...candidates].reverse(), catalogVersion, seed, count: 5, recentUse: [] });

    assert.deepEqual(first.selectedIds, [
      'cinematic-a',
      'constructed-a',
      'cosmic-b',
      'miniature-b',
      'natural-a',
    ]);
    assert.deepEqual(second.selectedIds, first.selectedIds);
    assert.equal(first.receipt.algorithmId, ALGORITHM_ID);
    assert.equal(first.receipt.seedGenerated, false);
    assert.equal(first.receipt.eligibilityRulesVersion, ELIGIBILITY_RULES_VERSION);
    assert.equal(first.receipt.draws.length, 5);
    assert.deepEqual(first.receipt.restrainedAlternate, {
      id: 'natural-b',
      family: 'natural-sublime',
      restraintRank: 0,
      source: 'unselected',
    });
  });

  it('starts a balanced second family cycle and never repeats a world', () => {
    const first = selectWorlds({ candidates, catalogVersion, seed, count: 7, recentUse: [] });
    const replay = selectWorlds({ candidates: [...candidates].reverse(), catalogVersion, seed, count: 7, recentUse: [] });

    assert.deepEqual(replay.selectedIds, first.selectedIds);
    assert.deepEqual(replay.receipt.draws, first.receipt.draws);
    assert.deepEqual(first.receipt.selectedFamilies.slice(0, 5), [
      'cinematic-reality',
      'constructed-tech',
      'cosmic',
      'miniature-play',
      'natural-sublime',
    ]);
    assert.equal(new Set(first.receipt.selectedFamilies.slice(5)).size, 2);
    assert.equal(new Set(first.selectedIds).size, 7);
    assert.equal(first.receipt.draws.filter((draw) => draw.stepId.startsWith('family-cycle:1:')).length, 2);
  });

  it('restores only the least-recent eligible member when exclusion empties a family', () => {
    const result = applyRecentUse(
      candidates.filter((candidate) => candidate.family === 'natural-sublime'),
      ['natural-a', 'natural-b'],
    );

    assert.deepEqual(result.pool.map((candidate) => candidate.id), ['natural-b']);
    assert.deepEqual(result.excluded, ['natural-a', 'natural-b']);
    assert.deepEqual(result.restored, ['natural-b']);
  });

  it('fails closed for duplicate IDs and an incomplete five-family proof', () => {
    assert.throws(
      () => selectWorlds({ candidates: [...candidates, candidates[0]], catalogVersion, seed, count: 5 }),
      /duplicate candidate ID/,
    );
    assert.throws(
      () => selectWorlds({ candidates: candidates.slice(0, 8), catalogVersion, seed, count: 5 }),
      /five-family proof requires exactly five eligible families/,
    );
    assert.throws(
      () => selectWorlds({ candidates, catalogVersion, seed, count: candidates.length + 1 }),
      /direction count exceeds available eligible worlds/,
    );
  });

  it('fails closed unless eligibility and rejection codes are explicit and stable', () => {
    const withoutEligibility = candidates.map((candidate, index) => (
      index === 0
        ? { id: candidate.id, family: candidate.family, restraintRank: candidate.restraintRank }
        : candidate
    ));
    assert.throws(
      () => selectWorlds({ candidates: withoutEligibility, catalogVersion, seed, count: 5 }),
      /eligible must be boolean/,
    );
    assert.throws(
      () => selectWorlds({
        candidates: [{ ...candidates[0], rejectionCode: 'surface.product' }, ...candidates.slice(1)],
        catalogVersion,
        seed,
        count: 5,
      }),
      /eligible candidate cannot carry rejectionCode/,
    );
    assert.throws(
      () => selectWorlds({
        candidates: [...candidates, {
          id: 'rejected-world',
          family: 'cosmic',
          eligible: false,
          rejectionCode: { unstable: true },
        }],
        catalogVersion,
        seed,
        count: 5,
      }),
      /rejectionCode must be a stable lowercase ASCII code/,
    );
    assert.throws(
      () => selectWorlds({
        candidates: [...candidates, {
          id: 'rejected-world',
          family: 'cosmic',
          eligible: false,
          rejectionCode: 'Surface Product',
        }],
        catalogVersion,
        seed,
        count: 5,
      }),
      /rejectionCode must be a stable lowercase ASCII code/,
    );

    const valid = selectWorlds({
      candidates: [...candidates, {
        id: 'rejected-world',
        family: 'cosmic',
        eligible: false,
        rejectionCode: 'surface.product',
      }],
      catalogVersion,
      seed,
      count: 5,
    });
    assert.deepEqual(valid.receipt.rejected, [{ id: 'rejected-world', rejectionCode: 'surface.product' }]);
  });

  it('rejects malformed stable IDs, rejection codes, and recent-use inputs', () => {
    const malformedCandidates = [
      [
        [{ ...candidates[0], id: '-bad' }, ...candidates.slice(1)],
        /candidate id must use stable lowercase ASCII segments/,
      ],
      [
        [{ ...candidates[0], id: 'bad..id' }, ...candidates.slice(1)],
        /candidate id must use stable lowercase ASCII segments/,
      ],
      [
        [{ ...candidates[0], id: 'bad.' }, ...candidates.slice(1)],
        /candidate id must use stable lowercase ASCII segments/,
      ],
      [
        [{ ...candidates[0], family: 'bad.family' }, ...candidates.slice(1)],
        /candidate family must use stable lowercase ASCII segments/,
      ],
      [
        [{ ...candidates[0], family: 'bad-' }, ...candidates.slice(1)],
        /candidate family must use stable lowercase ASCII segments/,
      ],
    ];
    for (const [malformed, expected] of malformedCandidates) {
      assert.throws(
        () => selectWorlds({ candidates: malformed, catalogVersion, seed, count: 5 }),
        expected,
      );
    }

    assert.throws(
      () => selectWorlds({
        candidates: [...candidates, {
          id: 'rejected-world',
          family: 'cosmic',
          eligible: false,
          rejectionCode: 'surface.',
        }],
        catalogVersion,
        seed,
        count: 5,
      }),
      /rejectionCode must be a stable lowercase ASCII code/,
    );

    const malformedRecentUse = [
      'world.valid',
      [1],
      [{}],
      ['-bad'],
      ['world.valid', 'world.valid'],
    ];
    for (const recentUse of malformedRecentUse) {
      assert.throws(
        () => selectWorlds({ candidates, catalogVersion, seed, count: 5, recentUse }),
        /recentUse must be an array|recent-use ID must be a stable lowercase ASCII ID|duplicate recent-use ID/,
      );
    }
  });
});
