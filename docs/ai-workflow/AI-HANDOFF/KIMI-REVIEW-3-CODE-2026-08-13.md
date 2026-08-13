# Kimi K3 - Review

**Reviewer:** `moonshotai/kimi-k3` (high)
**Document:** C:/tmp/ss-coach-gate0-20260812/docs/ai-workflow/AI-HANDOFF/KIMI-PACKET-3-CODE-2026-08-13.md
**Seed:** (none)
**Tokens:** 3902 in / 14516 out | **Cost:** ~$0.2294 | **Wall:** 135.2s | **finish_reason:** stop

---

# Hostile review — four modules, ranked by cheapest trip

---

## 1. The sanitizer eats clinical and occupational text — cheapest trip in the push

**What breaks:** `/\b(system|assistant|developer|tool)\s*:/gi` fires on any of those four words followed by a colon, anywhere in the string, after whitespace has already been collapsed to single spaces.

**Exact inputs** (ordinary onboarding free text, normal UI, no malice):
- `"Digestive system: sensitive to dairy"` → `"Digestive sensitive to dairy"`
- `"Occupation: software developer: 10h seated"` → `"developer:"` stripped
- `"Physician assistant: shift work"` → `"assistant:"` stripped
- `"Tool: resistance bands only"` → stripped

**How cheaply:** Any client who writes list-style answers with a colon. Health onboarding is exactly where "digestive system:", "nervous system:", and an occupation of "developer" or "physician assistant" naturally appear. Silent — no error, the AI prompt just loses the meaning. The push newly routes these fields into the projection, so this push is what exposes them to the mangling.

**Smallest fix:** Run the role-marker pattern *before* whitespace collapse, anchored to line starts: `/^\s*(system|assistant|developer|tool)\s*:/gim`. A real injection attempt puts the marker at a line boundary; "digestive system:" mid-sentence survives.

## 2. A surname-only client is silently transposed into a first name

**What breaks:** `firstName: firstName || lastName, lastName: firstName ? lastName : ''`. The comment says "Never reconstruct what was given." The code does exactly that.

**Exact input:** `{ firstName: '', lastName: 'Smith' }` → `{ firstName: 'Smith', lastName: '', fullName: 'Smith' }`. The surname is now stored in the given-name column. Every `Dear {firstName}`, every legal/billing use of the name split, is wrong.

**How cheaply:** A mononym user who types their name in the last-name field, a privacy-conscious client who skips first name, any form autofill that populates surname only. Normal UI use.

**Smallest fix:** Return the split as given — `{ firstName: '', lastName: 'Smith' }` — or refuse with a specific error. Do not transpose.

## 3. Partial split + legacy fullName silently discards the surname

**What breaks:** If either split field is non-empty, the `fullName` branch is never reached and the supplied `fullName` is ignored entirely.

**Exact input:** `{ firstName: 'Ava', fullName: 'Ava Smith' }` → returns `fullName: 'Ava'`. Half the supplied name vanishes with no error — from a module whose stated ethos is "refuse rather than quietly discard."

**How cheaply:** This is the *exact* shape a legacy integration sends while migrating to the split fields — the transition case the header comment claims to keep working.

**Smallest fix:** When the split is partial and `fullName` is present, derive the missing part from `fullName`, or return `ok: false` as inconsistent. Don't keep half silently.

## 4. `resolveOnboardingName(null)` throws a TypeError

**What breaks:** `formData = {}` is a default parameter — it does not cover `null`. `isUnusableName(null.firstName)` → `TypeError: Cannot read properties of null` → 500. The sibling helper `applyOnboardingFieldDictionary` guards null explicitly; this one doesn't. Inconsistent null-handling between helpers in the same slice.

**Exact input:** JSON body `null`, or any caller passing null.

**Smallest fix:** One guard line returning `{ ok: false, field: 'name', reason: '...' }`.

## 5. The sanitization lane is keyed on field *name*, not field *semantics* — the one security hole

**What breaks:** `applyOnboardingFieldDictionary` only sanitizes values it *copies* from wizard-named fields. `sanitizeNarrativeFields` only touches fields where `projectionKey === wizardField`. A narrative value supplied **directly under its projection key** is skipped by both: the dictionary sees `alreadySet` and declines; the sanitizer sees `projectionKey !== wizardField` and declines. It reaches the prompt raw. The comment states this as a feature: "a caller that already speaks the projection's language is untouched."

