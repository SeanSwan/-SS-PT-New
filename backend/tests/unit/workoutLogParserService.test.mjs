/**
 * workoutLogParserService — Gemini-first parser tests
 * =====================================================
 * Phase 10 rewrite 2026-04-14: locks the provider chain behavior for
 * the workout transcript parser. Primary provider is Gemini (matches
 * voiceTranscriptionService.mjs pattern), OpenAI is legacy fallback.
 *
 * Covers:
 *   1. Parser works without OPENAI_API_KEY when Gemini key is present
 *   2. Parser returns strict JSON-shaped workout object
 *   3. Parser error path is clear when no providers are configured
 *   4. Gemini markdown-fenced output is robustly extracted
 *   5. Gemini plain JSON output parses directly
 *   6. Fallback to OpenAI fires only when Gemini fails AND OpenAI key is set
 *   7. Fallback does NOT fire when OpenAI key is missing
 *   8. Parser preserves the downstream contract consumed by
 *      frontend/.../parsedWorkoutToLogPayload.ts
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock the client-intelligence dependency so parser tests don't hit DB.
vi.mock('../../services/clientIntelligenceService.mjs', () => ({
  getClientContext: vi.fn(async () => null),
}));

// Import under test AFTER the mock so the module picks up the stub.
const {
  parseWorkoutTranscript,
  __test__: { extractJson, buildSystemPrompt, buildContextBlock, calculateConfidence, getGeminiApiKey },
} = await import('../../services/workoutLogParserService.mjs');

// Mock handle for per-test client-context overrides (Rule 8 redaction tests).
const { getClientContext } = await import('../../services/clientIntelligenceService.mjs');

// ─────────────────────────────────────────────────────────────
// SECTION: Fixtures
// ─────────────────────────────────────────────────────────────
const SAMPLE_TRANSCRIPT =
  'Client crushed back squats today — 135 for 10, 185 for 8, 225 for 5. ' +
  'Then bench press 185 by 5 for 3 sets. Left shoulder a little tight on the ' +
  'last set but no pain. Overall intensity was maybe a 7.';

const VALID_PARSED_OBJECT = {
  exercises: [
    {
      exerciseName: 'Back Squat',
      sets: [
        { setNumber: 1, weight: 135, reps: 10, rpe: 6, formQuality: 4, notes: '' },
        { setNumber: 2, weight: 185, reps: 8, rpe: 7, formQuality: 4, notes: '' },
        { setNumber: 3, weight: 225, reps: 5, rpe: 8, formQuality: 4, notes: '' },
      ],
      formRating: 4,
      painLevel: 0,
      performanceNotes: '',
    },
    {
      exerciseName: 'Bench Press',
      sets: [
        { setNumber: 1, weight: 185, reps: 5, rpe: 7, formQuality: 4, notes: '' },
        { setNumber: 2, weight: 185, reps: 5, rpe: 7, formQuality: 4, notes: '' },
        { setNumber: 3, weight: 185, reps: 5, rpe: 7, formQuality: 4, notes: '' },
      ],
      formRating: 4,
      painLevel: 0,
      performanceNotes: '',
    },
  ],
  sessionNotes: 'Left shoulder tightness on last squat set, no pain reported',
  overallIntensity: 7,
  painFlags: [
    { bodyRegion: 'shoulder', side: 'left', mention: 'Left shoulder a little tight on the last set' },
  ],
};

/**
 * Build a fake fetch that mimics the Gemini generateContent response shape.
 * Caller controls the rawText the parser receives.
 */
function makeGeminiFetch(rawText, { status = 200 } = {}) {
  return vi.fn(async () => ({
    ok: status >= 200 && status < 300,
    status,
    async json() {
      return {
        candidates: [{ content: { parts: [{ text: rawText }] }, finishReason: 'STOP' }],
        usageMetadata: { promptTokenCount: 120, candidatesTokenCount: 300 },
      };
    },
    async text() {
      return rawText;
    },
  }));
}

/**
 * Build a fake fetch that mimics the OpenAI chat completions response shape.
 */
function makeOpenAIFetch(rawText, { status = 200 } = {}) {
  return vi.fn(async () => ({
    ok: status >= 200 && status < 300,
    status,
    async json() {
      return {
        choices: [{ message: { content: rawText } }],
      };
    },
    async text() {
      return rawText;
    },
  }));
}

/**
 * Combo fetch router: dispatches to gemini/openai stubs based on the URL.
 * Each stub can also be set to throw via the `{ throwsError: Error }` helper.
 */
