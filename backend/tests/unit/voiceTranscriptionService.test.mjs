/**
 * Voice transcription vocabulary bias — S2 contract
 * ==================================================
 * Ensures the existing PLAUD vocabulary reaches Gemini without forwarding
 * client-identifying terms to the provider prompt.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const originalFetch = global.fetch;
const originalGoogleKey = process.env.GOOGLE_API_KEY;
const originalGeminiKey = process.env.GEMINI_API_KEY;

const { transcribeAudio } = await import('../../services/voiceTranscriptionService.mjs');

function providerResponse(text) {
  return {
    ok: true,
    async json() {
      return {
        candidates: [{ content: { parts: [{ text }] } }],
        usageMetadata: {},
      };
    },
  };
}

describe('transcribeAudio vocabulary bias', () => {
  beforeEach(() => {
    process.env.GOOGLE_API_KEY = 'test-key';
    delete process.env.GEMINI_API_KEY;
  });

  afterEach(() => {
    global.fetch = originalFetch;
    if (originalGoogleKey === undefined) delete process.env.GOOGLE_API_KEY;
    else process.env.GOOGLE_API_KEY = originalGoogleKey;
    if (originalGeminiKey === undefined) delete process.env.GEMINI_API_KEY;
    else process.env.GEMINI_API_KEY = originalGeminiKey;
  });

  it('sends safe vocabulary terms to Gemini and keeps PII out of its prompt', async () => {
    global.fetch = vi.fn(async () => providerResponse('one eighty five'));

    await transcribeAudio(Buffer.from('audio'), 'set.webm', {
      biasTerms: ['bench press', '185 pounds', 'sean@example.com', 'Sean Swan'],
      piiNameHints: ['Sean Swan'],
    });

    const body = JSON.parse(global.fetch.mock.calls[0][1].body);
    const prompt = body.contents[0].parts[0].text;
    expect(prompt).toContain('bench press');
    expect(prompt).toContain('185 pounds');
    expect(prompt).not.toContain('sean@example.com');
    expect(prompt).not.toContain('Sean Swan');
  });
});
