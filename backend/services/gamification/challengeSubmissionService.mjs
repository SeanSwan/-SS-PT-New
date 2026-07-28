import { Op } from '../../database.mjs';
import {
  ChallengeCreationValidationError,
  buildChallengeCreatePayload,
} from './challengeCreationService.mjs';
import { getChallengeGovernancePolicy } from './challengeTemplateCatalog.mjs';
import {
  CLIENT_SUBMISSION_CLOSED_MESSAGE,
  CLIENT_SUBMISSION_CREATED_MESSAGE,
  buildClientChallengeSubmissionPayload,
  buildClientChallengeSubmissionPolicy,
  hasClientChallengeSubmissionEntitlement,
} from './challengeSubmissionEntitlementService.mjs';

const CLOSED_QUEUE_MESSAGE = 'Client-created challenge submissions are closed until entitlement and moderation storage are connected.';
const STORAGE_UNAVAILABLE_MESSAGE = 'Challenge submission storage is unavailable; client-created challenge submissions remain closed.';
const EMPTY_QUEUE_MESSAGE = 'No client-created challenge submissions are awaiting moderation review.';
const REJECTION_NOTES_REQUIRED_MESSAGE = 'Review notes are required when rejecting a client challenge submission.';
const REQUEST_CHANGES_NOTES_REQUIRED_MESSAGE = 'Review notes are required when requesting changes to a client challenge submission.';
const REVIEWABLE_STATUSES = ['pending', 'under_review'];
const MODERATE_ACTIONS = new Set(['start_review', 'request_changes', 'reject', 'approve_as_draft']);
const DEFAULT_CLOSED_QUEUE = Object.freeze({
  submissions: [],
  queueStatus: 'empty_by_policy',
});

export class ChallengeSubmissionModerationError extends Error {
  constructor(publicMessage, statusCode = 400) {
    super(publicMessage);
    this.name = 'ChallengeSubmissionModerationError';
    this.publicMessage = publicMessage;
    this.statusCode = statusCode;
  }
}

const fail = (message, statusCode = 400) => {
  throw new ChallengeSubmissionModerationError(message, statusCode);
};

const freshPolicy = () => ({ ...getChallengeGovernancePolicy() });

const closedQueue = (queueStatus = DEFAULT_CLOSED_QUEUE.queueStatus, message = CLOSED_QUEUE_MESSAGE) => ({
  ...DEFAULT_CLOSED_QUEUE,
  submissions: [],
  queueStatus,
  policy: { ...freshPolicy(), clientCreation: 'disabled_by_default' },
  message,
});

const toIsoOrNull = (value) => {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
};

const cleanString = (value, fallback = null) => {
  if (typeof value !== 'string') return fallback;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : fallback;
};

const displayNameForUser = (user) => {
  if (!user || typeof user !== 'object') return null;
  const explicit = cleanString(user.displayName) || cleanString(user.username);
  if (explicit) return explicit;
  const firstLast = [user.firstName, user.lastName].map((part) => cleanString(part, '')).filter(Boolean).join(' ').trim();
  if (firstLast) return firstLast;
  return user.id ? `Client #${user.id}` : null;
};

const normalizeSubmission = (submission) => ({
  id: submission.id,
  title: cleanString(submission.title, 'Untitled challenge submission'),
  description: cleanString(submission.description, ''),
  challengeType: cleanString(submission.challengeType, 'weekly'),
  archetype: cleanString(submission.archetype, 'consistency'),
  status: cleanString(submission.status, 'pending'),
  moderationStatus: cleanString(submission.moderationStatus, 'pending'),
  requestedVisibility: cleanString(submission.requestedVisibility, 'trainer_visible'),
  submittedAt: toIsoOrNull(submission.submittedAt),
  submittedBy: displayNameForUser(submission.submittedBy) || 'Client submission',
});

