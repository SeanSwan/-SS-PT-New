/**
 * Managed challenge audience replacement.
 * Uses challenge_participants as the draft roster so publish/progress stay canonical.
 */

import { Op } from 'sequelize';

export class ChallengeAudienceValidationError extends Error {
  constructor(publicMessage, statusCode = 400) {
    super(publicMessage);
    this.name = 'ChallengeAudienceValidationError';
    this.publicMessage = publicMessage;
    this.statusCode = statusCode;
  }
}

const fail = (message, statusCode = 400) => {
  throw new ChallengeAudienceValidationError(message, statusCode);
};

const normalizeChallengeId = (value) => {
  const id = String(value ?? '').trim();
  if (!id) fail('Challenge id is required');
  return id;
};

const normalizeAudienceUserIds = (value) => {
  if (!Array.isArray(value)) fail('Audience userIds must be an array');

  const seen = new Set();
  const normalized = [];

  for (const rawId of value) {
    const parsedId = Number(rawId);
    if (!Number.isInteger(parsedId) || parsedId <= 0) {
      fail('Audience userIds must contain positive integer ids');
    }

    if (!seen.has(parsedId)) {
      seen.add(parsedId);
      normalized.push(parsedId);
    }
  }

  if (normalized.length === 0) fail('Select at least one audience client');
  return normalized;
};

const normalizeMaxParticipants = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
};

const canManageChallenge = (challenge, viewer) => {
  if (!viewer) return false;
  if (viewer.role === 'admin') return true;
  if (viewer.role === 'trainer') return String(challenge.createdBy) === String(viewer.id);
  return false;
};

const assertAdminAudience = async ({ User, userIds, transaction }) => {
  if (typeof User?.count !== 'function') fail('User model unavailable', 500);

  const eligibleCount = await User.count({
    where: {
      id: { [Op.in]: userIds },
      role: { [Op.in]: ['client', 'user'] },
    },
    transaction,
  });

  if (eligibleCount !== userIds.length) fail('Audience includes unavailable clients');
};

const assertTrainerAudience = async ({ ClientTrainerAssignment, viewer, userIds, transaction }) => {
  if (typeof ClientTrainerAssignment?.count !== 'function') fail('Client trainer assignment model unavailable', 500);

  const assignedCount = await ClientTrainerAssignment.count({
    where: {
      trainerId: viewer.id,
      clientId: { [Op.in]: userIds },
      status: 'active',
    },
    transaction,
  });

  if (assignedCount !== userIds.length) fail('Audience includes clients outside your active assignments', 403);
};

const assertAudienceScope = async ({ models, viewer, userIds, transaction }) => {
  if (viewer?.role === 'admin') {
    await assertAdminAudience({ User: models.User, userIds, transaction });
    return;
  }

  if (viewer?.role === 'trainer') {
    await assertTrainerAudience({ ClientTrainerAssignment: models.ClientTrainerAssignment, viewer, userIds, transaction });
    return;
  }

  fail('You cannot manage challenge audiences', 403);
};

export const replaceManagedChallengeAudience = async ({ models, challengeId, viewer, userIds, transaction } = {}) => {
  const { Challenge, ChallengeParticipant } = models ?? {};
  if (typeof Challenge?.findByPk !== 'function') fail('Challenge model unavailable', 500);
  if (typeof ChallengeParticipant?.destroy !== 'function' || typeof ChallengeParticipant?.bulkCreate !== 'function') {
    fail('Challenge participant model unavailable', 500);
  }

  const id = normalizeChallengeId(challengeId);
  const audienceIds = normalizeAudienceUserIds(userIds);
  const challenge = await Challenge.findByPk(id, { transaction });

  if (!challenge) fail('Challenge not found', 404);
  if (!canManageChallenge(challenge, viewer)) fail('You cannot manage this challenge', 403);
  if (challenge.status !== 'draft') fail('Only draft challenges can have audiences replaced');

  const participantCap = normalizeMaxParticipants(challenge.maxParticipants);
  if (participantCap !== null && audienceIds.length > participantCap) {
    fail(`Audience exceeds this challenge's ${participantCap} participant cap`);
  }

  await assertAudienceScope({ models, viewer, userIds: audienceIds, transaction });

  await ChallengeParticipant.destroy({ where: { challengeId: id }, transaction });
  await ChallengeParticipant.bulkCreate(
    audienceIds.map((userId) => ({
      userId,
      challengeId: id,
      status: 'joined',
      currentProgress: 0,
      progressPercentage: 0,
      joinedAt: new Date(),
    })),
    { transaction, validate: true },
  );

  const updatedChallenge = await challenge.update({ currentParticipants: audienceIds.length }, { transaction });

  return {
    challenge: updatedChallenge ?? challenge,
    audienceCount: audienceIds.length,
  };
};
