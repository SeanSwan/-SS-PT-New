# Acceptance tests and requirement traceability

Artifact: SWAN-AGENT-PLANNER-TESTS · v2.0 · 2026-09-06 · Owner: Sean
Status: focused baseline PASS, two EXPECTED RED cases, future integration NOT RUN.
Authority: [requirements](README.md). Tests use only synthetic or mocked records.

## What ran

Run from the primary SS-PT root with installed Node and Vitest. The config fixes
the source root to the detached current-main audit worktree. It excludes the
backend's ordinary setup, dotenv, servers and database configuration. Node child
processes needed a sandbox escalation after a real `spawn EPERM`; the same
selected tests then ran successfully. Setup failure was not counted as RED.

```powershell
$env:SWAN_BLUEPRINT_TEST_MODE='frontend'
node frontend/node_modules/vitest/vitest.mjs run --config docs/ai-workflow/blueprints/agent-ready-workout-planner-2026-09-06/verification.config.mjs --reporter=dot
$env:SWAN_BLUEPRINT_TEST_MODE='backend'
node frontend/node_modules/vitest/vitest.mjs run --config docs/ai-workflow/blueprints/agent-ready-workout-planner-2026-09-06/verification.config.mjs --reporter=dot
$env:SWAN_BLUEPRINT_TEST_MODE='red'
node frontend/node_modules/vitest/vitest.mjs run --config docs/ai-workflow/blueprints/agent-ready-workout-planner-2026-09-06/verification.config.mjs --reporter=verbose
```

| ID | Observed result | Evidence / meaning |
|---|---|---|
| T-B01 | PASS: 8 files, 72 tests; exit 0 | `evidence/current-main-frontend.txt`: V2 contracts/mobile shell/Rolodex, backup/blend panels, generation/save and plan serialization |
| T-B02 | PASS: 5 files, 60 tests; exit 0 | `evidence/current-main-backend.txt`: goal and route helpers, MCP retirement, backup review/promotion wiring; pure/mocked, not PostgreSQL proof |
| T-P01 | EXPECTED RED: 8 requested → 6 returned | `planner-controls.red.test.ts`, `evidence/planner-controls-red.txt`; actual current-main request builder |
| T-P02 | EXPECTED RED: conservative requested → standard returned | Same actual builder/output; intentional desired-behavior failure |
| T-L01 | PASS for bounded read-only observation | `01-audit.md`: live admin Advanced single/multi-week controls and existing backup/blend identified |
| T-W01 | PASS for synthetic prototype scope | `evidence/wireframe-qa.json`: four views × nine widths, state previews, dialog Escape/focus; 5 Mermaid diagrams rendered |

The RED suite is outside the regular green suite. At implementation, move or
retarget it into the owned current-main slice while preserving the assertions.
Do not edit the audit snapshot to manufacture GREEN.

## Fixture contract for future gates

Use synthetic users U1/U2, clients C1/C2, trainer T1 assigned only C1, trainer T2,
and administrator A1. Include an ordinary user without a client training record,
a self-generation-disabled client, a disabled account and reassigned client.
Plans P1/P2 share C1; P3 belongs to C2. All have UUIDs and known revisions.
Library fixtures cover a normal exercise, missing equipment metadata, archived
identity, timed movement, custom authorized item and protected video metadata.
No seed from a real client's plans, assessment, photos, audio or freeform notes.

Isolated database must be provisioned for the run, marked with a unique synthetic
sentinel, and rejected unless its resolved host/database match the disposable
allowlist. No ordinary local DATABASE_URL. Run real Express handlers and real
PostgreSQL transactions for permission/race/migration claims. Stub only provider
inference where that is not the boundary under test.

## Required future tests (all NOT RUN)

Each row names the fixture/action, observable result, forbidden effect and level.
The implementer freezes executable tests for the slice before changing runtime.

