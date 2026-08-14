---
title: Kimi review 3 — the four fixes, as CODE
date: 2026-08-13
originating_model: claude-opus-5
reviewer: moonshotai/kimi-k3
remit: hostile review of the actual source, pre-push, deploy-on-push branch
privacy: IDs/roles only; no secrets, no PII, no DB material
---

# Remit

Your review 2 judged these fixes from a DESCRIPTION and was wrong on 2 of 3 blockers —
you flagged every one as `[INFERENCE]` and named what would verify it, which is why the
correction cost minutes. Review 1 judged an artefact you could READ and was right on
everything I verified.

So here is the code. Four modules plus the seams they attach to. Find what is wrong with
what is actually written, not with what I claim about it.

Rank by how cheaply an ordinary trainer or client trips it. End with one verdict: safe to
push to a deploy-on-push production branch, or the minimum that makes it safe.

## Already settled — do not re-litigate

- No `/unblock` route exists. `/recurring` POST/PUT/DELETE are `adminOnly`.
  `/book-recurring` binds subject to `req.user.id`. `/block` was the only trainer-reachable
  calendar mutator with the defect.
- The existing-user email path is hardened independently (staff refused; existing client
  needs admin or an ACTIVE assignment; identical 409 both ways so it is not an oracle).
- Raw answers survive in `responsesJson`; only the projection is sanitized. Both helpers
  copy their input.
- Zero migrations in the push range.

## 1. The calendar authorization policy

```javascript
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

Route boundary:

```javascript
 */