function makeRouterFetch({ geminiImpl, openaiImpl }) {
  return vi.fn(async (url, init) => {
    if (typeof url === 'string' && url.includes('generativelanguage.googleapis.com')) {
      if (geminiImpl?.throwsError) throw geminiImpl.throwsError;
      return geminiImpl.response(url, init);
    }
    if (typeof url === 'string' && url.includes('api.openai.com')) {
      if (openaiImpl?.throwsError) throw openaiImpl.throwsError;
      return openaiImpl.response(url, init);
    }
    throw new Error(`Unexpected fetch URL: ${url}`);
  });
}

// ─────────────────────────────────────────────────────────────
// SECTION: Env guard
// Each test isolates env vars so we don't bleed state across runs.
// ─────────────────────────────────────────────────────────────
const ORIGINAL_ENV = { ...process.env };

beforeEach(() => {
  // Clear AI keys by default — each test opts in to what it needs.
  delete process.env.GOOGLE_API_KEY;
  delete process.env.GEMINI_API_KEY;
  delete process.env.OPENAI_API_KEY;
});

afterEach(() => {
  vi.unstubAllGlobals();
  // Restore original env
  process.env = { ...ORIGINAL_ENV };
});

// ─────────────────────────────────────────────────────────────
// SECTION: extractJson — unit tests for the defensive JSON parser
// ─────────────────────────────────────────────────────────────
describe('extractJson (defensive JSON extraction)', () => {
  it('parses clean JSON directly', () => {
    const raw = '{"exercises":[{"exerciseName":"Squat","sets":[]}]}';
    expect(extractJson(raw)).toEqual({
      exercises: [{ exerciseName: 'Squat', sets: [] }],
    });
  });

  it('extracts JSON wrapped in ```json ... ``` markdown fence', () => {
    const raw = '```json\n{"exercises":[{"exerciseName":"Squat","sets":[]}]}\n```';
    expect(extractJson(raw)).toEqual({
      exercises: [{ exerciseName: 'Squat', sets: [] }],
    });
  });

  it('extracts JSON wrapped in bare ``` ... ``` fence', () => {
    const raw = '```\n{"exercises":[]}\n```';
    expect(extractJson(raw)).toEqual({ exercises: [] });
  });

  it('extracts JSON when the model prepends commentary', () => {
    const raw =
      'Here is your workout log in JSON format:\n{"exercises":[{"exerciseName":"Deadlift","sets":[]}]}\nLet me know if you need edits.';
    expect(extractJson(raw)).toEqual({
      exercises: [{ exerciseName: 'Deadlift', sets: [] }],
    });
  });

  it('handles nested braces correctly', () => {
    const raw = '{"exercises":[{"exerciseName":"A","sets":[{"setNumber":1,"weight":100}]}]}';
    expect(extractJson(raw)).toEqual({
      exercises: [{ exerciseName: 'A', sets: [{ setNumber: 1, weight: 100 }] }],
    });
  });

  it('does not confuse braces inside string values', () => {
    const raw = '{"exercises":[{"exerciseName":"Weird{Name}","sets":[]}]}';
    expect(extractJson(raw)).toEqual({
      exercises: [{ exerciseName: 'Weird{Name}', sets: [] }],
    });
  });

  it('throws clearly on empty input', () => {
    expect(() => extractJson('')).toThrow(/empty/i);
    expect(() => extractJson('   ')).toThrow(/empty/i);
  });

  it('throws clearly when no valid JSON is found', () => {
    expect(() => extractJson('not json at all, just plain text')).toThrow(/invalid JSON/i);
  });
});

