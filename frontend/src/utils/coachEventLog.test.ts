/**
 * Coach event log + memory projection — the anti-lie laws.
 *
 * The failure these guard: Coach proposes an edit, the trainer switches
 * surfaces, the edit silently failed — and a conversation-shaped memory now
 * holds a belief the database contradicts. Every later proposal compounds it.
 * A confident, continuous lie is worse than amnesia, because amnesia fails
 * visibly.
 */
import { describe, expect, it } from 'vitest';
import {
  CoachEventLog,
  isBelievable,
  isTerminal,
  resolveOutcome,
  type IntentOutcome,
} from './coachEventLog';
import {
  projectCoachMemory,
  summarizeCoachMemory,
  voiceOriginationRate,
} from './coachMemoryProjection';

describe('resolveOutcome', () => {
  // The pre-existing contract returned ONE boolean for two different facts.
  it('distinguishes "nobody listening" from "effector declined"', () => {
    expect(resolveOutcome(false, false)).toBe('unhandled');
    expect(resolveOutcome(true, false)).toBe('noop');
    expect(resolveOutcome(false, false)).not.toBe(resolveOutcome(true, false));
  });

  it('maps a real acknowledgement to applied', () => {
    expect(resolveOutcome(true, true)).toBe('applied');
  });
});

describe('outcome classification', () => {
  it('treats ONLY applied as believable', () => {
    expect(isBelievable('applied')).toBe(true);
    for (const o of ['noop', 'unhandled', 'failed', 'superseded', 'awaiting-confirm'] as IntentOutcome[]) {
      expect(isBelievable(o)).toBe(false);
    }
  });

  it('leaves awaiting-confirm open for reconciliation', () => {
    expect(isTerminal('awaiting-confirm')).toBe(false);
    for (const o of ['applied', 'noop', 'unhandled', 'failed', 'superseded'] as IntentOutcome[]) {
      expect(isTerminal(o)).toBe(true);
    }
  });
});

describe('CoachEventLog', () => {
  it('never rewrites a settled outcome', () => {
    const log = new CoachEventLog();
    const applied = log.record({ name: 'a', inputOrigin: 'voice', clientId: 1, ts: 1, outcome: 'applied' });
    expect(log.reconcile(applied.id, 'failed')).toBe(false);
    expect(log.all()[0].outcome).toBe('applied');
  });

  it('settles a pending intent and records why', () => {
    const log = new CoachEventLog();
    const pending = log.record({ name: 'p', inputOrigin: 'manual', clientId: 1, ts: 1, outcome: 'awaiting-confirm' });
    expect(log.reconcile(pending.id, 'failed', { reason: 'server rejected' })).toBe(true);
    expect(log.all()[0].outcome).toBe('failed');
    expect(log.all()[0].reason).toBe('server rejected');
  });

  it('bounds growth and keeps the newest entries', () => {
    const log = new CoachEventLog({ limit: 3 });
    for (let i = 0; i < 10; i++) {
      log.record({ name: 'x', inputOrigin: 'manual', clientId: 1, ts: i, outcome: 'applied' });
    }
    expect(log.all()).toHaveLength(3);
    expect(log.all()[2].ts).toBe(9);
  });
});

describe('projectCoachMemory', () => {
  const build = () => {
    const log = new CoachEventLog();
    log.record({ name: 'ok',      inputOrigin: 'voice',      clientId: 42, ts: 1, outcome: 'applied' });
    log.record({ name: 'boom',    inputOrigin: 'voice',      clientId: 42, ts: 2, outcome: 'failed' });
    log.record({ name: 'nolisten',inputOrigin: 'manual',     clientId: 42, ts: 3, outcome: 'unhandled' });
    log.record({ name: 'staged',  inputOrigin: 'coach_tool', clientId: 42, ts: 4, outcome: 'awaiting-confirm' });
    log.record({ name: 'nochange',inputOrigin: 'manual',     clientId: 42, ts: 5, outcome: 'noop' });
    log.record({ name: 'other',   inputOrigin: 'voice',      clientId: 99, ts: 6, outcome: 'applied' });
    log.record({ name: 'orphan',  inputOrigin: 'voice',      clientId: null, ts: 7, outcome: 'applied' });
    return log;
  };

  it('believes only what actually applied', () => {
    const m = projectCoachMemory(build().all(), 42);
    expect(m.believed.map((e) => e.name)).toEqual(['ok']);
  });

  it('surfaces both failure shapes rather than hiding them', () => {
    const m = projectCoachMemory(build().all(), 42);
    expect(m.failed.map((e) => e.name).sort()).toEqual(['boom', 'nolisten']);
  });

  it('keeps unsettled intents out of belief', () => {
    const m = projectCoachMemory(build().all(), 42);
    expect(m.pending.map((e) => e.name)).toEqual(['staged']);
  });

  it('counts a no-op as neither believed nor failed', () => {
    const m = projectCoachMemory(build().all(), 42);
    expect(m.believed.some((e) => e.name === 'nochange')).toBe(false);
    expect(m.failed.some((e) => e.name === 'nochange')).toBe(false);
  });

  // C0.5 proved a wrong-client write path was live in production. This is the
  // same law expressed in the memory layer.
  it('never folds another client into this client\'s memory', () => {
    const m = projectCoachMemory(build().all(), 42);
    for (const bucket of [m.believed, m.failed, m.pending]) {
      expect(bucket.some((e) => e.clientId === 99)).toBe(false);
    }
  });

  it('surfaces unattributed intents instead of absorbing them', () => {
    const m = projectCoachMemory(build().all(), 42);
    expect(m.believed.some((e) => e.name === 'orphan')).toBe(false);
    expect(m.unattributed.map((e) => e.name)).toEqual(['orphan']);
  });

  it('derives voice-origination telemetry from the log itself', () => {
    const m = projectCoachMemory(build().all(), 42);
    expect(m.originCounts).toEqual({ voice: 2, manual: 2, coach_tool: 1 });
    expect(voiceOriginationRate(m)).toBeCloseTo(2 / 5);
  });

  it('returns null rate with no data rather than 0', () => {
    // 0 would read as "measured zero voice usage"; null means "no data".
    expect(voiceOriginationRate(projectCoachMemory([], 1))).toBeNull();
  });
});

describe('summarizeCoachMemory', () => {
  it('says nothing is KNOWN, not that nothing happened', () => {
    const s = summarizeCoachMemory(projectCoachMemory([], 7));
    expect(s).toMatch(/nothing is known/i);
    expect(s).toMatch(/not that nothing happened/i);
  });

  it('refuses to let pending intents read as done', () => {
    const log = new CoachEventLog();
    log.record({ name: 'p', inputOrigin: 'voice', clientId: 5, ts: 1, outcome: 'awaiting-confirm' });
    log.record({ name: 'f', inputOrigin: 'voice', clientId: 5, ts: 2, outcome: 'unhandled' });
    const s = summarizeCoachMemory(projectCoachMemory(log.all(), 5));
    expect(s).toMatch(/do not state these as done/i);
    expect(s).toMatch(/did NOT land/i);
  });
});