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

  it('fallback adapter classifies recurring repair commands as recurring repair proposals', async () => {
    const adapter = createScheduleAiFallbackAdapter();
    const result = await adapter.generateTurn({ message: 'Repair the recurring series conflict next Monday.' });

    expect(result.toolCalls[0]).toMatchObject({
      type: 'draft_recurring_repair',
      mutatesData: false,
      executionPolicy: 'proposal_only',
      riskLevel: 'schedule_write',
    });
    expect(result.content).toContain('recurring repair');
  });
  it('fallback adapter classifies recovery and pain safety commands as read-only advisory', async () => {
    const adapter = createScheduleAiFallbackAdapter();
    const result = await adapter.generateTurn({ message: 'Check recovery risk and pain safety before scheduling.' });

    expect(result.toolCalls[0]).toMatchObject({
      type: 'recovery_safety_advisory',
      mutatesData: false,
      executionPolicy: 'read_only',
      riskLevel: 'low',
    });
    expect(result.content).toContain('recovery');
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
    const body = JSON.parse(options.body);
    expect(body).toMatchObject({
      model: 'local-swan',
      messages: [
        { role: 'system', content: 'You are schedule AI.' },
        { role: 'user', content: expect.stringContaining('Show attention queue.') },
      ],
    });
    expect(JSON.parse(body.messages[1].content)).toMatchObject({
      responseFormat: { toolType: 'one of tools[].type' },
      message: 'Show attention queue.',
    });
    expect(result).toMatchObject({ provider: 'local_gpu', model: 'local-swan', content: 'Local response' });
  });
  it('local GPU adapter preserves OpenAI-compatible tool intent instead of defaulting to attention queue', async () => {
    const fetchImpl = vi.fn(async () => ({
      ok: true,
      status: 200,
      json: async () => ({
        model: 'local-swan',
        choices: [{
          message: {
            content: 'I can draft a move for review.',
            tool_calls: [{ function: { name: 'draft_move', arguments: '{}' } }],
          },
          finish_reason: 'tool_calls',
        }],
        usage: { prompt_tokens: 8, completion_tokens: 4, total_tokens: 12 },
      }),
    }));
    const adapter = createScheduleAiLocalGpuAdapter({
      baseUrl: 'http://127.0.0.1:11434/v1',
      model: 'local-swan',
      fetchImpl,
    });

    const result = await adapter.generateTurn({
      systemMessage: 'You are schedule AI.',
      message: 'Move Client #12 to 4 PM.',
      tools: [{ type: 'draft_move' }],
      timeoutMs: 1000,
    });

    expect(result.toolCalls[0]).toMatchObject({
      type: 'draft_move',
      executionPolicy: 'proposal_only',
    });
  });

  it('local GPU adapter accepts tool-call-only responses from OpenAI-compatible servers', async () => {
    const fetchImpl = vi.fn(async () => ({
      ok: true,
      status: 200,
      json: async () => ({
        model: 'local-swan',
        choices: [{
          message: {
            content: null,
            tool_calls: [{ function: { name: 'draft_booking', arguments: '{"toolType":"draft_booking"}' } }],
          },
          finish_reason: 'tool_calls',
        }],
        usage: { prompt_tokens: 8, completion_tokens: 0, total_tokens: 8 },
      }),
    }));
    const adapter = createScheduleAiLocalGpuAdapter({
      baseUrl: 'http://127.0.0.1:11434/v1',
      model: 'local-swan',
      fetchImpl,
    });

    const result = await adapter.generateTurn({
      systemMessage: 'You are schedule AI.',
      message: 'Book Client #12 tomorrow.',
      tools: [{ type: 'draft_booking' }],
      timeoutMs: 1000,
    });

    expect(result.content).toContain('confirm before applying');
    expect(result.toolCalls[0]).toMatchObject({
      type: 'draft_booking',
      executionPolicy: 'proposal_only',
    });
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
  it('Gemini adapter extracts JSON tool intent from model text', async () => {
    class FakeGoogleGenerativeAI {
      getGenerativeModel() {
        return {
          generateContent: async () => ({
            response: {
              text: () => JSON.stringify({
                toolType: 'recovery_safety_advisory',
                response: 'Review recovery data before scheduling.',
              }),
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
      message: 'Check recovery before scheduling.',
      tools: [{ type: 'recovery_safety_advisory' }],
      timeoutMs: 1000,
    });

    expect(result.content).toBe('Review recovery data before scheduling.');
    expect(result.toolCalls[0]).toMatchObject({
      type: 'recovery_safety_advisory',
      executionPolicy: 'read_only',
    });
  });
});
