/**
 * ============================================================================
 * FILE: sprintRoutesErrorMapping.test.mjs — S08 route-level coverage.
 *
 * WHY THIS EXISTS
 *   S08's most severe fix was an error-mapping fix: `sendSprintServiceError` used
 *   to decide by status arithmetic, which let a raw driver message reach the
 *   client (`column "sprint_class_slots"."sprintId" does not exist`,
 *   `password authentication failed for user "swan_prod_admin"`). It now decides
 *   by an ALLOWLIST of error types.
 *
 *   That fix was tested at the service level only. `sprintRoutesSecurity.test.mjs`
 *   is largely source-text and spy-based, so the router had never been mounted and
 *   the allowlist had never actually been driven with a hostile error.
 *
 * The property under test is one line: a NON-allowlisted error contributes neither
 * its status nor its message to the response.
 * ============================================================================
 */

import express from 'express';
import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  currentUser: { id: 7, role: 'trainer' },
  service: {},
  seenActors: [],
  seenArgs: [],
}));

vi.mock('../../middleware/auth.mjs', () => ({
  protect: (req, _res, next) => { req.user = { ...mocks.currentUser }; next(); },
  authorize: () => (_req, _res, next) => next(),
}));

// The REAL error classes: this test is about which ones the route trusts.
vi.mock('../../services/bootcamp/sprintService.mjs', async () => {
  const { SprintActorForbiddenError, SprintIdInvalidError, SprintObjectNotFoundError } =
    await vi.importActual('../../services/bootcamp/sprintAccess.mjs');
  void SprintActorForbiddenError; void SprintIdInvalidError; void SprintObjectNotFoundError;
  const call = (name) => vi.fn(async (...args) => {
    mocks.seenArgs.push({ name, args });
    const impl = mocks.service[name];
    if (impl) return impl(...args);
    return { id: 12, trainerId: 7, status: 'draft' };
  });
  return {
    createSprint: call('createSprint'),
    getSprintById: call('getSprintById'),
    listSprints: call('listSprints'),
    updateSprint: call('updateSprint'),
    archiveSprint: call('archiveSprint'),
    updateWeek: call('updateWeek'),
    updateSlot: call('updateSlot'),
    confirmSlotUsed: call('confirmSlotUsed'),
  };
});

vi.mock('../../services/bootcamp/sprintGenerator.mjs', () => ({
  generateSprintClasses: vi.fn(async () => ({})),
  regenerateSlot: vi.fn(async () => ({})),
}));

const { SprintObjectNotFoundError, SprintIdInvalidError } =
  await import('../../services/bootcamp/sprintAccess.mjs');
const { SprintCalendarValidationError, SprintTaughtConflictError } =
  await import('../../services/bootcamp/sprintCalendarContract.mjs');
const { default: sprintRoutes } = await import('../../routes/sprintRoutes.mjs');
// The generator is mocked as a module (not routed through `mocks.service`), so a test that needs the
// regenerate endpoint to fail reaches the SAME mock instance the route calls.
const { regenerateSlot: regenerateSlotMock } = await import('../../services/bootcamp/sprintGenerator.mjs');

const app = express();
app.use(express.json());
app.use('/api/sprints', sprintRoutes);

/** A raw, hostile ORM/driver message — the thing that must never surface. */
const DRIVER_ERROR = Object.assign(
  new Error('column "sprint_class_slots"."sprintId" does not exist'),
  { status: 400 }, // deliberately ALSO carries a 4xx status
);
const AUTH_ERROR = new Error('password authentication failed for user "swan_prod_admin"');

beforeEach(() => {
  mocks.currentUser = { id: 7, role: 'trainer' };
  mocks.service = {};
  mocks.seenActors.length = 0;
  mocks.seenArgs.length = 0;
});