const queueMessage = (count) => {
  if (count === 0) return EMPTY_QUEUE_MESSAGE;
  if (count === 1) return '1 client-created challenge submission needs moderation review.';
  return `${count} client-created challenge submissions need moderation review.`;
};

const assertStaffViewer = (viewer) => {
  if (!viewer || (viewer.role !== 'admin' && viewer.role !== 'trainer')) {
    fail('Only trainers and admins can moderate challenge submissions', 403);
  }
  if (!viewer.id) fail('Authenticated moderator is required', 401);
};

const normalizeSubmissionId = (value) => {
  const id = String(value ?? '').trim();
  if (!id) fail('Challenge submission id is required');
  return id;
};

const normalizeModerationAction = (value) => {
  const action = String(value ?? '').trim().toLowerCase();
  if (!MODERATE_ACTIONS.has(action)) fail('Unsupported challenge submission moderation action');
  return action;
};

const assertReviewable = (submission, action) => {
  if (!submission) fail('Challenge submission not found', 404);
  if (action === 'start_review' && submission.status !== 'pending') {
    fail('Only pending challenge submissions can enter review');
  }
  if (action !== 'start_review' && !REVIEWABLE_STATUSES.includes(submission.status)) {
    fail('Only pending or under-review submissions can be moderated');
  }
};

const cleanReviewNotes = (value) => {
  const notes = cleanString(value, '');
  return notes.length > 1000 ? notes.slice(0, 1000) : notes;
};

const requireActionReviewNotes = (value, message) => {
  const notes = cleanReviewNotes(value);
  if (!notes) fail(message);
  return notes;
};

const addDays = (date, days) => {
  const result = new Date(date.getTime());
  result.setUTCDate(result.getUTCDate() + days);
  return result;
};

const objectPayload = (value) => (value && typeof value === 'object' && !Array.isArray(value) ? value : {});

const buildApprovedDraftPayload = ({ submission, viewer, now }) => {
  const proposal = objectPayload(submission.proposalPayload);
  const draftStart = proposal.startDate ?? addDays(now, 1).toISOString();
  const draftEnd = proposal.endDate ?? addDays(now, 8).toISOString();

  try {
    return buildChallengeCreatePayload({
      userId: viewer.id,
      now,
      body: {
        ...proposal,
        title: submission.title,
        description: submission.description,
        challengeType: submission.challengeType ?? proposal.challengeType,
        publishState: 'draft',
        isPublic: false,
        hasLeaderboard: false,
        startDate: draftStart,
        endDate: draftEnd,
        tags: ['client-submission', `submission:${submission.id}`, submission.archetype].filter(Boolean),
      },
    });
  } catch (error) {
    if (error instanceof ChallengeCreationValidationError) {
      fail(error.publicMessage, error.statusCode);
    }
    throw error;
  }
};

const loadSubmission = async ({ models, submissionId, transaction }) => {
  const ChallengeSubmission = models?.ChallengeSubmission;
  if (!ChallengeSubmission?.findByPk) fail('Challenge submission model unavailable', 503);
  return ChallengeSubmission.findByPk(normalizeSubmissionId(submissionId), { transaction });
};

const recordToPlain = (record) => (record?.toJSON ? record.toJSON() : record);

export async function getClientChallengeSubmissionPolicy({ models = {}, viewer } = {}) {
  return buildClientChallengeSubmissionPolicy({ models, viewer });
}

export async function createClientChallengeSubmission({ models = {}, viewer, body = {}, transaction, now = new Date() } = {}) {
  const canSubmit = await hasClientChallengeSubmissionEntitlement({ models, viewer });
  if (!canSubmit) fail(CLIENT_SUBMISSION_CLOSED_MESSAGE, 403);

  const ChallengeSubmission = models?.ChallengeSubmission;
  if (!ChallengeSubmission?.create) fail('Challenge submission model unavailable', 503);

  const payload = buildClientChallengeSubmissionPayload({ viewer, body, now });
  const created = await ChallengeSubmission.create(payload, { transaction });
  const submission = normalizeSubmission({ ...payload, ...recordToPlain(created), submittedBy: viewer });

  return {
    submission,
    queueStatus: 'pending_review',
    message: CLIENT_SUBMISSION_CREATED_MESSAGE,
  };
}

