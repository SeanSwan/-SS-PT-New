/**
 * Workout Plan Server PDF Service
 * ===============================
 *
 * Generates a compact, valid PDF buffer from the exact WorkoutPlan.planData
 * payload saved by Swan Coach. The file object matches multer's in-memory
 * shape so it can reuse the same private R2/local storage service as trainer
 * and admin uploads.
 */

const PDF_CONTENT_TYPE = 'application/pdf';
const PAGE_WIDTH = 612;
const PAGE_HEIGHT = 792;
const PAGE_MARGIN = 54;
const LINE_HEIGHT = 14;
const MAX_CHARS_PER_LINE = 88;
const MAX_RENDERED_LINES = 900;

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

const cleanText = (value, fallback = '', maxLength = 240) => {
  const cleaned = String(value ?? '')
    .replace(/[\r\n\t]+/g, ' ')
    .replace(/[^\x20-\x7E]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, maxLength);
  return cleaned || fallback;
};

const safeFilenamePart = (value) => (
  cleanText(value, 'Training Plan', 96)
    .replace(/[^A-Za-z0-9]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    || 'Training-Plan'
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
  cleanText(exercise.exerciseName || exercise.name, `Exercise ${index + 1}`, 160)
);

const exerciseSetCount = (sets) => (
  Array.isArray(sets) ? sets.length : toPositiveInteger(sets, 3)
);

const exerciseDose = (exercise) => {
  const reps = cleanText(firstPresent(exercise.targetReps, exercise.reps), '8-12', 40);
  const rest = toPositiveInteger(
    firstPresent(exercise.restSeconds, exercise.restTime, exercise.restPeriod, exercise.rest),
    null,
  );
  const tempo = cleanText(exercise.tempo, '', 32);
  const parts = [`${exerciseSetCount(exercise.sets)} sets x ${reps}`];
  if (rest) parts.push(`${rest}s rest`);
  if (tempo) parts.push(`tempo ${tempo}`);
  return parts.join(', ');
};

const planSummary = ({ planData, durationWeeks, nasmPhase }) => {
  const raw = toRecord(planData);
  const weeks = toArray(raw.weeks).slice(0, 52);
  const summary = toRecord(raw.planSummary);
  return {
    weeks,
    durationWeeks: toPositiveInteger(firstPresent(summary.durationWeeks, durationWeeks, weeks.length), 4),
    sessionsPerWeek: toPositiveInteger(firstPresent(summary.sessionsPerWeek, inferSessionsPerWeek(weeks)), 1),
    totalSessions: toPositiveInteger(firstPresent(summary.totalSessions, countSessions(weeks)), countSessions(weeks)),
    primaryGoal: cleanText(firstPresent(summary.primaryGoal, raw.goal), 'General Fitness', 120),
    startingPhase: toPositiveInteger(firstPresent(summary.startingPhase, nasmPhase), 1),
    recommendations: toArray(raw.recommendations).map((item) => cleanText(item, '', 220)).filter(Boolean),
  };
};

const appendWrapped = (lines, text = '') => {
  const raw = cleanText(text, '', 500);
  if (!raw) {
    lines.push('');
    return;
  }

  const words = raw.split(' ');
  let current = '';
  words.forEach((word) => {
    const next = current ? `${current} ${word}` : word;
    if (next.length <= MAX_CHARS_PER_LINE) {
      current = next;
      return;
    }
    if (current) lines.push(current);
    current = word;
  });
  if (current) lines.push(current);
};

const appendRecommendations = (lines, recommendations) => {
  if (recommendations.length === 0) return;
  appendWrapped(lines, '');
  appendWrapped(lines, 'Coach Recommendations');
  recommendations.slice(0, 12).forEach((recommendation) => {
    appendWrapped(lines, `- ${recommendation}`);
  });
};

const appendDayLines = (lines, day, dayIndex) => {
  const rawDay = toRecord(day);
  const dayNumber = toPositiveInteger(rawDay.dayNumber, dayIndex + 1);
  const dayName = cleanText(rawDay.name || rawDay.dayName || rawDay.title, `Day ${dayNumber}`, 140);
  const exercises = toArray(rawDay.exercises);
  appendWrapped(lines, `  ${dayName}`);
  exercises.slice(0, 14).forEach((exercise, exerciseIndex) => {
    const rawExercise = toRecord(exercise);
    appendWrapped(lines, `    - ${exerciseName(rawExercise, exerciseIndex)} - ${exerciseDose(rawExercise)}`);
  });
  if (exercises.length > 14) {
    appendWrapped(lines, `    - ${exercises.length - 14} additional exercises`);
  }
};

const appendWeekLines = (lines, week, weekIndex) => {
  const rawWeek = toRecord(week);
  const weekNumber = toPositiveInteger(rawWeek.weekNumber, weekIndex + 1);
  const focus = cleanText(rawWeek.focus, '', 120);
  appendWrapped(lines, `Week ${weekNumber}${focus ? ` - ${focus}` : ''}`);
  weekTrainingDays(rawWeek).forEach((day, dayIndex) => appendDayLines(lines, day, dayIndex));
};

const limitPlanLines = (lines) => (
  lines.length > MAX_RENDERED_LINES
    ? [
      ...lines.slice(0, MAX_RENDERED_LINES),
      'Plan truncated in PDF preview. Open the saved plan for the full week-by-week structure.',
    ]
    : lines
);

const buildPlanLines = ({ title, description, durationWeeks, nasmPhase, planData }) => {
  const summary = planSummary({ planData, durationWeeks, nasmPhase });
  if (summary.weeks.length === 0) return null;

  const lines = [];
  appendWrapped(lines, 'SwanStudios Workout Plan');
  appendWrapped(lines, `Title: ${cleanText(title, 'Training Plan', 255)}`);
  appendWrapped(lines, 'Generated by Swan Coach from the saved workout plan payload.');
  appendWrapped(lines, '');
  appendWrapped(lines, 'Plan Summary');
  appendWrapped(lines, `Duration: ${summary.durationWeeks} weeks`);
  appendWrapped(lines, `Sessions per week: ${summary.sessionsPerWeek}`);
  appendWrapped(lines, `Total sessions: ${summary.totalSessions}`);
  appendWrapped(lines, `Primary goal: ${summary.primaryGoal}`);
  appendWrapped(lines, `Starting NASM phase: Phase ${summary.startingPhase}`);
  if (cleanText(description, '', 500)) appendWrapped(lines, `Overview: ${description}`);
  appendRecommendations(lines, summary.recommendations);

  appendWrapped(lines, '');
  appendWrapped(lines, 'Weekly Plan');
  summary.weeks.forEach((week, weekIndex) => appendWeekLines(lines, week, weekIndex));
  return limitPlanLines(lines);
};

const escapePdfText = (value) => (
  String(value).replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)')
);

