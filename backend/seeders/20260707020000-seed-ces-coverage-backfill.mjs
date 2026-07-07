/**
 * 20260707020000-seed-ces-coverage-backfill.mjs — launch charter Phase 4B.1
 * ===========================================================================
 * Closes the syndrome→exercise coverage holes the 2026-07-07 read-only prod
 * matrix proved (every aggregator-emittable syndrome must resolve to ≥1
 * ces-* row per inhibit/lengthen/activate — the Mobility Board's engine gate):
 *
 *   knees_bow               0/0/0        → 6 new rows (piriformis + biceps
 *                                          femoris + adductor chain, NASM
 *                                          knees-bow-out prescription)
 *   excessive_forward_lean  0-inh/0-act  → Foam Roll Calves (inhibit) +
 *                                          Anterior Tibialis Raises (activate)
 *                                          + additive retags (hip-flexor rows,
 *                                          glute bridge — NASM EFL muscles)
 *   asymmetric_shift        0-inh/0-len  → additive retags (adductor/TFL SMR,
 *                                          adductor stretch — NASM lateral-
 *                                          shift muscles)
 *
 * VOCAB NOTES (blueprint 05 §1.2 resolutions):
 * - heels_rise: NO OHSA wizard field captures it (verified — no heel field in
 *   MovementAnalysis/aggregator), so it stays a dormant tag anchored on the
 *   calf rows for a future wizard field; the calves' EFL/PDS tags make the
 *   same content reachable TODAY through emitted syndromes.
 * - shoulder_elevation: tag-map entry resolves to upper_crossed_syndrome rows
 *   already; never emitted — dormant, harmless, documented.
 * - tight_lower_back: not an emittable key; low_back_arch/LCS rows carry the
 *   lumbar content. No fabricated vocabulary.
 *
 * MECHANICS (mirrors 20260504 starter): raw INSERT guarded by exercise_key
 * existence (idempotent re-runs), retag pass = per-key SELECT → JS set-union
 * → UPDATE (additive-only; never removes a tag; safe against manual edits).
 * exercise_key is IMMUTABLE — this seeder never rewrites keys (prod has zero
 * null keys; the 2026-03 stretches seeder never ran in prod — new content
 * lands as NEW ces-* rows, the only namespace the corrective selector reads).
 */
import { v4 as uuidv4 } from 'uuid';

const CITATION_INHIBIT = 'NASM-CES Ch. 6 (Inhibitory Techniques)';
const CITATION_LENGTHEN = 'NASM-CES Ch. 7 (Lengthening Techniques)';
const CITATION_ACTIVATE = 'NASM-CES Ch. 8 (Activation Techniques)';
const CITATION_INTEGRATE = 'NASM-CES Ch. 9 (Integration Techniques)';

/**
 * Additive tag merges for EXISTING starter rows whose target muscles serve
 * the under-covered syndromes (NASM overactive/underactive tables):
 * - EFL: overactive soleus/gastrocnemius + hip flexor complex; underactive
 *   gluteus maximus → hip-flexor SMR/stretch + glute bridge gain the tag.
 * - asymmetric_shift (hip shift): overactive adductors + TFL on the shift
 *   side; underactive glute medius → adductor/TFL SMR + adductor stretch.
 */
export const ADDITIVE_RETAGS = {
  'ces-foam-roll-hip-flexor': ['excessive_forward_lean'],
  'ces-kneeling-hip-flexor-stretch': ['excessive_forward_lean'],
  'ces-glute-bridge': ['excessive_forward_lean'],
  'ces-foam-roll-adductors': ['asymmetric_shift'],
  'ces-foam-roll-tfl': ['asymmetric_shift'],
  'ces-adductor-stretch': ['asymmetric_shift'],
};

