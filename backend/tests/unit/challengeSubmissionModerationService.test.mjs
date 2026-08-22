/**
 * Challenge submission moderation service tests.
 *
 * Keeps staff review transitions separate from queue/policy tests so each
 * challenge-submission test file stays below the project line budget.
 */

import { describe, expect, it, vi } from 'vitest';

// SWA-192 P0-1: moderation now re-checks that the viewer is assigned to the
// SUBMITTER, inside the transaction. This file's subject is state transitions,
// not authorization, so the boundary is stubbed to ALLOW and the assignment
// gate itself is covered by challengeSubmissionQueueScope.test.mjs. Without
// this stub the real helper runs, fails closed on an absent model cache, and
// every trainer case here 403s for a reason unrelated to what it is testing.
vi.mock('../../middleware/verifyClientAccess.mjs', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    assertAssignmentOrAdmin: vi.fn(async () => true),
    listAssignedClientIds: vi.fn(async () => [42]),
  };
});

const { moderateManagedChallengeSubmission } = await import('../../services/gamification/challengeSubmissionService.mjs');

const iso = '2026-06-30T12:00:00.000Z';
const reviewNow = new Date('2026-06-30T15:00:00.000Z');

const makeSubmission = (overrides = {}) => ({
  id: 'submission-1',
  title: 'Seven Day Flexibility Reset',
  description: 'Client wants a coach-reviewed flexibility challenge for the next training block.',
  status: 'pending',
  moderationStatus: 'pending',
  requestedVisibility: 'trainer_visible',
  challengeType: 'weekly',
  archetype: 'consistency',
  proposalPayload: {},
  submittedAt: new Date(iso),
  // Real rows always carry this (ChallengeSubmission.mjs: allowNull false); the
  // fixture omitted it, which the SWA-192 assignment gate correctly refuses.
  submittedByUserId: 42,
  submittedBy: {
    id: 42,
    firstName: 'Jane',
    lastName: 'Client',
  },
  ...overrides,
});

const makeMutableSubmission = (overrides = {}) => {
  const submission = makeSubmission(overrides);
  submission.update = vi.fn(async function update(fields, options) {
    Object.assign(this, fields);
    this.lastUpdateOptions = options;
    return this;
  });
  return submission;
};

const buildModels = ({ submission, challengeCreate } = {}) => ({
  ChallengeSubmission: {
    findByPk: vi.fn(async () => submission ?? null),
    findAll: vi.fn(async () => []),
  },
  Challenge: {
    create: challengeCreate ?? vi.fn(async (payload) => ({ id: 'challenge-1', ...payload })),
  },
});

