/**
 * NASM Corrective Exercise Starter Seed (V3b.3.3)
 * ────────────────────────────────────────────────
 *
 * 32 high-priority corrective exercises covering the four NASM postural
 * distortion patterns most clinically common in our client base:
 *   - Upper Crossed Syndrome (UCS)         — 12 rows
 *   - Lower Crossed Syndrome (LCS)         — 12 rows
 *   - Pronation Distortion Syndrome (PDS)  — 8 rows
 *
 * Plus generic OHSA-specific tagging (knees_cave, low_back_arch, etc.)
 * is multi-applied across rows where clinically appropriate.
 *
 * SCOPE NOTE — V3b.3 starter, NOT the full ~120-row seeder
 * promised in NASM-CES-TAXONOMY.md §4.1. Sean asked for V3b.3 to ship
 * after Codex's pre-impl review; we ship the starter set now (each
 * with full citation per §4.3) and grow the registry in V3b.3.X
 * follow-ups as trainer feedback validates which exercises clients
 * actually use.
 *
 * IDEMPOTENCY — upsert by `exercise_key` (Codex Diff D). Re-runs
 * update nasmCorrectiveCategory / cesProtocolStep / sourceCitation
 * on existing rows by exact key match.
 *
 * SCHEMA COMPLIANCE — Codex's pre-impl review fixes applied:
 *   - exerciseType uses ONLY existing enum values (no 'corrective'
 *     until enum migration ships).
 *   - recommendedReps stays INTEGER. Duration-style holds use the
 *     existing `recommendedDuration` field, not a string.
 *   - source is preserved as origin ('nasm'); citations land in the
 *     new sourceCitation column.
 *
 * Authoritative citations only (NASM-CES-TAXONOMY.md §6):
 *   - "NASM-CPT 7th ed. p. X"        — NASM Essentials of PT (2018)
 *   - "NASM-CES Ch. X p. Y"          — NASM Essentials of CES (2014)
 *   - "Cleveland Clinic — <topic>"   — clevelandclinic.org clinical refs
 *   - "AAOS OrthoInfo — <topic>"     — orthoinfo.aaos.org guidelines
 */
import { v4 as uuidv4 } from 'uuid';

/**
 * Parse a duration string into integer seconds for the INTEGER
 * `recommendedDuration` column. Accepts:
 *   - number (passed through)
 *   - "30 seconds" → 30
 *   - "30-60 seconds" → 60 (uses max — the recommended hold)
 *   - "30-60 seconds per side" → 60 (per-side info lives in instructions)
 *   - null/undefined → null
 *
 * V3b.3.3a (post-pre-impl-review): Codex F.B caught the INTEGER /
 * string mismatch for `recommendedReps`; the same drift hit the
 * sibling `recommendedDuration` column. Parsing here keeps the seeder
 * authoring ergonomic (trainers write '30-60 seconds') while honoring
 * the model's INTEGER contract.
 */
function parseDurationSeconds(input) {
  if (input == null) return null;
  if (typeof input === 'number') return Number.isFinite(input) ? input : null;
  if (typeof input !== 'string') return null;
  const nums = input.match(/\d+/g);
  if (!nums || nums.length === 0) return null;
  return Math.max(...nums.map((n) => parseInt(n, 10)));
}

/**
 * Helper — build an exercise object with V3b.3 corrective metadata.
 * All STRING/JSON fields stringify here; non-stringifiable fields
 * (numbers, booleans) pass through.
 */
function corr(o) {
  return {
    id: uuidv4(),
    isActive: true,
    canBePerformedAtHome: o.canBePerformedAtHome ?? true,
    unlockLevel: 0,
    isPopular: false,
    experiencePointsEarned: 5,
    primaryMuscles: JSON.stringify(o.primaryMuscles || []),
    secondaryMuscles: JSON.stringify(o.secondaryMuscles || []),
    equipmentNeeded: JSON.stringify(o.equipmentNeeded || []),
    progressionPath: JSON.stringify([]),
    prerequisites: JSON.stringify([]),
    coachingCues: o.coachingCues || null,
    contraindicationNotes: o.contraindicationNotes || null,
    safetyTips: o.safetyTips || null,
    recommendedSets: o.recommendedSets ?? 1,
    recommendedReps: o.recommendedReps ?? 10, // INTEGER per model contract
    recommendedDuration: parseDurationSeconds(o.recommendedDuration),
    restInterval: o.restInterval ?? 30,
    source: 'nasm',                            // origin (existing column)
    // V3b.3 fields
    nasmCorrectiveCategory: JSON.stringify(o.nasmCorrectiveCategory || []),
    cesProtocolStep: o.cesProtocolStep,        // 'inhibit'|'lengthen'|'activate'|'integrate'
    sourceCitation: o.sourceCitation,
    // Required base fields
    name: o.name,
    exercise_key: o.exercise_key,               // upsert key (matches model column)
    description: o.description,
    instructions: o.instructions,
    exerciseType: o.exerciseType,              // valid enum values only
    bodyPartCategory: o.bodyPartCategory,      // canonical lowercase
    difficulty: o.difficulty,
  };
}