| ID | Requirement | Test procedure / expected result | Forbidden effect / level |
|---|---|---|---|
| T-A01 | R-A01 | Connect as each role, request own/other target and ungranted tools; compare tools/list and tools/call with current eligibility | No object disclosure or privilege amplification; real auth/API + DB |
| T-A02 | R-A01,R-A05 | Revoke, disable account or reassign C1 after preview and during a lock wait; next read and commit denied | No stale-authority read/write; concurrency integration |
| T-A03 | R-A02 | Pinned Hermes + second MCP client perform discovery, OAuth, search, proposal, status and revoke against synthetic staging | No app bearer token sharing; real client/protocol |
| T-A04 | R-A03,R-A05 | Managed local profile: synthetic canary; model down, speech/compression failure, DNS denial, HTTP error and malformed tool call | Zero canaries/requests at denied external sinks; observed network negative controls |
| T-A05 | R-A04,R-P09 | Replay request 20 times; race two approvals; reuse ID with changed payload | One proposal/effect or explicit conflict; real unique constraints/transaction |
| T-A06 | R-A04,R-A05 | Place injection text/URLs in candidate notes, tool results and exercise metadata; send forged actor/target/provenance | Text stays data; no expanded scope, fetch or execution; API/privacy |
| T-A07 | R-A06 | Pair expired/replayed challenge, wrong key, stolen device label; sleep/restart device; revoke during job | Invalid devices rejected; late response cannot apply; device integration |
| T-A08 | R-A06,R-P09 | Interrupt after dispatch, during output, before commit and after commit with lost response | Known task resumes/status checks; no blind resave; real interruption |
| T-A09 | R-A07 | Customer completes consultant-assisted setup, exports configuration without secrets, revokes support and reconnects independently | No consultant master credential or mandatory purchase; manual onboarding drill |
| T-A10 | R-A05,R-O01 | Wrong audience, redirect mismatch, PKCE omission/downgrade, refresh reuse and cross-origin write probes | Reject before data/effect; OAuth/security integration |
| T-P03 | R-P02 | Apply preset plus conflicting client exclusions/equipment/time constraints, then save/reload | Effective values + provenance retained or explicit conflict; no ignored control; UI/API |
| T-P04 | R-P02,R-P05 | All goals, phases, single/multi-week scopes, frequencies, custom horizons and allowed split combinations | Scope alone chooses endpoint; all days populated or explicit validation; property/contract |
| T-P05 | R-P03 | Save/load/export/log fixture with warmup, superset, circuit, timed sets, unilateral work and mixed supported units | Same ordered prescribed meaning; no flattening, unit drift or lost weeks; DB/PDF/logger E2E |
| T-P06 | R-P04 | Search/filter/compare/substitute unknown or archived IDs; remove then undo; navigate virtualized list by keyboard | Canonical identities/media/defaults preserved; unknown is not Bodyweight; component/contract |
| T-P07 | R-P05 | Edit week 8 of 26; regenerate only unlocked rows; compare prescribed versus actual data | Other weeks/locked rows unchanged; no fabricated progress; integration |
| T-P08 | R-P06,R-P09 | Two editors update the same contentRevision; metadata-only edits; wrong-owner copy; stale PDF | Existing mutation conflicts and derivative lifecycle retained; real transactions |
| T-P09 | R-P07 | Refresh backup with changed context/revision, fail midway, then promote or restore prior snapshot | One designated backup; prior prescription recoverable; current-plan swap atomic; DB |
| T-P10 | R-P08 | Blend P1/P2, then mutate source during preview; attempt blend with P3 | New draft only, fresh sources required, unauthorized source denied, originals unchanged; DB/API |
| T-P11 | R-P09 | Switch C1→C2 with reversed fetch and generation completion order; return stale save result | No C1 text/result in C2; navigation retains correct draft or asks to defer; component/E2E |
| T-P12 | R-P10 | Desktop/mobile workflow with keyboard, screen reader, 200% zoom, reduced motion and offline-device state | No clipped content/hidden actions; 44px targets; responsive/accessibility |
| T-P13 | R-P02,R-P03 | NaN, Infinity, negative/rest overflow, zero duration, numeric strings, invalid enums and oversized arrays | 422/413 with fields, zero partial write or silent truncation; contract/fuzz |
| T-O01 | R-O01 | Seed legacy plan shapes; expand schema; create V2; roll flag back; read legacy and V2 | Existing plans usable; V2 read-only if unsupported; no dropped columns; migration |
| T-O02 | R-O01,R-P07 | Restore snapshots and database backup into new disposable database; compare semantic hashes and dependencies | No restore over production; real restore evidence |
| T-O03 | R-O01,R-P10 | Benchmark synthetic 1k-exercise catalog, 52-week plan and 25 concurrent authorized jobs | Meet budgets in 05, no uncapped result/queue growth; performance |
| T-O04 | R-O01,R-A05 | Kill new gateway flags while job/save in flight; inspect all logs and retained caches | No raw prompts/PII, bounded fail-closed state, truthful saved outcome; operations |

## Traceability and slice gates

| Requirement | Main artifact/component | Tests | Slice |
|---|---|---|---|
| R-A01 | 02 grant/permission matrix, capability adapter | T-A01,T-A02 | A1 |
| R-A02 | 02 MCP interface, compatibility receipt | T-A03 | A2 |
| R-A03 | 02 managed local profile and routing contract | T-A04 | A2/A3 |
| R-A04 | 02 proposal envelope, existing mutation/lifecycle | T-A05,T-A06 | A2 |
| R-A05 | 02 privacy/OAuth boundary | T-A02,T-A04,T-A06,T-A10,T-O04 | A1/A2 |
| R-A06 | 02 device/job model, My agents wireframe | T-A07,T-A08 | A3 |
| R-A07 | 02 consulting onboarding | T-A09 | A4 |
| R-P01 | 03 Session/Progression; existing request builder | T-P01,T-P02 | P1 |
| R-P02 | 03 Programming, constraint pipeline | T-P03,T-P04,T-P13 | P2 |
| R-P03 | 03 typed prescription, planData/PDF/logger | T-P05,T-P13 | P3 |
| R-P04 | 03 Rolodex; canonical library adapters | T-P06 | P2/P3 |
| R-P05 | 03 horizon editor and Plan vs Actual | T-P04,T-P07 | P3 |
| R-P06 | 03 plan library, revision and derivative handling | T-P08 | P4 |
| R-P07 | 03 backup compare/history; current backup service | T-P09,T-O02 | P4 |
| R-P08 | 03 blend preview; existing blend service | T-P10 | P4 |
| R-P09 | 02/03 task identity, optimistic concurrency | T-A05,T-A08,T-P08,T-P11 | all |
| R-P10 | wireframes + 03 states | T-W01,T-P12,T-O03 | every UI slice |
| R-O01 | 05 operations, preservation and compatibility | T-B01,T-B02,T-L01,T-O01,T-O02,T-O03,T-O04 | every release |

