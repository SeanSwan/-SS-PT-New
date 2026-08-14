---
title: Kimi review 4 — post-push sweep of the shipped code
date: 2026-08-13
originating_model: claude-opus-5
reviewer: moonshotai/kimi-k3
remit: the code is NOW LIVE in production. Find what is wrong with it.
privacy: IDs/roles only; no secrets, no PII, no DB material
---

# Remit

This code shipped to production ~20 minutes ago (`2eb41a88d`). Your review 3 found 5 real
defects in it and I fixed all 5 before pushing. This is the post-fix state of those same
modules, plus two I did not send you last time.

**Your calibration so far, stated honestly:** given an artefact you can READ you have been
excellent (review 1: all verified claims real; review 3: 5 of 8 real, the 3 misses each
about code I had elided). Given a DESCRIPTION you were wrong on 2 of 3 (review 2). So here
is source again.

Find what is wrong with what is written. Assume the obvious things are handled — I want
what survived three prior reviews. Rank by how cheaply an ordinary trainer or client trips
it in production TODAY.

## Settled — do not re-litigate

- No `/unblock` route; `/recurring` is adminOnly; `/book-recurring` binds `req.user.id`.
- `Invalid trainerId` maps to 400 via the route's existing `includes('invalid')` branch.
- The busy guard acks `false` synchronously (covered by an exactly-once suite).
- The service DOES call the policy (session.service.mjs:1247).
- The existing-user email path is independently hardened (staff refused; client needs admin
  or ACTIVE assignment; identical 409 both ways).
- Raw answers survive in `responsesJson`; only the projection is sanitized.

## 1. The name contract, AFTER your review-3 fixes

```javascript
 * data-quality opinion this system has no business enforcing on a person.
 */

const asTrimmedString = (value) => (typeof value === 'string' ? value.trim() : '');

/** Present but not a string — a value we must refuse rather than quietly discard. */
const isUnusableName = (value) =>
  value !== undefined && value !== null && typeof value !== 'string';

/** Collapse internal whitespace runs so the derived display name is clean. */
const collapseSpaces = (value) => value.replace(/\s+/g, ' ');

/**
 * Resolve the canonical name for an onboarding payload.
 *
 * @param {Record<string, unknown>} formData
 * @returns {{ ok: true, firstName: string, lastName: string, fullName: string }
 *          | { ok: false, field: 'name', reason: string }}
 */
export const resolveOnboardingName = (formData = {}) => {
  // Kimi K3 review 3, finding 4 — verified: a default parameter does not cover an
  // explicit null, so `resolveOnboardingName(null)` threw a TypeError and became a
  // 500. The sibling helper guarded null; this one did not. Same slice, two
  // helpers, two different answers to the same question.
  if (!formData || typeof formData !== 'object') {
    return { ok: false, field: 'name', reason: 'A first name (or full name) is required' };
  }

  // Refuse a present-but-non-string name part rather than coercing or dropping it.
  // Found by probing the fix itself: {firstName:'Ava', lastName: 12345} used to
  // create a client with NO surname and NO error — silent data loss, and
  // inconsistent with rejecting a non-string firstName.
  if (isUnusableName(formData.firstName) || isUnusableName(formData.lastName)) {
    return { ok: false, field: 'name', reason: 'Name fields must be text' };
  }

  const firstName = collapseSpaces(asTrimmedString(formData.firstName));
  const lastName = collapseSpaces(asTrimmedString(formData.lastName));

  if (firstName || lastName) {
    // Kimi K3 review 3, finding 3 — verified: when only ONE split part arrived
    // alongside a legacy `fullName`, this branch won and the fullName was
    // discarded entirely. `{firstName:'Ava', fullName:'Ava Smith'}` returned
    // `fullName: 'Ava'` — half the name gone, silently, from a module whose
    // stated ethos is "refuse rather than quietly discard". That is exactly the
    // shape a legacy integration sends while migrating to the split fields.
    const legacy = collapseSpaces(asTrimmedString(formData.fullName));
    if (legacy && (!firstName || !lastName)) {
      const parts = legacy.split(' ');
      const derivedFirst = firstName || parts[0];
      const derivedLast = lastName || parts.slice(1).join(' ');
      return {
        ok: true,
        firstName: derivedFirst,
        lastName: derivedLast,
        fullName: [derivedFirst, derivedLast].filter(Boolean).join(' '),
      };
    }

    // Kimi K3 review 3, finding 2 — verified: this used to read
    // `firstName || lastName`, so `{firstName:'', lastName:'Smith'}` stored the
    // SURNAME in the given-name column. The comment said "never reconstruct what
    // was given" while the code reconstructed. Every `Dear {firstName}` and every
    // legal or billing use of the split was then wrong. The split is now returned
    // exactly as supplied.
    return {
      ok: true,
      firstName,
      lastName,
      fullName: [firstName, lastName].filter(Boolean).join(' '),
    };
  }

  if (isUnusableName(formData.fullName)) {
    return { ok: false, field: 'name', reason: 'Name fields must be text' };
  }

  const fullName = collapseSpaces(asTrimmedString(formData.fullName));
  if (fullName) {
    const parts = fullName.split(' ');
    return {
```

