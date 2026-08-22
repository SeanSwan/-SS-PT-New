/**
 * challengeSubmissionQueueScope.test.mjs
 * ======================================
 * Regression cover for the unscoped trainer moderation queue
 * (SWA-192, finding P0-1).
 *
 * BEFORE the fix, `getManagedChallengeSubmissionQueue()` took no viewer at all.
 * It ran `findAll({ where: { status: IN reviewable } })` with no ownership
 * predicate, included `submittedBy` with firstName/lastName/username, and the
 * controller never passed `req.user`. `gamificationV1Routes.mjs:143,150` gate
 * both the queue and the moderation mutation on `requireTrainer` — a ROLE check.
 * So every trainer could read, and moderate, every other trainer's clients'
 * submissions, with those clients named in the payload.
 *
 * `moderateManagedChallengeSubmission` called `assertStaffViewer(viewer)`, which
 * is likewise role-only, and then loaded the submission by id.
 *
 * Admin scope is unchanged: admins moderate everything.
 */
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { Op } from '../../database.mjs';

const listAssignedClientIds = vi.fn();
const assertAssignmentOrAdmin = vi.fn();

// Mock BOTH boundary helpers. The queue uses the list form and the moderation
// gate uses the single-subject form; mocking only the list would leave the real
// assertAssignmentOrAdmin running, which fails closed on a missing model cache —
// making the "refuses" test pass for entirely the wrong reason.
vi.mock('../../middleware/verifyClientAccess.mjs', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    listAssignedClientIds: (...a) => listAssignedClientIds(...a),
    assertAssignmentOrAdmin: (...a) => assertAssignmentOrAdmin(...a),
  };
});

const {
  getManagedChallengeSubmissionQueue,
  moderateManagedChallengeSubmission,
} = await import('../../services/gamification/challengeSubmissionService.mjs');

const TRAINER = { id: 101, role: 'trainer' };
const OTHER_TRAINERS_CLIENT = 777;
const MY_CLIENT = 42;
const ADMIN = { id: 1, role: 'admin' };

const submissionRow = (overrides = {}) => ({
  id: 'submission-1',
  title: 'Seven Day Flexibility Reset',
  description: 'Client wants a coach-reviewed flexibility challenge.',
  status: 'pending',
  moderationStatus: 'pending',
  requestedVisibility: 'trainer_visible',
  challengeType: 'weekly',
  archetype: 'consistency',
  proposalPayload: {},
  submittedAt: new Date('2026-06-30T12:00:00.000Z'),
  submittedByUserId: MY_CLIENT,
  submittedBy: { id: MY_CLIENT, firstName: 'Jane', lastName: 'Client' },
  ...overrides,
});

