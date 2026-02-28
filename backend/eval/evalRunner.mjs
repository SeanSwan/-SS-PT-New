/**
 * Eval Runner — Phase 6
 * ======================
 * Core harness: runs golden scenarios through validators, collects results.
 * Runtime dataset validation runs BEFORE any scenario is executed.
 */
import { runValidationPipeline } from '../services/ai/outputValidator.mjs';
import { runLongHorizonValidationPipeline } from '../services/ai/longHorizonOutputValidator.mjs';
import { EVAL_THRESHOLDS } from './evalThresholds.mjs';
import logger from '../utils/logger.mjs';

/** Allowed scenario types — anything else is a dataset mistake */
const VALID_SCENARIO_TYPES = new Set(['workout', 'long_horizon']);

// ── Runtime Dataset Validation ───────────────────────────────────────────────

/**
 * Validate dataset integrity before executing scenarios.
 * Throws immediately on any structural issue.
 */
function validateDataset(scenarios) {
  // 1. Category validation: every scenario.category must exist in EVAL_THRESHOLDS
  const unknownCategories = [...new Set(
    scenarios
      .map(s => s.category)
      .filter(c => !(c in EVAL_THRESHOLDS))
  )].sort();

  if (unknownCategories.length > 0) {
    throw new Error(
      `Unknown scenario categories not in EVAL_THRESHOLDS: ${unknownCategories.join(', ')}`
    );
  }

  // 2. Scenario type validation: only 'workout' | 'long_horizon' allowed
  const invalidTypes = [...new Set(
    scenarios
      .map(s => s.type)
      .filter(t => !VALID_SCENARIO_TYPES.has(t))
  )].sort();

  if (invalidTypes.length > 0) {
    throw new Error(
      `Unknown scenario types: ${invalidTypes.join(', ')}. Allowed: ${[...VALID_SCENARIO_TYPES].join(', ')}`
    );
  }

  // 3. knownGap schema validation: knownGap=true requires non-empty rationale
  for (const s of scenarios) {
    if (s.knownGap === true) {
      if (typeof s.rationale !== 'string' || s.rationale.trim().length === 0) {
        throw new Error(
          `Scenario '${s.id}' has knownGap=true but missing or empty rationale`
        );
      }
    }
  }

  // 4. Threshold coverage guard: every key in EVAL_THRESHOLDS must have ≥1 scenario
  const scenarioCategories = new Set(scenarios.map(s => s.category));
  const missingCategories = Object.keys(EVAL_THRESHOLDS)
    .filter(cat => !scenarioCategories.has(cat))
    .sort();

  if (missingCategories.length > 0) {
    throw new Error(
      `EVAL_THRESHOLDS categories with no scenarios: ${missingCategories.join(', ')}`
    );
  }
}

// ── Scenario Execution ───────────────────────────────────────────────────────

/**
 * Run a single scenario through the appropriate validator.
 * @returns {{ pass: boolean, scenarioId: string, category: string, expected: object, actual: object, reason?: string }}
 */
