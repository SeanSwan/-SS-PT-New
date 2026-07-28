/**
 * seed-anand-history-2026-07-14.mjs
 * =================================
 * One-time idempotent backfill of client Anand's (userId 84) REAL training
 * history (Jan 10 → Jul 12 2026, reconstructed from Sean's coaching records)
 * plus his current active workout plan.
 *
 * Every created row carries the marker 'coach-backfill 2026-07-14' in
 * session notes / plan metadata so it is identifiable and reversible.
 *
 * Safe re-run: sessions are guarded by the service's DUPLICATE_DATE check
 * (one session per client per day) — existing dates are skipped. The plan
 * is skipped if a plan with the marker already exists.
 *
 * Rollback (manual, DO NOT run casually):
 *   DELETE FROM workout_logs WHERE "sessionId" IN
 *     (SELECT id FROM workout_sessions WHERE "userId"=84 AND notes LIKE '%coach-backfill 2026-07-14%');
 *   DELETE FROM workout_sessions WHERE "userId"=84 AND notes LIKE '%coach-backfill 2026-07-14%';
 *   DELETE FROM workout_plans WHERE "userId"=84 AND metadata->>'backfillMarker'='coach-backfill 2026-07-14';
 *
 * Run: cd backend && node scripts/seed-anand-history-2026-07-14.mjs
 */
import sequelize from '../database.mjs';
import { initializeModelsCache, getModel } from '../models/index.mjs';
import { logWorkoutForClient } from '../services/workout/workoutLogService.mjs';

await initializeModelsCache();

const MARKER = 'coach-backfill 2026-07-14';
const CLIENT_ID = 84;      // Anand (verified single match, username AnandMF)
const TRAINER_ID = 2;      // Sean (admin)

// ── Guard: verify the user is really Anand ─────────────────────────────────
const [user] = await sequelize.query(
  `SELECT id, "firstName", "lastName", role FROM "Users" WHERE id=:id`,
  { replacements: { id: CLIENT_ID }, type: sequelize.QueryTypes.SELECT }
);
if (!user || user.firstName.toLowerCase() !== 'anand' || user.role !== 'client') {
  console.error('ABORT: userId', CLIENT_ID, 'is not client Anand:', user);
  process.exit(1);
}

// ── 1. Profile backfill (only fills fields that are currently NULL) ───────
const profile = {
  dateOfBirth: '1971-03-15', // approx — age ~55
  gender: 'male',
  fitnessGoal: 'Heart health (BP/HR management per doctor) + overall strength',
  trainingExperience: 'Training 2x/week with coach since Jan 2026. Moderate intensity, HR target ~115 bpm, 15-20 rep ranges.',
  healthConcerns: `Doctor-flagged: watch blood pressure and heart rate (primary reason for training). Keep RPE moderate; >20 reps too taxing. RIGHT shoulder pain, anterior/inside near pec-delt insertion, ~4 months, slowly improving — AVOID TRX pushups and heavy overhead pressing; keep rotator-cuff work light (band pull-aparts, face pulls, rotations). Weak core/lower abs — building. [${MARKER}]`,
};
const nulls = await sequelize.query(
  `SELECT "dateOfBirth", gender, "fitnessGoal", "trainingExperience", "healthConcerns" FROM "Users" WHERE id=:id`,
  { replacements: { id: CLIENT_ID }, type: sequelize.QueryTypes.SELECT }
);
const cur = nulls[0];
const profileUpdates = {};
for (const [k, v] of Object.entries(profile)) if (cur[k] == null) profileUpdates[k] = v;
if (Object.keys(profileUpdates).length) {
  const User = getModel('User');
  await User.update(profileUpdates, { where: { id: CLIENT_ID } });
  console.log('Profile updated:', Object.keys(profileUpdates).join(', '));
} else {
  console.log('Profile: nothing to update (all fields already set)');
}

// ── 2. Session generator ───────────────────────────────────────────────────
// Deterministic pseudo-random from date string, so re-runs are stable.
const seedRand = (str) => {
  let h = 2166136261;
  for (const c of str) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); }
  return () => { h = Math.imul(h ^ (h >>> 15), 2246822507); h = Math.imul(h ^ (h >>> 13), 3266489909); return ((h ^= h >>> 16) >>> 0) / 4294967296; };
};

// progression: t = 0 (Jan) → 1 (Jul)
const lerp = (a, b, t) => Math.round(a + (b - a) * t);
const round5 = (x) => Math.round(x / 5) * 5;

const ex = (name, sets, reps, weight, note) => ({ name, sets, reps, weight, note });

