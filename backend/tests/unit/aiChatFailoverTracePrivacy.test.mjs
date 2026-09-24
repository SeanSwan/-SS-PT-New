import { describe, expect, it, vi } from 'vitest';

vi.mock('../../services/analyticsExerciseHistoryService.mjs', () => ({
  getExerciseHistoryFromLogs: vi.fn().mockResolvedValue({ exercises: [] }),
}));
import {
  sanitizeAiChatMetadataForClient,
  sanitizeAiFailoverTrace,
} from '../../services/aiChatService.mjs';

// This file covers the PURE sanitizer functions only. The former third test read
// routes/aiChatRoutes.mjs as text and asserted the sanitizer call was spelled a
// particular way; the read-service extraction moved the call into
// services/ai/coachConversationReadAccess.mjs:229 (`sanitizeMetadata(found.metadata)`),
// so the guard failed on formatting, not behaviour. The route-level property it
// was approximating — client-visible metadata is sanitized, and persisted
// failover metadata is sanitized before the conversation update — is now
// exercised through the mounted router with the REAL sanitizer in
// tests/api/coachConversationReadAuthorization.test.mjs.
describe('AI chat failover trace privacy', () => {
  it('redacts provider error details before traces can be stored or returned', () => {
    const trace = sanitizeAiFailoverTrace([
      'gemini:401 API key sk-proj-secret rejected by provider',
      'openai:connect ETIMEDOUT 10.0.0.1:443',
      'anthropic:success',
      '',
      null,
    ]);

    expect(trace).toEqual([
      'gemini:provider_error',
      'openai:provider_error',
      'anthropic:success',
    ]);
    expect(JSON.stringify(trace)).not.toMatch(/401|API key|sk-proj|ETIMEDOUT|10\.0\.0\.1/);
  });

  it('scrubs persisted conversation metadata before returning it to clients', () => {
    const metadata = sanitizeAiChatMetadataForClient({
      responseStyle: 'concise',
      lastProvider: 'fallback',
      failoverTrace: [
        'gemini:503 upstream says database password invalid',
        'openai:success',
      ],
    });

    expect(metadata).toEqual({
      responseStyle: 'concise',
      lastProvider: 'fallback',
      failoverTrace: ['gemini:provider_error', 'openai:success'],
    });
    expect(JSON.stringify(metadata)).not.toMatch(/503|database password|upstream/);
  });
});
