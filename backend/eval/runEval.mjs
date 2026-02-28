#!/usr/bin/env node
/**
 * Eval CLI Entry Point — Phase 6
 * ================================
 * Run with: node eval/runEval.mjs [--write-md]
 *
 * Default (CI mode): JSON to stdout, exit code only. No file writes.
 * --write-md (dev mode): Also writes docs/qa/AI-PLANNING-VALIDATION-RESULTS.md.
 *
 * Exit codes:
 *   0 — All scenarios match expected AND all thresholds pass
 *   1 — Correctness failure (any scenario mismatch) OR threshold failure
 */
import { GOLDEN_SCENARIOS } from './goldenDataset.mjs';
import { runEvalSuite, computeExitCode } from './evalRunner.mjs';
import { checkThresholds } from './evalThresholds.mjs';
import { formatJsonReport, formatMarkdownReport } from './evalReport.mjs';
import { writeFileSync, mkdirSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const writeMd = process.argv.includes('--write-md');

const results = runEvalSuite(GOLDEN_SCENARIOS);
const thresholdCheck = checkThresholds(results.summary);
const jsonReport = formatJsonReport(results, thresholdCheck);

// Always write JSON to stdout
console.log(JSON.stringify(jsonReport, null, 2));

// Conditionally write markdown report
if (writeMd) {
  const __dirname = dirname(fileURLToPath(import.meta.url));
  const mdDir = resolve(__dirname, '../../docs/qa');
  mkdirSync(mdDir, { recursive: true });
  const mdPath = resolve(mdDir, 'AI-PLANNING-VALIDATION-RESULTS.md');
  writeFileSync(mdPath, formatMarkdownReport(jsonReport));
  console.error(`Markdown report written to ${mdPath}`);
}

// Surface threshold warnings to stderr (even on success) so CI logs show zero-gated coverage
if (thresholdCheck.warnings.length > 0) {
  for (const w of thresholdCheck.warnings) console.error(`WARNING: ${w}`);
}

// Pure function — testable without process.exit
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
