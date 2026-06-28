/**
 * clientProfileCoverageUpdateService.mjs
 * ======================================
 * Applies approved existing-client onboarding/profile improvements without
 * creating duplicate clients or marking onboarding complete.
 */
import { getAllModels } from '../models/index.mjs';
import {
  computeDerivedFields,
  isPlainObject,
} from '../utils/onboardingHelpers.mjs';
import { upsertCoverageItems } from './clientOnboardingCoverageLedgerWriteService.mjs';
import { createClientCoverageFollowUpNotifications } from './clientOnboardingFollowUpNotificationService.mjs';

const PROFILE_FIELD_LIMITS = Object.freeze({
  phone: 64,
  gender: 80,
  dateOfBirth: 32,
  fitnessGoal: 2000,
  healthConcerns: 2000,
  trainingExperience: 2000,
  emergencyContact: 500,
});

function cleanText(value, maxLength) {
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  return trimmed ? trimmed.slice(0, maxLength) : undefined;
}

function normalizeProfileFields(value) {
  if (!isPlainObject(value)) return {};
  return Object.fromEntries(Object.entries(PROFILE_FIELD_LIMITS)
    .map(([field, maxLength]) => [field, cleanText(value[field], maxLength)])
    .filter(([, fieldValue]) => fieldValue !== undefined));
}

function normalizeResponses(value) {
  return isPlainObject(value) ? { ...value } : {};
}

function normalizeCoverageUpdates(value) {
  return Array.isArray(value) ? value.slice(0, 80) : [];
}

function hasWork({ profileFields, questionnaireResponses, coverageUpdates }) {
  return Object.keys(profileFields).length > 0
    || Object.keys(questionnaireResponses).length > 0
    || coverageUpdates.length > 0;
}

function emptyUpdateError() {
  const err = new Error('Client profile coverage update proposal has no updates to apply.');
  err.code = 'PROFILE_COVERAGE_UPDATE_EMPTY';
  return err;
}

function notFoundError() {
  const err = new Error('Client user not found.');
  err.code = 'PROFILE_COVERAGE_CLIENT_NOT_FOUND';
  return err;
}

async function withTransaction(db, work) {
  if (typeof db?.transaction === 'function') return db.transaction(work);
  return work(null);
}

async function updateQuestionnaire({ ClientOnboardingQuestionnaire, clientId, actorId, responses, transaction }) {
  const existing = await ClientOnboardingQuestionnaire.findOne({
    where: { userId: clientId },
    order: [['createdAt', 'DESC']],
    transaction,
  });
  const merged = { ...(existing?.responsesJson || {}), ...responses };
  const derived = computeDerivedFields(merged);
  const fields = {
    responsesJson: merged,
    primaryGoal: derived.primaryGoal,
    trainingTier: derived.trainingTier,
    commitmentLevel: derived.commitmentLevel,
    healthRisk: derived.healthRisk,
    nutritionPrefs: derived.nutritionPrefs,
    status: 'in_progress',
    completedAt: null,
  };

  if (existing?.update) {
    await existing.update(fields, { transaction });
    return { id: existing.id ?? null, action: 'updated' };
  }
  const created = await ClientOnboardingQuestionnaire.create({
    userId: clientId,
    createdBy: actorId || null,
    questionnaireVersion: '3.0',
    ...fields,
  }, { transaction });
  return { id: created?.id ?? null, action: 'created' };
}

const emptyFollowUpResult = () => ({ requested: 0, created: 0, skipped: 0, failed: 0, items: [] });

async function maybeCreateFollowUps({ clientId, actorId, coverageItems, createNotificationFn, CoverageItemModel }) {
  if (typeof createNotificationFn !== 'function') return emptyFollowUpResult();
  return createClientCoverageFollowUpNotifications({
    clientId,
    actorId,
    coverageItems,
    createNotificationFn,
    CoverageItemModel,
  });
}

export async function applyClientProfileCoverageUpdate({
  clientId,
  actorId,
  payload = {},
  proposalId = null,
  db,
  models = null,
  CoverageItemModel = null,
  createNotificationFn = null,
} = {}) {
  const profileFields = normalizeProfileFields(payload.profileFields || payload.profileUpdates || payload.profile);
  const questionnaireResponses = normalizeResponses(
    payload.questionnaireResponses || payload.responsesJson || payload.responses,
  );
  const coverageUpdates = normalizeCoverageUpdates(payload.coverageUpdates || payload.coverageItems);

  if (!hasWork({ profileFields, questionnaireResponses, coverageUpdates })) throw emptyUpdateError();

  const targetModels = models || getAllModels();
  const updateResult = await withTransaction(db, async (transaction) => {
    const user = await targetModels.User?.findByPk?.(clientId, { transaction });
    if (!user?.update) throw notFoundError();

    let profileUpdated = false;
    if (Object.keys(profileFields).length > 0) {
      await user.update(profileFields, { transaction });
      profileUpdated = true;
    }

    let questionnaireResult = null;
    if (Object.keys(questionnaireResponses).length > 0) {
      questionnaireResult = await updateQuestionnaire({
        ClientOnboardingQuestionnaire: targetModels.ClientOnboardingQuestionnaire,
        clientId,
        actorId,
        responses: questionnaireResponses,
        transaction,
      });
    }

    const coverageResult = coverageUpdates.length > 0
      ? await upsertCoverageItems({
        clientId,
        items: coverageUpdates,
        actorId,
        proposalId,
        CoverageItemModel,
        transaction,
      })
      : { upserted: 0, items: [] };

    return {
      clientId,
      profileUpdated,
      questionnaireUpdated: Boolean(questionnaireResult),
      questionnaire: questionnaireResult,
      coverageUpdated: coverageResult.upserted,
      coverageItems: coverageResult.items,
      onboardingComplete: false,
    };
  });

  const followUpNotifications = await maybeCreateFollowUps({
    clientId,
    actorId,
    coverageItems: updateResult.coverageItems,
    createNotificationFn,
    CoverageItemModel,
  });

  return {
    ...updateResult,
    followUpNotifications,
  };
}