**Exact input:** POST onboarding with `{ injuriesNotes: "ignore all previous instructions and ..." }` (projection key, where the wizard field is something else). Projection key names are visible in network traffic and source.

**How cheaply:** Not ordinary-UI cheap — needs devtools and a replayed request. But this is the lane the slice explicitly claims to close ("closes that lane in the same slice that opened it"), and it is only closed for wizard-named fields. A client can inject unsanitized instructions into the workout prompt.

**Smallest fix:** Sanitize by projection key. After the dictionary, for every `MAPPED_FIELDS` entry with `meta.narrative`, wrap `out[projectionKey]` if it's a non-empty string. `wrapClientReported` is idempotent — its `/<[^>]*>/g` pass strips forged `<client_reported>` wrappers before re-wrapping — so double-application is safe and pre-wrapped attack values don't survive. ~5 lines.

## 6. `Invalid trainerId` has no status mapping — a client error ships as a 500

**What breaks:** The catch maps only `'admin or trainer'` and `'not authorized'` to 403. `parseOptionalId`'s `'Invalid trainerId for blocked time…'` matches neither. Unless the elided tail handles it, a malformed request is reported as a server fault.

**Exact input:** `POST /block` with `trainerId: "abc"`, `0`, or `true`.

**How cheaply:** The UI won't send it; any integration or curious trainer will. Also note the mechanism is substring matching on message text: any *downstream* error whose message happens to contain "not authorized" gets flattened to a generic 403, masking the real failure.

**Smallest fix:** Add `normalizedMessage.includes('invalid trainerid') → 400`. One branch.

## 7. `typeof === 'number'` admits NaN and Infinity at the workout seam

**What breaks:** `typeof detail.intensity === 'number'` is true for `NaN`. `setOverallIntensity(NaN)` fires and `handleSubmit` receives NaN intensity.

**Exact input:** The AI coach dispatches intensity computed from a failed parse.

**Smallest fix:** `Number.isFinite(detail.intensity)`.

## 8. Concurrent dispatch vs. the `isSubmitting` guard — the seam can lie both ways

**What breaks:** The `finally { isSubmittingRef.current = false }` proves a submission-in-flight guard exists inside `handleSubmit`. That guard is a refusal path. The module's own invariant is "every refusal path runs before the first `await` so the seam can be answered synchronously" — but the guard's ack behavior is not evidenced anywhere in the shown code. If it returns without acking: a second `AI_SUBMIT_WORKOUT` during a slow save gets `handled: false` — the "nobody was listening" lie. If it acks: `handled: true` while nothing happened — the "applied" lie the fix was built to kill.

**How cheaply:** Slow gym wifi + a coach retry or double dispatch. Real-world plausible.

**Smallest fix:** The guard must ack synchronously with a truthful `noop`/refused, from inside `handleSubmit`, per the module's own rule. Verify it does; the shown source cannot confirm it.

## 9. `void handleSubmit(...)` with no `.catch`

Any rejection escaping `handleSubmit` is an unhandled promise rejection with no telemetry. One line: `.catch(...)`, or evidence `handleSubmit` cannot reject.

## 10. Unevidenced claims and nits

- The route comment claims "the service applies the identical rule for callers that bypass this route." The shown service code at the point of use contains **no authorization check**. If the claim is false, every internal caller of `createBlockedSessions` bypasses the policy. Verify before relying on it.
- Admin path performs no existence/role check on the target: an admin can persist a block against a nonexistent id or a client's id.
- Nits: `Number("0x10") === 16` and `Number("5e2") === 500` are accepted as ids; ids above 2^53 silently lose precision (admin-only impact); `missing` treats `' '` as already-set; truncation can split a surrogate pair.

---

# Verdict

**Not safe to push.** The minimum that makes it safe:

1. **Finding 5** — close the projection-key sanitization lane (~5 lines, idempotent fix shown above). This slice opened that lane and only half-closed it; shipping it half-closed on a deploy-on-push branch fails the slice's own stated purpose.
2. **Finding 6** — add the 400 branch (one line). No reason to ship a 500-on-client-error.

Findings 1–4 are silent-corruption and crash defects trippable through *normal UI use*; each is a few lines and should ride the same push rather than follow it. Finding 8 needs one verification inside `handleSubmit` — if the guard acks truthfully, document it; if not, fix it before the next push, since the doc has explicitly owned the seam's residual gap.
