/**
 * equipmentScanService — V3 wiring + degraded caption fallback.
 * =============================================================
 * Proves (a) the service builds census/detail/caption models with the V3
 * token budgets and response schemas, (b) a census wipeout degrades to the
 * caption fallback WITH degraded:true (honesty flag surfaced to the UI), and
 * (c) a healthy census produces the V3 pipeline result end-to-end through the
 * real (mocked-SDK) service entry point.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const state = vi.hoisted(() => ({
  modelConfigs: [],
  responsesByBudget: new Map(),
}));

vi.mock('@google/generative-ai', () => {
  class GoogleGenerativeAI {
    constructor() {}
    getGenerativeModel(config) {
      state.modelConfigs.push(config);
      const budget = config?.generationConfig?.maxOutputTokens;
      return {
        generateContent: vi.fn().mockImplementation(async () => {
          const queue = state.responsesByBudget.get(budget) || [];
          const next = queue.length > 1 ? queue.shift() : queue[0];
          if (next instanceof Error) throw next;
          return { response: { text: () => next ?? '' } };
        }),
      };
    }
  }
  return {
    GoogleGenerativeAI,
    SchemaType: { OBJECT: 'object', ARRAY: 'array', STRING: 'string', NUMBER: 'number', INTEGER: 'integer', BOOLEAN: 'boolean' },
  };
});

import { scanEquipmentImageMulti } from '../../services/equipmentScanService.mjs';
import {
  CENSUS_MAX_OUTPUT_TOKENS,
  DETAIL_MAX_OUTPUT_TOKENS,
} from '../../services/equipmentScanV3Support.mjs';

const IMAGE = Buffer.from('fake-image');

function setResponses({ census, detail, caption }) {
  state.responsesByBudget.set(CENSUS_MAX_OUTPUT_TOKENS, census);
  state.responsesByBudget.set(DETAIL_MAX_OUTPUT_TOKENS, detail);
  state.responsesByBudget.set(80, caption);
}

const CENSUS_JSON = JSON.stringify({
  imageQuality: 'good',
  sceneSummary: 'Home gym',
  items: [
    { suggestedName: 'Kettlebell', category: 'kettlebell', resistanceType: 'kettlebell', quantity: 2, confidence: 0.92, visibility: 'clear' },
    { suggestedName: 'Flat Bench', category: 'bench', resistanceType: 'other', quantity: 1, confidence: 0.88, visibility: 'clear' },
  ],
  possibleItems: [],
  outOfScopeObjects: [],
});

const DETAIL_JSON = JSON.stringify({
  enrichments: [
    { id: 'item_1', suggestedExercises: ['Kettlebell Swing'], movementPatterns: ['hinge'], targetMuscles: ['glutes'], safetyNotes: 'Hinge, do not squat the swing.', reasoning: 'Ballistic hinge tool.' },
    { id: 'item_2', suggestedExercises: ['Bench Press'], movementPatterns: ['push'], targetMuscles: ['chest'], safetyNotes: 'Keep feet planted.', reasoning: 'Pressing platform.' },
  ],
});

describe('scanEquipmentImageMulti — V3 service wiring', () => {
  beforeEach(() => {
    state.modelConfigs.length = 0;
    state.responsesByBudget.clear();
    process.env.GEMINI_API_KEY = 'test-key';
  });
  afterEach(() => {
    delete process.env.GEMINI_API_KEY;
  });

  it('builds census/detail models with V3 budgets and response schemas', async () => {
    setResponses({ census: [CENSUS_JSON], detail: [DETAIL_JSON], caption: ['unused'] });
    await scanEquipmentImageMulti(IMAGE, 'image/jpeg');

    const budgets = state.modelConfigs.map((c) => c.generationConfig.maxOutputTokens);
    expect(budgets).toContain(CENSUS_MAX_OUTPUT_TOKENS);
    expect(budgets).toContain(DETAIL_MAX_OUTPUT_TOKENS);
    expect(budgets).toContain(80);
    const censusConfig = state.modelConfigs.find((c) => c.generationConfig.maxOutputTokens === CENSUS_MAX_OUTPUT_TOKENS);
    expect(censusConfig.generationConfig.responseSchema).toBeDefined();
    expect(censusConfig.generationConfig.responseMimeType).toBe('application/json');
  });

  it('returns the full multi-item V3 result on a healthy census', async () => {
    setResponses({ census: [CENSUS_JSON], detail: [DETAIL_JSON], caption: ['unused'] });
    const scan = await scanEquipmentImageMulti(IMAGE, 'image/jpeg');

    expect(scan.items).toHaveLength(2);
    expect(scan.items[0].suggestedExercises).toEqual(['Kettlebell Swing']);
    expect(scan.pipelineVersion).toBe('v3-census-detail');
    expect(scan.degraded).toBe(false);
  });

  it('degrades to caption fallback with degraded:true when the census wipes out', async () => {
    setResponses({
      census: ['not json at all', 'still not json'],
      detail: [DETAIL_JSON],
      caption: ['A single kettlebell on a mat'],
    });
    const scan = await scanEquipmentImageMulti(IMAGE, 'image/jpeg');

    expect(scan.items).toHaveLength(1);
    expect(scan.items[0].suggestedName).toBe('Kettlebell');
    expect(scan.pipelineVersion).toBe('v3-caption-fallback');
    expect(scan.degraded).toBe(true);
  });

  it('throws when census and caption both fail', async () => {
    setResponses({
      census: ['garbage', 'garbage'],
      caption: ['I cannot identify any fitness equipment'],
      detail: [DETAIL_JSON],
    });
    await expect(scanEquipmentImageMulti(IMAGE, 'image/jpeg')).rejects.toThrow(/could not identify/i);
  });
});
