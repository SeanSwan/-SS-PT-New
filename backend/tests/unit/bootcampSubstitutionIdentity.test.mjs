/**
 * ============================================================================
 * FILE: bootcampSubstitutionIdentity.test.mjs — H09 / R-H09.
 *
 * Contract test IDs (`13-server-repair-contract.md:295`): "Verified target media only;
 * **unresolved rename has no source demo**; wrong-region fallback cannot satisfy pain;
 * manifest save/reload preserves identity."
 *
 * Register row (`15-audit-findings-and-fix-register.md:50`): "Alternative has its own
 * verified identity or a clear unverified state; never inherits original demo/instructions."
 * R-H09: "Substitutions never reuse the source movement's demonstration, instructions or
 * identity as proof of the replacement."
 *
 * THE DEFECT THIS LOCKS — both halves, at the two layers that can enforce them
 *   READ (`bootcampTemplateMedia.mjs`): `hydrateTemplateExerciseMedia` re-joins saved template
 *   exercises to the CURRENT Exercise record by `exerciseLibraryId`, and SKIPPED any row whose
 *   id did not resolve. For an ordinary row that is correct — the saved snapshot stands. For a
 *   SUBSTITUTION whose RECORDED id never resolved, the row kept media copied from the movement
 *   it replaced, so the app presented the SOURCE movement's demonstration as the replacement's.
 *   Such a row now keeps no demonstration — a clear unverified state. A row with NO recorded id
 *   keeps its own media: that is the F3 false positive this file also locks (see below).
 *
 *   CONSTRUCTION (`classStyleModifiers.mjs`): the alternative builder SPREAD the source row,
 *   so a generated substitute inherited the source's `exerciseLibraryId` AND its media. The id
 *   RESOLVES, so no read-time rule can tell it apart from a trainer picking a real substitute
 *   (`BootcampExerciseAlternatives.ts:216`). Enforced here instead: a generated alternative now
 *   carries neither the identity nor the demo (F4).
 *
 * KNOWN LIMITATION (disclosed, not hidden)
 *   A row ALREADY persisted before the construction fix carries the source's resolving id. No
 *   column distinguishes it from a legitimate chosen substitute, so it needs a data repair, not
 *   a heuristic. Nothing in this suite claims otherwise.
 * ============================================================================
 */

import { describe, expect, it } from 'vitest';

import { __testing__ } from '../../services/bootcamp/bootcampCrud.mjs';
import { generateBoard2 } from '../../services/bootcamp/classStyleModifiers.mjs';
import { buildExerciseRow } from '../../services/bootcamp/bootcampTemplateRows.mjs';

const SOURCE_LIBRARY_ID = '11111111-1111-4111-8111-111111111111';
const REPLACEMENT_LIBRARY_ID = '22222222-2222-4222-8222-222222222222';

const createExercise = (overrides = {}) => {
  const values = {
    exerciseLibraryId: null,
    exerciseName: 'Wall Sit (knee-friendly)',
    videoUrl: null,
    previewVideoUrl: null,
    thumbnailUrl: null,
    description: null,
    instructions: null,
    ...overrides,
  };
  return {
    ...values,
    setDataValue(key, value) { this[key] = value; },
  };
};

/** The shape a substitution copies from the movement it replaced. */
const SOURCE_MEDIA = {
  videoUrl: 'https://cdn.swanstudios.test/exercises/back-squat.mp4',
  previewVideoUrl: 'https://cdn.swanstudios.test/exercises/back-squat-loop.webm',
  description: 'Barbell back squat pattern.',
  instructions: 'Brace, descend, drive up.',
};

const hydrate = (exercise, liveRows = []) =>
  __testing__.hydrateTemplateExerciseMedia([{ exercises: [exercise] }], async () => liveRows);

