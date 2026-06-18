import type { BootcampExercise } from '../../hooks/useBootcampAPI';

type NullableText = string | null;
type CatalogVideoSample = {
  videoUrl?: string | null;
  thumbnailUrl?: string | null;
} | null;

export interface RolodexLikeExercise {
  id?: string | number;
  name: string;
  exerciseType?: string;
  difficulty?: number;
  primaryMuscles?: string[];
  equipment?: string[] | string | null;
  equipmentNeeded?: string[] | string | null;
  bodyPartCategory?: string;
  description?: string | null;
  instructions?: string | null;
  videoUrl?: string | null;
  previewVideoUrl?: string | null;
  imageUrl?: string | null;
  thumbnailUrl?: string | null;
  catalogVideoSample?: CatalogVideoSample;
  easyVariation?: string | null;
  mediumVariation?: string | null;
  hardVariation?: string | null;
  kneeMod?: string | null;
  shoulderMod?: string | null;
  ankleMod?: string | null;
  wristMod?: string | null;
  backMod?: string | null;
  elbowMod?: string | null;
  footMod?: string | null;
  hipMod?: string | null;
}

interface BuildOptions {
  durationSec: number;
  restSec: number;
  sortOrder: number;
  stationIndex: number;
  setupTimeSec?: number;
}

interface AlternativeSet {
  easyVariation: string;
  mediumVariation: string;
  hardVariation: string;
  kneeMod: string;
  shoulderMod: string;
  ankleMod: string;
  wristMod: string;
  backMod: string;
  elbowMod: string;
  footMod: string;
  hipMod: string;
}

function text(value: unknown): NullableText {
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : null;
}

function arrayText(value: unknown): string[] {
  if (!value) return [];
  if (Array.isArray(value)) return value.filter((item): item is string => typeof item === 'string' && item.trim().length > 0);
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed)) return parsed.filter((item): item is string => typeof item === 'string' && item.trim().length > 0);
    } catch {
      return value.trim() ? [value.trim()] : [];
    }
  }
  return [];
}

function normalizeExerciseLibraryId(value: unknown): string | number | undefined {
  if (typeof value === 'number' && Number.isInteger(value)) return value;
  if (typeof value === 'string' && /^\d+$/.test(value)) return Number(value);
  if (
    typeof value === 'string'
    && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value.trim())
  ) {
    return value.trim();
  }
  return undefined;
}

function includesAny(source: string, terms: string[]) {
  return terms.some((term) => source.includes(term));
}

function defaultAlternatives(exercise: RolodexLikeExercise): AlternativeSet {
  const name = exercise.name.toLowerCase();
  const type = (exercise.exerciseType || '').toLowerCase();
  const muscles = (exercise.primaryMuscles || []).join(' ').toLowerCase();
  const equipment = arrayText(exercise.equipmentNeeded || exercise.equipment).join(', ') || 'bodyweight';

  if (includesAny(name, ['jump', 'hop', 'bound', 'burpee', 'sprint']) || includesAny(type, ['plyo', 'cardio'])) {
    return {
      easyVariation: 'Step-through tempo version',
      mediumVariation: 'Controlled step-out tempo version',
      hardVariation: `${exercise.name} with timed intervals`,
      kneeMod: 'Step-out version with soft knees and no rebound',
      shoulderMod: 'Keep arms below shoulder height during the low-impact pattern',
      ankleMod: 'No-jump marching version with heel-toe control',
      wristMod: 'Hands-free version when the movement normally uses floor contact',
      backMod: 'Upright torso version with shorter range',
      elbowMod: 'Relaxed-arm version without explosive arm swing',
      footMod: 'Marching version with full-foot contact',
      hipMod: 'Smaller step radius with controlled hip rotation',
    };
  }

  if (includesAny(name, ['squat', 'lunge', 'step up', 'step-up']) || includesAny(muscles, ['quad', 'glute', 'leg'])) {
    return {
      easyVariation: `${exercise.name} with bodyweight or support`,
      mediumVariation: `${exercise.name} with controlled tempo`,
      hardVariation: `${exercise.name} with added load`,
      kneeMod: 'Box-supported range or reverse step-back pattern',
      shoulderMod: 'Hold load low at the sides instead of front rack or overhead',
      ankleMod: 'Shorter stance with flat-foot pressure',
      wristMod: 'Hands-free or straps-free version',
      backMod: 'Goblet or bodyweight version with neutral spine',
      elbowMod: 'Arms relaxed or load held close to torso',
      footMod: 'Stable stance with reduced depth',
      hipMod: 'Shorter range split stance with support',
    };
  }

  if (includesAny(name, ['push up', 'push-up', 'plank', 'mountain climber'])) {
    return {
      easyVariation: `Incline ${exercise.name}`,
      mediumVariation: `${exercise.name} with slower tempo`,
      hardVariation: `${exercise.name} with longer work interval`,
      kneeMod: 'Elevated hands version to reduce lower-body load',
      shoulderMod: 'Incline version with reduced range',
      ankleMod: 'Feet grounded, no hop or drive-through',
      wristMod: 'Use handles, fists, or forearms for neutral wrist position',
      backMod: 'Elevated version with braced ribs and neutral spine',
      elbowMod: 'Narrower range with elbows at a comfortable angle',
      footMod: 'Wide stable stance with no bouncing',
      hipMod: 'Reduce hip flexion speed and keep pelvis level',
    };
  }

  if (includesAny(name, ['press', 'raise', 'fly', 'row', 'curl', 'extension'])) {
    return {
      easyVariation: `${exercise.name} with lighter ${equipment}`,
      mediumVariation: `${exercise.name} with strict tempo`,
      hardVariation: `${exercise.name} with pause reps`,
      kneeMod: 'Seated or split-stance version to remove lower-body drive',
      shoulderMod: 'Neutral-grip version with pain-free range',
      ankleMod: 'Seated or supported stance version',
      wristMod: 'Neutral wrist grip or cable handle option',
      backMod: 'Chest-supported or seated version',
      elbowMod: 'Shorter range with controlled lockout',
      footMod: 'Seated setup to remove foot loading',
      hipMod: 'Supported stance with hips square',
    };
  }

  return {
    easyVariation: `${exercise.name} with reduced range`,
    mediumVariation: `${exercise.name} with controlled tempo`,
    hardVariation: `${exercise.name} with extra round`,
    kneeMod: 'Low-impact version with smaller range and no jumping',
    shoulderMod: 'Pain-free range with neutral grip or lowered arms',
    ankleMod: 'Stable no-jump stance',
    wristMod: 'Neutral wrist setup or hands-free alternative',
    backMod: 'Supported version with neutral spine',
    elbowMod: 'Controlled range without locking hard at end range',
    footMod: 'Stable full-foot contact version',
    hipMod: 'Shorter range with controlled rotation',
  };
}