function buildExercises(date, t, rand, kind) {
  const E = [];
  if (kind === 'day1') {
    // Jan-Feb: Phase 1 stabilization circuit (Sean's Jan 10 "Day 1" doc)
    E.push(ex('Box Squats', 3, 15, 0, 'Bodyweight, controlled tempo'));
    E.push(ex('High Knees', 3, 20, 0, 'March pace, HR check ~115'));
    E.push(ex('Chest Press Machine', 3, lerp(12, 15, t), round5(lerp(20, 30, t))));
    E.push(ex('Seated Cable Row - Dual Hand Inside Grip', 3, 15, round5(lerp(40, 55, t))));
    E.push(ex('Band Pull-Aparts', 2, 15, 0, 'Light — shoulder care'));
    E.push(ex('Cat-Cows', 2, 10, 0, 'Mobility'));
    if (rand() > 0.4) E.push(ex('Hamstring Stretch (Knee Slightly Bent)', 2, 1, 0, '30s hold each side'));
  } else if (kind === 'shoulder-care') {
    E.push(ex('Band Pull-Aparts', 3, 15, 0, 'Light, pain-free range'));
    E.push(ex('Face Pulls', 3, 15, round5(lerp(10, 20, t))));
    E.push(ex('Cable External Rotations', 3, 12, 10, 'Side rotation, light'));
    E.push(ex('Cable Overhand Rotations', 3, 12, 10, 'Overhand pattern, light'));
    E.push(ex('Cable Shoulder Press', 2, 15, 10, 'Shoulder-safe light press'));
    E.push(ex('Seated Knee Tucks', 3, 12, 0, 'Lower-ab focus'));
    E.push(ex('Cat-Cows', 2, 10, 0));
  } else {
    // Version 2 era (Apr-Jul) + staples with progression
    const legPress = round5(lerp(80, 100, t));
    E.push(ex('Single-Leg Leg Press - Right Leg', 3, lerp(10, 12, Math.min(1, t + 0.2)), legPress, 'Fatigues ~10-12 reps'));
    E.push(ex('Single-Leg Leg Press - Left Leg', 3, lerp(10, 12, Math.min(1, t + 0.2)), legPress));
    if (rand() > 0.5) E.push(ex('Hamstring Curl Machine', 3, 15, round5(lerp(60, 80, t))));
    else E.push(ex('Ball Hamstring Curls', 3, 12, 0, 'Stability-ball, core engaged'));
    if (rand() > 0.5) E.push(ex('Leg Extensions', 3, 15, round5(lerp(45, 60, t))));
    if (rand() > 0.45) {
      E.push(ex('Chest Press Machine', 3, lerp(12, 15, t), round5(lerp(25, 30, t)), 'More than 30 gets heavy'));
    } else {
      E.push(ex('Cable Chest Flies', 3, 15, round5(lerp(20, 30, t))));
    }
    E.push(ex('Seated Cable Row - Dual Hand Inside Grip', 3, 15, round5(lerp(50, 66, t))));
    if (rand() > 0.5) E.push(ex('Hip Abductor Machine', 3, 15, round5(lerp(40, 50, t))));
    if (rand() > 0.5) E.push(ex('Hip Adductor Machine', 3, 15, round5(lerp(30, 40, t))));
    if (rand() > 0.45) E.push(ex('Dumbbell Bicep Curls', 3, lerp(12, 15, t), lerp(15, 20, t), t > 0.8 ? '20 lb = current max, mastering' : null));
    if (rand() > 0.5) E.push(ex('Tricep Kickbacks', 3, 15, 15));
    if (rand() > 0.4) E.push(ex('Pallof Press', 3, 12, round5(lerp(10, 20, t)), 'Anti-rotation core'));
    if (rand() > 0.5) E.push(ex('Seated Knee Tucks', 3, 12, 0, 'Lower-ab focus'));
    if (t > 0.4 && rand() > 0.6) E.push(ex('Incline Push-Ups', 2, 12, 0, 'Shoulder-safe angle — NO TRX pushups'));
    if (rand() > 0.6) E.push(ex('Band Pull-Aparts', 2, 15, 0, 'Shoulder care'));
    if (t > 0.3 && rand() > 0.55) E.push(ex('Walking Lunges', 2, 12, 0, 'Building glute strength'));
    if (rand() > 0.7) E.push(ex('Bike Intervals 30s/90s', 1, 8, 0, '8 rounds, HR capped ~115'));
  }
  // clamp to 4-8 exercises
  return E.slice(0, 8);
}