No uncovered requirement is hidden by a coverage percentage. Only T-B01/T-B02
exercise current behavior; T-P01/T-P02 demonstrate two missing desired behaviors.
All remaining gates need executable implementation tests and actual boundary
evidence. The local mock baseline cannot certify local egress, OAuth, tenant
isolation, database rollback or real devices.

T-W01 is a wireframe check only. Full screen-reader, 200% browser zoom, live
mobile journeys and runtime state behavior remain T-P12 NOT RUN. Native checkbox
glyphs are 20px inside clickable labels measured at 44px minimum height.
Prototype buttons/fields and horizontal extent were checked across all widths.
The first pass found narrow mobile Edit buttons and a Mermaid sequence parsing
error; both were corrected before the final artifact checks. Mobbin browsing
was unavailable through the active tools; no external design review is claimed.


## September 7–8 v2 addendum

The canonical direction is Training Studio with optional Program Map. Read 08-design-synthesis.md for the governing visual decisions, 09-model-connections-and-budgets.md for default Coach/personal OpenRouter/local policy and durable spending controls, and 10-coach-privacy-audit.md for current-source privacy gaps and release prerequisites. Earlier baseline results remain dated historical evidence. This pass changes the blueprint and synthetic preview only.


## V2 executed checks and new acceptance gates

Run node preview-qa.mjs for the synthetic interface. The runner imports bundled Playwright and uses installed Brave; update explicit runtime paths on another host. External browser requests are aborted. Ten checks passed: eight workflows, eight rendered Mermaid diagrams as one check, eight state wireframes as one check; twelve viewport sizes also passed. CSS 200% reflow is not native browser zoom certification.

Run node --experimental-vm-modules privacy-reproduce.mjs with SWAN_AUDIT_ROOT set to the exact reviewed checkout. Five gap reproductions passed their reproduction assertions, meaning present source permits the undesirable behavior. Actual source is evaluated unmodified with dependency fakes. No app server, dotenv, real database or provider is used.

| Requirement | Acceptance test | Component / slice | Evidence and gap |
|---|---|---|---|
| R-B01 | T-CON01 owner/default flow | My connections / C1 | Preview PASS; real auth NOT RUN |
| R-B02 | T-CON02 PKCE replay, wrong session, rotation, encrypted storage | connection controller / C2 | NOT RUN |
| R-B03 | T-CON03 105 calls, two tabs/workers, duplicate IDs, reset race, child budget | ledger / C3 | Browser demonstration PASS; real DB concurrency NOT RUN |
| R-B04 | T-CON04 unknown price/allowance, provider errors, timeouts before/after acceptance | broker / C3 | Unknown allowance preview PASS; real receipt reconciliation NOT RUN |
| R-B05 | T-CON05 final-envelope canaries, child/unknown age, privacy errors, all modalities | shared policy / C0/C1 | Five source gaps REPRODUCED; privacy acceptance NOT RUN; release blocked |
| R-B06 | T-CON06 local model/speech/embedding failure produces zero cloud calls | companion / C4 | NOT RUN; pairing illustrative |
| R-B07 | T-CON07 roles, ownership, demotion, revocation, assignment race | authorization / C0 | Source findings; real auth+DB NOT RUN |
| R-B08 | T-CON08 row diff, stale proposal, lock, multiweek state, backups | Planner / P2 | Preview PASS; app E2E NOT RUN |

Future fixtures: isolated adult/child/unknown-age subjects; user/client/trainer/admin/unknown actors; active/disabled/withdrawn/absent profiles; old/new waiver grants; unrelated accounts/payers; same and changed idempotency payloads; provider accepts-but-response-lost; external key usage; malformed/oversized price/model/tool payloads. Forbidden effects: unauthorized context query or external request, duplicate charge admission, client/payer swap, automatic limit increase, destructive blend/restore.

Historical September 6 frontend/backend and expected RED results remain intact. Do not count these as fresh v2 app runs. The real runtime gates in 09/10 remain requirements, not passing test claims.
