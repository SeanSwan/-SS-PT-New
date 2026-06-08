/**
 * coachActionProposalClassifier.mjs
 * =================================
 * Parses model-emitted JSON action blocks into typed Coach proposal drafts.
 */
import { z } from 'zod';
import { CLIENT_SOURCES, parseClientSource } from '../sessionBillingPolicy.mjs';

const SAFE_FRONTEND_EVENTS = new Set([
  'AI_ADD_EXERCISE',
  'AI_LOAD_TEMPLATE',
  'AI_UPDATE_SET',
  'AI_TOGGLE_NASM_ITEM',
]);
const WRITE_FRONTEND_EVENTS = new Set(['AI_SUBMIT_WORKOUT']);
const SAFE_FRONTEND_PAYLOAD_FIELDS = Object.freeze({
  AI_ADD_EXERCISE: ['exerciseName', 'sets', 'reps', 'weight', 'tempo', 'restSeconds', 'notes'],
  AI_LOAD_TEMPLATE: ['phase'],
  AI_UPDATE_SET: ['exerciseName', 'setNumber', 'weight', 'reps', 'rpe', 'tempo'],
  AI_TOGGLE_NASM_ITEM: ['section', 'itemName', 'markAll', 'completed'],
});
const SAFE_FRONTEND_REQUIRED_FIELDS = Object.freeze({
  AI_ADD_EXERCISE: ['exerciseName'],
  AI_LOAD_TEMPLATE: ['phase'],
  AI_UPDATE_SET: ['exerciseName'],
  AI_TOGGLE_NASM_ITEM: ['section'],
});
const ScheduledSessionIdSchema = z.union([
  z.number().int().positive(),
  z.string().regex(/^[1-9]\d*$/),
]);
const REQUIRED_ONBOARDING_FIELDS = ['firstName', 'lastName', 'clientSource'];
const SAFE_COACH_INTAKE_ID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const ExerciseDraftSchema = z.object({
  name: z.string().trim().min(1),
}).passthrough();

const FrontendDispatchActionSchema = z.object({
  action: z.literal('frontend_dispatch'),
  event: z.string().trim().min(1),
  payload: z.record(z.unknown()).optional().default({}),
}).passthrough();

const StructuredCoachProposalSchema = z.object({
  action: z.literal('coach_action_proposal'),
  schema_version: z.string().trim().min(1).optional(),
  proposal_type: z.enum([
    'client_onboarding',
    'workout_log',
    'client_data_update',
    'frontend_dispatch',
    'clarification',
    'split_plan',
  ]),
  payload: z.record(z.unknown()).optional().default({}),
  evidence_refs: z.array(z.string().trim().min(1)).max(20).optional().default([]),
  safety_flags: z.array(z.string().trim().min(1)).max(20).optional().default([]),
}).passthrough();

const ClarificationPayloadSchema = z.object({
  question: z.string().trim().min(1).max(500),
  options: z.array(z.string().trim().min(1).max(120)).max(12).optional().default([]),
});

const SplitCandidateSchema = z.object({
  title: z.string().trim().min(1).max(160).optional(),
  date: z.string().trim().min(4).max(32).optional(),
  recordedAtStart: z.string().trim().min(4).max(64).optional(),
  recordedAtEnd: z.string().trim().min(4).max(64).optional(),
  reason: z.string().trim().min(1).max(500).optional(),
  evidenceRefs: z.array(z.string().trim().min(1).max(120)).max(12).optional().default([]),
  clientId: z.union([z.number(), z.string()]).optional(),
  exercises: z.array(ExerciseDraftSchema).max(80).optional().default([]),
  notes: z.string().trim().min(1).max(1200).optional(),
  duration: z.union([z.number(), z.string()]).optional(),
  intensity: z.union([z.number(), z.string()]).optional(),
});

const SplitPlanPayloadSchema = z.object({
  splits: z.array(SplitCandidateSchema).min(1).max(12),
});

