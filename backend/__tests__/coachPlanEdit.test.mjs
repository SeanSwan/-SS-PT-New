/**
 * Swan Coach plan_edit — the trust core.
 * 1) The doctrine referee is DETERMINISTIC: every proposed acute variable is
 *    checked against the frozen NASM_OPT_PHASES table, not the LLM's claims.
 * 2) Per-item approval: ONLY the trainer-approved subset applies; explicit ids
 *    are required; unknown ids and foreign plans are refused.
 */
import { describe, it, expect, vi } from 'vitest';

vi.mock('../database.mjs', () => ({
  default: {
    transaction: vi.fn(async (operation) => operation({ LOCK: { UPDATE: 'UPDATE' } })),
  },
}));
import { checkPlanEditItem, stampDoctrineVerdicts } from '../services/ai/planEditDoctrineService.mjs';
import { applyPlanEditProposal } from '../services/ai/coachPlanEditApprovalService.mjs';

describe('planEditDoctrineService — the deterministic referee', () => {
  it('validates acute variables against the real OPT phase ranges', () => {
    // Phase 3 (Hypertrophy): sets 3-5, reps 6-12, tempo 2-0-2, rest 0-60s, 75-85%.
    expect(checkPlanEditItem({ field: 'sets', toValue: 4 }, 3).verdict).toBe('in_doctrine');
    expect(checkPlanEditItem({ field: 'sets', toValue: 6 }, 3).verdict).toBe('out_of_doctrine');
    expect(checkPlanEditItem({ field: 'reps', toValue: '8-12' }, 3).verdict).toBe('in_doctrine');
    expect(checkPlanEditItem({ field: 'reps', toValue: '15-20' }, 3).verdict).toBe('out_of_doctrine');
    expect(checkPlanEditItem({ field: 'tempo', toValue: '2-0-2' }, 3).verdict).toBe('in_doctrine');
    expect(checkPlanEditItem({ field: 'tempo', toValue: 'whatever' }, 3).verdict).toBe('out_of_doctrine');
    expect(checkPlanEditItem({ field: 'restSeconds', toValue: 45 }, 3).verdict).toBe('in_doctrine');
    expect(checkPlanEditItem({ field: 'restSeconds', toValue: 240 }, 3).verdict).toBe('out_of_doctrine');
    expect(checkPlanEditItem({ field: 'targetIntensity', toValue: 80 }, 3).verdict).toBe('in_doctrine');
    expect(checkPlanEditItem({ field: 'targetIntensity', toValue: 95 }, 3).verdict).toBe('out_of_doctrine');
  });

  it('shows the doctrine range in every verdict (the trainer sees the WHY)', () => {
    const check = checkPlanEditItem({ field: 'reps', toValue: '15' }, 3);
    expect(check.doctrine).toMatch(/Phase 3/);
    expect(check.doctrine).toMatch(/6-12/);
  });

  it('never silently skips: non-numeric fields come back unchecked, not approved', () => {
    expect(checkPlanEditItem({ field: 'exerciseSwap', toValue: 'Trap Bar Deadlift' }, 3).verdict).toBe('unchecked');
    expect(checkPlanEditItem({ field: 'mystery', toValue: 1 }, 3).verdict).toBe('unchecked');
  });

  it('stamps every item and OVERWRITES any model-authored verdict', () => {
    const items = stampDoctrineVerdicts(
      [{ id: 'e1', field: 'sets', toValue: 4, doctrineCheck: { verdict: 'in_doctrine', doctrine: 'FORGED' } },
       { id: 'e2', field: 'sets', toValue: 9 }],
      3,
    );
    expect(items[0].doctrineCheck.doctrine).not.toBe('FORGED');
    expect(items[1].doctrineCheck.verdict).toBe('out_of_doctrine');
  });
});

const PLAN_ID = '33333333-3333-4333-8333-333333333333';

const buildPlan = () => {
  const record = {
    id: PLAN_ID,
    userId: 42,
    planData: {
      weeks: [{
        weekNumber: 2,
        days: [{
          dayNumber: 1,
          exercises: [
            { exerciseName: 'Deadlift', sets: 3, targetReps: '8', tempo: '2-0-2', restSeconds: 60 },
            { exerciseName: 'Push-Up', sets: 3, targetReps: '12' },
          ],
        }],
      }],
    },
  };
  return {
    record,
    update: vi.fn(async (fields) => Object.assign(record, fields)),
    toJSON() { return JSON.parse(JSON.stringify(record)); },
  };
};

