/**
 * U3 / D-Q3: the generation_runs ops ledger.
 *
 * Every claim must land a 'running' row; success closes it 'completed';
 * failure closes it 'failed'; a reclaim supersedes orphans; and — the defect
 * this fixes — a CLEANUP FAILURE after a failed generation marks the row
 * 'orphaned' and logs, instead of vanishing while the lease stays held.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import io from 'node:fs';

const state = vi.hoisted(() => ({ sprint: null, slots: [], generate: vi.fn(), queries: [], now: new Date('2026-09-15T12:00:00Z') }));
const models = vi.hoisted(() => ({
  sprint: { findOne: vi.fn(), findByPk: vi.fn(), update: vi.fn() },
  slot: { findAll: vi.fn(), findOne: vi.fn(), update: vi.fn(), count: vi.fn() },
  memory: { findAll: vi.fn(), destroy: vi.fn(), bulkCreate: vi.fn(), findOrCreate: vi.fn() },
  week: { findByPk: vi.fn(), findAll: vi.fn() },
  log: { create: vi.fn() },
}));
vi.mock('../../models/index.mjs', () => ({
  getBootcampSprint: () => models.sprint, getSprintWeek: () => models.week,
  getSprintClassSlot: () => models.slot, getSprintExerciseMemory: () => models.memory,
  getBootcampSpaceProfile: () => ({ findOne: vi.fn() }), getBootcampClassLog: () => models.log,
}));
vi.mock('../../database.mjs', () => ({ default: {
  transaction: async fn => fn({ LOCK: { UPDATE: 'UPDATE' } }),
  query: vi.fn(async (sql, opts) => { state.queries.push(String(sql) + ' ::: ' + JSON.stringify(opts?.replacements ?? {})); return [{ now: state.now }]; }),
} }));
vi.mock('../../services/bootcamp/bootcampGenerator.mjs', () => ({ generateBootcampClass: (...args) => state.generate(...args) }));
const { generateSprintClasses } = await import('../../services/bootcamp/sprintGenerator.mjs');
const actor = { userId: 7, role: 'trainer' };
const request = { expectedGenerationVersion: 1, operationId: '11111111-1111-4111-8111-111111111111' };

const slot = (id, weekId) => ({ id, sprintId: 1, weekId, status: 'planned', classFormat: '4x4_r2',
  dayType: 'full_body', exerciseKeys: ['seed-key'], update: vi.fn() });

beforeEach(() => {
  vi.clearAllMocks();
  state.queries = [];
  state.generate.mockImplementation(async () => ({ exercises: [{ exerciseName: 'W', board: 'main', key: 'w' }], stations: [] }));
  state.sprint = { id: 1, trainerId: 7, status: 'draft', generationVersion: 1, metadata: {},
    progressionStrategy: 'linear', durationWeeks: 1, previousSprintId: null, weeks: [],
    update: vi.fn(async values => Object.assign(state.sprint, values)) };
  models.sprint.findOne.mockImplementation(async ({ where }) => where.id === 1 && (where.trainerId == null || where.trainerId === 7) ? state.sprint : null);
  models.memory.findAll.mockResolvedValue([]);
  models.week.findAll.mockImplementation(async () => state.sprint?.weeks ?? []);
  models.slot.findAll.mockImplementation(async () => state.slots);
  models.slot.findOne.mockImplementation(async ({ where }) => state.slots.find(s => s.id === where.id) ?? null);
  models.week.findByPk.mockImplementation(async id => state.sprint.weeks.find(w => w.id === id) ?? null);
  const w = { id: 101, weekNumber: 1, isDeloadWeek: false, intensityModifier: 1.0, classSlots: [] };
  w.classSlots = [slot(11, 101)];
  state.sprint.weeks = [w];
  state.slots = w.classSlots;
});

const dump = () => io.writeFileSync('C:/tmp/rolodex-review-20260913/queries-dump.txt', runSql());

const runSql = () => state.queries.join('\n');

describe('U3: generation_runs ledger', () => {
  it('writes a running row on claim and closes it completed on success', async () => {
    await generateSprintClasses(1, null, actor, request);
    const sql = runSql();
    expect(sql).toMatch(/INSERT INTO generation_runs/s);
    expect(sql).toMatch(/'running'/);
    expect(sql).toMatch(/"status":"completed"/);
  });

  it('closes the row failed when generation throws', async () => {
    state.generate.mockRejectedValue(new Error('registry exploded'));
    await expect(generateSprintClasses(1, null, actor, request)).rejects.toThrow('registry exploded');
    expect(runSql()).toMatch(/"status":"failed"/);
  });

  it('marks superseded ledger rows orphaned when a dead claim is reclaimed', async () => {
    state.sprint.status = 'generating';
    state.sprint.metadata = { generationClaimV1: { expiresAt: '2026-09-13T00:00:00Z' } };
    await generateSprintClasses(1, null, actor, request);
    expect(runSql()).toMatch(/'orphaned'/);
  });

  it('marks the ledger row orphaned when cleanup itself fails (D-Q3)', async () => {
    // withSprintClaim inside finish() must reject so the catch path runs.
    state.sprint.generationVersion = 99;
    await expect(generateSprintClasses(1, null, actor, request)).rejects.toThrow();
    expect(runSql()).toMatch(/'orphaned'/);
  });
});
