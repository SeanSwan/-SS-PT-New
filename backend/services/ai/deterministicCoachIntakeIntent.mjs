/**
 * deterministicCoachIntakeIntent.mjs
 * ==================================
 * Local phrase classifier for explicit Swan Coach intake and read/review operations.
 *
 * This module keeps high-confidence operational prompts off the cloud
 * classifier path while preserving the normal AI classifier for ambiguous
 * natural language.
 */

const COACH_INTAKE_ID_PATTERN = '[a-z0-9:_-]{1,128}';
const CLIENT_REF_PATTERN = '([a-z][a-z0-9 .\'-]{1,100})';
const PLAUD_CONFIRMATION_TYPES = new Set([
  'audio_order',
  'client',
  'date',
  'duplicate',
  'merge_boundary',
]);

const fixedIntent = (intent, params = {}, clientRef = null) => ({
  intent,
  clientRef,
  params,
  confidence: 1,
});

const idParams = (value) => (value ? { intakeId: value } : {});
const cleanClientRef = (value) => String(value || '')
  .replace(/\s+/g, ' ')
  .replace(/[?.!,]+$/g, '')
  .trim();

const clientIntent = (intent, value, params = {}) => fixedIntent(intent, params, cleanClientRef(value));

function classifyDeterministicClientReadIntent(trimmed) {
  if (/^(?:list|show|view)\s+(?:my\s+)?(?:active\s+)?clients$/i.test(trimmed)) {
    return fixedIntent('list_active_clients');
  }

  if (/^(?:show|view|list)\s+(?:my\s+)?(?:at-risk|at risk|attention)\s+clients$/i.test(trimmed)) {
    return fixedIntent('at_risk_clients');
  }

  if (/^(?:show|view|open)\s+(?:the\s+)?(?:orientation|onboarding)\s+queue$/i.test(trimmed)) {
    return fixedIntent('view_orientation_queue');
  }

  let match = new RegExp(`^(?:start|begin|run)\\s+(?:onboarding|the\\s+onboarding\\s+process)\\s+(?:for\\s+)?${CLIENT_REF_PATTERN}$`, 'i').exec(trimmed);
  if (match) return clientIntent('start_onboarding', match[1]);

  match = new RegExp(`^(?:ask\\s+me\\s+)?(?:the\\s+)?onboarding\\s+questions\\s+(?:for\\s+)?${CLIENT_REF_PATTERN}$`, 'i').exec(trimmed);
  if (match) return clientIntent('onboarding_questions', match[1]);

  match = new RegExp(`^(?:show|view|pull\\s+up|open)\\s+(?:profile\\s+for\\s+)?${CLIENT_REF_PATTERN}(?:'s)?\\s+(?:profile|client\\s+profile)$`, 'i').exec(trimmed);
  if (match) return clientIntent('view_client_profile', match[1]);

  // "what did <name> do …" requires the "do" AFTER the name — with an
  // optional (?:\s+do)? the greedy name pattern (its class includes spaces)
  // swallowed the word: clientRef "Ava Stone do". Split alternation keeps
  // "show/view <name> last workout" working without the trap.
  match = new RegExp(`^(?:what\\s+did\\s+${CLIENT_REF_PATTERN}\\s+do|(?:show|view)\\s+${CLIENT_REF_PATTERN})\\s+(?:last\\s+(?:workout|session)|previous\\s+(?:workout|session))$`, 'i').exec(trimmed);
  if (match) return clientIntent('view_last_workout', match[1] ?? match[2]);

  if (/^(?:what\s+did\s+we\s+do\s+last\s+time|show\s+last\s+workout|view\s+last\s+session)$/i.test(trimmed)) {
    return fixedIntent('view_last_workout');
  }

  match = new RegExp(`^(?:show|view|open)\\s+${CLIENT_REF_PATTERN}(?:'s)?\\s+workout\\s+(?:history|log)$`, 'i').exec(trimmed);
  if (match) return clientIntent('view_workout_history', match[1]);

  match = new RegExp(`^(?:build|generate|design)\\s+(?:a\\s+)?(?:workout\\s+)?(?:plan|program)\\s+(?:for\\s+)?${CLIENT_REF_PATTERN}$`, 'i').exec(trimmed);
  if (match) return clientIntent('build_workout_plan', match[1]);

  return null;
}

const normalizeConfirmationType = (value) => {
  const normalized = String(value || 'audio_order').trim().toLowerCase().replace(/\s+/g, '_');
  return PLAUD_CONFIRMATION_TYPES.has(normalized) ? normalized : 'audio_order';
};

