# GLM Consult

**Model:** glm-5.3
**Document:** docs/ai-workflow/AI-HANDOFF/GLM-S4-CONSOLIDATION-DESIGN-PACKET.md
**Tokens:** 1289 in / 42345 out (reasoning: 28482) | total 43634
**Wall:** 660.3s

---

# GLM-5.3 — DESIGN S4: Freestyle Consolidation Engine

Six decisions shape everything below; every section inherits them.

1. **Exactly one model call per consolidation window, plus at most one repair round-trip.** Everything else — dedupe, ordering, merging, dates, numbers, contradiction detection, client resolution, routing guards, confidence — is deterministic code. Justification in §A.3.
2. **Tokens are `CLIENT_[0-9A-F]{4}`** — minted client-side, salted by `sessionId`, referentially stable within a session, uncorrelated across sessions.
3. **The model never contributes prose.** Every string the user sees (headlines, bodies, traces, questions) is assembled deterministically from *pre-tokenised input text* by index slicing. Model output is ids, enum values, and character offsets only. This kills exfiltration-through-output by construction.
4. **The consolidation route is stateless and write-free.** Nothing touches the database except the per-item apply receipt, after explicit per-item confirmation.
5. **The server re-runs the same deterministic tokeniser in verify mode** over inbound text before the model call. A client-side tokeniser miss caused by a stale bundle or a bug is rejected with HTTP 422 *before* any PII reaches the model.
6. **A fully deterministic degraded mode exists**, so the model is never a hard dependency — and an account can be pinned to it for a 100% no-model guarantee.

**New file map** (everything else referenced already exists):

```
shared/freestyle/normalize.mjs            shared/freestyle/metricGrammar.mjs
shared/freestyle/resolveDates.mjs         shared/freestyle/tokeniserCore.mjs
shared/freestyle/typeLexicon.mjs          shared/freestyle/confidence.mjs
frontend/src/features/freestyle/types.ts
frontend/src/features/freestyle/pipeline/preConsolidate.ts
frontend/src/features/freestyle/pii/useTokenMap.ts
frontend/src/features/freestyle/pii/ClientTokenText.tsx
frontend/src/features/freestyle/api/freestyleClient.ts
backend/routes/freestyleConsolidationRoutes.mjs
backend/services/ai/freestyleConsolidationService.mjs
backend/services/ai/freestyleModelClient.mjs
backend/services/ai/freestyleValidator.mjs
backend/models/freestyleApplyReceipt.mjs
backend/migrations/20260818-create-freestyle-apply-receipts.mjs
```

---

## A. Algorithm

### A.1 Stage map

| # | Stage | Runs where | Deterministic? | Why |
|---|-------|-----------|----------------|-----|
| 0 | Normalise | client | yes | string ops |
| 1 | Dedupe fragments | client | yes | recognizer echoes are near-identical strings within a time window; Levenshtein solves it |
| 2 | Reorder | client | yes | `atMs` exists; sort |
| 3 | Merge into utterances | client | yes | gap + punctuation heuristic |
| 4 | Anchor extraction (dates, quantities) | client + re-run server | yes | `chrono-node` + regex grammar; dates/numbers are not PII and must survive tokenisation untouched |
| 5 | PII tokenisation | client | yes | §C — four regex/roster tiers, no model |
| 6 | Contradiction pre-scan | client | yes | numeric timelines keyed by (token, date, field); latest-wins |
| 7 | Window split (if oversized) | server | yes | boundary rules below |
| 8 | Segmentation + span citation | server | **MODEL — the one call** | §A.3 |
| 9 | Validation + deterministic override | server | yes | enum/whitelist/bounds checks, lexicon cross-check, future-date guard, duplicate marking |
| 10 | Client resolution | server | yes | bindings supplied by client; ambiguity ⇒ clarification. Identity is never inferred by a model |
| 11 | Date resolution | server | yes | `chrono-node` anchored at session start in session timezone; ambiguity ⇒ clarification |
| 12 | Confidence scoring | server | yes | fixed-weight formula over signals |
| 13 | Grouping + completeness backfill | server | yes | ordering rules; every unaccounted fragment becomes a clarification |

### A.2 Stage detail

**0 — Normalise** (`shared/freestyle/normalize.mjs`). Produce a matching copy: lowercase, NFD diacritic strip, collapse whitespace. Display copy untouched.

**1 — Dedupe.** Two fragments are recognizer echoes if: same session, `|atMs_A − atMs_B| ≤ 30000`, normalised Levenshtein similarity ≥ 0.92. Keep the longer text (tie: later `atMs`); the loser is recorded in `duplicates: { fragmentId, ofFragmentId }[]`, excluded from model input, but **counted in completeness** and attached to the absorbing item's `duplicateFragmentIds`. Duplicates are never deleted (ratified rule 4 applies to them too).

**2 — Reorder.** `sort((a,b) => a.atMs - b.atMs || a.id - b.id)`.

**3 — Merge.** Walk ordered fragments; start a new `Utterance` when the gap to the previous fragment > 2500 ms **or** the accumulated text already ends in `. ? !` or a trailing-off marker (`...`, `and then`, `so anyway`). Otherwise append with a space. Utterance ids are `u1, u2, …`; each carries `fragmentIds`. **Tokenisation runs after merge** so a name split across fragments ("Sarah" / "K's session") is caught whole.

**4 — Anchor extraction.** Dates via `chrono-node` (§A.2 date rules under stage 11). Quantities via `metricGrammar.mjs` (word-numbers mapped first: `three → 3` on the anchor copy only, never on display text). Anchors are `{ kind, value, span }` per utterance.

**5 — Tokenisation.** §C. Output: tokenised utterances, the token map (device-only), and `tokenBindings` (token → `clientId | null`).

**6 — Contradiction pre-scan.** Walk utterances in order maintaining a context `{ clientToken, dateIso }` that updates whenever a new token or date anchor appears. For each parsed metric, key = `(clientToken, dateIso ?? null, metricKind)`; append to a timeline. If a key's timeline holds ≥ 2 distinct values, emit a `ContradictionTrace` with `kept: 'later'` (highest `atMs`), and `humanTrace: "heard 3, then 4 — kept 4"` built exactly as `heard ${earlier}, then ${later} — kept ${kept}`. Earlier values are retained on the item with `superseded: true`. This catches the dominant self-correction form ("did 3 sets… actually 4") with zero model involvement.

**7 — Window split.** Trigger: > 25 utterances **or** > 1200 words per session. Split at the strongest available boundary, in priority order: pause gap > 4000 ms → client-token change → date-anchor change → utterance 25/word 1200. 10 minutes of speech ≈ 1500 words ≈ one window; windowing exists so overflow degrades gracefully, never drops.

**8 — Model call.** Input: tokenised utterances (ids + text only), timezone, session start. Output: strict JSON — segments citing utterance ids, `clientToken` (exact string or `null`), `recordType` from a closed enum, date-mention spans, `boundaryConfidence`, contradiction *hints* (non-numeric corrections only). Full prompt in §D.