// ─── Upper Crossed Syndrome (12) ────────────────────────────────
const upperCrossed = [
  // INHIBIT — 4 SMR drills
  corr({
    name: 'Foam Roll Pec',
    exercise_key: 'ces-foam-roll-pec',
    description: 'Self-myofascial release for the pectoralis major/minor.',
    instructions: '1. Lie face-down with foam roller positioned beneath the chest. 2. Roll slowly from sternum to shoulder, pausing 30s on tender spots. 3. Switch sides.',
    exerciseType: 'flexibility',
    bodyPartCategory: 'recovery',
    primaryMuscles: ['Pectoralis Major'],
    secondaryMuscles: ['Pectoralis Minor'],
    equipmentNeeded: ['Foam Roller'],
    difficulty: 100,
    nasmCorrectiveCategory: ['upper_crossed_syndrome', 'forward_head', 'arms_fall_forward'],
    cesProtocolStep: 'inhibit',
    recommendedSets: 1,
    recommendedDuration: '30-60 seconds',
    coachingCues: ['Move slowly', 'Pause on tender spots', 'Avoid the rib cage'],
    sourceCitation: 'NASM-CES Ch. 6 (Inhibitory Techniques)',
  }),
  corr({
    name: 'Foam Roll Latissimus Dorsi',
    exercise_key: 'ces-foam-roll-lat',
    description: 'SMR for the lats — overactive in UCS clients.',
    instructions: '1. Lie on side with arm extended overhead, foam roller under armpit area. 2. Roll from armpit to mid-back. 3. Pause on tender spots 30s.',
    exerciseType: 'flexibility',
    bodyPartCategory: 'recovery',
    primaryMuscles: ['Latissimus Dorsi'],
    equipmentNeeded: ['Foam Roller'],
    difficulty: 100,
    nasmCorrectiveCategory: ['upper_crossed_syndrome', 'arms_fall_forward'],
    cesProtocolStep: 'inhibit',
    recommendedSets: 1,
    recommendedDuration: '30-60 seconds per side',
    sourceCitation: 'NASM-CES Ch. 6',
  }),
  corr({
    name: 'Foam Roll Upper Trapezius',
    exercise_key: 'ces-foam-roll-upper-trap',
    description: 'Lacrosse ball release for upper trap (overactive in UCS).',
    instructions: '1. Place lacrosse ball between upper trap and a wall. 2. Lean into the ball. 3. Hold tender spots 30s.',
    exerciseType: 'flexibility',
    bodyPartCategory: 'recovery',
    primaryMuscles: ['Upper Trapezius'],
    equipmentNeeded: ['Lacrosse Ball'],
    difficulty: 100,
    nasmCorrectiveCategory: ['upper_crossed_syndrome', 'forward_head'],
    cesProtocolStep: 'inhibit',
    recommendedSets: 1,
    recommendedDuration: '30 seconds',
    sourceCitation: 'NASM-CES Ch. 6',
  }),
  corr({
    name: 'Lacrosse Ball SCM Release',
    exercise_key: 'ces-lacrosse-scm',
    description: 'Targeted release for sternocleidomastoid in forward-head clients.',
    instructions: '1. Gently pinch SCM with thumb/forefinger. 2. Slow controlled slides along its length. 3. Avoid the carotid artery — work the muscle belly only.',
    exerciseType: 'flexibility',
    bodyPartCategory: 'recovery',
    primaryMuscles: ['Sternocleidomastoid'],
    equipmentNeeded: [],
    difficulty: 200,
    nasmCorrectiveCategory: ['upper_crossed_syndrome', 'forward_head'],
    cesProtocolStep: 'inhibit',
    recommendedSets: 1,
    recommendedDuration: '15-30 seconds per side',
    contraindicationNotes: 'Avoid pressing on carotid artery or thyroid.',
    sourceCitation: 'NASM-CES Ch. 6',
  }),

  // LENGTHEN — 4 stretches
  corr({
    name: 'Doorway Pec Stretch',
    exercise_key: 'ces-doorway-pec-stretch',
    description: 'Static stretch for tight pectorals.',
    instructions: '1. Stand in doorway, forearm against frame at 90°. 2. Step forward gently. 3. Hold 30s without forcing.',
    exerciseType: 'flexibility',
    bodyPartCategory: 'recovery',
    primaryMuscles: ['Pectoralis Major', 'Pectoralis Minor'],
    equipmentNeeded: [],
    difficulty: 100,
    nasmCorrectiveCategory: ['upper_crossed_syndrome', 'arms_fall_forward'],
    cesProtocolStep: 'lengthen',
    recommendedSets: 2,
    recommendedDuration: '30 seconds per side',
    sourceCitation: 'NASM-CPT 7th ed. Ch. 9 (Flexibility Training)',
  }),
  corr({
    name: 'Levator Scapulae Stretch',
    exercise_key: 'ces-levator-scap-stretch',
    description: 'Gentle stretch for the levator scapulae (chronically tight in UCS).',
    instructions: '1. Sit tall, look down toward armpit. 2. Apply light pressure to the back of the head. 3. Hold 30s without force.',
    exerciseType: 'flexibility',
    bodyPartCategory: 'recovery',
    primaryMuscles: ['Levator Scapulae'],
    equipmentNeeded: [],
    difficulty: 100,
    nasmCorrectiveCategory: ['upper_crossed_syndrome', 'forward_head'],
    cesProtocolStep: 'lengthen',
    recommendedSets: 2,
    recommendedDuration: '30 seconds per side',
    sourceCitation: 'NASM-CPT 7th ed. Ch. 9',
  }),
  corr({
    name: 'Upper Trap Stretch',
    exercise_key: 'ces-upper-trap-stretch',
    description: 'Lateral neck stretch for tight upper trap.',
    instructions: '1. Tilt head ear-to-shoulder. 2. Add gentle hand assistance only after the natural end-range. 3. Hold 30s.',
    exerciseType: 'flexibility',
    bodyPartCategory: 'recovery',
    primaryMuscles: ['Upper Trapezius'],
    equipmentNeeded: [],
    difficulty: 100,
    nasmCorrectiveCategory: ['upper_crossed_syndrome', 'forward_head'],
    cesProtocolStep: 'lengthen',
    recommendedSets: 2,
    recommendedDuration: '30 seconds per side',
    sourceCitation: 'NASM-CPT 7th ed. Ch. 9',
  }),
  corr({
    name: 'Lat Stretch (Overhead)',
    exercise_key: 'ces-lat-overhead-stretch',
    description: 'Overhead reach to lengthen lats.',
    instructions: '1. Stand tall, reach both arms overhead, grasp one wrist. 2. Side-bend toward the gripped wrist. 3. Hold 30s, then switch.',
    exerciseType: 'flexibility',
    bodyPartCategory: 'recovery',
    primaryMuscles: ['Latissimus Dorsi'],
    equipmentNeeded: [],
    difficulty: 100,
    nasmCorrectiveCategory: ['upper_crossed_syndrome'],
    cesProtocolStep: 'lengthen',
    recommendedSets: 2,
    recommendedDuration: '30 seconds per side',
    sourceCitation: 'NASM-CPT 7th ed. Ch. 9',
  }),

  // ACTIVATE — 4 isolated strengthening
  corr({
    name: 'Cervical Retraction (Chin Tuck)',
    exercise_key: 'ces-chin-tuck',
    description: 'Activates deep cervical flexors — underactive in forward-head posture.',
    instructions: '1. Sit/stand tall. 2. Slide chin straight back (not down). 3. Hold 5s. 4. Repeat 10-15.',
    exerciseType: 'injury_prevention',
    bodyPartCategory: 'recovery',
    primaryMuscles: ['Deep Cervical Flexors'],
    equipmentNeeded: [],
    difficulty: 200,
    nasmCorrectiveCategory: ['upper_crossed_syndrome', 'forward_head'],
    cesProtocolStep: 'activate',
    recommendedSets: 2,
    recommendedReps: 12,
    coachingCues: ['Slide back, not down', 'No pain', 'Slow controlled motion'],
    sourceCitation: 'NASM-CES Ch. 7 (Activation Techniques)',
  }),
  corr({
    name: 'Wall Slides',
    exercise_key: 'ces-wall-slides',
    description: 'Activates lower trap + serratus anterior in proper scapular rhythm.',
    instructions: '1. Stand with back, head, arms against wall (90° elbows). 2. Slide arms overhead while keeping contact. 3. Lower under control.',
    exerciseType: 'injury_prevention',
    bodyPartCategory: 'recovery',
    primaryMuscles: ['Lower Trapezius', 'Serratus Anterior'],
    equipmentNeeded: [],
    difficulty: 200,
    nasmCorrectiveCategory: ['upper_crossed_syndrome', 'arms_fall_forward'],
    cesProtocolStep: 'activate',
    recommendedSets: 3,
    recommendedReps: 10,
    coachingCues: ['All four points stay in contact', 'No lumbar arching', 'Quality over speed'],
    sourceCitation: 'NASM-CES Ch. 7',
  }),
  corr({
    name: 'Prone Cobra',
    exercise_key: 'ces-prone-cobra',
    description: 'Activates erector spinae + rhomboids + posterior delts.',
    instructions: '1. Lie face-down, arms by sides. 2. Squeeze glutes, lift chest while rotating thumbs up. 3. Hold 5s.',
    exerciseType: 'injury_prevention',
    bodyPartCategory: 'recovery',
    primaryMuscles: ['Lower Trapezius', 'Rhomboids', 'Erector Spinae'],
    equipmentNeeded: [],
    difficulty: 250,
    nasmCorrectiveCategory: ['upper_crossed_syndrome', 'arms_fall_forward'],
    cesProtocolStep: 'activate',
    recommendedSets: 2,
    recommendedReps: 10,
    sourceCitation: 'NASM-CES Ch. 7',
  }),
  corr({
    name: 'Y-T-W on Stability Ball',
    exercise_key: 'ces-ytw-stability-ball',
    description: 'Multi-pattern shoulder stabilizer activation drill.',
    instructions: '1. Lay chest on stability ball, arms hanging. 2. Form Y, hold 2s. 3. Form T, hold 2s. 4. Form W, hold 2s. 5. Repeat sequence.',
    exerciseType: 'stability',
    bodyPartCategory: 'recovery',
    primaryMuscles: ['Lower Trapezius', 'Rhomboids', 'Serratus Anterior'],
    equipmentNeeded: ['Stability Ball'],
    difficulty: 300,
    nasmCorrectiveCategory: ['upper_crossed_syndrome', 'arms_fall_forward', 'forward_head'],
    cesProtocolStep: 'activate',
    recommendedSets: 2,
    recommendedReps: 8,
    sourceCitation: 'NASM-CES Ch. 7',
  }),
];

