export type ClassFormat = string;
export type DayType = 'lower_body' | 'upper_body' | 'cardio' | 'full_body' | 'custom';

export interface BootcampExercise {
  exerciseName: string;
  durationSec: number;
  restSec: number;
  sortOrder: number;
  isCardioFinisher: boolean;
  muscleTargets: string;
  easyVariation: string | null;
  mediumVariation: string | null;
  hardVariation: string | null;
  kneeMod: string | null;
  shoulderMod: string | null;
  ankleMod: string | null;
  wristMod: string | null;
  backMod: string | null;
  elbowMod: string | null;
  footMod: string | null;
  hipMod: string | null;
  description: string | null;
  instructions?: string | null;
  equipmentRequired: string | null;
  videoUrl?: string | null;
  /** Short muted R2 loop used as the GIF-style demo preview (separate from the
   *  full-length videoUrl). The column exists and the generator emits it; the demo board still
   *  falls back to looping `videoUrl` for rows that carry none (hand-authored or legacy ones).
   *  Comment corrected in round 114 (review F9) — it had said "until it lands", which stopped
   *  being true once the column shipped. */
  previewVideoUrl?: string | null;
  imageUrl?: string | null;
  thumbnailUrl?: string | null;
  catalogVideoSample?: {
    title?: string | null;
    source?: string | null;
    videoUrl?: string | null;
    thumbnailUrl?: string | null;
    durationSeconds?: number | null;
  } | null;
  stationIndex?: number;
  board?: 'main' | 'alternative' | 'lowImpact';
  boardNumber?: number;
  boardLabel?: string;
  sourceExerciseName?: string;
  setupTimeSec?: number;
  pyramidStartWeight?: string | null;
  pyramidDrops?: number | null;
  supersetOrder?: number | null;
  supersetGroupId?: number | null;
  exerciseLibraryId?: string | number | null;
}

export interface BootcampStation {
  stationNumber: number;
  stationName: string;
  equipmentNeeded: string | null;
  sortOrder: number;
  setupTimeSec?: number;
  flowScore?: number;
  bottleneck?: boolean;
}

export interface StationFlowData {
  station: number;
  name: string;
  maxSetupSec: number;
  avgSetupSec: number;
  flowScore: number;
  bottleneck: boolean;
}

export interface OverflowPlan {
  triggerCount: number;
  strategy: string;
  lapExercises: Array<{ name: string; durationMin: number }>;
  lapDurationMin: number;
}

export interface BootcampExplanation {
  type: string;
  message: string;
}

export type ClassStyle =
  | 'standard'
  | 'pyramid'
  | 'superset'
  | 'mixed'
  | 'ladder'
  | 'descending'
  | 'chipper'
  | 'countdown'
  | 'death_by'
  | 'ygig'
  | 'contrast'
  | 'density';

export type IntensityCategory =
  | 'high_impact'
  | 'medium_impact'
  | 'calisthenics'
  | 'stability'
  | 'flexibility'
  | 'cardio';

export interface BootcampStretch {
  exerciseName: string;
  targetMuscles: string;
  durationSec: number;
  sortOrder: number;
}

/**
 * R-H20 (contract §6 lines 260-266) — the work-interval provenance the server attaches to a
 * generated class. `certifiable: false` is the ONE value Preflight may block on: the requested
 * time budget cannot fit even the baseline interval. `budgetStatus: 'not_checked'` is the
 * honest "the work block was never compared" (paced protocol, no interval change, or a format
 * with an unknown work-slot count) and is surfaced as a warning, never as a silent pass.
 */
export type BudgetStatus = 'within_budget' | 'budget_hold' | 'budget_failure' | 'not_checked';

export interface WorkIntervalProgression {
  policyVersion?: string;
  mode?: 'scheduled_work_duration' | 'manual_protocol';
  source?: string;
  requestedModifier?: number;
  baseWorkSec?: number;
  appliedWorkSec?: number;
  proposedWorkSec?: number;
  baseWorkTotalSec?: number | null;
  appliedWorkTotalSec?: number | null;
  budgetSec?: number;
  otherBlockSec?: number;
  applied?: boolean;
  reason?: string;
  budgetStatus?: BudgetStatus;
  budgetNotCheckedReason?: string | null;
  certifiable?: boolean;
}

export interface GeneratedBootcamp {
  name: string;
  classFormat: ClassFormat;
  classStyle?: ClassStyle;
  dayType: DayType;
  intensityCategory?: IntensityCategory;
  stationCount: number;
  exercisesPerStation?: number;
  rounds?: number;
  exerciseDurationSec?: number;
  targetDuration: number;
  totalWorkoutMin: number;
  demoDuration: number;
  clearDuration: number;
  stretchDurationMin?: number;
  totalClassMin: number;
  expectedParticipants: number;
  includeStretch?: boolean;
  stations: BootcampStation[];
  exercises: BootcampExercise[];
  stretches?: BootcampStretch[];
  overflowPlan: OverflowPlan | null;
  flowData?: StationFlowData[];
  explanations: BootcampExplanation[];
  aiGenerated: boolean;
  progression?: WorkIntervalProgression;
}

export interface SpaceProfile {
  id: number;
  name: string;
  locationName: string | null;
  totalAreaSqft: number | null;
  maxStations: number | null;
  maxPerStation: number;
  hasOutdoorAccess: boolean;
  outdoorDescription: string | null;
}

export interface ClassLogEntry {
  id: number;
  classDate: string;
  dayType: string | null;
  actualParticipants: number | null;
  overflowActivated: boolean;
  exercisesUsed: unknown;
  trainerNotes: string | null;
  classRating: number | null;
  energyLevel: string | null;
}

export interface ExerciseTrend {
  id: number;
  exerciseName: string;
  source: string;
  trendScore: number | null;
  nasmRating: string | null;
  impactLevel: string | null;
  muscleTargets: string | null;
  difficulty: string | null;
  description: string | null;
  isApproved: boolean;
}

/**
 * §5 line 222 — WHICH KIND of record a taught log is.
 *
 * The field exists so a reader can tell a trainer-attested PRESCRIPTION ("this is what the
 * class was supposed to be") from a runner-MEASURED record ("this is what was observed").
 * `expectedParticipants` rides here rather than in `actualParticipants`, because prescribed
 * intent is not observed attendance. Shared by the request type and the payload builder so
 * the two cannot drift.
 */
export interface TaughtLogExecutionSummary {
  kind: 'trainer_attested_prescription' | 'runner_measured';
  prescribed?: {
    workSec: number | null;
    rounds: number | null;
    // Written by the server for every summary it builds (`sprintSlotTaughtLog.mjs:85-91`) but
    // missing from this type until round 114 (review F5), which made a reader believe the
    // structure was not carried at all.
    stationCount?: number | null;
    exercisesPerStation?: number | null;
    targetDurationMin: number | null;
  };
  expectedParticipants?: number | null;
  performedCount?: number;
  /** The server's own disclaimer — "prescribed values, not measured elapsed time or observed
   *  attendance" (`sprintSlotTaughtLog.mjs:94`). Present on every server-built summary. */
  notes?: string;
}