describe('the generation stream answers from PERSISTED state (slice D)', () => {
  // `sprintJobs` is an in-memory Map with a TTL, so "no job" is ambiguous:
  // finished-and-expired, never-started, or a restart lost the buffer mid-run.
  // A bare 404 left a reconnecting client unable to tell them apart.
  it('reports the run as OVER when persisted status is not generating', async () => {
    mocks.service.getSprintById = async () => ({ id: 12, trainerId: 7, status: 'draft' });
    const res = await request(app).get('/api/sprints/12/generate/stream');

    // Pre-fix this was 404 + JSON — the lie this slice removes.
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toMatch(/event-stream/);
    // MUST be 'complete': the only consumer clears its generating flag on
    // 'complete' or 'error' (SprintPlannerPage.tsx:84). An invented type would be
    // forwarded and then ignored, leaving the spinner running forever.
    expect(res.text).toContain('"type":"complete"');
    expect(res.text).not.toContain('"type":"done"');
    expect(res.text).toContain('"replayUnavailable":true');
  });

  it('reports an INTERRUPTED run when persisted status still says generating', async () => {
    mocks.service.getSprintById = async () => ({ id: 12, trainerId: 7, status: 'generating' });
    const res = await request(app).get('/api/sprints/12/generate/stream');

    expect(res.status).toBe(200);
    expect(res.text).toContain('"type":"error"');
    expect(res.text).toContain('"interrupted":true');
  });

  it('still refuses a FOREIGN sprint before any stream is opened', async () => {
    // KNOWN NON-DISCRIMINATING (hostile review): with an EMPTY job map this
    // returns 404 both before and after the slice-D fix, so it cannot fail on
    // revert and never exercises the job path.
    //
    // The discriminating shape is: plant a job with `POST /generate` as the owner,
    // switch `mocks.currentUser` to a foreign trainer, then assert 404 AND that the
    // body contains no `data:` frame — pre-fix the stream route had NO
    // authorization, so the owner's events would have leaked.
    //
    // NOT IMPLEMENTED: an attempt at that shape was REVERTED after the full suite
    // reported 6 failures in `sprintUpdateContract.test.mjs`. The author first
    // blamed job-map state leaking across files — **that explanation is
    // unsupported**: neither vitest config sets `isolate`, so the default
    // (`isolate: true`, `pool: 'forks'`) gives every file a fresh module
    // registry, and cross-file module state cannot leak.
    //
    // The real cause is therefore UNKNOWN. Both files pass in isolation, and the
    // next full run was green, so it is INTERMITTENT — see the open item in
    // H01-H30-REMAINING-SCOPE.md. Reverted because a red suite is worse than an
    // unimproved test, not because the diagnosis was established.
    const { SprintObjectNotFoundError } =
      await import('../../services/bootcamp/sprintAccess.mjs');
    mocks.service.getSprintById = async () => { throw new SprintObjectNotFoundError(); };
    const res = await request(app).get('/api/sprints/12/generate/stream');

    expect(res.status).toBe(404);
    expect(res.headers['content-type']).toMatch(/application\/json/);
    expect(res.headers['content-type']).not.toMatch(/event-stream/);
  });
});

describe('non-allowlisted errors never contribute status or message', () => {
  it('hides a driver message that carries a 4xx status', async () => {
    // The exact shape of the original defect: status arithmetic would have
    // trusted the 400 and returned the driver text verbatim.
    mocks.service.getSprintById = async () => { throw DRIVER_ERROR; };
    const res = await request(app).get('/api/sprints/12');
    expect(res.status).toBe(500);
    expect(JSON.stringify(res.body)).not.toContain('does not exist');
    expect(JSON.stringify(res.body)).not.toContain('sprintId');
    expect(res.body.message).toBe('Could not load sprint details.');
  });

  it('hides a credential-bearing message', async () => {
    mocks.service.getSprintById = async () => { throw AUTH_ERROR; };
    const res = await request(app).get('/api/sprints/12');
    expect(res.status).toBe(500);
    expect(JSON.stringify(res.body)).not.toContain('password');
    expect(JSON.stringify(res.body)).not.toContain('swan_prod_admin');
  });

  it('hides a driver message on EVERY mapped endpoint', async () => {
    // The route declares its OWN fallback status per endpoint: create/update use
    // 400, reads use 500. So a server fault on create is reported as 400 — that
    // is the pre-existing envelope, and it is recorded as an open inconsistency
    // (a server fault semantically is not a client error). What must hold
    // everywhere is that the MESSAGE is the generic fallback, never driver text.
    const cases = [
      ['post', '/api/sprints', 'createSprint', 400],
      ['get', '/api/sprints', 'listSprints', 500],
      ['get', '/api/sprints/12', 'getSprintById', 500],
      ['put', '/api/sprints/12', 'updateSprint', 400],
      ['delete', '/api/sprints/12', 'archiveSprint', 400],
      ['put', '/api/sprints/12/weeks/3', 'updateWeek', 400],
      ['put', '/api/sprints/12/slots/4', 'updateSlot', 400],
      ['put', '/api/sprints/12/slots/4/confirm', 'confirmSlotUsed', 400],
      // Round 128: this endpoint used to hardcode `400 "Could not regenerate sprint slot."` for
      // EVERY failure, which is why it is in this list — the mapping changed to the allowlist-based
      // helper, so the fail-closed half (a non-allowlisted driver error still reports the generic
      // message and the route's own status) has to be pinned here rather than assumed.
      ['post', '/api/sprints/12/slots/4/regenerate', null, 400],
    ];
    for (const [verb, path, name, expectedStatus] of cases) {
      mocks.service = name ? { [name]: async () => { throw DRIVER_ERROR; } } : {};
      if (!name) regenerateSlotMock.mockRejectedValueOnce(DRIVER_ERROR);
      const res = await request(app)[verb](path).send({ name: 'X', startDate: '2026-03-02' });
      const label = `${verb} ${path}`;
      expect(res.status, label).toBe(expectedStatus);
      expect(JSON.stringify(res.body), label).not.toContain('does not exist');
      expect(JSON.stringify(res.body), label).not.toContain('sprintId');
      // The message must be the route's generic text, not the driver's.
      expect(res.body.message, label).not.toBe(DRIVER_ERROR.message);
      expect(typeof res.body.message, label).toBe('string');
    }
  });
});