const pageChunks = (lines) => {
  const linesPerPage = Math.floor((PAGE_HEIGHT - (PAGE_MARGIN * 2)) / LINE_HEIGHT);
  const chunks = [];
  for (let index = 0; index < lines.length; index += linesPerPage) {
    chunks.push(lines.slice(index, index + linesPerPage));
  }
  return chunks.length ? chunks : [['SwanStudios Workout Plan']];
};

const pageLineStyle = (pageNumber, lineIndex) => {
  if (pageNumber === 1 && lineIndex === 0) {
    return { fontSize: 16, step: LINE_HEIGHT + 4 };
  }
  return { fontSize: 10, step: LINE_HEIGHT };
};

const appendTextCommand = (commands, { text, fontSize, y }) => {
  commands.push('BT');
  commands.push(`/F1 ${fontSize} Tf`);
  commands.push(`${PAGE_MARGIN} ${y} Td`);
  commands.push(`(${escapePdfText(firstPresent(text, ' '))}) Tj`);
  commands.push('ET');
};

const renderPageStream = (lines, pageNumber, totalPages) => {
  const commands = ['q', '0 0.13 0.38 rg'];
  let y = PAGE_HEIGHT - PAGE_MARGIN;
  for (let index = 0; index < lines.length; index += 1) {
    const style = pageLineStyle(pageNumber, index);
    appendTextCommand(commands, { text: lines[index], fontSize: style.fontSize, y });
    y -= style.step;
  }

  commands.push('0 0 0 rg');
  commands.push('BT');
  commands.push('/F1 8 Tf');
  commands.push(`${PAGE_MARGIN} 36 Td`);
  commands.push(`(Generated by SwanStudios - Page ${pageNumber} of ${totalPages}) Tj`);
  commands.push('ET');
  commands.push('Q');
  return `${commands.join('\n')}\n`;
};

const buildPdfBuffer = (lines) => {
  const pages = pageChunks(lines);
  const objectCount = 3 + (pages.length * 2);
  const objects = Array(objectCount + 1).fill('');
  const pageIds = pages.map((_, index) => 4 + (index * 2));

  objects[1] = '<< /Type /Catalog /Pages 2 0 R >>';
  objects[2] = `<< /Type /Pages /Kids [${pageIds.map((id) => `${id} 0 R`).join(' ')}] /Count ${pages.length} >>`;
  objects[3] = '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>';

  pages.forEach((pageLines, index) => {
    const pageId = 4 + (index * 2);
    const contentId = pageId + 1;
    const stream = renderPageStream(pageLines, index + 1, pages.length);
    objects[pageId] = [
      '<< /Type /Page',
      '/Parent 2 0 R',
      `/MediaBox [0 0 ${PAGE_WIDTH} ${PAGE_HEIGHT}]`,
      '/Resources << /Font << /F1 3 0 R >> >>',
      `/Contents ${contentId} 0 R`,
      '>>',
    ].join(' ');
    objects[contentId] = `<< /Length ${Buffer.byteLength(stream, 'utf8')} >>\nstream\n${stream}endstream`;
  });

  let pdf = '%PDF-1.4\n';
  const offsets = [0];
  for (let id = 1; id <= objectCount; id += 1) {
    offsets[id] = Buffer.byteLength(pdf, 'utf8');
    pdf += `${id} 0 obj\n${objects[id]}\nendobj\n`;
  }

  const xrefOffset = Buffer.byteLength(pdf, 'utf8');
  pdf += `xref\n0 ${objectCount + 1}\n`;
  pdf += '0000000000 65535 f \n';
  for (let id = 1; id <= objectCount; id += 1) {
    pdf += `${String(offsets[id]).padStart(10, '0')} 00000 n \n`;
  }
  pdf += `trailer\n<< /Size ${objectCount + 1} /Root 1 0 R >>\n`;
  pdf += `startxref\n${xrefOffset}\n%%EOF\n`;
  return Buffer.from(pdf, 'utf8');
};

export function buildWorkoutPlanPdfFile({
  title,
  description = null,
  durationWeeks = 4,
  nasmPhase = null,
  planData = null,
} = {}) {
  const lines = buildPlanLines({ title, description, durationWeeks, nasmPhase, planData });
  if (!lines) return null;

  const buffer = buildPdfBuffer(lines);
  const originalname = `SwanStudios-Workout-Plan-${safeFilenamePart(title)}.pdf`;
  return {
    originalname,
    mimetype: PDF_CONTENT_TYPE,
    size: buffer.length,
    buffer,
  };
}
