import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  sanitizeAiChatMetadataForClient,
  sanitizeAiFailoverTrace,
} from '../../services/aiChatService.mjs';

const routeSource = readFileSync(resolve(__dirname, '../../routes/aiChatRoutes.mjs'), 'utf8');

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

  it('routes all client-visible metadata through the sanitizer', () => {
    expect(routeSource).toContain("sanitizeAiChatMetadataForClient");
    expect(routeSource).toContain('metadata: sanitizeAiChatMetadataForClient(conversation.metadata)');
    expect(routeSource).toContain('const updatedMetadata = sanitizeAiChatMetadataForClient({');
    expect(routeSource).not.toContain('metadata: conversation.metadata');
  });
});
