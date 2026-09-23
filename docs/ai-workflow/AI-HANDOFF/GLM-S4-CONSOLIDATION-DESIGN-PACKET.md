# GLM-5.3 — DESIGN S4: the freestyle consolidation engine

You are designing, not reviewing. Produce a blueprint complete enough that a builder
implements it with ZERO further questions. This is the highest-risk slice in the set.

## What consolidation must do
Input: an unordered pile of speech fragments from one freestyle session. Sean talked for up to
ten minutes about SEVERAL clients, SEVERAL days, and SEVERAL record types, correcting himself,
repeating himself, and trailing off. No schema, no prompts, no structure.

Output: a FreestyleSummary — items grouped client -> date -> record type, each with a
confidence, a contradiction trace where one existed, and a routing target.

## RATIFIED RULES (Sean, 2026-08-16) — these are decided, do not relitigate
1. CONTRADICTIONS: latest-wins, with a COLLAPSIBLE TRACE. Keep the later value, attach
   'heard 3, then 4 - kept 4', collapsed by default, one tap to revert. The earlier value is
   retained until the session resolves. Never silently discard.
2. FUTURE DATES: always route to plan_edit, NEVER a workout log. Copy says 'added to plan'.
   Not permitted even behind a flag. A pre-filled log for a session that never happened is a
   false record that corrupts progress charts.
3. DUPLICATE DATES: a merge/append proposal, NOT a failure. Trainers backfill and correct.
4. UNPLACEABLE FRAGMENTS: become a clarification item. NEVER dropped.

## HARD CONSTRAINTS
- ZERO PII TO MODELS. Client names are mapped to tokens CLIENT-SIDE before any transcript
  leaves the device. Consolidation operates on tokenised text. Names rehydrate at render only.
  The tokeniser must handle: formal first names, shortened forms, two-letter initials,
  possessive references to a relative, and purely descriptive references (an activity or trait
  instead of a name). A tokeniser that only catches formal first names violates the mandate in
  letter while appearing to pass.
- Existing proposal types to route into (do NOT invent new ones):
  workout_log | plan_edit | nutrition_log | client_data_update | client_profile_coverage_update
  | frontend_dispatch | clarification | split_plan
- FRONTEND_DISPATCH is draft-only by contract: 'use only for draft UI changes, never as a
  final write path.' The fence stays.
- A9 (binding): freestyle runs BESIDE the file-upload contract, never through it.
  uploadTranscript(file: File, clientId: number) must NOT be edited to absorb freestyle.
  Its single-client/single-date binding and duplicate_date/future_date FAILURE semantics stay.
  Existing PLAUD upload contract tests must pass unchanged.
- Backend is Node + Express + Sequelize + PostgreSQL. New service sits beside
  backend/services/ai/coachActionProposalService.mjs and reuses coachActionProposalClassifier.mjs
  types. Route near backend/routes/aiCommandRoutes.mjs.
- Nothing writes without explicit per-item confirmation.

## ALREADY BUILT (do not redesign)
- useFreestyleSession (S2): session state machine, account-keyed buffer, TTL/discard/unmount
  purge, two-step discard. WRITE-FREE by construction. Emits FreestyleFragment[]:
    { id: number; text: string; atMs: number }   // atMs is RELATIVE to session start
- useCoachCapture (S1): RECORD pipeline + lifecycle policy (releases mic on hide/pagehide/unmount)
- Retention contract: audio NEVER persisted server-side; parsed text only; TTL <=24h;
  account-keyed; encrypted; purge on save-verified/dismiss/logout/switch/TTL/receipt;
  excluded from logs/analytics/model context beyond the single consolidation call.

## DELIVER (exact headings)
## A. Algorithm
   Stage by stage: dedupe -> reorder -> merge -> contradiction detection -> segmentation into
   candidate items -> client resolution -> date resolution -> record-type classification ->
   confidence scoring. For EACH stage say what is deterministic code and what needs the model,
   and WHY. Deterministic wherever possible - a model call is a cost, a latency, and a PII risk.
## B. Data contract
   Full TypeScript types for FreestyleSummary, FreestyleItem, ContradictionTrace, Confidence,
   ClarificationItem. Plus the request/response shape of the backend route.
## C. The PII tokenisation boundary
   Exact design. What is tokenised, when, by what, how the map is held, how rehydration works,
   what happens on a tokeniser miss, and how you would ADVERSARIALLY TEST it.
## D. Prompt contract (if a model call is needed)
   The exact system prompt and output schema. Must be tokenised-input-only.
## E. Failure modes
   What happens on: model timeout, malformed model output, an unresolvable client, an
   ambiguous date, a fragment that is not about training at all, a 10-minute session that
   exceeds a context window, partial apply failure.
## F. Test plan
   The specific fixtures. At minimum: 3 clients / 2 dates / 4 record types in one session;
   a contradiction; an unplaceable fragment; a future date; a duplicate date; a PII
   adversarial set. State what each fixture PROVES.
## G. Build order
   Independently shippable sub-slices with acceptance criteria a builder can verify alone.
## H. What you would cut
   The version that ships in a week rather than a month, and what is lost.

Be concrete. Real file paths. Real type names. No placeholders.
