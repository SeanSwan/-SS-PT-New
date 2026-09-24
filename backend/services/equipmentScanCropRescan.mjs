/**
 * Equipment Scan Crop Re-Scan — "Scan this spot closer"
 * =====================================================
 * Takes the ORIGINAL scan photo (re-uploaded by the trainer — remote URLs are
 * never fetched server-side, SSRF is forbidden) plus a `possible` candidate's
 * normalized boundingBox, crops to that region with sharp (padded 15% each
 * side), and runs ONE V3 census pass focused on the region. If sharp is
 * unavailable or the crop fails, the FULL image is sent with a prompt that
 * restricts Gemini to the normalized region instead.
 *
 * Returns a confident identification (confidence >= 0.55, the same reviewable
 * threshold the V2 result builder uses) or 'still_uncertain'. Never writes to
 * the DB — persistence stays in the route layer.
 *
 * NOTE: candidate boundingBoxes from an identified CROPPED re-scan are
 * relative to the crop, not the original photo; callers must keep the
 * regionBox context (returned here) alongside the result.
 */
import logger from '../utils/logger.mjs';
import { isUnknownEquipmentResult } from './equipmentScanSupport.mjs';
import { getEquipmentScanApiKey, getEquipmentScanModel } from './equipmentScanService.mjs';
import { parseEquipmentScanResponseV2 } from './equipmentScanV2Support.mjs';
import { sanitizeScanCandidate } from './equipmentScanV2Result.mjs';
import {
  CENSUS_MAX_OUTPUT_TOKENS,
  EQUIPMENT_SCAN_V3_SCHEMA_VERSION,
  buildCensusResponseSchema,
  buildEquipmentCensusPrompt,
  extractCensus,
} from './equipmentScanV3Support.mjs';

export const RESCAN_CONFIDENCE_THRESHOLD = 0.55;
export const RESCAN_BOX_PAD_RATIO = 0.15;
export const EQUIPMENT_RESCAN_PROMPT_VERSION = 'equipment-region-rescan-v1';

/**
 * Expand a normalized {x,y,w,h} bounding box (fractions 0-1) by 15% of its own
 * width/height on each side, clamped to the [0,1] image frame. Pure.
 *
 * @returns {{x:number,y:number,w:number,h:number}|null} null when the input is
 *   missing, non-numeric, or outside the normalized range (w/h must be > 0).
 */
export function padAndClampBox(boundingBox) {
  if (!boundingBox || typeof boundingBox !== 'object') return null;
  const { x, y, w, h } = boundingBox;
  if ([x, y, w, h].some((v) => typeof v !== 'number' || !Number.isFinite(v))) return null;
  if (x < 0 || x > 1 || y < 0 || y > 1 || w <= 0 || w > 1 || h <= 0 || h > 1) return null;
  const left = Math.max(0, x - w * RESCAN_BOX_PAD_RATIO);
  const top = Math.max(0, y - h * RESCAN_BOX_PAD_RATIO);
  const right = Math.min(1, x + w * (1 + RESCAN_BOX_PAD_RATIO));
  const bottom = Math.min(1, y + h * (1 + RESCAN_BOX_PAD_RATIO));
  return { x: left, y: top, w: right - left, h: bottom - top };
}

const round3 = (v) => Math.round(v * 1000) / 1000;

/**
 * Region-focused census prompt. Lives HERE (not in equipmentScanV3Support) by
 * design — V3Support stays the shared census/detail source of truth.
 */
export function buildRegionRescanPrompt({ croppedToRegion, box }) {
  let focus;
  if (croppedToRegion) {
    focus = 'RESCAN FOCUS: This image is a CLOSE-UP CROP of one region from a larger gym photo where an uncertain object was detected. Identify the workout equipment shown in this crop — expect ONE primary item. If the object is not workout equipment, return "items": [].';
  } else if (box) {
    focus = `RESCAN FOCUS: Examine ONLY the region of this image bounded by the normalized rectangle x=${round3(box.x)}, y=${round3(box.y)}, w=${round3(box.w)}, h=${round3(box.h)} (fractions of image width/height, origin at the top-left corner). An uncertain object was detected there. Identify equipment INSIDE that region only; ignore everything outside it.`;
  } else {
    focus = 'RESCAN FOCUS: A previous scan detected an uncertain object in this photo. Look closer and identify the single most likely piece of workout equipment. If none is present, return "items": [].';
  }
  return `${buildEquipmentCensusPrompt()}\n\n${focus}\nBe decisive: report your best identification with an honest confidence value.`;
}

/**
 * Crop the image to the padded region via sharp. Returns null (caller falls
 * back to full image + region prompt) when the box is missing, sharp cannot be
 * loaded, or the crop fails — never throws.
 */
