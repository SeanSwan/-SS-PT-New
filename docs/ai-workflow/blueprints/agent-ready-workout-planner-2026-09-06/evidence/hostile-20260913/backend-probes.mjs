/**
 * Read-only synthetic source probes for the backend hostile audit.
 * Run from the repository root:
 *   node tmp/rolodex-audit-evidence/backend-probes.mjs
 *
 * These are diagnostic probes, not PostgreSQL integration tests. They read
 * application source, remove static imports, evaluate selected functions in
 * isolated VM contexts, and provide synthetic model/persistence substitutes.
 * No database, application server, network, provider, or production data is used.
 * Only the pure class-style and pain-ontology modules are imported normally.
 * Results intentionally describe defects present at the audited baseline;
 * corrected application behavior should change the diagnostic results.
 */
import fs from 'node:fs';
import vm from 'node:vm';
import crypto from 'node:crypto';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const sourcePaths = [
  'backend/services/bootcamp/bootcampGenerator.mjs',
  'backend/services/bootcamp/bootcampCrud.mjs',
  'backend/services/bootcamp/sprintService.mjs',
  'backend/services/bootcamp/sprintGenerator.mjs',
  'backend/services/bootcamp/painAwareGating.mjs',
  'backend/services/bootcamp/classStyleModifiers.mjs',
  'backend/services/workoutBuilderService.mjs',
  'backend/services/training-cortex/ontology/regionMuscleMap.mjs',
];
const sources = Object.fromEntries(sourcePaths.map(p => [p, fs.readFileSync(path.join(root, p), 'utf8')]));
const sourceSha256 = Object.fromEntries(Object.entries(sources).map(([p, source]) => [
  p, crypto.createHash('sha256').update(source).digest('hex'),
]));
const strip = source => source
  .replace(/^import[\s\S]*?;\r?\n/gm, '')
  .replace(/^export\s*\{[\s\S]*?\};?\r?\n/gm, '')
  .replace(/\bexport (?=(?:async )?function|const|class)/g, '');
const compile = (p, globals, names) => vm.runInNewContext(
  strip(sources[p]) + '\n;({' + names.join(',') + '})', globals,
  { filename: p, timeout: 1000 },
);

const styles = await import(pathToFileURL(path.join(root, 'backend/services/bootcamp/classStyleModifiers.mjs')));
const { bootcampTargetsForRegion } = await import(pathToFileURL(path.join(root, 'backend/services/training-cortex/ontology/regionMuscleMap.mjs')));
const results = [];

const generator = compile('backend/services/bootcamp/bootcampGenerator.mjs', {
  TRANSITION_TIME_SEC: 15,
  chipsForExercise: () => [],
  estimateSetupTime: () => 0,
  buildAvailableEquipmentList: () => [],
}, ['buildExerciseRecord']);
const generated = generator.buildExerciseRecord({
  key: 'test_squat', name: 'Test Squat', setupTimeSec: 0,
  muscles: ['Quadriceps'], equipment: ['Barbell'],
  exerciseLibraryId: '00000000-0000-4000-8000-000000000001',
}, { durationSec: 45, sortOrder: 1 });
results.push({
  probe: 'generated identity contract', hasKey: !!generated.key,
  exerciseName: generated.exerciseName, libraryId: generated.exerciseLibraryId,
  extractedSprintKeys: [generated].filter(ex => ex.key).map(ex => ex.key),
});

const snapshots = { stations: [], stretches: [], overflows: [], templates: [], exercises: [] };
const crud = compile('backend/services/bootcamp/bootcampCrud.mjs', {
  getBootcampTemplate: () => ({ create: async data => (snapshots.templates.push(data), { id: 123 }) }),
  getBootcampStation: () => ({ bulkCreate: async data => (
    snapshots.stations.push(...data), data.map((row, i) => ({ ...row, id: i + 1 }))
  ) }),
  getBootcampExercise: () => ({ bulkCreate: async data => snapshots.exercises.push(...data) }),
  getBootcampOverflowPlan: () => ({ create: async data => snapshots.overflows.push(data) }),
  getBootcampStretch: () => ({ bulkCreate: async data => snapshots.stretches.push(...data) }),
}, ['saveBootcampTemplate']);
await crud.saveBootcampTemplate({
  name: 'synthetic', stations: [{ stationName: 'synthetic', templateId: 999 }],
  exercises: [], stretches: [{ exerciseName: 'synthetic', templateId: 999 }],
  overflowPlan: { templateId: 999 }, expectedParticipants: 12,
}, 1);
results.push({
  probe: 'request-owned child FK override', createdTemplateId: 123,
  stationTemplateId: snapshots.stations[0].templateId,
  stretchTemplateId: snapshots.stretches[0].templateId,
  overflowTemplateId: snapshots.overflows[0].templateId,
});

let increments = 0;
const slot = {
  sprintId: 7, scheduledDate: '2026-09-14',
  update: async function (data) { Object.assign(this, data); return this; },
};
const sprint = { status: 'active', increment: async () => increments++ };
const service = compile('backend/services/bootcamp/sprintService.mjs', {
  getBootcampSprint: () => ({ findOne: async () => sprint }),
  getSprintClassSlot: () => ({ findOne: async () => slot }),
}, ['confirmSlotUsed', 'buildSprintSchedule']);
await service.confirmSlotUsed('7', '1', 1, {});
await service.confirmSlotUsed('7', '1', 1, {});
results.push({ probe: 'duplicate taught confirmation', increments, slotStatus: slot.status });