/** New rows. Shapes match the Exercise model + starter conventions. */
export const BACKFILL_ROWS = [
  {
    name: 'Foam Roll Piriformis',
    exercise_key: 'ces-foam-roll-piriformis',
    description: 'SMR for the piriformis — overactive when the knees bow outward.',
    instructions:
      '1. Sit on the foam roller and cross the right ankle over the left knee. 2. Shift weight onto the right glute and roll slowly over the deep hip rotators. 3. Pause 30s on tender spots, breathing slowly. 4. Switch sides.',
    exerciseType: 'flexibility',
    bodyPartCategory: 'recovery',
    primaryMuscles: ['Piriformis'],
    secondaryMuscles: ['Gluteus Maximus'],
    equipmentNeeded: ['Foam Roller'],
    difficulty: 100,
    nasmCorrectiveCategory: ['knees_bow'],
    cesProtocolStep: 'inhibit',
    recommendedSets: 1,
    recommendedDuration: '30-60 seconds',
    coachingCues: ['Move slowly', 'Pause on tender spots', 'Keep the torso tall'],
    sourceCitation: CITATION_INHIBIT,
  },
  {
    name: 'Foam Roll Biceps Femoris',
    exercise_key: 'ces-foam-roll-biceps-femoris',
    description: 'SMR for the outer hamstring — overactive in a knees-bow-out pattern.',
    instructions:
      '1. Sit with the roller under the back of the right thigh, slightly rotated so the OUTER hamstring contacts the roller. 2. Support with hands behind you and roll from knee toward hip. 3. Pause 30s on tender spots. 4. Switch legs.',
    exerciseType: 'flexibility',
    bodyPartCategory: 'recovery',
    primaryMuscles: ['Biceps Femoris'],
    secondaryMuscles: ['Hamstrings'],
    equipmentNeeded: ['Foam Roller'],
    difficulty: 100,
    nasmCorrectiveCategory: ['knees_bow'],
    cesProtocolStep: 'inhibit',
    recommendedSets: 1,
    recommendedDuration: '30-60 seconds',
    coachingCues: ['Rotate the leg slightly inward to reach the outer hamstring', 'Slow passes only'],
    sourceCitation: CITATION_INHIBIT,
  },
  {
    name: 'Supine Piriformis Stretch (Figure 4)',
    exercise_key: 'ces-piriformis-figure4-stretch',
    description: 'Static figure-4 stretch lengthening the deep hip rotators.',
    instructions:
      '1. Lie on your back with knees bent. 2. Cross the right ankle over the left knee, forming a figure 4. 3. Reach through and pull the left thigh toward the chest until a comfortable stretch is felt in the right glute. 4. Hold 30s, breathing slowly. 5. Switch sides.',
    exerciseType: 'flexibility',
    bodyPartCategory: 'recovery',
    primaryMuscles: ['Piriformis'],
    secondaryMuscles: ['Gluteus Maximus'],
    equipmentNeeded: [],
    difficulty: 100,
    nasmCorrectiveCategory: ['knees_bow'],
    cesProtocolStep: 'lengthen',
    recommendedSets: 1,
    recommendedDuration: '30 seconds per side',
    coachingCues: ['Keep the head and shoulders relaxed on the floor', 'Comfortable stretch, never pain'],
    sourceCitation: CITATION_LENGTHEN,
  },
  {
    name: 'Standing Biceps Femoris Stretch',
    exercise_key: 'ces-biceps-femoris-stretch',
    description: 'Static stretch biasing the outer hamstring.',
    instructions:
      '1. Place the right heel on a low bench with the leg straight. 2. Rotate the leg slightly inward (toes pointing a little toward midline). 3. Hinge forward from the hips with a flat back until a comfortable stretch is felt along the outer back of the thigh. 4. Hold 30s. 5. Switch legs.',
    exerciseType: 'flexibility',
    bodyPartCategory: 'recovery',
    primaryMuscles: ['Biceps Femoris'],
    secondaryMuscles: ['Hamstrings'],
    equipmentNeeded: ['Bench'],
    difficulty: 100,
    nasmCorrectiveCategory: ['knees_bow'],
    cesProtocolStep: 'lengthen',
    recommendedSets: 1,
    recommendedDuration: '30 seconds per side',
    coachingCues: ['Hinge at the hips, keep the spine long', 'Slight inward rotation targets the outer hamstring'],
    sourceCitation: CITATION_LENGTHEN,
  },
  {
    name: 'Side-Lying Hip Adduction',
    exercise_key: 'ces-sidelying-hip-adduction',
    description: 'Isolated activation for the adductor complex — underactive when the knees bow outward.',
    instructions:
      '1. Lie on your right side with the top (left) leg bent and its foot planted in front of the bottom knee. 2. Keep the bottom (right) leg straight. 3. Raise the bottom leg toward the ceiling 2-4 inches, pause 2s, lower under control. 4. Complete all reps, then switch sides.',
    exerciseType: 'injury_prevention',
    bodyPartCategory: 'recovery',
    primaryMuscles: ['Adductors'],
    secondaryMuscles: [],
    equipmentNeeded: [],
    difficulty: 120,
    nasmCorrectiveCategory: ['knees_bow'],
    cesProtocolStep: 'activate',
    recommendedSets: 2,
    recommendedReps: 12,
    coachingCues: ['Small controlled range', '2-second pause at the top', 'No torso roll'],
    sourceCitation: CITATION_ACTIVATE,
  },
  {
    name: 'Lateral Lunge to Balance',
    exercise_key: 'ces-lateral-lunge-balance',
    description: 'Frontal-plane integration re-training adduction control and single-leg stance.',
    instructions:
      '1. Step laterally into a lunge, sitting the hips back while the trail leg stays straight. 2. Push off the lunging leg and drive the knee up into a single-leg balance. 3. Hold the balance 2s, keeping the pelvis level. 4. Repeat all reps one side, then switch.',
    exerciseType: 'balance',
    bodyPartCategory: 'recovery',
    primaryMuscles: ['Adductors', 'Gluteus Medius'],
    secondaryMuscles: ['Quadriceps', 'Gluteus Maximus'],
    equipmentNeeded: [],
    difficulty: 180,
    nasmCorrectiveCategory: ['knees_bow', 'asymmetric_shift'],
    cesProtocolStep: 'integrate',
    recommendedSets: 2,
    recommendedReps: 10,
    coachingCues: ['Knee tracks over the second toe', 'Level pelvis in the balance hold'],
    sourceCitation: CITATION_INTEGRATE,
  },
  {
    name: 'Foam Roll Calves',
    exercise_key: 'ces-foam-roll-calves',
    description: 'SMR for the gastrocnemius/soleus — overactive in forward-lean and pronation patterns.',
    instructions:
      '1. Sit with the roller under the right calf, left leg crossed on top for pressure. 2. Roll slowly from Achilles to below the knee. 3. Pause 30s on tender spots; rotate the leg in/out to cover both heads. 4. Switch legs.',
    exerciseType: 'flexibility',
    bodyPartCategory: 'recovery',
    primaryMuscles: ['Gastrocnemius'],
    secondaryMuscles: ['Soleus'],
    equipmentNeeded: ['Foam Roller'],
    difficulty: 100,
    nasmCorrectiveCategory: ['excessive_forward_lean', 'pronation_distortion_syndrome', 'heels_rise'],
    cesProtocolStep: 'inhibit',
    recommendedSets: 1,
    recommendedDuration: '30-60 seconds',
    coachingCues: ['Slow passes', 'Pause on tender spots', 'Relax the ankle'],
    sourceCitation: CITATION_INHIBIT,
  },
  {
    name: 'Standing Anterior Tibialis Raises',
    exercise_key: 'ces-anterior-tibialis-raises',
    description: 'Activation for the anterior tibialis — underactive when heels rise or the torso leans forward in the squat.',
    instructions:
      '1. Stand with heels on the ground, back against a wall for balance if needed. 2. Lift the toes and forefeet as high as possible while the heels stay down. 3. Pause 2s at the top, lower under control. 4. Repeat.',
    exerciseType: 'injury_prevention',
    bodyPartCategory: 'recovery',
    primaryMuscles: ['Tibialis Anterior'],
    secondaryMuscles: [],
    equipmentNeeded: [],
    difficulty: 100,
    nasmCorrectiveCategory: ['excessive_forward_lean'],
    cesProtocolStep: 'activate',
    recommendedSets: 2,
    recommendedReps: 15,
    coachingCues: ['Heels stay planted', 'Pull the toes up, pause, lower slowly'],
    sourceCitation: CITATION_ACTIVATE,
  },
];