export function classifyDeterministicCoachIntakeIntent(message) {
  const trimmed = String(message || '').replace(/\s+/g, ' ').trim();
  if (!trimmed) return null;

  const clientReadIntent = classifyDeterministicClientReadIntent(trimmed);
  if (clientReadIntent) return clientReadIntent;

  if (/^(?:list|show)\s+plaud\s+(?:intake\s+)?items(?:\s+in\s+coach\s+intake)?$/i.test(trimmed)) {
    return fixedIntent('plaud_list_intake_items');
  }

  if (/^(?:open|show|view)\s+(?:the\s+)?plaud(?:\s+queue|\s+workspace|\s+uploads)?$/i.test(trimmed)) {
    return fixedIntent('view_plaud_intake_queue', { scope: 'actionable' });
  }

  if (/^(?:review|open)\s+(?:the\s+)?next\s+plaud(?:\s+(?:intake|item|recording))?$/i.test(trimmed)) {
    return fixedIntent('review_next_plaud_intake');
  }

  if (/^(?:review|open)\s+(?:the\s+)?next(?:\s+coach)?\s+intake$/i.test(trimmed)) {
    return fixedIntent('review_next_coach_intake');
  }

  let plaudMatch = new RegExp(
    `^(?:analyze|inspect|summarize)\\s+(?:this\\s+)?plaud\\s+clip\\s+set(?:\\s+(?:for\\s+)?(${COACH_INTAKE_ID_PATTERN}))?$`,
    'i',
  ).exec(trimmed);
  if (plaudMatch) {
    return fixedIntent('plaud_analyze_clip_set', idParams(plaudMatch[1]));
  }

  plaudMatch = new RegExp(
    `^(?:propose\\s+)?plaud\\s+clip\\s+order(?:\\s+(?:for\\s+)?(${COACH_INTAKE_ID_PATTERN}))?$`,
    'i',
  ).exec(trimmed);
  if (plaudMatch) {
    return fixedIntent('plaud_propose_clip_order', idParams(plaudMatch[1]));
  }

  if (/^order\s+(?:these\s+)?plaud\s+clips$/i.test(trimmed)) {
    return fixedIntent('plaud_propose_clip_order');
  }

  plaudMatch = new RegExp(
    `^group\\s+plaud\\s+session\\s+candidates(?:\\s+(?:for\\s+)?(${COACH_INTAKE_ID_PATTERN}))?$`,
    'i',
  ).exec(trimmed);
  if (plaudMatch) {
    return fixedIntent('plaud_group_session_candidates', idParams(plaudMatch[1]));
  }

  plaudMatch = new RegExp(
    `^(?:prepare|stage)\\s+(?:this\\s+)?plaud\\s+(?:merge\\s+candidate\\s+group|group\\s+for\\s+confirmation)(?:\\s+(?:for\\s+)?(${COACH_INTAKE_ID_PATTERN}))?$`,
    'i',
  ).exec(trimmed);
  if (plaudMatch) {
    return fixedIntent('plaud_merge_candidate_group', idParams(plaudMatch[1]));
  }

  plaudMatch = new RegExp(
    `^request\\s+confirmation\\s+for\\s+plaud(?:\\s+(?:intake\\s+)?)?(?:(${COACH_INTAKE_ID_PATTERN})\\s+)?(audio\\s+order|client|date|duplicate|merge\\s+boundary)?$`,
    'i',
  ).exec(trimmed);
  if (plaudMatch) {
    return fixedIntent('plaud_request_confirmation', {
      ...idParams(plaudMatch[1]),
      confirmationType: normalizeConfirmationType(plaudMatch[2]),
    });
  }

  if (/^ask\s+me\s+to\s+confirm\s+plaud\s+order$/i.test(trimmed)) {
    return fixedIntent('plaud_request_confirmation', { confirmationType: 'audio_order' });
  }

  const itemAudioMatch = new RegExp(
    `^inspect\\s+coach\\s+intake\\s+(${COACH_INTAKE_ID_PATTERN})\\s+audio\\s+pieces$`,
    'i',
  ).exec(trimmed);
  if (itemAudioMatch) {
    return fixedIntent('inspect_coach_audio_pieces', { intakeId: itemAudioMatch[1] });
  }

  if (/^inspect\s+pending\s+(?:coach\s+)?audio\s+pieces$/i.test(trimmed)) {
    return fixedIntent('inspect_coach_audio_pieces');
  }

  if (/^show\s+(?:my\s+)?coach\s+intake\s+clarification\s+holds$/i.test(trimmed)) {
    return fixedIntent('view_coach_intake_queue', { scope: 'needs_clarification' });
  }

  if (/^show\s+(?:my\s+)?coach\s+intake\s+duplicate(?:-risk)?\s+holds$/i.test(trimmed)) {
    return fixedIntent('view_coach_intake_queue', { scope: 'duplicate_hold' });
  }

  if (/^(?:show|view)\s+(?:my\s+)?coach\s+intake\s+(?:queue|health|status)$/i.test(trimmed)) {
    return /health|status/i.test(trimmed)
      ? fixedIntent('view_coach_intake_health')
      : fixedIntent('view_coach_intake_queue', { scope: 'actionable' });
  }

  return null;
}
