/**
 * Swan Coach training-style policy for workout-builder generation.
 * Base mode preserves NASM OPT guidance. Hardcore mode adds Sean-style
 * intensity cues only where movement selection and safety signals allow it.
 */

export const TRAINING_INTENSITY_MODES = ['base', 'hardcore'];
export const HARDCORE_METHODS = [
  'standard',
  'pyramid',
  'superset',
  'mixed',
  'ladder',
  'descending',
  'contrast',
  'density',
];

const VULNERABLE_MUSCLES = new Set([
  'biceps',
  'calves',
  'shoulders',
  'deltoids',
  'rotator_cuff',
  'rotator cuff',
]);

const METHOD_COPY = {
  standard: 'Hardcore standard: strict tempo, clean overload, and no forced reps once form slips.',
  pyramid: 'Pyramid: ramp to a clean top set, then reduce load for controlled back-off work.',
  superset: 'Superset: pair with the next non-conflicting movement and keep transitions tight.',
  mixed: 'Mixed: rotate the intensity focus across strength, control, and conditioning blocks.',
  ladder: 'Ladder: build reps across sets while stopping before movement quality drops.',
  descending: 'Descending: open with the highest-quality volume, then reduce reps as fatigue rises.',
  contrast: 'Contrast: pair controlled strength intent with a faster athletic pattern.',
  density: 'Density: accumulate clean work inside a fixed block and track total rounds.',
};

export function normalizeTrainingStyle({
  trainingIntensityMode,
  hardcoreMethod,
} = {}) {
  const mode = trainingIntensityMode === 'hardcore' ? 'hardcore' : 'base';
  const method = mode === 'hardcore' && HARDCORE_METHODS.includes(hardcoreMethod)
    ? hardcoreMethod
    : 'standard';

  return {
    mode,
    method,
    label: mode === 'hardcore' ? 'Hardcore Sean Style' : 'Base NASM',
    cue: mode === 'hardcore' ? METHOD_COPY[method] : 'Base NASM: follow OPT phase, goal bias, and client safety signals.',
    safeguards: [
      'No forced intensity on pain-warning areas.',
      'No forced intensity on calves, biceps, shoulders, or rotator cuff work.',
      'Stop intensity work when form quality drops.',
    ],
  };
}

export function trainingStyleExplanation(style) {
  return {
    type: 'training_style',
    message: `${style.label}: ${style.cue}`,
    details: style.safeguards,
  };
}

export function trainingStyleRecommendationDetail(style) {
  return {
    type: 'training_style',
    text: `${style.label}: ${style.cue} Safeguards: ${style.safeguards.join(' ')}`,
    sourceCitation: 'options.trainingIntensityMode',
  };
}

const lowerValues = (values = []) => values
  .filter(Boolean)
  .map((value) => String(value).toLowerCase());

const painWarningRegions = (painWarnings = []) => new Set(
  painWarnings.map((entry) => String(entry?.bodyRegion || '').toLowerCase()).filter(Boolean),
);

function isVulnerableExercise(exercise, painWarnings = []) {
  const muscles = lowerValues(exercise.muscles);
  if (muscles.some((muscle) => VULNERABLE_MUSCLES.has(muscle))) return true;

  const warningRegions = painWarningRegions(painWarnings);
  return muscles.some((muscle) => warningRegions.has(muscle))
    || warningRegions.has(String(exercise.category || '').toLowerCase());
}

const appendNote = (note, addition) => {
  const existing = String(note || '').trim();
  return existing ? `${existing} ${addition}` : addition;
};

function applyHardcoreCue(exercise, style, painWarnings) {
  if (isVulnerableExercise(exercise, painWarnings)) {
    return {
      ...exercise,
      trainingStyleGuardrail: 'Hardcore method skipped for vulnerable or pain-warning area.',
    };
  }

  return {
    ...exercise,
    intensityMethod: style.method,
    coachingCue: style.cue,
    notes: appendNote(exercise.notes, style.cue),
  };
}

export function applyTrainingStyleToExercises(exercises, style, painWarnings = []) {
  if (style.mode !== 'hardcore') return exercises;
  return exercises.map((exercise) => applyHardcoreCue(exercise, style, painWarnings));
}