const proposalWith = (items) => ({ payload: { planId: PLAN_ID, clientId: 42, phase: 3, items } });

const ITEMS = [
  { id: 'e1', weekNumber: 2, dayNumber: 1, exerciseName: 'Deadlift', field: 'sets', fromValue: 3, toValue: 4 },
  { id: 'e2', weekNumber: 2, dayNumber: 1, exerciseName: 'Deadlift', field: 'tempo', fromValue: '2-0-2', toValue: '3-1-2' },
  { id: 'e3', weekNumber: 2, dayNumber: 1, exerciseName: 'Push-Up', field: 'reps', fromValue: '12', toValue: '10' },
];

const run = (plan, items, approvedItemIds) => {
  const WorkoutPlan = {
    findOne: vi.fn(async ({ where }) => (
      where.id === PLAN_ID && where.userId === 42 ? plan : null
    )),
    findByPk: vi.fn(async (id) => (id === PLAN_ID ? plan : null)),
  };
  return applyPlanEditProposal({
    proposal: proposalWith(items),
    req: { body: { approvedItemIds } },
    models: { WorkoutPlan },
  });
};

describe('applyPlanEditProposal — per-item approval', () => {
  it('applies ONLY the approved subset; the rest is recorded as skipped, untouched', async () => {
    const plan = buildPlan();
    const out = await run(plan, ITEMS, ['e1', 'e3']);

    expect(out.ok).toBe(true);
    expect(out.result.appliedCount).toBe(2);
    expect(out.result.skippedCount).toBe(1);
    const applied = plan.update.mock.calls[0][0].planData;
    const [deadlift, pushup] = applied.weeks[0].days[0].exercises;
    expect(deadlift.sets).toBe(4);            // e1 approved -> applied
    expect(deadlift.tempo).toBe('2-0-2');     // e2 NOT approved -> untouched
    expect(pushup.targetReps).toBe('10');     // e3 approved -> applied
  });

  it('REQUIRES an explicit approved-ids list — no list, no write', async () => {
    const plan = buildPlan();
    const out = await run(plan, ITEMS, undefined);
    expect(out.ok).toBe(false);
    expect(out.code).toBe('PLAN_EDIT_APPROVED_ITEMS_REQUIRED');
    expect(plan.update).not.toHaveBeenCalled();
  });

  it('approve-none is valid: records every item as skipped and writes nothing', async () => {
    const plan = buildPlan();
    const out = await run(plan, ITEMS, []);
    expect(out.ok).toBe(true);
    expect(out.result.appliedCount).toBe(0);
    expect(out.result.skippedCount).toBe(3);
    expect(plan.update).not.toHaveBeenCalled();
  });

  it('refuses ids that are not in the proposal (no smuggled items)', async () => {
    const out = await run(buildPlan(), ITEMS, ['e1', 'forged-99']);
    expect(out.ok).toBe(false);
    expect(out.code).toBe('PLAN_EDIT_UNKNOWN_ITEM_ID');
  });

  it('SECURITY: plan ownership is in the query — a foreign plan id is not found', async () => {
    const findOne = vi.fn(async () => null); // clientId mismatch -> Sequelize returns null
    const out = await applyPlanEditProposal({
      proposal: proposalWith(ITEMS),
      req: { body: { approvedItemIds: ['e1'] } },
      models: { WorkoutPlan: { findOne } },
    });
    expect(out.ok).toBe(false);
    expect(out.code).toBe('PLAN_EDIT_PLAN_NOT_FOUND');
    expect(findOne.mock.calls[0][0].where).toMatchObject({ id: PLAN_ID, userId: 42 });
  });

  it('a vanished target is a per-item failure, not a crash — other items still apply', async () => {
    const plan = buildPlan();
    const items = [...ITEMS, { id: 'e4', weekNumber: 9, dayNumber: 9, exerciseName: 'Ghost', field: 'sets', toValue: 3 }];
    const out = await run(plan, items, ['e1', 'e4']);
    expect(out.ok).toBe(true);
    expect(out.result.appliedCount).toBe(1);
    expect(out.result.failedCount).toBe(1);
    expect(out.result.itemOutcomes.find((o) => o.id === 'e4').outcome).toBe('failed_target_not_found');
  });
});
