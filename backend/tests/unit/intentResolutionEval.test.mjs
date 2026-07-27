/**
 * Intent Resolution Eval — the golden set, and the contract it holds
 * ==================================================================
 *
 * The existing eval harness measured whether AI OUTPUT was valid. Nothing
 * measured whether an utterance RESOLVES to the right command against the right
 * client. Usage telemetry only proves voice was used, never that it was
 * understood — that gap is the line between a voice feature and a voice product.
 *
 * These run against `deterministicCoachIntakeIntent` (zero imports, pure regex),
 * so intent resolution is testable offline with no API key and no flake.
 *
 * The wrong-client cases are the ones that matter most. A misresolved client is
 * not a wrong answer — it is a write to the wrong person's record. C0.5 proved
 * that path was live in production on a destructive command.
 */
import { describe, expect, it } from 'vitest';
import { classifyDeterministicCoachIntakeIntent } from '../../services/ai/deterministicCoachIntakeIntent.mjs';
import { INTENT_RESOLUTION_SCENARIOS } from '../../eval/intentResolutionScenarios.mjs';
import { EVAL_THRESHOLDS } from '../../eval/evalThresholds.mjs';

const resolve = (utterance) => {
  const r = classifyDeterministicCoachIntakeIntent(utterance);
  return {
    intent: r ? (r.intent ?? null) : null,
    clientRef: r && r.clientRef !== undefined ? r.clientRef : null,
  };
};

describe('intent resolution golden set', () => {
  it('has scenarios', () => {
    expect(INTENT_RESOLUTION_SCENARIOS.length).toBeGreaterThan(0);
  });

  // Every scenario, individually named so a failure says WHICH utterance broke.
  for (const scenario of INTENT_RESOLUTION_SCENARIOS) {
    it(`${scenario.id}: ${scenario.description}`, () => {
      const actual = resolve(scenario.input);
      expect(actual.intent).toBe(scenario.expected.intent);
      if (scenario.expected.clientRef !== undefined) {
        expect(actual.clientRef).toBe(scenario.expected.clientRef);
      }
    });
  }
});

describe('wrong-client resolution safety', () => {
  it('never invents a client reference from an utterance that names nobody', () => {
    for (const utterance of [
      'what did we do last time',
      'review next intake',
      'open plaud',
    ]) {
      expect(resolve(utterance).clientRef).toBeNull();
    }
  });

  it('extracts a named client verbatim rather than guessing an id', () => {
    // Synthetic name (rule 8). The router returns a REFERENCE; resolving it to
    // a real client id is the caller's job, under the client-lock.
    expect(resolve('what did Ava Stone do last workout').clientRef).toBe('Ava Stone');
  });

  it('resolves nothing for empty, whitespace, and ordinary conversation', () => {
    for (const utterance of ['', '   ', 'thanks, that was a great session today']) {
      expect(resolve(utterance).intent).toBeNull();
    }
  });

  it('does not map a destructive phrase to any silent command', () => {
    // If this ever resolves, it must be to a confirmation-gated intent.
    expect(resolve('delete the workout').intent).toBeNull();
  });
});

describe('harness integration', () => {
  it('registers the intent_resolution category with a 100% gate', () => {
    expect(EVAL_THRESHOLDS.intent_resolution).toBeDefined();
    // Deterministic router — no model sampling, so any miss is a real
    // regression rather than variance. The gate must not soften.
    expect(EVAL_THRESHOLDS.intent_resolution.minPassRate).toBe(1.0);
  });

  it('tags every scenario with the category and type the runner dispatches on', () => {
    for (const s of INTENT_RESOLUTION_SCENARIOS) {
      expect(s.category).toBe('intent_resolution');
      expect(s.type).toBe('intent_resolution');
      expect(typeof s.input).toBe('string');
      expect(s.expected).toBeDefined();
    }
  });

  it('gives every scenario a unique id', () => {
    const ids = INTENT_RESOLUTION_SCENARIOS.map((s) => s.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});
