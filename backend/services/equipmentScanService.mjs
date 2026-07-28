/**
 * Equipment Scan Service - Gemini Flash Vision
 * ============================================
 * Sends equipment photos to Gemini, returns review-gated scan candidates, and
 * preserves the legacy single-item wrapper used by the current frontend.
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
    return mod.GoogleGenerativeAI;
  } catch {
    throw new Error('Google Generative AI SDK not installed');
  }
}

function createGeminiModels(GoogleGenerativeAI, apiKey, modelName) {
  const genAI = new GoogleGenerativeAI(apiKey);
  return {
    model: genAI.getGenerativeModel({
      model: modelName,
      generationConfig: {
        maxOutputTokens: 1800,
        temperature: 0.2,
        responseMimeType: 'application/json',
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

async function tryGeminiEquipmentScanV2(model, params, pass, modelName, startMs) {
  try {
    const text = await generateWithImage(model, params);
    const parsed = parseEquipmentScanResponseV2(text);
    return { scan: buildMultiScanResult(parsed, Date.now() - startMs, modelName), error: null };
  } catch (err) {
    logger.warn('[EquipmentScan] Multi-item JSON scan pass failed', {
      pass,
      error: String(err?.message || 'unknown').slice(0, 160),
    });
    return { scan: null, error: err };
  }
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

  const GoogleGenerativeAI = await getGeminiClient();
  const modelName = getEquipmentScanModel();
  const { model, captionModel } = createGeminiModels(GoogleGenerativeAI, apiKey, modelName);
  const imageParams = { base64Image: imageBuffer.toString('base64'), mimeType };
  const startMs = Date.now();

  try {
    const primary = await tryGeminiEquipmentScanV2(model, {
      ...imageParams,
      prompt: buildEquipmentScanPromptV2(),
    }, 'primary', modelName, startMs);
    let scan = primary.scan;

    if (!isReviewableMultiScan(scan)) {
      const retry = await tryGeminiEquipmentScanV2(model, {
        ...imageParams,
        prompt: buildEquipmentScanPromptV2({ retry: true }),
      }, 'retry', modelName, startMs);
      scan = isReviewableMultiScan(retry.scan)
        ? retry.scan
        : await captionFallbackScan(captionModel, imageParams, startMs, modelName);
    }

    if (!isReviewableMultiScan(scan)) throw new Error('AI could not identify visible workout equipment');

    logger.info('[EquipmentScan] Multi-item scan complete', {
      itemCount: scan.items.length,
      primaryName: scan.scanResult.suggestedName,
      confidence: scan.scanResult.confidence,
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
};

export default { scanEquipmentImage, scanEquipmentImageMulti };