// ─────────────────────────────────────────────────────────────
// SECTION: Provider chain — Gemini primary
// ─────────────────────────────────────────────────────────────
describe('parseWorkoutTranscript — Gemini-first behavior', () => {
  it('works without OPENAI_API_KEY when GOOGLE_API_KEY is present', async () => {
    process.env.GOOGLE_API_KEY = 'test-gemini-key';
    vi.stubGlobal('fetch', makeGeminiFetch(JSON.stringify(VALID_PARSED_OBJECT)));

    const result = await parseWorkoutTranscript({
      transcript: SAMPLE_TRANSCRIPT,
      clientId: 42,
      trainerId: 7,
    });

    expect(result).toMatchObject({
      exercises: expect.any(Array),
      sessionNotes: expect.any(String),
      overallIntensity: 7,
      painFlags: expect.any(Array),
      confidence: expect.any(Number),
      date: expect.any(String),
    });
    expect(result.exercises).toHaveLength(2);
    expect(result.exercises[0].exerciseName).toBe('Back Squat');
  });

  it('works with GEMINI_API_KEY as an alternate name', async () => {
    process.env.GEMINI_API_KEY = 'test-gemini-key';
    vi.stubGlobal('fetch', makeGeminiFetch(JSON.stringify(VALID_PARSED_OBJECT)));

    const result = await parseWorkoutTranscript({
      transcript: SAMPLE_TRANSCRIPT,
      clientId: 42,
      trainerId: 7,
    });

    expect(result.exercises).toHaveLength(2);
  });

  it('calls the Gemini endpoint, not the OpenAI endpoint', async () => {
    process.env.GOOGLE_API_KEY = 'test-gemini-key';
    const fetchMock = makeGeminiFetch(JSON.stringify(VALID_PARSED_OBJECT));
    vi.stubGlobal('fetch', fetchMock);

    await parseWorkoutTranscript({
      transcript: SAMPLE_TRANSCRIPT,
      clientId: 42,
      trainerId: 7,
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url] = fetchMock.mock.calls[0];
    expect(url).toMatch(/generativelanguage\.googleapis\.com/);
    expect(url).not.toMatch(/api\.openai\.com/);
  });

  it('sends responseMimeType: application/json to Gemini', async () => {
    process.env.GOOGLE_API_KEY = 'test-gemini-key';
    const fetchMock = makeGeminiFetch(JSON.stringify(VALID_PARSED_OBJECT));
    vi.stubGlobal('fetch', fetchMock);

    await parseWorkoutTranscript({
      transcript: SAMPLE_TRANSCRIPT,
      clientId: 42,
      trainerId: 7,
    });

    const [, init] = fetchMock.mock.calls[0];
    const body = JSON.parse(init.body);
    expect(body.generationConfig.responseMimeType).toBe('application/json');
    expect(body.generationConfig.temperature).toBeLessThanOrEqual(0.3);
  });

  it('preserves the strict output contract expected by parsedWorkoutToLogPayload', async () => {
    process.env.GOOGLE_API_KEY = 'test-gemini-key';
    vi.stubGlobal('fetch', makeGeminiFetch(JSON.stringify(VALID_PARSED_OBJECT)));

    const result = await parseWorkoutTranscript({
      transcript: SAMPLE_TRANSCRIPT,
      clientId: 42,
      trainerId: 7,
      date: '2026-04-14',
    });

    // Every field the frontend mapper reads must be present.
    for (const ex of result.exercises) {
      expect(ex).toHaveProperty('exerciseName');
      expect(ex).toHaveProperty('sets');
      expect(Array.isArray(ex.sets)).toBe(true);
      for (const set of ex.sets) {
        expect(set).toHaveProperty('setNumber');
        expect(set).toHaveProperty('weight');
        expect(set).toHaveProperty('reps');
      }
    }
    expect(result).toHaveProperty('sessionNotes');
    expect(result).toHaveProperty('overallIntensity');
    expect(result).toHaveProperty('painFlags');
    expect(result).toHaveProperty('confidence');
    expect(result.date).toBe('2026-04-14');
  });

  it('defaults date to today when the caller does not provide one', async () => {
    process.env.GOOGLE_API_KEY = 'test-gemini-key';
    vi.stubGlobal('fetch', makeGeminiFetch(JSON.stringify(VALID_PARSED_OBJECT)));

    const result = await parseWorkoutTranscript({
      transcript: SAMPLE_TRANSCRIPT,
      clientId: 42,
      trainerId: 7,
    });
    expect(result.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it('robustly extracts JSON from Gemini markdown-fenced output', async () => {
    process.env.GOOGLE_API_KEY = 'test-gemini-key';
    const fenced = '```json\n' + JSON.stringify(VALID_PARSED_OBJECT) + '\n```';
    vi.stubGlobal('fetch', makeGeminiFetch(fenced));

    const result = await parseWorkoutTranscript({
      transcript: SAMPLE_TRANSCRIPT,
      clientId: 42,
      trainerId: 7,
    });
    expect(result.exercises).toHaveLength(2);
  });
});

// ─────────────────────────────────────────────────────────────
// SECTION: Provider chain — error paths
// ─────────────────────────────────────────────────────────────
describe('parseWorkoutTranscript — no providers configured', () => {
  it('throws a clear error when NEITHER Gemini nor OpenAI keys are set', async () => {
    // beforeEach already cleared all keys.
    vi.stubGlobal('fetch', vi.fn());

    await expect(
      parseWorkoutTranscript({
        transcript: SAMPLE_TRANSCRIPT,
        clientId: 42,
        trainerId: 7,
      }),
    ).rejects.toThrow(/No AI parser provider configured/i);
  });

  it('throws when the transcript is too short to parse', async () => {
    process.env.GOOGLE_API_KEY = 'test-gemini-key';
    vi.stubGlobal('fetch', vi.fn());

    await expect(
      parseWorkoutTranscript({
        transcript: 'hi',
        clientId: 42,
        trainerId: 7,
      }),
    ).rejects.toThrow(/too short/i);
  });
});

// ─────────────────────────────────────────────────────────────
// SECTION: Fallback — Gemini failed, OpenAI available
// ─────────────────────────────────────────────────────────────
describe('parseWorkoutTranscript — fallback to OpenAI', () => {
  it('falls back to OpenAI when Gemini fails AND OPENAI_API_KEY is set', async () => {
    process.env.GOOGLE_API_KEY = 'test-gemini-key';
    process.env.OPENAI_API_KEY = 'test-openai-key';

    const routerFetch = makeRouterFetch({
      geminiImpl: {
        response: () => ({
          ok: false,
          status: 500,
          async text() {
            return 'Internal Server Error';
          },
          async json() {
            return { error: { message: 'server boom' } };
          },
        }),
      },
      openaiImpl: {
        response: () => ({
          ok: true,
          status: 200,
          async json() {
            return { choices: [{ message: { content: JSON.stringify(VALID_PARSED_OBJECT) } }] };
          },
          async text() {
            return JSON.stringify(VALID_PARSED_OBJECT);
          },
        }),
      },
    });
    vi.stubGlobal('fetch', routerFetch);

    const result = await parseWorkoutTranscript({
      transcript: SAMPLE_TRANSCRIPT,
      clientId: 42,
      trainerId: 7,
    });
    expect(result.exercises).toHaveLength(2);
    // Verify both providers were called in order: Gemini first, then OpenAI
    expect(routerFetch).toHaveBeenCalledTimes(2);
    expect(routerFetch.mock.calls[0][0]).toMatch(/generativelanguage/);
    expect(routerFetch.mock.calls[1][0]).toMatch(/openai\.com/);
  });

  it('does NOT call OpenAI when Gemini fails and OPENAI_API_KEY is unset', async () => {
    process.env.GOOGLE_API_KEY = 'test-gemini-key';
    // No OPENAI_API_KEY

    const fetchMock = vi.fn(async () => ({
      ok: false,
      status: 500,
      async text() {
        return 'boom';
      },
      async json() {
        return {};
      },
    }));
    vi.stubGlobal('fetch', fetchMock);

    await expect(
      parseWorkoutTranscript({
        transcript: SAMPLE_TRANSCRIPT,
        clientId: 42,
        trainerId: 7,
      }),
    ).rejects.toThrow(/Gemini parser failed/i);

    // Only one fetch call — the failed Gemini one. Never attempts OpenAI.
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0][0]).toMatch(/generativelanguage/);
  });

  it('skips Gemini entirely when only OPENAI_API_KEY is present (legacy mode)', async () => {
    // No Google keys. Only OpenAI. Should go directly to OpenAI.
    process.env.OPENAI_API_KEY = 'test-openai-key';

    const fetchMock = makeOpenAIFetch(JSON.stringify(VALID_PARSED_OBJECT));
    vi.stubGlobal('fetch', fetchMock);

    const result = await parseWorkoutTranscript({
      transcript: SAMPLE_TRANSCRIPT,
      clientId: 42,
      trainerId: 7,
    });

    expect(result.exercises).toHaveLength(2);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0][0]).toMatch(/openai\.com/);
  });
});

