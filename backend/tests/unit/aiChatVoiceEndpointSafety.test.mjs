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
    // Ordering, not adjacency. The original assertion required these three to
    // be contiguous, which forbade inserting any further pre-upload gate — and
    // a pre-upload gate is exactly what the AI-consent check has to be, so a
    // withdrawn-consent request is refused without buffering 25MB of audio.
    // This still fails if a usage check moves after the upload, which is the
    // property the test name claims.
    const decl = routeDeclaration('/transcribe');
    const order = [
      "requireSubscription('pro', { feature: 'generation' })",
      'aiRateLimiter',
      "audioUpload.single('audio')",
    ].map((token) => {
      const at = decl.indexOf(token);
      expect(at, `missing from /transcribe declaration: ${token}`).toBeGreaterThan(-1);
      return at;
    });
    expect(order[0]).toBeLessThan(order[1]);
    expect(order[1]).toBeLessThan(order[2]);
  });

  it('sanitizes TTS text after usage checks and before the provider handler', () => {
    expect(routeDeclaration('/tts')).toContain(
      "requireSubscription('pro', { feature: 'generation' }), aiRateLimiter, strictPiiMiddleware, async",
    );
  });
});
