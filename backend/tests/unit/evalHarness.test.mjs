/**
 * Eval Harness Tests — Phase 6 + Phase 9
 * ========================================
 * 51 tests covering dataset integrity, runner correctness,
 * threshold checking, report formatting, guard behavior,
 * new scenario spot-checks, and drift detection.
 */
import { describe, it, expect } from 'vitest';
import { GOLDEN_SCENARIOS, DATASET_VERSION } from '../../eval/goldenDataset.mjs';
import { runEvalSuite, computeExitCode } from '../../eval/evalRunner.mjs';
import { EVAL_THRESHOLDS, checkThresholds } from '../../eval/evalThresholds.mjs';
import { formatJsonReport, formatMarkdownReport } from '../../eval/evalReport.mjs';
import { loadBaseline, compareDrift } from '../../eval/driftDetector.mjs';
import { writeFileSync, unlinkSync, mkdirSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';

// ── Dataset Integrity (1-4) ──────────────────────────────────────────────────

describe('Golden Dataset Integrity', () => {
  it('1 — has ≥50 scenarios', () => {
    expect(GOLDEN_SCENARIOS.length).toBeGreaterThanOrEqual(50);
    expect(GOLDEN_SCENARIOS.length).toBe(53);
  });

  it('2 — all scenarios have required fields', () => {
    const requiredFields = ['id', 'category', 'description', 'type', 'input', 'expected'];
    for (const s of GOLDEN_SCENARIOS) {
      for (const field of requiredFields) {
        expect(s).toHaveProperty(field);
      }
    }
  });

  it('3 — all scenario IDs are unique', () => {
    const ids = GOLDEN_SCENARIOS.map(s => s.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('4 — all categories map to a threshold', () => {
    for (const s of GOLDEN_SCENARIOS) {
      expect(EVAL_THRESHOLDS).toHaveProperty(s.category);
    }
  });
});

// ── Runner Correctness (5-8) ─────────────────────────────────────────────────

describe('Eval Runner', () => {
  it('5 — produces correct pass for valid workout (schema_valid_01)', () => {
    const scenario = GOLDEN_SCENARIOS.find(s => s.id === 'schema_valid_01');
    const { results } = runEvalSuite([
      scenario,
      // Include at least one scenario per category to pass coverage guard
      ...getOnePerCategory('schema_valid_01'),
    ]);
    const result = results.find(r => r.scenarioId === 'schema_valid_01');
    expect(result.pass).toBe(true);
  });

  it('6 — produces correct fail for PII scenario (pii_detect_01)', () => {
    const { results } = runEvalSuite(GOLDEN_SCENARIOS);
    const result = results.find(r => r.scenarioId === 'pii_detect_01');
    expect(result.pass).toBe(true); // pii_detect_01 expects ok=false, and validator should return ok=false → pass
    expect(result.actual.ok).toBe(false);
    expect(result.actual.failStage).toBe('pii_leak');
  });

  it('7 — produces correct fail for invalid schema (schema_invalid_01)', () => {
    const { results } = runEvalSuite(GOLDEN_SCENARIOS);
    const result = results.find(r => r.scenarioId === 'schema_invalid_01');
    expect(result.pass).toBe(true);
    expect(result.actual.ok).toBe(false);
    expect(result.actual.failStage).toBe('parse_error');
  });

  it('8 — produces correct fail for rule violation (contra_01)', () => {
    const { results } = runEvalSuite(GOLDEN_SCENARIOS);
    const result = results.find(r => r.scenarioId === 'contra_01');
    expect(result.pass).toBe(true);
    expect(result.actual.ok).toBe(false);
  });
});

// ── Threshold Checker (9-10) ─────────────────────────────────────────────────

describe('Threshold Checker', () => {
  it('9 — passes when all categories at 100%', () => {
    const mockSummary = {
      categories: Object.fromEntries(
        Object.keys(EVAL_THRESHOLDS).map(cat => [cat, {
          total: 5, gated: 5, passed: 5, failed: 0, knownGaps: 0, passRate: 1.0,
        }])
      ),
    };
    const result = checkThresholds(mockSummary);
    expect(result.passed).toBe(true);
    expect(result.failures).toHaveLength(0);
  });

  it('10 — fails when category below threshold', () => {
    const mockSummary = {
      categories: Object.fromEntries(
        Object.keys(EVAL_THRESHOLDS).map(cat => [cat, {
          total: 5, gated: 5, passed: cat === 'pii_detection' ? 0 : 5,
          failed: cat === 'pii_detection' ? 5 : 0, knownGaps: 0,
          passRate: cat === 'pii_detection' ? 0 : 1.0,
        }])
      ),
    };
    const result = checkThresholds(mockSummary);
    expect(result.passed).toBe(false);
    expect(result.failures.length).toBeGreaterThan(0);
  });
});

// ── Report Formatters (11-12) ────────────────────────────────────────────────

describe('Report Formatters', () => {
  it('11 — JSON report includes all provenance fields', () => {
    const { results, summary, knownGaps } = runEvalSuite(GOLDEN_SCENARIOS);
    const thresholdCheck = checkThresholds(summary);
    const report = formatJsonReport({ results, summary, knownGaps }, thresholdCheck);

    expect(report).toHaveProperty('evalVersion');
    expect(report).toHaveProperty('datasetVersion');
    expect(report).toHaveProperty('promptVersion');
    expect(report).toHaveProperty('ruleEngineVersion');
    expect(report).toHaveProperty('timestamp');
    expect(report.datasetVersion).toBe(DATASET_VERSION);
  });

  it('12 — Markdown report contains per-category table', () => {
    const { results, summary, knownGaps } = runEvalSuite(GOLDEN_SCENARIOS);
    const thresholdCheck = checkThresholds(summary);
    const report = formatJsonReport({ results, summary, knownGaps }, thresholdCheck);
    const md = formatMarkdownReport(report);

    expect(md).toContain('## Per-Category Results');
    expect(md).toContain('| Category | Total | Gated | Passed | Failed | Known Gaps | Pass Rate |');
  });
});

// ── Warning Scenarios (13) ──────────────────────────────────────────────────

describe('Warning Scenarios', () => {
  it('13 — warnings_01 produces expected warnings', () => {
    const { results } = runEvalSuite(GOLDEN_SCENARIOS);
    const result = results.find(r => r.scenarioId === 'warnings_01');
    expect(result.pass).toBe(true);
    expect(result.actual.warnings).toBeGreaterThan(0);
  });
});

// ── Long-Horizon Scenarios (14-15) ──────────────────────────────────────────

describe('Long-Horizon Scenarios', () => {
  it('14 — valid long-horizon scenario passes (schema_valid_03)', () => {
    const { results } = runEvalSuite(GOLDEN_SCENARIOS);
    const result = results.find(r => r.scenarioId === 'schema_valid_03');
    expect(result.pass).toBe(true);
    expect(result.actual.ok).toBe(true);
  });

  it('15 — long-horizon rule violation caught (contra_03)', () => {
    const { results } = runEvalSuite(GOLDEN_SCENARIOS);
    const result = results.find(r => r.scenarioId === 'contra_03');
    expect(result.pass).toBe(true);
    expect(result.actual.ok).toBe(false);
    expect(result.actual.failStage).toBe('validation_error');
  });
});

// ── Adversarial + KnownGap Handling (16-17, 19-20) ─────────────────────────

describe('Adversarial & KnownGap', () => {
  it('16 — adversarial_01 phone-space evasion is knownGap (excluded from threshold)', () => {
    const { results, knownGaps } = runEvalSuite(GOLDEN_SCENARIOS);
    const result = results.find(r => r.scenarioId === 'adversarial_01');
    expect(result.pass).toBe(true);
    expect(result.actual.ok).toBe(true);
    expect(knownGaps.some(g => g.id === 'adversarial_01')).toBe(true);
  });

  it('17 — adversarial_02 email-in-URL caught by PII detector (gated)', () => {
    const { results, knownGaps } = runEvalSuite(GOLDEN_SCENARIOS);
    const result = results.find(r => r.scenarioId === 'adversarial_02');
    expect(result.pass).toBe(true);
    expect(result.actual.ok).toBe(false);
    expect(result.actual.failStage).toBe('pii_leak');
    expect(knownGaps.some(g => g.id === 'adversarial_02')).toBe(false);
  });

  it('19 — knownGap scenarios excluded from category pass rate', () => {
    const { summary } = runEvalSuite(GOLDEN_SCENARIOS);
    const adversarial = summary.categories.adversarial;
    // 6 total, 4 knownGap, 2 gated
    expect(adversarial.total).toBe(6);
    expect(adversarial.knownGaps).toBe(4);
    expect(adversarial.gated).toBe(2);
    expect(adversarial.passRate).toBe(1.0); // 2/2, not 2/6
  });

  it('20 — knownGap scenarios require non-empty rationale', () => {
    const knownGapScenarios = GOLDEN_SCENARIOS.filter(s => s.knownGap === true);
    expect(knownGapScenarios.length).toBeGreaterThan(0);
    for (const s of knownGapScenarios) {
      expect(typeof s.rationale).toBe('string');
      expect(s.rationale.length).toBeGreaterThan(0);
    }
  });
});

// ── Runtime Guards (18, 25-27) ──────────────────────────────────────────────

describe('Runtime Guards', () => {
  it('18 — throws on unknown category key', () => {
    const badScenario = {
      ...GOLDEN_SCENARIOS[0],
      id: 'bad_category_test',
      category: 'bogus',
    };
    expect(() => runEvalSuite([badScenario])).toThrow(/Unknown scenario categories/);
  });

  it('25 — threshold coverage guard throws on missing category', () => {
    // Only include scenarios from a subset of categories
    const subset = GOLDEN_SCENARIOS.filter(s => s.category === 'schema_valid');
    expect(() => runEvalSuite(subset)).toThrow(/EVAL_THRESHOLDS categories with no scenarios/);
  });

  it('26 — runtime knownGap rationale guard throws on empty', () => {
    const badScenario = {
      ...GOLDEN_SCENARIOS[0],
      id: 'bad_rationale_test',
      knownGap: true,
      rationale: '',
    };
    // Need all categories covered, so use full dataset + bad scenario
    const allPlusBad = [...GOLDEN_SCENARIOS, badScenario];
    expect(() => runEvalSuite(allPlusBad)).toThrow(/missing or empty rationale/);
  });

  it('26b — runtime knownGap rationale guard throws on whitespace-only', () => {
    const badScenario = {
      ...GOLDEN_SCENARIOS[0],
      id: 'bad_rationale_ws',
      knownGap: true,
      rationale: '   ',
    };
    const allPlusBad = [...GOLDEN_SCENARIOS, badScenario];
    expect(() => runEvalSuite(allPlusBad)).toThrow(/missing or empty rationale/);
  });

  it('27 — unknown categories listed alphabetically in error', () => {
    const scenarios = [
      { ...GOLDEN_SCENARIOS[0], id: 'z1', category: 'z_cat' },
      { ...GOLDEN_SCENARIOS[0], id: 'a1', category: 'a_cat' },
    ];
    try {
      runEvalSuite(scenarios);
      expect.fail('Should have thrown');
    } catch (e) {
      // Verify alphabetical order: a_cat before z_cat
      const idx_a = e.message.indexOf('a_cat');
      const idx_z = e.message.indexOf('z_cat');
      expect(idx_a).toBeLessThan(idx_z);
    }
  });

  it('28 — throws on unknown scenario type', () => {
    const badScenario = {
      ...GOLDEN_SCENARIOS[0],
      id: 'bad_type_test',
      type: 'workuot', // typo
    };
    const allPlusBad = [...GOLDEN_SCENARIOS, badScenario];
    expect(() => runEvalSuite(allPlusBad)).toThrow(/Unknown scenario types.*workuot/);
  });
});

// ── computeExitCode (21-22) ──────────────────────────────────────────────────

describe('computeExitCode', () => {
  it('21 — returns 1 on correctness mismatch, 0 on all pass', () => {
    const passingResults = { results: [{ pass: true }, { pass: true }] };
    const failingResults = { results: [{ pass: true }, { pass: false }] };
    const passingThresholds = { passed: true, failures: [], warnings: [] };

    expect(computeExitCode(passingResults, passingThresholds)).toBe(0);
    expect(computeExitCode(failingResults, passingThresholds)).toBe(1);
  });

  it('22 — returns 1 on threshold failure', () => {
    const passingResults = { results: [{ pass: true }] };
    const failingThresholds = { passed: false, failures: ['PII: 0%'], warnings: [] };

    expect(computeExitCode(passingResults, failingThresholds)).toBe(1);
  });
});

// ── Threshold Warning Propagation (23-24) ────────────────────────────────────

describe('Threshold Warning Propagation', () => {
  it('23 — warnings propagated to JSON report', () => {
    const mockSummary = {
      categories: Object.fromEntries(
        Object.keys(EVAL_THRESHOLDS).map(cat => [cat, {
          total: 2, gated: cat === 'adversarial' ? 0 : 2,
          passed: cat === 'adversarial' ? 0 : 2,
          failed: 0, knownGaps: cat === 'adversarial' ? 2 : 0,
          passRate: 1.0,
        }])
      ),
    };
    const thresholdCheck = checkThresholds(mockSummary);
    expect(thresholdCheck.warnings.length).toBeGreaterThan(0);
    expect(thresholdCheck.warnings[0]).toContain('no gated scenarios');

    // Format and verify propagation
    const report = formatJsonReport(
      { results: [], summary: { ...mockSummary, total: 14, gated: 12, passed: 12, failed: 0, correctnessFailures: 0, knownGaps: 2, passRate: 1.0, durationMs: 1 },
        knownGaps: [] },
      thresholdCheck
    );
    expect(report.thresholdCheck.warnings.length).toBeGreaterThan(0);
    expect(report.summary.thresholdWarnings).toBeGreaterThan(0);
  });

  it('24 — warnings propagated to markdown report', () => {
    const mockSummary = {
      categories: Object.fromEntries(
        Object.keys(EVAL_THRESHOLDS).map(cat => [cat, {
          total: 2, gated: cat === 'adversarial' ? 0 : 2,
          passed: cat === 'adversarial' ? 0 : 2,
          failed: 0, knownGaps: cat === 'adversarial' ? 2 : 0,
          passRate: 1.0,
        }])
      ),
    };
    const thresholdCheck = checkThresholds(mockSummary);
    const report = formatJsonReport(
      { results: [], summary: { ...mockSummary, total: 14, gated: 12, passed: 12, failed: 0, correctnessFailures: 0, knownGaps: 2, passRate: 1.0, durationMs: 1 },
        knownGaps: [] },
      thresholdCheck
    );
    const md = formatMarkdownReport(report);
    expect(md).toContain('## Threshold Warnings');
    expect(md).toContain('no gated scenarios');
  });
});

// ── Phase 9: New Scenario Spot-Checks (29-38) ──────────────────────────────

describe('Phase 9 Scenario Spot-Checks', () => {
  // Run full suite once for spot-check tests
  const fullResults = runEvalSuite(GOLDEN_SCENARIOS);

  it('29 — schema_valid_06 maximal valid passes', () => {
    const r = fullResults.results.find(r => r.scenarioId === 'schema_valid_06');
    expect(r.pass).toBe(true);
    expect(r.actual.ok).toBe(true);
  });

  it('30 — pii_detect_06 phone with dots caught', () => {
    const r = fullResults.results.find(r => r.scenarioId === 'pii_detect_06');
    expect(r.pass).toBe(true);
    expect(r.actual.ok).toBe(false);
    expect(r.actual.failStage).toBe('pii_leak');
  });

  it('31 — schema_invalid_05 durationWeeks=0 rejected', () => {
    const r = fullResults.results.find(r => r.scenarioId === 'schema_invalid_05');
    expect(r.pass).toBe(true);
    expect(r.actual.ok).toBe(false);
    expect(r.actual.failStage).toBe('validation_error');
  });

  it('32 — schema_invalid_09 HTML string rejected', () => {
    const r = fullResults.results.find(r => r.scenarioId === 'schema_invalid_09');
    expect(r.pass).toBe(true);
    expect(r.actual.ok).toBe(false);
    expect(r.actual.failStage).toBe('parse_error');
  });

  it('33 — contra_06 long-horizon boundary overflow', () => {
    const r = fullResults.results.find(r => r.scenarioId === 'contra_06');
    expect(r.pass).toBe(true);
    expect(r.actual.ok).toBe(false);
    expect(r.actual.failStage).toBe('validation_error');
  });

  it('34 — scope_03 GENERAL+optPhase rejected', () => {
    const r = fullResults.results.find(r => r.scenarioId === 'scope_03');
    expect(r.pass).toBe(true);
    expect(r.actual.ok).toBe(false);
    expect(r.actual.failStage).toBe('validation_error');
  });

  it('35 — adversarial_04 parenthesized phone is knownGap', () => {
    const r = fullResults.results.find(r => r.scenarioId === 'adversarial_04');
    expect(r.pass).toBe(true);
    expect(r.actual.ok).toBe(true);
    expect(fullResults.knownGaps.some(g => g.id === 'adversarial_04')).toBe(true);
  });

  it('36 — warnings_05 exactly 20 exercises → no warning', () => {
    const r = fullResults.results.find(r => r.scenarioId === 'warnings_05');
    expect(r.pass).toBe(true);
    expect(r.actual.warnings).toBe(0);
  });

  it('37 — warnings_06 21 exercises → triggers warning', () => {
    const r = fullResults.results.find(r => r.scenarioId === 'warnings_06');
    expect(r.pass).toBe(true);
    expect(r.actual.warnings).toBeGreaterThanOrEqual(1);
  });

  it('38 — warnings_07 block exactly 8w → no warning', () => {
    const r = fullResults.results.find(r => r.scenarioId === 'warnings_07');
    expect(r.pass).toBe(true);
    expect(r.actual.warnings).toBe(0);
  });
});

// ── Phase 9: Drift Detector Unit Tests (39-47) ─────────────────────────────

describe('Drift Detector', () => {
  const tmpDir = join(tmpdir(), 'eval-drift-tests-' + Date.now());

  it('39 — loadBaseline: valid JSON file → parsed object', () => {
    mkdirSync(tmpDir, { recursive: true });
    const filePath = join(tmpDir, 'valid.json');
    writeFileSync(filePath, JSON.stringify({ summary: { total: 27 } }));
    const result = loadBaseline(filePath);
    expect(result).toEqual({ summary: { total: 27 } });
    unlinkSync(filePath);
  });

  it('40 — loadBaseline: missing file → null', () => {
    const result = loadBaseline(join(tmpDir, 'does-not-exist.json'));
    expect(result).toBeNull();
  });

  it('41 — loadBaseline: invalid JSON → null', () => {
    const filePath = join(tmpDir, 'invalid.json');
    writeFileSync(filePath, 'not valid json {{{');
    const result = loadBaseline(filePath);
    expect(result).toBeNull();
    unlinkSync(filePath);
  });

  it('42 — compareDrift: identical reports → drifted=false', () => {
    const report = {
      datasetVersion: '2.0.0',
      promptVersion: '1.0.0',
      ruleEngineVersion: '1.0.0',
      summary: { total: 53, gated: 49, passed: 49, failed: 0, correctnessFailures: 0, knownGaps: 4 },
      categories: { schema_valid: { passRate: 1.0 }, pii_detection: { passRate: 1.0 } },
    };
    const result = compareDrift(report, { ...report });
    expect(result.drifted).toBe(false);
    expect(result.changes).toHaveLength(0);
    expect(result.warnings).toHaveLength(0);
  });

  it('43 — compareDrift: summary.failed increase → REGRESSION', () => {
    const baseline = {
      datasetVersion: '2.0.0', promptVersion: '1.0.0', ruleEngineVersion: '1.0.0',
      summary: { total: 53, gated: 49, passed: 49, failed: 0, correctnessFailures: 0, knownGaps: 4 },
      categories: {},
    };
    const current = {
      ...baseline,
      summary: { ...baseline.summary, passed: 48, failed: 1 },
    };
    const result = compareDrift(current, baseline);
    expect(result.drifted).toBe(true);
    const failedChange = result.changes.find(c => c.field === 'summary.failed');
    expect(failedChange.severity).toBe('REGRESSION');
    expect(result.warnings.length).toBeGreaterThan(0);
  });

  it('44 — compareDrift: summary.passed increase → IMPROVEMENT', () => {
    const baseline = {
      datasetVersion: '2.0.0', promptVersion: '1.0.0', ruleEngineVersion: '1.0.0',
      summary: { total: 53, gated: 49, passed: 48, failed: 1, correctnessFailures: 0, knownGaps: 4 },
      categories: {},
    };
    const current = {
      ...baseline,
      summary: { ...baseline.summary, passed: 49, failed: 0 },
    };
    const result = compareDrift(current, baseline);
    const passedChange = result.changes.find(c => c.field === 'summary.passed');
    expect(passedChange.severity).toBe('IMPROVEMENT');
  });

  it('45 — compareDrift: summary.total change → CHANGE', () => {
    const baseline = {
      datasetVersion: '2.0.0', promptVersion: '1.0.0', ruleEngineVersion: '1.0.0',
      summary: { total: 27, gated: 25, passed: 25, failed: 0, correctnessFailures: 0, knownGaps: 2 },
      categories: {},
    };
    const current = {
      ...baseline,
      summary: { ...baseline.summary, total: 53 },
    };
    const result = compareDrift(current, baseline);
    const totalChange = result.changes.find(c => c.field === 'summary.total');
    expect(totalChange.severity).toBe('CHANGE');
  });

  it('46 — compareDrift: per-category passRate decrease → REGRESSION', () => {
    const baseline = {
      datasetVersion: '2.0.0', promptVersion: '1.0.0', ruleEngineVersion: '1.0.0',
      summary: { total: 53, gated: 49, passed: 49, failed: 0, correctnessFailures: 0, knownGaps: 4 },
      categories: { schema_valid: { passRate: 1.0 } },
    };
    const current = {
      ...baseline,
      categories: { schema_valid: { passRate: 0.75 } },
    };
    const result = compareDrift(current, baseline);
    const catChange = result.changes.find(c => c.field === 'categories.schema_valid.passRate');
    expect(catChange.severity).toBe('REGRESSION');
    expect(result.warnings.some(w => w.includes('REGRESSION'))).toBe(true);
  });

  it('47 — compareDrift: provenance version change → CHANGE', () => {
    const baseline = {
      datasetVersion: '1.1.0', promptVersion: '1.0.0', ruleEngineVersion: '1.0.0',
      summary: { total: 27, gated: 25, passed: 25, failed: 0, correctnessFailures: 0, knownGaps: 2 },
      categories: {},
    };
    const current = {
      ...baseline,
      datasetVersion: '2.0.0',
    };
    const result = compareDrift(current, baseline);
    const versionChange = result.changes.find(c => c.field === 'datasetVersion');
    expect(versionChange.severity).toBe('CHANGE');
    expect(versionChange.baseline).toBe('1.1.0');
    expect(versionChange.current).toBe('2.0.0');
  });
});

// ── Phase 9: Drift Integration Tests (48-50) ───────────────────────────────

describe('Drift Integration', () => {
  it('48 — loadBaseline returns null for missing file → no crash', () => {
    const baseline = loadBaseline('/nonexistent/path/baseline.json');
    expect(baseline).toBeNull();
    // Drift should be skippable when baseline is null (no crash)
  });

  it('49 — drift with matching baseline → drifted=false', () => {
    const evalResults = runEvalSuite(GOLDEN_SCENARIOS);
    const thresholdCheck = checkThresholds(evalResults.summary);
    const report = formatJsonReport(evalResults, thresholdCheck);
    // Compare report against itself (simulates matching baseline)
    const drift = compareDrift(report, report);
    expect(drift.drifted).toBe(false);
    expect(drift.changes).toHaveLength(0);
  });

  it('50 — fail-on-drift with REGRESSION triggers warning list', () => {
    const evalResults = runEvalSuite(GOLDEN_SCENARIOS);
    const thresholdCheck = checkThresholds(evalResults.summary);
    const currentReport = formatJsonReport(evalResults, thresholdCheck);

    // Create a synthetic baseline with better numbers to force regression
    const fakeBaseline = {
      ...currentReport,
      summary: {
        ...currentReport.summary,
        passed: currentReport.summary.passed + 5,
        failed: 0,
      },
      categories: { ...currentReport.categories },
    };

    const drift = compareDrift(currentReport, fakeBaseline);
    expect(drift.drifted).toBe(true);
    expect(drift.warnings.length).toBeGreaterThan(0);
    expect(drift.warnings.some(w => w.includes('REGRESSION'))).toBe(true);
    // In real CLI, this would trigger process.exit(1) with --fail-on-drift
  });
});

// ── Phase 9: Report Drift Support (51) ──────────────────────────────────────

describe('Report Drift Support', () => {
  it('51 — formatJsonReport includes drift field when provided', () => {
    const evalResults = runEvalSuite(GOLDEN_SCENARIOS);
    const thresholdCheck = checkThresholds(evalResults.summary);
    const drift = { drifted: false, changes: [], warnings: [] };
    const report = formatJsonReport(evalResults, thresholdCheck, drift);
    expect(report).toHaveProperty('drift');
    expect(report.drift.drifted).toBe(false);
  });

  it('51b — formatJsonReport omits drift field when null', () => {
    const evalResults = runEvalSuite(GOLDEN_SCENARIOS);
    const thresholdCheck = checkThresholds(evalResults.summary);
    const report = formatJsonReport(evalResults, thresholdCheck);
    expect(report).not.toHaveProperty('drift');
  });

  it('51c — formatMarkdownReport includes drift section when present', () => {
    const evalResults = runEvalSuite(GOLDEN_SCENARIOS);
    const thresholdCheck = checkThresholds(evalResults.summary);
    const drift = {
      drifted: true,
      changes: [{ field: 'summary.total', baseline: 27, current: 53, severity: 'CHANGE' }],
      warnings: [],
    };
    const report = formatJsonReport(evalResults, thresholdCheck, drift);
    const md = formatMarkdownReport(report);
    expect(md).toContain('## Drift Detection');
    expect(md).toContain('summary.total');
    expect(md).toContain('CHANGE');
  });
});

// ── Helper ───────────────────────────────────────────────────────────────────

/** Get one scenario per category (excluding the given id) to satisfy coverage guard */
function getOnePerCategory(excludeId) {
  const seen = new Set();
  const result = [];
  for (const s of GOLDEN_SCENARIOS) {
    if (s.id === excludeId) continue;
    if (!seen.has(s.category)) {
      seen.add(s.category);
      result.push(s);
    }
  }
  return result;
}
