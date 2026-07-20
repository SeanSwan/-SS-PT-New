/**
 * parseWorkout.mjs — deterministic parser for dictated workout text.
 * ==================================================================
 *
 * BLUEPRINT
 * ---------
 * PURPOSE
 *   Sean dictates client workouts to Hermes over Telegram in natural speech. This turns one dictated
 *   line into a structured record: which client, which exercises, how many sets/reps, what load.
 *
 * WHY DETERMINISTIC (no LLM)
 *   A parser that silently guesses is worse than one that refuses. Client training records are business
 *   records — a hallucinated set count is a corrupted record that looks correct. Everything here is regex
 *   + explicit grammar, so every output is traceable to input text, and anything unrecognised is preserved
 *   verbatim in `unparsed[]` rather than invented. An LLM pass may LATER enrich a parsed record; it must
 *   never be the thing that decides what the numbers were.
 *
 * CLIENT SEPARATION (verified 2026-07-19)
 *   Hermes Telegram usage is a single DM: 1 chat_id, 0 thread_ids, chat_type='dm'. There is therefore no
 *   thread to separate clients by — the client MUST come from the text. A line with no client marker is
 *   returned with `clientRef: null` and is never attributed by proximity or "last client seen"; guessing
 *   attribution across clients is the single worst failure this module could have.
 *
 * PRIVACY (Rule 8)
 *   Client IDs are preferred over names. Names are accepted because Sean speaks naturally, but callers
 *   MUST treat any parsed name as PII: local-only storage, never committed, never sent to a cloud LLM,
 *   never indexed into the searchable vault. This module does no I/O — it cannot leak on its own.
 *
 * GRAMMAR (each independently optional except the exercise itself)
 *   client marker : "client 84" | "client: 84" | "for client 84" | "client Sarah" | "84:" (leading)
 *   exercise      : <name> <sets>x<reps> [@|at <weight>[unit]]
 *                   <name> <sets> sets of <reps> [@|at <weight>[unit]]
 *   separators    : "," | ";" | " and " | newline
 *
 * @module parseWorkout
 */

/** Weight units we recognise; anything else is kept as raw text. */
const UNITS = ['lb', 'lbs', 'pound', 'pounds', 'kg', 'kgs', 'kilo', 'kilos'];

/** Normalise a spoken unit to a storage unit. Unknown/absent → null (bodyweight or unspecified). */
export function normalizeUnit(raw) {
  if (!raw) return null;
  const u = String(raw).toLowerCase().replace(/[.\s]/g, '');
  if (['lb', 'lbs', 'pound', 'pounds'].includes(u)) return 'lb';
  if (['kg', 'kgs', 'kilo', 'kilos'].includes(u)) return 'kg';
  return null;
}

/**
 * Product/dev vocabulary that follows the word "client" in ordinary conversation.
 * Defence-in-depth against the false-positive class found against real data on 2026-07-19, where
 * "client dashboard" / "client progress" / "client intervention" were each parsed as a PERSON.
 */
const CLIENT_WORD_STOPLIST = new Set([
  'dashboard', 'dashboards', 'progress', 'intervention', 'interventions', 'grid', 'view', 'views',
  'page', 'pages', 'list', 'lists', 'table', 'tables', 'data', 'record', 'records', 'management',
  'manager', 'card', 'cards', 'panel', 'panels', 'detail', 'details', 'profile', 'profiles',
  'onboarding', 'workflow', 'workflows', 'side', 'facing', 'level', 'app', 'ui', 'ux', 'api',
  'route', 'routes', 'model', 'models', 'schema', 'component', 'components', 'and', 'or', 'the',
  'a', 'an', 'is', 'was', 'has', 'have', 'for', 'with', 'that', 'this', 'notes', 'note', 'session',
  'sessions', 'workout', 'workouts', 'chart', 'charts', 'tab', 'tabs', 'feed', 'form', 'forms',
]);

/**
 * True when a token looks like a code identifier rather than a person's name.
 * Found against real data 2026-07-19: the text "client: OperatorObservabilityApiClient" legitimately
 * matched the colon rule and created a client named after a class. People are not CamelCase.
 */
export function looksLikeCodeIdentifier(token) {
  const t = String(token || '');
  if (t.length > 24) return true;                       // human first names are short
  if ((t.match(/[A-Z]/g) || []).length >= 3) return true; // CamelCase / PascalCase
  if (/[_$]/.test(t)) return true;                       // snake_case / $vars
  if (/(Client|Service|Api|Controller|Provider|Manager|Handler|Repo|Store|Config)$/.test(t)) return true;
  return false;
}

