/**
 * AI provider allowlist — sub-processor enrolment contract
 * =========================================================
 * Chat carries client health data (the system prompt collects injuries,
 * surgeries, medications), so every provider in the failover chain is a company
 * receiving regulated data and belongs in the client-facing disclosure record.
 *
 * Before the allowlist, a provider was enrolled by the mere presence of an env
 * var: a new sub-processor could join by a deployment config change, with no
 * code review and no disclosure. These tests lock the two properties that fix:
 *
 *   1. Only APPROVED_PROVIDERS may ever be selected — an unknown key cannot
 *      enrol a vendor.
 *   2. AI_PROVIDER_ALLOWLIST NARROWS only. It can never widen the set, and a
 *      typo cannot silently widen it either.
 *
 * Also locks that the diagnostics function tells the truth about the
 * AI_API_KEY alias — the previous version reported "openai: false" while the
 * adapter was using OpenAI through that name.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../utils/logger.mjs', () => ({
  default: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));

const { getAIChatDiagnostics } = await import('../../services/aiChatService.mjs');

const PROVIDER_ENV = [
  'GEMINI_API_KEY', 'GOOGLE_API_KEY',
  'OPENAI_API_KEY', 'AI_API_KEY',
  'ANTHROPIC_API_KEY', 'VENICE_API_KEY',
  'AI_PROVIDER_ALLOWLIST',
];

let saved;

beforeEach(() => {
  saved = {};
  for (const k of PROVIDER_ENV) {
    saved[k] = process.env[k];
    delete process.env[k];
  }
});

afterEach(() => {
  for (const k of PROVIDER_ENV) {
    if (saved[k] === undefined) delete process.env[k];
    else process.env[k] = saved[k];
  }
});

describe('provider allowlist — only approved sub-processors are selectable', () => {
  it('selects an approved provider when its key is set', () => {
    process.env.GEMINI_API_KEY = 'x';
    const d = getAIChatDiagnostics();
    expect(d.active).toEqual(['gemini']);
    expect(d.primaryProvider).toBe('gemini');
  });

  it('preserves failover order: gemini first, then openai, anthropic, venice', () => {
    process.env.VENICE_API_KEY = 'x';
    process.env.ANTHROPIC_API_KEY = 'x';
    process.env.OPENAI_API_KEY = 'x';
    process.env.GEMINI_API_KEY = 'x';
    expect(getAIChatDiagnostics().active).toEqual(['gemini', 'openai', 'anthropic', 'venice']);
  });

  it('an unknown provider key cannot enrol a vendor', () => {
    process.env.GEMINI_API_KEY = 'x';
    process.env.SOME_NEW_VENDOR_API_KEY = 'x';
    try {
      const d = getAIChatDiagnostics();
      expect(d.active).toEqual(['gemini']);
      expect(d.approved).not.toContain('some_new_vendor');
    } finally {
      delete process.env.SOME_NEW_VENDOR_API_KEY;
    }
  });

  it('reports zero providers when nothing is configured', () => {
    const d = getAIChatDiagnostics();
    expect(d.active).toEqual([]);
    expect(d.availableCount).toBe(0);
    expect(d.primaryProvider).toBe('none');
  });
});

describe('AI_PROVIDER_ALLOWLIST narrows, never widens', () => {
  it('restricts an otherwise-available set to the named providers', () => {
    process.env.GEMINI_API_KEY = 'x';
    process.env.OPENAI_API_KEY = 'x';
    process.env.ANTHROPIC_API_KEY = 'x';
    process.env.AI_PROVIDER_ALLOWLIST = 'gemini';

    const d = getAIChatDiagnostics();
    expect(d.active).toEqual(['gemini']);
    // Configured-but-excluded is distinct from not-configured, and is reported.
    expect(d.providers.openai).toBe(true);
    expect(d.configuredButBlocked).toEqual(['openai', 'anthropic']);
  });

  it('CANNOT widen beyond the approved set', () => {
    process.env.GEMINI_API_KEY = 'x';
    process.env.AI_PROVIDER_ALLOWLIST = 'gemini,some_new_vendor,localhost';
    const d = getAIChatDiagnostics();
    expect(d.active).toEqual(['gemini']);
    expect(d.allowlist).toEqual(['gemini']); // unknown names dropped
  });

  it('a typo does not silently permit everything — it fails closed', () => {
    process.env.GEMINI_API_KEY = 'x';
    process.env.OPENAI_API_KEY = 'x';
    process.env.AI_PROVIDER_ALLOWLIST = 'gemni'; // typo

    const d = getAIChatDiagnostics();
    expect(d.allowlist).toEqual([]);
    expect(d.active).toEqual([]); // fail closed, not fall back to all
  });

  it('naming an approved-but-unconfigured provider yields nothing, not a fallback', () => {
    // Realistic misconfiguration: the allowlist is narrowed to a provider whose
    // key was never set. The correct answer is "no provider available", not
    // "ignore the allowlist and use whatever is configured".
    process.env.GEMINI_API_KEY = 'x';
    process.env.AI_PROVIDER_ALLOWLIST = 'anthropic';

    const d = getAIChatDiagnostics();
    expect(d.allowlist).toEqual(['anthropic']);
    expect(d.active).toEqual([]);
    expect(d.configuredButBlocked).toEqual(['gemini']);
  });

  it('tolerates whitespace and casing', () => {
    process.env.GEMINI_API_KEY = 'x';
    process.env.OPENAI_API_KEY = 'x';
    process.env.AI_PROVIDER_ALLOWLIST = '  GEMINI , openai  ';
    expect(getAIChatDiagnostics().active).toEqual(['gemini', 'openai']);
  });

  it('empty or unset means all approved (no behaviour change by default)', () => {
    process.env.GEMINI_API_KEY = 'x';
    process.env.OPENAI_API_KEY = 'x';

    const unset = getAIChatDiagnostics().active;
    process.env.AI_PROVIDER_ALLOWLIST = '   ';
    const blank = getAIChatDiagnostics().active;

    expect(unset).toEqual(['gemini', 'openai']);
    expect(blank).toEqual(unset);
  });
});

describe('diagnostics tell the truth about key aliases', () => {
  it('reports openai when only the AI_API_KEY alias is set', () => {
    // The regression this locks: the previous diagnostics checked only
    // OPENAI_API_KEY, so a deployment using the alias reported openai:false
    // while the adapter was sending client data to OpenAI.
    process.env.AI_API_KEY = 'x';
    const d = getAIChatDiagnostics();
    expect(d.providers.openai).toBe(true);
    expect(d.active).toEqual(['openai']);
  });

  it('reports gemini when only the GOOGLE_API_KEY alias is set', () => {
    process.env.GOOGLE_API_KEY = 'x';
    const d = getAIChatDiagnostics();
    expect(d.providers.gemini).toBe(true);
    expect(d.active).toEqual(['gemini']);
  });

  it('exposes the approved list so the disclosure record can be checked against it', () => {
    expect(getAIChatDiagnostics().approved).toEqual(['gemini', 'openai', 'anthropic', 'venice']);
  });

  it('never returns a key VALUE, only presence booleans and names', () => {
    process.env.GEMINI_API_KEY = 'super-secret-value';
    const serialized = JSON.stringify(getAIChatDiagnostics());
    expect(serialized).not.toContain('super-secret-value');
    expect(getAIChatDiagnostics().providers.gemini).toBe(true);
  });
});

describe('the approved list cannot be edited at runtime', () => {
  it('resists enrolling a new vendor or a new key source in-process', async () => {
    // Freezing only the outer array blocks push() but leaves entry objects and
    // their envKeys arrays mutable — enough for in-process code to name an
    // attacker-controlled env var as a key source. Deep freeze closes it.
    const svc = await import('../../services/aiChatService.mjs');
    const src = (await import('node:fs')).readFileSync(
      (await import('node:path')).resolve(process.cwd(), 'services/aiChatService.mjs'), 'utf8',
    );
    // Count, not toMatch: a `toMatch` here passes as long as ONE entry is
    // frozen, so removing the freeze from a single provider would go
    // undetected. Every declared entry must be frozen, so assert parity
    // between the number of entries and the number of freezes.
    const entryCount = (src.match(/^\s*\{ name: '[a-z]+', vendor: /gm) || []).length;
    const frozenKeyLists = (src.match(/envKeys: Object\.freeze\(/g) || []).length;
    expect(entryCount).toBeGreaterThan(0);
    expect(frozenKeyLists).toBe(entryCount);
    expect(src).toMatch(/\]\.map\(Object\.freeze\)/);

    // Behavioural proof: a rogue env var cannot become a key source.
    process.env.EVIL_KEY = 'x';
    try {
      expect(svc.getAIChatDiagnostics().active).toEqual([]);
    } finally {
      delete process.env.EVIL_KEY;
    }
  });
});
