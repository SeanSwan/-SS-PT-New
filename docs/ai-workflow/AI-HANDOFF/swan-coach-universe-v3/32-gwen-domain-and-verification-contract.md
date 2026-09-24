# Swan Coach — Gwen domain and verification contract

Current role amendment (2026-09-08): [35, premium same-task workflow](35-luna-astra-review-loop.md) governs: Luna Extra High builds/tests; Astra owns architecture, ALL reviews, final review and review repairs. Earlier GLM/Flash or other reviewer assignments elsewhere are superseded. Domain and acceptance contracts below remain binding.

Artifact: SCU-GWEN-CONTRACT. Version: 3.3, 2026-09-06.
Owner: Sean/product, Astra/architecture, Gwen 3.8/implementation.
Status: continuation contract; unbuilt acceptance cases remain NOT RUN.
Part of [the canonical Gwen handoff](31-gwen-execution-handoff.md).
Supersedes conflicting older executor/status instructions only, not runtime authority.

## Dashboard integration contract and waves

All 127 audited top-level entries (66 admin, 26 trainer, 22 client, 13 general User) plus
nested Client Hub, training, Nutrition and Content Studio views remain in scope.
These counts are a source inventory, not successful authenticated journeys.
General User is distinct from Client; never invent a generic User Coach route.
Use 19's server-validated surface/action adapter contracts and DA-Dxx-01..08 tests.
Every row declares explain/navigation, read, draft, reviewed write or UI-only;
role, target/entity source, current access, privacy, refresh keys and manual fallback.
Unknown/unproved adapter stays inactive. Do not dump every tab into model context.

Wave 1: D01 Coach/PLAUD; D02 Planner; D03 Logger; D05 Clients & Team;
D11 pain; D13 equipment; D19 progress.
Wave 2: D04 camp/sprint creator; D08 scheduling/session location;
D12 nutrition and Nutrition Planner; D14 form assessment/video.
Wave 3: D06 onboarding; D15 gamification; D20 community; D21 notes; D24 AI consent.
Wave 4: D16 Content Studio/photos/galleries/training videos; D18 communication/support.
D23 home/overview uses the training evidence from Wave 1 and the existing briefing.
D07 waivers, D09 trainers/assignments/permissions, D10 money/session allocation,
D17 account/security and D22 internal design/operator surfaces initially explain
and navigate their existing authorized human workflows.

Scheduling location is not session-credit allocation. Private progress photos are
not public gallery assets. Food logs are not permission to replace macro targets.
Staff notes are not client-visible memory. Publishing/sending requires its own
audience preview and explicit approval; saving a workout grants neither.
Admin does not mean blanket model-tool authority. Trainer assignment is rechecked
at read, preview, confirm and receipt disclosure. Client gets own eligible
self-service only after separate policy proof; general User follows entitlement.

## Intelligence, memory and evaluation boundaries

Use 06/14/15 for supportive tone and 120 synthetic evaluation cases (90 development,
30 holdout split by family). Model opinions never override deterministic graders.
No clinical diagnosis, hidden psychological profiling, shame, emotional dependency
or claim of a human relationship. Sensitive support cases need qualified review
before activation; local synthetic implementation does not authorize live therapy.
Provider output and imported notes/transcripts are untrusted data, never authority.
No PII/credentials/raw private health narrative sent to providers by an unchecked
path. No new paid reviewer/model run, retries or vendor without authorized budget.

CoachFact commit 21ed0554ba on feat/coach-facts-s1 is absent from owned HEAD and cached
main. It contains an existing model/migration/service to adjudicate before new memory
schema work. Do not create a duplicate fact store or cherry-pick its whole branch.
Forget is immediately enforced by retrieval, including stale cache hits; purge
ciphertext within 24h, disclose backup retention separately. Keep deletion available
when new memory/proactivity is disabled. Do not promise no conversation retention.

## Tests, operations and final delivery

Run each focused test with its actual exit code, then inspect failures; no pass from
setup/import errors. Use the installed non-vibe-coding receipt/check-readiness gate.
Swan Gate requires an independent pre-build acceptance gate for substantial slices:
record hash, keep builder from editing it, run at most 3 repair iterations, preserve
failures, then apply the repository's hostile-review and Final Decider chain.
No unavailable reviewer counts as approval. The process does not require paid review.

Existing smoke command, owned root:
node --test docs/ai-workflow/AI-HANDOFF/swan-coach-universe-v3/tests/astra.acceptance.red.test.mjs
Existing recorded packet runner: node docs/ai-workflow/AI-HANDOFF/swan-coach-universe-v3/tests/astra-verify.mjs
The packet runner overwrites its current receipt/logs; snapshot them before rerun.
Frontend: node node_modules/vitest/vitest.mjs run <explicit scoped tests> --reporter=verbose
Frontend types: node --max-old-space-size=12288 node_modules/typescript/bin/tsc --noEmit --pretty false
Frontend build after UI changes: npm run build. No app .env for synthetic tests.

Actual PostgreSQL suites from backend:
node node_modules/vitest/vitest.mjs run --config tests/helpers/coachWorkoutIntent.postgres.config.mjs --reporter=verbose
Repeat sequentially with coachWorkoutAtomic.postgres.config.mjs and coachWorkoutReadback.postgres.config.mjs.
They use coachTestDatabase.mjs: fixed 127.0.0.1, database coach_test_20260906,
synthetic user coach_test_admin, explicit SWAN_COACH_TEST_PORT in 1024..65535.
The prior container is STOPPED/auto-removed. Create and label your OWN disposable
loopback database first; never point these destructive fixtures at an existing DB.
Only then set NODE_ENV=test and its port. Provider/outbound effects stay mocked.
Actual User/auth/browser/Redis acceptance still requires its separate real harness.
For Redis T44, use two processes and synthetic prefixes: one consume, signed
read-back intact, unavailable store prevents listen. An in-memory Map is not proof.

