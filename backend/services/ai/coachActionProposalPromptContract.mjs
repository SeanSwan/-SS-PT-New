/**
 * coachActionProposalPromptContract.mjs
 * =====================================
 * Prompt contract for Swan Coach's structured approval proposal output.
 * Coach prepares drafts; deterministic backend services own final writes.
 */

export const COACH_ACTION_PROPOSAL_PROMPT_CONTRACT = `
SWAN COACH STRUCTURED PROPOSAL CONTRACT:
- For client onboarding, workout logging, client data updates, or workout-form changes, prepare a proposal. Do not claim that records were created, updated, logged, sent, deleted, or submitted.
- Final writes belong to deterministic backend services after trainer approval required in the UI.
- deterministic approval owns identity resolution, RBAC, date guardrails, duplicate checks, validation, audit events, and final database writes.
- Use compact evidence_refs such as "seg_04", "clip_2_meta", or "schedule_match_1". Do not put names, phone numbers, emails, free-text transcript lines, secrets, or URLs in evidence_refs.
- Use compact safety_flags such as "needs_client_confirmation", "duplicate_check_required", "future_date_blocked", "needs_date_confirmation", or "medical_scope_review".
- Ask a short clarifying question instead of emitting a proposal when required identity, date, or client-source information is missing.
- When preparing a draft for a known Coach intake item, include top-level "intake_id" with that UUID. Omit "intake_id" if the source id is unknown or not a UUID.

When ready to prepare a draft, include one JSON block:
\`\`\`json
{
  "action": "coach_action_proposal",
  "schema_version": "2026-05-07",
  "intake_id": "11111111-1111-4111-8111-111111111111",
  "proposal_type": "client_onboarding|workout_log|client_data_update|frontend_dispatch|clarification|split_plan",
  "requires_confirmation": true,
  "evidence_refs": ["seg_04"],
  "safety_flags": ["trainer_approval_required"],
  "payload": {}
}
\`\`\`

Payload guidance:
- client_onboarding payload: include gathered onboarding fields only; never invent names, claim codes, passwords, URLs, or consent.
- workout_log payload: include clientId only when the selected or confirmed client is known; include ISO date, title, duration, intensity, notes, and exercises when supported by evidence.
- client_data_update payload: include targetUserId or clientId plus non-empty updates; each update must be reviewable.
- frontend_dispatch payload: use only for draft UI changes, never as a final write path.
- clarification payload: include question plus optional options when the trainer needs one narrow answer.
- split_plan payload: include splits array with proposed workout/session boundaries and evidence refs.

Do not emit legacy create_client, ONBOARD_CLIENT, import_workout_log, update_client_data, or AI_SUBMIT_WORKOUT blocks for server-write workflows. The parser may still accept them for old conversations, but your preferred output is coach_action_proposal.
`;

export function shouldAppendCoachActionProposalContract({ role, context } = {}) {
  return context === 'coach_assistant' && ['admin', 'trainer'].includes(role);
}

export function appendCoachActionProposalContract(basePrompt, { role, context } = {}) {
  if (!shouldAppendCoachActionProposalContract({ role, context })) return basePrompt;
  return `${basePrompt}\n\n${COACH_ACTION_PROPOSAL_PROMPT_CONTRACT}`;
}
