# CURRENT TASK - SINGLE SOURCE OF TRUTH

**Last Updated:** 2026-02-28
**Updated By:** Claude Code (Opus 4.6)

---

## ACTIVE: Phase 10 — Production Monitoring Dashboard COMPLETE (2026-02-28)

**Status:** Phase 10 COMPLETE. Persistent DB-backed monitoring, service extraction, threshold-based alerting, eval/drift/AB integration, 12 API endpoints, ~63 new tests, all passing.

### What Phase 10 Does

Replaces volatile in-memory AI monitoring with persistent DB-backed metrics, a service extraction layer, and a threshold-based alerting engine:

- **Persistent metrics:** Pre-aggregated hourly/daily buckets via raw SQL UPSERT (atomic, concurrency-safe)
- **Separate user tracking:** `ai_metrics_bucket_users` table with UNIQUE constraint (no JSONB bloat)
- **Dynamic feature registry:** `updateMetrics` auto-creates feature entries on first call (fixes `longHorizonGeneration` gap)
- **Feature name guard:** Validates `^[a-zA-Z][a-zA-Z0-9_]*$`, max 50 chars (prevents unbounded cardinality)
- **Alert engine:** 5 configurable thresholds with auto-resolution (high/elevated error rate, high/critical latency, token budget)
- **Eval/drift/AB integration:** Read-only from disk files (no subprocess execution)
- **getDriftStatus 60s cache:** TTL-based in-memory cache for dashboard polling
- **adminOnly middleware:** Standard RBAC pattern replaces inline role check
- **Backward compatible:** `updateMetrics` re-exported from routes file, all 3 callers + 3 test mocks unchanged

### Phase 10 Verification Evidence

| Gate | Result |
|------|--------|
| `cd backend && npm test` | 1374/1374 tests, 54 files (~63 new Phase 10 tests) |
| `cd backend && npm run eval` | Exit code 0 — 53 total, 49/49 gated passed, 4 known gaps, 0 correctness failures |
| `cd backend && npm run eval:drift` | Exit code 0 — `drifted: false`, 0 changes |
| Backward compat | 3 callers still import `updateMetrics` from `aiMonitoringRoutes.mjs` |
| Test mock compat | workoutControllerEligibility, longHorizonApproval, aiPrivacyIntegration tests pass |
| Feature name guard | Rejects empty, >50 chars, special chars (unit tested) |
| getDriftStatus cache | Returns same result within 60s window (unit tested) |

### Phase 10 New Files (8)

| File | Description |
|------|-------------|
| `backend/models/AiMetricsBucket.mjs` | Pre-aggregated hourly/daily metrics model |
| `backend/models/AiMonitoringAlert.mjs` | Alert model with active/resolved/acknowledged lifecycle |
| `backend/migrations/20260228000001-create-ai-metrics-buckets.cjs` | Migration: ai_metrics_buckets + ai_metrics_bucket_users tables |
| `backend/migrations/20260228000002-create-ai-monitoring-alerts.cjs` | Migration: ai_monitoring_alerts table |
| `backend/services/monitoring/monitoringService.mjs` | Core service: updateMetrics, bucket persistence, trends, eval/drift/AB integration (~300 lines) |
| `backend/services/monitoring/alertEngine.mjs` | Threshold evaluation, alert CRUD, auto-resolution (~180 lines) |
| `backend/tests/unit/monitoringService.test.mjs` | 25 unit tests |
| `backend/tests/unit/alertEngine.test.mjs` | 23 unit tests |

### Phase 10 Modified Files (6)

| File | Change |
|------|--------|
| `backend/routes/aiMonitoringRoutes.mjs` | Rewritten: 364→~150 lines, thin wrapper delegating to service, re-exports updateMetrics |
| `backend/models/associations.mjs` | Import + register AiMetricsBucket, AiMonitoringAlert |
| `backend/models/index.mjs` | Add getter exports: getAiMetricsBucket, getAiMonitoringAlert |
| `backend/eval/ab/runAb.mjs` | Added `--write-json` flag for `docs/qa/PROVIDER-AB-RESULTS.json` |
| `backend/package.json` | Added `provider:ab:json`, `migrate:status:dev` scripts |
| `docs/monitoring/RENDER-MONITORING-SETUP.md` | Grafana/Render integration guide |

### Phase 10 Test Files (3)

| File | Tests |
|------|-------|
| `backend/tests/unit/monitoringService.test.mjs` | 25: feature validation (5), updateMetrics (8), getMetricsSnapshot (5), getSystemHealth (5), resetMetrics (2), truncation (2), eval/drift/AB (3) |
| `backend/tests/unit/alertEngine.test.mjs` | 23: evaluateThresholds (13), persistAlerts (3), getActiveAlerts (2), acknowledgeAlert (2), resolveAlert (2), thresholds (1) |
| `backend/tests/api/aiMonitoringApi.test.mjs` | 20: GET metrics (3), GET trends (3), GET health (1), POST reset (3), GET alerts (2), POST acknowledge/resolve (2), GET eval/drift/ab (3), GET providers/digest (2), re-export (1) |

### Phase 10 API Endpoints (12 total, 8 new)

| Method | Path | Auth | Status |
|--------|------|------|--------|
| GET | `/api/ai-monitoring/metrics` | authMiddleware | Existing |
| GET | `/api/ai-monitoring/trends/:feature` | authMiddleware | Existing |
| GET | `/api/ai-monitoring/health` | authMiddleware | Existing |
| POST | `/api/ai-monitoring/reset` | adminOnly | Existing (now uses RBAC middleware) |
| GET | `/api/ai-monitoring/alerts` | adminOnly | **NEW** |
| POST | `/api/ai-monitoring/alerts/:id/acknowledge` | adminOnly | **NEW** |
| POST | `/api/ai-monitoring/alerts/:id/resolve` | adminOnly | **NEW** |
| GET | `/api/ai-monitoring/eval-status` | adminOnly | **NEW** |
| GET | `/api/ai-monitoring/drift-status` | adminOnly | **NEW** |
| GET | `/api/ai-monitoring/ab-status` | adminOnly | **NEW** |
| GET | `/api/ai-monitoring/providers` | adminOnly | **NEW** |
| GET | `/api/ai-monitoring/digest` | adminOnly | **NEW** |

---

## PREVIOUS: Phase 9 — Expanded Dataset & Drift Detection COMPLETE (2026-02-28)

**Status:** Phase 9 COMPLETE. Golden dataset expanded 27→53 scenarios, drift detection module with baseline snapshots, 3 new CLI flags, 25 new tests, all passing.

### What Phase 9 Does