Traceability: GW01–05 -> G01 -> new real-service/card/route tests above.
G02 -> T01–10/T45; G03 -> T11–16/T46; G04 -> T26–29;
G05 -> T22–25; G06 -> T30–32; G07 -> T33–34/T48;
G08 -> DA-D01..D24-01..08 + all-dashboard journeys;
G09 -> T35–37; G10 -> T38–39; G11 -> T40–44/T47 and 15's release matrix.
G01-specific executable REDs were NOT RUN in the handoff itself and were frozen
by the builder: RED 18F/1P observed before first runtime edits, then 19/19 GREEN
after implementation (combined with the 14/14 baseline: 33/33, exit 0). The
three PostgreSQL suites were rerun by the builder on its OWN labeled disposable
loopback DB (port 15433): intent 24/24, atomic 13/13, readback 15/15, all
exit 0 — see the G01 status section of 31-gwen-execution-handoff.md (2026-09-07).
G02 slice is IMPLEMENTATION VERIFIED (local, not deployed), 2026-09-07 — receipts
frozen in 31: RED observed before implementation (FE 5F/9P clean + decoder 9/9;
BE unit 11F/1P; BE API 200-not-403 x4), then GREEN: backend unit 84/84
(+confirmationProjectionMint), backend API 18/18 (+aiCommandRouteEntityOwnership
on disposable PG 15433), frontend 152/152 across 11 files (incl.
confirmationProjection decoder + ConfirmationSheet.projection), tsc --noEmit 0
errors, `vite build` clean, G01 gate 33/33 still green. T06/T07 now have a
pre-consumption entity-ownership re-check at /confirm (APPROVAL_ENTITY_RECHECK,
default enforce; reads `"Users"` role + `client_trainer_assignments` owner; 403
ACCESS_CHANGED, zero effects, no target details, approval survives for re-issue).
T08 projection field is signed into BOTH HMAC lanes; T09 sheet renders the decoded
stored projection (v2) with the pre-G02 rules as the v1 fallback; T10 registry
stamps per-command reversibility (planner inverse pair declared; the rest keep
the conservative `none` blanket, fallback-list deletion deferred to G04).
Known G02 deviation: useConfirmationSheet's read-back fetches exactly once per
operationId (a first-draft effect keyed on `send` re-fetched unboundedly and
OOMed the heaviest frontend workers) — fixed and receipt-backed.
G03 -> T11–16/T46 is next.
All future tests remain NOT RUN until their slice builds them.

Budgets from 15 remain targets, not measurements: p95 input feedback <150ms,
useful text <2.5s, draft <8s, verification <3s; tool loop<=20s. Receipt listing max 50
returned / 500 scanned / 10 batches, including empty-page continuation and authorized
lookahead without skipping. No automatic unbounded older-history scan.
Logs/metrics: low-cardinality state/capability/version/latency; protected IDs in
audit only; payload logging OFF. Sean owns rollout; builder owns local evidence.

Rollback means disable new capability writes, keep manual workflows and receipt
reads/reconciliation/deletion, investigate mismatches; never drop executed receipts.
Reconcile current-main dependencies/startup/shared UI before release; avoid shipping
the entire 70-commit ancestry blindly. Verify migration order and restore with real
test resources. Never run force sync/migration on the live database for convenience.
Before any future backend push, audit untracked backend and modified-uncommitted
backend files, stage exact owned paths and complete required review. Main push,
production migration/activation/deploy and paid calls require explicit authorization.
Do not create a continuity closeout unless Sean says session closeout/log this and close.

Your first update must name the verified worktree, current tests and G01 gate.
After each slice, update this SAME packet and report requirement/test/evidence,
real-vs-mocked boundary, files changed, remaining blocker and next slice.
At a real consequential blocker, preserve evidence and continue independent work.
Do not replace the architecture, fake working controls, weaken tests, or repeatedly
ask Sean to choose routine implementation details already decided here.

## Handoff applicability and evidence

Requirements/blueprint/contracts/traceability/operations/review: this handoff plus 13–19.
Wireframes: existing desktop/mobile HTML and 05/14; no new visual redesign in this turn.
Flow/state/sequence/logical ERD/privacy:16-state-and-data-flows.md and 28's actual
transaction amendment. Logical ERD is not executable migration DDL.
Permissions:19 four-role matrix and per-domain authority, plus G01 current-access cases.
Runtime migration/E2E/performance tests: planned in15, NOT RUN for unbuilt G01+ work.
Training-model fine-tuning/deployment topology changes: N/A; no such changes proposed.
New Mermaid rendering: NOT RUN; no local Mermaid renderer found. Existing diagram
source and synthetic wireframe remain available; Gwen must render/check modified diagrams.
Preservation: portable explicit snapshot 12/12 verified, two isolated sample restores;
native vault hook absent from owned worktree, root hook merely PRESENT_UNOBSERVED.
No automatic-hook, remote backup or off-machine restore claim is made.
Hygiene: root inventory inspected; active runtime vs earlier candidate vs legacy
assistant classified above and in 20. QA lives in packet/evidence and task tmp. No cleanup
execution; earlier candidate/QA outputs are retention candidates only after integration
and separate ownership/reference checks. Do not delete them during feature work.
Readiness: evidence/gwen-handoff-readiness.json with integrity-check output. A structural
PASS means the continuation packet is coherent, not that remaining software is built.
