/**
 * G07/T34 — substitution draft gating: hard contraindication blocks with no
 * bypass; unknown or threshold-crossing pain/readiness data requires review
 * (never a fabricated clearance); clean data yields a trainer-review draft
 * that preserves exercise identity and equipment/media metadata.
 */
import { test } from 'vitest';
import assert from 'node:assert/strict';
import { buildSubstitutionDraft } from '../../services/ai/coachSubstitutionDraft.mjs';

const PLANNED = {
  exerciseKey: 'barbell-squat',
  pattern: 'squat',
  joint: 'knee',
  equipment: { barbell: true, rack: true },
  media: { videoId: 'vid-123' },
};

const CANDIDATES = [
  { fromExerciseKey: 'barbell-squat', exerciseKey: 'goblet-squat' },
];

test('an active hard contraindication blocks and cannot be bypassed', () => {
  const result = buildSubstitutionDraft({
    plannedExercise: PLANNED,
    substitutions: CANDIDATES,
    pain: 0,
    readiness: 8,
    contraindications: [{ joint: 'knee', active: true }],
  });
  assert.equal(result.status, 'blocked');
  assert.equal(result.substitution, null);
  assert.ok(result.reasons[0].startsWith('hard_contraindication_active'));
});

test('an inactive contraindication does not block', () => {
  const result = buildSubstitutionDraft({
    plannedExercise: PLANNED,
    substitutions: CANDIDATES,
    pain: 1,
    readiness: 8,
    contraindications: [{ joint: 'knee', active: false }],
  });
  assert.equal(result.status, 'draft');
  assert.equal(result.substitution.exerciseKey, 'goblet-squat');
});

test('a plan swap with UNKNOWN contraindication data requires review — no fabricated clearance', () => {
  const result = buildSubstitutionDraft({
    plannedExercise: PLANNED,
    substitutions: CANDIDATES,
    pain: 0,
    readiness: 8,
    contraindications: null,
  });
  assert.equal(result.status, 'requires_review');
  assert.ok(result.reasons.includes('contraindication_data_unknown'));
  assert.equal(result.substitution, null);
});

test('hostile round 1: a planned exercise with no pattern metadata never clears', () => {
  // No pattern/muscle/joint => the contraindication match is vacuous; clean
  // pain/readiness and an empty contra list must still require review.
  const result = buildSubstitutionDraft({
    plannedExercise: { exerciseKey: 'mystery-move', equipment: {}, media: {} },
    substitutions: CANDIDATES,
    pain: 0,
    readiness: 9,
    contraindications: [],
  });
  assert.equal(result.status, 'requires_review');
  assert.ok(result.reasons.includes('planned_exercise_metadata_unknown'));
  assert.equal(result.substitution, null);
});

test('unknown pain and readiness data require review', () => {
  const result = buildSubstitutionDraft({
    plannedExercise: PLANNED,
    substitutions: CANDIDATES,
    pain: null,
    readiness: null,
    contraindications: [],
  });
  assert.equal(result.status, 'requires_review');
  assert.ok(result.reasons.includes('pain_data_unknown'));
  assert.ok(result.reasons.includes('readiness_data_unknown'));
});

test('active pain at or above the review threshold requires review; below yields a draft', () => {
  const hot = buildSubstitutionDraft({
    plannedExercise: PLANNED,
    substitutions: CANDIDATES,
    pain: 4,
    readiness: 8,
    contraindications: [],
  });
  assert.equal(hot.status, 'requires_review');
  assert.ok(hot.reasons.includes('active_pain_4'));

  const calm = buildSubstitutionDraft({
    plannedExercise: PLANNED,
    substitutions: CANDIDATES,
    pain: 3,
    readiness: 8,
    contraindications: [],
  });
  assert.equal(calm.status, 'draft');
});

test('low readiness requires review', () => {
  const result = buildSubstitutionDraft({
    plannedExercise: PLANNED,
    substitutions: CANDIDATES,
    pain: 0,
    readiness: 3,
    contraindications: [],
  });
  assert.equal(result.status, 'requires_review');
  assert.ok(result.reasons.includes('low_readiness_3'));
});

test('a clean draft preserves identity, equipment and media metadata with mandatory review', () => {
  const result = buildSubstitutionDraft({
    plannedExercise: PLANNED,
    substitutions: CANDIDATES,
    pain: 0,
    readiness: 9,
    contraindications: [],
  });
  assert.equal(result.status, 'draft');
  assert.equal(result.substitution.fromExerciseKey, 'barbell-squat');
  assert.equal(result.substitution.exerciseKey, 'goblet-squat');
  assert.deepEqual(result.substitution.equipment, { barbell: true, rack: true });
  assert.deepEqual(result.substitution.media, { videoId: 'vid-123' });
  assert.equal(result.substitution.requiresTrainerReview, true);
});

test('a missing planned exercise never produces a draft', () => {
  const result = buildSubstitutionDraft({ plannedExercise: null });
  assert.equal(result.status, 'requires_review');
  assert.equal(result.substitution, null);
});