**9 — Validation + deterministic override** (`freestyleValidator.mjs`, then guards in the service). In order:
- Schema parse; JSON only; no prose fields accepted.
- `recordType ∈ {workout_log, nutrition_log, plan_edit, client_data_update, split_plan, out_of_scope}`; anything else ⇒ segment invalid.
- Every `clientToken` must exist in `tokenBindings`; unknown token ⇒ segment invalid.
- A segment citing two different bound tokens ⇒ invalid (fragments fall through to clarification — never merged across clients).
- Every input utterance id appears in exactly one segment; strays are auto-appended as `out_of_scope` segments (completeness restored deterministically).
- Span offsets clamped to utterance length; out-of-range by > 5 chars ⇒ span dropped, agreement signal penalised.
- **Lexicon cross-check** (`typeLexicon.mjs`): keyword scores per type; if lexicon top-type ≠ model type and lexicon score ≥ 2 hits → lexicon wins, signal `type_agreement = 0.6`; agreement → `1.0`; lexicon silent → model kept at `0.7`.
- **Future-date guard (deterministic, post-model, pre-response):** if resolved date > today in session timezone and record type is a happened-record (`workout_log`, `nutrition_log`), target is forced to `plan_edit`, copy reads "added to plan". No flag, no exception — this runs again at apply time.
- **Duplicate-date marking:** if the trainer already has a `workout_log` for (clientId, date) — one indexed lookup — `applyKind = 'merge'`, `target` stays `workout_log`. This is a proposal to merge/append (ratified rule 3), explicitly *not* the upload contract's `duplicate_date` failure (§A.5).
- `out_of_scope` segments ⇒ clarification `out_of_scope`, visible, dismissable, never dropped.

