/**
 * FILE: bootcampFunctionalRepSchemes.mjs
 * PURPOSE: Structured functional-circuit rep schemes for Bootcamp Builder.
 * PARENTS: classStyleModifiers.mjs applies these intents to generated exercises.
 * CONTRACT: Keep rep targets machine-readable so demo mode, detail panels, PDFs,
 * and future editors do not have to scrape coach copy from descriptions.
 */

const SAFETY_CUE = 'Run the target muscles down safely without letting form collapse.';

const FUNCTIONAL_STYLE_CONFIG = {
  mixed: {
    title: 'Mixed',
    repScheme: 'strength + conditioning + control',
    prescriptionLabel: 'Rotating strength, conditioning, and control',
    workMode: 'mixed',
    repTargets: [],
    cue: 'Mixed style: rotate the coaching focus each station so strength, conditioning, and control all show up in one class.',
    summary: 'strength, conditioning, and control rotate by station instead of repeating one training feel.',
  },
  ladder: {
    title: 'Metcon Ladder',
    repScheme: '9-15-20-25',
    prescriptionLabel: '9-15-20-25 reps',
    workMode: 'reps',
    repTargets: [9, 15, 20, 25],
    cue: 'Metcon ladder: pair two body groups, build reps each round, and cap speed when form starts to drift.',
    summary: 'two body groups build through 9-15-20-25 reps while form quality stays ahead of speed.',
  },
  descending: {
    title: 'Rep Breakdown',
    repScheme: '25-20-15-9',
    prescriptionLabel: '25-20-15-9 reps',
    workMode: 'reps',
    repTargets: [25, 20, 15, 9],
    cue: 'Rep breakdown: start with high-quality volume, then reduce reps as intensity and fatigue climb.',
    summary: 'two body groups or body parts move through 25-20-15-9 reps so the target muscles run down without form collapse.',
  },
  chipper: {
    title: 'Chipper',
    repScheme: '50-40-30-20-10',
    prescriptionLabel: '50-40-30-20-10 reps',
    workMode: 'reps',
    repTargets: [50, 40, 30, 20, 10],
    cue: 'Chipper style: complete one focused block before moving on, using smooth pacing instead of rushing early reps.',
    summary: 'one high-rep block gets chipped away at a time with clean pacing and no rushed early reps.',
  },
  countdown: {
    title: 'Countdown',
    repScheme: '60s-45s-30s-15s',
    prescriptionLabel: '60s-45s-30s-15s intervals',
    workMode: 'timed_intervals',
    repTargets: [],
    timeTargetsSec: [60, 45, 30, 15],
    cue: 'Countdown style: shorten each work block from longer control sets into brief finishers with sharper intent.',
    summary: 'timed blocks shorten as fatigue rises, turning control work into a sharper finisher.',
  },
  death_by: {
    title: 'Death By',
    repScheme: '+1 rep EMOM',
    prescriptionLabel: '+1 rep each minute',
    workMode: 'emom_reps',
    repTargets: [],
    cue: 'Death by style: add one rep each minute until the athlete can no longer finish the target inside the minute.',
    summary: 'athletes add one rep each minute until the minute cap catches them.',
  },
  ygig: {
    title: 'You Go I Go',
    repScheme: '1:1 partner turns',
    prescriptionLabel: '1:1 partner turns',
    workMode: 'partner_turns',
    repTargets: [],
    cue: 'You go I go style: pair athletes so one works while one rests, then switch cleanly on the coach signal.',
    summary: 'partners trade work and rest at a clean 1:1 rhythm.',
  },
  contrast: {
    title: 'Two-Group Contrast',
    repScheme: '20 strength reps + 9 explosive reps',
    prescriptionLabel: '20 strength reps + 9 explosive reps',
    workMode: 'contrast_reps',
    repTargets: [20, 9],
    cue: 'Two-group contrast: pair controlled strength with an explosive or faster bodyweight pattern for the same station focus.',
    summary: 'controlled strength and faster output alternate across two body groups.',
  },
  density: {
    title: 'Density Block',
    repScheme: '5-minute max clean rounds',
    prescriptionLabel: '5-minute max clean rounds',
    workMode: 'density_rounds',
    repTargets: [],
    cue: 'Density block: maximize clean work inside a fixed block, tracking total rounds without letting movement quality drop.',
    summary: 'athletes chase clean rounds inside fixed 5-minute windows.',
  },
};

export function getFunctionalStyleConfig(classStyle) {
  return FUNCTIONAL_STYLE_CONFIG[classStyle] ?? null;
}

function getExerciseMusclePair(exercise) {
  const muscles = typeof exercise.muscleTargets === 'string'
    ? exercise.muscleTargets.split(',').map(value => value.trim().replace(/_/g, ' ')).filter(Boolean)
    : [];
  if (muscles.length >= 2) return `${muscles[0]} + ${muscles[1]}`;
  return muscles[0] || 'paired body groups';
}

export function buildFunctionalProgrammingIntent(classStyle, exercise) {
  const config = getFunctionalStyleConfig(classStyle);
  if (!config) return null;
  return {
    type: 'functional_circuit',
    classStyle,
    label: config.title,
    scheme: config.repScheme,
    prescriptionLabel: config.prescriptionLabel,
    workMode: config.workMode,
    repTargets: config.repTargets ?? [],
    timeTargetsSec: config.timeTargetsSec ?? [],
    groupFocus: getExerciseMusclePair(exercise),
    coachCue: config.cue,
    safetyCue: SAFETY_CUE,
  };
}

export function buildFunctionalStyleCue(classStyle, exercise) {
  const intent = buildFunctionalProgrammingIntent(classStyle, exercise);
  if (!intent) return null;
  return `${intent.coachCue} Rep target: ${intent.scheme}. Pair focus: ${intent.groupFocus}; run the target muscles down safely without letting form collapse.`;
}

export function buildFunctionalStyleSummary(classStyle) {
  const config = getFunctionalStyleConfig(classStyle);
  if (!config) return null;
  return `${config.title} (${classStyle}) style: ${config.summary}`;
}

export const __testing__ = {
  buildFunctionalProgrammingIntent,
  buildFunctionalStyleCue,
  getFunctionalStyleConfig,
};