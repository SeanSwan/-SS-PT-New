import { describe, expect, it, vi } from 'vitest';
import { createScheduleAiFallbackAdapter } from '../../services/schedule-ai/adapters/scheduleAiFallbackAdapter.mjs';
import { createScheduleAiGeminiAdapter } from '../../services/schedule-ai/adapters/scheduleAiGeminiAdapter.mjs';
import { createScheduleAiLocalGpuAdapter } from '../../services/schedule-ai/adapters/scheduleAiLocalGpuAdapter.mjs';

describe('schedule AI provider adapters', () => {
  it('fallback adapter classifies billing commands as manual-only payment review', async () => {
    const adapter = createScheduleAiFallbackAdapter();
    const result = await adapter.generateTurn({ message: 'Charge that late cancellation.' });

    expect(result.provider).toBe('fallback');
    expect(result.toolCalls[0]).toMatchObject({
      type: 'open_payment_review',
      mutatesData: false,
      executionPolicy: 'manual_only',
      riskLevel: 'billing_review',
    });
  });

  it('local GPU adapter calls an OpenAI-compatible chat completions endpoint', async () => {
    const fetchImpl = vi.fn(async (_url, options) => ({
      ok: true,
      status: 200,
      json: async () => ({
        model: 'local-swan',
        choices: [{ message: { content: 'Local response' }, finish_reason: 'stop' }],
        usage: { prompt_tokens: 8, completion_tokens: 4, total_tokens: 12 },
      }),
      text: async () => 'ok',
      options,
    }));
    const adapter = createScheduleAiLocalGpuAdapter({
      baseUrl: 'http://127.0.0.1:11434/v1',
      model: 'local-swan',
      apiKey: 'local-key',
      fetchImpl,
    });

    const result = await adapter.generateTurn({
      systemMessage: 'You are schedule AI.',
      message: 'Show attention queue.',
      tools: [],
      timeoutMs: 1000,
    });

    expect(fetchImpl).toHaveBeenCalledTimes(1);
    const [url, options] = fetchImpl.mock.calls[0];
    expect(url).toBe('http://127.0.0.1:11434/v1/chat/completions');
    expect(JSON.parse(options.body)).toMatchObject({
      model: 'local-swan',
      messages: [
        { role: 'system', content: 'You are schedule AI.' },
        { role: 'user', content: 'Show attention queue.' },
      ],
    });
    expect(result).toMatchObject({ provider: 'local_gpu', model: 'local-swan', content: 'Local response' });
  });

  it('Gemini adapter supports injected SDK loading and normalized text output', async () => {
    class FakeGoogleGenerativeAI {
      getGenerativeModel() {
        return {
          generateContent: async () => ({
            response: {
              text: () => 'Gemini schedule response',
              candidates: [{ finishReason: 'STOP' }],
              usageMetadata: { promptTokenCount: 9, candidatesTokenCount: 6, totalTokenCount: 15 },
            },
          }),
        };
      }
    }
    const adapter = createScheduleAiGeminiAdapter({
      apiKeyResolver: () => 'gemini-key',
      moduleLoader: async () => ({ GoogleGenerativeAI: FakeGoogleGenerativeAI }),
    });

    const result = await adapter.generateTurn({
      systemMessage: 'You are schedule AI.',
      message: 'Help with the schedule.',
      timeoutMs: 1000,
    });

    expect(adapter.isConfigured()).toBe(true);
    expect(result).toMatchObject({
      provider: 'gemini_cloud',
      model: expect.any(String),
      content: 'Gemini schedule response',
      finishReason: 'stop',
    });
  });
});
