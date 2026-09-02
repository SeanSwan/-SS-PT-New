/**
 * Equipment Scan Service - Gemini Flash Vision
 * ============================================
 * Sends equipment photos to Gemini via the V3 census→detail pipeline, returns
 * review-gated scan candidates, and preserves the legacy single-item wrapper.
 * Degrades to a caption fallback (flagged degraded:true) only when the census
 * finds nothing usable — never silently.
 */
import logger from '../utils/logger.mjs';
import {
  DEFAULT_EQUIPMENT_SCAN_MODEL,
  RETIRED_EQUIPMENT_SCAN_MODELS,
  buildEquipmentScanPrompt,
  isUnknownEquipmentResult,
  parseEquipmentScanResponse,
} from './equipmentScanSupport.mjs';
import {
  EQUIPMENT_SCAN_V2_PROMPT_VERSION,
  EQUIPMENT_SCAN_V2_SCHEMA_VERSION,
  buildEquipmentScanPromptV2,
  normalizeRawScanItems,
  parseEquipmentScanResponseV2,
} from './equipmentScanV2Support.mjs';
import {
  buildMultiScanResult,
  isReviewableMultiScan,
  sanitizeScanCandidate,
  sanitizeScanResult,
} from './equipmentScanV2Result.mjs';
import {
  buildEquipmentCaptionPrompt,
  scanResultFromCaption,
} from './equipmentScanCaptionFallback.mjs';
import {
  CENSUS_MAX_OUTPUT_TOKENS,
  DETAIL_MAX_OUTPUT_TOKENS,
  buildCensusResponseSchema,
  buildDetailResponseSchema,
  buildEquipmentCensusPrompt,
  buildEquipmentDetailPrompt,
} from './equipmentScanV3Support.mjs';
import { runEquipmentScanV3 } from './equipmentScanV3Pipeline.mjs';

export function getEquipmentScanApiKey() {
  return process.env.GOOGLE_API_KEY
    || process.env.GEMINI_API_KEY
    || process.env.GOOGLE_AI_API_KEY
    || null;
}

export function isEquipmentScanConfigured() {
  return Boolean(getEquipmentScanApiKey());
}

export function getEquipmentScanModel() {
  const configuredModel = process.env.EQUIPMENT_SCAN_MODEL
    || process.env.AI_GEMINI_VISION_MODEL
    || process.env.AI_GEMINI_MODEL
    || DEFAULT_EQUIPMENT_SCAN_MODEL;
  const model = String(configuredModel).trim();
  return RETIRED_EQUIPMENT_SCAN_MODELS.has(model)
    ? DEFAULT_EQUIPMENT_SCAN_MODEL
    : model;
}

function validateEquipmentScanInput(imageBuffer, mimeType) {
  const allowedMimes = ['image/jpeg', 'image/png', 'image/webp'];
  if (!allowedMimes.includes(mimeType)) {
    throw new Error(`Invalid image type: ${mimeType}. Allowed: ${allowedMimes.join(', ')}`);
  }
  if (imageBuffer.length > 10 * 1024 * 1024) {
    throw new Error('Image too large. Maximum size is 10MB.');
  }
}

async function getGeminiClient() {
  try {
    const mod = await import('@google/generative-ai');
    return { GoogleGenerativeAI: mod.GoogleGenerativeAI, SchemaType: mod.SchemaType };
  } catch (err) {
    // Keep the cause: this catch once swallowed a vitest strict-mock error and
    // misreported it as a missing SDK for weeks (fixed 2026-09-02). A wrapper
    // that hides its cause turns every downstream failure into this message.
    throw new Error(
      'Google Generative AI SDK not installed or failed to load: ' + (err?.message || err),
      { cause: err },
    );
  }
}

function createGeminiModels({ GoogleGenerativeAI, SchemaType }, apiKey, modelName) {
  const genAI = new GoogleGenerativeAI(apiKey);
  const censusSchema = buildCensusResponseSchema(SchemaType);
  const detailSchema = buildDetailResponseSchema(SchemaType);
  return {
    censusModel: genAI.getGenerativeModel({
      model: modelName,
      generationConfig: {
        maxOutputTokens: CENSUS_MAX_OUTPUT_TOKENS,
        temperature: 0.2,
        responseMimeType: 'application/json',
        ...(censusSchema ? { responseSchema: censusSchema } : {}),
      },
    }),
    detailModel: genAI.getGenerativeModel({
      model: modelName,
      generationConfig: {
        maxOutputTokens: DETAIL_MAX_OUTPUT_TOKENS,
        temperature: 0.3,
        responseMimeType: 'application/json',
        ...(detailSchema ? { responseSchema: detailSchema } : {}),
      },
    }),
    captionModel: genAI.getGenerativeModel({
      model: modelName,
      generationConfig: {
        maxOutputTokens: 80,
        temperature: 0.1,
      },
    }),
  };
}