/** Captures the `where` the service builds so we can assert the scope predicate. */
function modelStub(rows) {
  const findAll = vi.fn(async () => rows);
  const findByPk = vi.fn(async (id) => rows.find((r) => String(r.id) === String(id)) ?? null);
  return { ChallengeSubmission: { findAll, findByPk }, findAll, findByPk };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('managed challenge queue — trainer scope', () => {
  it('restricts a trainer queue to their own assigned clients', async () => {
    listAssignedClientIds.mockResolvedValue([MY_CLIENT]);
    const stub = modelStub([submissionRow()]);

    await getManagedChallengeSubmissionQueue({
      models: { ChallengeSubmission: stub.ChallengeSubmission },
      viewer: TRAINER,
    });

    expect(listAssignedClientIds).toHaveBeenCalledWith(TRAINER.id);
    const where = stub.findAll.mock.calls[0][0].where;
    // The predicate must bind the submitter to this trainer's roster.
    // Op.in is a SYMBOL key, so JSON.stringify drops it — read it via Op directly
    // rather than serialising, or the assertion silently checks nothing.
    expect(where).toHaveProperty('submittedByUserId');
    expect(where.submittedByUserId[Op.in]).toEqual([MY_CLIENT]);
  });

  it('returns an empty queue for a trainer with no assigned clients, without querying rows', async () => {
    listAssignedClientIds.mockResolvedValue([]);
    const stub = modelStub([submissionRow({ submittedByUserId: OTHER_TRAINERS_CLIENT })]);

    const queue = await getManagedChallengeSubmissionQueue({
      models: { ChallengeSubmission: stub.ChallengeSubmission },
      viewer: TRAINER,
    });

    expect(queue.submissions).toEqual([]);
    expect(stub.findAll).not.toHaveBeenCalled();
  });

  it('leaves admin scope global', async () => {
    const stub = modelStub([submissionRow()]);

    await getManagedChallengeSubmissionQueue({
      models: { ChallengeSubmission: stub.ChallengeSubmission },
      viewer: ADMIN,
    });

    expect(listAssignedClientIds).not.toHaveBeenCalled();
    const where = stub.findAll.mock.calls[0][0].where;
    expect(where).not.toHaveProperty('submittedByUserId');
  });

  it('reports storage_unavailable — NOT empty — when the assignment lookup fails', async () => {
    // Three review seats flagged the same collapse: [] and "the assignment table
    // is down" are the same value with opposite meanings, and rendering an
    // outage as an empty queue means the trainer who should act never learns
    // anything is waiting.
    const unavailable = new Error('Assignment lookup unavailable');
    unavailable.code = 'ASSIGNMENT_LOOKUP_UNAVAILABLE';
    listAssignedClientIds.mockRejectedValue(unavailable);
    const stub = modelStub([submissionRow()]);

    const queue = await getManagedChallengeSubmissionQueue({
      models: { ChallengeSubmission: stub.ChallengeSubmission },
      viewer: TRAINER,
    });

    expect(queue.queueStatus).toBe('storage_unavailable');
    expect(queue.queueStatus).not.toBe('empty');
    expect(queue.submissions).toEqual([]);
    expect(stub.findAll).not.toHaveBeenCalled();
  });

  it('fails closed to an empty queue when the viewer is absent', async () => {
    // A caller that forgets to pass req.user must NOT get a global queue.
    const stub = modelStub([submissionRow()]);

    const queue = await getManagedChallengeSubmissionQueue({
      models: { ChallengeSubmission: stub.ChallengeSubmission },
    });

    expect(queue.submissions).toEqual([]);
    expect(stub.findAll).not.toHaveBeenCalled();
  });
});

describe('managed challenge moderation — trainer scope', () => {
  const moderate = (viewer, rows) => moderateManagedChallengeSubmission({
    models: { ChallengeSubmission: modelStub(rows).ChallengeSubmission },
    submissionId: 'submission-1',
    viewer,
    action: 'start_review',
  });

  it('refuses to moderate a submission from a client the trainer is not assigned to', async () => {
    assertAssignmentOrAdmin.mockResolvedValue(false);

    await expect(
      moderate(TRAINER, [submissionRow({ submittedByUserId: OTHER_TRAINERS_CLIENT })]),
    ).rejects.toMatchObject({ statusCode: 403 });

    // Checked against the SUBMITTER on the loaded row, not anything caller-supplied.
    expect(assertAssignmentOrAdmin).toHaveBeenCalledWith(TRAINER.id, 'trainer', OTHER_TRAINERS_CLIENT);
  });

  it('allows moderating a submission from an assigned client', async () => {
    assertAssignmentOrAdmin.mockResolvedValue(true);

    // Reaching PAST the assignment gate is what is asserted here; whatever the
    // downstream persistence does with the stub row is out of scope.
    await moderate(TRAINER, [submissionRow({ submittedByUserId: MY_CLIENT })])
      .catch((err) => {
        expect(err?.statusCode).not.toBe(403);
      });

    expect(assertAssignmentOrAdmin).toHaveBeenCalledWith(TRAINER.id, 'trainer', MY_CLIENT);
  });

  it('refuses when the submitter cannot be determined', async () => {
    assertAssignmentOrAdmin.mockResolvedValue(true);

    // An unattributable row cannot be proven to belong to this trainer, so it
    // must be refused WITHOUT consulting the boundary at all.
    await expect(
      moderate(TRAINER, [submissionRow({ submittedByUserId: null })]),
    ).rejects.toMatchObject({ statusCode: 403 });

    expect(assertAssignmentOrAdmin).not.toHaveBeenCalled();
  });
});
