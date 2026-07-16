/**
 * Deterministic Surface Command Router
 * ====================================
 * Resolves narrow, high-confidence browser imperatives before the LLM intent
 * classifier. Routing is surface-scoped and never grants capability; the
 * command executor applies the separate server policy gate after RBAC.
 */

const EDITOR_ROLES = new Set(['admin', 'trainer']);
const MAX_INSTRUCTION_LENGTH = 4000;
const DIRECT_SEQUENCE_IMPERATIVE = /^(?:(?:please)\s+|(?:(?:can|could|would|will)\s+you)\s+|(?:i\s+(?:want|need)\s+you\s+to)\s+)?(?:rearrange|reorder|optimi[sz]e|organi[sz]e|sequence)\b/i;
const PLAN_SEQUENCE_OBJECT = /\b(?:workout|plan|exercises?|movements?|session|day|order|sequence|flow)\b/i;

const trustedPlannerEnvelope = (envelope) => (
  envelope
  && envelope.schemaVersion === '1.0'
  && envelope.surfaceId === 'workout-planner'
  && Number.isSafeInteger(envelope.actor?.id)
  && envelope.actor.id > 0
  && EDITOR_ROLES.has(envelope.actor?.role)
);

/**
 * Returns a classifier-compatible intent for a narrow deterministic command.
 * Null means the normal shared-brain classifier should handle the message.
 */
export function routeDeterministicSurfaceCommand(message, contextEnvelope) {
  if (!trustedPlannerEnvelope(contextEnvelope) || typeof message !== 'string') return null;

  const instruction = message.trim();
  if (!instruction || instruction.length > MAX_INSTRUCTION_LENGTH) return null;
  if (!DIRECT_SEQUENCE_IMPERATIVE.test(instruction)) return null;
  if (!PLAN_SEQUENCE_OBJECT.test(instruction)) return null;

  return {
    intent: 'planner_rearrange_workout',
    clientRef: null,
    params: { instruction },
    confidence: 1,
    source: 'deterministic_surface_router',
  };
}

export default routeDeterministicSurfaceCommand;
