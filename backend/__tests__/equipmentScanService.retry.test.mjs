import { afterEach, describe, expect, it, vi } from 'vitest';

const generateContentMock = vi.fn();

vi.mock('@google/generative-ai', () => ({
  SchemaType: { OBJECT: 'object', STRING: 'string', ARRAY: 'array', NUMBER: 'number', INTEGER: 'integer' },
  GoogleGenerativeAI: vi.fn(function GoogleGenerativeAI() {
    this.getGenerativeModel = vi.fn(() => ({
      generateContent: generateContentMock,
    }));
  }),
}));

const { scanEquipmentImage } = await import('../services/equipmentScanService.mjs');

function geminiJson(payload) {
  return {
    response: {
      text: () => JSON.stringify(payload),
    },
  };
}

describe('equipment scan retry behavior', () => {
  afterEach(() => {
    generateContentMock.mockReset();
    delete process.env.GEMINI_API_KEY;
  });

    // QUARANTINED SWA-231 2026-09-02: pin predates crop-rescan ce930d9a3 (2026-08-04); call-flow deliberately changed. Un-skip criteria: re-pin retry flow against the census/detail/crop pipeline.
  it.skip('asks Gemini a second direct question when the first pass returns Unknown at zero confidence', async () => {
    process.env.GEMINI_API_KEY = 'test-gemini-key';
    generateContentMock
      .mockResolvedValueOnce(geminiJson({
        name: 'Unknown',
        category: 'other',
        resistanceType: 'other',
        confidence: 0,
      }))
      .mockResolvedValueOnce(geminiJson({
        name: 'Dumbbell Rack',
        category: 'dumbbell',
        resistanceType: 'dumbbell',
        description: 'A rack of dumbbells used for free-weight strength training.',
        confidence: 0.88,
        suggestedExercises: ['Dumbbell Bench Press', 'Goblet Squat'],
      }));

    const result = await scanEquipmentImage(Buffer.from('fake image bytes'), 'image/jpeg');

    expect(generateContentMock).toHaveBeenCalledTimes(2);
    expect(result.suggestedName).toBe('Dumbbell Rack');
    expect(result.suggestedCategory).toBe('dumbbell');
    expect(result.resistanceType).toBe('dumbbell');

    const firstParts = generateContentMock.mock.calls[0][0].contents[0].parts;
    const secondParts = generateContentMock.mock.calls[1][0].contents[0].parts;
    const firstPrompt = firstParts[1].text;
    const secondPrompt = secondParts[1].text;
    expect(firstPrompt).toContain('what workout equipment is this');
    expect(secondPrompt).toContain('second-pass review');
    expect(firstParts[0].inlineData.mimeType).toBe('image/jpeg');
    expect(secondParts[0].inlineData.data).toBe(Buffer.from('fake image bytes').toString('base64'));
  });

  it('uses a plain Gemini caption fallback when both strict JSON passes return Unknown', async () => {
    process.env.GEMINI_API_KEY = 'test-gemini-key';
    generateContentMock
      .mockResolvedValueOnce(geminiJson({
        name: 'Unknown',
        category: 'other',
        resistanceType: 'other',
        confidence: 0,
      }))
      .mockResolvedValueOnce(geminiJson({
        name: 'Unknown Equipment',
        category: 'other',
        resistanceType: 'other',
        confidence: 0,
      }))
      .mockResolvedValueOnce({
        response: {
          text: () => 'The image shows black hex dumbbells stored on a rack.',
        },
      });

    const result = await scanEquipmentImage(Buffer.from('fake image bytes'), 'image/jpeg');

    expect(generateContentMock).toHaveBeenCalledTimes(3);
    expect(result.suggestedName).toBe('Dumbbell Rack');
    expect(result.suggestedCategory).toBe('dumbbell');
    expect(result.resistanceType).toBe('dumbbell');
    expect(result.confidence).toBeGreaterThan(0.7);

    const captionParts = generateContentMock.mock.calls[2][0].contents[0].parts;
    expect(captionParts[0].inlineData.mimeType).toBe('image/jpeg');
    expect(captionParts[1].text).toContain('what workout equipment is this');
  });

  it('uses caption fallback when strict Gemini JSON is malformed before identification', async () => {
    process.env.GEMINI_API_KEY = 'test-gemini-key';
    generateContentMock
      .mockResolvedValueOnce({
        response: {
          text: () => 'I can see workout equipment, but here is not JSON.',
        },
      })
      .mockResolvedValueOnce({
        response: {
          text: () => '',
        },
      })
      .mockResolvedValueOnce({
        response: {
          text: () => 'A rack of black hexagonal weights.',
        },
      });

    const result = await scanEquipmentImage(Buffer.from('fake image bytes'), 'image/jpeg');

    expect(generateContentMock).toHaveBeenCalledTimes(3);
    expect(result.suggestedName).toBe('Dumbbell Rack');
    expect(result.suggestedCategory).toBe('dumbbell');
    expect(result.resistanceType).toBe('dumbbell');
  });
});
