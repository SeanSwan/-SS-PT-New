import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { computeStreakDays } from '../../routes/social/proofCardRoutes.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const routeSource = readFileSync(resolve(__dirname, '../../routes/social/proofCardRoutes.mjs'), 'utf8');
const mountSource = readFileSync(resolve(__dirname, '../../routes/social/index.mjs'), 'utf8');

describe('computeStreakDays — pure streak math', () => {
  it('counts consecutive days ending today', () => {
    expect(computeStreakDays(['2026-09-18', '2026-09-17', '2026-09-16'], '2026-09-18')).toBe(3);
  });

  it('does not break a streak before the member has trained today', () => {
    // Yesterday + the two days before = a live 3-day streak, not 0.
    expect(computeStreakDays(['2026-09-17', '2026-09-16', '2026-09-15'], '2026-09-18')).toBe(3);
  });

  it('returns 0 when the most recent session is older than yesterday', () => {
    expect(computeStreakDays(['2026-09-14', '2026-09-13'], '2026-09-18')).toBe(0);
  });

  it('ignores duplicate days and nulls', () => {
    expect(computeStreakDays(['2026-09-18', '2026-09-18', null, '2026-09-17'], '2026-09-18')).toBe(2);
  });

  it('handles an empty history', () => {
    expect(computeStreakDays([], '2026-09-18')).toBe(0);
  });

  it('counts a single session today as a 1-day streak', () => {
    expect(computeStreakDays(['2026-09-18'], '2026-09-18')).toBe(1);
  });
});

describe('proof card route — privacy and ownership contract', () => {
  it('is mounted and authenticated', () => {
    expect(mountSource).toContain("router.use('/proof-card', proofCardRoutes)");
    expect(routeSource).toContain("router.get('/:sessionId', protect");
  });

  // Rule 8 / blueprint ban #7: own-stats only, and a 403 would confirm that another
  // member's session id exists. 404 is the only leak-free answer.
  it('scopes the session query to the caller and 404s (never 403s) on a foreign session', () => {
    expect(routeSource).toContain('where: { id: sessionId, userId: req.user.id }');
    expect(routeSource).not.toContain('res.status(403)');
    expect(routeSource).toContain("res.status(404)");
  });

  it('never returns another member name, email, or id', () => {
    expect(routeSource).not.toContain('email');
    expect(routeSource).not.toContain('memberEmail');
    expect(routeSource).not.toContain('otherUserId');
    // The only name emitted is the caller's own display name.
    expect(routeSource).toContain('memberDisplayName');
  });

  it('requires a completed session before offering a proof card', () => {
    expect(routeSource).toContain("session.status !== 'completed'");
    expect(routeSource).toContain('res.status(409)');
  });

  it('creates no new table — the card is an aggregate over workout_sessions', () => {
    expect(routeSource).toContain("import('../../models/WorkoutSession.mjs')");
    expect(routeSource).not.toContain('db.define');
  });

  it('baselines against the member\'s own history, excluding the session being shown', () => {
    expect(routeSource).toContain("id: { [Op.ne]: session.id }");
    expect(routeSource).toContain('baselineRows');
  });

  it('never echoes raw database errors to the client', () => {
    expect(routeSource).not.toContain('error: error.message');
  });
});

describe('proof card route — latest read (S2.5 entry point)', () => {
  // Express matches in declaration order, so '/latest' MUST be registered before the
  // '/:sessionId' parameter route or the literal path is swallowed and returns a 404
  // for a malformed sessionId.
  it('registers /latest before the /:sessionId parameter route', () => {
    const latestIdx = routeSource.indexOf("router.get('/latest'");
    const paramIdx = routeSource.indexOf("router.get('/:sessionId'");
    expect(latestIdx).toBeGreaterThan(-1);
    expect(paramIdx).toBeGreaterThan(-1);
    expect(latestIdx).toBeLessThan(paramIdx);
  });

  it('scopes the latest lookup to the caller and orders by most recent', () => {
    expect(routeSource).toContain("where: { userId: req.user.id, status: 'completed' }");
    expect(routeSource).toContain("order: [['date', 'DESC']]");
  });

  it('answers 204 (not an error) when the member has no completed session', () => {
    expect(routeSource).toContain('res.status(204).end()');
  });

  it('shares one payload builder with the by-id route', () => {
    expect(routeSource).toContain('const buildProofCardPayload = async (session, userId)');
    // One call site in /latest, one in /:sessionId — the payload can never drift between them.
    expect(routeSource.match(/await buildProofCardPayload\(session, req\.user\.id\)/g)?.length).toBe(2);
  });
});
