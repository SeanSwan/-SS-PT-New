/**
 * Mock Adapter Factory — Phase 7
 * ================================
 * Creates adapter-shaped objects with deterministic, controllable behavior
 * for A/B benchmarking without real API calls.
 *
 * Conforms to: { name, isConfigured(), generateWorkoutDraft(ctx) }
 *
 * No actual delays — latencyMs is recorded in result metadata. Tests run fast.
 */
import { normalizeTokenUsage } from '../../services/ai/adapters/adapterUtils.mjs';
import { makeProviderError } from '../../services/ai/adapters/adapterUtils.mjs';

const DEFAULT_RAW_TEXT = JSON.stringify({
  planName: 'Mock Workout Plan',
  exercises: [{ name: 'Squat', sets: 3, reps: 10 }],
});

/**
 * Create a mock adapter with deterministic responses.
 *
 * @param {string} name — Provider name (e.g. 'openai')
 * @param {{
 *   model: string,
 *   responses: import('./abDataset.mjs').MockResponseConfig | import('./abDataset.mjs').MockResponseConfig[],
 * }} config
 * @returns {{ name: string, isConfigured: () => boolean, generateWorkoutDraft: (ctx: any) => Promise<any> }}
 */
export function createMockAdapter(name, config) {
  const { model, responses } = config;
  const responseArray = Array.isArray(responses) ? responses : [responses];
  let callIndex = 0;

  return {
    name,

    isConfigured() {
      return true;
    },

    async generateWorkoutDraft(_ctx) {
      const response = responseArray[callIndex % responseArray.length];
      callIndex++;

      if (!response.success) {
        throw makeProviderError(
          name,
          response.errorCode || 'UNKNOWN_PROVIDER_ERROR',
          response.errorMessage || `Mock ${name} error`,
          { retryable: false }
        );
      }

      return {
        provider: name,
        model,
        rawText: response.rawText || DEFAULT_RAW_TEXT,
        latencyMs: response.latencyMs || 0,
        finishReason: response.finishReason || 'stop',
        tokenUsage: normalizeTokenUsage(model, {
          inputTokens: response.inputTokens ?? 0,
          outputTokens: response.outputTokens ?? 0,
        }),
      };
    },
  };
}
