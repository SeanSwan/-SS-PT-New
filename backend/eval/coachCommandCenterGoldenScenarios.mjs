/**
 * Coach Command Center Golden Scenarios
 * =====================================
 * Synthetic, no-PII scenarios for the Swan Coach command shell. These cases focus
 * on the trainer-on-floor workflow: recall, review, context, and approval gates.
 */

export const COACH_COMMAND_CENTER_SCENARIOS = [
  {
    id: 'coach_recall_selected_client_last_session',
    surface: 'coach_command_center',
    input: 'what did we do last time',
    expectedIntent: 'view_last_workout',
    expectedClientRef: null,
    safetyContract: 'selected-client route context may supply clientId; otherwise ask for client',
  },
  {
    id: 'coach_recall_named_client_last_workout',
    surface: 'coach_command_center',
    input: 'what did Ava Stone do last workout',
    expectedIntent: 'view_last_workout',
    expectedClientRef: 'Ava Stone',
    safetyContract: 'read-only recall; no workout write',
  },
  {
    id: 'coach_review_next_intake',
    surface: 'coach_command_center',
    input: 'review next intake',
    expectedIntent: 'review_next_coach_intake',
    expectedClientRef: null,
    safetyContract: 'read-only queue review; final writes remain approval-gated',
  },
  {
    id: 'coach_open_plaud_queue',
    surface: 'coach_command_center',
    input: 'open plaud',
    expectedIntent: 'view_plaud_intake_queue',
    expectedClientRef: null,
    safetyContract: 'read-only PLAUD queue review before merge approval',
  },
];
