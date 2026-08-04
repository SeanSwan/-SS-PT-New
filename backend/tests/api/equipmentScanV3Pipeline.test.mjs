/**
 * Equipment Scan V3 — census→detail pipeline regression suite.
 * ============================================================
 * Locks the fix for the "weak at seeing multiple things in a picture" class:
 * the V2 single-pass pipeline asked one generation for detection AND full
 * enrichment under a 1,800-token output cap, so busy scenes truncated the
 * JSON, failed parsing, and collapsed to the single-item caption fallback.
 * V3 splits the work: a compact CENSUS pass (detection only) that cannot be
 * starved by enrichment bloat, then a text-only DETAIL pass whose failure is
 * non-fatal (census items still surface, unenriched, review-gated).
 */
import { describe, expect, it, vi } from 'vitest';

import {
  buildCensusResponseSchema,
  buildDetailResponseSchema,
  buildEquipmentCensusPrompt,
  buildEquipmentDetailPrompt,
  CENSUS_MAX_OUTPUT_TOKENS,
  DETAIL_MAX_OUTPUT_TOKENS,
  EQUIPMENT_SCAN_V3_SCHEMA_VERSION,
  assignCensusIds,
  extractCensus,
  mergeCensusAndDetail,
} from '../../services/equipmentScanV3Support.mjs';
import { runEquipmentScanV3 } from '../../services/equipmentScanV3Pipeline.mjs';

const IMAGE_PARAMS = { base64Image: 'aW1n', mimeType: 'image/jpeg' };

function makeModel(...responses) {
  const queue = [...responses];
  return {
    generateContent: vi.fn().mockImplementation(async () => {
      const next = queue.shift();
      if (next instanceof Error) throw next;
      return { response: { text: () => next } };
    }),
  };
}

function censusItem(name, category, confidence = 0.9, extra = {}) {
  return {
    suggestedName: name,
    category,
    equipmentKind: '',
    resistanceType: 'bodyweight',
    quantity: 1,
    confidence,
    visibility: 'clear',
    boundingBox: { x: 0.1, y: 0.1, w: 0.2, h: 0.2 },
    alternateNames: [],
    ...extra,
  };
}

const BUSY_SCENE_NAMES = [
  ['Dumbbell Rack', 'dumbbell'],
  ['Flat Bench', 'bench'],
  ['Squat Rack', 'squat_rack'],
  ['Barbell', 'barbell'],
  ['Kettlebell', 'kettlebell'],
  ['Cable Machine', 'cable_machine'],
  ['Medicine Ball', 'medicine_ball'],
  ['Pull-Up Bar', 'pull_up_bar'],
];

function busyCensusJson() {
  return JSON.stringify({
    imageQuality: 'good',
    sceneSummary: 'Commercial gym corner with free weights and machines',
    items: BUSY_SCENE_NAMES.map(([name, category]) => censusItem(name, category)),
    possibleItems: [censusItem('Sled', 'other', 0.4)],
    outOfScopeObjects: ['mirror'],
  });
}

function detailJsonFor(ids) {
  return JSON.stringify({
    enrichments: ids.map((id) => ({
      id,
      suggestedExercises: ['Bench Press', 'Row'],
      movementPatterns: ['push', 'pull'],
      targetMuscles: ['chest', 'back'],
      safetyNotes: 'Use a spotter for heavy sets.',
      reasoning: 'Standard strength equipment.',
    })),
  });
}

