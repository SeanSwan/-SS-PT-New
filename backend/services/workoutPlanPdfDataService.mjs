const toRecord = (value) => (
  value && typeof value === 'object' && !Array.isArray(value) ? value : {}
);

const toArray = (value) => (Array.isArray(value) ? value : []);

const firstPresent = (...values) => (
  values.find((value) => value !== undefined && value !== null && value !== '')
);

const toPositiveInteger = (value, fallback = null) => {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

const PRIVATE_HISTORY_PATTERN = /\b(surgery|diagnosis|diagnosed|arthritis|replacement|medical history|injury history|procedure|medication|doctor|physician|injury|injured|tendonitis|sprain|strain|fracture|tear|torn|rehab|post-op|operation|medical clearance)\b/i;

export const cleanPdfText = (value, fallback = '', maxLength = 240) => {
  const cleaned = String(value ?? '')
    .replace(/[\r\n\t]+/g, ' ')
    .replace(/[^\x20-\x7E]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, maxLength);
  return cleaned || fallback;
};

export const safeWorkoutPlanPdfFilenamePart = (value) => (
  cleanPdfText(value, 'Training Plan', 96)
    .replace(/[^A-Za-z0-9]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    || 'Training-Plan'
);

const clientSafeText = (value, fallback, maxLength = 260) => {
  const cleaned = cleanPdfText(value, '', maxLength);
  if (!cleaned) return null;
  if (PRIVATE_HISTORY_PATTERN.test(cleaned)) return fallback;
  return cleaned;
};

const clientSafeRecommendation = (value) => clientSafeText(
  value,
  'Based on your readiness profile, follow the listed modifications, keep tempo controlled, and ask your trainer before increasing load.',
);

const clientSafeExerciseNote = (value) => clientSafeText(
  value,
  'Trainer modification noted.',
);

const weekTrainingDays = (week) => {
  const raw = toRecord(week);
  return [raw.days, raw.sessions].find(Array.isArray) || [];
};

const countSessions = (weeks) => (
  weeks.reduce((total, week) => total + weekTrainingDays(week).length, 0)
);

const inferSessionsPerWeek = (weeks) => (
  Math.max(1, ...weeks.map((week) => weekTrainingDays(week).length))
);

const exerciseName = (exercise, index) => (
  clientSafeText(exercise.exerciseName || exercise.name, `Exercise ${index + 1}`, 160) || `Exercise ${index + 1}`
);

const exerciseSetCount = (sets) => (
  Array.isArray(sets) ? sets.length : toPositiveInteger(sets, 3)
);

const exerciseReps = (exercise) => (
  cleanPdfText(firstPresent(exercise.targetReps, exercise.reps), '8-12', 40)
);

const exerciseRest = (exercise) => {
  const rest = toPositiveInteger(
    firstPresent(exercise.restSeconds, exercise.restTime, exercise.restPeriod, exercise.rest),
    null,
  );
  return rest ? `${rest}s` : '-';
};

const exerciseTempo = (exercise) => (
  cleanPdfText(exercise.tempo, '-', 32)
);

const exerciseNote = (exercise) => (
  clientSafeExerciseNote(firstPresent(exercise.readinessNote, exercise.notes, exercise.performanceNotes)) || '-'
);

const exerciseRowText = (exercise, index) => {
  const raw = toRecord(exercise);
  return [
    exerciseName(raw, index),
    `Sets: ${exerciseSetCount(raw.sets)}`,
    `Reps: ${exerciseReps(raw)}`,
    `Tempo: ${exerciseTempo(raw)}`,
    `Rest: ${exerciseRest(raw)}`,
    `Notes: ${exerciseNote(raw)}`,
  ].join(' | ');
};

const planSummary = ({ planData, durationWeeks, nasmPhase }) => {
  const raw = toRecord(planData);
  const weeks = toArray(raw.weeks);
  const summary = toRecord(raw.planSummary);
  return {
    weeks,
    durationWeeks: toPositiveInteger(firstPresent(summary.durationWeeks, durationWeeks, weeks.length), 4),
    sessionsPerWeek: toPositiveInteger(firstPresent(summary.sessionsPerWeek, inferSessionsPerWeek(weeks)), 1),
    totalSessions: toPositiveInteger(firstPresent(summary.totalSessions, countSessions(weeks)), countSessions(weeks)),
    primaryGoal: clientSafeText(firstPresent(summary.primaryGoal, raw.goal), 'General Fitness', 120) || 'General Fitness',
    startingPhase: toPositiveInteger(firstPresent(summary.startingPhase, nasmPhase), 1),
    recommendations: toArray(raw.recommendations).map(clientSafeRecommendation).filter(Boolean),
  };
};

const addSummaryLines = (lines, { title, description, summary, brandWordmark }) => {
  lines.push({ text: `${brandWordmark || 'SwanStudios'} Workout Plan`, kind: 'title' });
  lines.push({ text: clientSafeText(title, 'Training Plan', 255) || 'Training Plan', kind: 'subtitle' });
  lines.push({ text: 'Generated from the saved coach workout-plan payload.', kind: 'meta' });
  lines.push({ text: 'Plan Summary', kind: 'section' });
  lines.push({ text: `Duration: ${summary.durationWeeks} weeks`, kind: 'metric' });
  lines.push({ text: `Sessions per week: ${summary.sessionsPerWeek}`, kind: 'metric' });
  lines.push({ text: `Total sessions: ${summary.totalSessions}`, kind: 'metric' });
  lines.push({ text: `Primary goal: ${summary.primaryGoal}`, kind: 'metric' });
  lines.push({ text: `Starting NASM phase: Phase ${summary.startingPhase}`, kind: 'metric' });
  const overview = clientSafeText(description, 'Based on your readiness profile, follow the plan exactly as assigned.');
  if (overview) lines.push({ text: `Overview: ${overview}`, kind: 'body' });
};

const addRecommendations = (lines, recommendations) => {
  if (!recommendations.length) return;
  lines.push({ text: 'Coach Recommendations', kind: 'section' });
  recommendations.forEach((recommendation) => {
    lines.push({ text: `- ${recommendation}`, kind: 'body' });
  });
};

const addDay = (lines, day, dayIndex) => {
  const rawDay = toRecord(day);
  const dayNumber = toPositiveInteger(rawDay.dayNumber, dayIndex + 1);
  const dayName = clientSafeText(rawDay.name || rawDay.dayName || rawDay.title, `Day ${dayNumber}`, 140) || `Day ${dayNumber}`;
  const focus = clientSafeText(rawDay.focus || rawDay.category, '', 100) || '';
  const exercises = toArray(rawDay.exercises);
  lines.push({ text: `${dayName}${focus ? ` - ${focus}` : ''}`, kind: 'day' });
  lines.push({ text: 'Exercise | Sets | Reps | Tempo | Rest | Notes', kind: 'tableHeader' });
  exercises.forEach((exercise, exerciseIndex) => {
    lines.push({ text: exerciseRowText(exercise, exerciseIndex), kind: 'exercise' });
  });
  if (!exercises.length) lines.push({ text: 'No exercises populated for this session.', kind: 'meta' });
};

const addWeek = (lines, week, weekIndex) => {
  const rawWeek = toRecord(week);
  const weekNumber = toPositiveInteger(rawWeek.weekNumber, weekIndex + 1);
  const focus = clientSafeText(rawWeek.focus, '', 120) || '';
  lines.push({ text: `Week ${weekNumber}${focus ? ` - ${focus}` : ''}`, kind: 'week' });
  weekTrainingDays(rawWeek).forEach((day, dayIndex) => addDay(lines, day, dayIndex));
};

export const buildWorkoutPlanPdfLines = ({ title, description, durationWeeks, nasmPhase, planData, brandWordmark, appendixLines }) => {
  const summary = planSummary({ planData, durationWeeks, nasmPhase });
  if (summary.weeks.length === 0) return null;

  const lines = [];
  addSummaryLines(lines, { title, description, summary, brandWordmark });
  addRecommendations(lines, summary.recommendations);
  lines.push({ text: 'Weekly Plan', kind: 'section' });
  summary.weeks.forEach((week, weekIndex) => addWeek(lines, week, weekIndex));
  if (Array.isArray(appendixLines) && appendixLines.length) lines.push(...appendixLines);
  return lines;
};
