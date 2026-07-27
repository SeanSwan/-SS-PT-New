/**
 * Intent Resolution Scenarios — Coach Hive-Mind C4
 * =================================================
 *
 * Replayable golden set for utterance → intent resolution.
 *
 * WHY THIS EXISTS
 *   The existing eval harness measures whether AI OUTPUT is valid (schema, PII,
 *   contraindications, scope-of-practice). Nothing measured whether an utterance
 *   RESOLVES to the right command against the right client. Usage telemetry only
 *   proves voice was used, never that it was understood. That gap is the line
 *   between a voice feature and a voice product.
 *
 * WHY IT CAN RUN OFFLINE
 *   `deterministicCoachIntakeIntent.mjs` has ZERO imports — it is pure regex
 *   classification, no model call. So intent resolution is deterministically
 *   testable in CI with no API key, no network, and no flake.
 *
 * PROVENANCE
 *   Adopts `coachCommandCenterGoldenScenarios.mjs`, which was written weeks ago
 *   with exactly the right shape (`expectedIntent`, `expectedClientRef`) and
 *   then never imported by anything — flagged as an open item in
 *   REPO-HYGIENE-INVENTORY-2026-07-16.md and still unwired. All four of its
 *   cases were verified to pass against the live classifier before adoption.
 *
 * THE CASES THAT MATTER MOST
 *   Wrong-client resolution. A misresolved client is not a wrong answer — it is
 *   a write to the wrong person's record. C0.5 proved that path was live in
 *   production on a destructive command. `expectedClientRef: null` cases are the
 *   ones that keep it dead: an utterance naming no client must NOT invent one.
 *
 * NO PII (rule 8) — every name here is synthetic.
 */

/**
 * @typedef {Object} IntentScenario
 * @property {string} id
 * @property {'intent_resolution'} category
 * @property {'intent_resolution'} type
 * @property {string} description
 * @property {string} input                  raw utterance
 * @property {Object} expected
 * @property {string|null} expected.intent   null = must NOT resolve
 * @property {string|null} [expected.clientRef]
 * @property {boolean} knownGap
 * @property {string|null} rationale
 */

const scenario = (id, description, input, expected, knownGap = false, rationale = null) => ({
  id,
  category: 'intent_resolution',
  type: 'intent_resolution',
  description,
  input,
  expected,
  knownGap,
  rationale,
});

export const INTENT_RESOLUTION_SCENARIOS = [
  // ── Adopted from coachCommandCenterGoldenScenarios (all verified passing) ──
  scenario(
    'intent_recall_selected_client_last_session',
    'Pronoun-free recall with no named client — must not invent one',
    'what did we do last time',
    { intent: 'view_last_workout', clientRef: null },
  ),
  scenario(
    'intent_recall_named_client_last_workout',
    'Named client is extracted verbatim as a reference, not resolved to an id here',
    'what did Ava Stone do last workout',
    { intent: 'view_last_workout', clientRef: 'Ava Stone' },
  ),
  scenario(
    'intent_review_next_intake',
    'Coach review-queue read',
    'review next intake',
    { intent: 'review_next_coach_intake', clientRef: null },
  ),
  scenario(
    'intent_open_plaud_queue',
    'PLAUD queue read',
    'open plaud',
    { intent: 'view_plaud_intake_queue', clientRef: null },
  ),

  // ── Wrong-client resolution: the catastrophic failure mode ────────────────
  // An utterance that names nobody must resolve clientRef to null so the caller
  // falls back to the LOCKED client. Inventing a reference here is exactly how a
  // write lands on the wrong person.
  scenario(
    'intent_no_client_named_yields_null_ref',
    'Bare recall names no client — clientRef must be null, never guessed',
    'what did we do last time',
    { intent: 'view_last_workout', clientRef: null },
  ),
  scenario(
    'intent_empty_utterance_resolves_nothing',
    'Empty input must resolve to no intent rather than a default command',
    '',
    { intent: null },
  ),
  scenario(
    'intent_whitespace_only_resolves_nothing',
    'Whitespace-only input must not resolve',
    '     ',
    { intent: null },
  ),
  scenario(
    'intent_unrelated_chatter_resolves_nothing',
    'Ordinary conversation must NOT be forced into a command',
    'thanks, that was a great session today',
    { intent: null },
  ),
  scenario(
    'intent_destructive_verb_is_not_a_read',
    'A destructive-sounding utterance must never silently resolve to a read command',
    'delete the workout',
    { intent: null },
    true,
    'Deliberate: confirms the deterministic router does not map destructive phrasing to any command. If a future change makes this resolve, it must be to a confirmation-gated intent, never a silent one.',
  ),
];

export default INTENT_RESOLUTION_SCENARIOS;