/**
 * Extract the client reference from a dictated line.
 * Returns { kind: 'id'|'name', value, matchedText } or null when no marker is present.
 *
 * NEVER infers a client. Two failure directions are both guarded:
 *   - MISSING marker  → returns null, caller must resolve (`needsClient`).
 *   - FALSE marker    → a bare "client <word>" is NOT accepted as a name. Names require an explicit
 *                       colon ("client: Sarah") or possessive/`@` form, must be capitalised, and must
 *                       not be product vocabulary. Verified against real data: without this, dev chatter
 *                       about the "client dashboard" silently created a client named "dashboard".
 */
export function extractClientRef(text) {
  const s = String(text || '');

  // "client 84" / "client: 84" / "for client #84" — the preferred, unambiguous form.
  const byId = s.match(/\b(?:for\s+)?client\s*#?\s*:?\s*(\d{1,6})\b/i);
  if (byId) return { kind: 'id', value: byId[1], matchedText: byId[0] };

  // "client: Sarah" / "client: Sarah M" — colon REQUIRED, name must be capitalised.
  const byColon = s.match(/\bclient\s*:\s*([A-Z][A-Za-z'’-]*(?:\s+[A-Z][A-Za-z'’-]*)?)/);
  if (byColon) {
    const name = byColon[1].trim();
    const first = name.split(/\s+/)[0];
    if (!CLIENT_WORD_STOPLIST.has(first.toLowerCase()) && !looksLikeCodeIdentifier(first)) {
      return { kind: 'name', value: name, matchedText: byColon[0] };
    }
  }

  // NOTE: an "@handle" form was tried and REMOVED on 2026-07-19. Against real data it collided with
  // JSDoc/code annotations pasted into chat (@deprecated, @returns, @mention), inventing clients from
  // source code. The colon and id forms are unambiguous; a handle form is not worth that failure mode.

  // Leading bare id: "84: bench 3x8" or "84 - bench 3x8"
  const leading = s.match(/^\s*#?(\d{1,6})\s*[:\-–—]\s*/);
  if (leading) return { kind: 'id', value: leading[1], matchedText: leading[0] };

  return null;
}

/** Strip a leading verb like "log"/"logged"/"record" so it never becomes an exercise name. */
function stripLeadVerb(s) {
  return s.replace(/^\s*(?:please\s+)?(?:log|logged|logging|record|recorded|note|add)\b[:\s]*/i, '');
}

/**
 * Physiological sanity bounds. A dictation typo ("38x8" for "3x8") must be REFUSED to `unparsed`,
 * not recorded as fact — 38 sets in a client's training record is corruption that looks precise.
 * Bounds are deliberately loose (real training rarely exceeds half of any of these).
 */
export const BOUNDS = { maxSets: 30, maxReps: 300, maxWeight: 2000 };

/**
 * Parse one exercise fragment, e.g. "goblet squat 3x12 @35lb" or "RDL 3 sets of 10 at 95".
 * Returns an exercise object, or null when the fragment carries no sets×reps OR fails sanity
 * bounds (either way it stays `unparsed` — preserved, never guessed at).
 *
 * Trailing text after the recognised shape is CAPTURED as `note`, never dropped. Hostile review
 * 2026-07-20 found "bench 3x8 @95 felt heavy" silently discarding "felt heavy" and
 * "squat 5x5 @ RPE 8" discarding the RPE — a direct violation of the preserve-verbatim contract.
 */
export function parseExerciseFragment(fragment) {
  const raw = String(fragment || '').trim();
  if (!raw) return null;

  const unitAlt = UNITS.join('|');
  // <sets> x <reps>   |   <sets> sets of <reps>   (NOT end-anchored — remainder becomes `note`)
  const shape = new RegExp(
    String.raw`^(?<name>.*?)\s*` +
    String.raw`(?<sets>\d{1,3})\s*(?:x|×|\s+sets?\s+of\s+)\s*(?<reps>\d{1,4})` +
    String.raw`(?:\s*(?:@|at)\s*(?<weight>\d{1,4}(?:\.\d+)?)\s*(?<unit>${unitAlt})?)?`,
    'i',
  );
  const m = raw.match(shape);
  if (!m || !m.groups) return null;

  const name = m.groups.name.replace(/[-–—:,]+\s*$/, '').trim();
  if (!name) return null;

  const sets = Number(m.groups.sets);
  const reps = Number(m.groups.reps);
  const weight = m.groups.weight != null ? Number(m.groups.weight) : null;

  // Sanity bounds: refuse to unparsed rather than record a typo as truth.
  if (sets < 1 || sets > BOUNDS.maxSets) return null;
  if (reps < 1 || reps > BOUNDS.maxReps) return null;
  if (weight != null && (weight <= 0 || weight > BOUNDS.maxWeight)) return null;

  // Whatever followed the recognised shape is preserved as a note ("felt heavy", "@ RPE 8", "seconds").
  const trailing = raw.slice(m[0].length).trim();

  const ex = {
    name,
    sets,
    reps,
    weight,
    // A weight with no spoken unit defaults to lb only when a weight exists at all.
    unit: weight == null ? null : (normalizeUnit(m.groups.unit) ?? 'lb'),
    raw,
  };
  if (trailing) ex.note = trailing;
  return ex;
}

/**
 * Parse a full dictated line into a structured workout.
 *
 * MULTI-CLIENT REFUSAL (hostile review 2026-07-20): a line naming a SECOND client after the first —
 * "client 84: bench 3x8; client 12: squat 5x5" — previously attributed EVERYTHING to client 84, with
 * "client 12: squat" embedded as an exercise name. That is the misattribution this module exists to
 * prevent, arriving through the front door. A second marker now sets `multiClient` and the caller must
 * refuse to persist; splitting the line correctly is a human's judgement call, not a regex's.
 *
 * @param {string} text  raw dictated text
 * @returns {{clientRef: object|null, exercises: object[], unparsed: string[],
 *            needsClient: boolean, multiClient: boolean}}
 */
export function parseWorkout(text) {
  const original = String(text || '');
  const clientRef = extractClientRef(original);

  // Remove the client marker so it can't be mistaken for an exercise name.
  let body = original;
  if (clientRef) body = body.replace(clientRef.matchedText, ' ');
  body = stripLeadVerb(body).replace(/^\s*[:\-–—]\s*/, '');

  // A second, DIFFERENT client marker in the remainder makes attribution ambiguous. Refuse, don't
  // split. Repeating the SAME client ("client 84: bench…, client 84 squat…") is natural speech and
  // is not ambiguous — round-2 hostile review found the first version punishing it.
  const secondRef = clientRef ? extractClientRef(body) : null;
  const multiClient = secondRef != null
    && !(secondRef.kind === clientRef.kind && secondRef.value === clientRef.value);

  const fragments = body
    .split(/\s*(?:,|;|\band\b|\n|\r)\s*/i)
    .map((f) => f.trim())
    .filter(Boolean);

  const exercises = [];
  const unparsed = [];
  for (const frag of fragments) {
    const ex = parseExerciseFragment(frag);
    if (ex) exercises.push(ex);
    else unparsed.push(frag);
  }

  return {
    clientRef,
    exercises,
    unparsed,
    // Caller must resolve these before persisting — we refuse to guess.
    needsClient: exercises.length > 0 && clientRef == null,
    multiClient,
  };
}

/** True when the text carries a sets×reps shape ("3x12", "3 sets of 12"). Necessary, NOT sufficient. */
export function hasSetsReps(text) {
  const s = String(text || '');
  if (!/\d/.test(s)) return false;
  return /\b\d{1,3}\s*(?:x|×)\s*\d{1,4}\b/i.test(s) || /\b\d{1,3}\s*sets?\s+of\s+\d{1,4}\b/i.test(s);
}

/**
 * True when a message is worth structuring as a workout.
 *
 * REQUIRES BOTH a sets×reps shape AND an explicit client marker. Sets×reps alone is far too weak:
 * verified 2026-07-19 against 277 real messages, sets×reps alone matched 5 messages and ALL FIVE were
 * software conversation ("client dashboard needs a 3x12 grid", JSDoc with @returns, a class named
 * ...ApiClient). Requiring the client marker drops the false-positive rate to zero on that corpus,
 * because engineering chatter never says "client 84:".
 *
 * Consequence, stated plainly: dictation must name the client. That is the contract.
 */
export function looksLikeWorkout(text) {
  return hasSetsReps(text) && extractClientRef(text) != null;
}
