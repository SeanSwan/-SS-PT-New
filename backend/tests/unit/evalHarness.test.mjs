/**
 * Eval Harness Tests — Phase 6
 * ==============================
 * 29 tests covering dataset integrity, runner correctness,
 * threshold checking, report formatting, and guard behavior.
 */
import { describe, it, expect } from 'vitest';
import { GOLDEN_SCENARIOS, DATASET_VERSION } from '../../eval/goldenDataset.mjs';
import { runEvalSuite, computeExitCode } from '../../eval/evalRunner.mjs';
import { EVAL_THRESHOLDS, checkThresholds } from '../../eval/evalThresholds.mjs';
import { formatJsonReport, formatMarkdownReport } from '../../eval/evalReport.mjs';

// ── Dataset Integrity (1-4) ──────────────────────────────────────────────────

describe('Golden Dataset Integrity', () => {
  it('1 — has ≥20 scenarios', () => {
    expect(GOLDEN_SCENARIOS.length).toBeGreaterThanOrEqual(20);
    expect(GOLDEN_SCENARIOS.length).toBe(27);
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
    // 3 total, 2 knownGap, 1 gated
    expect(adversarial.total).toBe(3);
    expect(adversarial.knownGaps).toBe(2);
    expect(adversarial.gated).toBe(1);
    expect(adversarial.passRate).toBe(1.0); // 1/1, not 1/3
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
