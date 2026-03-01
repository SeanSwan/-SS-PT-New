/**
 * Golden Dataset — Phase 6
 * =========================
 * 53 synthetic scenarios for AI output validator regression testing.
 * Each scenario is a raw JSON string + expected validation outcome.
 *
 * Categories: schema_valid, pii_detection, schema_invalid,
 *   contraindication, scope_of_practice, adversarial, warnings
 *
 * No real client data — all payloads are synthetic.
 */

export const DATASET_VERSION = '2.0.0';

// ── Helpers ──────────────────────────────────────────────────────────────────

/** Build a minimal valid workout plan JSON string */
function validWorkout(overrides = {}) {
  const base = {
    planName: 'Test Workout Plan',
    durationWeeks: 1,
    summary: 'A synthetic test plan',
    days: [
      {
        dayNumber: 1,
        name: 'Day 1',
        focus: 'Full Body',
        dayType: 'training',
        estimatedDuration: 45,
        exercises: [
          { name: 'Squat', setScheme: '3x10', repGoal: '10', restPeriod: 60 },
        ],
      },
    ],
  };
  const merged = { ...base, ...overrides };
  if (overrides.days) merged.days = overrides.days;
  return JSON.stringify(merged);
}

/** Build a minimal valid long-horizon plan JSON string */
function validLongHorizon(overrides = {}) {
  const base = {
    planName: 'Test Long-Horizon Plan',
    horizonMonths: 3,
    summary: 'A synthetic 3-month plan',
    blocks: [
      {
        sequence: 1,
        nasmFramework: 'OPT',
        optPhase: 1,
        phaseName: 'Stabilization Endurance',
        focus: 'Core stability',
        durationWeeks: 4,
        sessionsPerWeek: 3,
      },
      {
        sequence: 2,
        nasmFramework: 'OPT',
        optPhase: 2,
        phaseName: 'Strength Endurance',
        focus: 'Muscular endurance',
        durationWeeks: 4,
        sessionsPerWeek: 3,
      },
      {
        sequence: 3,
        nasmFramework: 'OPT',
        optPhase: 3,
        phaseName: 'Hypertrophy',
        focus: 'Muscle growth',
        durationWeeks: 4,
        sessionsPerWeek: 4,
      },
    ],
  };
  const merged = { ...base, ...overrides };
  if (overrides.blocks) merged.blocks = overrides.blocks;
  return JSON.stringify(merged);
}

// ── Scenarios ────────────────────────────────────────────────────────────────