const parseDurationSeconds = (input) => {
  if (!input) return null;
  const nums = String(input).match(/\d+/g);
  if (!nums || nums.length === 0) return null;
  return Math.max(...nums.map((n) => parseInt(n, 10)));
};

const toInsertParams = (o) => ({
  id: uuidv4(),
  name: o.name,
  description: o.description,
  instructions: o.instructions,
  exerciseType: o.exerciseType,
  primaryMuscles: JSON.stringify(o.primaryMuscles || []),
  secondaryMuscles: JSON.stringify(o.secondaryMuscles || []),
  difficulty: o.difficulty,
  equipmentNeeded: JSON.stringify(o.equipmentNeeded || []),
  canBePerformedAtHome: true,
  coachingCues: o.coachingCues ? JSON.stringify(o.coachingCues) : null,
  contraindicationNotes: o.contraindicationNotes || null,
  safetyTips: o.safetyTips || null,
  recommendedSets: o.recommendedSets ?? 1,
  recommendedReps: o.recommendedReps ?? 10,
  recommendedDuration: parseDurationSeconds(o.recommendedDuration),
  restInterval: 30,
  unlockLevel: 0,
  isActive: true,
  isPopular: false,
  experiencePointsEarned: 5,
  progressionPath: JSON.stringify([]),
  prerequisites: JSON.stringify([]),
  exercise_key: o.exercise_key,
  source: 'nasm',
  bodyPartCategory: o.bodyPartCategory,
  nasmCorrectiveCategory: JSON.stringify(o.nasmCorrectiveCategory || []),
  cesProtocolStep: o.cesProtocolStep,
  sourceCitation: o.sourceCitation,
});

