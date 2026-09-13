/** Synthetic, read-only boundary probes. No real provider or DB calls. */
import fs from 'node:fs';
import crypto from 'node:crypto';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

/**
 * Locate the repository root by WALKING UP for the backend entry point.
 *
 * This used to be a fixed `'../..'`, which resolves to the blueprint directory and only
 * worked in whatever layout the script was first written in — so in this checkout it died
 * with ERR_MODULE_NOT_FOUND before printing a single result, independent of any code change.
 * Searching upward keeps it runnable from the repo layout it actually ships in.
 */
const resolveRoot = () => {
  let dir = path.dirname(fileURLToPath(import.meta.url));
  for (let depth = 0; depth < 12; depth += 1) {
    if (fs.existsSync(path.join(dir, 'backend/services/bootcamp/bootcampBrain.mjs'))) return dir;
    const parent = path.dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  throw new Error('could not locate the repository root from this script');
};
const root = resolveRoot();
const load = relative => import(pathToFileURL(path.join(root, relative)));
const { orderPoolWithBrain } = await load('backend/services/bootcamp/bootcampBrain.mjs');
const { buildAttendancePayloads, recordBootcampAttendance } = await load('backend/services/bootcamp/bootcampAttendance.mjs');
const { default: commands } = await load('backend/services/ai/commandRegistry/bootcampCommands.mjs');
const sourcePaths = [
  'backend/services/bootcamp/bootcampBrain.mjs',
  'backend/services/bootcamp/bootcampAttendance.mjs',
  'backend/services/ai/commandRegistry/bootcampCommands.mjs',
  'backend/routes/bootcampRoutes.mjs',
  'backend/models/DailyWorkoutForm.mjs',
];
const sourceSha256 = Object.fromEntries(sourcePaths.map(relative => [relative,
  crypto.createHash('sha256').update(fs.readFileSync(path.join(root, relative))).digest('hex'),
]));
const results = [];
const prompts = [];
const pool = [
  { key: 'synthetic_private_key_A', coreMovement: { pattern: 'squat' }, setupTimeSec: 20 },
  { key: 'synthetic_private_key_B', coreMovement: { pattern: 'hinge' }, setupTimeSec: 0 },
];
for (const [candidatePool, recents] of [
  [pool, new Set([pool[0].key])],
  [pool.map(ex => ({ ...ex, coreMovement: { pattern: 'push' }, setupTimeSec: 99 })), new Set([pool[1].key])],
]) {
  await orderPoolWithBrain({
    pool: candidatePool, recentKeys: recents, dayTypeId: 'lower_body',
    headcount: 12, mode: 'strict', env: { SWAN_BOOTCAMP_BRAIN: 'llm' },
    completionFn: async prompt => {
      prompts.push(prompt);
      return '{"orderedKeys":["ex_0","ex_1"]}';
    },
  });
}
results.push({
  probe: 'brain loses movement/recency/setup signals',
  changedMetadataProducesIdenticalPrompt: prompts[0] === prompts[1],
  rawExerciseKeyVisible: prompts[0].includes('synthetic_private_key_A'),
  prompt: prompts[0],
});
let unsafeDayPrompt = '';
await orderPoolWithBrain({
  pool, dayTypeId: 'SYNTHETIC_PRIVATE_NOTE', env: { SWAN_BOOTCAMP_BRAIN: 'llm' },
  completionFn: async prompt => (unsafeDayPrompt = prompt, '{"orderedKeys":["ex_0"]}'),
});
results.push({
  probe: 'freeform day type enters provider prompt',
  syntheticMarkerPresent: unsafeDayPrompt.includes('SYNTHETIC_PRIVATE_NOTE'),
});
let disabledCalls = 0;
const off = await orderPoolWithBrain({
  pool, dayTypeId: 'lower_body', env: {}, completionFn: async () => { disabledCalls++; },
});
const noProvider = await orderPoolWithBrain({ pool, dayTypeId: 'lower_body', env: { SWAN_BOOTCAMP_BRAIN: 'llm' } });
const invalid = await orderPoolWithBrain({
  pool, dayTypeId: 'lower_body', env: { SWAN_BOOTCAMP_BRAIN: 'llm' },
  completionFn: async () => '{"orderedKeys":["not_a_token"]}',
});
results.push({
  probe: 'brain gates and validation positive controls', disabledCalls,
  disabledBrain: off.brainUsed, noProviderReason: noProvider.fallbackReason,
  invalidReason: invalid.fallbackReason,
});
let operationCompleted = false;
let completionArgumentCount = null;
let lateOperation;
const timeoutResult = await orderPoolWithBrain({
  pool, dayTypeId: 'lower_body',
  env: { SWAN_BOOTCAMP_BRAIN: 'llm', SWAN_BOOTCAMP_BRAIN_TIMEOUT_MS: '1000' },
  completionFn: (...args) => {
    completionArgumentCount = args.length;
    lateOperation = new Promise(resolve => setTimeout(() => {
      operationCompleted = true;
      resolve('{"orderedKeys":["ex_0"]}');
    }, 1100));
    return lateOperation;
  },
});
const completedWhenFallbackReturned = operationCompleted;
await lateOperation;
results.push({
  probe: 'timeout does not cancel operation', fallbackReason: timeoutResult.fallbackReason,
  completionArgumentCount, completedWhenFallbackReturned, operationEventuallyCompleted: operationCompleted,
});

const classLog = {
  id: 42, trainerId: 7, classDate: '2026-09-13', dayType: 'lower_body',
  exercisesUsed: [
    { exerciseName: 'Main Squat', durationSec: 40, board: 'main' },
    { exerciseName: 'Board Two', durationSec: 40, board: 'alternative' },
    { exerciseName: 'Board Three', durationSec: 40, board: 'lowImpact' },
  ],
};
/**
 * These two probes originally DOCUMENTED open defects:
 *   - mixed-board input silently completed the main board while dropping alternatives;
 *   - an empty payload on a future date was accepted.
 * Both are now REFUSED (H28, contract §5 lines 224/226), so the probes record the refusal
 * rather than crashing. The `was` field preserves what they demonstrated at the time, so the
 * evidence trail is extended instead of rewritten.
 */
const captureOutcome = (run) => {
  try {
    return { refused: false, value: run(), message: null };
  } catch (err) {
    return { refused: true, value: null, message: err.message };
  }
};

const attendance = captureOutcome(() =>
  buildAttendancePayloads({ classLog, attendees: [{ userId: 11 }], nowIso: 'synthetic' }));
results.push({
  probe: 'attendance refuses MIXED-BOARD input (was: completed main and low-impact variants)',
  was: 'completed every non-alternative row, silently preferring the main board',
  refused: attendance.refused,
  message: attendance.message,
  completedNames: attendance.refused
    ? null
    : attendance.value.workoutForms[0].formData.exercises.map(ex => ex.name),
});

const emptyFuture = captureOutcome(() => buildAttendancePayloads({
  classLog: { ...classLog, classDate: '2099-01-01', exercisesUsed: [{ unrecognized: true }] },
  attendees: [{ userId: 11 }], nowIso: 'synthetic',
}));
results.push({
  probe: 'attendance refuses an EMPTY payload on a FUTURE date (was: permitted it)',
  was: 'accepted zero exercises on a class dated in the future',
  refused: emptyFuture.refused,
  message: emptyFuture.message,
  date: emptyFuture.refused ? null : emptyFuture.value.workoutForms[0].date,
  exerciseCount: emptyFuture.refused
    ? null
    : emptyFuture.value.workoutForms[0].formData.exercises.length,
});
let writes = 0;
/**
 * These positive controls are about AUTHORIZATION and SEQUENTIAL IDEMPOTENCY, not about
 * boards — and mixed-board input is refused now (probe above), so they use a single-board
 * log. `board` is stripped entirely, which is exactly what the real client sends
 * (`useBootcampTaughtLog.ts` maps main-board rows only).
 *
 * ONE shared object on purpose: `saveClassLog` mutates it, and that mutation is what makes
 * the SECOND submission report `alreadyRecorded`.
 */
const cleanClassLog = {
  ...classLog,
  attendance: null,
  exercisesUsed: [{ exerciseName: 'Main Squat', durationSec: 40 }],
};
const deps = {
  getClassLog: async () => cleanClassLog,
  createWorkoutForms: async forms => (writes += forms.length, forms.map((_, i) => 100 + i)),
  verifyClientAccessBatch: async () => true,
  saveClassLog: async (log, patch) => Object.assign(log, patch),
  now: () => new Date('2026-09-13T00:00:00Z'),
};
const args = { classLogId: 42, trainerId: 7, requesterRole: 'trainer', attendees: [{ userId: 11 }] };
const first = await recordBootcampAttendance(deps, args);
const second = await recordBootcampAttendance(deps, args);
let foreignStatus = null;
try { await recordBootcampAttendance(deps, { ...args, trainerId: 99 }); }
catch (error) { foreignStatus = error.statusCode; }
let unassignedStatus = null;
try {
  await recordBootcampAttendance({
    ...deps, getClassLog: async () => ({ ...cleanClassLog, attendance: null }),
    verifyClientAccessBatch: async () => false,
  }, args);
} catch (error) { unassignedStatus = error.statusCode; }
results.push({
  probe: 'attendance auth and sequential-idempotency positive controls',
  writes, firstCreated: first.created, secondAlreadyRecorded: second.alreadyRecorded,
  foreignStatus, unassignedStatus,
});

const durationCommand = commands.find(command => command.type === 'bootcamp_set_duration');
const formatCommand = commands.find(command => command.type === 'bootcamp_set_format');
const routeSource = fs.readFileSync(path.join(root, 'backend/routes/bootcampRoutes.mjs'), 'utf8');
const generateRoute = routeSource.slice(routeSource.indexOf("router.post('/generate'"), routeSource.indexOf('// POST /api/bootcamp/save'));
const rawDuration = 120;
results.push({
  probe: 'coach command and generate contract drift',
  commandAccepts120Minutes: durationCommand.inputSchema.safeParse({ minutes: rawDuration }).success,
  generatorRouteClampsTo: Math.min(Math.max(parseInt(rawDuration, 10) || 45, 20), 90),
  commandAcceptsUnknownStyle: formatCommand.inputSchema.safeParse({ classStyle: 'synthetic_unknown_style' }).success,
  commandAcceptsOptPhase: formatCommand.inputSchema.safeParse({ optPhase: 3 }).success,
  generateRouteReadsOptPhase: generateRoute.includes('optPhase'),
});

console.log(JSON.stringify({
  evidenceClass: 'Synthetic source/module probes; injected completion callbacks only; no provider or DB used',
  intendedBaseline: 'c0cbe538d8ed2ca519bb494cdf3282bf43b76699', sourceSha256, results,
}, null, 2));