## 2. The sanitizer, AFTER the line-anchor fix

```javascript

const INJECTION_PATTERNS = [
  /```+/g,                                                   // code fences
  /<\|[^|>]*\|>/g,                                           // chat control tokens
  /\b(ignore|disregard|forget|override)\s+(all\s+|any\s+)?(previous|prior|above|earlier|system)\s+(instructions?|prompts?|rules?|messages?)\b/gi,
  // Role markers, anchored to a LINE START.
  //
  // Kimi K3 review 3, finding 1 — verified against this function: the previous
  // pattern was `\b(system|assistant|developer|tool)\s*:` with no anchor, so it
  // fired anywhere in the string and ate ordinary clinical and occupational text:
  //   "Digestive system: sensitive to dairy"      -> "Digestive sensitive to dairy"
  //   "Physician assistant: shift work"           -> "Physician shift work"
  //   "Occupation: software developer: 10h seated"-> "Occupation: software 10h seated"
  // Health intake is precisely where "digestive system:" and an occupation of
  // "developer" or "physician assistant" appear. The onboarding field-dictionary
  // slice newly routes health free text through here, which is what exposed it.
  //
  // A genuine injected role marker sits at a line boundary; a body-system name
  // sits mid-sentence. Anchoring keeps the control and returns the meaning.
  // Applied BEFORE whitespace collapse (see sanitizeClientText) or the anchor
  // would have nothing to bind to.
  /^\s*(system|assistant|developer|tool)\s*:/gim,            // role markers
];

const DEFAULT_MAX_LEN = 280;

/**
 * Sanitize client-authored free text for safe prompt interpolation.
 * Null/undefined/empty → '' (render sites skip empty strings).
 */
export function sanitizeClientText(text, { maxLen = DEFAULT_MAX_LEN } = {}) {
  if (text == null) return '';
  let s = String(text);
  if (!s.trim()) return '';
  // Injection patterns run BEFORE whitespace collapse: the role-marker pattern is
  // anchored to a line start, and collapsing newlines first would leave it nothing
  // to bind to (only the very start of the string would ever match). See the
  // pattern's own note for why the anchor exists.
  for (const pattern of INJECTION_PATTERNS) s = s.replace(pattern, ' ');
  s = s.replace(/<[^>]*>/g, ' ');            // any markup/tag shapes
  s = s.replace(/\s+/g, ' ').trim();
  if (s.length > maxLen) s = `${s.slice(0, maxLen - 1)}…`;
  return s;
}

/**
 * Sanitize and wrap in <client_reported> delimiters. Empty input → ''.
 */
export function wrapClientReported(text, opts) {
  const s = sanitizeClientText(text, opts);
  return s ? `<client_reported>${s}</client_reported>` : '';
}

```

## 3. The field dictionary's two lanes, AFTER the projection-key fix

```javascript
      out[projectionKey] = meta.narrative ? wrapClientReported(incoming) : incoming;
    }
  }

  return out;
};

