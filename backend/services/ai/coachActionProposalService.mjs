/**
 * coachActionProposalService.mjs
 * ==============================
 * Converts model-emitted action blocks into encrypted approval proposals.
 * The model prepares drafts; deterministic services own final writes.
 */
import { randomUUID } from 'node:crypto';
import { QueryTypes } from 'sequelize';
import { z } from 'zod';
import sequelize from '../../database.mjs';
import logger from '../../utils/logger.mjs';
import { encryptPayload } from '../plaudCipherService.mjs';

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
});

export class CoachActionProposalSchemaUnavailableError extends Error {
  constructor() {
    super('coach_action_proposals table is not available');
    this.name = 'CoachActionProposalSchemaUnavailableError';
    this.code = 'COACH_ACTION_PROPOSAL_SCHEMA_UNAVAILABLE';
  }
}

const SCHEMA_VERSION = '2026-05-06';
const SAFE_FRONTEND_EVENTS = new Set([
  'AI_ADD_EXERCISE',
  'AI_LOAD_TEMPLATE',
  'AI_UPDATE_SET',
  'AI_TOGGLE_NASM_ITEM',
]);
const WRITE_FRONTEND_EVENTS = new Set(['AI_SUBMIT_WORKOUT']);

const ExerciseDraftSchema = z.object({
  name: z.string().trim().min(1),
}).passthrough();

const FrontendDispatchActionSchema = z.object({
  action: z.literal('frontend_dispatch'),
  event: z.string().trim().min(1),
  payload: z.record(z.unknown()).optional().default({}),
}).passthrough();

const WorkoutLogActionSchema = z.object({
  action: z.literal('import_workout_log'),
  date: z.string().trim().min(4),
  exercises: z.array(ExerciseDraftSchema).min(1),
}).passthrough();

const ClientDataUpdateActionSchema = z.object({
  action: z.literal('update_client_data'),
  updates: z.array(z.unknown()).min(1),
}).passthrough();

const ClientOnboardingActionSchema = z.object({
  action: z.enum(['create_client', 'ONBOARD_CLIENT']),
}).passthrough().refine((block) => {
  const data = block.data && typeof block.data === 'object' && !Array.isArray(block.data)
    ? block.data
    : block;
  return Object.keys(data).filter((key) => key !== 'action').length > 0;
});

function parseJsonActionBlocks(content) {
  const blocks = [];
  const regex = /```json\s*([\s\S]*?)\s*```/g;
  let match;
  while ((match = regex.exec(content || '')) !== null) {
    try {
      const parsed = JSON.parse(match[1]);
      if (parsed?.action) blocks.push(parsed);
    } catch {
      // Malformed model JSON is ignored; the chat response remains visible.
    }
  }
  return blocks;
}

function safeParseAction(schema, block) {
  const parsed = schema.safeParse(block);
  return parsed.success ? parsed.data : null;
}

function proposalTitle(type) {
  const titles = {
    [COACH_PROPOSAL_TYPE.CLIENT_ONBOARDING]: 'Review client onboarding draft',
    [COACH_PROPOSAL_TYPE.WORKOUT_LOG]: 'Review workout log draft',
    [COACH_PROPOSAL_TYPE.CLIENT_DATA_UPDATE]: 'Review client data update',
    [COACH_PROPOSAL_TYPE.FRONTEND_DISPATCH]: 'Review workout form submission',
  };
  return titles[type] || 'Review Coach proposal';
}

function summarizeProposal(type, payload, conversation) {
  const base = {
    title: proposalTitle(type),
    actionRequired: 'Approve before any record changes are applied.',
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

function classifyActionBlock(block, conversation) {
  if (block.action === 'create_client' || block.action === 'ONBOARD_CLIENT') {
    const payload = safeParseAction(ClientOnboardingActionSchema, block);
    return payload ? { type: COACH_PROPOSAL_TYPE.CLIENT_ONBOARDING, payload } : null;
  }
  if (block.action === 'import_workout_log') {
    const payload = safeParseAction(WorkoutLogActionSchema, block);
    return payload ? { type: COACH_PROPOSAL_TYPE.WORKOUT_LOG, payload } : null;
  }
  if (block.action === 'update_client_data') {
    const payload = safeParseAction(ClientDataUpdateActionSchema, block);
    if (!payload) return null;
    return {
      type: COACH_PROPOSAL_TYPE.CLIENT_DATA_UPDATE,
      payload: { ...payload, targetUserId: conversation?.targetUserId || null },
    };
  }
  if (block.action === 'frontend_dispatch' && WRITE_FRONTEND_EVENTS.has(block.event)) {
    const payload = safeParseAction(FrontendDispatchActionSchema, block);
    return payload ? { type: COACH_PROPOSAL_TYPE.FRONTEND_DISPATCH, payload } : null;
  }
  return null;
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
    const frontendDispatch = block.action === 'frontend_dispatch'
      ? safeParseAction(FrontendDispatchActionSchema, block)
      : null;
    if (frontendDispatch && SAFE_FRONTEND_EVENTS.has(frontendDispatch.event)) {
      frontendActions.push({ event: frontendDispatch.event, payload: frontendDispatch.payload || {} });
      continue;
    }
    if (!canPrepareWrites) continue;
    const classified = classifyActionBlock(block, conversation);
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