function runScenario(scenario) {
  const { id, type, input, opts, expected } = scenario;

  let actual;
  if (type === 'long_horizon') {
    actual = runLongHorizonValidationPipeline(input, opts);
  } else {
    actual = runValidationPipeline(input, opts);
  }

  // Compare ok
  if (actual.ok !== expected.ok) {
    return {
      pass: false,
      scenarioId: id,
      category: scenario.category,
      expected,
      actual: { ok: actual.ok, failStage: actual.failStage, warnings: actual.warnings?.length ?? 0 },
      reason: `Expected ok=${expected.ok} but got ok=${actual.ok} (failStage=${actual.failStage}, failReason=${actual.failReason})`,
    };
  }

  // Compare failStage if specified
  if (expected.failStage !== undefined && expected.failStage !== null) {
    if (actual.failStage !== expected.failStage) {
      return {
        pass: false,
        scenarioId: id,
        category: scenario.category,
        expected,
        actual: { ok: actual.ok, failStage: actual.failStage, warnings: actual.warnings?.length ?? 0 },
        reason: `Expected failStage='${expected.failStage}' but got '${actual.failStage}'`,
      };
    }
  }

  // Compare warningCount if specified
  if (expected.warningCount !== undefined) {
    const actualWarnings = actual.warnings?.length ?? 0;
    if (typeof expected.warningCount === 'number') {
      if (actualWarnings !== expected.warningCount) {
        return {
          pass: false,
          scenarioId: id,
          category: scenario.category,
          expected,
          actual: { ok: actual.ok, failStage: actual.failStage, warnings: actualWarnings },
          reason: `Expected warningCount=${expected.warningCount} but got ${actualWarnings}`,
        };
      }
    } else if (typeof expected.warningCount === 'object') {
      if (expected.warningCount.min !== undefined && actualWarnings < expected.warningCount.min) {
        return {
          pass: false,
          scenarioId: id,
          category: scenario.category,
          expected,
          actual: { ok: actual.ok, failStage: actual.failStage, warnings: actualWarnings },
          reason: `Expected warningCount >= ${expected.warningCount.min} but got ${actualWarnings}`,
        };
      }
      if (expected.warningCount.max !== undefined && actualWarnings > expected.warningCount.max) {
        return {
          pass: false,
          scenarioId: id,
          category: scenario.category,
          expected,
          actual: { ok: actual.ok, failStage: actual.failStage, warnings: actualWarnings },
          reason: `Expected warningCount <= ${expected.warningCount.max} but got ${actualWarnings}`,
        };
      }
    }
  }

  return {
    pass: true,
    scenarioId: id,
    category: scenario.category,
    expected,
    actual: { ok: actual.ok, failStage: actual.failStage, warnings: actual.warnings?.length ?? 0 },
  };
}

// ── Suite Execution ──────────────────────────────────────────────────────────

/**
 * Run the full eval suite.
 * @param {Array} scenarios - Golden dataset scenarios
 * @returns {{ results: Array, summary: Object, knownGaps: Array }}
 */
export function runEvalSuite(scenarios) {
  // Runtime validation (throws on failure)
  validateDataset(scenarios);

  const startMs = Date.now();
  // Suppress expected PII detection logs during eval (they pollute CI stderr)
  let results;
  logger.silent = true;
  try {
    results = scenarios.map(runScenario);
  } finally {
    logger.silent = false;
  }
  const durationMs = Date.now() - startMs;

  // Separate knownGap results
  const knownGapIds = new Set(
    scenarios.filter(s => s.knownGap).map(s => s.id)
  );
  const knownGaps = scenarios
    .filter(s => s.knownGap)
    .map(s => ({ id: s.id, description: s.description, rationale: s.rationale }));

  // Build per-category stats
  const categories = {};
  for (const cat of Object.keys(EVAL_THRESHOLDS)) {
    const catResults = results.filter(r => r.category === cat);
    const gatedResults = catResults.filter(r => !knownGapIds.has(r.scenarioId));

    categories[cat] = {
      total: catResults.length,
      gated: gatedResults.length,
      passed: gatedResults.filter(r => r.pass).length,
      failed: gatedResults.filter(r => !r.pass).length,
      knownGaps: catResults.length - gatedResults.length,
      passRate: gatedResults.length > 0
        ? gatedResults.filter(r => r.pass).length / gatedResults.length
        : 1.0,
    };
  }

  // Build global summary
  const gatedResults = results.filter(r => !knownGapIds.has(r.scenarioId));
  const correctnessFailures = results.filter(r => !r.pass).length;

  const summary = {
    total: results.length,
    gated: gatedResults.length,
    passed: gatedResults.filter(r => r.pass).length,
    failed: gatedResults.filter(r => !r.pass).length,
    correctnessFailures,
    knownGaps: knownGapIds.size,
    passRate: gatedResults.length > 0
      ? gatedResults.filter(r => r.pass).length / gatedResults.length
      : 1.0,
    durationMs,
    categories,
  };

  return { results, summary, knownGaps };
}

// ── Exit Code Computation ────────────────────────────────────────────────────

/**
 * Pure function: compute exit code without side effects.
 * Gate 1 (correctness): any scenario mismatch → 1
 * Gate 2 (thresholds): any threshold failure → 1
 *
 * @param {{ results: Array }} evalResults
 * @param {{ passed: boolean }} thresholdCheck
 * @returns {0|1}
 */
export function computeExitCode(evalResults, thresholdCheck) {
  // Gate 1: Correctness — any scenario mismatch (including knownGap)
  if (evalResults.results.some(r => !r.pass)) return 1;

  // Gate 2: Thresholds
  if (!thresholdCheck.passed) return 1;

  return 0;
}
