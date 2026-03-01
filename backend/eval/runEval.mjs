#!/usr/bin/env node
/**
 * Eval CLI Entry Point — Phase 6 + Phase 9
 * ==========================================
 * Run with: node eval/runEval.mjs [flags]
 *
 * Flags:
 *   --write-md          Write Markdown report to docs/qa/
 *   --write-baseline    Write JSON report as baseline snapshot
 *   --drift             Compare against saved baseline, include drift in output
 *   --fail-on-drift     With --drift: exit 1 if any REGRESSION detected
 *
 * Exit codes:
 *   0 — All gates pass
 *   1 — Correctness failure, threshold failure, or drift regression (with --fail-on-drift)
 */
import { GOLDEN_SCENARIOS } from './goldenDataset.mjs';
import { runEvalSuite, computeExitCode } from './evalRunner.mjs';
import { checkThresholds } from './evalThresholds.mjs';
import { formatJsonReport, formatMarkdownReport } from './evalReport.mjs';
import { loadBaseline, compareDrift } from './driftDetector.mjs';
import { writeFileSync, mkdirSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

const writeMd = process.argv.includes('--write-md');
const writeBaseline = process.argv.includes('--write-baseline');
const writeLatest = process.argv.includes('--write-latest');
const doDrift = process.argv.includes('--drift');
const failOnDrift = process.argv.includes('--fail-on-drift');

const BASELINE_PATH = resolve(__dirname, '../../docs/qa/AI-PLANNING-VALIDATION-BASELINE.json');
const LATEST_PATH = resolve(__dirname, '../../docs/qa/AI-PLANNING-VALIDATION-LATEST.json');

// ── Run eval ──────────────────────────────────────────────────────────────────
const results = runEvalSuite(GOLDEN_SCENARIOS);
const thresholdCheck = checkThresholds(results.summary);

// ── Drift detection (optional) ────────────────────────────────────────────────
let drift = null;
if (doDrift || failOnDrift) {
  const baseline = loadBaseline(BASELINE_PATH);
  if (baseline === null) {
    console.error('WARNING: No baseline found at ' + BASELINE_PATH + '. Run eval:baseline first. Drift comparison skipped.');
  } else {
    // Build a temporary report without drift for comparison
    const currentForDrift = formatJsonReport(results, thresholdCheck);
    drift = compareDrift(currentForDrift, baseline);
  }
}

// ── Format report ─────────────────────────────────────────────────────────────
const jsonReport = formatJsonReport(results, thresholdCheck, drift);

// Always write JSON to stdout
console.log(JSON.stringify(jsonReport, null, 2));

// ── Write baseline snapshot ───────────────────────────────────────────────────
if (writeBaseline) {
  const baselineDir = dirname(BASELINE_PATH);
  mkdirSync(baselineDir, { recursive: true });
  writeFileSync(BASELINE_PATH, JSON.stringify(jsonReport, null, 2));
  console.error(`Baseline written to ${BASELINE_PATH}`);
}

// ── Write latest results (for monitoring dashboard drift comparison) ──────────
if (writeLatest) {
  const latestDir = dirname(LATEST_PATH);
  mkdirSync(latestDir, { recursive: true });
  writeFileSync(LATEST_PATH, JSON.stringify(jsonReport, null, 2));
  console.error(`Latest results written to ${LATEST_PATH}`);
}

// ── Write markdown report ─────────────────────────────────────────────────────
if (writeMd) {
  const mdDir = resolve(__dirname, '../../docs/qa');
  mkdirSync(mdDir, { recursive: true });
  const mdPath = resolve(mdDir, 'AI-PLANNING-VALIDATION-RESULTS.md');
  writeFileSync(mdPath, formatMarkdownReport(jsonReport));
  console.error(`Markdown report written to ${mdPath}`);
}

// ── Surface threshold warnings to stderr ──────────────────────────────────────
if (thresholdCheck.warnings.length > 0) {
  for (const w of thresholdCheck.warnings) console.error(`WARNING: ${w}`);
}

// ── Surface drift warnings to stderr ──────────────────────────────────────────
if (drift && drift.warnings.length > 0) {
  for (const w of drift.warnings) console.error(`DRIFT: ${w}`);
}

// ── Exit code computation ─────────────────────────────────────────────────────
// Gate 1: Correctness
// Gate 2: Thresholds
const exitCode = computeExitCode(results, thresholdCheck);

if (exitCode !== 0) {
  const mismatches = results.results.filter(r => !r.pass);
  if (mismatches.length > 0) {
    console.error(`CORRECTNESS FAILURE: ${mismatches.length} scenario(s) did not match expected outcome`);
    for (const m of mismatches) console.error(`  - ${m.scenarioId}: ${m.reason}`);
  }
  if (!thresholdCheck.passed) {
    console.error('THRESHOLD FAILURE:', thresholdCheck.failures);
  }
  process.exit(exitCode);
}

// Gate 3: Drift regression (only with --fail-on-drift)
if (failOnDrift && drift && drift.warnings.length > 0) {
  console.error('DRIFT REGRESSION FAILURE: regressions detected against baseline');
  process.exit(1);
}
