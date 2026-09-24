import { beforeAll, beforeEach, afterAll, expect, test, vi } from 'vitest';
import { DataTypes } from 'sequelize';
import db from '../helpers/coachTestDatabase.mjs';
vi.mock('../../database.mjs', async () => ({ default: (await import('../helpers/coachTestDatabase.mjs')).default }));
vi.mock('../../models/index.mjs', () => ({ getModel: name => db.models[name] }));
vi.mock('../../utils/logger.mjs', () => ({ default: { info() {}, warn() {}, error() {}, debug() {} } }));
import { runCoachInference } from '../../services/ai/coachInferenceBoundary.mjs';
import { buildCoachContext } from '../../services/ai/contextEngine/coachContextEngine.mjs';
import { exerciseLookupTool, progressEvidenceTool, recentWorkoutTool } from '../../services/ai/coachEvidenceTools.mjs';
import { forgetFact, purgeDueFacts, detectFactConflicts } from '../../services/coachFactMemoryPolicy.mjs';
import { approveFact, getActiveFactsForContext } from '../../services/coachFactService.mjs';
let User, CanonicalExercise, Session, Log, Fact;
beforeAll(async () => {
  await db.authenticate();
  User = db.define('User', { id: { type: DataTypes.INTEGER, primaryKey: true } }, { tableName:'Users', timestamps:false });
  await User.sync();
  await db.query('CREATE TABLE IF NOT EXISTS ai_privacy_profiles ("userId" INTEGER PRIMARY KEY, "aiEnabled" BOOLEAN NOT NULL, "withdrawnAt" TIMESTAMP)');
  await db.query('CREATE TABLE IF NOT EXISTS sessions (id INTEGER PRIMARY KEY)');
  await db.query('CREATE TABLE IF NOT EXISTS workout_plans (id UUID PRIMARY KEY)');
  await db.query('CREATE TABLE IF NOT EXISTS workout_plan_days (id UUID PRIMARY KEY)');
  Session=(await import('../../models/WorkoutSession.mjs')).default;
  Log=(await import('../../models/WorkoutLog.mjs')).default;
  CanonicalExercise=(await import('../../models/Exercise.mjs')).default;
  const WorkoutExercise=(await import('../../models/WorkoutExercise.mjs')).default;
  const Set=(await import('../../models/Set.mjs')).default;
  Fact=(await import('../../models/CoachFact.mjs')).default;
  await CanonicalExercise.sync(); await Session.sync(); await Log.sync(); await WorkoutExercise.sync(); await Set.sync(); await Fact.sync();
  // An unrelated body measurement intentionally says kg. Lifting units must
  // never inherit this value; the canonical logger contract records lbs.
  await db.query('CREATE TABLE IF NOT EXISTS body_measurements ("userId" INTEGER, "weightUnit" TEXT, "measurementDate" TIMESTAMP, "createdAt" TIMESTAMP)');
});
beforeEach(async () => {
  await db.query('TRUNCATE "Users" CASCADE');
  await db.query('TRUNCATE body_measurements');
  await db.query('TRUNCATE ai_privacy_profiles');
  await CanonicalExercise.destroy({ where: {}, truncate: true, cascade: true, restartIdentity: true });
  await User.bulkCreate([{id:7},{id:42},{id:43}]);
});
afterAll(async () => { await db.close(); });
async function workout(userId=42, date=new Date(), reps=5, weight=100) {
  const session=await Session.create({userId,title:'Synthetic squat session',date,status:'completed'});
  await Log.create({sessionId:session.id,exerciseName:'Squat',setNumber:1,reps,weight});
  return session;
}
async function fact(status='active', extra={}) {
  return Fact.create({userId:42,category:'preference',statement:'Prefers morning sessions',validFrom:'2026-09-01',sourceType:'trainer_manual',createdByUserId:7,status,...extra});
}

async function canonicalExercise({ id, name, exercise_key, isActive = true }) {
  return CanonicalExercise.create({
    id,
    name,
    exercise_key,
    isActive,
    description: `${name} description`,
    instructions: `${name} instructions`,
    exerciseType: 'compound',
    primaryMuscles: ['chest'],
    difficulty: 1,
  });
}

