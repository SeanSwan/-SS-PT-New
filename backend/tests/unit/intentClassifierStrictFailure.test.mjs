/**
 * intentClassifierStrictFailure.test.mjs
 * =======================================
 * Invalid classifier output must fail closed instead of opening chatbot mode.
 */
import { afterEach, describe, expect, it, vi } from 'vitest';

const { mockSendChatMessage } = vi.hoisted(() => ({
  mockSendChatMessage: vi.fn(),
}));

vi.mock('../../services/aiChatService.mjs', () => ({
  sendChatMessage: mockSendChatMessage,
}));

const { classifyIntent } = await import('../../services/ai/intentClassifier.mjs');

afterEach(() => {
  mockSendChatMessage.mockReset();
  vi.useRealTimers();
});

describe('intent classifier strict failures', () => {
  it.each([
    ['plain prose', 'I rearranged the workout and here is a long explanation.'],
    ['fenced JSON', '```json\n{"intent":"chat","clientRef":null,"params":{},"confidence":1}\n```'],
    ['prose-wrapped JSON', 'Sure: {"intent":"chat","clientRef":null,"params":{},"confidence":1}'],
    ['schema-invalid JSON', '{"intent":"chat","confidence":"certain"}'],
    ['JSON with undeclared prose', '{"intent":"chat","clientRef":null,"params":{},"confidence":1,"message":"wall of text"}'],
  ])('returns PARSE_FAIL for %s instead of chat', async (_label, content) => {
    mockSendChatMessage.mockResolvedValue({ ok: true, content });

    const result = await classifyIntent('rearrange this workout precisely', 'admin');

    expect(result).toEqual({
      intent: 'classification_error',
      clientRef: null,
      params: { code: 'PARSE_FAIL' },
      confidence: 0,
    });
    expect(result.intent).not.toBe('chat');
  });

  it('returns CLASSIFICATION_FAILED when all providers fail', async () => {
    mockSendChatMessage.mockResolvedValue({ ok: false, error: 'provider unavailable' });

    const result = await classifyIntent('rearrange this workout precisely', 'admin');

    expect(result).toEqual({
      intent: 'classification_error',
      clientRef: null,
      params: { code: 'CLASSIFICATION_FAILED' },
      confidence: 0,
    });
    expect(result.intent).not.toBe('chat');
  });
});
