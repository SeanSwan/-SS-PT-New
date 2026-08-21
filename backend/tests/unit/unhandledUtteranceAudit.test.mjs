/**
 * unhandledUtteranceAudit.test.mjs
 * ================================
 * F1 (2026-08-21): the unhandled-utterance pipeline — record what users asked
 * Swan Coach for that did not become a command, grouped for the weekly top-N.
 *
 * The recording tests mock recordCommandAudit and assert the exact row shape;
 * the report tests mock the model and feed it grouped rows. The route wiring is
 * locked by a source guard in the house style of aiCommandRouteFallbackSource —
 * an HTTP-level test of POST /execute is out of scope here and stays on the
 * SWA-142 list with the other missing API-level locks.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';

const recordCommandAudit = vi.fn().mockResolvedValue(true);
const findAll = vi.fn();

vi.mock('../../services/ai/commandAudit.mjs', () => ({
  recordCommandAudit: (...args) => recordCommandAudit(...args),
}));
vi.mock('../../models/AiCommandAuditLog.mjs', () => ({
  default: { findAll: (...args) => findAll(...args) },
}));

const {
  UNHANDLED_OUTCOME,
  normalizeUtterance,
  recordUnhandledUtterance,
  buildUnhandledUtteranceTop,
} = await import('../../services/ai/unhandledUtteranceAudit.mjs');

beforeEach(() => {
  recordCommandAudit.mockClear();
  findAll.mockReset();
});

describe('normalizeUtterance', () => {
  it('lowercases, collapses whitespace, masks digits, truncates', () => {
    expect(normalizeUtterance('  Log   BENCH 3x8 at 60kg for client 4102 ')).toBe(
      'log bench #x# at #kg for client #',
    );
    expect(normalizeUtterance('a'.repeat(500))).toHaveLength(160);
  });

  it('returns null for empty and non-string input so callers skip recording', () => {
    expect(normalizeUtterance('')).toBeNull();
    expect(normalizeUtterance('   ')).toBeNull();
    expect(normalizeUtterance(null)).toBeNull();
    expect(normalizeUtterance(42)).toBeNull();
  });

  it('groups the same ask with different numbers into ONE bucket', () => {
    // This is the property the whole pipeline depends on: recurrence must be
    // countable across numeric variation or the top-N is noise.
    expect(normalizeUtterance('log bench 3x8 at 60')).toBe(normalizeUtterance('log bench 5x5 at 80'));
  });
});

describe('recordUnhandledUtterance', () => {
  it('writes the audit row with the reserved outcome and the kind in errorCode', async () => {
    const ok = await recordUnhandledUtterance({
      userId: 7,
      userRole: 'trainer',
      input: 'Remind Maria about Thursday',
      kind: 'chat',
      surface: 'workout-logger',
    });

    expect(ok).toBe(true);
    expect(recordCommandAudit).toHaveBeenCalledTimes(1);
    const row = recordCommandAudit.mock.calls[0][0];
    expect(row).toMatchObject({
      userId: 7,
      userRole: 'trainer',
      commandType: null,
      outcome: UNHANDLED_OUTCOME,
      errorCode: 'chat',
    });
    expect(row.params.utterance).toBe('remind maria about thursday');
    expect(row.params.surface).toBe('workout-logger');
    // The raw input string must never be passed through untransformed.
    expect(row.params.utterance).not.toBe('Remind Maria about Thursday');
  });

  it('captures the phantom intent for unknown_intent — the classifier-drift signal', async () => {
    await recordUnhandledUtterance({
      userId: 7,
      userRole: 'admin',
      input: 'archive all templates',
      kind: 'unknown_intent',
      phantomIntent: 'archive_templates',
    });

    const row = recordCommandAudit.mock.calls[0][0];
    expect(row.errorCode).toBe('unknown_intent');
    expect(row.params.intent).toBe('archive_templates');
  });

  it('refuses unknown kinds and empty input without touching the audit writer', async () => {
    expect(await recordUnhandledUtterance({ userId: 1, userRole: 'trainer', input: 'x', kind: 'success' })).toBe(false);
    expect(await recordUnhandledUtterance({ userId: 1, userRole: 'trainer', input: '   ', kind: 'chat' })).toBe(false);
    expect(recordCommandAudit).not.toHaveBeenCalled();
  });

  it('outcome fits the model column cap (STRING(30))', () => {
    expect(UNHANDLED_OUTCOME.length).toBeLessThanOrEqual(30);
  });
});

describe('buildUnhandledUtteranceTop', () => {
  it('merges per-kind rows into one bucket per utterance and ranks by total', async () => {
    findAll.mockResolvedValue([
      { utterance: 'book a session for #', kind: 'chat', count: '3', lastSeen: '2026-08-20T10:00:00Z' },
      { utterance: 'book a session for #', kind: 'clarification_needed', count: '2', lastSeen: '2026-08-21T09:00:00Z' },
      { utterance: 'export my roster', kind: 'unknown_intent', count: '4', lastSeen: '2026-08-19T08:00:00Z' },
    ]);

    const report = await buildUnhandledUtteranceTop({ days: 7, limit: 10 });

    expect(report.total).toBe(9);
    expect(report.top).toHaveLength(2);
    // 5 combined beats 4: the merge across kinds must happen BEFORE ranking.
    expect(report.top[0]).toMatchObject({
      utterance: 'book a session for #',
      count: 5,
      kinds: { chat: 3, clarification_needed: 2 },
    });
    expect(report.top[0].lastSeen).toBe('2026-08-21T09:00:00.000Z');
    expect(report.top[1].count).toBe(4);
  });

  it('clamps window and limit rather than trusting query input', async () => {
    findAll.mockResolvedValue([]);
    const wide = await buildUnhandledUtteranceTop({ days: 100000, limit: 9999 });
    expect(wide.windowDays).toBe(90);
    const junk = await buildUnhandledUtteranceTop({ days: 'DROP TABLE', limit: -3 });
    expect(junk.windowDays).toBe(7);
    expect(junk.top).toEqual([]);
  });

  it('queries only the reserved outcome so command rows never leak into the report', async () => {
    findAll.mockResolvedValue([]);
    await buildUnhandledUtteranceTop();
    const query = findAll.mock.calls[0][0];
    expect(query.where.outcome).toBe(UNHANDLED_OUTCOME);
  });
});