// ─── Lower Crossed Syndrome (12) ────────────────────────────────
const lowerCrossed = [
  // INHIBIT — 4
  corr({
    name: 'Foam Roll TFL',
    exercise_key: 'ces-foam-roll-tfl',
    description: 'SMR for the tensor fasciae latae — overactive in LCS.',
    instructions: '1. Lie on side, foam roller under upper-outer thigh near hip. 2. Slow rolls from hip to mid-thigh. 3. Pause 30s on tender spots.',
    exerciseType: 'flexibility',
    bodyPartCategory: 'recovery',
    primaryMuscles: ['Tensor Fasciae Latae'],
    equipmentNeeded: ['Foam Roller'],
    difficulty: 100,
    nasmCorrectiveCategory: ['lower_crossed_syndrome', 'pronation_distortion_syndrome', 'low_back_arch'],
    cesProtocolStep: 'inhibit',
    recommendedSets: 1,
    recommendedDuration: '30-60 seconds per side',
    sourceCitation: 'NASM-CES Ch. 6',
  }),
  corr({
    name: 'Foam Roll Hip Flexor',
    exercise_key: 'ces-foam-roll-hip-flexor',
    description: 'SMR for psoas/iliacus/rectus femoris — chronically tight in LCS.',
    instructions: '1. Lie face-down, roller across upper thigh just below hip flexor. 2. Slow roll, pause on tender spots. 3. Switch sides.',
    exerciseType: 'flexibility',
    bodyPartCategory: 'recovery',
    primaryMuscles: ['Iliopsoas', 'Rectus Femoris'],
    equipmentNeeded: ['Foam Roller'],
    difficulty: 100,
    nasmCorrectiveCategory: ['lower_crossed_syndrome', 'low_back_arch'],
    cesProtocolStep: 'inhibit',
    recommendedSets: 1,
    recommendedDuration: '30-60 seconds per side',
    sourceCitation: 'NASM-CES Ch. 6',
  }),
  corr({
    name: 'Foam Roll Erector Spinae',
    exercise_key: 'ces-foam-roll-erectors',
    description: 'SMR for the lower-back erector spinae.',
    instructions: '1. Lie supine with foam roller across lower back. 2. Cross arms over chest. 3. Slowly rock side-to-side along the muscle, avoid spine bones.',
    exerciseType: 'flexibility',
    bodyPartCategory: 'recovery',
    primaryMuscles: ['Erector Spinae'],
    equipmentNeeded: ['Foam Roller'],
    difficulty: 100,
    nasmCorrectiveCategory: ['lower_crossed_syndrome', 'low_back_arch'],
    cesProtocolStep: 'inhibit',
    recommendedSets: 1,
    recommendedDuration: '30-60 seconds',
    contraindicationNotes: 'Avoid with acute disc herniation.',
    sourceCitation: 'NASM-CES Ch. 6',
  }),
  corr({
    name: 'Foam Roll Adductors',
    exercise_key: 'ces-foam-roll-adductors',
    description: 'SMR for inner-thigh adductors — overlap with PDS.',
    instructions: '1. Lie face-down with one leg out to the side, foam roller under inner thigh. 2. Slow rolls. 3. Switch sides.',
    exerciseType: 'flexibility',
    bodyPartCategory: 'recovery',
    primaryMuscles: ['Adductors'],
    equipmentNeeded: ['Foam Roller'],
    difficulty: 100,
    nasmCorrectiveCategory: ['lower_crossed_syndrome', 'pronation_distortion_syndrome', 'knees_cave'],
    cesProtocolStep: 'inhibit',
    recommendedSets: 1,
    recommendedDuration: '30-60 seconds per side',
    sourceCitation: 'NASM-CES Ch. 6',
  }),

  // LENGTHEN — 4
  corr({
    name: 'Kneeling Hip Flexor Stretch',
    exercise_key: 'ces-kneeling-hip-flexor-stretch',
    description: 'Static stretch for tight hip flexors (the LCS hallmark).',
    instructions: '1. Half-kneeling stance. 2. Squeeze rear glute, gently shift hips forward. 3. Hold without lumbar arching.',
    exerciseType: 'flexibility',
    bodyPartCategory: 'recovery',
    primaryMuscles: ['Iliopsoas'],
    equipmentNeeded: [],
    difficulty: 100,
    nasmCorrectiveCategory: ['lower_crossed_syndrome', 'low_back_arch'],
    cesProtocolStep: 'lengthen',
    recommendedSets: 2,
    recommendedDuration: '30 seconds per side',
    coachingCues: ['Squeeze rear glute first', 'No lumbar arching', 'Stretch felt in front of hip'],
    sourceCitation: 'NASM-CPT 7th ed. Ch. 9',
  }),
  corr({
    name: '90/90 Hip Stretch',
    exercise_key: 'ces-90-90-hip-stretch',
    description: 'Multi-plane hip mobility drill (internal + external rotation).',
    instructions: '1. Sit with both hips at 90°: front leg externally rotated, back leg internally rotated. 2. Stay tall. 3. Hold 30s, switch.',
    exerciseType: 'flexibility',
    bodyPartCategory: 'recovery',
    primaryMuscles: ['Glutes', 'Hip Rotators'],
    equipmentNeeded: [],
    difficulty: 200,
    nasmCorrectiveCategory: ['lower_crossed_syndrome'],
    cesProtocolStep: 'lengthen',
    recommendedSets: 2,
    recommendedDuration: '30 seconds per side',
    sourceCitation: 'Cleveland Clinic — Hip Mobility',
  }),
  corr({
    name: 'Child\'s Pose',
    exercise_key: 'ces-childs-pose',
    description: 'Lengthens lats + erectors gently.',
    instructions: '1. From quadruped, sit hips back to heels with arms extended forward. 2. Relax forehead to ground. 3. Breathe slowly.',
    exerciseType: 'flexibility',
    bodyPartCategory: 'recovery',
    primaryMuscles: ['Latissimus Dorsi', 'Erector Spinae'],
    equipmentNeeded: [],
    difficulty: 100,
    nasmCorrectiveCategory: ['lower_crossed_syndrome', 'upper_crossed_syndrome'],
    cesProtocolStep: 'lengthen',
    recommendedSets: 1,
    recommendedDuration: '60 seconds',
    sourceCitation: 'NASM-CPT 7th ed. Ch. 9',
  }),
  corr({
    name: 'Standing Quad Stretch',
    exercise_key: 'ces-standing-quad-stretch',
    description: 'Lengthens rectus femoris.',
    instructions: '1. Stand, grasp ankle behind. 2. Squeeze glute on the same side. 3. Hold 30s, switch.',
    exerciseType: 'flexibility',
    bodyPartCategory: 'recovery',
    primaryMuscles: ['Quadriceps'],
    equipmentNeeded: [],
    difficulty: 100,
    nasmCorrectiveCategory: ['lower_crossed_syndrome'],
    cesProtocolStep: 'lengthen',
    recommendedSets: 2,
    recommendedDuration: '30 seconds per side',
    sourceCitation: 'NASM-CPT 7th ed. Ch. 9',
  }),

  // ACTIVATE — 4
  corr({
    name: 'Glute Bridge',
    exercise_key: 'ces-glute-bridge',
    description: 'Activates gluteus maximus — underactive in LCS.',
    instructions: '1. Supine, knees bent, feet flat. 2. Squeeze glutes, lift hips to neutral (not arched). 3. Hold 2s, lower.',
    exerciseType: 'injury_prevention',
    bodyPartCategory: 'recovery',
    primaryMuscles: ['Gluteus Maximus'],
    equipmentNeeded: [],
    difficulty: 200,
    nasmCorrectiveCategory: ['lower_crossed_syndrome', 'low_back_arch'],
    cesProtocolStep: 'activate',
    recommendedSets: 3,
    recommendedReps: 12,
    coachingCues: ['Squeeze glutes first', 'Hips to neutral, NOT arched', 'Knees track over toes'],
    sourceCitation: 'NASM-CES Ch. 7',
  }),
  corr({
    name: 'Quadruped Hip Extension',
    exercise_key: 'ces-quadruped-hip-extension',
    description: 'Isolated glute activation in quadruped.',
    instructions: '1. On hands and knees. 2. Extend one leg straight back, lift to hip height by squeezing glute. 3. No lumbar movement.',
    exerciseType: 'injury_prevention',
    bodyPartCategory: 'recovery',
    primaryMuscles: ['Gluteus Maximus'],
    equipmentNeeded: [],
    difficulty: 200,
    nasmCorrectiveCategory: ['lower_crossed_syndrome', 'low_back_arch'],
    cesProtocolStep: 'activate',
    recommendedSets: 2,
    recommendedReps: 10,
    sourceCitation: 'NASM-CES Ch. 7',
  }),
  corr({
    name: 'Dead Bug',
    exercise_key: 'ces-dead-bug',
    description: 'Activates transverse abdominis with anti-extension challenge.',
    instructions: '1. Supine, arms up, knees over hips at 90°. 2. Press low back to floor. 3. Slowly extend opposite arm + leg without losing low-back contact.',
    exerciseType: 'core',
    bodyPartCategory: 'core',
    primaryMuscles: ['Transverse Abdominis', 'Rectus Abdominis'],
    equipmentNeeded: [],
    difficulty: 250,
    nasmCorrectiveCategory: ['lower_crossed_syndrome', 'low_back_arch'],
    cesProtocolStep: 'activate',
    recommendedSets: 3,
    recommendedReps: 8,
    sourceCitation: 'NASM-CES Ch. 7',
  }),
  corr({
    name: 'Bird Dog',
    exercise_key: 'ces-bird-dog',
    description: 'Quadruped anti-rotation core + glute activation.',
    instructions: '1. Quadruped, neutral spine. 2. Extend opposite arm + leg simultaneously without rotation. 3. Hold 2s, return.',
    exerciseType: 'core',
    bodyPartCategory: 'core',
    primaryMuscles: ['Transverse Abdominis', 'Erector Spinae', 'Gluteus Maximus'],
    equipmentNeeded: [],
    difficulty: 250,
    nasmCorrectiveCategory: ['lower_crossed_syndrome', 'asymmetric_shift'],
    cesProtocolStep: 'activate',
    recommendedSets: 3,
    recommendedReps: 8,
    sourceCitation: 'NASM-CES Ch. 7',
  }),
];