// ─────────────────────────────────────────────────────────────
// SECTION: Defensive output validation
// ─────────────────────────────────────────────────────────────
describe('parseWorkoutTranscript — output validation', () => {
  it('throws when the provider returns valid JSON but without an exercises array', async () => {
    process.env.GOOGLE_API_KEY = 'test-gemini-key';
    vi.stubGlobal('fetch', makeGeminiFetch('{"wrongShape": true}'));

    await expect(
      parseWorkoutTranscript({
        transcript: SAMPLE_TRANSCRIPT,
        clientId: 42,
        trainerId: 7,
      }),
    ).rejects.toThrow(/exercises array/i);
  });

  it('computes a confidence score and appends it to the return value', async () => {
    process.env.GOOGLE_API_KEY = 'test-gemini-key';
    vi.stubGlobal('fetch', makeGeminiFetch(JSON.stringify(VALID_PARSED_OBJECT)));

    const result = await parseWorkoutTranscript({
      transcript:
        'Lots of detail ' +
        'here '.repeat(120) + // push transcript length > 500
        'for a longer session',
      clientId: 42,
      trainerId: 7,
    });

    expect(typeof result.confidence).toBe('number');
    expect(result.confidence).toBeGreaterThan(0);
    expect(result.confidence).toBeLessThanOrEqual(0.99);
  });
});