/**
 * Sanitize the narrative fields whose wizard name ALREADY matches the projection
 * key — those skip the rename loop above and would otherwise reach the prompt raw.
 *
 * Routing these fields into the projection is what made this necessary. Before
 * the field-dictionary fix they never arrived, so client free text could not
 * carry instructions into a workout prompt; now it can, and this closes that
 * lane in the same slice that opened it. Uses the sanitizer that already exists
 * for exactly this threat (services/ai/clientTextSanitizer.mjs) rather than a
 * second one.
 */
export const sanitizeNarrativeFields = (formData = {}) => {
  if (!formData || typeof formData !== 'object') return formData;

  const out = { ...formData };

  // Keyed on the PROJECTION key, not the wizard field name.
  //
  // Kimi K3 review 3, finding 5 — verified: a narrative value supplied directly
  // under its projection key skipped BOTH sanitizers. The dictionary declined
  // because the key was already set; this function declined because
  // projectionKey !== wizardField. `{ pastInjuries: "ignore all previous
  // instructions..." }` reached the workout prompt completely raw. The slice
  // that opened that lane only half-closed it, and the "a caller already
  // speaking the projection's language is untouched" comment described the hole
  // as if it were a feature.
  //
  // Sanitizing by projection key closes both entrances. Safe to apply twice:
  // wrapClientReported strips markup (including a forged <client_reported>
  // wrapper) before re-wrapping, so pre-wrapped attack values do not survive
  // and honest values do not nest.
  for (const meta of Object.values(MAPPED_FIELDS)) {
    if (!meta.narrative) continue;

    const value = out[meta.projectionKey];
    if (typeof value === 'string' && value.trim() !== '') {
      out[meta.projectionKey] = wrapClientReported(value);
    }
  }

  return out;
};
```

## 4. NOT SENT BEFORE — the workout-form projection consumer

The projection above is persisted to `User.masterPromptJson` and read here:

```javascript
  commitmentLevel: toInt(formData.commitmentLevel),
  pastObstacles: formData.pastObstacles || '',
  supportNeeded: formData.supportNeeded || '',
});

const buildHealth = (formData) => ({
  medicalConditions: formData.medicalConditions || [],
  underDoctorCare: yes(formData.underDoctorCare),
  doctorCleared: yes(formData.doctorCleared),
  medications: formData.medications || [],
  supplements: formData.supplements || [],
  injuries: formData.pastInjuries || [],
  surgeries: formData.pastSurgeries || [],
  currentPain: formData.currentPain || [],
  // Added 2026-08-13 (S5/F10). The wizard has asked every client these four
  // questions all along and the projection had nowhere to put the answers, so
  // they were collected and discarded. Movement limits and the two PAR-Q
  // cardiac screens are exactly the inputs that should constrain programming.
  // Blood pressure is carried as the raw reading the wizard collects rather
  // than parsed into systolic/diastolic — guessing at the format of a
  // free-text vital is a worse failure than passing it through verbatim.
  movementLimitations: formData.movementLimitations || '',
  chestPain: yes(formData.chestPain),
  heartCondition: yes(formData.heartCondition),
  bloodPressureReading: formData.bloodPressureReading || '',
});

