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
- SwanStudios uses NASM OPT as the training protocol anchor. Never invent NASM OPT phases, assessment results, corrective categories, or acute variables not present in the verified client context, transcript, or server-provided guidance.

When ready to prepare a draft, use a coach_action_proposal block as one JSON block:
\`\`\`json
{
  "action": "coach_action_proposal",
  "schema_version": "2026-05-07",
  "intake_id": "11111111-1111-4111-8111-111111111111",
  "proposal_type": "client_onboarding|workout_log|nutrition_log|client_data_update|client_profile_coverage_update|frontend_dispatch|clarification|split_plan",
  "requires_confirmation": true,
  "evidence_refs": ["seg_04"],
  "safety_flags": ["trainer_approval_required"],
  "payload": {}
}
\`\`\`

Payload guidance:
- client_onboarding payload: include gathered onboarding fields only; never invent names, claim codes, passwords, URLs, consent, or completion state. Prefer firstName, lastName, email, phone, clientSource, trainingGoal, limitations, painNotes, equipmentAccess, availability, firstSessionPriorities, communicationStyle, nutritionPrefs, preferredTrainingDays, questionnaireResponses, and coverageUpdates when the trainer provides them.
- client_onboarding coverageUpdates entries use { "fieldKey": "health_concerns", "category": "health_injury_risk", "status": "known | unknown | ask_client_later | not_applicable", "value": null }. Use the 15 scan categories account_identity_source, compliance_waiver_consent, contact_communication_preferences, goals_outcomes, schedule_availability, health_injury_risk, pain_body_map_movement_screen, measurements_body_composition, training_history_preferences, equipment_environment, nutrition_hydration, lifestyle_recovery, baseline_performance, package_business_admin, and coach_charting_data_priority.
- Do not mark onboarding complete from chat output. Missing coverage fields are follow-ups only; workout logging remains available while onboarding is incomplete.
- workout_log payload: include clientId only when the selected or confirmed client is known; include ISO date, title, duration, intensity, notes, and exercises when supported by evidence. Include source: "historical_import" for historical/backfill/imported workouts and source: "move_fitness_historical_import" only when the trainer explicitly identifies the backfill as Move Fitness historical import. Omit source or use "live" for current-day logs. Include scheduledSessionId only when a server-provided selected booked session context gives that exact id; never invent or change scheduled session ids.
- nutrition_log payload: include clientId only when the selected/confirmed client is known; include optional ISO date and a "meals" array. Each meal has description plus mealType (breakfast|lunch|dinner|snack|pre_workout|post_workout) and conservative calories/protein/carbs/fat/fiber/sugar/sodium. Use null for any macro you cannot estimate — never guess 0. These are ESTIMATES for trainer approval; do not claim the meal was logged.
- client_data_update payload: include targetUserId or clientId plus non-empty updates; each update must be reviewable.
- client_profile_coverage_update payload: use only for an existing selected client. Include clientId or targetUserId plus any profileFields, questionnaireResponses, and coverageUpdates. Never create a new client, never mark onboarding complete, and never invent medical details, consent, waiver status, passwords, claim links, or URLs.
- frontend_dispatch payload: use only for draft UI changes, never as a final write path.
- clarification payload: include question plus optional options when the trainer needs one narrow answer.
- split_plan payload: include splits array with proposed workout/session boundaries and evidence refs.

Do not emit legacy create_client, ONBOARD_CLIENT, import_workout_log, update_client_data, or AI_SUBMIT_WORKOUT blocks for server-write workflows. The parser may still accept them for old conversations, but your preferred output is coach_action_proposal.
`;

export function shouldAppendCoachActionProposalContract({ role, context } = {}) {
  return ['coach_assistant', 'client_onboarding'].includes(context) && ['admin', 'trainer'].includes(role);
}

const STRUCTURED_CLIENT_ONBOARDING_GUIDANCE = `CLIENT CREATION (NEW CLIENT ONBOARDING):
When the admin/trainer asks to onboard or create a new client, gather the available onboarding fields and use a coach_action_proposal block with proposal_type "client_onboarding". Ask one short clarification when firstName, lastName, or clientSource is missing. Preserve progress-first training context when available: trainingGoal, limitations, painNotes, equipmentAccess, availability, firstSessionPriorities, communicationStyle, nutritionPrefs, and questionnaireResponses.
Coverage scan: coverageUpdates may record the 15 categories account_identity_source, compliance_waiver_consent, contact_communication_preferences, goals_outcomes, schedule_availability, health_injury_risk, pain_body_map_movement_screen, measurements_body_composition, training_history_preferences, equipment_environment, nutrition_hydration, lifestyle_recovery, baseline_performance, package_business_admin, coach_charting_data_priority. Use statuses known | unknown | ask_client_later | not_applicable. Do not mark onboarding complete; missing coverage is follow-up work, not a workout-logging blocker.
Do not claim the account was created, do not invent claim codes/passwords/URLs, and do not emit old client-creation write blocks.
Client source policy: "swanstudios" means paid SwanStudios sessions, "move_fitness" means Move Fitness free-tracking with No session deduction, and "external" means outside gym/studio/imported/trainer-managed free-tracking with No session deduction. Use "clientSource": "move_fitness|external|swanstudios" in examples and ask which source when unclear.`;

const STRUCTURED_WORKOUT_IMPORT_GUIDANCE = `HISTORICAL WORKOUT LOG IMPORT:
When a trainer/admin pastes workout history or dictates a completed past session, parse it into one or more proposed workout-log drafts and use a coach_action_proposal block with proposal_type "workout_log" or "split_plan". Each historical workout_log payload must include source: "historical_import" unless the trainer explicitly identifies the import as Move Fitness, then use source: "move_fitness_historical_import". Dates must stay evidence-backed, estimated/backfilled sessions must be labeled in notes as AI-estimated historical filler when applicable, final writes require trainer approval, and old workout-import write blocks are not allowed for new Coach output.`;

function replacePromptSection(prompt, startMarker, endMarker, replacement) {
  const startIndex = prompt.indexOf(startMarker);
  if (startIndex === -1) return prompt;

  const endIndex = prompt.indexOf(endMarker, startIndex + startMarker.length);
  if (endIndex === -1) return prompt;

  return `${prompt.slice(0, startIndex)}${replacement}\n\n${prompt.slice(endIndex)}`;
}

function replaceLegacyServerWriteInstructions(basePrompt) {
  const withoutClientCreation = replacePromptSection(
    basePrompt.replaceAll('FULL read-write access', 'proposal-preparation access'),
    'CLIENT CREATION (NEW CLIENT ONBOARDING):',
    'HISTORICAL WORKOUT LOG IMPORT:',
    STRUCTURED_CLIENT_ONBOARDING_GUIDANCE
  );

  return replacePromptSection(
    withoutClientCreation,
    'HISTORICAL WORKOUT LOG IMPORT:',
    'BEHAVIOR:',
    STRUCTURED_WORKOUT_IMPORT_GUIDANCE
  );
}

export function appendCoachActionProposalContract(basePrompt, { role, context } = {}) {
  if (!shouldAppendCoachActionProposalContract({ role, context })) return basePrompt;
  const proposalReadyPrompt = replaceLegacyServerWriteInstructions(basePrompt);
  return `${proposalReadyPrompt}\n\n${COACH_ACTION_PROPOSAL_PROMPT_CONTRACT}`;
}
