/**
 * CoachSignal integrity contract (R1)
 * ===================================
 * Behavioural companion to `tests/api/coachSignalRoutes.contract.test.mjs`. That file is
 * entirely source-text assertions; this one drives the real router and asserts the
 * RESPONSES, which is the only way to catch a guard that is present in the source but
 * unreachable in the handler.
 *
 * Deliberately not repeated here (covered by the source-grep suite): endpoint mounting,
 * the SocialLike ENUM remaining untouched, no-raw-error leakage, and the note/role
 * constants themselves.
 *
 * ── DECISION RECORDED 2026-09-19 (operator ruling) ────────────────────────────────
 * `05-slices.md` correction 3 asks for `postId` NOT NULL. It is NOT applied, on purpose.
 * The migration declares `onDelete: 'SET NULL'` (hostile review F3.4) so a coach's
 * recognition survives deletion of the post, and `SocialPost` is not paranoid — posts are
 * hard-deleted (`routes/social/posts.mjs`, `adminContentModerationController.mjs`). So
 * NOT NULL + SET NULL is contradictory: the SET NULL fires on delete and violates the
 * constraint. Worse, any signal whose post was already deleted holds a NULL postId today,
 * so `ALTER COLUMN ... SET NOT NULL` would fail on that data. The NULL-uniqueness hole is
 * unreachable through the API because the route always supplies `postId`, and
 * UNIQUE("coachId","postId") already blocks duplicates for non-null values. The full
 * multi-target migration is deferred to the point a session target actually exists.
 * The last two tests below pin this so it cannot be "fixed" back.
 *
 * ── SPLIT 2026-09-20 for hostile review R5-08 ────────────────────────────────────
 * This file was 312 lines against `06-bans.md` #50's 300-line budget. The ~100-line mock rig
 * moved to `helpers/coachSignalHarness.mjs` (shared with `coachSignalQuota.contract.test.mjs`
 * rather than duplicated, because a copy would drift), and the self-contained D2
 * quota-serialization describe moved to `coachSignalQuota.contract.test.mjs` with its rationale.
 * NO TEST WAS DROPPED: 16 tests here + 5 in the quota suite = the 21 the unsplit file carried.
 * Every `it()` body moved verbatim — verified by diffing the full blocks against the pre-split
 * blob at HEAD after line-ending normalisation, not merely the titles (Astra round 6 confirmed
 * this independently: 41 bodies match, all 112 `expect(...)` call sites preserved).
 */
import { Op } from 'sequelize';
// `vi` is imported here because two tests below drive the clock across a DST boundary
// (`vi.useFakeTimers` / `vi.setSystemTime`). It cannot be re-exported from the harness:
// a hoisted binding cannot be re-exported (`Cannot export hoisted variable.`) — see the
// harness header. R5-08's split dropped this import from both halves; without it the
// DST tests fail with `ReferenceError: vi is not defined`, which is how it was caught.
import { describe, expect, it, vi } from 'vitest';
import {
  MEMBER_AUTHOR, installCoachSignalHarness, mocks, post,
} from './helpers/coachSignalHarness.mjs';

// The rig — the `vi.mock` factories, the hoisted mock declarations, the mounted app and the
// per-test reset — lives in the harness. It cannot be hoisted from here: a factory hoisted into
// a helper cannot close over this module's locals, and re-exporting a hoisted binding fails with
// `Cannot export hoisted variable.` All three arrangements were measured; see the harness header.
const {
  mockSignalFindOne, mockSignalCount, mockSignalCreate, mockCreateNotification,
  mockAssignmentFindOne, mockPostFindOne, session,
} = mocks;

await installCoachSignalHarness();

describe('coach signal — target checks', () => {
  it('refuses a non-coach role with 403', async () => {
    session.user = { id: '7', role: 'client' };
    const res = await post();
    expect(res.status).toBe(403);
    expect(mockSignalCreate).not.toHaveBeenCalled();
  });

  it('returns 404 for an unknown or non-approved post, and never reveals which', async () => {
    mockPostFindOne.mockResolvedValue(null);
    const res = await post();
    expect(res.status).toBe(404);
    // The approved filter must be part of the query, not a post-hoc check.
    expect(mockPostFindOne.mock.calls[0][0].where.moderationStatus).toBe('approved');
  });

  it('refuses a coach signalling their own post, across a string/number id mismatch', async () => {
    // req.user.id is '7' (string), post.userId is 7 (number). A raw === would miss this.
    mockPostFindOne.mockResolvedValue({ id: 3, userId: 7 });
    const res = await post();
    expect(res.status).toBe(403);
    expect(mockSignalCreate).not.toHaveBeenCalled();
  });

  it('refuses a coach with no ACTIVE assignment, treating a NULL status as active', async () => {
    mockAssignmentFindOne.mockResolvedValue(null);
    const res = await post();
    expect(res.status).toBe(403);

    const where = mockAssignmentFindOne.mock.calls[0][0].where;
    expect(where.trainerId).toBe('7');
    expect(where.clientId).toBe(MEMBER_AUTHOR);
    // SQL NULL never matches IN (...), so NULL must be expressed with Op.is.
    expect(where[Op.or]).toContainEqual({ status: { [Op.is]: null } });
  });
});