Strengthens regression sensitivity with nearly double the golden scenarios and adds drift detection to surface changes against a saved baseline:

- **Dataset expansion:** 27→53 golden scenarios across all 7 categories (DATASET_VERSION 2.0.0)
- **Drift detection:** `compareDrift(current, baseline)` compares eval results against saved baseline, classifying changes as REGRESSION/IMPROVEMENT/CHANGE
- **Volatile field exclusion:** `timestamp` and `durationMs` excluded from comparison (vary per run)
- **CLI flags:** `--write-baseline`, `--drift`, `--fail-on-drift` (all backward-compatible)
- **npm scripts:** `eval:baseline`, `eval:drift`, `eval:drift:strict`
- **`npm run eval` unchanged** — CI gate works exactly as before

### Phase 9 Verification Evidence

| Gate | Result |
|------|--------|
| `cd backend && npm run eval` | Exit code 0 — 53 total, 49/49 gated passed, 4 known gaps, 0 correctness failures |
| `cd backend && npm run eval:baseline` | Baseline written to `docs/qa/AI-PLANNING-VALIDATION-BASELINE.json` |
| `cd backend && npm run eval:drift` | Exit code 0 — `drifted: false`, 0 changes, 0 warnings |
| `cd backend && npm run eval:drift:strict` | Exit code 0 — no regressions detected |
| `cd backend && npm test` | 1301/1301 tests, 51 files (25 new Phase 9 tests) |
| `cd frontend && npm run build` | Clean build (no frontend changes) |
| Dataset count | 53 scenarios, 4 knownGaps (up from 2) |
| DATASET_VERSION | 2.0.0 |

### Phase 9 New Scenarios (26 added)

| Category | Before | After | New IDs |
|----------|--------|-------|---------|
| schema_valid | 4 | 8 | 05-08 (6-month CES+OPT, maximal, minimal, GENERAL) |
| pii_detection | 5 | 9 | 06-09 (phone dots, name in summary, multi-PII, subaddressing) |
| schema_invalid | 4 | 10 | 05-10 (boundary limits, long name, restPeriod, HTML, LH block) |
| contraindication | 5 | 8 | 06-08 (LH overflow, day overflow, block sequence) |
| scope_of_practice | 2 | 5 | 03-05 (GENERAL+optPhase, OPT+optPhase=0, invalid framework) |
| adversarial | 3 | 6 | 04-06 (parenthesized phone, SSN pattern, subdomain email) |
| warnings | 4 | 7 | 05-07 (20 exercises, 21 exercises, 8w block) |

### Phase 9 New Files (2)

| File | Description |
|------|-------------|
| `backend/eval/driftDetector.mjs` | `loadBaseline()` + `compareDrift()` — pure functions, ~110 lines |
| `docs/qa/AI-PLANNING-VALIDATION-BASELINE.json` | Baseline snapshot for drift detection |

### Phase 9 Modified Files (4)

| File | Change |
|------|--------|
| `backend/eval/goldenDataset.mjs` | 27→53 scenarios, DATASET_VERSION 1.1.0→2.0.0 |
| `backend/eval/evalReport.mjs` | Optional `drift` param in formatJsonReport, drift section in markdown |
| `backend/eval/runEval.mjs` | `--write-baseline`, `--drift`, `--fail-on-drift` CLI flags |
| `backend/package.json` | Added `eval:baseline`, `eval:drift`, `eval:drift:strict` scripts |

### Phase 9 Test Changes

| File | Change |
|------|--------|
| `backend/tests/unit/evalHarness.test.mjs` | 29→54 tests: scenario count updated, 10 spot-checks, 9 drift unit, 3 drift integration, 3 report drift support |

---

## PREVIOUS: Phase 8 — CI Gate Integration COMPLETE (2026-02-28)

**Status:** Phase 8 COMPLETE. GitHub Actions workflow gates PRs on `npm run eval`. Deterministic, no-network, no API keys needed.

### What Phase 8 Does

Blocks merges when AI validation regresses. The `ai-eval-gate.yml` workflow runs on every PR to `main` and every push to `main`:

- **Eval Harness (Phase 6):** `npm run eval` — 53 golden scenarios, two-gate design (correctness + thresholds)
- Deterministic and offline — no live API keys required
- Artifact `ai-eval-report.json` uploaded on every run (pass or fail, 30-day retention)
- Job fails if eval exits non-zero, blocking merge

### Phase 8 Verification Evidence

| Gate | Result |
|------|--------|
| `cd backend && npm run eval` | Exit code 0 — 53 total, 49/49 gated passed, 4 known gaps, 0 correctness failures |
| `cd backend && npm run provider:ab` | Exit code 0 — 32 attempts, 4 providers, 8 scenarios (non-gating sanity check) |
| `cd backend && npm test` | 1301/1301 tests, 51 files (no regressions) |
| YAML structure | `ai-eval-gate.yml` — 42 lines, triggers on push+PR to main |
| Artifact path | `ai-eval-report.json` at repo root, 30-day retention |
| No API keys needed | Workflow uses `npm ci` + `npm run eval` only |
| Doc paths exist | `docs/qa/CI-EVAL-GATE.md`, `docs/deployment/RENDER-AI-API-SETUP.md` |

### Phase 8 New Files (3)

| File | Description |
|------|-------------|
| `.github/workflows/ai-eval-gate.yml` | GitHub Actions workflow — eval gate on PR/push to main |
| `docs/qa/CI-EVAL-GATE.md` | Gate documentation: triggers, failure modes, local verification |
| `docs/deployment/RENDER-AI-API-SETUP.md` | Provider API key setup guide for Render |

### Phase 8 Modified Files (1)

| File | Change |
|------|--------|
| `docs/ai-workflow/AI-HANDOFF/CURRENT-TASK.md` | Phase 8 status |

---

## PREVIOUS: Phase 7 — Provider A/B & Cost Tracker COMPLETE (2026-02-28)

**Status:** Phase 7 COMPLETE. Provider benchmarking with mock adapters, cost tracking, latency percentiles, 46 new tests, all passing.

### What Phase 7 Does

Deterministic side-by-side provider benchmarking (OpenAI, Anthropic, Gemini, Venice) with per-attempt metrics, per-provider aggregation, latency percentiles (p50/p95/p99), cost estimation, and provider ranking. Default mode uses mock adapters — no network calls. `--live` mode is opt-in.