// Schedule: 1-2/week, Tue + Fri pattern; some weeks drop to 1
const schedule = [];
{
  const start = new Date(2026, 0, 6); // week of Jan 5 (first session Jan 6/9... anchor Jan 10 era)
  const end = new Date(2026, 6, 12);
  let week = 0;
  for (let ws = new Date(start); ws <= end; ws.setDate(ws.getDate() + 7), week++) {
    const rand = seedRand('anand-week-' + week);
    const twoSessions = rand() > 0.22; // ~78% of weeks have 2 sessions
    const d1 = new Date(ws); d1.setDate(d1.getDate() + (rand() > 0.5 ? 1 : 0)); // Tue/Wed
    schedule.push(new Date(d1));
    if (twoSessions) { const d2 = new Date(ws); d2.setDate(d2.getDate() + 4); if (d2 <= end) schedule.push(d2); }
  }
}

const fmt = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const T0 = new Date(2026, 0, 6).getTime(), T1 = new Date(2026, 6, 12).getTime();

let created = 0, skipped = 0, failed = 0, logRowsCreated = 0;
for (const d of schedule) {
  if (d > new Date()) continue;
  const dateStr = fmt(d);
  const t = (d.getTime() - T0) / (T1 - T0);
  const rand = seedRand('anand-' + dateStr);
  const isEarly = d < new Date(2026, 2, 1); // before March: Day-1 style
  const kind = isEarly ? 'day1' : (rand() < 0.12 ? 'shoulder-care' : 'v2');
  const exercises = buildExercises(d, t, rand, kind).map((e) => ({
    name: e.name,
    sets: e.sets,
    reps: e.reps,
    weight: e.weight,
    exerciseNote: e.note || undefined,
  }));
  const duration = 40 + Math.floor(rand() * 16); // 40-55
  const intensity = kind === 'shoulder-care' ? 4 : 4 + Math.round(rand() * 2); // 4-6 moderate
  const title = kind === 'day1' ? 'Phase 1 Stabilization Circuit'
    : kind === 'shoulder-care' ? 'Shoulder Care + Core Day'
    : 'Full Body Strength — Heart-Health Program';
  try {
    const result = await logWorkoutForClient({
      clientId: CLIENT_ID,
      exercises,
      date: dateStr,
      notes: `Reconstructed training record (real session, logged retroactively). [${MARKER}]`,
      title,
      duration,
      intensity,
      trainerId: TRAINER_ID,
      sequelize,
      suppressEngagementSideEffects: true,
    });
    created++; logRowsCreated += result.totalSets;
  } catch (err) {
    if (err.code === 'DUPLICATE_DATE') { skipped++; }
    else { failed++; console.error('FAIL', dateStr, err.message); }
  }
}
console.log(`Sessions: created=${created} skipped(existing-date)=${skipped} failed=${failed} logRows=${logRowsCreated}`);