test('HR7 default reader returns canonical active Exercise identity and excludes inactive rows', async () => {
  await canonicalExercise({
    id: '33333333-3333-4333-8333-333333333333',
    name: 'Barbell Bench Press',
    exercise_key: 'barbell-bench-press',
  });
  await canonicalExercise({
    id: '44444444-4444-4444-8444-444444444444',
    name: 'Inactive Bench Press',
    exercise_key: 'inactive-bench-press',
    isActive: false,
  });
  const out = await exerciseLookupTool({ sequelize: db, query: 'bench', limit: 10 });
  expect(out.state).toBe('ok');
  expect(out.payload).toEqual(expect.arrayContaining([
    expect.objectContaining({
      id: '33333333-3333-4333-8333-333333333333',
      name: 'Barbell Bench Press',
      exerciseKey: 'barbell-bench-press',
    }),
  ]));
  expect(out.payload).toHaveLength(1);
});

test('HR7 default reader treats LIKE metacharacters literally and returns measured bytes', async () => {
  await canonicalExercise({
    id: '55555555-5555-4555-8555-555555555555',
    name: '100%_Press',
    exercise_key: '100-percent-press',
  });
  await canonicalExercise({
    id: '66666666-6666-4666-8666-666666666666',
    name: '100XAPress',
    exercise_key: '100xapress',
  });
  const out = await exerciseLookupTool({ sequelize: db, query: '100%_', limit: 10 });
  expect(out.state).toBe('ok');
  expect(out.payload).toHaveLength(1);
  expect(out.payload[0].id).toBe('55555555-5555-4555-8555-555555555555');
  expect(out.bytes).toBe(Buffer.byteLength(JSON.stringify(out.payload), 'utf8'));
});

test('HR7 default reader fails closed for a selected canonical row missing exercise_key', async () => {
  await canonicalExercise({
    id: '77777777-7777-4777-8777-777777777777',
    name: 'Legacy Missing Key',
    exercise_key: null,
  });
  const out = await exerciseLookupTool({ sequelize: db, query: 'legacy', limit: 10 });
  expect(out).toMatchObject({ state: 'unavailable', reason: 'exercise_rows_invalid' });
});

test('HR7 default reader aborts before model lookup and publishes no rows', async () => {
  const controller = new AbortController();
  controller.abort();
  const out = await exerciseLookupTool({ sequelize: db, query: 'bench', signal: controller.signal });
  expect(out).toMatchObject({ state: 'unavailable', reason: 'request_cancelled' });
});
test('canonical daily-form logs reach progress with source refs and actual load units', async () => {
  const own=await workout(); await workout(43);
  await db.query('INSERT INTO body_measurements VALUES (42,\'kg\', NOW(), NOW())');
  const out=await progressEvidenceTool({sequelize:db,userId:42});
  expect(out.state).toBe('ok');
  expect(out.payload.recordRefs).toEqual([own.id]);
  expect(out.payload.completedSessionCount).toBe(1);
  expect(out.payload.volumeByExercise.Squat).toEqual({lbs:500});
  expect(out.payload.adherence).toBeNull();
});
test('recent workout SELECT returns real rows rather than silently empty', async () => {
  const own=await workout();
  const out=await recentWorkoutTool({sequelize:db,userId:42});
  expect(out.state).toBe('ok'); expect(out.payload[0].id).toBe(own.id);
});
test('edits and deletes change evidence immediately; other clients never enter it', async () => {
  const own=await workout(); await workout(43);
  await Log.update({weight:120},{where:{sessionId:own.id}});
  const out=await progressEvidenceTool({sequelize:db,userId:42});
  expect(out.payload.volumeByExercise.Squat).toEqual({lbs:600});
  await Log.destroy({where:{sessionId:own.id}}); await own.destroy();
  expect((await progressEvidenceTool({sequelize:db,userId:42})).state).toBe('empty');
});
test.each(['progress', 'recent', 'context'])('HR1-5 future completed records cannot enter %s workout evidence', async lane => {
  await workout(42,new Date(Date.now()+7*86400000));
  if (lane === 'progress') expect((await progressEvidenceTool({sequelize:db,userId:42})).state).toBe('empty');
  if (lane === 'recent') expect((await recentWorkoutTool({sequelize:db,userId:42})).state).toBe('empty');
  if (lane === 'context') {
    const context=await buildCoachContext({user:{id:7,role:'admin'},targetClientId:42,sequelize:db});
    expect(context.context.workoutCount).toBe(0);
    expect(context.context.lastWorkoutDate).toBeNull();
    expect(context.context.recentExercises).toEqual([]);
  }
});