- **No network calls** — mock adapter factory creates deterministic adapter-shaped objects
- **Pure-math cost tracker** — `normalizeAttemptMetrics`, `computePercentile`, `aggregateProviderMetrics`, `rankProviders`
- **Ranking algorithm:** successRate desc → p95LatencyMs asc → avgCostUsd asc → provider name asc
- **Live-mode contract:** unconfigured providers get deterministic PROVIDER_AUTH failures (never skip, never hard-fail)
- **JSON serialization safe:** all metrics are `null` (not `Infinity`) when data is unavailable

### Phase 7 Verification Evidence

| Gate | Result |
|------|--------|
| `cd backend && npm test` | 1275/1275 tests, 51 files (46 new Phase 7 tests) |
| `cd backend && npm run eval` | Exit code 0 (Phase 6 non-regression) |
| `cd backend && npm run provider:ab` | Exit code 0, valid JSON to stdout |
| `cd backend && npm run provider:ab:report` | Exit code 0, JSON + markdown written |
| Report: providers ranked | 4 (anthropic, venice, gemini, openai) |
| Report: scenarios | 8 |
| Report: attempts | 32 (8 scenarios × 4 providers) |
| Report: cheapest | gemini |
| Report: fastest | gemini |
| Report: most reliable | anthropic |
| `cd frontend && npm run build` | Clean build (no frontend changes) |

### Phase 7 New Files (7)

| File | Description |
|------|-------------|
| `backend/services/ai/providerCostTracker.mjs` | Pure-math: normalize, aggregate, percentile, rank |
| `backend/eval/ab/mockAdapterFactory.mjs` | Mock adapter factory for deterministic testing |
| `backend/eval/ab/abDataset.mjs` | 8 synthetic prompt scenarios with mock configs |
| `backend/eval/ab/abRunner.mjs` | A/B suite runner + `computeAbExitCode()` |
| `backend/eval/ab/abReport.mjs` | JSON + Markdown report formatters |
| `backend/eval/ab/runAb.mjs` | CLI entry point (`--providers`, `--iterations`, `--write-md`, `--live`) |
| `docs/qa/PROVIDER-AB-RESULTS.md` | Generated markdown report |

### Phase 7 Modified Files (2)

| File | Change |
|------|--------|
| `backend/services/ai/costConfig.mjs` | Added Venice `llama-3.3-70b` pricing |
| `backend/package.json` | Added `"provider:ab"` and `"provider:ab:report"` scripts |

### Phase 7 Test Files (2)

| File | Tests |
|------|-------|
| `backend/tests/unit/providerCostTracker.test.mjs` | 19 tests: normalizeAttemptMetrics (6), computePercentile (7), aggregateProviderMetrics (4), rankProviders (2) |
| `backend/tests/unit/providerAb.test.mjs` | 27 tests: Mock Adapter Factory (4), A/B Dataset (4), A/B Runner (8), computeAbExitCode (3), Live-mode unconfigured (3), Live-mode resolver (3), A/B Report (2) |

---

## PREVIOUS: Phase 6 — Evaluation Harness & Golden Dataset COMPLETE (2026-02-28)

**Status:** Phase 6 COMPLETE. 27 golden scenarios, eval harness with two-gate CI design, 29 unit tests, all passing.

### What Phase 6 Does

Deterministic, no-network eval harness that tests the AI validation pipeline (`runValidationPipeline`, `runLongHorizonValidationPipeline`, `detectPii`) against 27 synthetic scenarios. Produces JSON + Markdown reports suitable for CI gating.

- **No external API calls** — tests validators directly, not providers
- **Two-gate CI design:** Gate 1 (correctness) = any scenario mismatch is hard exit(1); Gate 2 (thresholds) = per-category pass rates
- **Known-gap handling:** 2 adversarial scenarios document validator limitations, excluded from threshold gating but correctness-checked
- **Runtime dataset guards:** Category validation, knownGap rationale validation, threshold coverage — all before any scenario runs

### Verification Evidence

| Gate | Result |
|------|--------|
| `cd backend && npm test` | 1227/1227 tests, 49 files (27 new eval harness tests) |
| `cd backend && npm run eval` | Exit code 0 |
| `cd backend && npm run eval:report` | Exit code 0, JSON + markdown generated |
| Report: total | 27 |
| Report: gated | 25 |
| Report: passed | 25 |
| Report: failed | 0 |
| Report: correctnessFailures | 0 |
| Report: knownGaps | 2 (adversarial_01, adversarial_03) |
| All category pass rates | 100% |
| Provenance | evalVersion=1.0.0, datasetVersion=1.1.0, promptVersion=1.0.0, ruleEngineVersion=1.0.0 |

### Phase 6 New Files (5)

| File | Description |
|------|-------------|
| `backend/eval/goldenDataset.mjs` | 27 synthetic scenarios across 7 categories |
| `backend/eval/evalRunner.mjs` | Core harness: `runEvalSuite()`, `computeExitCode()`, runtime validation guards |
| `backend/eval/evalThresholds.mjs` | 7 category thresholds + `checkThresholds()` with zero-gated warnings |
| `backend/eval/evalReport.mjs` | JSON + Markdown report formatters with provenance |
| `backend/eval/runEval.mjs` | CLI entry point (`--write-md` flag for dev mode) |

### Phase 6 Modified Files (1)

| File | Change |
|------|--------|
| `backend/package.json` | Added `"eval"` and `"eval:report"` scripts |

### Phase 6 Test File (1)

| File | Tests |
|------|-------|
| `backend/tests/unit/evalHarness.test.mjs` | 27 tests: dataset integrity (4), runner correctness (4), thresholds (2), reports (2), warnings (1), long-horizon (2), adversarial/knownGap (4), runtime guards (4), computeExitCode (2), warning propagation (2) |

### Phase 6 Scenario Categories

| Category | Scenarios | Gated | Purpose |
|----------|-----------|-------|---------|
| schema_valid | 4 | 4 | Valid plans that must pass all 3 stages |
| pii_detection | 5 | 5 | Must be rejected at PII stage |
| schema_invalid | 4 | 4 | Must fail at schema/parse stage |
| contraindication | 5 | 5 | Rule engine catches safety violations |
| scope_of_practice | 2 | 2 | Framework/phase rule violations |
| adversarial | 3 | 1 | PII evasion + malicious payloads (2 knownGap) |
| warnings | 4 | 4 | Valid plans that should produce warnings |

### Generated Report

- `docs/qa/AI-PLANNING-VALIDATION-RESULTS.md` — Full eval results with per-category breakdown, known gaps, and scenario-level results

---

## Phase 7-10 Execution Plan