describe('H09 — a substitution never borrows the movement it replaced', () => {
  it('clears the SOURCE demo when a RECORDED replacement identity did NOT resolve', async () => {
    // The unresolved rename: a substitution that recorded a catalog id which no longer
    // resolves, still carrying the media copied from the movement it replaced. A recorded
    // UUID proves the row was meant to join to a catalog exercise, so a failed join must not
    // leave the replaced movement's demo standing in its place.
    const exercise = createExercise({
      sourceExerciseName: 'Back Squat',
      exerciseLibraryId: REPLACEMENT_LIBRARY_ID,
      ...SOURCE_MEDIA,
    });

    await hydrate(exercise, []);

    expect(exercise.videoUrl).toBeNull();
    expect(exercise.previewVideoUrl).toBeNull();
    expect(exercise.description).toBeNull();
    expect(exercise.instructions).toBeNull();
    // The movement NAME is the trainer's own record and is untouched.
    expect(exercise.exerciseName).toBe('Wall Sit (knee-friendly)');
  });

  it('KEEPS a hand-authored alternative own media when it recorded no id (F3 lock)', async () => {
    // External review round 97 finding F3: clearing EVERY substitution whose id did not
    // resolve is a FALSE POSITIVE. The save path permits media plus provenance, and the
    // UUID-only normalizer turns a numeric/absent id into `null` — so a trainer's own
    // substitute, with its own demonstration, matched the "unresolved" branch and lost all
    // six fields on read. Nothing about such a row is provably inherited, so it is left alone.
    for (const id of [null, undefined, 42, 'custom-wall-sit']) {
      const exercise = createExercise({
        sourceExerciseName: 'Back Squat',
        exerciseLibraryId: id,
        ...SOURCE_MEDIA,
      });

      await hydrate(exercise, []);

      expect(exercise.videoUrl).toBe(SOURCE_MEDIA.videoUrl);
      expect(exercise.instructions).toBe(SOURCE_MEDIA.instructions);
    }
  });

  it('never hands a generated alternative the SOURCE identity or media (F4 lock)', async () => {
    // External review round 97 finding F4: the alternative builder SPREAD the source row, so
    // the substitute inherited the source's `exerciseLibraryId` — which RESOLVES — and the
    // join then wrote the source's LIVE video/description/instructions onto it. The read rule
    // cannot undo that (a resolving id is ambiguous, see the module header), so the fix is
    // here at construction: the row carries no catalog identity and no copied demo.
    const [joint, lowImpact] = generateBoard2([{
      exerciseName: 'Back Squat',
      board: 'main',
      stationIndex: 0,
      sortOrder: 1,
      durationSec: 35,
      restSec: 15,
      easyVariation: 'Step-Up',
      kneeMod: 'Low Box Step-Up',
      exerciseLibraryId: SOURCE_LIBRARY_ID,
      ...SOURCE_MEDIA,
    }]);

    for (const alternative of [joint, lowImpact]) {
      expect(alternative.sourceExerciseName).toBe('Back Squat');
      expect(alternative.exerciseLibraryId).toBeNull();
      for (const field of Object.keys(SOURCE_MEDIA)) {
        expect(alternative[field]).toBeNull();
      }
    }
  });

  it('clears it even when the loader returns an unrelated live row', async () => {
    const exercise = createExercise({
      sourceExerciseName: 'Back Squat',
      exerciseLibraryId: REPLACEMENT_LIBRARY_ID,
      ...SOURCE_MEDIA,
    });

    // The id resolves to nothing (a rename that never resolved), so nothing may be shown.
    await hydrate(exercise, [{ id: SOURCE_LIBRARY_ID, videoUrl: 'https://cdn.test/other.mp4' }]);

    expect(exercise.videoUrl).toBeNull();
    expect(exercise.instructions).toBeNull();
  });

  it('hydrates the REPLACEMENT own verified media when its identity resolves', async () => {
    const exercise = createExercise({
      sourceExerciseName: 'Back Squat',
      exerciseLibraryId: REPLACEMENT_LIBRARY_ID,
      ...SOURCE_MEDIA,
    });

    await hydrate(exercise, [{
      id: REPLACEMENT_LIBRARY_ID,
      videoUrl: 'https://cdn.swanstudios.test/exercises/wall-sit.mp4',
      instructions: 'Back against the wall, knees bent to ninety degrees.',
      description: 'Isometric wall hold.',
      previewVideoUrl: null,
      thumbnailUrl: null,
    }]);

    // Verified target media ONLY — the source's snapshot is replaced, not merged.
    expect(exercise.videoUrl).toBe('https://cdn.swanstudios.test/exercises/wall-sit.mp4');
    expect(exercise.instructions).toBe('Back against the wall, knees bent to ninety degrees.');
    expect(exercise.description).toBe('Isometric wall hold.');
  });

  it('leaves a NON-substitution row exactly as before (no regression to legacy rows)', async () => {
    // The pre-existing behaviour: an unresolved ordinary row keeps its saved snapshot.
    const exercise = createExercise({ ...SOURCE_MEDIA });
    await hydrate(exercise, []);

    expect(exercise.videoUrl).toBe(SOURCE_MEDIA.videoUrl);
    expect(exercise.instructions).toBe(SOURCE_MEDIA.instructions);
  });

  it('treats a blank or whitespace sourceExerciseName as NOT a substitution', async () => {
    for (const marker of ['', '   ', null, undefined, 42]) {
      const exercise = createExercise({ sourceExerciseName: marker, ...SOURCE_MEDIA });
      await hydrate(exercise, []);
      expect(exercise.videoUrl).toBe(SOURCE_MEDIA.videoUrl);
    }
  });

  it('SURVIVES the save path, so a reloaded row is still recognizable (S-H09)', async () => {
    // The fourth S-H09 expectation is "manifest save/reload preserves identity". The save
    // side is where the marker could be lost — a row that reaches the INSERT without
    // `sourceExerciseName` looks like a plain exercise after reload, and the rule above could
    // never fire.
    //
    // TWO INDEPENDENT mechanisms keep it, and BOTH were confirmed by mutation:
    //   1. the explicit mapping `sourceExerciseName: optionalText(exercise.sourceExerciseName)`
    //      in `buildExerciseRow` (bootcampTemplateRows.mjs:130), and
    //   2. its membership in `EXERCISE_FIELDS` (bootcampTemplateFields.mjs:45).
    // Removing EITHER ALONE changes nothing — that is why an earlier version of this test was
    // NOT discriminating when the allowlist entry was deleted. The invariant is only broken by
    // removing both, which is what this test actually guards.
    //
    // `sourceExerciseName` is also a real column (models/BootcampExercise.mjs:27), so the chain
    // ends: save keeps it -> column stores it -> the rejoin reads it -> the rule applies.
    const row = buildExerciseRow({
      exerciseName: 'Wall Sit (knee-friendly)',
      sourceExerciseName: 'Back Squat',
      exerciseLibraryId: REPLACEMENT_LIBRARY_ID,
      ...SOURCE_MEDIA,
    }, 11, new Map());

    expect(row.sourceExerciseName).toBe('Back Squat');
    expect(row.videoUrl).toBe(SOURCE_MEDIA.videoUrl); // still the source snapshot pre-rejoin

    // …and the rejoin then refuses it, exactly as it would on a freshly reloaded row.
    await hydrate(row, []);
    expect(row.videoUrl).toBeNull();
    expect(row.instructions).toBeNull();
  });

  it('a NON-substitution row keeps its media through the same allowlist + rejoin', async () => {
    const row = buildExerciseRow({
      exerciseName: 'Goblet Squat',
      exerciseLibraryId: null,
      ...SOURCE_MEDIA,
    }, 11, new Map());

    expect('sourceExerciseName' in row ? row.sourceExerciseName : null).toBeFalsy();
    await hydrate(row, []);
    expect(row.videoUrl).toBe(SOURCE_MEDIA.videoUrl);
  });
});
