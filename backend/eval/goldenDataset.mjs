/**
 * Golden Dataset — Phase 6
 * =========================
 * 27 synthetic scenarios for AI output validator regression testing.
 * Each scenario is a raw JSON string + expected validation outcome.
 *
 * Categories: schema_valid, pii_detection, schema_invalid,
 *   contraindication, scope_of_practice, adversarial, warnings
 *
 * No real client data — all payloads are synthetic.
 */

export const DATASET_VERSION = '1.1.0';

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
];