// ─────────────────────────────────────────────────────────────
// SECTION: Key lookup helper
// ─────────────────────────────────────────────────────────────
describe('getGeminiApiKey', () => {
  it('prefers GOOGLE_API_KEY when both are set', () => {
    process.env.GOOGLE_API_KEY = 'google-key';
    process.env.GEMINI_API_KEY = 'gemini-key';
    expect(getGeminiApiKey()).toBe('google-key');
  });

  it('falls back to GEMINI_API_KEY when GOOGLE_API_KEY is unset', () => {
    process.env.GEMINI_API_KEY = 'gemini-key';
    expect(getGeminiApiKey()).toBe('gemini-key');
  });

  it('returns null when neither is set', () => {
    expect(getGeminiApiKey()).toBeNull();
  });
});

// ─────────────────────────────────────────────────────────────
// SECTION: Prompt composition sanity
// ─────────────────────────────────────────────────────────────
describe('buildSystemPrompt / buildContextBlock', () => {
  it('produces a placeholder context block when no client context is supplied', () => {
    expect(buildContextBlock(null)).toBe('No additional context.');
    expect(buildContextBlock({})).toBe('No additional context.');
  });

  it('OMITS the client name (Rule 8 — no PII to the LLM) but keeps pain exclusions', () => {
    const block = buildContextBlock({
      clientName: 'Alice',
      pain: { exclusions: [{ bodyRegion: 'knee', painLevel: 7 }] },
    });
    expect(block).not.toMatch(/Alice/); // name must NOT reach the parser prompt
    expect(block).toContain('knee (7/10)');
  });

  it('embeds the context block in the system prompt without leaking the client name', () => {
    const ctx = buildContextBlock({
      clientName: 'Bob',
      pain: { exclusions: [{ bodyRegion: 'knee', painLevel: 7 }] },
    });
    const prompt = buildSystemPrompt(ctx);
    expect(prompt).not.toMatch(/Bob/);       // Rule 8: name never reaches the LLM
    expect(prompt).toContain('knee (7/10)'); // non-PII context IS embedded
    expect(prompt).toContain('strict JSON');
    expect(prompt).toContain('painFlags');
  });
});

describe('calculateConfidence', () => {
  it('returns a number in (0, 0.99]', () => {
    const score = calculateConfidence(SAMPLE_TRANSCRIPT, VALID_PARSED_OBJECT);
    expect(score).toBeGreaterThan(0);
    expect(score).toBeLessThanOrEqual(0.99);
  });

  it('gives higher confidence for richer transcripts', () => {
    const shortScore = calculateConfidence('short session', { exercises: [] });
    const longScore = calculateConfidence(
      'very detailed session ' + 'data '.repeat(200),
      VALID_PARSED_OBJECT,
    );
    expect(longScore).toBeGreaterThan(shortScore);
  });
});

// ─────────────────────────────────────────────────────────────
// SECTION: Rule 8 — no PII reaches the parser LLM (transcript + context)
// ─────────────────────────────────────────────────────────────
describe('parseWorkoutTranscript — Rule 8 redaction at the parser boundary', () => {
  it('sends NEITHER the client name NOR contact PII to the parser LLM', async () => {
    process.env.GOOGLE_API_KEY = 'test-gemini-key';
    getClientContext.mockResolvedValueOnce({
      clientName: 'Marcus',
      pain: { exclusions: [{ bodyRegion: 'shoulder', painLevel: 5 }] },
    });
    const fetchMock = makeGeminiFetch(JSON.stringify(VALID_PARSED_OBJECT));
    vi.stubGlobal('fetch', fetchMock);

    await parseWorkoutTranscript({
      transcript:
        'Marcus did goblet squats 135 by 10. Reach him at marcus@example.com. Left shoulder tight on the last set.',
      clientId: 42,
      trainerId: 7,
    });

    const body = JSON.parse(fetchMock.mock.calls[0][1].body);
    const sentToLLM = body.contents[0].parts[0].text; // systemPrompt (context) + transcript

    expect(sentToLLM).not.toMatch(/marcus/i);              // name redacted (transcript) + omitted (context)
    expect(sentToLLM).not.toContain('marcus@example.com'); // contact PII redacted
    expect(sentToLLM).toContain('goblet squat');           // exercise language preserved
    expect(sentToLLM).toContain('shoulder');               // injury language preserved (needed for painFlags)
  });
});
