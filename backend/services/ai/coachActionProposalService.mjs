/**
 * coachActionProposalService.mjs
 * ==============================
 * Converts model-emitted action blocks into encrypted approval proposals.
 * The model prepares drafts; deterministic services own final writes.
 */
import { persistCoachActionProposal as createProposal } from './coachWorkoutIntentDraftService.mjs';
import { QueryTypes } from 'sequelize';
import sequelize from '../../database.mjs';
import logger from '../../utils/logger.mjs';

import {
  classifyActionBlock,
  parseJsonActionBlocks,
  parseSafeFrontendDispatch,
} from './coachActionProposalClassifier.mjs';
import { linkCoachActionProposalToIntake } from './coachActionProposalIntakeLinkService.mjs';
import { filterEligibleFrontendActions } from './coachDispatchEligibilityService.mjs';

export const COACH_PROPOSAL_STATUS = Object.freeze({
  PENDING: 'PENDING',
  APPLYING: 'APPLYING',
  APPROVED: 'APPROVED',
  APPLIED: 'APPLIED',
  REJECTED: 'REJECTED',
  FAILED: 'FAILED',
});

export const COACH_PROPOSAL_TYPE = Object.freeze({
  CLIENT_ONBOARDING: 'client_onboarding',
  CLIENT_PROFILE_COVERAGE_UPDATE: 'client_profile_coverage_update',
  WORKOUT_LOG: 'workout_log',
  NUTRITION_LOG: 'nutrition_log',
  CLIENT_DATA_UPDATE: 'client_data_update',
  FRONTEND_DISPATCH: 'frontend_dispatch',
  CLARIFICATION: 'clarification',
  SPLIT_PLAN: 'split_plan',
  PLAN_EDIT: 'plan_edit',
});

export class CoachActionProposalSchemaUnavailableError extends Error {
  constructor() {
    super('coach_action_proposals table is not available');
    this.name = 'CoachActionProposalSchemaUnavailableError';
    this.code = 'COACH_ACTION_PROPOSAL_SCHEMA_UNAVAILABLE';
  }
}

const SCHEMA_VERSION = '2026-05-06';

function proposalTitle(type) {
  const titles = {
    [COACH_PROPOSAL_TYPE.CLIENT_ONBOARDING]: 'Review client onboarding draft',
    [COACH_PROPOSAL_TYPE.CLIENT_PROFILE_COVERAGE_UPDATE]: 'Review client profile coverage update',
    [COACH_PROPOSAL_TYPE.WORKOUT_LOG]: 'Review workout log draft',
    [COACH_PROPOSAL_TYPE.NUTRITION_LOG]: 'Review nutrition log draft',
    [COACH_PROPOSAL_TYPE.CLIENT_DATA_UPDATE]: 'Review client data update',
    [COACH_PROPOSAL_TYPE.FRONTEND_DISPATCH]: 'Review workout form submission',
    [COACH_PROPOSAL_TYPE.CLARIFICATION]: 'Answer Coach clarification',
    [COACH_PROPOSAL_TYPE.SPLIT_PLAN]: 'Review transcript split plan',
  };
  return titles[type] || 'Review Coach proposal';
}

function parseSummaryClientId(...candidates) {
  for (const value of candidates) {
    if (value === null || value === undefined || value === '') continue;

    if (typeof value === 'number') {
      return Number.isSafeInteger(value) && value > 0 ? value : null;
    }

    if (typeof value === 'string' && /^[1-9]\d*$/.test(value)) {
      const id = Number(value);
      return Number.isSafeInteger(id) ? id : null;
    }

    return null;
  }

  return null;
}

function isSummaryObject(value) {
  return value && typeof value === 'object' && !Array.isArray(value);
}

