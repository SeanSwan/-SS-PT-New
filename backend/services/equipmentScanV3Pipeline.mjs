/**
 * Equipment Scan V3 Pipeline — census→detail orchestration
 * ========================================================
 * Runs the two-stage V3 scan against injected Gemini model handles. Returns a
 * review-gated multi-scan result, or null when the census cannot produce any
 * reviewable items (the caller then degrades to the caption fallback and MUST
 * flag the result as degraded — honesty over silence).
 */
import logger from '../utils/logger.mjs';
import { parseEquipmentScanResponseV2 } from './equipmentScanV2Support.mjs';
import { buildMultiScanResult, isReviewableMultiScan } from './equipmentScanV2Result.mjs';
import {
  assignCensusIds,
  buildEquipmentCensusPrompt,
  buildEquipmentDetailPrompt,
  extractCensus,
  indexDetailEnrichments,
  mergeCensusAndDetail,
} from './equipmentScanV3Support.mjs';

async function generateText(model, parts) {
  const result = await model.generateContent({ contents: [{ role: 'user', parts }] });
  const response = result?.response;
  return typeof response?.text === 'function' ? response.text() : '';
}

function imageParts({ base64Image, mimeType }, prompt) {
  return [{ inlineData: { mimeType, data: base64Image } }, { text: prompt }];
}

async function runCensus(censusModel, imageParams) {
  for (const pass of ['primary', 'retry']) {
    try {
      const text = await generateText(
        censusModel,
        imageParts(imageParams, buildEquipmentCensusPrompt({ retry: pass === 'retry' })),
      );
      const census = extractCensus(parseEquipmentScanResponseV2(text));
      // possibleItems alone don't satisfy the census — the retry pass gets a
      // chance to find confident items before we degrade to caption fallback.
      if (census.items.length > 0) return census;
      logger.warn('[EquipmentScanV3] Census pass returned no confident items', {
        pass,
        possibleCount: census.possibleItems.length,
      });
    } catch (err) {
      logger.warn('[EquipmentScanV3] Census pass failed', {
        pass,
        error: String(err?.message || 'unknown').slice(0, 160),
      });
    }
  }
  return null;
}

async function runDetail(detailModel, censusWithIds) {
  if (censusWithIds.items.length === 0) return new Map();
  try {
    const text = await generateText(
      detailModel,
      [{ text: buildEquipmentDetailPrompt(censusWithIds.items) }],
    );
    const knownIds = new Set(censusWithIds.items.map((item) => item.clientTempId));
    return indexDetailEnrichments(parseEquipmentScanResponseV2(text), knownIds);
  } catch (err) {
    logger.warn('[EquipmentScanV3] Detail pass failed — returning census-only items', {
      error: String(err?.message || 'unknown').slice(0, 160),
    });
    return new Map();
  }
}

/**
 * @returns {Promise<object|null>} multi-scan result (+ pipelineVersion,
 *   degraded:false, enriched flag) or null when census found nothing usable.
 */
export async function runEquipmentScanV3({ censusModel, detailModel, imageParams, modelName, startMs }) {
  const census = await runCensus(censusModel, imageParams);
  if (!census) return null;

  const censusWithIds = assignCensusIds(census);
  const enrichments = await runDetail(detailModel, censusWithIds);
  const merged = mergeCensusAndDetail(censusWithIds, enrichments);
  const scan = buildMultiScanResult(merged, Date.now() - startMs, modelName);
  if (!isReviewableMultiScan(scan)) return null;

  return {
    ...scan,
    pipelineVersion: 'v3-census-detail',
    degraded: false,
    enriched: enrichments.size > 0,
  };
}
