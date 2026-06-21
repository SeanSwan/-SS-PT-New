/**
 * nutritionTranscriptParserService.test
 * =====================================
 * Slice 1.1 — AI nutrition capture parser.
 * Locks: null-not-zero macro estimates, mealType clamping, identity-blind
 * context, RULE-8 redact-before-LLM wiring, conservative confidence, and the
 * low-confidence → follow-up-question path. Provider + redactor are mocked
 * (deterministic, no network).
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

const { runJsonLlmChainMock, redactMock } = vi.hoisted(() => ({
  runJsonLlmChainMock: vi.fn(),
  redactMock: vi.fn(),
}));

vi.mock('../../services/ai/jsonLlmParser.mjs', () => ({
  runJsonLlmChain: runJsonLlmChainMock,
}));
vi.mock('../../services/redactTranscriptPII.mjs', () => ({
  redactTranscriptPII: redactMock,
}));

import { parseNutritionTranscript, __test__ } from '../../services/nutrition/nutritionTranscriptParserService.mjs';

const { buildContextBlock, shapeMeal, calculateOverallConfidence } = __test__;

describe('buildContextBlock (identity-blind)', () => {
  it('returns a neutral default when no hints are given', () => {
    expect(buildContextBlock()).toBe('No additional context.');
  });
  it('includes de-identified targets/restrictions/conditions and never a name', () => {
    const block = buildContextBlock({
      dailyCalorieTarget: 2100,
      proteinTarget: 160,
      restrictions: ['vegetarian'],
      conditions: ['HYPERTENSION'],
    });
    expect(block).toContain('2100 kcal');
    expect(block).toContain('160 g');
    expect(block).toContain('vegetarian');
    expect(block).toContain('HYPERTENSION');
  });
  it('does not coerce malformed numeric targets into the LLM context', () => {
    const block = buildContextBlock({
      dailyCalorieTarget: '0x834',
      proteinTarget: ['160'],
      restrictions: [],
      conditions: [],
    });
    expect(block).toBe('No additional context.');
  });
});

describe('shapeMeal', () => {
  it('uses null (never 0) for unestimable macros', () => {
    const m = shapeMeal({ description: 'mystery dish' });
    expect(m.calories).toBeNull();
    expect(m.protein).toBeNull();
  });
  it('clamps an invalid mealType to snack and drops descriptionless meals', () => {
    expect(shapeMeal({ description: 'apple', mealType: 'brunch' }).mealType).toBe('snack');
    expect(shapeMeal({ mealType: 'lunch' })).toBeNull();
  });
  it('defaults confidence to 0.5 and rejects negatives', () => {
    expect(shapeMeal({ description: 'x' }).confidence).toBe(0.5);
    expect(shapeMeal({ description: 'x', calories: -10 }).calories).toBeNull();
  });
  it('does not coerce non-decimal model macro values into review-ready estimates', () => {
    const meal = shapeMeal({
      description: 'protein bowl',
      calories: '0x10',
      protein: '1e2',
      carbs: [30],
      fat: '4.5',
      confidence: '1e-1',
    });

    expect(meal.calories).toBeNull();
    expect(meal.protein).toBeNull();
    expect(meal.carbs).toBeNull();
    expect(meal.fat).toBe(4.5);
    expect(meal.confidence).toBe(0.5);
  });
});

describe('calculateOverallConfidence', () => {
  it('is 0 with no meals', () => {
    expect(calculateOverallConfidence('anything', [])).toBe(0);
  });
  it('averages meal confidence and nudges up when every meal has macros', () => {
    const c = calculateOverallConfidence('I had a big descriptive lunch with rice beans and chicken today', [
      { confidence: 0.7, calories: 600 },
    ]);
    expect(c).toBeGreaterThan(0.7);
  });
});

describe('parseNutritionTranscript', () => {
  beforeEach(() => {
    redactMock.mockReset();
    runJsonLlmChainMock.mockReset();
    redactMock.mockImplementation((t) => ({
      text: String(t).replace(/Jackie Smith/g, '[Client]'),
      detections: [],
      hasCriticalPII: false,
    }));
    runJsonLlmChainMock.mockResolvedValue({
      meals: [{ mealType: 'lunch', description: 'chicken burrito bowl', calories: 650, protein: 45, carbs: 70, fat: 18, confidence: 0.7 }],
      notes: '',
      followUpQuestions: [],
    });
  });

  it('redacts the client name BEFORE the transcript reaches the LLM (Rule 8)', async () => {
    const result = await parseNutritionTranscript({
      transcript: 'Jackie Smith had a chicken burrito bowl for lunch',
      clientId: 42,
      nameHints: ['Jackie Smith'],
    });

    expect(redactMock).toHaveBeenCalledWith('Jackie Smith had a chicken burrito bowl for lunch', { nameHints: ['Jackie Smith'] });
    const { userText } = runJsonLlmChainMock.mock.calls[0][0];
    expect(userText).not.toContain('Jackie Smith');
    expect(userText).toContain('[Client]');
    expect(result.meals).toHaveLength(1);
    expect(result.meals[0].mealType).toBe('lunch');
    expect(result.lowConfidence).toBe(false);
  });

  it('flags lowConfidence and passes follow-up questions through when the model is unsure', async () => {
    runJsonLlmChainMock.mockResolvedValue({
      meals: [{ mealType: 'snack', description: 'some chips', calories: 200, confidence: 0.4 }],
      notes: '',
      followUpQuestions: ['How big was the bag of chips — single-serve or sharing size?'],
    });

    const result = await parseNutritionTranscript({ transcript: 'I had some chips earlier', clientId: 1 });

    expect(result.lowConfidence).toBe(true);
    expect(result.followUpQuestions).toHaveLength(1);
  });

  it('throws on a too-short transcript and when no meals are parsed', async () => {
    await expect(parseNutritionTranscript({ transcript: 'a' })).rejects.toThrow(/too short/i);

    runJsonLlmChainMock.mockResolvedValue({ meals: [], notes: '', followUpQuestions: [] });
    await expect(parseNutritionTranscript({ transcript: 'I ate something unparseable here' })).rejects.toThrow(/No meals/i);
  });
});