// ─── Pronation Distortion Syndrome (8) ──────────────────────────
const pronationDistortion = [
  // INHIBIT — 2
  corr({
    name: 'Foam Roll Peroneals',
    exercise_key: 'ces-foam-roll-peroneals',
    description: 'SMR for outer-shin peroneals (overactive in PDS).',
    instructions: '1. Side-lying, foam roller under outer-lower leg. 2. Slow rolls. 3. Pause on tender spots 30s.',
    exerciseType: 'flexibility',
    bodyPartCategory: 'recovery',
    primaryMuscles: ['Peroneal Group'],
    equipmentNeeded: ['Foam Roller'],
    difficulty: 100,
    nasmCorrectiveCategory: ['pronation_distortion_syndrome', 'knees_cave'],
    cesProtocolStep: 'inhibit',
    recommendedSets: 1,
    recommendedDuration: '30 seconds per side',
    sourceCitation: 'NASM-CES Ch. 6',
  }),
  corr({
    name: 'Foam Roll IT Band',
    exercise_key: 'ces-foam-roll-it-band',
    description: 'SMR for IT band — overactive in PDS.',
    instructions: '1. Side-lying, foam roller under outer thigh. 2. Slow rolls from hip to knee. 3. Pause on tender spots.',
    exerciseType: 'flexibility',
    bodyPartCategory: 'recovery',
    primaryMuscles: ['Tensor Fasciae Latae', 'IT Band'],
    equipmentNeeded: ['Foam Roller'],
    difficulty: 200,
    nasmCorrectiveCategory: ['pronation_distortion_syndrome', 'knees_cave'],
    cesProtocolStep: 'inhibit',
    recommendedSets: 1,
    recommendedDuration: '30-60 seconds per side',
    contraindicationNotes: 'Skip if pain is sharp or radiating.',
    sourceCitation: 'NASM-CES Ch. 6',
  }),

  // LENGTHEN — 2
  corr({
    name: 'Gastrocnemius Stretch',
    exercise_key: 'ces-gastrocnemius-stretch',
    description: 'Calf stretch with knee straight — addresses heels-rise compensation.',
    instructions: '1. Step back into split stance, rear knee straight. 2. Press rear heel down. 3. Hold 30s, switch.',
    exerciseType: 'flexibility',
    bodyPartCategory: 'recovery',
    primaryMuscles: ['Gastrocnemius'],
    equipmentNeeded: [],
    difficulty: 100,
    nasmCorrectiveCategory: ['pronation_distortion_syndrome', 'heels_rise', 'excessive_forward_lean'],
    cesProtocolStep: 'lengthen',
    recommendedSets: 2,
    recommendedDuration: '30 seconds per side',
    sourceCitation: 'NASM-CPT 7th ed. Ch. 9',
  }),
  corr({
    name: 'Adductor Stretch',
    exercise_key: 'ces-adductor-stretch',
    description: 'Inner-thigh stretch — addresses knees-cave compensation.',
    instructions: '1. Wide stance, shift weight to one side. 2. Bend that knee, keep opposite leg straight. 3. Hold 30s.',
    exerciseType: 'flexibility',
    bodyPartCategory: 'recovery',
    primaryMuscles: ['Adductors'],
    equipmentNeeded: [],
    difficulty: 100,
    nasmCorrectiveCategory: ['pronation_distortion_syndrome', 'knees_cave'],
    cesProtocolStep: 'lengthen',
    recommendedSets: 2,
    recommendedDuration: '30 seconds per side',
    sourceCitation: 'NASM-CPT 7th ed. Ch. 9',
  }),

  // ACTIVATE — 2
  corr({
    name: 'Single-Leg Balance Reach',
    exercise_key: 'ces-single-leg-balance-reach',
    description: 'Activates gluteus medius + ankle stabilizers.',
    instructions: '1. Stand on one leg, slight knee bend. 2. Reach opposite leg forward, then side, then back without losing balance. 3. Maintain knee tracking over middle toe.',
    exerciseType: 'balance',
    bodyPartCategory: 'core',
    primaryMuscles: ['Gluteus Medius'],
    secondaryMuscles: ['Posterior Tibialis'],
    equipmentNeeded: [],
    difficulty: 300,
    nasmCorrectiveCategory: ['pronation_distortion_syndrome', 'knees_cave', 'asymmetric_shift'],
    cesProtocolStep: 'activate',
    recommendedSets: 2,
    recommendedReps: 8,
    coachingCues: ['Knee tracks middle toe', 'Quiet foot — no wobble', 'Slow controlled reach'],
    sourceCitation: 'NASM-CES Ch. 7',
  }),
  corr({
    name: 'Lateral Band Walks',
    exercise_key: 'ces-lateral-band-walks',
    description: 'Activates gluteus medius — counters knees-cave.',
    instructions: '1. Resistance band around knees or ankles. 2. Slight squat. 3. Step laterally, keeping tension on band. 4. 10 steps each direction.',
    exerciseType: 'injury_prevention',
    bodyPartCategory: 'recovery',
    primaryMuscles: ['Gluteus Medius'],
    equipmentNeeded: ['Resistance Band'],
    difficulty: 250,
    nasmCorrectiveCategory: ['pronation_distortion_syndrome', 'knees_cave'],
    cesProtocolStep: 'activate',
    recommendedSets: 2,
    recommendedReps: 10,
    coachingCues: ['Knees stay over toes', 'Hips level', 'Steady tension'],
    sourceCitation: 'NASM-CES Ch. 7',
  }),

  // INTEGRATE — 2
  corr({
    name: 'Single-Leg Squat to Tap',
    exercise_key: 'ces-single-leg-squat-tap',
    description: 'Functional integration of glute med + posterior tib + balance.',
    instructions: '1. Stand on one leg. 2. Hinge into a controlled mini-squat, tap floor with opposite foot. 3. Drive through standing-leg heel.',
    exerciseType: 'balance',
    bodyPartCategory: 'legs',
    primaryMuscles: ['Gluteus Maximus', 'Gluteus Medius', 'Quadriceps'],
    equipmentNeeded: [],
    difficulty: 350,
    nasmCorrectiveCategory: ['pronation_distortion_syndrome', 'knees_cave', 'asymmetric_shift'],
    cesProtocolStep: 'integrate',
    recommendedSets: 2,
    recommendedReps: 6,
    sourceCitation: 'NASM-CES Ch. 8 (Integration)',
  }),
  corr({
    name: 'Squat to Row (Cable)',
    exercise_key: 'ces-squat-to-row-cable',
    description: 'Whole-chain integration — glutes + scapular retraction.',
    instructions: '1. Hold cable at chest, squat down. 2. Stand and pull cable to ribs simultaneously. 3. Slow eccentric.',
    exerciseType: 'compound',
    bodyPartCategory: 'full_body',
    primaryMuscles: ['Quadriceps', 'Gluteus Maximus', 'Latissimus Dorsi'],
    secondaryMuscles: ['Rhomboids'],
    equipmentNeeded: ['Cable'],
    difficulty: 350,
    nasmCorrectiveCategory: ['upper_crossed_syndrome', 'lower_crossed_syndrome', 'pronation_distortion_syndrome'],
    cesProtocolStep: 'integrate',
    recommendedSets: 3,
    recommendedReps: 10,
    sourceCitation: 'NASM-CES Ch. 8',
  }),
];