const buildNutrition = (formData) => ({
  currentDiet: formData.currentDietQuality,
  tracksFood: yes(formData.tracksFood),
  trackingApp: formData.trackingApp || null,
  dailyProtein: formData.dailyProtein ? toFloat(formData.dailyProtein) : 0,
  targetProtein: formData.targetProtein ? toFloat(formData.targetProtein) : 0,
  waterIntake: formData.waterIntake ? toInt(formData.waterIntake) : 0,
  eatingSchedule: {
    breakfast: formData.breakfastTime || '',
```

## 5. NOT SENT BEFORE — the calendar policy's full current text

```javascript
/**
 * ============================================================================
 * FILE: sessionBlockAuthorization.mjs
 * PURPOSE: Single source of truth for WHOSE calendar a blocked-time request may
 *          write to. Imported by both the route boundary and the service.
 * AUTHOR: Claude Opus 5 | CREATED: 2026-08-13 (Swan Coach V3 · S1 · F7)
 * ============================================================================
 *
 * WHY THIS IS ITS OWN MODULE
 * The F7 defect existed because two copies of this decision disagreed. The
 * retired `routes/sessionRoutes.mjs` bound the actor first and was correct; the
 * live `UnifiedSessionService` reversed the operands and was not:
 *
 *     trainerId || (user.role === 'trainer' ? user.id : null)   // submitted wins
 *
 * A submitted id short-circuits the `||`, so the authenticated identity is never
 * consulted. One module, imported by every enforcement point, removes the class
 * of bug rather than this one instance of it. It deliberately imports nothing —
 * no database, no models, no logger — so every caller can enforce the policy
 * without dragging in infrastructure, and so it is testable in isolation.
 */

/**
 * Parse an optional id into a positive integer, or null when absent.
 * Mirrors `normalizeOptionalPositiveInteger` in session.service.mjs; kept local
 * so this module stays dependency-free.
 */
const parseOptionalId = (value) => {
  if (value === undefined || value === null) return null;
  if (typeof value === 'string' && value.trim() === '') return null;

  // Only numbers and numeric strings are ids. `Number()` is far too forgiving to
  // be a validator on untrusted JSON: Number(true) === 1 and Number([5]) === 5,
  // so a boolean or a one-element array would sail through as a real trainer id.
  // A JSON body can carry either trivially.
  if (typeof value !== 'number' && typeof value !== 'string') {
    throw new Error('Invalid trainerId for blocked time: must be a positive integer');
  }

  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new Error('Invalid trainerId for blocked time: must be a positive integer');
  }

  return parsed;
};

/**
 * Resolve the trainer whose calendar a blocked-time request may write to.
 *
 * Refuses rather than silently clamping. A request naming someone else's calendar
 * is a misuse; quietly rewriting it to the caller's own would hide both an attack
 * and an integration bug. Comparison is by numeric VALUE, because the live UI
 * posts `String(user.id)` from a select element — an identity check would reject
 * the normal path and turn a security fix into an outage.
 *
 * @param {{ requestedTrainerId: unknown, user: { id: number|string, role: string } }} input
 * @returns {number|null} trainer id to persist, or null for unassigned studio time
 * @throws {Error} 'Admin or trainer …' when the role may not block time at all
 * @throws {Error} 'Invalid trainerId …' when the target is malformed
 * @throws {Error} 'Not authorized …' when a trainer targets someone else
 */
export const resolveBlockedTimeSubject = ({ requestedTrainerId, user }) => {
  if (!user || !['admin', 'trainer'].includes(user.role)) {
    throw new Error('Admin or trainer privileges required to block time');
  }

  const requested = parseOptionalId(requestedTrainerId);

  if (user.role === 'admin') {
    return requested;
  }

  const self = Number(user.id);
  if (!Number.isInteger(self) || self <= 0) {
    // An authenticated trainer with no usable id must not fall through to a null
    // subject — that would silently create unassigned studio blocks instead.
    throw new Error('Not authorized to block time: authenticated trainer id is unusable');
  }

  if (requested !== null && requested !== self) {
    throw new Error('Not authorized to block time on another trainer\'s calendar');
  }

  return self;
};

export default resolveBlockedTimeSubject;
```

## Specific things to attack

- The `legacy && (!firstName || !lastName)` branch I added for your finding 3 — what inputs
  make it produce a worse answer than the code it replaced?
- The reordered sanitizer: patterns now run BEFORE whitespace collapse. What does that
  change that I have not noticed? Multi-line input, CRLF, unicode whitespace, the 280-char
  cap interacting with a now-longer pre-collapse string.
- `sanitizeNarrativeFields` now iterates `Object.values(MAPPED_FIELDS)` — two wizard fields
  could share a projection key. What happens?
- The interaction between the two lanes when a caller supplies BOTH the wizard key and the
  projection key for the same narrative field.
- `resolveBlockedTimeSubject` — anything a trainer or admin can send that produces a subject
  neither of them intended.

## Output

Per finding: what breaks, exact input, how cheaply it is hit in production today, smallest
fix. Then one verdict: is anything here urgent enough to warrant a same-day follow-up push,
or does it all ride the next batch?