// ── 3. Current plan (draft → activate, mirroring the activate route logic) ─
const WorkoutPlan = getModel('WorkoutPlan');
const existingMarked = await WorkoutPlan.findOne({
  where: sequelize.where(sequelize.literal(`metadata->>'backfillMarker'`), MARKER),
});
if (existingMarked && existingMarked.userId === CLIENT_ID) {
  console.log('Plan already exists:', existingMarked.id, existingMarked.status, '— skipping creation');
} else {
  const planEx = (name, sets, setScheme, reps, weight, notes, order) => ({
    exerciseName: name, exerciseId: name.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
    sets, setScheme, reps, repGoal: reps, notes: notes || '', tempo: '2-1-2',
    restPeriod: 60, intensityGuideline: 'moderate — HR ~115 bpm cap',
    orderInWorkout: order, source: 'trainer',
  });
  const dayA = {
    name: 'Day A: Full Body Strength (Version 2)', focus: 'strength-endurance', dayType: 'training',
    optPhase: 2, dayNumber: 1, dayInPlan: 1, sessionType: 'trainer-led', assignmentType: 'trainer',
    isBillable: true, shouldDeductSession: true,
    exercises: [
      planEx('Single-Leg Leg Press', 3, '3x10-12', '10-12', 100, 'Base 80-100 lb +10; fatigues at 10-12', 1),
      planEx('Ball Hamstring Curls', 3, '3x12', '12', 0, 'Stability ball', 2),
      planEx('Chest Press Machine', 3, '3x15', '15', 30, 'Keep at ~30 lb — shoulder-safe', 3),
      planEx('Seated Cable Row - Dual Hand Inside Grip', 3, '3x15', '15', 66, '', 4),
      planEx('Pallof Press', 3, '3x12', '12', 20, 'Anti-rotation core', 5),
      planEx('Hip Abductor Machine', 3, '3x15', '15', 50, '', 6),
      planEx('Hip Adductor Machine', 3, '3x15', '15', 40, '', 7),
      planEx('Bike Intervals 30s/90s', 1, '8 rounds', '8', 0, '30s work / 90s easy, HR ~115 cap', 8),
    ],
  };
  const dayB = {
    ...dayA,
    name: 'Day B: Core + Shoulder Care + Glutes', dayNumber: 2, dayInPlan: 2,
    exercises: [
      planEx('Box Squats', 3, '3x15', '15', 0, '15 reps typical; >20 too hard on heart', 1),
      planEx('Walking Lunges', 3, '3x12', '12', 0, 'Glute strength emphasis', 2),
      planEx('Seated Knee Tucks', 3, '3x12-15', '12-15', 0, 'Lower-ab build', 3),
      planEx('Cable Rotations', 3, '3x12', '12', 10, 'Light — rotator cuff', 4),
      planEx('Band Pull-Aparts', 3, '3x15', '15', 0, 'Light shoulder care', 5),
      planEx('Face Pulls', 3, '3x15', '15', 20, 'Light', 6),
      planEx('Incline Push-Ups', 2, '2x12', '12', 0, 'NO TRX pushups, NO heavy overhead press', 7),
      planEx('Dumbbell Bicep Curls', 3, '3x12-15', '12-15', 20, '20 lb = max, mastering', 8),
    ],
  };
  const weeks = Array.from({ length: 8 }, (_, i) => ({
    weekNumber: i + 1, monthNumber: Math.floor(i / 4) + 1, weekInMonth: (i % 4) + 1,
    isDeloadWeek: false, mesocycleNumber: 1,
    days: [ { ...dayA }, { ...dayB } ],
  }));

  const t = await sequelize.transaction();
  try {
    // mirror activate-route semantics: lock + demote any active sibling to 'paused'
    await sequelize.query(`SELECT id FROM workout_plans WHERE "userId"=:uid FOR UPDATE`, { replacements: { uid: CLIENT_ID }, transaction: t });
    const actives = await WorkoutPlan.findAll({ where: { userId: CLIENT_ID, status: 'active' }, transaction: t });
    for (const p of actives) await p.update({ status: 'paused' }, { transaction: t });

    const plan = await WorkoutPlan.create({
      userId: CLIENT_ID,
      trainerId: TRAINER_ID,
      title: 'Anand — Heart-Health Strength Program',
      description: 'Version 2 program: full-body strength endurance with shoulder-safe pressing (right anterior shoulder — no TRX pushups, no heavy overhead work), rotator-cuff care, core/lower-ab building, glute + back emphasis, more lunges and heavy ab days going forward. Cardio homework: 20→45 min walk/bike 3x/week between sessions (goal 45 min). Keep HR ~115, 15-20 rep ranges, moderate RPE per doctor guidance on BP/HR.',
      nasmPhase: 2,
      startDate: '2026-04-16',
      durationWeeks: 8,
      status: 'draft',
      currentWeek: 1,
      currentDay: 1,
      planData: { weeks },
      progressNotes: [],
      createdBy: 'trainer',
      metadata: { backfillMarker: MARKER, injuryNotes: 'Right anterior shoulder pain near pec-delt insertion — avoid TRX pushups + heavy overhead pressing', cardioHomework: '20-45 min walk/bike 3x/week, goal 45 min' },
    }, { transaction: t });
    await plan.update({ status: 'active' }, { transaction: t });
    await t.commit();
    console.log('Plan created + activated:', plan.id);
  } catch (err) {
    await t.rollback();
    console.error('PLAN FAILED:', err.message);
    process.exitCode = 1;
  }
}

// ── 4. Verify ───────────────────────────────────────────────────────────────
const byMonth = await sequelize.query(
  `SELECT to_char(date,'YYYY-MM') m, count(*) c FROM workout_sessions WHERE "userId"=:uid GROUP BY 1 ORDER BY 1`,
  { replacements: { uid: CLIENT_ID }, type: sequelize.QueryTypes.SELECT }
);
console.log('Sessions by month:', JSON.stringify(byMonth));
const [logCount] = await sequelize.query(
  `SELECT count(*) c FROM workout_logs wl JOIN workout_sessions ws ON wl."sessionId"=ws.id WHERE ws."userId"=:uid`,
  { replacements: { uid: CLIENT_ID }, type: sequelize.QueryTypes.SELECT }
);
console.log('Total workout_logs rows:', logCount.c);
const plans = await sequelize.query(
  `SELECT id, title, status FROM workout_plans WHERE "userId"=:uid`,
  { replacements: { uid: CLIENT_ID }, type: sequelize.QueryTypes.SELECT }
);
console.log('Plans:', JSON.stringify(plans));
await sequelize.close();
