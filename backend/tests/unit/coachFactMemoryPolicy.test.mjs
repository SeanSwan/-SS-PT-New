/**
 * G09/S9 — memory policy tests (T35 forget/purge, T36 private + cross-client
 * scoping, T37 conflict marking). Runs against an in-memory fake of the
 * CoachFact model, matching the adopted coachFactService.test.mjs harness.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';

/** In-memory stand-in for the CoachFact Sequelize model (superset of the
 * adopted harness: adds destroy + lte comparisons for the purge clock). */
function makeFakeModel(seed = []) {
  let nextId = seed.reduce((max, row) => Math.max(max, row.id || 0), 0) + 1;
  const makeInstance = (values) => {
    const inst = { ...values };
    inst.update = vi.fn(async (patch) => {
      Object.assign(inst, patch);
      return inst;
    });
    return inst;
  };
  const rows = seed.map(makeInstance);
  const matches = (row, where = {}) =>
    Object.entries(where).every(([key, want]) => {
      const have = row[key];
      if (want && typeof want === 'object' && !Array.isArray(want) && 'lte' in want) {
        return have != null && new Date(have) <= new Date(want.lte);
      }
      if (Array.isArray(want)) return want.includes(have);
      return have === want;
    });
  return {
    rows,
    async create(values) {
      const inst = makeInstance({ id: nextId++, ...values });
      rows.push(inst);
      return inst;
    },
    async findAll({ where = {}, limit } = {}) {
      const found = rows.filter((row) => matches(row, where));
      return typeof limit === 'number' ? found.slice(0, limit) : found;
    },
    async findByPk(id) {
      return rows.find((row) => row.id === Number(id)) || null;
    },
    async update(values, { where = {} } = {}) {
      const affected = rows.filter((row) => matches(row, where));
      affected.forEach((row) => Object.assign(row, values));
      return [affected.length];
    },
    async destroy({ where = {} } = {}) {
      const affected = rows.filter((row) => matches(row, where));
      for (const row of affected) rows.splice(rows.indexOf(row), 1);
      return affected.length;
    },
  };
}

const holder = vi.hoisted(() => ({ model: null }));

vi.mock('../../models/index.mjs', () => ({
  getModel: () => holder.model,
}));

