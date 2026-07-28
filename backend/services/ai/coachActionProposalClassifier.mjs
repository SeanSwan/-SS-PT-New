/**
 * coachActionProposalClassifier.mjs
 * =================================
 * Parses model-emitted JSON action blocks into typed Coach proposal drafts.
 */
import { z } from 'zod';
import { CLIENT_SOURCES, parseClientSource } from '../sessionBillingPolicy.mjs';
import {
  classifyWriteFrontendDispatch,
  parseSafeFrontendDispatch,
} from './coachFrontendDispatchClassifier.mjs';
import { classifyNutritionLogPayload } from './coachNutritionProposalClassifier.mjs';
import { classifyClientProfileCoveragePayload } from './coachClientProfileCoverageClassifier.mjs';
import { normalizeOnboardingCoverageUpdates } from './coachOnboardingCoveragePayloadNormalizer.mjs';
import {
  WORKOUT_LOG_SOURCES,
  normalizeWorkoutLogSource,
} from '../workout/workoutLogSourcePolicy.mjs';

export { parseSafeFrontendDispatch };

const ScheduledSessionIdSchema = z.union([
  z.number().int().positive(),
  z.string().regex(/^[1-9]\d*$/),
]);
const ROUTE_CONTEXT_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const REQUIRED_ONBOARDING_FIELDS = ['firstName', 'lastName', 'clientSource'];
const SAFE_COACH_INTAKE_ID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const ExerciseDraftSchema = z.object({
  name: z.string().trim().min(1),
}).passthrough();

const WorkoutLogSourceSchema = z.preprocess(
  (value) => (typeof value === 'string' ? normalizeWorkoutLogSource(value) : value),
  z.enum(Object.values(WORKOUT_LOG_SOURCES)),
);

const StructuredCoachProposalSchema = z.object({
  action: z.literal('coach_action_proposal'),
  schema_version: z.string().trim().min(1).optional(),
  proposal_type: z.enum([
    'client_onboarding',
    'workout_log',
    'nutrition_log',
    'client_data_update',
    'client_profile_coverage_update',
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
  source: WorkoutLogSourceSchema.optional(),
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
  const normalizedPayload = normalizeOnboardingCoverageUpdates(normalizeOnboardingClientSource(payload));
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

function safeRouteDate(routeContext) {
  const scheduledSessionDate = String(routeContext?.scheduledSessionDate || '').trim();
  if (ROUTE_CONTEXT_DATE_PATTERN.test(scheduledSessionDate)) return scheduledSessionDate;
  const workoutDate = String(routeContext?.workoutDate || '').trim();
  return ROUTE_CONTEXT_DATE_PATTERN.test(workoutDate) ? workoutDate : null;
}

function safeRouteScheduledSessionId(routeContext) {
  const scheduledSessionId = String(routeContext?.scheduledSessionId || '').trim();
  return /^[1-9]\d*$/.test(scheduledSessionId) ? scheduledSessionId : null;
}

function safeRouteWorkoutSource(routeContext) {
  return routeContext?.intent === 'historical_import'
    ? WORKOUT_LOG_SOURCES.HISTORICAL_IMPORT
    : null;
}

function withWorkoutRouteDefaults(payload, routeContext) {
  const defaults = {};
  const date = safeRouteDate(routeContext);
  if (date && !payload.date) defaults.date = date;
  const scheduledSessionId = safeRouteScheduledSessionId(routeContext);
  if (scheduledSessionId && payload.scheduledSessionId == null) {
    defaults.scheduledSessionId = scheduledSessionId;
  }
  const source = safeRouteWorkoutSource(routeContext);
  if (source && !payload.source) defaults.source = source;
  return Object.keys(defaults).length ? { ...payload, ...defaults } : payload;
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

export function classifyActionBlock(block, conversation, { proposalTypes, schemaVersion, routeContext = null }) {
  if (block.action === 'coach_action_proposal') {
    const parsed = safeParseAction(StructuredCoachProposalSchema, block);
    if (!parsed) return null;
    const meta = proposalMeta(parsed, schemaVersion);
    if (parsed.proposal_type === proposalTypes.WORKOUT_LOG) {
      const payload = safeParseAction(
        WorkoutLogActionSchema,
        withWorkoutRouteDefaults({ action: 'import_workout_log', ...parsed.payload }, routeContext),
      );
      return payload ? { type: proposalTypes.WORKOUT_LOG, payload: { ...payload, proposalMeta: meta } } : null;
    }
    if (parsed.proposal_type === proposalTypes.NUTRITION_LOG) {
      return classifyNutritionLogPayload({
        payload: { action: 'import_nutrition_log', ...parsed.payload },
        conversation,
        proposalTypes,
        meta,
      });
    }
    if (parsed.proposal_type === proposalTypes.CLIENT_ONBOARDING) {
      const payload = safeParseAction(ClientOnboardingActionSchema, { action: 'create_client', ...parsed.payload });
      return payload ? classifyClientOnboardingPayload(payload, proposalTypes, meta) : null;
    }
    if (parsed.proposal_type === proposalTypes.CLIENT_DATA_UPDATE) {
      const payload = safeParseAction(ClientDataUpdateActionSchema, { action: 'update_client_data', ...parsed.payload });
      return payload ? {
        type: proposalTypes.CLIENT_DATA_UPDATE,
        payload: { ...payload, targetUserId: conversation?.targetUserId || null, proposalMeta: meta },
      } : null;
    }
    if (parsed.proposal_type === proposalTypes.CLIENT_PROFILE_COVERAGE_UPDATE) {
      return classifyClientProfileCoveragePayload({
        payload: parsed.payload,
        conversation,
        proposalTypes,
        meta,
      });
    }
    if (parsed.proposal_type === proposalTypes.CLARIFICATION) {
      const payload = safeParseAction(ClarificationPayloadSchema, parsed.payload);
      return payload ? { type: proposalTypes.CLARIFICATION, payload: { ...payload, proposalMeta: meta } } : null;
    }
    if (parsed.proposal_type === proposalTypes.SPLIT_PLAN) {
      const payload = safeParseAction(SplitPlanPayloadSchema, parsed.payload);
      return payload ? { type: proposalTypes.SPLIT_PLAN, payload: { ...payload, proposalMeta: meta } } : null;
    }
    return classifyWriteFrontendDispatch(
      { action: 'frontend_dispatch', ...parsed.payload },
      proposalTypes,
      meta,
    );
  }
  if (block.action === 'create_client' || block.action === 'ONBOARD_CLIENT') {
    const payload = safeParseAction(ClientOnboardingActionSchema, block);
    return payload ? classifyClientOnboardingPayload(payload, proposalTypes) : null;
  }
  if (block.action === 'import_workout_log') {
    const payload = safeParseAction(WorkoutLogActionSchema, withWorkoutRouteDefaults(block, routeContext));
    return payload ? { type: proposalTypes.WORKOUT_LOG, payload } : null;
  }
  if (block.action === 'import_nutrition_log') {
    return classifyNutritionLogPayload({ payload: block, conversation, proposalTypes });
  }
  if (block.action === 'update_client_data') {
    const payload = safeParseAction(ClientDataUpdateActionSchema, block);
    if (!payload) return null;
    return {
      type: proposalTypes.CLIENT_DATA_UPDATE,
      payload: { ...payload, targetUserId: conversation?.targetUserId || null },
    };
  }
  if (block.action === 'frontend_dispatch') {
    return classifyWriteFrontendDispatch(block, proposalTypes);
  }
  return null;
}
