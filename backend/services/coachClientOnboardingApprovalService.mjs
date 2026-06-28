/**
 * coachClientOnboardingApprovalService.mjs
 * ========================================
 * Deterministic executor for human-approved Swan Coach onboarding drafts.
 *
 * Coach may prepare a draft from dictation. This service owns the real client
 * create path after a trainer/admin approves that draft.
 */
import crypto from 'node:crypto';
import { QueryTypes } from 'sequelize';
import sequelize from '../database.mjs';
import {
  getClientProgress,
  getClientTrainerAssignment,
  getUser,
} from '../models/index.mjs';
import { generateClaimToken } from './claimTokenService.mjs';
import { isNonDeductingClientSource } from './sessionBillingPolicy.mjs';
import { buildClientOnboardingCoverageLedger } from './clientOnboardingCoverageLedgerService.mjs';
import {
  cleanText,
  normalizeCoachOnboardingDraft,
  parseWholeSessionCount,
} from './coachClientOnboardingDraftNormalizer.mjs';
import logger from '../utils/logger.mjs';

export { normalizeCoachOnboardingDraft };

export function getApprovedOnboardingAvailableSessions(draft) {
  if (isNonDeductingClientSource(draft?.clientSource)) return 0;
  return parseWholeSessionCount(draft?.availableSessions);
}


export function buildCoachOnboardingAccessHandoff({
  claimCode,
  claimExpiresAt,
  frontendUrl = process.env.FRONTEND_URL || 'https://sswanstudios.com',
} = {}) {
  const code = cleanText(claimCode, 80);
  if (!code) {
    return { credentialMode: 'claim_link_needed' };
  }

  const baseUrl = String(frontendUrl || 'https://sswanstudios.com').replace(/\/+$/, '');
  const expires = claimExpiresAt instanceof Date ? claimExpiresAt : new Date(claimExpiresAt);
  const handoff = {
    credentialMode: 'claim_link_ready',
    claimCode: code,
    claimUrl: `${baseUrl}/claim/${encodeURIComponent(code)}`,
    claimExpiresAt: Number.isNaN(expires.getTime()) ? undefined : expires.toISOString(),
  };

  return Object.fromEntries(Object.entries(handoff).filter(([, value]) => value !== undefined));
}


function createRandomPassword() {
  return crypto.randomBytes(18).toString('base64url').slice(0, 18);
}


async function generateUniqueUsername(firstName, lastName, User, transaction) {
  const base = `${firstName}.${lastName}`.toLowerCase().replace(/[^a-z0-9.]/g, '');
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const candidate = `${base}.${crypto.randomBytes(2).toString('hex')}`;
    const existing = await User.findOne({
      where: { username: candidate },
      attributes: ['id'],
      transaction,
    });
    if (!existing) return candidate;
  }
  return `${base}.${Date.now().toString(36)}`;
}

async function createClientProgressIfAvailable({ db, userId }) {
  try {
    const rows = await db.query(
      `SELECT to_regclass('client_progress') AS exists`,
      { type: QueryTypes.SELECT },
    );
    if (!rows[0]?.exists) return 'skipped_missing_table';

    const ClientProgress = getClientProgress();
    await ClientProgress.findOrCreate({
      where: { userId },
      defaults: { userId },
    });
    return 'created_or_existing';
  } catch (progressError) {
    logger.warn('[CoachOnboardingApproval] ClientProgress skipped for user %s: %s', userId, progressError.message);
    return 'skipped_error';
  }
}

