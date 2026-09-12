/**
 * SCU S5 — bounded read-only evidence tools.
 *
 * Exits: T22 (a reader THROW is `unavailable`; zero rows is `empty` — the two
 * must not collapse into each other, or a failed pain/progress read would be
 * reported to the model as "no pain" / "no progress"), per-query row/byte
 * caps, permission/target refreshed per tool, and the four-tool allowlist
 * (no model-visible write tool).
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  COACH_EVIDENCE_TOOLS,
  COACH_EVIDENCE_TOOL_IDS,
  contextSummaryTool,
  exerciseLookupTool,
  recentWorkoutTool,
  progressEvidenceTool,
} from '../../services/ai/coachEvidenceTools.mjs';
import { getModel } from '../../models/index.mjs';
import { readCoachExerciseLibrary } from '../../services/ai/coachExerciseLibraryReader.mjs';
import { formatLibraryExercise } from '../../services/exerciseLibraryContract.mjs';
import { clearCoachContextCache } from '../../services/ai/coachContextCache.mjs';

const { canonicalSequelize, canonicalExercise } = vi.hoisted(() => {
  const sequelize = { QueryTypes: { SELECT: 'SELECT' } };
  const exercise = {
    sequelize,
    rawAttributes: {
      id: {}, name: {}, exercise_key: {}, isActive: {},
    },
    findAll: vi.fn(),
  };
  return { canonicalSequelize: sequelize, canonicalExercise: exercise };
});

vi.mock('../../models/index.mjs', () => ({
  getModel: vi.fn(() => canonicalExercise),
}));

function canonicalRow(index = 1, overrides = {}) {
  return {
    id: `00000000-0000-4000-8000-${String(index).padStart(12, '0')}`,
    name: `Move ${index}`,
    exercise_key: `move-${index}`,
    isActive: true,
    ...overrides,
  };
}

/** Fake sequelize: query(sql, opts) -> rows (SELECT mode) or throws, per caller config. */
function makeSequelize({ rowsByPattern = {}, throwByPattern = {} } = {}) {
  const calls = [];
  return {
    calls,
    QueryTypes: { SELECT: 'SELECT' },
    async query(sql, _opts) {
      calls.push(sql);
      for (const [pattern, handler] of Object.entries({ ...throwByPattern, ...rowsByPattern })) {
        if (sql.includes(pattern)) {
          if (handler.__throw) throw new Error(handler.message || 'reader threw');
          return handler.rows;
        }
      }
      return [];
    },
  };
}

beforeEach(() => {
  clearCoachContextCache();
  getModel.mockReset(); getModel.mockReturnValue(canonicalExercise);
  canonicalExercise.sequelize = canonicalSequelize;
  canonicalExercise.rawAttributes = { id: {}, name: {}, exercise_key: {}, isActive: {} };
  canonicalExercise.findAll = vi.fn();
  canonicalExercise.findAll.mockResolvedValue([]);
});

