/**
 * AI chat voice endpoint middleware-order contract.
 *
 * Voice provider calls must share the authenticated AI usage/anomaly layer.
 * TTS also sends caller-provided text to Gemini, so PII sanitization must run
 * before the route handler reaches fetch().
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const ROUTE_SOURCE = readFileSync(
  resolve(import.meta.dirname, '../../routes/aiChatRoutes.mjs'),
  'utf8',
);

function routeDeclaration(path) {
  return ROUTE_SOURCE
    .split('\n')
    .find((line) => line.includes(`router.post('${path}'`)) || '';
}

describe('AI chat voice endpoint safety', () => {
  it('tracks transcription provider usage before accepting the audio upload', () => {
    expect(routeDeclaration('/transcribe')).toContain(
      "requireSubscription('pro', { feature: 'generation' }), aiRateLimiter, audioUpload.single('audio')",
    );
  });

  it('sanitizes TTS text after usage checks and before the provider handler', () => {
    expect(routeDeclaration('/tts')).toContain(
      "requireSubscription('pro', { feature: 'generation' }), aiRateLimiter, strictPiiMiddleware, async",
    );
  });
});