| Phase | Name | Status |
|-------|------|--------|
| 7 | Provider A/B & Cost Tracker | COMPLETE |
| 8 | CI Gate Integration | COMPLETE |
| 9 | Expanded Dataset & Drift Detection | COMPLETE — 53 scenarios, drift detector, baseline snapshots |
| 10 | Production Monitoring Dashboard | COMPLETE — persistent DB metrics, alerting engine, 12 API endpoints, 63 new tests |
| 11 | TBD | Next |

---

## PREVIOUS: Smart Workout Logger - Phase 5C-D / 5C-E / 5W Complete (2026-02-26)

**Status:** Phases 5C-A through 5C-E + 5W-A through 5W-G implemented. All backend + frontend tests passing.

---

## PREVIOUS: Smart Workout Logger — Phase 5B Admin Surface Complete (2026-02-25)

**Status:** Phase 5B Admin Surface DEPLOYED + VERIFIED. Tests 100/100 frontend, all production smoke passing.

**What was done (Phase 5B — Coach Copilot Frontend Admin Surface):**

### Phase 5B New Files
1. **`frontend/src/services/aiWorkoutService.ts`** — Typed API layer: `createAiWorkoutService(authAxios)` factory with `listTemplates()`, `generateDraft(userId)`, `approveDraft(params)`. Discriminated union responses (`DraftSuccessResponse | DegradedResponse`), type guards (`isDegraded`, `isDraftSuccess`)
2. **`frontend/src/components/.../WorkoutCopilotPanel.tsx`** — Full Coach Copilot modal (1163 lines). State machine: `IDLE → GENERATING → DRAFT_REVIEW | DEGRADED | ERROR → APPROVING → SAVED | APPROVE_ERROR`. Galaxy-Swan themed, 44px touch targets, styled-components + lucide-react (zero MUI)
3. **`frontend/src/components/.../WorkoutCopilotPanel.test.tsx`** — 13 unit tests covering all state machine transitions

### Phase 5B Modified Files
4. **`frontend/src/components/.../ClientsManagementSection.tsx`** — Added "AI Copilot" menu item in client action dropdown, wired to `WorkoutCopilotPanel`
5. **`backend/controllers/userManagementController.mjs`** — Added `masterPromptJson` to admin user update whitelist
6. **`backend/models/AiPrivacyProfile.mjs`** — Fixed FK reference from `'users'` to `'Users'` (case-sensitive PostgreSQL)
7. **`backend/migrations/20260225000001-create-ai-privacy-profiles.cjs`** — Fixed FK reference for source consistency
8. **`backend/migrations/20260226000001-fix-ai-privacy-profiles-userid-fk.cjs`** — NEW: Runtime FK fix using `resolveUsersTable` helper

### Phase 5B Bug Fixes
| # | Severity | Finding | Fix | Commit |
|---|----------|---------|-----|--------|
| 1 | HIGH | `POST /api/ai/consent/grant` 500 — FK constraint referenced `"users"` (lowercase) but table is `"Users"` | New migration drops/recreates FK with `resolveUsersTable` helper | `64529de3` |
| 2 | MEDIUM | Admin user update silently ignored `masterPromptJson` | Added field to destructured whitelist in `userManagementController.mjs` | `0692fb18` |
| 3 | LOW | De-identification 400 with flat JSON structure | Documented: requires `training`, `client.goals`, `measurements` nesting | N/A (data fix) |

### Phase 5B Verification Evidence
**Production smoke (live on sswanstudios.com):**
- [x] IDLE state with template catalog — `phase5b-idle-with-templates.png`
- [x] Consent error (before grant) — `phase5b-consent-error.png`
- [x] Consent grant 200 (after FK fix) — verified via API
- [x] Degraded mode (no AI provider keys) — `phase5b-degraded-mode.png`
- [ ] Draft review + explainability — **blocked: no AI API keys configured** (covered by unit tests)
- [ ] Approve success — **blocked: no AI API keys configured** (covered by unit tests)

**Frontend unit tests (13 cases, mocked API):**
- IDLE renders template catalog from `listTemplates()`
- Generate → DRAFT_REVIEW renders explainability, safety constraints, warnings, missing inputs
- Generate → DRAFT_REVIEW renders plan days with exercise count
- Generate → DEGRADED renders fallback suggestions and failure reasons
- Generate → consent error renders corrected client-side wording
- Approve → SAVED state with plan ID, toast notification, `onSuccess` callback
- Approve → SAVED displays unmatched exercises when present
- Double-submit prevention: generate button gone during generation
- Double-submit prevention: approve button disabled + "Saving..." during approval
- Double-submit prevention: single `generateDraft` call on rapid clicks
- Retryable errors show Retry button (`AI_RATE_LIMITED`)

### Phase 5B Commits
- `13d583cf` — feat(copilot): Phase 5B Coach Copilot admin surface
- `b8b8bc4b` — fix(copilot): add missing aiWorkoutService.ts
- `d1daa67b` — debug(consent): temporary diagnostic detail
- `64529de3` — fix(consent): FK references lowercase "users" instead of "Users" table
- `0692fb18` — fix(admin): allow masterPromptJson in admin user update
- `2de978a9` — test(copilot): add WorkoutCopilotPanel unit tests (13 cases)

### Phase 5B.1 Trainer Surface Reuse (2026-02-25)

**Status:** COMPLETE. Trainer copilot wired, assignment 403 classified, all tests passing.

**What was done:**
1. **Backend:** Added `code: 'AI_ASSIGNMENT_DENIED'` to both generation (line 291) and approval (line 857) trainer-assignment 403 responses in `aiWorkoutController.mjs`
2. **Frontend panel:** Added `isAssignmentError` classification + distinct info panel ("not currently assigned to this client") in `WorkoutCopilotPanel.tsx`
3. **Trainer UI:** Wired `WorkoutCopilotPanel` into `MyClientsView.tsx` — Sparkles button in client action row, same component/service/state machine as admin
4. **Backend tests:** Extended test #22 to assert `code: 'AI_ASSIGNMENT_DENIED'`, added test #32 for generation path, updated integration test assertion
5. **Frontend tests:** 2 new tests — assignment 403 renders specific wording + is distinct from consent error

**Test results:** 824/824 backend, 102/102 frontend, build clean

**Files changed:**
- `backend/controllers/aiWorkoutController.mjs` — 2 lines (code field added)
- `backend/tests/unit/aiWorkoutApproval.test.mjs` — extended + 1 new test
- `backend/tests/api/aiPrivacyIntegration.test.mjs` — updated assertion
- `frontend/src/components/.../WorkoutCopilotPanel.tsx` — assignment error classification + panel
- `frontend/src/components/.../WorkoutCopilotPanel.test.tsx` — 2 new tests
- `frontend/src/components/TrainerDashboard/ClientManagement/MyClientsView.tsx` — copilot wiring