describe('S5 evidence tools', () => {
  it('exposes exactly the four allowlisted read tools — no write tool is model-visible', () => {
    expect(COACH_EVIDENCE_TOOL_IDS.sort()).toEqual(
      ['context_summary', 'exercise_lookup', 'progress_evidence', 'recent_workout'].sort(),
    );
    for (const id of COACH_EVIDENCE_TOOL_IDS) {
      expect(typeof COACH_EVIDENCE_TOOLS[id]).toBe('function');
    }
  });

  it('T22: a reader throw is `unavailable`, zero rows is `empty` — they never merge', async () => {
    // recent_workout: DB/reader throws.
    const throwing = makeSequelize({ throwByPattern: { workout_sessions: { __throw: true, message: 'relation missing' } } });
    const failed = await recentWorkoutTool({ sequelize: throwing, userId: 42 });
    expect(failed.state).toBe('unavailable');
    expect(failed.reason).toContain('relation missing');

    // recent_workout: query succeeds with zero rows.
    const empty = makeSequelize({ rowsByPattern: { workout_sessions: { rows: [] } } });
    const none = await recentWorkoutTool({ sequelize: empty, userId: 42 });
    expect(none.state).toBe('empty');
    expect(none.payload).toEqual([]);

    // progress_evidence: zero sessions -> empty (not "zero progress");
    // throwing session reader -> unavailable.
    const emptyProgress = await progressEvidenceTool({ sequelize: empty, userId: 42 });
    expect(emptyProgress.state).toBe('empty');
    const failedProgress = await progressEvidenceTool({ sequelize: throwing, userId: 42 });
    expect(failedProgress.state).toBe('unavailable');
  });

  it('recent_workout caps rows to the 5-session limit and flags truncation on overflow', async () => {
    const tenRows = Array.from({ length: 10 }, (_, i) => ({ id: i + 1, title: `Day ${i + 1}`, date: '2026-09-01', duration: 60, intensity: 'moderate', exercises: [] }));
    const db = makeSequelize({ rowsByPattern: { workout_sessions: { rows: tenRows } } });
    const out = await recentWorkoutTool({ sequelize: db, userId: 42 });
    expect(out.state).toBe('ok');
    expect(out.payload.length).toBeLessThanOrEqual(5);
    expect(out.truncated).toBe(true);
    expect(out.bytes).toBeGreaterThanOrEqual(0);
  });

  it('exercise_lookup uses the registered canonical reader and preserves identity', async () => {
    canonicalExercise.findAll.mockResolvedValue([
      canonicalRow(1, { name: 'Barbell Bench Press', exercise_key: 'barbell-bench-press' }),
    ]);
    const found = await exerciseLookupTool({ sequelize: canonicalSequelize, query: 'bench' });
    expect(found.state).toBe('ok');
    expect(found.payload).toMatchObject([
      { id: '00000000-0000-4000-8000-000000000001', name: 'Barbell Bench Press', exerciseKey: 'barbell-bench-press' },
    ]);
    expect(canonicalExercise.findAll).toHaveBeenCalledTimes(1);
    expect(canonicalExercise.findAll.mock.calls[0][0]).toMatchObject({
      limit: 10,
      raw: true,
      order: [['name', 'ASC'], ['id', 'ASC']],
      where: { isActive: true },
    });
    expect(canonicalExercise.findAll.mock.calls[0][0].where.name).toBeDefined();
  });

  it('exercise_lookup validates query and limit before any reader or model call', async () => {
    const reader = vi.fn(async () => [canonicalRow()]);
    const invalidQueries = [null, 42, {}, 'x'.repeat(121), '\u0000bad', '\uD800'];
    for (const query of invalidQueries) {
      const out = await exerciseLookupTool({ sequelize: canonicalSequelize, query, deps: { exerciseReader: reader } });
      expect(out).toMatchObject({ state: 'unavailable', reason: 'invalid_exercise_query' });
    }
    const invalidLimits = [0, 11, -1, 1.5, Number.NaN, Number.POSITIVE_INFINITY, true, '10'];
    for (const limit of invalidLimits) {
      const out = await exerciseLookupTool({ sequelize: canonicalSequelize, query: 'bench', limit, deps: { exerciseReader: reader } });
      expect(out).toMatchObject({ state: 'unavailable', reason: 'invalid_exercise_limit' });
    }
    const empty = await exerciseLookupTool({ sequelize: canonicalSequelize, query: '     ', deps: { exerciseReader: reader } });
    expect(empty).toMatchObject({ state: 'empty', payload: [], rows: 0, bytes: 2, truncated: false });
    expect(reader).not.toHaveBeenCalled();
    expect(canonicalExercise.findAll).not.toHaveBeenCalled();
  });

  it('exercise_lookup rejects malformed canonical identity and inactive rows from injected readers', async () => {
    const malformedRows = [
      { ...canonicalRow(), id: 1 },
      { ...canonicalRow(), exercise_key: '' },
      { ...canonicalRow(), name: { hostile: true } },
      { ...canonicalRow(), isActive: false },
    ];
    for (const row of malformedRows) {
      const out = await exerciseLookupTool({ sequelize: canonicalSequelize, query: 'move', deps: { exerciseReader: async () => [row] } });
      expect(out).toMatchObject({ state: 'unavailable', reason: 'exercise_rows_invalid' });
    }
  });

  it('exercise_lookup enforces an independent ten-row and UTF-8 whole-row publication cap', async () => {
    const many = Array.from({ length: 30 }, (_, i) => canonicalRow(i + 1));
    const capped = await exerciseLookupTool({ sequelize: canonicalSequelize, query: 'move', limit: 10, deps: { exerciseReader: async () => many } });
    expect(capped.state).toBe('ok');
    expect(capped.payload.length).toBe(10);
    expect(capped.rows).toBe(10);
    expect(capped.bytes).toBeLessThanOrEqual(8192);
    expect(capped.truncated).toBe(true);

    const large = Array.from({ length: 3 }, (_, i) => canonicalRow(i + 1, { description: 'é'.repeat(3000) }));
    const byteCapped = await exerciseLookupTool({ sequelize: canonicalSequelize, query: 'move', deps: { exerciseReader: async () => large } });
    expect(byteCapped.state).toBe('ok');
    expect(byteCapped.bytes).toBeLessThanOrEqual(8192);
    expect(byteCapped.payload.length).toBeGreaterThan(0);
    expect(byteCapped.truncated).toBe(true);

    const noReader = await exerciseLookupTool({ sequelize: {}, query: 'squat' });
    expect(noReader.state).toBe('unavailable');
    expect(noReader.reason).toBe('exercise_model_unavailable');
  });

  it('exercise_lookup maps reader failures to a stable safe reason and fences a late abort', async () => {
    const failed = await exerciseLookupTool({
      sequelize: canonicalSequelize,
      query: 'bench',
      deps: { exerciseReader: async () => { throw new Error('sensitive SQL and customer payload'); } },
    });
    expect(failed).toMatchObject({ state: 'unavailable', reason: 'exercise_reader_unavailable' });
    expect(failed.reason).not.toContain('sensitive');

    const controller = new AbortController();
    let release;
    const pending = exerciseLookupTool({
      sequelize: canonicalSequelize,
      query: 'bench',
      signal: controller.signal,
      deps: { exerciseReader: () => new Promise(resolve => { release = resolve; }) },
    });
    controller.abort();
    release([canonicalRow()]);
    await expect(pending).resolves.toMatchObject({ state: 'unavailable', reason: 'request_cancelled' });
  });

  it('context_summary: denied access is `denied`, a reader throw is `unavailable`, content is `ok`', async () => {
    const denied = await contextSummaryTool({
      sequelize: {},
      user: { id: 7, role: 'trainer' },
      targetClientId: 42,
      deps: { buildCoachContext: async () => ({ accessDenied: true }) },
    });
    expect(denied.state).toBe('denied');

    const threw = await contextSummaryTool({
      sequelize: {},
      user: { id: 7, role: 'trainer' },
      targetClientId: 42,
      deps: { buildCoachContext: async () => { throw new Error('context engine down'); } },
    });
    expect(threw.state).toBe('unavailable');
    expect(threw.reason).toContain('context engine down');

    const ok = await contextSummaryTool({
      sequelize: {},
      user: { id: 7, role: 'trainer' },
      targetClientId: 42,
      deps: { buildCoachContext: async () => ({ ok:true, context:{ profile: { fitnessGoals: ['strength'] }, domains: ['profile'] } }) },
    });
    expect(ok.state).toBe('ok');
    expect(ok.payload.context).toEqual({ profile: { fitnessGoals: ['strength'] }, domains: ['profile'] });
  });

  it('permission/target is refreshed per tool: each tool performs its own authorized read', async () => {
    const db = makeSequelize({ rowsByPattern: { workout_sessions: { rows: [{ id: 1, title: 'Push', date: '2026-09-01', duration: 60, intensity: 'moderate', exercises: [] }] } } });
    await recentWorkoutTool({ sequelize: db, userId: 42 });
    const afterFirst = db.calls.length;
    await progressEvidenceTool({ sequelize: db, userId: 42 });
    // progress runs its own session read (and a scheduled count read) — not a
    // cached or shared result from the workout tool.
    expect(db.calls.length).toBeGreaterThan(afterFirst);
    const distinctToolCalls = db.calls.filter((sql) => sql.includes('workout_sessions'));
    expect(distinctToolCalls.length).toBeGreaterThanOrEqual(2);
  });
});


