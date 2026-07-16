/**
 * ============================================================================
 * FILE: NASMPhaseTemplates.ts
 * PURPOSE: Pre-built NASM OPT Phase 1-5 workout templates with complete
 *          warmup, exercises, balance/core, and cooldown for each phase
 * AUTHOR: Claude Opus 4.6 | LAST MODIFIED: 2026-03-21
 * ============================================================================
 *
 * WHAT THIS FILE DOES: Exports complete workout templates for each NASM OPT
 * phase. Loading a template pre-fills the entire WorkoutLogger form.
 *
 * KEY DECISIONS: Templates are COMPREHENSIVE (premium client experience).
 * Each includes full warmup→resistance→cooldown matching the phase protocol.
 */




// ─── Phase Protocol Constants ────────────────────────────────────────

export interface PhaseProtocol {
  phase: number;
  name: string;
  shortName: string;
  repsRange: string;
  setsRange: string;
  tempo: string;
  tempoExplain: string;
  restRange: string;
  intensityPct: string;
  description: string;
  goal: string;
  keyPrinciples: string[];
}

export const PHASE_PROTOCOLS: PhaseProtocol[] = [
  {
    phase: 1,
    name: 'Stabilization Endurance',
    shortName: 'Stabilization',
    repsRange: '12-20',
    setsRange: '1-3',
    tempo: '4/2/1',
    tempoExplain: '4s eccentric, 2s isometric hold, 1s concentric',
    restRange: '0-90s',
    intensityPct: '50-70%',
    description: 'Build muscular endurance and postural stability using controlled tempos on unstable surfaces.',
    goal: 'Improve muscular endurance & postural stability',
    keyPrinciples: [
      'Use unstable surfaces (BOSU, stability ball) to activate stabilizers',
      'Controlled 4/2/1 tempo builds proprioceptive awareness',
      'Low weight, high reps — focus on form over load',
      'Corrective exercise integration for movement quality',
    ],
  },
  {
    phase: 2,
    name: 'Strength Endurance',
    shortName: 'Str. Endurance',
    repsRange: '8-12',
    setsRange: '2-4',
    tempo: '2/0/2',
    tempoExplain: '2s eccentric, no hold, 2s concentric',
    restRange: '0-60s',
    intensityPct: '70-80%',
    description: 'Supersets pairing a strength exercise with a stabilization exercise to build endurance under load.',
    goal: 'Increase muscular endurance under higher loads',
    keyPrinciples: [
      'Superset format: strength exercise + stabilization exercise',
      'Agonist/antagonist pairings with minimal rest',
      'Progressive load increase from Phase 1',
      'Maintain form quality under fatigue',
    ],
  },
  {
    phase: 3,
    name: 'Hypertrophy',
    shortName: 'Hypertrophy',
    repsRange: '6-12',
    setsRange: '3-5',
    tempo: '2/0/2',
    tempoExplain: '2s eccentric, no hold, 2s concentric',
    restRange: '0-60s',
    intensityPct: '75-85%',
    description: 'Maximize muscle growth through moderate-to-high volume with progressive overload.',
    goal: 'Maximize muscle size (hypertrophy)',
    keyPrinciples: [
      'Moderate weight, moderate reps — time under tension matters',
      'Progressive overload each session (weight, reps, or sets)',
      'Compound movements before isolation work',
      'Adequate rest between sets for recovery',
    ],
  },
  {
    phase: 4,
    name: 'Maximal Strength',
    shortName: 'Max Strength',
    repsRange: '1-5',
    setsRange: '4-6',
    tempo: 'X/0/X',
    tempoExplain: 'Explosive concentric, no hold, controlled eccentric',
    restRange: '3-5min',
    intensityPct: '85-100%',
    description: 'Develop maximum force production through heavy compound lifts with full recovery.',
    goal: 'Increase maximal strength (1RM)',
    keyPrinciples: [
      'Heavy loads (85-100% 1RM) with low reps',
      'Full recovery between sets (3-5 min)',
      'Compound lifts dominate (squat, bench, deadlift, OHP)',
      'Neural adaptations are primary — focus on force production',
    ],
  },
  {
    phase: 5,
    name: 'Power',
    shortName: 'Power',
    repsRange: '1-5 / 8-10',
    setsRange: '3-6',
    tempo: 'X/0/X',
    tempoExplain: 'Explosive in both strength and power exercises',
    restRange: '3-5min',
    intensityPct: '30-45% / 85-100%',
    description: 'Superset heavy strength exercise with explosive power exercise to develop rate of force production.',
    goal: 'Maximize power output (force × velocity)',
    keyPrinciples: [
      'Superset format: strength (85-100%) + power (30-45%)',
      'Explosive intent on every rep',
      'Full recovery between supersets (3-5 min)',
      'Olympic lifts and plyometrics for power development',
    ],
  },
];

