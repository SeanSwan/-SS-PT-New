/**
 * Managed challenge status transitions.
 * Keeps draft-publish and operator lifecycle policy out of the large controller.
 */

export class ChallengeStatusTransitionError extends Error {
  constructor(publicMessage, statusCode = 400) {
    super(publicMessage);
    this.name = 'ChallengeStatusTransitionError';
    this.publicMessage = publicMessage;
    this.statusCode = statusCode;
  }
}

const fail = (message, statusCode = 400) => {
  throw new ChallengeStatusTransitionError(message, statusCode);
};

const STATUS_TRANSITIONS = {
  complete: {
    allowedStatuses: ['active'],
    updateFields: { status: 'completed' },
    errorMessage: 'Only active challenges can be completed',
  },
  cancel: {
    allowedStatuses: ['draft', 'active'],
    updateFields: { status: 'cancelled', isPublic: false },
    errorMessage: 'Only draft or active challenges can be cancelled',
  },
  archive: {
    allowedStatuses: ['completed', 'cancelled'],
    updateFields: { status: 'archived', isPublic: false },
    errorMessage: 'Only completed or cancelled challenges can be archived',
  },
};

const normalizeChallengeId = (value) => {
  const id = String(value ?? '').trim();
  if (!id) fail('Challenge id is required');
  return id;
};

const canManageChallenge = (challenge, viewer) => {
  if (!viewer) return false;
  if (viewer.role === 'admin') return true;
  if (viewer.role === 'trainer') return String(challenge.createdBy) === String(viewer.id);
  return false;
};

const normalizePublishVisibility = (value = 'public') => {
  const visibility = String(value ?? 'public').trim().toLowerCase();
  if (visibility !== 'public' && visibility !== 'private') {
    fail('Challenge visibility must be public or private');
  }
  return visibility;
};

const normalizeStatusAction = (value = 'publish') => {
  const action = String(value ?? 'publish').trim().toLowerCase();
  if (action === 'publish' || STATUS_TRANSITIONS[action]) return action;
  fail('Unsupported challenge status action');
};

const parseChallengeWindowDate = (value, field) => {
  if (value === undefined || value === null || (typeof value === 'string' && value.trim() === '')) {
    fail(`${field} must be a valid date`);
  }
  const parsed = value instanceof Date ? new Date(value.getTime()) : new Date(value);
  if (Number.isNaN(parsed.getTime())) fail(`${field} must be a valid date`);
  return parsed;
};

const assertPublishWindowOpen = ({ challenge, now }) => {
  const startDate = parseChallengeWindowDate(challenge.startDate, 'Challenge start date');
  const endDate = parseChallengeWindowDate(challenge.endDate, 'Challenge end date');
  const publishTime = parseChallengeWindowDate(now, 'Publish time');

  if (endDate <= startDate) fail('Challenge end date must be after start date');
  if (endDate <= publishTime) fail('Challenge end date must still be in the future');
};

const assertCompletionWindowStarted = ({ challenge, now }) => {
  const startDate = parseChallengeWindowDate(challenge.startDate, 'Challenge start date');
  const completionTime = parseChallengeWindowDate(now, 'Completion time');

  if (startDate > completionTime) fail('Scheduled challenges cannot be completed before they start');
};

const assertPrivateAudienceReady = async ({ ChallengeParticipant, challengeId }) => {
  if (!ChallengeParticipant?.count) fail('Challenge participant model unavailable', 500);
  const audienceCount = await ChallengeParticipant.count({ where: { challengeId } });
  if (audienceCount <= 0) fail('Private challenges require at least one saved audience member');
};

const loadManageableChallenge = async ({ models, challengeId, viewer }) => {
  const Challenge = models?.Challenge;
  if (!Challenge?.findByPk) fail('Challenge model unavailable', 500);

  const id = normalizeChallengeId(challengeId);
  const challenge = await Challenge.findByPk(id);
  if (!challenge) fail('Challenge not found', 404);
  if (!canManageChallenge(challenge, viewer)) fail('You cannot manage this challenge', 403);

  return { id, challenge };
};

const publishChallengeRecord = async ({ models, challenge, challengeId, visibility = 'public', now = new Date() }) => {
  if (challenge.status !== 'draft') fail('Only draft challenges can be published');
  const publishVisibility = normalizePublishVisibility(visibility);
  assertPublishWindowOpen({ challenge, now });
  if (typeof challenge.update !== 'function') fail('Challenge update unavailable', 500);
  if (publishVisibility === 'private') {
    await assertPrivateAudienceReady({ ChallengeParticipant: models?.ChallengeParticipant, challengeId });
  }

  const updated = await challenge.update({ status: 'active', isPublic: publishVisibility === 'public' });
  return updated ?? challenge;
};

const applyLifecycleTransition = async ({ challenge, action, now = new Date() }) => {
  const transition = STATUS_TRANSITIONS[action];
  if (!transition) fail('Unsupported challenge status action');
  if (!transition.allowedStatuses.includes(challenge.status)) fail(transition.errorMessage);
  if (action === 'complete') assertCompletionWindowStarted({ challenge, now });
  if (typeof challenge.update !== 'function') fail('Challenge update unavailable', 500);

  const updated = await challenge.update(transition.updateFields);
  return updated ?? challenge;
};

export const publishManagedChallenge = async ({ models, challengeId, viewer, visibility = 'public', now = new Date() } = {}) => {
  const { id, challenge } = await loadManageableChallenge({ models, challengeId, viewer });
  return publishChallengeRecord({ models, challenge, challengeId: id, visibility, now });
};

export const transitionManagedChallengeStatus = async ({
  models,
  challengeId,
  viewer,
  action = 'publish',
  visibility = 'public',
  now = new Date(),
} = {}) => {
  const { id, challenge } = await loadManageableChallenge({ models, challengeId, viewer });
  const normalizedAction = normalizeStatusAction(action);

  if (normalizedAction === 'publish') {
    return publishChallengeRecord({ models, challenge, challengeId: id, visibility, now });
  }

  return applyLifecycleTransition({ challenge, action: normalizedAction, now });
};