const INSERT_SQL = `
  INSERT INTO "Exercises" (
    id, name, description, instructions,
    "exerciseType", "primaryMuscles", "secondaryMuscles",
    difficulty, "equipmentNeeded", "canBePerformedAtHome",
    "coachingCues", "contraindicationNotes", "safetyTips",
    "recommendedSets", "recommendedReps", "recommendedDuration", "restInterval",
    "unlockLevel", "isActive", "isPopular", "experiencePointsEarned",
    "progressionPath", prerequisites,
    exercise_key, source, "bodyPartCategory",
    "nasmCorrectiveCategory", "cesProtocolStep", "sourceCitation",
    "createdAt", "updatedAt"
  ) VALUES (
    :id, :name, :description, :instructions,
    :exerciseType, :primaryMuscles, :secondaryMuscles,
    :difficulty, :equipmentNeeded, :canBePerformedAtHome,
    :coachingCues, :contraindicationNotes, :safetyTips,
    :recommendedSets, :recommendedReps, :recommendedDuration, :restInterval,
    :unlockLevel, :isActive, :isPopular, :experiencePointsEarned,
    :progressionPath, :prerequisites,
    :exercise_key, :source, :bodyPartCategory,
    :nasmCorrectiveCategory, :cesProtocolStep, :sourceCitation,
    NOW(), NOW()
  )
`;

export default {
  async up(queryInterface) {
    const { sequelize } = queryInterface;

    // 1. Insert new rows, guarded by exercise_key (idempotent re-runs).
    for (const row of BACKFILL_ROWS) {
      const [existing] = await sequelize.query(
        'SELECT id FROM "Exercises" WHERE exercise_key = :key LIMIT 1',
        { replacements: { key: row.exercise_key } }
      );
      if (existing.length > 0) {
        console.log(`⏭  ${row.exercise_key} already present, skipping insert`);
        continue;
      }
      await sequelize.query(INSERT_SQL, { replacements: toInsertParams(row) });
      console.log(`✅ inserted ${row.exercise_key}`);
    }

    // 2. Additive retags: set-union onto existing rows (never removes tags;
    //    idempotent; skips rows that don't exist in this environment).
    for (const [key, extraTags] of Object.entries(ADDITIVE_RETAGS)) {
      const [rows] = await sequelize.query(
        'SELECT "nasmCorrectiveCategory" AS tags FROM "Exercises" WHERE exercise_key = :key LIMIT 1',
        { replacements: { key } }
      );
      if (rows.length === 0) {
        console.log(`⏭  ${key} not found, skipping retag`);
        continue;
      }
      const current = Array.isArray(rows[0].tags) ? rows[0].tags : [];
      const merged = [...new Set([...current, ...extraTags])];
      if (merged.length === current.length) {
        console.log(`⏭  ${key} already carries ${extraTags.join(', ')}`);
        continue;
      }
      await sequelize.query(
        'UPDATE "Exercises" SET "nasmCorrectiveCategory" = :tags, "updatedAt" = NOW() WHERE exercise_key = :key',
        { replacements: { key, tags: JSON.stringify(merged) } }
      );
      console.log(`✅ retagged ${key} += ${extraTags.join(', ')}`);
    }
  },

  async down(queryInterface) {
    const { sequelize } = queryInterface;
    const keys = BACKFILL_ROWS.map((r) => r.exercise_key);
    await sequelize.query('DELETE FROM "Exercises" WHERE exercise_key IN (:keys)', {
      replacements: { keys },
    });
    // Reverse the additive retags (best-effort set-difference).
    for (const [key, extraTags] of Object.entries(ADDITIVE_RETAGS)) {
      const [rows] = await sequelize.query(
        'SELECT "nasmCorrectiveCategory" AS tags FROM "Exercises" WHERE exercise_key = :key LIMIT 1',
        { replacements: { key } }
      );
      if (rows.length === 0) continue;
      const current = Array.isArray(rows[0].tags) ? rows[0].tags : [];
      const pruned = current.filter((tag) => !extraTags.includes(tag));
      await sequelize.query(
        'UPDATE "Exercises" SET "nasmCorrectiveCategory" = :tags, "updatedAt" = NOW() WHERE exercise_key = :key',
        { replacements: { key, tags: JSON.stringify(pruned) } }
      );
    }
  },
};
