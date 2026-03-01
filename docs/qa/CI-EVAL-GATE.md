# CI Eval Gate

**Phase 8 — CI Gate Integration**

## What the Gate Enforces

The `AI Eval Gate` GitHub Actions workflow (`.github/workflows/ai-eval-gate.yml`) runs on every PR to `main` and every push to `main`. It executes the Phase 6 eval harness (`npm run eval`) and **fails the job if any validation regresses**.

The eval harness is deterministic and offline — it tests the AI validation pipeline (`runValidationPipeline`, `runLongHorizonValidationPipeline`, `detectPii`) against 27 synthetic golden scenarios. No API keys, no network calls, no provider dependencies.

## Two-Gate Design

### Gate 1: Correctness (hard fail)

Every golden scenario must produce its expected outcome (pass/fail/warning). A single mismatch exits with code 1.

- Checked by: `evalRunner.mjs` -> `computeExitCode()`
- Failure means: a validator changed behavior in a way that contradicts the golden dataset

### Gate 2: Thresholds (hard fail)

Per-category pass rates must meet configured minimums (defined in `evalThresholds.mjs`). Any category below its threshold exits with code 1.

| Category | Threshold |
|----------|-----------|
| schema_valid | 100% |
| pii_detection | 100% |
| schema_invalid | 100% |
| contraindication | 95% (effective 100% at current N=5, since 4/5=80% < 95%) |
| scope_of_practice | 100% |
| adversarial | knownGap-excluded, correctness-only |
| warnings | 100% |

## Trigger Conditions

- **Pull request** to `main` — blocks merge if eval fails
- **Push** to `main` — catches regressions that slip through

## Artifacts

On every run (pass or fail), the workflow uploads:

| Artifact | Contents | Retention |
|----------|----------|-----------|
| `ai-eval-report` | `ai-eval-report.json` — full eval results with per-scenario detail | 30 days |

To download: GitHub Actions tab -> click workflow run -> scroll to **Artifacts** at the bottom.

The JSON report includes:
- `summary.total`, `summary.passed`, `summary.failed`
- `summary.correctnessFailures` (Gate 1)
- `thresholdCheck.passed`, `thresholdCheck.failures` (Gate 2)
- Per-scenario results with `scenarioId`, `pass`, `reason`
- Provenance: `evalVersion`, `datasetVersion`, `promptVersion`, `ruleEngineVersion`

## Fast Triage Checklist

When the gate fails on a PR:

1. **Download the artifact** — open `ai-eval-report.json`
2. **Check `summary.correctnessFailures`** — if > 0, a validator changed behavior
3. **Check `thresholdCheck.failures`** — if non-empty, a category dropped below its minimum
4. **Find the failing scenario(s)** — search `results` array for `"pass": false`
5. **Read `reason`** — tells you exactly what mismatched (expected vs actual)
6. **Reproduce locally:** `cd backend && npm run eval`

## Common Failure Modes

| Symptom | Likely Cause | Fix |
|---------|-------------|-----|
| Correctness failure on `pii_detection` scenarios | Changed PII regex or `detectPii()` logic | Review PII detection changes; update golden dataset if intentional |
| Correctness failure on `schema_valid` scenarios | Changed `runValidationPipeline()` output shape | Fix the validator or update golden scenario expectations |
| Correctness failure on `contraindication` scenarios | Modified rule engine safety checks | Review rule changes; these are safety-critical |
| Threshold failure (category below 100%) | Multiple scenarios in one category failing | Usually the same root cause — fix the validator |
| `npm ci` failure | Lockfile drift or dependency conflict | Run `cd backend && npm install` locally, commit `package-lock.json` |
| Node version mismatch | Workflow uses Node 20, local uses different | Ensure code is compatible with Node 20 LTS |

## Local Verification

Run the same commands locally before pushing:

```bash
# Full eval (same as CI gate)
cd backend && npm run eval

# Eval with markdown report (dev mode)
cd backend && npm run eval:report

# Full test suite (includes eval unit tests)
cd backend && npm test

# Provider A/B (non-gating sanity check)
cd backend && npm run provider:ab
```

## Adding New Scenarios

1. Edit `backend/eval/goldenDataset.mjs` — add a scenario with `id`, `category`, `expected`, and test inputs
2. Run `cd backend && npm test` to verify dataset integrity tests pass
3. Run `cd backend && npm run eval` to confirm the new scenario passes
4. Push — CI will validate automatically

## File References

| File | Purpose |
|------|---------|
| `.github/workflows/ai-eval-gate.yml` | Workflow definition |
| `backend/eval/runEval.mjs` | CLI entry point |
| `backend/eval/goldenDataset.mjs` | 27 golden scenarios |
| `backend/eval/evalRunner.mjs` | Harness + `computeExitCode()` |
| `backend/eval/evalThresholds.mjs` | Category thresholds + `checkThresholds()` |
| `backend/eval/evalReport.mjs` | JSON + Markdown report formatters |
| `backend/tests/unit/evalHarness.test.mjs` | 27 unit tests for the harness |

## Environment Requirements

- **Node.js 20+** (CI uses Node 20 LTS)
- **No API keys needed** — all eval is deterministic and offline
- **No database needed** — eval tests validators, not models