describe('Astra payload boundary regressions', () => {
  it('a single oversized context cannot exceed the 8KB evidence limit', async () => {
    const out = await contextSummaryTool({deps:{buildCoachContext:async()=>({ok:true,context:{profile:{notes:'x'.repeat(20000)}}})}});
    expect(Buffer.byteLength(JSON.stringify(out.payload ?? null))).toBeLessThanOrEqual(8192);
    expect(out.truncated).toBe(true);
    expect(out.state).toBe('ok');
    expect(out.payload.truncation.omittedFields).toContain('context.profile');
  });
  it('one oversized workout row is omitted rather than returned at its original size',async()=>{
    const db=makeSequelize({rowsByPattern:{workout_sessions:{rows:[{id:1,exercises:[{notes:'x'.repeat(20000)}]}]}}});
    const out=await recentWorkoutTool({sequelize:db,userId:42});
    expect(Buffer.byteLength(JSON.stringify(out.payload))).toBeLessThanOrEqual(8192);
    expect(out.truncated).toBe(true);
    expect(out.rows).toBe(out.payload.length);
  });
});
describe('real context engine result contract',()=>{
  test('rejects the production denied shape before downstream reads',async()=>{
    const out=await contextSummaryTool({deps:{buildCoachContext:async()=>({ok:false,deniedReason:'not_assigned',message:'denied'})}});
    expect(out.state).toBe('denied');
    expect(out.payload).toBeUndefined();
  });
  test('exports only deidentified context, never the local identity alias map',async()=>{
    const out=await contextSummaryTool({deps:{buildCoachContext:async()=>({ok:true,context:{alias:'Client_A'},aliasMap:{Client_A:{name:'Synthetic Private Name'}},dataQuality:[{domain:'pain',status:'degraded'}]})}});
    expect(out.state).toBe('ok');
    expect(JSON.stringify(out)).not.toContain('Synthetic Private Name');
    expect(out.payload.context).toEqual({alias:'Client_A'});
    expect(out.payload.dataQuality).toEqual([{domain:'pain',status:'degraded'}]);
  });
  test('missing authoritative context result is unavailable',async()=>{
    const out=await contextSummaryTool({deps:{buildCoachContext:async()=>({})}});
    expect(out.state).toBe('unavailable');
  });
});

 test('real context engine denial is blocked by the complete inference path',async()=>{
  const {runCoachInference}=await import('../../services/ai/coachInferenceBoundary.mjs');
  const sequelize={query:vi.fn(async()=>[])};
  const providerGenerate=vi.fn();
  const out=await runCoachInference({actor:{id:7,role:'trainer'},targetClientId:42,sequelize,providerName:'gemini',providerGenerate});
  expect(out.reasonCode).toBe('CONTEXT_ACCESS_DENIED');
  expect(providerGenerate).not.toHaveBeenCalled();
  expect(sequelize.query).toHaveBeenCalledTimes(2);
  expect(sequelize.query.mock.calls.some(([sql])=>sql.includes('workout_sessions'))).toBe(false);
});


