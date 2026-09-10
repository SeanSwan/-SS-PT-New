# Swan Coach Universe V3 — independent hostile review R3

Owner: local Codex reviewer. Date: 2026-09-06 UTC.
Status: REVISE — advisory review, no runtime repairs or release approval.
Scope: runtime HEAD `b88dd9e5c894908d9f193411fe66117294d190ef`, existing V3
01–10 packet and its integration claims, branch
`codex/swan-coach-universe-v3-implementation-20260904`.
The separate active blueprint task owns 11–17 and its new wireframe/tests.
Those moving artifacts are not certified by this review. Missing documents seen
during their construction were withdrawn as findings once ownership was verified.

## Verdict

Keep the Session Desk/workout-first direction. Do not restart the architecture.
Close the three independently reproduced gaps below before declaring foundation
closure. No verified P0, production exploit, production duplicate, or live failure
is claimed. R3-1 and R3-3 are inherited paths still outside the partial repairs;
R3-2 is a regression risk in the new revoked-row pagination scan.

## R3-1 — P1: transport ambiguity becomes a false no-change receipt and resend

Evidence: `frontend/src/hooks/useCoachCommand.ts:196` converts a lost response to
an ordinary command error. `CoachCommandCenter.actions.ts:160` then attaches
`No data was changed` and `retryMessage`; its `handleRetryMessage` at line 220
resubmits the text. The hook's execute payload at lines 127–137 has no stable
request/intent key. These are executable branches, not just old documentation.

Scenario: a server effect commits but the response is lost. The diagnostic runs
the real transpiled hook and action with a synthetic HTTP boundary that records
an effect before throwing. First send produces the false receipt; pressing retry
produces a second synthetic effect. This proves client behavior, not a particular
domain writer's production duplication or lack of domain-specific deduplication.

Correction for S3/C6/T13: distinguish known pre-effect rejection from unknown
outcome. Only claim no change with authoritative zero-effect evidence. Keep the
original intent/key across response loss and reconcile it; do not offer generic
resend for unknown writes. Until integrated, show uncertainty and direct the user
to authoritative history instead of promising that repeating is safe.
Acceptance: drop a response after commit through the mounted submit/retry path;
one domain effect, same intent, no false no-change text. Include confirmation
and frontend-dispatch acknowledgements without treating event dispatch as save.
Confidence: high for the client defect; real DB effect semantics not exercised.

## R3-3 — P1: default Workout Logger dictation still becomes typed input

Evidence: `WorkoutLogger.tsx:204,739` uses/renders `useWorkoutLoggerDictation`
and `LoggerDictationStrip` when Voice Mode V2 is off. That flag defaults off in
`frontend/src/hooks/voice/voiceModeV2Flag.ts:9`. Speech finals enter draft state
in `useWorkoutLoggerDictation.ts:38`; send at line 78 omits provenance.
The shared command hook at line 136 substitutes `text`. The server consumes that
value at `commandExecutor.mjs:681`; `voiceConfirmationTier.mjs:210` treats it
as a known-safe channel.

Reproduction: execute the actual dictation hook with a synthetic speech-final
callback, rerender, send through the real command hook, and inspect the request.
It contains `text`. At the actual tier function with a synthetic cross-client
context, that value produces physical=false while voice produces physical=true.
This is not proof of authorization bypass or a successful wrong-client write.

Correction for S1/C1/T01–T03: close all mounted producers, not just Command Center
and surface docks. Preserve voice/mixed origin through edits and send; omitted
origin at the shared hook must remain unknown, never gain text authority.
Inventory also found omitted origin in `ClientTrainingCommandBar.tsx:112` and
the older `useCoachAssistant.ts:106`; verify each caller's mounted status and
actual input source before changing it. A truly typed caller should declare text.
Acceptance: speech final → manual edit → submit through the real logger adapter;
voice/mixed retained, unknown fails closed, typed input remains explicitly typed.
Confidence: high; feature flag state in production was not inspected.

## R3-2 — P2: a bounded output page has unbounded backend work

Evidence: `backend/routes/aiCommandRoutes.mjs:543` loops until it accumulates
enough readable rows. Every full revoked page triggers another `findAll` at 544
and per-row access checks at 552. There is no page/row/time budget; the tail guard
only catches a repeated tail. Distinct real history progresses past that guard.

Reproduction: execute the exact route body and real cursor/access helpers with
100 full synthetic revoked pages and EOF. `limit=1` performs 101 list queries and
200 assignment checks, returning zero receipts. This proves work amplification;
real database latency or denial of service was not measured.

Correction for S3/C5: authorize in the query before pagination where feasible;
otherwise set an explicit scan budget and return a continuation cursor based on
the last scanned row even when the visible page is empty. Do not reintroduce the
older bug that hid authorized history behind revoked recent rows.
Acceptance: a large revoked history stays inside the declared query/work budget;
continuation eventually reaches permitted records with no omissions or duplicates.
Keep the existing revoked-row and equal-timestamp tests.
Confidence: high.

## Canonical caller receipt

- Dashboard route table: `UniversalDashboardLayout.routes.tsx:109,211,238` maps
  Coach pages; `UniversalDashboardLayout.shell.tsx:133` renders DashboardRoutes,
  whose `shellPieces.tsx:108` renders the selected `<Component />`.
- `CoachCommandCenterPage.tsx:47` calls its controller; controller lines 45/179
  connect `useCoachCommand` to `createCoachCommandCenterActions`.
- Hook's literal `/api/ai-command/execute`: `useCoachCommand.ts:127`;
  backend mount: `backend/core/routes.mjs:715`; execute handler:
  `backend/routes/aiCommandRoutes.mjs:216`. Receipt list handler is line 515.