### Phase 5B Remaining Items
- **Optional:** Configure one AI provider key in Render to capture remaining 2 production screenshots (draft review, approve success)
- **Optional:** Manual smoke with trainer account (assigned + unassigned paths)

### Next-Phase Planning Source
- **V5 Unified Plan (core):** `AI-Village-Documentation/SMART-WORKOUT-LOGGER-UNIFIED-V5-PLAN.md` (180 lines)
- **V5 Unified Plan (appendix):** `AI-Village-Documentation/SMART-WORKOUT-LOGGER-UNIFIED-V5-PLAN-APPENDIX.md` (detailed 5C/5D/5E scope, Claude prompt)
- **Phase 5C Contract (core):** `docs/ai-workflow/blueprints/PHASE-5C-LONG-HORIZON-PLANNING-CONTRACT.md` (385 lines)
- **Phase 5C Contract (appendix):** `docs/ai-workflow/blueprints/PHASE-5C-LONG-HORIZON-PLANNING-CONTRACT-APPENDIX.md` (JSON examples, tests, UI details)
- **Security Protocol:** `AI-Village-Documentation/AI-VILLAGE-MASTER-ONBOARDING-PROMPT-V5.md`
- **Next phase:** Phase 5C (Long-Horizon Planning Engine, NASM Protocol-First)
- **Phase 5C status:** Blueprint DRAFTED + doc cleanup applied — awaiting 5-Brain review before implementation
- **Execution model:** 4 AI agents (Claude/Roo/ChatGPT/Gemini) + human coordinator = 5-Brain Protocol
- **Open decisions:** Coach sandbox scope, Venice priority, persistence depth (MVP = plan + blocks only), STT provider policy

---

## PREVIOUS: Smart Workout Logger — Phase 5A Complete (2026-02-25)

**Status:** Phase 5A DEPLOYED + VERIFIED. Commit `beb2f48c`, 823/823 tests, 6/6 production smoke tests. Ordering confirmed live.

**What was done (Phase 5A — Smart Workout Logger MVP Coach Copilot):**

### Phase 5A New Files
1. **`backend/services/ai/oneRepMax.mjs`** — NASM-aligned 1RM estimation (Epley), load recommendations by OPT phase, RPE↔intensity conversion
2. **`backend/services/ai/progressContextBuilder.mjs`** — PII-free training history summarizer (exercise history, volume trends, frequency, recency)
3. **`backend/services/ai/contextBuilder.mjs`** — Unified AI context builder merging de-identified profile + NASM constraints + template + progress + 1RM data. Produces generation modes: `full`, `template_guided`, `progress_aware`, `basic`, `unavailable`
4. **`backend/tests/unit/oneRepMax.test.mjs`** — 22 tests
5. **`backend/tests/unit/progressContextBuilder.test.mjs`** — 20 tests
6. **`backend/tests/unit/contextBuilder.test.mjs`** — 22 tests
7. **`backend/tests/unit/phase5aIntegration.test.mjs`** — 8 integration tests (full pipeline, privacy regression, safety constraints, draft contract)
8. **`backend/tests/unit/aiWorkoutApproval.test.mjs`** — 31 tests (16 validator + 15 controller with mocked models)

### Phase 5A Modified Files
9. **`backend/controllers/aiWorkoutController.mjs`** — Extended `generateWorkoutPlan` with progress context + draft mode + explainability. Added `approveDraftPlan` with hardened security ordering
10. **`backend/routes/aiRoutes.mjs`** — Added `POST /api/ai/workout-generation/approve`
11. **`backend/services/ai/outputValidator.mjs`** — Added `validateApprovedDraftPlan()` last-mile gate

### Phase 5A Security Hardening (2 review rounds)
| # | Severity | Finding | Fix |
|---|----------|---------|-----|
| 1 | HIGH | `/approve` lacked trainer-assignment RBAC | Added `ClientTrainerAssignment` check (admin bypasses) |
| 2 | HIGH | `/approve` bypassed consent re-check | Added `AiPrivacyProfile` consent verification |
| 3 | HIGH | `AiInteractionLog` wrote nonexistent `metadata` field | Changed to `tokenUsage` JSONB merge with approval provenance |
| 4 | MEDIUM | Validation ran before authz (ordering leak) | Reordered: auth → role → input → user existence → assignment → consent → validation |
| 5 | MEDIUM | No target user existence check | Added `User.findByPk` with 404 |
| 6 | MEDIUM | Test coverage overstated (only 6 controller tests) | Expanded to 31 tests: assignment 403, consent 403, user 404, admin bypass, ordering precedence |

### Phase 5A Test Summary
- **823/823 tests passing across 38 files** (zero regressions)
- Approval controller tests prove: authz errors take precedence over validation errors (ordering verification)

### Phase 5A Approval Endpoint Security Ordering
```
1. Auth (401) → 2. Role trainer/admin (403) → 3. Input presence (400)
→ 4. User exists (404) → 5. Trainer assigned (403) → 6. Consent active (403)
→ 7. Draft validation (422) → 8. Persist in transaction → 9. Audit log
```

### Phase 5A Production Deploy Checklist
- [x] Push to main for Render deploy (`beb2f48c`)
- [x] Smoke: draft generation → 403 (consent gate active)
- [x] Smoke: approve nonexistent user → 404
- [x] Smoke: approve unassigned trainer → 404 (user-existence fires first, ordering correct)
- [x] Smoke: approve invalid draft → 403 (consent fires before validation, ordering correct)
- [x] Smoke: approve no auth → 401

**Smoke note:** Tests confirm ordering precedence (earlier gates fire before later ones). Full branch coverage (assignment 403, live 422) requires assigned trainer + consented client — covered by unit tests, not prod smoke.

---

## PREVIOUS: Smart Workout Logger — Phase 1 Closeout (2026-02-24)

**Status:** Phase 1 COMPLETE (2 review rounds, all findings resolved).

**What was done (Phase 0 → Phase 1 → Hardening → Closeout → Closeout R2):**
- **Phase 0 (Baseline Audit):** Comprehensive code audit of AI workout generation pipeline, privacy services, NASM integration. Playwright evidence (14 unauthenticated + 8 authenticated captures).
- **Phase 1 (Privacy Foundation):** End-to-end de-identification pipeline for AI workout generation.
- **Phase 1 Hardening:** Fixed 2 HIGH + 3 MEDIUM findings from cross-AI review.
- **Phase 1 Closeout:** Consent UI, onboarding integration, backend polish, backfill script.
- **Phase 1 Closeout R2:** Fixed 2 HIGH + 1 MEDIUM from second cross-AI review (routing, API service, admin guard).

