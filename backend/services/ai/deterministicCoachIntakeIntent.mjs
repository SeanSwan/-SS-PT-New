/**
 * deterministicCoachIntakeIntent.mjs
 * ==================================
 * Local phrase classifier for explicit Swan Coach intake operations.
 *
 * This module keeps high-confidence operational prompts off the cloud
 * classifier path while preserving the normal AI classifier for ambiguous
 * natural language.
 */

const COACH_INTAKE_ID_PATTERN = '[a-z0-9:_-]{1,128}';
const PLAUD_CONFIRMATION_TYPES = new Set([
  'audio_order',
  'client',
  'date',
  'duplicate',
  'merge_boundary',
]);

const fixedIntent = (intent, params = {}) => ({
  intent,
  clientRef: null,
  params,
  confidence: 1,
});

const idParams = (value) => (value ? { intakeId: value } : {});

const normalizeConfirmationType = (value) => {
  const normalized = String(value || 'audio_order').trim().toLowerCase().replace(/\s+/g, '_');
  return PLAUD_CONFIRMATION_TYPES.has(normalized) ? normalized : 'audio_order';
};

export function classifyDeterministicCoachIntakeIntent(message) {
  const trimmed = String(message || '').trim();

  if (/^(?:list|show)\s+plaud\s+(?:intake\s+)?items(?:\s+in\s+coach\s+intake)?$/i.test(trimmed)) {
    return fixedIntent('plaud_list_intake_items');
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

  if (/^review\s+next\s+coach\s+intake$/i.test(trimmed)) {
    return fixedIntent('review_next_coach_intake');
  }

  if (/^show\s+(?:my\s+)?coach\s+intake\s+clarification\s+holds$/i.test(trimmed)) {
    return fixedIntent('view_coach_intake_queue', { scope: 'needs_clarification' });
  }

  if (/^show\s+(?:my\s+)?coach\s+intake\s+duplicate(?:-risk)?\s+holds$/i.test(trimmed)) {
    return fixedIntent('view_coach_intake_queue', { scope: 'duplicate_hold' });
  }

  return null;
}