describe('challenge submission moderation service', () => {
  it('moves a pending client submission into trainer review without publishing it', async () => {
    const transaction = { id: 'tx-review' };
    const submission = makeMutableSubmission({ status: 'pending' });
    const models = buildModels({ submission });

    const result = await moderateManagedChallengeSubmission({
      models,
      submissionId: 'submission-1',
      viewer: { id: 12, role: 'trainer' },
      action: 'start_review',
      transaction,
      now: reviewNow,
    });

    expect(models.ChallengeSubmission.findByPk).toHaveBeenCalledWith('submission-1', { transaction });
    expect(submission.update).toHaveBeenCalledWith({
      status: 'under_review',
      assignedTrainerId: 12,
    }, { transaction });
    expect(result.action).toBe('start_review');
    expect(result.submission.status).toBe('under_review');
    expect(result.challenge).toBeNull();
    expect(models.Challenge.create).not.toHaveBeenCalled();
  });

  it('rejects a queued client submission with staff review notes', async () => {
    const transaction = { id: 'tx-reject' };
    const submission = makeMutableSubmission({ status: 'under_review' });
    const models = buildModels({ submission });

    const result = await moderateManagedChallengeSubmission({
      models,
      submissionId: 'submission-1',
      viewer: { id: 2, role: 'admin' },
      action: 'reject',
      reviewNotes: 'Needs a measurable workout target before staff can use it.',
      transaction,
      now: reviewNow,
    });

    expect(submission.update).toHaveBeenCalledWith({
      status: 'rejected',
      moderationStatus: 'rejected',
      reviewedByUserId: 2,
      reviewedAt: reviewNow,
      reviewNotes: 'Needs a measurable workout target before staff can use it.',
    }, { transaction });
    expect(result.submission.status).toBe('rejected');
    expect(result.challenge).toBeNull();
  });

  it('requires review notes before rejecting a queued client submission', async () => {
    const transaction = { id: 'tx-reject' };
    const submission = makeMutableSubmission({ status: 'under_review' });
    const models = buildModels({ submission });

    await expect(moderateManagedChallengeSubmission({
      models,
      submissionId: 'submission-1',
      viewer: { id: 2, role: 'admin' },
      action: 'reject',
      reviewNotes: '   ',
      transaction,
      now: reviewNow,
    })).rejects.toMatchObject({
      statusCode: 400,
      publicMessage: 'Review notes are required when rejecting a client challenge submission.',
    });

    expect(models.ChallengeSubmission.findByPk).not.toHaveBeenCalled();
    expect(submission.update).not.toHaveBeenCalled();
    expect(models.Challenge.create).not.toHaveBeenCalled();
  });

  it('returns a client submission for changes with staff review notes', async () => {
    const transaction = { id: 'tx-changes' };
    const submission = makeMutableSubmission({ status: 'under_review' });
    const models = buildModels({ submission });

    const result = await moderateManagedChallengeSubmission({
      models,
      submissionId: 'submission-1',
      viewer: { id: 2, role: 'admin' },
      action: 'request_changes',
      reviewNotes: 'Add a measurable scoring target before staff can review it again.',
      transaction,
      now: reviewNow,
    });

    expect(submission.update).toHaveBeenCalledWith({
      status: 'under_review',
      moderationStatus: 'needs_changes',
      reviewedByUserId: 2,
      reviewedAt: reviewNow,
      reviewNotes: 'Add a measurable scoring target before staff can review it again.',
    }, { transaction });
    expect(result.action).toBe('request_changes');
    expect(result.submission.moderationStatus).toBe('needs_changes');
    expect(result.challenge).toBeNull();
    expect(models.Challenge.create).not.toHaveBeenCalled();
  });

  it('requires review notes before requesting client submission changes', async () => {
    const transaction = { id: 'tx-changes' };
    const submission = makeMutableSubmission({ status: 'under_review' });
    const models = buildModels({ submission });

    await expect(moderateManagedChallengeSubmission({
      models,
      submissionId: 'submission-1',
      viewer: { id: 2, role: 'admin' },
      action: 'request_changes',
      reviewNotes: '   ',
      transaction,
      now: reviewNow,
    })).rejects.toMatchObject({
      statusCode: 400,
      publicMessage: 'Review notes are required when requesting changes to a client challenge submission.',
    });

    expect(models.ChallengeSubmission.findByPk).not.toHaveBeenCalled();
    expect(submission.update).not.toHaveBeenCalled();
    expect(models.Challenge.create).not.toHaveBeenCalled();
  });
  it('approves a client submission into a private staff-owned draft challenge', async () => {
    const transaction = { id: 'tx-approve' };
    const challengeCreate = vi.fn(async (payload) => ({ id: 'challenge-1', ...payload }));
    const submission = makeMutableSubmission({
      status: 'under_review',
      proposalPayload: {
        category: 'fitness',
        difficulty: 2,
        maxProgress: 4,
        progressUnit: 'workouts',
        startDate: '2099-07-01T16:00:00.000Z',
        endDate: '2099-07-08T16:00:00.000Z',
      },
    });
    const models = buildModels({ submission, challengeCreate });

    const result = await moderateManagedChallengeSubmission({
      models,
      submissionId: 'submission-1',
      viewer: { id: 12, role: 'trainer' },
      action: 'approve_as_draft',
      reviewNotes: 'Approved as a private coach draft.',
      transaction,
      now: reviewNow,
    });

    expect(challengeCreate).toHaveBeenCalledWith(expect.objectContaining({
      title: 'Seven Day Flexibility Reset',
      description: 'Client wants a coach-reviewed flexibility challenge for the next training block.',
      challengeType: 'weekly',
      category: 'fitness',
      difficulty: 2,
      maxProgress: 4,
      progressUnit: 'workouts',
      createdBy: 12,
      status: 'draft',
      isPublic: false,
      hasLeaderboard: false,
    }), { transaction });
    expect(submission.update).toHaveBeenCalledWith(expect.objectContaining({
      status: 'approved',
      moderationStatus: 'approved',
      reviewedByUserId: 12,
      reviewedAt: reviewNow,
      reviewNotes: 'Approved as a private coach draft.',
      approvedChallengeId: 'challenge-1',
    }), { transaction });
    expect(result.action).toBe('approve_as_draft');
    expect(result.challenge.id).toBe('challenge-1');
    expect(result.challenge.status).toBe('draft');
    expect(result.challenge.isPublic).toBe(false);
  });

  it('blocks client roles from moderating challenge submissions', async () => {
    const submission = makeMutableSubmission();
    const models = buildModels({ submission });

    await expect(moderateManagedChallengeSubmission({
      models,
      submissionId: 'submission-1',
      viewer: { id: 42, role: 'client' },
      action: 'reject',
    })).rejects.toMatchObject({
      statusCode: 403,
      publicMessage: 'Only trainers and admins can moderate challenge submissions',
    });

    expect(models.ChallengeSubmission.findByPk).not.toHaveBeenCalled();
  });
});
