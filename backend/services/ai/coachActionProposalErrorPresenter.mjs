/**
 * coachActionProposalErrorPresenter.mjs
 * =====================================
 * Public error presenter for Swan Coach proposal APIs.
 *
 * Internal writer exceptions can contain SQL, hostnames, or client details.
 * This module maps them to stable, role-safe copy while preserving domain
 * error codes that the UI can use for coach workflow decisions.
 */

const ROUTE_ERROR_MESSAGES = {
  PROPOSAL_DETAIL_FAILED: 'Proposal detail failed.',
  PROPOSAL_APPROVAL_FAILED: 'Proposal approval failed.',
  PROPOSAL_CLARIFICATION_ANSWER_FAILED: 'Proposal clarification answer failed.',
  PROPOSAL_REJECTION_FAILED: 'Proposal rejection failed.',
};

const ONBOARDING_ERROR_MESSAGES = {
  ONBOARDING_REQUIRED_FIELDS_MISSING: 'Client onboarding draft is missing required fields.',
  ONBOARDING_FORBIDDEN: 'Only trainers and admins can approve client onboarding drafts.',
  ONBOARDING_DUPLICATE_EMAIL: 'A client already exists with that email.',
  ONBOARDING_APPLY_FAILED: 'Client onboarding proposal could not be applied.',
};

const WORKOUT_ERROR_MESSAGES = {
  DUPLICATE_DATE: 'A workout session already exists for this client on this date.',
  VALIDATION_ERROR: 'Workout log data is invalid. Check the workout details and try again.',
  WORKOUT_APPLY_FAILED: 'Workout log proposal could not be applied.',
};

export function buildCoachProposalRouteErrorBody(code) {
  return {
    success: false,
    code,
    error: ROUTE_ERROR_MESSAGES[code] || 'Swan Coach proposal request failed.',
  };
}

export function buildCoachProposalApplyErrorBody({ kind, code }) {
  const fallbackCode = kind === 'workout' ? 'WORKOUT_APPLY_FAILED' : 'ONBOARDING_APPLY_FAILED';
  const safeCode = typeof code === 'string' && code.trim() ? code.trim() : fallbackCode;
  const messages = kind === 'workout' ? WORKOUT_ERROR_MESSAGES : ONBOARDING_ERROR_MESSAGES;

  return {
    success: false,
    code: messages[safeCode] ? safeCode : fallbackCode,
    error: messages[safeCode] || messages[fallbackCode],
  };
}
