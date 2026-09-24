# SCU-BLUEPRINT — training copilot with verifiable actions

Owner: Sean/Codex. Version: 3.0. Status: proposed implementation contract.
Supersedes: v2 future architecture and prioritization; preserves domain contracts.

## Product jobs

1. **Before training:** summarize the actual plan, equipment, recent performance,
   unresolved pain flags, and missing data. Ask only for information needed now.
2. **During training:** accept “bench, three sets of eight at 135 pounds”; resolve
   exercise from the canonical library; show units and ambiguity; support quick
   correction, rest timer, substitutions, and manual editing of the same draft.
3. **After training:** verify the saved diary/session, refresh progress from those
   records, explain what improved, offer one next action and an optional share draft.
4. **Between sessions:** explain evidence, remember approved preferences, propose
   plan changes, and deliver a consented check-in when there is a useful reason.
5. **For coaches/admin:** stage a client's next session, review stale clients,
   compare logged progression, draft communication and schedule changes with scope.

## Decisions, not a feature wishlist

| ID | Decision | Why / acceptance |
|---|---|---|
| R01 | One typed input envelope for all surfaces | Preserve voice origin, client context, timezone, request identity |
| R02 | One rendered confirmation policy from server read-back | No caller-dependent safety ceremony |
| R03 | Entity owner/access resolved before proposal and again before execution | Selection and object ownership cannot diverge silently |
| R04 | Durable intent + action result; uncertainty is a real state | Lost response never invites duplicate writes |
| R05 | Workout writes stay in existing proposal + daily-form service | Preserve session accounting and 409 review requirement |
| R06 | One context assembly and allowed-provider route | Domain quality, privacy, and spend survive failover |
| R07 | One workspace task follows route changes | Form drafts and intent IDs survive navigation without auto-submit |
| R08 | Voice capture is session-scoped and interruptible | No background microphone; interruption does not cancel committed work |
| R09 | User-controlled memory with evidence and scope | Correction/deletion beats stale recall |
| R10 | Evidence-based progress explanations | Calculations from authoritative logs, with period and metric definitions |
| R11 | Consented in-app briefings, off by default | No unwanted outbound contact or infinite autonomous loop |
| R12 | Warm but honest coaching | No diagnosis, dependency tactics, fabricated feelings, or completion claims |
| R13 | Outcome evaluation and operational gates | Measure real task success, not chat length or passing mock counts |

## Architecture ownership

- **UI:** existing role page and docks; shared input state, ConfirmationSheet,
  Session Desk, results timeline, memory drawer. No parallel standalone chatbot.
- **Interpretation:** model can propose a typed intent or ask for clarification.
  It cannot choose authenticated role, owner, permission, or approval status.
- **Context:** adapt `buildCoachContext` with explicit domain states, source refs,
  as-of timestamps and freshness. Reuse loader/auth logic; never flatten failure.
- **Policy:** registry owns action schema, allowed roles, owner resolver, effects,
  reversibility, approval requirements and capability activation.
- **Execution:** existing command executor for supported commands; proposal service
  for reviewed training edits. Coordinator records progress, not new permission.
- **Durability:** PostgreSQL intent/outcome record; existing Redis pending approvals
  remain ephemeral authorization state. No in-memory-only record of a final result.
- **Evidence:** transaction result plus authorized independent read-back; model
  response text is never sufficient to mark an intent verified.

## Capability map and launch order

| Capability | Launch behavior | Role / boundary | Release |
|---|---|---|---|
| General fitness conversation | Answer with context and cited training evidence | Any eligible signed-in role; no implicit client scope | Foundation |
| Workout logging | Review structured draft → existing proposal → save → verify | Client self; trainer assigned; admin authorized | First vertical slice |
| Plan changes/substitution | Compare before/after with constraint reasons | Existing programReady/aiProgramReady policy; trainer review | Following logging |
| Progress explanation | Deterministic metrics with linked logs and unavailable states | Same data permissions as charts | S8 |
| Pain/recovery conversation | Record user-reported symptom draft; pause unsafe suggestions | No diagnosis or automatic return-to-exercise clearance | S5/S8 |
| Schedule changes | Availability preview + conflict check + explicit confirmation | Existing session role/accounting rules | S8 |
| Nutrition logging | Use existing reviewed nutrition draft | No inferred allergies or invented quantities | S8 |
| Messages/community posts | Draft, preview audience, explicit send approval | No auto-send; preserve communications service | Later connector card |
| Payments/refunds/credits | Explain/read authorized status; open existing admin flow | No new autonomous financial action | Explicitly excluded |
| Account/role/security changes | Existing UI with explicit deliberate review | No broad admin privilege for conversational model | Existing guarded lane only |
| Body/form photo/video analysis | Evidence-labeled suggestion draft | Explicit upload consent; no biometric/diagnostic inference | Deferred pending evaluated asset contract |
| Wearables/PLAUD imports | Opt-in provenance-preserving intake | Existing integration boundaries, no invented connector | Deferred |
| Computer/shell/site administration | None in public Coach | Sean-only Hermes remains separate | Excluded |

## The signature experience

“Talk → watch the workout draft take shape → approve → see the saved result linked
to progress.” Structured entries update as editable draft rows, not magical silent
writes. The transcript stays readable while the workspace shows numbers and
actions. The proof timeline contains outcome, scope, source record and recovery.

Example: “Same as last Tuesday, but 5 pounds lighter, and swap the painful movement.”
Coach first resolves the dated source workout in the account timezone. It shows
the source, missing pain information if any, and the proposed exercise mapping.
An unresolved exercise or unit blocks only the dependent draft step. It does not
invent a contraindication or finalize the workout. Trainer-approved doctrine and
readiness policy govern the substitution before the existing approval lane runs.

## Bounded autonomy

Read-only tools may chain up to 6 calls/turn, 2 model rounds, 20 seconds wall time.
At the limit show partial findings and a user-controlled Continue action; never
automatically resume a write. These are initial configuration defaults to measure,
not existing performance claims. Action graphs permit at most 5 steps initially;
each step has dependencies, target, precondition version and its own outcome.
External messages and financial actions never inherit consent from a broad goal.

New provider, memory, voice-session and briefing features remain OFF at activation.
There is no whole-site autonomous loop, self-modifying prompt, model training on
live client facts, or unlimited model debate.
