/**
 * SCU S5 — complete caller inventory + forbidden-provider egress spy.
 *
 * S5 requires: (1) an inventory of every Coach chat path (aiChatService,
 * providerRouter and tools) proving all Coach callers share ONE boundary and
 * non-Coach callers keep their shapes through the compatibility adapter;
 * (2) a forbidden-provider spy test: with only an allowlisted provider keyed,
 * the legacy provider loop must never egress to a provider without a key
 * (T24's "no forbidden egress" property at the adapter level).
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import { sendChatMessage, coachProviderCompatAdapter } from '../../services/aiChatService.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.resolve(HERE, '..', '..');

const read = (rel) => fs.readFileSync(path.join(REPO, rel), 'utf8');

describe('S5 caller inventory (static)', () => {
  it('aiChatRoutes wires the Coach contexts through runCoachInference with the compat adapter', () => {
    const src = read('routes/aiChatRoutes.mjs');
    expect(src).toContain("import { runCoachInference } from '../services/ai/coachInferenceBoundary.mjs'");
    expect(src).toContain('coachProviderCompatAdapter');
    expect(src).toContain("runCoachInference({");
    expect(src).toContain('providerGenerate: coachProviderCompatAdapter');
    // The coach contexts are exactly the two Staff inference surfaces.
    expect(src).toContain("new Set(['coach_assistant', 'workout_generation'])");
    // Non-coach fallback keeps the legacy provider loop.
    expect(src).toMatch(/aiResult = await sendChatMessage\(promptMessages\)/);
  });

  it('aiChatService exports the compatibility adapter used by the boundary', () => {
    const src = read('services/aiChatService.mjs');
    expect(src).toContain('export function coachProviderCompatAdapter');
    // The adapter delegates to the legacy loop — non-Coach caller shapes are
    // preserved (same {ok, content, provider, model, tokenUsage, failoverTrace}).
    expect(src).toMatch(/coachProviderCompatAdapter\(messages\)\s*\{\s*return sendChatMessage\(messages\);/);
  });

  it('every sendChatMessage caller is inventoried: route, debate orchestrator, intent classifier', () => {
    const route = read('routes/aiChatRoutes.mjs');
    expect(route).toContain('sendChatMessage');
    const debate = read('services/ai/debate/debateOrchestrator.mjs');
    expect(debate).toContain('sendChatMessage');
    const classifier = read('services/ai/intentClassifier.mjs');
    expect(classifier).toContain('sendChatMessage');
    // The debate/intent callers are non-Coach-context consumers: they keep the
    // legacy shape (compat adapter territory), they do not get a second
    // provider selection of their own.
    expect(debate).not.toContain('runCoachInference');
    expect(classifier).not.toContain('runCoachInference');
  });

  it('the inference boundary is the only new model-touching module: tools are read-only', () => {
    const boundary = read('services/ai/coachInferenceBoundary.mjs');
    expect(boundary).toContain("from './coachProviderBoundary.mjs'");
    expect(boundary).toContain("from './coachModelResponseContract.mjs'");
    expect(boundary).toContain("from './coachEvidenceTools.mjs'");
    const tools = read('services/ai/coachEvidenceTools.mjs');
    // No write tool: the tool registry is exactly four read ids.
    expect(tools).toContain('COACH_EVIDENCE_TOOLS = {');
    expect(tools).not.toMatch(/COACH_EVIDENCE_TOOLS\s*=\s*\{[^}]*workout_log[^}]*\}/s);
  });
});

describe('S5 forbidden-provider egress spy (adapter level, T24 property)', () => {
  const KEYS = ['GEMINI_API_KEY', 'OPENAI_API_KEY', 'ANTHROPIC_API_KEY', 'VENICE_API_KEY'];
  const original = {};
  const fetchSpy = vi.fn();

  beforeEach(() => {
    for (const key of KEYS) original[key] = process.env[key];
    for (const key of KEYS) delete process.env[key];
    vi.stubGlobal('fetch', fetchSpy);
    fetchSpy.mockReset();
  });

  afterEach(() => {
    for (const key of KEYS) {
      if (original[key] === undefined) delete process.env[key];
      else process.env[key] = original[key];
    }
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('with only Gemini keyed, a failing Gemini call never egresses to unkeyed (forbidden) providers', async () => {
    process.env.GEMINI_API_KEY = 'test-key';
    // Gemini endpoint fails; the other three providers have NO keys.
    fetchSpy.mockImplementation(async () => {
      throw new Error('gemini down');
    });
    const result = await sendChatMessage([{ role: 'user', content: 'hi' }]);
    expect(result.ok).toBe(false);
    // Exactly one outbound call — to the keyed provider only.
    expect(fetchSpy).toHaveBeenCalledTimes(1);
    const [url] = fetchSpy.mock.calls[0];
    expect(String(url)).toContain('generativelanguage.googleapis.com');
    const hit = String(url);
    expect(hit).not.toContain('api.openai.com');
    expect(hit).not.toContain('api.anthropic.com');
    expect(hit).not.toContain('api.venice');
    // Trace carries the sanitized provider code, never the raw error body.
    expect(result.failoverTrace).toEqual(['gemini:provider_error']);
    expect(JSON.stringify(result.failoverTrace)).not.toContain('gemini down');
  });

  it('with zero providers configured, no egress happens at all (safe unavailable copy)', async () => {
    const result = await sendChatMessage([{ role: 'user', content: 'hi' }]);
    expect(result.ok).toBe(false);
    expect(result.provider).toBe('fallback');
    expect(fetchSpy).not.toHaveBeenCalled();
    expect(result.content).toContain('not configured');
  });

  it('the compat adapter is the SAME legacy loop (no parallel provider selection)', async () => {
    process.env.OPENAI_API_KEY = 'test-key';
    process.env.GEMINI_API_KEY = undefined;
    fetchSpy.mockImplementation(async () => {
      throw new Error('openai down');
    });
    const adapterResult = await coachProviderCompatAdapter([{ role: 'user', content: 'x' }]);
    const directResult = await sendChatMessage([{ role: 'user', content: 'x' }]);
    expect(adapterResult.provider).toBe(directResult.provider);
    expect(adapterResult.failoverTrace).toEqual(directResult.failoverTrace);
  });
});
