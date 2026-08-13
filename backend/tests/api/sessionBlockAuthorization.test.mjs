/**
 * ============================================================================
 * FILE: sessionBlockAuthorization.test.mjs
 * PURPOSE: Drive the MOUNTED POST /api/sessions/block route and prove a trainer
 *          cannot write blocked time onto another trainer's calendar.
 * AUTHOR: Claude Opus 5 | CREATED: 2026-08-13 (Swan Coach V3 · S1 · F7)
 * ============================================================================
 *
 * WHY A ROUTE TEST IN ADDITION TO THE SERVICE TEST
 * The service test proves the policy. This proves the policy is actually reached
 * by the request the frontend sends. The route forwarded `req.body` wholesale to
 * the service, so the boundary had no opinion about the subject at all — and
 * `trainerOrAdminOnly` gates on ROLE, never on which trainer is being targeted.
 * A role gate that never inspects the subject is not an authorization control.
 *
 * WHY THE SERVICE IS MOCKED HERE
 * The assertion is "the request is refused BEFORE any mutation is attempted".
 * Mocking the service makes that literally observable: the spy must not have been
 * called. A real service call would prove the opposite of what we want to show,
 * and would need a database to run at all.
 *
 * WHY A MINIMAL APP RATHER THAN createApp()
 * Only the real `routes/sessions.mjs` router is mounted, at the same path
 * core/routes.mjs mounts it. That exercises the genuine handler and the genuine
 * guard chain without a DB-dependent full boot. Mount-ORDER (which of the two
 * `/block` declarations in this repo actually wins) is a property of source
 * ordering, so it is asserted against the source directly, further down.
 *
 * THE SHADOW THIS FILE ALSO PINS
 * `routes/sessionRoutes.mjs` declares a SECOND `POST /block`, still served via the
 * `/api` fallback aggregator. It is unreachable only because `sessions.mjs` is
 * mounted first. Its copy happens to hold the CORRECT clamp — the live one had
 * the operands reversed. If the mounts are ever reordered, behaviour flips. That
 * ordering is now enforced rather than incidental.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import express from 'express';
import request from 'supertest';

const { createBlockedSessions } = vi.hoisted(() => ({
  createBlockedSessions: vi.fn(),
}));

vi.mock('../../services/sessions/session.service.mjs', () => ({
  default: { createBlockedSessions },
  UnifiedSessionService: class {},
}));

vi.mock('../../middleware/authMiddleware.mjs', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    // `protect` is the only layer stubbed: no real credential is used. The role
    // gate under test (`trainerOrAdminOnly`) remains the REAL implementation, so
    // this cannot accidentally certify a guard that isn't there.
    protect: (req, _res, next) => {
      req.user = { ...currentUser };
      next();
    },
  };
});

const backendDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const read = (rel) => readFileSync(path.join(backendDir, rel), 'utf8');

const TRAINER = { id: 41, role: 'trainer', email: 'trainer-a@example.test' };
const OTHER_TRAINER_ID = 77;
const ADMIN = { id: 9, role: 'admin', email: 'admin@example.test' };
const CLIENT = { id: 5, role: 'client', email: 'client@example.test' };
const BASE_DATE = '2026-09-01T17:00:00.000Z';

let currentUser = TRAINER;
let app;

const post = (body) => request(app).post('/api/sessions/block').send(body);

beforeEach(async () => {
  vi.clearAllMocks();
  createBlockedSessions.mockResolvedValue({ success: true, count: 1, sessions: [] });
  currentUser = TRAINER;

  if (!app) {
    const { default: sessionsRouter } = await import('../../routes/sessions.mjs');
    app = express();
    app.use(express.json());
    app.use('/api/sessions', sessionsRouter);
  }
});

describe('POST /api/sessions/block — mounted route authorization (F7)', () => {
  it('lets a trainer block their own calendar', async () => {
    const res = await post({ sessionDate: BASE_DATE, duration: 60 });

    expect(res.status).toBe(201);
    expect(createBlockedSessions).toHaveBeenCalledTimes(1);
  });

  it('REFUSES a trainer targeting another trainer, without invoking the service', async () => {
    // The P0, at the boundary. "Before service mutation" is not a claim here —
    // the spy proves the service was never entered.
    const res = await post({ sessionDate: BASE_DATE, duration: 60, trainerId: OTHER_TRAINER_ID });

    expect(res.status).toBe(403);
    expect(createBlockedSessions).not.toHaveBeenCalled();
  });

  it('REFUSES a cross-trainer target supplied as a string', async () => {
    const res = await post({
      sessionDate: BASE_DATE,
      duration: 60,
      trainerId: String(OTHER_TRAINER_ID),
    });

    expect(res.status).toBe(403);
    expect(createBlockedSessions).not.toHaveBeenCalled();
  });

  it('REFUSES a cross-trainer recurrence without invoking the service', async () => {
    const res = await post({
      sessionDate: BASE_DATE,
      duration: 60,
      trainerId: OTHER_TRAINER_ID,
      recurrenceRule: 'FREQ=WEEKLY;COUNT=4',
    });

    expect(res.status).toBe(403);
    expect(createBlockedSessions).not.toHaveBeenCalled();
  });

  it('accepts a trainer naming themselves, and hands the service a numeric subject', async () => {
    // The live UI posts `String(user.id)` from a select. If the boundary refused
    // that, the fix would be an outage for the normal path; if it forwarded the
    // raw string, a string would reach a numeric column.
    const res = await post({ sessionDate: BASE_DATE, duration: 60, trainerId: String(TRAINER.id) });

    expect(res.status).toBe(201);
    expect(createBlockedSessions).toHaveBeenCalledTimes(1);
    expect(createBlockedSessions.mock.calls[0][0].trainerId).toBe(TRAINER.id);
  });

  it('lets an admin target an explicit trainer', async () => {
    currentUser = ADMIN;
    const res = await post({ sessionDate: BASE_DATE, duration: 60, trainerId: OTHER_TRAINER_ID });

    expect(res.status).toBe(201);
    expect(createBlockedSessions.mock.calls[0][0].trainerId).toBe(OTHER_TRAINER_ID);
  });

  it('lets an admin block unassigned studio time', async () => {
    currentUser = ADMIN;
    const res = await post({ sessionDate: BASE_DATE, duration: 60 });

    expect(res.status).toBe(201);
    expect(createBlockedSessions).toHaveBeenCalledTimes(1);
  });

  it('rejects a malformed target with 400, without invoking the service', async () => {
    currentUser = ADMIN;
    const res = await post({ sessionDate: BASE_DATE, duration: 60, trainerId: 'not-a-number' });

    expect(res.status).toBe(400);
    expect(createBlockedSessions).not.toHaveBeenCalled();
  });

  it('still denies a client outright', async () => {
    currentUser = CLIENT;
    const res = await post({ sessionDate: BASE_DATE, duration: 60 });

    expect(res.status).toBe(403);
    expect(createBlockedSessions).not.toHaveBeenCalled();
  });
});

describe('POST /block route ownership — the shadow copy must stay unreachable', () => {
  const coreRoutes = read('core/routes.mjs');
  const sessionsSource = read('routes/sessions.mjs');
  const retiredSource = read('routes/sessionRoutes.mjs');

  /**
   * Line number of the first EXECUTABLE line containing `needle`, ignoring
   * comments. Written the hard way on purpose: the naive `indexOf` version of
   * this assertion passed the wrong thing, because core/routes.mjs *documents*
   * `app.use('/api', apiRoutes)` in a comment ~500 lines above the real mount.
   * The comment matched first and the test "proved" the mounts were inverted.
   * A source assertion that cannot tell code from prose is not evidence.
   */
  const executableLineOf = (source, needle) => {
    const lines = source.split('\n');
    for (let i = 0; i < lines.length; i += 1) {
      const trimmed = lines[i].trim();
      if (trimmed.startsWith('//') || trimmed.startsWith('*') || trimmed.startsWith('/*')) continue;
      if (lines[i].includes(needle)) return i + 1;
    }
    return -1;
  };

  it('mounts sessions.mjs at /api/sessions BEFORE the /api fallback aggregator', () => {
    const specific = executableLineOf(coreRoutes, "app.use('/api/sessions', sessionsRoutes)");
    const fallback = executableLineOf(coreRoutes, "app.use('/api', apiRoutes)");

    expect(specific).toBeGreaterThan(-1);
    expect(fallback).toBeGreaterThan(-1);
    // If this inverts, the retired router starts serving /api/sessions/* and the
    // authorization behaviour of this endpoint silently changes owner.
    expect(specific).toBeLessThan(fallback);
  });

  it('proves the comment-blind version of that check would have been wrong', () => {
    // Guards the guard. If someone "simplifies" executableLineOf back to indexOf,
    // this documents exactly why the simple version lies on THIS file.
    const naiveSpecific = coreRoutes.indexOf("app.use('/api/sessions', sessionsRoutes)");
    const naiveFallback = coreRoutes.indexOf("app.use('/api', apiRoutes)");

    expect(naiveFallback).toBeLessThan(naiveSpecific);
  });

  it('confirms both files still declare POST /block (the shadow is real, not folklore)', () => {
    expect(sessionsSource).toContain('router.post("/block"');
    expect(retiredSource).toContain('router.post("/block"');
  });

  /**
   * Sibling audit, pinned.
   *
   * Kimi K3 review 2 argued the same body-trusted-subject class likely exists in
   * unblock / recurring-series handlers, since the recurrence multiplier lives
   * there. Verified against current source and DISPROVEN: no unblock route
   * exists at all, the recurring-series mutators are adminOnly (a trainer cannot
   * reach them), and /book-recurring resolves its subject from req.user.id.
   *
   * /block was the only trainer-reachable calendar-mutating route carrying the
   * defect. That is a fact about today's route table, not a permanent property —
   * so it is asserted rather than remembered.
   */
  it('has no trainer-reachable calendar mutator other than the one that was fixed', () => {
    const trainerReachable = [...sessionsSource.matchAll(/router\.(post|put|delete|patch)\(\s*["']([^"']+)["']([^\n]*)/g)]
      .filter(([, , , guards]) => !guards.includes('adminOnly'))
      .filter(([, , routePath]) => /block|recurring/i.test(routePath))
      .map(([, method, routePath]) => `${method.toUpperCase()} ${routePath}`);

    // /block is fixed; /book-recurring binds its subject to req.user.id.
    expect(trainerReachable.sort()).toEqual(['POST /block', 'POST /book-recurring']);
  });

  it('binds /book-recurring to the authenticated user, not a submitted id', () => {
    const idx = sessionsSource.indexOf('router.post("/book-recurring"');
    const handler = sessionsSource.slice(idx, idx + 2500);

    expect(handler).toMatch(/User\.findByPk\(req\.user\.id/);
    expect(handler).not.toMatch(/req\.body\.trainerId/);
  });

  it('keeps the retired copy actor-bound too, so a mount reorder cannot reopen F7', () => {
    // Defence in depth against the ordering assumption above. The retired copy
    // already binds the actor first; this pins it so nobody "harmonises" it toward
    // the broken shape while cleaning up.
    const idx = retiredSource.indexOf('router.post("/block"');
    const handler = retiredSource.slice(idx, idx + 1600);

    expect(handler).toMatch(/req\.user\.role === 'trainer' \? req\.user\.id/);
  });
});