const WorkoutLogActionSchema = z.object({
  action: z.literal('import_workout_log'),
  date: z.string().trim().min(4),
  scheduledSessionId: ScheduledSessionIdSchema.optional(),
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

function safeParseAction(schema, block) {
  const parsed = schema.safeParse(block);
  return parsed.success ? parsed.data : null;
}

function isSafeFrontendPayloadValue(value) {
  return value == null || ['string', 'number', 'boolean'].includes(typeof value);
}

function sanitizeSafeFrontendPayload(event, payload) {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) return {};
  const allowedFields = SAFE_FRONTEND_PAYLOAD_FIELDS[event] || [];
  return allowedFields.reduce((clean, field) => {
    if (Object.prototype.hasOwnProperty.call(payload, field) && isSafeFrontendPayloadValue(payload[field])) {
      clean[field] = payload[field];
    }
    return clean;
  }, {});
}

function hasRequiredSafeFrontendPayloadFields(event, payload) {
  const requiredFields = SAFE_FRONTEND_REQUIRED_FIELDS[event] || [];
  return requiredFields.every((field) => Object.prototype.hasOwnProperty.call(payload, field));
}

function onboardingData(payload) {
  return payload?.data && typeof payload.data === 'object' && !Array.isArray(payload.data)
    ? payload.data
    : payload;
}

function missingOnboardingFields(payload) {
  const data = onboardingData(payload) || {};
  return REQUIRED_ONBOARDING_FIELDS.filter((field) => {
    const value = typeof data[field] === 'string' ? data[field].trim() : data[field];
    if (!value) return true;
    return field === 'clientSource' ? !CLIENT_SOURCES.has(parseClientSource(value)) : false;
  });
}

function normalizeOnboardingClientSource(payload) {
  const data = onboardingData(payload) || {};
  const clientSource = parseClientSource(data.clientSource);
  if (!clientSource) return payload;

  if (payload?.data && typeof payload.data === 'object' && !Array.isArray(payload.data)) {
    return { ...payload, data: { ...payload.data, clientSource } };
  }

  return { ...payload, clientSource };
}

function onboardingClarificationPayload(missingFields, meta = null) {
  const needsSource = missingFields.includes('clientSource');
  const payload = {
    question: `I need ${missingFields.join(', ')} before preparing this client onboarding draft.`,
    options: needsSource ? ['move_fitness', 'swanstudios', 'external'] : [],
  };
  return meta ? { ...payload, proposalMeta: meta } : payload;
}

function classifyClientOnboardingPayload(payload, proposalTypes, meta = null) {
  const missingFields = missingOnboardingFields(payload);
  if (missingFields.length > 0) {
    return {
      type: proposalTypes.CLARIFICATION,
      payload: onboardingClarificationPayload(missingFields, meta),
    };
  }
  const normalizedPayload = normalizeOnboardingClientSource(payload);
  return {
    type: proposalTypes.CLIENT_ONBOARDING,
    payload: meta ? { ...normalizedPayload, proposalMeta: meta } : normalizedPayload,
  };
}

function cleanCoachIntakeId(value) {
  const clean = String(value || '').trim().replace(/^coach:/, '');
  return SAFE_COACH_INTAKE_ID_RE.test(clean) ? clean : null;
}

function proposalMeta(block, schemaVersion) {
  const intakeId = cleanCoachIntakeId(
    block.intake_id ||
    block.intakeId ||
    block.payload?.intake_id ||
    block.payload?.intakeId ||
    block.payload?.proposalMeta?.intakeId,
  );
  const meta = {
    schemaVersion: block.schema_version || schemaVersion,
    evidenceRefs: block.evidence_refs || [],
    safetyFlags: block.safety_flags || [],
    requiresConfirmation: true,
  };
  return intakeId ? { ...meta, intakeId } : meta;
}

export function parseJsonActionBlocks(content) {
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

export function parseSafeFrontendDispatch(block) {
  const candidate = block.action === 'coach_action_proposal' && block.proposal_type === 'frontend_dispatch'
    ? { action: 'frontend_dispatch', ...(block.payload || {}) }
    : block;
  if (candidate.action !== 'frontend_dispatch') return null;
  const parsed = safeParseAction(FrontendDispatchActionSchema, candidate);
  if (!parsed || !SAFE_FRONTEND_EVENTS.has(parsed.event)) return null;
  const payload = sanitizeSafeFrontendPayload(parsed.event, parsed.payload);
  return hasRequiredSafeFrontendPayloadFields(parsed.event, payload)
    ? { ...parsed, payload }
    : null;
}

export function classifyActionBlock(block, conversation, { proposalTypes, schemaVersion }) {
  if (block.action === 'coach_action_proposal') {
    const parsed = safeParseAction(StructuredCoachProposalSchema, block);
    if (!parsed) return null;
    const meta = proposalMeta(parsed, schemaVersion);
    if (parsed.proposal_type === proposalTypes.WORKOUT_LOG) {
      const payload = safeParseAction(WorkoutLogActionSchema, { action: 'import_workout_log', ...parsed.payload });
      return payload ? { type: proposalTypes.WORKOUT_LOG, payload: { ...payload, proposalMeta: meta } } : null;
    }
    if (parsed.proposal_type === proposalTypes.CLIENT_ONBOARDING) {
      const payload = safeParseAction(ClientOnboardingActionSchema, { action: 'create_client', data: parsed.payload });
      return payload ? classifyClientOnboardingPayload(payload, proposalTypes, meta) : null;
    }
    if (parsed.proposal_type === proposalTypes.CLIENT_DATA_UPDATE) {
      const payload = safeParseAction(ClientDataUpdateActionSchema, { action: 'update_client_data', ...parsed.payload });
      return payload ? {
        type: proposalTypes.CLIENT_DATA_UPDATE,
        payload: { ...payload, targetUserId: conversation?.targetUserId || null, proposalMeta: meta },
      } : null;
    }
    if (parsed.proposal_type === proposalTypes.CLARIFICATION) {
      const payload = safeParseAction(ClarificationPayloadSchema, parsed.payload);
      return payload ? { type: proposalTypes.CLARIFICATION, payload: { ...payload, proposalMeta: meta } } : null;
    }
    if (parsed.proposal_type === proposalTypes.SPLIT_PLAN) {
      const payload = safeParseAction(SplitPlanPayloadSchema, parsed.payload);
      return payload ? { type: proposalTypes.SPLIT_PLAN, payload: { ...payload, proposalMeta: meta } } : null;
    }
    const payload = safeParseAction(FrontendDispatchActionSchema, { action: 'frontend_dispatch', ...parsed.payload });
    return payload && WRITE_FRONTEND_EVENTS.has(payload.event)
      ? { type: proposalTypes.FRONTEND_DISPATCH, payload: { ...payload, proposalMeta: meta } }
      : null;
  }
  if (block.action === 'create_client' || block.action === 'ONBOARD_CLIENT') {
    const payload = safeParseAction(ClientOnboardingActionSchema, block);
    return payload ? classifyClientOnboardingPayload(payload, proposalTypes) : null;
  }
  if (block.action === 'import_workout_log') {
    const payload = safeParseAction(WorkoutLogActionSchema, block);
    return payload ? { type: proposalTypes.WORKOUT_LOG, payload } : null;
  }
  if (block.action === 'update_client_data') {
    const payload = safeParseAction(ClientDataUpdateActionSchema, block);
    if (!payload) return null;
    return {
      type: proposalTypes.CLIENT_DATA_UPDATE,
      payload: { ...payload, targetUserId: conversation?.targetUserId || null },
    };
  }
  if (block.action === 'frontend_dispatch' && WRITE_FRONTEND_EVENTS.has(block.event)) {
    const payload = safeParseAction(FrontendDispatchActionSchema, block);
    return payload ? { type: proposalTypes.FRONTEND_DISPATCH, payload } : null;
  }
  return null;
}