export function summarizeOnboardingDraftForReview(proposal) {
  const draft = normalizeCoachOnboardingDraft(proposal);
  return {
    client: {
      firstName: draft.firstName,
      lastName: draft.lastName,
      email: draft.email,
      phone: draft.phone,
      clientSource: draft.clientSource,
      fitnessGoal: draft.fitnessGoal,
      healthConcerns: draft.healthConcerns,
      trainingExperience: draft.trainingExperience,
      communicationStyle: draft.communicationStyle,
      nutritionPrefs: draft.nutritionPrefs,
      questionnaireResponses: draft.questionnaireResponses,
      coverageItems: draft.coverageItems,
      trainerNotes: draft.trainerNotes,
      onboardingContext: draft.onboardingContext,
      availableSessions: getApprovedOnboardingAvailableSessions(draft),
    },
  };
}

export async function createClientFromCoachOnboardingProposal({
  proposal,
  req,
  sequelizeOverride = null,
}) {
  if (!['admin', 'trainer'].includes(req.user?.role)) {
    const err = new Error('Only trainers and admins can approve client onboarding drafts.');
    err.code = 'ONBOARDING_FORBIDDEN';
    throw err;
  }

  const db = sequelizeOverride || sequelize;
  const draft = normalizeCoachOnboardingDraft(proposal);
  const User = getUser();
  const ClientTrainerAssignment = getClientTrainerAssignment();

  const existing = await User.findOne({
    where: { email: draft.email },
    attributes: ['id'],
  });
  if (existing) {
    const err = new Error('A client already exists with that email.');
    err.code = 'ONBOARDING_DUPLICATE_EMAIL';
    throw err;
  }

  const transaction = await db.transaction();
  try {
    const invite = generateClaimToken();
    const username = await generateUniqueUsername(
      draft.firstName,
      draft.lastName,
      User,
      transaction,
    );

    const client = await User.create({
      firstName: draft.firstName,
      lastName: draft.lastName,
      email: draft.email,
      phone: draft.phone,
      dateOfBirth: draft.dateOfBirth,
      gender: draft.gender,
      username,
      password: createRandomPassword(),
      role: 'client',
      clientSource: draft.clientSource,
      accountStatus: 'stub',
      forcePasswordChange: true,
      availableSessions: getApprovedOnboardingAvailableSessions(draft),
      healthConcerns: draft.healthConcerns,
      fitnessGoal: draft.fitnessGoal,
      trainingExperience: draft.trainingExperience,
      isActive: true,
      isOnboardingComplete: false,
      claimTokenHash: invite.hash,
      claimTokenExpires: invite.expires,
    }, { transaction });

    await ClientTrainerAssignment.create({
      clientId: client.id,
      trainerId: req.user.id,
      assignedBy: req.user.id,
      assignedAt: new Date(),
      status: 'active',
      notes: draft.trainerNotes || 'Created from approved Swan Coach onboarding draft.',
    }, { transaction });

    await transaction.commit();
    const progressStatus = await createClientProgressIfAvailable({ db, userId: client.id });
    const accessHandoff = buildCoachOnboardingAccessHandoff({
      claimCode: invite.plainToken,
      claimExpiresAt: invite.expires,
    });
    const onboardingFieldLedger = buildClientOnboardingCoverageLedger({
      client,
      draft,
      questionnaire: {
        nutritionPrefs: draft.nutritionPrefs,
        responsesJson: draft.questionnaireResponses,
      },
      responses: draft.questionnaireResponses,
    });

    logger.info('[CoachOnboardingApproval] Client created from approved draft', {
      clientId: client.id,
      createdByUserId: req.user.id,
      clientSource: draft.clientSource,
    });

    return {
      client: {
        id: client.id,
        firstName: client.firstName,
        lastName: client.lastName,
        email: client.email,
        clientSource: client.clientSource,
      },
      accessHandoff,
      invitationStatus: accessHandoff.credentialMode,
      assignmentStatus: 'active',
      onboardingFieldLedger,
      onboardingMissingFields: onboardingFieldLedger.missingFields,
      progressStatus,
      prefilledFields: Object.entries(draft)
        .filter(([, value]) => value !== null && value !== undefined && value !== '')
        .map(([key]) => key),
    };
  } catch (err) {
    await transaction.rollback();
    throw err;
  }
}