test('completed sessions without set rows are counted without invented zero volume', async () => {
  const own=await Session.create({userId:42,title:'Timed workout',date:new Date(),status:'completed'});
  const out=await progressEvidenceTool({sequelize:db,userId:42});
  expect(out.payload.recordRefs).toEqual([own.id]);
  expect(out.payload.volumeByExercise).toEqual({});
  expect(out.payload.missingInputs).toContain('workout_set_records');
});
test('purge uses the real operator and returns actual deleted count', async () => {
  const old=await fact('invalidated',{forgottenAt:new Date(Date.now()-2*86400000),purgeAfterAt:new Date(Date.now()-86400000)});
  const future=await fact('invalidated',{forgottenAt:new Date(),purgeAfterAt:new Date(Date.now()+86400000)});
  const live=await fact();
  expect(await purgeDueFacts()).toEqual({purged:1});
  expect(await Fact.findByPk(old.id)).toBeNull();
  expect(await Fact.findByPk(future.id)).not.toBeNull();
  expect(await Fact.findByPk(live.id)).not.toBeNull();
});
test('forgetting a proposed fact prevents subsequent approval from resurrecting it', async () => {
  const row=await fact('proposed');
  await forgetFact({factId:row.id,byUserId:7});
  await expect(approveFact({factId:row.id,approverUserId:7})).rejects.toMatchObject({statusCode:409});
  expect(await getActiveFactsForContext({userId:42})).toEqual([]);
});
test('forget and approve racing cannot leave a retrievable fact', async () => {
  const row=await fact('proposed');
  await Promise.allSettled([forgetFact({factId:row.id,byUserId:7}),approveFact({factId:row.id,approverUserId:7})]);
  expect(await getActiveFactsForContext({userId:42})).toEqual([]);
});
test('conflict detection reads the real statement field', async () => {
  const row=await fact();
  const out=detectFactConflicts({facts:[row],authoritative:{preference:'Prefers evening sessions'}});
  expect(out.conflicts).toHaveLength(1);
  expect(out.conflicts[0].factClaim).toBe(row.statement);
});

test('memory retrieval excludes expired and not-yet-valid facts',async()=>{
  const day=offset=>new Date(Date.now()+offset*86400000).toISOString().slice(0,10);
  await fact('active',{statement:'Past only',validFrom:day(-10),validTo:day(-1)});
  await fact('active',{statement:'Future only',validFrom:day(1)});
  const current=await fact('active',{statement:'Valid today',validFrom:day(-1),validTo:day(1)});
  expect((await getActiveFactsForContext({userId:42})).map(row=>row.id)).toEqual([current.id]);
});
test('forget migration up and down are idempotent against real PostgreSQL',async()=>{
  const {default:migration}=await import('../../migrations/20260911000000-add-coach-fact-forget-purge.cjs');
  const {default:Sequelize}=await import('sequelize');
  const qi=db.getQueryInterface(); const row=await fact();
  await migration.down(qi,Sequelize);await migration.down(qi,Sequelize);
  expect((await qi.describeTable('coach_facts')).forgottenAt).toBeUndefined();
  await migration.up(qi,Sequelize);await migration.up(qi,Sequelize);
  expect((await qi.describeTable('coach_facts')).forgottenAt).toBeDefined();
  expect((await Fact.findByPk(row.id)).statement).toBe(row.statement);
});

