import { z } from 'zod';

const SAFE_FRONTEND_EVENTS = new Set([
  'AI_ADD_EXERCISE',
  'AI_LOAD_TEMPLATE',
  'AI_UPDATE_SET',
  'AI_TOGGLE_NASM_ITEM',
]);
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

const FrontendDispatchActionSchema = z.object({
  action: z.literal('frontend_dispatch'),
  event: z.string().trim().min(1),
  payload: z.record(z.unknown()).optional().default({}),
}).passthrough();

const safeParseFrontendDispatch = (block) => {
  const parsed = FrontendDispatchActionSchema.safeParse(block);
  return parsed.success ? parsed.data : null;
};

const isSafeFrontendPayloadValue = (value) => (
  value == null || ['string', 'number', 'boolean'].includes(typeof value)
);

const sanitizeSafeFrontendPayload = (event, payload) => {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) return {};
  const allowedFields = SAFE_FRONTEND_PAYLOAD_FIELDS[event] || [];
  return allowedFields.reduce((clean, field) => {
    if (Object.prototype.hasOwnProperty.call(payload, field) && isSafeFrontendPayloadValue(payload[field])) {
      clean[field] = payload[field];
    }
    return clean;
  }, {});
};

const hasRequiredSafeFrontendPayloadFields = (event, payload) => {
  const requiredFields = SAFE_FRONTEND_REQUIRED_FIELDS[event] || [];
  return requiredFields.every((field) => Object.prototype.hasOwnProperty.call(payload, field));
};

export function parseSafeFrontendDispatch(block) {
  const candidate = block.action === 'coach_action_proposal' && block.proposal_type === 'frontend_dispatch'
    ? { action: 'frontend_dispatch', ...(block.payload || {}) }
    : block;
  if (candidate.action !== 'frontend_dispatch') return null;
  const parsed = safeParseFrontendDispatch(candidate);
  if (!parsed || !SAFE_FRONTEND_EVENTS.has(parsed.event)) return null;
  const payload = sanitizeSafeFrontendPayload(parsed.event, parsed.payload);
  return hasRequiredSafeFrontendPayloadFields(parsed.event, payload)
    ? { ...parsed, payload }
    : null;
}

export function classifyWriteFrontendDispatch() {
  // Chat-authored final writes must use deterministic workout_log proposals or the confirmed command lane.
  return null;
}