vi.mock('../../utils/logger.mjs', () => ({
  default: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));

import {
  detectFactConflicts,
  forgetFact,
  getMemoryForTask,
  proposeFactsFromTask,
  purgeDueFacts,
  PURGE_DEADLINE_HOURS,
} from '../../services/coachFactMemoryPolicy.mjs';
import { getActiveFactsForContext } from '../../services/coachFactService.mjs';
import { coachContextCacheKey, setCachedCoachContext, coachContextCacheKeys } from '../../services/ai/coachContextCache.mjs';

function activeFact(overrides = {}) {
  return {
    id: 1,
    userId: 42,
    category: 'preference',
    content: 'prefers morning sessions',
    status: 'active',
    ...overrides,
  };
}

beforeEach(() => {
  holder.model = makeFakeModel();
  setCachedCoachContext(
    coachContextCacheKey({ actorId: 7, targetClientId: 42, role: 'trainer', capability: 'brief' }),
    { state: 'ok', payload: ['stale context containing morning preference'] },
  );
});

describe('G09/T35 — remember, correct, forget with 24h purge', () => {
  it('forget invalidates immediately: retrieval excludes it in the same instant', async () => {
    holder.model.rows.push(activeFact({ id: 1, status: 'active', approvedByUserId: 7 }));
    const before = await getActiveFactsForContext({ userId: 42 });
    expect(before).toHaveLength(1);

    const result = await forgetFact({ factId: 1, byUserId: 7 });
    expect(result.status).toBe('invalidated');
    expect(result.forgottenAt).toBeTruthy();
    expect(new Date(result.purgeAfterAt) - new Date(result.forgottenAt))
      .toBe(PURGE_DEADLINE_HOURS * 60 * 60 * 1000);

    const after = await getActiveFactsForContext({ userId: 42 });
    expect(after).toHaveLength(0);
  });

  it('forget drops the client cached context entries (stale cache cannot resurrect)', async () => {
    holder.model.rows.push(activeFact({ id: 2, status: 'active', approvedByUserId: 7 }));
    expect(coachContextCacheKeys().length).toBe(1);

    await forgetFact({ factId: 2, byUserId: 7 });

    expect(coachContextCacheKeys().length).toBe(0);
  });

  it('purgeDueFacts hard-destroys only rows past their 24h deadline', async () => {
    holder.model.rows.push(
      activeFact({ id: 3, status: 'invalidated', purgeAfterAt: new Date(Date.now() - 1000) }),
      activeFact({ id: 4, status: 'invalidated', purgeAfterAt: new Date(Date.now() + 60_000) }),
    );

    const out = await purgeDueFacts({});
    expect(out.purged).toBe(1);
    expect(holder.model.rows.map((row) => row.id)).toEqual([4]);
  });

  it('hostile round 1: forget works for non-active facts too (privacy deletion)', async () => {
    // A PROPOSED fact was never retrievable, but it still holds the client's
    // content — a privacy delete must tombstone and schedule its purge.
    holder.model.rows.push(activeFact({ id: 20, status: 'proposed' }));
    const proposedForget = await forgetFact({ factId: 20, byUserId: 7 });
    expect(proposedForget.forgottenAt).toBeTruthy();
    expect(new Date(proposedForget.purgeAfterAt).getTime())
      .toBeGreaterThan(new Date(proposedForget.forgottenAt).getTime());
    // Status untouched: forget never activates and never rewrites history.
    expect(proposedForget.status).toBe('proposed');

    // An already-superseded (invalidated) fact can also be forgotten.
    holder.model.rows.push(activeFact({ id: 21, status: 'invalidated' }));
    const invalidatedForget = await forgetFact({ factId: 21, byUserId: 7 });
    expect(invalidatedForget.status).toBe('invalidated');
    expect(invalidatedForget.purgeAfterAt).toBeTruthy();
  });

  it('hostile round 1: forget requires a human actor and rejects unknown facts', async () => {
    holder.model.rows.push(activeFact({ id: 22, status: 'active' }));
    await expect(forgetFact({ factId: 22, byUserId: null })).rejects.toThrow(/human actor/i);
    await expect(forgetFact({ factId: 999, byUserId: 7 })).rejects.toThrow(/not found/i);
    // Nothing was mutated by the rejected calls.
    expect(holder.model.rows[0].forgottenAt).toBeUndefined();
  });

  it('correcting a fact supersedes the old version (versioned edits)', async () => {
    // S1 lifecycle: correct = new version + invalidate(old, supersededBy=new).
    holder.model.rows.push(activeFact({ id: 5, status: 'active', approvedByUserId: 7, content: 'prefers morning sessions' }));
    holder.model.rows.push(activeFact({ id: 6, status: 'proposed', content: 'prefers evening sessions' }));
    const { invalidateFact, approveFact } = await import('../../services/coachFactService.mjs');
    await approveFact({ factId: 6, approverUserId: 7 });
    const superseded = await invalidateFact({ factId: 5, byUserId: 7, supersededByFactId: 6 });

    expect(superseded.status).toBe('invalidated');
    expect(superseded.invalidatedByFactId).toBe(6);
    const active = await getActiveFactsForContext({ userId: 42 });
    expect(active.map((fact) => fact.content)).toEqual(['prefers evening sessions']);
  });
});

describe('G09/T36 — private tasks and cross-client scoping', () => {
  it('private task extraction performs zero durable writes', async () => {
    const out = await proposeFactsFromTask({
      taskPrivate: true,
      userId: 42,
      createdByUserId: 7,
      facts: [{ category: 'preference', content: 'secret detail' }],
    });
    expect(out.created).toBe(0);
    expect(out.disabled).toBe('private_task');
    expect(holder.model.rows).toHaveLength(0);
  });

  it('private task retrieval returns an explicit empty result', async () => {
    holder.model.rows.push(activeFact({ id: 8, status: 'active', approvedByUserId: 7 }));
    const memory = await getMemoryForTask({ actorId: 7, targetUserId: 42, taskPrivate: true });
    expect(memory.facts).toEqual([]);
    expect(memory.disabled).toBe('private_task');
  });

  it('task memory never leaks another client’s facts', async () => {
    holder.model.rows.push(
      activeFact({ id: 9, userId: 42, status: 'active', approvedByUserId: 7 }),
      activeFact({ id: 10, userId: 99, status: 'active', approvedByUserId: 7, content: 'other client fact' }),
    );
    const memory = await getMemoryForTask({ actorId: 7, targetUserId: 42, taskPrivate: false });
    expect(memory.facts).toHaveLength(1);
    expect(memory.facts[0].userId).toBe(42);
    expect(memory.facts.some((fact) => fact.userId === 99)).toBe(false);
  });

  it('hostile round 2: cap 0 means zero facts, not the default cap', async () => {
    holder.model.rows.push(activeFact({ id: 15, userId: 42, status: 'active', approvedByUserId: 7 }));
    const zero = await getMemoryForTask({ actorId: 7, targetUserId: 42, cap: 0 });
    expect(zero.facts).toEqual([]);
    const one = await getMemoryForTask({ actorId: 7, targetUserId: 42, cap: 1 });
    expect(one.facts).toHaveLength(1);
  });
});

describe('G09/T37 — stale memory vs authoritative record', () => {
  it('flags the conflict and resolves to the authoritative value without mutating', () => {
    holder.model.rows.push(
      activeFact({ id: 11, userId: 42, status: 'active', category: 'schedule_pattern', content: 'travels alternate weeks', approvedByUserId: 7 }),
    );
    const { conflicts } = detectFactConflicts({
      facts: holder.model.rows,
      authoritative: { schedule_pattern: 'travels every week now' },
    });

    expect(conflicts).toHaveLength(1);
    expect(conflicts[0].factId).toBe(11);
    expect(conflicts[0].resolution).toBe('use_authoritative_record');
    // No silent mutation: the fact row is untouched.
    expect(holder.model.rows[0].content).toBe('travels alternate weeks');
    expect(holder.model.rows[0].status).toBe('active');
  });

  it('facts matching the authoritative record are not conflicts', () => {
    holder.model.rows.push(
      activeFact({ id: 12, category: 'preference', content: 'Prefers Morning Sessions', status: 'active' }),
    );
    const { conflicts } = detectFactConflicts({
      facts: holder.model.rows,
      authoritative: { preference: 'prefers morning sessions' },
    });
    expect(conflicts).toHaveLength(0);
  });
});