**Phase 1 complete deliverables:**

### Backend (Privacy Infrastructure)
1. **Models + Migrations:**
   - `backend/models/AiPrivacyProfile.mjs` — per-user AI consent state
   - `backend/models/AiInteractionLog.mjs` — audit trail
   - `backend/migrations/20260225000001-create-ai-privacy-profiles.cjs`
   - `backend/migrations/20260225000002-create-ai-interaction-logs.cjs`
2. **De-identification Service:**
   - `backend/services/deIdentificationService.mjs` — strips PII, preserves training context, fail-closed
3. **Kill Switch Middleware:**
   - `backend/middleware/aiConsent.mjs` — `aiKillSwitch` (env toggle → 503)
4. **Controller Wiring:**
   - `backend/controllers/aiWorkoutController.mjs` — de-identified payload, server-derived constraints only, RBAC-before-consent, audit log lifecycle
5. **Consent Management Controller (with closeout polish):**
   - `backend/controllers/aiConsentController.mjs` — grant/withdraw/read endpoints
   - **[CLOSEOUT]** Target user existence validation (404 for non-existent users)
   - **[CLOSEOUT]** Role validation (400 for non-client targets on grant)
   - **[CLOSEOUT]** consentVersion validation against whitelist
   - **[CLOSEOUT]** JSDoc for `resolveTargetUser` route semantics
6. **Route Wiring:**
   - `backend/routes/aiRoutes.mjs` — workout + consent routes
7. **Model Registration:**
   - `backend/models/associations.mjs` + `backend/models/index.mjs`

### Frontend (Consent UX)
8. **AI Consent Service:**
   - `frontend/src/services/aiConsentService.ts` — typed API layer for consent endpoints
   - **[CLOSEOUT R2]** Uses production `apiService` (token refresh, auth headers, correct base URL)
9. **AI Consent Panel (active client dashboard):**
   - `frontend/src/components/ClientDashboard/AiConsentPanel.tsx` — embeddable consent panel
   - Full consent management: status display, grant/withdraw with confirmation, privacy disclosures
   - Galaxy-Swan themed, 44px touch targets, accessible
   - **[CLOSEOUT R2]** Integrated into `AccountGalaxy` in `GalaxySections.tsx` (active client dashboard)
   - Placed between PersonalStarmap and Session History sections
10. **Legacy Consent Screen (inactive, kept for reference):**
    - `frontend/src/components/DashBoard/Pages/client-dashboard/AiConsentScreen.tsx`
    - Route-based page wired into `UniversalDashboardLayout.tsx` (admin-only route tree)
    - NOTE: Clients use `RevolutionaryClientDashboard` (section-based), not this route tree
11. **Onboarding Integration:**
    - `frontend/src/pages/onboarding/components/ConsentSection.tsx` — step 7 of 8 in wizard
    - Opt-in toggle with privacy disclosures, disclosure v1.0 text, skip-friendly UX
    - `ClientOnboardingWizard.tsx` — calls `grantConsent()` on successful self-submit if opted in (best-effort, non-blocking)
    - **[CLOSEOUT R2]** Admin override path (`onSubmit`) does NOT call self-consent grant (prevents admin granting consent to own account)

### Rollout
12. **Backfill Script:**
    - `backend/scripts/backfill-ai-consent-profiles.mjs`
    - **Policy: default deny / opt-in required**
    - Creates `AiPrivacyProfile` with `aiEnabled=false` for all existing clients without a profile
    - Supports `--dry-run` flag
    - New users prompted during onboarding step 7

### Tests
13. **Backend Tests:**
    - `backend/tests/api/aiPrivacy.test.mjs` — 43 unit tests
    - `backend/tests/api/aiPrivacyIntegration.test.mjs` — 24 integration tests (18 original + 6 closeout validation tests)
    - 474/474 total backend tests passing (25 test files, zero regressions)
14. **Frontend Build:**
    - Clean build in 7.5s, consent panel bundled into `RevolutionaryClientDashboard` chunk

**Closeout R1 findings addressed (1 MEDIUM, 2 LOW):**
| # | Severity | Finding | Fix |
|---|----------|---------|-----|
| 1 | MEDIUM | grant/withdraw/status don't validate target user existence | 404 for non-existent users, 400 for non-client role on grant |
| 2 | LOW | consentVersion not validated at controller level | Whitelist validation against `VALID_CONSENT_VERSIONS` |
| 3 | LOW | Consent status route semantics ambiguous for non-client self | JSDoc on `resolveTargetUser` explaining role-based behavior |

**Closeout R2 findings addressed (2 HIGH, 1 MEDIUM):**
| # | Severity | Finding | Fix |
|---|----------|---------|-----|
| 4 | HIGH | AiConsentScreen wired into admin-only route tree (`UniversalDashboardLayout`), unreachable by clients | Created `AiConsentPanel.tsx`, integrated into `AccountGalaxy` in active `RevolutionaryClientDashboard` |
| 5 | HIGH | `aiConsentService.ts` bypassed production API client (raw fetch + localhost fallback) | Rewritten to use production `apiService` with token refresh and auth headers |
| 6 | MEDIUM | Admin onboarding silently calls `grantConsent()` for admin's own account | Guarded: only self-submit path calls consent grant; admin override path skips it |

**Production deploy checklist:**
- [ ] Run migrations: `npx sequelize-cli db:migrate`
- [ ] Run backfill (dry-run first): `node backend/scripts/backfill-ai-consent-profiles.mjs --dry-run`
- [ ] Run backfill: `node backend/scripts/backfill-ai-consent-profiles.mjs`
- [ ] Push to main for Render deploy
- [ ] Smoke test: consent status → grant → AI generate → withdraw → AI blocked

**Remaining items (not blocking closeout):**
- Additional PII fields may need review (foodAllergies, age combined with measurements)
- Admin consent management UI (currently API-only for admin role)

**Next steps (Phase 3 — Unified v4 Plan):**
- **Design proposal written:** `docs/ai-workflow/blueprints/PHASE-3-PROVIDER-ROUTER-DESIGN.md`
- **Status:** Awaiting cross-AI review + owner approval before implementation
- **Scope:** Provider abstraction (OpenAI/Anthropic/Gemini), failover chain, circuit breaker, degraded mode, Zod validation, rate limiting, audit integration
- **Estimated new files:** 14 (services, adapters, middleware, migration, tests)
- **Estimated modified files:** 5 (controller, routes, model, monitoring, package.json)
- **No frontend changes** — backend-only phase

---

## PREVIOUS: Homepage Cinematic Overhaul (2026-02-23)