describe('coach signal — post uniqueness', () => {
  it('returns 409 when the coach already signalled this post', async () => {
    mockSignalFindOne.mockResolvedValue({ id: 5 });
    const res = await post();
    expect(res.status).toBe(409);
    expect(mockSignalCreate).not.toHaveBeenCalled();
  });

  it('maps a unique-constraint race on double-tap to 409, not 500', async () => {
    // The pre-check passed, then the DB rejected the insert. This is the duplicate path.
    const race = Object.assign(new Error('duplicate key value'), { name: 'SequelizeUniqueConstraintError' });
    mockSignalCreate.mockRejectedValue(race);
    const res = await post();
    expect(res.status).toBe(409);
  });

  it('scopes the duplicate check to the coach AND the post together', async () => {
    await post();
    expect(mockSignalFindOne.mock.calls[0][0].where).toEqual({ coachId: '7', postId: 3 });
  });
});

describe('coach signal — quota', () => {
  it('allows the fifth signal and refuses the sixth', async () => {
    mockSignalCount.mockResolvedValue(4);
    expect((await post()).status).toBe(201);

    mockSignalCount.mockResolvedValue(5);
    const res = await post();
    expect(res.status).toBe(429);
    expect(mockSignalCreate).toHaveBeenCalledTimes(1);
  });

  it('counts from UTC midnight, not from a rolling 24h window', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-09-21T16:00:00.000Z'));
    await post();

    const window = mockSignalCount.mock.calls[0][0].where.createdAt[Op.gte];
    expect(window.toISOString()).toBe('2026-09-21T00:00:00.000Z');
  });

  it('holds the cap across a DST boundary — the window is UTC, so it cannot shift', async () => {
    // 2026-11-01 is a US DST transition. A local-midnight implementation would move the
    // boundary by an hour and could hand out a sixth signal; a UTC one cannot.
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-11-01T09:30:00.000Z'));
    await post();
    const before = mockSignalCount.mock.calls[0][0].where.createdAt[Op.gte];

    vi.setSystemTime(new Date('2026-11-01T10:30:00.000Z'));
    await post();
    const after = mockSignalCount.mock.calls[0][0].where.createdAt[Op.gte];

    expect(before.toISOString()).toBe('2026-11-01T00:00:00.000Z');
    expect(after.toISOString()).toBe('2026-11-01T00:00:00.000Z');
  });

  it('re-reads the count on every request, so a restart cannot reset the cap', async () => {
    await post();
    await post();
    // Quota lives in the database, never in module-level state — two requests, two reads.
    expect(mockSignalCount).toHaveBeenCalledTimes(2);
  });
});


describe('coach signal — note handling', () => {
  it('rejects an over-length note with 422 rather than truncating it', async () => {
    const res = await post({ note: 'x'.repeat(121) });
    expect(res.status).toBe(422);
    expect(mockSignalCreate).not.toHaveBeenCalled();
  });

  it('rejects a whitespace-only note with 422', async () => {
    const res = await post({ note: '   ' });
    expect(res.status).toBe(422);
  });

  it('stores a trimmed note and still returns 201 when the bell entry fails', async () => {
    mockCreateNotification.mockRejectedValue(new Error('bell down'));
    const res = await post({ note: '  great work  ' });
    expect(res.status).toBe(201);
    expect(mockSignalCreate.mock.calls[0][0].note).toBe('great work');
  });
});

describe('coach signal — the recorded postId decision', () => {
  it('keeps postId nullable so ON DELETE SET NULL can preserve the member\'s record', async () => {
    const { readFileSync } = await import('node:fs');
    const { resolve } = await import('node:path');
    const migration = readFileSync(resolve(import.meta.dirname, '../migrations/20260916-create-coach-signals.cjs'), 'utf8');

    // If this fails, someone applied correction 3. Read the header of this file first:
    // NOT NULL and SET NULL cannot both hold, and posts are hard-deleted.
    expect(migration).toMatch(/postId:\s*\{[\s\S]*?allowNull:\s*true/);
    expect(migration).toContain("onDelete: 'SET NULL'");
    expect(migration).not.toContain('allowNull: false,\n        references: { model: \'SocialPosts\'');
  });

  it('enforces one signal per coach per post for non-null values', async () => {
    const { readFileSync } = await import('node:fs');
    const { resolve } = await import('node:path');
    const model = readFileSync(resolve(import.meta.dirname, '../models/social/CoachSignal.mjs'), 'utf8');

    expect(model).toMatch(/\{\s*unique:\s*true,\s*fields:\s*\['coachId',\s*'postId'\]\s*\}/);
    expect(model).not.toContain('sessionId');
  });
});
