import { readFileSync } from 'node:fs';
import { afterEach, describe, expect, it, vi } from 'vitest';

const generateContentMock = vi.fn();

vi.mock('@google/generative-ai', () => ({
  GoogleGenerativeAI: vi.fn(function GoogleGenerativeAI() {
    this.getGenerativeModel = vi.fn(() => ({
      generateContent: generateContentMock,
    }));
  }),
}));

const {
  scanEquipmentImage,
  scanEquipmentImageMulti,
  __testing__,
} = await import('../services/equipmentScanService.mjs');
const { matchExistingEquipment } = await import('../services/equipmentScanV2Support.mjs');

function geminiJson(payload) {
  return {
    response: {
      text: () => JSON.stringify(payload),
    },
  };
}

function multiItemPayload() {
  return {
    schemaVersion: 'equipment_scan_v2',
    promptVersion: 'equipment-multi-inventory-v1',
    imageQuality: 'good',
    sceneSummary: 'Gym corner with free weights and a bench.',
    items: [
      {
        suggestedName: 'Dumbbell Rack',
        category: 'dumbbell',
        resistanceType: 'dumbbell',
        quantity: 1,
        confidence: 0.91,
        visibility: 'clear',
        boundingBox: { x: 0.1, y: 0.2, w: 0.4, h: 0.3 },
        suggestedExercises: ['Dumbbell Bench Press', 'Goblet Squat'],
        dedupeKey: 'dumbbell_rack',
      },
      {
        suggestedName: 'Adjustable Bench',
        category: 'bench',
        resistanceType: 'other',
        quantity: 1,
        confidence: 0.84,
        visibility: 'clear',
        boundingBox: { x: 0.45, y: 0.38, w: 0.32, h: 0.22 },
        suggestedExercises: ['Incline Press', 'Seated Shoulder Press'],
        dedupeKey: 'adjustable_bench',
      },
    ],
    possibleItems: [
      {
        suggestedName: 'Resistance Bands',
        category: 'resistance_band',
        resistanceType: 'band',
        confidence: 0.42,
        visibility: 'partial',
      },
    ],
  };
}

describe('equipment scan multi-item V2 contract', () => {
  afterEach(() => {
    generateContentMock.mockReset();
    delete process.env.GEMINI_API_KEY;
  });

  it('uses a multi-inventory prompt instead of a primary-item prompt', () => {
    const prompt = __testing__.buildEquipmentScanPromptV2();

    expect(prompt).toContain('EVERY clearly visible piece of workout or gym equipment');
    expect(prompt).toContain('Detect up to 12 visible equipment items');
    expect(prompt).not.toContain('primary/largest usable workout equipment');
  });

  it('parses and normalizes multiple candidates without collapsing to the first object', () => {
    const parsed = __testing__.parseEquipmentScanResponseV2(JSON.stringify(multiItemPayload()));
    const normalized = __testing__.normalizeRawScanItems(parsed);

    expect(normalized.items).toHaveLength(2);
    expect(normalized.items.map((item) => item.suggestedName)).toEqual([
      'Dumbbell Rack',
      'Adjustable Bench',
    ]);
    expect(normalized.items[0].dedupeKey).toBe('dumbbell_rack');
    expect(normalized.possibleItems).toHaveLength(1);
    expect(normalized.possibleItems[0].suggestedName).toBe('Resistance Bands');
  });


  it('matches duplicate candidates against existing profile equipment before insert', () => {
    const duplicate = matchExistingEquipment(
      { suggestedName: 'Dumbbell Rack', suggestedCategory: 'dumbbell', dedupeKey: 'dumbbell_rack' },
      [
        { id: 17, name: 'Dumbbell Rack', category: 'dumbbell' },
        { id: 18, name: 'Adjustable Bench', category: 'bench' },
      ],
    );

    expect(duplicate).toEqual({ duplicateOfItemId: 17, matchType: 'dedupe_key' });
    expect(matchExistingEquipment(
      { suggestedName: 'Cable Stack', suggestedCategory: 'cable_machine' },
      [{ id: 18, name: 'Adjustable Bench', category: 'bench' }],
    )).toBeNull();
  });

  it('keeps the scan route backward-compatible while exposing V2 metadata', () => {
    const routeSource = readFileSync(new URL('../routes/equipmentRoutes.mjs', import.meta.url), 'utf8');

    expect(routeSource).toContain('scanEquipmentImageMulti(req.file.buffer, req.file.mimetype)');
    expect(routeSource).toContain('const scanResult = createdCandidates[0] || scanSession.scanResult');
    expect(routeSource).toContain('items: createdItems');
    expect(routeSource).toContain('persistEquipmentScanReviewSession({');
    expect(routeSource).toContain('recordEquipmentScanCandidateReview({');
    expect(routeSource).toContain("router.put('/:id/scan-candidates/:candidateIndex/review'");
    expect(routeSource).toContain('recordEquipmentScanCandidateAction({');
    expect(routeSource).toContain("status: 'approved'");
    expect(routeSource).toContain("status: 'rejected'");
    expect(routeSource).toContain('reviewSessionId: persistedReview?.sessionId');
    expect(routeSource).toContain('scanSession: scanSessionResponse');
    expect(routeSource).toContain('const possibleCandidates =');
    expect(routeSource).toContain('candidateIndex: baseReviewItems.length + index');
    const possibleItemResponseCount = (routeSource.match(/possibleItems: possibleCandidates/g) || []).length;
    expect(possibleItemResponseCount).toBe(3);
    expect(routeSource).not.toContain('possibleItems: scanSession.possibleItems');
    expect(routeSource).toContain('duplicates: duplicateCandidates');
  });
  it('returns all reviewable items while the legacy wrapper keeps the best single item', async () => {
    process.env.GEMINI_API_KEY = 'test-gemini-key';
    generateContentMock.mockResolvedValueOnce(geminiJson(multiItemPayload()));

    const multi = await scanEquipmentImageMulti(Buffer.from('fake image bytes'), 'image/jpeg');

    expect(generateContentMock).toHaveBeenCalledTimes(1);
    expect(multi.schemaVersion).toBe('equipment_scan_v2');
    expect(multi.items).toHaveLength(2);
    expect(multi.items.map((item) => item.suggestedName)).toEqual([
      'Dumbbell Rack',
      'Adjustable Bench',
    ]);
    expect(multi.possibleItems).toHaveLength(1);
    expect(multi.scanResult.suggestedName).toBe('Dumbbell Rack');

    generateContentMock.mockResolvedValueOnce(geminiJson(multiItemPayload()));

    const legacy = await scanEquipmentImage(Buffer.from('fake image bytes'), 'image/jpeg');

    expect(legacy.suggestedName).toBe('Dumbbell Rack');
    expect(legacy.rawResponse.items).toHaveLength(2);
  });
});