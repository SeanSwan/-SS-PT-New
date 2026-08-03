/**
 * Launch audit lane 5 (2026-08-03) — trainer dashboard.
 *
 * REGRESSION: PUT /api/sessions/:id/reschedule was gated by `protect` +
 * `trainerOrAdminOnly` only. The handler loaded the session with a bare
 * `Session.findByPk(id)` — no ownership predicate — and then wrote
 * `trainerId: req.body.trainerId ?? session.trainerId` back to the row. Any
 * authenticated trainer could move any client's session and reassign the
 * session's owning trainer (to themselves or a rival), then fire a
 * notification at the victim client stamped with their own senderId.
 *
 * It was the ONLY mutating route in routes/sessions.mjs missing the
 * `canAccessSessionRecord` gate its siblings all use, which is asserted here so
 * the omission cannot silently return.
 */
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const __dirname = dirname(fileURLToPath(import.meta.url));
const routeSource = readFileSync(resolve(__dirname, '../../routes/sessions.mjs'), 'utf8');

const rescheduleRoute = (() => {
  const start = routeSource.indexOf('router.put("/:id/reschedule"');
  const end = routeSource.indexOf('router.post("/book/:userId"', start);
  return routeSource.slice(start, end === -1 ? routeSource.length : end);
})();

describe('PUT /api/sessions/:id/reschedule ownership guard', () => {
  it('is still the route under test', () => {
    expect(rescheduleRoute).toContain('router.put("/:id/reschedule", protect, trainerOrAdminOnly');
    expect(rescheduleRoute).toContain('const session = await Session.findByPk(sessionId);');
  });

  it('rejects a trainer who does not own the session before any mutation', () => {
    expect(rescheduleRoute).toContain(
      "canAccessSessionRecord(req.user, session, { allowClient: false, allowTrainer: true })",
    );

    const guardIndex = rescheduleRoute.indexOf('canAccessSessionRecord');
    const updateIndex = rescheduleRoute.indexOf('await session.update(');
    const notifyIndex = rescheduleRoute.indexOf('createNotification(');

    expect(guardIndex).toBeGreaterThan(-1);
    expect(updateIndex).toBeGreaterThan(guardIndex);
    expect(notifyIndex).toBeGreaterThan(guardIndex);
  });

  it('never lets a non-admin reassign session ownership through the body', () => {
    expect(rescheduleRoute).toContain("req.user.role === 'admin'");
    // The pre-fix expression trusted the body for every role.
    expect(rescheduleRoute).not.toContain('const resolvedTrainerId = trainerId ?? session.trainerId ?? null;');
  });

  it('keeps the shared ownership helper type-safe (string JWT ids vs numeric columns)', () => {
    expect(routeSource).toContain(
      'const canAccessSessionRecord = (user, session, { allowClient = true, allowTrainer = true } = {}) => {',
    );
    expect(routeSource).toContain("user.role === 'trainer' && Number(session.trainerId) === requesterId");
  });
});