function summarizeProposal(type, payload, conversation) {
  const meta = payload.proposalMeta || {};
  const base = {
    title: proposalTitle(type),
    actionRequired: 'Approve before any record changes are applied.',
    confirmationMode: 'trainer_approval_required',
    evidenceCount: Array.isArray(meta.evidenceRefs) ? meta.evidenceRefs.length : 0,
    safetyFlagCount: Array.isArray(meta.safetyFlags) ? meta.safetyFlags.length : 0,
  };
  if (type === COACH_PROPOSAL_TYPE.WORKOUT_LOG) {
    const exercises = Array.isArray(payload.exercises) ? payload.exercises : [];
    return {
      ...base,
      clientId: parseSummaryClientId(payload.clientId, conversation?.targetUserId),
      date: payload.date || null,
      exerciseCount: exercises.length,
    };
  }
  if (type === COACH_PROPOSAL_TYPE.NUTRITION_LOG) {
    // summary_json is stored CLEAR-TEXT → IDs + counts only, never meal free-text.
    const meals = Array.isArray(payload.meals) ? payload.meals : [];
    const totalCalories = meals.reduce((s, m) => s + (Number(m.calories) || 0), 0);
    return {
      ...base,
      clientId: parseSummaryClientId(payload.clientId, conversation?.targetUserId),
      date: payload.date || null,
      mealCount: meals.length,
      totalCalories: Math.round(totalCalories),
    };
  }
  if (type === COACH_PROPOSAL_TYPE.CLIENT_ONBOARDING) {
    const data = payload.data || payload;
    return {
      ...base,
      displayName: 'New client draft',
      nameFieldsPresent: Boolean(data.firstName || data.lastName),
      sectionCount: Object.keys(data).length,
    };
  }
  if (type === COACH_PROPOSAL_TYPE.CLIENT_PROFILE_COVERAGE_UPDATE) {
    const profileFields = isSummaryObject(payload.profileFields) ? payload.profileFields : {};
    const questionnaireResponses = isSummaryObject(payload.questionnaireResponses)
      ? payload.questionnaireResponses
      : {};
    const coverageUpdates = Array.isArray(payload.coverageUpdates) ? payload.coverageUpdates : [];
    return {
      ...base,
      clientId: parseSummaryClientId(payload.clientId, payload.targetUserId, conversation?.targetUserId),
      profileFieldCount: Object.keys(profileFields).length,
      questionnaireResponseCount: Object.keys(questionnaireResponses).length,
      coverageUpdateCount: coverageUpdates.length,
    };
  }
  if (type === COACH_PROPOSAL_TYPE.PLAN_EDIT) {
    const items = Array.isArray(payload.items) ? payload.items : [];
    return {
      ...base,
      clientId: parseSummaryClientId(payload.clientId, conversation?.targetUserId),
      planId: payload.planId ?? null,
      itemCount: items.length,
      fields: [...new Set(items.map((item) => item?.field).filter(Boolean))],
    };
  }
  if (type === COACH_PROPOSAL_TYPE.CLIENT_DATA_UPDATE) {
    return {
      ...base,
      clientId: parseSummaryClientId(payload.targetUserId, conversation?.targetUserId),
      updateCount: Array.isArray(payload.updates) ? payload.updates.length : 0,
    };
  }
  if (type === COACH_PROPOSAL_TYPE.CLARIFICATION) {
    return {
      ...base,
      actionRequired: 'Answer clarification before deterministic approval can continue.',
      question: payload.question || 'Clarification needed',
      optionCount: Array.isArray(payload.options) ? payload.options.length : 0,
    };
  }
  if (type === COACH_PROPOSAL_TYPE.SPLIT_PLAN) {
    return {
      ...base,
      actionRequired: 'Approve split before workout cards are prepared.',
      splitCount: Array.isArray(payload.splits) ? payload.splits.length : 0,
    };
  }
  return { ...base, event: payload.event || 'frontend_dispatch' };
}

async function proposalTableExists(db) {
  const rows = await db.query(
    `SELECT to_regclass('public.coach_action_proposals') AS exists`,
    { type: QueryTypes.SELECT },
  );
  return !!rows?.[0]?.exists;
}

export async function createCoachActionProposalDraft({
  type,
  payload,
  user,
  conversation,
  sourceMessageId = null,
  db = null,
  sequelizeOverride = null,
  requestKey = null,
}) {
  const targetDb = db || sequelizeOverride || sequelize;
  const summary = summarizeProposal(type, payload, conversation);
  const proposal = { type, payload, summary };
  const persisted = await createProposal({
    type,
    payload,
    summary,
    user,
    conversation,
    sourceMessageId,
    db: targetDb,
    requestKey,
  });
  await linkCoachActionProposalToIntake({ proposal, persisted, user, db: targetDb });
  return persisted;
}

export async function createCoachActionProposalsFromAiResponse({
  content,
  user,
  conversation,
  sourceMessageId = null,
  routeContext = null,
  sequelizeOverride = null,
}) {
  const db = sequelizeOverride || sequelize;
  const proposals = [];
  let frontendActions = [];
  let frontendActionRefusals = [];
  const canPrepareWrites = user?.role === 'admin' || user?.role === 'trainer';

  for (const block of parseJsonActionBlocks(content)) {
    if (canPrepareWrites) {
      const frontendDispatch = parseSafeFrontendDispatch(block);
      if (frontendDispatch) {
        frontendActions.push({ event: frontendDispatch.event, payload: frontendDispatch.payload || {} });
        continue;
      }
    }
    if (!canPrepareWrites) continue;
    const classified = classifyActionBlock(block, conversation, {
      proposalTypes: COACH_PROPOSAL_TYPE,
      schemaVersion: SCHEMA_VERSION,
      routeContext,
    });
    if (!classified) continue;
    const summary = summarizeProposal(classified.type, classified.payload, conversation);
    proposals.push({ ...classified, summary });
  }

  // Cortex P0 §5.4: chat dispatches pass the same deterministic eligibility as
  // the workout builder (registry membership + pain exclusions, fail-closed)
  // before they can stage anything into a client's form.
  if (frontendActions.length > 0) {
    const targetUserId = conversation?.targetUserId || user?.id;
    const eligibility = await filterEligibleFrontendActions({
      actions: frontendActions,
      targetUserId,
      requestingUserId: user?.id,
      loadRegistry: async () => {
        const { getExerciseRegistryFromDB } = await import('../variationEngine.mjs');
        return getExerciseRegistryFromDB();
      },
      loadClientContext: async (clientId, requesterId) => {
        const { getClientContext } = await import('../clientIntelligenceService.mjs');
        return getClientContext(clientId, requesterId);
      },
    });
    frontendActions = eligibility.allowed;
    frontendActionRefusals = eligibility.refusals;
  }

  if (proposals.length === 0) return { proposals: [], frontendActions, frontendActionRefusals };
  if (!await proposalTableExists(db)) throw new CoachActionProposalSchemaUnavailableError();

  const persisted = [];
  for (const proposal of proposals) {
    const saved = await createProposal({
      ...proposal,
      user,
      conversation,
      sourceMessageId,
      db,
    });
    await linkCoachActionProposalToIntake({ proposal, persisted: saved, user, db });
    persisted.push(saved);
  }
  logger.info('[CoachActionProposal] Prepared %d pending proposal(s)', persisted.length);
  return { proposals: persisted, frontendActions, frontendActionRefusals };
}
