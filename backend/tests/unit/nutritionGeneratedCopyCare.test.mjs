import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const generateContentMock = vi.fn();

vi.mock('@google/generative-ai', () => ({
  GoogleGenerativeAI: vi.fn(function GoogleGenerativeAI() {
    this.getGenerativeModel = vi.fn(() => ({
      generateContent: generateContentMock,
    }));
  }),
}));

const { generateMealPlan } = await import('../../services/mealPlanService.mjs');
const { analyzeMealPhoto } = await import('../../services/foodPhotoService.mjs');
const {
  sanitizeNutritionChatCopy,
  sanitizeNutritionCopy,
  shouldApplyNutritionCareCopy,
} = await import('../../services/nutrition/nutritionCareCopy.mjs');

const originalGoogleKey = process.env.GOOGLE_API_KEY;
const originalGeminiKey = process.env.GEMINI_API_KEY;
const aiChatServiceSource = readFileSync(resolve(__dirname, '../../services/aiChatService.mjs'), 'utf8');

const unsafeCopyPattern =
  /\b(cutting|bulking?|caloric deficit|cheat meal|clean eating|dirty bulk|sugar crash|inflammatory|deficien(?:t|cy|cies)|zero sugar|no sugar|guilt|spike insulin|wasted macros)\b/i;

const mockGeminiJson = (payload) => {
  generateContentMock.mockResolvedValueOnce({
    response: { text: () => JSON.stringify(payload) },
  });
};

describe('AI-generated nutrition copy care guard', () => {
  beforeEach(() => {
    process.env.GOOGLE_API_KEY = 'test-google-key';
    delete process.env.GEMINI_API_KEY;
    generateContentMock.mockReset();
  });

  afterEach(() => {
    if (originalGoogleKey === undefined) delete process.env.GOOGLE_API_KEY;
    else process.env.GOOGLE_API_KEY = originalGoogleKey;
    if (originalGeminiKey === undefined) delete process.env.GEMINI_API_KEY;
    else process.env.GEMINI_API_KEY = originalGeminiKey;
  });

  it('scrubs meal-plan display copy and prompts the model away from diet-culture framing', async () => {
    mockGeminiJson({
      planName: 'Cutting Zero Sugar Meal Plan',
      dailyTargets: { calories: 1800, protein: 135, carbs: 180, fat: 60, fiber: 28 },
      meals: [{
        mealType: 'breakfast',
        time: '7:00 AM',
        name: 'Clean eating cutting bowl',
        foods: [{ name: 'Clean eating Greek yogurt', serving: '1 guilt-free cup', calories: 150, protein: 20, carbs: 8, fat: 4 }],
        totalCalories: 150,
        prepTime: '5 min zero sugar prep',
      }],
      groceryList: ['Cheat meal berries', 'No sugar topping'],
      nasmNote: 'Caloric deficit avoids deficiency and sugar crash.',
      tips: ['No sugar cheat meal means no guilt.', 'Dirty bulk then cutting is not needed.'],
    });

    const result = await generateMealPlan({ calories: 1800, activityType: 'strength training' });

    expect(JSON.stringify(result)).not.toMatch(unsafeCopyPattern);
    const prompt = generateContentMock.mock.calls[0][0].contents[0].parts.map((p) => p.text || '').join('\n');
    expect(prompt).toMatch(/care-first/i);
    expect(prompt).toMatch(/Do not use diet-culture labels/i);
  });

  it('scrubs meal-photo notes and prompts the model away from moral food labels', async () => {
    mockGeminiJson({
      foods: [{ name: 'Chicken bowl', estimatedServing: '1 bowl', calories: 600, protein: 40, carbs: 65, fat: 18, fiber: 8, confidence: 0.8 }],
      totalCalories: 600,
      totalProtein: 40,
      totalCarbs: 65,
      totalFat: 18,
      totalFiber: 8,
      mealType: 'lunch',
      overallConfidence: 0.8,
      notes: 'Clean eating cutting meal with zero sugar; avoid inflammatory food and sugar crash.',
    });

    const result = await analyzeMealPhoto(Buffer.from('image'), 'image/jpeg');

    expect(JSON.stringify(result)).not.toMatch(unsafeCopyPattern);
    const prompt = generateContentMock.mock.calls[0][0].contents[0].parts.map((p) => p.text || '').join('\n');
    expect(prompt).toMatch(/care-first/i);
    expect(prompt).toMatch(/moral food labels/i);
  });

  it('does not distort legitimate anti-inflammatory or bulk-prep wording', () => {
    const copy = sanitizeNutritionCopy('Anti-inflammatory foods can support symptom review. Prep grains in bulk.');

    expect(copy).toContain('Anti-inflammatory foods');
    expect(copy).toContain('Prep grains in bulk');
  });

  it('scrubs mounted Coach chat nutrition copy without rewriting unrelated chat', () => {
    const nutritionCopy = sanitizeNutritionChatCopy(
      'Rate this product: GOOD clean ingredients, BAD avoid toxic ingredients. Track compliance trends. This is a bad food choice.',
      { context: 'macro_logging', message: 'Analyze this snack label.' }
    );

    expect(nutritionCopy).not.toMatch(/\b(GOOD|BAD|toxic ingredients|clean ingredients|compliance)\b/i);
    expect(nutritionCopy).not.toMatch(/\bbad food choice\b/i);
    expect(nutritionCopy).toContain('context-friendly');
    expect(nutritionCopy).toContain('less aligned');
    expect(nutritionCopy).toContain('ingredients worth reviewing');
    expect(nutritionCopy).toContain('follow-through');
    expect(sanitizeNutritionChatCopy(
      'For hydration, this is a bad snack before training.',
      { context: 'coach_assistant', message: 'Thanks' }
    )).toContain('less aligned snack');

    expect(shouldApplyNutritionCareCopy({ context: 'coach_assistant', message: 'How was the workout?' })).toBe(false);
    expect(sanitizeNutritionChatCopy('Good morning. Ready for your workout?', {
      context: 'coach_assistant',
      message: 'How was the workout?',
    })).toBe('Good morning. Ready for your workout?');
  });

  it('does not instruct mounted chat prompts to generate moral food labels first', () => {
    const macroPrompt = aiChatServiceSource.slice(
      aiChatServiceSource.indexOf('macro_logging: `'),
      aiChatServiceSource.indexOf('    form_tips: `')
    );
    const simpleStylePrompt = aiChatServiceSource.slice(
      aiChatServiceSource.indexOf('simple_only: `'),
      aiChatServiceSource.indexOf('  balanced: `')
    );

    expect(macroPrompt).toContain('context-friendly, review-worthy, or less aligned');
    expect(macroPrompt).toContain('follow-through, consistency, or timing trends');
    expect(macroPrompt).not.toMatch(/Rate the product: GOOD|clean ingredients|toxic ingredients|Track compliance trends/i);
    expect(simpleStylePrompt).toContain('direct but neutral language');
    expect(simpleStylePrompt).not.toMatch(/Use "good" and "bad" language|This is bad for you|fake sugar|belly fat/i);
    expect(aiChatServiceSource).toContain('lower-fuel phase');
    expect(aiChatServiceSource).toContain('low nutrient status');
    expect(aiChatServiceSource).not.toMatch(/\b(caloric deficit|deficiency|no sugarcoating)\b/i);
  });
});