router.post("/block", protect, trainerOrAdminOnly, async (req, res) => {
  try {
    // `trainerOrAdminOnly` gates on ROLE only — it never inspects WHICH trainer is
    // being targeted. The subject is therefore resolved here, before the service is
    // entered, so an unauthorized target cannot reach a transaction at all. The
    // service applies the identical rule for callers that bypass this route.
    const subjectTrainerId = resolveBlockedTimeSubject({
      requestedTrainerId: req.body?.trainerId,
      user: req.user
    });

    const result = await unifiedSessionService.createBlockedSessions(
      { ...req.body, trainerId: subjectTrainerId },
      req.user
    );
    return res.status(201).json(result);
  } catch (error) {
    logger.error('Error in POST /api/sessions/block:', error);
    const rawMessage = typeof error === 'string' ? error : (error?.message || '');
    const normalizedMessage = rawMessage.toLowerCase();

    if (normalizedMessage.includes('admin or trainer') || normalizedMessage.includes('not authorized')) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to block time'
      });
```

Service, at the point of use:

```javascript
          sessionTypeId: null, // Blocked time has no session type
          reason: reason || 'Blocked time',
          notifyClient: resolvedNotifyClient,
          recurringGroupId,
          recurrenceRule: recurrenceRule || null,
          isRecurring: dates.length > 1,
          isBlocked: true
        };
      });

      const createdSessions = await this.Session.bulkCreate(sessions, { transaction, returning: true });
      await transaction.commit();

      logger.info(`[UnifiedSessionService] Created ${createdSessions.length} blocked sessions`);

      return {
        success: true,
        message: `Successfully created ${createdSessions.length} blocked sessions`,
        count: createdSessions.length,
        sessions: createdSessions.slice(0, 5)
      };
    } catch (error) {
      if (transaction) {
```

## 2. The onboarding name contract

```javascript
 * derived from it for the downstream uses that want a display string. The
 * legacy fullName-only shape is still accepted and split as before, so existing
 * integrations keep working.
 *
 * A surname is not required: mononyms are real names, and rejecting them is a
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
    // The split the client collected wins. Never reconstruct what was given.
    return {
      ok: true,
      firstName: firstName || lastName,
      lastName: firstName ? lastName : '',
      fullName: [firstName, lastName].filter(Boolean).join(' '),
    };
  }

  if (isUnusableName(formData.fullName)) {
    return { ok: false, field: 'name', reason: 'Name fields must be text' };
  }

  const fullName = collapseSpaces(asTrimmedString(formData.fullName));
```

## 3. The field dictionary + narrative sanitization

```javascript
 * so a caller that already speaks the projection's language is untouched. Only
 * a key the projection would otherwise miss gets filled in.
 */
export const applyOnboardingFieldDictionary = (formData = {}) => {
  if (!formData || typeof formData !== 'object') return formData;

  const out = { ...formData };

  for (const [wizardField, meta] of Object.entries(MAPPED_FIELDS)) {
    const { projectionKey } = meta;
    if (projectionKey === wizardField) continue;

    const incoming = formData[wizardField];
    const alreadySet = out[projectionKey];
    const missing = alreadySet === undefined || alreadySet === null || alreadySet === '';

    if (incoming !== undefined && incoming !== null && incoming !== '' && missing) {
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

  for (const [wizardField, meta] of Object.entries(MAPPED_FIELDS)) {
    if (!meta.narrative) continue;
    if (meta.projectionKey !== wizardField) continue; // already handled on rename

    const value = out[wizardField];
    if (typeof value === 'string' && value.trim() !== '') {
      out[wizardField] = wrapClientReported(value);
    }
  }

  return out;
};
```

The sanitizer it delegates to (pre-existing, not mine):

```javascript
  /```+/g,                                                   // code fences
  /<\|[^|>]*\|>/g,                                           // chat control tokens
  /\b(ignore|disregard|forget|override)\s+(all\s+|any\s+)?(previous|prior|above|earlier|system)\s+(instructions?|prompts?|rules?|messages?)\b/gi,
  /\b(system|assistant|developer|tool)\s*:/gi,               // role markers
];

const DEFAULT_MAX_LEN = 280;

/**
 * Sanitize client-authored free text for safe prompt interpolation.
 * Null/undefined/empty → '' (render sites skip empty strings).
 */
export function sanitizeClientText(text, { maxLen = DEFAULT_MAX_LEN } = {}) {
  if (text == null) return '';
  let s = String(text).replace(/\s+/g, ' ').trim();
  if (!s) return '';
  for (const pattern of INJECTION_PATTERNS) s = s.replace(pattern, ' ');
  s = s.replace(/<[^>]*>/g, ' ');            // any markup/tag shapes
  s = s.replace(/\s{2,}/g, ' ').trim();
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

## 4. The Workout Coach acknowledgement seam

```javascript
    } finally {
      clearTimeout(timeoutId);
      isSubmittingRef.current = false;
      setIsSubmitting(false);
    }

    return outcome;
  }, [
    client,
    effectiveClientId,
    equipmentProfileId,
    exercises,
    isSubmittingRef,
    offlineQueue,
    overallIntensity,
    plannedAssignment,
    scheduledSessionId,
    sessionNotes,
    setIsSubmitting,
    setLastChallengeProgress,
    setLastSaveResponse,
    setSubmittedFormId,
    userRole,
    workoutDateValue,
    workoutDraft,
  ]);

  useEffect(() => {
    const onSubmitWorkout = (event: Event) => {
      const detail = (event as CustomEvent<AISubmitWorkoutEventDetail>).detail || {};
      const nextIntensity = typeof detail.intensity === 'number' ? detail.intensity : overallIntensity;
      const nextNotes = typeof detail.notes === 'string' ? detail.notes : sessionNotes;

      if (typeof detail.intensity === 'number') setOverallIntensity(detail.intensity);
      if (typeof detail.notes === 'string') setSessionNotes(detail.notes);

      // The acknowledge seam is SYNCHRONOUS: dispatchWithAcknowledgement reads
      // `handled` on the line after window.dispatchEvent and returns it, so an
      // ack that arrives after an awaited save is never seen. Probe:
      //   ack-then-save  -> {acknowledged: true,  handled: true}
      //   save-then-ack  -> {acknowledged: false, handled: false}
      // The first is what shipped: an unconditional no-argument ack defaults
      // `didHandle` to true, so resolveOutcome(true, true) logged EVERY submit as
      // `applied` — including ones refused by validation that never left the
      // browser. The second is a different lie ("nobody was listening").
      //
      // So this acks only what is knowable synchronously. A settled refusal is a
      // truthful `noop`. Whether an ATTEMPTED save succeeded is not knowable here
      // and the boolean seam cannot express "accepted, outcome pending" — that
      // gap is real and belongs to the coach-seam decision, not to this hook.
      // The ack is handed INTO handleSubmit rather than re-deciding out here. A
      // second copy of the refusal rules beside the real ones is precisely how
      // the trainer-calendar defect (F7) was born. Every refusal path runs
      // before the first `await`, so handleSubmit can still answer the seam
      // synchronously from the one place that actually knows.
      void handleSubmit({
        overallIntensity: nextIntensity,
        sessionNotes: nextNotes,
        acknowledge: detail.acknowledgeAIWorkoutEvent,
      });
    };

    window.addEventListener(AI_SUBMIT_WORKOUT, onSubmitWorkout);
    return () => window.removeEventListener(AI_SUBMIT_WORKOUT, onSubmitWorkout);
  }, [handleSubmit, overallIntensity, sessionNotes, setOverallIntensity, setSessionNotes]);

  const handleGenerateSummary = useCallback(async () => {
    if (!submittedFormId) {
      toast.error('Complete and save the workout before sending a summary');
      return;
    }

    setIsGeneratingSummary(true);
    try {
      const api = new ApiService();
      const payload = {
        clientId: effectiveClientId,
        formId: submittedFormId,
        exercises: exercises.map(ex => ({
          exerciseName: ex.exerciseName,
          sets: ex.sets.map(s => ({ weight: s.weight, reps: s.reps, rpe: s.rpe, tempo: s.tempo })),
          formRating: ex.formRating,
```

## What I want

Per finding: what breaks, the exact input, how cheaply an ordinary user hits it, smallest
fix. Then one verdict on push-safety today.

Pay particular attention to: the `||` and `??` boundaries in the authorization policy;
whether `applyOnboardingFieldDictionary`'s "already set wins" rule can be abused by a
caller who supplies both shapes; whether the ack can fire zero times or twice on any path
through `handleSubmit`; and anything in the sanitizer that mangles clinical meaning.
