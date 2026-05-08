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
import logger from '../utils/logger.mjs';

const CLIENT_SOURCES = new Set(['swanstudios', 'move_fitness', 'external']);
const TEXT_FIELDS = [
  'phone',
  'dateOfBirth',
  'gender',
  'fitnessGoal',
  'healthConcerns',
  'trainingExperience',
  'trainerNotes',
];

function cleanText(value, maxLength = 2000) {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed ? trimmed.slice(0, maxLength) : null;
}

function normalizeEmail(value, firstName, lastName) {
  const email = cleanText(value, 320);
  if (email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return email.toLowerCase();
  const suffix = crypto.randomBytes(3).toString('hex');
  return `${firstName}.${lastName}.${suffix}@stub.swanstudios.com`
    .toLowerCase()
    .replace(/[^a-z0-9@._-]/g, '');
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

export function normalizeCoachOnboardingDraft(proposal) {
  const raw = proposal?.payload?.data || proposal?.payload || proposal?.data || proposal || {};
  const firstName = cleanText(raw.firstName, 80);
  const lastName = cleanText(raw.lastName, 80);
  if (!firstName || !lastName) {
    const err = new Error('Client first and last name are required before approval.');
    err.code = 'ONBOARDING_REQUIRED_FIELDS_MISSING';
    throw err;
  }

  const clientSource = cleanText(raw.clientSource, 40);
  if (!CLIENT_SOURCES.has(clientSource)) {
    const err = new Error('Client source is required before approval.');
    err.code = 'ONBOARDING_REQUIRED_FIELDS_MISSING';
    throw err;
  }
  const draft = {
    firstName,
    lastName,
    email: normalizeEmail(raw.email, firstName, lastName),
    clientSource,
    availableSessions: Number.isFinite(Number(raw.availableSessions))
      ? Math.max(0, Number(raw.availableSessions))
      : 0,
  };

  for (const field of TEXT_FIELDS) {
    draft[field] = cleanText(raw[field], field === 'phone' ? 64 : 2000);
  }
  return draft;
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
      trainerNotes: draft.trainerNotes,
      availableSessions: draft.availableSessions,
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
      availableSessions: draft.clientSource === 'move_fitness' ? 0 : draft.availableSessions,
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
      invitationStatus: 'created_hidden',
      assignmentStatus: 'active',
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
