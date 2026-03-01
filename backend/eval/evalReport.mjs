/**
 * Eval Report Formatters — Phase 6
 * ==================================
 * JSON and Markdown report generation for eval results.
 * Includes provenance (versions, timestamps) for CI traceability.
 */
import { DATASET_VERSION } from './goldenDataset.mjs';
import { PROMPT_VERSION, RULE_ENGINE_VERSION } from '../services/ai/types.mjs';

const EVAL_VERSION = '1.0.0';

/**
 * Format a JSON report object with full provenance.
 *
 * @param {{ results: Array, summary: Object, knownGaps: Array }} evalResults
 * @param {{ passed: boolean, failures: string[], warnings: string[] }} thresholdCheck
 * @param {{ drifted: boolean, changes: Array, warnings: string[] }|null} [drift=null] - Drift comparison results
 * @returns {Object} JSON report
 */
export function formatJsonReport(evalResults, thresholdCheck, drift = null) {
  const report = {
    evalVersion: EVAL_VERSION,
    datasetVersion: DATASET_VERSION,
    promptVersion: PROMPT_VERSION,
    ruleEngineVersion: RULE_ENGINE_VERSION,
    timestamp: new Date().toISOString(),
    summary: {
      ...evalResults.summary,
      thresholdWarnings: thresholdCheck.warnings.length,
    },
    categories: evalResults.summary.categories,
    knownGaps: evalResults.knownGaps,
    thresholdCheck,
    results: evalResults.results,
  };
  if (drift !== null) {
    report.drift = drift;
  }
  return report;
}

/**
 * Format a Markdown report string.
 *
 * @param {Object} jsonReport - Output of formatJsonReport
 * @returns {string} Markdown text
 */
export function formatMarkdownReport(jsonReport) {
  const lines = [];

  // Header
  lines.push('# AI Planning Validation Results');
  lines.push('');
  lines.push(`> Generated: ${jsonReport.timestamp}`);
  lines.push('');
  lines.push('## Provenance');
  lines.push('');
  lines.push(`| Field | Value |`);
  lines.push(`|-------|-------|`);
  lines.push(`| Eval Version | ${jsonReport.evalVersion} |`);
  lines.push(`| Dataset Version | ${jsonReport.datasetVersion} |`);
  lines.push(`| Prompt Version | ${jsonReport.promptVersion} |`);
  lines.push(`| Rule Engine Version | ${jsonReport.ruleEngineVersion} |`);
  lines.push('');

  // Summary
  const s = jsonReport.summary;
  lines.push('## Summary');
  lines.push('');
  lines.push(`| Metric | Value |`);
  lines.push(`|--------|-------|`);
  lines.push(`| Total Scenarios | ${s.total} |`);
  lines.push(`| Gated Scenarios | ${s.gated} |`);
  lines.push(`| Passed | ${s.passed} |`);
  lines.push(`| Failed | ${s.failed} |`);
  lines.push(`| Correctness Failures | ${s.correctnessFailures} |`);
  lines.push(`| Known Gaps | ${s.knownGaps} |`);
  lines.push(`| Pass Rate | ${(s.passRate * 100).toFixed(1)}% |`);
  lines.push(`| Duration | ${s.durationMs}ms |`);
  lines.push('');

  // Per-Category Results
  lines.push('## Per-Category Results');
  lines.push('');
  lines.push('| Category | Total | Gated | Passed | Failed | Known Gaps | Pass Rate |');
  lines.push('|----------|-------|-------|--------|--------|------------|-----------|');
  for (const [cat, stats] of Object.entries(jsonReport.categories)) {
    lines.push(
      `| ${cat} | ${stats.total} | ${stats.gated} | ${stats.passed} | ${stats.failed} | ${stats.knownGaps} | ${(stats.passRate * 100).toFixed(1)}% |`
    );
  }
  lines.push('');

  // Known Gaps
  if (jsonReport.knownGaps.length > 0) {
    lines.push('## Known Gaps');
    lines.push('');
    lines.push('These scenarios document known validator limitations. They are excluded from threshold gating but still verified for correctness.');
    lines.push('');
    for (const gap of jsonReport.knownGaps) {
      lines.push(`- **${gap.id}**: ${gap.description}`);
      lines.push(`  - Rationale: ${gap.rationale}`);
    }
    lines.push('');
  }

  // Threshold Check
  const tc = jsonReport.thresholdCheck;
  if (!tc.passed) {
    lines.push('## Threshold Failures');
    lines.push('');
    for (const f of tc.failures) {
      lines.push(`- ${f}`);
    }
    lines.push('');
  }

  if (tc.warnings.length > 0) {
    lines.push('## Threshold Warnings');
    lines.push('');
    for (const w of tc.warnings) {
      lines.push(`- ${w}`);
    }
    lines.push('');
  }

  // Drift Detection
  if (jsonReport.drift) {
    lines.push('## Drift Detection');
    lines.push('');
    if (!jsonReport.drift.drifted) {
      lines.push('No drift detected from baseline.');
    } else {
      lines.push(`${jsonReport.drift.changes.length} change(s) detected from baseline.`);
      lines.push('');
      lines.push('| Field | Baseline | Current | Severity |');
      lines.push('|-------|----------|---------|----------|');
      for (const c of jsonReport.drift.changes) {
        lines.push(`| ${c.field} | ${c.baseline} | ${c.current} | ${c.severity} |`);
      }
      if (jsonReport.drift.warnings.length > 0) {
        lines.push('');
        lines.push('**Drift Warnings:**');
        lines.push('');
        for (const w of jsonReport.drift.warnings) {
          lines.push(`- ${w}`);
        }
      }
    }
    lines.push('');
  }

  // Individual Results
  lines.push('## Scenario Results');
  lines.push('');
  lines.push('| ID | Category | Pass | Known Gap | Reason |');
  lines.push('|----|----------|------|-----------|--------|');
  for (const r of jsonReport.results) {
    const isKnownGap = jsonReport.knownGaps.some(g => g.id === r.scenarioId);
    lines.push(
      `| ${r.scenarioId} | ${r.category} | ${r.pass ? 'PASS' : 'FAIL'} | ${isKnownGap ? 'Yes' : 'No'} | ${r.reason || '—'} |`
    );
  }
  lines.push('');

  // Footer
  lines.push('---');
  lines.push(`*Report generated by Phase 6 Eval Harness v${jsonReport.evalVersion}*`);
  lines.push('');

  return lines.join('\n');
}