const sprintGenerator = compile('backend/services/bootcamp/sprintGenerator.mjs', {
  getBootcampSprint: () => ({ findOne: async () => sprint }),
  getSprintClassSlot: () => ({ findByPk: async () => slot }),
  getSprintExerciseMemory: () => ({}),
}, ['regenerateSlot']);
try {
  await sprintGenerator.regenerateSlot('7', '1', 1);
  results.push({ probe: 'regenerate string route IDs', rejected: false });
} catch (error) {
  results.push({ probe: 'regenerate string route IDs', rejected: true, error: error.message });
}

const plannerSource = sources['backend/services/workoutBuilderService.mjs'];
const filterStart = plannerSource.indexOf('function filterExercises(');
const filterEnd = plannerSource.indexOf('// ── Helper: Select exercises', filterStart);
if (filterStart < 0 || filterEnd < 0) throw new Error('Planner source boundaries changed; update probe harness.');
const filter = vm.runInNewContext(plannerSource.slice(filterStart, filterEnd) + ';filterExercises');
const constraints = { excludedMuscles: ['biceps'], recentlyUsedExercises: [], compensationTypes: [] };
results.push({
  probe: 'planner title-case pain muscle',
  retained: filter([{ key: 'curl', muscles: ['Biceps'], equipment: [] }], constraints, []).map(ex => ex.key),
});
results.push({
  probe: 'planner title-case equipment',
  retained: filter([{ key: 'curl', muscles: ['biceps'], equipment: ['Dumbbells'] }],
    { ...constraints, excludedMuscles: [] }, [{ category: 'dumbbell' }]).map(ex => ex.key),
});
results.push({
  probe: 'planner missing mandatory equipment',
  retained: filter([{ key: 'bench_press', muscles: ['chest'], equipment: ['barbell', 'bench'] }],
    { ...constraints, excludedMuscles: [] }, [{ category: 'barbell' }]).map(ex => ex.key),
});

const alternative = styles.generateBoard2([{
  exerciseName: 'Jump Squat', board: 'main', exerciseLibraryId: 'original-id',
  videoUrl: 'synthetic-original-demo', instructions: 'Jump explosively', kneeMod: 'Wall Sit',
}])[0];
results.push({
  probe: 'alternative preserves original demonstration', alternativeName: alternative.exerciseName,
  videoUrl: alternative.videoUrl, instructions: alternative.instructions,
  exerciseLibraryId: alternative.exerciseLibraryId,
});

for (const [region, muscle] of [
  ['chest', 'pectorals'], ['upper_traps_left', 'traps'],
  ['mid_back_left', 'latissimus_dorsi'], ['left_knee', 'quadriceps'],
]) {
  const pain = compile('backend/services/bootcamp/painAwareGating.mjs', {
    Op: { gte: Symbol('gte'), in: Symbol('in') },
    getModel: () => ({ findAll: async () => [{ clientId: 5 }] }),
    getClientPainEntry: () => ({ findAll: async () => [{ bodyRegion: region, painLevel: 9, userId: 5 }] }),
    bootcampTargetsForRegion, deriveJointFriendlyAlternative: styles.deriveJointFriendlyAlternative,
    logger: { warn: () => {} },
  }, ['applyPainAwareGating']);
  const alerts = await pain.applyPainAwareGating({
    trainerId: 1,
    allExercises: [{ exerciseName: 'Synthetic ' + muscle, muscleTargets: muscle, board: 'main' }],
    explanations: [],
  });
  results.push({ probe: 'current pain canonical mismatch', region, muscle, alerts: alerts.length });
}

const sprintSource = sources['backend/services/bootcamp/sprintGenerator.mjs'];
const strategyText = sprintSource.slice(sprintSource.indexOf('const PROGRESSION ='),
  sprintSource.indexOf('// ── GENERATE ALL CLASSES'));
const strategy = vm.runInNewContext(strategyText + ';({PROGRESSION,intensityCategoryFromModifier})');
results.push({
  probe: 'sprint strategy overridden by stored 1.0',
  weeks: [1, 2, 3, 5, 10].map(week => ({
    week, linearComputed: strategy.PROGRESSION.linear(week, 12),
    actuallyUsed: 1.0 || strategy.PROGRESSION.linear(week, 12),
  })),
});

// Explicit synthetic timezone; no machine configuration is changed.
process.env.TZ = 'America/Los_Angeles';
const schedule = service.buildSprintSchedule('2026-09-14', 1, ['monday'], ['full_body']);
results.push({
  probe: 'Monday start timezone', input: '2026-09-14',
  scheduledDate: schedule[0].slots[0].scheduledDate,
  dayOfWeek: schedule[0].slots[0].dayOfWeek,
});

console.log(JSON.stringify({
  evidenceClass: 'Synthetic source-function probes; no DB or live runtime verification',
  intendedBaseline: 'c0cbe538d8ed2ca519bb494cdf3282bf43b76699',
  sourceSha256, results,
}, null, 2));