export function buildBootcampExerciseFromRolodex(
  exercise: RolodexLikeExercise,
  options: BuildOptions,
): BootcampExercise {
  const fallback = defaultAlternatives(exercise);
  const equipment = arrayText(exercise.equipmentNeeded || exercise.equipment);
  const catalogVideoUrl = text(exercise.catalogVideoSample?.videoUrl);
  const catalogThumbnailUrl = text(exercise.catalogVideoSample?.thumbnailUrl);

  return {
    exerciseName: exercise.name,
    durationSec: options.durationSec,
    restSec: options.restSec,
    sortOrder: options.sortOrder,
    muscleTargets: (exercise.primaryMuscles || []).join(','),
    easyVariation: text(exercise.easyVariation) || fallback.easyVariation,
    mediumVariation: text(exercise.mediumVariation) || fallback.mediumVariation,
    hardVariation: text(exercise.hardVariation) || fallback.hardVariation,
    kneeMod: text(exercise.kneeMod) || fallback.kneeMod,
    shoulderMod: text(exercise.shoulderMod) || fallback.shoulderMod,
    ankleMod: text(exercise.ankleMod) || fallback.ankleMod,
    wristMod: text(exercise.wristMod) || fallback.wristMod,
    backMod: text(exercise.backMod) || fallback.backMod,
    elbowMod: text(exercise.elbowMod) || fallback.elbowMod,
    footMod: text(exercise.footMod) || fallback.footMod,
    hipMod: text(exercise.hipMod) || fallback.hipMod,
    board: 'main',
    stationIndex: options.stationIndex,
    isCardioFinisher: includesAny((exercise.exerciseType || '').toLowerCase(), ['cardio', 'conditioning']),
    equipmentRequired: equipment.length > 0 ? equipment.join(', ') : null,
    videoUrl: text(exercise.videoUrl) || catalogVideoUrl,
    previewVideoUrl: text(exercise.previewVideoUrl),
    imageUrl: text(exercise.imageUrl),
    thumbnailUrl: text(exercise.thumbnailUrl) || catalogThumbnailUrl,
    setupTimeSec: options.setupTimeSec ?? 5,
    description: text(exercise.description),
    instructions: text(exercise.instructions),
    exerciseLibraryId: normalizeExerciseLibraryId(exercise.id),
  };
}

export function getLowImpactSwap(exercise: Pick<BootcampExercise, 'easyVariation' | 'kneeMod' | 'ankleMod' | 'backMod' | 'shoulderMod'>): string {
  return (
    text(exercise.kneeMod) ||
    text(exercise.ankleMod) ||
    text(exercise.backMod) ||
    text(exercise.easyVariation) ||
    text(exercise.shoulderMod) ||
    'Low-impact version with smaller range, slower tempo, and no jumping'
  );
}