**Status:** Implementation complete (Phases 0-4). Awaiting admin review in Design Lab.

**What was done:**
- Phase 0: Playwright baseline audit of production homepage at 3 viewports (375px, 768px, 1280px)
- Phase 1-4: Built complete cinematic redesign system with 3 design variants
  - **Variant A (Enchanted Apex):** Warm forest/gold/biolume palette, high motion
  - **Variant B (Crystalline Swan):** Sapphire/ice/gold palette, medium-high motion — RECOMMENDED
  - **Variant C (Hybrid Editorial):** Same palette as B, low motion, editorial restraint
- Admin Design Lab at `/dashboard/content/design` — portal-based chromeless preview
- 11 shared section components parameterized by design tokens
- Shared content model (`HomepageContent.ts`) extracted from production homepage
- Build passes cleanly, all new code in separate lazy-loaded chunks

**Files created:** 19 new files in `frontend/src/pages/HomePage/cinematic/` + 1 admin component
**Files modified:** 3 (`index.html`, `ContentWorkspace.tsx`, `UnifiedAdminRoutes.tsx`)
**Current homepage:** UNCHANGED — no visual or functional regression

**Next step:** Admin reviews variants in Design Lab. If approved, Phase 5 creates `HomePage.V3.component.tsx` with layout chrome suppression on `/` route.

**Documentation:**
- `docs/qa/HOMEPAGE-CINEMATIC-BASELINE-AUDIT.md` — pre-change screenshots + content map
- `docs/design/HOMEPAGE-CINEMATIC-VARIANTS-SPEC.md` — variant rationale + token differences
- `frontend/src/pages/HomePage/cinematic/ASSET-MANIFEST.md` — asset tracking

---

## CURRENT VISION SNAPSHOT (2026-02-22)

### Active Product Priorities
0. **NASM Admin Operations - Phase 1C Frontend UI & Gamification XP (COMPLETE - 2026-02-22)**
   - **What:** Admin frontend UI for onboarding/workout endpoints, gamification XP on workout log, Playwright E2E tests. All features deployed and verified on production via Playwright.
   - **Phase 1A (Data Layer) — committed `1052a977`:**
     - `Users.isOnboardingComplete`, `workout_logs` table, `WorkoutLog` model, associations
   - **Phase 1B (Controllers & Routes) — committed `57adee17` + bug fixes:**
     - `backend/controllers/adminOnboardingController.mjs` — save draft, submit, get status, reset
     - `backend/controllers/adminWorkoutLoggerController.mjs` — log workout, get history
     - `backend/utils/onboardingHelpers.mjs` — shared helpers extracted from client controller
     - `backend/utils/clientAccess.mjs` — RBAC guard (admin bypass, trainer assignment check)
     - `backend/routes/adminOnboardingRoutes.mjs` — 3 routes (POST/GET/DELETE)
     - `backend/routes/adminWorkoutLoggerRoutes.mjs` — 2 routes (POST/GET)
     - `backend/tests/api/phase1bControllers.test.mjs` — 28 tests
   - **Phase 1C (Frontend + XP + E2E) — committed `01827cf4` + production fix `d604e56b`:**
     - `backend/services/awardWorkoutXP.mjs` — XP service with triple guard (idempotency, day-level, same-day)
     - `backend/tests/api/phase1cXpIntegration.test.mjs` — 16 behavioral XP tests
     - `frontend/src/services/adminClientService.ts` — 6 new API methods (onboarding CRUD + workout log/history)
     - `frontend/src/pages/onboarding/ClientOnboardingWizard.tsx` — 5 new props (onSubmit, initialData, callbacks, skipSuccessModal)
     - `frontend/src/components/.../AdminOnboardingPanel.tsx` — Admin onboarding wrapper with loading gate + autosave
     - `frontend/src/components/.../WorkoutLoggerModal.tsx` — Workout logging form with dynamic exercises/sets + XP toast
     - `frontend/src/components/.../hooks/useClientActions.ts` — Extracted handlers (~90 lines out of monolith)
     - `frontend/src/components/.../AdminClientManagementView.tsx` — Menu items for legacy route
     - `frontend/src/components/.../ClientsManagementSection.tsx` — **CRITICAL:** Menu items wired into production Clients tab
     - `frontend/e2e/admin-onboarding-workout.spec.ts` — 12 Playwright E2E test specs
   - **Production bug fixed:** Phase 1C originally wired menu items to `AdminClientManagementView.tsx` but production dashboard uses `ClientsManagementSection.tsx` — fixed in `d604e56b`
   - **Production verification (Playwright on sswanstudios.com):**
     - Start Onboarding → Panel opens with 7-step wizard, draft data, status badge ✅
     - Log Workout → Modal opens with title/date/duration/intensity/exercises/sets ✅
     - All dashboard workspaces verified: Scheduling, Store & Revenue, Analytics, System, Content Studio, Gamification ✅
   - **371 backend tests pass, frontend build clean**

   **Key commits (Phases 1A-1C):**
   - `1052a977` — Phase 1A data layer
   - `57adee17` — Phase 1B controllers, routes, tests
   - `a48b519e` — Migration guard for missing workout_sessions table
   - `e856897a` — Fix toNumber null coercion + null-safe validators
   - `06522f63` — Fix model FK references (Users case-sensitivity)
   - `a2f87698` — Startup migration 6: post-sync FK repair
   - `01827cf4` — Phase 1C frontend UI, XP service, E2E tests (10 files, +2458/-95 lines)
   - `d604e56b` — Fix: wire Phase 1C menu items into production Clients tab