async function generateWithImage(model, { base64Image, mimeType, prompt }) {
  const result = await model.generateContent({
    contents: [{
      role: 'user',
      parts: [
        { inlineData: { mimeType, data: base64Image } },
        { text: prompt },
      ],
    }],
  });
  const response = result?.response;
  return typeof response?.text === 'function' ? response.text() : '';
}

async function captionFallbackScan(captionModel, params, startMs, modelName) {
  const caption = await generateWithImage(captionModel, {
    ...params,
    prompt: buildEquipmentCaptionPrompt(),
  });
  const captionResult = scanResultFromCaption(caption);
  if (!captionResult) {
    throw new Error('AI could not identify visible workout equipment');
  }
  return buildMultiScanResult({
    schemaVersion: EQUIPMENT_SCAN_V2_SCHEMA_VERSION,
    promptVersion: EQUIPMENT_SCAN_V2_PROMPT_VERSION,
    imageQuality: 'acceptable',
    sceneSummary: caption.slice(0, 300),
    items: [captionResult],
  }, Date.now() - startMs, modelName);
}

/**
 * Scan equipment from an image and return multiple review-gated candidates.
 *
 * @param {Buffer} imageBuffer - Raw image data
 * @param {string} mimeType - Image MIME type (image/jpeg, image/png, image/webp)
 * @returns {Promise<object>} Sanitized multi-item scan session
 */
export async function scanEquipmentImageMulti(imageBuffer, mimeType) {
  const apiKey = getEquipmentScanApiKey();
  if (!apiKey) throw new Error('GOOGLE_API_KEY or GEMINI_API_KEY is not configured');
  validateEquipmentScanInput(imageBuffer, mimeType);

  const geminiSdk = await getGeminiClient();
  const modelName = getEquipmentScanModel();
  const { censusModel, detailModel, captionModel } = createGeminiModels(geminiSdk, apiKey, modelName);
  const imageParams = { base64Image: imageBuffer.toString('base64'), mimeType };
  const startMs = Date.now();

  try {
    let scan = await runEquipmentScanV3({ censusModel, detailModel, imageParams, modelName, startMs });

    if (!isReviewableMultiScan(scan)) {
      const fallback = await captionFallbackScan(captionModel, imageParams, startMs, modelName);
      scan = { ...fallback, pipelineVersion: 'v3-caption-fallback', degraded: true, enriched: false };
    }

    if (!isReviewableMultiScan(scan)) throw new Error('AI could not identify visible workout equipment');

    logger.info('[EquipmentScan] Multi-item scan complete', {
      itemCount: scan.items.length,
      primaryName: scan.scanResult.suggestedName,
      confidence: scan.scanResult.confidence,
      pipelineVersion: scan.pipelineVersion,
      degraded: scan.degraded === true,
      latencyMs: scan.latencyMs,
    });
    return scan;
  } catch (err) {
    logger.error('[EquipmentScan] Scan failed', {
      error: err.message,
      latencyMs: Date.now() - startMs,
    });
    throw err;
  }
}

/**
 * Legacy single-item wrapper. Kept for current frontend compatibility.
 */
export async function scanEquipmentImage(imageBuffer, mimeType) {
  const multiScan = await scanEquipmentImageMulti(imageBuffer, mimeType);
  return {
    ...multiScan.scanResult,
    rawResponse: multiScan.rawResponse,
    latencyMs: multiScan.latencyMs,
    model: multiScan.model,
    schemaVersion: multiScan.schemaVersion,
    promptVersion: multiScan.promptVersion,
    imageQuality: multiScan.imageQuality,
    sceneSummary: multiScan.sceneSummary,
    pipelineVersion: multiScan.pipelineVersion,
    degraded: multiScan.degraded === true,
  };
}

export const __testing__ = {
  getEquipmentScanApiKey,
  getEquipmentScanModel,
  isEquipmentScanConfigured,
  buildEquipmentCaptionPrompt,
  buildEquipmentScanPrompt,
  buildEquipmentScanPromptV2,
  isUnknownEquipmentResult,
  parseEquipmentScanResponse,
  parseEquipmentScanResponseV2,
  normalizeRawScanItems,
  scanResultFromCaption,
  sanitizeScanResult,
  sanitizeScanCandidate,
  createGeminiModels,
  buildEquipmentCensusPrompt,
  buildEquipmentDetailPrompt,
  buildCensusResponseSchema,
  buildDetailResponseSchema,
};

export default { scanEquipmentImage, scanEquipmentImageMulti };