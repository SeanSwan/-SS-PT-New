/**
 * jsonLlmParser.test
 * ==================
 * Hostile-review TEST-4 gap closure. Exercises the REAL jsonLlmParser (only
 * global fetch is mocked): robust JSON extraction + the Gemini-first provider
 * chain with OpenAI fallback + the no-provider error + the no-Grok invariant.
 */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { runJsonLlmChain, __test__ } from '../../services/ai/jsonLlmParser.mjs';

const { extractJson } = __test__;

describe('extractJson', () => {
  it('parses raw JSON', () => {
    expect(extractJson('{"a":1}')).toEqual({ a: 1 });
  });
  it('parses fenced ```json``` blocks', () => {
    expect(extractJson('```json\n{"a":1}\n```')).toEqual({ a: 1 });
  });
  it('extracts a balanced object out of prose, honoring braces inside string values', () => {
    expect(extractJson('here you go: {"desc":"a {b} c","n":2} thanks')).toEqual({ desc: 'a {b} c', n: 2 });
  });
  it('throws on empty / whitespace input', () => {
    expect(() => extractJson('   ')).toThrow(/empty/i);
  });
  it('throws on non-JSON noise', () => {
    expect(() => extractJson('totally not json at all')).toThrow(/invalid JSON/i);
  });
});

describe('runJsonLlmChain provider chain', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it('throws when no provider key is configured', async () => {
    vi.stubEnv('GOOGLE_API_KEY', '');
    vi.stubEnv('GEMINI_API_KEY', '');
    vi.stubEnv('OPENAI_API_KEY', '');
    await expect(runJsonLlmChain({ systemPrompt: 's', userText: 'u' })).rejects.toThrow(/No AI parser provider/i);
  });

  it('uses Gemini first, returns parsed JSON, never calls Grok/X-AI', async () => {
    vi.stubEnv('GOOGLE_API_KEY', 'g-key');
    vi.stubEnv('GEMINI_API_KEY', '');
    vi.stubEnv('OPENAI_API_KEY', '');
    const urls = [];
    vi.stubGlobal('fetch', vi.fn(async (url) => {
      urls.push(String(url));
      return { ok: true, json: async () => ({ candidates: [{ content: { parts: [{ text: '{"meals":[]}' }] } }] }) };
    }));
    const out = await runJsonLlmChain({ systemPrompt: 's', userText: 'u', label: 'X' });
    expect(out).toEqual({ meals: [] });
    expect(urls[0]).toContain('generativelanguage.googleapis.com');
    expect(urls.join()).not.toMatch(/grok|x\.ai/i);
  });

  it('falls back to OpenAI only when Gemini fails AND OpenAI is configured', async () => {
    vi.stubEnv('GOOGLE_API_KEY', 'g-key');
    vi.stubEnv('OPENAI_API_KEY', 'o-key');
    const urls = [];
    vi.stubGlobal('fetch', vi.fn(async (url) => {
      urls.push(String(url));
      if (String(url).includes('googleapis')) return { ok: false, status: 500, text: async () => 'gemini boom' };
      return { ok: true, json: async () => ({ choices: [{ message: { content: '{"ok":true}' } }] }) };
    }));
    const out = await runJsonLlmChain({ systemPrompt: 's', userText: 'u', label: 'X' });
    expect(out).toEqual({ ok: true });
    expect(urls.some((u) => u.includes('googleapis'))).toBe(true);
    expect(urls.some((u) => u.includes('api.openai.com'))).toBe(true);
    expect(urls.join()).not.toMatch(/grok|x\.ai/i);
  });

  it('propagates Gemini failure when OpenAI is NOT configured (no silent success)', async () => {
    vi.stubEnv('GOOGLE_API_KEY', 'g-key');
    vi.stubEnv('OPENAI_API_KEY', '');
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: false, status: 503, text: async () => 'down' })));
    await expect(runJsonLlmChain({ systemPrompt: 's', userText: 'u', label: 'X' })).rejects.toThrow(/failed \(503\)/i);
  });
});