0. **Payment Recovery Flow (COMPLETE - 2026-02-21)**
   - **What:** Admin can apply offline payments (Cash/Venmo/Zelle/Check) directly from Session Detail Card when a client reaches 0 sessions. Auto-selects last purchased package. Creates full Order/Transaction/FinancialTransaction audit trail.
   - **Files:**
     - `backend/services/sessionDeductionService.mjs` — 5 exported functions (processSessionDeductions, getClientsNeedingPayment, applyPaymentCredits, getClientLastPackage, applyPackagePayment)
     - `backend/routes/sessionDeductionRoutes.mjs` — 5 endpoints under `/api/sessions/deductions/`
     - `frontend/src/components/UniversalMasterSchedule/ApplyPaymentModal.tsx` — Full modal with client selector, package picker, payment method input
     - `backend/tests/api/sessionDeduction.test.mjs` — 30 targeted unit tests
   - **Business-logic bugs fixed (5 audit rounds):**
     - CRITICAL: Sequelize eager-loading duplicate-object bug in batch deductions (grouping + atomic decrement)
     - HIGH: Race condition in concurrent `processSessionDeductions` calls (session row lock added)
     - HIGH: `applyPaymentCredits` used non-atomic read-modify-write (rewritten with transaction + row lock + increment)
     - HIGH: Role inconsistency (`'client'` vs `['client', 'user']`) across 3 functions
     - HIGH: Inactive package could be auto-applied
     - HIGH: error.message leakage in inner catch blocks
     - HIGH: No upper-bound on manual credit grants (capped at 500)
     - MEDIUM: Storefront API response parsing mismatch
     - MEDIUM: OrderItem.metadata double-JSON-encoded
     - MEDIUM: No input validation on route params → upgraded to `Number()` + `Number.isInteger()` (rejects "10abc")
     - MEDIUM: fetchLastPackage raced with packages loading state
     - MEDIUM: No idempotency guard on applyPackagePayment → added 60-second duplicate-order check
     - LOW: Stale closure in handleSelectClient
   - **Remaining known items (documented, not blocking):**
     - LOW: Preselected client silently fails if not in payment-needed list (UX polish, not data corruption)
     - INFO: Manual credit mode (`/apply-payment`) creates no Order/Transaction audit trail — package mode is the recommended path
     - INFO: Vite/Recharts chunk size warnings and React `fullWidth` DOM prop warning in test output are pre-existing framework noise, not regressions
   - **Verification status:**
     - 272 backend tests pass (17 files), 30 targeted session deduction tests
     - Frontend builds clean (6.32s), chunk size warnings are pre-existing
     - No CRITICAL or HIGH findings remain per Rule 8 audit checklist
     - Payment recovery files committed to VCS (abb4816b); unrelated working-tree changes remain

1. **Social & Gamification Integration (ACTIVE)**
   - ✅ **Social Profile Page:** Foundation complete (UserProfilePage, Routes, API).
   - ✅ **Challenges UI:** Wired to real API with mock fallback.
   - ✅ **Challenges Backend:** Fully polished (Commit 753664cb).
   - ✅ **Social Gamification:** Backend models & routes implemented (Commit 5db681ed).
   - ✅ **Database Migration:** Automated via `render-start.mjs` on deploy.
   - ✅ **Deploy Blocker Fixed:** Goal association alias collision resolved (`Goal.supporters` attribute vs association alias).
   - ✅ **Cart Resilience:** Implemented schema recovery and self-healing migrations for shopping cart.

2. **Admin Dashboard Stabilization (COMPLETE)**
   - ✅ **Demo Data Transparency:** Banners added for API failures/mock data.
   - ✅ **Navigation Fix:** Verified working.
   - ✅ **Role Promotion:** Script ready (`backend/scripts/promote-owners.mjs`).

3. **Schedule truthfulness and usability (COMPLETE)**
   - ✅ **UX Overhaul:** TimeWheelPicker, KPI cards, WCAG fixes (Commit 1e6138b5).
   - ✅ **Universal Master Schedule:** Complete refactor with WeekView, Admin Scope, and SearchableSelect.
   - ✅ **Data Integrity:** Fixed cancellation credit restoration and session stats.
   - ✅ **Visual Polish:** Migrated to GlowButton and Galaxy-Swan theme.
   - ✅ **Production Fix:** Resolved TDZ crash in admin view scope (Commit a712ba23).
   - ✅ **Verified Fixes:** Session creation (500), credit restoration logic, and touch targets (Commit d7e9b302).

4. **Auth recovery reliability (COMPLETE)**
   - ✅ **Code Complete:** Forgot/Reset flows verified on production.
   - ⚠️ **Configuration:** Pending `SENDGRID_API_KEY` in Render dashboard.

5. **Quality bar**
   - Accessibility, contrast, and mobile touch targets are required deliverables.
   - No regressions in auth, sessions, checkout, or RBAC.
   - ✅ **MUI Elimination (COMPLETE):**
     - ✅ **100% Migration:** All ~282 files migrated from MUI to Swan primitives.
     - ✅ **Final Push (Batches 26-38):** Migrated remaining 49 complex files (13 commits).
     - ✅ **Verification:** Zero `@mui/` imports remaining. Build passing.
   - 🔄 **User Dashboard Stabilization (ACTIVE):**
     - ✅ **Mobile Layout:** Fixed tab clipping and feed interaction overflow.
     - ✅ **Touch Targets:** Enforced 44px minimums on feed controls.
     - ⏳ **API Reliability:** Investigating 500/403/503 errors found during audit.

6. **Video Library (ACTIVE)**
   - ✅ **Public Interface:** `VideoLibrary.tsx` + `publicVideoRoutes.mjs` deployed.
   - ✅ **Player:** YouTube/HTML5 player integrated.
   - ⏳ **Content:** Pending admin uploads/population.

### Multi-AI Review Quorum (Current)
- Minimum 3 AIs per high-impact change:
  1. Implementer
  2. Reviewer A (security/correctness)
  3. Reviewer B (UX/data semantics)
- Optional 4th AI for tie-breaks or high-risk disagreements.

### Handoff Rules (Operational)
- Start every cycle by reading:
  1. `docs/ai-workflow/AI-HANDOFF/CURRENT-TASK.md` (this file)
  2. `docs/ai-workflow/AI-HANDOFF/VISION-SYNC-2026-02-15.md`
  3. `docs/ai-workflow/AI-HANDOFF/HANDOFF-PROTOCOL.md`
  4. `docs/ai-workflow/SKILLS-INFRASTRUCTURE.md`
- Record evidence for major changes (build, tests, screenshots/logs when relevant).
- Use `verification-before-completion` skill before any completion claim.
- Use `requesting-code-review` skill before merge to main.
- Do not merge unresolved high-severity findings.

### Skills Infrastructure (2026-02-15)
10 AI agent skills installed in `.agents/skills/`. Key skills:
- **Process:** `verification-before-completion`, `systematic-debugging`, `requesting-code-review`, `test-driven-development`
- **Testing/QA:** `webapp-testing`, `web-design-guidelines`, `audit-website`
- **Browser/Design:** `agent-browser`, `frontend-design`, `ui-ux-pro-max`
- **Full registry:** `docs/ai-workflow/SKILLS-INFRASTRUCTURE.md`
- **Maintenance:** `npx skills check` | `npx skills update`

### Locked Files (Active as of 2026-02-15)
- _None currently tracked in this snapshot._

---

> Legacy backlog (Phases 0-5, old locked files, completed-today logs) has been
> moved to `docs/ai-workflow/AI-HANDOFF/CURRENT-TASK-ARCHIVE.md` for reference.