describe('allowlisted errors DO contribute their sanitized status and message', () => {
  it('maps a not-found access error to 404', async () => {
    mocks.service.getSprintById = async () => { throw new SprintObjectNotFoundError(); };
    const res = await request(app).get('/api/sprints/12');
    expect(res.status).toBe(404);
    expect(res.body.message).toBe('Sprint not found');
  });

  it('maps a malformed id to 400', async () => {
    mocks.service.getSprintById = async () => { throw new SprintIdInvalidError(); };
    const res = await request(app).get('/api/sprints/abc');
    expect(res.status).toBe(400);
  });

  it('maps a calendar validation error on create to 400', async () => {
    mocks.service.createSprint = async () => {
      throw new SprintCalendarValidationError('DURATION_INVALID', 'durationWeeks must be 1..52');
    };
    const res = await request(app).post('/api/sprints').send({ startDate: '2026-03-02', durationWeeks: 999 });
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  // Round 128 (HIGH): the taught-slot refusal is only useful if the CLIENT can see it. The service
  // throwing 409 is one claim; the route delivering 409 with an actionable sentence is a second one,
  // and the second is the one that was broken — the catch called `sendSprintRouteError(res, 400, …)`,
  // which flattened every failure into a generic 400. This asserts the caller path end to end through
  // the real router.
  it('delivers the taught-slot refusal as a 409 with its own message, not a generic 400', async () => {
    regenerateSlotMock.mockRejectedValueOnce(
      new SprintTaughtConflictError('A confirmed class cannot be regenerated; its taught log is already written.'),
    );

    const res = await request(app).post('/api/sprints/12/slots/4/regenerate');

    expect(res.status).toBe(409);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toMatch(/cannot be regenerated/i);
    // …and it is still an allowlisted message, not a passthrough of arbitrary service text. The
    // expected token is the VALUE of the route's private constant — `SPRINT_REQUEST_ERROR` is
    // declared at `sprintRoutes.mjs:58` and is not exported, so it is spelled out here rather than
    // imported. (This assertion first read `'SPRINT_REQUEST_ERROR'`, the constant's NAME, and failed
    // — the route was right and the test was wrong.)
    expect(res.body.error).toBe('invalid_sprint_request');
  });
});

describe('the actor comes from the authenticated request only', () => {
  it('passes req.user identity, never body fields', async () => {
    await request(app).post('/api/sprints')
      .send({ name: 'X', startDate: '2026-03-02', trainerId: 999, userId: 999, actor: { userId: 999, role: 'admin' } });

    const call = mocks.seenArgs.find((entry) => entry.name === 'createSprint');
    expect(call).toBeTruthy();
    expect(call.args[0]).toEqual({ userId: 7, role: 'trainer' });

    // NOTE: the body IS forwarded as `params`, so `trainerId: 999` is present in
    // args[1]. That is fine and deliberate — the route does not filter the body;
    // `createSprint` ignores `params.trainerId` and owns the row from the ACTOR.
    // The service-level lock for that is sprintCreateVocabulary.test.mjs
    // ("lets an admin use a foreign profile without adopting its ownership" and
    // the trainerId assertions). Asserting it HERE would be testing the wrong
    // layer, so this test asserts only the actor the route supplies.
    expect(call.args[0].userId).toBe(7);
  });

  it('ignores a body claiming the admin role', async () => {
    await request(app).get('/api/sprints/12?role=admin&userId=999');
    const call = mocks.seenArgs.find((entry) => entry.name === 'getSprintById');
    expect(call.args[1]).toEqual({ userId: 7, role: 'trainer' });
  });
});
