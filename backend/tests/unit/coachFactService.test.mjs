/**
 * coachFactService.test.mjs
 * =========================
 * S1 of the Coach Facts durable memory layer (Fable blueprint 2026-08-31).
 *
 * The invariant this suite exists to protect: **the AI may only ever PROPOSE.**
 * A fact reaches `active` — the only status the coach context will ever read —
 * through a human trainer/admin approval, or through a trainer typing it by
 * hand. There is deliberately no code path that activates a machine-authored
 * fact without a human actor, and `refuses to activate a proposed fact without
 * a human actor` below is the test that fails loudly if someone ever adds one.
 *
 * Second invariant: dedup is NORMALIZED, not exact. Extraction re-reads the
 * same conversation window on consecutive turns, so the identical observation
 * arrives repeatedly with drifting punctuation and casing. Exact-match dedup
 * would let "Prefers supersets." and "prefers supersets" both land, and the
 * trainer's review queue becomes noise they stop reading — which silently
 * disables the human gate above rather than announcing it.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

/** In-memory stand-in for the CoachFact Sequelize model. */
function makeFakeModel(seed = []) {
  let nextId = seed.reduce((max, row) => Math.max(max, row.id || 0), 0) + 1;

  const makeInstance = (values) => {
    const inst = { ...values };
    inst.update = vi.fn(async (patch) => {
      Object.assign(inst, patch);
      return inst;
    });
    inst.get = () => ({ ...inst });
    return inst;
  };

  const rows = seed.map(makeInstance);

  const matches = (row, where = {}) =>
    Object.entries(where).every(([key, want]) => {
      const have = row[key];
      if (Array.isArray(want)) return want.includes(have);
      if (want && typeof want === 'object' && Array.isArray(want.in)) return want.in.includes(have);
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
    /** Conditional UPDATE ... WHERE, returning Sequelize's [affectedCount]. */
    async update(values, { where = {} } = {}) {
      const affected = rows.filter((row) => matches(row, where));
      affected.forEach((row) => Object.assign(row, values));
      return [affected.length];
    },
  };
}

/** Hoisted holder: vi.mock factories are lifted above imports and cannot close
 *  over a normal top-level binding. beforeEach swaps the model in per test. */
const holder = vi.hoisted(() => ({ model: null }));

vi.mock('../../models/index.mjs', () => ({
  getModel: () => holder.model,
}));

vi.mock('../../utils/logger.mjs', () => ({
  default: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));

import {
  proposeFacts,
  createManualFact,
  approveFact,
  rejectFact,
  invalidateFact,
  listFacts,
  getActiveFactsForContext,
  CoachFactError,
  FACT_CATEGORIES,
} from '../../services/coachFactService.mjs';

const CLIENT = 7;
const TRAINER = 2;

/** A machine-proposed fact, as factExtractionService will hand it over in S2. */
const proposal = (overrides = {}) => ({
  category: 'preference',
  statement: 'Prefers supersets over straight sets',
  sourceType: 'chat',
  ...overrides,
});

beforeEach(() => {
  holder.model = makeFakeModel();
  vi.clearAllMocks();
});

describe('proposeFacts — the machine-authored entry point', () => {
  it('writes candidates as `proposed`, never `active`', async () => {
    const result = await proposeFacts({
      userId: CLIENT,
      facts: [proposal()],
      createdByUserId: TRAINER,
    });

    expect(result.created).toHaveLength(1);
    expect(result.created[0].status).toBe('proposed');
    expect(result.created[0].approvedByUserId).toBeNull();
    expect(result.created[0].approvedAt).toBeNull();
  });

  it('defaults validFrom to today when the extractor omits it', async () => {
    const { created } = await proposeFacts({
      userId: CLIENT,
      facts: [proposal()],
      createdByUserId: TRAINER,
    });

    expect(created[0].validFrom).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it('drops a normalized duplicate of an existing fact and reports the count', async () => {
    await proposeFacts({ userId: CLIENT, facts: [proposal()], createdByUserId: TRAINER });

    const second = await proposeFacts({
      userId: CLIENT,
      // same claim, drifted punctuation + casing — exactly what re-extraction produces
      facts: [proposal({ statement: '  prefers SUPERSETS over straight sets!! ' })],
      createdByUserId: TRAINER,
    });

    expect(second.created).toHaveLength(0);
    expect(second.dropped).toBe(1);
    expect(holder.model.rows).toHaveLength(1);
  });

  it('dedups within a single batch, not just against the database', async () => {
    const { created, dropped } = await proposeFacts({
      userId: CLIENT,
      facts: [proposal(), proposal({ statement: 'Prefers supersets over straight sets.' })],
      createdByUserId: TRAINER,
    });

    expect(created).toHaveLength(1);
    expect(dropped).toBe(1);
  });

  it('does NOT treat the same statement in a different category as a duplicate', async () => {
    await proposeFacts({ userId: CLIENT, facts: [proposal()], createdByUserId: TRAINER });

    const second = await proposeFacts({
      userId: CLIENT,
      facts: [proposal({ category: 'coaching_cue' })],
      createdByUserId: TRAINER,
    });

    expect(second.created).toHaveLength(1);
  });

  it('does not dedup against a REJECTED fact of another client', async () => {
    await proposeFacts({ userId: CLIENT, facts: [proposal()], createdByUserId: TRAINER });

    const other = await proposeFacts({
      userId: 99,
      facts: [proposal()],
      createdByUserId: TRAINER,
    });

    expect(other.created).toHaveLength(1);
  });

  it('rejects an unknown category rather than writing an unreadable row', async () => {
    await expect(
      proposeFacts({
        userId: CLIENT,
        facts: [proposal({ category: 'astrology' })],
        createdByUserId: TRAINER,
      }),
    ).rejects.toBeInstanceOf(CoachFactError);
  });

  it('rejects an empty statement', async () => {
    await expect(
      proposeFacts({
        userId: CLIENT,
        facts: [proposal({ statement: '   ' })],
        createdByUserId: TRAINER,
      }),
    ).rejects.toBeInstanceOf(CoachFactError);
  });

  it('returns an empty result for an empty batch without touching the table', async () => {
    const result = await proposeFacts({ userId: CLIENT, facts: [], createdByUserId: TRAINER });

    expect(result).toEqual({ created: [], dropped: 0 });
    expect(holder.model.rows).toHaveLength(0);
  });

  it('requires an actor — an unattributed write is refused', async () => {
    await expect(
      proposeFacts({ userId: CLIENT, facts: [proposal()], createdByUserId: null }),
    ).rejects.toBeInstanceOf(CoachFactError);
  });
});

describe('createManualFact — the trainer-authored entry point', () => {
  it('is born active and self-approved, because a human already decided', async () => {
    const fact = await createManualFact({
      userId: CLIENT,
      fact: proposal({ sourceType: 'trainer_manual' }),
      createdByUserId: TRAINER,
    });

    expect(fact.status).toBe('active');
    expect(fact.approvedByUserId).toBe(TRAINER);
    expect(fact.approvedAt).toBeInstanceOf(Date);
  });
});

describe('approval transitions', () => {
  const propose = async () => {
    const { created } = await proposeFacts({
      userId: CLIENT,
      facts: [proposal()],
      createdByUserId: TRAINER,
    });
    return created[0];
  };

  it('approveFact moves proposed -> active and stamps the human approver', async () => {
    const fact = await propose();
    const approved = await approveFact({ factId: fact.id, approverUserId: TRAINER });

    expect(approved.status).toBe('active');
    expect(approved.approvedByUserId).toBe(TRAINER);
    expect(approved.approvedAt).toBeInstanceOf(Date);
  });

  it('rejectFact moves proposed -> rejected', async () => {
    const fact = await propose();
    const rejected = await rejectFact({ factId: fact.id, approverUserId: TRAINER });

    expect(rejected.status).toBe('rejected');
  });

  it('refuses to activate a proposed fact without a human actor', async () => {
    const fact = await propose();

    await expect(approveFact({ factId: fact.id, approverUserId: null })).rejects.toBeInstanceOf(
      CoachFactError,
    );
    expect(holder.model.rows[0].status).toBe('proposed');
  });

  it('approving an already-approved fact is a 409, not a silent re-stamp', async () => {
    const fact = await propose();
    await approveFact({ factId: fact.id, approverUserId: TRAINER });

    const err = await approveFact({ factId: fact.id, approverUserId: 3 }).catch((e) => e);
    expect(err).toBeInstanceOf(CoachFactError);
    expect(err.statusCode).toBe(409);
    // the original approver must survive a losing double-click
    expect(holder.model.rows[0].approvedByUserId).toBe(TRAINER);
  });

  it('a rejected fact cannot be resurrected by approving it', async () => {
    const fact = await propose();
    await rejectFact({ factId: fact.id, approverUserId: TRAINER });

    const err = await approveFact({ factId: fact.id, approverUserId: TRAINER }).catch((e) => e);
    expect(err.statusCode).toBe(409);
  });

  it('a missing fact is a 404, distinct from a bad transition', async () => {
    const err = await approveFact({ factId: 4242, approverUserId: TRAINER }).catch((e) => e);
    expect(err.statusCode).toBe(404);
  });
});

describe('invalidateFact — supersession, not deletion', () => {
  it('marks the old fact invalidated and links the fact that replaced it', async () => {
    const old = await createManualFact({
      userId: CLIENT,
      fact: proposal({ statement: 'Trains Monday and Thursday' }),
      createdByUserId: TRAINER,
    });
    const next = await createManualFact({
      userId: CLIENT,
      fact: proposal({ statement: 'Trains Tuesday and Friday' }),
      createdByUserId: TRAINER,
    });

    const result = await invalidateFact({
      factId: old.id,
      byUserId: TRAINER,
      supersededByFactId: next.id,
      validTo: '2026-08-31',
    });

    expect(result.status).toBe('invalidated');
    expect(result.invalidatedAt).toBeInstanceOf(Date);
    expect(result.invalidatedByFactId).toBe(next.id);
    expect(result.validTo).toBe('2026-08-31');
    // history is preserved, never deleted
    expect(holder.model.rows).toHaveLength(2);
  });

  it('invalidating without a superseding fact is allowed (a fact can simply stop being true)', async () => {
    const fact = await createManualFact({
      userId: CLIENT,
      fact: proposal(),
      createdByUserId: TRAINER,
    });

    const result = await invalidateFact({ factId: fact.id, byUserId: TRAINER });
    expect(result.status).toBe('invalidated');
    expect(result.invalidatedByFactId).toBeNull();
  });

  it('refuses to invalidate a fact that was never active', async () => {
    const { created } = await proposeFacts({
      userId: CLIENT,
      facts: [proposal()],
      createdByUserId: TRAINER,
    });

    const err = await invalidateFact({ factId: created[0].id, byUserId: TRAINER }).catch((e) => e);
    expect(err.statusCode).toBe(409);
  });
});

describe('read paths', () => {
  const seedMixed = async () => {
    const active = await createManualFact({
      userId: CLIENT,
      fact: proposal({ category: 'preference', statement: 'Prefers supersets' }),
      createdByUserId: TRAINER,
    });
    await createManualFact({
      userId: CLIENT,
      fact: proposal({ category: 'injury_constraint', statement: 'Left-knee discomfort on lunges' }),
      createdByUserId: TRAINER,
    });
    await proposeFacts({
      userId: CLIENT,
      facts: [proposal({ statement: 'Travels alternate weeks', category: 'schedule_pattern' })],
      createdByUserId: TRAINER,
    });
    return active;
  };

  it('getActiveFactsForContext returns ONLY active facts — proposals never reach the model', async () => {
    await seedMixed();
    const facts = await getActiveFactsForContext({ userId: CLIENT });

    expect(facts).toHaveLength(2);
    expect(facts.every((f) => f.status === 'active')).toBe(true);
    expect(facts.some((f) => f.statement === 'Travels alternate weeks')).toBe(false);
  });

  it('orders injury_constraint first, because safety context must survive the cap', async () => {
    await seedMixed();
    const facts = await getActiveFactsForContext({ userId: CLIENT });

    expect(facts[0].category).toBe('injury_constraint');
  });

  it('caps the number of facts handed to the prompt', async () => {
    for (let i = 0; i < 40; i += 1) {
      await createManualFact({
        userId: CLIENT,
        fact: proposal({ statement: `Fact number ${i}` }),
        createdByUserId: TRAINER,
      });
    }

    const facts = await getActiveFactsForContext({ userId: CLIENT, cap: 30 });
    expect(facts).toHaveLength(30);
  });

  it('never leaks another client\'s facts', async () => {
    await createManualFact({ userId: CLIENT, fact: proposal(), createdByUserId: TRAINER });
    await createManualFact({ userId: 99, fact: proposal({ statement: 'Other client' }), createdByUserId: TRAINER });

    const facts = await getActiveFactsForContext({ userId: CLIENT });
    expect(facts).toHaveLength(1);
    expect(facts[0].statement).not.toBe('Other client');
  });

  it('listFacts filters by status and category for the review queue', async () => {
    await seedMixed();

    const proposed = await listFacts({ userId: CLIENT, status: 'proposed' });
    expect(proposed).toHaveLength(1);

    const injuries = await listFacts({ userId: CLIENT, category: 'injury_constraint' });
    expect(injuries).toHaveLength(1);
  });
});

describe('the category vocabulary', () => {
  it('exports the same categories the migration enum declares', () => {
    expect(FACT_CATEGORIES).toEqual([
      'injury_constraint',
      'preference',
      'goal_context',
      'lifestyle',
      'equipment',
      'motivation_style',
      'schedule_pattern',
      'coaching_cue',
      'milestone',
    ]);
  });
});

/**
 * Hostile-review round 1 (Opus 5, 2026-08-31). Each test below pins a defect
 * found by attacking the first implementation, not a requirement from the spec.
 */
describe('hostile review — defects found by attacking the first implementation', () => {
  it('listFacts sorts across the WHOLE result set, not just the first page', async () => {
    // DEFECT: the first cut passed `limit` to findAll and sorted afterwards, so
    // the database truncated in insertion order and the priority sort only
    // reordered whatever survived. An injury_constraint recorded late would be
    // cut before the sort could ever promote it — the exact row that must not
    // be lost. Priority must be applied before truncation.
    for (let i = 0; i < 20; i += 1) {
      await createManualFact({
        userId: CLIENT,
        fact: proposal({ category: 'lifestyle', statement: `Filler ${i}` }),
        createdByUserId: TRAINER,
      });
    }
    // recorded LAST, so insertion-order truncation would drop it
    await createManualFact({
      userId: CLIENT,
      fact: proposal({ category: 'injury_constraint', statement: 'Left-knee discomfort' }),
      createdByUserId: TRAINER,
    });

    const page = await listFacts({ userId: CLIENT, limit: 5 });

    expect(page).toHaveLength(5);
    expect(page[0].category).toBe('injury_constraint');
  });

  it('rejects a malformed validFrom instead of handing Postgres a bad date', async () => {
    // DEFECT: validFrom went through unvalidated, so an extractor emitting
    // "yesterday" or "2026-13-45" threw a DB error at INSERT — surfacing as a
    // 500 in an async post-turn hook where nobody would see it.
    await expect(
      proposeFacts({
        userId: CLIENT,
        facts: [proposal({ validFrom: 'yesterday' })],
        createdByUserId: TRAINER,
      }),
    ).rejects.toBeInstanceOf(CoachFactError);

    await expect(
      proposeFacts({
        userId: CLIENT,
        facts: [proposal({ validFrom: '2026-13-45' })],
        createdByUserId: TRAINER,
      }),
    ).rejects.toBeInstanceOf(CoachFactError);
  });

  it('accepts a well-formed validFrom', async () => {
    const { created } = await proposeFacts({
      userId: CLIENT,
      facts: [proposal({ validFrom: '2026-03-01' })],
      createdByUserId: TRAINER,
    });
    expect(created[0].validFrom).toBe('2026-03-01');
  });

  it('refuses to link supersession across two different clients', async () => {
    // DEFECT: supersededByFactId was written unvalidated, so one client's fact
    // could be recorded as superseded by another client's — a cross-client link
    // in the audit trail, and a privacy leak the moment anything renders it.
    const mine = await createManualFact({
      userId: CLIENT,
      fact: proposal(),
      createdByUserId: TRAINER,
    });
    const theirs = await createManualFact({
      userId: 99,
      fact: proposal({ statement: 'Other client fact' }),
      createdByUserId: TRAINER,
    });

    const err = await invalidateFact({
      factId: mine.id,
      byUserId: TRAINER,
      supersededByFactId: theirs.id,
    }).catch((e) => e);

    expect(err).toBeInstanceOf(CoachFactError);
    expect(holder.model.rows.find((r) => r.id === mine.id).status).toBe('active');
  });

  it('refuses to link supersession to a fact that does not exist', async () => {
    const fact = await createManualFact({
      userId: CLIENT,
      fact: proposal(),
      createdByUserId: TRAINER,
    });

    const err = await invalidateFact({
      factId: fact.id,
      byUserId: TRAINER,
      supersededByFactId: 4242,
    }).catch((e) => e);

    expect(err).toBeInstanceOf(CoachFactError);
  });

  it('a fact cannot supersede itself', async () => {
    const fact = await createManualFact({
      userId: CLIENT,
      fact: proposal(),
      createdByUserId: TRAINER,
    });

    const err = await invalidateFact({
      factId: fact.id,
      byUserId: TRAINER,
      supersededByFactId: fact.id,
    }).catch((e) => e);

    expect(err).toBeInstanceOf(CoachFactError);
  });

  it('approval is atomic — a concurrent double-approve cannot overwrite the first approver', async () => {
    // DEFECT: approveFact read the status, then wrote. Two trainers clicking at
    // once both read 'proposed' and both wrote, and the loser's id overwrote the
    // winner's. That field is the audit trail for the human-approval invariant,
    // so a wrong value there discredits the one record the design rests on.
    // The fix is a conditional UPDATE ... WHERE status = 'proposed'.
    const { created } = await proposeFacts({
      userId: CLIENT,
      facts: [proposal()],
      createdByUserId: TRAINER,
    });

    const results = await Promise.allSettled([
      approveFact({ factId: created[0].id, approverUserId: TRAINER }),
      approveFact({ factId: created[0].id, approverUserId: 3 }),
    ]);

    const won = results.filter((r) => r.status === 'fulfilled');
    const lost = results.filter((r) => r.status === 'rejected');
    expect(won).toHaveLength(1);
    expect(lost).toHaveLength(1);
    expect(lost[0].reason.statusCode).toBe(409);
  });

  it('guards the transition in the WHERE clause, not in a prior read', async () => {
    // HONESTY: the test above cannot prove atomicity — the in-memory fake runs
    // single-threaded, so it would pass against the defective read-then-write
    // implementation too. Only a real database exhibits the race. What IS
    // checkable here is the structural property that makes the race impossible:
    // the status guard must travel in the UPDATE's WHERE clause. If someone
    // reverts to read-then-write, `where` loses `status` and this fails.
    const { created } = await proposeFacts({
      userId: CLIENT,
      facts: [proposal()],
      createdByUserId: TRAINER,
    });
    const spy = vi.spyOn(holder.model, 'update');

    await approveFact({ factId: created[0].id, approverUserId: TRAINER });

    expect(spy).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'active' }),
      expect.objectContaining({
        where: expect.objectContaining({ id: created[0].id, status: 'proposed' }),
      }),
    );
  });
});

/** Hostile-review round 2 — attacking the round-1 fixes. */
describe('hostile review round 2 — untrusted paging input', () => {
  const seedFive = async () => {
    for (let i = 0; i < 5; i += 1) {
      await createManualFact({
        userId: CLIENT,
        fact: proposal({ statement: `Fact ${i}` }),
        createdByUserId: TRAINER,
      });
    }
  };

  it('a negative limit does not silently drop the last row', async () => {
    // `limit` arrives from a route query string. Array.slice(0, -1) drops the
    // final element instead of erroring, so ?limit=-1 would return a quietly
    // truncated list that looks legitimate.
    await seedFive();
    const rows = await listFacts({ userId: CLIENT, limit: -1 });
    expect(rows).toHaveLength(0);
  });

  it('a non-numeric limit falls back to the default rather than returning nothing', async () => {
    await seedFive();
    const rows = await listFacts({ userId: CLIENT, limit: 'abc' });
    expect(rows).toHaveLength(5);
  });

  it('a limit above the fetch ceiling cannot claim more rows than were fetched', async () => {
    await seedFive();
    const rows = await listFacts({ userId: CLIENT, limit: 10_000 });
    expect(rows).toHaveLength(5);
  });

  it('a non-numeric context cap falls back to the default', async () => {
    await seedFive();
    const rows = await getActiveFactsForContext({ userId: CLIENT, cap: undefined });
    expect(rows).toHaveLength(5);
  });

  it('a zero cap yields no facts rather than every fact', async () => {
    // A caller disabling the memory block by passing cap=0 must get zero rows,
    // not the whole set via a falsy-default fallback.
    await seedFive();
    const rows = await getActiveFactsForContext({ userId: CLIENT, cap: 0 });
    expect(rows).toHaveLength(0);
  });
});

/**
 * Hostile-review round 3 — the properties that must hold no matter what the
 * extractor sends, because in S2 its input is a language model's output.
 */
describe('hostile review round 3 — adversarial extractor output', () => {
  it('a statement over the length cap is refused, not truncated', async () => {
    await expect(
      proposeFacts({
        userId: CLIENT,
        facts: [proposal({ statement: 'x'.repeat(501) })],
        createdByUserId: TRAINER,
      }),
    ).rejects.toBeInstanceOf(CoachFactError);
  });

  it('a null or non-object fact is refused without writing a partial row', async () => {
    for (const bad of [null, 'a string', 42]) {
      await expect(
        proposeFacts({ userId: CLIENT, facts: [bad], createdByUserId: TRAINER }),
      ).rejects.toBeInstanceOf(CoachFactError);
    }
    expect(holder.model.rows).toHaveLength(0);
  });

  it('one bad fact rejects the WHOLE batch — no partial write', async () => {
    // Validation runs over the entire batch before any insert. A partial write
    // would leave the caller unable to say what landed, and re-running the
    // extractor would double-write whatever succeeded the first time.
    await expect(
      proposeFacts({
        userId: CLIENT,
        facts: [proposal(), proposal({ category: 'astrology' })],
        createdByUserId: TRAINER,
      }),
    ).rejects.toBeInstanceOf(CoachFactError);

    expect(holder.model.rows).toHaveLength(0);
  });

  it('an unknown sourceType is refused', async () => {
    await expect(
      proposeFacts({
        userId: CLIENT,
        facts: [proposal({ sourceType: 'telepathy' })],
        createdByUserId: TRAINER,
      }),
    ).rejects.toBeInstanceOf(CoachFactError);
  });

  it('a statement that is only punctuation normalizes to empty and is refused', async () => {
    // normalizeStatement strips punctuation, so "!!!" would produce an empty
    // dedup key that collides with every other punctuation-only statement.
    await expect(
      proposeFacts({
        userId: CLIENT,
        facts: [proposal({ statement: '!!! ???' })],
        createdByUserId: TRAINER,
      }),
    ).rejects.toBeInstanceOf(CoachFactError);
  });

  it('a negative or zero client id is refused before any query runs', async () => {
    for (const bad of [0, -1, 'abc', null]) {
      await expect(
        proposeFacts({ userId: bad, facts: [proposal()], createdByUserId: TRAINER }),
      ).rejects.toBeInstanceOf(CoachFactError);
    }
  });
});

/**
 * Hostile-review round 4 — the dry pass. Nothing new was expected here; these
 * pin the invariants a future refactor is most likely to break silently.
 */
describe('hostile review round 4 — invariants a refactor must not break', () => {
  it('there is no exported path that produces an active fact from a machine source', async () => {
    // The whole design rests on this. If a future slice adds an auto-approve,
    // this test is the thing that notices.
    const { created } = await proposeFacts({
      userId: CLIENT,
      facts: [
        proposal({ sourceType: 'chat' }),
        proposal({ sourceType: 'dictation', statement: 'Trains early mornings' }),
        proposal({ sourceType: 'workout_log', statement: 'Squat volume trending up' }),
      ],
      createdByUserId: TRAINER,
    });

    expect(created).toHaveLength(3);
    expect(created.every((f) => f.status === 'proposed')).toBe(true);
    expect(await getActiveFactsForContext({ userId: CLIENT })).toHaveLength(0);
  });

  it('a rejected fact never reaches the prompt, even after more proposals arrive', async () => {
    const { created } = await proposeFacts({
      userId: CLIENT,
      facts: [proposal()],
      createdByUserId: TRAINER,
    });
    await rejectFact({ factId: created[0].id, approverUserId: TRAINER });

    // the same claim proposed again is deduped against neither active nor
    // proposed rows (the rejected one is excluded), so it CAN be re-proposed —
    // deliberate: a trainer may reject once and accept later.
    const again = await proposeFacts({
      userId: CLIENT,
      facts: [proposal()],
      createdByUserId: TRAINER,
    });
    expect(again.created).toHaveLength(1);

    expect(await getActiveFactsForContext({ userId: CLIENT })).toHaveLength(0);
  });

  it('an invalidated fact leaves the prompt but stays in the history', async () => {
    const fact = await createManualFact({
      userId: CLIENT,
      fact: proposal(),
      createdByUserId: TRAINER,
    });
    expect(await getActiveFactsForContext({ userId: CLIENT })).toHaveLength(1);

    await invalidateFact({ factId: fact.id, byUserId: TRAINER });

    expect(await getActiveFactsForContext({ userId: CLIENT })).toHaveLength(0);
    expect(await listFacts({ userId: CLIENT })).toHaveLength(1);
  });

  it('the full lifecycle preserves every actor stamp', async () => {
    const { created } = await proposeFacts({
      userId: CLIENT,
      facts: [proposal()],
      createdByUserId: 5,
    });
    const approved = await approveFact({ factId: created[0].id, approverUserId: TRAINER });

    expect(approved.createdByUserId).toBe(5);
    expect(approved.approvedByUserId).toBe(TRAINER);

    const invalidated = await invalidateFact({ factId: approved.id, byUserId: 9 });
    // createdBy and approvedBy must survive invalidation — the audit trail is
    // the point, and overwriting it on the way out would erase who decided.
    expect(invalidated.createdByUserId).toBe(5);
    expect(invalidated.approvedByUserId).toBe(TRAINER);
  });
});