test.each([
  ['backslash', String.raw`Band\Row`, 'BandRow'],
  ['quote', "Coach's Press", 'Coachs Press'],
  ['injection-shaped literal', "Press' OR 1=1 --", 'Unrelated Press'],
])('HR7 canonical PG search treats %s literally', async (_label, name, decoy) => {
  const selected = await canonicalExercise({ id: '11111111-1111-4111-8111-111111111111', name, exercise_key: 'literal-selected' });
  await canonicalExercise({ id: '22222222-2222-4222-8222-222222222222', name: decoy, exercise_key: 'literal-decoy' });
  const out = await exerciseLookupTool({ sequelize: db, query: name, limit: 1 });
  expect(out.state).toBe('ok'); expect(out.payload.map(row => row.id)).toEqual([selected.id]);
  expect(await CanonicalExercise.count()).toBe(2);
});

test('HR7 canonical PG applies requested limit and deterministic name then id order in one SELECT', async () => {
  for (const [index, letter] of ['C', 'A', 'B'].entries()) {
    await canonicalExercise({ id: `88888888-8888-4888-8888-${String(index + 1).padStart(12, '0')}`, name: `Ordered ${letter}`, exercise_key: `ordered-${letter}` });
  }
  const querySpy = vi.spyOn(db, 'query');
  try {
    const out = await exerciseLookupTool({ sequelize: db, query: 'Ordered', limit: 2 });
    expect(out.payload.map(row => row.name)).toEqual(['Ordered A', 'Ordered B']);
    expect(querySpy).toHaveBeenCalledTimes(1);
    const sql = querySpy.mock.calls[0][0];
    expect(sql).toMatch(/ORDER BY "Exercise"\."name" ASC, "Exercise"\."id" ASC LIMIT 2/);
    expect(sql).toMatch(/^SELECT /);
    // Exercise.name is uniquely constrained: an actual same-name tie cannot
    // exist in this canonical schema. The emitted secondary order is verified.
  } finally { querySpy.mockRestore(); }
});