async function cropToRegion(imageBuffer, box) {
  if (!box) return null;
  let sharp;
  try {
    sharp = (await import('sharp')).default;
  } catch {
    logger.warn('[EquipmentScanCropRescan] sharp unavailable — using full-image region prompt');
    return null;
  }
  try {
    const image = sharp(imageBuffer);
    const { width, height } = await image.metadata();
    if (!Number.isInteger(width) || !Number.isInteger(height) || width < 1 || height < 1) {
      return null;
    }
    const left = Math.min(width - 1, Math.max(0, Math.floor(box.x * width)));
    const top = Math.min(height - 1, Math.max(0, Math.floor(box.y * height)));
    const cropWidth = Math.max(1, Math.min(width - left, Math.round(box.w * width)));
    const cropHeight = Math.max(1, Math.min(height - top, Math.round(box.h * height)));
    const buffer = await image.extract({ left, top, width: cropWidth, height: cropHeight }).toBuffer();
    return { buffer };
  } catch (err) {
    logger.warn('[EquipmentScanCropRescan] Crop failed — using full-image region prompt', {
      error: String(err?.message || 'unknown').slice(0, 160),
    });
    return null;
  }
}

async function getRegionCensusModel(apiKey, modelName) {
  let sdk;
  try {
    sdk = await import('@google/generative-ai');
  } catch (err) {
    // Keep the cause (and the 'SDK not installed' literal equipmentRoutes matches on):
    // this catch pattern once swallowed a vitest strict-mock error for weeks.
    throw new Error(
      'Google Generative AI SDK not installed or failed to load: ' + (err?.message || err),
      { cause: err },
    );
  }
  const genAI = new sdk.GoogleGenerativeAI(apiKey);
  const censusSchema = buildCensusResponseSchema(sdk.SchemaType);
  return genAI.getGenerativeModel({
    model: modelName,
    generationConfig: {
      maxOutputTokens: CENSUS_MAX_OUTPUT_TOKENS,
      temperature: 0.2,
      responseMimeType: 'application/json',
      ...(censusSchema ? { responseSchema: censusSchema } : {}),
    },
  });
}

/**
 * Run the "scan this spot closer" region re-scan.
 *
 * @param {object} params
 * @param {Buffer} params.imageBuffer - The ORIGINAL scan photo (multipart upload only)
 * @param {string} params.mimeType - image/jpeg | image/png | image/webp
 * @param {object|null} params.boundingBox - Candidate's normalized {x,y,w,h} box
 * @returns {Promise<object>} { outcome: 'identified'|'still_uncertain',
 *   candidate: sanitized-candidate|null, schemaVersion, promptVersion,
 *   imageQuality, sceneSummary, croppedToRegion, regionBox, model, latencyMs,
 *   rawResponse }
 */
export async function rescanEquipmentRegion({ imageBuffer, mimeType, boundingBox }) {
  const apiKey = getEquipmentScanApiKey();
  if (!apiKey) throw new Error('GOOGLE_API_KEY or GEMINI_API_KEY is not configured');

  const startMs = Date.now();
  const regionBox = padAndClampBox(boundingBox);
  const crop = await cropToRegion(imageBuffer, regionBox);
  const croppedToRegion = Boolean(crop);
  const modelName = getEquipmentScanModel();
  const model = await getRegionCensusModel(apiKey, modelName);

  const result = await model.generateContent({
    contents: [{
      role: 'user',
      parts: [
        { inlineData: { mimeType, data: (crop?.buffer || imageBuffer).toString('base64') } },
        { text: buildRegionRescanPrompt({ croppedToRegion, box: regionBox }) },
      ],
    }],
  });
  const response = result?.response;
  const text = typeof response?.text === 'function' ? response.text() : '';

  const census = extractCensus(parseEquipmentScanResponseV2(text));
  const pool = [...census.items, ...census.possibleItems]
    .map((raw) => sanitizeScanCandidate(raw))
    .filter((candidate) => !isUnknownEquipmentResult(candidate));
  const best = pool.reduce((acc, candidate) => (
    !acc || candidate.confidence > acc.confidence ? candidate : acc
  ), null);
  const identified = Boolean(best) && best.confidence >= RESCAN_CONFIDENCE_THRESHOLD;

  logger.info('[EquipmentScanCropRescan] Region re-scan complete', {
    outcome: identified ? 'identified' : 'still_uncertain',
    croppedToRegion,
    bestName: best?.suggestedName || null,
    bestConfidence: best?.confidence ?? null,
    latencyMs: Date.now() - startMs,
  });

  return {
    outcome: identified ? 'identified' : 'still_uncertain',
    candidate: best,
    schemaVersion: EQUIPMENT_SCAN_V3_SCHEMA_VERSION,
    promptVersion: EQUIPMENT_RESCAN_PROMPT_VERSION,
    imageQuality: census.imageQuality,
    sceneSummary: census.sceneSummary,
    croppedToRegion,
    regionBox,
    model: modelName,
    latencyMs: Date.now() - startMs,
    rawResponse: text,
  };
}