export async function getManagedChallengeSubmissionQueue({ models = {}, limit = 25 } = {}) {
  const ChallengeSubmission = models.ChallengeSubmission;
  if (!ChallengeSubmission?.findAll) return closedQueue();

  try {
    const safeLimit = Number.isInteger(limit) && limit > 0 ? Math.min(limit, 100) : 25;
    const submissions = await ChallengeSubmission.findAll({
      where: { status: { [Op.in]: REVIEWABLE_STATUSES } },
      order: [['submittedAt', 'ASC']],
      limit: safeLimit,
      include: [{
        association: 'submittedBy',
        attributes: ['id', 'firstName', 'lastName', 'username'],
        required: false,
      }],
    });
    const normalized = submissions.map(normalizeSubmission);

    return {
      submissions: normalized,
      queueStatus: normalized.length > 0 ? 'pending_review' : 'empty',
      policy: { ...freshPolicy(), clientCreation: 'disabled_by_default' },
      message: queueMessage(normalized.length),
    };
  } catch {
    return closedQueue('storage_unavailable', STORAGE_UNAVAILABLE_MESSAGE);
  }
}

export async function moderateManagedChallengeSubmission({
  models = {},
  submissionId,
  viewer,
  action,
  reviewNotes = '',
  transaction,
  now = new Date(),
} = {}) {
  assertStaffViewer(viewer);
  const normalizedAction = normalizeModerationAction(action);
  const requiredNotes = normalizedAction === 'reject'
    ? requireActionReviewNotes(reviewNotes, REJECTION_NOTES_REQUIRED_MESSAGE)
    : normalizedAction === 'request_changes'
      ? requireActionReviewNotes(reviewNotes, REQUEST_CHANGES_NOTES_REQUIRED_MESSAGE)
      : null;
  const submission = await loadSubmission({ models, submissionId, transaction });
  assertReviewable(submission, normalizedAction);

  if (normalizedAction === 'start_review') {
    const fields = { status: 'under_review' };
    if (viewer.role === 'trainer') fields.assignedTrainerId = viewer.id;
    const updated = await submission.update(fields, { transaction });
    return { action: normalizedAction, submission: updated ?? submission, challenge: null };
  }

  if (normalizedAction === 'reject') {
    const updated = await submission.update({
      status: 'rejected',
      moderationStatus: 'rejected',
      reviewedByUserId: viewer.id,
      reviewedAt: now,
      reviewNotes: requiredNotes,
    }, { transaction });
    return { action: normalizedAction, submission: updated ?? submission, challenge: null };
  }

  if (normalizedAction === 'request_changes') {
    const updated = await submission.update({
      status: 'under_review',
      moderationStatus: 'needs_changes',
      reviewedByUserId: viewer.id,
      reviewedAt: now,
      reviewNotes: requiredNotes,
    }, { transaction });
    return { action: normalizedAction, submission: updated ?? submission, challenge: null };
  }
  const Challenge = models?.Challenge;
  if (!Challenge?.create) fail('Challenge model unavailable', 503);
  const challengePayload = buildApprovedDraftPayload({ submission, viewer, now });
  const challenge = await Challenge.create(challengePayload, { transaction });
  const updated = await submission.update({
    status: 'approved',
    moderationStatus: 'approved',
    reviewedByUserId: viewer.id,
    reviewedAt: now,
    reviewNotes: cleanReviewNotes(reviewNotes),
    approvedChallengeId: challenge?.id ?? null,
  }, { transaction });

  return { action: normalizedAction, submission: updated ?? submission, challenge };
}

export default getManagedChallengeSubmissionQueue;