// ─── Combined export ────────────────────────────────────────────
const allCorrectiveExercises = [...upperCrossed, ...lowerCrossed, ...pronationDistortion];

// ─── Sequelize seeder shape ─────────────────────────────────────
//
// V3b.3.3b note (post-pre-impl-review): we don't use `Exercise.upsert()`
// because Sequelize CLI seeders run with an empty `sequelize.models`
// registry — the existing comprehensive NASM seeder
// (20260228-seed-nasm-comprehensive-exercises.mjs:288-321) uses raw SQL
// with `ON CONFLICT` for the same reason. We follow that convention,
// keying the conflict on `exercise_key` per Codex Diff D so re-runs
// patch corrective metadata onto already-seeded rows without overwriting
// trainer-edited fields like coaching cues or descriptions.
export default {
  /**
   * Upserts each row by `exercise_key` (Codex Diff D). On conflict,
   * updates ONLY the V3b.3 corrective fields + updatedAt — preserves
   * any trainer edits to other columns. New rows are inserted.
   */
  async up(queryInterface) {
    const sql = `
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
      )
      VALUES (
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
      ON CONFLICT (exercise_key) DO UPDATE SET
        "nasmCorrectiveCategory" = EXCLUDED."nasmCorrectiveCategory",
        "cesProtocolStep"        = EXCLUDED."cesProtocolStep",
        "sourceCitation"         = EXCLUDED."sourceCitation",
        "updatedAt"              = NOW()
    `;

    let inserted = 0;
    let updated = 0;
    let skipped = 0;

    for (const row of allCorrectiveExercises) {
      try {
        // coachingCues is JSON; rest are scalar / JSON-string per corr() helper.
        const replacements = {
          ...row,
          coachingCues: row.coachingCues ? JSON.stringify(row.coachingCues) : null,
        };

        // Detect whether the row already existed by querying first. Cheap;
        // we expect ~32 rows total. Lets us log a meaningful insert/update
        // split without parsing pg's row-count return shape.
        const [existing] = await queryInterface.sequelize.query(
          `SELECT 1 FROM "Exercises" WHERE exercise_key = :exercise_key LIMIT 1`,
          {
            replacements: { exercise_key: row.exercise_key },
            type: queryInterface.sequelize.QueryTypes.SELECT,
          },
        );

        await queryInterface.sequelize.query(sql, {
          replacements,
          type: queryInterface.sequelize.QueryTypes.INSERT,
        });

        if (existing) updated += 1;
        else inserted += 1;
      } catch (err) {
        console.warn(`  ⚠ V3b.3.3 skipped "${row.name}" (${row.exercise_key}): ${err.message}`);
        skipped += 1;
      }
    }

    console.log(`✅ V3b.3.3 NASM corrective starter — ${inserted} inserted, ${updated} updated, ${skipped} skipped, ${allCorrectiveExercises.length} total`);
  },

  /**
   * Removes ONLY the V3b.3.3 starter rows (matched by exact exercise_key
   * prefix `ces-`). Does NOT touch any other exercise rows.
   */
  async down(queryInterface) {
    await queryInterface.sequelize.query(
      `DELETE FROM "Exercises" WHERE exercise_key LIKE 'ces-%'`,
    );
    console.log('✅ V3b.3.3 starter rows removed');
  },

  // For test introspection
  rows: allCorrectiveExercises,
};