describe('runEquipmentScanV3 — multi-object regression', () => {
  it('returns ALL census items from a busy 8-item scene, enriched by the detail pass', async () => {
    const censusModel = makeModel(busyCensusJson());
    const ids = BUSY_SCENE_NAMES.map((_, i) => `item_${i + 1}`);
    const detailModel = makeModel(detailJsonFor(ids));

    const scan = await runEquipmentScanV3({
      censusModel,
      detailModel,
      imageParams: IMAGE_PARAMS,
      modelName: 'gemini-test',
      startMs: Date.now(),
    });

    expect(scan).not.toBeNull();
    expect(scan.items).toHaveLength(8);
    expect(scan.items.map((i) => i.suggestedName)).toEqual(BUSY_SCENE_NAMES.map(([n]) => n));
    for (const item of scan.items) {
      expect(item.suggestedExercises.length).toBeGreaterThan(0);
      expect(item.needsHumanReview).toBe(true);
    }
    expect(scan.possibleItems.length).toBeGreaterThanOrEqual(1);
    expect(scan.pipelineVersion).toBe('v3-census-detail');
    expect(scan.degraded).toBe(false);
    expect(scan.schemaVersion).toBe(EQUIPMENT_SCAN_V3_SCHEMA_VERSION);
    expect(censusModel.generateContent).toHaveBeenCalledTimes(1);
    expect(detailModel.generateContent).toHaveBeenCalledTimes(1);
  });

  it('retries the census once on invalid JSON, then succeeds', async () => {
    const censusModel = makeModel('sorry, not json at all', busyCensusJson());
    const detailModel = makeModel(detailJsonFor([]));

    const scan = await runEquipmentScanV3({
      censusModel,
      detailModel,
      imageParams: IMAGE_PARAMS,
      modelName: 'gemini-test',
      startMs: Date.now(),
    });

    expect(scan).not.toBeNull();
    expect(scan.items).toHaveLength(8);
    expect(censusModel.generateContent).toHaveBeenCalledTimes(2);
  });

  it('returns null when both census passes fail (service falls back to caption)', async () => {
    const censusModel = makeModel('garbage', new Error('transport'));
    const detailModel = makeModel(detailJsonFor([]));

    const scan = await runEquipmentScanV3({
      censusModel,
      detailModel,
      imageParams: IMAGE_PARAMS,
      modelName: 'gemini-test',
      startMs: Date.now(),
    });

    expect(scan).toBeNull();
    expect(detailModel.generateContent).not.toHaveBeenCalled();
  });

  it('a possible-only census does NOT satisfy the scan — retry fires, then null for caption fallback', async () => {
    const possibleOnly = JSON.stringify({
      items: [],
      possibleItems: [censusItem('Maybe A Sled', 'other', 0.3)],
    });
    const censusModel = makeModel(possibleOnly, possibleOnly);
    const detailModel = makeModel(detailJsonFor([]));

    const scan = await runEquipmentScanV3({
      censusModel,
      detailModel,
      imageParams: IMAGE_PARAMS,
      modelName: 'gemini-test',
      startMs: Date.now(),
    });

    expect(scan).toBeNull();
    expect(censusModel.generateContent).toHaveBeenCalledTimes(2);
    expect(detailModel.generateContent).not.toHaveBeenCalled();
  });

  it('keeps census items when the detail pass fails — enrichment is non-fatal', async () => {
    const censusModel = makeModel(busyCensusJson());
    const detailModel = makeModel(new Error('detail transport failure'));

    const scan = await runEquipmentScanV3({
      censusModel,
      detailModel,
      imageParams: IMAGE_PARAMS,
      modelName: 'gemini-test',
      startMs: Date.now(),
    });

    expect(scan).not.toBeNull();
    expect(scan.items).toHaveLength(8);
    for (const item of scan.items) {
      expect(item.suggestedExercises).toEqual([]);
      expect(item.needsHumanReview).toBe(true);
    }
    expect(scan.enriched).toBe(false);
  });
});

describe('V3 support primitives', () => {
  it('census prompt forbids enrichment fields and the detail prompt is text-only', () => {
    const censusPrompt = buildEquipmentCensusPrompt();
    expect(censusPrompt).toMatch(/Do NOT include exercises/i);
    const withIds = assignCensusIds(extractCensus(JSON.parse(busyCensusJson())));
    const detailPrompt = buildEquipmentDetailPrompt(withIds.items);
    expect(detailPrompt).toContain('item_1');
    expect(detailPrompt).toContain('Dumbbell Rack');
  });

  it('merges enrichment by id and leaves possibleItems census-only', () => {
    const withIds = assignCensusIds(extractCensus(JSON.parse(busyCensusJson())));
    const enrichments = new Map([[
      'item_1',
      { suggestedExercises: ['Curl'], movementPatterns: ['pull'], targetMuscles: ['biceps'], safetyNotes: '', reasoning: '' },
    ]]);
    const merged = mergeCensusAndDetail(withIds, enrichments);
    expect(merged.items[0].suggestedExercises).toEqual(['Curl']);
    expect(merged.items[1].suggestedExercises).toEqual([]);
    expect(merged.possibleItems[0].suggestedExercises).toEqual([]);
    expect(merged.schemaVersion).toBe(EQUIPMENT_SCAN_V3_SCHEMA_VERSION);
  });

  it('extractCensus tolerates alternate item-array keys', () => {
    const parsed = { detectedItems: [censusItem('Bench', 'bench')] };
    expect(extractCensus(parsed).items).toHaveLength(1);
  });

  it('response schemas require SchemaType and stage budgets beat the old 1800-token cap', () => {
    expect(buildCensusResponseSchema(undefined)).toBeUndefined();
    expect(buildDetailResponseSchema(undefined)).toBeUndefined();
    const fakeSchemaType = { OBJECT: 'object', ARRAY: 'array', STRING: 'string', NUMBER: 'number', INTEGER: 'integer', BOOLEAN: 'boolean' };
    const census = buildCensusResponseSchema(fakeSchemaType);
    expect(census.type).toBe('object');
    expect(census.properties.items.type).toBe('array');
    const detail = buildDetailResponseSchema(fakeSchemaType);
    expect(detail.properties.enrichments.type).toBe('array');
    expect(CENSUS_MAX_OUTPUT_TOKENS).toBeGreaterThanOrEqual(4096);
    expect(DETAIL_MAX_OUTPUT_TOKENS).toBeGreaterThanOrEqual(8192);
  });
});