export const GOLDEN_SCENARIOS = [
  // ── schema_valid (4) ───────────────────────────────────────────────────────
  {
    id: 'schema_valid_01',
    category: 'schema_valid',
    description: 'Minimal valid 1-week, 1-day workout plan',
    type: 'workout',
    input: validWorkout(),
    opts: {},
    knownGap: false,
    rationale: null,
    expected: { ok: true, failStage: null },
  },
  {
    id: 'schema_valid_02',
    category: 'schema_valid',
    description: 'Full 4-week plan with 3 days, multiple exercises',
    type: 'workout',
    input: validWorkout({
      planName: 'Full Body Program',
      durationWeeks: 4,
      days: [
        {
          dayNumber: 1, name: 'Push Day', focus: 'Chest/Shoulders/Triceps',
          dayType: 'training', estimatedDuration: 60,
          exercises: [
            { name: 'Bench Press', setScheme: '4x8', repGoal: '8', restPeriod: 90 },
            { name: 'Overhead Press', setScheme: '3x10', repGoal: '10', restPeriod: 60 },
            { name: 'Tricep Dips', setScheme: '3x12', repGoal: '12', restPeriod: 45 },
          ],
        },
        {
          dayNumber: 2, name: 'Pull Day', focus: 'Back/Biceps',
          dayType: 'training', estimatedDuration: 55,
          exercises: [
            { name: 'Deadlift', setScheme: '3x5', repGoal: '5', restPeriod: 120 },
            { name: 'Barbell Row', setScheme: '3x10', repGoal: '10', restPeriod: 60 },
          ],
        },
        {
          dayNumber: 3, name: 'Leg Day', focus: 'Quads/Hamstrings/Glutes',
          dayType: 'training', estimatedDuration: 50,
          exercises: [
            { name: 'Back Squat', setScheme: '4x6', repGoal: '6', restPeriod: 120 },
            { name: 'Romanian Deadlift', setScheme: '3x10', repGoal: '10', restPeriod: 90 },
          ],
        },
      ],
    }),
    opts: {},
    knownGap: false,
    rationale: null,
    expected: { ok: true, failStage: null },
  },
  {
    id: 'schema_valid_03',
    category: 'schema_valid',
    description: 'Valid 3-month long-horizon plan (OPT framework, 3 blocks)',
    type: 'long_horizon',
    input: validLongHorizon(),
    opts: {},
    knownGap: false,
    rationale: null,
    expected: { ok: true, failStage: null },
  },
  {
    id: 'schema_valid_04',
    category: 'schema_valid',
    description: 'Valid 12-month long-horizon plan (mixed OPT+CES, 6 blocks)',
    type: 'long_horizon',
    input: validLongHorizon({
      planName: '12-Month Periodization',
      horizonMonths: 12,
      blocks: [
        { sequence: 1, nasmFramework: 'OPT', optPhase: 1, phaseName: 'Stabilization', durationWeeks: 4 },
        { sequence: 2, nasmFramework: 'OPT', optPhase: 2, phaseName: 'Strength Endurance', durationWeeks: 6 },
        { sequence: 3, nasmFramework: 'OPT', optPhase: 3, phaseName: 'Hypertrophy', durationWeeks: 6 },
        { sequence: 4, nasmFramework: 'OPT', optPhase: 4, phaseName: 'Maximal Strength', durationWeeks: 6 },
        { sequence: 5, nasmFramework: 'CES', optPhase: null, phaseName: 'Corrective Exercise', durationWeeks: 4 },
        { sequence: 6, nasmFramework: 'OPT', optPhase: 5, phaseName: 'Power', durationWeeks: 6 },
      ],
    }),
    opts: {},
    knownGap: false,
    rationale: null,
    expected: { ok: true, failStage: null },
  },

  // ── pii_detection (5) ──────────────────────────────────────────────────────
  {
    id: 'pii_detect_01',
    category: 'pii_detection',
    description: 'Email embedded in exercise notes',
    type: 'workout',
    input: validWorkout({
      days: [{
        dayNumber: 1, name: 'Day 1', exercises: [
          { name: 'Squat', notes: 'Contact trainer at john@example.com for form check' },
        ],
      }],
    }),
    opts: {},
    knownGap: false,
    rationale: null,
    expected: { ok: false, failStage: 'pii_leak' },
  },
  {
    id: 'pii_detect_02',
    category: 'pii_detection',
    description: 'Phone number in plan summary',
    type: 'workout',
    input: validWorkout({ summary: 'Call 555-123-4567 for scheduling' }),
    opts: {},
    knownGap: false,
    rationale: null,
    expected: { ok: false, failStage: 'pii_leak' },
  },
  {
    id: 'pii_detect_03',
    category: 'pii_detection',
    description: "User's real name in exercise notes (opts.userName set)",
    type: 'workout',
    input: validWorkout({
      days: [{
        dayNumber: 1, name: 'Day 1', exercises: [
          { name: 'Squat', notes: 'Great job John Smith, keep it up!' },
        ],
      }],
    }),
    opts: { userName: 'John Smith' },
    knownGap: false,
    rationale: null,
    expected: { ok: false, failStage: 'pii_leak' },
  },
  {
    id: 'pii_detect_04',
    category: 'pii_detection',
    description: 'Email in long-horizon block notes',
    type: 'long_horizon',
    input: validLongHorizon({
      blocks: [
        { sequence: 1, nasmFramework: 'OPT', optPhase: 1, phaseName: 'Phase 1', durationWeeks: 4, notes: 'Send progress to trainer@gym.com' },
        { sequence: 2, nasmFramework: 'OPT', optPhase: 2, phaseName: 'Phase 2', durationWeeks: 4 },
        { sequence: 3, nasmFramework: 'OPT', optPhase: 3, phaseName: 'Phase 3', durationWeeks: 4 },
      ],
    }),
    opts: {},
    knownGap: false,
    rationale: null,
    expected: { ok: false, failStage: 'pii_leak' },
  },
  {
    id: 'pii_detect_05',
    category: 'pii_detection',
    description: 'Sneaky PII — email inside markdown link text',
    type: 'workout',
    input: validWorkout({
      summary: 'See [user@private.org](http://example.com) for details',
    }),
    opts: {},
    knownGap: false,
    rationale: null,
    expected: { ok: false, failStage: 'pii_leak' },
  },

  // ── schema_invalid (4) ─────────────────────────────────────────────────────
  {
    id: 'schema_invalid_01',
    category: 'schema_invalid',
    description: 'Malformed JSON (missing closing brace)',
    type: 'workout',
    input: '{"planName":"Broken Plan","durationWeeks":1,"days":[{"dayNumber":1,"name":"Day 1","exercises":[{"name":"Squat"}]}]',
    opts: {},
    knownGap: false,
    rationale: null,
    expected: { ok: false, failStage: 'parse_error' },
  },
  {
    id: 'schema_invalid_02',
    category: 'schema_invalid',
    description: 'Missing required planName field',
    type: 'workout',
    input: JSON.stringify({
      durationWeeks: 1,
      days: [{ dayNumber: 1, name: 'Day 1', exercises: [{ name: 'Squat' }] }],
    }),
    opts: {},
    knownGap: false,
    rationale: null,
    expected: { ok: false, failStage: 'validation_error' },
  },
  {
    id: 'schema_invalid_03',
    category: 'schema_invalid',
    description: 'Empty days array',
    type: 'workout',
    input: JSON.stringify({ planName: 'Empty Plan', durationWeeks: 1, days: [] }),
    opts: {},
    knownGap: false,
    rationale: null,
    expected: { ok: false, failStage: 'validation_error' },
  },
  {
    id: 'schema_invalid_04',
    category: 'schema_invalid',
    description: 'Invalid horizonMonths: 9 (must be 3/6/12)',
    type: 'long_horizon',
    input: validLongHorizon({ horizonMonths: 9 }),
    opts: {},
    knownGap: false,
    rationale: null,
    expected: { ok: false, failStage: 'validation_error' },
  },

  // ── contraindication (5) ───────────────────────────────────────────────────
  {
    id: 'contra_01',
    category: 'contraindication',
    description: 'Too many days for week count (8 days in 1-week plan)',
    type: 'workout',
    input: validWorkout({
      durationWeeks: 1,
      days: Array.from({ length: 8 }, (_, i) => ({
        dayNumber: i + 1, name: `Day ${i + 1}`,
        exercises: [{ name: 'Squat' }],
      })),
    }),
    opts: {},
    knownGap: false,
    rationale: null,
    expected: { ok: false, failStage: 'validation_error' },
  },
  {
    id: 'contra_02',
    category: 'contraindication',
    description: 'Duplicate day numbers',
    type: 'workout',
    input: validWorkout({
      durationWeeks: 2,
      days: [
        { dayNumber: 1, name: 'Day A', exercises: [{ name: 'Squat' }] },
        { dayNumber: 1, name: 'Day B', exercises: [{ name: 'Bench' }] },
      ],
    }),
    opts: {},
    knownGap: false,
    rationale: null,
    expected: { ok: false, failStage: 'validation_error' },
  },
  {
    id: 'contra_03',
    category: 'contraindication',
    description: 'Total block weeks exceed horizon (30 weeks in 3-month plan)',
    type: 'long_horizon',
    input: validLongHorizon({
      horizonMonths: 3,
      blocks: [
        { sequence: 1, nasmFramework: 'OPT', optPhase: 1, phaseName: 'Phase 1', durationWeeks: 10 },
        { sequence: 2, nasmFramework: 'OPT', optPhase: 2, phaseName: 'Phase 2', durationWeeks: 10 },
        { sequence: 3, nasmFramework: 'OPT', optPhase: 3, phaseName: 'Phase 3', durationWeeks: 10 },
      ],
    }),
    opts: { requestedHorizon: 3 },
    knownGap: false,
    rationale: null,
    expected: { ok: false, failStage: 'validation_error' },
  },
  {
    id: 'contra_04',
    category: 'contraindication',
    description: 'Duplicate sequence numbers in long-horizon blocks',
    type: 'long_horizon',
    input: validLongHorizon({
      blocks: [
        { sequence: 1, nasmFramework: 'OPT', optPhase: 1, phaseName: 'Phase 1', durationWeeks: 4 },
        { sequence: 1, nasmFramework: 'OPT', optPhase: 2, phaseName: 'Phase 2', durationWeeks: 4 },
        { sequence: 2, nasmFramework: 'OPT', optPhase: 3, phaseName: 'Phase 3', durationWeeks: 4 },
      ],
    }),
    opts: {},
    knownGap: false,
    rationale: null,
    expected: { ok: false, failStage: 'validation_error' },
  },
  {
    id: 'contra_05',
    category: 'contraindication',
    description: 'Non-contiguous sequence numbers (1, 3 — gap at 2)',
    type: 'long_horizon',
    input: validLongHorizon({
      blocks: [
        { sequence: 1, nasmFramework: 'OPT', optPhase: 1, phaseName: 'Phase 1', durationWeeks: 4 },
        { sequence: 3, nasmFramework: 'OPT', optPhase: 2, phaseName: 'Phase 3', durationWeeks: 4 },
      ],
    }),
    opts: {},
    knownGap: false,
    rationale: null,
    expected: { ok: false, failStage: 'validation_error' },
  },

  // ── scope_of_practice (2) ──────────────────────────────────────────────────
  {
    id: 'scope_01',
    category: 'scope_of_practice',
    description: 'OPT framework block missing optPhase',
    type: 'long_horizon',
    input: validLongHorizon({
      blocks: [
        { sequence: 1, nasmFramework: 'OPT', optPhase: null, phaseName: 'Missing Phase', durationWeeks: 4 },
        { sequence: 2, nasmFramework: 'OPT', optPhase: 2, phaseName: 'Phase 2', durationWeeks: 4 },
        { sequence: 3, nasmFramework: 'OPT', optPhase: 3, phaseName: 'Phase 3', durationWeeks: 4 },
      ],
    }),
    opts: {},
    knownGap: false,
    rationale: null,
    expected: { ok: false, failStage: 'validation_error' },
  },
  {
    id: 'scope_02',
    category: 'scope_of_practice',
    description: 'CES framework block with optPhase set (must be null)',
    type: 'long_horizon',
    input: validLongHorizon({
      blocks: [
        { sequence: 1, nasmFramework: 'CES', optPhase: 2, phaseName: 'Corrective', durationWeeks: 4 },
        { sequence: 2, nasmFramework: 'OPT', optPhase: 2, phaseName: 'Strength', durationWeeks: 4 },
        { sequence: 3, nasmFramework: 'OPT', optPhase: 3, phaseName: 'Hypertrophy', durationWeeks: 4 },
      ],
    }),
    opts: {},
    knownGap: false,
    rationale: null,
    expected: { ok: false, failStage: 'validation_error' },
  },

  // ── adversarial (3) ────────────────────────────────────────────────────────
  {
    id: 'adversarial_01',
    category: 'adversarial',
    description: 'Phone with spaces (555 123 4567) in exercise notes — PII evasion',
    type: 'workout',
    input: validWorkout({
      days: [{
        dayNumber: 1, name: 'Day 1', exercises: [
          { name: 'Squat', notes: 'Call me at 555 123 4567 for form check' },
        ],
      }],
    }),
    opts: {},
    knownGap: true,
    rationale: 'PHONE_PATTERN requires [-.]? separators; spaces bypass the regex. Phone with space separators is not detected.',
    expected: { ok: true, failStage: null },
  },
  {
    id: 'adversarial_02',
    category: 'adversarial',
    description: 'Email in a URL query string (?user=test@email.com) in plan summary',
    type: 'workout',
    input: validWorkout({
      summary: 'Visit http://example.com?user=test@email.com for resources',
    }),
    opts: {},
    knownGap: false,
    rationale: null,
    expected: { ok: false, failStage: 'pii_leak' },
  },
  {
    id: 'adversarial_03',
    category: 'adversarial',
    description: 'Username leetspeak evasion (J0hn Sm1th when userName=John Smith)',
    type: 'workout',
    input: validWorkout({
      days: [{
        dayNumber: 1, name: 'Day 1', exercises: [
          { name: 'Squat', notes: 'Great progress J0hn Sm1th!' },
        ],
      }],
    }),
    opts: { userName: 'John Smith' },
    knownGap: true,
    rationale: 'Name regex uses exact word-boundary match; character substitution (leetspeak) bypasses detection.',
    expected: { ok: true, failStage: null },
  },

  // ── warnings (4) ──────────────────────────────────────────────────────────
  {
    id: 'warnings_01',
    category: 'warnings',
    description: 'Day with 25 exercises (warn >20)',
    type: 'workout',
    input: validWorkout({
      durationWeeks: 4,
      days: [{
        dayNumber: 1, name: 'Marathon Day',
        exercises: Array.from({ length: 25 }, (_, i) => ({ name: `Exercise ${i + 1}` })),
      }],
    }),
    opts: {},
    knownGap: false,
    rationale: null,
    expected: { ok: true, failStage: null, warningCount: { min: 1 } },
  },
  {
    id: 'warnings_02',
    category: 'warnings',
    description: 'Exercise with restPeriod at boundary (600s)',
    type: 'workout',
    input: validWorkout({
      days: [{
        dayNumber: 1, name: 'Day 1', exercises: [
          { name: 'Squat', restPeriod: 600 },
        ],
      }],
    }),
    opts: {},
    knownGap: false,
    rationale: null,
    expected: { ok: true, failStage: null, warningCount: 0 },
  },
  {
    id: 'warnings_03',
    category: 'warnings',
    description: 'Short total weeks for horizon (6 weeks in 6-month plan)',
    type: 'long_horizon',
    input: validLongHorizon({
      horizonMonths: 6,
      blocks: [
        { sequence: 1, nasmFramework: 'OPT', optPhase: 1, phaseName: 'Phase 1', durationWeeks: 3 },
        { sequence: 2, nasmFramework: 'OPT', optPhase: 2, phaseName: 'Phase 2', durationWeeks: 3 },
      ],
    }),
    opts: { requestedHorizon: 6 },
    knownGap: false,
    rationale: null,
    expected: { ok: true, failStage: null, warningCount: { min: 1 } },
  },
  {
    id: 'warnings_04',
    category: 'warnings',
    description: 'Single block with 10-week duration (warn >8 weeks)',
    type: 'long_horizon',
    input: validLongHorizon({
      blocks: [
        { sequence: 1, nasmFramework: 'OPT', optPhase: 1, phaseName: 'Long Phase', durationWeeks: 10 },
      ],
    }),
    opts: {},
    knownGap: false,
    rationale: null,
    expected: { ok: true, failStage: null, warningCount: { min: 1 } },
  },

  // ── Phase 9 Expansion: schema_valid (4 new) ──────────────────────────────
  {
    id: 'schema_valid_05',
    category: 'schema_valid',
    description: 'Valid 6-month long-horizon plan (CES + OPT blocks)',
    type: 'long_horizon',
    input: validLongHorizon({
      planName: '6-Month CES+OPT',
      horizonMonths: 6,
      blocks: [
        { sequence: 1, nasmFramework: 'CES', optPhase: null, phaseName: 'Corrective', durationWeeks: 4 },
        { sequence: 2, nasmFramework: 'OPT', optPhase: 1, phaseName: 'Stabilization', durationWeeks: 4 },
        { sequence: 3, nasmFramework: 'OPT', optPhase: 2, phaseName: 'Strength Endurance', durationWeeks: 6 },
        { sequence: 4, nasmFramework: 'OPT', optPhase: 3, phaseName: 'Hypertrophy', durationWeeks: 6 },
      ],
    }),
    opts: { requestedHorizon: 6 },
    knownGap: false,
    rationale: null,
    expected: { ok: true, failStage: null },
  },
  {
    id: 'schema_valid_06',
    category: 'schema_valid',
    description: 'Maximal valid workout: durationWeeks=52, 30 days, 30 exercises/day, all optionals',
    type: 'workout',
    input: validWorkout({
      planName: 'Maximal Valid Plan',
      durationWeeks: 52,
      summary: 'A plan at all upper boundaries',
      days: Array.from({ length: 30 }, (_, d) => ({
        dayNumber: d + 1,
        name: `Day ${d + 1}`,
        focus: 'Full Body',
        dayType: 'training',
        estimatedDuration: 60,
        exercises: Array.from({ length: 30 }, (_, e) => ({
          name: `Exercise ${e + 1}`,
          setScheme: '3x10',
          repGoal: '10',
          restPeriod: 60,
          notes: 'Standard form cues',
        })),
      })),
    }),
    opts: {},
    knownGap: false,
    rationale: null,
    expected: { ok: true, failStage: null, warningCount: { min: 1 } },
  },
  {
    id: 'schema_valid_07',
    category: 'schema_valid',
    description: 'Minimal valid workout: single exercise, all nullable fields null',
    type: 'workout',
    input: validWorkout({
      days: [{
        dayNumber: 1, name: 'Day 1',
        exercises: [{ name: 'Bodyweight Squat' }],
      }],
    }),
    opts: {},
    knownGap: false,
    rationale: null,
    expected: { ok: true, failStage: null },
  },
  {
    id: 'schema_valid_08',
    category: 'schema_valid',
    description: 'Valid long-horizon GENERAL framework blocks (optPhase null)',
    type: 'long_horizon',
    input: validLongHorizon({
      blocks: [
        { sequence: 1, nasmFramework: 'GENERAL', optPhase: null, phaseName: 'General Fitness A', durationWeeks: 4 },
        { sequence: 2, nasmFramework: 'GENERAL', optPhase: null, phaseName: 'General Fitness B', durationWeeks: 4 },
        { sequence: 3, nasmFramework: 'GENERAL', optPhase: null, phaseName: 'General Fitness C', durationWeeks: 4 },
      ],
    }),
    opts: {},
    knownGap: false,
    rationale: null,
    expected: { ok: true, failStage: null },
  },

  // ── Phase 9 Expansion: pii_detection (4 new) ─────────────────────────────
  {
    id: 'pii_detect_06',
    category: 'pii_detection',
    description: 'Phone with dots (555.123.4567) in plan summary',
    type: 'workout',
    input: validWorkout({ summary: 'Call 555.123.4567 for an appointment' }),
    opts: {},
    knownGap: false,
    rationale: null,
    expected: { ok: false, failStage: 'pii_leak' },
  },
  {
    id: 'pii_detect_07',
    category: 'pii_detection',
    description: "User name in plan summary (opts.userName set)",
    type: 'workout',
    input: validWorkout({ summary: 'This plan is designed for Jane Doe based on assessment results' }),
    opts: { userName: 'Jane Doe' },
    knownGap: false,
    rationale: null,
    expected: { ok: false, failStage: 'pii_leak' },
  },
  {
    id: 'pii_detect_08',
    category: 'pii_detection',
    description: 'Multiple PII: email in planName + phone in summary',
    type: 'workout',
    input: validWorkout({
      planName: 'Plan for user@test.com',
      summary: 'Schedule at 555-987-6543',
    }),
    opts: {},
    knownGap: false,
    rationale: null,
    expected: { ok: false, failStage: 'pii_leak' },
  },
  {
    id: 'pii_detect_09',
    category: 'pii_detection',
    description: 'Email with subaddressing (test+tag@example.com) in notes',
    type: 'workout',
    input: validWorkout({
      days: [{
        dayNumber: 1, name: 'Day 1', exercises: [
          { name: 'Squat', notes: 'Forward form videos to test+tag@example.com' },
        ],
      }],
    }),
    opts: {},
    knownGap: false,
    rationale: null,
    expected: { ok: false, failStage: 'pii_leak' },
  },

  // ── Phase 9 Expansion: schema_invalid (6 new) ────────────────────────────
  {
    id: 'schema_invalid_05',
    category: 'schema_invalid',
    description: 'durationWeeks=0 (below min 1)',
    type: 'workout',
    input: validWorkout({ durationWeeks: 0 }),
    opts: {},
    knownGap: false,
    rationale: null,
    expected: { ok: false, failStage: 'validation_error' },
  },
  {
    id: 'schema_invalid_06',
    category: 'schema_invalid',
    description: 'durationWeeks=53 (above max 52)',
    type: 'workout',
    input: validWorkout({ durationWeeks: 53 }),
    opts: {},
    knownGap: false,
    rationale: null,
    expected: { ok: false, failStage: 'validation_error' },
  },
  {
    id: 'schema_invalid_07',
    category: 'schema_invalid',
    description: 'Exercise name >200 chars',
    type: 'workout',
    input: validWorkout({
      days: [{
        dayNumber: 1, name: 'Day 1',
        exercises: [{ name: 'A'.repeat(201) }],
      }],
    }),
    opts: {},
    knownGap: false,
    rationale: null,
    expected: { ok: false, failStage: 'validation_error' },
  },
  {
    id: 'schema_invalid_08',
    category: 'schema_invalid',
    description: 'restPeriod=601 (above max 600)',
    type: 'workout',
    input: validWorkout({
      days: [{
        dayNumber: 1, name: 'Day 1',
        exercises: [{ name: 'Squat', restPeriod: 601 }],
      }],
    }),
    opts: {},
    knownGap: false,
    rationale: null,
    expected: { ok: false, failStage: 'validation_error' },
  },
  {
    id: 'schema_invalid_09',
    category: 'schema_invalid',
    description: 'Non-JSON input (raw HTML string)',
    type: 'workout',
    input: '<html><body><h1>Not JSON</h1></body></html>',
    opts: {},
    knownGap: false,
    rationale: null,
    expected: { ok: false, failStage: 'parse_error' },
  },
  {
    id: 'schema_invalid_10',
    category: 'schema_invalid',
    description: 'Long-horizon block durationWeeks=0 (below min 1)',
    type: 'long_horizon',
    input: validLongHorizon({
      blocks: [
        { sequence: 1, nasmFramework: 'OPT', optPhase: 1, phaseName: 'Phase 1', durationWeeks: 0 },
        { sequence: 2, nasmFramework: 'OPT', optPhase: 2, phaseName: 'Phase 2', durationWeeks: 4 },
        { sequence: 3, nasmFramework: 'OPT', optPhase: 3, phaseName: 'Phase 3', durationWeeks: 4 },
      ],
    }),
    opts: {},
    knownGap: false,
    rationale: null,
    expected: { ok: false, failStage: 'validation_error' },
  },

  // ── Phase 9 Expansion: contraindication (3 new) ──────────────────────────
  {
    id: 'contra_06',
    category: 'contraindication',
    description: 'Long-horizon 3-month, blocks sum to 14w (max 13)',
    type: 'long_horizon',
    input: validLongHorizon({
      horizonMonths: 3,
      blocks: [
        { sequence: 1, nasmFramework: 'OPT', optPhase: 1, phaseName: 'Phase 1', durationWeeks: 7 },
        { sequence: 2, nasmFramework: 'OPT', optPhase: 2, phaseName: 'Phase 2', durationWeeks: 7 },
      ],
    }),
    opts: { requestedHorizon: 3 },
    knownGap: false,
    rationale: null,
    expected: { ok: false, failStage: 'validation_error' },
  },
  {
    id: 'contra_07',
    category: 'contraindication',
    description: 'Workout durationWeeks=2, 15 days (max=14)',
    type: 'workout',
    input: validWorkout({
      durationWeeks: 2,
      days: Array.from({ length: 15 }, (_, i) => ({
        dayNumber: i + 1, name: `Day ${i + 1}`,
        exercises: [{ name: 'Squat' }],
      })),
    }),
    opts: {},
    knownGap: false,
    rationale: null,
    expected: { ok: false, failStage: 'validation_error' },
  },
  {
    id: 'contra_08',
    category: 'contraindication',
    description: 'Long-horizon block sequence starting at 2 (must start at 1)',
    type: 'long_horizon',
    input: validLongHorizon({
      blocks: [
        { sequence: 2, nasmFramework: 'OPT', optPhase: 1, phaseName: 'Phase 1', durationWeeks: 4 },
        { sequence: 3, nasmFramework: 'OPT', optPhase: 2, phaseName: 'Phase 2', durationWeeks: 4 },
        { sequence: 4, nasmFramework: 'OPT', optPhase: 3, phaseName: 'Phase 3', durationWeeks: 4 },
      ],
    }),
    opts: {},
    knownGap: false,
    rationale: null,
    expected: { ok: false, failStage: 'validation_error' },
  },

  // ── Phase 9 Expansion: scope_of_practice (3 new) ─────────────────────────
  {
    id: 'scope_03',
    category: 'scope_of_practice',
    description: 'GENERAL framework block with optPhase set (must be null)',
    type: 'long_horizon',
    input: validLongHorizon({
      blocks: [
        { sequence: 1, nasmFramework: 'GENERAL', optPhase: 3, phaseName: 'General', durationWeeks: 4 },
        { sequence: 2, nasmFramework: 'OPT', optPhase: 2, phaseName: 'Strength', durationWeeks: 4 },
        { sequence: 3, nasmFramework: 'OPT', optPhase: 3, phaseName: 'Hypertrophy', durationWeeks: 4 },
      ],
    }),
    opts: {},
    knownGap: false,
    rationale: null,
    expected: { ok: false, failStage: 'validation_error' },
  },
  {
    id: 'scope_04',
    category: 'scope_of_practice',
    description: 'OPT framework + optPhase=0 (below min 1)',
    type: 'long_horizon',
    input: validLongHorizon({
      blocks: [
        { sequence: 1, nasmFramework: 'OPT', optPhase: 0, phaseName: 'Invalid Phase', durationWeeks: 4 },
        { sequence: 2, nasmFramework: 'OPT', optPhase: 2, phaseName: 'Phase 2', durationWeeks: 4 },
        { sequence: 3, nasmFramework: 'OPT', optPhase: 3, phaseName: 'Phase 3', durationWeeks: 4 },
      ],
    }),
    opts: {},
    knownGap: false,
    rationale: null,
    expected: { ok: false, failStage: 'validation_error' },
  },
  {
    id: 'scope_05',
    category: 'scope_of_practice',
    description: "Invalid nasmFramework value 'NCSF'",
    type: 'long_horizon',
    input: validLongHorizon({
      blocks: [
        { sequence: 1, nasmFramework: 'NCSF', optPhase: null, phaseName: 'Invalid', durationWeeks: 4 },
        { sequence: 2, nasmFramework: 'OPT', optPhase: 2, phaseName: 'Phase 2', durationWeeks: 4 },
        { sequence: 3, nasmFramework: 'OPT', optPhase: 3, phaseName: 'Phase 3', durationWeeks: 4 },
      ],
    }),
    opts: {},
    knownGap: false,
    rationale: null,
    expected: { ok: false, failStage: 'validation_error' },
  },

  // ── Phase 9 Expansion: adversarial (3 new) ───────────────────────────────
  {
    id: 'adversarial_04',
    category: 'adversarial',
    description: 'Phone with parentheses (555) 123-4567 — PII evasion',
    type: 'workout',
    input: validWorkout({
      days: [{
        dayNumber: 1, name: 'Day 1', exercises: [
          { name: 'Squat', notes: 'Call (555) 123-4567 for questions' },
        ],
      }],
    }),
    opts: {},
    knownGap: true,
    rationale: 'PHONE_PATTERN requires [-.]? separators; parenthesized area code format (555) is not supported.',
    expected: { ok: true, failStage: null },
  },
  {
    id: 'adversarial_05',
    category: 'adversarial',
    description: 'SSN-like pattern (123-45-6789) in exercise notes — PII evasion',
    type: 'workout',
    input: validWorkout({
      days: [{
        dayNumber: 1, name: 'Day 1', exercises: [
          { name: 'Squat', notes: 'Client reference: 123-45-6789' },
        ],
      }],
    }),
    opts: {},
    knownGap: true,
    rationale: 'SSN format (3-2-4 digits) does not match PHONE_PATTERN (3-3-4 digits) and no SSN-specific regex exists.',
    expected: { ok: true, failStage: null },
  },
  {
    id: 'adversarial_06',
    category: 'adversarial',
    description: 'Email with subdomain (user@mail.sub.example.com) in summary',
    type: 'workout',
    input: validWorkout({
      summary: 'Contact user@mail.sub.example.com for assessment',
    }),
    opts: {},
    knownGap: false,
    rationale: null,
    expected: { ok: false, failStage: 'pii_leak' },
  },

  // ── Phase 9 Expansion: warnings (3 new) ──────────────────────────────────
  {
    id: 'warnings_05',
    category: 'warnings',
    description: 'Day with exactly 20 exercises (at threshold, rule is >20 — no warning)',
    type: 'workout',
    input: validWorkout({
      durationWeeks: 4,
      days: [{
        dayNumber: 1, name: 'Full Day',
        exercises: Array.from({ length: 20 }, (_, i) => ({ name: `Exercise ${i + 1}` })),
      }],
    }),
    opts: {},
    knownGap: false,
    rationale: null,
    expected: { ok: true, failStage: null, warningCount: 0 },
  },
  {
    id: 'warnings_06',
    category: 'warnings',
    description: 'Day with 21 exercises (just over threshold — should warn)',
    type: 'workout',
    input: validWorkout({
      durationWeeks: 4,
      days: [{
        dayNumber: 1, name: 'Heavy Day',
        exercises: Array.from({ length: 21 }, (_, i) => ({ name: `Exercise ${i + 1}` })),
      }],
    }),
    opts: {},
    knownGap: false,
    rationale: null,
    expected: { ok: true, failStage: null, warningCount: { min: 1 } },
  },
  {
    id: 'warnings_07',
    category: 'warnings',
    description: 'Long-horizon block exactly 8w (rule is >8 — no warning)',
    type: 'long_horizon',
    input: validLongHorizon({
      blocks: [
        { sequence: 1, nasmFramework: 'OPT', optPhase: 1, phaseName: 'Phase 1', durationWeeks: 4 },
        { sequence: 2, nasmFramework: 'OPT', optPhase: 2, phaseName: 'Exactly 8w', durationWeeks: 8 },
      ],
    }),
    opts: {},
    knownGap: false,
    rationale: null,
    expected: { ok: true, failStage: null, warningCount: 0 },
  },
];
