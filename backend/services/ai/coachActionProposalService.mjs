/**
 * coachActionProposalService.mjs
 * ==============================
 * Converts model-emitted action blocks into encrypted approval proposals.
 * The model prepares drafts; deterministic services own final writes.
 */
import { randomUUID } from 'node:crypto';
import { QueryTypes } from 'sequelize';
import sequelize from '../../database.mjs';
import logger from '../../utils/logger.mjs';
import { encryptPayload } from '../plaudCipherService.mjs';
import {
  classifyActionBlock,
  parseJsonActionBlocks,
  parseSafeFrontendDispatch,
} from './coachActionProposalClassifier.mjs';

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
  WORKOUT_LOG: 'workout_log',
  CLIENT_DATA_UPDATE: 'client_data_update',
  FRONTEND_DISPATCH: 'frontend_dispatch',
  CLARIFICATION: 'clarification',
  SPLIT_PLAN: 'split_plan',
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
    [COACH_PROPOSAL_TYPE.WORKOUT_LOG]: 'Review workout log draft',
    [COACH_PROPOSAL_TYPE.CLIENT_DATA_UPDATE]: 'Review client data update',
    [COACH_PROPOSAL_TYPE.FRONTEND_DISPATCH]: 'Review workout form submission',
    [COACH_PROPOSAL_TYPE.CLARIFICATION]: 'Answer Coach clarification',
    [COACH_PROPOSAL_TYPE.SPLIT_PLAN]: 'Review transcript split plan',
  };
  return titles[type] || 'Review Coach proposal';
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
      clientId: Number(payload.clientId || conversation?.targetUserId || 0) || null,
      date: payload.date || null,
      exerciseCount: exercises.length,
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
  if (type === COACH_PROPOSAL_TYPE.CLIENT_DATA_UPDATE) {
    return {
      ...base,
      clientId: Number(conversation?.targetUserId || 0) || null,
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

function mapProposalRow(row) {
  const summary = row.summary_json || {};
  return {
    id: row.id,
    type: row.proposal_type,
    status: row.status,
    title: summary.title || proposalTitle(row.proposal_type),
    summary,
    createdAt: row.created_at,
  };
}

async function createProposal({ type, payload, summary, user, conversation, sourceMessageId, db }) {
  const enc = encryptPayload({
    type,
    payload,
    conversationId: conversation?.id || null,
    targetUserId: conversation?.targetUserId || null,
  });
  const id = randomUUID();
  const rows = await db.query(
    `INSERT INTO coach_action_proposals (
       id, created_by_user_id, conversation_id, source_message_id,
       proposal_type, status, schema_version, summary_json,
       proposal_cipher, proposal_iv, proposal_tag, cipher_key_id
     ) VALUES (
       :id, :userId, :conversationId, :sourceMessageId,
       :proposalType, 'PENDING', :schemaVersion, CAST(:summaryJson AS jsonb),
       :cipher, :iv, :tag, :keyId
     )
     RETURNING id, proposal_type, status, summary_json, created_at`,
    {
      replacements: {
        id,
        userId: user.id,
        conversationId: conversation?.id || null,
        sourceMessageId: sourceMessageId || null,
        proposalType: type,
        schemaVersion: SCHEMA_VERSION,
        summaryJson: JSON.stringify(summary),
        cipher: enc.cipher,
        iv: enc.iv,
        tag: enc.tag,
        keyId: enc.keyId,
      },
      type: QueryTypes.SELECT,
    },
  );
  return mapProposalRow(rows[0]);
}

export async function createCoachActionProposalDraft({
  type,
  payload,
  user,
  conversation,
  sourceMessageId = null,
  db = null,
  sequelizeOverride = null,
}) {
  const targetDb = db || sequelizeOverride || sequelize;
  const summary = summarizeProposal(type, payload, conversation);
  return createProposal({
    type,
    payload,
    summary,
    user,
    conversation,
    sourceMessageId,
    db: targetDb,
  });
}

export async function createCoachActionProposalsFromAiResponse({
  content,
  user,
  conversation,
  sourceMessageId = null,
  sequelizeOverride = null,
}) {
  const db = sequelizeOverride || sequelize;
  const proposals = [];
  const frontendActions = [];
  const canPrepareWrites = user?.role === 'admin' || user?.role === 'trainer';

  for (const block of parseJsonActionBlocks(content)) {
    const frontendDispatch = parseSafeFrontendDispatch(block);
    if (frontendDispatch) {
      frontendActions.push({ event: frontendDispatch.event, payload: frontendDispatch.payload || {} });
      continue;
    }
    if (!canPrepareWrites) continue;
    const classified = classifyActionBlock(block, conversation, {
      proposalTypes: COACH_PROPOSAL_TYPE,
      schemaVersion: SCHEMA_VERSION,
    });
    if (!classified) continue;
    const summary = summarizeProposal(classified.type, classified.payload, conversation);
    proposals.push({ ...classified, summary });
  }

  if (proposals.length === 0) return { proposals: [], frontendActions };
  if (!await proposalTableExists(db)) throw new CoachActionProposalSchemaUnavailableError();

  const persisted = [];
  for (const proposal of proposals) {
    persisted.push(await createProposal({
      ...proposal,
      user,
      conversation,
      sourceMessageId,
      db,
    }));
  }
  logger.info('[CoachActionProposal] Prepared %d pending proposal(s)', persisted.length);
  return { proposals: persisted, frontendActions };
}
