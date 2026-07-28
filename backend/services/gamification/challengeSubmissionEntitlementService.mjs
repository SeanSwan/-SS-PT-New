/**
 * Client challenge submission entitlement policy.
 *
 * Keeps client-created challenge ideas behind the existing per-user feature flag
 * storage and normalizes the only payload shape allowed into moderation.
 */

import { getChallengeGovernancePolicy } from './challengeTemplateCatalog.mjs';

export const CLIENT_CHALLENGE_FEATURE_KEY = 'client_challenge_creation';
export const CLIENT_SUBMISSION_CLOSED_MESSAGE = 'Challenge idea submissions are closed until an admin grants client challenge creation entitlement.';
export const CLIENT_SUBMISSION_OPEN_MESSAGE = 'Challenge idea submissions are open for trainer review.';
export const CLIENT_SUBMISSION_CREATED_MESSAGE = 'Challenge idea submitted for trainer review.';

const CLOSED_NEXT_STEPS = Object.freeze([
  'Keep logging workouts so your trainer can nominate challenge ideas from real progress.',
  'Ask your trainer or admin to enable client challenge submissions when the pilot opens.',
]);
const OPEN_NEXT_STEPS = Object.freeze([
  'Submit a clear trainer-visible challenge idea tied to your current training block.',
  'Your trainer or admin reviews the idea before it becomes a challenge draft.',
]);
const CLIENT_VISIBILITIES = new Set(['private', 'trainer_visible']);
const CHALLENGE_TYPES = new Set(['daily', 'weekly', 'monthly', 'community', 'custom']);

export class ClientChallengeSubmissionPolicyError extends Error {
  constructor(publicMessage, statusCode = 400) {
    super(publicMessage);
    this.name = 'ClientChallengeSubmissionPolicyError';
    this.publicMessage = publicMessage;
    this.statusCode = statusCode;
  }
}

const fail = (message, statusCode = 400) => {
  throw new ClientChallengeSubmissionPolicyError(message, statusCode);
};

const cleanString = (value, fallback = '') => {
  if (value === undefined || value === null) return fallback;
  return String(value).trim();
};

const cleanBoundedText = (value, field, min, max) => {
  const cleaned = cleanString(value);
  if (cleaned.length < min) fail(`${field} is required`);
  if (cleaned.length > max) fail(`${field} must be ${max} characters or less`);
  return cleaned;
};

const cleanObjectPayload = (value) => (
  value && typeof value === 'object' && !Array.isArray(value) ? value : {}
);

const isClientViewer = (viewer) => Boolean(viewer?.id && viewer.role === 'client');

export async function hasClientChallengeSubmissionEntitlement({ models = {}, viewer } = {}) {
  if (!isClientViewer(viewer)) return false;
  const UserFeatureFlag = models.UserFeatureFlag;
  if (!UserFeatureFlag?.findOne) return false;

  try {
    const flag = await UserFeatureFlag.findOne({
      where: { userId: viewer.id, featureKey: CLIENT_CHALLENGE_FEATURE_KEY, enabled: true },
    });
    return Boolean(flag);
  } catch {
    return false;
  }
}

export async function buildClientChallengeSubmissionPolicy({ models = {}, viewer } = {}) {
  const canSubmit = await hasClientChallengeSubmissionEntitlement({ models, viewer });
  return {
    canSubmit,
    queueStatus: canSubmit ? 'entitlement_open' : 'closed_until_entitlement',
    requiredEntitlement: CLIENT_CHALLENGE_FEATURE_KEY,
    message: canSubmit ? CLIENT_SUBMISSION_OPEN_MESSAGE : CLIENT_SUBMISSION_CLOSED_MESSAGE,
    nextSteps: [...(canSubmit ? OPEN_NEXT_STEPS : CLOSED_NEXT_STEPS)],
    policy: {
      ...getChallengeGovernancePolicy(),
      clientCreation: canSubmit ? 'entitlement_enabled' : 'disabled_by_default',
    },
  };
}

export function buildClientChallengeSubmissionPayload({ viewer, body = {}, now = new Date() } = {}) {
  if (!isClientViewer(viewer)) fail('Only entitled clients can submit challenge ideas', 403);

  const requestedVisibility = cleanString(body.requestedVisibility, 'trainer_visible');
  if (!CLIENT_VISIBILITIES.has(requestedVisibility)) {
    fail('Client challenge submissions can only be private or trainer-visible.');
  }

  const challengeType = cleanString(body.challengeType, 'weekly');
  if (!CHALLENGE_TYPES.has(challengeType)) fail('Unsupported challenge type');

  return {
    submittedByUserId: viewer.id,
    title: cleanBoundedText(body.title, 'Title', 3, 120),
    description: cleanBoundedText(body.description, 'Description', 10, 2000),
    requestedVisibility,
    challengeType,
    archetype: cleanString(body.archetype, 'consistency').slice(0, 64) || 'consistency',
    status: 'pending',
    moderationStatus: 'pending',
    proposalPayload: cleanObjectPayload(body.proposalPayload),
    submittedAt: now,
  };
}