/**
 * Command Capability Policy
 * =========================
 * Maps surface-scoped browser commands to coherent server-derived context.
 * RBAC proves who the actor is; this gate also proves that the envelope belongs
 * to that actor and that its capability agrees with surface/entity state.
 */

const PLANNER_CAPABILITIES = ['planner-draft:mutate', 'plan:mutate'];
const WORKOUT_FORM_CAPABILITIES = ['workout-form:mutate'];
const WORKOUT_FORM_COMMANDS = new Set([
  'load_phase_template',
  'add_exercise_to_form',
  'update_set_data',
  'toggle_nasm_item',
  'submit_workout_form',
]);

const policyForCommand = (command) => {
  const type = typeof command?.type === 'string' ? command.type : '';
  if (type.startsWith('planner_')) {
    return {
      policy: 'planner_mutation', requiredAny: PLANNER_CAPABILITIES, surfaces: ['workout-planner'],
    };
  }
  if (WORKOUT_FORM_COMMANDS.has(type)) {
    return {
      policy: 'workout_form_mutation',
      requiredAny: WORKOUT_FORM_CAPABILITIES,
      surfaces: ['workout-logger', 'client-training-command-bar'],
    };
  }
  return { policy: null, requiredAny: [], surfaces: [] };
};

const actorMatches = (envelope, authenticatedActor) => {
  const envelopeId = Number(envelope?.actor?.id);
  const authenticatedId = Number(authenticatedActor?.id);
  return envelope?.schemaVersion === '1.0'
    && Number.isSafeInteger(envelopeId)
    && envelopeId > 0
    && envelopeId === authenticatedId
    && envelope.actor?.role === authenticatedActor?.role;
};

const plannerCapabilityIsCoherent = (envelope, actual) => {
  const draftAllowed = actual.has('planner-draft:mutate')
    && envelope.contextStatus === 'CTX_MISSING'
    && envelope.entity == null
    && envelope.permissions?.mutateEntity === false;
  const savedPlanAllowed = actual.has('plan:mutate')
    && envelope.contextStatus === 'READY'
    && envelope.entity?.id != null
    && envelope.entity?.version != null
    && envelope.permissions?.mutateEntity === true;
  return draftAllowed || savedPlanAllowed;
};

export function authorizeCommandCapability(command, contextEnvelope, authenticatedActor) {
  const requirement = policyForCommand(command);
  const { surfaces, ...publicRequirement } = requirement;
  if (!requirement.policy) return { allowed: true, ...publicRequirement };

  const actual = new Set(
    Array.isArray(contextEnvelope?.capabilities)
      ? contextEnvelope.capabilities.filter((value) => typeof value === 'string')
      : [],
  );
  const trusted = actorMatches(contextEnvelope, authenticatedActor);
  const surfaceAllowed = surfaces.includes(contextEnvelope?.surfaceId);
  let stateAllowed = false;
  if (requirement.policy === 'planner_mutation') {
    stateAllowed = plannerCapabilityIsCoherent(contextEnvelope, actual);
  } else if (requirement.policy === 'workout_form_mutation') {
    stateAllowed = contextEnvelope?.contextStatus === 'READY'
      && actual.has('workout-form:mutate');
  }

  return { allowed: trusted && surfaceAllowed && stateAllowed, ...publicRequirement };
}

export default authorizeCommandCapability;