- Logger route: `UniversalDashboardLayout.routes.tsx:151` →
  `AdminPersonalWorkoutLogger.tsx:29` renders `<WorkoutLogger />` → the dictation
  consumer above, gated by role/session stage and Voice Mode V2.
- No ORM model changes are proposed/applied in this review; model-to-live-schema
  parity and authenticated browser journeys remain unverified release gates.

## Model consultation and adjudication

Input: existing sanitized `glm-blueprint-review-packet-20260905.md` (7,453 chars),
not the full repository or the concurrently authored 3.2 documents.
Transport: current main-checkout consult-panel with existing egress/quota guards;
one requested call per seat, no automatic retry. Initial sandbox spawn failed
before provider execution; escalated dispatch succeeded. No paid premium seat.
Output folder: `panel-20260905-hostile-r3-dispatch/` beside this report.

Flash requested/served `glm-5.3-flash`; 2,405 input / 16,521 output tokens,
including 13,109 reasoning tokens. GLM requested/served `glm-5.3`; 2,405 input /
13,204 output tokens, including 10,324 reasoning tokens. Both verdicts REVISE.
Total usage: 34,535 tokens across the two calls; no extra premium-seat charge.
Panel exited 0; receipt marks both artifacts valid. Input and both reply SHA256
hashes were independently compared to PANEL-ARTIFACT-RECEIPT.json and matched.

Paired adjudication (repository evidence outranks packet-only hypotheses):

- Accept a per-command-family authority/transaction/verifier/recovery table and
  fault-injection tests. Keep new capabilities off until their own paths pass.
  These strengthen known S3/S4 adoption gates, not evidence of a newly found P0.
- Reject shared role UI as proof of missing authorization. `/commands` is protected
  and calls `getCommandsForRole(req.user.role)` at route lines 843–845; sharing a
  component does not remove backend authorization. Entity-owner coverage still
  needs its already-planned S2 tests; no blanket auth safety claim is made.
- Reject claims that receipt actor scope comes from a supplied actor or health
  is unauthenticated: list uses `req.user.id`; current access is rechecked;
  `/health` has `protect` at 877. Fresh route tests cover denied reads/revocation.
- Reject claims that concurrency/hash contracts and voice/accessibility scenarios
  are absent. C4 specifies uniqueness/hash conflict; T11–T12 concurrency,
  T28–T32 responsive/accessibility/voice. Execution proof is still required.
- Do not adopt Flash's suggested 422 hash-conflict code or an invented `stage`
  model without adjudication: C4/T12 already specify 409 and a state contract.
- Reject forcing all writes exclusively through the command route: existing
  proposal/manual domain authorities must remain intact. Require equivalent
  reviewed receipts at each actual authority instead of creating a new one.
- `findOrCreate` plus a unique index is not independently proven racy by a
  packet-only assertion. Real PostgreSQL concurrency remains a required gate.
- GLM repeats the same speculative role/legacy-path P0s; their agreement does
  not overcome the evidence limitations above. Accept a named bounded recovery
  worker/owner and stable request-key tests, not automatic replay or expiry.
  Provider retention terms require actual policy evidence, not a code assertion.
- Oversized route-file debt is real but is not authorization for a broad refactor
  in this review; any later extraction must preserve route order and guards.

The concurrently written `12-astra-review.md` independently lists the receipt
scan problem as AF13. R3-2 corroborates it with an executable work-count probe;
it is not an additional distinct defect to double-count.

The two GLM seats share Z.ai lineage; agreement is not cross-provider independence.
No provider finding is promoted to a verified runtime vulnerability without local
reproduction. Missing evidence is a gate, not proof that existing security is absent.

## Fresh verification and handoff

From this worktree:

1. `node docs/ai-workflow/AI-HANDOFF/swan-coach-universe-v3/evidence/hostile-r3-probes.mjs`
   → all three defect reproductions observed, exit 0. Diagnostic assertions
   intentionally confirm failure behavior; this is NOT a green acceptance suite.
2. `node --test docs/ai-workflow/AI-HANDOFF/swan-coach-universe-v3/tests/baseline.test.mjs docs/ai-workflow/AI-HANDOFF/swan-coach-universe-v3/tests/integration.red.test.mjs`
   → 24/24. Source-pattern integration probes do not prove workflow completion.
3. In frontend: `node node_modules/vitest/vitest.mjs run src/hooks/coachInputOrigin.test.ts src/hooks/useCoachCommand.frontendDispatch.test.tsx src/components/DashBoard/Pages/coach-assistant/CoachCommandCenter.actions.commandError.test.ts --maxWorkers=1`
   → 18/18 across three files after approved sandbox escape for Vite startup.
4. In backend: `node node_modules/vitest/vitest.mjs run tests/api/coachIntentRoutes.test.mjs --maxWorkers=1`
   → 7/7 after approved sandbox escape; DB/services mocked.
5. Current main transport: `node scripts/lib/redact-egress.test.mjs` → 45/45.

No full typecheck/build, live DB/Redis, migration, authenticated browser, provider
payload evaluation of the app, commit, push, or deploy. Previously reported
typecheck OOM is not a fresh passing or failing receipt here. No visual-quality
certification of the new wireframe still being authored by the other task.

Hygiene: this report, its diagnostic, panel reports/receipt/index, failed-spawn
empty output directory, and runner-created temporary scrub packet are review
evidence. Retain with this review; any later cleanup is a separate approved pass.
No existing runtime, blueprint, wireframe, or test file was modified.
DRY-LOOP: N/A — review-only; defects reported, not repaired.
LINEAR: not updated — no tracker-write authorization in this review request.