**10 — Client resolution.** `clientId` comes only from `tokenBindings` (validated against the account's roster via Sequelize). Unbound token ⇒ clarification `unknown_client` with the full roster as pick options. Ambiguous token (two candidates) ⇒ clarification `ambiguous_client` with `candidateClientIds`. **A segment with no token at all ⇒ clarification `missing_client` — always.** No pronoun-adjacency guessing, by the model or by us; that is how "she" gets attached to the wrong client silently.

**11 — Date resolution** (`shared/freestyle/resolveDates.mjs`). `chrono.parse` per segment utterance, reference = session start, timezone = session IANA zone; date rendered via `Intl.DateTimeFormat('en-CA', …)` → `yyyy-MM-dd`.
- Explicit calendar date → `explicit`, value 1.0.
- `today`/`yesterday` → `relative`, 0.95.
- Bare weekday ("Tuesday") → most recent *past* occurrence (backfill bias): if chrono's parse is future and the phrase lacks `next`/`this coming`/`on the`, subtract 7 days; `relative`, 0.9.
- `next X` → future date → the stage-9 guard reroutes to `plan_edit`.
- Two distinct parses from one span ⇒ `ambiguous_date` clarification listing both ISO candidates.
- **No date in segment ⇒ `missing_date` clarification** carrying a *suggestion* (the stage-6 walking context's current date for that token), applied only by explicit tap. Inheritance never happens silently.
- Date > 370 days in the future ⇒ presumed misparse ⇒ clarification.

**12 — Confidence** (`shared/freestyle/confidence.mjs`). Deterministic:

```
score = clamp01(
    0.30·client_binding      // exact 1.0 | initials 0.9 | fuzzy 0.85  (ambiguous never reaches here)
  + 0.25·date_resolution     // per §A.2 stage 11 values
  + 0.20·type_agreement      // 1.0 | 0.7 | 0.6 per lexicon cross-check
  + 0.15·numeric_parse       // fraction of quantity anchors parsed with a unit (1.0 for non-numeric types)
  + 0.10·segment_agreement   // model boundaryConfidence, clamped to [0.5, 1.0]
  − 0.05·min(contradictions, 3)   // a kept contradiction caps the band at medium
  − (degraded ? 0.25 : 0)
)
band: ≥ 0.80 high · ≥ 0.55 medium · else low
```

An item scoring low is converted into a clarification of kind `low_confidence` that carries the draft item — visible and recoverable, never silently dropped.

**13 — Grouping + completeness.** Groups ordered by first appearance of the client token in the utterance stream; dates ascending within group; record type in fixed enum order. Completeness invariant asserted server-side: `fragmentsIn == fragmentsAccountedFor` across items + clarifications + duplicates; any shortfall is backfilled with `unassignable` clarifications before the response is built. **A fragment cannot be dropped by construction** — the response builder throws if the books don't balance.

### A.3 The one model call, and why it survives

Segmentation of schemaless, self-correcting, trailing-off speech is the single stage where deterministic heuristics fail in both directions with asymmetric costs. Under-splitting merges two clients' data into one record — **silent corruption**. Over-splitting with cue-phrase rules produces clarification spam. Regexes can find dates and numbers reliably; they cannot reliably find *boundaries of intent* in "also I didn't note Jon's food from the weekend oh and back to Sarah her knee…".

So the model is kept for exactly this, under five containment conditions:
1. Input is tokenised text only (§C); the payload builder whitelists fields.
2. Output is a closed JSON envelope: ids, one enum, offsets, a 0–1 float. No free text is ever rendered.
3. Temperature 0, JSON mode, 20 s timeout, ≤ 1 deterministic repair round-trip.
4. Every model assertion is cross-checked or overridden deterministically (stage 9–11); the model never decides identity, dates, numbers, or routing.
5. Degraded mode replaces it entirely on failure (§A.4).

Everything else is deterministic because it *can* be: dates and quantities are grammar problems, identity is a roster-lookup problem, contradictions are timeline problems, and routing is policy, not language.

### A.4 Degraded deterministic mode

Triggered on model timeout, malformed output, repair failure, `CASING_SIGNAL_ABSENT` (§C.6), or account policy. Segmentation by deterministic cues, in priority order: client-token change → date anchor → cue phrases (`also`, `right`, `next`, `now then`, `back to`, `oh and`, `and then`, day names) → utterance boundary. All stage 9–13 machinery runs unchanged. Result: `degraded: true`, −0.25 confidence, more clarifications, zero PII risk delta (identical tokenisation), zero silent drops.

### A.5 A9 boundary (binding, restated as algorithm)

`uploadTranscript(file, clientId)` is not imported by any new module, not extended, and its `duplicate_date` / `future_date` **failure** semantics are untouched. Freestyle never routes through it: duplicate dates become merge/append proposals and future dates become `plan_edit` *inside the freestyle path only*. The PLAUD contract tests run unchanged in CI (§F.8). Additionally, `freestyleConsolidationRoutes.mjs` is rejected by a source-scan test if it ever references `uploadTranscript`.

---

## B. Data contract

```ts
// frontend/src/features/freestyle/types.ts
// Mirrored for the backend as JSDoc typedefs consumed from the same
// fixture files by backend/__tests__/services/freestyleContract.test.mjs,
// which asserts field-for-field parity (see F.7).

export type FreestyleTarget =
  | 'workout_log'
  | 'plan_edit'
  | 'nutrition_log'
  | 'client_data_update'
  | 'client_profile_coverage_update'
  | 'frontend_dispatch'
  | 'clarification'
  | 'split_plan';

/** Closed enum the MODEL may suggest. frontend_dispatch and
 *  client_profile_coverage_update are deliberately absent: the model
 *  never proposes them; deterministic code owns that surface. */
export type ModelRecordType =
  | 'workout_log'
  | 'nutrition_log'
  | 'plan_edit'
  | 'client_data_update'
  | 'split_plan'
  | 'out_of_scope';

export type ConfidenceBand = 'high' | 'medium' | 'low';

export type ConfidenceSignalKind =
  | 'client_binding'
  | 'date_resolution'
  | 'type_agreement'
  | 'numeric_parse'
  | 'segment_agreement'
  | 'contradiction_penalty'
  | 'degraded_mode';

export interface ConfidenceSignal {
  kind: ConfidenceSignalKind;
  weight: number;   // the fixed stage-12 weight
  value: number;    // the signal's value in [0,1]
  detail: string;   // token-safe, e.g. "bound exact via roster alias"
}

export interface Confidence {
  score: number;            // [0,1], 3 decimal places
  band: ConfidenceBand;
  signals: ConfidenceSignal[];
}

export interface ContradictionValue {
  raw: string;              // as heard, e.g. "3"
  parsed: number | string;  // number, or ISO date when field === 'date'
  fragmentIds: number[];
  atMs: number;
}

export interface ContradictionTrace {
  field: 'sets' | 'reps' | 'weight_kg' | 'duration_min' | 'distance_km'
       | 'rpe' | 'calories' | 'hr_max' | 'date';
  earlier: ContradictionValue;
  later: ContradictionValue;
  kept: 'earlier' | 'later';        // 'later' on creation; 'earlier' after user revert
  humanTrace: string;               // "heard 3, then 4 — kept 4"
}

export type MetricKind =
  | 'sets' | 'reps' | 'weight_kg' | 'duration_min'
  | 'distance_km' | 'rpe' | 'calories' | 'hr_max';

export interface FreestyleMetric {
  kind: MetricKind;
  value: number;
  unit: string;                 // 'sets' | 'reps' | 'kg' | 'min' | 'km' | 'rpe' | 'kcal' | 'bpm'
  sourceFragmentIds: number[];
  superseded: boolean;          // true when a later value won; retained for audit + one-tap revert
}

export type DateResolutionKind = 'explicit' | 'relative' | 'session_day' | 'unresolved';

export interface DateResolution {
  kind: DateResolutionKind;
  dateIso: string | null;       // yyyy-MM-dd in session timezone; null ⇒ clarification
  rawText: string | null;       // the spoken phrase, e.g. "last Tuesday" (dates are not PII)
}

export type ItemStatus = 'pending' | 'confirmed' | 'applied' | 'failed' | 'dismissed';

export interface FreestyleItem {
  id: string;                   // 'itm_' + 10 base36 chars, client-minted, stable across revert
  clientToken: string;          // CLIENT_[0-9A-F]{4}
  clientId: number | null;      // resolved from tokenBindings server-side; null ⇒ its clarification owns this
  date: DateResolution;
  recordType: ModelRecordType;
  target: FreestyleTarget;      // post-guard routing; may differ from recordType (future date ⇒ plan_edit; low confidence ⇒ clarification)
  headline: string;             // server-assembled from tokenised input only — never model prose
  bodyText: string;             // server-assembled tokenised utterances, in atMs order
  metrics: FreestyleMetric[];
  contradictions: ContradictionTrace[];
  confidence: Confidence;
  applyKind: 'create' | 'merge';// merge when a same (clientId, date) record already exists
  fragmentIds: number[];
  duplicateFragmentIds: number[];
  status: ItemStatus;
  appliedAtIso?: string;
  applyError?: string;          // machine code, e.g. 'WORKOUT_SERVICE_REJECTED'
}

export type ClarificationKind =
  | 'unknown_client'      // descriptive/relative reference, nobody bound
  | 'ambiguous_client'    // two roster candidates
  | 'missing_client'      // segment had no token at all
  | 'ambiguous_date'      // two parses of one span
  | 'missing_date'        // no date phrase; suggestion attached, tap to accept
  | 'out_of_scope'        // not training-related; shown, dismissable, never dropped
  | 'low_confidence'      // draft item attached as suggestion
  | 'unassignable';       // failed validation (rogue token, multi-token segment, window strays)

export interface ClarificationItem {
  id: string;                   // 'clr_' + 10 base36 chars
  kind: ClarificationKind;
  question: string;             // template-rendered, token-safe; may embed CLIENT_XXXX or date ISOs
  clientToken?: string;
  candidateClientIds?: number[];// roster rendering happens client-side; names never travel
  suggestedDateIso?: string;
  suggestedDatesIso?: string[]; // for ambiguous_date
  suggestedRecordType?: ModelRecordType;
  draftItem?: FreestyleItem;    // present for unknown/missing client|date and low_confidence
  multiSelect?: boolean;        // true for group references ("the Tuesday crew") → fan-out items
  fragmentIds: number[];
  status: 'pending' | 'resolved' | 'dismissed';
}

export interface FreestyleDateGroup {
  dateIso: string | null;
  itemIds: string[];
}

export interface FreestyleClientGroup {
  clientToken: string;
  clientId: number | null;
  dateGroups: FreestyleDateGroup[];
}

export interface FreestyleSummary {
  sessionId: string;            // uuid v4, client-minted, matches request
  createdAtIso: string;
  modelUsed: boolean;
  degraded: boolean;
  warnings: string[];           // machine codes only, e.g. 'MODEL_TIMEOUT_DEGRADED', 'WINDOWED:3'
  items: FreestyleItem[];
  clarifications: ClarificationItem[];
  clientGroups: FreestyleClientGroup[];
  completeness: {
    fragmentsIn: number;
    fragmentsAccountedFor: number;   // always == fragmentsIn; server throws otherwise
    unaccountedFragmentIds: number[];// always []
  };
}
```

### B.1 Backend route shapes

```ts
// POST /api/ai/freestyle/consolidate  (stateless, write-free, auth: trainer session)
export interface ConsolidateRequestFragment {
  id: number;
  atMs: number;
  text: string;                 // TOKENISED utterance/fragment text
}

export type BindingStrength = 'exact' | 'fuzzy' | 'initials' | 'unbound';

export interface TokenBinding {
  token: string;                // CLIENT_[0-9A-F]{4}
  clientId: number | null;      // null ⇒ unbound/unknown
  candidateClientIds?: number[];// present when ambiguous
  bindingStrength: BindingStrength;
}

export interface ConsolidateRequest {
  sessionId: string;
  startedAtIso: string;
  timezone: string;             // IANA, e.g. "Europe/London"
  locale: string;               // e.g. "en-GB"
  fragments: ConsolidateRequestFragment[];   // ≤ 2000, else 413
  duplicates: { fragmentId: number; ofFragmentId: number }[];
  tokenBindings: TokenBinding[];
}

export type ConsolidateResponse =
  | { ok: true; summary: FreestyleSummary }
  | { ok: false; error: { code: FreestyleErrorCode; message: string } };

// POST /api/ai/freestyle/apply  (per-item; explicit user confirmation is the UI tap that precedes it)
export interface FreestyleApplyRequest {
  sessionId: string;
  itemId: string;
  target: FreestyleTarget;      // re-validated against ACTION_TYPES minus frontend_dispatch
  applyKind: 'create' | 'merge';
  item: FreestyleItem;          // post-user-edit (revert / resolved clarification); re-validated wholesale
}

export type FreestyleApplyResponse =
  | { ok: true; receiptId: string; resultRef: { kind: string; id: number } }
  | { ok: false; error: { code: FreestyleErrorCode; message: string } };

export type FreestyleErrorCode =
  | 'FREESTYLE_EMPTY'
  | 'FREESTYLE_FRAGMENT_LIMIT'
  | 'FREESTYLE_TOKENISATION_MISS'   // server verify-mode re-run found an unmasked reference; fragment id returned, never the name
  | 'FREESTYLE_TOKEN_MISMATCH'      // CLIENT_ token in text absent from bindings, or vice versa
  | 'FREESTYLE_BINDING_NOT_OWNED'   // clientId not on this account
  | 'FREESTYLE_ITEM_INVALID'
  | 'FREESTYLE_TARGET_FORBIDDEN'    // frontend_dispatch attempted
  | 'FREESTYLE_FUTURE_DATE_FORCED'  // apply-time guard breach (422)
  | 'FREESTYLE_ALREADY_APPLIED'     // idempotent replay of a confirmed item
  | 'FREESTYLE_SERVICE_REJECTED';   // downstream write service failed; per-item retry allowed
```

The apply receipt table (`freestyle_apply_receipts`: unique on `accountId, sessionId, itemId`) provides idempotency and satisfies the retention contract's purge-on-receipt clause; the receipt row stores the item's contradiction traces so the superseded value is **never silently discarded** (ratified rule 1: retained until the session resolves — and beyond, in the receipt).

---

## C. The PII tokenisation boundary

This is the load-bearing wall. Design stance: **fail closed**. A miss that over-masks costs a clarification; a miss that under-masks leaks a client name to a third-party model. Every tie breaks toward masking.

### C.1 Invariants

1. **Client-side only.** Raw text never leaves the device. The tokeniser runs in the browser/app before the fetch; the device holds the only name↔token map.
2. **Referential opacity with referential stability.** The model learns nothing about *who* a token is, but the same referent always gets the same token within a session, which is all segmentation needs. Tokens are salted with `sessionId`, so tokens are uncorrelated across sessions — no cross-session frequency analysis corpus exists (one call per session, windowed at most).
3. **Non-PII data is never tokenised.** Numbers, dates, exercise names, equipment survive untouched — consolidation quality depends on them, and they are not client identifiers.
4. **Position-independent matching.** Matchers scan anywhere in text (vocatives, possessives, mid-clause), case-insensitively for roster-derived forms. Tier 1 must not depend on ASR capitalisation.
5. **The tokeniser fails closed.** Roster unavailable (offline)? Consolidation is blocked with `FREESTYLE_ROSTER_UNAVAILABLE` — we never send untokenised text "just this once."

### C.2 The four tiers (`shared/freestyle/tokeniserCore.mjs`)

Applied to each merged utterance, in order; overlaps resolved longest-span-first, then lowest tier number. All matches also capture an optional possessive `'s` suffix.

```js
// shared/freestyle/tokeniserCore.mjs  (pure module; imported by frontend AND backend verify mode)
import { NICKNAMES } from './nicknames.mjs';
import { DOMAIN_ALLOWLIST } from './domainAllowlist.mjs';

export const KIN_TERMS = ['mum','mom','mother','dad','father','brother','sister','son',
  'daughter','husband','wife','partner','nan','nana','grandma','grandad','grandpa',
  'uncle','aunt','aunty','cousin','flatmate','roommate','neighbour','neighbor','boss'];

export const REFERENCE_HEADS = ['guy','lady','woman','man','bloke','fella','girl','one',
  'client','lass','chap','crew','gang','group','pair'];

// --- Tier 0: pan-PII scrub (defense in depth; not client names, but never go to a model)
const TIER0 = [
  { re: /\b[\w.+-]+@[\w-]+\.[\w.]{2,}\b/g,                                  tag: 'REDACTED_EMAIL' },
  { re: /(?:\+?\d{1,3}[\s-]?)?\(?\b0\d{3,4}\)?[\s-]?\d{3}[\s-]?\d{3,4}\b/g, tag: 'REDACTED_PHONE' },
  { re: /\b(?:[A-Za-z]{1,2}\d[A-Za-z\d]?\s*\d[A-Za-z]{2}|GIR\s?0AA)\b/g,    tag: 'REDACTED_POSTCODE' },
];

// --- Tier 1: roster matcher. Alias table per client; case-insensitive; word-boundaried.
// buildAliases(roster) → [{ surface, clientId, strength: 'exact'|'initials', candidates[] }]
//   formal first name; preferredName; "First Last"; "First L";
//   initials "F.T.", "FT", "F T" AND reversed "T.F.", "TF", "T F";
//   NICKNAMES expansion both directions (Elizabeth↔Liz/Beth/Betty, Jonathan↔Jon/Johnny, …).
// Any alias surface claimed by 2+ clients is marked ambiguous → matches yield an
// UNBOUND token with candidateClientIds (never a silent bind).
// Fuzzy pass (separate): word tokens of length ≥ 6 vs alias surfaces of length ≥ 6,
// Levenshtein ≤ 1, accepted ONLY if exactly one candidate qualifies ("Stephanie"→"Stephany"
// binds; nothing under length 6 is fuzzy-matched, so "Jon" never becomes "Jan").

// --- Tier 2: structural client references (the mandated hard cases)
const TIER2 = [
  // possessive relative: "Sarah's mum", "Jon's older brother"
  { name: 'kin_possessive',
    re: new RegExp(`\\b(ALIAS)('s)?\\s+(?:\\w+\\s+){0,1}(${KIN_TERMS.join('|')})\\b`, 'gi') },
  // determiner + up to 3 modifiers + reference head: "the marathon guy", "my Tuesday morning lady"
  { name: 'det_head',
    re: new RegExp(`\\b(?:the|my|that|this|our)\\s+((?:[a-z]+\\s+){0,3}?)(${REFERENCE_HEADS.join('|')})\\b`, 'gi') },
  // "the one who hates burpees", "the one with the knee"
  { name: 'one_who',
    re: /\b(?:the|that)\s+one\s+(?:who|with|that)\s+[a-z][a-z\s'-]{1,40}/gi },
  // bare compound: "knee lady", "marathon man" (min 3-char modifier; over-masks safely)
  { name: 'bare_head',
    re: /\b[a-z][a-z-]{2,}\s+(?:guy|lady|woman|man|bloke|fella|lass|chap)\b/gi },
];

// --- Tier 3: proper-noun sentinel (fail-closed backstop)
const PROPER_RUN = /\b([A-Z][a-z'’-]{1,}(?:\s+[A-Z][a-z'’-]{1,}){0,2})\b/g; // "Priya", "Dave Smith"
const SPELLED_OUT = /\b([A-Z](?:\s*-\s*[A-Z]){1,5})\b/g;                     // "S-A-R-A-H", "J-T"
// A PROPER_RUN match is masked UNLESS: it begins at index 0 of the utterance AND is a single
// word (sentence-initial capitalisation noise), or every token is in DOMAIN_ALLOWLIST
// (days, months, holidays, equipment/app brands: plaud, whoop, strava, myfitnesspal…).
```

`nicknames.mjs` ships ~30 curated families (Elizabeth/Liz/Beth/Betty/Lizzie, Jonathan/Jon/Johnny, William/Will/Bill/Billy, Robert/Rob/Bob/Bobby, James/Jim/Jamie, Katherine/Kate/Kathy/Kat, Jennifer/Jen/Jenny, Michael/Mike/Mick, Richard/Rick/Rich/Ritchie, Patricia/Pat/Trish, Margaret/Meg/Marge/Peggy, Dorothy/Dot, Barbara/Barb, Susan/Sue/Suzy, Joseph/Joe/Joey, Charles/Charlie/Chuck, Thomas/Tom/Tommy, Daniel/Dan/Danny, Matthew/Matt, Andrew/Andy, Benjamin/Ben, Samantha/Sam, Victoria/Vicky, Alexandra/Alex/Sandra/Sandy, Nicholas/Nick, Stephanie/Steph, Frederick/Fred/Freddie, Penelope/Penny, Deirdre/Dede) and is data, extendable without code changes.

**Tier-2 binding rule (the relative trap):** a kin-possessive match ("Sarah's mum") creates its own **unbound** token. The possessor is *not* the referent. We never infer the referent from surname overlap or profile notes — that produces a clarification offering the full roster, which is one tap and correct. Descriptive matches that *contain* a Tier-1 alias ("kettlebell Karen") carry that client in `candidateClientIds` as a suggested pick, still unbound until tapped.

### C.3 Token minting, the map, and its lifecycle

```ts
// frontend/src/features/freestyle/pii/useTokenMap.ts
import { sha256Hex } from './sha256Hex'; // WebCrypto subtle.digest, hex-encoded

export interface TokenMapEntry {
  token: string;                        // CLIENT_9F2A
  kind: 'client_reference' | 'redaction';
  surfaceForms: string[];               // every raw phrase that minted/merged into this token
  clientId: number | null;              // bound referent, or null
  candidateClientIds: number[];         // ambiguous or descriptive suggestions
  bindingStrength: 'exact' | 'fuzzy' | 'initials' | 'unbound';
}

export type TokenMap = Record<string, TokenMapEntry>;

// Deterministic, session-stable, cross-session uncorrelated:
export function mintToken(sessionId: string, referentKey: string, taken: Set<string>): string {
  let nonce = 0;
  for (;;) {
    const token = `CLIENT_${sha256Hex(`${sessionId}:${referentKey}:${nonce}`).slice(0, 4).toUpperCase()}`;
    if (!taken.has(token)) { taken.add(token); return token; }   // 4-hex collision → nonce bump
    nonce += 1;
  }
}
// referentKey: `client:${clientId}` for bound · `surface:${normalised}` for unbound,
// so "the marathon guy" spoken twice yields ONE token, twice-referenced.
```

**Holding the map.** The map never travels. It lives in device memory via `useTokenMap(sessionId)` and is persisted — together with the summary, atomically, as one record — into the S2 encrypted, account-keyed session store at key `freestyle:{sessionId}` (same key hierarchy, same TTL ≤ 24 h). Purge triggers, in order of binding: save-verified (all items terminal), dismissed, logout, account switch, TTL expiry. The map outlives the raw fragment buffer: the buffer may purge once the tokenised request has been sent, but `{ summary, map }` persists until every item and clarification is terminal. There is no state in which the summary exists without its map except process death — and process death destroys both, atomically, because they are one record.

### C.4 Rehydration (render only)

```tsx
// frontend/src/features/freestyle/pii/ClientTokenText.tsx
export function ClientTokenText({ text, map, roster }: {
  text: string;
  map: TokenMap;
  roster: Map<number, RosterClientRef>;
}) {
  const parts = text.split(/(CLIENT_[0-9A-F]{4}|\[REDACTED_[A-Z_]+\])/g);
  return (<>
    {parts.map((p, i) => {
      if (/^CLIENT_[0-9A-F]{4}$/.test(p)) {
        const e = map[p];
        if (!e) return <code key={i} aria-label="unknown token">{p}</code>;
        if (e.clientId != null) {
          const c = roster.get(e.clientId);
          return <strong key={i}>{c?.preferredName ?? c?.firstName ?? p}</strong>;
        }
        return <em key={i} title="unresolved reference">{e.surfaceForms[e.surfaceForms.length - 1]}</em>;
      }
      if (/^\[REDACTED_[A-Z_]+\]$/.test(p)) return <RedactionChip key={i} tag={p} map={map} />;
      return <span key={i}>{p}</span>;
    })}
  </>);
}
```

Note the load-bearing subtlety: **bound items don't need the map at all** — they render from the roster by `clientId`. The map is critical-path only for *unbound* descriptive phrases (shown in clarifications) and redaction chips. That shrinks the blast radius of any map lifecycle bug.

### C.5 What happens on a tokeniser miss — and the second wall

A miss means a client-referencing span reached the wire unmasked. Three layers stand behind the client tokeniser:

1. **Server verify mode.** `freestyleConsolidationService.mjs` imports the *same* `tokeniserCore.mjs` and re-runs Tiers 0–3 over the inbound text in verify mode. If it finds a mask candidate the client didn't mask — stale bundle, client bug, tampering — the request is rejected `422 FREESTYLE_TOKENISATION_MISS` with the **fragment id only** (the name is never echoed in the response or any log). This runs *before* the model call, always. Same algorithm on both sides means the residual miss class is exactly "both runs are blind," not "the client was stale."
2. **No prose passthrough.** Even if a name slips into the model's input, it cannot slip out through the model's output: the model's response contains no free-text fields that reach the user; headlines/bodies are sliced from pre-tokenised input by our code; validator rejects any string field longer than 120 chars or containing lowercase sentence prose. A prompt-injected model that tries to exfiltrate "…Sarah…" in `contradictionHints.note` fails the 80-char, no-quote validator and the whole envelope is discarded (tested in F.6).
3. **Model payload allowlist.** `buildModelPayload()` constructs the provider request from exactly `{ utterances: [{id, text}], timezone, startedAtIso }`. Bindings, roster, account id, duplicates map — structurally absent. A unit test asserts the serialised payload deep-contains nothing else (F.6).

### C.6 Adversarial catalogue — how the boundary fails and what happens

| # | Attack / accident | Behaviour | Why acceptable |
|---|---|---|---|
| 1 | ASR mishears an unrostered name, lowercase, mid-sentence ("and then priya did…") | Tier 3 is casing-dependent → **residual leak class** | The one honest hole. Mitigated by the casing-signal guard (row 3), corpus testing, degraded-mode policy. Documented, not hidden |
| 2 | Rostered name, any casing, possessive, vocative ("SARAH", "sarah's") | Tier 1 is case-insensitive + position-independent + possessive-tolerant → masked, bound |
| 3 | Whole session comes back lowercase (ASR casing failure) | `CASING_SIGNAL_ABSENT` guard: > 8 utterances and zero capitalised tokens ⇒ force degraded mode, no model call | Turns the leak class of row 1 into a determinism downgrade, not a PII event |
| 4 | Nickname not in dictionary ("Sandra" → "Sandy" missing) | Fuzzy ≥ 6 chars catches edit distance ≤ 1; else Tier 3 masks as unbound ⇒ clarification | Fail-closed; cost is one tap |
| 5 | Short-name collision ("Jon" vs "Jan", both clients) | No fuzzy under length 6; exact alias ambiguity ⇒ unbound token + `ambiguous_client` clarification | Never a silent mis-bind |
| 6 | Two clients share first name | Alias marked ambiguous at build time ⇒ both become candidates ⇒ clarification | Correct by construction |
| 7 | Two-letter initials "J.T." | Tier 1 initials forms (both orders); reversed-order collision with another client ⇒ ambiguous ⇒ clarification |
| 8 | "Mark it complete" where Mark is a client | Over-masked as a client reference | Deliberate fail-closed bias; cost is a spurious clarification, never a leak |
| 9 | Client named May/April | Single-token alias match masks it; `DOMAIN_ALLOWLIST` does not rescue it | Same trade as row 8, documented |
| 10 | "Sarah's mum" | Tier 2 kin-possessive ⇒ unbound token, possessor excluded from candidates beyond a suggested pick | The ratified relative case; binding is a human tap |
| 11 | "The marathon guy", "knee lady", "the one who hates burpees", "my Tuesday morning lady" | Tier 2 head/one-who patterns ⇒ unbound tokens, surface retained for display | The mandated descriptive case |
| 12 | "The Tuesday crew smashed it" | Tier 2 head (`crew`) ⇒ unbound token; clarification is multi-select; resolution fans out one item per client | Group references never collapse into one wrong client |
| 13 | Spelled-out "S-A-R-A-H", "J-T" | `SPELLED_OUT` pattern masks ⇒ bound if initials resolve, else unbound |
| 14 | Diacritics "Søren" vs roster "Soren" | NFD + combining-mark strip in the matching copy ⇒ Tier 1 binds |
| 15 | Name split across fragments ("Sarah" / "…K's session") | Tokenisation runs *after* stage-3 merge ⇒ matched whole |
| 16 | Token mint collision | Nonce bump in `mintToken` ⇒ deterministic divergence |
| 17 | Map lost but summary alive | Impossible by atomic single-record persistence; process death destroys both together | Consistency over recoverability (S2 is write-free by construction; re-dictate) |
| 18 | Roster unavailable (offline) | Consolidation blocked, `FREESTYLE_ROSTER_UNAVAILABLE`; raw text never sent | Fail closed at the source |
| 19 | Prompt injection tries to make the model echo input | Model output has no prose channel; validator drops the envelope; degraded mode proceeds | Row 2 of §C.5; tested F.6 |
| 20 | Stale client bundle with bugged tokeniser | Server verify-mode re-run rejects `422` pre-model | Version-skew catcher; tested F.6 |
| 21 | Logs/analytics capture | Route logs machine codes and integer counters only; existing redaction middleware asserted in test; tokens without the map are inert strings |
| 22 | Replay of the consolidate request | Stateless + idempotent; same summary rebuilt; no writes |
| 23 | Cross-session token correlation | `sessionId` salt ⇒ disjoint token spaces; one model call per session ⇒ no aggregate corpus |

### C.7 Residual risk, stated plainly

The only guaranteed-zero-PII configuration is **no model call at all**. Tiers 0–3 plus the server-side re-run plus the no-prose envelope make the leak probability small, bounded, and *testable against a corpus* — but a sufficiently pathological ASR transcript (row 1) can defeat any deterministic masker. Therefore: `FREESTYLE_MODEL_ENABLED` is a per-account flag; flipping it off yields the §A.4 deterministic pipeline with a hard guarantee and more clarifications. The default is on; the escape hatch is contractual, not aspirational.

---

## D. Prompt contract (if a model call is needed)

One call per window. Tokenised input only. The user message is assembled by `buildModelPayload()` from the §C.5 allowlist — nothing else is structurally capable of reaching this code.

**System prompt (verbatim):**

```
You are the segmentation engine inside a personal-training notes product. You receive
speech-recognition utterances from ONE coach's single dictation session about their clients.

EVERY client-identifying reference in the input has already been replaced with an opaque
token matching /CLIENT_[0-9A-F]{4}/. Rules for tokens:
- Tokens are opaque handles. Never guess, expand, decode, or comment on who a token refers to.
- The same token always means the same client. Different tokens may or may not.
- You will never be given a client name. Do not invent, request, or output any person's name,
  email, phone number, or address.

YOUR ONLY JOB: return STRICT JSON matching the schema below. No markdown fences, no prose.

SEGMENTS
- Split the utterance stream into segments. One segment = one note about ONE client (one
  token, or no token), on ONE day, of ONE record type.
- Preserve utterance order. Do not reorder.
- Never merge utterances that cite different tokens into one segment.
- Self-corrections, repeats, and trailing off are normal. Keep corrected material inside the
  same segment; the caller resolves values deterministically. Never drop an utterance.
- Every input utterance id must appear in exactly one segment. If an utterance fits nowhere,
  give it its own segment with recordType "out_of_scope".

recordType — exactly one of:
  workout_log       something that HAPPENED on a past day (training session, sets, runs)
  nutrition_log     food/eating that happened on a past day
  plan_edit         future intent or programme changes ("next week add…")
  split_plan        restructuring a programme into days/blocks ("split it into upper/lower")
  client_data_update  personal data: injuries, physio, sleep, stress, preferences, life notes
  out_of_scope      not about coaching, nutrition, or client admin

clientToken: the exact token string present in this segment's utterances, or null if the
segment contains no token. Never output a token that does not appear verbatim in the input.
The same token may appear in multiple segments.

dateMentions: for every date or time expression in the segment's utterances, cite
{ "utteranceId", "start", "end" } character offsets into THAT utterance's text. Include
relative phrases ("yesterday", "last Tuesday", "next Friday", "this morning"), explicit
dates, and bare weekdays. Do NOT resolve or compute dates; the caller does that
deterministically. Do NOT cite numbers, weights, or durations.

boundaryConfidence: 0.0–1.0 — how sure you are the segment boundaries and recordType are right.

contradictionHints: pairs of utterance ids where the coach corrects themselves in a way that
is NOT a simple number change (number changes are detected deterministically without you).
Each note is max 80 characters, must not quote the utterances, and must not contain any
sequence matching /CLIENT_[0-9A-F]{4}/ other than by explicit pair reference.

OUTPUT SCHEMA
{"segments":[{"utteranceIds":["u1"],"clientToken":"CLIENT_9F2A" | null,
"recordType":"workout_log","dateMentions":[{"utteranceId":"u1","start":14,"end":23}],
"boundaryConfidence":0.9,
"contradictionHints":[{"a":"u2","b":"u5","note":"effort corrected later"}]}]}

If you cannot follow these rules exactly, return {"segments":[]} and nothing else; the
caller has a deterministic fallback.
```

**User message template:**

```
Session start: {startedAtIso} | Timezone: {timezone}
Utterances (id, text):
[{"id":"u1","text":"..."},{"id":"u2","text":"..."}]
```

**Parameters** (`backend/services/ai/freestyleModelClient.mjs`): OpenAI-compatible endpoint from the same env vars the existing classifier uses (`OPENAI_BASE_URL`, `OPENAI_API_KEY`), model `FREESTYLE_MODEL_ID || MODEL_ID`; `temperature: 0`, `top_p: 1`, `response_format: { type: 'json_object' }`, `max_tokens: 3000`, `AbortController` timeout **20 000 ms**. On validator failure: exactly **one** repair attempt — the same messages plus a system note containing the validator's error codes (never model output text) — then degraded mode. Budget: ≤ 2 provider calls per window, ≤ 2×windows per session.

**Validator** (`backend/services/ai/freestyleValidator.mjs`) enforces: top-level key set exactly `{"segments"}`; enum membership; token whitelist against `tokenBindings`; utterance-id coverage exactly-once with deterministic auto-append for strays; span bounds clamped then dropped if off by > 5; `boundaryConfidence` numeric and clamped; hint notes ≤ 80 chars, no quote characters, no unlisted tokens. Any violation ⇒ repair ⇒ degraded. The validator is the only code that reads model output, and it reads it as untrusted data.

---

## E. Failure modes

| Failure | Detection | Behaviour | User sees | Test |
|---|---|---|---|---|
| **Model timeout** | `AbortController` at 20 s | No retry server-side; deterministic degraded consolidation returned immediately | Yellow banner "Sorted without AI assist — please review", lower confidences, more clarifications | F.4 |
| **Malformed model output** | Validator | One repair round-trip; second failure ⇒ degraded mode, warning `MODEL_MALFORMED` | Same banner; nothing raw is ever displayed | F.4 |
| **Unresolvable client** (unbound/ambiguous/no token) | Stage 10 | Clarification (`unknown_client` / `ambiguous_client` / `missing_client`) with roster picker; draft item attached | One-tap resolve → item appears `pending` | F.2 |
| **Ambiguous date** | Two distinct chrono parses of one span | Clarification `ambiguous_date` listing both ISO dates; no default chosen | Tap a date | F.2 |
| **Fragment not about training** | Model `out_of_scope`, or deterministic cue fallback | Clarification `out_of_scope`, shown, dismissable — **never dropped**; completeness counts it | "Not training-related — dismiss?" | F.2 |
| **10-min session exceeds context** (worst case: fast talker, many windows) | Stage 7 word/utterance caps | Deterministic window split at strong boundaries; per-window model calls; deterministic merge; cross-window contradiction keys resolved latest-wins; warning `WINDOWED:n` | Nothing, unless items span windows — then traces cite both windows' fragments | F.5 |
| **Partial apply failure** | Per-item apply route | Items are independent; each apply is one transaction (Sequelize `transaction` per item) + idempotency receipt unique on `(accountId, sessionId, itemId)`; failure marks that item `failed` with `applyError`, others untouched, retry allowed | Red state on the failed item only | F.4 |
| Binding not owned by account | Route validation vs roster | `403 FREESTYLE_BINDING_NOT_OWNED` | Error toast | F.6 |
| Tokeniser miss detected server-side | Verify-mode re-run | `422 FREESTYLE_TOKENISATION_MISS` (fragment id only) | "Couldn't safely anonymise fragment #17 — try again" | F.6 |
| Apply-time future-date breach (summary stale, day rolled over) | Guard re-runs at apply | `422 FREESTYLE_FUTURE_DATE_FORCED`; item returns to `pending` re-routed to `plan_edit` | Item flips to "added to plan" copy | F.3 |
| `frontend_dispatch` attempted via apply | Target validator | `422 FREESTYLE_TARGET_FORBIDDEN` — the draft-only fence is enforced in code | Developer-facing | F.6 |
| Map/summary divergence | Atomic single-record store | Cannot occur; process death removes both | Session lost; re-dictate | F.7 |

---

## F. Test plan

All fixture sessions are 6–10 minutes of realistic Sean speech. Raw fixtures feed tokeniser tests; their tokenised projections feed pipeline tests (model stubbed at the `freestyleModelClient.mjs` boundary).

**F.1 — `frontend/src/features/freestyle/__tests__/fixtures/sessionThreeClientsTwoDates.ts`**
Roster: Sarah K (id 42), Jonathan T (id 7). Raw fragments include: Sarah's yesterday workout ("5 by 5 at 80 kilos… no wait, 85"), Jonathan's last-Tuesday nutrition ("ate about 2100 calories, protein was decent"), Jonathan's client-data update ("his physio cleared the knee"), an unbound descriptive reference ("the marathon guy did his long run Sunday" — 25 km), a future item ("Sarah next Friday we'll add pause squats"), and a non-training fragment ("need to book the car in for its MOT").
**PROVES:** multi-client/multi-date/multi-type segmentation in one session (3 clients ⇒ 2 bound tokens + 1 unbound; 2+ past dates + 1 future; 4 record types), deterministic metric extraction (550 vs 85 kg trace), completeness == 100% with zero silent drops.

**F.2 — contradiction + unplaceable + ambiguous extensions of F.1**
Fragments: "did 3 sets" … "actually it was 4"; "she felt great about the numbers" (no token anywhere near); "Tuesday" resolving to two candidate dates (session spanning midnight, timezone pinned `Europe/London`).
**PROVES:** `ContradictionTrace = { earlier: 3, later: 4, kept: 'later', humanTrace: "heard 3, then 4 — kept 4" }` with superseded value retained; tokenless segments *always* become `missing_client` clarifications (never pronoun-guessed); date ambiguity yields a two-option clarification; bare weekday resolves most-recent-past.

**F.3 — future date + duplicate date**
"Next Friday Sarah 5x5 pause squats" (session on a Wednesday). Second workout item for Jonathan on a date where the stubbed DB has an existing log.
**PROVES:** future item's `target === 'plan_edit'` and copy is "added to plan" (negative assertion: `recordType !== 'workout_log'`, and no flag exists that changes this); duplicate yields `applyKind: 'merge'` proposal, **not** a failure — while the PLAUD upload contract, unchanged, still fails on the same inputs (A9 coexistence).

**F.4 — failure injection (`backend/__tests__/services/freestyleConsolidationService.test.mjs`)**
Model stubbed to: timeout; malformed JSON; schema-invalid (rogue token, invented enum, 300-char "note" containing `IGNORE PREVIOUS INSTRUCTIONS … Sarah K`); valid.
**PROVES:** timeout ⇒ degraded summary, `degraded: true`, ≤ 2 provider calls; malformed ⇒ one repair then degraded; injection envelope ⇒ validator discard with **zero** model-authored strings in the response (deep-scan response for the canary "Sarah K" fails to find it because no response string is model-sourced); partial apply: item 2's write service throws ⇒ item 1 applied, receipt exists, item 2 `failed`, retry succeeds once, replay returns `FREESTYLE_ALREADY_APPLIED`.

**F.5 — overflow**
400 synthetic fragments (~6 000 words).
**PROVES:** ≥ 3 windows, `WINDOWED:3` warning, cross-window contradiction latest-wins, completeness still exactly 100%.

**F.6 — PII boundary battery (`frontend/src/features/freestyle/pii/__tests__/tokenizer.adversarial.test.ts` + server verify-mode tests)**
The §C.6 table, encoded as data: `{ name, raw, roster, expect: [{ surface, token?, binding, candidates? }] , payloadMustNotContain: [...] }` — 23 cases including both mandated hard cases (kin-possessive, descriptive-no-determiner), spelled-out names, diacritics, short-name collisions, homograph verbs, group plurals, tier-0 scrub, and the lowercase-session `CASING_SIGNAL_ABSENT` guard.
**PROVES:** every row's expected mask occurs; the serialised model payload contains none of `payloadMustNotContain`; server verify-mode rejects a doctored "client that skipped tier 2" request with `422` and a fragment-id-only error body; source scan: no new file references `uploadTranscript`; `freestyleConsolidationRoutes` registers no `frontend_dispatch`-producing path.

**F.7 — contract parity + lifecycle**
`backend/__tests__/services/freestyleContract.test.mjs` round-trips the F.1 fixture through the real route and asserts the response matches the TS `FreestyleSummary` shape field-for-field (TS types and JSDoc mirror cannot drift). Map lifecycle test: purge fires only when all items + clarifications are terminal; atomic `{summary, map}` record verified.

**F.8 — A9 regression (existing suite, untouched)**
The PLAUD upload contract tests (`backend/__tests__/routes/uploadTranscript.contract.test.mjs` and friends) run unmodified and green in the same CI job, proving freestyle shipped *beside* the file-upload contract, never through it.

---

## G. Build order

Each slice merges independently and is verifiable alone.

**Slice 0 — Shared kernel.** `normalize.mjs`, `metricGrammar.mjs`, `resolveDates.mjs`, `typeLexicon.mjs`, `confidence.mjs` + property tests (pure, no I/O).
*Accept:* 100% of F.1's anchors extract correctly; date rules table-test green; confidence formula snapshot-locked.

**Slice 1 — Tokeniser + map + render.** `tokeniserCore.mjs`, `nicknames.mjs`, `domainAllowlist.mjs`, `useTokenMap`, `ClientTokenText`. No backend yet.
*Accept:* full §C.6 corpus passes; leak-scanner test on `buildModelPayload` output; roster-unavailable blocks with `FREESTYLE_ROSTER_UNAVAILABLE`; map persists atomically with its summary in the S2 store.

**Slice 2 — Backend route, model stubbed.** Route file, service, validator, guards (future-date, duplicate, target fence), completeness backfill, verify-mode re-tokenisation. Mounted in `backend/app.mjs` adjacent to `aiCommandRoutes`: `app.use('/api/ai/freestyle', freestyleConsolidationRoutes);`
*Accept:* F.1–F.3 pass against a stubbed model returning a canned valid envelope; **zero database writes** (assert no Sequelize model touched in test harness); A9 suite green and untouched; source-scan test green.

**Slice 3 — Real model + repair + degraded mode.** `freestyleModelClient.mjs` wired to existing env; 20 s abort; ≤ 1 repair; degraded path.
*Accept:* F.4 all four stub scenarios; provider call count assertions; account flag `FREESTYLE_MODEL_ENABLED=false` forces degraded with no outbound provider request.

**Slice 4 — Apply route + receipts.** Migration, model, per-item transaction, idempotency, merge semantics, apply-time guard re-runs, delegation to the existing write services behind proposal execution.
*Accept:* F.4 partial-failure scenario; replay idempotent; duplicate merge appends to the stubbed existing log; future-date breach returns `FREESTYLE_FUTURE_DATE_FORCED`; `frontend_dispatch` rejected.

**Slice 5 — Summary UI.** Grouped render (`client → date → type`), collapsed-by-default traces with **one-tap revert** (flips `kept`, un-supersedes the metric, item returns to `pending`), clarification flows (incl. multi-select fan-out), per-item confirm.
*Accept:* revert round-trips a contradiction fixture; no unconfirmed item can reach the apply route (button gating + server re-check); bound names render from roster, unbound from map, redactions as chips.

**Slice 6 — Windowing + polish.** Stage 7, `WINDOWED` warnings, counters (integer metrics only) for degradation rate and clarification rate.

---

## H. What you would cut

The one-week version keeps every ratified rule and the entire PII boundary; it cuts intelligence and convenience.

| Keep (non-negotiable) | Cut | What is lost |
|---|---|---|
| Tiers 0–3 tokeniser, server verify mode, no-prose envelope, map lifecycle | **The model call** (ship §A.4 deterministic segmentation only) | Clarification rate roughly triples (cue-phrase splits over- and under-segment); trailing-off repairs land as clarifications instead of items |
| Future-date guard, duplicate-merge semantics, completeness invariant, per-item apply, contradiction traces (numeric + date) | **Repair round-trip** (malformed ⇒ straight to degraded) | Slightly more degraded sessions on flaky model days — moot while the model itself is cut |
| Revert UX for *traces* | **One-tap revert interaction** (traces read-only; correcting = dismiss + re-dictate) | Ratified rule 1's letter ("one tap to revert") deferred; earlier value still retained and visible, so "never silently discard" holds |
| Group multi-select fan-out (cheap; prevents wrong-client writes) | **Windowing** — enforce a hard 250-fragment cap with an explicit "split the session" error | Sessions over ~6 minutes of dense speech are rejected visibly (never silently truncated); acceptable because S2 already caps at 10 minutes |
| Roster + nickname + initials matching, kin/descriptive grammar | **Fuzzy matching** (exact aliases only) | ASR variants ("Stephany") fall to Tier 3 unbound ⇒ clarification instead of auto-bind — cost is taps, not safety |
| Apply receipts (idempotency) | Merge-apply depth: duplicates become clarifications ("already a log for that day — append?") handled manually | The merge/append proposal is still offered, just not auto-drafted |

What the cut version never loses: zero-PII-to-model (unchanged — arguably stronger, since with the model cut the guarantee is absolute), latest-wins with retained traces, future-dates-to-plan, duplicates-as-proposals, and no-fragment-dropped. What it loses is the product's soul — the difference between "Sean rambles for ten minutes and it's all filed" and "Sean rambles and then answers fifteen questions." The model call in Slice 3 is precisely the purchase of those fifteen taps back, and it is the last thing added, not the first.