test('HR7 canonical PG exercise edits and deletes are visible on the next uncached read', async () => {
  const selected = await canonicalExercise({ id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', name: 'Original Bench Press', exercise_key: 'original-bench' });
  expect((await exerciseLookupTool({ sequelize: db, query: 'bench' })).payload[0].exerciseKey).toBe('original-bench');
  await selected.update({ name: 'Updated Bench Press', exercise_key: 'updated-bench' });
  const changed = await exerciseLookupTool({ sequelize: db, query: 'bench' });
  expect(changed.payload[0]).toMatchObject({ id: selected.id, name: 'Updated Bench Press', exerciseKey: 'updated-bench' });
  await selected.destroy();
  expect(await exerciseLookupTool({ sequelize: db, query: 'bench' })).toMatchObject({ state: 'empty', rows: 0, payload: [] });
});

test('HR7 T08 real inference default tools/reader/model send canonical quoted exercise evidence and execute zero writes', async () => {
  const selected = await canonicalExercise({ id: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', name: 'Canonical Bench Press', exercise_key: 'canonical-bench' });
  await canonicalExercise({ id: 'cccccccc-cccc-4ccc-8ccc-cccccccccccc', name: 'Inactive Bench Press', exercise_key: 'inactive-bench', isActive: false });
  const providerGenerate = vi.fn(async () => ({ ok: true, content: 'Canonical reference available.' }));
  const querySpy = vi.spyOn(db, 'query');
  const exerciseSpy = vi.spyOn(CanonicalExercise, 'findAll');
  try {
    // Explicit unscoped staff chat has no personal subject. Production consent
    // SQL still runs; only the provider recorder and DB/registry seam are faked.
    const out = await runCoachInference({ actor: { id: 7, role: 'trainer' }, sequelize: db, message: 'bench', providerName: 'gemini', providerGenerate });
    expect(out.reasonCode).toBeNull(); expect(out.result.type).toBe('answer');
    expect(out.budget.toolCalls).toBe(1); expect(exerciseSpy).toHaveBeenCalledTimes(1);
    expect(providerGenerate).toHaveBeenCalledTimes(1);
    const finding = out.toolFindings[0];
    expect(finding).toMatchObject({ toolId: 'exercise_lookup', state: 'ok', rows: 1 });
    expect(finding.payload[0]).toMatchObject({ id: selected.id, exerciseKey: 'canonical-bench' });
    const messages = providerGenerate.mock.calls[0][0];
    expect(messages[0].content).toContain('QUOTED DATA'); expect(messages[0].content).toContain('[exercise_lookup: ok]');
    expect(messages[0].content).toContain(selected.id); expect(messages[0].content).not.toContain('inactive-bench');
    expect(messages[1]).toEqual({ role: 'user', content: 'bench' });
    expect(querySpy.mock.calls.length).toBeGreaterThan(1);
    expect(querySpy.mock.calls.every(([sql]) => typeof sql === 'string' && /^SELECT /.test(sql))).toBe(true);
  } finally { querySpy.mockRestore(); exerciseSpy.mockRestore(); }
});

test.each(['actor', 'disabled consent', 'withdrawn consent'])('HR7 T08 denied %s prevents real library read and provider egress', async mode => {
  if (mode !== 'actor') await db.query('INSERT INTO ai_privacy_profiles ("userId", "aiEnabled", "withdrawnAt") VALUES (7, :enabled, :withdrawn)', { replacements: { enabled: mode !== 'disabled consent', withdrawn: mode === 'withdrawn consent' ? new Date() : null } });
  const providerGenerate = vi.fn();
  const querySpy = vi.spyOn(db, 'query');
  const exerciseSpy = vi.spyOn(CanonicalExercise, 'findAll');
  try {
    const out = await runCoachInference({ actor: { id: 7, role: mode === 'actor' ? 'unknown' : 'trainer' }, sequelize: db, message: 'bench', providerName: 'gemini', providerGenerate });
    expect(out.reasonCode).toBe('CONTEXT_ACCESS_DENIED'); expect(out.toolFindings).toEqual([]);
    expect(exerciseSpy).not.toHaveBeenCalled(); expect(providerGenerate).not.toHaveBeenCalled();
    expect(querySpy.mock.calls.every(([sql]) => typeof sql === 'string' && /^SELECT /.test(sql))).toBe(true);
    if (mode === 'actor') expect(querySpy).not.toHaveBeenCalled();
  } finally { querySpy.mockRestore(); exerciseSpy.mockRestore(); }
});

test('HR7 synthetic 1000-row catalog default-reader p95 stays within 250ms and publication caps', async () => {
  await CanonicalExercise.bulkCreate(Array.from({ length: 1000 }, (_, index) => ({
    id: `dddddddd-dddd-4ddd-8ddd-${String(index + 1).padStart(12, '0')}`,
    name: `Benchmark Move ${String(index).padStart(4, '0')}`,
    exercise_key: `benchmark-move-${index}`,
    isActive: true,
    description: 'Synthetic benchmark reference',
    instructions: 'Synthetic benchmark instructions',
    exerciseType: 'compound',
    primaryMuscles: ['chest'],
    difficulty: 1,
  })));
  const lookup = () => exerciseLookupTool({ sequelize: db, query: 'Benchmark', limit: 10 });
  expect((await lookup()).state).toBe('ok'); // one unmeasured warmup
  const samplesMs = []; const rowCounts = []; const byteCounts = [];
  for (let sample = 0; sample < 10; sample++) {
    const started = performance.now();
    const out = await lookup();
    samplesMs.push(performance.now() - started);
    expect(out.state).toBe('ok'); expect(out.rows).toBeGreaterThan(0); expect(out.rows).toBeLessThanOrEqual(10);
    expect(out.bytes).toBe(Buffer.byteLength(JSON.stringify(out.payload), 'utf8')); expect(out.bytes).toBeLessThanOrEqual(8192);
    rowCounts.push(out.rows); byteCounts.push(out.bytes);
  }
  const sorted = [...samplesMs].sort((left, right) => left - right);
  const p95Ms = sorted[Math.ceil(sorted.length * 0.95) - 1];
  process.stdout.write(JSON.stringify({ benchmark: 'hr7-synthetic-catalog', catalogRows: 1000, warmups: 1, samplesMs, p95Ms, rowCounts, byteCounts, budgetMs: 250 }) + '\n');
  expect(p95Ms).toBeLessThanOrEqual(250);
  // Synthetic fixture timing only: this is not production catalog size,
  // concurrency, index-use, or cold-cache performance evidence.
});