// ─── Template Exercises per Phase ────────────────────────────────────

export interface TemplateExercise {
  name: string;
  sets: number;
  reps: number;
  tempo: string;
  restSeconds: number;
  notes?: string;
}

export interface PhaseTemplate {
  phase: number;
  warmupIds: string[];
  exercises: TemplateExercise[];
  balanceCoreIds: string[];
  cooldownIds: string[];
}

export const PHASE_TEMPLATES: PhaseTemplate[] = [
  {
    phase: 1,
    warmupIds: [
      'warmup-1', 'warmup-2', 'warmup-3', 'warmup-4',
      'warmup-9', 'warmup-10',
      'warmup-18', 'warmup-19', 'warmup-20', 'warmup-21',
    ],
    exercises: [
      { name: 'Ball Squat', sets: 2, reps: 15, tempo: '4/2/1', restSeconds: 60 },
      { name: 'Single-Leg Dumbbell Curl (on BOSU)', sets: 2, reps: 15, tempo: '4/2/1', restSeconds: 60 },
      { name: 'Cable Row (standing on BOSU)', sets: 2, reps: 15, tempo: '4/2/1', restSeconds: 60 },
      { name: 'Stability Ball Push-up', sets: 2, reps: 15, tempo: '4/2/1', restSeconds: 60 },
      { name: 'Single-Leg Calf Raise', sets: 2, reps: 20, tempo: '4/2/1', restSeconds: 60 },
    ],
    balanceCoreIds: [
      'balance-1', 'balance-2', 'balance-6', 'balance-8', 'balance-14', 'balance-19',
    ],
    cooldownIds: [
      'cooldown-1', 'cooldown-2', 'cooldown-3', 'cooldown-4', 'cooldown-5',
      'cooldown-12', 'cooldown-13',
    ],
  },
  {
    phase: 2,
    warmupIds: [
      'warmup-1', 'warmup-2', 'warmup-4', 'warmup-5',
      'warmup-9', 'warmup-11',
      'warmup-18', 'warmup-20', 'warmup-22', 'warmup-25',
    ],
    exercises: [
      { name: 'Barbell Bench Press', sets: 3, reps: 10, tempo: '2/0/2', restSeconds: 45, notes: 'Superset with Push-up' },
      { name: 'Push-up (stability)', sets: 3, reps: 12, tempo: '2/0/2', restSeconds: 45 },
      { name: 'Barbell Squat', sets: 3, reps: 10, tempo: '2/0/2', restSeconds: 45, notes: 'Superset with SL Squat' },
      { name: 'Single-Leg Squat (to bench)', sets: 3, reps: 10, tempo: '2/0/2', restSeconds: 45 },
      { name: 'Lat Pulldown', sets: 3, reps: 10, tempo: '2/0/2', restSeconds: 45, notes: 'Superset with Ball Row' },
      { name: 'Stability Ball Dumbbell Row', sets: 3, reps: 12, tempo: '2/0/2', restSeconds: 45 },
      { name: 'Shoulder Press', sets: 3, reps: 10, tempo: '2/0/2', restSeconds: 45, notes: 'Superset with Cable Raise' },
      { name: 'Cable Lateral Raise (SL stance)', sets: 3, reps: 12, tempo: '2/0/2', restSeconds: 45 },
    ],
    balanceCoreIds: [
      'balance-1', 'balance-4', 'balance-6', 'balance-7', 'balance-10', 'balance-11',
    ],
    cooldownIds: [
      'cooldown-1', 'cooldown-2', 'cooldown-3', 'cooldown-4', 'cooldown-5',
      'cooldown-6', 'cooldown-12',
    ],
  },
  {
    phase: 3,
    warmupIds: [
      'warmup-1', 'warmup-5', 'warmup-7',
      'warmup-9', 'warmup-11',
      'warmup-18', 'warmup-20', 'warmup-22',
    ],
    exercises: [
      { name: 'Barbell Bench Press', sets: 3, reps: 10, tempo: '2/0/2', restSeconds: 60 },
      { name: 'Barbell Back Squat', sets: 4, reps: 10, tempo: '2/0/2', restSeconds: 60 },
      { name: 'Dumbbell Shoulder Press', sets: 3, reps: 12, tempo: '2/0/2', restSeconds: 60 },
      { name: 'Seated Cable Row', sets: 3, reps: 12, tempo: '2/0/2', restSeconds: 60 },
      { name: 'Leg Press', sets: 3, reps: 10, tempo: '2/0/2', restSeconds: 60 },
    ],
    balanceCoreIds: [
      'balance-6', 'balance-7', 'balance-10', 'balance-11', 'balance-15',
    ],
    cooldownIds: [
      'cooldown-1', 'cooldown-2', 'cooldown-3', 'cooldown-4', 'cooldown-5',
      'cooldown-7', 'cooldown-11', 'cooldown-12',
    ],
  },
  {
    phase: 4,
    warmupIds: [
      'warmup-1', 'warmup-5', 'warmup-7',
      'warmup-9', 'warmup-11',
      'warmup-18', 'warmup-20',
    ],
    exercises: [
      { name: 'Barbell Bench Press', sets: 5, reps: 4, tempo: 'X/0/X', restSeconds: 240 },
      { name: 'Barbell Back Squat', sets: 5, reps: 4, tempo: 'X/0/X', restSeconds: 240 },
      { name: 'Barbell Deadlift', sets: 4, reps: 3, tempo: 'X/0/X', restSeconds: 300 },
      { name: 'Weighted Pull-ups', sets: 4, reps: 5, tempo: 'X/0/X', restSeconds: 240 },
      { name: 'Barbell Overhead Press', sets: 4, reps: 5, tempo: 'X/0/X', restSeconds: 240 },
    ],
    balanceCoreIds: [
      'balance-6', 'balance-7', 'balance-10',
    ],
    cooldownIds: [
      'cooldown-1', 'cooldown-2', 'cooldown-3', 'cooldown-4', 'cooldown-5',
      'cooldown-8', 'cooldown-11', 'cooldown-12', 'cooldown-13',
    ],
  },
  {
    phase: 5,
    warmupIds: [
      'warmup-1', 'warmup-5', 'warmup-7',
      'warmup-18', 'warmup-20', 'warmup-22', 'warmup-23',
    ],
    exercises: [
      { name: 'Barbell Bench Press (85% 1RM)', sets: 4, reps: 4, tempo: 'X/0/X', restSeconds: 60, notes: 'Superset with Med Ball Chest Pass' },
      { name: 'Medicine Ball Chest Pass (30%)', sets: 4, reps: 8, tempo: 'X/0/X', restSeconds: 240 },
      { name: 'Barbell Back Squat (85% 1RM)', sets: 4, reps: 4, tempo: 'X/0/X', restSeconds: 60, notes: 'Superset with Jump Squat' },
      { name: 'Jump Squat (30% BW)', sets: 4, reps: 8, tempo: 'X/0/X', restSeconds: 240 },
      { name: 'Barbell Clean', sets: 3, reps: 5, tempo: 'X/0/X', restSeconds: 60, notes: 'Superset with Box Jump' },
      { name: 'Box Jump', sets: 3, reps: 8, tempo: 'X/0/X', restSeconds: 240 },
    ],
    balanceCoreIds: [
      'balance-1', 'balance-4', 'balance-6',
    ],
    cooldownIds: [
      'cooldown-1', 'cooldown-2', 'cooldown-3', 'cooldown-4', 'cooldown-5',
      'cooldown-6', 'cooldown-11', 'cooldown-12', 'cooldown-13', 'cooldown-15',
    ],
  },
];

// ─── Helper: Get protocol for a phase ────────────────────────────────

export const getPhaseProtocol = (phase: number): PhaseProtocol =>
  PHASE_PROTOCOLS[phase - 1] || PHASE_PROTOCOLS[0];

export const getPhaseTemplate = (phase: number): PhaseTemplate =>
  PHASE_TEMPLATES[phase - 1] || PHASE_TEMPLATES[0];
