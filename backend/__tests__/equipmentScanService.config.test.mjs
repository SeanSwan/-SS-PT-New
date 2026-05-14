import { afterEach, describe, expect, it } from 'vitest';
import { __testing__ } from '../services/equipmentScanService.mjs';

const ORIGINAL_ENV = {
  GOOGLE_API_KEY: process.env.GOOGLE_API_KEY,
  GEMINI_API_KEY: process.env.GEMINI_API_KEY,
  GOOGLE_AI_API_KEY: process.env.GOOGLE_AI_API_KEY,
  EQUIPMENT_SCAN_MODEL: process.env.EQUIPMENT_SCAN_MODEL,
  AI_GEMINI_VISION_MODEL: process.env.AI_GEMINI_VISION_MODEL,
  AI_GEMINI_MODEL: process.env.AI_GEMINI_MODEL,
};

function clearGeminiEnv() {
  delete process.env.GOOGLE_API_KEY;
  delete process.env.GEMINI_API_KEY;
  delete process.env.GOOGLE_AI_API_KEY;
  delete process.env.EQUIPMENT_SCAN_MODEL;
  delete process.env.AI_GEMINI_VISION_MODEL;
  delete process.env.AI_GEMINI_MODEL;
}

describe('equipment scan configuration', () => {
  afterEach(() => {
    clearGeminiEnv();
    for (const [key, value] of Object.entries(ORIGINAL_ENV)) {
      if (value === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = value;
      }
    }
  });

  it('accepts the repo-standard Gemini env aliases used by production AI services', () => {
    clearGeminiEnv();
    process.env.GEMINI_API_KEY = 'gemini-key';

    expect(__testing__.getEquipmentScanApiKey()).toBe('gemini-key');
    expect(__testing__.isEquipmentScanConfigured()).toBe(true);

    process.env.GOOGLE_API_KEY = 'google-key';
    expect(__testing__.getEquipmentScanApiKey()).toBe('google-key');
  });

  it('does not use retired Gemini vision models from shared env configuration', () => {
    process.env.AI_GEMINI_MODEL = 'gemini-2.0-flash';

    expect(__testing__.getEquipmentScanModel()).toBe('gemini-2.5-flash');

    process.env.EQUIPMENT_SCAN_MODEL = 'gemini-2.5-flash-lite';
    expect(__testing__.getEquipmentScanModel()).toBe('gemini-2.5-flash-lite');
  });

  it('extracts recoverable JSON from Gemini scan responses with surrounding text', () => {
    const parsed = __testing__.parseEquipmentScanResponse(`I can identify the main item.

\`\`\`json
{
  "name": "Adjustable Bench",
  "category": "bench",
  "resistanceType": "other",
  "description": "A multi-angle bench used for pressing and supported strength work.",
  "confidence": 0.84,
  "boundingBox": { "x": 0.1, "y": 0.2, "w": 0.7, "h": 0.6 },
  "suggestedExercises": ["Dumbbell Bench Press", "Incline Press"]
}
\`\`\``);

    expect(parsed.name).toBe('Adjustable Bench');
    expect(parsed.category).toBe('bench');
  });

  it('unwraps common Gemini equipment JSON wrappers before sanitizing', () => {
    const parsed = __testing__.parseEquipmentScanResponse(JSON.stringify({
      equipment: {
        name: 'Cable Crossover Machine',
        category: 'cable_machine',
        resistanceType: 'cable',
        confidence: 0.91,
      },
    }));

    expect(parsed.name).toBe('Cable Crossover Machine');
    expect(parsed.category).toBe('cable_machine');
  });

  it('normalizes common dumbbell rack aliases from model output', () => {
    const sanitized = __testing__.sanitizeScanResult({
      equipmentName: 'Hex Dumbbells on Rack',
      equipmentCategory: 'free_weights',
      resistance: 'dumbbells',
      confidenceScore: '87%',
      exercises: ['Dumbbell Bench Press', 'Goblet Squat'],
    });

    expect(sanitized.suggestedName).toBe('Hex Dumbbells on Rack');
    expect(sanitized.suggestedCategory).toBe('dumbbell');
    expect(sanitized.resistanceType).toBe('dumbbell');
    expect(sanitized.confidence).toBeCloseTo(0.87);
  });

  it('asks Gemini the direct equipment question and names dumbbell racks explicitly', () => {
    const prompt = __testing__.buildEquipmentScanPrompt();
    const retryPrompt = __testing__.buildEquipmentScanPrompt({ retry: true });
    const captionPrompt = __testing__.buildEquipmentCaptionPrompt();

    expect(prompt).toContain('what workout equipment is this');
    expect(prompt).toContain('Dumbbell Rack');
    expect(prompt).toContain('Hex Dumbbells on Rack');
    expect(retryPrompt).toContain('second-pass review');
    expect(captionPrompt).toContain('what workout equipment is this');
  });

  it('marks zero-confidence unknown equipment as retryable', () => {
    expect(__testing__.isUnknownEquipmentResult({
      suggestedName: 'Unknown Equipment',
      confidence: 0,
    })).toBe(true);
    expect(__testing__.isUnknownEquipmentResult({
      suggestedName: 'Dumbbell Rack',
      confidence: 0.88,
    })).toBe(false);
  });

  it('does not display zero confidence when Gemini names visible equipment', () => {
    const sanitized = __testing__.sanitizeScanResult({
      name: 'Dumbbell Rack',
      category: 'dumbbell',
      resistanceType: 'dumbbell',
      confidence: 0,
    });

    expect(sanitized.suggestedName).toBe('Dumbbell Rack');
    expect(sanitized.confidence).toBe(0.65);
    expect(__testing__.isUnknownEquipmentResult(sanitized)).toBe(false);
  });

  it('converts Gemini caption fallback text into a dumbbell rack scan result', () => {
    const fallback = __testing__.scanResultFromCaption('The image shows a rack of black hex dumbbells.');

    expect(fallback.name).toBe('Dumbbell Rack');
    expect(fallback.category).toBe('dumbbell');
    expect(fallback.resistanceType).toBe('dumbbell');
    expect(fallback.confidence).toBeGreaterThan(0.7);
  });
});