describe('HR1 context compaction and cancellation', () => {
  it('HR1-3 compacts populated authorized context without losing quality or implying complete evidence', async () => {
    const { buildCoachContext } = await import('../../services/ai/contextEngine/coachContextEngine.mjs');
    const goals = Array.from({ length: 10 }, (_, i) => ({ title: `Training goal ${i}`, description: `Goal ${i}: ${'Build consistent strength with controlled repetitions and enough rest between sessions. '.repeat(8)}`, progress: 30, status: 'active' }));
    const sequelize = { query: async sql => sql.includes('FROM "Users"') ? [{ id: 42, firstName: 'Synthetic', lastName: 'Example', availableSessions: 10 }] : sql.includes('FROM goals') ? goals : [] };
    const original = await buildCoachContext({ user: { id: 7, role: 'admin' }, targetClientId: 42, sequelize });
    const before = JSON.stringify(original);
    const out = await contextSummaryTool({ deps: { buildCoachContext: async () => original } });
    expect(out.state).toBe('ok');
    expect(out.truncated).toBe(true);
    expect(out.payload.truncation).toMatchObject({ reason: 'context_payload_limit', complete: false });
    expect(out.payload.truncation.omittedFields.length).toBeGreaterThan(0);
    expect(out.payload.dataQuality).toEqual(original.dataQuality);
    expect(out.payload.evidence).toEqual(original.evidence);
    expect(out.payload.context.clientAlias).toBe('Client-42');
    expect(out.payload.context.sessionCredits).toBe(10);
    expect(Buffer.byteLength(JSON.stringify(out.payload))).toBeLessThanOrEqual(8192);
    expect(JSON.stringify(out.payload)).not.toContain('Synthetic');
    expect(JSON.stringify(original)).toBe(before);
  });
  it.each(['context', 'progress'])('aborted %s evidence never starts the reader', async lane => {
    const controller = new AbortController(); controller.abort();
    const reader = vi.fn(async () => ({ ok: true, context: {}, sessions: [] }));
    const args = { sequelize: {}, userId: 42, signal: controller.signal, deps: { buildCoachContext: reader, readProgressRecords: reader } };
    const out = await (lane === 'context' ? contextSummaryTool(args) : progressEvidenceTool(args));
    expect(reader).not.toHaveBeenCalled(); expect(out.state).toBe('unavailable');
  });
  it.each(['context', 'progress'])('aborted %s evidence is discarded after its uncancellable reader resolves', async lane => {
    const controller = new AbortController();
    const reader = vi.fn(async args => { controller.abort(); return { ok: true, context: { privateValue: 'discard me' }, sessions: [] }; });
    const args = { sequelize: {}, userId: 42, signal: controller.signal, deps: { buildCoachContext: reader, readProgressRecords: reader } };
    const out = await (lane === 'context' ? contextSummaryTool(args) : progressEvidenceTool(args));
    expect(reader).toHaveBeenCalledWith(expect.objectContaining({ signal: controller.signal }));
    expect(out.state).toBe('unavailable'); expect(out.payload).toBeUndefined();
  });
});


