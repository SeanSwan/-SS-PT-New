export type ClassFormat = string;
export type DayType = 'lower_body' | 'upper_body' | 'cardio' | 'full_body' | 'custom';

export interface BootcampProgrammingIntent {
  type?: 'functional_circuit' | string;
  classStyle?: string;
  label?: string;
  scheme?: string;
  prescriptionLabel?: string;
  workMode?: string;
  repTargets?: number[];
  timeTargetsSec?: number[];
  groupFocus?: string;
  coachCue?: string;
  safetyCue?: string;
}
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
   *  full-length videoUrl). Populated by Codex's backend column of the same name;
   *  the demo board falls back to looping videoUrl until it lands. */
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
  notes?: string | null;
  programmingIntent?: BootcampProgrammingIntent | null;
  selectionReason?: string | null;
  equipmentEvidence?: string[];
  missingEquipment?: string[];
  mediaStatus?: 'preview_video' | 'video' | 'poster' | 'none' | string | null;
  scoreBreakdown?: {
    equipment?: number;
    media?: number;
    total?: number;
  } | null;
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

export interface BootcampEquipmentReadiness {
  type: 'equipment' | 'insufficient_equipment' | string;
  code?: 'equipment_profile_applied' | 'insufficient_equipment' | string;
  severity?: 'info' | 'warning' | 'error' | string;
  allowedCount?: number;
  rejectedCount?: number;
  requiredSlots?: number;
  missingEquipmentCounts?: Record<string, number>;
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
  equipmentReadiness?: BootcampEquipmentReadiness | null;
  explanations: BootcampExplanation[];
  aiGenerated: boolean;
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