test('HR1-3 compaction preserves active safety evidence while omitting optional goals', async () => {
  const painEntries = [{ bodyPart: 'knee', level: 'high', isActive: true }];
  const out = await contextSummaryTool({ deps: { buildCoachContext: async () => ({ ok: true, context: { clientAlias: 'Client-42', painEntries, fitnessGoals: ['Optional prose '.repeat(1000)] }, dataQuality: [{ domain: 'pain', status: 'ok' }] }) } });
  expect(out.state).toBe('ok');
  expect(out.payload.context.painEntries).toEqual(painEntries);
  expect(out.payload.truncation.omittedFields).toEqual(['context.fitnessGoals']);
  expect(out.payload.dataQuality).toEqual([{ domain: 'pain', status: 'ok' }]);
});
test('HR1-3 impossibly oversized safety context fails closed instead of omitting constraints', async () => {
  const out = await contextSummaryTool({ deps: { buildCoachContext: async () => ({ ok: true, context: { clientAlias: 'Client-42', painEntries: [{ bodyPart: 'x'.repeat(9000), level: 'high', isActive: true }] } }) } });
  expect(out.state).toBe('unavailable'); expect(out.payload).toBeNull(); expect(out.truncated).toBe(true);
});

describe('HR7 Astra canonical publication and direct reader regressions', () => {
  const lookup = rows => exerciseLookupTool({ sequelize: canonicalSequelize, query: 'move', deps: { exerciseReader: async () => rows } });
  const malformed = [
    ['description object', { description: { instruction: 'not text' } }],
    ['description array', { description: ['not text'] }],
    ['difficulty object', { difficulty: { value: 2 } }],
    ['difficulty string', { difficulty: '2' }],
    ...['exerciseType', 'bodyPartCategory', 'source'].map(field => [field, { [field]: { value: 'wrong type' } }]),
    ...['primaryMuscles', 'secondaryMuscles', 'equipmentNeeded', 'optPhases'].flatMap(field => [
      [`${field} object member`, { [field]: [{ value: 'wrong type' }] }],
      [`${field} encoded object`, { [field]: '{"value":"wrong type"}' }],
    ]),
    ['muscle number', { primaryMuscles: [42] }],
    ['phase boolean', { optPhases: [true] }],
    ['home false string', { canBePerformedAtHome: 'false' }],
    ...['instructions', 'videoUrl', 'defaultTempo', 'recommendedSets', 'nasmMovementPattern', 'kneeMod'].map(field => [field, { [field]: { value: 'wrong type' } }]),
  ];
  it.each(malformed)('rejects malformed published canonical %s', async (_label, patch) => {
    const out = await lookup([canonicalRow(1, patch)]);
    expect(out).toEqual({ toolId: 'exercise_lookup', state: 'unavailable', reason: 'exercise_rows_invalid' });
  });
  it('retains compatible canonical nullable/encoded fields without fabricating identity', async () => {
    const row = canonicalRow(1, { description: null, primaryMuscles: '["chest"]', secondaryMuscles: 'triceps', equipmentNeeded: '["barbell"]', optPhases: '[1,"2"]', difficulty: 0, canBePerformedAtHome: false, recommendedSets: '3' });
    const out = await lookup([row]);
    expect(out.state).toBe('ok');
    expect(out.payload[0]).toMatchObject({ id: row.id, exerciseKey: row.exercise_key, primaryMuscles: ['chest'], secondaryMuscles: ['triceps'], equipment: ['barbell'], optPhases: [1, '2'], difficulty: 0, recommendedSets: 3, canBePerformedAtHome: false });
  });
  it.each(['id', 'name', 'exercise_key', 'isActive'])('requires %s metadata before findAll', async attribute => {
    delete canonicalExercise.rawAttributes[attribute];
    expect(await exerciseLookupTool({ sequelize: canonicalSequelize, query: 'move' })).toMatchObject({ state: 'unavailable', reason: 'exercise_schema_unavailable' });
    expect(canonicalExercise.findAll).not.toHaveBeenCalled();
  });
  it.each(['absent', 'throws', 'wrong connection', 'missing method', 'missing attributes'])('rejects model registry %s without querying', async mode => {
    const findAll = canonicalExercise.findAll;
    if (mode === 'absent') getModel.mockReturnValue(null);
    if (mode === 'throws') getModel.mockImplementation(() => { throw new Error('private registry detail'); });
    if (mode === 'wrong connection') canonicalExercise.sequelize = {};
    if (mode === 'missing method') canonicalExercise.findAll = null;
    if (mode === 'missing attributes') canonicalExercise.rawAttributes = null;
    const out = await exerciseLookupTool({ sequelize: canonicalSequelize, query: 'move' });
    expect(out.reason).toBe(mode === 'missing attributes' ? 'exercise_schema_unavailable' : 'exercise_model_unavailable');
    expect(out.state).toBe('unavailable');
    expect(findAll).not.toHaveBeenCalled();
    expect(JSON.stringify(out)).not.toContain('private');
  });
  it.each([null, {}, 'not rows'])('rejects non-array reader output %j', async value => {
    expect(await lookup(value)).toMatchObject({ state: 'unavailable', reason: 'exercise_rows_invalid' });
  });
  it('rejects cycles and a lone oversized row without publishing partial JSON', async () => {
    const cycle = canonicalRow(); cycle.description = cycle;
    expect(await lookup([cycle])).toMatchObject({ state: 'unavailable', reason: 'exercise_rows_invalid' });
    const large = await lookup([canonicalRow(1, { description: 'é'.repeat(5000) })]);
    expect(large).toEqual({ toolId: 'exercise_lookup', state: 'unavailable', reason: 'exercise_payload_limit' });
  });
  it('retains the longest complete UTF8 prefix and the requested row cap independently', async () => {
    const rows = Array.from({ length: 5 }, (_, i) => canonicalRow(i + 1, { description: 'é'.repeat(900) }));
    const formatted = rows.map(formatLibraryExercise);
    let count = 0;
    while (count < rows.length && Buffer.byteLength(JSON.stringify(formatted.slice(0, count + 1)), 'utf8') <= 8192) count++;
    expect(count).toBeGreaterThan(1); expect(count).toBeLessThan(rows.length);
    const out = await lookup(rows);
    expect(out.payload).toEqual(formatted.slice(0, count));
    expect(out.rows).toBe(count); expect(out.truncated).toBe(true);
    expect(out.bytes).toBe(Buffer.byteLength(JSON.stringify(out.payload), 'utf8'));
    const limited = await exerciseLookupTool({ sequelize: canonicalSequelize, query: 'move', limit: 2, deps: { exerciseReader: async () => rows } });
    expect(limited.payload).toEqual(formatted.slice(0, 2)); expect(limited.truncated).toBe(true);
  });
  it('direct reader rejects before lookup and retires both resolved and rejected uncancellable reads', async () => {
    const already = new AbortController(); already.abort();
    await expect(readCoachExerciseLibrary(canonicalSequelize, 'move', 1, { signal: already.signal })).rejects.toMatchObject({ reasonCode: 'request_cancelled' });
    expect(getModel).not.toHaveBeenCalled(); expect(canonicalExercise.findAll).not.toHaveBeenCalled();
    for (const rejected of [false, true]) {
      let finish; const controller = new AbortController();
      canonicalExercise.findAll.mockImplementationOnce(() => new Promise((resolve, reject) => { finish = rejected ? reject : resolve; }));
      const pending = readCoachExerciseLibrary(canonicalSequelize, 'move', 1, { signal: controller.signal });
      controller.abort(); finish(rejected ? new Error('private cancelled SQL') : [canonicalRow()]);
      await expect(pending).rejects.toMatchObject({ reasonCode: 'request_cancelled' });
    }
    canonicalExercise.findAll.mockResolvedValueOnce([canonicalRow()]);
    await expect(readCoachExerciseLibrary(canonicalSequelize, 'move', 1)).resolves.toEqual([canonicalRow()]);
  });
  it('tool retires an injected rejected read even when its error is not AbortError', async () => {
    let reject; const controller = new AbortController();
    const pending = exerciseLookupTool({ sequelize: canonicalSequelize, query: 'move', signal: controller.signal, deps: { exerciseReader: () => new Promise((_, fail) => { reject = fail; }) } });
    controller.abort(); reject(new Error('private driver failure'));
    expect(await pending).toEqual({ toolId: 'exercise_lookup', state: 'unavailable', reason: 'request_cancelled' });
  });
  it('direct reader maps non-array, invalid identity, and ordinary SQL failure safely', async () => {
    for (const value of [null, [canonicalRow(1, { isActive: false })]]) {
      canonicalExercise.findAll.mockResolvedValueOnce(value);
      await expect(readCoachExerciseLibrary(canonicalSequelize, 'move', 1)).rejects.toMatchObject({ reasonCode: 'exercise_rows_invalid' });
    }
    canonicalExercise.findAll.mockRejectedValueOnce(new Error('private SQL details'));
    await expect(readCoachExerciseLibrary(canonicalSequelize, 'move', 1)).rejects.toMatchObject({ message: 'exercise_reader_unavailable', reasonCode: 'exercise_reader_unavailable' });
  });
});

it('HR7 rejects every C1 Unicode control before normalization or a reader query', async () => {
  const reader = vi.fn(async () => []);
  for (let code = 0x80; code <= 0x9f; code++) {
    const query = 'be' + String.fromCharCode(code) + 'nch';
    expect(await exerciseLookupTool({ sequelize: canonicalSequelize, query, deps: { exerciseReader: reader } })).toMatchObject({ state: 'unavailable', reason: 'invalid_exercise_query' });
    await expect(readCoachExerciseLibrary(canonicalSequelize, query, 1)).rejects.toMatchObject({ reasonCode: 'invalid_exercise_query' });
  }
  expect(reader).not.toHaveBeenCalled(); expect(canonicalExercise.findAll).not.toHaveBeenCalled();
});
